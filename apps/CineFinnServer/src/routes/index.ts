import type { FrontendSeries, Season, Movie, DetailedEpisode, DetailedSeason, DetailedMovie, DetailedSeries } from "@cinefinn/types/database";
import { Hono } from "hono";
import { database, seriesTable, seasonsTable, episodesTable, watchableEntitysTable, moviesTable } from "../database.js";
import { authMiddleware } from "../auth.js";

const router = new Hono();

router.get('/', authMiddleware, async (c) => {

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
