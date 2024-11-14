import { Langs } from './classes';
import { AniWorldSeriesInformations, ZoroReturn, ZoroSeriesInformation, AnixSeriesInformation, MyAsianSeries } from './scrapers';

export interface DatabaseWatchStringItem {
    account_UUID: string;
    watch_string: string;
}

export interface DatabaseJobItem {
    ID: string;
    lastRun: number;
    running: 'true' | 'false';
}

export interface DatabaseNewsItem {
    time: number;
    content: string;
}

export interface DatabaseTodoItem {
    ID: string;
    content: string;
}
export interface DatabaseParsedTodoItem {
    ID: string;
    order: number;
    name: string;
    creator?: string;
    categorie: 'Aniworld' | 'STO' | 'KDrama';
    references: TodoReferences;
    scraped?: AniWorldSeriesInformations | true;
    scrapedZoro?: ZoroReturn | true;
    scrapednewZoro?: ZoroSeriesInformation | true;
    scrapedAnix?: AnixSeriesInformation | true;
    scrapedMyasiantv?: MyAsianSeries | true;
    scrapingError?: string;
}

export type TodoReferences = Record<'aniworld' | 'zoro' | 'anix' | 'sto' | 'myasiantv', string>;

export interface DatabaseSyncRoomEntityInfos {
    season: number;
    episode: number;
    movie: number;
    lang: Langs;
}

export interface DatabaseSyncRoomMember {
    UUID: string;
    name: string;
    role: number;
}

export interface DatabaseSyncRoomItem {
    ID: string;
    seriesID: string;
    entityInfos?: string;
    members: string;
    created_at: number;
}

export interface DatabaseParsedSyncRoomItem {
    ID: string;
    seriesID: string;
    entityInfos?: DatabaseSyncRoomEntityInfos;
    members?: DatabaseSyncRoomMember[];
    created_at: number;
}
