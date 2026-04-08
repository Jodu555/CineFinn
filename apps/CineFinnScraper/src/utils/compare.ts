import type { DetailedEpisode, DetailedMovie, DetailedSeries, Langs, SeriesRefs } from '@cinefinn/types/models/media';
import type { ExtendedEpisodeDownload, IgnoranceItem } from '@cinefinn/types/shared';
import type { AniWorldEntity, AniWorldSeriesInformations, ExtendedZoroEpisode } from '@cinefinn/types/scrapers';
import * as fs from 'fs';
import Aniworld from '../class/Aniworld.js';
import promiseLimit from 'promise-limit';
import sanitizeFilename from 'sanitize-filename';
import { io } from '../index.js';
import type { Socket } from 'socket.io-client';


function sanitizeFileName(str: string): string {
    str = sanitizeForWindows(str);
    return sanitizeFilename(str, { replacement: ' ' }).replace(/  +/g, ' ');
}

function sanitizeForWindows(str: string): string {
    return str.replaceAll(/[:<>"/\\|?*]+/g, '');
}

export interface AniWorldSerieCompare extends AniWorldSeriesInformations {
    UUID: string;
    title: string;
    references: SeriesRefs;
}

interface ZoroSerieCompare {
    UUID: string;
    title: string;
    references: SeriesRefs;
    seasons: ChangedZoroEpisode[][];
    movies: ExtendedZoroEpisode[];
}

export interface ChangedZoroEpisode extends Omit<ExtendedZoroEpisode, 'langs'> {
    langs: Langs[];
}

interface CheckProvider {
    sto: boolean;
    aniworld: boolean;
    zoro: boolean;
}

async function compareForNewReleases(series: DetailedSeries[], ignoranceList: IgnoranceItem[], providerCheck: CheckProvider) {
    const output: ExtendedEpisodeDownload[] = [];

    let sto: ExtendedEpisodeDownload[] = [];
    let aniworld: ExtendedEpisodeDownload[] = [];
    let zoro: ExtendedEpisodeDownload[] = [];

    if (providerCheck.sto) {
        sto = await compareForNewReleasesProvider('STO', 'dlListSTO.json', async () => await compareForNewReleasesAniWorldOrSTO(series, ignoranceList, 'sto'));
    }

    if (providerCheck.aniworld) {
        aniworld = await compareForNewReleasesProvider('Aniworld', 'dlListAniworld.json', async () => await compareForNewReleasesAniWorldOrSTO(series, ignoranceList, 'aniworld'));
    }

    if (providerCheck.zoro) {
        // zoro = await compareForNewReleasesProvider('Zoro', 'dlListZoro.json', async () => await compareForNewReleasesZoro(series, ignoranceList));
    }

    return {
        aniworld,
        zoro,
        sto,
    };
}

async function compareForNewReleasesProvider(name: string, filename: string, compareFunction: () => Promise<ExtendedEpisodeDownload[]>) {
    let output: ExtendedEpisodeDownload[] = [];
    let stats: fs.Stats | null = null;
    try {
        stats = fs.statSync(filename + '----------');
    } catch (error) {
        stats = null;
    }
    const lastAlteredFileMin = (Date.now() - (stats?.mtimeMs || 0)) / 1000 / 60;
    if (stats != null && lastAlteredFileMin < 50) {
        //Use the previous list maybe the user re ran cause there was an error
        console.log(`------ Compare ${name} ------`);
        console.log('A Previous run from', lastAlteredFileMin, 'minutes ago was found!');
        output = JSON.parse(fs.readFileSync(filename, 'utf-8'));
        console.log(`------ Compare ${name} ------`);
        fs.writeFileSync(filename, JSON.stringify(output, null, 3));
    } else {
        //LETS CHECK IT
        console.log(`------ Compare ${name} ------`);
        output = await compareFunction();
        console.log(`------ Compare ${name} ------`);
        fs.writeFileSync(filename, JSON.stringify(output, null, 3));
    }
    return output;
}

function splitArrayIntoNChunks<T>(array: T[], n: number): T[][] {
    const result: T[][] = [];
    const chunkSize = Math.ceil(array.length / n);
    for (let i = 0; i < array.length; i += chunkSize) {
        const chunk = array.slice(i, i + chunkSize);
        result.push(chunk);
    }
    return result;
}

async function compareForNewReleasesAniWorldOrSTO(
    series: DetailedSeries[],
    ignoranceList: IgnoranceItem[],
    refKey: 'aniworld' | 'sto',
    inherit: boolean = true
): Promise<ExtendedEpisodeDownload[]> {

    const debug = false;
    const limit = promiseLimit<AniWorldSerieCompare>(10);
    const data = series.filter((x) => {
        //Has to be either Aniworld or STO
        if (x.refs[refKey] == undefined || x.refs[refKey] == '') {
            return false;
        }

        const ignoranceItem = ignoranceList.find((v) => v.serie_UUID == x.UUID);
        //The IgnoranceItem Has to exist
        if (ignoranceItem == undefined) return true;
        //If the Lang does not exist kill the complete Series
        if (ignoranceItem.lang == undefined) return false;
        return true;
    });

    const sockets = await io.fetchSockets();

    // +1 For the main thread
    const chunks = splitArrayIntoNChunks(data, sockets.length + 1);

    const localChunk = chunks.shift() || [];

    // Start socket processing immediately
    const socketPromises = chunks.map((chunk, idx) => {
        return new Promise<AniWorldSerieCompare[]>((resolve, reject) => {
            const socket = sockets[idx % sockets.length];

            // Set up timeout to prevent blocking indefinitely
            const timeout = setTimeout(() => {
                (socket as any as Socket).off('scrapeChunkResult', scrapeResultFn);
                reject(new Error(`Socket ${idx} timed out after 5 minutes`));
            }, 5 * 60 * 1000); // 5 minute should be more than enough

            const scrapeResultFn = (compares: AniWorldSerieCompare[]) => {
                clearTimeout(timeout);
                (socket as any as Socket).off('scrapeChunkResult', scrapeResultFn);
                resolve(compares);
            };

            (socket as any as Socket).on('scrapeChunkResult', scrapeResultFn);

            console.log('Sent', chunk.length, 'Series to socket', idx, socket.id);

            socket.emit('scrapeChunk', chunk, refKey, (success: boolean) => {
                if (debug) {
                    console.log(`Socket ${idx} acknowledged chunk:`, data);
                }
                if (!success) {
                    console.log('Socket', idx, 'did not send all data');
                    reject(new Error('Socket did not send all data'));
                }
            });
        });
    });

    // Process local chunk in parallel while the sockets crunch themselve
    const localComparePromise = Promise.all(
        localChunk.map(async (serie) => {
            return limit(() => {
                return new Promise<AniWorldSerieCompare>(async (resolve, reject) => {
                    try {
                        const ref = serie.refs[refKey];
                        if (typeof ref !== 'string' || ref == '') {
                            return resolve(null as any);
                        }

                        const world = new Aniworld(ref);
                        const out = await world.parseInformations();

                        if (out == undefined) {
                            console.log('Error parsing Aniworld', serie.refs.aniworld);
                            return resolve(null as any);
                        }

                        resolve({
                            UUID: serie.UUID,
                            title: serie.title,
                            references: serie.refs,
                            ...out,
                        });
                    } catch (error) {
                        console.error('Error processing serie:', serie.UUID, error);
                        reject(error);
                    }
                });
            });
        })
    );

    // Wait for both local crunching AND all socket workers to complete their work
    const [localCompare, ...socketCompares] = await Promise.all([
        localComparePromise,
        ...socketPromises
    ]);

    const compare = [
        ...localCompare,
        ...socketCompares.flat()
    ].filter(Boolean) as AniWorldSerieCompare[];

    console.log(compare.length, 'Series compared from', data.length, 'Series');

    const outputDlList: ExtendedEpisodeDownload[] = [];

    /**
     * Loop through the aniworld series
     * check if the season amount is equal ?
     * if it is:
     * 	check if the episode amount is equal ?
     * 	if it is:
     *   check if there is a gerDub out which isnt on the server
     * 	 if, then add it to the list
     *  if it is not:
     * 	 Use the usual method to add to the list:
     * 	 if GerDub take it, if not just GerSub
     *
     * if it is not:
     *  just proceed with the usual method
     *
     */

    //TODO: the system currently only checks if the gerdub is relased, but when we initially have the engsub and the gersub is released, the system does not care

    const addtoOutputList = (title: string, reference: string, season: number, episode: number, lang: Langs) => {
        outputDlList.push({
            _animeFolder: title,
            finished: false,
            folder: 'Season ' + season,
            file: `${title} St.${season} Flg.${episode}_${lang}`,
            url: `${reference}/staffel-${season}/episode-${episode}`,
            m3u8: '',
        });
    };
    const addtoOutputListMovie = (title: string, reference: string, movieTitle: string, movieIdx: number, lang: Langs) => {
        outputDlList.push({
            _animeFolder: title,
            finished: false,
            folder: 'Movies',
            file: `${movieTitle}_${lang}`,
            url: `${reference}/filme/film-${movieIdx}`,
            m3u8: '',
        });
    };

    interface Indices {
        aniworldSeasonIDX?: number;
        aniworldEpisodeIDX?: number;
        aniworldMovieIDX?: number;
    }


    type OutputListMeta = {
        serieTitle: string;
        serieReferenceAniworld: string;
    } & (OutputListMetaEpisode | OutputListMetaMovie);

    interface OutputListMetaEpisode {
        type: 'episode';
        seasonIDX: number;
        episodeIDX: number;
    }

    interface OutputListMetaMovie {
        type: 'movie';
        movieTitle: string;
        movieIDX: number;
    }

    const handle = (entity: AniWorldEntity, ignoranceItem: IgnoranceItem, outputListMeta: OutputListMeta, localEntity?: DetailedEpisode | DetailedMovie) => {

        let language: Langs | undefined = undefined;
        if (localEntity == undefined) {
            const lang = entity.langs.find((e) => {
                return ['GerDub', 'GerSub', 'EngSub', 'EngDub'].find((x) => x.includes(e));
            });
            if (lang == undefined) return;
            language = lang;
        }
        if (localEntity) {
            const localLangs = localEntity.watchableEntitys.map(x => x.lang);
            let lang: Langs | undefined = undefined;
            switch (true) {
                case entity.langs.includes('GerDub') && !localLangs.includes('GerDub'):
                    lang = 'GerDub';
                    break;
                case entity.langs.includes('GerSub') && !localLangs.includes('GerDub') && !localLangs.includes('GerSub'):
                    lang = 'GerSub';
                    break;
                case entity.langs.includes('EngDub') && !localLangs.includes('EngDub') && !localLangs.includes('GerDub') && !localLangs.includes('GerSub'):
                    lang = 'EngDub';
                    break;
                case entity.langs.includes('EngSub') && !localLangs.includes('EngDub') && !localLangs.includes('EngSub') && !localLangs.includes('GerDub') && !localLangs.includes('GerSub'):
                    lang = 'EngSub';
                    break;
            }
            if (lang == undefined) return;
            language = lang;
        }
        /**
         * Check ignoranceObject
         * if localEpisode exists start language decision
         * if not start language decision
         */


        if (language == undefined) {
            return;
        }

        if (ignoranceItem.lang == language) {
            console.trace(entity, ignoranceItem.lang, language, ignoranceItem.lang == language, 'IGNORED');
            return;
        }

        if (outputListMeta.type === 'episode') {
            addtoOutputList(outputListMeta.serieTitle, outputListMeta.serieReferenceAniworld as string, outputListMeta.seasonIDX, outputListMeta.episodeIDX, language);
        }
        if (outputListMeta.type === 'movie') {
            addtoOutputListMovie(outputListMeta.serieTitle, outputListMeta.serieReferenceAniworld as string, outputListMeta.movieTitle, outputListMeta.movieIDX, language);
        }


    };


    for (const aniworldSerie of compare) {
        const localSerie = series.find((e) => e.UUID == aniworldSerie.UUID);
        if (localSerie == undefined) {
            console.log('Serie not found. WTF????', aniworldSerie.UUID);
            continue;
        }
        const ignoranceItem = ignoranceList.find((x) => x.serie_UUID == aniworldSerie.UUID) || ({} as IgnoranceItem);

        for (const _aniworldSeasonIDX in aniworldSerie.seasons) {
            const aniworldSeasonIDX = Number(_aniworldSeasonIDX);
            const aniworldSeason = aniworldSerie.seasons[aniworldSeasonIDX];
            const localSeason = localSerie.seasons.find((x) => x.season_IDX == aniworldSeasonIDX + 1);
            if (localSeason == undefined) {
                console.log('Missing Season!');
                for (const episode of aniworldSeason) {
                    handle(episode, ignoranceItem, {
                        type: 'episode',
                        serieTitle: localSerie.title,
                        serieReferenceAniworld: localSerie.refs.aniworld as string,
                        seasonIDX: aniworldSeasonIDX + 1,
                        episodeIDX: Number(aniworldSeason.indexOf(episode)) + 1,
                    });
                }
                continue;
            }
            for (const _aniworldEpisodeIDX in aniworldSeason) {
                const aniworldEpisodeIDX = Number(_aniworldEpisodeIDX);
                const aniworldEpisode = aniworldSeason[aniworldEpisodeIDX];
                const localEpisode = localSeason.episodes.find((x) => x.episode_IDX == aniworldEpisodeIDX + 1);
                handle(aniworldEpisode, ignoranceItem, {
                    type: 'episode',
                    serieTitle: localSerie.title,
                    serieReferenceAniworld: localSerie.refs.aniworld as string,
                    seasonIDX: aniworldSeasonIDX + 1,
                    episodeIDX: Number(_aniworldEpisodeIDX) + 1,
                }, localEpisode);
            }
        }

        if (!aniworldSerie.hasMovies) {
            continue;
        }

        for (const _aniworldMovieIDX in aniworldSerie.movies) {
            const aniworldMovieIDX = Number(_aniworldMovieIDX);
            const aniworldMovie = aniworldSerie.movies[aniworldMovieIDX];
            // const localMovie = localSerie.movies.find((x) => x.movie_IDX == aniworldMovieIDX + 1);
            const localMovie = localSerie.movies.find((lm) => {
                //Movie title has to be similar and the release date should be the same

                const sanLocMainName = sanitizeFileName(lm.primaryName.toLowerCase());

                const sanRemMainName = sanitizeFileName(aniworldMovie.mainName.toLowerCase());
                const sanRemSecoName = sanitizeFileName(aniworldMovie.secondName.toLowerCase());

                const lst = Math.min(
                    computeLevenshteinDistance(sanLocMainName, sanRemMainName),
                    computeLevenshteinDistance(sanLocMainName, sanRemSecoName)
                )
                // console.log({ local: sanLocMainName, remoteM: sanRemMainName, remoteS: sanRemSecoName }, lst)
                return lst < 4;
            });
            // if (localMovie == undefined) {
            //     console.log('Missing Movie!');
            //     handle(aniworldMovie, ignoranceItem, {
            //         type: 'movie',
            //         serieTitle: localSerie.title,
            //         serieReferenceAniworld: localSerie.refs.aniworld as string,
            //         movieTitle: aniworldMovie.mainName,
            //         movieIDX: aniworldMovieIDX + 1,
            //     });
            //     continue;
            // }
            handle(aniworldMovie, ignoranceItem, {
                type: 'movie',
                serieTitle: localSerie.title,
                serieReferenceAniworld: localSerie.refs.aniworld as string,
                movieTitle: aniworldMovie.mainName || aniworldMovie.secondName,
                movieIDX: aniworldMovieIDX + 1,
            }, localMovie);
        }
    }

    console.log(outputDlList.length);
    if (inherit) {
        return outputDlList;
    } else {
        fs.writeFileSync('dlList.json', JSON.stringify(outputDlList, null, 3));
        return [];
    }
}

// Computes the Levenshtein distance between two strings and returns a similarity score between 0 and 1
function computeLevenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    const m = a.length;
    const n = b.length;
    let i = 0;
    let j = 0;
    for (i = 0; i <= m; i++) {
        matrix[i] = [i];
    }
    for (j = 0; j <= n; j++) {
        matrix[0][j] = j;
    }
    for (i = 1; i <= m; i++) {
        for (j = 1; j <= n; j++) {
            if (b.charAt(j - 1) === a.charAt(i - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[m][n];
}

export {
    compareForNewReleases,
    compareForNewReleasesAniWorldOrSTO,
};