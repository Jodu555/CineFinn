import type { Account, DetailedSeries, timestamped, WatchableEntity } from "@cinefinn/types/database";
import { Hono } from "hono";
import { createStorage, prefixStorage } from "unstorage";
import { cacheRegistry } from "./admin/cache.js";
import { authMiddleware } from "../middleware/auth.js";
import { fullIndexStorage, indexStorage } from "./index.js";
import { seriesTable, watchableEntitysTable } from "../database.js";
import { app } from "../index.js";
import { getConfig } from "../config.js";

type CarouselMeta = {
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
    const fullSeriesIndex = await fullIndexStorage.get('fullIndex') as any as DetailedSeries[] || [];
    series
        .sort((a, b) => a.updated_at - b.updated_at)
        .slice(0, 20);
    return series.map(s => {
        const fullIndexSeries = fullSeriesIndex.find(x => x.UUID == s.UUID)
        let episodeCount = -1;
        if (fullIndexSeries) {
            episodeCount = fullIndexSeries.seasons.flat().length + fullIndexSeries.movies.length;
        }
        return {
            UUID: s.UUID,
            episodeCount,
        }
    });
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

    const allWatchableEntitys = await watchableEntitysTable.get();
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
    return [...seriesUpdateMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([UUID, time]) => {
        const fullIndexSeries = fullSeriesIndex.find(x => x.UUID == UUID)
        let episodeCount = -1;
        if (fullIndexSeries) {
            episodeCount = fullIndexSeries.seasons.flat().length + fullIndexSeries.movies.length;
        }
        return {
            UUID,
            episodeCount,
        }
    })
}

carouselRegistry.set('newly-added-series', {
    id: 'newly-added-series',
    title: 'Neu hinzugefügt',
    icon: ['fas', 'fire'],
    description: 'Die Top 20 neu hinzugefügten Serien',
    type: 'series',
    userspecific: false,
    computeFn: getNewlyAddedSeries
});

carouselRegistry.set('watch-again', {
    id: 'watch-again',
    title: 'Nochmal ansehen',
    // icon: ['fas', 'eye'],
    icon: ['fas', 'arrow-rotate-left'],
    description: 'Die Top 25 Serien, die du schon einmal gesehen hast',
    type: 'series',
    userspecific: true,
    computeFn: async (user) => {
        return [
            {
                UUID: 'test',
                episodeCount: 10
            }
        ];
    }
});

carouselRegistry.set('still-running-series', {
    id: 'still-running-series',
    title: 'Brand aktuell',
    icon: ['fas', 'tower-broadcast'],
    description: 'Top 15 Serien, die eine neue Folge erhalten haben und nicht in Neu hinzugefügten Serien enthalten sind',
    type: 'series',
    userspecific: false,
    computeFn: getStillRunningSeries
})

carouselRegistry.set('continue-watching', {
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

        for (const [carouselKey, carousel] of carouselRegistry) {
            if (!carousel.userspecific) {
                const cacheKey = `${carouselKey}`;
                if (await recommendationStorage.has(cacheKey)) {
                    console.log('Cache hit', carouselKey);
                    const cache = await recommendationStorage.get(cacheKey) as CarouselResponseItem;
                    output.push(cache);
                    continue;
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
            } else {

                const result = await carousel.computeFn(user, output);

                const responseCarousel = {
                    ...JSON.parse(JSON.stringify(carousel)),
                    items: result,
                };
                delete responseCarousel.computeFn;

                output.push(responseCarousel);
            }

        }

        return c.json(output);
    });

export { router as recommendationRouter };