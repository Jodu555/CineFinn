import fs from 'fs';
import { Hono, type Context } from "hono";
import { authMiddleware } from "../auth.js";
import { watchableEntitysTable } from "../database.js";
import { stream, streamSSE } from 'hono/streaming';
import { getIO } from '../utils.js';
import type { WatchableEntity } from '@cinefinn/types/database';
import { tryCatch } from '../tryCatch.js';
import type { definedSocket } from '../index.js';
import { getSubSocketByID } from '../sockets/subsystem.socket.js';



function decodeRangeHeader(range: string, fileSize: number) {
    const bytesPrefix = 'bytes=';
    if (!range || !range.startsWith(bytesPrefix)) {
        return { start: 0, end: fileSize - 1 };
    }

    const bytesRange = range.substring(bytesPrefix.length);
    const parts = bytesRange.split('-');

    let start = 0;
    let end = fileSize - 1;

    if (parts.length === 2) {
        const rangeStart = parts[0]?.trim();
        const rangeEnd = parts[1]?.trim();

        if (rangeStart) {
            start = parseInt(rangeStart, 10);
        }

        if (rangeEnd) {
            end = parseInt(rangeEnd, 10);
        } else if (rangeStart) {
            // If only start is provided, go to end of file
            end = fileSize - 1;
        }
    }

    // Ensure valid range
    start = Math.max(0, start);
    end = Math.min(fileSize - 1, end);

    return { start, end };
}

const router = new Hono()
    .get('/:watchableEntityUUID', authMiddleware, async (c) => {
        const user = c.get('credentials').user;
        const watchableEntityUUID = c.req.param('watchableEntityUUID');
        const debug = true;

        try {
            // Find the watchable entity
            const watchableEntity = await watchableEntitysTable.getOne({ UUID: watchableEntityUUID });
            if (!watchableEntity) {
                return c.json({ message: 'Watchable Entity not found' }, 404);
            }

            const filePath = watchableEntity.filePath;
            debug && console.log('Got filePath', filePath);

            let stat: fs.Stats | null = null;
            if (watchableEntity.subID === 'main') {
                if (!fs.existsSync(filePath)) {
                    return c.json({ message: 'Video file not found' }, 404);
                }
                stat = fs.statSync(filePath);
            } else {
                const subSystemSocket = await getSubSocketByID(watchableEntity.subID);
                if (subSystemSocket == undefined) {
                    return c.json({ message: 'SubSystem not found' }, 404);
                }
                stat = await new Promise<fs.Stats>((resolve, reject) => {
                    subSystemSocket.emit('videoStats', { filePath }, (stats) => {
                        debug && console.log('Recieved Socket Stats', stats);
                        resolve(stats);
                    });
                })

            }
            debug && console.log('Got fileSize', stat.size, watchableEntity.subID);
            const fileSize = stat.size;
            const range = c.req.header('Range');

            // Handle HEAD requests
            if (c.req.method === 'HEAD') {
                c.header('Accept-Ranges', 'bytes');
                c.header('Content-Length', fileSize.toString());
                c.header('Content-Type', 'video/mp4');
                return c.body(null, 200);
            }

            // Decode range header
            const { start, end } = decodeRangeHeader(range || '', fileSize);
            const contentLength = end - start + 1;

            debug && console.log('Range:', { start, end, contentLength, fileSize });

            if (watchableEntity.subID === 'main') {
                // Create file stream
                const fileStream = fs.createReadStream(filePath, {
                    start,
                    end,
                    highWaterMark: 64 * 1024 // 64KB chunks
                });

                // Set status code first
                c.status(range ? 206 : 200);

                // Set headers
                c.header('Content-Type', 'video/mp4');
                c.header('Accept-Ranges', 'bytes');
                c.header('Content-Length', contentLength.toString());

                if (range) {
                    c.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
                }

                // Return the file stream as body
                return c.body(fileStream as any);
            } else {
                const requestId = crypto.randomUUID();
                return createVideoStreamOverSocket(watchableEntity.subID, requestId, filePath, { start, end }, c, fileSize);
            }



        } catch (error) {
            console.error('Error in video streaming:', error);
            return c.json({ message: 'Internal server error' }, 500);
        }
    });

const testMap = new Map<string, { time: number; }>();

const countMap = new Map<string, number>();

async function createVideoStreamOverSocket(
    subID: string,
    requestId: string,
    filePath: string,
    opts: { start: number; end: number; },
    c: Context,
    fileSize: number // Add fileSize as a parameter to build the Content-Range header
) {
    console.time('createVideoStreamOverSocket-' + requestId.split('-')[0]);
    testMap.set(requestId, { time: Date.now() });

    const { data: subSocket, error } = await tryCatch(() => getSubSocketByID(subID));

    if (error != null || subSocket == null) {
        return c.json(error, 500);
    }

    const contentLength = opts.end - opts.start + 1;

    // --- CRITICAL HEADERS FOR SEEKING ---
    c.status(206); // Set status to 206 Partial Content
    c.header('Content-Type', 'video/mp4');
    c.header('Accept-Ranges', 'bytes');
    c.header('Content-Length', contentLength.toString());
    c.header('Content-Range', `bytes ${opts.start}-${opts.end}/${fileSize}`);

    return stream(c, async (stream) => {
        let resolveStream: () => void;
        const streamCompletionPromise = new Promise<void>((resolve) => {
            resolveStream = resolve;
        });

        const cleanup = () => {
            subSocket.off('video-chunk', handleData);
            subSocket.off('video-chunk-end', handleEnd);
            subSocket.off('video-chunk-error', handleError);
            countMap.delete(requestId);
            console.timeEnd('createVideoStreamOverSocket-' + requestId.split('-')[0]);
            resolveStream();
        };

        const handleData = ({ chunk, requestId: reqID }: { chunk: any; requestId: string }) => {
            if (requestId === reqID) {
                if (testMap.has(reqID)) {
                    testMap.delete(reqID);
                }
                countMap.set(reqID, (countMap.get(reqID) ?? 0) + 1);
                stream.write(chunk);
            }
        };

        const handleEnd = ({ requestId: reqID }: { requestId: string }) => {
            if (requestId === reqID) {
                cleanup();
            }
        };

        const handleError = ({ error, requestId: reqID }: { error: any; requestId: string }) => {
            if (requestId === reqID) {
                cleanup();
            }
        };

        subSocket.on('video-chunk', handleData);
        subSocket.on('video-chunk-end', handleEnd);
        subSocket.on('video-chunk-error', handleError);

        stream.onAbort(() => {
            cleanup();
        });

        subSocket.emit('video-range', { ...opts, filePath, requestId });

        await streamCompletionPromise;
    });
}

export { router as videoRouter };