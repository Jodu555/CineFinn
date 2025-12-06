import type database = require("./database");

type AuthType = 'client' | 'scraper' | 'subsystem';

export interface AuthHandshake {
    type: AuthType;
    authToken: string;
}

export type ServerToAnythingEvents = ServerToClientEvents & ServerToScraperEvents;

export type AnythingToServerEvents = ClientToServerEvents & ScraperToServerEvents;

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
    hello: () => void;
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

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData<U = any> {
    auth: SocketAuthData<U>;
}

type SocketAuthData<U = any> = SocketAuthDataClient<U> | SocketAuthDataScraper<U> | SocketAuthDataSubsystem<U>;

export interface SocketAuthDataClient<U = any> {
    type: 'client';
    token: string;
    user: U
}

interface SocketAuthDataScraper<U = any> {
    type: 'scraper';
    token: string;
}

interface SocketAuthDataSubsystem<U = any> {
    type: 'subsystem';
    token: string;
}