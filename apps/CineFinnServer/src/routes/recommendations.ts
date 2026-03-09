import type { Account, timestamped, WatchableEntity } from "@cinefinn/types/database";
import { Hono } from "hono";
import { createStorage, prefixStorage } from "unstorage";
import { cacheRegistry } from "./admin/cache.js";
import { authMiddleware } from "../middleware/auth.js";

type CarouselMeta = {
    icon: string;
    title: string;
    description: string;
    // type: 'series' | 'entity'; // horizontal or vertical
    userspecific: boolean;
}

type CarouselResponseItem = { items: any[] } & CarouselMeta;

type CarouselDetails = {} & CarouselMeta & (CarouselDetailsSeries | CarouselDetailsEntity);

interface CarouselDetailsEntity {
    type: 'entity';
    computeFn: (user: Account) => Promise<{
        watchTime: number;
        entity: (WatchableEntity & timestamped);
    }[]>;
}

interface CarouselDetailsSeries {
    type: 'series';
    computeFn: (user: Account) => Promise<{
        UUID: string;
        episodeCount: number;
    }[]>;
}

const carouselRegistry = new Map<string, CarouselDetails>();

carouselRegistry.set('newly-added-series', {
    icon: 'fas-fire',
    title: 'Neu hinzugefügt',
    description: 'Die Top 20 neu hinzugefügten Serien',
    type: 'series',
    userspecific: false,
    computeFn: async (user) => {
        return [
            {
                UUID: 'test',
                episodeCount: 10
            }
        ];
    }
});

carouselRegistry.set('watch-again', {
    icon: 'fas-eye',
    title: 'Nochmal ansehen',
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
    icon: '',
    title: 'Brand aktuell',
    description: 'Serien, die in den letzten 4 Wochen eine neue Folge veröffentlicht haben und nicht in Neu hinzugefügten Serien enthalten sind',
    type: 'series',
    userspecific: false,
    computeFn: async (user) => {
        return [
            {
                UUID: 'test',
                episodeCount: 10
            }
        ];
    }
})

carouselRegistry.set('continue-watching', {
    icon: 'fas-clock-rotate-left',
    title: 'Weiterschauen',
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
    icon: 'fas-clock-rotate-left',
    title: 'Neue Folgen',
    description: 'Top 25 neu hinzugefügte Episoden',
    type: 'entity',
    userspecific: true,
    computeFn: async (user) => {
        return [{
            watchTime: 0,
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

const recommendationStorage = createStorage<CarouselResponseItem>();


cacheRegistry.set('recommendations', recommendationStorage);

const router = new Hono()
    .get("/", authMiddleware, async (c) => {

        const user = c.get('credentials').user;
        const output = [] as CarouselResponseItem[];

        for (const [carouselKey, carousel] of carouselRegistry) {
            console.log(carouselKey, carousel);


            if (!carousel.userspecific) {
                const cacheKey = `${carouselKey}`;
                if (await recommendationStorage.has(cacheKey)) {
                    const cache = await recommendationStorage.get(cacheKey) as CarouselResponseItem;
                    output.push(cache);
                    continue;
                }
                const result = await carousel.computeFn(user);
                const responseCarousel = {
                    ...JSON.parse(JSON.stringify(carousel)),
                    items: result,
                };
                delete responseCarousel.computeFn;
                output.push(responseCarousel)
                await recommendationStorage.setItem(cacheKey, responseCarousel);
            } else {

                const result = await carousel.computeFn(user);

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