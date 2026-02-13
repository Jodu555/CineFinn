import type { AniWorldSeriesInformations } from "./scrapers.js";

export type ValueOf<T> = T[keyof T];
export interface timestamped {
    created_at: number;
    updated_at: number;
}

export enum Role {
    Admin = 3,
    Mod = 2,
    User = 1,
}

export interface Account {
    UUID: string;
    username: string;
    password?: string;
    email: string;
    role: Role; // See above for the role enum
    settings: SettingsObject;
    emailVerifyCode: string;
    activityDetails: {
        lastHandshake: string;
        lastLogin: string;
    };
    status: 'active' | 'suspended' | 'deleted' | 'trial';
}

type SettingsObjectType = 'hide' | 'text' | 'select' | 'checkbox';

type SettingsValueCheckbox = {
    title: string;
    value: boolean;
    type: 'checkbox';
};

type SettingsValueText = {
    title: string;
    value: string;
    type: 'text';
};

type SettingsValueSelect = {
    title: string;
    value: string;
    type: 'select';
    options: string[];
};

type SettingsValueHide = {
    value: string;
    type: 'hide';
};

type SettingsKey = 'preferredLanguage' | 'showVideoTitleContainer' | 'showLatestWatchButton' | 'developerMode' | 'showNewsAddForm' | 'autoSkip' | 'skipSegments' | 'enableBetaFeatures' | 'volume';

export type SettingsObject = {
    preferredLanguage: {
        title: string;
        value: string;
        type: 'select';
        options: string[];
    };
    showVideoTitleContainer: {
        title: string;
        type: 'checkbox';
        value: boolean;
    };
    showLatestWatchButton: {
        title: string;
        type: 'checkbox';
        value: boolean;
    };
    developerMode: {
        title: string;
        type: 'checkbox';
        value: boolean;
    };
    autoSkip: {
        title: string;
        type: 'checkbox';
        value: boolean;
    };
    skipSegments: {
        title: string;
        type: 'checkbox';
        value: boolean;
    };
    enableBetaFeatures: {
        title: string;
        type: 'checkbox';
        value: boolean;
    };
    volume: {
        type: 'hide';
        value: number;
    };
};

export interface AuthToken {
    TOKEN: string;
    account_UUID: string;
}

export interface Email {
    UUID: string;
    account_UUID: string;
    email_type: EmailTypes;
    status: EmailStatus;
    subject: string;
    html: string;
    text: string;
    data: string;
    sent_at: number;
    created_at: number;
}

export type EmailTypes = 'VERIFICATION' | 'PASSWORD_RESET';
export type EmailStatus = 'PENDING' | 'SENT';

export interface Series {
    UUID: string;
    tags: string[];
    title: string;
    infos: SeriesInfos;
    refs: SeriesRefs;
}

export interface FrontendSeries extends Omit<Series, 'seasons' | 'movies'> {
    seasons: Season[];
    movies: Movie[];
}

export interface DetailedSeries extends Omit<Series, 'seasons' | 'movies'> {
    seasons: DetailedSeason[];
    movies: DetailedMovie[];
}

export interface DetailedSeason extends Omit<Season, 'episodes'> {
    episodes: DetailedEpisode[];
}

export interface DetailedEpisode extends Episode {
    watchableEntitys: WatchableEntity[];
}

export interface DetailedMovie extends Movie {
    watchableEntitys: WatchableEntity[];
}

export type SeriesRefs = Record<'aniworld' | 'zoro' | 'sto' | string, string>;

export interface SeriesInfos {
    image?: boolean;
    imageURL?: string;
    infos?: string;
    title?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    disabled?: boolean;
}

export interface Season {
    UUID: string;
    serie_UUID: string;
    season_IDX: number;
    episodes: number;
}

export interface Episode {
    UUID: string;
    serie_UUID: string;
    season_UUID: string;
    season_IDX: number;
    episode_IDX: number;
}

export interface Movie {
    UUID: string;
    primaryName: string;
    serie_UUID: string;
    movie_IDX: number;
}

export type Langs = 'GerDub' | 'GerSub' | 'EngDub' | 'EngSub' | 'JapDub' | 'EngSubK' | 'GerSubK' | 'GerSubC' | 'EngSubC';

export interface WatchableEntity {
    UUID: string;
    serie_UUID: string;
    watchable_UUID: string;
    lang: Langs;
    subID: string;
    filePath: string;
    runtime: number;
    // IV: string;
    // hash: string;
}

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



export interface IgnoranceItem {
    serie_UUID: string;
    lang?: Langs;
}

export interface ExtendedEpisodeDownload {
    _categorie?: string;
    _animeFolder: string;
    finished: boolean;
    folder: string;
    file: string;
    url: string;
    m3u8: string;
}

export interface Playlist {
    UUID: string;
    account_UUID: string;
    name: string;
    description: string;
    items: string[];
    settings: PlaylistSettings;
}

export type FrontendPlaylist = Playlist & timestamped;

export interface PlaylistSettings {
    sendEmailOnUpdate: boolean;
}




export type TodoReferences = Record<keyof RefRef, string>;

export type RefRef = {
    'aniworld': undefined | AniWorldSeriesInformations;
    'sto': undefined | AniWorldSeriesInformations;
};

export interface TodoItem {
    ID: string;
    sortOrder: number;
    name: string;
    creator: string;
    categorie: 'Aniworld' | 'STO' | 'KDrama';
    refs: TodoReferences;
    scrapingInfo?: {
        [key in keyof Partial<RefRef>]: ScrapeInfo<key>;
    };
    edited?: boolean;
}

export type ScrapeInfo<K extends keyof RefRef> = ScrapeInfoDefaults<K> & (LoadingErrorScrapeInfo | SuccessScrapeInfo<K>);

type ScrapeInfoDefaults<K> = {
    key: K;
    scrapedAt: number;
    message: string;
}

type LoadingErrorScrapeInfo = {
    state: 'loading' | 'error';
    data: undefined;
};

type SuccessScrapeInfo<K extends keyof RefRef> = {
    state: 'success';
    data: RefRef[K];
};


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
        isAdditional: boolean; // Wether the Item was system generated or additionally by an admin
    };
}