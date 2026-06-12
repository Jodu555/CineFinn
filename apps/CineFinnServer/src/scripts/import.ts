import fs from 'fs';
import crypto, { randomUUID } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();;
import axios from 'axios';
import { accountsTable, connectDatabase, episodesTable, ignoranceTable, moviesTable, seasonsTable, seriesTable, watchableEntitysTable, watchHistoryTable } from '../database.js';
import { Database, type MysqlError } from '@jodu555/mysqlapi';
import path from 'path';
import type { Series, Episode, WatchableEntity, Movie } from '@cinefinn/types/models/media';
import { generateEntityID, generateEpisodeID, generateMovieID, generateSeasonID, generateWatchHistoryID } from '../utils/IdGenerators.js';
import pLimit from 'p-limit';
import { tryCatch } from '@cinefinn/utilities/tryCatch';

interface Segment {
    ID: string;
    season: number;
    episode: number;
    movie: number;
    time: string;
}

const IMPORT_API_ENDPOINT = 'https://cinema-api.jodu555.de'
const IMPORT_API_AUTH_TOKEN = 'SECR-DEV';

async function run() {
    await connectDatabase(true);


    // console.log(await seriesTable.get({}));

    await importAccounts();
    await importIgnoreList();
    await importSerieses();
    await importWatchHistory();
}

async function importIgnoreList() {
    interface IgnoreItem {
        ID: string;
        title: string;
    }
    const response = await axios.get<IgnoreItem[]>(`${IMPORT_API_ENDPOINT}/ignorelist?auth-token=${IMPORT_API_AUTH_TOKEN}`);
    const data = response.data;
    console.log('Importing Ignore List', data.length, 'Items');

    console.time('Importing Ignore List');
    for (const item of data) {
        const existingIgnoreItem = await ignoranceTable.getOne({ serie_UUID: item.ID, unique: true });
        if (existingIgnoreItem != undefined) {
            console.log(`=> Ignorance item ${item.title} already exists, skipping`);
            continue;
        }
        await ignoranceTable.create({
            serie_UUID: item.ID,
        });
        console.log(`=> Added Ignorance Item ${item.title}`);
    }
    console.timeEnd('Importing Ignore List');
}

async function importAccountsCreationMap() {
    interface AccountCreation {
        uuid: string;
        name: string;
        date: string;
    }
    const accountsCreationMapPath = path.join(process.cwd(), 'accounts-creation-map.json');
    if (!fs.existsSync(accountsCreationMapPath)) {
        console.log('Accounts Creation Map not found, exiting looking for', accountsCreationMapPath);
        process.exit(1);
    }
    const accountsCreationMap = JSON.parse(fs.readFileSync(accountsCreationMapPath, 'utf8')) as AccountCreation[];
    accountsCreationMap.forEach(a => {
        a.name = a.name.replaceAll('\'', '');
        a.uuid = a.uuid.replaceAll('\'', '');
    })
    return accountsCreationMap;
}

async function importSerieses() {


    interface SerieEpisodeObject {
        filePath: string;
        primaryName: string;
        secondaryName: string;
        season: number;
        episode: number;
        langs: Langs[];
        subID: string;
    }
    interface SerieEpisode {
        filePath: string;
        primaryName: string;
        secondaryName: string;
        season: number;
        episode: number;
        langs: Langs[];
        subID: string;
    }
    interface SerieMovieObject {
        filePath: string;
        primaryName: string;
        secondaryName: string;
        langs: Langs[];
        subID: string;
    }
    interface SerieMovie {
        filePath: string;
        primaryName: string;
        secondaryName: string;
        langs: Langs[];
        subID: string;
    }

    interface SerieInfo {
        image?: boolean;
        imageURL?: string;
        infos?: string;
        title?: string;
        startDate?: string;
        endDate?: string;
        description?: string;
        disabled?: boolean;
    }

    interface Serie {
        ID: string;
        categorie: string;
        title: string;
        seasons: SerieEntity[][];
        movies: SerieEntity[];
        references: SerieReference;
        infos: SerieInfo;
    }

    interface SerieEntity {
        filePath: string;
        primaryName: string;
        secondaryName: string;
        season: number;
        episode: number;
        langs: Langs[];
        subID: string;
    }

    type SerieReference = Record<'aniworld' | 'zoro' | 'sto' | string, string | Record<string, string>>;

    type Langs = 'GerDub' | 'GerSub' | 'EngDub' | 'EngSub' | 'JapDub' | 'EngSubK' | 'GerSubK' | 'GerSubC' | 'EngSubC';
    const response = await axios.get<Serie[]>(`${IMPORT_API_ENDPOINT}/index/all?auth-token=${IMPORT_API_AUTH_TOKEN}`);
    const data = response.data;

    let k = 0;
    for (const serie of data) {
        k++;
        k % 15 == 0 && console.log(`=> Working.... ${k}/${data.length} series`);
        // console.log(`=> Adding ${serie.title}`);

        const existingSerie = await seriesTable.getOne({ UUID: serie.ID, unique: true });
        if (existingSerie != undefined) {
            console.log(`=> Series ${serie.title} already exists, skipping`);
        } else {
            await seriesTable.create({
                UUID: serie.ID,
                tags: [serie.categorie],
                title: serie.title,
                infos: serie.infos,
                refs: serie.references as any,
            } satisfies Series);
            console.log(`=> Added ${serie.title}`);
        }


        let s = 0;
        for (const season of serie.seasons) {
            s++;
            // const seasonIndex = season[0].season;
            const seasonIndex = s;
            const existingSeason = await seasonsTable.getOne({ serie_UUID: serie.ID, season_IDX: seasonIndex, episodes: season.length, unique: true });
            const seasonUUID = existingSeason?.UUID || generateSeasonID();
            // console.log(`=> Adding season ${serie.title} S${season.season}`);
            if (existingSeason == undefined) {
                await seasonsTable.create({
                    UUID: seasonUUID,
                    serie_UUID: serie.ID,
                    season_IDX: seasonIndex,
                    episodes: season.length,
                });
            } else {
                console.log(`=> Season ${serie.title} S${existingSeason.season_IDX} already exists, skipping`);
            }

            for (const episode of season) {
                // console.log(`=> Adding episode ${serie.title} S${episode.season}E${episode.episode}`);
                const existingEpisode = await episodesTable.getOne({
                    serie_UUID: serie.ID,
                    season_UUID: seasonUUID,
                    season_IDX: episode.season,
                    episode_IDX: episode.episode,
                    unique: true
                });
                const episodeUUID = existingEpisode?.UUID || generateEpisodeID();
                if (existingEpisode == undefined) {
                    await episodesTable.create({
                        UUID: episodeUUID,
                        serie_UUID: serie.ID,
                        season_IDX: episode.season,
                        episode_IDX: episode.episode,
                        season_UUID: seasonUUID,
                    } satisfies Episode);
                    // console.log(`=> Added episode ${serie.title} S${episode.season}E${episode.episode}`);
                } else {
                    // console.log(`=> Episode ${serie.title} S${existingEpisode.season_IDX}E${existingEpisode.episode_IDX} already exists, skipping`);
                }

                for (const lang of episode.langs) {
                    // const iv = crypto.randomBytes(16);

                    // console.log(`=> Adding watchable entity ${serie.title} S${episode.season}E${episode.episode} (${lang})`);

                    let filePath = episode.filePath;
                    if (episode.langs.length > 1) {
                        const { dir, name, ext } = path.parse(filePath);
                        filePath = path.join(dir, `${name.split('_')[0]}_${lang}${ext}`);
                    }

                    const existingWatchableEntity = await watchableEntitysTable.getOne({
                        serie_UUID: serie.ID,
                        watchable_UUID: episodeUUID,
                        unique: true,
                        lang: lang,
                        subID: episode.subID || 'main',
                        filePath: filePath,
                    });
                    if (existingWatchableEntity != undefined) {
                        console.log(`=> Watchable entity ${serie.title} S${episode.season}E${episode.episode} (${lang}) already exists, skipping`);
                        continue;
                    }
                    retryDBActionOnDuplicateKey(() => {
                        const watchableEntityUUID = generateEntityID();

                        return watchableEntitysTable.create({
                            UUID: watchableEntityUUID,
                            serie_UUID: serie.ID,
                            watchable_UUID: episodeUUID,
                            lang: lang,
                            subID: episode.subID || 'main',
                            filePath: filePath,
                            runtime: -1,
                            // IV: iv.toString('base64'),
                            // hash: '',
                        } satisfies WatchableEntity);

                    })
                    console.log(`=> Added watchable entity ${serie.title} S${episode.season}E${episode.episode} (${lang})`);
                }
            }
        }


        let i = 0;
        for (const movie of serie.movies) {
            i++;

            // console.log(`=> Adding movie ${serie.title} #${i} (${movie.primaryName})`);
            const existingMovie = await moviesTable.getOne({ serie_UUID: serie.ID, movie_IDX: i, unique: true });
            const movieUUID = existingMovie?.UUID || generateMovieID();
            if (existingMovie == undefined) {
                await moviesTable.create({
                    UUID: movieUUID,
                    serie_UUID: serie.ID,
                    movie_IDX: i,
                    primaryName: movie.primaryName || `${serie.title} #${i}`,
                } satisfies Movie);
                // console.log(`=> Added movie ${serie.title} #${i} (${movie.primaryName})`);
            } else {
                console.log(`=> Movie ${serie.title} #${movie.primaryName || i} already exists, skipping`);
            }
            for (const lang of movie.langs) {
                // const iv = crypto.randomBytes(16);

                // console.log(`=> Adding watchable entity ${serie.title} #${i} (${lang})`);

                let filePath = movie.filePath;
                if (movie.langs.length > 1) {
                    const { dir, name, ext } = path.parse(filePath);
                    filePath = path.join(dir, `${name.split('_')[0]}_${lang}${ext}`);
                }

                const existingWatchableEntity = await watchableEntitysTable.getOne({
                    serie_UUID: serie.ID,
                    watchable_UUID: movieUUID,
                    unique: true,
                    lang: lang,
                    subID: movie.subID || 'main',
                    filePath: filePath,
                });
                if (existingWatchableEntity != undefined) {
                    console.log(`=> Watchable entity ${serie.title} Movie #${i} (${lang}) already exists, skipping`);
                    continue;
                }
                const watchableEntityUUID = generateEntityID();

                await watchableEntitysTable.create({
                    UUID: watchableEntityUUID,
                    serie_UUID: serie.ID,
                    watchable_UUID: movieUUID,
                    lang: lang,
                    subID: movie.subID || 'main',
                    filePath,
                    runtime: -1,
                    // IV: iv.toString('base64'),
                    // hash: '',
                } satisfies WatchableEntity);
                // console.log(`=> Added watchable entity ${serie.title} #${i} (${lang})`);
            }
        }
    }
}

async function importAccounts() {
    const oldDB = Database.createDatabase(process.env.OLD_DB_HOST!, process.env.OLD_DB_USERNAME!, process.env.OLD_DB_PASSWORD!, process.env.OLD_DB_DATABASE!, false);
    await oldDB.connect();
    const oldAccounts = await oldDB.get('accounts').get({}) as { UUID: string; username: string; password: string; email: string; role: number; settings: string; activityDetails: string; }[];

    const accountsCreationMap = await importAccountsCreationMap();

    // if (oldAccounts.length !== accountsCreationMap.length) {
    //     console.log('Accounts count mismatch', oldAccounts.length, accountsCreationMap.length, 'Please rerun the account creation map script');
    //     process.exit(1);
    // }

    for (const account of oldAccounts) {
        if (await accountsTable.getOne({ UUID: account.UUID }) != undefined) {
            console.log(`Account ${account.username} already exists, skipping`);
            continue;
        }
        await accountsTable.create({
            UUID: account.UUID,
            username: account.username,
            password: account.password,
            email: account.email,
            role: account.role,
            emailVerifyCode: '',
            settings: JSON.parse(account.settings),
            activityDetails: JSON.parse(account.activityDetails),
            status: 'active',
        });
        console.log(`=> Added account ${account.username}`);

        const accountCreation = accountsCreationMap.find((a) => a.uuid === account.UUID);
        if (accountCreation == undefined) {
            await accountsTable.delete({ UUID: account.UUID });
            console.log('Account not found in creation map', account.UUID, account.username);
            process.exit(1);
        }
        //@ts-expect-error
        await accountsTable.update({ UUID: account.UUID }, { 'created_at': new Date(accountCreation.date).getTime() });
        console.log(`Patching Account ${account.UUID} with actual creation: ${accountCreation.date}`);
    }
}

async function importWatchHistory() {
    const oldDB = Database.createDatabase(process.env.OLD_DB_HOST!, process.env.OLD_DB_USERNAME!, process.env.OLD_DB_PASSWORD!, process.env.OLD_DB_DATABASE!);
    await oldDB.connect();
    const watchStrings = await oldDB.get('watch_strings').get({}) as { account_UUID: string; watch_string: string; }[];
    console.log(watchStrings);



    let i = 0;
    for (const watchString of watchStrings) {
        i++;
        const re = /(\w+):(?:(\d+)-(\d+)|(\d+))\.(\d+);/gim;
        const list: Segment[] = [];
        var outp: RegExpExecArray | null;
        while ((outp = re.exec(watchString.watch_string)) !== null) {
            // console.log(outp);
            let isMovie = false;
            const [og, ID, se = -1, ep = -1, movie = -1, time] = outp;
            list.push({ ID, season: Number(se), episode: Number(ep), movie: Number(movie), time: time });
        }
        console.log(watchString.account_UUID, list.length);
        let j = 0;
        const limit = pLimit(5);

        // await Promise.all(list.map(segment => {
        //     return limit(async () => {
        //         j == 0 || j % 50 == 0 || j >= list.length - 1 && console.log(`=> Working.... ${i}/${watchStrings.length} ${j}/${list.length} watchStrings`);

        //         j++;
        //         let watchableEpisodeOrMovie: Episode | Movie;
        //         if (segment.movie == -1) {
        //             const episode = await episodesTable.getOne({
        //                 serie_UUID: segment.ID,
        //                 season_IDX: segment.season,
        //                 episode_IDX: segment.episode,
        //                 unique: true,
        //             });
        //             if (episode == undefined) {
        //                 console.log('Episode not found', segment.ID, segment.season, segment.episode);
        //                 return;
        //             }
        //             watchableEpisodeOrMovie = episode;
        //         } else {
        //             const movie = await moviesTable.getOne({
        //                 serie_UUID: segment.ID,
        //                 movie_IDX: segment.movie,
        //                 unique: true,
        //             });
        //             if (movie == undefined) {
        //                 console.log('Movie not found', segment.ID, segment.movie);
        //                 return;
        //             }
        //             watchableEpisodeOrMovie = movie;
        //         }

        //         const existingWatchHistory = await watchHistoryTable.getOne({
        //             account_UUID: watchString.account_UUID,
        //             series_UUID: segment.ID,
        //             watchable_UUID: watchableEpisodeOrMovie.UUID,
        //             //watchTime: +watchable.time, This is not a good idea cause it could leed to duplication if the user has changed theyre watchtime to something
        //             unique: true
        //         })
        //         if (existingWatchHistory != undefined && existingWatchHistory.watchTime !== +segment.time) {
        //             console.log(`WatchHistory ${watchString.account_UUID} S${segment.season}E${segment.episode} M${segment.movie} (${segment.ID}) already exists, skipping`);
        //             await watchHistoryTable.update({
        //                 account_UUID: watchString.account_UUID,
        //                 series_UUID: segment.ID,
        //                 watchable_UUID: watchableEpisodeOrMovie.UUID,
        //             }, {
        //                 watchTime: +segment.time
        //             });
        //             console.log(`=> Updated watchHistory entity ${watchString.account_UUID} S${segment.season}E${segment.episode} M${segment.movie} (${segment.ID}) to ${segment.time}`);
        //             return;
        //         }

        //         await watchHistoryTable.create({
        //             UUID: generateWatchHistoryID(),
        //             account_UUID: watchString.account_UUID,
        //             series_UUID: segment.ID,
        //             watchable_UUID: watchableEpisodeOrMovie.UUID,
        //             watchTime: +segment.time,
        //         });
        //         console.log(`=> Added watchHistory entity ${watchString.account_UUID} S${segment.season}E${segment.episode} M${segment.movie} (${segment.ID})`);
        //     })
        // }));


        for (const segment of list) {
            // console.log(`=> Adding watchHistory entity ${watchString.account_UUID} S${segment.season}E${segment.episode} (${segment.ID})`);

            j == 0 || j % 50 == 0 || j >= list.length - 1 && console.log(`=> Working.... ${i}/${watchStrings.length} ${j}/${list.length} watchStrings`);

            j++;
            let watchableEpisodeOrMovie: Episode | Movie;
            if (segment.movie == -1) {
                const episode = await episodesTable.getOne({
                    serie_UUID: segment.ID,
                    season_IDX: segment.season,
                    episode_IDX: segment.episode,
                    unique: true,
                });
                if (episode == undefined) {
                    console.log('Episode not found', segment.ID, segment.season, segment.episode);
                    continue;
                }
                watchableEpisodeOrMovie = episode;
            } else {
                const movie = await moviesTable.getOne({
                    serie_UUID: segment.ID,
                    movie_IDX: segment.movie,
                    unique: true,
                });
                if (movie == undefined) {
                    console.log('Movie not found', segment.ID, segment.movie);
                    continue;
                }
                watchableEpisodeOrMovie = movie;
            }

            const existingWatchHistory = await watchHistoryTable.getOne({
                account_UUID: watchString.account_UUID,
                series_UUID: segment.ID,
                watchable_UUID: watchableEpisodeOrMovie.UUID,
                //watchTime: +watchable.time, This is not a good idea cause it could leed to duplication if the user has changed theyre watchtime to something
                unique: true
            })
            if (existingWatchHistory != undefined && existingWatchHistory.watchTime !== +segment.time) {
                console.log(`WatchHistory ${watchString.account_UUID} S${segment.season}E${segment.episode} M${segment.movie} (${segment.ID}) already exists, skipping`);
                await watchHistoryTable.update({
                    account_UUID: watchString.account_UUID,
                    series_UUID: segment.ID,
                    watchable_UUID: watchableEpisodeOrMovie.UUID,
                }, {
                    watchTime: +segment.time
                });
                console.log(`=> Updated watchHistory entity ${watchString.account_UUID} S${segment.season}E${segment.episode} M${segment.movie} (${segment.ID}) to ${segment.time}`);
                continue;
            }

            retryDBActionOnDuplicateKey(() => watchHistoryTable.create({
                UUID: generateWatchHistoryID(),
                account_UUID: watchString.account_UUID,
                series_UUID: segment.ID,
                watchable_UUID: watchableEpisodeOrMovie.UUID,
                watchTime: +segment.time,
            }));
            console.log(`=> Added watchHistory entity ${watchString.account_UUID} S${segment.season}E${segment.episode} M${segment.movie} (${segment.ID})`);
        }

    }
}

async function retryDBActionOnDuplicateKey<T>(fn: () => Promise<T>, retries = 5): Promise<T> {
    let i = 0;
    while (i < retries) {
        const { data, error } = await tryCatch.withError<MysqlError>()(() => fn());

        if (error == null) {
            return data;
        }

        if (error.code !== 'ER_DUP_ENTRY') {
            console.log('Retrying...', error.code);
            i++;
        }
    }
    throw new Error('Retries exhausted');
}

run().catch(console.error).finally(() => {
    console.log('done');
    process.exit(0);
});
