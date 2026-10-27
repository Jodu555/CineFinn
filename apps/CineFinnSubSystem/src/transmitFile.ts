import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getConfig } from './config.js';
import { assertInsideEntry, getSocket } from './utils/utils.js';
import type { ErrorData, FileStartData } from '@cinefinn/types/socket';
import { pipeline, Transform } from 'stream';
import { promisify } from 'util';
import { ThrottleStream } from '@cinefinn/utilities/stream';

const pipelineAsync = promisify(pipeline);

// Timeouts for the pull pipeline (sub streams files TO main)
const PULL_ACK_TIMEOUT_MS = 15_000;
const PULL_END_TIMEOUT_MS = 30_000;

interface DownloadSession {
    stream: fs.WriteStream;
    hash: crypto.Hash;
    bytesReceived: number;
    totalSize: number;
    /** final destination path — only touched by an atomic rename on success */
    expectedPath: string;
    /** attempt-owned temp file — the only path error paths may ever remove */
    tmpPath: string;
    /** tag of the push attempt that owns this session (absent for legacy mains) */
    transferId?: string;
}


export function setupTransmitFile() {
    const socket = getSocket();
    let currentDownload: DownloadSession | null = null;
    const activePulls = new Map<string, { abort: () => void }>();
    // pull_transfer_cancel arriving before pull_request is handled — remember
    // the id so the late pull_request aborts instead of streaming an orphan.
    const cancelledPulls = new Set<string>();

    const abortSession = () => {
        const session = currentDownload;
        currentDownload = null;
        if (!session) return;
        try { session.stream.destroy(); } catch { }
        try { session.hash.destroy(); } catch { }
        // Clean up ONLY the attempt-owned temp file. The destination path
        // itself may hold a previously valid file that must never be destroyed
        // by a failed transfer.
        try {
            if (fs.existsSync(session.tmpPath)) fs.rmSync(session.tmpPath, { force: true });
        } catch (err) {
            console.error(`[file_error] temp cleanup failed: ${(err as Error).message}`);
        }
    };


    socket.on('file_start', (data: FileStartData) => {
        // Tagged starts of a DIFFERENT push attempt are leftovers — reject them
        // while keeping the active session (legacy mains send no id and always
        // replace, as before).
        if (currentDownload && data.transferId && data.transferId !== currentDownload.transferId) {
            console.warn(`[file_start] stale start for ${data.transferId} ignored — transfer ${currentDownload.transferId ?? '(legacy)'} is active`);
            return;
        }

        abortSession();
        console.log(`Receiving file: ${data.filename} (${data.size} bytes)`);
        const rawDownloadPath = path.join(getConfig().entrypoint, data.resultPath);
        console.log(`Download Path: ${rawDownloadPath}`);

        // Containment guard: a hostile resultPath must not escape the library
        const pathCheck = assertInsideEntry(rawDownloadPath);
        if (!pathCheck.ok) {
            console.error(`[file_start] rejected destination: ${pathCheck.error}`);
            socket.emit('file_error', { message: `Invalid destination: ${pathCheck.error}` });
            return;
        }
        const downloadPath = pathCheck.resolved;

        // 1. Make sure the destination directory exists before opening the stream
        try {
            fs.mkdirSync(path.dirname(downloadPath), { recursive: true });
        } catch (err) {
            console.error(`[file_start] mkdir failed: ${(err as Error).message}`);
            socket.emit('file_error', { message: `Cannot create directory: ${(err as Error).message}` });
            return;
        }

        // Write to an attempt-owned temp file and promote it atomically on
        // success, so a failed push can never truncate or delete a previously
        // valid file at the destination.
        const tmpPath = `${downloadPath}.transfer-${process.pid}-${Date.now()}.part`;
        let downloadStream: fs.WriteStream;
        try {
            downloadStream = fs.createWriteStream(tmpPath);
        } catch (err) {
            console.error(`[file_start] createWriteStream failed: ${(err as Error).message}`);
            socket.emit('file_error', { message: `Cannot open temp file: ${(err as Error).message}` });
            return;
        }
        const downloadHash = crypto.createHash('md5');

        currentDownload = {
            stream: downloadStream,
            hash: downloadHash,
            bytesReceived: 0,
            totalSize: data.size,
            expectedPath: downloadPath,
            tmpPath,
            transferId: data.transferId,
        };

        downloadStream.on('error', (err) => {
            console.error(`[file_start] WriteStream error: ${err.message}`);
            socket.emit('file_error', { message: `Write error: ${err.message}` });
            abortSession();
        });

        downloadStream.on('drain', () => {
            socket.emit('ack');
        });
    });

    socket.on('file_chunk', (chunk: Buffer, chunkTransferId?: string) => {
        if (!currentDownload) {
            console.error('Received chunk but no active download session');
            return;
        }
        // Chunks of an older/other push attempt must never land in this session
        if (chunkTransferId && chunkTransferId !== currentDownload.transferId) {
            console.warn(`[file_chunk] stale chunk for ${chunkTransferId} ignored`);
            return;
        }

        const canWrite = currentDownload.stream.write(chunk);
        currentDownload.hash.update(chunk);
        currentDownload.bytesReceived += chunk.length;

        // Log progress
        // const progress = (
        //     (currentDownload.bytesReceived / currentDownload.totalSize) *
        //     100
        // ).toFixed(2);
        // console.log(`Download progress: ${progress}%`);

        if (canWrite) {
            socket.emit('ack');
        }
        // If canWrite is false, we'll emit ack on 'drain' event
    });

    socket.on('file_end', async (
        md5OrData: string | { md5?: string; transferId?: string },
        callback: (finalPath: string | false) => void,
    ) => {
        // Rolling-update tolerance: legacy mains send a bare md5 string.
        const payload = typeof md5OrData === 'string' ? { md5: md5OrData } : (md5OrData ?? {});

        if (!currentDownload) {
            console.error('Received file_end but no active download session');
            callback(false);
            return;
        }
        // A finalize of an older attempt must never close THIS session
        if (payload.transferId && currentDownload.transferId && payload.transferId !== currentDownload.transferId) {
            console.warn(`[file_end] stale finalize for ${payload.transferId} ignored`);
            callback(false);
            return;
        }

        const session = currentDownload;
        currentDownload = null;

        await new Promise<void>((resolve) => {
            session.stream.once('finish', resolve);
            session.stream.end();
        });

        const totalSizeOk = session.bytesReceived === session.totalSize;
        const calculatedMD5 = session.hash.digest('hex');
        const isValid = totalSizeOk && calculatedMD5 === payload.md5;

        console.log(`Download complete!`);
        console.log(`Expected MD5: ${payload.md5}`);
        console.log(`Calculated MD5: ${calculatedMD5}`);
        console.log(`Bytes received: ${session.bytesReceived} / expected ${session.totalSize}`);
        console.log(`File integrity: ${isValid ? 'VALID' : 'CORRUPTED'}`);

        if (!isValid) {
            // Corrupt or incomplete — remove the attempt-owned temp only.
            try {
                if (fs.existsSync(session.tmpPath)) fs.rmSync(session.tmpPath, { force: true });
            } catch (err) {
                console.error(`[file_end] temp cleanup failed: ${(err as Error).message}`);
            }
            callback(false);
            return;
        }

        // Promote the temp file to its final name atomically. If the rename
        // fails the caller must not treat the transfer as delivered.
        try {
            fs.renameSync(session.tmpPath, session.expectedPath);
        } catch (renameErr: any) {
            console.error(`[file_end] rename failed: ${renameErr?.message ?? renameErr}`);
            try { fs.rmSync(session.tmpPath, { force: true }); } catch { }
            callback(false);
            return;
        }

        callback(session.expectedPath);
    });

    socket.on('file_error', (data: ErrorData) => {
        console.error('File transfer error:', data.message);
        abortSession();
    });

    // Main cancelled an in-flight pull transfer (e.g. its retry give-up)
    socket.on("pull_transfer_cancel", ({ transferId }: { transferId: string }) => {
        const pull = activePulls.get(transferId);
        if (!pull) {
            // The cancel raced the pull_request handler — remember the id so
            // pull_request aborts immediately instead of streaming an orphan.
            cancelledPulls.add(transferId);
            return;
        }
        console.warn(`[Transfer] pull_transfer_cancel for ${transferId}`);
        pull.abort();
        activePulls.delete(transferId);
    });

    // If we lose the main server mid-pull, tear down every active transfer
    socket.on("disconnect", () => {
        for (const [transferId, pull] of activePulls) {
            console.warn(`[Transfer] disconnect — aborting pull ${transferId}`);
            pull.abort();
            activePulls.delete(transferId);
        }
        activePulls.clear();
        cancelledPulls.clear();
    });

    socket.on(
        "pull_request",
        async (data: { filePath: string; bandwidth: number; transferId: string }) => {
            const { filePath, bandwidth, transferId } = data;

            // Containment FIRST — checking existence before containment leaks a
            // file-existence oracle for arbitrary paths to the remote caller.
            const containment = assertInsideEntry(filePath);
            if (!containment.ok) {
                console.error(`[Transfer] pull_request — path rejected: ${containment.error}`);
                socket.emit("pull_file_error", { message: containment.error, transferId });
                return;
            }

            if (!fs.existsSync(containment.resolved)) {
                console.error(`[Transfer] pull_request — file not found: ${containment.resolved}`);
                socket.emit("pull_file_error", { message: `File not found: ${filePath}`, transferId });
                return;
            }

            // Main validates bandwidth before requesting, but never trust it here —
            // an invalid value would make ThrottleStream stream garbage.
            if (!Number.isFinite(bandwidth) || bandwidth <= 0) {
                console.error(`[Transfer] pull_request — invalid bandwidth: ${bandwidth}`);
                socket.emit("pull_file_error", { message: `Invalid bandwidth: ${bandwidth}`, transferId });
                return;
            }

            // Cancel sent before this handler ran → fail fast, never stream.
            if (cancelledPulls.has(transferId)) {
                cancelledPulls.delete(transferId);
                console.error(`[Transfer] pull_request ${transferId} arrived after a pull_transfer_cancel`);
                socket.emit("pull_file_error", { message: "Transfer was already cancelled", transferId });
                return;
            }

            const stats = fs.statSync(containment.resolved);
            const fileSize = stats.size;
            const md5Hash = crypto.createHash("md5");
            const bandwidthBytes = bandwidth * 1024 * 1024;

            console.log(
                `[Transfer] pull_request ${transferId} — sending ${containment.resolved} ` +
                `(${(fileSize / (1024 * 1024)).toFixed(2)} MB) at ${bandwidth} MB/s`
            );

            const readStream = fs.createReadStream(containment.resolved);
            const throttle = new ThrottleStream(bandwidthBytes);

            let bytesSent = 0;
            let ackPending = false;
            let failed = false;
            // Serialized tail of the current chunk: ack-wait, emit, hash and
            // resume happen strictly one after another, so the final chunk is
            // GUARANTEED to be on the wire (and hashed) before the pipeline's
            // resolution lets us run digest + pull_file_end. Without this the
            // pipeline can resolve while the last chunk still sits in the
            // previous chunk's async ack-wait — and both sides would agree on a
            // truncated file.
            let tailWork: Promise<void> = Promise.resolve();

            // Continuous ack filter: legacy mains ack without a payload — only
            // a MISMATCHING tag is ignored.
            const onPullAck = (ackData?: { transferId?: string }) => {
                if (ackData?.transferId && ackData.transferId !== transferId) return;
                ackPending = false;
            };

            const waitForAck = (): Promise<void> =>
                new Promise((resolve, reject) => {
                    if (!ackPending) return resolve();
                    const timeout = setTimeout(() => {
                        socket.off("pull_ack", onPullAckOnce);
                        reject(new Error(`No pull_ack from main within ${PULL_ACK_TIMEOUT_MS / 1000}s`));
                    }, PULL_ACK_TIMEOUT_MS);
                    const onPullAckOnce = (ackData?: { transferId?: string }) => {
                        if (ackData?.transferId && ackData.transferId !== transferId) return;
                        clearTimeout(timeout);
                        ackPending = false;
                        socket.off("pull_ack", onPullAckOnce); // clean the filtered, still-armed once-listener
                        resolve();
                    };
                    socket.once("pull_ack", onPullAckOnce);
                });

            const abort = (message: string) => {
                if (failed) return;
                failed = true;
                readStream.destroy();
                throttle.destroy();
                socket.emit("pull_file_error", { message, transferId });
            };

            const teardown = () => {
                socket.off("pull_ack", onPullAck);
                activePulls.delete(transferId);
            };

            // Register the pull BEFORE emitting pull_file_start so a
            // pull_transfer_cancel arriving in that window cannot get lost.
            activePulls.set(transferId, { abort: () => abort("Transfer cancelled by main server") });
            if (cancelledPulls.has(transferId)) {
                // Race closed: the cancel arrived between the pre-check and
                // registration.
                cancelledPulls.delete(transferId);
                teardown();
                return;
            }
            socket.on("pull_ack", onPullAck);

            socket.emit("pull_file_start", { size: fileSize, transferId });

            throttle.on("data", (chunk: Buffer) => {
                if (failed) return;
                readStream.pause();

                tailWork = tailWork.then(async () => {
                    if (failed) return;
                    try {
                        await waitForAck();
                        if (failed) return;

                        ackPending = true;
                        md5Hash.update(chunk);
                        socket.emit("pull_file_chunk", chunk, transferId);

                        bytesSent += chunk.length;
                        const progress = ((bytesSent / fileSize) * 100).toFixed(1);
                        console.log(
                            `[Transfer] Sent ${(bytesSent / (1024 * 1024)).toFixed(2)} MB / ` +
                            `${(fileSize / (1024 * 1024)).toFixed(2)} MB (${progress}%)`
                        );

                        if (!readStream.destroyed) readStream.resume();
                    } catch (error: any) {
                        // Ack timeout or emit failure — abort cleanly instead of
                        // throwing out of the 'data' handler (abort also
                        // emits pull_file_error to the main).
                        failed = true;
                        readStream.destroy();
                        throttle.destroy();
                        socket.emit("pull_file_error", { message: error?.message ?? "chunk handling failed", transferId });
                        console.error(`[Transfer] ${transferId} chunk handling failed: ${error?.message ?? error}`);
                    }
                });
            });

            readStream.on("error", (err) => {
                console.error(`[Transfer] ReadStream error: ${err.message}`);
                abort(err.message);
            });

            throttle.on("error", (err) => {
                console.error(`[Transfer] Throttle error: ${err.message}`);
                abort(err.message);
            });

            try {
                await pipelineAsync(readStream, throttle);
                if (failed) {
                    teardown();
                    return;
                }
            } catch (error: any) {
                if (!failed) {
                    abort(error?.message ?? "pipeline failed");
                }
                teardown();
                return;
            }

            // The pipeline resolving does NOT mean the final chunk was fully
            // processed — the tail may still be awaiting the last pull_ack.
            await tailWork;
            if (failed) {
                teardown();
                return;
            }

            // Hard byte-count guarantee: refuse to finalize a short stream —
            // both sides agreeing on a truncated file is worse than a retry.
            if (bytesSent !== fileSize) {
                console.error(`[Transfer] Byte count mismatch — sent ${bytesSent} of ${fileSize} bytes`);
                abort(`Byte count mismatch — sent ${bytesSent} of ${fileSize} bytes`);
                teardown();
                return;
            }

            const md5 = md5Hash.digest("hex");
            console.log(`[Transfer] MD5: ${md5}`);

            const accepted = await new Promise<string | false>((resolve) => {
                const timer = setTimeout(() => resolve(false), PULL_END_TIMEOUT_MS);
                socket.emit("pull_file_end", { md5, transferId }, (result: string | false) => {
                    clearTimeout(timer);
                    resolve(result);
                });
            });

            teardown();

            if (failed) return;

            if (accepted === false) {
                // Main rejected or timed out — don't delete, main will retry with a new pull_request
                console.error("[Transfer] Main rejected file (MD5 mismatch or timeout) — keeping local copy for retry");
            } else {
                console.log(`[Transfer] Accepted by main at: ${accepted} — removing local copy`);
                try {
                    fs.rmSync(containment.resolved, { recursive: true });
                } catch (error: any) {
                    console.error(`[Transfer] Failed to remove local copy: ${error?.message ?? error}`);
                }
            }
        }
    );
}
