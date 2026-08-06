import { Hono, type Context } from 'hono';
import { authFullMiddleware, authMiddleware, type AuthedVars } from '../middleware/auth.js';
import { episodesTable, moviesTable, seasonsTable, watchableEntitysTable, watchHistoryTable } from '../database.js';
import { getIO, isMovie, watchableUUIDToWatchable } from '../utils.js';
import type { Episode, Movie, WatchableEntity } from '@cinefinn/types/models/media';
import type { WatchHistory } from '@cinefinn/types/models/system';
import type { timestamped } from '@cinefinn/types/shared';
import { generateWatchHistoryID } from '../utils/IdGenerators.js';
import translationV1WatchString from '../utils/translationV1WatchString.js';

type WatchHistoryWithDetails = WatchHistory & {
    runtime: number;
    season_IDX: number;
    episode_IDX: number;
    movie_IDX: number;
};



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

        console.log('Marking', seasonUUID, bool);


        const episodes = await episodesTable.get({ season_UUID: seasonUUID });
        if (episodes.length == 0) {
            return c.json({
                message: 'No episodes found',
            });
        }

        if (process.env.OLD_DB_WATCH_STRING_TRANSLATION! == 'true' || process.env.OLD_DB_WATCH_STRING_TRANSLATION! == '1') {
            //To force hono to complete the request before doing the translation stuff cause that's more a failsafe than anything else
            setImmediate(() => {
                setTimeout(async () => {
                    console.time('Translating');
                    await translationV1WatchString.markSeason(user.UUID, episodes[0].serie_UUID, episodes[0].season_IDX, bool ? 'true' : 'false');
                    console.timeEnd('Translating');
                }, 1000);
            });
        }

        const promises = episodes.map(async (episode) => {
            const watchHistory = await watchHistoryTable.getOne({ account_UUID: user.UUID, series_UUID: episode.serie_UUID, watchable_UUID: episode.UUID, unique: true });

            const watchableEntities = await watchableEntitysTable.get({ watchable_UUID: episode.UUID });
            const averageRuntime = watchableEntities.map(we => {
                return we.runtime === -1 ? 500 : we.runtime;
            }).reduce((prev, curr) => prev + curr, 0) / watchableEntities.length;

            if (watchHistory == undefined) {
                await watchHistoryTable.create({
                    UUID: generateWatchHistoryID(),
                    account_UUID: user.UUID,
                    series_UUID: episode.serie_UUID,
                    watchable_UUID: episode.UUID,
                    watchTime: bool ? averageRuntime : 0,
                });
            } else {
                const finalTime = bool ? Math.max(watchHistory.watchTime, bool ? averageRuntime : 0) : 0;
                await watchHistoryTable.update({ UUID: watchHistory.UUID }, {
                    watchTime: finalTime,
                });
            }
        });
        await Promise.all(promises);

        (await getIO().fetchSockets()).filter(s => s.data.auth.type === 'client' && s.data.auth.user.UUID === user.UUID).forEach(async s => {
            const watchList = await watchHistoryTable.get({ series_UUID: episodes[0].serie_UUID, account_UUID: user.UUID, unique: true });
            s.emit('watchListUpdate', watchList);
        });

        return c.json(episodes);
    })
    .post('/markMovie/:movieUUID/:bool', authMiddleware, async (c) => {
        const user = c.get('credentials').user;
        const movieUUID = c.req.param('movieUUID');
        const bool = c.req.param('bool') === 'true';

        console.log('Marking', movieUUID, bool);

        const movie = await moviesTable.getOne({ UUID: movieUUID });
        if (movie == undefined) {
            return c.json({
                message: 'Movie not found',
            });
        }

        if (process.env.OLD_DB_WATCH_STRING_TRANSLATION! == 'true' || process.env.OLD_DB_WATCH_STRING_TRANSLATION! == '1') {
            //To force hono to complete the request before doing the translation stuff cause that's more a failsafe than anything else
            setImmediate(() => {
                setTimeout(async () => {
                    console.time('Translating');
                    await translationV1WatchString.markMovie(user.UUID, movie.serie_UUID, movie.movie_IDX, bool ? 'true' : 'false');
                    console.timeEnd('Translating');
                }, 1000);
            });
        }

        const watchHistory = await watchHistoryTable.getOne({ account_UUID: user.UUID, watchable_UUID: movie.UUID, unique: true });

        const watchableEntities = await watchableEntitysTable.get({ watchable_UUID: movie.UUID });
        const averageRuntime = watchableEntities.map(we => {
            return we.runtime === -1 ? 500 : we.runtime;
        }).reduce((prev, curr) => prev + curr, 0) / watchableEntities.length;

        if (watchHistory == undefined) {
            await watchHistoryTable.create({
                UUID: generateWatchHistoryID(),
                account_UUID: user.UUID,
                series_UUID: movie.serie_UUID,
                watchable_UUID: movie.UUID,
                watchTime: bool ? averageRuntime : 0,
            });
        } else {
            const finalTime = bool ? Math.max(watchHistory.watchTime, bool ? averageRuntime : 0) : 0;
            await watchHistoryTable.update({ UUID: watchHistory.UUID }, {
                watchTime: finalTime,
            });
        }

        (await getIO().fetchSockets()).filter(s => s.data.auth.type === 'client' && s.data.auth.user.UUID === user.UUID).forEach(async s => {
            const watchList = await watchHistoryTable.get({ series_UUID: movie.serie_UUID, account_UUID: user.UUID, unique: true });
            s.emit('watchListUpdate', watchList);
        });

        return c.json({
            message: 'Movie marked as ' + (bool ? 'watched' : 'unwatched'),
        });
    })
    .on(['GET', 'POST'], '/updateTime/:watchableUUID/:time', authMiddleware, async (c) => {
        const user = c.get('credentials').user;

        /**
         * The Time in seconds the watchable was watched
         */
        const time = parseInt(c.req.param('time'));

        if (isNaN(time) || time < 0) {
            return c.json({
                message: 'Time must be a positive number',
            });
        }

        const updated = async (seriesUUID: string) => {
            (await getIO().fetchSockets()).filter(s => s.data.auth.type === 'client' && s.data.auth.user.UUID === user.UUID).forEach(async s => {
                const watchList = await watchHistoryTable.get({ series_UUID: seriesUUID, account_UUID: user.UUID, unique: true });
                s.emit('watchListUpdate', watchList);
            });
        };

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
                watchableUUID,
            });
        }

        const watchHistory = await watchHistoryTable.getOne({ account_UUID: user.UUID, series_UUID: watchable.serie_UUID, watchable_UUID: watchable.UUID, unique: true });

        if (process.env.OLD_DB_WATCH_STRING_TRANSLATION! == 'true' || process.env.OLD_DB_WATCH_STRING_TRANSLATION! == '1') {
            //To force hono to complete the request before doing the translation stuff cause that's more a failsafe than anything else
            setImmediate(() => {
                setTimeout(async () => {
                    if (isMovie(watchable)) {
                        console.time('Translating');
                        await translationV1WatchString.updateSegment(user.UUID, {
                            series: watchable.serie_UUID,
                            season: -1,
                            episode: -1,
                            movie: watchable.movie_IDX,
                        }, (seg) => {
                            if (seg.time < time) {
                                seg.time = time;
                            }
                        });
                        console.timeEnd('Translating');
                    } else {
                        console.time('Translating');
                        await translationV1WatchString.updateSegment(user.UUID, {
                            series: watchable.serie_UUID,
                            season: watchable.season_IDX,
                            episode: watchable.episode_IDX,
                            movie: -1,
                        }, (seg) => {
                            if (seg.time < time) {
                                seg.time = time;
                            }
                        });
                        console.timeEnd('Translating');
                    }

                }, 1000);
            });
        }


        if (watchHistory == undefined) {
            await watchHistoryTable.create({
                UUID: generateWatchHistoryID(),
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
    })
    .get('/history', authMiddleware, async (c) => {
        const user = c.get('credentials').user;
        const watchHistory = await watchHistoryTable.get({ account_UUID: user.UUID });

        // watchableUUID -> watchableEntity
        const wacthableEntitysMap = new Map<string, WatchableEntity & timestamped>();

        const watchableEntitys = await watchableEntitysTable.get();
        watchableEntitys.forEach(we => {
            wacthableEntitysMap.set(we.watchable_UUID, we);
        });

        const episodeMap = new Map<string, Episode & timestamped>();
        const moviesMap = new Map<string, Movie & timestamped>();

        const episodes = await episodesTable.get();
        episodes.forEach(e => {
            episodeMap.set(e.UUID, e);
        });
        const movies = await moviesTable.get();
        movies.forEach(m => {
            moviesMap.set(m.UUID, m);
        });


        const result: WatchHistoryWithDetails[] = await Promise.all(
            watchHistory.map(async (wh): Promise<WatchHistoryWithDetails> => {
                const watchableEntity = wacthableEntitysMap.get(wh.watchable_UUID)!;

                let season_IDX = 0;
                let episode_IDX = 0;
                let movie_IDX = 0;

                if (wh.watchable_UUID.startsWith('EP-')) {
                    const episode = episodeMap.get(wh.watchable_UUID)!;
                    season_IDX = episode?.season_IDX || 0;
                    episode_IDX = episode?.episode_IDX || 0;
                } else if (wh.watchable_UUID.startsWith('MO-')) {
                    const movie = moviesMap.get(wh.watchable_UUID)!;
                    movie_IDX = movie?.movie_IDX || 0;
                }

                return {
                    ...wh,
                    runtime: watchableEntity?.runtime || 0,
                    season_IDX,
                    episode_IDX,
                    movie_IDX,
                };
            })
        );

        return c.json(result);
    });

export { router as watchRouter };