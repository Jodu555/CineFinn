import fs from 'fs';
import path from 'path';
import { listFiles } from './fileutils.js';
import { createHash, randomUUID } from 'node:crypto';
import { filenameParser } from './parser.js';
import { database, episodesTable, moviesTable, seriesTable, watchableEntitysTable, type Series } from './database.js';

const generateID = () => {
    return randomUUID().split('-')[0];
};

const generateSeriesID = () => {
    return `S#${generateID()}`;
};

const generateMovieID = () => {
    return `M#${generateID()}`;
};

const generateEpisodeID = () => {
    return `E#${generateID()}`;
};

const generateEntityID = () => {
    return `WE#${generateID()}`;
};

export function tryCatch<T, E = Error>(fn: () => T) {
    type Result<TResult, EResult> =
        | { data: TResult; error: null; }
        | { data: null; error: EResult; };
    type ReturnType =
        T extends Promise<infer P> ? Promise<Result<P, E>> : Result<T, E>;

    try {
        const result = fn();
        if (result instanceof Promise) {
            return result
                .then((data: Promise<unknown>) => ({ data, error: null }))
                .catch((e: unknown) => {
                    return { data: null, error: e as E };
                }) as ReturnType;
        } else {
            return { data: result, error: null } as ReturnType;
        }
    } catch (e: unknown) {
        return { data: null, error: e as E } as ReturnType;
    }
}

const cacheMap = new Map<string, {
    meta: {
        lastUpdate: number;
        ttl: number;
    };
    data: any;
}
>();
export async function cache<R>(key: string, fn: () => R): Promise<R> {
    const cache = cacheMap.get(key);
    if (cache) {
        if (cache.meta.lastUpdate + cache.meta.ttl > Date.now()) {
            return cache.data;
        }
    }
    const result = await fn();
    cacheMap.set(key, {
        meta: {
            lastUpdate: Date.now(),
            ttl: 60 * 60 * 1000,
        },
        data: result,
    });
    return result;
}

type TypeOfClassMethod<T, M extends keyof T> = T[M] extends Function ? T[M] : never;

type ExtractMethodNames<T> = { [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never }[keyof T];
type ExtractMethods<T> = Pick<T, ExtractMethodNames<T>>;

type Methods = keyof ExtractMethods<typeof seriesTable>;
type Test = TypeOfClassMethod<typeof seriesTable, 'getOne'>;

type Return = ReturnType<typeof seriesTable.getOne>;

type CacheResult<T> = {
    data: T;
    cacheInfo: {
        cacheKey: string;
        wasHit: boolean;
        lastUpdate: number;
        ttl: number;
        expiresAt: number;
    };
};

export async function automatedCache<C, M extends ExtractMethodNames<C>>(
    classInstance: C,
    method: M,
    args: Parameters<C[M] extends (...args: any[]) => any ? C[M] : never>,
    ttl: number = 60 * 60 * 1000
): Promise<CacheResult<C[M] extends (...args: any[]) => infer R ? Awaited<R> : never>> {
    const methodName = String(method);
    const jsonArgs = JSON.stringify(args);
    const key = createHash('md5').update(`${methodName}-${jsonArgs}`).digest('hex');

    const cache = cacheMap.get(key);
    if (cache) {
        if (cache.meta.lastUpdate + ttl > Date.now()) {
            return {
                data: cache.data,
                cacheInfo: {
                    cacheKey: key,
                    wasHit: true,
                    lastUpdate: cache.meta.lastUpdate,
                    ttl: cache.meta.ttl,
                    expiresAt: cache.meta.lastUpdate + cache.meta.ttl,
                },
            };
        }
    }

    // console.log('Cache Miss', key, args, methodName);

    // Call the method with proper 'this' binding
    const result = await (classInstance[method] as Function).call(classInstance, ...args);

    const now = Date.now();
    cacheMap.set(key, {
        meta: {
            lastUpdate: now,
            ttl,
        },
        data: result,
    });

    console.log(cacheMap.size);

    return {
        data: result,
        cacheInfo: {
            cacheKey: key,
            wasHit: false,
            lastUpdate: now,
            ttl,
            expiresAt: now + ttl,
        },
    };
}


export async function invalidateCache(key: string) {
    cacheMap.delete(key);
}

export async function crawl() {
    const pathEntries = [process.env.VIDEO_PATH!];
    let { files } = await listFiles(pathEntries[0]);

    const viableExtensions = ['.mp4', '.mkv', '.webm'];

    files = files.filter((f) => viableExtensions.includes(path.parse(f).ext));

    console.time('Handling Files');

    for (const file of files) {
        const base = path.parse(file).base;
        const { error, data: parsedData } = tryCatch(() => filenameParser(file, base));

        if (error != null) {
            console.log('Error Parsing File', file, error);
            continue;
        }

        let { data: exsitingSeries, cacheInfo: existingSeriesCacheInfo } = await automatedCache(seriesTable, 'getOne', [{ title: parsedData.title, unique: true }]);
        if (exsitingSeries == undefined) {
            console.log('Series Does not Exist', parsedData.title);
            const categorie = path.parse(path.join(path.parse(file).dir, '../../')).base;
            exsitingSeries = await seriesTable.create({
                UUID: generateSeriesID(),
                title: parsedData.title,
                infos: JSON.stringify({
                    disabled: false,
                }),
                refs: JSON.stringify({

                }),
                tags: JSON.stringify([categorie]),
            });
            await invalidateCache(existingSeriesCacheInfo.cacheKey);
        }

        // console.log('Series Exists', exsitingSeries.UUID, exsitingSeries.title);

        let watchableUUID;
        if (parsedData.movie == true) {
            console.log('Movie Parse', parsedData);
            let existingMovie = await moviesTable.getOne({
                serie_UUID: exsitingSeries.UUID,
                primaryName: parsedData.movieTitle,
                unique: true,
            });
            if (existingMovie == undefined) {
                console.log('Movie Does not Exist', parsedData.movieTitle);
                existingMovie = await moviesTable.create({
                    UUID: generateMovieID(),
                    primaryName: parsedData.movieTitle!,
                    serie_UUID: exsitingSeries.UUID,
                    movie_IDX: 0,
                });
                console.log('Created Movie', existingMovie.UUID, existingMovie.primaryName);
            }
            watchableUUID = existingMovie.UUID;
        } else {

            let { data: existingEpisode, cacheInfo: existingEpisodeCacheInfo } = await automatedCache(episodesTable, 'getOne', [{
                serie_UUID: exsitingSeries.UUID,
                season_IDX: parsedData.season,
                episode_IDX: parsedData.episode,
                unique: true,
            }]);
            if (existingEpisode == undefined) {
                console.log('Episode Does not Exist', parsedData.season, parsedData.episode);
                existingEpisode = await episodesTable.create({
                    UUID: generateEpisodeID(),
                    serie_UUID: exsitingSeries.UUID,
                    season_IDX: parsedData.season,
                    episode_IDX: parsedData.episode,
                });
                console.log('Created Episode', existingEpisode.UUID, existingEpisode.serie_UUID, existingEpisode.season_IDX, existingEpisode.episode_IDX);
                await invalidateCache(existingEpisodeCacheInfo.cacheKey);
            }
            watchableUUID = existingEpisode.UUID;

        }

        let { data: existingWatchableEntity, cacheInfo: existingWatchableEntityCacheInfo } = await automatedCache(watchableEntitysTable, 'getOne', [{
            watchable_UUID: watchableUUID,
            // lang: parsedData.language,
            unique: true,
        }]);
        if (existingWatchableEntity == undefined) {
            console.log('Watchable Entity Does not Exist', parsedData, parsedData.language);
            existingWatchableEntity = await watchableEntitysTable.create({
                UUID: generateEntityID(),
                watchable_UUID: watchableUUID,
                lang: parsedData.language,
                subID: 'main',
                filePath: file,
                IV: Buffer.from([]),
                runtime: -1,
                hash: '',
            });
            await invalidateCache(existingWatchableEntityCacheInfo.cacheKey);
        }



    }

    console.timeEnd('Handling Files');
    console.log('done');


}

// Without Cache:
// Handling Files: 1:01.662 (m:ss.mmm)
//
// With Cache:
// Handling Files: 37.089s (ss.mmm)