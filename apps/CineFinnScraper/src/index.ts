import { io as Client, Socket } from 'socket.io-client';
import { getConfig } from './config.js';
import type { AuthHandshake, ScraperToServerEvents, ServerToScraperEvents, } from '@cinefinn/types/socket';
import type { DetailedSeries, IgnoranceItem, timestamped } from '@cinefinn/types/database';
import { compareForNewReleases } from './utils/compare.js';
import axios from 'axios';
import Aniworld from './class/Aniworld.js';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { trimTrailingSlash } from 'hono/trailing-slash';
import { Server } from 'socket.io';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const config = getConfig();

const app = new Hono({
    strict: false,
})
    .use(cors())
    .use(trimTrailingSlash());

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
            UUID: 'S-IRREG',
            title: 'Irregular',
            seasons: [],
            movies: [],
            infos: {},
            refs: {
                aniworld: 'https://aniworld.to/anime/stream/the-irregular-at-magic-high-school',
            },
            tags: [],
        },
        {
            UUID: 'S-DALV',
            title: 'Date a Live',
            seasons: [],
            movies: [],
            infos: {},
            refs: {
                aniworld: 'https://aniworld.to/anime/stream/date-a-live',
            },
            tags: [],
        },
        {
            UUID: 'S-ASTERISK',
            title: 'Asterisk War',
            seasons: [],
            movies: [],
            infos: {},
            refs: {
                aniworld: 'https://aniworld.to/anime/stream/the-asterisk-war',
            },
            tags: [],
        }
    ];

    // await wait(1000 * 10)
    // const output = await compareForNewReleases(mockIndex, [], { aniworld: true, sto: false, zoro: false });

});

let socket: Socket<ServerToScraperEvents, ScraperToServerEvents> | null = null;


socket = Client(config.CORE.URL, {
    transports: ['websocket'],
    reconnection: true,
    upgrade: true,
    autoConnect: false,
    auth: {
        type: 'scraper',
        authToken: config.CORE.SCRAPER_SOCKET_TOKEN,
    } satisfies AuthHandshake,
});

socket.on('connect', () => {
    console.log('Connected to Core');
    // checkForUpdates([]);
});

socket.on('disconnect', () => {
    console.log('Disconnected from Core');
});

socket.on('job:checkForUpdates', (cb) => {
    console.log('job:checkForUpdates');
    // cb(0);
});

socket.on('checkSerieForUpdates', async (uuid, cb) => {
    console.log('checkSerieForUpdates', uuid);
    const response = await axios.get<DetailedSeries>(`${config.CORE.URL}/index/${uuid}`, {
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

async function checkForUpdates(index: DetailedSeries[]) {
    // const response = await axios.get<DetailedSeries[]>('http://localhost:3000/index/all?auth-token=SECR-DEV', {

    const response = await axios.get<DetailedSeries[]>(`${config.CORE.URL}/index/all`, {
        headers: {
            'auth-token': config.CORE.REST_AUTH_TOKEN,
        },
        timeout: 1000 * 60,
    });

    if (response.status != 200) {
        console.log('Error fetching index');
        return;
    }
    index = response.data;

    index.splice(10, index.length);

    //This list should say, that these animes should the new episodes no be included unless they are german dubbed
    const ignoranceList: IgnoranceItem[] = [];

    const USE_IGNORANCE_LIST = true;
    if (USE_IGNORANCE_LIST === true) {
        const ignoreResponse = await axios.get<IgnoranceItem[]>(`${config.CORE.URL}/admin/ignoranceItems`, {
            headers: {
                'auth-token': config.CORE.REST_AUTH_TOKEN,
            }
        });
        ignoranceList.push(...ignoreResponse.data);
    }


    // if (smart) {
    // 	//Get calendar API data and ignore rest
    // 	const allIDS = res.data.map(x => x.ID);
    // 	const calendarIDResponse = await getRelevantReleasesUsingCalendar();
    // 	const useLessIds = allIDS.filter(x => !calendarIDResponse.includes(x));
    // 	console.log(useLessIds.length, 'animes/series to ignore because they are not in the relevant calendar');
    // 	ignoranceList.push(...useLessIds.map(x => ({ ID: x })));
    // }

    console.time('Compare');

    // const output = await compareForNewReleases(res.data, ignoranceList, { aniworld: true, sto: true, zoro: false });
    const output = await compareForNewReleases(index, ignoranceList, { aniworld: true, sto: true, zoro: false });
    console.timeEnd('Compare');


    const condensedArray = [
        ...output.aniworld.map(x => ({ _categorie: 'Aniworld', ...x })),
        ...output.sto.map(x => ({ _categorie: 'STO', ...x }))
    ];
    if (condensedArray.length == 0) return;

    console.log(condensedArray);
    console.log(condensedArray.length);
    // return;

    // await kickOffAniDl(condensedArray);

    // await recrawlArchive();
    // await generateImages();
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