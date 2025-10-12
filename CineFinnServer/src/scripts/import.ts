import crypto, { randomUUID } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();;
import axios from 'axios';
import { connectDatabase, episodesTable, moviesTable, seasonsTable, seriesTable, watchableEntitysTable, type Episode, type Movie, type Series, type WatchableEntity } from '../database.js';
import { Database } from '@jodu555/mysqlapi';

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

async function run() {
    await connectDatabase();

    const oldDB = Database.createDatabase(process.env.OLD_DB_HOST!, process.env.OLD_DB_USERNAME!, process.env.OLD_DB_PASSWORD!, process.env.OLD_DB_DATABASE!);
    await oldDB.connect();
    const watchStrings = await oldDB.get('watch_strings').get({});
    console.log(watchStrings);

    // console.log(await seriesTable.get({}));


    // await importSerieses();
}

async function importSerieses() {
    const response = await axios.get('https://cinema-api.jodu555.de/index/all?auth-token=SECR-DEV');
    const data = response.data;

    for (const serie of data) {
        console.log(`=> Adding ${serie.title}`);
        await seriesTable.create({
            UUID: serie.ID,
            tags: JSON.stringify([serie.categorie,]),
            title: serie.title,
            infos: serie.infos,
            refs: serie.references,
        } satisfies Series);
        console.log(`=> Added ${serie.title}`);

        let s = 0;
        for (const season of serie.seasons) {
            s++;
            const seasonUUID = generateSeasonID();
            console.log(`=> Adding season ${serie.title} S${season.season}`);
            await seasonsTable.create({
                UUID: seasonUUID,
                serie_UUID: serie.ID,
                season_IDX: s,
                episodes: season.length,
            });

            for (const episode of season) {
                const episodeUUID = `E#${crypto.randomUUID().split('-')[0]}`;
                console.log(`=> Adding episode ${serie.title} S${episode.season}E${episode.episode}`);
                await episodesTable.create({
                    UUID: episodeUUID,
                    season_IDX: episode.season,
                    episode_IDX: episode.episode,
                    season_UUID: seasonUUID,
                } satisfies Episode);
                console.log(`=> Added episode ${serie.title} S${episode.season}E${episode.episode}`);

                for (const lang of episode.langs) {
                    const iv = crypto.randomBytes(16);
                    const watchableEntityUUID = `WE#${crypto.randomUUID().split('-')[0]}`;
                    console.log(`=> Adding watchable entity ${serie.title} S${episode.season}E${episode.episode} (${lang})`);
                    await watchableEntitysTable.create({
                        UUID: watchableEntityUUID,
                        watchable_UUID: episodeUUID,
                        lang: lang,
                        subID: episode.subID || 'main',
                        filePath: episode.filePath,
                        IV: iv,
                        runtime: -1,
                        hash: '',
                    } satisfies WatchableEntity);
                    console.log(`=> Added watchable entity ${serie.title} S${episode.season}E${episode.episode} (${lang})`);
                }
            }
        }


        let i = 0;
        for (const movie of serie.movies) {
            i++;
            const movieUUID = `M#${crypto.randomUUID().split('-')[0]}`;
            console.log(`=> Adding movie ${serie.title} #${i}`);
            await moviesTable.create({
                UUID: movieUUID,
                serie_UUID: serie.ID,
                movie_IDX: i,
                primaryName: movie.name || `${serie.title} #${i}`,
            } satisfies Movie);
            console.log(`=> Added movie ${serie.title} #${i}`);
            for (const lang of movie.langs) {
                const iv = crypto.randomBytes(16);
                const watchableEntityUUID = `WE#${crypto.randomUUID().split('-')[0]}`;
                console.log(`=> Adding watchable entity ${serie.title} #${i} (${lang})`);
                await watchableEntitysTable.create({
                    UUID: watchableEntityUUID,
                    watchable_UUID: movieUUID,
                    lang: lang,
                    subID: movie.subID || 'main',
                    filePath: movie.filePath,
                    IV: iv,
                    runtime: -1,
                    hash: '',
                } satisfies WatchableEntity);
                console.log(`=> Added watchable entity ${serie.title} #${i} (${lang})`);
            }
        }
    }
}

run().catch(console.error).finally(() => {
    console.log('done');
    process.exit(0);
});
