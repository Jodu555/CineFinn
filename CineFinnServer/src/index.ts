import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import dotenv from 'dotenv';
import { connectDatabase, database, episodesTable, moviesTable, seasonsTable, seriesTable, watchableEntitysTable, type Series } from './database.js';
import { crawl } from './crawler.js';
dotenv.config();
import { proxy } from 'hono/proxy';
import { trimTrailingSlash } from 'hono/trailing-slash';
import { authFullMiddleware, authRouter } from './auth.js';
import { prometheus } from '@hono/prometheus';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { ownLogger } from './ownLogger.js';
import { managmentRouter } from './managment.js';


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

app.get('/index', async (c) => {

    const series = await seriesTable.get();

    const overhauledSeries = await Promise.all(series.map(e => {
        return new Promise(async (resolve, reject) => {
            const categorie = e.tags[0];
            const seasons = await seasonsTable.get({ serie_UUID: e.UUID });
            const movies = await moviesTable.get({ serie_UUID: e.UUID });
            resolve({
                ...e,
                movies: movies.sort((a, b) => a.movie_IDX - b.movie_IDX),
                seasons: seasons.sort((a, b) => a.season_IDX - b.season_IDX),
            });
        });
    }));

    return c.json(overhauledSeries);
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
            };
        }));
        const obj = {
            ...season,
            episodes: filledEpisodesWithWatchables.sort((a, b) => a.episode_IDX - b.episode_IDX),
        };
        return obj;
    }));

    const movies = await moviesTable.get({ serie_UUID: serie.UUID });
    const newMovies = await Promise.all(movies.map(async (movie) => {
        const watchableEntitys = await watchableEntitysTable.get({ watchable_UUID: movie.UUID });
        return {
            ...movie,
            watchableEntitys,
        };
    }));

    const finalOutput = {
        ...serie,
        seasons: newSeasons.sort((a, b) => a.season_IDX - b.season_IDX),
        movies: newMovies,
    };

    return c.json(finalOutput);
});

app.get('*', async (c, next) => {

    const proxyables = [
        '/index/all',
        '/managment/jobs/info',
        '/socket.io'
    ];


    let isProxyable = false;
    for (const proxyable of proxyables) {
        if (c.req.path.startsWith(proxyable)) {
            isProxyable = true;
            break;
        }
    }

    // console.log('Came, isProxyable', c.req.path, isProxyable);
    if (!isProxyable) {
        return next();
    }

    const queryString = c.req.url.split('?')[1];

    const newUrl = `http://localhost:3100${c.req.path}?${queryString}&auth-token=SECR-DEV`;
    // const newUrl = `http://localhost:3100${c.req.path}?auth-token=SECR-DEV`;

    return proxy(newUrl);
});

serve({
    fetch: app.fetch,
    port: 3000
}, async (info) => {
    console.log(info);

    await connectDatabase();
    console.log(`Server is running on http://localhost:${info.port}`);
    // await crawl();
});
