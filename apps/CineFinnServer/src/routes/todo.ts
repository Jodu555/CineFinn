import { Hono } from "hono";
import { authFullMiddleware } from "../auth.js";
import { Role, type RefRef, type ScrapeInfo, type TodoItem, type TodoReferences, type ValueOf } from "@cinefinn/types/database";
import type { AniWorldSeriesInformations } from "@cinefinn/types/scrapers";
import { tryCatch } from "../tryCatch.js";
import { getScraperSocket, isScraperSocketConnected } from "../sockets/scraper.socket.js";
import { getIO } from "../utils.js";
import { accountsTable, todosTable } from "../database.js";

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
            const scraperSocket = await getScraperSocket();
            if (scraperSocket == null) {
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
    }

] satisfies ScraperDefinition[];


const todoScrapeJobs = [] as {
    todoID: string;
    scrapeKey: keyof RefRef;
    func: (() => Promise<ScrapeInfo<keyof RefRef>>)
}[];

const router = new Hono()
    .get('/', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
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

        const todos = await c.req.json() as TodoItem[];

        const touchedIDs = new Set<string>();

        for (const todo of todos) {
            touchedIDs.add(todo.ID);

            if (todo.creator == undefined) {
                todo.creator = c.var.credentials.user.UUID
            }

            let dbTodo = await todosTable.getOne({ ID: todo.ID });
            if (dbTodo == undefined) {
                await todosTable.create(todo);
                dbTodo = await todosTable.getOne({ ID: todo.ID });
            }


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

                    todo.scrapingInfo![scraper.scrapeKey] = scraperInfo as any;
                }
            }

            if (JSON.stringify(todo) !== JSON.stringify(dbTodo)) {
                await todosTable.update({ ID: todo.ID }, {
                    sortOrder: todo.sortOrder,
                    name: todo.name,
                    creator: todo.creator,
                    categorie: todo.categorie,
                    refs: todo.refs,
                    scrapingInfo: todo.scrapingInfo,
                });
            }
        }

        const allTodos = await todosTable.get();
        const allTodoIDs = new Set(allTodos.map(t => t.ID));
        const possibleDeletedIDs = allTodoIDs.difference(touchedIDs);

        for (const possibleDeletedID of possibleDeletedIDs) {
            const deletedTodo = allTodos.find(t => t.ID === possibleDeletedID);
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

        const sockets = await getIO().fetchSockets();
        sockets.filter(s => s.data.auth.type === 'client').forEach(async s => {
            s.emit('todoListUpdate', todos.sort((a, b) => a.sortOrder - b.sortOrder));
        });
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