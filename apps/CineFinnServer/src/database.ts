import dotenv from 'dotenv';
dotenv.config();;
import { Database, type thingDatabase } from '@jodu555/mysqlapi';
import type { Account, AuthToken, Email } from '@cinefinn/types/models/user';
import type { Series, Season, Episode, Movie, WatchableEntity } from '@cinefinn/types/models/media';
import type { Playlist } from '@cinefinn/types/models/playlist';
import type { WatchHistory, SyncRoom, Job } from '@cinefinn/types/models/system';
import type { TodoItem, IgnoranceItem } from '@cinefinn/types/shared';
import type { timestamped } from '@cinefinn/types/shared';
import { getConfig } from './config.js';
import type { FranchiseData } from '@cinefinn/types/models/franchise';
import { throttle } from '@cinefinn/utilities/index';


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

export let ignoranceTable: thingDatabase<IgnoranceItem, IgnoranceItem & timestamped>;

export let franchiseTable: thingDatabase<FranchiseData, FranchiseData & timestamped>;

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
    const adminRouter = await import('./routes/admin/admin.js');

    const rebAccounts = throttle(async () => {
        await sleep(100);
        await adminRouter.rebroadcastAccounts();
    }, 1000 * 5);

    database.setCallback('accounts-CREATE', rebAccounts);
    database.setCallback('accounts-UPDATE', rebAccounts);
    database.setCallback('accounts-DELETE', rebAccounts);

    const rebOverview = throttle(async () => {
        await sleep(50);
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
        runtime: {
            type: 'int',
            null: false,
        },
        // IV: {
        //     type: 'BLOB',
        //     null: true,
        // },
        // hash: {
        //     type: 'varchar(128)',
        //     null: false,
        // }
    });

    if (false) {
        await database.createTable('watchableEntitysMeta', {
            options: {
                timestamps: true,
                PK: 'UUID',
            },
            UUID: UUID_FIELD,

            // Reference to the internal video entity
            watchableEntity_UUID: UUID_FIELD,

            // File
            fileSize: 'bigint',
            md5sum: 'varchar(32)',
            // sha256sum: 'varchar(64)',

            // Container
            containerFormat: 'varchar(32)',

            // Video
            duration: 'int',
            videoWidth: 'int',
            videoHeight: 'int',
            videoCodec: 'varchar(32)',
            videoProfile: 'varchar(32)',
            videoLevel: 'varchar(16)',
            videoBitrate: 'bigint',
            videoFps: 'decimal(7,3)',
            videoColorSpace: 'varchar(32)',
            videoPixelFormat: 'varchar(32)',
            videoBitDepth: 'tinyint',
            videoFrameCount: 'bigint',
            videoInterlaced: 'boolean',

            // Audio
            audioCodec: 'varchar(32)',
            audioChannels: 'tinyint',
            audioChannelLayout: 'varchar(32)',
            audioSampleRate: 'int',
            audioBitrate: 'bigint',
            audioBitDepth: 'tinyint',

            // Analysis/checking
            lastchecked_at: 'datetime',
            metadataVersion: 'int',
            checkStatus: 'varchar(32)',
            checkError: 'text',
        })
    }


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
            type: 'varchar(22)',
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

    await database.createTable('ignorance_items', {
        options: {
            timestamps: true,
            PK: 'serie_UUID',
        },
        serie_UUID: UUID_FIELD,
        lang: {
            type: 'varchar(10)',
            null: true,
        },
    });

    await database.createTable('franchises', {
        options: {
            timestamps: true,
            PK: 'id',
        },
        id: {
            type: 'varchar(64)',
            null: false,
        },
        name: {
            type: 'varchar(256)',
            null: false,
        },
        description: {
            type: 'text',
            null: false,
        },
        backgroundImage: {
            type: 'varchar(256)',
            null: false,
        },
        logo: {
            type: 'varchar(256)',
            null: false,
        },
        subFranchises: {
            type: 'json',
            null: false,
            json: true,
        },
        mainContent: {
            type: 'json',
            null: false,
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

    ignoranceTable = database.get<IgnoranceItem, IgnoranceItem & timestamped>('ignorance_items');

    franchiseTable = database.get<FranchiseData, FranchiseData & timestamped>('franchises');
}
