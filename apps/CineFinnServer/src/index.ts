import { ownLogger } from '@cinefinn/honoutils/ownLogger';
import type { Account } from '@cinefinn/types/models/user';
import type { timestamped } from '@cinefinn/types/shared';
import type { AnythingToServerEvents, InterServerEvents, ServerToAnythingEvents, SocketData } from '@cinefinn/types/socket';
import { wait } from '@cinefinn/utilities/time';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trimTrailingSlash } from 'hono/trailing-slash';
import { Redis } from 'ioredis';
import { Server, Socket } from 'socket.io';
import { getConfig } from './config.js';
import { accountsTable, authTokensTable, connectDatabase, database } from './database.js';
import { handleSubSystemProminence } from './job/crawler.js';
import { Job } from './job/Job.js';
import { authRouter } from './middleware/auth.js';
import { metricsRouter, registerMetrics } from './middleware/ownPrometheus.js';
import { adminRouter } from './routes/admin/admin.js';
import { calendarRouter } from './routes/calendar.js';
import { franchiseRouter } from './routes/franchise.js';
import { healthRouter } from './routes/health.js';
import { imageRouter } from './routes/image.js';
import { indexRouter } from './routes/index.js';
import { managmentRouter } from './routes/managment.js';
import { playlistRouter } from './routes/playlist.js';
import { previewImagesRouter } from './routes/previewImages.js';
import { proxyRouter } from './routes/proxys.js';
import { recommendationRouter } from './routes/recommendations/recommendations.js';
import { todoRouter } from './routes/todo.js';
import { videoRouter } from './routes/video.js';
import { watchRouter } from './routes/watch.js';
import { setupSocketIO } from './sockets/index.js';
import { getKnownSubSystems, toggleSeriesesForSubSystem } from './sockets/subsystem.socket.js';
import { getEmailManager, getIO, setIO, setIORedis } from './utils.js';
import { setupCommandManager } from './utils/commands.js';
import packageJson from '../package.json' with { type: 'json' };
import { httpInstrumentationMiddleware } from '@hono/otel';


export const app = new Hono({
    strict: false,
})
    .use(httpInstrumentationMiddleware({
        serviceName: packageJson.name,
        serviceVersion: packageJson.version,
        captureRequestHeaders: [
            'user-agent',
            'service-name',
            'auth-token',
        ],
    }))
    .use(cors())
    .use(trimTrailingSlash())
    .use(ownLogger(console.log, ['/socket.io', '/video', '/images', '/bullboard', '/status', '/health', '/auth/registerEnabled']))
    .use('*', registerMetrics)
    .route('', metricsRouter)
    .use('/images/*', serveStatic({
        root: getConfig().imagePath,
        rewriteRequestPath: (path, c) => {
            return path.replace(/^\/images/, '');
        },
        onFound: (_path, c) => {
            c.header('Cache-Control', `public, immutable, max-age=31536000`);
        },
    }))
    .route('/health', healthRouter)
    .get('/status', async (c) => {
        return c.text('', 200);
    })
    .route('/auth', authRouter)
    .route('/index', indexRouter)
    .route('/managment', managmentRouter)
    .route('/watch', watchRouter)
    .route('/playlists', playlistRouter)
    .route('/admin', adminRouter)
    .route('/todo', todoRouter)
    .route('', proxyRouter)
    .route('/image', imageRouter)
    .route('/previewImages', previewImagesRouter)
    .route('/recommendations', recommendationRouter)
    .route('/franchise', franchiseRouter)
    .route('/video', calendarRouter)
    .route('/video', videoRouter);

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
            console.log('Creating Token for admin user', adminUser.username);
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

    setupCommandManager();

    await wait(1000 * 5);

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

    // Warming up the cache
    await app.request('/index/all', {
        headers: { 'auth-token': getConfig().system.PUBLIC_API_AUTH_TOKEN },
    });

    // await benchmark();
});

async function benchmark() {
    const msArr = [] as number[];
    for (let i = 0; i < 10; i++) {
        const pre = performance.now();
        await app.request('/index/00ba2a50', {
            headers: {
                'auth-token': 'SECR-DEV',
            }
        })
        const ms = performance.now() - pre;
        msArr.push(ms);
        console.log('Request took', ms, 'ms');
    }
    console.log('Average', msArr.reduce((prev, curr) => prev + curr, 0) / msArr.length);
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