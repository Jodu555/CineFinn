import { serve } from '@hono/node-server';
import { Hono } from 'hono';
// import dotenv from 'dotenv';
// dotenv.config();
import { Server } from 'socket.io';
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
import type { Series, Season, Movie, Account, timestamped, DetailedSeries, DetailedMovie, DetailedEpisode, DetailedSeason, FrontendSeries } from '@cinefinn/types/database';
import { getIO, queryDatabase, setIO } from './utils.js';
import { watchRouter } from './routes/watch.js';
import { videoRouter } from './routes/video.js';
import { indexRouter } from './routes/index.js';
import * as childProcess from 'node:child_process';
import { getConfig } from './config.js';
import { compareSettings } from './utils/settings.js';


const app = new Hono({
    strict: false,
});
const { printMetrics, registerMetrics } = prometheus();
app.use(cors());
app.use(trimTrailingSlash());
// app.use(logger());
app.use(ownLogger(console.log, ['/socket.io', '/video']));

app.use('*', registerMetrics);
app.get('/metrics', printMetrics);


app.route('/auth', authRouter);

app.route('/index', indexRouter);
app.route('/managment', managmentRouter);
app.route('/watch', watchRouter);
app.route('/video', videoRouter);

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

    // const seasons = await seasonsTable.get();
    // for await (const season of seasons) {
    //     const episodes = await episodesTable.get({ season_UUID: season.UUID });
    //     if (episodes.length !== season.episodes) {
    //         console.log(`Season ${season.UUID} has ${season.episodes} episodes, but should have ${episodes.length}. Updating...`);
    //         await seasonsTable.update({ UUID: season.UUID }, { episodes: episodes.length });
    //     }
    // }

    // const entitys = await watchableEntitysTable.get({ runtime: -1 });
    // let i = 0;
    // for await (const entity of entitys) {
    //     console.log(`Processing entity ${++i}/${entitys.length}: ${entity.UUID}`);

    //     const runtime = await geFileRuntime(entity.UUID);
    //     await watchableEntitysTable.update({ UUID: entity.UUID }, { runtime });
    // }

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
setIO(io);

io.use(async (socket, next) => {
    const authHanshake = socket.handshake.auth as AuthHandshake;
    console.log('Trying to authorize ', socket.id, authHanshake);


    if (authHanshake.authToken === undefined) {
        return next(new Error('Unauthorized'));
    }

    const token = authHanshake.authToken;

    switch (authHanshake.type) {
        case 'client':
            const { error, data: user } = await tryCatch(() => getUser(token));

            if (error != null) {
                console.log(error);
                return next(new Error('Unauthorized'));
            }
            if (user == undefined || user == null) {
                return next(new Error('Unauthorized'));
            }

            socket.data = {
                auth: {
                    type: authHanshake.type,
                    token,
                    user,
                }
            };
            next();
            break;
        case 'scraper':
            console.log('scraper auth', token, getConfig().scraper.authToken);
            if (token !== getConfig().scraper.authToken) {
                return next(new Error('Unauthorized'));
            }
            socket.data = {
                auth: {
                    type: authHanshake.type,
                    token,
                }
            };
            next();
            break;
        case 'subsystem':
            console.log('subsystem auth');
            if (token !== getConfig().subsystem.authToken) {
                return next(new Error('Unauthorized'));
            }
            socket.data = {
                auth: {
                    type: authHanshake.type,
                    token,
                }
            };
            next();
            break;

        default:
            break;
    }



});

io.on('connection', async (socket) => {
    switch (socket.data.auth.type) {
        case 'client':
            const socketAuth = socket.data.auth as SocketAuthDataClient<Account | Account & timestamped>;
            console.log(socket.id, socketAuth.user.username, 'connected');
            const debouncedUpdateTime = debounce(async (data: { watchableUUID: string; time: number }) => {
                console.log('debounced updateTime', data);
                const response = await app.request(`/watch/updateTime/${data.watchableUUID}/${data.time}`, {
                    method: 'POST',
                    headers: {
                        'auth-token': socketAuth.token,
                    },
                });
            }, 4000);

            socket.on('updateTime', async (data) => {
                console.log('updateTime', data);
                debouncedUpdateTime(data);
            });

            socket.on('updateSettings', async (data) => {
                console.log('updateSettings', data);
                await accountsTable.update({ UUID: socketAuth.user.UUID }, { settings: compareSettings(data) });
                (await getIO().fetchSockets()).filter(s => s.data.auth.type === 'client' && s.data.auth.user.UUID === socketAuth.user.UUID && s.id !== socket.id).forEach(async s => {
                    s.emit('settingsUpdate', data);
                });
            });

            socket.on('disconnect', () => {
                console.log(socket.id, 'user disconnected');
            });
            break;

        case 'scraper':
            console.log('scraper connected');
            break;

        case 'subsystem':
            console.log('subsystem connected');
            break;
        default:
            console.log('unknown auth type', socket.handshake.auth.type);
            break;
    }

});


function debounce(cb: Function, delay = 1000) {
    let timeout: NodeJS.Timeout;

    return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            cb(...args);
        }, delay);
    };
}