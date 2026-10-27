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
import { serve } from '@hono/node-server';
import { assertInsideEntry, getPtoken, setPtoken, setSocket } from './utils/utils.js';
import { setupTransmitFile } from './transmitFile.js';
import { videoRouter } from './routes/video.js';
import { ownLogger } from '@cinefinn/honoutils/ownLogger';

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
    bandwidth: config.bandwidth || 0,
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
    try {
        const containment = assertInsideEntry(filePath);
        if (!containment.ok) {
            console.warn('videoStats rejected:', containment.error, filePath);
            callback({ ok: false, error: containment.error });
            return;
        }
        if (!fs.existsSync(containment.resolved)) {
            callback({ ok: false, error: 'File not found' });
            return;
        }
        const stats = fs.statSync(containment.resolved);
        console.log('Got Stats for:', containment.resolved, stats.ino);
        callback({ ok: true, size: stats.size });
    } catch (error: any) {
        console.error('videoStats failed for', filePath, error);
        callback({ ok: false, error: error?.message ?? 'stat failed' });
    }
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

    // Containment guard: remote-triggered reads must never escape the library
    const containment = assertInsideEntry(filePath);
    if (!containment.ok) {
        console.warn('video-range rejected:', containment.error, filePath);
        socket.emit('video-chunk-error', { error: containment.error, requestId });
        return;
    }

    // A repeat video-range with the same id would multiplex two read streams —
    // reject it instead of overwriting the map entry.
    if (map.has(requestId)) {
        socket.emit('video-chunk-error', { error: 'Duplicate requestId — stream already active', requestId });
        return;
    }

    if (!fs.existsSync(containment.resolved)) {
        socket.emit('video-chunk-error', { error: 'File not found', requestId });
        return;
    }

    const stat = fs.statSync(containment.resolved);
    const fileSize = stat.size;

    // Sanitize the requested window — a bogus range must never leak into the
    // read stream options.
    let safeStart = Number.isFinite(start) && start > 0 ? Math.floor(start) : 0;
    let safeEnd = !Number.isFinite(end) || end === -1 ? fileSize - 1 : Math.floor(end);
    safeStart = Math.min(Math.max(0, safeStart), Math.max(0, fileSize - 1));
    safeEnd = Math.min(Math.max(safeEnd, safeStart), Math.max(0, fileSize - 1));

    if (safeStart > fileSize - 1) {
        socket.emit('video-chunk-error', { error: `Range start ${start} is beyond end of file (size ${fileSize})`, requestId });
        return;
    }

    const videoStream = fs.createReadStream(containment.resolved, { start: safeStart, end: safeEnd });
    map.set(requestId, { stream: videoStream, start: safeStart, end: safeEnd, num: 0, chunks: [], data: { len: 0, all: 0 } });

    // Bounded in-flight window: read at most MAX_IN_FLIGHT chunks ahead of the
    // main server's acks, so a stalled consumer cannot balloon memory.
    const MAX_IN_FLIGHT = 4;
    let inFlight = 0;

    videoStream.on('data', (chunk) => {
        inFlight += 1;
        const mapObj = map.get(requestId);
        if (mapObj) {
            mapObj.num += 1;
            // mapObj.chunks.push(chunk);
            mapObj.data.all += 1;
            mapObj.data.len += chunk.length;
        }

        socket.emit('video-chunk', { chunk, requestId }, () => {
            inFlight -= 1;
            if (inFlight < MAX_IN_FLIGHT && !videoStream.destroyed) {
                videoStream.resume();
            }
        });

        if (inFlight >= MAX_IN_FLIGHT) {
            videoStream.pause();
        }
    });

    videoStream.on('end', () => {
        // A video-cancel/disconnect may have deleted the map entry before this
        // queued 'end' event runs — a bare mapObj!.stream.destroy() would throw.
        const mapObj = map.get(requestId);
        if (!mapObj) {
            console.log('Stream ended but entry already gone (cancelled):', requestId);
            return;
        }
        mapObj.stream.destroy();
        console.log(
            'Sent:',
            requestId,
            mapObj.data.len / 1024 / 1024,
            'MB',
            'Evrage Chunk length ',
            mapObj.data.len / mapObj.data.all
        );
        map.delete(requestId); //This is very important so i dont leak memory all over the place

        socket.emit('video-chunk-end', { requestId });
    });

    videoStream.on('error', (error) => {
        console.error('Error reading video file:', error);
        socket.emit('video-chunk-error', { error: error.message, requestId });
        map.delete(requestId);
    });
});

// Main aborts the HTTP response (client seek / navigation) — tear the stream down
socket.on('video-cancel', ({ requestId }) => {
    const mapObj = map.get(requestId);
    if (!mapObj) return;
    try {
        mapObj.stream?.destroy();
    } catch (error) {
        console.error('video-cancel destroy failed:', error);
    }
    map.delete(requestId);
    console.log('video-cancel destroyed stream for', requestId);
});

// If we lose the main server, any paused/reserved video streams are orphaned — release them
socket.on('disconnect', () => {
    if (map.size === 0) return;
    for (const [requestId, mapObj] of map) {
        try {
            mapObj.stream?.destroy();
        } catch (error) {
            console.error('disconnect cleanup destroy failed:', error);
        }
        map.delete(requestId);
    }
    console.warn('Disconnected from main — destroyed all active video streams');
});



process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // process.exit(1);
});