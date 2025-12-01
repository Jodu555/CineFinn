import type database = require("./database");

type AuthType = 'client' | 'scraper' | 'subsystem';

export interface AuthHandshake {
    type: AuthType;
    authToken: string;
}

export interface ServerToClientEvents {
    noArg: () => void;
    basicEmit: (a: number, b: string, c: Buffer) => void;
    withAck: (d: string, callback: (e: number) => void) => void;
    jobUpdate: (obj: (database.Job & database.timestamped)) => void;
    watchListUpdate: (obj: database.WatchHistory[]) => void;
}

export interface ClientToServerEvents {
    hello: () => void;
    updateTime: (obj: { watchableUUID: string; time: number; }) => void;
}

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData<U = any> {
    auth: SocketAuthData<U>;
}

type SocketAuthData<U = any> = SocketAuthDataClient<U> | SocketAuthDataScraper<U> | SocketAuthDataSubsystem<U>;

interface SocketAuthDataClient<U = any> {
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