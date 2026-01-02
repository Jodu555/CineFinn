import dotenv from 'dotenv';
dotenv.config();;
import { Database, type thingDatabase } from '@jodu555/mysqlapi';
import type { Account, timestamped, AuthToken, Series, Season, Episode, Movie, WatchableEntity, WatchHistory, SyncRoom, Job, Email, Playlist, TodoItem } from '@cinefinn/types/database';
import { getConfig } from './config.js';
import { debounce } from './utils.js';


export let database: Database;

export let accountsTable: thingDatabase<Account, Account & timestamped>;
export let authTokensTable: thingDatabase<AuthToken, AuthToken>;
export let emailsTable: thingDatabase<Email, Email & timestamped>;

export let seriesTable: thingDatabase<Series, Series & timestamped>;
export let seasonsTable: thingDatabase<Season, Season & timestamped>;
export let episodesTable: thingDatabase<Episode, Episode & timestamped>;
export let moviesTable: thingDatabase<Movie, Movie & timestamped>;
export let watchableEntitysTable: thingDatabase<WatchableEntity, WatchableEntity & timestamped>;

export let watchHistoryTable: thingDatabase<WatchHistory, WatchHistory & timestamped>;

export let syncRoomsTable: thingDatabase<SyncRoom, SyncRoom & timestamped>;

export let jobsTable: thingDatabase<Job, Job & timestamped>;

export let playlistsTable: thingDatabase<Playlist, Playlist & timestamped>;

export let todosTable: thingDatabase<TodoItem, TodoItem & timestamped>;

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function connectDatabase(clean: boolean = false) {
    const config = getConfig();
    database = Database.createDatabase(config.database.host, config.database.username, config.database.password, config.database.database);
    // database = Database.createDatabase(process.env.DB_HOST!, process.env.DB_USERNAME!, process.env.DB_PASSWORD!, process.env.DB_DATABASE!);
    await database.connect({
        connectionLimit: 20,
        queueLimit: 0,
        acquireTimeout: 1000000,
        connectTimeout: 30000,
    });
    await createTables();

    if (clean === true) return;

    // import { rebroadcastAccounts, rebroadcastOverview } from './routes/admin.js';
    // const { rebroadcastAccounts, rebroadcastOverview } = await import('./routes/admin.js')
    const adminRouter = await import('./routes/admin.js');

    const rebAccounts = async () => {
        await sleep(200);
        await adminRouter.rebroadcastAccounts();
    };

    database.setCallback('accounts-CREATE', rebAccounts);
    database.setCallback('accounts-UPDATE', rebAccounts);
    database.setCallback('accounts-DELETE', rebAccounts);

    const rebOverview = debounce(async () => {
        console.log('Overview Rebroadcast');
        await sleep(200);
        await adminRouter.rebroadcastOverview();
    }, 1000);
    database.setCallback('*-CREATE', rebOverview);
    database.setCallback('*-UPDATE', rebOverview);
    database.setCallback('*-DELETE', rebOverview);
}


const UUID_FIELD = {
    type: 'varchar(40)',
    null: false,
};

async function createTables() {

    await database.createTable('accounts', {
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
        emailVerifyCode: {
            type: 'varchar(10)',
            null: false,
        },
        settings: {
            type: 'json',
            null: false,
            json: true,
        },
    });
    await database.createTable('authtokens', {
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
    await database.createTable('emails', {
        options: {
            PK: 'UUID',
            K: ['account_UUID', 'status'],
        },
        UUID: UUID_FIELD,
        account_UUID: UUID_FIELD,
        email_type: {
            //The email type to create the email for like 'VERIFICATION' or 'PASSWORD_RESET'
            type: 'varchar(32)',
            null: false,
        },
        status: {
            //The status of the email like 'PENDING' or 'SENT'
            type: 'varchar(32)',
            null: false,
        },
        subject: {
            //The subject of the email
            type: 'varchar(255)',
            null: false,
        },
        html: {
            //The html of the email
            type: 'TEXT',
            null: false,
        },
        text: {
            //The text of the email
            type: 'TEXT',
            null: false,
        },
        data: {
            //The data to send with the email
            type: 'TEXT',
            null: true,
            json: true,
        },
        sent_at: {
            //The time the email was sent
            type: 'BIGINT',
            null: true,
        },
        created_at: {
            //The time the email record was created
            type: 'BIGINT',
            null: false,
        }
    });

    await database.createTable('series', {
        options: {
            timestamps: true,
            PK: 'UUID',
            K: ['title']
        },
        UUID: UUID_FIELD,
        tags: {
            type: 'json',
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
    await database.createTable('seasons', {
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
    await database.createTable('episodes', {
        options: {
            timestamps: true,
            PK: 'UUID',
            K: ['season_UUID', 'serie_UUID']
            // FK: {
            //     serie_UUID: 'series/UUID',
            // },
        },
        UUID: UUID_FIELD,
        serie_UUID: UUID_FIELD,
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
    await database.createTable('movies', {
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
    await database.createTable('watchableEntitys', {
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
        serie_UUID: UUID_FIELD, //Maybe implement this, this would make so much so much easier
        lang: {
            type: 'varchar(10)',
            null: false,
        },
        subID: {
            type: 'varchar(16)',
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

    await database.createTable('watchHistory', {
        options: {
            timestamps: true,
            PK: 'UUID',
            K: ['account_UUID', 'series_UUID', 'watchable_UUID'],
        },
        UUID: UUID_FIELD,
        account_UUID: UUID_FIELD,
        series_UUID: UUID_FIELD,
        watchable_UUID: UUID_FIELD,
        watchTime: {
            type: 'int',
            null: false,
        },
    });

    await database.createTable('syncRooms', {
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

    await database.createTable('jobs', {
        options: {
            timestamps: true,
            PK: 'UUID',
        },
        UUID: UUID_FIELD,
        type: {
            type: 'varchar(16)',
            null: false,
        },
        failed_at: {
            type: 'BIGINT',
            null: true,
        },
        finished_at: {
            type: 'BIGINT',
            null: true,
        },
        data: {
            type: 'json',
            null: true,
            json: true,
        },
        logs: {
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

    await database.createTable('playlists', {
        options: {
            timestamps: true,
            PK: 'UUID',
        },
        UUID: UUID_FIELD,
        account_UUID: UUID_FIELD,
        name: {
            type: 'varchar(64)',
            null: false,
        },
        description: {
            type: 'text',
            null: true,
        },
        items: {
            type: 'json',
            null: false,
            json: true,
        },
        settings: {
            type: 'json',
            null: false,
            json: true,
        },
    });

    await database.createTable('todos', {
        options: {
            timestamps: true,
            PK: 'ID',
        },
        ID: {
            type: 'varchar(8)',
            null: false,
        },
        sortOrder: {
            type: 'int',
            null: false,
        },
        name: {
            type: 'varchar(128)',
            null: false,
        },
        creator: UUID_FIELD,
        categorie: {
            type: 'varchar(16)',
            null: false,
        },
        refs: {
            type: 'json',
            null: false,
            json: true,
        },
        scrapingInfo: {
            type: 'json',
            null: true,
            json: true,
        },
    });

    accountsTable = database.get<Account, Account & timestamped>('accounts');
    authTokensTable = database.get<AuthToken>('authtokens');
    emailsTable = database.get<Email, Email & timestamped>('emails');

    seriesTable = database.get<Series, Series & timestamped>('series');
    seasonsTable = database.get<Season, Season & timestamped>('seasons');
    episodesTable = database.get<Episode, Episode & timestamped>('episodes');
    moviesTable = database.get<Movie, Movie & timestamped>('movies');
    watchableEntitysTable = database.get<WatchableEntity, WatchableEntity & timestamped>('watchableEntitys');

    watchHistoryTable = database.get<WatchHistory, WatchHistory & timestamped>('watchHistory');

    syncRoomsTable = database.get<SyncRoom, SyncRoom & timestamped>('syncRooms');

    jobsTable = database.get<Job, Job & timestamped>('jobs');

    playlistsTable = database.get<Playlist, Playlist & timestamped>('playlists');

    todosTable = database.get<TodoItem, TodoItem & timestamped>('todos');

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
