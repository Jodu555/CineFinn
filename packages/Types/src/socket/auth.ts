export type SocketAuthType = 'client' | 'scraper' | 'subsystem' | 'rmvcEmitter';

export type AuthHandshake = AuthHandshakeClient | AuthHandshakeScraper | AuthHandshakeSubsystem | AuthHandshakeRmvcEmitter;

export interface AuthHandshakeClient {
    type: 'client';
    authToken: string; // This is the authToken for a user
    uniqueID: string; // This is the uniqueID for the socket which is known on SSR and SPA
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
    bandwidth: number;
    endpoint: string | false;
}

export type SocketAuthData<U = any> = SocketAuthDataClient<U> | SocketAuthDataScraper<U> | SocketAuthDataSubsystem<U> | SocketAuthDataRmvcEmitter<U>;

export interface SocketAuthDataRmvcEmitter<U = any> {
    type: 'rmvcEmitter';
    rmvcEmitterSessionID?: string;
}

export interface SocketAuthDataClient<U = any> {
    type: 'client';
    token: string;
    uniqueID: string;
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
    bandwidth: number;
    endpoint: string | false;
}
