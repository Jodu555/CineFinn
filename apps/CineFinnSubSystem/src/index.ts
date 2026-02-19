import fs, { ReadStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { AuthHandshake, AuthHandshakeSubsystem, ErrorData, FileStartData, ServerToSubSystemEvents, SubSystemToServerEvents } from '@cinefinn/types/socket';
import { io, Socket } from 'socket.io-client';
import { getConfig } from './config.js';
import { formatBytes } from '@cinefinn/utilities/bytes';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trimTrailingSlash } from 'hono/trailing-slash';
import { ownLogger } from './utils/ownLogger.js';
import { serve } from '@hono/node-server';
import { getPtoken, setPtoken, setSocket } from './utils/utils.js';
import { setupTransmitFile } from './transmitFile.js';
import { videoRouter } from './routes/video.js';

const config = getConfig();

setPtoken(crypto.randomUUID().replaceAll('-', ''))

export const app = new Hono({
    strict: false,
})
    .use(cors())
    .use(trimTrailingSlash())
    .use(ownLogger(console.log, ['/socket.io', '/video', '/bullboard']))
    .route('/video', videoRouter);


const httpServer = serve({
    fetch: app.fetch,
    port: getConfig().port,
}, async (info) => {
    console.log(info);
});

const socketAuth = {
    type: 'subsystem',
    authToken: config.core.token,
    id: config.identifier,
    token: config.core.token,
    ptoken: getPtoken(),
    readrate: config.experimental.readrate || 0,
    endpoint: config.endpoint,
} satisfies AuthHandshakeSubsystem;

console.log(socketAuth);

const socket = io(config.core.url, {
    auth: socketAuth,
}) as Socket<ServerToSubSystemEvents, SubSystemToServerEvents>;

setSocket(socket);
setupTransmitFile();

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

    console.log('Current pToken:', getPtoken());
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
    // filePath = path.join(getConfig().entrypoint, filePath);
    const stats = fs.statSync(filePath);
    console.log('Got Stats for:', filePath, stats.ino);
    callback(stats);
});

interface VideoRangeRequest {
    filePath: string;
    start: number;
    end: number;
    requestId: string;
}

socket.on('video-range', ({ filePath, start, end, requestId }: VideoRangeRequest) => {
    // filePath = path.join(getConfig().entrypoint, filePath);
    console.log(filePath, start, end, requestId);

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



process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // process.exit(1);
});