import { Hono } from "hono";
import { authFullMiddleware, authMiddleware } from "../middleware/auth.js";
import type { RefRef, ScrapeInfo, TodoItem, TodoReferences } from "@cinefinn/types/shared";
import type { ValueOf } from "@cinefinn/types/shared";
import { Role } from "@cinefinn/types/models/user";
import type { AniWorldSeriesInformations } from "@cinefinn/types/scrapers";
import { getScraperSocket, isScraperSocketConnected } from "../sockets/scraper.socket.js";
import { getIO } from "../utils.js";
import { accountsTable, todosTable } from "../database.js";
import { tryCatch } from "@cinefinn/utilities/tryCatch";

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
            const scraperSocket = await getScraperSocket();
            if (scraperSocket == null) {
                throw new Error('Scraper Socket not found');
            }
            const data = await new Promise<AniWorldSeriesInformations | void>((resolve, reject) => {
                scraperSocket.emit('scrape:aniworld', url, (data) => resolve(data));
            });

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
            const scraperSocket = await getScraperSocket();
            if (scraperSocket == null) {
                throw new Error('Scraper Socket not found');
            }
            const data = await new Promise<AniWorldSeriesInformations | void>((resolve, reject) => {
                scraperSocket.emit('scrape:sto', url, (data) => resolve(data));
            });

            if (data == undefined) {
                throw new Error('Scraper Socket did not return data');
            }

            return data;
        },
    }

] satisfies ScraperDefinition[];


const todoScrapeJobs = [] as {
    todoID: string;
    scrapeKey: keyof RefRef;
    func: (() => Promise<ScrapeInfo<keyof RefRef>>);
}[];

const router = new Hono()
    .get('/', authMiddleware, async (c) => {
        const todos = await todosTable.get();
        return c.json(todos.sort((a, b) => a.sortOrder - b.sortOrder));
    })
    .get('/permittedAccounts', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const accounts = await accountsTable.get();

        const permittedAccounts = accounts.filter(acc => acc.role >= Role.Mod).map(acc => ({
            UUID: acc.UUID,
            username: acc.username,
            role: acc.role,
        }));

        return c.json(permittedAccounts);
    })
    .post('/', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const TIMING = false;

        const todos = await c.req.json() as TodoItem[];

        const touchedIDs = new Set<string>();

        const dbTodos = await todosTable.get();

        for (const todo of todos) {
            touchedIDs.add(todo.ID);

            if (todo.creator == undefined) {
                todo.creator = c.var.credentials.user.UUID;
            }

            TIMING && console.time('Cheking todo');
            let dbTodo = dbTodos.find(t => t.ID === todo.ID);
            if (dbTodo == undefined || dbTodo == null) {
                await todosTable.create(todo);
                const intermediate = await todosTable.getOne({ ID: todo.ID });
                if (intermediate == undefined || intermediate == null) {
                    throw new Error('Could not create todo'); //This should never happen
                }
                dbTodo = intermediate;
            }
            TIMING && console.timeEnd('Cheking todo');


            TIMING && console.time('Checking scraping info');

            for (const [_reference, url] of Object.entries(todo.refs)) {
                const reference = _reference as keyof TodoReferences;
                if (url == undefined || url == '') {
                    todo.refs[reference] = '';
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
                if (!isScraperSocketConnected) {
                    console.log('Scraper not connected');
                    continue;
                }

                if (scraperInfo == undefined) {

                    scraperInfo = {
                        key: scraper.scrapeKey,
                        message: 'Loading...',
                        state: 'loading',
                        scrapedAt: Date.now(),
                        data: undefined,
                    };

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

                    todo.scrapingInfo![scraper.scrapeKey] = scraperInfo as any;
                }
            }
            TIMING && console.timeEnd('Checking scraping info');

            TIMING && console.time('Checking if todo needs to be updated');
            const needsUpdate =
                todo.sortOrder !== dbTodo.sortOrder ||
                todo.name !== dbTodo.name ||
                todo.creator !== dbTodo.creator ||
                todo.categorie !== dbTodo.categorie ||
                JSON.stringify(todo.refs) !== JSON.stringify(dbTodo.refs) ||
                JSON.stringify(todo.scrapingInfo) !== JSON.stringify(dbTodo.scrapingInfo);
            // if (JSON.stringify(todo) !== JSON.stringify(dbTodo)) {
            if (needsUpdate) {
                TIMING && console.time('Updating todo');
                await todosTable.update({ ID: todo.ID }, {
                    sortOrder: todo.sortOrder,
                    name: todo.name,
                    creator: todo.creator,
                    categorie: todo.categorie,
                    refs: todo.refs,
                    scrapingInfo: todo.scrapingInfo,
                });
                TIMING && console.timeEnd('Updating todo');
            }
            TIMING && console.timeEnd('Checking if todo needs to be updated');
        }

        TIMING && console.time('Checking for deleted todos');
        // const allTodos = await todosTable.get();
        const allTodoIDs = new Set(dbTodos.map(t => t.ID));
        const possibleDeletedIDs = allTodoIDs.difference(touchedIDs);
        TIMING && console.timeEnd('Checking for deleted todos');

        TIMING && console.time('Deleting todos');
        for (const possibleDeletedID of possibleDeletedIDs) {
            const deletedTodo = dbTodos.find(t => t.ID === possibleDeletedID);
            if (deletedTodo == undefined) {
                console.log('Could not find todo to delete', possibleDeletedID);
                continue;
            }
            if (deletedTodo.creator === c.var.credentials.user.UUID) {
                await todosTable.delete({ ID: deletedTodo.ID });
            } else if (c.var.credentials.user.role >= Role.Admin) {
                await todosTable.delete({ ID: deletedTodo.ID });
            }
        }
        TIMING && console.timeEnd('Deleting todos');

        TIMING && console.time('Emitting todoListUpdate');
        const sockets = await getIO().fetchSockets();
        sockets.filter(s => s.data.auth.type === 'client').forEach(async s => {
            s.emit('todoListUpdate', todos.sort((a, b) => a.sortOrder - b.sortOrder));
        });
        TIMING && console.timeEnd('Emitting todoListUpdate');
        if (todoScrapeJobs.length > 0) {
            handleBackgroundScrapeTodos().catch(console.error);
        }
        return c.json(todos);
    });

async function handleBackgroundScrapeTodos() {
    console.log(`There are ${todoScrapeJobs.length} Scrape Jobs to be done!`);
    let wasWork = false;
    for (const { todoID, scrapeKey, func } of todoScrapeJobs) {
        wasWork = true;
        const result = await func();

        await todosTable.update({ ID: todoID }, {
            scrapingInfo: {
                [scrapeKey]: result,
            }
        });

        const preNewTodos = await todosTable.get();
        const newTodos = preNewTodos.sort((a, b) => a.sortOrder - b.sortOrder);
        const sockets = await getIO().fetchSockets();
        sockets.filter(s => s.data.auth.type === 'client').forEach(async s => {
            s.emit('todoListUpdate', newTodos);
        });

        todoScrapeJobs.splice(todoScrapeJobs.findIndex(j => j.todoID === todoID), 1);
    }
    wasWork && console.log('Scraping Jobs Done');
}

export { router as todoRouter };