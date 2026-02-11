import fs from "fs";
import path from "path";
import { type FrontendSeries, type Season, type Movie, type DetailedEpisode, type DetailedSeason, type DetailedMovie, type DetailedSeries, type Episode, Role, type Series } from "@cinefinn/types/database";
import { Hono } from "hono";
import { seriesTable, watchableEntitysTable } from "../database.js";
import { authFullMiddleware, authMiddleware } from "../auth.js";
import { cachingMiddleware, forEachNonBlockingAsync, queryDatabase } from "../utils.js";
import { createStorage, prefixStorage } from "unstorage";
import pLimit from 'p-limit';
import z from "zod";
import { sendSeriesReloadToAll } from "../sockets/client.socket.js";
import { generateSeriesID } from "../utils/IdGenerators.js";
import { getConfig } from "../config.js";
import type { CheckForUpdatesOutput } from "@cinefinn/types/socket";
import { filenameParser, type ParsedInformation } from "../parser.js";
import { getScraperSocket } from "../sockets/scraper.socket.js";
import { tryCatch } from "../tryCatch.js";



const indexStorage = createStorage();
const fullIndexStorage = prefixStorage<DetailedSeries>(indexStorage, 'fullIndex');
const undetailedIndexStorage = prefixStorage<FrontendSeries[]>(indexStorage, 'undetailedIndex');

const seriesUpdateStorage = prefixStorage<any>(indexStorage, 'seriesUpdate');

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
    }).filter((x) => x != null).sort((a, b) => (a as any).created_at - (b as any).created_at);
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
    }).optional(),
    refs: z.object({
        aniworld: z.string().optional(),
        zoro: z.string().optional(),
        sto: z.string().optional(),
    }).optional(),
    tags: z.array(z.string()).optional(),
    title: z.string().optional(),
});

const newSeriesSchema = z.object({
    title: z.string(),
    infos: z.object({
        infos: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        image: z.boolean().optional(),
        imageURL: z.string().optional(),
        description: z.string().optional(),
    }).optional(),
    refs: z.object({
        aniworld: z.string().optional(),
        zoro: z.string().optional(),
        sto: z.string().optional(),
    }).optional(),
    tags: z.array(z.string()).optional(),
});

const newCoverSchema = z.object({
    imageUrl: z.url(),
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
    .get('/:S-UUID/checkForUpdates', cachingMiddleware(seriesUpdateStorage, (c) => `checkForUpdates-${c.req.param('S-UUID')}`), async (c) => {
        const serieUUID = c.req.param('S-UUID');
        if (serieUUID == undefined) {
            return c.json({ error: 'No UUID provided' }, 400);
        }
        const scraperSocket = await getScraperSocket();
        if (scraperSocket == null) {
            return c.json({ error: 'Scraper Socket not found' }, 500);
        }

        const { data: output, error } = await tryCatch(() => {
            return new Promise<CheckForUpdatesOutput>((resolve, reject) => {
                scraperSocket.timeout(1000 * 60 * 10).emit('checkSerieForUpdates', serieUUID, (err, output) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(output)
                });
            });
        });

        if (error) {
            console.log('Error checking for updates', error);
            return c.json({ error: error.message }, 500);
        }

        const finalOutput = Object.keys(output).reduce((prev: { outPath: string; file: string; parsed: ParsedInformation }[], curr) => {
            const newArr = output[curr as keyof typeof output].map(x => {
                x.file = x.file.replaceAll('.', '#');
                x.file += '.mp4';
                const outPath = path.join(getConfig().videoPath, x._animeFolder, x.folder, x.file);
                const parsed = filenameParser(outPath, x.file);

                if (parsed.movie) return null;
                return {
                    outPath,
                    file: x.file,
                    parsed
                };
            });
            return prev.concat(newArr.filter(x => x != null));
        }, []);
        return c.json(finalOutput)
    })
    .patch('/:S-UUID', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const user = c.get('credentials').user;
        const seriesUUID = c.req.param('S-UUID');
        const series = await seriesTable.getOne({ UUID: seriesUUID });
        if (series == undefined) {
            return c.json({
                message: 'Series not found',
            });
        }
        const body = await c.req.json();
        const editSeriesData = editSeriesSchema.parse(body);

        const updatable = {} as any;

        Object.entries(editSeriesData).forEach(([key, value]) => {
            if (value !== undefined) {
                (updatable as any)[key] = value;
            }
        });

        delete updatable['UUID'];
        delete updatable['created_at'];
        delete updatable['updated_at'];

        if (updatable.infos !== undefined) {
            updatable.infos = {
                ...series.infos,
                ...updatable.infos,
            };
        }

        await seriesTable.update({ UUID: seriesUUID }, updatable);

        await fullIndexStorage.removeItem(`fullIndex-${seriesUUID}`);
        await undetailedIndexStorage.removeItem('undetailedIndex');


        await sendSeriesReloadToAll()

        return c.json({
            message: 'Successfully updated series',
        });
    })
    .post('/', authFullMiddleware((user) => user.role >= Role.Admin), async (c) => {
        const user = c.get('credentials').user;
        const body = await c.req.json();
        const newSeriesData = newSeriesSchema.parse(body);

        if (newSeriesData.infos !== undefined) {
            (newSeriesData.infos as any).disabled = true;
        }

        const series = {
            UUID: generateSeriesID(),
            title: newSeriesData.title,
            infos: newSeriesData.infos || { disabled: true },
            refs: newSeriesData.refs || {},
            tags: newSeriesData.tags || [],
        } satisfies Series;

        console.log('Created new series', series);
        await seriesTable.create(series);
        await undetailedIndexStorage.removeItem('undetailedIndex');
        return c.json(series);
    })
    .post('/:S-UUID/cover', authFullMiddleware((user) => user.role >= Role.Admin), async (c) => {
        const user = c.get('credentials').user;
        const seriesUUID = c.req.param('S-UUID');
        const series = await seriesTable.getOne({ UUID: seriesUUID });
        if (series == undefined) {
            return c.json({
                message: 'Series not found',
            });
        }
        const body = await c.req.json();
        const newCoverData = newCoverSchema.parse(body);

        const file = await downloadImage(newCoverData.imageUrl);

        const imagePath = path.join(getConfig().imagePath, seriesUUID, 'cover.jpg');
        fs.mkdirSync(path.dirname(imagePath), { recursive: true });

        const blob = await file.bytes();
        fs.writeFileSync(imagePath, blob);

        console.log(`Dowloaded for ${series.UUID} cover image from ${newCoverData.imageUrl} to ${imagePath}`);


        await seriesTable.update({ UUID: seriesUUID }, {
            infos: {
                ...series.infos,
                image: true,
            },
        });

        await fullIndexStorage.removeItem(`fullIndex-${seriesUUID}`);
        await undetailedIndexStorage.removeItem('undetailedIndex');

        return c.json({
            message: 'Successfully updated series cover',
        });
    });

async function downloadImage(url: string) {
    const response = await fetch(url);
    const blob = await response.blob();
    const file = new File([blob], 'cover.jpg', { type: 'image/jpeg' });
    return file;
}

export { router as indexRouter, indexStorage, fullIndexStorage, undetailedIndexStorage };
