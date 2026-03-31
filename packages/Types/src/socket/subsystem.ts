export type SubSystem = OfflineSubSystem | OnlineSubSystem;

export interface OfflineSubSystem {
    status: 'offline';
    type: string;
    id: string;
    series: string[];
    endpoint: false;
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
    bandwidth: number;
    endpoint: string | false;
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

export interface FileStartData {
    filename: string;
    size: number;
    resultPath: string;
}

export interface ErrorData {
    message: string;
}

export interface UploadCompleteData {
    valid: boolean;
    md5: string;
}
