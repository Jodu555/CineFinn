import type { Langs } from "../models/media.js";
import type { AniWorldSeriesInformations } from "../scrapers/aniworld.js";
import type { ExtendedZoroEpisode } from "../scrapers/zoro.js";

export interface AniWorldSerieCompare extends AniWorldSeriesInformations {
    UUID: string;
    title: string;
    references: import("../models/media.js").SeriesRefs;
}

export interface ChangedZoroEpisode extends Omit<ExtendedZoroEpisode, 'langs'> {
    langs: Langs[];
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

export interface IgnoranceItem {
    serie_UUID: string;
    lang?: Langs;
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
