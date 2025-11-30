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
import type { Episode } from '@cinefinn/types/database';

const generateID = () => {
    return randomUUID().split('-')[0];
};

const generateSeriesID = () => {
    return `S-${generateID()}`;
};

const generateSeasonID = () => {
    return `SE-${generateID()}`;
};

const generateMovieID = () => {
    return `MO-${generateID()}`;
};

const generateEpisodeID = () => {
    return `EP-${generateID()}`;
};

const generateEntityID = () => {
    return `WE-${generateID()}`;
};


export async function crawl(jobUUID: string) {
    const job = await Job.fromDBUUID(jobUUID);

    const crawlerSeriesSeasonsCache = new CacheContext('crawler-series', 500);
    const crawlerEpisodesCache = new CacheContext('crawler-episodes', 150);

    const pathEntries = [getConfig().videoPath];
    job.log('Listing Files');
    let { files } = await listFiles(pathEntries[0]);
    job.log(`Found ${files.length} files`);

    const viableExtensions = ['.mp4', '.mkv', '.webm'];

    const prevLength = files.length;
    files = files.filter((f) => viableExtensions.includes(path.parse(f).ext));
    job.log(`Filtered ${prevLength - files.length} files`);

    job.log(`Working on ${files.length} files`);
    // jobUUID !== undefined && await jobsTable.update({ UUID: jobUUID }, { data: { files } });
    // await job.setData({ files });

    job.time('Handling Files');

    // const seasonCountersMap = new Map<string, number>();

    const touchedSeasonsSet = new Set<string>();

    let i = 0;
    for (const file of files) {
        i++;
        i % 100 == 0 && job.log(`Handling File ${i}/${files.length + 1}`);
        const base = path.parse(file).base;
        const { error, data: parsedData } = tryCatch(() => filenameParser(file, base));

        if (error != null) {
            job.log('Error Parsing File', file, error);
            continue;
        }

        let { data: exsitingSeries, cacheInfo: existingSeriesCacheInfo } = await crawlerSeriesSeasonsCache.execute(seriesTable, 'getOne', [{ title: parsedData.title, unique: true }]);
        if (exsitingSeries == undefined) {
            job.log('Series Does not Exist', parsedData.title);
            const categorie = path.parse(path.join(path.parse(file).dir, '../../')).base;
            exsitingSeries = await seriesTable.create({
                UUID: generateSeriesID(),
                title: parsedData.title,
                infos: {
                    disabled: false,
                },
                refs: {},
                tags: JSON.stringify([categorie]),
            });
            crawlerSeriesSeasonsCache.invalidate(existingSeriesCacheInfo.cacheKey);
        }

        // job.log('Series Exists', exsitingSeries.UUID, exsitingSeries.title);

        let watchableUUID;
        if (parsedData.movie == true) {
            let existingMovie = await moviesTable.getOne({
                serie_UUID: exsitingSeries.UUID,
                primaryName: parsedData.movieTitle,
                unique: true,
            });
            if (existingMovie == undefined) {
                job.log('Movie Does not Exist', parsedData.movieTitle);
                existingMovie = await moviesTable.create({
                    UUID: generateMovieID(),
                    primaryName: parsedData.movieTitle!,
                    serie_UUID: exsitingSeries.UUID,
                    movie_IDX: 0,
                });
                job.log('Created Movie', existingMovie.UUID, existingMovie.primaryName);
            }
            watchableUUID = existingMovie.UUID;
        } else {

            let { data: existingSeason, cacheInfo: existingSeasonCacheInfo } = await crawlerSeriesSeasonsCache.execute(seasonsTable, 'getOne', [{
                serie_UUID: exsitingSeries.UUID,
                season_IDX: parsedData.season,
                unique: true,
            }]);
            if (existingSeason == undefined) {
                job.log('Season Does not Exist', parsedData.season);
                existingSeason = await seasonsTable.create({
                    UUID: generateSeasonID(),
                    serie_UUID: exsitingSeries.UUID,
                    season_IDX: parsedData.season,
                    episodes: 0,
                });
                job.log('Created Season', existingSeason.UUID, existingSeason.season_IDX);
                crawlerSeriesSeasonsCache.invalidate(existingSeasonCacheInfo.cacheKey);
            }

            // let counter = seasonCountersMap.get(existingSeason.UUID);
            // if (counter == undefined) {
            //     seasonCountersMap.set(existingSeason.UUID, existingSeason.episodes);
            //     // seasonCountersMap.set(existingSeason.UUID, 1);
            //     counter = existingSeason.episodes;

            // } else {
            //     seasonCountersMap.set(existingSeason.UUID, counter + 1);
            // }


            let { data: existingEpisode, cacheInfo: existingEpisodeCacheInfo } = await crawlerEpisodesCache.execute(episodesTable, 'getOne', [{
                season_UUID: existingSeason.UUID,
                season_IDX: parsedData.season,
                episode_IDX: parsedData.episode,
                unique: true,
            }]);
            if (existingEpisode == undefined) {
                job.log('Episode Does not Exist', parsedData.season, parsedData.episode);
                existingEpisode = await episodesTable.create({
                    UUID: generateEpisodeID(),
                    serie_UUID: exsitingSeries.UUID,
                    season_UUID: existingSeason.UUID,
                    season_IDX: parsedData.season,
                    episode_IDX: parsedData.episode,
                });
                job.log('Created Episode', existingEpisode.UUID, existingEpisode.season_UUID, existingEpisode.season_IDX, existingEpisode.episode_IDX);
                // seasonCountersMap.set(existingSeason.UUID, counter + 1);
                touchedSeasonsSet.add(existingSeason.UUID);
                crawlerEpisodesCache.invalidate(existingEpisodeCacheInfo.cacheKey);
            }
            watchableUUID = existingEpisode.UUID;

        }

        let existingWatchableEntity = await watchableEntitysTable.getOne({
            watchable_UUID: watchableUUID,
            lang: parsedData.language,
            unique: true,
        });
        if (existingWatchableEntity == undefined) {
            job.log('Watchable Entity Does not Exist', parsedData, parsedData.language);
            existingWatchableEntity = await watchableEntitysTable.create({
                UUID: generateEntityID(),
                watchable_UUID: watchableUUID,
                lang: parsedData.language,
                subID: 'main',
                filePath: file,
                IV: Buffer.from([]),
                runtime: -1,
                hash: '',
            });
        }
    }

    job.timeEnd('Handling Files');
    job.log('Done Handling Files');

    job.log(`Updating ${touchedSeasonsSet.size} Seasons`);
    job.time('Updating Seasons');
    for (const seasonUUID of touchedSeasonsSet) {
        const season = await seasonsTable.getOne({ UUID: seasonUUID });
        if (season == undefined) {
            console.log('Season not found', seasonUUID);
            continue;
        }
        const episodes = await episodesTable.get({ season_UUID: season.UUID });
        await seasonsTable.update({ UUID: seasonUUID }, { episodes: episodes.length });
    }
    job.timeEnd('Updating Seasons');

    job.setResult({
        info: Array.from(touchedSeasonsSet)
    })

    job.time('Clearing Cache');
    crawlerEpisodesCache.clear();
    crawlerSeriesSeasonsCache.clear();
    job.timeEnd('Clearing Cache');

    await job.success();
}

// Without Cache:
// Handling Files: 1:01.662 (m:ss.mmm)
//
// With Cache:
// Handling Files: 37.089s (ss.mmm)