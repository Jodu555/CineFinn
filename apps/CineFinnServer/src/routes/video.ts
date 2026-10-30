import fs from 'fs';
import { Hono, type Context } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { watchableEntitysTable } from "../database.js";
import { stream, streamSSE } from 'hono/streaming';
import { getSubSocketByID } from '../sockets/subsystem.socket.js';
import { tryCatch } from '@cinefinn/utilities/tryCatch';
import { proxy } from 'hono/proxy';
import { parseHttpRange } from '@cinefinn/utilities/range';




const router = new Hono()
    .get('/:watchableEntityUUID', authMiddleware, async (c) => {
        const user = c.get('credentials').user;
        const watchableEntityUUID = c.req.param('watchableEntityUUID');
        const debugParam = c.req.query('debug');
        const debug = false || debugParam === 'true';

        try {
            // Find the watchable entity
            const watchableEntity = await watchableEntitysTable.getOne({ UUID: watchableEntityUUID });
            if (!watchableEntity) {
                return c.json({ message: 'Watchable Entity not found' }, 404);
            }

            const filePath = watchableEntity.filePath;
            debug && console.log('Got filePath', filePath);

            // Video URLs carry auth tokens in the query and files and could be replaced or moved for now never cache anything
            const CACHE_CONTROL = 'no-store';

            // Only `.size` is consumed downstream for every sub-system flavor.
            let stat: { size: number } | null = null;
            if (watchableEntity.subID === 'main') {
                if (!fs.existsSync(filePath)) {
                    debug && console.log('Video file on main subID not found');
                    return c.json({ message: 'Video file not found' }, 404);
                }
                stat = fs.statSync(filePath);
            } else {
                const { data: subSocket, error } = await tryCatch(() => getSubSocketByID(watchableEntity.subID));
                if (error != null || subSocket == null) {
                    debug && console.log('Sub-system socket not found for subID', watchableEntity.subID, 'error:', error);
                    return c.json({ message: 'SubSystem not found' }, 404);
                }

                if (subSocket.data.auth.endpoint !== false) {
                    const proxyPath = `${subSocket.data.auth.endpoint}video?ptoken=${subSocket.data.auth.ptoken}&videoPath=${encodeURIComponent(filePath)}`;
                    debug && console.log('Proxying video request to sub-system', watchableEntity.subID, 'proxyPath:', proxyPath);
                    return proxy(proxyPath, {
                        headers: {
                            'ptoken': subSocket.data.auth.ptoken,
                            'Range': c.req.header('Range') || '',
                            'Connection': 'keep-alive',
                        }
                    });
                }

                stat = await new Promise<{ size: number }>((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Sub-system did not respond to videoStats within 5s')), 5_000);
                    subSocket.emit('videoStats', { filePath }, (info) => {
                        clearTimeout(timeout);
                        debug && console.log('Recieved Socket Stats', info);
                        if (info == null) {
                            debug && console.log('Sub-system sent an empty videoStats response');
                            reject(new Error('Sub-system sent an empty videoStats response'));
                            return;
                        }
                        if (info.ok === false) {
                            debug && console.log('Sub-system sent a failed videoStats response');
                            reject(new Error(info.error ?? 'videoStats failed'));
                            return;
                        }
                        if (info.ok === true) {
                            debug && console.log('Sub-system sent a valid videoStats response', info);
                            resolve({ size: info.size });
                            return;
                        }
                        const legacySize = (info as unknown as { size?: unknown }).size;
                        if (typeof legacySize === 'number' && Number.isFinite(legacySize)) {
                            debug && console.log('Sub-system sent a legacy videoStats response', info);
                            resolve({ size: legacySize });
                            return;
                        }
                        debug && console.log('Sub-system sent an invalid videoStats response', info);
                        reject(new Error('Sub-system sent an invalid videoStats response'));
                    });
                });
            }
            debug && console.log('Got fileSize', stat.size, watchableEntity.subID);
            const fileSize = stat.size;
            const range = c.req.header('Range');

            const parsedRange = parseHttpRange(range || undefined, fileSize);
            if (parsedRange.state === 'invalid') {
                debug && console.log('Unfulfillable Range header:', range);
                c.header('Content-Range', `bytes */${fileSize}`);
                return c.body(null, 416);
            }
            const start = parsedRange.state === 'applied' ? parsedRange.start : 0;
            const end = parsedRange.state === 'applied' ? parsedRange.end : fileSize - 1;
            const contentLength = end - start + 1;
            const rangeApplied = parsedRange.state === 'applied';
            debug && console.log('Range:', { start, end, contentLength, fileSize, rangeApplied });

            if (c.req.method === 'HEAD') {
                c.header('Accept-Ranges', 'bytes');
                c.header('Content-Length', contentLength.toString());
                c.header('Content-Type', 'video/mp4');
                c.header('Cache-Control', CACHE_CONTROL);
                if (rangeApplied) {
                    c.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
                }
                debug && console.log('HEAD request, sending headers only');
                return c.body(null, rangeApplied ? 206 : 200);
            }

            if (fileSize <= 0) {
                c.header('Content-Type', 'video/mp4');
                c.header('Accept-Ranges', 'bytes');
                c.header('Content-Length', '0');
                c.header('Cache-Control', CACHE_CONTROL);
                debug && console.log('File size is 0, sending empty response');
                return c.body(null, 200);
            }

            if (watchableEntity.subID === 'main') {
                // Create file stream
                const fileStream = fs.createReadStream(filePath, {
                    start,
                    end,
                    highWaterMark: 64 * 1024 // 64KB chunks
                });
                debug && console.log('Creating file stream');

                // Set status code first
                c.status(rangeApplied ? 206 : 200);

                // Set headers
                c.header('Content-Type', 'video/mp4');
                c.header('Accept-Ranges', 'bytes');
                c.header('Content-Length', contentLength.toString());
                c.header('Cache-Control', CACHE_CONTROL);

                if (rangeApplied) {
                    c.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
                }

                // Return the file stream as body
                return c.body(fileStream as any);
            } else {
                const requestId = crypto.randomUUID().split('-')[0]; // Shorten the UUID for easier logging
                debug && console.log('Requesting video stream over socket', requestId);
                return createVideoStreamOverSocket(watchableEntity.subID, requestId, filePath, { start, end }, c, fileSize);
            }



        } catch (error) {
            console.error('Error in video streaming:', error);
            return c.json({ message: 'Internal server error' }, 500);
        }
    });

const VIDEO_IDLE_TIMEOUT_MS = 30_000;

async function createVideoStreamOverSocket(
    subID: string,
    requestId: string,
    filePath: string,
    opts: { start: number; end: number; },
    c: Context,
    fileSize: number // Add fileSize as a parameter to build the Content-Range header
) {
    const requestIdShort = requestId.split('-')[0];
    console.time('createVideoStreamOverSocket-' + requestIdShort);

    const { data: subSocket, error } = await tryCatch(() => getSubSocketByID(subID));

    if (error != null || subSocket == null) {
        return c.json(error ?? { message: 'SubSystem not found' }, 500);
    }

    const contentLength = opts.end - opts.start + 1;

    // --- CRITICAL HEADERS FOR SEEKING ---
    c.status(206); // Set status to 206 Partial Content
    c.header('Content-Type', 'video/mp4');
    c.header('Accept-Ranges', 'bytes');
    c.header('Content-Length', contentLength.toString());
    c.header('Content-Range', `bytes ${opts.start}-${opts.end}/${fileSize}`);

    // Video URLs carry auth tokens in the query and files and could be replaced or moved for now never cache anything
    c.header('Cache-Control', 'no-store');

    return stream(c, async (stream) => {
        let finished = false;
        let idleTimer: ReturnType<typeof setTimeout> | undefined;
        let resolveStream: () => void;
        const streamCompletionPromise = new Promise<void>((resolve) => {
            resolveStream = resolve;
        });

        const finish = () => {
            if (finished) return;
            finished = true;
            if (idleTimer) clearTimeout(idleTimer);
            subSocket.off('video-chunk', handleData);
            subSocket.off('video-chunk-end', handleEnd);
            subSocket.off('video-chunk-error', handleError);
            subSocket.off('disconnect', onSubDisconnect);

            // Always tell the sub the stream is gone. Without this the idle
            // watchdog path would leave the sub paused at its in-flight window
            // with an open read stream forever.
            subSocket.emit('video-cancel', { requestId });
            console.timeEnd('createVideoStreamOverSocket-' + requestIdShort);
            resolveStream();
        };

        // Watchdog: a stalled sub (no chunks, no end, no error) must not hold
        // the HTTP response open forever.
        const resetIdle = () => {
            if (idleTimer) clearTimeout(idleTimer);
            idleTimer = setTimeout(finish, VIDEO_IDLE_TIMEOUT_MS);
        };

        const handleData = async (payload: { chunk: string | Buffer; requestId: string; }, ack?: () => void) => {
            if (payload.requestId !== requestId) {
                //Somehow the requestID's got mixed up since both use the same socket and callback ignore.
                return;
            }
            if (finished) {
                // Our own leftover (cancel raced a chunk — the map entry on the
                // sub is being torn down anyway).
                ack?.();
                return;
            }

            try {
                // Writing hangs backpressure onto the sub: the socket.io ack only
                // fires once this write has drained into the HTTP response.
                const buf = typeof payload.chunk === 'string' ? new TextEncoder().encode(payload.chunk) : new Uint8Array(payload.chunk);
                await stream.write(buf);
                resetIdle();
                ack?.();
            } catch (error: any) {
                console.error(`[VideoStream] Write failed (${requestIdShort}):`, error?.message ?? error);
                finish();
                ack?.();
            }
        };

        const handleEnd = ({ requestId: reqID }: { requestId: string; }) => {
            if (requestId === reqID) finish();
        };

        const handleError = ({ error, requestId: reqID }: { error: any; requestId: string; }) => {
            console.error(`[VideoStream] Sub reported error for ${requestIdShort}: ${error}`);
            if (requestId === reqID) {
                finish();
            }
        };

        const onSubDisconnect = () => {
            console.warn(`[VideoStream] Sub-system disconnected mid-stream (${requestIdShort})`);
            finish();
        };

        subSocket.on('video-chunk', handleData);
        subSocket.on('video-chunk-end', handleEnd);
        subSocket.on('video-chunk-error', handleError);
        subSocket.on('disconnect', onSubDisconnect);

        resetIdle();

        stream.onAbort(() => {
            finish();
        });

        subSocket.emit('video-range', { ...opts, filePath, requestId });

        await streamCompletionPromise;
    });
}

export { router as videoRouter };
