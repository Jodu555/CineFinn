import path from "path";
import fs from "fs";
import type { MovingItem } from "@cinefinn/types/models/system";
import type { Episode, Movie } from "@cinefinn/types/models/media";
import { Transform } from "stream";
import { watchableEntitysTable, seriesTable } from "../database.js";
import { getSubSocketByID } from "../sockets/subsystem.socket.js";
import { watchableUUIDToWatchable, calculateMD5, isEpisode, isMovie } from "../utils.js";
import { rebroadcastMovingItems, rebroadcastOverview } from "../routes/admin/admin.js";

import { pipeline } from 'stream';
import { promisify } from 'util';
import { tryCatch } from "@cinefinn/utilities/tryCatch";
import { wait } from "@cinefinn/utilities/time";

const pipelineAsync = promisify(pipeline);

const movingItems = [] as MovingItem[];

export const getMovingItems = () => movingItems;

class MovingItemQueue {
    private items: string[] = [];
    private timeout: NodeJS.Timeout | null = null;

    private onFinishedCallback: () => void = () => { };

    public onFinished(callback: () => void) {
        this.onFinishedCallback = callback;
    }

    public enqueue(item: string) {
        console.log('MovingItemQueue: Enqueue', item);
        this.items.push(item);
        this.setupTimer();
    }

    private setupTimer() {
        if (this.timeout != null) {
            clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(() => {
            this.timeout = null;
            this.dequeue();
        }, parseInt(process.env.MOVING_ITEM_TICK!) || 5000);
    }

    public async dequeue() {
        const item = this.items.shift();
        if (item == undefined) {
            if (this.onFinishedCallback != null) {
                this.onFinishedCallback();
                clearTimeout(this.timeout!);
            }
            return null;
        }
        console.log('MovingItemQueue: Dequeue', item);
        await processMovingItem(getMovingItems().find(m => m.ID === item)!);
        if (this.items.length == 0) {
            if (this.onFinishedCallback != null) {
                this.onFinishedCallback();
                clearTimeout(this.timeout!);
            }
        } else {
            this.setupTimer();
        }
        return item;
    }

    public get length() {
        return this.items.length;
    }
}

export const movingItemQueue = new MovingItemQueue();

movingItemQueue.onFinished(async () => {
    await rebroadcastOverview();
    // setSeries(await crawlAndIndex());
    // await sendSeriesReloadToAll();
    await rebroadcastMovingItems();
    await rebroadcastOverview();
});

export async function prepareProcessMovingItem(ID: string) {
    movingItemQueue.enqueue(ID);
}

export async function processMovingItem(movingItem: MovingItem) {
    if (movingItem.fromSubID === 'main' && movingItem.toSubID !== 'main') {
        await sendMovingItemToSubSystem(movingItem);
    } else if (movingItem.fromSubID !== 'main' && movingItem.toSubID === 'main') {
        console.log('Not implemented!');
        // recieveMovingItemFromSubSystem(movingItem);
    }
}

class ThrottleStream extends Transform {
    private bytesPerSecond: number;
    private bytesSent: number = 0;
    private startTime: number;

    constructor(bytesPerSecond: number) {
        super();
        this.bytesPerSecond = bytesPerSecond;
        this.startTime = Date.now();
    }

    _transform(
        chunk: Buffer,
        encoding: BufferEncoding,
        callback: (error?: Error | null) => void
    ): void {
        this.bytesSent += chunk.length;
        
        const expectedTime = this.bytesSent / this.bytesPerSecond;
        const elapsed = (Date.now() - this.startTime) / 1000;
        const delay = Math.max(0, (expectedTime - elapsed) * 1000);

        if (delay > 0) {
            const waitUntil = Date.now() + delay;
            while (Date.now() < waitUntil) {
            }
        }

        this.push(chunk);
        callback();
    }
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export async function sendMovingItemToSubSystem(movingItem: MovingItem) {
    const { data: subSystemSocket, error } = await tryCatch(() => getSubSocketByID(movingItem.toSubID));
    if (error || subSystemSocket == null) {
        console.log(`SubSystem ${movingItem.toSubID} not found`);
        return;
    }

    const watchableEntity = await watchableEntitysTable.getOne({ UUID: movingItem.watchableEntityUUID });
    if (watchableEntity == undefined) {
        console.log(`WatchableEntity ${movingItem.watchableEntityUUID} not found`);
        return;
    }

    const series = await seriesTable.getOne({ UUID: watchableEntity.serie_UUID });
    if (series == undefined) {
        console.log(`Serie ${watchableEntity.serie_UUID} not found`);
        return;
    }

    const watchable = await watchableUUIDToWatchable(watchableEntity.watchable_UUID);
    if (watchable == undefined) {
        console.log(`Watchable ${movingItem.watchableEntityUUID} not found`);
        return;
    }

    let resultPath = '';

    if (isEpisode(watchable)) {
        resultPath = path.join(resultPath, series.tags[0], series.title, `Season-${watchable.season_IDX}`,);
    }
    if (isMovie(watchable)) {
        resultPath = path.join(resultPath, series.tags[0], series.title, 'Movies');
    }


    const filePath = watchableEntity.filePath;
    if (filePath == undefined) {
        console.log(`FilePath for WatchableEntity ${movingItem.watchableEntityUUID} not found`);
        return;
    }

    console.log(`Starting file transfer to client: ${movingItem.toSubID} ${movingItem.watchableEntityUUID}`);
    console.log(`Local Path: ${filePath}`);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(`File transfer attempt ${attempt} of ${MAX_RETRIES}`);

        try {
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }

            const stats = fs.statSync(filePath);
            const fileSize = stats.size;
            const md5 = await calculateMD5(filePath);
            const filename = path.parse(filePath).base;

            movingItem.meta.movingStarted = Date.now();
            await rebroadcastMovingItems();
            subSystemSocket.emit('file_start', {
                filename,
                size: fileSize,
                md5,
                resultPath: path.join(resultPath, filename),
            });

            const readStream = fs.createReadStream(filePath, {
                highWaterMark: 64 * 1024,
            });

            const bandwidth = subSystemSocket.data.auth.bandwith * 1024 * 1024;
            const throttle = new ThrottleStream(bandwidth);

            let bytesSent = 0;
            let lastProgress = 0;

            throttle.on('data', (chunk: Buffer) => {
                subSystemSocket.emit('file_chunk', chunk);

                bytesSent += chunk.length;
                const progress = ((bytesSent / fileSize) * 100).toFixed(2);
                if (+progress - lastProgress > 0.5 || +progress === 100) {
                    lastProgress = +progress;
                    movingItem.meta.progress = +progress;
                    rebroadcastMovingItems();
                }
            });

            await pipelineAsync(readStream, throttle);

            const finalPath = await new Promise<string>((resolve, reject) => {
                subSystemSocket.emit('file_end', (finalPath) => {
                    if (finalPath === false) {
                        reject(new Error('File transfer failed'));
                    } else {
                        resolve(finalPath);
                    }
                });
            });
            console.log('File transfer complete', finalPath);

            movingItem.meta.result = finalPath;
            await rebroadcastMovingItems();

            if (finalPath) {
                watchableEntitysTable.update({ UUID: watchableEntity.UUID }, { filePath: resultPath, subID: movingItem.toSubID });
                fs.rmSync(filePath, { recursive: true });
                await wait(1000 * 5);
                const index = getMovingItems().findIndex(m => m.ID === movingItem.ID);
                getMovingItems().splice(index, 1);
                await rebroadcastMovingItems();
            }

            return;

        } catch (err) {
            lastError = err as Error;
            console.error(`File transfer attempt ${attempt} failed:`, lastError.message);

            if (attempt < MAX_RETRIES) {
                console.log(`Retrying in ${RETRY_DELAY_MS}ms...`);
                await wait(RETRY_DELAY_MS);
            }
        }
    }

    console.error(`File transfer failed after ${MAX_RETRIES} attempts`);
    subSystemSocket.emit('file_error', { message: lastError?.message || 'Unknown error' });
}