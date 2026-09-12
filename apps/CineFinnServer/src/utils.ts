import type { Account } from '@cinefinn/types/models/user';
import type { Episode, Movie } from '@cinefinn/types/models/media';
import type { timestamped } from '@cinefinn/types/shared';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData, AnythingToServerEvents, ServerToAnythingEvents } from '@cinefinn/types/socket';
import type { Server } from 'socket.io';
import { CacheContext } from './LRUCache.js';
import { database, episodesTable, moviesTable } from './database.js';
import { Redis } from 'ioredis';
import EmailManager from './utils/EmailManager.js';
import crypto from 'crypto';
import fs from 'fs';
import type { Storage, StorageValue } from 'unstorage';
import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';

import packageJson from '../package.json' with { type: 'json' };

export const getServiceName = () => {
    return packageJson.name;
}

let io: Server<AnythingToServerEvents,
    ServerToAnythingEvents,
    InterServerEvents,
    SocketData<Account | Account & timestamped>>;
// let io: Server<ClientToServerEvents,
//     ServerToClientEvents,
//     InterServerEvents,
//     SocketData<Account | Account & timestamped>>;

export const loggerInstances = {
    updateTime: false,
    pickPreviewImage: false,
    recommendationTimings: false
};

export const featureFlags = {
    useSmartImageDecision: true,
};

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
        console.log('Unknown Watchable UUID ' + watchableUUID);
        return undefined;
    }
}

export function isMovie(watchable: Movie | Episode): watchable is Movie {
    return 'movie_IDX' in watchable;
}

export function isEpisode(watchable: Movie | Episode): watchable is Episode {
    return 'episode_IDX' in watchable;
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

// export async function forEachNonBlockingAsync<T>(array: T[], chunkSize: number, cb: (element: T, index: number) => Promise<void>) {
//     return new Promise<void>((resolve, reject) => {
//         try {
//             forEachNonBlocking(array, chunkSize, cb, resolve);
//         } catch (error) {
//             reject(error);
//         }
//     });
// }

export async function forEachNonBlockingAsync<T>(
    array: T[],
    chunkSize: number,
    cb: (element: T, index: number) => Promise<void>
) {
    let index = 0;

    while (index < array.length) {
        const end = Math.min(index + chunkSize, array.length);

        const promises: Promise<void>[] = [];
        for (let i = index; i < end; i++) {
            promises.push(cb(array[i], i));
        }

        await Promise.all(promises);

        index = end;

        // Yield/Push to event loop between chunks thats what makes it non-blocking
        await new Promise<void>(resolve => setImmediate(resolve));
    }
}

export async function queryDatabase<R = any>(query: string, values = [] as any[], jsonFields = [] as string[]): Promise<R[]> {
    return new Promise<any[]>((resolve, reject) => {
        database.pool.query(query, values, (error, rows, fields) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(rows.map((e: any) => {
                if (jsonFields.length === 0) {
                    return e;
                } else {
                    jsonFields.forEach(field => {
                        e[field] = JSON.parse(e[field]);
                    });
                    return e;
                }
            }));
        });
    });

}

// export function debounce(cb: Function, delay = 1000) {
//     let timeout: NodeJS.Timeout;

//     return (...args: any[]) => {
//         clearTimeout(timeout);
//         timeout = setTimeout(() => {
//             cb(...args);
//         }, delay);
//     };
// }


export function calculateMD5(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (chunk: any) => {
            hash.update(chunk);
        });
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

export const cachingMiddleware = <T extends StorageValue>(storage: Storage<T>, keyFunction = (c: Context<any>) => c.req.url) => {
    return createMiddleware(async (c, next) => {
        const key = keyFunction(c);
        if (await storage.hasItem(key)) {
            c.header('X-Cache-Hit', 'true');
            return c.json(await storage.getItem(key));
        } else {
            await next();
            if (c.res.status !== 200) return;
            const response = (await c.res.clone().json()) as T;
            await storage.setItem(key, response);
        }
    });
};

import { context, trace, SpanStatusCode, type Span } from '@opentelemetry/api'

const tracer = trace.getTracer(getServiceName())

export async function withSpan<T>(
    name: string,
    fn: (span: ReturnType<typeof tracer.startSpan>) => Promise<T> | T,
    attrs: Record<string, any> = {}
): Promise<T> {
    const span = tracer.startSpan(name, { attributes: attrs });
    try {
        return await context.with(trace.setSpan(context.active(), span), async () => {
            const result = await fn(span);
            return result;
        });
    } catch (err: any) {
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        throw err;
    } finally {
        span.end();
    }
}
