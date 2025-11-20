import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { connectDatabase, database, episodesTable, moviesTable, seasonsTable, seriesTable, watchableEntitysTable } from './database.js';
import { crawl } from './crawler.js';
dotenv.config();
import { proxy } from 'hono/proxy';
import { trimTrailingSlash } from 'hono/trailing-slash';
import { authFullMiddleware, authRouter, getUser } from './auth.js';
import { prometheus } from '@hono/prometheus';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { ownLogger } from './ownLogger.js';
import { managmentRouter } from './managment.js';
import { CacheContext } from './LRUCache.js';
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from '@cinefinn/types/socket';
import { tryCatch } from './tryCatch.js';
import type { Series, Season, Movie, Account, timestamped, DetailedSeries, DetailedMovie, DetailedEpisode, DetailedSeason, FrontendSeries } from '@cinefinn/types/database';
import { setIO } from './utils.js';


const app = new Hono({
    strict: false,
});
const { printMetrics, registerMetrics } = prometheus();
app.use(cors());
app.use(trimTrailingSlash());
// app.use(logger());
app.use(ownLogger(console.log, ['/socket.io']));

app.use('*', registerMetrics);
app.get('/metrics', printMetrics);


app.route('/auth', authRouter);

app.route('/managment', managmentRouter);

export const indexSeriesCache = new CacheContext('index-series', 500);
export const indexSeasonsCache = new CacheContext('index-seasons', 500);
export const indexMoviesCache = new CacheContext('index-movies', 500);

app.get('/index', async (c) => {


    const result = await new Promise<FrontendSeries[]>((resolve, reject) => {
        database.pool.query(`
          SELECT 
            series.*,
            (SELECT COALESCE(CONCAT('[', GROUP_CONCAT(
            JSON_OBJECT(
                'UUID', s.UUID,
                'serie_UUID', s.serie_UUID,
                'season_IDX', s.season_IDX,
                'episodes', s.episodes,
                'created_at', s.created_at,
                'updated_at', s.updated_at
            )
            ), ']'), '[]') FROM seasons s WHERE s.serie_UUID = series.UUID) AS seasons_array,
            (SELECT COALESCE(CONCAT('[', GROUP_CONCAT(
            JSON_OBJECT(
                'UUID', m.UUID,
                'primaryName', m.primaryName,
                'serie_UUID', m.serie_UUID,
                'movie_IDX', m.movie_IDX,
                'created_at', m.created_at,
                'updated_at', m.updated_at
            )
            ), ']'), '[]') FROM movies m WHERE m.serie_UUID = series.UUID) AS movies_array
        FROM series
            `, (error, rows, fields) => {

            resolve(rows.map((row: any) => {
                try {
                    const seasons = JSON.parse(row.seasons_array) as Season[];
                    const movies = row.movies_array != undefined ? JSON.parse(row.movies_array) as Movie[] : [] as Movie[];
                    const obj = {
                        ...row,
                        tags: JSON.parse(row.tags),
                        infos: JSON.parse(row.infos),
                        refs: JSON.parse(row.refs),
                        seasons: seasons.sort((a, b) => a.season_IDX - b.season_IDX),
                        movies: movies.sort((a, b) => a.movie_IDX - b.movie_IDX),
                    } as FrontendSeries & { seasons_array?: string; movies_array?: string };
                    delete obj.seasons_array;
                    delete obj.movies_array;
                    return obj as FrontendSeries;
                } catch (error) {
                    console.log(error);
                    console.log(row);

                }
                return null;
            }));
        });
    });

    return c.json(result);
});

app.get('/index/:S-UUID', async (c) => {

    const serie = await seriesTable.getOne({ UUID: c.req.param('S-UUID') });

    if (serie == undefined) {
        return c.json({
            error: 'Serie not found',
        });
    }

    const seasons = await seasonsTable.get({ serie_UUID: serie.UUID });


    const newSeasons = await Promise.all(seasons.map(async (season) => {
        const episodes = await episodesTable.get({ season_UUID: season.UUID });
        const filledEpisodesWithWatchables = await Promise.all(episodes.map(async (episode) => {
            const watchableEntitys = await watchableEntitysTable.get({ watchable_UUID: episode.UUID });
            return {
                ...episode,
                watchableEntitys,
            } as DetailedEpisode;
        }));
        const obj = {
            ...season,
            episodes: filledEpisodesWithWatchables.sort((a, b) => a.episode_IDX - b.episode_IDX),
        } as DetailedSeason;
        return obj;
    }));

    const movies = await moviesTable.get({ serie_UUID: serie.UUID });
    const newMovies = await Promise.all(movies.map(async (movie) => {
        const watchableEntitys = await watchableEntitysTable.get({ watchable_UUID: movie.UUID });
        return {
            ...movie,
            watchableEntitys,
        } as DetailedMovie;
    }));

    const finalOutput = {
        ...serie,
        seasons: newSeasons.sort((a, b) => a.season_IDX - b.season_IDX),
        movies: newMovies,
    };

    return c.json(finalOutput as DetailedSeries);
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
    port: 3000
}, async (info) => {
    console.log(info);

    await connectDatabase();
    console.log(`Server is running on http://localhost:${info.port}`);
    // await crawl();

    setInterval(() => {
        database.pool.query('SELECT 1', (error, rows, fields) => {
            if (error) {
                console.log('Error keeping database connection alive:', error);
            }
        });
    }, 10000 * 30);
});

const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData<Account | Account & timestamped>
>(httpServer, {
    cors: {
        methods: ['GET', 'POST'],
    },
});
setIO(io);

io.use(async (socket, next) => {
    console.log('Trying to authorize ', socket.id, socket.handshake.auth);

    if (socket.handshake.auth.token === undefined) {
        return next(new Error('Unauthorized'));
    }

    const token = socket.handshake.auth.token;

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
            token,
            user,
        }
    };
    // Validate the token or something
    next();

});

io.on('connection', (socket) => {
    console.log(socket.handshake.auth);

    console.log(socket.id, socket.data, 'a user connected');

    socket.on('hello', () => {
        console.log(socket.id, 'hello');
    });

    socket.on('disconnect', () => {
        console.log(socket.id, 'user disconnected');
    });
});
