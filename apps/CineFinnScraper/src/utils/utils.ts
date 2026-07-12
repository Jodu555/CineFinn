import fs from 'fs';
import type { CallJobResponse, ExtendedEpisodeDownload, JobType, ScraperToServerEvents, ServerToScraperEvents } from "@cinefinn/types";
import path from "path";
import type { Socket } from "socket.io-client";

let coreSocket: Socket<ServerToScraperEvents, ScraperToServerEvents>;

export const getCoreSocket = () => {
    return coreSocket;
};

export const setCoreSocket = (socket: Socket<ServerToScraperEvents, ScraperToServerEvents>) => {
    coreSocket = socket;
};

let ptoken: string;

export const getPtoken = () => {
    return ptoken;
};

export const setPtoken = (token: string) => {
    ptoken = token;
};

const humanInterventionListPath = path.join(process.cwd(), 'hiList.json');

export const getHumanInterventionList = (): ExtendedEpisodeDownload[] => {
    if (fs.existsSync(humanInterventionListPath) == false) {
        return [];
    }
    const fileData = fs.readFileSync(humanInterventionListPath, 'utf-8');
    const list = JSON.parse(fileData) as ExtendedEpisodeDownload[];
    return list;
};

export const setHumanInterventionList = (list: ExtendedEpisodeDownload[]) => {
    fs.writeFileSync(humanInterventionListPath, JSON.stringify(list, null, 3));
};

export async function callJob(type: JobType, blocking = false, timeout = 1000 * 60 * 10) {
    return new Promise<CallJobResponse>((resolve, reject) => {
        getCoreSocket().timeout(timeout).emit('callJob', type, blocking, (err, response) => {
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