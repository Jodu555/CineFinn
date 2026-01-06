import { Hono, type Context } from 'hono';
import { authFullMiddleware, authMiddleware, type AuthedVars } from '../auth.js';
import { episodesTable, moviesTable, seasonsTable, watchableEntitysTable, watchHistoryTable } from '../database.js';
import { getIO, watchableUUIDToWatchable } from '../utils.js';
import type { Episode, Movie } from '@cinefinn/types/database';



const router = new Hono()
    .get('/info/:seriesUUID', authMiddleware, async (c) => {
        const user = c.get('credentials').user;
        const seriesUUID = c.req.param('seriesUUID');
        const watchList = await watchHistoryTable.get({ series_UUID: seriesUUID, account_UUID: user.UUID, unique: true });
        return c.json(watchList);
    })
    .post('/markSeason/:seasonUUID/:bool', authMiddleware, async (c) => {

        const user = c.get('credentials').user;
        const seasonUUID = c.req.param('seasonUUID');
        const bool = c.req.param('bool') === 'true';

        console.log('Marking', bool);


        const episodes = await episodesTable.get({ season_UUID: seasonUUID });
        if (episodes.length == 0) {
            return c.json({
                message: 'No episodes found',
            });
        }

        const promises = episodes.map(async (episode) => {
            const watchHistory = await watchHistoryTable.getOne({ account_UUID: user.UUID, watchable_UUID: episode.UUID, unique: true });

            const watchableEntities = await watchableEntitysTable.get({ watchable_UUID: episode.UUID });
            const averageRuntime = watchableEntities.map(we => {
                return we.runtime === -1 ? 500 : we.runtime;
            }).reduce((prev, curr) => prev + curr, 0) / watchableEntities.length;

            console.log('Average Runtime', episode.UUID, averageRuntime);


            if (watchHistory == undefined) {
                await watchHistoryTable.create({
                    UUID: crypto.randomUUID(),
                    account_UUID: user.UUID,
                    series_UUID: episode.serie_UUID,
                    watchable_UUID: episode.UUID,
                    watchTime: bool ? averageRuntime : 0,
                });
            } else {
                const finalTime = Math.max(watchHistory.watchTime, bool ? averageRuntime : 0);
                await watchHistoryTable.update({ UUID: watchHistory.UUID }, {
                    watchTime: finalTime,
                });
            }
        });
        await Promise.all(promises);

        (await getIO().fetchSockets()).filter(s => s.data.auth.type === 'client' && s.data.auth.user.UUID === user.UUID).forEach(async s => {
            const watchList = await watchHistoryTable.get({ series_UUID: episodes[0].serie_UUID, account_UUID: user.UUID });
            s.emit('watchListUpdate', watchList)
        });

        return c.json(episodes);
    })
    .post('/updateTime/:watchableUUID/:time', authMiddleware, async (c) => {
        const user = c.get('credentials').user;

        const time = Number(c.req.param('time'));

        if (isNaN(time) || time < 0) {
            return c.json({
                message: 'Time must be a positive number',
            });
        }

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

        const watchable = await watchableUUIDToWatchable(watchableUUID);
        if (watchable == undefined) {
            return c.json({
                message: 'Watchable does not match any known type',
            });
        }

        const watchHistory = await watchHistoryTable.getOne({ account_UUID: user.UUID, watchable_UUID: watchable.UUID, unique: true });
        if (watchHistory == undefined) {
            await watchHistoryTable.create({
                UUID: crypto.randomUUID(),
                account_UUID: user.UUID,
                series_UUID: watchable.serie_UUID,
                watchable_UUID: watchable.UUID,
                watchTime: time,
            });
            await updated(watchable.serie_UUID);
            return c.json({
                message: 'Watchable watchTime updated',
            });
        } else {
            if (watchHistory.watchTime < time) {
                await watchHistoryTable.update({ UUID: watchHistory.UUID }, {
                    watchTime: time,
                });
                await updated(watchable.serie_UUID);
                return c.json({
                    message: 'Watchable watchTime updated',
                });
            }
            await updated(watchable.serie_UUID);
            return c.json({
                message: 'Watchable watchTime not updated because lower',
            });
        }
    });

export { router as watchRouter };