
import type { AuthHandshakeScraper, InterServerEvents, ScraperToServerEvents, ServerToScraperEvents, SocketAuthDataScraper } from "@cinefinn/types/socket";
import type { SocketConsumerMeta } from "./index.js";
import { getConfig } from "../config.js";
import type { definedSocket } from "../index.js";
import { getIO } from "../utils.js";
import type { Socket } from "socket.io";
import type { Account, timestamped } from "@cinefinn/types/database";

export let isScraperSocketConnected = false;

export type definedScraperSocket = Socket<ScraperToServerEvents, ServerToScraperEvents, InterServerEvents, { auth: SocketAuthDataScraper<Account | (Account & timestamped)> }>;
export async function getScraperSocket() {
    if (!isScraperSocketConnected) {
        throw new Error('Scraper Socket not connected');
    }
    const sockets = await getIO().fetchSockets();
    const scraperSocket = sockets.find(s => s.data.auth.type === 'scraper');
    if (scraperSocket == undefined) {
        throw new Error('Scraper Socket not found');
    }
    return scraperSocket as any as definedScraperSocket;
}

async function authFunction(authHandshake: AuthHandshakeScraper): Promise<SocketAuthDataScraper> {
    const { authToken } = authHandshake;

    if (authToken === undefined) {
        throw new Error('Unauthorized');
    }
    if (authToken !== getConfig().scraper.authToken) {
        throw new Error('Unauthorized');
    }
    return {
        type: 'scraper',
        token: authToken,
    };
}

async function connectionFunction(socket: definedSocket) {
    console.log('scraper connected');
    isScraperSocketConnected = true;

    socket.on('disconnect', () => {
        console.log('scraper disconnected');
        isScraperSocketConnected = false;
    });
}

export default {
    meta: {
        type: 'scraper',
        authFunction,
        connectionFunction,
    } satisfies SocketConsumerMeta,
}