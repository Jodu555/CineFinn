import path from "path";
import fs from "fs";
import crypto from 'crypto';
import type { MovingItem } from "@cinefinn/types/models/system";
import { Transform } from "stream";
import { watchableEntitysTable, seriesTable } from "../database.js";
import subsystemSocket, { getSubSocketByID } from "../sockets/subsystem.socket.js";
import { watchableUUIDToWatchable, calculateMD5, isEpisode, isMovie } from "../utils.js";
import { rebroadcastMovingItems, rebroadcastOverview } from "../routes/admin/admin.js";
import { pipeline } from "stream";
import { promisify } from "util";
import { tryCatch } from "@cinefinn/utilities/tryCatch";
import { wait } from "@cinefinn/utilities/time";
import { indexStorage } from "../routes/index.js";
import { recommendationStorage } from "../routes/recommendations/recommendations.js";
import { app } from "../index.js";
import { getConfig } from "../config.js";
import { sendSeriesReloadToAll } from "../sockets/client.socket.js";
import { ThrottleStream } from "@cinefinn/utilities/stream";

const pipelineAsync = promisify(pipeline);

const QUEUE_TICK_MS = parseInt(process.env.MOVING_ITEM_TICK ?? "5000");
const PROGRESS_BROADCAST_THRESHOLD = 0.5; // percent
const POST_TRANSFER_WAIT_MS = 5_000;
const STREAM_HIGH_WATER_MARK = 64 * 1024;

const ACK_TIMEOUT_MS = 15_000; // 15s
const FINALIZE_TIMEOUT_MS = 30_000; // 30s
const PULL_IDLE_TIMEOUT_MS = 30_000; // 30s — no data for this long while pulling leads to retry

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 2_000;

const DB_UPDATE_RETRY_ATTEMPTS = 3;

const PULL_REQUEST_TIMEOUT_MS = 10_000;

const movingItems: MovingItem[] = [];

export const getMovingItems = () => movingItems;

async function finalizeMovingItemFailure(movingItem: MovingItem, message: string) {
    movingItem.meta.progress = -1;
    movingItem.meta.result = message;
    console.error(`[Transfer] Finalizing failure for ${movingItem.ID}: ${message}`);
    await rebroadcastMovingItems().catch(() => { });
}


class MovingItemQueue {
    private items: string[] = [];
    private timeout: NodeJS.Timeout | null = null;
    private processing = false;
    private runningId: string | null = null;
    private onFinishedCallback: () => void = () => { };

    onFinished(callback: () => void) {
        this.onFinishedCallback = callback;
    }

    enqueue(id: string) {
        if (this.items.includes(id) || this.runningId === id) {
            console.log("[Queue] Enqueue ignored — already pending/in-flight:", id);
            return;
        }
        console.log("[Queue] Enqueue:", id);
        this.items.push(id);

        if (!this.timeout && !this.processing) this.scheduleNext();
    }

    private scheduleNext() {
        if (this.timeout) return;
        if (this.processing) return;

        this.timeout = setTimeout(() => {
            this.timeout = null;
            this.dequeue();
        }, QUEUE_TICK_MS);
    }

    async dequeue() {
        if (this.processing) {
            this.scheduleNext();
            return null;
        }
        const id = this.items.shift();

        if (id == null) {
            this.onFinishedCallback();
            return null;
        }

        console.log("[Queue] Dequeue:", id);
        this.processing = true;
        this.runningId = id;
        try {
            const item = movingItems.find((m) => m.ID === id);

            if (item) {
                try {
                    await processMovingItem(item);
                } catch (error) {
                    console.error(`[Queue] Item ${id} crashed:`, error);
                    await finalizeMovingItemFailure(item, error instanceof Error ? error.message : String(error));
                }
            } else {
                console.warn(`[Queue] Moving item ${id} not found — skipping`);
            }
        } finally {
            this.processing = false;
            this.runningId = null;
        }

        if (this.items.length === 0) {
            this.onFinishedCallback();
            if (this.timeout) {
                clearTimeout(this.timeout);
                this.timeout = null;
            }
        } else {
            this.scheduleNext();
        }

        return id;
    }

    get length() {
        return this.items.length;
    }
}

export const movingItemQueue = new MovingItemQueue();

movingItemQueue.onFinished(async () => {
    console.log('MovingItemQueue Drained');

    try { await rebroadcastMovingItems(); } catch (error) { console.error('[Queue] rebroadcastMovingItems failed:', error); }
    try { await rebroadcastOverview(); } catch (error) { console.error('[Queue] rebroadcastOverview failed:', error); }

    console.log('Clearing Cache');
    try { await indexStorage.clear(); } catch (e) { }
    try { await recommendationStorage.clear(); } catch (e) { }

    console.log('Filling Cache');
    try {
        const res = await app.request('/index/all', {
            headers: { 'auth-token': getConfig().system.PUBLIC_API_AUTH_TOKEN },
        });
        if (!res.ok) console.error('[Queue] /index/all returned non-OK status:', res.status);
    } catch (error) {
        console.error('[Queue] Filling cache via /index/all failed:', error);
    }

    await wait(1000 * 1);

    console.log('Reloading Series');
    try {
        await sendSeriesReloadToAll();
    } catch (error) {
        console.error('[Queue] sendSeriesReloadToAll failed:', error);
    }
});


export async function prepareProcessMovingItem(id: string) {
    movingItemQueue.enqueue(id);
}

export async function processMovingItem(movingItem: MovingItem) {
    /**
     * isPush: Pushing a file from the main subSystem to a subSystem
     */
    const isPush = movingItem.fromSubID === "main" && movingItem.toSubID !== "main";
    /**
     * isPull: Pulling a file from a subSystem to the main subSystem
     */
    const isPull = movingItem.fromSubID !== "main" && movingItem.toSubID === "main";

    if (!isPush && !isPull) {
        const message = `[Transfer] Unsupported direction ${movingItem.fromSubID} -> ${movingItem.toSubID}, dropping: ${movingItem.ID}`;
        console.error(message);
        throw new Error(message);
    }

    if (isPush) {
        await sendMovingItemToSubSystem(movingItem);
    } else if (isPull) {
        await receiveMovingItemFromSubSystem(movingItem);
    }
}


export async function sendMovingItemToSubSystem(movingItem: MovingItem) {
    const watchableEntity = await watchableEntitysTable.getOne({ UUID: movingItem.watchableEntityUUID });
    if (!watchableEntity) {
        await finalizeMovingItemFailure(movingItem, `WatchableEntity not found: ${movingItem.watchableEntityUUID}`);
        return;
    }

    const series = await seriesTable.getOne({ UUID: watchableEntity.serie_UUID });
    if (!series) {
        await finalizeMovingItemFailure(movingItem, `Series not found: ${watchableEntity.serie_UUID}`);
        return;
    }

    const watchable = await watchableUUIDToWatchable(watchableEntity.watchable_UUID);
    if (!watchable) {
        await finalizeMovingItemFailure(movingItem, `Watchable not found: ${watchableEntity.watchable_UUID}`);
        return;
    }

    const { filePath } = watchableEntity;
    if (!filePath) {
        await finalizeMovingItemFailure(movingItem, `No filePath for WatchableEntity: ${movingItem.watchableEntityUUID}`);
        return;
    }

    if (!fs.existsSync(filePath)) {
        await finalizeMovingItemFailure(movingItem, `File not found: ${filePath}`);
        return;
    }


    let resultDir = "";
    try {
        if (isEpisode(watchable)) {
            resultDir = path.join(series.tags[0], series.title, `Season-${watchable.season_IDX}`);
        } else if (isMovie(watchable)) {
            resultDir = path.join(series.tags[0], series.title, "Movies");
        } else {
            //If we have in the future more types this is a safeguard
            await finalizeMovingItemFailure(movingItem, `Unsupported watchable type for ${movingItem.watchableEntityUUID}`);
            return;
        }
    } catch (error) {
        console.error(`[Transfer] Error determining resultDir for ${watchable.UUID}:`, error);
        await finalizeMovingItemFailure(movingItem, `Could not determine result directory: ${(error as Error)?.message ?? error}`);
        return;
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
        if (attempt > 1) {
            const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 2);
            console.log(`[Transfer] Retry attempt ${attempt}/${MAX_RETRY_ATTEMPTS} in ${delay}ms...`);
            await wait(delay);
        }

        const { data: subSystemSocket, error: socketError } = await tryCatch(() =>
            getSubSocketByID(movingItem.toSubID)
        );
        if (socketError || subSystemSocket == null) {
            lastError = new Error(`Sub-system socket not found: ${movingItem.toSubID}`);
            console.error(`[Transfer] Attempt ${attempt}:`, lastError.message);
            continue;
        }

        try {
            const finalPath = await attemptFileTransfer({
                movingItem,
                filePath,
                resultDir,
                subSystemSocket,
            });

            // The transfer itself is DONE — the sub holds the complete file.
            // A DB failure here must never re-push THIS IS IMPORTANT
            let dbUpdated = false;
            for (let dbAttempt = 1; dbAttempt <= DB_UPDATE_RETRY_ATTEMPTS; dbAttempt++) {
                if (dbAttempt > 1) {
                    console.log(`[Transfer] DB update retry ${dbAttempt}/${DB_UPDATE_RETRY_ATTEMPTS} in ${RETRY_BASE_DELAY_MS}ms...`);
                    await wait(RETRY_BASE_DELAY_MS);
                }
                const { error: dbError } = await tryCatch(() =>
                    watchableEntitysTable.update(
                        { UUID: watchableEntity.UUID },
                        { filePath: finalPath, subID: movingItem.toSubID }
                    )
                );
                if (!dbError) {
                    dbUpdated = true;
                    break;
                }
                console.error(`[Transfer] DB update attempt ${dbAttempt}/${DB_UPDATE_RETRY_ATTEMPTS} failed:`, dbError);
            }
            if (!dbUpdated) {
                // Terminal: keep BOTH copies. The delivered file on the sub is
                // the only fully validated content; our source still exists
                // here. Surface the DB failure without destroying anything.
                // This is essentially a pretty rough to revocer from failure state.
                await finalizeMovingItemFailure(
                    movingItem,
                    `Transfer succeeded but the database update failed — file was delivered to sub-system ` +
                    `${movingItem.toSubID} at ${finalPath}; original kept at ${filePath}`
                );
                return;
            }

            movingItem.meta.progress = 100;
            movingItem.meta.result = finalPath;
            await rebroadcastMovingItems().catch(() => { });

            try {
                fs.rmSync(filePath, { recursive: true });
            } catch (rmError: any) {
                console.error(`[Transfer] Removing source file failed:`, rmError?.message ?? rmError);
            }

            await wait(POST_TRANSFER_WAIT_MS);

            const index = movingItems.findIndex((m) => m.ID === movingItem.ID);
            if (index !== -1) movingItems.splice(index, 1);

            await rebroadcastMovingItems().catch(() => { });
            return;
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.error(`[Transfer] Attempt ${attempt} failed:`, lastError.message);
            movingItem.meta.progress = 0;
            await rebroadcastMovingItems().catch(() => { });
        }
    }

    console.error(`[Transfer] All ${MAX_RETRY_ATTEMPTS} attempts failed for ${movingItem.ID}:`, lastError?.message);
    {
        const { data: subSystemSocket, error: socketError } = await tryCatch(() =>
            getSubSocketByID(movingItem.toSubID)
        );
        if (!socketError && subSystemSocket != null) {
            subSystemSocket.emit("file_error", { message: lastError?.message ?? "Unknown error" });
        }
    }
    await finalizeMovingItemFailure(movingItem, lastError?.message ?? "Unknown error");
}

export async function receiveMovingItemFromSubSystem(movingItem: MovingItem) {
    const { data: initialSocket, error: socketError } = await tryCatch(() =>
        getSubSocketByID(movingItem.fromSubID)
    );
    if (socketError || initialSocket == null) {
        await finalizeMovingItemFailure(movingItem, `Sub-system socket not found: ${movingItem.fromSubID}`);
        return;
    }

    const rawBandwidth = initialSocket.data.auth.bandwidth;
    if (!rawBandwidth || rawBandwidth <= 0) {
        console.error(`[Transfer] Invalid bandwidth on sub socket: ${rawBandwidth}`);
        await finalizeMovingItemFailure(movingItem, `Invalid bandwidth on sub-system ${movingItem.fromSubID}: ${rawBandwidth}`);
        return;
    }

    const watchableEntity = await watchableEntitysTable.getOne({ UUID: movingItem.watchableEntityUUID });
    if (!watchableEntity) {
        await finalizeMovingItemFailure(movingItem, `WatchableEntity not found: ${movingItem.watchableEntityUUID}`);
        return;
    }

    const series = await seriesTable.getOne({ UUID: watchableEntity.serie_UUID });
    if (!series) {
        await finalizeMovingItemFailure(movingItem, `Series not found: ${watchableEntity.serie_UUID}`);
        return;
    }

    const watchable = await watchableUUIDToWatchable(watchableEntity.watchable_UUID);
    if (!watchable) {
        await finalizeMovingItemFailure(movingItem, `Watchable not found: ${watchableEntity.watchable_UUID}`);
        return;
    }

    const { filePath } = watchableEntity; // path on the sub system
    if (!filePath) {
        await finalizeMovingItemFailure(movingItem, `No filePath for WatchableEntity: ${movingItem.watchableEntityUUID}`);
        return;
    }

    let resultDir = "";
    try {
        if (isEpisode(watchable)) {
            resultDir = path.join(series.tags[0], series.title, `Season-${watchable.season_IDX}`);
        } else if (isMovie(watchable)) {
            resultDir = path.join(series.tags[0], series.title, "Movies");
        } else {
            //If we have in the future more types this is a safeguard
            await finalizeMovingItemFailure(movingItem, `Unsupported watchable type for ${movingItem.watchableEntityUUID}`);
            return;
        }
    } catch (error) {
        console.error(`[Transfer] Error determining resultDir for ${watchable.UUID}:`, error);
        await finalizeMovingItemFailure(movingItem, `Could not determine result directory: ${(error as Error)?.message ?? error}`);
        return;
    }

    const filename = path.basename(filePath);
    const localResultPath = path.join(getConfig().videoPath, resultDir, filename);

    console.log(
        `[Transfer] Requesting ${filePath} from sub-system ${movingItem.fromSubID} ` +
        `(${rawBandwidth} MB/s) → ${localResultPath}`
    );

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
        if (attempt > 1) {
            const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 2);
            console.log(`[Transfer] Retry attempt ${attempt}/${MAX_RETRY_ATTEMPTS} in ${delay}ms...`);
            await wait(delay);
        }

        // Re-fetch the socket on every attempt — the sub may have reconnected.
        const { data: subSystemSocket, error: socketError } = await tryCatch(() =>
            getSubSocketByID(movingItem.fromSubID)
        );
        if (socketError || subSystemSocket == null) {
            lastError = new Error(`Sub-system socket not found: ${movingItem.fromSubID}`);
            console.error(`[Transfer] Attempt ${attempt}:`, lastError.message);
            continue;
        }

        try {
            const finalPath = await attemptFileReceive({
                movingItem,
                filePath,
                localResultPath,
                bandwidth: rawBandwidth,
                subSystemSocket,
            });

            // The sub accepted the file_end ack — its source is ALREADY DELETED.
            // A DB failure here must never re-transmit (the source no longer
            // exists) and must never delete the only good copy of the data.
            // Retry the DB update in place instead.
            let dbUpdated = false;
            for (let dbAttempt = 1; dbAttempt <= DB_UPDATE_RETRY_ATTEMPTS; dbAttempt++) {
                if (dbAttempt > 1) {
                    console.log(`[Transfer] DB update retry ${dbAttempt}/${DB_UPDATE_RETRY_ATTEMPTS} in ${RETRY_BASE_DELAY_MS}ms...`);
                    await wait(RETRY_BASE_DELAY_MS);
                }
                const { error: dbError } = await tryCatch(() =>
                    watchableEntitysTable.update(
                        { UUID: watchableEntity.UUID },
                        { filePath: finalPath, subID: "main" }
                    )
                );
                if (!dbError) {
                    dbUpdated = true;
                    break;
                }
                console.error(`[Transfer] DB update attempt ${dbAttempt}/${DB_UPDATE_RETRY_ATTEMPTS} failed:`, dbError);
            }
            if (!dbUpdated) {
                // Terminal: the file stays on disk at finalPath, referenced by
                // nobody. Admin can see the message and re-point manually.
                // This is a total Failure State pretty much impossible to recover from
                await finalizeMovingItemFailure(
                    movingItem,
                    `Transfer succeeded but the database update failed — file kept at ${finalPath}`
                );
                return;
            }

            await wait(POST_TRANSFER_WAIT_MS);

            const index = movingItems.findIndex((m) => m.ID === movingItem.ID);
            if (index !== -1) movingItems.splice(index, 1);

            await rebroadcastMovingItems().catch(() => { });
            return;
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.error(`[Transfer] Attempt ${attempt} failed:`, lastError.message);
            movingItem.meta.progress = 0;
            await rebroadcastMovingItems().catch(() => { });
        }
    }

    console.error(
        `[Transfer] All ${MAX_RETRY_ATTEMPTS} attempts failed for ${movingItem.ID}:`,
        lastError?.message
    );
    {
        const { data: subSystemSocket, error: socketError } = await tryCatch(() =>
            getSubSocketByID(movingItem.fromSubID)
        );
        if (!socketError && subSystemSocket != null) {
            subSystemSocket.emit("pull_file_error", { message: lastError?.message ?? "Unknown error" });
        }
    }
    await finalizeMovingItemFailure(movingItem, lastError?.message ?? "Unknown error");
}



interface TransferAttemptParams {
    movingItem: MovingItem;
    filePath: string;
    resultDir: string;
    subSystemSocket: NonNullable<Awaited<ReturnType<typeof getSubSocketByID>>>;
}

async function attemptFileTransfer({ movingItem, filePath, resultDir, subSystemSocket }: TransferAttemptParams): Promise<string> {

    //TODO: Somehow compute this on the fly.
    subSystemSocket.setMaxListeners(5000); // Avoid MaxListenersExceededWarning for large files with many chunks

    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    const md5Hash = crypto.createHash('md5');
    console.log(`[Transfer] Starting transfer of ${filePath} (${(fileSize / (1024 * 1024)).toFixed(2)} MB) to sub-system ${movingItem.toSubID}`);
    const filename = path.basename(filePath);
    const resultPath = path.join(resultDir, filename);

    movingItem.meta.movingStarted = Date.now();
    movingItem.meta.progress = 0;
    await rebroadcastMovingItems().catch(() => { });

    const rawBandwidth = subSystemSocket.data.auth.bandwidth;
    if (!rawBandwidth || rawBandwidth <= 0 || !Number.isFinite(rawBandwidth)) {
        throw new Error(`Invalid bandwidth value on sub-system socket: ${rawBandwidth}`);
    }
    const bandwidth = rawBandwidth * 1024 * 1024;
    const throttle = new ThrottleStream(bandwidth);

    // Tag every event of this attempt so the sub can reject leftovers of an
    // older attempt that overlap with a retry.
    const transferId = crypto.randomUUID();

    subSystemSocket.emit("file_start", { filename, size: fileSize, resultPath, transferId });

    const readStream = fs.createReadStream(filePath, { highWaterMark: STREAM_HIGH_WATER_MARK });

    let bytesSent = 0;
    let lastProgress = 0;
    let ackPending = false;
    let failed = false;
    // Serialized tail of the current chunk: ack-wait, emit, hash and resume
    // happen strictly one after another. The pipeline can RESOLVE while the
    // final chunk still sits in the previous chunk's async ack-wait — without
    // the chain, digest + file_end could run before the tail reached the sub
    // and both sides would agree on a truncated file.
    let tailWork: Promise<void> = Promise.resolve();

    const withTimeout = <T>(p: Promise<T>, ms: number, label: string) => {
        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
            p.then(
                (value) => { clearTimeout(timer); resolve(value); },
                (error) => { clearTimeout(timer); reject(error); }
            );
        });
    };

    const waitForAck = () => new Promise<void>((resolve, reject) => {
        if (!ackPending) return resolve();
        const timeout = setTimeout(() => {
            subSystemSocket.off("ack", onAck); // don't leak the once-listener on the timeout path
            reject(new Error("No ack from sub-system"));
        }, ACK_TIMEOUT_MS);
        const onAck = () => {
            clearTimeout(timeout);
            ackPending = false;
            resolve();
        };
        subSystemSocket.once("ack", onAck);
    });

    // Keep ack state in sync for acks that arrive between chunk sends
    subSystemSocket.on("ack", () => { ackPending = false; });

    const onSubFileError = (data: { message: string }) => {
        console.error(`[Transfer] Sub-system reported file error: ${data.message}`);
        failed = true;
        readStream.destroy();
        throttle.destroy();
    };
    subSystemSocket.on("file_error", onSubFileError);

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
                subSystemSocket.emit("file_chunk", chunk, transferId);

                bytesSent += chunk.length;
                const progress = (bytesSent / fileSize) * 100;

                if (progress - lastProgress >= PROGRESS_BROADCAST_THRESHOLD || progress >= 100) {
                    lastProgress = progress;
                    movingItem.meta.progress = parseFloat(progress.toFixed(2));
                    await rebroadcastMovingItems();
                }

                if (!readStream.destroyed) readStream.resume();
            } catch {
                failed = true;
                readStream.destroy();
                throttle.destroy();
            }
        });
    });

    readStream.on('error', (err) => {
        console.error(`[Transfer] ReadStream error: ${err.message}`);
        failed = true;
        readStream.destroy();
        throttle.destroy();
    });

    throttle.on('error', (err) => {
        console.error(`[Transfer] Throttle error: ${err.message}`);
        failed = true;
        readStream.destroy();
        throttle.destroy();
    });

    const transferTimeoutMs = Math.max(120_000, Math.ceil((fileSize / bandwidth) * 1000 * 3));

    const onTransferAbortDisconnect = () => {
        console.error(`[Transfer] Transfer aborted — sub-system ${movingItem.toSubID} disconnected`);
        readStream.destroy();
        throttle.destroy();
    };

    subSystemSocket.once("disconnect", onTransferAbortDisconnect);
    try {
        await withTimeout(pipelineAsync(readStream, throttle), transferTimeoutMs, "Push");

        // The serialized tail (final chunk) must complete BEFORE the digest —
        // it is bounded by the sub's ack timeout on its own, plus a hard cap
        // here so a never-answering sub cannot hang the attempt forever.
        await withTimeout(tailWork, ACK_TIMEOUT_MS * 2, "Final chunk tail");
        if (failed) throw new Error("Push aborted while handling the final chunk");

        // Hard byte-count guarantee: never finalize a short transmission.
        if (bytesSent !== fileSize) {
            throw new Error(`Push byte count mismatch — sent ${bytesSent} of ${fileSize} bytes mismatch by ${fileSize - bytesSent} bytes`);
        }
    } catch (error) {
        // Timeout fired or a stream failed — make sure NO zombie transfer keeps
        // pushing into the sub while the retry starts a second one (the sub
        // keeps a single download session — the zombie would corrupt it).
        failed = true;
        try { readStream.destroy(); } catch { }
        try { throttle.destroy(); } catch { }
        throw error;
    } finally {
        subSystemSocket.off("disconnect", onTransferAbortDisconnect);
        subSystemSocket.off("file_error", onSubFileError);
        subSystemSocket.removeAllListeners("ack");
    }

    const md5 = md5Hash.digest('hex');
    console.log(`[Transfer] MD5: ${md5}`);

    // Keep handling disconnects until the very end of the interaction.
    const onTransferAbort = () => {
        console.error(`[Transfer] Sub-system disconnected during file_end wait`);
        readStream.destroy();
        throttle.destroy();
    };
    subSystemSocket.once("disconnect", onTransferAbort);

    try {
        // IMPORTANT: file_end race must be with the SAME withTimeout used for the pipeline.
        const finalPath = await withTimeout(
            new Promise<string>((resolve, reject) => {
                subSystemSocket.emit("file_end", { md5, transferId }, (result: string | false) => {
                    if (result === false) reject(new Error("Remote rejected the file transfer"));
                    else resolve(result);
                });
            }),
            FINALIZE_TIMEOUT_MS,
            "file_end"
        );

        console.log(`[Transfer] Complete: ${finalPath}`);
        await rebroadcastMovingItems().catch(() => { });
        return finalPath;
    } finally {
        subSystemSocket.off("disconnect", onTransferAbort);
    }
}

interface ReceiveAttemptParams {
    movingItem: MovingItem;
    filePath: string;         // path on the sub
    localResultPath: string;  // where to write on main
    bandwidth: number;        // MB/s
    subSystemSocket: NonNullable<Awaited<ReturnType<typeof getSubSocketByID>>>;
}

async function attemptFileReceive({
    movingItem,
    filePath,
    localResultPath,
    bandwidth,
    subSystemSocket,
}: ReceiveAttemptParams): Promise<string> {
    return new Promise((resolve, reject) => {
        let writeStream: fs.WriteStream | null = null;
        let md5Hash = crypto.createHash("md5");
        let bytesReceived = 0;
        let totalSize = 0;
        let lastProgress = 0;
        let startTimeout: ReturnType<typeof setTimeout> | null = null;
        let idleTimer: ReturnType<typeof setTimeout> | null = null;
        let finished = false;

        // Unique id for this attempt so stale events of an earlier attempt on
        // the same socket can never mix into this transfer.
        const transferId = crypto.randomUUID();
        const transferIdShort = transferId.split("-")[0];

        // Attempt-owned temp file: each attempt writes its own .part file and
        // only an accepted (MD5-verified) transfer is renamed onto
        // localResultPath. A failed attempt can therefore never destroy a
        // previously valid file at localResultPath.
        const tmpPath = `${localResultPath}.${transferIdShort}.part`;

        const resetIdle = () => {
            if (idleTimer) clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                fail(new Error(`No data from sub-system for ${PULL_IDLE_TIMEOUT_MS / 1000}s — aborting transfer`));
            }, PULL_IDLE_TIMEOUT_MS);
        };

        const cleanup = () => {
            if (startTimeout) clearTimeout(startTimeout);
            if (idleTimer) clearTimeout(idleTimer);
            subSystemSocket.off("pull_file_start", onStart);
            subSystemSocket.off("pull_file_chunk", onChunk);
            subSystemSocket.off("pull_file_end", onEnd);
            subSystemSocket.off("pull_file_error", onError);
            subSystemSocket.off("disconnect", onSubDisconnect);
        };

        const fail = (err: Error) => {
            if (finished) return;
            finished = true;
            cleanup();
            try { writeStream?.destroy(); } catch { }
            // Remove only the temp file THIS attempt owned — localResultPath
            // may hold a previously valid copy that must survive the failure.
            if (writeStream) {
                try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch { }
            }
            // Tell the sub to stop streaming — it may still be mid-pipeline
            subSystemSocket.emit("pull_transfer_cancel", { transferId });
            reject(err);
        };

        const onStart = (data: { size: number; transferId?: string }) => {
            // Ignore zombie pull_file_start events from an earlier attempt
            if (data.transferId && data.transferId !== transferId) return;
            if (finished) return;
            // A duplicate start of the SAME transfer must never open a second
            // write stream — the old stream would be orphaned while both write
            // to the same file.
            if (writeStream) {
                return fail(new Error("Duplicate pull_file_start for an already started transfer"));
            }
            if (startTimeout) clearTimeout(startTimeout);

            totalSize = data.size;
            if (!Number.isFinite(totalSize) || totalSize <= 0) {
                return fail(new Error(`Sub-system reported invalid file size: ${data.size}`));
            }

            console.log(
                `[Transfer] Receiving ${filePath} (${transferIdShort}) ` +
                `(${(totalSize / (1024 * 1024)).toFixed(2)} MB) from sub-system`
            );

            movingItem.meta.movingStarted = Date.now();
            movingItem.meta.progress = 0;
            rebroadcastMovingItems().catch(() => { });

            // Create the destination directory only when the transfer actually
            // starts — failures before this point leave no empty season dirs.
            try {
                fs.mkdirSync(path.dirname(localResultPath), { recursive: true });
            } catch (mkdirError: any) {
                return fail(new Error(`Could not create destination directory: ${mkdirError?.message ?? 'mkdir failed'}`));
            }

            try {
                try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch { }
                writeStream = fs.createWriteStream(tmpPath);
            } catch (openError: any) {
                return fail(new Error(`Could not open temp file: ${openError?.message ?? openError}`));
            }

            writeStream.on("error", (err) => fail(err));

            // Back-pressure: ack when the write buffer drains
            writeStream.on("drain", () => {
                subSystemSocket.emit("pull_ack", { transferId });
            });

            resetIdle();
        };

        const onChunk = (chunk: Buffer, chunkTransferId?: string) => {
            if (chunkTransferId && chunkTransferId !== transferId) return;
            if (finished) return;
            if (!writeStream) return fail(new Error("Received chunk before pull_file_start"));

            resetIdle();

            md5Hash.update(chunk);
            const canWrite = writeStream.write(chunk);
            bytesReceived += chunk.length;

            const progress = (bytesReceived / totalSize) * 100;
            if (progress - lastProgress >= PROGRESS_BROADCAST_THRESHOLD || progress >= 100) {
                lastProgress = progress;
                movingItem.meta.progress = parseFloat(progress.toFixed(2));
                rebroadcastMovingItems().catch(() => { }); // fire-and-forget for chunk hot path
            }

            if (canWrite) {
                subSystemSocket.emit("pull_ack", { transferId });
            }
            // If canWrite is false, the 'drain' listener above will ack
        };

        const onEnd = (
            md5OrData: string | { md5: string; transferId: string },
            callback: (result: string | false) => void,
        ) => {
            // Rolling-update tolerance: legacy subs send a bare md5 string.
            const payload: { md5?: string; transferId?: string } =
                typeof md5OrData === 'string' ? { md5: md5OrData } : (md5OrData ?? { md5: '' });
            // A stale finalize from an older attempt must never close THIS
            // stream — answer negatively so its attempt can fail fast.
            if (payload.transferId && payload.transferId !== transferId) {
                callback(false);
                return;
            }
            if (finished) {
                callback(false);
                return;
            }
            if (!writeStream) return fail(new Error("Received pull_file_end before pull_file_start"));

            const remoteMD5 = payload.md5;

            writeStream.end();
            writeStream.once("finish", () => {
                // A short transmission must be rejected even when both sides
                // compute an MD5 over the SAME short stream — the sub finishing
                // its pipeline early could otherwise produce agreeing hashes
                // over truncated data.
                const byteCountOk = bytesReceived === totalSize;
                const calculatedMD5 = md5Hash.digest("hex");
                const isValid = byteCountOk && calculatedMD5 === remoteMD5;

                console.log(`[Transfer] Download complete: ${tmpPath}`);
                console.log(`[Transfer] Expected MD5:   ${remoteMD5}`);
                console.log(`[Transfer] Calculated MD5: ${calculatedMD5}`);
                console.log(`[Transfer] File integrity: ${isValid ? "VALID" : "CORRUPTED"}`);
                console.log(`[Transfer] Total bytes received: ${bytesReceived} / expected ${totalSize}`);

                cleanup();
                finished = true;

                if (isValid && writeStream) {
                    // Promote the accepted temp file atomically BEFORE the sub
                    // is told the transfer is accepted (it deletes its source
                    // at that point — the local copy must already be durable).
                    let renameError: unknown = null;
                    let renamed = false;
                    try {
                        if (fs.existsSync(tmpPath)) fs.renameSync(tmpPath, localResultPath);
                        renamed = true;
                    } catch (err) {
                        renameError = err;
                    }
                    if (!renamed) {
                        callback(false);
                        try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch { }
                        reject(new Error(`Could not promote temp file to ${localResultPath}: ${(renameError as Error)?.message ?? renameError}`));
                        return;
                    }
                    callback(localResultPath);
                    movingItem.meta.result = localResultPath;
                    rebroadcastMovingItems().catch(() => { });
                    resolve(localResultPath);
                } else {
                    callback(false);
                    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch { }
                    if (!byteCountOk) {
                        reject(new Error(`Byte count mismatch — received ${bytesReceived} of ${totalSize} bytes`));
                    } else {
                        reject(new Error(`MD5 mismatch — file corrupted (expected ${remoteMD5}, got ${calculatedMD5})`));
                    }
                }
            });
        };

        const onError = (data: { message: string; transferId?: string }) => {
            if (data.transferId && data.transferId !== transferId) return;
            fail(new Error(`Sub-system reported error: ${data.message}`));
        };

        const onSubDisconnect = () => {
            fail(new Error("Sub-system disconnected during pull transfer"));
        };

        subSystemSocket.on("pull_file_start", onStart);
        subSystemSocket.on("pull_file_chunk", onChunk);
        subSystemSocket.on("pull_file_end", onEnd);
        subSystemSocket.on("pull_file_error", onError);
        subSystemSocket.on("disconnect", onSubDisconnect);

        // Guard against sub never responding
        startTimeout = setTimeout(() => {
            fail(new Error(`Sub-system did not start sending within ${PULL_REQUEST_TIMEOUT_MS}ms`));
        }, PULL_REQUEST_TIMEOUT_MS);

        subSystemSocket.emit("pull_request", {
            filePath,      // sub's local path
            bandwidth,     // MB/s — sub uses this for ThrottleStream
            transferId,    // unique attempt id — sub registers it for cancellation
        });
    });
}
