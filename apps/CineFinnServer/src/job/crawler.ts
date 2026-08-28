import type { Episode, Langs, Movie, Season, Series, WatchableEntity } from '@cinefinn/types/models/media';
import type { timestamped } from '@cinefinn/types/shared';
import { tryCatch } from '@cinefinn/utilities/tryCatch';
import * as childProcess from 'node:child_process';
import path from 'path';
import { getConfig } from '../config.js';
import { episodesTable, moviesTable, seasonsTable, seriesTable, watchableEntitysTable } from '../database.js';
import { listFiles } from '../fileutils.js';
import { app } from '../index.js';
import { CacheContext } from '../LRUCache.js';
import { filenameParser } from '../parser.js';
import { rebroadcastMovingItems } from '../routes/admin/admin.js';
import { indexStorage, seriesUpdateStorage } from '../routes/index.js';
import { recommendationStorage } from '../routes/recommendations/recommendations.js';
import { sendSeriesReloadToAll } from '../sockets/client.socket.js';
import { getSubSocketByID } from '../sockets/subsystem.socket.js';
import { getIO } from '../utils.js';
import { generateEntityID, generateEpisodeID, generateMovieID, generateSeasonID, generateSeriesID } from '../utils/IdGenerators.js';
import { getMovingItems } from '../utils/movingItems.js';
import { Job } from './Job.js';
import pLimit from 'p-limit';

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


    const subSystemSockets = (await getIO().fetchSockets()).filter(s => s.data.auth.type === 'subsystem');

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
        });
    });

    const subSystemFiles = await Promise.all(subSystemFilesPromise);
    for (const subSystemFile of subSystemFiles) {
        files = files.concat(subSystemFile);
    }
    job.log(`Found ${files.length} total files`);

    const viableExtensions = ['.mp4', '.mkv', '.webm'];

    const prevLength = files.length;
    files = files.filter((f) => viableExtensions.includes(path.parse(f.path).ext));
    job.log(`Filtered ${prevLength - files.length} files`);

    job.log(`Working on ${files.length} files`);

    job.time('Handling Files');

    //TODO: this feels duplicated with the touchedSeasons in general ?
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
        const key = `${serieUUID}::${seasonUUID}::${seasonIdx}::${episodeIdx}`;
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
        const key = `${watchableUUID}::${lang}`;
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
        if (idx % 1000 === 0) job.log(`Handling File ${idx}/${files.length}`);

        const base = path.parse(file).base;
        const { error, data: parsedData } = tryCatch(() => filenameParser(file, base));
        if (error != null) {
            job.log('Error Parsing File', file, error);
            return;
        }

        try {
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
                job.log('FilePath mismatch', watchableEntity.filePath, subFile.path, {
                    file,
                    parsedData,
                    serieUUID: serie.UUID,
                    watchableUUID,
                    watchableEntity,
                    subFile,
                });
                await watchableEntitysTable.update({ UUID: watchableEntity.UUID }, { filePath: subFile.path });
                watchableEntity.filePath = subFile.path;
            }
            touchedWatchableEntitys.add(watchableEntity.UUID);
        } catch (error) {
            await job.log(`Error processing file ${file}`, error);
        }
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
    job.time('Computing StaleWatchableEntitys');
    const actualStaleWatchableEntitys = [];
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
    job.timeEnd('Computing StaleWatchableEntitys');
    job.log('Actual stale watchable entitys', actualStaleWatchableEntitys.length, 'of', staleWatchableEntitys.length);


    job.time('Deleting stale DB rows');

    for (const UUID of actualStaleWatchableEntitys) {
        const watchableEntity = await watchableEntitysTable.getOne({ UUID });
        if (watchableEntity == undefined) {
            job.log('WatchableEntity not found', UUID);
            continue;
        }
        await job.log(`Deleting stale watchable entity ${UUID} from file ${watchableEntity.filePath} with subID ${watchableEntity.subID} and lang ${watchableEntity.lang} and series ${watchableEntity.serie_UUID}`);
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
            await job.log(`Deleting stale episode ${UUID} from Season ${episode.season_UUID}`);
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
            await job.log(`Deleting stale movie ${UUID} from Serie ${movie.serie_UUID}`);
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
            await job.log(`Deleting stale season ${UUID} from Series ${season.serie_UUID}`);
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

    const seasonEpisodeFixes = await fixSeasons(job);

    const { sucessful: successRuntimeInsertions, failed: failedRuntimeInsertions } = await insertMissingWatchableEntityRuntimes(job);

    job.setResult({
        probablyMissingSeries: probablyMissingSeries,
        touchedSeasons: Array.from(touchedSeasonsSet),
        actualStaleWatchableEntitys: Array.from(actualStaleWatchableEntitys),
        staleEpisodes: Array.from(staleEpisodes),
        staleMovies: Array.from(staleMovies),
        staleSeasons: Array.from(staleSeasons),
        seasonEpisodeFixes,
        successRuntimeInsertions,
        failedInsertions: failedRuntimeInsertions,
    });

    await handleSubSystemProminence(job);


    job.time('Invalidating Cache');
    try { await crawlerEpisodesCache.clear(); } catch (e) {
        job.log('Error clearing crawlerEpisodesCache', e);
    }
    try { await crawlerSeriesSeasonsCache.clear(); } catch (e) {
        job.log('Error clearing crawlerSeriesSeasonsCache', e);
    }

    try { await indexStorage.clear(); } catch (e) {
        job.log('Error clearing indexStorage', e);
    }
    try { await recommendationStorage.clear(); } catch (e) {
        job.log('Error clearing recommendationStorage', e);
    }
    try { await seriesUpdateStorage.clear(); } catch (e) {
        job.log('Error clearing seriesUpdateStorage', e);
    }
    job.timeEnd('Invalidating Cache');

    await app.request('/index/all', {
        headers: { 'auth-token': getConfig().system.PUBLIC_API_AUTH_TOKEN },
    });

    await sendSeriesReloadToAll();

    await job.success();
}

export async function handleSubSystemProminence(job: Job) {
    // Clear moving items
    getMovingItems().length = 0;

    const watchableEntitys = await watchableEntitysTable.get();

    const map = new Map<string, Record<string, number>>();
    for (const watchableEntity of watchableEntitys) {
        const obj = {
            ...map.get(watchableEntity.serie_UUID),
            [watchableEntity.subID]: (map.get(watchableEntity.serie_UUID)?.[watchableEntity.subID] ?? 0) + 1,
        };
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
    };

    for (const [serieUUID, subMap] of map) {
        if (Object.keys(subMap).length > 1) {
            job.log(`Serie ${serieUUID} exists in multiple subsystems: ${JSON.stringify(subMap)}`);
            const prominentSub = getProminentSub(subMap);
            if (!prominentSub) {
                continue;
            }
            job.log(`Prominent sub: ${prominentSub}`);
            watchableEntitys.filter(x => x.serie_UUID === serieUUID && x.subID !== prominentSub).forEach(watchableEntity => {
                job.log(`Adding moving item for ${watchableEntity.UUID} from ${watchableEntity.subID} to ${prominentSub}`);
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
    await rebroadcastMovingItems();
}

export async function fixSeasons(job: Job) {
    job.time('Fixing Seasons');
    interface Fix {
        seasonUUID: string;
        expectedEpisodes: number;
        actualEpisodes: number;
    }

    const fixes = [] as Fix[];
    const seasons = await seasonsTable.get();
    for await (const season of seasons) {
        const episodes = await episodesTable.get({ season_UUID: season.UUID });
        if (episodes.length !== season.episodes) {
            job.log(`Season ${season.UUID} has ${season.episodes} episodes, but should have ${episodes.length}. Updating...`);
            await seasonsTable.update({ UUID: season.UUID }, { episodes: episodes.length });
            fixes.push({ seasonUUID: season.UUID, expectedEpisodes: episodes.length, actualEpisodes: season.episodes });
        }
    }
    job.timeEnd('Fixing Seasons');
    return fixes;
}

export async function insertMissingWatchableEntityRuntimes(job: Job) {
    job.log('Inserting Missing WatchableEntity runtimes');

    const sucessful = new Set<string>();
    const failed = new Set<string>();

    const limit = pLimit(5);

    const entitys = await watchableEntitysTable.get({ runtime: -1, unique: true });
    let i = 0;


    await Promise.all(entitys.map(entity => {
        return limit(async () => {
            job.log(`Processing entity ${++i}/${entitys.length}: ${entity.UUID} Errored: ${failed.size}`);
            if (entity.subID !== 'main' && await getSubSocketByID(entity.subID) == null) {
                job.log(`Skipping entity ${i}/${entitys.length}: ${entity.UUID} because subID ${entity.subID} is not connected`);
                failed.add(entity.UUID);
                return;
            }
            const { data: runtime, error } = await tryCatch(() => Promise.race([
                geFileRuntime(entity.UUID),
                new Promise<number>((resolve, reject) => {
                    setTimeout(() => {
                        reject('Timeout');
                        failed.add(entity.UUID);
                    }, 1000 * 60 * 1);
                })
            ]));
            if (error) {
                job.log('Error getting runtime for entity', entity.UUID, error);
                failed.add(entity.UUID);
                return;
            }
            await watchableEntitysTable.update({ UUID: entity.UUID }, { runtime });
            sucessful.add(entity.UUID);
        });
    }))

    // for await (const entity of entitys) {
    //     job.log(`Processing entity ${++i}/${entitys.length}: ${entity.UUID}`);
    //     if (entity.subID !== 'main' && await getSubSocketByID(entity.subID) == null) {
    //         job.log(`Skipping entity ${i}/${entitys.length}: ${entity.UUID} because subID ${entity.subID} is not connected`);
    //         failed.add(entity.UUID);
    //         continue;
    //     }
    //     const { data: runtime, error } = await tryCatch(() => Promise.race([
    //         geFileRuntime(entity.UUID),
    //         new Promise<number>((resolve, reject) => {
    //             setTimeout(() => {
    //                 reject('Timeout');
    //                 failed.add(entity.UUID);
    //             }, 1000 * 60 * 1);
    //         })
    //     ]));
    //     if (error) {
    //         job.log('Error getting runtime for entity', entity.UUID, error);
    //         failed.add(entity.UUID);
    //         continue;
    //     }
    //     await watchableEntitysTable.update({ UUID: entity.UUID }, { runtime });
    //     sucessful.add(entity.UUID);
    // }
    await sendSeriesReloadToAll();
    job.log('Missing WatchableEntity runtimes inserted');
    return {
        sucessful: Array.from(sucessful),
        failed: Array.from(failed),
    }
}

function geFileRuntime(watchableUUID: string) {
    return new Promise<number>((resolve, reject) => {
        const videoURL = `${getConfig().system.PUBLIC_API_ENDPOINT}/video/${watchableUUID}?auth-token=${getConfig().system.PUBLIC_API_AUTH_TOKEN}`;
        childProcess.exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoURL}"`, (error, stdout, stderr) => {
            if (error) {
                // console.log(error);
                // console.log(stderr);
                reject({ error, stderr });
                return;
            }
            const runtime = parseFloat(stdout);
            resolve(runtime);
        });
    });
}