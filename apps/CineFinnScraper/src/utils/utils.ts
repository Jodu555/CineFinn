import type { CallJobResponse, ExtendedEpisodeDownload, JobType, ScraperToServerEvents, ServerToScraperEvents } from "@cinefinn/types";
import type { Socket } from "socket.io-client";

let humanInterventionList: ExtendedEpisodeDownload[] = [];

let coreSocket: Socket<ServerToScraperEvents, ScraperToServerEvents>;

export const getCoreSocket = () => {
    return coreSocket;
};

export const setCoreSocket = (socket: Socket<ServerToScraperEvents, ScraperToServerEvents>) => {
    coreSocket = socket;
};

export const getHumanInterventionList = () => {
    return humanInterventionList;
};

export const setHumanInterventionList = (list: ExtendedEpisodeDownload[]) => {
    humanInterventionList = list;
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