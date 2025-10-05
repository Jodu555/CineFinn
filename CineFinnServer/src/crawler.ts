import fs from 'fs';
import path from 'path';
import { listFiles } from './fileutils.js';
import { createHash, randomUUID } from 'node:crypto';
import { filenameParser } from './parser.js';
import { database, episodesTable, moviesTable, seasonsTable, seriesTable, watchableEntitysTable, type Series } from './database.js';
import { tryCatch } from './tryCatch.js';
import { CacheContext } from './LRUCache.js';

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


export async function crawl() {
    const crawlerSeriesSeasonsCache = new CacheContext('crawler-series', 500);

    const crawlerEpisodesCache = new CacheContext('crawler-episodes', 150);

    const pathEntries = [process.env.VIDEO_PATH!];
    let { files } = await listFiles(pathEntries[0]);

    const viableExtensions = ['.mp4', '.mkv', '.webm'];

    files = files.filter((f) => viableExtensions.includes(path.parse(f).ext));

    console.time('Handling Files');

    const seasonCountersMap = new Map<string, number>();

    for (const file of files) {
        const base = path.parse(file).base;
        const { error, data: parsedData } = tryCatch(() => filenameParser(file, base));

        if (error != null) {
            console.log('Error Parsing File', file, error);
            continue;
        }

        let { data: exsitingSeries, cacheInfo: existingSeriesCacheInfo } = await crawlerSeriesSeasonsCache.execute(seriesTable, 'getOne', [{ title: parsedData.title, unique: true }]);
        if (exsitingSeries == undefined) {
            console.log('Series Does not Exist', parsedData.title);
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

            let { data: existingSeason, cacheInfo: existingSeasonCacheInfo } = await crawlerSeriesSeasonsCache.execute(seasonsTable, 'getOne', [{
                serie_UUID: exsitingSeries.UUID,
                season_IDX: parsedData.season,
                unique: true,
            }]);
            if (existingSeason == undefined) {
                console.log('Season Does not Exist', parsedData.season);
                existingSeason = await seasonsTable.create({
                    UUID: generateSeasonID(),
                    serie_UUID: exsitingSeries.UUID,
                    season_IDX: parsedData.season,
                    episodes: 0,
                });
                console.log('Created Season', existingSeason.UUID, existingSeason.season_IDX);
                crawlerSeriesSeasonsCache.invalidate(existingSeasonCacheInfo.cacheKey);
            }

            const counter = seasonCountersMap.get(existingSeason.UUID);
            if (counter == undefined) {
                seasonCountersMap.set(existingSeason.UUID, existingSeason.episodes + 1);
            } else {
                seasonCountersMap.set(existingSeason.UUID, counter + 1);
            }


            let { data: existingEpisode, cacheInfo: existingEpisodeCacheInfo } = await crawlerEpisodesCache.execute(episodesTable, 'getOne', [{
                season_UUID: existingSeason.UUID,
                season_IDX: parsedData.season,
                episode_IDX: parsedData.episode,
                unique: true,
            }]);
            if (existingEpisode == undefined) {
                console.log('Episode Does not Exist', parsedData.season, parsedData.episode);
                existingEpisode = await episodesTable.create({
                    UUID: generateEpisodeID(),
                    season_UUID: existingSeason.UUID,
                    season_IDX: parsedData.season,
                    episode_IDX: parsedData.episode,
                });
                console.log('Created Episode', existingEpisode.UUID, existingEpisode.season_UUID, existingEpisode.season_IDX, existingEpisode.episode_IDX);
                await crawlerEpisodesCache.invalidate(existingEpisodeCacheInfo.cacheKey);
            }
            watchableUUID = existingEpisode.UUID;

        }

        let existingWatchableEntity = await watchableEntitysTable.getOne({
            watchable_UUID: watchableUUID,
            lang: parsedData.language,
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

    for (const [key, value] of seasonCountersMap) {
        await seasonsTable.update({
            UUID: key,
        }, {
            episodes: value,
        });
    }


    console.log(seasonCountersMap);


    crawlerEpisodesCache.clear();
    crawlerSeriesSeasonsCache.clear();

}

// Without Cache:
// Handling Files: 1:01.662 (m:ss.mmm)
//
// With Cache:
// Handling Files: 37.089s (ss.mmm)