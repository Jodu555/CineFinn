import { Hono } from "hono";
import { authFullMiddleware } from "../auth.js";
import { Role } from "@cinefinn/types/database";
import type { AniWorldSeriesInformations } from "@cinefinn/types/scrapers";
import { tryCatch } from "../tryCatch.js";
import { isScraperSocketConnected } from "../sockets/scraper.socket.js";

type ValueOf<T> = T[keyof T];

export type TodoReferences = Record<keyof RefRef, string>;

export type RefRef = {
    'aniworld': undefined | AniWorldSeriesInformations;
    'sto': undefined | AniWorldSeriesInformations;
};

export interface TodoItem {
    ID: string;
    order: number;
    name: string;
    creator?: string;
    categorie: 'Aniworld' | 'STO' | 'KDrama';
    references: TodoReferences;
    scrapingInfo?: {
        [key in keyof Partial<TodoReferences>]: ScrapeInfoDefaults<key> & (LoadingErrorScrapeInfo | SuccessScrapeInfo<key>);
    };
    edited?: boolean;
}

type ScrapeInfoDefaults<K> = {
    key: K;
    scrapedAt: number;
    message: string;
}

type LoadingErrorScrapeInfo = {
    state: 'loading' | 'error';
    data: undefined;
};

type SuccessScrapeInfo<K extends keyof RefRef> = {
    state: 'success';
    data: RefRef[K];
};

interface ScraperDefinition {
    referenceKey: keyof TodoReferences;
    scrapeKey: keyof RefRef;
    scrapeFunction: (url: string) => Promise<ValueOf<RefRef>>;
}

const scrapers = [

    {
        referenceKey: 'aniworld',
        scrapeKey: 'aniworld',
        scrapeFunction: async (url: string) => {
            return {
                url: url,
                informations: {
                    infos: '',
                    startDate: '',
                    endDate: '',
                    description: '',
                    image: ''
                },
                hasMovies: false,
                seasons: []
            };
        },
    },
    {
        referenceKey: 'sto',
        scrapeKey: 'sto',
        scrapeFunction: async (url: string) => {
            return {
                url: url,
                informations: {
                    infos: '',
                    startDate: '',
                    endDate: '',
                    description: '',
                    image: ''
                },
                hasMovies: false,
                seasons: []
            };
        },
    }

] satisfies ScraperDefinition[];

const router = new Hono()
    .get('/', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        return c.json([]);
    })
    .post('/', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {

        const todos = await c.req.json() as TodoItem[];

        for (const todo of todos) {
            if (todo.creator == undefined) {
                console.log('Updating creator', todo.ID, todo.creator);
                todo.creator = c.var.credentials.user.UUID
            }

            console.log('Checking todo references', todo.references);

            for (const [_reference, url] of Object.entries(todo.references)) {
                const reference = _reference as keyof TodoReferences;
                if (url == undefined || url == '') {
                    todo.references[reference] = '';
                    continue;
                }

                const scraper = scrapers.find(s => s.referenceKey === reference);
                if (scraper == undefined) {
                    console.log('Scraper not found', reference);
                    continue;
                }
                let scrapeInfo = todo.scrapingInfo?.[scraper.scrapeKey];
                if (scrapeInfo?.state === 'success') {
                    continue;
                }

                if (!isScraperSocketConnected) {
                    console.log('Scraper not connected');
                    continue;
                }

                if (scrapeInfo == undefined) {
                    scrapeInfo = {
                        key: scraper.scrapeKey,
                        message: 'Loading...',
                        state: 'loading',
                        scrapedAt: Date.now(),
                        data: undefined,
                    }
                    new Promise(async (resolve, reject) => {
                        const { data, error } = await tryCatch<Promise<AniWorldSeriesInformations>, Error>(() => scraper.scrapeFunction(url));
                        if (error) {
                            scrapeInfo!.state = 'error';
                            scrapeInfo!.message = error.message;
                            return resolve(scrapeInfo);
                        }
                        scrapeInfo!.state = 'success';
                        scrapeInfo!.message = 'Success';
                        scrapeInfo!.data = data;
                        return resolve(scrapeInfo);
                    });
                }
            }
        }


        return c.json(todos);
    })