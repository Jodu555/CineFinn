import type database = require("./database");

export type SocketAuthType = 'client' | 'scraper' | 'subsystem';

export interface AuthHandshake {
    type: SocketAuthType;
    authToken: string;
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
}

export interface ServerToScraperEvents {
    'job:checkForUpdates': (index: [database.DetailedSeries], callback: (chanedSeries: database.DetailedSeries[]) => void) => void;
}

export interface ClientToServerEvents {
    state: (obj: { url: string }) => void;
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

}

export interface ServerToSubSystemEvents {
    'listFiles': (callback: (files: string[]) => void) => void;
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
    user: U
}

export interface SocketAuthDataScraper<U = any> {
    type: 'scraper';
    token: string;
}

export interface SocketAuthDataSubsystem<U = any> {
    type: 'subsystem';
    token: string;
}