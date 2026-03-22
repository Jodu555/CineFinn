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
