import dotenv from 'dotenv';
dotenv.config();;
import { Database, type thingDatabase } from '@jodu555/mysqlapi';

interface timestamped {
    createdAt: number;
    updatedAt: number;
}

export let database: Database;

export interface Account {
    UUID: string;
    username: string;
    password?: string;
    email: string;
    role: number;
    settings: Record<string, string>;
    activityDetails: {
        lastHandshake: string;
        lastLogin: string;
    };
    status: 'active' | 'suspended' | 'deleted' | 'trial';
}

export interface AuthToken {
    TOKEN: string;
    account_UUID: string;
}

export interface Series {
    UUID: string;
    tags: string;
    title: string;
    infos: SeriesInfos;
    refs: SeriesRefs;
}

export type SeriesRefs = Record<'aniworld' | 'zoro' | 'sto' | string, string | Record<string, string>>;

export interface SeriesInfos {
    image?: boolean;
    imageURL?: string;
    infos?: string;
    title?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    disabled?: boolean;
}

export interface Season {
    UUID: string;
    serie_UUID: string;
    season_IDX: number;
    episodes: number;
}

export interface Episode {
    UUID: string;
    season_UUID: string;
    season_IDX: number;
    episode_IDX: number;
}

export interface Movie {
    UUID: string;
    primaryName: string;
    serie_UUID: string;
    movie_IDX: number;
}

export interface WatchableEntity {
    UUID: string;
    watchable_UUID: string;
    lang: string;
    subID: string;
    filePath: string;
    IV: Buffer;
    runtime: number;
    hash: string;
}

export interface WatchHistory {
    UUID: string;
    account_UUID: string;
    watchable_UUID: string;
    watchTime: number;
}

export interface SyncRoom {
    UUID: string;
    series_UUID: string;
    watchableEntity_UUID: string;
    members: SyncRoomMember[];
}

interface SyncRoomMember {
    UUID: string;
    username: string;
    role: number;
}

export type JobType = 'crawl' | 'generatePreviewImages' | 'checkForUpdates-smart' | 'checkForUpdates-old';

interface Job {
    UUID: string;
    type: JobType;
    failed_at: number;
    finished_at: number;
    data: any;
    result: any;
}


export let accountsTable: thingDatabase<Account, Account & timestamped>;
export let authTokensTable: thingDatabase<AuthToken, AuthToken>;

export let seriesTable: thingDatabase<Series, Series & timestamped>;
export let seasonsTable: thingDatabase<Season, Season & timestamped>;
export let episodesTable: thingDatabase<Episode, Episode & timestamped>;
export let moviesTable: thingDatabase<Movie, Movie & timestamped>;
export let watchableEntitysTable: thingDatabase<WatchableEntity, WatchableEntity & timestamped>;

export let watchHistoryTable: thingDatabase<WatchHistory, WatchHistory & timestamped>;

export let syncRoomsTable: thingDatabase<SyncRoom, SyncRoom & timestamped>;

export let jobsTable: thingDatabase<Job, Job & timestamped>;

export async function connectDatabase() {
    database = Database.createDatabase(process.env.DB_HOST!, process.env.DB_USERNAME!, process.env.DB_PASSWORD!, process.env.DB_DATABASE!);
    await database.connect({
        connectionLimit: 15,
    });
    await createTables();
}

const UUID_FIELD = {
    type: 'varchar(64)',
    null: false,
};

async function createTables() {

    database.createTable('accounts', {
        options: {
            timestamps: true,
            PK: 'UUID',
        },
        UUID: UUID_FIELD,
        username: {
            type: 'varchar(64)',
            null: false,
        },
        password: {
            type: 'varchar(256)',
            null: false,
        },
        email: {
            type: 'varchar(256)',
            null: false,
        },
        role: {
            type: 'int',
            null: false,
        },
        activityDetails: {
            type: 'json',
            null: false,
            json: true,
        },
        status: {
            type: 'varchar(32)',
            null: false,
        },
        settings: {
            type: 'json',
            null: false,
            json: true,
        },
    });
    database.createTable('authtokens', {
        options: {
            PK: 'TOKEN',
            K: ['account_UUID'],
        },
        TOKEN: {
            type: 'varchar(64)',
            null: false,
        },
        account_UUID: {
            type: 'varchar(64)',
            null: false,
        },
    });

    database.createTable('series', {
        options: {
            timestamps: true,
            PK: 'UUID',
        },
        UUID: UUID_FIELD,
        tags: {
            type: 'text',
            null: false,
            json: true,
        },
        title: {
            type: 'varchar(256)',
            null: false,
        },
        infos: {
            type: 'text',
            null: true,
            json: true,
        },
        refs: {
            type: 'text',
            null: true,
            json: true,
        },
    }); 1;
    database.createTable('seasons', {
        options: {
            timestamps: true,
            PK: 'UUID',
            K: ['serie_UUID']
            // FK: {
            //     serie_UUID: 'series/UUID',
            // },
        },
        UUID: UUID_FIELD,
        serie_UUID: UUID_FIELD,
        season_IDX: {
            type: 'int',
            null: false,
        },
        episodes: {
            type: 'int',
            null: false,
        }
    });
    database.createTable('episodes', {
        options: {
            timestamps: true,
            PK: 'UUID',
            K: ['season_UUID']
            // FK: {
            //     serie_UUID: 'series/UUID',
            // },
        },
        UUID: UUID_FIELD,
        season_UUID: UUID_FIELD,
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
            K: ['serie_UUID']
            // FK: {
            //     serie_UUID: 'series/UUID',
            // },
        },
        UUID: UUID_FIELD,
        primaryName: {
            type: 'varchar(256)',
            null: false,
        },
        serie_UUID: UUID_FIELD,
        movie_IDX: {
            type: 'int',
            null: false,
        },
    });
    database.createTable('watchableEntitys', {
        options: {
            timestamps: true,
            PK: 'UUID',
            K: ['watchable_UUID']
            // FK: {
            //     serie_UUID: 'series/UUID',
            // },
        },
        UUID: UUID_FIELD,
        watchable_UUID: UUID_FIELD,
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

    database.createTable('watchHistory', {
        options: {
            timestamps: true,
            PK: 'UUID',
            K: ['account_UUID', 'watchable_UUID'],
        },
        UUID: UUID_FIELD,
        account_UUID: UUID_FIELD,
        watchable_UUID: UUID_FIELD,
        watchTime: {
            type: 'int',
            null: false,
        },
    });

    database.createTable('syncRooms', {
        options: {
            timestamps: true,
            PK: 'UUID',
            K: ['series_UUID'],
        },
        UUID: UUID_FIELD,
        series_UUID: UUID_FIELD,
        watchableEntity_UUID: UUID_FIELD,
        members: {
            type: 'json',
            null: false,
            json: true,
        },
    });

    database.createTable('jobs', {
        options: {
            timestamps: true,
            PK: 'UUID',
        },
        UUID: UUID_FIELD,
        type: {
            type: 'varchar(64)',
            null: false,
        },
        failed_at: {
            type: 'int',
            null: true,
        },
        finished_at: {
            type: 'int',
            null: true,
        },
        data: {
            type: 'json',
            null: true,
            json: true,
        },
        result: {
            type: 'json',
            null: true,
            json: true,
        }
    });

    accountsTable = database.get<Account, Account & timestamped>('accounts');
    authTokensTable = database.get<AuthToken>('authtokens');

    seriesTable = database.get<Series, Series & timestamped>('series');
    seasonsTable = database.get<Season, Season & timestamped>('seasons');
    episodesTable = database.get<Episode, Episode & timestamped>('episodes');
    moviesTable = database.get<Movie, Movie & timestamped>('movies');
    watchableEntitysTable = database.get<WatchableEntity, WatchableEntity & timestamped>('watchableEntitys');

    watchHistoryTable = database.get<WatchHistory, WatchHistory & timestamped>('watchHistory');

    syncRoomsTable = database.get<SyncRoom, SyncRoom & timestamped>('syncRooms');

    jobsTable = database.get<Job, Job & timestamped>('jobs');

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
