import type { Account, DetailedSeries, timestamped, WatchableEntity } from "@cinefinn/types/database";
import { Hono } from "hono";
import { createStorage, prefixStorage } from "unstorage";
import { cacheRegistry } from "./admin/cache.js";
import { authMiddleware } from "../middleware/auth.js";
import { fullIndexStorage, indexStorage } from "./index.js";
import { seriesTable, watchableEntitysTable, watchHistoryTable } from "../database.js";
import { queryDatabase } from "../utils.js";

async function getCachedSeriesWatchableNumber(seriesUUID: string) {
    const fullSeriesIndex = await fullIndexStorage.get('fullIndex') as any as DetailedSeries[] || [];
    const fullIndexSeries = fullSeriesIndex.find(x => x.UUID == seriesUUID)
    let episodeCount = -1;
    if (fullIndexSeries) {
        episodeCount += fullIndexSeries.movies.length;
        fullIndexSeries.seasons.flat().forEach(s => {
            episodeCount += s.episodes.length;
        })
    }
    return episodeCount;
}


type CarouselMeta = {
    order: number;
    id: string;
    title: string;
    icon: string[];
    description: string;
    // type: 'series' | 'entity'; // horizontal or vertical
    userspecific: boolean;
}

type CarouselResponseItem = { items: any[] } & CarouselMeta;

type CarouselDetails = {} & CarouselMeta & (CarouselDetailsSeries | CarouselDetailsEntity);

interface CarouselDetailsEntity {
    type: 'entity';
    computeFn: (user: Account, ctx: CarouselResponseItem[]) => CarouselEntityDetailsResult;
}

interface CarouselDetailsSeries {
    type: 'series';
    computeFn: (user: Account, ctx: CarouselResponseItem[]) => CarouselSeriesDetailsResult;
}

type CarouselSeriesDetailsResult = Promise<{
    UUID: string;
    episodeCount: number;
}[]>;

type CarouselEntityDetailsResult = Promise<{
    watchTime: number;
    entity: (WatchableEntity & timestamped);
}[]>;

const carouselRegistry = new Map<string, CarouselDetails>();

async function getNewlyAddedSeries(user: Account, ctx: CarouselResponseItem[]): CarouselSeriesDetailsResult {
    const series = await seriesTable.getLatest('created', {}, 40)
    series
        .sort((a, b) => a.updated_at - b.updated_at)
        .slice(0, 20);

    return await Promise.all(series.map(async s => {
        return {
            UUID: s.UUID,
            episodeCount: await getCachedSeriesWatchableNumber(s.UUID),
        }
    }));
}

async function getNewlyReleasedEpisodes(user: Account, ctx: CarouselResponseItem[]): CarouselEntityDetailsResult {
    const watchableEntitys = await watchableEntitysTable.getLatest('created', {}, 40);
    return watchableEntitys
        .sort((a, b) => a.updated_at - b.updated_at)
        .slice(0, 25).map(w => {
            delete (w as any).filePath;
            return {
                watchTime: 0,
                entity: w,
            }
        });
}

async function getStillRunningSeries(user: Account, ctx: CarouselResponseItem[]): CarouselSeriesDetailsResult {
    const newlyAddedSeriesCarousel = ctx.find(x => x.id === 'newly-added-series');
    if (!newlyAddedSeriesCarousel) return [];
    const ignoreSeriesList = newlyAddedSeriesCarousel.items.map(x => x.UUID);

    const allSeries = await seriesTable.get();
    const possibleSeries = allSeries.filter(s => !ignoreSeriesList.includes(s.UUID));

    const seriesUpdateMap = new Map<string, number>();

    const allWatchableEntitys = await watchableEntitysTable.getLatest('created', {}, 500);
    allWatchableEntitys
        .filter(w => possibleSeries.find(s => s.UUID == w.serie_UUID))
        .sort((a, b) => a.created_at - b.created_at)
        .slice(0, 100)
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

    const fullSeriesIndex = await fullIndexStorage.get('fullIndex') as any as DetailedSeries[] || [];
    return await Promise.all([...seriesUpdateMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(async ([UUID, time]) => {
        return {
            UUID,
            episodeCount: await getCachedSeriesWatchableNumber(UUID),
        }
    }))
}

async function getWatchAgainSeries(user: Account, ctx: CarouselResponseItem[]): CarouselSeriesDetailsResult {
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
    const possibleSeries = await Promise.all(watchHistoryMap.keys().map(async UUID => {
        const watchedWatchables = watchHistoryMap.get(UUID)!;
        const watchableCount = await getCachedSeriesWatchableNumber(UUID);
        return {
            UUID,
            watchedWatchables,
            watchableCount,
            percentage: Math.round((watchedWatchables / watchableCount) * 100),
        }
    }));

    return possibleSeries
        .sort((a, b) => b.percentage - a.percentage)
        .filter(x => x.percentage > 80)
        .slice(0, 25)
        .map(x => {
            return {
                UUID: x.UUID,
                episodeCount: x.watchableCount,
            }
        });
}

async function getContinueWatchingEpisodes(user: Account, ctx: CarouselResponseItem[]): CarouselEntityDetailsResult {
    interface dbResponseRow {
        UUID: string;
        account_UUID: string;
        watchable_UUID: string;
        watchTime: number;
        series_UUID: string;
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
                'filePath',     we.filePath,
                'runtime',      we.runtime,
                'created_at',   we.created_at,
                'updated_at',   we.updated_at
            )                                                  AS watchableEntity
        FROM watchHistory wh
        JOIN watchableEntitys we ON we.watchable_UUID = wh.watchable_UUID
        LEFT JOIN episodes ep ON wh.watchable_UUID = ep.\`UUID\`
        LEFT JOIN movies mo ON wh.watchable_UUID = mo.\`UUID\`
        WHERE wh.account_UUID = ?
        GROUP BY
            wh.UUID,
            wh.account_UUID,
            wh.watchable_UUID,
            wh.watchTime
        HAVING watched_percent > ? AND watched_percent < ?
        `
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

    const output: Awaited<CarouselEntityDetailsResult> = [];

    for (const [seriesUUID, rows] of seriesMap) {
        if (rows.length === 1) {
            output.push({
                watchTime: rows[0]!.watchTime,
                entity: rows[0]!.watchableEntity,
            })
        } else {
            const latestRow = rows.reduce((best, current) => {
                if (current.season_Idx > best.season_Idx) return current;
                if (current.season_Idx === best.season_Idx && current.episode_Idx > best.episode_Idx) return current;
                return best;
            });

            output.push({
                watchTime: latestRow.watchTime,
                entity: latestRow.watchableEntity,
            });
        }
    }

    return output;
}

carouselRegistry.set('newly-added-series', {
    order: 0,
    id: 'newly-added-series',
    title: 'Neu hinzugefügt',
    icon: ['fas', 'fire'],
    description: 'Die Top 20 neu hinzugefügten Serien',
    type: 'series',
    userspecific: false,
    computeFn: getNewlyAddedSeries
});


carouselRegistry.set('watch-again', {
    order: 1,
    id: 'watch-again',
    title: 'Nochmal ansehen',
    // icon: ['fas', 'eye'],
    icon: ['fas', 'arrow-rotate-left'],
    description: 'Die Top 25 Serien, die du schon einmal gesehen hast (80% WatchCompletion)',
    type: 'series',
    userspecific: true,
    computeFn: getWatchAgainSeries
});

carouselRegistry.set('still-running-series', {
    order: 2,
    id: 'still-running-series',
    title: 'Brand aktuell',
    icon: ['fas', 'tower-broadcast'],
    description: 'Top 15 Serien, die eine neue Folge erhalten haben und nicht in Neu hinzugefügten Serien enthalten sind',
    type: 'series',
    userspecific: false,
    computeFn: getStillRunningSeries
})

carouselRegistry.set('continue-watching', {
    order: 3,
    id: 'continue-watching',
    title: 'Weiterschauen',
    icon: ['fas', 'clock-rotate-left'],
    description: 'Folgen bei denen du vor 90% Wiedergabe beendet hast',
    type: 'entity',
    userspecific: true,
    computeFn: getContinueWatchingEpisodes
})

carouselRegistry.set('new-released-episodes', {
    order: 4,
    id: 'new-released-episodes',
    title: 'Neue Folgen',
    icon: ['fas', 'bell'],
    description: 'Top 25 neu hinzugefügte Episoden',
    type: 'entity',
    userspecific: false,
    computeFn: getNewlyReleasedEpisodes
})

const recommendationStorage = createStorage<CarouselResponseItem>();


cacheRegistry.set('recommendations', recommendationStorage);

const router = new Hono()
    .get("/", authMiddleware, async (c) => {

        const user = c.get('credentials').user;
        const output = [] as CarouselResponseItem[];

        await Promise.all(
            carouselRegistry.entries().map(async ([carouselKey, carousel]) => {
                console.time(carouselKey)
                if (!carousel.userspecific) {
                    const cacheKey = `${carouselKey}`;
                    if (await recommendationStorage.has(cacheKey)) {
                        console.log('Cache hit', carouselKey);
                        const cache = await recommendationStorage.get(cacheKey) as CarouselResponseItem;
                        output.push(cache);
                        console.timeEnd(carouselKey)
                        return;
                    }
                    console.log('Cache miss', carouselKey);

                    const result = await carousel.computeFn(user, output);
                    const responseCarousel = {
                        ...JSON.parse(JSON.stringify(carousel)),
                        items: result,
                    };
                    delete responseCarousel.computeFn;
                    output.push(responseCarousel)
                    await recommendationStorage.setItem(cacheKey, responseCarousel);
                    console.timeEnd(carouselKey)
                    return;
                } else {
                    const result = await carousel.computeFn(user, output);

                    const responseCarousel = {
                        ...JSON.parse(JSON.stringify(carousel)),
                        items: result,
                    };
                    delete responseCarousel.computeFn;

                    output.push(responseCarousel);
                    console.timeEnd(carouselKey)
                    return;
                }
            })
        )

        return c.json(output.sort((a, b) => a.order - b.order));
    });

export { router as recommendationRouter };