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

export interface Series {
    UUID: string;
    tags: string;
    title: string;
    infos: SeriesInfos;
    refs: SeriesRefs;
    movies: Movie[];
    seasons: Season[];
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
    IV: any;
    runtime: number;
    hash: string;
}

export interface WatchHistory {
    UUID: string;
    account_UUID: string;
    watchable_UUID: string;
    watchTime: number;
}