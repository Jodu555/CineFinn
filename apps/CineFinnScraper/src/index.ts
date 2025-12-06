import { io, Socket } from 'socket.io-client';
import { getConfig } from './config.js';
import type { AuthHandshake, ScraperToServerEvents, ServerToScraperEvents, } from '@cinefinn/types/socket';
import type { DetailedSeries, IgnoranceItem } from '@cinefinn/types/database';
import { compareForNewReleases } from './utils/compare.js';
import axios from 'axios';

const config = getConfig();

let socket: Socket<ServerToScraperEvents, ScraperToServerEvents> | null = null;


socket = io(config.CORE.URL, {
    transports: ['websocket'],
    reconnection: true,
    upgrade: true,
    autoConnect: false,
    auth: {
        type: 'scraper',
        authToken: config.CORE.AUTH_TOKEN,
    } satisfies AuthHandshake,
});

socket.on('connect', () => {
    console.log('Connected to Core');
    checkForUpdates([]);
});

socket.on('disconnect', () => {
    console.log('Disconnected from Core');
});

socket.on('job:checkForUpdates', (cb) => {
    console.log('job:checkForUpdates');
    // cb(0);
});

async function checkForUpdates(index: DetailedSeries[]) {

    const response = await axios.get<DetailedSeries[]>('http://localhost:3000/index/all?auth-token=SECR-DEV', {
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

    // if (process.env.IGNORE_API_HOST) {
    //     const ignoreResponse = await axios.get<{ ID: string; title: string; }[]>(`${process.env.ACTION_API_HOST}/ignoreList/?auth-token=${process.env.AUTH_TOKEN_REST}`);
    //     // const ignoreResponse = await axios.get<{ ID: string, title: string; }[]>(`http://cinema-api.jodu555.de/ignoreList/?auth-token=${process.env.AUTH_TOKEN_REST}`);
    //     console.log('Loaded', ignoreResponse.data.length, 'Animes/Series to Ignore for now!');
    //     for (const item of ignoreResponse.data) {
    //         ignoranceList.push({
    //             ID: item.ID,
    //         });
    //     }
    // }


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
    const output = await compareForNewReleases(index, [], { aniworld: true, sto: true, zoro: false });
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
