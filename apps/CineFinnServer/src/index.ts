import { serve } from '@hono/node-server';
import { Hono } from 'hono';
// import dotenv from 'dotenv';
// dotenv.config();
import { Server, Socket } from 'socket.io';
import { accountsTable, authTokensTable, connectDatabase, database, episodesTable, moviesTable, seasonsTable, seriesTable, watchableEntitysTable } from './database.js';

import { trimTrailingSlash } from 'hono/trailing-slash';
import { authFullMiddleware, authRouter, getUser } from './auth.js';
import { prometheus } from '@hono/prometheus';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { ownLogger } from './ownLogger.js';
import { managmentRouter } from './routes/managment.js';
import { CacheContext } from './LRUCache.js';
import type { AnythingToServerEvents, AuthHandshake, ClientToServerEvents, InterServerEvents, ServerToAnythingEvents, ServerToClientEvents, SocketAuthDataClient, SocketData } from '@cinefinn/types/socket';
import { tryCatch } from './tryCatch.js';
import { type Series, type Season, type Movie, type Account, type timestamped, type DetailedSeries, type DetailedMovie, type DetailedEpisode, type DetailedSeason, type FrontendSeries, Role } from '@cinefinn/types/database';
import { getIO, queryDatabase, setIO } from './utils.js';
import { watchRouter } from './routes/watch.js';
import { videoRouter } from './routes/video.js';
import { indexRouter } from './routes/index.js';
import * as childProcess from 'node:child_process';
import { getConfig } from './config.js';
import { compareSettings } from './utils/settings.js';
import os from "os";
import { setupSocketIO } from './sockets/index.js';


const { printMetrics, registerMetrics } = prometheus();
const app = new Hono({
    strict: false,
})
    .use(cors())
    .use(trimTrailingSlash())
    .use(ownLogger(console.log, ['/socket.io', '/video']))
    .use('*', registerMetrics)
    .get('/metrics', printMetrics)
    .get('/health', (c) => {
        c.status(200);
        const cpus = os.cpus();
        return c.json({
            status: 'ok',
            memory: {
                usage: process.memoryUsage(),
                total: os.totalmem(),
                free: os.freemem(),
            },
        });
    })
    .route('/auth', authRouter)
    .route('/index', indexRouter)
    .route('/managment', managmentRouter)
    .route('/watch', watchRouter)
    .route('/video', videoRouter)
    .get('/admin/accounts', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const accounts = await accountsTable.get();
        accounts.forEach(a => {
            delete a.password;
        });
        return c.json(accounts);
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


const httpServer = serve({
    fetch: app.fetch,
    port: getConfig().system.PORT,
}, async (info) => {
    console.log(info);

    await connectDatabase();
    const adminUser = await accountsTable.getOne({
        role: 3
    })
    if (adminUser != undefined) {
        const adminToken = await authTokensTable.getOne({
            TOKEN: 'SECR-DEV',
        })
        if (adminToken == undefined) {
            authTokensTable.create({
                TOKEN: 'SECR-DEV',
                account_UUID: adminUser.UUID,
            })
            return;
        }
    } else {
        console.log('Admin User not found');
    }
    console.log(`Server is running on http://localhost:${info.port}`);
    // await crawl();

    // console.log((seasonsTable as any).database.tables.get('seasons'))
    // console.log(seasonsTable);

    setInterval(() => {
        database.pool.query('SELECT 1', (error, rows, fields) => {
            if (error) {
                console.log('Error keeping database connection alive:', error);
            }
        });
    }, 10000 * 30);

    // console.log('Fixing Seasons');
    // const seasons = await seasonsTable.get();
    // for await (const season of seasons) {
    //     const episodes = await episodesTable.get({ season_UUID: season.UUID });
    //     if (episodes.length !== season.episodes) {
    //         console.log(`Season ${season.UUID} has ${season.episodes} episodes, but should have ${episodes.length}. Updating...`);
    //         await seasonsTable.update({ UUID: season.UUID }, { episodes: episodes.length });
    //     }
    // }
    // console.log('Seasons Fixed');


    // console.log('Inserting Missing WatchableEntity runtimes');
    // const entitys = await watchableEntitysTable.get({ runtime: -1 });
    // let i = 0;
    // for await (const entity of entitys) {
    //     console.log(`Processing entity ${++i}/${entitys.length}: ${entity.UUID}`);
    //     const runtime = await geFileRuntime(entity.UUID);
    //     await watchableEntitysTable.update({ UUID: entity.UUID }, { runtime });
    // }
    // console.log('Missing WatchableEntity runtimes inserted');

});

function geFileRuntime(watchableUUID: string) {
    return new Promise<number>((resolve, reject) => {
        const videoURL = `http://localhost:3000/video/${watchableUUID}?auth-token=SECR-DEV`;
        childProcess.exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoURL}"`, (error, stdout, stderr) => {
            if (error) {
                console.log(error);
                console.log(stderr);
                reject(error);
                return;
            }
            const runtime = parseFloat(stdout);
            resolve(runtime);
        });
    })
}

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
export type definedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData<Account | (Account & timestamped)>>
setIO(io);
setupSocketIO();

export {
    app,
}