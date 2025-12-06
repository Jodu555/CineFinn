import type { FrontendSeries, Season, Movie, DetailedEpisode, DetailedSeason, DetailedMovie, DetailedSeries, Episode } from "@cinefinn/types/database";
import { Hono } from "hono";
import { database, seriesTable, seasonsTable, episodesTable, watchableEntitysTable, moviesTable } from "../database.js";
import { authMiddleware } from "../auth.js";
import { forEachNonBlocking, forEachNonBlockingAsync, queryDatabase } from "../utils.js";

const router = new Hono();

router.get('/', authMiddleware, async (c) => {

    console.time('Old Query');
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
    console.timeEnd('Old Query');

    console.time('New Query');
    const newresult = (await queryDatabase(`
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
    console.timeEnd('New Query');


    console.log('Equal?', JSON.stringify(result) === JSON.stringify(newresult));



    return c.json(newresult);
});

router.get('/all', authMiddleware, async (c) => {
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



    return c.json(output);

});

router.get('/:S-UUID', authMiddleware, async (c) => {

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
            watchableEntitys.map(we => { delete (we as any).filePath; return we });
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
        watchableEntitys.map(we => { delete (we as any).filePath; return we });
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



export { router as indexRouter };
