import dotenv from 'dotenv';
dotenv.config();;
import { Database, type thingDatabase } from '@jodu555/mysqlapi';


export let database: Database;

export interface Series {
    UUID: string;
    tags: string;
    title: string;
    infos: string;
    refs: string;
}

interface Episode {
    UUID: string;
    serie_UUID: string;
    season_IDX: number;
    episode_IDX: number;
}

interface Movie {
    UUID: string;
    primaryName: string;
    serie_UUID: string;
    movie_IDX: number;
}

interface WatchableEntity {
    UUID: string;
    watchable_UUID: string;
    lang: string;
    subID: string;
    filePath: string;
    IV: Buffer;
    runtime: number;
    hash: string;
}

export let seriesTable: thingDatabase<Series>;
export let episodesTable: thingDatabase<Episode>;
export let moviesTable: thingDatabase<Movie>;
export let watchableEntitysTable: thingDatabase<WatchableEntity>;

export async function connectDatabase() {
    database = Database.createDatabase(process.env.DB_HOST!, process.env.DB_USERNAME!, process.env.DB_PASSWORD!, process.env.DB_DATABASE!);
    await database.connect();
    await createTables();
}

async function createTables() {
    database.createTable('series', {
        options: {
            timestamps: true,
            PK: 'UUID',
        },
        UUID: {
            type: 'varchar(64)',
            null: false,
        },
        tags: {
            type: 'text',
            null: false,
        },
        title: {
            type: 'varchar(256)',
            null: false,
        },
        infos: {
            type: 'text',
            null: false,
        },
        refs: {
            type: 'text',
            null: true,
        },
    });
    database.createTable('episodes', {
        options: {
            timestamps: true,
            PK: 'UUID',
            // FK: {
            //     serie_UUID: 'series/UUID',
            // },
        },
        UUID: {
            type: 'varchar(64)',
            null: false,
        },
        serie_UUID: {
            type: 'varchar(64)',
            null: false,
        },
        season_IDX: {
            type: 'int',
            null: false,
        },
        episode_IDX: {
            type: 'int',
            null: false,
        },
    });
    database.createTable('movies', {
        options: {
            timestamps: true,
            PK: 'UUID',
            // FK: {
            //     serie_UUID: 'series/UUID',
            // },
        },
        UUID: {
            type: 'varchar(64)',
            null: false,
        },
        primaryName: {
            type: 'varchar(256)',
            null: false,
        },
        serie_UUID: {
            type: 'varchar(64)',
            null: false,
        },
        movie_IDX: {
            type: 'int',
            null: false,
        },
    });
    database.createTable('watchableEntitys', {
        options: {
            timestamps: true,
            PK: 'UUID',
            // FK: {
            //     serie_UUID: 'series/UUID',
            // },
        },
        UUID: {
            type: 'varchar(64)',
            null: false,
        },
        watchable_UUID: {
            type: 'varchar(64)',
            null: false,
        },
        lang: {
            type: 'varchar(32)',
            null: false,
        },
        subID: {
            type: 'varchar(64)',
            null: false,
            default: 'main',
        },
        filePath: {
            type: 'text',
            null: false,
        },
        IV: {
            type: 'BLOB',
            null: true,
        },
        runtime: {
            type: 'int',
            null: false,
        },
        hash: {
            type: 'varchar(128)',
            null: false,
        }
    });

    seriesTable = database.get<Series>('series');
    episodesTable = database.get<Episode>('episodes');
    moviesTable = database.get<Movie>('movies');
    watchableEntitysTable = database.get<WatchableEntity>('watchableEntitys');

}

// async function run() {
//     await createTables();

//     const response = await axios.get('https://cinema-api.jodu555.de/index/all?auth-token=SECR-DEV');
//     const data = response.data;

//     // console.log(seriesTable);

//     // return;
//     for (const serie of data) {
//         console.log(`=> Adding ${serie.title}`);
//         await seriesTable.create({
//             UUID: serie.ID,
//             tags: JSON.stringify([serie.categorie,]),
//             title: serie.title,
//             infos: JSON.stringify(serie.infos),
//             refs: JSON.stringify(serie.references),
//         } satisfies Series);
//         console.log(`=> Added ${serie.title}`);

//         for (const episode of serie.seasons.flat()) {
//             const episodeUUID = `E#${crypto.randomUUID().split('-')[0]}`;
//             console.log(`=> Adding episode ${serie.title} S${episode.season}E${episode.episode}`);
//             await episodesTable.create({
//                 UUID: episodeUUID,
//                 serie_UUID: serie.ID,
//                 season_IDX: episode.season,
//                 episode_IDX: episode.episode,
//             } satisfies Episode);
//             console.log(`=> Added episode ${serie.title} S${episode.season}E${episode.episode}`);

//             for (const lang of episode.langs) {
//                 const iv = crypto.randomBytes(16);
//                 const watchableEntityUUID = `WE#${crypto.randomUUID().split('-')[0]}`;
//                 console.log(`=> Adding watchable entity ${serie.title} S${episode.season}E${episode.episode} (${lang})`);
//                 await watchableEntitysTable.create({
//                     UUID: watchableEntityUUID,
//                     watchable_UUID: episodeUUID,
//                     lang: lang,
//                     subID: episode.subID || 'main',
//                     filePath: episode.filePath,
//                     IV: iv,
//                     runtime: -1,
//                 } satisfies WatchableEntity);
//                 console.log(`=> Added watchable entity ${serie.title} S${episode.season}E${episode.episode} (${lang})`);
//             }
//         }

//         let i = 0;
//         for (const movie of serie.movies) {
//             i++;
//             const movieUUID = `M#${crypto.randomUUID().split('-')[0]}`;
//             console.log(`=> Adding movie ${serie.title} #${i}`);
//             await moviesTable.create({
//                 UUID: movieUUID,
//                 serie_UUID: serie.ID,
//                 movie_IDX: i,
//             } satisfies Movie);
//             console.log(`=> Added movie ${serie.title} #${i}`);
//             for (const lang of movie.langs) {
//                 const iv = crypto.randomBytes(16);
//                 const watchableEntityUUID = `WE#${crypto.randomUUID().split('-')[0]}`;
//                 console.log(`=> Adding watchable entity ${serie.title} #${i} (${lang})`);
//                 await watchableEntitysTable.create({
//                     UUID: watchableEntityUUID,
//                     watchable_UUID: movieUUID,
//                     lang: lang,
//                     subID: movie.subID || 'main',
//                     filePath: movie.filePath,
//                     IV: iv,
//                     runtime: -1,
//                 } satisfies WatchableEntity);
//                 console.log(`=> Added watchable entity ${serie.title} #${i} (${lang})`);
//             }
//         }
//     }

// }

// run().catch(console.error).finally(() => {
//     console.log('done');
//     process.exit(0);
// });
