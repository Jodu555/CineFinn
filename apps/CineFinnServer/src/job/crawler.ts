import fs from 'fs';
import path from 'path';
import { listFiles } from '../fileutils.js';
import { createHash, randomUUID } from 'node:crypto';
import { filenameParser } from '../parser.js';
import { database, episodesTable, jobsTable, moviesTable, seasonsTable, seriesTable, watchableEntitysTable } from '../database.js';
import { tryCatch } from '../tryCatch.js';
import { CacheContext } from '../LRUCache.js';
import { Job } from './Job.js';
import { getConfig } from '../config.js';
import { generateSeriesID, generateMovieID, generateSeasonID, generateEpisodeID, generateEntityID } from '../utils/IdGenerators.js';
import type { Episode, Langs, Movie, MovingItem, Season, Series, timestamped, WatchableEntity } from '@cinefinn/types/database';
import { fullIndexStorage, indexStorage } from '../routes/index.js';
import { app } from '../index.js';
import { getIO } from '../utils.js';
import { sendSeriesReloadToAll } from '../sockets/client.socket.js';
import { getMovingItems } from '../utils/movingItems.js';


// export async function crawl(job: Job) {

//     const EMPTY_IV = Buffer.alloc(0);

//     const crawlerSeriesSeasonsCache = new CacheContext('crawler-series', 500);
//     const crawlerEpisodesCache = new CacheContext('crawler-episodes', 150);

//     const pathEntries = [getConfig().videoPath];
//     job.log('Listing Files');
//     let { files } = await listFiles(pathEntries[0]);
//     job.log(`Found ${files.length} files`);

//     const viableExtensions = ['.mp4', '.mkv', '.webm'];

//     const prevLength = files.length;
//     files = files.filter((f) => viableExtensions.includes(path.parse(f).ext));
//     job.log(`Filtered ${prevLength - files.length} files`);

//     job.log(`Working on ${files.length} files`);
//     // jobUUID !== undefined && await jobsTable.update({ UUID: jobUUID }, { data: { files } });
//     // await job.setData({ files });

//     job.time('Handling Files');

//     // const seasonCountersMap = new Map<string, number>();

//     const touchedSeasonsSet = new Set<string>();

//     let i = 0;
//     for (const file of files) {
//         i++;
//         i % 100 == 0 && job.log(`Handling File ${i}/${files.length + 1}`);
//         const base = path.parse(file).base;
//         const { error, data: parsedData } = tryCatch(() => filenameParser(file, base));

//         if (error != null) {
//             job.log('Error Parsing File', file, error);
//             continue;
//         }

//         let { data: exsitingSeries, cacheInfo: existingSeriesCacheInfo } = await crawlerSeriesSeasonsCache.execute(seriesTable, 'getOne', [{ title: parsedData.title, unique: true }]);
//         if (exsitingSeries == undefined) {
//             job.log('Series Does not Exist', parsedData.title);
//             const categorie = path.parse(path.join(path.parse(file).dir, '../../')).base;
//             exsitingSeries = await seriesTable.create({
//                 UUID: generateSeriesID(),
//                 title: parsedData.title,
//                 infos: {
//                     disabled: false,
//                 },
//                 refs: {},
//                 tags: JSON.stringify([categorie]),
//             });
//             crawlerSeriesSeasonsCache.invalidate(existingSeriesCacheInfo.cacheKey);
//         }

//         // job.log('Series Exists', exsitingSeries.UUID, exsitingSeries.title);

//         let watchableUUID;
//         if (parsedData.movie == true) {
//             let existingMovie = await moviesTable.getOne({
//                 serie_UUID: exsitingSeries.UUID,
//                 primaryName: parsedData.movieTitle,
//                 unique: true,
//             });
//             if (existingMovie == undefined) {
//                 job.log('Movie Does not Exist', parsedData);
//                 existingMovie = await moviesTable.create({
//                     UUID: generateMovieID(),
//                     primaryName: parsedData.movieTitle!,
//                     serie_UUID: exsitingSeries.UUID,
//                     movie_IDX: 0,
//                 });
//                 job.log('Created Movie', existingMovie.UUID, existingMovie.primaryName);
//             }
//             watchableUUID = existingMovie.UUID;
//         } else {

//             let { data: existingSeason, cacheInfo: existingSeasonCacheInfo } = await crawlerSeriesSeasonsCache.execute(seasonsTable, 'getOne', [{
//                 serie_UUID: exsitingSeries.UUID,
//                 season_IDX: parsedData.season,
//                 unique: true,
//             }]);
//             if (existingSeason == undefined) {
//                 job.log('Season Does not Exist', parsedData);
//                 existingSeason = await seasonsTable.create({
//                     UUID: generateSeasonID(),
//                     serie_UUID: exsitingSeries.UUID,
//                     season_IDX: parsedData.season,
//                     episodes: 0,
//                 });
//                 job.log('Created Season', existingSeason.UUID, existingSeason.season_IDX);
//                 crawlerSeriesSeasonsCache.invalidate(existingSeasonCacheInfo.cacheKey);
//             }

//             // let counter = seasonCountersMap.get(existingSeason.UUID);
//             // if (counter == undefined) {
//             //     seasonCountersMap.set(existingSeason.UUID, existingSeason.episodes);
//             //     // seasonCountersMap.set(existingSeason.UUID, 1);
//             //     counter = existingSeason.episodes;

//             // } else {
//             //     seasonCountersMap.set(existingSeason.UUID, counter + 1);
//             // }


//             let { data: existingEpisode, cacheInfo: existingEpisodeCacheInfo } = await crawlerEpisodesCache.execute(episodesTable, 'getOne', [{
//                 season_UUID: existingSeason.UUID,
//                 season_IDX: parsedData.season,
//                 episode_IDX: parsedData.episode,
//                 unique: true,
//             }]);
//             if (existingEpisode == undefined) {
//                 job.log('Episode Does not Exist', parsedData);
//                 existingEpisode = await episodesTable.create({
//                     UUID: generateEpisodeID(),
//                     serie_UUID: exsitingSeries.UUID,
//                     season_UUID: existingSeason.UUID,
//                     season_IDX: parsedData.season,
//                     episode_IDX: parsedData.episode,
//                 });
//                 job.log('Created Episode', existingEpisode.UUID, existingEpisode.season_UUID, existingEpisode.season_IDX, existingEpisode.episode_IDX);
//                 // seasonCountersMap.set(existingSeason.UUID, counter + 1);
//                 touchedSeasonsSet.add(existingSeason.UUID);
//                 crawlerEpisodesCache.invalidate(existingEpisodeCacheInfo.cacheKey);
//             }
//             watchableUUID = existingEpisode.UUID;

//         }

//         let existingWatchableEntity = await watchableEntitysTable.getOne({
//             watchable_UUID: watchableUUID,
//             lang: parsedData.language,
//             unique: true,
//         });
//         if (existingWatchableEntity == undefined) {
//             job.log('Watchable Entity Does not Exist', parsedData);
//             existingWatchableEntity = await watchableEntitysTable.create({
//                 UUID: generateEntityID(),
//                 watchable_UUID: watchableUUID,
//                 lang: parsedData.language,
//                 subID: 'main',
//                 filePath: file,
//                 IV: EMPTY_IV,
//                 runtime: -1,
//                 hash: '',
//             });
//         }
//     }

//     job.timeEnd('Handling Files');
//     job.log('Done Handling Files');

//     job.log(`Updating ${touchedSeasonsSet.size} Seasons`);
//     job.time('Updating Seasons');
//     for (const seasonUUID of touchedSeasonsSet) {
//         const season = await seasonsTable.getOne({ UUID: seasonUUID });
//         if (season == undefined) {
//             console.log('Season not found', seasonUUID);
//             continue;
//         }
//         const episodes = await episodesTable.get({ season_UUID: season.UUID });
//         await seasonsTable.update({ UUID: seasonUUID }, { episodes: episodes.length });
//     }
//     job.timeEnd('Updating Seasons');

//     job.setResult({
//         info: Array.from(touchedSeasonsSet)
//     })

//     job.time('Clearing Cache');
//     crawlerEpisodesCache.clear();
//     crawlerSeriesSeasonsCache.clear();
//     job.timeEnd('Clearing Cache');

//     await job.success();
// }

// Without Cache:
// Handling Files: 1:01.662 (m:ss.mmm)
//
// With Cache:
// Handling Files: 37.089s (ss.mmm)

/**
 * Crawl optimized:
 * - Prefetch DB tables into Maps
 * - Use concurrency limiter to process files in parallel
 * - Guard concurrent creates to avoid dupes
 * - Compute season episode counts locally and update seasons in one pass
 */
export async function crawl(job: Job) {

    interface SubFile {
        subID: string;
        path: string;
    }
    let files: SubFile[] = [];
    // Small LRU caches still available for other uses if desired
    const crawlerSeriesSeasonsCache = new CacheContext('crawler-series', 500);
    const crawlerEpisodesCache = new CacheContext('crawler-episodes', 150);

    const pathEntries = [getConfig().videoPath];
    job.log('Listing Files');
    let { files: localFiles } = await listFiles(pathEntries[0]);
    files = files.concat(localFiles.map(f => ({ subID: 'main', path: f })));
    job.log(`Found ${localFiles.length} local files`);


    const subSystemSockets = (await getIO().fetchSockets()).filter(s => s.data.auth.type === 'subsystem')

    const loadedSubsystems = new Set<string>();
    loadedSubsystems.add('main');

    const subSystemFilesPromise = subSystemSockets.map(s => {
        return new Promise<SubFile[]>((resolve, reject) => {
            s.emit('listFiles', (files) => {
                job.log(`Found ${files.length} subsystem files for ${s.data.auth.type === 'subsystem' ? s.data.auth.id : 'main'}`);
                loadedSubsystems.add(s.data.auth.type === 'subsystem' ? s.data.auth.id : 'main');
                resolve(files.map(f => ({ subID: s.data.auth.type === 'subsystem' ? s.data.auth.id : 'main', path: f })));
            });
            setTimeout(() => {
                reject('Timeout');
            }, 1000 * 60 * 5);
        })
    });

    const subSystemFiles = await Promise.all(subSystemFilesPromise);
    for (const subSystemFile of subSystemFiles) {
        files = files.concat(subSystemFile)
    }
    job.log(`Found ${files.length} total files`);

    const viableExtensions = ['.mp4', '.mkv', '.webm'];

    const prevLength = files.length;
    files = files.filter((f) => viableExtensions.includes(path.parse(f.path).ext));
    job.log(`Filtered ${prevLength - files.length} files`);

    job.log(`Working on ${files.length} files`);

    job.time('Handling Files');

    const touchedSeasonsSet = new Set<string>(); // season_UUID
    const seasonEpisodeCounts = new Map<string, number>(); // season_UUID -> count

    // Pre-allocated empty IV buffer reused for creations
    const EMPTY_IV = Buffer.alloc(0);

    // PREFETCH: load current DB rows into memory maps
    job.log('Prefetching existing DB rows into memory maps (series, seasons, episodes, movies, watchables)');
    const [
        prefetchedSeries,
        prefetchedSeasons,
        prefetchedEpisodes,
        prefetchedMovies,
        prefetchedWatchables
    ] = await Promise.all([
        seriesTable.get({}),
        seasonsTable.get({}),
        episodesTable.get({}),
        moviesTable.get({}),
        watchableEntitysTable.get({})
    ]);

    const seriesByTitle = new Map<string, Series & timestamped>(prefetchedSeries.map((s: any) => [s.title, s]));
    const seasonsByKey = new Map<string, Season & timestamped>(prefetchedSeasons.map((s: any) => [`${s.serie_UUID}::${s.season_IDX}`, s]));
    const episodesByKey = new Map<string, Episode & timestamped>(prefetchedEpisodes.map((e: any) => [`${e.season_UUID}::${e.episode_IDX}`, e]));
    const moviesByKey = new Map<string, Movie & timestamped>(prefetchedMovies.map((m: any) => [`${m.serie_UUID}::${m.primaryName}`, m]));
    const watchableByKey = new Map<string, WatchableEntity & timestamped>(prefetchedWatchables.map((w: any) => [`${w.watchable_UUID}::${w.lang}`, w]));

    // Guards to prevent duplicate creation in concurrent environment:
    // store promise for ongoing creation so other tasks can await
    const creatingSeries = new Map<string, Promise<Series & timestamped>>();
    const creatingSeasons = new Map<string, Promise<Season & timestamped>>();
    const creatingEpisodes = new Map<string, Promise<Episode & timestamped>>();
    const creatingMovies = new Map<string, Promise<Movie & timestamped>>();
    const creatingWatchables = new Map<string, Promise<WatchableEntity & timestamped>>();

    const allSeries = new Set<string>(prefetchedSeries.map(s => s.UUID));
    const touchedSeries = new Set<string>();
    const touchedWatchableEntitys = new Set<string>();
    const touchedEpisodes = new Set<string>();
    const touchedMovies = new Set<string>();
    const touchedSeasons = new Set<string>();

    // Utility: increment local season counter
    function incSeasonCount(seasonUUID: string) {
        seasonEpisodeCounts.set(seasonUUID, (seasonEpisodeCounts.get(seasonUUID) || 0) + 1);
    }

    // ---- Helper: get-or-create series
    async function ensureSeries(title: string, file: string): Promise<Series & timestamped> {
        const cached = seriesByTitle.get(title);
        if (cached) return cached;

        // If creation is in progress, wait
        if (creatingSeries.has(title)) {
            return creatingSeries.get(title)!;
        }

        const categorie = path.parse(path.join(path.parse(file).dir, '../../')).base;

        const p = (async () => {
            // Double-check DB if still missing (race with prefetch)
            // Use getOne to be safe with unique constraints
            const { error, data } = tryCatch(() => undefined);
            // check again via table getOne
            let existing = await seriesTable.getOne({ title, unique: true });
            if (existing) {
                seriesByTitle.set(title, existing);
                return existing;
            }
            // create
            const created = await seriesTable.create({
                UUID: generateSeriesID(),
                title,
                infos: {
                    disabled: false,
                },
                refs: {},
                tags: [categorie],
            });
            seriesByTitle.set(title, created);
            // Invalidate any cache entry if you were using external CacheContext
            // (keeps compatibility with your existing cache usage)
            try { crawlerSeriesSeasonsCache.invalidate(title); } catch (e) {/* no-op */ }
            return created;
        })();

        creatingSeries.set(title, p);
        try {
            const res = await p;
            return res;
        } finally {
            creatingSeries.delete(title);
        }
    }

    // ---- Helper: get-or-create movie
    async function ensureMovie(serieUUID: string, movieTitle: string): Promise<Movie & timestamped> {
        const key = `${serieUUID}::${movieTitle}`;
        const cached = moviesByKey.get(key);
        if (cached) return cached;
        if (creatingMovies.has(key)) return creatingMovies.get(key)!;

        const p = (async () => {
            // try DB getOne to avoid duplicates if another process created in DB
            let existing = await moviesTable.getOne({ serie_UUID: serieUUID, primaryName: movieTitle, unique: true });
            if (existing) {
                moviesByKey.set(key, existing);
                return existing;
            }
            const created = await moviesTable.create({
                UUID: generateMovieID(),
                primaryName: movieTitle,
                serie_UUID: serieUUID,
                movie_IDX: 0,
            });
            moviesByKey.set(key, created);
            return created;
        })();

        creatingMovies.set(key, p);
        try {
            const res = await p;
            return res;
        } finally {
            creatingMovies.delete(key);
        }
    }

    // ---- Helper: get-or-create season
    async function ensureSeason(serieUUID: string, seasonIdx: number): Promise<Season & timestamped> {
        const key = `${serieUUID}::${seasonIdx}`;
        const cached = seasonsByKey.get(key);
        if (cached) return cached;
        if (creatingSeasons.has(key)) return creatingSeasons.get(key)!;

        const p = (async () => {
            let existing = await seasonsTable.getOne({ serie_UUID: serieUUID, season_IDX: seasonIdx, unique: true });
            if (existing) {
                seasonsByKey.set(key, existing);
                return existing;
            }
            const created = await seasonsTable.create({
                UUID: generateSeasonID(),
                serie_UUID: serieUUID,
                season_IDX: seasonIdx,
                episodes: 0,
            });
            seasonsByKey.set(key, created);
            // Invalidate cache if using CacheContext
            try { crawlerSeriesSeasonsCache.invalidate(key); } catch (e) { }
            return created;
        })();

        creatingSeasons.set(key, p);
        try {
            const res = await p;
            return res;
        } finally {
            creatingSeasons.delete(key);
        }
    }

    // ---- Helper: get-or-create episode
    async function ensureEpisode(seasonUUID: string, seasonIdx: number, episodeIdx: number, serieUUID: string): Promise<Episode & timestamped> {
        const key = `${seasonUUID}::${episodeIdx}`;
        const cached = episodesByKey.get(key);
        if (cached) return cached;
        if (creatingEpisodes.has(key)) return creatingEpisodes.get(key)!;

        const p = (async () => {
            // Use cached DB check using episodesTable.getOne
            let existing = await episodesTable.getOne({
                season_UUID: seasonUUID,
                season_IDX: seasonIdx,
                episode_IDX: episodeIdx,
                unique: true,
            });
            if (existing) {
                episodesByKey.set(key, existing);
                return existing;
            }

            const created = await episodesTable.create({
                UUID: generateEpisodeID(),
                serie_UUID: serieUUID,
                season_UUID: seasonUUID,
                season_IDX: seasonIdx,
                episode_IDX: episodeIdx,
            });
            episodesByKey.set(key, created);

            // mark touched season + increment local counter
            touchedSeasonsSet.add(seasonUUID);
            incSeasonCount(seasonUUID);

            try { crawlerEpisodesCache.invalidate(key); } catch (e) { }
            return created;
        })();

        creatingEpisodes.set(key, p);
        try {
            const res = await p;
            return res;
        } finally {
            creatingEpisodes.delete(key);
        }
    }

    // ---- Helper: get-or-create watchable entity
    async function ensureWatchable(watchableUUID: string, serieUUID: string, lang: string, file: SubFile): Promise<WatchableEntity & timestamped> {
        const key = `${watchableUUID}::${lang}::${file.subID}`;
        const cached = watchableByKey.get(key);
        if (cached) return cached;
        if (creatingWatchables.has(key)) return creatingWatchables.get(key)!;

        const p = (async () => {
            // try DB getOne
            let existing = await watchableEntitysTable.getOne({ watchable_UUID: watchableUUID, lang: lang as Langs, unique: true });
            if (existing) {
                watchableByKey.set(key, existing);
                return existing;
            }
            const created = await watchableEntitysTable.create({
                UUID: generateEntityID(),
                serie_UUID: serieUUID,
                watchable_UUID: watchableUUID,
                lang: lang as Langs,
                subID: file.subID,
                filePath: file.path,
                runtime: -1,
                // IV: EMPTY_IV.toString('base64'),
                // hash: '',
            });
            watchableByKey.set(key, created);
            return created;
        })();

        creatingWatchables.set(key, p);
        try {
            const res = await p;
            return res;
        } finally {
            creatingWatchables.delete(key);
        }
    }

    // Concurrency limiter: small async pool. Avoid external deps.
    function asyncPool<T, R>(poolLimit: number, array: T[], iteratorFn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
        return new Promise((resolve, reject) => {
            const ret: R[] = [];
            let i = 0;
            let active = 0;
            let resolved = 0;
            const total = array.length;

            function next() {
                if (resolved >= total) {
                    return resolve(ret);
                }
                while (active < poolLimit && i < total) {
                    const currentIndex = i++;
                    active++;
                    iteratorFn(array[currentIndex], currentIndex)
                        .then((r) => {
                            ret[currentIndex] = r as unknown as R;
                        })
                        .catch((err) => {
                            // store error in result array? For now reject early
                            reject(err);
                        })
                        .finally(() => {
                            active--;
                            resolved++;
                            next();
                        });
                }
            }
            next();
        });
    }

    // The per-file worker processing function
    async function processFile(subFile: SubFile, idx: number) {
        const file = subFile.path;
        // Light logging
        if (idx % 500 === 0) job.log(`Handling File ${idx}/${files.length}`);

        const base = path.parse(file).base;
        const { error, data: parsedData } = tryCatch(() => filenameParser(file, base));
        if (error != null) {
            job.log('Error Parsing File', file, error);
            return;
        }

        // ensure series exists
        const serie = await ensureSeries(parsedData.title, file);
        touchedSeries.add(serie.UUID);

        let watchableUUID: string;

        if (parsedData.movie === true) {
            // movie branch
            const existingMovie = await ensureMovie(serie.UUID, parsedData.movieTitle!);
            touchedMovies.add(existingMovie.UUID);
            watchableUUID = existingMovie.UUID;
        } else {
            // episodic branch
            const season = await ensureSeason(serie.UUID, parsedData.season);
            const episode = await ensureEpisode(season.UUID, parsedData.season, parsedData.episode, serie.UUID);
            touchedEpisodes.add(episode.UUID);
            touchedSeasons.add(season.UUID);
            watchableUUID = episode.UUID;
        }

        // create / ensure watchable entity (file lang)
        const watchableEntity = await ensureWatchable(watchableUUID, serie.UUID, parsedData.language, subFile);
        if (watchableEntity.subID !== subFile.subID) {
            job.log('SubID mismatch', watchableEntity.subID, subFile.subID, file, { file, lang: parsedData.language, serieUUID: serie.UUID, watchableUUID });
            await watchableEntitysTable.update({ UUID: watchableEntity.UUID }, { subID: subFile.subID, filePath: subFile.path });
            watchableEntity.subID = subFile.subID;
            watchableEntity.filePath = subFile.path;
        }
        if (watchableEntity.filePath !== subFile.path) {
            job.log('FilePath mismatch', watchableEntity.filePath, subFile.path, { file, lang: parsedData.language, serieUUID: serie.UUID, watchableUUID });
            await watchableEntitysTable.update({ UUID: watchableEntity.UUID }, { filePath: subFile.path });
            watchableEntity.filePath = subFile.path;
        }
        touchedWatchableEntitys.add(watchableEntity.UUID);
    }

    // Choose concurrency based on environment; default to 20 concurrent workers
    const CONCURRENCY = 20;

    // Run the pool
    await asyncPool(CONCURRENCY, files, async (file, idx) => {
        try {
            await processFile(file, idx + 1);
        } catch (err) {
            // don't crash the entire run for one file; log and continue
            job.log('Unhandled error processing file', file, err);
        }
    });

    job.timeEnd('Handling Files');

    // ---- Update seasons episode counts in DB
    job.log(`Updating ${touchedSeasonsSet.size} Seasons`);
    job.time('Updating Seasons');

    // For each touched season, update episodes count using our local counter if present,
    // otherwise fall back to counting episodes from DB to be safe.
    // We'll update sequentially to avoid hammering DB with many simultaneous updates; it's usually small.
    for (const seasonUUID of touchedSeasonsSet) {
        const localCount = seasonEpisodeCounts.get(seasonUUID);
        if (localCount !== undefined) {
            // update to localCount OR if DB had pre-existing episodes, we should ensure correct final value
            // We'll fetch current season row once and set to localCount + existing base if necessary.
            const seasonRow = await seasonsTable.getOne({ UUID: seasonUUID, unique: true });
            if (!seasonRow) {
                job.log('Season not found when updating', seasonUUID);
                continue;
            }

            // To be conservative: recalc full episode count by counting episodes for this season in DB
            // This ensures we reflect episodes that may have existed before the scan started.
            const episodes = await episodesTable.get({ season_UUID: seasonUUID });
            const realCount = episodes.length;
            if (seasonRow.episodes !== realCount) {
                await seasonsTable.update({ UUID: seasonUUID }, { episodes: realCount });
            } else {
                // no change, skip update
            }
        } else {
            // no local count, fallback to counting DB episodes
            const seasonRow = await seasonsTable.getOne({ UUID: seasonUUID, unique: true });
            if (!seasonRow) {
                job.log('Season not found when updating (no local count)', seasonUUID);
                continue;
            }
            const episodes = await episodesTable.get({ season_UUID: seasonUUID });
            await seasonsTable.update({ UUID: seasonUUID }, { episodes: episodes.length });
        }
    }

    job.timeEnd('Updating Seasons');

    job.time('Loading all DB rows for stale check');
    const allWatchableEntitys = new Set<string>((await watchableEntitysTable.get()).map(w => w.UUID));
    const allEpisodes = new Set<string>((await episodesTable.get({})).map(e => e.UUID));
    const allMovies = new Set<string>((await moviesTable.get({})).map(m => m.UUID));
    const allSeasons = new Set<string>((await seasonsTable.get({})).map(s => s.UUID));
    job.timeEnd('Loading all DB rows for stale check');



    const staleWatchableEntitys = Array.from(allWatchableEntitys.difference(touchedWatchableEntitys));



    // console.log({
    //     stale: {
    //         staleWatchableEntitys: staleWatchableEntitys.length,
    //         staleSeasons: staleSeasons.length,
    //         staleEpisodes: staleEpisodes.length,
    //         staleMovies: staleMovies.length
    //     },
    //     touched: {
    //         touchedWatchableEntitys: touchedWatchableEntitys.size,
    //         touchedSeasons: touchedSeasons.size,
    //         touchedEpisodes: touchedEpisodes.size,
    //         touchedMovies: touchedMovies.size
    //     }
    // });
    const actualStaleWatchableEntitys = []
    if (staleWatchableEntitys.length > 0) {
        for (const UUID of staleWatchableEntitys) {
            const watchableEntity = await watchableEntitysTable.getOne({ UUID });
            if (watchableEntity == undefined) {
                job.log('WatchableEntity not found', UUID);
                continue;
            }
            if (loadedSubsystems.has(watchableEntity.subID)) {
                actualStaleWatchableEntitys.push(watchableEntity.UUID);
            } else {
                if (watchableEntity.watchable_UUID.startsWith('MO-')) {
                    touchedMovies.add(watchableEntity.watchable_UUID);
                } else if (watchableEntity.watchable_UUID.startsWith('EP-')) {
                    const episode = await episodesTable.getOne({ UUID: watchableEntity.watchable_UUID });
                    if (episode == undefined) {
                        actualStaleWatchableEntitys.push(watchableEntity.UUID);
                        job.log('Episode not found for watchableentity', watchableEntity.watchable_UUID);
                        continue;
                    }
                    touchedEpisodes.add(watchableEntity.watchable_UUID);
                    touchedSeasons.add(episode.season_UUID);
                }
            }
        }
    }
    console.log('Actual stale watchable entitys', actualStaleWatchableEntitys.length, 'of', staleWatchableEntitys.length);


    job.time('Deleting stale DB rows');

    for (const UUID of actualStaleWatchableEntitys) {
        const watchableEntity = await watchableEntitysTable.getOne({ UUID });
        if (watchableEntity == undefined) {
            job.log('WatchableEntity not found', UUID);
            continue;
        }
        await watchableEntitysTable.delete({ UUID });
    }

    const staleEpisodes = Array.from(allEpisodes.difference(touchedEpisodes));
    const staleMovies = Array.from(allMovies.difference(touchedMovies));
    const staleSeasons = Array.from(allSeasons.difference(touchedSeasons));

    if (staleEpisodes.length > 0) {
        job.log('Stale Episodes:', staleEpisodes);
        for (const UUID of staleEpisodes) {
            const episode = await episodesTable.getOne({ UUID });
            if (episode == undefined) {
                job.log('Episode not found', UUID);
                continue;
            }
            await episodesTable.delete({ UUID });
        }
    }

    if (staleMovies.length > 0) {
        job.log('Stale Movies:', staleMovies);
        for (const UUID of staleMovies) {
            const movie = await moviesTable.getOne({ UUID });
            if (movie == undefined) {
                job.log('Movie not found', UUID);
                continue;
            }
            await moviesTable.delete({ UUID });
        }
    }

    if (staleSeasons.length > 0) {
        job.log('Stale Seasons:', staleSeasons);
        for (const UUID of staleSeasons) {
            const season = await seasonsTable.getOne({ UUID });
            if (season == undefined) {
                job.log('Season not found', UUID);
                continue;
            }
            await seasonsTable.delete({ UUID });
        }
    }
    job.timeEnd('Deleting stale DB rows');


    const probablyMissingSeries = Array.from(allSeries.difference(touchedSeries));
    if (probablyMissingSeries.length > 0) {
        job.log('Probably missing series:', probablyMissingSeries);
        for (const UUID of probablyMissingSeries) {
            const serie = await seriesTable.getOne({ UUID });
            if (serie == undefined) {
                job.log('Serie not found', UUID);
                continue;
            }
            await seriesTable.update({ UUID }, { infos: { ...serie.infos, disabled: true } });
        }
    }

    job.setResult({
        probablyMissingSeries: probablyMissingSeries,
        touchedSeasons: Array.from(touchedSeasonsSet),
        actualStaleWatchableEntitys: Array.from(actualStaleWatchableEntitys),
        staleEpisodes: Array.from(staleEpisodes),
        staleMovies: Array.from(staleMovies),
        staleSeasons: Array.from(staleSeasons),
    });

    await handleSubSystemProminence(job);

    job.time('Clearing Cache');
    try { crawlerEpisodesCache.clear(); } catch (e) { }
    try { crawlerSeriesSeasonsCache.clear(); } catch (e) { }
    job.timeEnd('Clearing Cache');


    job.time('Invlaidating Cache');
    await indexStorage.clear();
    job.timeEnd('Invlaidating Cache');

    await app.request('/index/all', {
        headers: { 'auth-token': getConfig().system.PUBLIC_API_AUTH_TOKEN },
    });

    await sendSeriesReloadToAll();

    await job.success();
}

export async function handleSubSystemProminence(job: Job) {
    const watchableEntitys = await watchableEntitysTable.get();

    const map = new Map<string, Record<string, number>>();
    for (const watchableEntity of watchableEntitys) {
        const obj = {
            ...map.get(watchableEntity.serie_UUID),
            [watchableEntity.subID]: (map.get(watchableEntity.serie_UUID)?.[watchableEntity.subID] ?? 0) + 1,
        }
        map.set(watchableEntity.serie_UUID, obj);
    }

    const getProminentSub = (subMap: Record<string, number>) => {
        let prominentSub = '';
        let maxCount = 0;
        for (const [sub, count] of Object.entries(subMap)) {
            if (count > maxCount) {
                prominentSub = sub;
                maxCount = count;
            }
        }
        return prominentSub;
    }

    for (const [serieUUID, subMap] of map) {
        if (Object.keys(subMap).length > 1) {
            job.log(`Serie ${serieUUID} exists in multiple subsystems: ${JSON.stringify(subMap)}`);
            const prominentSub = getProminentSub(subMap);
            if (!prominentSub) {
                continue;
            }
            job.log(`Prominent sub: ${prominentSub}`);
            watchableEntitys.filter(x => x.serie_UUID === serieUUID && x.subID !== prominentSub).forEach(watchableEntity => {
                job.log(`Moving ${watchableEntity.UUID} from ${watchableEntity.subID} to ${prominentSub}`);
                getMovingItems().push({
                    ID: watchableEntity.UUID,
                    serie_UUID: serieUUID,
                    fromSubID: watchableEntity.subID,
                    toSubID: prominentSub,
                    watchableEntityUUID: watchableEntity.UUID,
                    meta: {
                        progress: 0,
                        movingStarted: 0,
                        result: '',
                        isAdditional: false,
                    }
                });
            });
        }
    }
}