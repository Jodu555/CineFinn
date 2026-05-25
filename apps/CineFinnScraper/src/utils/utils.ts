import type { ExtendedEpisodeDownload, ScraperToServerEvents, ServerToScraperEvents } from "@cinefinn/types";
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