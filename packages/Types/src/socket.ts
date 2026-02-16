import fs = require('fs');

import type database = require("./database");
import type scrapers = require("./scrapers");

export type SocketAuthType = 'client' | 'scraper' | 'subsystem' | 'rmvcEmitter';

// export interface AuthHandshake {
//     type: SocketAuthType;
//     authToken: string;
// }

export type AuthHandshake = AuthHandshakeClient | AuthHandshakeScraper | AuthHandshakeSubsystem | AuthHandshakeRmvcEmitter;

export interface AuthHandshakeClient {
    type: 'client';
    authToken: string;
}

export interface AuthHandshakeRmvcEmitter {
    type: 'rmvcEmitter';
}

export interface AuthHandshakeScraper {
    type: 'scraper';
    authToken: string;
}

export interface AuthHandshakeSubsystem {
    type: 'subsystem';
    authToken: string;
    id: string;
    token: string;
    ptoken: string;
    readrate: number;
}


export type ServerToAnythingEvents = ServerToClientEvents & ServerToScraperEvents & ServerToSubSystemEvents;

export type AnythingToServerEvents = ClientToServerEvents & ScraperToServerEvents & SubSystemToServerEvents;

interface videoStateChangeArg {
    isPlaying: boolean;
}
interface rmvcSendActionArg {
    rmvcID: string;
    action: rmvcActions;
}

export interface ServerToClientEvents {
    // noArg: () => void;
    // basicEmit: (a: number, b: string, c: Buffer) => void;
    // withAck: (d: string, callback: (e: number) => void) => void;
    jobUpdate: (obj: (database.Job & database.timestamped)) => void;
    watchListUpdate: (obj: database.WatchHistory[]) => void;
    settingsUpdate: (obj: database.SettingsObject) => void;
    seriesReload: (obj: database.FrontendSeries[]) => void;
    adminOverview: (obj: Overview) => void;
    adminAccounts: (obj: (database.Account & database.timestamped)[]) => void;
    adminSubsystems: (obj: SubSystem[]) => void;
    adminMovingItems: (obj: database.MovingItem[]) => void;
    todoListUpdate: (obj: database.TodoItem[]) => void;

    'rmvc-recieve-action': (action: rmvcActions) => void;
    'rmvc-get-videoState': () => void;
    'rmvc-recieve-videoStateChange': (arg0: { isPlaying: boolean; }) => void;

}

type rmvcActions = 'play' | 'pause' | 'forward' | 'backward' | 'nextEp' | 'prevEp' | 'volHigh' | 'volDown';

export interface ClientToServerEvents {
    state: (obj: { url: string; }) => void;
    updateTime: (obj: { watchableUUID: string; time: number; }) => void;
    updateSettings: (obj: database.SettingsObject) => void;
    resetSettings: () => void;

    'rmvc-createSession': (cb: (sessionID: string) => void) => void;
    'rmvc-destroySession': () => void;
    'rmvc-send-videoStateChange': (arg0: videoStateChangeArg) => void;
    'rmvc-send-action': (arg0: rmvcSendActionArg) => void;
    'rmvc-connect': (arg0: { rmvcID: string; }, cb: (arg0: { status: boolean; }) => void) => void;
}

export interface ServerToScraperEvents {
    'job:checkForUpdates': (arg0: { jobUUID: string, smart: boolean, index: database.DetailedSeries[] }, callback: (arg0: { result: boolean, changedSeries: database.DetailedSeries[] }) => void) => void;
    'scrape:aniworld': (url: string, callback: (informations: scrapers.AniWorldSeriesInformations | void) => void) => void;
    'scrape:sto': (url: string, callback: (informations: scrapers.AniWorldSeriesInformations | void) => void) => void;
    'checkSerieForUpdates': (uuid: string, callback: (output: CheckForUpdatesOutput) => void) => void;
}

export interface CheckForUpdatesOutput {
    aniworld: database.ExtendedEpisodeDownload[];
    sto: database.ExtendedEpisodeDownload[];
    zoro: database.ExtendedEpisodeDownload[];
}

export interface ScraperToServerEvents {
    // noArg: () => void;
    // basicEmit: (a: number, b: string, c: Buffer) => void;
    // withAck: (d: string, callback: (e: number) => void) => void;
    'job:recrawlArchive': () => void;
    'job:generatePreviewImages': () => void;
    'job:log': (jobUUID: string, ...logArgs: any[]) => void;
    'job:setResult': (jobUUID: string, result: any) => void;
}

export interface SubSystemToServerEvents {
    'video-chunk': (obj: { chunk: string | Buffer; requestId: string; }) => void;
    'video-chunk-end': (obj: { requestId: string; }) => void;
    'video-chunk-error': (obj: { error: string; requestId: string; }) => void;
    'diskStats': (obj: DiskStats) => void;
    client_info: (info: ClientInfo) => void;
    request_file: (data: RequestFileData) => void;
    file_chunk: (data: FileChunkData) => void;
    ack: () => void;
}

export interface ServerToSubSystemEvents {
    'listFiles': (callback: (files: string[]) => void) => void;
    'videoStats': (obj: { filePath: string; }, callback: (stats: fs.Stats) => void) => void;
    'video-range': (obj: { start: number, end: number, filePath: string, requestId: string; }) => void;
    getDiskStats: () => void;
    file_start: (data: FileStartData) => void;
    file_chunk: (chunk: Buffer) => void;
    file_end: (callback: (finalPath: string | false) => void) => void;
    file_error: (data: ErrorData) => void;
    upload_ack: () => void;
    upload_complete: (data: UploadCompleteData) => void;
    upload_error: (data: ErrorData) => void;
}

export interface FileStartData {
    filename: string;
    size: number;
    md5: string;
    resultPath: string;
}

export interface ErrorData {
    message: string;
}

export interface UploadCompleteData {
    valid: boolean;
    md5: string;
}

export interface ClientInfo {
    bandwidth: number;
}

export interface RequestFileData {
    filePath: string;
}

export interface FileChunkData {
    filename: string;
    chunk: Buffer;
    isFirst: boolean;
    isLast: boolean;
    md5: string;
}


export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData<U = any> {
    auth: SocketAuthData<U>;
}

export type SocketAuthData<U = any> = SocketAuthDataClient<U> | SocketAuthDataScraper<U> | SocketAuthDataSubsystem<U> | SocketAuthDataRmvcEmitter<U>;

export interface SocketAuthDataRmvcEmitter<U = any> {
    type: 'rmvcEmitter';
    rmvcEmitterSessionID?: string;
}

export interface SocketAuthDataClient<U = any> {
    type: 'client';
    token: string;
    user: U;
    rmvcSessionID?: string;
    rmvcEmitterSessionID?: string;
}

export interface SocketAuthDataScraper<U = any> {
    type: 'scraper';
    token: string;
}

export interface SocketAuthDataSubsystem<U = any> {
    type: 'subsystem';
    token: string;
    id: string;
    ptoken: string;
    readrate: number;
}

export type SubSystem = OfflineSubSystem | OnlineSubSystem;

export interface OfflineSubSystem {
    status: 'offline';
    type: string;
    id: string;
}

export interface DiskStats {
    toalSize: number;
    availableSize: number;
    freeSize: number;
}

export interface OnlineSubSystem {
    status: 'online';
    type: string;
    id: string;
    token: string;
    ptoken: string;
    readrate: number;
    endpoint?: string;
    series: string[];
    diskStats: DiskStats | null;
}

export interface Overview {
    accounts: number,
    subsystems: {
        all: number,
        online: number,
        offline: number,
    },
    series: number,
    seasons: number,
    episodes: number,
    movies: number,
    watchableEntitys: number,
    watchHistoryEntrys: number,
    totalRuntime: number,
    playlists: number,
    ignoranceItems: number,
    sockets: number,
    scraper: boolean,
}