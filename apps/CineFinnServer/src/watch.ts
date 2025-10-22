import { Hono, type Context } from 'hono';
import { authFullMiddleware, authMiddleware, type AuthedVars } from './auth.js';
import { episodesTable, moviesTable, seasonsTable, watchHistoryTable } from './database.js';

const router = new Hono();

router.get('/info/:seriesUUID', authMiddleware, async (c) => {
    const user = c.get('credentials').user;
    const seriesUUID = c.req.param('seriesUUID');
    const watchList = await watchHistoryTable.get({ series_UUID: seriesUUID, account_UUID: user.UUID });
    return c.json(watchList);
});

router.post('/markSeason/:seasonUUID/:bool', authMiddleware, async (c) => {

    const user = c.get('credentials').user;
    const seasonUUID = c.req.param('seasonUUID');
    const bool = c.req.param('bool') === 'true';

    const seasonInfo = await seasonsTable.getOne({ UUID: seasonUUID });
    if (seasonInfo == undefined) {
        return c.json({
            message: 'Season not found',
        });
    }
    const episodes = await episodesTable.get({ season_UUID: seasonUUID });

    for (const episode of episodes) {
        const watchHistory = await watchHistoryTable.getOne({ account_UUID: user.UUID, watchable_UUID: episode.UUID, unique: true });
        if (watchHistory == undefined) {
            await watchHistoryTable.create({
                UUID: crypto.randomUUID(),
                account_UUID: user.UUID,
                series_UUID: seasonInfo.serie_UUID,
                watchable_UUID: episode.UUID,
                watchTime: bool ? 0 : 500,
            });
        } else {
            await watchHistoryTable.update({ UUID: watchHistory.UUID }, {
                watchTime: bool ? 0 : 500,
            });
        }
    }

    return c.json(episodes);
});

router.post('/updateTime/:watchableUUID/:time', authMiddleware, async (c) => {
    const user = c.get('credentials').user;
    const watchableUUID = c.req.param('watchableUUID');
    const time = Number(c.req.param('time'));

    if (watchableUUID.startsWith('E#')) {
        //Update Time for Episode
        const episode = await episodesTable.getOne({ UUID: watchableUUID });
        if (episode == undefined) {
            return c.json({
                message: 'Episode not found',
            });
        }
        const season = await seasonsTable.getOne({ UUID: episode.season_UUID });
        if (season == undefined) {
            return c.json({
                message: 'Season not found',
            });
        }
        const watchHistory = await watchHistoryTable.getOne({ account_UUID: user.UUID, watchable_UUID: episode.UUID, unique: true });
        if (watchHistory == undefined) {
            await watchHistoryTable.create({
                UUID: crypto.randomUUID(),
                account_UUID: user.UUID,
                series_UUID: season.serie_UUID,
                watchable_UUID: episode.UUID,
                watchTime: time,
            });
        } else {
            await watchHistoryTable.update({ UUID: watchHistory.UUID }, {
                watchTime: time,
            });
        }
    } else if (watchableUUID.startsWith('M#')) {
        //Update Time for Movie
        const movie = await moviesTable.getOne({ UUID: watchableUUID });
        if (movie == undefined) {
            return c.json({
                message: 'Movie not found',
            });
        }
        const watchHistory = await watchHistoryTable.getOne({ account_UUID: user.UUID, watchable_UUID: movie.UUID, unique: true });
        if (watchHistory == undefined) {
            await watchHistoryTable.create({
                UUID: crypto.randomUUID(),
                account_UUID: user.UUID,
                series_UUID: movie.serie_UUID,
                watchable_UUID: movie.UUID,
                watchTime: time,
            });
        } else {
            await watchHistoryTable.update({ UUID: watchHistory.UUID }, {
                watchTime: time,
            });
        }

    }
});