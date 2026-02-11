import { Redis } from 'ioredis';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static'

// import dotenv from 'dotenv';
// dotenv.config();
import { Server, Socket } from 'socket.io';
import { accountsTable, authTokensTable, connectDatabase, database, episodesTable, moviesTable, seasonsTable, seriesTable, todosTable, watchableEntitysTable } from './database.js';

import { trimTrailingSlash } from 'hono/trailing-slash';
import { authFullMiddleware, authMiddleware, authRouter, getUser } from './auth.js';
import { prometheus } from '@hono/prometheus';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { ownLogger } from './ownLogger.js';
import { managmentRouter } from './routes/managment.js';
import { CacheContext } from './LRUCache.js';
import type { AnythingToServerEvents, AuthHandshake, CheckForUpdatesOutput, ClientToServerEvents, InterServerEvents, ServerToAnythingEvents, ServerToClientEvents, SocketAuthDataClient, SocketAuthDataSubsystem, SocketData } from '@cinefinn/types/socket';
import { tryCatch } from './tryCatch.js';
import { type Series, type Season, type Movie, type Account, type timestamped, type DetailedSeries, type DetailedMovie, type DetailedEpisode, type DetailedSeason, type FrontendSeries, Role } from '@cinefinn/types/database';
import { getIO, queryDatabase, setIO, setIORedis, getEmailManager } from './utils.js';
import { watchRouter } from './routes/watch.js';
import { videoRouter } from './routes/video.js';
import { indexRouter } from './routes/index.js';
import * as childProcess from 'node:child_process';
import { getConfig } from './config.js';
import { compareSettings } from './utils/settings.js';
import os from "os";
import { setupSocketIO } from './sockets/index.js';
import { getKnownSubSystems, getSeriesRelatedToSubSystem, toggleSeriesesForSubSystem } from './sockets/subsystem.socket.js';
import { playlistRouter } from './routes/playlist.js';
import { adminRouter } from './routes/admin.js';
import { todoRouter } from './routes/todo.js';
import axios from 'axios';
import { proxyRouter } from './routes/proxys.js';
import { handleSubSystemProminence } from './job/crawler.js';
import { Job } from './job/Job.js';

import packageJSON from '../package.json' with { type: "json" };
import { getScraperSocket } from './sockets/scraper.socket.js';
import { filenameParser } from './parser.js';
import path from 'node:path';

const { printMetrics, registerMetrics } = prometheus();
export const app = new Hono({
    strict: false,
})
    .use(cors())
    .use(trimTrailingSlash())
    .use(ownLogger(console.log, ['/socket.io', '/video']))
    .use('*', registerMetrics)
    .use('/images/*', authMiddleware, serveStatic({
        root: getConfig().imagePath,
        rewriteRequestPath: (path, c) => {
            return path.replace(/^\/images/, '');
        },
        onFound: (_path, c) => {
            c.header('Cache-Control', `public, immutable, max-age=31536000`)
        },
    }))
    .get('/metrics', printMetrics)
    .get('/health', (c) => {
        // const cpus = os.cpus();
        return c.json({
            status: 'ok',
            version: packageJSON.version,
            // memory: {
            //     usage: process.memoryUsage(),
            //     total: os.totalmem(),
            //     free: os.freemem(),
            // },
        }, 200);
    })
    .route('/auth', authRouter)
    .route('/index', indexRouter)
    .route('/managment', managmentRouter)
    .route('/watch', watchRouter)
    .route('/playlists', playlistRouter)
    .route('/admin', adminRouter)
    .route('/todo', todoRouter)
    .route('', proxyRouter)
    .route('/video', videoRouter)
    .get('/test/checkSerieForUpdates/:S-UUID', async (c) => {
        const serieUUID = c.req.param('S-UUID');
        if (serieUUID == undefined) {
            return c.json({ error: 'No UUID provided' }, 400);
        }
        const scraperSocket = await getScraperSocket();

        const { data: output, error } = await tryCatch(() => {
            return new Promise<CheckForUpdatesOutput>((resolve, reject) => {
                scraperSocket.timeout(1000 * 60 * 10).emit('checkSerieForUpdates', serieUUID, (err, output) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(output)
                });
            });
        });

        if (error) {
            console.log('Error checking for updates', error);
            return c.json({ error: error.message }, 500);
        }

        return c.json(output.aniworld.map(x => {
            x.file = x.file.replaceAll('.', '#');
            x.file += '.mp4';
            const outPath = path.join(getConfig().videoPath, x._animeFolder, x.folder, x.file);
            const parsed = filenameParser(outPath, x.file);

            if (parsed.movie) return null;
            return {
                outPath,
                file: x.file,
                parsed
            };
        }).filter(x => x != null));
    });

// app.get('*', async (c, next) => {

//     const proxyables = [
//         '/index/all',
//         '/managment/jobs/info',
//         '/socket.io'
//     ];


//     let isProxyable = false;
//     for (const proxyable of proxyables) {
//         if (c.req.path.startsWith(proxyable)) {
//             isProxyable = true;
//             break;
//         }
//     }

//     // console.log('Came, isProxyable', c.req.path, isProxyable);
//     if (!isProxyable) {
//         return next();
//     }

//     const queryString = c.req.url.split('?')[1];

//     const newUrl = `http://localhost:3100${c.req.path}?${queryString}&auth-token=SECR-DEV`;
//     // const newUrl = `http://localhost:3100${c.req.path}?auth-token=SECR-DEV`;

//     return proxy(newUrl);
// });

export type definedSocket = Socket<AnythingToServerEvents, ServerToAnythingEvents, InterServerEvents, SocketData<Account | (Account & timestamped)>>;

const httpServer = serve({
    fetch: app.fetch,
    port: getConfig().system.PORT,
}, async (info) => {
    console.log(info);

    await connectDatabase();
    const adminUser = await accountsTable.getOne({
        role: 3
    });
    if (adminUser != undefined) {
        const adminToken = await authTokensTable.getOne({
            TOKEN: 'SECR-DEV',
        });
        if (adminToken == undefined) {
            authTokensTable.create({
                TOKEN: 'SECR-DEV',
                account_UUID: adminUser.UUID,
            });
            return;
        }
    } else {
        console.log('Admin User not found');
    }

    // await crawl();

    const io = new Server<
        AnythingToServerEvents,
        ServerToAnythingEvents,
        InterServerEvents,
        SocketData<Account | Account & timestamped>
    >(httpServer, {
        cors: {
            methods: ['GET', 'POST'],
        },
    });

    setIO(io);
    setIORedis(
        new Redis({
            host: getConfig().redis.host,
            port: getConfig().redis.port,
            password: getConfig().redis.password,
            maxRetriesPerRequest: null,
        })
    );
    setupSocketIO();

    console.log(`Server is running on http://localhost:${info.port}`);

    setInterval(() => {
        database.pool.query('SELECT 1', (error, rows, fields) => {
            if (error) {
                console.log('Error keeping database connection alive:', error);
            }
        });
    }, 10000 * 30);

    getEmailManager();

    const knownSubSystems = await getKnownSubSystems();
    const subSystemSockets = (await getIO().fetchSockets()).filter(s => s.data.auth.type === 'subsystem');
    for (const subSystem of knownSubSystems) {
        //The Second filter is needed because typescript does not understand that the socket has already been narrowed to the correct type
        if (subSystemSockets.find(s => s.data.auth.type === 'subsystem' && s.data.auth.id === subSystem)) {
            await toggleSeriesesForSubSystem(subSystem, false);
        } else {
            await toggleSeriesesForSubSystem(subSystem, true);
        }
    }

    await handleSubSystemProminence(Job.fromDummy('crawl'));

    // await fixSeasons();
    // await insertMissingWatchableEntityRuntimes();



});

async function fixSeasons() {
    console.log('Fixing Seasons');
    const seasons = await seasonsTable.get();
    for await (const season of seasons) {
        const episodes = await episodesTable.get({ season_UUID: season.UUID });
        if (episodes.length !== season.episodes) {
            console.log(`Season ${season.UUID} has ${season.episodes} episodes, but should have ${episodes.length}. Updating...`);
            await seasonsTable.update({ UUID: season.UUID }, { episodes: episodes.length });
        }
    }
    console.log('Seasons Fixed');
}

async function insertMissingWatchableEntityRuntimes() {
    console.log('Inserting Missing WatchableEntity runtimes');
    const entitys = await watchableEntitysTable.get({ runtime: -1, subID: 'main', unique: true });
    let i = 0;
    for await (const entity of entitys) {
        console.log(`Processing entity ${++i}/${entitys.length}: ${entity.UUID}`)
        const { data: runtime, error } = await tryCatch(() => geFileRuntime(entity.UUID));
        if (error) {
            console.error('Error getting runtime for entity', entity.UUID, error);
            continue;
        }
        await watchableEntitysTable.update({ UUID: entity.UUID }, { runtime });
    }
    console.log('Missing WatchableEntity runtimes inserted');
}

function geFileRuntime(watchableUUID: string) {
    return new Promise<number>((resolve, reject) => {
        const videoURL = `${getConfig().system.PUBLIC_API_ENDPOINT}/video/${watchableUUID}?auth-token=${getConfig().system.PUBLIC_API_AUTH_TOKEN}`;
        childProcess.exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoURL}"`, (error, stdout, stderr) => {
            if (error) {
                // console.log(error);
                // console.log(stderr);
                reject({ error, stderr });
                return;
            }
            const runtime = parseFloat(stdout);
            resolve(runtime);
        });
    });
}

export type ServerAppType = typeof app;

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // process.exit(1);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT. Shutting down gracefully.');
    process.exit(0);
});