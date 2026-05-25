import { io as Client, Socket } from 'socket.io-client';
import { getConfig } from './config.js';
import type { AuthHandshake, ScraperToServerEvents, ServerToScraperEvents, } from '@cinefinn/types/socket';
import type { DetailedSeries } from '@cinefinn/types/models/media';
import { compareForNewReleases } from './utils/compare.js';
import axios from 'axios';
import Aniworld from './class/Aniworld.js';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { trimTrailingSlash } from 'hono/trailing-slash';
import { Server } from 'socket.io';
import { getAniworldCalendarFromFile, storeAniworldCalendar } from './calendars/aniworldCalendar.js';
import { getStoCalendarFromFile, storeStoCalendar } from './calendars/stoCalendar.js';
import { msToReadable, wait } from '@cinefinn/utilities/time';
import type { ExtendedEpisodeDownload, IgnoranceItem } from '@cinefinn/types/shared';
import type { CallJobResponse, JobType } from '@cinefinn/types';
import { tryCatch } from '@cinefinn/utilities/tryCatch';
import { DownloaderConnector } from './class/DownloaderConnector.js';
import { calendarRouter } from './calendars/router.js';
import { getHumanInterventionList, setCoreSocket, setHumanInterventionList } from './utils/utils.js';


const config = getConfig();

const app = new Hono({
    strict: false,
})
    .use(cors())
    .use(trimTrailingSlash())
    .route('/calendars', calendarRouter)
    .get('/humanIntervention', async (c) => {
        return c.json(getHumanInterventionList());
    });

export let io: Server;

const httpServer = serve({
    fetch: app.fetch,
    port: config.PORT,
}, async (info) => {
    console.log(info);
    io = new Server(httpServer, {
        cors: {
            methods: ['GET', 'POST'],
        },
    });

    io.use((socket, next) => {
        const handshake = socket.handshake;
        if (handshake.auth.type === 'scraperClient' && handshake.auth.authToken === config.SCRAPER_CLIENT_TOKEN) {
            next();
        } else {
            next(new Error('Unauthorized'));
        }
    });

    io.on('connection', (socket) => {
        console.log('New Scraper Client Connected');
        socket.on('disconnect', () => {
            console.log('Scraper Client Disconnected');
        });
    });

    const mockIndex: DetailedSeries[] = [
        {
            UUID: 'S-House',
            title: 'Hudson and Rex',
            seasons: [],
            movies: [],
            infos: {},
            refs: {
                // sto: 'http://186.2.175.5/serie/dr-house/',
                sto: 'http://186.2.175.5/serie/hudson-and-rex/',
            },
            tags: [],
        },
    ];

    // await wait(1000 * 10);
    // const output = await compareForNewReleases(mockIndex, [], { aniworld: true, sto: true, zoro: false });

});



const socket = Client(config.CORE.URL, {
    transports: ['websocket'],
    reconnection: true,
    upgrade: true,
    autoConnect: false,
    auth: {
        type: 'scraper',
        authToken: config.CORE.SCRAPER_SOCKET_TOKEN,
    } satisfies AuthHandshake,
}) as Socket<ServerToScraperEvents, ScraperToServerEvents>;

setCoreSocket(socket);

socket.on('connect', () => {
    console.log('Connected to Core');
    // checkForUpdates([]);
});

socket.on('disconnect', () => {
    console.log('Disconnected from Core');
});

socket.on('job:checkForUpdates', async ({ jobUUID, smart, index, alreadyCheckedForUpdates }, cb) => {
    console.log('job:checkForUpdates');
    try {
        await checkForUpdates(jobUUID, index, smart, alreadyCheckedForUpdates);
        cb({
            result: true,
            changedSeries: [],
        });
    } catch (error) {
        console.log('Error in job:checkForUpdates', error);
        cb({
            result: false,
            changedSeries: [],
        });
    }
});

socket.on('checkSerieForUpdates', async (serieUUID, cb) => {
    console.log('checkSerieForUpdates', serieUUID);
    const response = await axios.get<DetailedSeries>(`${config.CORE.URL}/index/${serieUUID}`, {
        headers: {
            'auth-token': config.CORE.REST_AUTH_TOKEN,
        },
        timeout: 1000 * 60,
    });

    if (response.status != 200) {
        console.log('Error fetching index');
        return;
    }
    const serie = response.data;
    console.log(serie);

    const output = await compareForNewReleases([serie], [], { aniworld: true, sto: true, zoro: false });
    cb(output);
});

socket.on('scrape:aniworld', async (url, cb) => {
    console.log('scrape:aniworld', url);
    const aniworld = new Aniworld(url);
    const informations = await aniworld.parseInformations();
    cb(informations);
});

socket.on('scrape:sto', async (url, cb) => {
    console.log('scrape:sto', url);
    const aniworld = new Aniworld(url);
    const informations = await aniworld.parseInformations();
    cb(informations);
});

async function checkForUpdates(jobUUID: string, index: DetailedSeries[], smart = false, alreadyCheckedForUpdates: string[] = []) {
    const timingMap = new Map<string, number>();
    const log = (...args: any[]) => {
        socket.emit('job:log', jobUUID, ...args);
        console.log(`[${jobUUID}]`, ...args);
    };
    const time = (label: string) => {
        timingMap.set(label, Date.now());
    };
    const timeEnd = (label: string) => {
        const time = timingMap.get(label);
        if (time == undefined) return;
        timingMap.delete(label);
        log(`[${label}] Took ${msToReadable(Date.now() - time)}`);
    };
    log('Scraper Socket recieved Call');

    time('Fetching Index');
    const response = await axios.get<DetailedSeries[]>(`${config.CORE.URL}/index/all`, {
        headers: {
            'auth-token': config.CORE.REST_AUTH_TOKEN,
        },
        timeout: 1000 * 60,
    });
    timeEnd('Fetching Index');

    if (response.status != 200) {
        console.log('Error fetching index');
        return;
    }
    index = response.data;

    //This list should say, that these animes should the new episodes no be included unless they are german dubbed
    const ignoranceList: IgnoranceItem[] = [];

    const USE_IGNORANCE_LIST = true;
    log('Using Ignorance List', USE_IGNORANCE_LIST);
    if (USE_IGNORANCE_LIST === true) {
        time('Fetching Ignorance List');
        const ignoreResponse = await axios.get<IgnoranceItem[]>(`${config.CORE.URL}/admin/ignoranceItems`, {
            headers: {
                'auth-token': config.CORE.REST_AUTH_TOKEN,
            }
        });
        timeEnd('Fetching Ignorance List');
        ignoranceList.push(...ignoreResponse.data);
    }

    log('Using Smart Mode', smart);
    if (smart) {
        const thirtyDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 30;

        time('Getting Calendars');
        const aniworldCalendar = await getAniworldCalendarFromFile();
        const stoCalendar = await getStoCalendarFromFile();
        timeEnd('Getting Calendars');

        log('Calendars Loaded:', Object.keys(aniworldCalendar).length, 'Aniworld', Object.keys(stoCalendar).length, 'STO');

        const relevantSeriesUUIDs = new Set<string>();

        time('Filtering Relevant Series');
        Object.entries(aniworldCalendar).forEach(([crawlTimestamp, calendarEntry]) => {
            if (+crawlTimestamp < thirtyDaysAgo) {
                return;
            }
            const entryRelevantSeriesUUIDs = calendarEntry
                .map(x => index.find(y => (y.refs.aniworld || '').includes(x.parsed.serieSlug))?.UUID)
                .filter(x => x != null && x != undefined);

            entryRelevantSeriesUUIDs.forEach(x => {
                relevantSeriesUUIDs.add(x);
            });
        });
        Object.entries(stoCalendar).forEach(([crawlTimestamp, calendarEntry]) => {
            if (+crawlTimestamp < thirtyDaysAgo) {
                return;
            }
            const entryRelevantSeriesUUIDs = calendarEntry
                .map(x => index.find(y => (y.refs.sto || '').includes(x.parsed.serieSlug))?.UUID)
                .filter(x => x != null && x != undefined);

            entryRelevantSeriesUUIDs.forEach(x => {
                relevantSeriesUUIDs.add(x);
            });
        });
        timeEnd('Filtering Relevant Series');
        log('Relevant Series', relevantSeriesUUIDs.size);

        index.forEach(x => {
            if (!relevantSeriesUUIDs.has(x.UUID) && !alreadyCheckedForUpdates.includes(x.UUID)) {
                ignoranceList.push({
                    serie_UUID: x.UUID,
                });
            }
        });
    }

    time('Compare');
    const output = await compareForNewReleases(index, ignoranceList, { aniworld: true, sto: true, zoro: false });
    timeEnd('Compare');


    const condensedArray = [
        ...output.aniworld.map(x => ({ _categorie: 'Aniworld', ...x })),
        ...output.sto.map(x => ({ _categorie: 'STO', ...x }))
    ];
    socket.emit('job:setResult', jobUUID, condensedArray);
    log(condensedArray);
    log(condensedArray.length);
    if (condensedArray.length == 0) return;

    // return;

    const downloaderConnector = new DownloaderConnector(jobUUID, socket);

    const result = await downloaderConnector.kickOffAniDl(condensedArray);

    if (result !== undefined) {
        setHumanInterventionList([
            ...getHumanInterventionList(),
            ...result.collectResult.filter(x => x.finished === false),
            ...result.downloadResult.filter(x => x.finished === false),
        ]);
    }

    await callJob('crawl', true);

    await callJob('generatePreviewImages', true);

}



async function callJob(type: JobType, blocking = false, timeout = 1000 * 60 * 10) {
    return new Promise<CallJobResponse>((resolve, reject) => {
        socket.timeout(timeout).emit('callJob', type, blocking, (err, response) => {
            if (err) {
                console.log(`Call Job ${type} resulted in ${err}`);
                reject(err);
            }
            console.log(`Call Job ${type} resulted in ${response}`);
            if (response.error) {
                reject(response);
                return;
            } else {
                console.log('Job', type, 'got ID:', response.jobUUID);
                resolve(response);
                return;
            }
        });
    })
}

socket.connect();

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // process.exit(1);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT. Shutting down gracefully.');
    process.exit(0);
});