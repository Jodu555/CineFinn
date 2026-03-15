import path from "path";
import fs from "fs";
import type { MovingItem, Episode, timestamped, Movie } from "@cinefinn/types/database";
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
    private lastTime: number;
    private bytesWritten: number;

    constructor(bytesPerSecond: number) {
        super();
        this.bytesPerSecond = bytesPerSecond;
        this.lastTime = Date.now();
        this.bytesWritten = 0;
    }

    async _transform(
        chunk: Buffer,
        encoding: BufferEncoding,
        callback: (error?: Error | null) => void
    ): Promise<void> {
        const now = Date.now();
        const elapsed = (now - this.lastTime) / 1000;
        this.bytesWritten += chunk.length;

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
        resultPath = path.join(resultPath, series.tags[0], series.title, `Season-${watchable.season_IDX}`,)
    }
    if (isMovie(watchable)) {
        resultPath = path.join(resultPath, series.tags[0], series.title, 'Movies')
    }


    const filePath = watchableEntity.filePath;
    if (filePath == undefined) {
        console.log(`FilePath for WatchableEntity ${movingItem.watchableEntityUUID} not found`);
        return;
    }

    console.log(`Starting file transfer to client: ${movingItem.toSubID} ${movingItem.watchableEntityUUID}`);
    console.log(`Local Path: ${filePath}`);


    try {
        // Check if file exists
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

        const bandwidth = subSystemSocket.data.auth.bandwith * 1024 * 1024
        const throttle = new ThrottleStream(bandwidth);

        let bytesSent = 0;
        let canSend = true;

        const sendChunk = (): Promise<void> => {
            return new Promise((resolve) => {
                if (!canSend) {
                    subSystemSocket.once('ack', () => {
                        canSend = true;
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        };

        subSystemSocket.on('ack', () => {
            canSend = true;
        });

        let lastProgress = 0;
        throttle.on('data', async (chunk: Buffer) => {
            readStream.pause();

            await sendChunk();

            canSend = false;
            subSystemSocket.emit('file_chunk', chunk);

            bytesSent += chunk.length;
            const progress = ((bytesSent / fileSize) * 100).toFixed(2);
            if (+progress - lastProgress > 0.5 || +progress === 100) {
                // console.log(`Progress: ${progress}%`);
                lastProgress = +progress;
                movingItem.meta.progress = +progress;
                await rebroadcastMovingItems();
            }

            readStream.resume();
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
            // Wait a bit so the user can see the result of the transfer
            await wait(1000 * 5);
            const index = getMovingItems().findIndex(m => m.ID === movingItem.ID);
            getMovingItems().splice(index, 1);
            await rebroadcastMovingItems();
        }

    } catch (err) {
        const error = err as Error;
        console.error('Error sending file:', error);
        subSystemSocket.emit('file_error', { message: error.message });
    }
}