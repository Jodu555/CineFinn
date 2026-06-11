import type { timestamped } from "../shared/utilities.js";

export interface Series {
    UUID: string;
    tags: string[];
    title: string;
    infos: SeriesInfos;
    refs: SeriesRefs;
}

export interface FrontendSeries extends Omit<Series & timestamped, 'seasons' | 'movies'> {
    seasons: Season[];
    movies: Movie[];
}

export interface DetailedSeries extends Omit<Series & timestamped, 'seasons' | 'movies'> {
    seasons: DetailedSeason[];
    movies: DetailedMovie[];
}

export interface DetailedSeason extends Omit<Season & timestamped, 'episodes'> {
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
}
