import fs from 'fs';
import crypto, { randomUUID } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();;
import axios from 'axios';
import { accountsTable, connectDatabase, episodesTable, ignoranceTable, moviesTable, seasonsTable, seriesTable, watchableEntitysTable, watchHistoryTable } from '../database.js';
import { Database } from '@jodu555/mysqlapi';
import path from 'path';
import type { Series, Episode, WatchableEntity, Movie } from '@cinefinn/types/database';
import { generateEntityID, generateEpisodeID, generateMovieID, generateSeasonID, generateWatchHistoryID } from '../utils/IdGenerators.js';

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
        await ignoranceTable.create({
            serie_UUID: item.ID,
        });
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
        console.log('Accounts Creation Map not found, exiting');
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
    const response = await axios.get(`${IMPORT_API_ENDPOINT}index/all?auth-token=${IMPORT_API_AUTH_TOKEN}`);
    const data = response.data;

    let k = 0;
    for (const serie of data) {
        k++;
        k % 15 == 0 && console.log(`=> Working.... ${k}/${data.length} series`);
        // console.log(`=> Adding ${serie.title}`);
        await seriesTable.create({
            UUID: serie.ID,
            tags: [serie.categorie],
            title: serie.title,
            infos: serie.infos,
            refs: serie.references,
        } satisfies Series);
        console.log(`=> Added ${serie.title}`);

        let s = 0;
        for (const season of serie.seasons) {
            s++;
            const seasonUUID = generateSeasonID();
            // console.log(`=> Adding season ${serie.title} S${season.season}`);
            await seasonsTable.create({
                UUID: seasonUUID,
                serie_UUID: serie.ID,
                season_IDX: s,
                episodes: season.length,
            });

            for (const episode of season) {
                const episodeUUID = generateEpisodeID();
                // console.log(`=> Adding episode ${serie.title} S${episode.season}E${episode.episode}`);
                await episodesTable.create({
                    UUID: episodeUUID,
                    serie_UUID: serie.ID,
                    season_IDX: episode.season,
                    episode_IDX: episode.episode,
                    season_UUID: seasonUUID,
                } satisfies Episode);
                // console.log(`=> Added episode ${serie.title} S${episode.season}E${episode.episode}`);

                for (const lang of episode.langs) {
                    const iv = crypto.randomBytes(16);
                    const watchableEntityUUID = generateEntityID();
                    // console.log(`=> Adding watchable entity ${serie.title} S${episode.season}E${episode.episode} (${lang})`);

                    let filePath = episode.filePath;
                    if (episode.langs.length > 1) {
                        const { dir, name, ext } = path.parse(filePath);
                        filePath = path.join(dir, `${name.split('_')[0]}_${lang}${ext}`);
                    }

                    await watchableEntitysTable.create({
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
                    // console.log(`=> Added watchable entity ${serie.title} S${episode.season}E${episode.episode} (${lang})`);
                }
            }
        }


        let i = 0;
        for (const movie of serie.movies) {
            i++;
            const movieUUID = generateMovieID();
            // console.log(`=> Adding movie ${serie.title} #${i} (${movie.primaryName})`);
            await moviesTable.create({
                UUID: movieUUID,
                serie_UUID: serie.ID,
                movie_IDX: i,
                primaryName: movie.primaryName || `${serie.title} #${i}`,
            } satisfies Movie);
            console.log(`=> Added movie ${serie.title} #${i} (${movie.primaryName})`);
            for (const lang of movie.langs) {
                // const iv = crypto.randomBytes(16);
                const watchableEntityUUID = generateEntityID();
                // console.log(`=> Adding watchable entity ${serie.title} #${i} (${lang})`);

                let filePath = movie.filePath;
                if (movie.langs.length > 1) {
                    const { dir, name, ext } = path.parse(filePath);
                    filePath = path.join(dir, `${name.split('_')[0]}_${lang}${ext}`);
                }

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
    const oldDB = Database.createDatabase(process.env.OLD_DB_HOST!, process.env.OLD_DB_USERNAME!, process.env.OLD_DB_PASSWORD!, process.env.OLD_DB_DATABASE!);
    await oldDB.connect();
    const oldAccounts = await oldDB.get('accounts').get({}) as { UUID: string; username: string; password: string; email: string; role: number; settings: string; activityDetails: string; }[];

    const accountsCreationMap = await importAccountsCreationMap();

    // if (oldAccounts.length !== accountsCreationMap.length) {
    //     console.log('Accounts count mismatch', oldAccounts.length, accountsCreationMap.length, 'Please rerun the account creation map script');
    //     process.exit(1);
    // }

    for (const account of oldAccounts) {
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
            console.log('Account not found in creation map', account.UUID);
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

    for (const watchString of watchStrings) {
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
        for (const watchable of list) {
            console.log(`=> Adding watchHistory entity ${watchString.account_UUID} S${watchable.season}E${watchable.episode} (${watchable.ID})`);

            let watchableEM: Episode | Movie;
            if (watchable.movie == -1) {
                const episode = await episodesTable.getOne({
                    serie_UUID: watchable.ID,
                    season_IDX: watchable.season,
                    episode_IDX: watchable.episode,
                    unique: true,
                });
                if (episode == undefined) {
                    console.log('Episode not found', watchable.ID, watchable.season, watchable.episode);
                    continue;
                }
                watchableEM = episode;
            } else {
                const movie = await moviesTable.getOne({
                    serie_UUID: watchable.ID,
                    movie_IDX: watchable.movie,
                    unique: true,
                });
                if (movie == undefined) {
                    console.log('Movie not found', watchable.ID, watchable.movie);
                    continue;
                }
                watchableEM = movie;
            }

            await watchHistoryTable.create({
                UUID: generateWatchHistoryID(),
                account_UUID: watchString.account_UUID,
                series_UUID: watchable.ID,
                watchable_UUID: watchableEM.UUID,
                watchTime: +watchable.time,
            });
            console.log(`=> Added watchHistory entity ${watchString.account_UUID} S${watchable.season}E${watchable.episode} M${watchable.movie} (${watchable.ID})`);
        }
    }
}

run().catch(console.error).finally(() => {
    console.log('done');
    process.exit(0);
});
