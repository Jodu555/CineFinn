import fs = require('fs');

import type database = require("./database");
import type scrapers = require("./scrapers");

export type SocketAuthType = 'client' | 'scraper' | 'subsystem';

// export interface AuthHandshake {
//     type: SocketAuthType;
//     authToken: string;
// }

export type AuthHandshake = AuthHandshakeClient | AuthHandshakeScraper | AuthHandshakeSubsystem;

export interface AuthHandshakeClient {
    type: 'client';
    authToken: string;
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
    todoListUpdate: (obj: database.TodoItem[]) => void;
}

export interface ServerToScraperEvents {
    'job:checkForUpdates': (index: [database.DetailedSeries], callback: (chanedSeries: database.DetailedSeries[]) => void) => void;
    'scrape:aniworld': (url: string, callback: (informations: scrapers.AniWorldSeriesInformations | void) => void) => void;
    'scrape:sto': (url: string, callback: (informations: scrapers.AniWorldSeriesInformations | void) => void) => void;
}

export interface ClientToServerEvents {
    state: (obj: { url: string; }) => void;
    updateTime: (obj: { watchableUUID: string; time: number; }) => void;
    updateSettings: (obj: database.SettingsObject) => void;
    resetSettings: () => void;
}

export interface ScraperToServerEvents {
    // noArg: () => void;
    // basicEmit: (a: number, b: string, c: Buffer) => void;
    // withAck: (d: string, callback: (e: number) => void) => void;
    'job:recrawlArchive': () => void;
    'job:generatePreviewImages': () => void;
}

export interface SubSystemToServerEvents {
    'video-chunk': (obj: { chunk: string | Buffer; requestId: string; }) => void;
    'video-chunk-end': (obj: { requestId: string; }) => void;
    'video-chunk-error': (obj: { error: string; requestId: string; }) => void;
}

export interface ServerToSubSystemEvents {
    'listFiles': (callback: (files: string[]) => void) => void;
    'videoStats': (obj: { filePath: string; }, callback: (stats: fs.Stats) => void) => void;
    'video-range': (obj: { start: number, end: number, filePath: string, requestId: string; }) => void;
}


export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData<U = any> {
    auth: SocketAuthData<U>;
}

export type SocketAuthData<U = any> = SocketAuthDataClient<U> | SocketAuthDataScraper<U> | SocketAuthDataSubsystem<U>;

export interface SocketAuthDataClient<U = any> {
    type: 'client';
    token: string;
    user: U;
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

export interface OnlineSubSystem {
    status: 'online';
    type: string;
    id: string;
    token: string;
    ptoken: string;
    readrate: number;
    endpoint?: string;
    series: string[];
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
    playlists: number,
    sockets: number,
    scraper: boolean,
}