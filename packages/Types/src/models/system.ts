export interface WatchHistory {
    UUID: string;
    account_UUID: string;
    series_UUID: string;
    watchable_UUID: string;
    watchTime: number;
}

export interface SyncRoom {
    UUID: string;
    series_UUID: string;
    watchableEntity_UUID: string;
    members: SyncRoomMember[];
}

export interface SyncRoomMember {
    UUID: string;
    username: string;
    role: number;
}

export type JobType = 'crawl' | 'generatePreviewImages' | 'checkForUpdates-smart' | 'checkForUpdates-old';

export interface Job {
    UUID: string;
    type: JobType;
    failed_at: number;
    finished_at: number;
    logs: string[];
    data: any;
    result: any;
}

export interface MovingItem {
    ID: string;
    serie_UUID: string;
    fromSubID: string;
    toSubID: string;
    watchableEntityUUID: string;
    meta: {
        progress: number;
        movingStarted: number;
        result: string;
        isAdditional: boolean;
    };
}
