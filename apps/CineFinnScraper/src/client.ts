import { io, Socket } from 'socket.io-client';
import promiseLimit from 'promise-limit';
import type { AniWorldSerieCompare } from './utils/compare.js';
import type { DetailedSeries } from '@cinefinn/types/models/media';
import Aniworld from './class/Aniworld.js';
import { setupConfigurationManagment } from '@cinefinn/configuration-manager';

let socket: Socket;

interface ClientConfig {
    version: string;
    scraper: {
        url: string;
        authToken: string;
    }
    concurrencyLimit: number;
}

const defaultClientConfig: ClientConfig = {
    version: '1.0.0',
    scraper: {
        url: 'http://localhost:4000',
        authToken: 'SUPER_SECURE-SCRAPER_CLIENT_TOKEN',
    },
    concurrencyLimit: 10,
}

const config = setupConfigurationManagment<ClientConfig>(defaultClientConfig, [], 'client.config.json');

socket = io(config.scraper.url, {
    reconnection: true,
    upgrade: true,
    autoConnect: false,
    auth: {
        type: 'scraperClient',
        authToken: config.scraper.authToken,
    },
});

socket.on('connect_error', (err) => {
    console.log('Error connecting to ScraperServer', err);
});

socket.on('connect', () => {
    console.log('Connected to ScraperServer');
});

socket.on('disconnect', () => {
    console.log('Disconnected from ScraperServer');
});

const limit = promiseLimit<AniWorldSerieCompare>(config.concurrencyLimit);

socket.on('scrapeChunk', async (seriesList: DetailedSeries[], refKey: string, cb) => {
    console.log('Received scrapeChunk with', seriesList.length, 'series');
    try {
        const output = await Promise.all(seriesList.map(async (serie) => {
            return limit(() => {
                return new Promise<AniWorldSerieCompare>(async (resolve, reject) => {
                    try {
                        const ref = serie.refs[refKey];
                        if (typeof ref !== 'string') {
                            return resolve(null as any);
                        }

                        const world = new Aniworld(ref);
                        const out = await world.parseInformations();

                        if (out == undefined) {
                            console.log('Error parsing Aniworld', serie.refs.aniworld);
                            return resolve(null as any);
                        }

                        resolve({
                            UUID: serie.UUID,
                            title: serie.title,
                            references: serie.refs,
                            ...out,
                        });
                    } catch (error) {
                        console.error('Error processing serie:', serie.UUID, error);
                        reject(error);
                    }
                });
            });
        }));
        console.log('Completed scrapeChunk, sending back results');
        cb(true);
        socket.emit('scrapeChunkResult', output);
    } catch (error) {
        cb(false);
    }
});

socket.connect();