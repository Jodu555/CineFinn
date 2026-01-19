import type { AuthHandshakeSubsystem, DiskStats, OfflineSubSystem, OnlineSubSystem, SocketAuthDataSubsystem, SubSystem } from "@cinefinn/types/socket";
import type { SocketConsumerMeta } from "./index.js";
import { getConfig } from "../config.js";
import { calculateMD5, getIO, queryDatabase } from "../utils.js";
import { seriesTable, watchableEntitysTable } from "../database.js";
import type { definedSocket } from "../index.js";
import { sendSeriesReloadToAll } from "./client.socket.js";
import { rebroadcastSubsystems } from '../routes/admin.js';
import type { MovingItem } from "@cinefinn/types/database";
import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { Transform } from 'stream';
import { tryCatch } from "../tryCatch.js";

const pipelineAsync = promisify(pipeline);

async function authFunction(authHandshake: AuthHandshakeSubsystem): Promise<SocketAuthDataSubsystem> {
    const { authToken: token } = authHandshake;

    if (token === undefined) {
        throw new Error('Unauthorized');
    }

    if (token !== getConfig().subsystem.authToken) {
        throw new Error('Unauthorized');
    }
    return {
        type: 'subsystem',
        token,
        id: authHandshake.id,
        ptoken: authHandshake.ptoken,
        readrate: authHandshake.readrate,
    };
}

export const subSocketDiskStatsMap = new Map<string, any>()

async function connectionFunction(socket: definedSocket) {
    const socketAuthData = socket.data.auth as SocketAuthDataSubsystem;
    console.log('Subsystem connected', socketAuthData.id);
    socket.on('diskStats', (stats: DiskStats) => {
        subSocketDiskStatsMap.set(socketAuthData.id, stats);
        rebroadcastSubsystems();
    });

    await toggleSeriesesForSubSystem(socketAuthData.id, false);

    await rebroadcastSubsystems();

    socket.on('disconnect', async () => {
        await toggleSeriesesForSubSystem(socketAuthData.id, true);
        subSocketDiskStatsMap.delete(socketAuthData.id);
        await rebroadcastSubsystems();
    });
}

export async function getKnownSubSystems() {
    const subIDs = new Set<string>();
    const rows = await queryDatabase(`SELECT * FROM watchableEntitys WHERE subID != 'main'`);
    rows.forEach(row => {
        subIDs.add(row.subID);
    });
    return [...subIDs];
}

export async function getSubSystems(): Promise<SubSystem[]> {
    const knownSubSystems = await getKnownSubSystems();
    const allSockets = await getIO().fetchSockets();
    const subsystems = knownSubSystems.map(async subID => {
        const { data: subSystemSocket, error } = await tryCatch(() => getSubSocketByID(subID));
        const subData = (subSystemSocket?.data.auth as SocketAuthDataSubsystem);
        const series = await getSeriesRelatedToSubSystem(subID);
        if (subData == undefined) {
            return {
                type: 'subsystem',
                id: subID,
                status: 'offline',
                name: subID,
                series,
            } as SubSystem;
        } else {

            const diskStats = subSocketDiskStatsMap.get(subID);

            if (diskStats == undefined) {
                subSystemSocket?.emit('getDiskStats');
            }

            return {
                status: 'online',
                ...subData,
                series,
                diskStats: subSocketDiskStatsMap.get(subID) || null,
            } as SubSystem;
        }
    });
    return await Promise.all(subsystems);
}

export async function getSeriesRelatedToSubSystem(subID: string) {
    const seriesIDs = new Set<string>();
    const entitys = await watchableEntitysTable.get({ subID });
    for (const entity of entitys) {
        seriesIDs.add(entity.serie_UUID);
    }
    return [...seriesIDs];
}

export async function toggleSeriesesForSubSystem(subID: string, disabled: boolean) {
    const seriesIDs = await getSeriesRelatedToSubSystem(subID);
    for (const seriesID of seriesIDs) {
        const series = await seriesTable.getOne({ UUID: seriesID });
        if (series == undefined) continue;
        series.infos.disabled = disabled;
        await seriesTable.update({ UUID: seriesID }, { infos: series.infos });
    }
    sendSeriesReloadToAll();
    console.log(`Toggling Serieses(${seriesIDs.length}) for SubSystem: ${subID} to Disabled: ${disabled}`);
}

export async function processMovingItem(movingItem: MovingItem) {

    if (movingItem.fromSubID === 'main' && movingItem.toSubID !== 'main') {
        sendMovingItemToSubSystem(movingItem);
    } else if (movingItem.fromSubID !== 'main' && movingItem.toSubID === 'main') {
        // recieveMovingItemFromSubSystem(movingItem);
    }

}

export async function getSubSocketByID(subID: string) {
    const subSystemSocket = (await getIO().fetchSockets()).filter(s => s.data.auth.type === 'subsystem' && s.data.auth.id === subID)[0];
    if (subSystemSocket == undefined) {
        throw new Error('SubSystem not found');
    }
    return subSystemSocket as any as definedSocket;
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
    if (error) {
        console.log(`SubSystem ${movingItem.toSubID} not found`);
        return;
    }

    const watchableEntity = await watchableEntitysTable.getOne({ UUID: movingItem.watchableEntityUUID });
    if (watchableEntity == undefined) {
        console.log(`WatchableEntity ${movingItem.watchableEntityUUID} not found`);
        return;
    }

    const filePath = watchableEntity.filePath;
    if (filePath == undefined) {
        console.log(`FilePath for WatchableEntity ${movingItem.watchableEntityUUID} not found`);
        return;
    }

    console.log(`Starting file transfer to client: ${filePath}`);

    try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        const md5 = await calculateMD5(filePath);
        const filename = filePath.split('/').pop() || 'unknown';

        subSystemSocket.emit('file_start', {
            filename,
            size: fileSize,
            md5,
        });

        const readStream = fs.createReadStream(filePath, {
            highWaterMark: 64 * 1024,
        });

        // 10 MB/s
        const bandwidth = 10 * 1024 * 1024
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

        throttle.on('data', async (chunk: Buffer) => {
            readStream.pause();

            await sendChunk();

            canSend = false;
            subSystemSocket.emit('file_chunk', chunk);

            bytesSent += chunk.length;
            const progress = ((bytesSent / fileSize) * 100).toFixed(2);
            console.log(`Progress: ${progress}%`);

            readStream.resume();
        });

        await pipelineAsync(readStream, throttle);

        subSystemSocket.emit('file_end');
        console.log('File transfer complete');
    } catch (err) {
        const error = err as Error;
        console.error('Error sending file:', error);
        subSystemSocket.emit('file_error', { message: error.message });
    }
}

export default {
    meta: {
        type: 'subsystem',
        authFunction,
        connectionFunction,
    } satisfies SocketConsumerMeta,
};