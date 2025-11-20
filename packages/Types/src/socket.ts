import type database = require("./database");

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
    auth: {
        token: string;
        user: U
    }
}