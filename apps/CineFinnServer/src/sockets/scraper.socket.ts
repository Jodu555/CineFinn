
import type { AuthHandshakeScraper, SocketAuthDataScraper } from "@cinefinn/types/socket";
import type { SocketConsumerMeta } from "./index.js";
import { getConfig } from "../config.js";
import type { definedSocket } from "../index.js";

export let isScraperSocketConnected = false;

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