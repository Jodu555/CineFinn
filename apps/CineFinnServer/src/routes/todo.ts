import { Hono } from "hono";
import { authFullMiddleware } from "../auth.js";
import { Role, type RefRef, type ScrapeInfo, type TodoItem, type TodoReferences, type ValueOf } from "@cinefinn/types/database";
import type { AniWorldSeriesInformations } from "@cinefinn/types/scrapers";
import { tryCatch } from "../tryCatch.js";
import { isScraperSocketConnected } from "../sockets/scraper.socket.js";
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import { unescape } from "querystring";
import { getIO } from "../utils.js";

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
            const sockets = await getIO().fetchSockets();
            const scraperSocket = sockets.find(s => s.data.auth.type === 'scraper');
            if (scraperSocket == undefined) {
                throw new Error('Scraper Socket not found');
            }
            const data = await new Promise<AniWorldSeriesInformations | void>((resolve, reject) => {
                scraperSocket.emit('scrape:aniworld', url, (data) => resolve(data));
            })

            if (data == undefined) {
                throw new Error('Scraper Socket did not return data');
            }

            return data;
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

const todoStorage = createStorage<TodoItem[]>({
    driver: fsDriver({
        base: './temp/todoStorage',
    })
})

const mainTestKey = 'test';


const todoScrapeJobs = [] as {
    todoID: string;
    scrapeKey: keyof RefRef;
    func: (() => Promise<ScrapeInfo<keyof RefRef>>)
}[];

const router = new Hono()
    .get('/', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const todos = await todoStorage.get(mainTestKey) || [];

        return c.json(todos);
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
                let scraperInfo = todo.scrapingInfo?.[scraper.scrapeKey];
                if (scraperInfo?.state === 'success') {
                    continue;
                }

                // if (!isScraperSocketConnected) {
                //     console.log('Scraper not connected');
                //     continue;
                // }
                if (scraperInfo == undefined) {
                    console.log('Starting Scraper', scraper.scrapeKey);

                    scraperInfo = {
                        key: scraper.scrapeKey,
                        message: 'Loading...',
                        state: 'loading',
                        scrapedAt: Date.now(),
                        data: undefined,
                    }

                    const promiseFn = async (): Promise<ScrapeInfo<keyof RefRef>> => {
                        const { data, error } = await tryCatch<Promise<AniWorldSeriesInformations>, Error>(() => scraper.scrapeFunction(url));
                        if (error) {
                            scraperInfo!.state = 'error';
                            scraperInfo!.message = error.message;
                            return scraperInfo!;
                        }
                        scraperInfo!.state = 'success';
                        scraperInfo!.message = 'Success';
                        scraperInfo!.data = data;
                        return scraperInfo!;
                    };
                    todoScrapeJobs.push({ todoID: todo.ID, scrapeKey: scraper.scrapeKey, func: promiseFn });

                    if (todo.scrapingInfo == undefined) {
                        todo.scrapingInfo = {} as TodoItem['scrapingInfo'];
                    }

                    console.log(todo);
                    console.log(scraperInfo);

                    todo.scrapingInfo![scraper.scrapeKey] = scraperInfo as any;

                }
            }
            await todoStorage.set(mainTestKey, todos);
        }

        console.log(todos);

        (async () => {
            for (const { todoID, scrapeKey, func } of todoScrapeJobs) {
                const result = await func();
                const todos = await todoStorage.get(mainTestKey) || [];
                await todoStorage.set(mainTestKey, todos.map(t => {
                    if (t.ID == todoID) {
                        //@ts-expect-error
                        t.scrapingInfo![scrapeKey] = result;
                    }
                    return t;
                }));
            }
            console.log('Scraping Done');
        })()
        return c.json(todos);
    })

export { router as todoRouter };