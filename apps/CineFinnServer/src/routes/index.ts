import { type FrontendSeries, type Season, type Movie, type DetailedEpisode, type DetailedSeason, type DetailedMovie, type DetailedSeries, type Episode, Role } from "@cinefinn/types/database";
import { Hono, type Context } from "hono";
import { database, seriesTable, seasonsTable, episodesTable, watchableEntitysTable, moviesTable } from "../database.js";
import { authFullMiddleware, authMiddleware } from "../auth.js";
import { forEachNonBlocking, forEachNonBlockingAsync, queryDatabase } from "../utils.js";
import { createStorage, prefixStorage } from "unstorage";
import pLimit from 'p-limit';
import { createMiddleware } from "hono/factory";
import type { Storage, StorageValue } from "unstorage";
import z from "zod";
import { sendSeriesReloadToAll } from "../sockets/client.socket.js";



const indexStorage = createStorage();
const fullIndexStorage = prefixStorage<DetailedSeries>(indexStorage, 'fullIndex');
const undetailedIndexStorage = prefixStorage<FrontendSeries[]>(indexStorage, 'undetailedIndex');

export const cachingMiddleware = <T extends StorageValue>(storage: Storage<T>, keyFunction = (c: Context<any>) => c.req.path) => {
    return createMiddleware(async (c, next) => {
        const key = keyFunction(c);
        if (await storage.hasItem(key)) {
            c.header('X-Cache-Hit', 'true');
            return c.json(await storage.getItem(key));
        } else {
            await next();
            const response = (await c.res.clone().json()) as T;
            await storage.setItem(key, response);
        }
    })
};

export async function getFrontEndSeries() {
    const result = (await queryDatabase(`
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
        `)).map((row: any) => {
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
    }).filter((x) => x != null);
    return result;
}

const editSeriesSchema = z.object({
    infos: z.object({
        infos: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        image: z.boolean().optional(),
        imageURL: z.string().optional(),
        description: z.string().optional(),
    }),
    refs: z.object({
        aniworld: z.string().optional(),
        zoro: z.string().optional(),
        sto: z.string().optional(),
    }),
    tags: z.array(z.string()).optional(),
    title: z.string().optional(),
});

const router = new Hono()
    .get('/', authMiddleware, cachingMiddleware(undetailedIndexStorage, (c) => 'undetailedIndex'), async (c) => {
        const result = await getFrontEndSeries();
        return c.json(result);
    })
    .get('/all', authMiddleware, async (c) => {

        if (await fullIndexStorage.hasItem('fullIndex')) {
            const fullIndex = await fullIndexStorage.getItem('fullIndex');
            return c.json(fullIndex);
        }

        const output = [] as DetailedSeries[];
        // console.time('Load All db')
        // const [
        //     allSeries,
        //     allSeasons,
        //     allEpisodes,
        //     allMovies,
        //     allWatchableEntitys
        // ] = await Promise.all([
        //     seriesTable.get({}),
        //     seasonsTable.get({}),
        //     episodesTable.get({}),
        //     moviesTable.get({}),
        //     watchableEntitysTable.get({})
        // ]);
        // console.timeEnd('Load All db')

        // await forEachNonBlockingAsync(allSeries, 10, async (serie, index) => {
        //     index % 50 == 0 && console.log(`=> Working.... ${index}/${allSeries.length} series`);

        //     // const seasons = await seasonsTable.get({ serie_UUID: serie.UUID });
        //     const seasons = allSeasons.filter(s => s.serie_UUID == serie.UUID);
        //     const newSeasons = seasons.map((season) => {
        //         // const episodes = await episodesTable.get({ season_UUID: season.UUID });
        //         const episodes = allEpisodes.filter(e => e.season_UUID == season.UUID);

        //         const filledEpisodesWithWatchables = episodes.map((episode) => {
        //             // const watchableEntitys = await watchableEntitysTable.get({ watchable_UUID: episode.UUID });
        //             const watchableEntitys = allWatchableEntitys.filter(we => we.watchable_UUID == episode.UUID);
        //             watchableEntitys.map(we => { delete (we as any).filePath; return we });
        //             return {
        //                 ...episode,
        //                 watchableEntitys,
        //             } as DetailedEpisode;
        //         });
        //         const obj = {
        //             ...season,
        //             episodes: filledEpisodesWithWatchables.sort((a, b) => a.episode_IDX - b.episode_IDX),
        //         } as DetailedSeason;
        //         return obj;
        //     });

        //     // const movies = await moviesTable.get({ serie_UUID: serie.UUID });
        //     const movies = allMovies.filter(m => m.serie_UUID == serie.UUID);

        //     const newMovies = movies.map((movie) => {
        //         // const watchableEntitys = await watchableEntitysTable.get({ watchable_UUID: movie.UUID });
        //         const watchableEntitys = allWatchableEntitys.filter(we => we.watchable_UUID == movie.UUID);
        //         watchableEntitys.map(we => { delete (we as any).filePath; return we });
        //         return {
        //             ...movie,
        //             watchableEntitys,
        //         } as DetailedMovie;
        //     });

        //     const finalOutput = {
        //         ...serie,
        //         seasons: newSeasons.sort((a, b) => a.season_IDX - b.season_IDX),
        //         movies: newMovies,
        //     };
        //     output.push(finalOutput);
        // });

        const rows = await queryDatabase(`
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
            ), ']'), '[]') FROM movies m WHERE m.serie_UUID = series.UUID) AS movies_array,
            (SELECT COALESCE(CONCAT('[', GROUP_CONCAT(
            JSON_OBJECT(
                'UUID', e.UUID,
                'serie_UUID', e.serie_UUID,
                'season_UUID', e.season_UUID,
                'season_IDX', e.season_IDX,
                'episode_IDX', e.episode_IDX,
                'created_at', e.created_at,
                'updated_at', e.updated_at
            )
            ), ']'), '[]') FROM episodes e WHERE e.serie_UUID = series.UUID) AS episodes_array
        FROM series
            `) as any;

        const allWatchableEntitys = await watchableEntitysTable.get({});



        await forEachNonBlockingAsync(rows, 10, async (row: any, index) => {
            index % 50 == 0 && console.log(`=> Working.... ${index}/${rows.length} series`);
            const seasons = JSON.parse(row.seasons_array) as Season[];
            const movies = row.movies_array != undefined ? JSON.parse(row.movies_array) as Movie[] : [] as Movie[];
            const episodes = row.episodes_array != undefined ? JSON.parse(row.episodes_array) as Episode[] : [] as Episode[];

            const newSeasons = seasons.map((season) => {
                const episode = episodes.filter(e => e.season_UUID == season.UUID);

                const newEpisodes = episode.map((episode) => {
                    const watchableEntitys = allWatchableEntitys.filter(we => we.watchable_UUID == episode.UUID);
                    watchableEntitys.map(we => { delete (we as any).filePath; return we });
                    return {
                        ...episode,
                        watchableEntitys,
                    } as DetailedEpisode;
                });

                return {
                    ...season,
                    episodes: newEpisodes.sort((a, b) => a.episode_IDX - b.episode_IDX),
                } as DetailedSeason;
            });

            const newMovies = movies.map((movie) => {
                const watchableEntitys = allWatchableEntitys.filter(we => we.watchable_UUID == movie.UUID);
                watchableEntitys.map(we => { delete (we as any).filePath; return we });
                return {
                    ...movie,
                    watchableEntitys,
                } as DetailedMovie;
            });

            const obj = {
                ...row,
                tags: JSON.parse(row.tags),
                infos: JSON.parse(row.infos),
                refs: JSON.parse(row.refs),
                seasons: newSeasons.sort((a, b) => a.season_IDX - b.season_IDX),
                movies: newMovies.sort((a, b) => a.movie_IDX - b.movie_IDX),
            } as DetailedSeries & { seasons_array?: string; movies_array?: string; episodes_array?: string };
            delete obj.seasons_array;
            delete obj.movies_array;
            delete obj.episodes_array;

            output.push(obj);
        });


        const limit = pLimit(5);
        const promises = output.map(s => {
            limit(() => fullIndexStorage.setItem(`fullIndex-${s.UUID}`, s));
        })
        await Promise.all(promises);

        return c.json(output);

    })
    .get('/:S-UUID', authMiddleware, cachingMiddleware(fullIndexStorage, (c) => `fullIndex-${c.req.param('S-UUID')}`), async (c) => {


        const rows = (await queryDatabase(`
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
            ), ']'), '[]') FROM movies m WHERE m.serie_UUID = series.UUID) AS movies_array,
            (SELECT COALESCE(CONCAT('[', GROUP_CONCAT(
            JSON_OBJECT(
                'UUID', e.UUID,
                'serie_UUID', e.serie_UUID,
                'season_UUID', e.season_UUID,
                'season_IDX', e.season_IDX,
                'episode_IDX', e.episode_IDX,
                'created_at', e.created_at,
                'updated_at', e.updated_at
            )
            ), ']'), '[]') FROM episodes e WHERE e.serie_UUID = series.UUID) AS episodes_array
        FROM series WHERE UUID = ?`, [c.req.param('S-UUID')]));

        const allWatchableEntitys = await watchableEntitysTable.get({});

        let outputSeries: DetailedSeries | undefined;

        await forEachNonBlockingAsync(rows, 20, async (row: any, index) => {
            const seasons = JSON.parse(row.seasons_array) as Season[];
            const movies = row.movies_array != undefined ? JSON.parse(row.movies_array) as Movie[] : [] as Movie[];
            const episodes = row.episodes_array != undefined ? JSON.parse(row.episodes_array) as Episode[] : [] as Episode[];

            const newSeasons = seasons.map((season) => {
                const episode = episodes.filter(e => e.season_UUID == season.UUID);

                const newEpisodes = episode.map((episode) => {
                    const watchableEntitys = allWatchableEntitys.filter(we => we.watchable_UUID == episode.UUID);
                    watchableEntitys.map(we => { delete (we as any).filePath; return we });
                    return {
                        ...episode,
                        watchableEntitys,
                    } as DetailedEpisode;
                });

                return {
                    ...season,
                    episodes: newEpisodes.sort((a, b) => a.episode_IDX - b.episode_IDX),
                } as DetailedSeason;
            });

            const newMovies = movies.map((movie) => {
                const watchableEntitys = allWatchableEntitys.filter(we => we.watchable_UUID == movie.UUID);
                watchableEntitys.map(we => { delete (we as any).filePath; return we });
                return {
                    ...movie,
                    watchableEntitys,
                } as DetailedMovie;
            });

            const obj = {
                ...row,
                tags: JSON.parse(row.tags),
                infos: JSON.parse(row.infos),
                refs: JSON.parse(row.refs),
                seasons: newSeasons.sort((a, b) => a.season_IDX - b.season_IDX),
                movies: newMovies.sort((a, b) => a.movie_IDX - b.movie_IDX),
            } as DetailedSeries & { seasons_array?: string; movies_array?: string; episodes_array?: string };
            delete obj.seasons_array;
            delete obj.movies_array;
            delete obj.episodes_array;

            outputSeries = obj;
        });


        if (outputSeries == undefined) {
            return c.json({
                error: 'Serie not found',
            });
        }

        return c.json(outputSeries as DetailedSeries);

        // const serie = await seriesTable.getOne({ UUID: c.req.param('S-UUID') });

        // if (serie == undefined) {
        //     return c.json({
        //         error: 'Serie not found',
        //     });
        // }

        // const seasons = await seasonsTable.get({ serie_UUID: serie.UUID });


        // const newSeasons = await Promise.all(seasons.map(async (season) => {
        //     const episodes = await episodesTable.get({ season_UUID: season.UUID });
        //     const filledEpisodesWithWatchables = await Promise.all(episodes.map(async (episode) => {
        //         const watchableEntitys = await watchableEntitysTable.get({ watchable_UUID: episode.UUID });
        //         watchableEntitys.map(we => { delete (we as any).filePath; return we });
        //         return {
        //             ...episode,
        //             watchableEntitys,
        //         } as DetailedEpisode;
        //     }));
        //     const obj = {
        //         ...season,
        //         episodes: filledEpisodesWithWatchables.sort((a, b) => a.episode_IDX - b.episode_IDX),
        //     } as DetailedSeason;
        //     return obj;
        // }));

        // const movies = await moviesTable.get({ serie_UUID: serie.UUID });
        // const newMovies = await Promise.all(movies.map(async (movie) => {
        //     const watchableEntitys = await watchableEntitysTable.get({ watchable_UUID: movie.UUID });
        //     watchableEntitys.map(we => { delete (we as any).filePath; return we });
        //     return {
        //         ...movie,
        //         watchableEntitys,
        //     } as DetailedMovie;
        // }));

        // const finalOutput = {
        //     ...serie,
        //     seasons: newSeasons.sort((a, b) => a.season_IDX - b.season_IDX),
        //     movies: newMovies,
        // };

        // return c.json(finalOutput as DetailedSeries);
    })
    .patch('/:seriesID', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const user = c.get('credentials').user;
        const seriesID = c.req.param('seriesID');
        const body = await c.req.json();
        console.log(body);
        const editSeriesData = editSeriesSchema.parse(body);

        await seriesTable.update({ UUID: seriesID }, {
            infos: {
                infos: editSeriesData.infos.infos,
                startDate: editSeriesData.infos.startDate,
                endDate: editSeriesData.infos.endDate,
                image: editSeriesData.infos.image,
                imageURL: editSeriesData.infos.imageURL,
                description: editSeriesData.infos.description,
            },
            refs: {
                aniworld: editSeriesData.refs.aniworld || '',
                zoro: editSeriesData.refs.zoro || '',
                sto: editSeriesData.refs.sto || '',
            },
            title: editSeriesData.title,
        });

        await sendSeriesReloadToAll()

        return c.json({
            message: 'Successfully updated series',
        });
    });

export { router as indexRouter, indexStorage, fullIndexStorage, undetailedIndexStorage };
