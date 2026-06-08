import type * as database from "../models/index.js";
import type { Job, WatchHistory, SettingsObject, FrontendSeries, Account, MovingItem, DetailedSeries } from "../models/index.js";
import type { TodoItem, ExtendedEpisodeDownload } from "../shared/crawler.js";
import type { AniWorldSeriesInformations } from "../scrapers/aniworld.js";
import type { SocketAuthData } from "./auth.js";
import type { SubSystem, DiskStats, Overview, ClientInfo, RequestFileData, FileChunkData, FileStartData, ErrorData, UploadCompleteData } from "./subsystem.js";
import type * as fs from "fs";
import type { FranchiseDataExtended } from "../models/franchise.js";

type rmvcActions = 'play' | 'pause' | 'forward' | 'backward' | 'nextEp' | 'prevEp' | 'volHigh' | 'volDown';

interface videoStateChangeArg {
    isPlaying: boolean;
}

interface rmvcSendActionArg {
    rmvcID: string;
    action: rmvcActions;
}

export interface ServerToClientEvents {
    jobUpdate: (obj: (Job & database.timestamped)) => void;
    watchListUpdate: (obj: WatchHistory[]) => void;
    settingsUpdate: (obj: SettingsObject) => void;
    seriesReload: (obj: FrontendSeries[]) => void;
    adminOverview: (obj: Overview) => void;
    adminAccounts: (obj: (Account & database.timestamped)[]) => void;
    adminSubsystems: (obj: SubSystem[]) => void;
    adminMovingItems: (obj: MovingItem[]) => void;
    todoListUpdate: (obj: TodoItem[]) => void;
    franchisesUpdate: (obj: FranchiseDataExtended[]) => void;
    recommendationsAdd: (obj: any[]) => void;

    'rmvc-recieve-action': (action: rmvcActions) => void;
    'rmvc-get-videoState': () => void;
    'rmvc-recieve-videoStateChange': (arg0: { isPlaying: boolean; }) => void;

    reload: () => void;
}

export interface ClientToServerEvents {
    state: (obj: { url: string; }) => void;
    updateTime: (obj: { watchableUUID: string; time: number; }) => void;
    updateSettings: (obj: SettingsObject) => void;
    resetSettings: () => void;

    'rmvc-createSession': (cb: (sessionID: string) => void) => void;
    'rmvc-destroySession': () => void;
    'rmvc-send-videoStateChange': (arg0: videoStateChangeArg) => void;
    'rmvc-send-action': (arg0: rmvcSendActionArg) => void;
    'rmvc-connect': (arg0: { rmvcID: string; }, cb: (arg0: { status: boolean; }) => void) => void;
}

export interface ServerToScraperEvents {
    'job:checkForUpdates': (arg0: { jobUUID: string, smart: boolean, index: DetailedSeries[]; alreadyCheckedForUpdates: string[] }, callback: (arg0: { result: boolean, changedSeries: DetailedSeries[]; }) => void) => void;
    'scrape:aniworld': (url: string, callback: (informations: AniWorldSeriesInformations | void) => void) => void;
    'scrape:sto': (url: string, callback: (informations: AniWorldSeriesInformations | void) => void) => void;
    'checkSerieForUpdates': (serieUUID: string, callback: (output: CheckForUpdatesOutput) => void) => void;
}

export interface CheckForUpdatesOutput {
    aniworld: ExtendedEpisodeDownload[];
    sto: ExtendedEpisodeDownload[];
    zoro: ExtendedEpisodeDownload[];
}

export interface ScraperToServerEvents {
    'job:recrawlArchive': () => void;
    'job:generatePreviewImages': () => void;
    'job:log': (jobUUID: string, ...logArgs: any[]) => void;
    'job:setResult': (jobUUID: string, result: any) => void;
    'callJob': (type: database.JobType, blocking: boolean, callback: (response: database.CallJobResponse) => void) => void;
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
    pull_file_start: (data: { size: number }) => void;
    pull_file_chunk: (chunk: Buffer) => void;
    pull_file_end: (md5: string, callback: (result: string | false) => void) => void;
    pull_file_error: (data: { message: string }) => void;
}

export interface ServerToSubSystemEvents {
    'listFiles': (callback: (files: string[]) => void) => void;
    'videoStats': (obj: { filePath: string; }, callback: (stats: fs.Stats) => void) => void;
    'video-range': (obj: { start: number, end: number, filePath: string, requestId: string; }) => void;
    getDiskStats: () => void;
    file_start: (data: FileStartData) => void;
    file_chunk: (chunk: Buffer) => void;
    file_end: (md5: string, callback: (finalPath: string | false) => void) => void;
    file_error: (data: ErrorData) => void;
    upload_ack: () => void;
    upload_complete: (data: UploadCompleteData) => void;
    upload_error: (data: ErrorData) => void;
    pull_request: (data: { filePath: string; bandwidth: number }) => void;
    pull_ack: () => void;
    pull_file_error: (data: { message: string }) => void;
}

export type ServerToAnythingEvents = ServerToClientEvents & ServerToScraperEvents & ServerToSubSystemEvents;

export type AnythingToServerEvents = ClientToServerEvents & ScraperToServerEvents & SubSystemToServerEvents;

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData<U = any> {
    auth: SocketAuthData<U>;
}

