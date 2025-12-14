import fs, { ReadStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { setupConfigurationManagment } from '@cinefinn/configuration-manager';
import type { AuthHandshake, AuthHandshakeSubsystem, ServerToSubSystemEvents, SubSystemToServerEvents } from '@cinefinn/types/socket';
import { io, Socket } from 'socket.io-client';
const cliOptions = [['identifier', 'I'], ['entrypoint', 'E'], ['port', 'P'], ['endpoint'], ['core-url'], ['core-token']];

interface Config {
    version: string;
    identifier: string;
    entrypoint: string;
    port: number;
    endpoint: string | boolean;
    experimental: {
        readrate: number;
    };
    core: {
        url: string;
        token: string;
    };
}

const defaultConfig: Config = {
    version: '1.0.1',
    identifier: 'local-kdrama',
    entrypoint: '/home/Media/K-Drama',
    port: 9999,
    endpoint: false, //Means enable Socket Transmission
    experimental: {
        readrate: 0,
    },
    core: {
        url: 'http://localhost:3100',
        token: 'SUPER-SECURE-CORE-TOKEN',
    },
};

const config = setupConfigurationManagment(defaultConfig, cliOptions);

const ptoken = crypto.randomUUID().replaceAll('-', '');

let socket: Socket<ServerToSubSystemEvents, SubSystemToServerEvents> | null = null;
socket = io(config.core.url, {
    auth: {
        type: 'subsystem',
        authToken: config.core.token,
        id: config.identifier,
        token: config.core.token,
        ptoken,
        readrate: config.experimental.readrate || 0,
    } satisfies AuthHandshakeSubsystem,
});

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
});

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
    console.log('Got Stats for:', filePath);
    const stats = fs.statSync(filePath);
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

// interface TransmitData {
// 	fd: number;
// 	transmitID: string;
// 	path: string;
// 	size: number;
// 	packetCount: number;
// 	cumSize: number;
// 	stream: fs.WriteStream;
// 	hash: crypto.Hash;
// 	startTime: number;
// }

// const streamMap = new Map<string, TransmitData>();

// socket.on('openStream', ({ transmitID, fd, size, remotePath }) => {
// 	const alteredPath = path.join(config.entrypoint, remotePath);
// 	console.log('Started Recieving Packets', transmitID, fd, size);
// 	fs.mkdirSync(path.join(alteredPath, '..'), { recursive: true });
// 	const stream = fs.createWriteStream(alteredPath);

// 	const hash = crypto.createHash('md5');
// 	streamMap.set(transmitID, {
// 		transmitID,
// 		fd,
// 		path: alteredPath,
// 		size,
// 		packetCount: 0,
// 		cumSize: 0,
// 		stream,
// 		hash,
// 		startTime: Date.now(),
// 	} satisfies TransmitData);
// });

// socket.on('dataStream', ({ transmitID, fd, data }) => {
// 	const obj = streamMap.get(transmitID);
// 	if (obj.fd !== fd) {
// 		console.log('We somehow fucked up really bad');
// 		return;
// 	}
// 	obj.packetCount++;
// 	obj.cumSize += data.length;
// 	// console.log(((obj.cumSize / obj.size) * 100).toFixed(2) + '%');
// 	obj.hash.update(data);
// 	obj.stream.write(data);
// });

// socket.on('closeStream', async ({ transmitID, fd, packetCount, fingerprint }, callback) => {
// 	console.log('Finished, Recieving Packets', transmitID, fd);

// 	const obj = streamMap.get(transmitID);
// 	if (obj.fd !== fd) {
// 		console.log('We somehow fucked up really bad');
// 		return;
// 	}
// 	const localPrint = obj.hash.digest('hex');
// 	obj.stream.close();
// 	const stats = fs.statSync(obj.path);

// 	console.log('Validating fingerprint!');
// 	console.log('Expect:', fingerprint);
// 	console.log('Actual:', localPrint);

// 	let valid = false;
// 	const elapsedTimeMS = Date.now() - obj.startTime;

// 	const cleanup = () => {
// 		streamMap.delete(transmitID);
// 	};

// 	if (fingerprint != localPrint) {
// 		console.error('ERROR: Fingerprint mismatch!!!');
// 		callback({
// 			fingerprintValidation: valid,
// 			elapsedTimeMS: elapsedTimeMS,
// 		});
// 		cleanup();
// 		return;
// 	}
// 	if (obj.packetCount == packetCount && fingerprint == localPrint) {
// 		valid = true;
// 		console.log('Theoretical Count:', obj.size, packetCount);
// 		console.log('Actual Count:     ', stats.size, obj.packetCount);
// 		console.log('Took:', elapsedTimeMS / 1000, 's');
// 	}
// 	callback({
// 		fingerprintValidation: valid,
// 		elapsedTimeMS: elapsedTimeMS,
// 	});
// 	cleanup();
// });