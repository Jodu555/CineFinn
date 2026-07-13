import type { Langs } from "../models/media.js";

export interface AniWorldEntity {
    mainName: string;
    secondName: string;
    langs: Langs[];
}

export interface AniWorldAdditionalSeriesInformations {
    infos: string;
    startDate: string;
    endDate: string;
    description: string;
    image: string | boolean;
}

export interface AniWorldSeriesInformations {
    url: string;
    informations: AniWorldAdditionalSeriesInformations;
    hasMovies: boolean;
    movies?: AniWorldEntity[];
    seasons: AniWorldEntity[][];
}


export type Calendar<T> = Record<number, T[]>;

export interface CalendarEntry {
    type: 'aniworld' | 'sto';
    href: string;
    title: string;
    parsed: {
        filmID: string | null;
        season: string | null;
        episode: string | null;
        serieSlug: string;
    }
}

export type StoCalendarEntry = CalendarEntry & {
    type: 'sto';
}

export type AniworldCalendarEntry = CalendarEntry & {
    type: 'aniworld';
    additionalInfo?: {
        marker: string;
        releasedAt: string;
    }
}