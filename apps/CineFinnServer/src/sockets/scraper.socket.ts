
import type { AuthHandshake, SocketAuthDataScraper } from "@cinefinn/types/socket";
import type { SocketConsumerMeta } from "./index.js";
import { getConfig } from "../config.js";

async function authFunction(authHandshake: AuthHandshake): Promise<SocketAuthDataScraper> {
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

async function connectionFunction() {
    console.log('scraper connected');
}

export default {
    meta: {
        type: 'scraper',
        authFunction,
        connectionFunction,
    } satisfies SocketConsumerMeta,
}