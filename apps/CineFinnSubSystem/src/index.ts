import fs, { ReadStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { AuthHandshake, AuthHandshakeSubsystem, ErrorData, FileStartData, ServerToSubSystemEvents, SubSystemToServerEvents } from '@cinefinn/types/socket';
import { io, Socket } from 'socket.io-client';
import { getConfig } from './config.js';

const config = getConfig();

const ptoken = crypto.randomUUID().replaceAll('-', '');

const socket = io(config.core.url, {
    auth: {
        type: 'subsystem',
        authToken: config.core.token,
        id: config.identifier,
        token: config.core.token,
        ptoken,
        readrate: config.experimental.readrate || 0,
    } satisfies AuthHandshakeSubsystem,
}) as Socket<ServerToSubSystemEvents, SubSystemToServerEvents>;

socket.on('connect_error', (error) => {
    console.log('Socket Connect Error: ', error.message); // prints the message associated with the error
    if (error.message.includes('Authentication')) {
        console.log('Wrong Auth-token');
    }
});
socket.on('disconnect', () => {
    console.log('Socket Connection: Disconnected');
});

socket.on('connect', async () => {
    console.log('Socket Connection: Connected', config.identifier);
    const { files, dirs } = await listFilesAsync(config.entrypoint);
    console.log('Loaded', files.length, 'files from:', config.entrypoint);

    console.log('Current pToken:', ptoken);
    sendDiskStats();
});

socket.on('getDiskStats', async () => {
    sendDiskStats();
});

function sendDiskStats() {

    const stats = fs.statfsSync(config.entrypoint);

    // Calculate sizes in bytes
    const totalSize = stats.blocks * stats.bsize;
    const availableSize = stats.bavail * stats.bsize;
    const freeSize = stats.bfree * stats.bsize;

    // Convert to GB for readability
    console.log('Total size:', formatBytes(totalSize));
    console.log('Available size:', formatBytes(availableSize));
    console.log('Free size:', formatBytes(freeSize));
    socket.emit('diskStats', {
        toalSize: totalSize,
        availableSize: availableSize,
        freeSize: freeSize,
    });
}

function formatBytes(bytes: number, decimals: number = 2, iec: boolean = false) {
    const { value, unit } = bytesToUnit(bytes, iec);
    return `${value.toFixed(decimals)} ${unit}`;
}

function bytesToUnit(bytes: number, iec: boolean = false): { value: number; unit: string } {
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const iecUnits = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

    const devider = iec ? 1024 : 1000;
    const unitArr = iec ? iecUnits : units;

    let unitIndex = 0;
    let value = bytes;
    while (value >= devider && unitIndex < unitArr.length - 1) {
        value /= devider;
        unitIndex++;
    }
    return {
        value,
        unit: unitArr[unitIndex],
    };
}

socket.on('listFiles', async (callback) => {
    const { files, dirs } = await listFilesAsync(config.entrypoint);
    callback(files);
});

async function listFilesAsync(lcPath: string) {
    const files: string[] = [];
    const dirs: string[] = [];

    const items = await fs.promises.readdir(lcPath, { withFileTypes: true });
    const promises = items.map(async (item) => {
        const fullPath = path.join(lcPath, item.name);
        //TODO: This is not foolproff maybe... cause if the file is a symlink this would trigger as well i guess
        if (item.isDirectory() || item.isSymbolicLink()) {
            dirs.push(fullPath);
            const { files: subFiles, dirs: subDirs } = await listFilesAsync(fullPath);
            files.push(...subFiles);
            dirs.push(...subDirs);
        } else {
            files.push(fullPath);
        }
    });

    await Promise.all(promises);
    return { files, dirs };
}

const map = new Map<
    string,
    { stream: ReadStream; start: number; end: number; num: number; chunks: (string | Buffer)[]; data: { len: number; all: number; }; }
>();

socket.on('videoStats', ({ filePath }, callback) => {
    const stats = fs.statSync(filePath);
    console.log('Got Stats for:', filePath, stats);
    callback(stats);
});

interface VideoRangeRequest {
    filePath: string;
    start: number;
    end: number;
    requestId: string;
}

socket.on('video-range', ({ filePath, start, end, requestId }: VideoRangeRequest) => {
    console.log(filePath);

    if (!fs.existsSync(filePath)) {
        socket.emit('video-chunk-error', { error: 'File not found', requestId });
        return;
    }
    const videoStream = fs.createReadStream(filePath, { start, end });
    if (map.get(requestId) == undefined) {
        map.set(requestId, { stream: videoStream, start, end, num: 0, chunks: [], data: { len: 0, all: 0 } });
    }

    videoStream.on('data', (chunk) => {
        map.get(requestId)!.num += 1;
        // map.get(requestId).chunks.push(chunk);
        map.get(requestId)!.data.all += 1;
        map.get(requestId)!.data.len += chunk.length;

        socket.emit('video-chunk', { chunk, requestId });
    });

    videoStream.on('end', () => {
        const mapObj = map.get(requestId);
        mapObj!.stream.destroy();
        const chunks = mapObj!.chunks;
        //@ts-expect-error
        delete mapObj!.stream;
        //@ts-expect-error
        delete mapObj!.chunks;
        console.log(
            'Sent:',
            requestId,
            mapObj,
            mapObj!.data.len / 1024 / 1024,
            // chunks.reduce((a, b) => a + b.length, 0) / 1024 / 1024,
            'MB',
            'Evrage Chunk length ',
            mapObj!.data.len / mapObj!.data.all
            // chunks.reduce((a, b) => a + b.length, 0) / chunks.length
        );
        map.delete(requestId); //This is very important so i dont leak memory all over the place

        socket.emit('video-chunk-end', { requestId });
    });

    videoStream.on('error', (error) => {
        console.error('Error reading video file:', error);
        socket.emit('video-chunk-error', { error: error.message, requestId });
    });
});


interface DownloadSession {
    stream: fs.WriteStream;
    hash: crypto.Hash;
    expectedMD5: string;
    bytesReceived: number;
    totalSize: number;
    expectedPath: string;
}

let currentDownload: DownloadSession | null = null;

socket.on('file_start', (data) => {
    console.log(`Receiving file: ${data.filename} (${data.size} bytes)`);

    const downloadPath = `${path.join(getConfig().entrypoint, data.resultPath)}`;
    const downloadStream = fs.createWriteStream(``);
    const downloadHash = crypto.createHash('md5');

    currentDownload = {
        stream: downloadStream,
        hash: downloadHash,
        expectedMD5: data.md5,
        bytesReceived: 0,
        totalSize: data.size,
        expectedPath: downloadPath,
    };

    downloadStream.on('drain', () => {
        socket.emit('ack');
    });
});

socket.on('file_chunk', (chunk: Buffer) => {
    if (!currentDownload) {
        console.error('Received chunk but no active download session');
        return;
    }

    const canWrite = currentDownload.stream.write(chunk);
    currentDownload.hash.update(chunk);
    currentDownload.bytesReceived += chunk.length;

    // Log progress
    const progress = (
        (currentDownload.bytesReceived / currentDownload.totalSize) *
        100
    ).toFixed(2);
    console.log(`Download progress: ${progress}%`);

    if (canWrite) {
        socket.emit('ack');
    }
    // If canWrite is false, we'll emit ack on 'drain' event
});

socket.on('file_end', async (callback) => {
    if (!currentDownload) {
        console.error('Received file_end but no active download session');
        return;
    }

    const session = currentDownload;
    session.stream.end();

    await new Promise<void>((resolve) =>
        session.stream.once('finish', resolve)
    );

    const calculatedMD5 = session.hash.digest('hex');
    const isValid = calculatedMD5 === session.expectedMD5;

    console.log(`Download complete!`);
    console.log(`Expected MD5: ${session.expectedMD5}`);
    console.log(`Calculated MD5: ${calculatedMD5}`);
    console.log(`File integrity: ${isValid ? 'VALID' : 'CORRUPTED'}`);
    console.log(`Total bytes received: ${session.bytesReceived}`);
    callback(isValid ? session.expectedPath : false);

    currentDownload = null;
});

socket.on('file_error', (data: ErrorData) => {
    console.error('File transfer error:', data.message);
    currentDownload = null;
});