import { Hono, type Context } from 'hono';
import { authFullMiddleware, authMiddleware, type AuthedVars } from '../auth.js';
import { episodesTable, moviesTable, seasonsTable, watchableEntitysTable, watchHistoryTable } from '../database.js';
import { getIO } from '../utils.js';

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

    const time = Number(c.req.param('time'));

    const updated = async (seriesUUID: string) => {
        (await getIO().fetchSockets()).filter(s => s.data.auth.type === 'client' && s.data.auth.user.UUID === user.UUID).forEach(async s => {
            const watchList = await watchHistoryTable.get({ series_UUID: seriesUUID, account_UUID: user.UUID });
            s.emit('watchListUpdate', watchList)
        });
    }

    let watchableUUID = c.req.param('watchableUUID');
    if (watchableUUID.startsWith('WE-')) {
        const watchableEntity = await watchableEntitysTable.getOne({ UUID: watchableUUID });
        if (!watchableEntity) {
            return c.json({
                message: 'Watchable Entity not found',
            });
        }
        watchableUUID = watchableEntity.watchable_UUID;
    }

    if (watchableUUID.startsWith('EP-')) {
        //Update Time for Episode
        const episode = await episodesTable.getOne({ UUID: watchableUUID });
        if (episode == undefined) {
            return c.json({
                message: 'Episode not found',
            });
        }
        const watchHistory = await watchHistoryTable.getOne({ account_UUID: user.UUID, watchable_UUID: episode.UUID, unique: true });
        if (watchHistory == undefined) {
            await watchHistoryTable.create({
                UUID: crypto.randomUUID(),
                account_UUID: user.UUID,
                series_UUID: episode.serie_UUID,
                watchable_UUID: episode.UUID,
                watchTime: time,
            });
            await updated(episode.serie_UUID);
            return c.json({
                message: 'Episode watchTime updated',
            });
        } else {
            if (watchHistory.watchTime < time) {
                await watchHistoryTable.update({ UUID: watchHistory.UUID }, {
                    watchTime: time,
                });
                await updated(episode.serie_UUID);
                return c.json({
                    message: 'Episode watchTime updated',
                });
            }
            await updated(episode.serie_UUID);
            return c.json({
                message: 'Episode watchTime not updated because lower',
            });
        }
    } else if (watchableUUID.startsWith('MO-')) {
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
            await updated(movie.serie_UUID);
            return c.json({
                message: 'Movie watchTime updated',
            });
        } else {
            if (watchHistory.watchTime < time) {
                await watchHistoryTable.update({ UUID: watchHistory.UUID }, {
                    watchTime: time,
                });
                await updated(movie.serie_UUID);
                return c.json({
                    message: 'Movie watchTime updated',
                });
            }
            await updated(movie.serie_UUID);
            return c.json({
                message: 'Episode watchTime not updated because lower',
            });
        }

    }
    return c.json({
        message: 'WatchableUUID does not match any known type',
    });
});

export { router as watchRouter };