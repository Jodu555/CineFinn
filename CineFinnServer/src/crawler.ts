import fs from 'fs';
import path from 'path';
import { listFiles } from './fileutils.js';
import { createHash, randomUUID } from 'node:crypto';
import { filenameParser } from './parser.js';
import { database, episodesTable, moviesTable, seriesTable, watchableEntitysTable, type Series } from './database.js';

const generateID = () => {
    return randomUUID().split('-')[0];
};

const generateSeriesID = () => {
    return `S#${generateID()}`;
};

const generateMovieID = () => {
    return `M#${generateID()}`;
};

const generateEpisodeID = () => {
    return `E#${generateID()}`;
};

const generateEntityID = () => {
    return `WE#${generateID()}`;
};

export function tryCatch<T, E = Error>(fn: () => T) {
    type Result<TResult, EResult> =
        | { data: TResult; error: null; }
        | { data: null; error: EResult; };
    type ReturnType =
        T extends Promise<infer P> ? Promise<Result<P, E>> : Result<T, E>;

    try {
        const result = fn();
        if (result instanceof Promise) {
            return result
                .then((data: Promise<unknown>) => ({ data, error: null }))
                .catch((e: unknown) => {
                    return { data: null, error: e as E };
                }) as ReturnType;
        } else {
            return { data: result, error: null } as ReturnType;
        }
    } catch (e: unknown) {
        return { data: null, error: e as E } as ReturnType;
    }
}

export async function crawl() {
    const pathEntries = [process.env.VIDEO_PATH!];
    const { files } = await listFiles(pathEntries[0]);
    console.log(files);

    for (const file of files) {
        const base = path.parse(file).base;
        const { error, data: parsedData } = tryCatch(() => filenameParser(file, base));

        if (error != null) {
            console.log('Error Parsing File', file, error);
            continue;
        }

        let exsitingSeries = await seriesTable.getOne({
            title: parsedData.title,
            unique: true,
        });
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
            console.log('Episode Parse', parsedData);
            let existingEpisode = await episodesTable.getOne({
                serie_UUID: exsitingSeries.UUID,
                season_IDX: parsedData.season,
                episode_IDX: parsedData.episode,
                unique: true,
            });
            if (existingEpisode == undefined) {
                console.log('Episode Does not Exist', parsedData.season, parsedData.episode);
                existingEpisode = await episodesTable.create({
                    UUID: generateEpisodeID(),
                    serie_UUID: exsitingSeries.UUID,
                    season_IDX: parsedData.season,
                    episode_IDX: parsedData.episode,
                });
                console.log('Created Episode', existingEpisode.UUID, existingEpisode.serie_UUID, existingEpisode.season_IDX, existingEpisode.episode_IDX);
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

}