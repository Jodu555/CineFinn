import path from "path";
import fs from "fs";
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

const pipelineAsync = promisify(pipeline);

const QUEUE_TICK_MS = parseInt(process.env.MOVING_ITEM_TICK ?? "5000");
const PROGRESS_BROADCAST_THRESHOLD = 0.5; // percent
const POST_TRANSFER_WAIT_MS = 5_000;
const STREAM_HIGH_WATER_MARK = 64 * 1024;

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 2_000;

const movingItems: MovingItem[] = [];

export const getMovingItems = () => movingItems;


class MovingItemQueue {
    private items: string[] = [];
    private timeout: NodeJS.Timeout | null = null;
    private onFinishedCallback: () => void = () => { };

    onFinished(callback: () => void) {
        this.onFinishedCallback = callback;
    }

    enqueue(id: string) {
        console.log("[Queue] Enqueue:", id);
        this.items.push(id);
        this.scheduleNext();
    }

    private scheduleNext() {
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            this.timeout = null;
            this.dequeue();
        }, QUEUE_TICK_MS);
    }

    async dequeue() {
        const id = this.items.shift();

        if (id == null) {
            this.onFinishedCallback();
            return null;
        }

        console.log("[Queue] Dequeue:", id);
        const item = movingItems.find((m) => m.ID === id);

        if (item) {
            await processMovingItem(item);
        } else {
            console.warn(`[Queue] Moving item ${id} not found — skipping`);
        }

        if (this.items.length === 0) {
            this.onFinishedCallback();
            if (this.timeout) clearTimeout(this.timeout);
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
    await rebroadcastMovingItems();
    await rebroadcastOverview();

    console.log('Clearing Cache');
    try { await indexStorage.clear(); } catch (e) { }
    try { await recommendationStorage.clear(); } catch (e) { }

    console.log('Filling Cache');
    await app.request('/index/all', {
        headers: { 'auth-token': getConfig().system.PUBLIC_API_AUTH_TOKEN },
    });

    await wait(1000 * 1);

    console.log('Reloading Series');
    await sendSeriesReloadToAll();
});


export async function prepareProcessMovingItem(id: string) {
    movingItemQueue.enqueue(id);
}

export async function processMovingItem(movingItem: MovingItem) {
    if (movingItem.fromSubID === "main" && movingItem.toSubID !== "main") {
        await sendMovingItemToSubSystem(movingItem);
    } else if (movingItem.fromSubID !== "main" && movingItem.toSubID === "main") {
        console.warn("[MovingItem] Receiving from sub-system is not yet implemented");
    }
}


class ThrottleStream extends Transform {
    private bytesPerSecond: number;
    private startTime = Date.now();
    private bytesWritten = 0;

    constructor(bytesPerSecond: number) {
        super();
        this.bytesPerSecond = bytesPerSecond;
    }

    _transform(
        chunk: Buffer,
        _encoding: BufferEncoding,
        callback: (error?: Error | null) => void
    ) {
        this.bytesWritten += chunk.length;

        const elapsed = (Date.now() - this.startTime) / 1000;
        const expectedTime = this.bytesWritten / this.bytesPerSecond;
        const delay = Math.max(0, (expectedTime - elapsed) * 1000);

        if (delay > 10) {
            setTimeout(() => {
                this.push(chunk);
                callback();
            }, delay);
        } else {
            this.push(chunk);
            callback();
        }
    }
}


export async function sendMovingItemToSubSystem(movingItem: MovingItem) {
    const { data: subSystemSocket, error: socketError } = await tryCatch(() =>
        getSubSocketByID(movingItem.toSubID)
    );

    if (socketError || subSystemSocket == null) {
        console.error(`[Transfer] Sub-system socket not found: ${movingItem.toSubID}`);
        return;
    }

    const watchableEntity = await watchableEntitysTable.getOne({ UUID: movingItem.watchableEntityUUID });
    if (!watchableEntity) {
        console.error(`[Transfer] WatchableEntity not found: ${movingItem.watchableEntityUUID}`);
        return;
    }

    const series = await seriesTable.getOne({ UUID: watchableEntity.serie_UUID });
    if (!series) {
        console.error(`[Transfer] Series not found: ${watchableEntity.serie_UUID}`);
        return;
    }

    const watchable = await watchableUUIDToWatchable(watchableEntity.watchable_UUID);
    if (!watchable) {
        console.error(`[Transfer] Watchable not found: ${watchableEntity.watchable_UUID}`);
        return;
    }

    const { filePath } = watchableEntity;
    if (!filePath) {
        console.error(`[Transfer] No filePath for WatchableEntity: ${movingItem.watchableEntityUUID}`);
        return;
    }

    let resultDir = "";
    if (isEpisode(watchable)) {
        resultDir = path.join(series.tags[0], series.title, `Season-${watchable.season_IDX}`);
    } else if (isMovie(watchable)) {
        resultDir = path.join(series.tags[0], series.title, "Movies");
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
        if (attempt > 1) {
            const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 2);
            console.log(`[Transfer] Retry attempt ${attempt}/${MAX_RETRY_ATTEMPTS} in ${delay}ms...`);
            await wait(delay);
        }

        try {
            const finalPath = await attemptFileTransfer({
                movingItem,
                filePath,
                resultDir,
                subSystemSocket,
            });

            // Success — update DB and clean up
            await watchableEntitysTable.update(
                { UUID: watchableEntity.UUID },
                { filePath: finalPath, subID: movingItem.toSubID }
            );

            fs.rmSync(filePath, { recursive: true });

            await wait(POST_TRANSFER_WAIT_MS);

            const index = movingItems.findIndex((m) => m.ID === movingItem.ID);
            if (index !== -1) movingItems.splice(index, 1);

            await rebroadcastMovingItems();
            return;
        } catch (err) {
            lastError = err as Error;
            console.error(`[Transfer] Attempt ${attempt} failed:`, lastError.message);
            movingItem.meta.progress = 0;
            await rebroadcastMovingItems();
        }
    }

    console.error(`[Transfer] All ${MAX_RETRY_ATTEMPTS} attempts failed for ${movingItem.ID}:`, lastError?.message);
    subSystemSocket.emit("file_error", { message: lastError?.message ?? "Unknown error" });
}


interface AttemptParams {
    movingItem: MovingItem;
    filePath: string;
    resultDir: string;
    subSystemSocket: NonNullable<Awaited<ReturnType<typeof getSubSocketByID>>>;
}

async function attemptFileTransfer({ movingItem, filePath, resultDir, subSystemSocket }: AttemptParams): Promise<string> {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    console.log(`[Transfer] Starting transfer of ${filePath} (${(fileSize / (1024 * 1024)).toFixed(2)} MB) to sub-system ${movingItem.toSubID}`);
    const md5 = await calculateMD5(filePath);
    const filename = path.basename(filePath);
    const resultPath = path.join(resultDir, filename);

    movingItem.meta.movingStarted = Date.now();
    movingItem.meta.progress = 0;
    await rebroadcastMovingItems();

    subSystemSocket.emit("file_start", { filename, size: fileSize, md5, resultPath });

    const readStream = fs.createReadStream(filePath, { highWaterMark: STREAM_HIGH_WATER_MARK });


    const rawBandwidth = subSystemSocket.data.auth.bandwidth;
    if (!rawBandwidth || rawBandwidth <= 0) {
        throw new Error(`Invalid bandwidth value on sub-system socket: ${rawBandwidth}`);
    }
    const bandwidth = rawBandwidth * 1024 * 1024;
    const throttle = new ThrottleStream(bandwidth);

    let bytesSent = 0;
    let lastProgress = 0;
    let ackPending = false;

    const waitForAck = (): Promise<void> =>
        new Promise((resolve) => {
            if (!ackPending) return resolve();
            subSystemSocket.once("ack", () => {
                ackPending = false;
                resolve();
            });
        });

    subSystemSocket.on("ack", () => { ackPending = false; });

    throttle.on("data", async (chunk: Buffer) => {
        readStream.pause();
        await waitForAck();

        ackPending = true;
        subSystemSocket.emit("file_chunk", chunk);

        bytesSent += chunk.length;
        const progress = (bytesSent / fileSize) * 100;

        if (progress - lastProgress >= PROGRESS_BROADCAST_THRESHOLD || progress >= 100) {
            lastProgress = progress;
            movingItem.meta.progress = parseFloat(progress.toFixed(2));
            await rebroadcastMovingItems();
        }

        readStream.resume();
    });

    await pipelineAsync(readStream, throttle);

    const finalPath = await new Promise<string>((resolve, reject) => {
        subSystemSocket.emit("file_end", (result: string | false) => {
            if (result === false) {
                reject(new Error("Remote rejected the file transfer"));
            } else {
                resolve(result);
            }
        });
    });

    console.log(`[Transfer] Complete: ${finalPath}`);
    movingItem.meta.result = finalPath;
    await rebroadcastMovingItems();

    return finalPath;
}