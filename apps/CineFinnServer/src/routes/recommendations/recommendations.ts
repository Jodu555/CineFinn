import fsDriver from 'unstorage/drivers/fs';
import type { Account } from "@cinefinn/types/models/user";
import type { DetailedSeries, Episode, Movie, WatchableEntity } from "@cinefinn/types/models/media";
import type { timestamped } from "@cinefinn/types/shared";
import { Hono } from "hono";
import { createStorage, prefixStorage } from "unstorage";
import { cacheRegistry } from "../admin/cache.js";
import { authMiddleware } from "../../middleware/auth.js";
import { fullIndexStorage, indexStorage } from "../index.js";
import { episodesTable, moviesTable, seriesTable, watchableEntitysTable, watchHistoryTable } from "../../database.js";
import { cachingMiddleware, featureFlags, forEachNonBlockingAsync, getIO, loggerInstances, queryDatabase } from "../../utils.js";
import { getConfig } from '../../config.js';
import path from 'path';
import { pickPreviewImage } from './imageHelper.js';
import { addSocketAwaitConnection } from '../../sockets/client.socket.js';
import { wait } from '@cinefinn/utilities/time';

type CacheMap = Map<string, DetailedSeries>;

async function prepareCachedSeriesMap(): Promise<CacheMap> {
    const fullSeriesMap = new Map<string, DetailedSeries>();
    const fullSeriesIndex = await fullIndexStorage.get('fullIndex') as any as DetailedSeries[] || [];
    fullSeriesIndex.forEach(s => {
        fullSeriesMap.set(s.UUID, s);
    });
    return fullSeriesMap;
}

async function getCachedSeriesWatchableNumber(seriesUUID: string, cacheMap?: CacheMap) {
    let fullIndexSeries: DetailedSeries | undefined;
    if (cacheMap) {
        fullIndexSeries = cacheMap.get(seriesUUID);
    } else {
        const fullSeriesIndex = await fullIndexStorage.get('fullIndex') as any as DetailedSeries[] || [];
        fullIndexSeries = fullSeriesIndex.find(x => x.UUID == seriesUUID);
    }
    let episodeCount = 0;
    if (fullIndexSeries) {
        episodeCount += fullIndexSeries.movies.length;
        fullIndexSeries.seasons.flat().forEach(s => {
            episodeCount += s.episodes.length;
        });
    } else {
        const movies = await moviesTable.count({ serie_UUID: seriesUUID });
        const episodes = await episodesTable.count({ serie_UUID: seriesUUID });
        episodeCount = movies + episodes;
    }
    return episodeCount;
}

async function getCachedSeriesWatchableIndexes(seriesUUID: string, watchableUUID: string, cacheMap?: CacheMap): Promise<{ season: number, episode: number; }> {
    let fullIndexSeries: DetailedSeries | undefined;
    if (cacheMap) {
        fullIndexSeries = cacheMap.get(seriesUUID);
    } else {
        const fullSeriesIndex = await fullIndexStorage.get('fullIndex') as any as DetailedSeries[] || [];
        fullIndexSeries = fullSeriesIndex.find(x => x.UUID == seriesUUID);
    }

    if (watchableUUID.startsWith('EP-')) {
        let returnEpisode: Episode | undefined;
        outer: for (const season of fullIndexSeries?.seasons || []) {
            for (const episode of season.episodes) {
                if (episode.UUID == watchableUUID) {
                    returnEpisode = episode;
                    break outer;
                }
            };
        }
        if (returnEpisode !== undefined) {
            return { season: returnEpisode.season_IDX, episode: returnEpisode.episode_IDX };
        }
        const episode = await episodesTable.getOne({ UUID: watchableUUID });
        if (episode !== null) {
            return { season: episode.season_IDX, episode: episode.episode_IDX };
        }
        return { season: 0, episode: 0 };


    } else if (watchableUUID.startsWith('MO-')) {
        let returnMovie: Movie | undefined;
        for (const movie of fullIndexSeries?.movies || []) {
            if (movie.UUID == watchableUUID) {
                returnMovie = movie;
                break;
            }
        }
        if (returnMovie !== undefined) {
            return { season: 0, episode: returnMovie?.movie_IDX || 0 };
        }
        const movie = await moviesTable.getOne({ UUID: watchableUUID });
        if (movie !== null) {
            return { season: 0, episode: movie.movie_IDX };
        }
        return { season: 0, episode: 0 };
    }
    throw new Error('Unknown Watchable UUID ' + watchableUUID);
}

type AdditionalCarouselMeta = {
    showNewRibbon?: boolean;
    showWatchableCount?: boolean;
    wrapAround?: boolean;
    randomize?: boolean;
    autoplay?: number;
    stream?: boolean; // If true, the carousel will be streamed to the client via socket.io
};

type CarouselMeta = {
    order: number;
    id: string;
    title: string;
    icon: string[];
    description: string;
    userspecific: boolean;
    returnItemsCount: number;
    additionalMeta?: AdditionalCarouselMeta;
};

type CarouselResponseItem = { items: any[]; } & CarouselMeta;

type CarouselDetails = {} & CarouselMeta & (CarouselDetailsSeries | CarouselDetailsEntity);

interface CarouselDetailsEntity {
    type: 'entity';
    computeFn: (user: Account, meta: CarouselMeta, cacheMap?: CacheMap) => CarouselEntityDetailsResult;
}

interface CarouselDetailsSeries {
    type: 'series';
    computeFn: (user: Account, meta: CarouselMeta, cacheMap?: CacheMap) => CarouselSeriesDetailsResult;
}

type CarouselSeriesDetailsResult = Promise<{
    UUID: string;
    episodeCount: number;
}[]>;

type CarouselEntityDetailsResult = Promise<{
    watchTime: number;
    entity: (WatchableEntity & timestamped & { additional: AdditionalEntityData; });
}[]>;

type AdditionalEntityData = {
    imageFile: string;
    season: number;
    episode: number;
};

const carouselRegistry = new Map<string, CarouselDetails>();

async function getNewlyAddedSeries(user: Account, meta: CarouselMeta, map?: CacheMap): CarouselSeriesDetailsResult {
    const cacheMap = map || await prepareCachedSeriesMap();
    const series = await seriesTable.getLatest('created', {}, meta.returnItemsCount);

    return await Promise.all(series.map(async s => {
        return {
            UUID: s.UUID,
            episodeCount: await getCachedSeriesWatchableNumber(s.UUID, cacheMap),
        };
    }));
}

async function getNewlyReleasedEpisodes(user: Account, meta: CarouselMeta, map?: CacheMap): CarouselEntityDetailsResult {
    const cacheMap = map || await prepareCachedSeriesMap();
    const watchableEntitys = await watchableEntitysTable.getLatest('created', {}, meta.returnItemsCount);
    return await Promise.all(watchableEntitys
        .map(async w => {
            delete (w as any).filePath;
            const indezes = await getCachedSeriesWatchableIndexes(w.serie_UUID, w.watchable_UUID, cacheMap);
            return {
                watchTime: 0,
                entity: {
                    ...w,
                    additional: {
                        imageFile: await decideEntityImage(w),
                        season: indezes.season,
                        episode: indezes.episode,
                    }
                },
            };
        }));
}

async function getStillRunningSeries(user: Account, meta: CarouselMeta, map?: CacheMap): CarouselSeriesDetailsResult {
    const cacheMap = map || await prepareCachedSeriesMap();

    const newlyAddedSeriesCarousel = await getNewlyAddedSeries(user, meta, cacheMap);
    const ignoreSeriesList = new Set(...newlyAddedSeriesCarousel.map(x => x.UUID));

    const seriesUUIDs = await queryDatabase<{ UUID: string; }>(`SELECT UUID FROM ${seriesTable.table_name}`);
    const possibleSeries = new Set(seriesUUIDs.map(s => s.UUID).filter(s => !ignoreSeriesList.has(s)));

    const seriesUpdateMap = new Map<string, number>();

    // const allWatchableEntitys = await watchableEntitysTable.get();
    const allWatchableEntitys = await watchableEntitysTable.getLatest('created', {}, meta.returnItemsCount * 70);
    allWatchableEntitys
        .filter(w => possibleSeries.has(w.serie_UUID))
        .sort((a, b) => a.created_at - b.created_at)
        .slice(0, meta.returnItemsCount * 40)
        .forEach(wacthableEntity => {
            if (seriesUpdateMap.has(wacthableEntity.serie_UUID)) {
                const latestTime = seriesUpdateMap.get(wacthableEntity.serie_UUID)!;
                if (wacthableEntity.created_at > latestTime) {
                    seriesUpdateMap.set(wacthableEntity.serie_UUID, wacthableEntity.created_at);
                }
            } else {
                seriesUpdateMap.set(wacthableEntity.serie_UUID, wacthableEntity.created_at);
            }
        });

    return await Promise.all(
        [...seriesUpdateMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, meta.returnItemsCount)
            .map(async ([UUID, time]) => {
                return {
                    UUID,
                    episodeCount: await getCachedSeriesWatchableNumber(UUID, cacheMap),
                };
            })
    );
}

async function getWatchAgainSeries(user: Account, meta: CarouselMeta, map?: CacheMap): CarouselSeriesDetailsResult {
    const cacheMap = map || await prepareCachedSeriesMap();
    const watchHistory = await watchHistoryTable.get({ account_UUID: user.UUID });

    // Key: Serie UUID, Value: Anzahl der Watchables gesehen.
    const watchHistoryMap = new Map<string, number>();

    watchHistory.forEach(wh => {
        if (watchHistoryMap.has(wh.series_UUID)) {
            watchHistoryMap.set(wh.series_UUID, watchHistoryMap.get(wh.series_UUID)! + 1);
        } else {
            watchHistoryMap.set(wh.series_UUID, 1);
        }
    });

    let count = 0;
    const output: {
        UUID: string;
        watchedWatchables: number;
        watchableCount: number;
        percentage: number;
    }[] = [];

    await forEachNonBlockingAsync(watchHistoryMap.keys().toArray(), 100, async UUID => {
        const watchedWatchables = watchHistoryMap.get(UUID)!;
        const watchableCount = await getCachedSeriesWatchableNumber(UUID, cacheMap);
        output.push({
            UUID,
            watchedWatchables,
            watchableCount,
            percentage: Math.round((watchedWatchables / watchableCount) * 100),
        });
    });

    const over80PercentCompletion = output
        .sort((a, b) => b.percentage - a.percentage)
        .filter(x => x.percentage > 80);

    const randomOrNot = meta.additionalMeta?.randomize ? over80PercentCompletion.sort(() => Math.random() - 0.5) : over80PercentCompletion;

    return randomOrNot
        .slice(0, meta.returnItemsCount)
        .map(x => {
            return {
                UUID: x.UUID,
                episodeCount: x.watchableCount,
            };
        });

}

async function getContinueWatchingEpisodes(user: Account, meta: CarouselMeta): CarouselEntityDetailsResult {
    interface dbResponseRow {
        UUID: string;
        account_UUID: string;
        watchable_UUID: string;
        watchTime: number;
        series_UUID: string;
        updated_at: string;
        watchableEntity_UUID: string;
        episode_Idx: number;
        season_Idx: number;
        movie_Idx: number;
        avg_runtime: number;
        watched_percent: number;
        watchableEntity: (WatchableEntity & timestamped);
    }

    const sql = `
            SELECT
            wh.UUID,
            wh.account_UUID,
            wh.watchable_UUID,
            wh.watchTime,
            wh.series_UUID,
            wh.updated_at,
            we.\`UUID\` AS watchableEntity_UUID,
            ep.season_IDX AS season_Idx,
            ep.episode_IDX AS episode_Idx,
            mo.movie_IDX AS movie_Idx,
            AVG(we.runtime)                                    AS avg_runtime,
            ROUND((wh.watchTime / AVG(we.runtime)) * 100, 2)  AS watched_percent,
            JSON_OBJECT(
                'UUID',         we.UUID,
                'watchable_UUID', we.watchable_UUID,
                'serie_UUID',   we.serie_UUID,
                'lang',         we.lang,
                'subID',        we.subID,
                'runtime',      we.runtime,
                'created_at',   we.created_at,
                'updated_at',   we.updated_at
            )                                                  AS watchableEntity
        FROM ${watchHistoryTable.table_name} wh
        JOIN ${watchableEntitysTable.table_name} we ON we.watchable_UUID = wh.watchable_UUID
        LEFT JOIN ${episodesTable.table_name} ep ON wh.watchable_UUID = ep.\`UUID\`
        LEFT JOIN ${moviesTable.table_name} mo ON wh.watchable_UUID = mo.\`UUID\`
        WHERE wh.account_UUID = ?
        GROUP BY
            wh.UUID,
            wh.account_UUID,
            wh.watchable_UUID,
            wh.watchTime
        HAVING watched_percent > ? AND watched_percent < ?
        ORDER BY updated_at DESC
        `;
    const betweenPercentage = [20, 80];
    const dbResponse = await queryDatabase<dbResponseRow>(sql, [user.UUID, betweenPercentage[0], betweenPercentage[1]], ['watchableEntity']);

    const seriesMap = new Map<string, dbResponseRow[]>();

    dbResponse.forEach(row => {
        if (seriesMap.has(row.series_UUID)) {
            seriesMap.get(row.series_UUID)!.push(row);
        } else {
            seriesMap.set(row.series_UUID, [row]);
        }
    });

    const output = await Promise.all(Array.from(seriesMap.entries()).map(async ([seriesUUID, rows]) => {
        let row: dbResponseRow | undefined;
        if (rows.length === 1) {
            row = rows[0]!;
        } else {
            row = rows.reduce((best, current) => {
                if (current.season_Idx > best.season_Idx) return current;
                if (current.season_Idx === best.season_Idx && current.episode_Idx > best.episode_Idx) return current;
                return best;
            });
        }

        return {
            watchTime: row.watchTime,
            entity: {
                ...row.watchableEntity,
                additional: {
                    imageFile: await decideEntityImage(row.watchableEntity, row.watchTime),
                    season: row.season_Idx,
                    episode: row.episode_Idx || row.movie_Idx,
                }
            },
        };
    }));

    const randomOrNot = meta.additionalMeta?.randomize ? output.sort(() => Math.random() - 0.5) : output;

    return randomOrNot.slice(0, meta.returnItemsCount);
}

async function getMarathonWorthySeries(user: Account, meta: CarouselMeta, map?: CacheMap): CarouselSeriesDetailsResult {
    // const cacheMap = map || await prepareCachedSeriesMap();
    interface dbResponseRow {
        UUID: string;
        movieNum: number;
        episodeNum: number;
        totalNum: number;
    }

    const cutOffTotalNum = 90;

    const sql = `
        SELECT 
            s.UUID,
            s.title,
            IFNULL(m.movieNum, 0) AS movieNum,
            IFNULL(e.episodeNum, 0) AS episodeNum,
            IFNULL(m.movieNum, 0) + IFNULL(e.episodeNum, 0) AS totalNum
        FROM ${seriesTable.table_name} s
        LEFT JOIN (
            SELECT serie_UUID, COUNT(*) AS movieNum
            FROM ${moviesTable.table_name}
            GROUP BY serie_UUID
        ) m ON m.serie_UUID = s.UUID
        LEFT JOIN (
            SELECT serie_UUID, COUNT(*) AS episodeNum
            FROM ${episodesTable.table_name}
            GROUP BY serie_UUID
        ) e ON e.serie_UUID = s.UUID
        HAVING totalNum > ?
        ORDER BY totalNum DESC
    `;

    const dbResponse = await queryDatabase<dbResponseRow>(sql, [cutOffTotalNum]);

    const result = await Promise.all(dbResponse.map(async s => {
        return {
            UUID: s.UUID,
            episodeCount: s.episodeNum,
        };
    }))
    const randomOrNot = meta.additionalMeta?.randomize ? result.sort(() => Math.random() - 0.5) : result;

    return randomOrNot
        .slice(0, meta.returnItemsCount)
}

carouselRegistry.set('newly-added-series', {
    order: 0,
    id: 'newly-added-series',
    title: 'Neu hinzugefügt',
    icon: ['fas', 'fire'],
    description: 'Die Top 20 neu hinzugefügten Serien',
    type: 'series',
    userspecific: false,
    returnItemsCount: 20,
    additionalMeta: {
        showNewRibbon: true,
        showWatchableCount: true,
        wrapAround: false,
    },
    computeFn: getNewlyAddedSeries
});

carouselRegistry.set('still-running-series', {
    order: 1,
    id: 'still-running-series',
    title: 'Brand aktuell',
    icon: ['fas', 'tower-broadcast'],
    description: 'Top 15 Serien, die eine neue Folge erhalten haben und nicht in Neu hinzugefügten Serien enthalten sind',
    type: 'series',
    userspecific: false,
    returnItemsCount: 15,
    additionalMeta: {
        showWatchableCount: true,
    },
    computeFn: getStillRunningSeries
});

carouselRegistry.set('new-released-episodes', {
    order: 2,
    id: 'new-released-episodes',
    title: 'Neue Folgen',
    icon: ['fas', 'bell'],
    description: 'Top 25 neu hinzugefügte Episoden',
    type: 'entity',
    userspecific: false,
    returnItemsCount: 25,
    additionalMeta: {
        showNewRibbon: true,
        wrapAround: false,
    },
    computeFn: getNewlyReleasedEpisodes
});

carouselRegistry.set('watch-again', {
    order: 3,
    id: 'watch-again',
    title: 'Nochmal ansehen',
    // icon: ['fas', 'eye'],
    icon: ['fas', 'arrow-rotate-left'],
    description: 'Die Top 25 Serien, die du schon einmal gesehen hast (80% WatchCompletion)',
    type: 'series',
    userspecific: true,
    returnItemsCount: 25,
    additionalMeta: {
        randomize: true,
        stream: true,
    },
    computeFn: getWatchAgainSeries
});

carouselRegistry.set('continue-watching', {
    order: 4,
    id: 'continue-watching',
    title: 'Weiterschauen',
    icon: ['fas', 'clock-rotate-left'],
    description: 'Die Letzten 25 Folgen bei denen du zwischen 20% & 80% Wiedergabe beendet hast sortier nach der aktuellsten Wiedergabe',
    type: 'entity',
    userspecific: true,
    returnItemsCount: 25,
    additionalMeta: {
        randomize: false,
        stream: true,
    },
    computeFn: getContinueWatchingEpisodes
});

carouselRegistry.set('marathon-worthy', {
    order: 5,
    id: 'marathon-worthy',
    title: 'Perfekt für den Marathon',
    icon: ['fas', 'person-running'],
    description: 'Top 30 Serien, die mehr als 90 Episoden haben',
    type: 'series',
    userspecific: false,
    returnItemsCount: 30,
    additionalMeta: {
        showWatchableCount: true,
        randomize: true,
        wrapAround: true,
        autoplay: 1000 * 10
    },
    computeFn: getMarathonWorthySeries
});

//Missing: your-list, new-in-german, total-classic, category-specific like Drama or Isekai,

const recommendationStorage = createStorage<CarouselResponseItem>();

cacheRegistry.set('recommendations', recommendationStorage);

const router = new Hono()
    .get("/", authMiddleware, async (c) => {
        const cacheMap = await prepareCachedSeriesMap();
        const user = c.get('credentials').user;
        const output = [] as CarouselResponseItem[];

        const buildCarouselResponse = async (
            carouselKey: string,
            carousel: CarouselDetails
        ): Promise<CarouselResponseItem | null> => {
            if (!carousel.userspecific) {
                const cached = await recommendationStorage.get(carouselKey) as CarouselResponseItem | undefined;
                if (cached) {
                    console.log('Cache hit', carouselKey);
                    return cached;
                }
                console.log('Cache miss', carouselKey);
            }

            const result = await carousel.computeFn(user, carousel, cacheMap);
            if (result.length === 0) {
                console.log('No results for', carouselKey);
                return null;
            }

            const { computeFn, ...carouselData } = carousel;
            const responseCarousel = { ...carouselData, items: result };

            if (!carousel.userspecific) {
                await recommendationStorage.setItem(carouselKey, responseCarousel);
            }

            return responseCarousel;
        };

        const socketID = c.get('credentials').socketID;

        await Promise.all(
            carouselRegistry.entries().map(async ([carouselKey, carousel]) => {
                loggerInstances.recommendationTimings && console.time(carouselKey);

                const TIMEOUT = 1000 * 25;

                // Only Do streaming if the carousel should be streamed and we have a socketID of the user
                if (carousel.additionalMeta?.stream && socketID) {
                    new Promise<void>(async (resolve, reject) => {
                        let dataProm: Promise<CarouselResponseItem | null>;
                        dataProm = buildCarouselResponse(carouselKey, carousel);
                        addSocketAwaitConnection(socketID, {
                            once: true,
                            timeoutMs: TIMEOUT,
                            resolve: async (socket) => {
                                if (socket === undefined) {
                                    console.log('Socket not resolved for recommendation streaming, hit timeout: ', TIMEOUT, 'ms');
                                    return;
                                }
                                socket.emit('recommendationsAdd', [await dataProm]);
                                resolve();
                            }
                        });
                    });
                    loggerInstances.recommendationTimings && console.timeEnd(carouselKey);
                    return;
                }
                const item = await buildCarouselResponse(carouselKey, carousel);
                if (carousel.type === 'entity') {
                    const items = item?.items as Awaited<CarouselEntityDetailsResult>;
                    item!.items = items.filter(async e => {
                        return e.entity.additional.imageFile !== 'null.jpg';
                    });
                }
                if (item) output.push(item);
                loggerInstances.recommendationTimings && console.timeEnd(carouselKey);
            })
        );

        return c.json(output.sort((a, b) => a.order - b.order));
    });

/**
 * If featureFlags.useSmartImageDecision is enabled this function decides the image for a WE
 * If featureFlags.useSmartImageDecision is disabled this function returns preview1.jpg
 * @param entity The WatchableEntity(WE) to decide the image for
 * @param watchtime Optional: The Watchtime of the entity in seconds to determine if there are images to skip
 * @returns the Filename decided for the WE, and watchtime if provided, in form of preview[0-9]+.jpg
 */
async function decideEntityImage(entity: WatchableEntity, watchtime?: number) {
    if (!featureFlags.useSmartImageDecision) {
        return 'preview1.jpg';
    }
    const inputFolder = path.join(
        getConfig().imagePath,
        entity.serie_UUID,
        'previewImages',
        entity.watchable_UUID,
        entity.UUID,
    );
    const file = await pickPreviewImage(inputFolder, watchtime ? Math.floor(watchtime / 10) : undefined);
    //TODO: Maybe return a placeholder image here. Cause maybe preview0.jpg also does not exist when folder or file not found
    if (file == undefined || file == null) return 'preview1.jpg'; //Return First image if no image was found
    return path.parse(file).base;
}


export { router as recommendationRouter, recommendationStorage };