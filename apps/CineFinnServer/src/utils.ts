import type { Account, timestamped } from '@cinefinn/types/database';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData, AnythingToServerEvents, ServerToAnythingEvents } from '@cinefinn/types/socket';
import type { Server } from 'socket.io';
import { CacheContext } from './LRUCache.js';
import { database, episodesTable, moviesTable } from './database.js';
import { Redis } from 'ioredis';
import EmailManager from './utils/EmailManager.js';
import crypto from 'crypto';
import fs from 'fs';

let io: Server<AnythingToServerEvents,
    ServerToAnythingEvents,
    InterServerEvents,
    SocketData<Account | Account & timestamped>>;
// let io: Server<ClientToServerEvents,
//     ServerToClientEvents,
//     InterServerEvents,
//     SocketData<Account | Account & timestamped>>;

export function setIO(newIO: Server<ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData<Account | Account & timestamped>>) {
    io = newIO;
}
export function getIO() {
    return io;
}

let ioRedis: Redis;
export function setIORedis(newIORedis: Redis) {
    ioRedis = newIORedis;
}
export function getIORedis() {
    return ioRedis;
}

let emailManager: EmailManager;
export function getEmailManager() {
    if (emailManager == undefined) {
        emailManager = new EmailManager();
    }
    return emailManager;
}

export async function watchableUUIDToWatchable(watchableUUID: string, cache?: CacheContext) {
    if (cache == undefined) {
        cache = new CacheContext('noop', 1);
    }
    if (watchableUUID.startsWith('EP-')) {
        let { data: episode, cacheInfo: existingSeasonCacheInfo } = await cache.execute(episodesTable, 'getOne', [{
            UUID: watchableUUID,
            unique: true,
        }]);
        return episode;
    } else if (watchableUUID.startsWith('MO-')) {
        const movie = await moviesTable.getOne({ UUID: watchableUUID });
        return movie;
    } else {
        throw new Error('Unknown Watchable UUID ' + watchableUUID);
    }
}

export function forEachNonBlocking<T>(array: T[], chunkSize: number, cb: (element: T, index: number) => void, finished?: () => void) {
    let index = 0;

    function processChunk() {
        const end = Math.min(index + chunkSize, array.length);
        for (let i = index; i < end; i++) {
            cb(array[i], i);
        }
        index = end;
        if (index < array.length) {
            setImmediate(processChunk);
        } else {
            if (finished) finished();
        }
    }
    processChunk();
}

export async function forEachNonBlockingAsync<T>(array: T[], chunkSize: number, cb: (element: T, index: number) => Promise<void>) {
    return new Promise<void>((resolve, reject) => {
        try {
            forEachNonBlocking(array, chunkSize, cb, resolve);
        } catch (error) {
            reject(error);
        }
    });
}

export async function queryDatabase(query: string, values = [] as any[]) {
    return new Promise<any[]>((resolve, reject) => {
        database.pool.query(query, values, (error, rows, fields) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(rows);
        });
    })

}

export function debounce(cb: Function, delay = 1000) {
    let timeout: NodeJS.Timeout;

    return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            cb(...args);
        }, delay);
    };
}

export function calculateMD5(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (chunk: any) => {
            hash.update(chunk)
        });
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}