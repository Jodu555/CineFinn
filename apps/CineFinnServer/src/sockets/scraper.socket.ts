
import type { AuthHandshakeScraper, InterServerEvents, ScraperToServerEvents, ServerToScraperEvents, SocketAuthDataScraper } from "@cinefinn/types/socket";
import type { SocketConsumerMeta } from "./index.js";
import { getConfig } from "../config.js";
import type { definedSocket } from "../index.js";
import { getIO } from "../utils.js";
import type { Socket } from "socket.io";
import type { Account, timestamped } from "@cinefinn/types/database";
import { Job } from "../job/Job.js";

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

    socket.on('job:log', async (jobUUID, ...logArgs) => {
        let job = jobStore.get(jobUUID);
        if (job == undefined) {
            job = await Job.fromDBUUID(jobUUID);
            return;
        }
        job.log(...logArgs);
    });

    socket.on('job:setResult', async (jobUUID, result) => {
        let job = jobStore.get(jobUUID);
        if (job == undefined) {
            job = await Job.fromDBUUID(jobUUID);
            return;
        }
        job.setResult(result);
    });

    socket.on('disconnect', () => {
        console.log('scraper disconnected');
        isScraperSocketConnected = false;
    });
}

export type definedScraperSocket = Socket<ScraperToServerEvents, ServerToScraperEvents, InterServerEvents, { auth: SocketAuthDataScraper<Account | (Account & timestamped)> }>;
export async function getScraperSocket() {
    if (isScraperSocketConnected == false) {
        return null;
    }
    const sockets = await getIO().fetchSockets();
    const scraperSocket = sockets.find(s => s.data.auth.type === 'scraper');
    if (scraperSocket == undefined) {
        return null;
    }
    return scraperSocket as any as definedScraperSocket;
}

const jobStore = new Map<string, Job>();

export async function checkForUpdates(job: Job, smart: boolean) {
    jobStore.set(job.UUID, job);
    job.on('failed', () => {
        jobStore.delete(job.UUID);
    });
    job.on('finished', () => {
        jobStore.delete(job.UUID);
    });
    const scraperSocket = await getScraperSocket();
    if (scraperSocket == null) {
        await job.log('Scraper Socket not found');
        await job.fail();
        return;
    }
    await job.log('Handing over to Scraper Socket');
    await new Promise<void>((resolve) => {
        scraperSocket.emit('job:checkForUpdates', {
            jobUUID: job.UUID,
            smart,
            index: job.data.index,
        }, (e) => {
            resolve();
        });
    });
    await job.success()
}

export default {
    meta: {
        type: 'scraper',
        authFunction,
        connectionFunction,
    } satisfies SocketConsumerMeta,
}