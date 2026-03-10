import type { Account, DetailedSeries, timestamped, WatchableEntity } from "@cinefinn/types/database";
import { Hono } from "hono";
import { createStorage, prefixStorage } from "unstorage";
import { cacheRegistry } from "./admin/cache.js";
import { authMiddleware } from "../middleware/auth.js";
import { fullIndexStorage, indexStorage } from "./index.js";
import { seriesTable, watchableEntitysTable, watchHistoryTable } from "../database.js";

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
    computeFn: async (user) => {
        return [{
            watchTime: 10,
            entity: {
                UUID: 'test',
                serie_UUID: 'test',
                watchable_UUID: 'test',
                lang: 'GerDub',
                subID: 'main',
                filePath: 'test',
                runtime: 150,
                created_at: 0,
                updated_at: 0,
            }
        }]
    }
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
                if (!carousel.userspecific) {
                    const cacheKey = `${carouselKey}`;
                    if (await recommendationStorage.has(cacheKey)) {
                        console.log('Cache hit', carouselKey);
                        const cache = await recommendationStorage.get(cacheKey) as CarouselResponseItem;
                        output.push(cache);
                        return;
                    }
                    console.log('Cache miss', carouselKey);
                    console.time(carouselKey)
                    const result = await carousel.computeFn(user, output);
                    const responseCarousel = {
                        ...JSON.parse(JSON.stringify(carousel)),
                        items: result,
                    };
                    delete responseCarousel.computeFn;
                    output.push(responseCarousel)
                    console.timeEnd(carouselKey)
                    await recommendationStorage.setItem(cacheKey, responseCarousel);
                    return;
                } else {

                    const result = await carousel.computeFn(user, output);

                    const responseCarousel = {
                        ...JSON.parse(JSON.stringify(carousel)),
                        items: result,
                    };
                    delete responseCarousel.computeFn;

                    output.push(responseCarousel);
                    return;
                }
            })
        )

        return c.json(output.sort((a, b) => a.order - b.order));
    });

export { router as recommendationRouter };