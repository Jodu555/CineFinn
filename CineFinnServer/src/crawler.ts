import fs from 'fs';
import path from 'path';
import { listFiles } from './fileutils.js';
import { createHash, randomUUID } from 'node:crypto';
import { filenameParser } from './parser.js';
import { database, episodesTable, moviesTable, seriesTable, watchableEntitysTable, type Series } from './database.js';
import { automatedCache, invalidateCache } from './cache.js';
import { tryCatch } from './tryCatch.js';
import { CacheContext } from './LRUCache.js';

const generateID = () => {
    return randomUUID().split('-')[0];
};

const generateSeriesID = () => {
    return `S#${generateID()}`;
};

const generateSeasonID = () => {
    return `SE#${generateID()}`;
};

const generateMovieID = () => {
    return `MO#${generateID()}`;
};

const generateEpisodeID = () => {
    return `EP#${generateID()}`;
};

const generateEntityID = () => {
    return `WE#${generateID()}`;
};


export async function crawl() {
    const crawlerCache = new CacheContext('crawler', 500);
    const pathEntries = [process.env.VIDEO_PATH!];
    let { files } = await listFiles(pathEntries[0]);

    const viableExtensions = ['.mp4', '.mkv', '.webm'];

    files = files.filter((f) => viableExtensions.includes(path.parse(f).ext));

    console.time('Handling Files');

    for (const file of files) {
        const base = path.parse(file).base;
        const { error, data: parsedData } = tryCatch(() => filenameParser(file, base));

        if (error != null) {
            console.log('Error Parsing File', file, error);
            continue;
        }

        let { data: exsitingSeries, cacheInfo: existingSeriesCacheInfo } = await crawlerCache.execute(seriesTable, 'getOne', [{ title: parsedData.title, unique: true }]);
        if (exsitingSeries == undefined) {
            console.log('Series Does not Exist', parsedData.title);
            const categorie = path.parse(path.join(path.parse(file).dir, '../../')).base;
            exsitingSeries = await seriesTable.create({
                UUID: generateSeriesID(),
                title: parsedData.title,
                infos: JSON.stringify({
                    disabled: false,
                }),
                refs: JSON.stringify({

                }),
                tags: JSON.stringify([categorie]),
            });
            await invalidateCache(existingSeriesCacheInfo.cacheKey);
        }

        // console.log('Series Exists', exsitingSeries.UUID, exsitingSeries.title);

        let watchableUUID;
        if (parsedData.movie == true) {
            console.log('Movie Parse', parsedData);
            let existingMovie = await moviesTable.getOne({
                serie_UUID: exsitingSeries.UUID,
                primaryName: parsedData.movieTitle,
                unique: true,
            });
            if (existingMovie == undefined) {
                console.log('Movie Does not Exist', parsedData.movieTitle);
                existingMovie = await moviesTable.create({
                    UUID: generateMovieID(),
                    primaryName: parsedData.movieTitle!,
                    serie_UUID: exsitingSeries.UUID,
                    movie_IDX: 0,
                });
                console.log('Created Movie', existingMovie.UUID, existingMovie.primaryName);
            }
            watchableUUID = existingMovie.UUID;
        } else {

            let { data: existingEpisode, cacheInfo: existingEpisodeCacheInfo } = await crawlerCache.execute(episodesTable, 'getOne', [{
                serie_UUID: exsitingSeries.UUID,
                season_IDX: parsedData.season,
                episode_IDX: parsedData.episode,
                unique: true,
            }]);
            if (existingEpisode == undefined) {
                console.log('Episode Does not Exist', parsedData.season, parsedData.episode);
                existingEpisode = await episodesTable.create({
                    UUID: generateEpisodeID(),
                    serie_UUID: exsitingSeries.UUID,
                    season_IDX: parsedData.season,
                    episode_IDX: parsedData.episode,
                });
                console.log('Created Episode', existingEpisode.UUID, existingEpisode.serie_UUID, existingEpisode.season_IDX, existingEpisode.episode_IDX);
                await invalidateCache(existingEpisodeCacheInfo.cacheKey);
            }
            watchableUUID = existingEpisode.UUID;

        }

        let existingWatchableEntity = await watchableEntitysTable.getOne({
            watchable_UUID: watchableUUID,
            // lang: parsedData.language,
            unique: true,
        });
        if (existingWatchableEntity == undefined) {
            console.log('Watchable Entity Does not Exist', parsedData, parsedData.language);
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

    console.timeEnd('Handling Files');
    console.log('done');

    crawlerCache.clear();

}

// Without Cache:
// Handling Files: 1:01.662 (m:ss.mmm)
//
// With Cache:
// Handling Files: 37.089s (ss.mmm)