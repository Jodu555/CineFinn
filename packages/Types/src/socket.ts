import type database = require("./database");

export interface ServerToClientEvents {
    noArg: () => void;
    basicEmit: (a: number, b: string, c: Buffer) => void;
    withAck: (d: string, callback: (e: number) => void) => void;
    // addClick: (obj: { count: number; }) => void;
    jobUpdate: (obj: (database.Job & database.timestamped)) => void;
}

export interface ClientToServerEvents {
    hello: () => void;
    // clicked: (obj: { count: number; }) => void;
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