export interface timestamped {
    created_at: number;
    updated_at: number;
}

export interface Account {
    UUID: string;
    username: string;
    password?: string;
    email: string;
    role: number;
    settings: Record<string, string>;
    activityDetails: {
        lastHandshake: string;
        lastLogin: string;
    };
    status: 'active' | 'suspended' | 'deleted' | 'trial';
}

export interface AuthToken {
    TOKEN: string;
    account_UUID: string;
}

export interface Series {
    UUID: string;
    tags: string;
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

export type SeriesRefs = Record<'aniworld' | 'zoro' | 'sto' | string, string | Record<string, string>>;

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

export interface WatchableEntity {
    UUID: string;
    watchable_UUID: string;
    lang: string;
    subID: string;
    filePath: string;
    IV: Buffer;
    runtime: number;
    hash: string;
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