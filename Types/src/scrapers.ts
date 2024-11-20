import type { Langs } from './classes';

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

export interface AnixEpisode {
    title: string;
    langs: string[];
    slug: string;
    number: string;
    ids: string;
}

export interface AnixSeasonInformation {
    slug: string;
    IDX: string;
    title: string;
}

export interface AnixSeriesInformation {
    title: string;
    image: string;
    subCount: number;
    dubCount: number;
    episodeCount: number;
    seasons: AnixEpisode[][];
}

export interface MyAsianSeries {
    url: string;
    title: string;
    informations: MyAsianInformations;
    episodes: MyAsianEpisode[];
}

export interface MyAsianInformations {
    year: string;
    status: string;
    genres: string[];
    description: string;
    image: string;
}

export interface MyAsianEpisode {
    number: number;
    slug: string;
    url: string;
    title: string;
    langs: ('Subtitle' | 'Raw')[];
    year: string;
}


export interface SimpleZoroEpisode {
    ID: string;
    title: string;
    number: string;
    url: string;
}

export interface ExtendedZoroEpisode extends SimpleZoroEpisode {
    langs: string[];
    streamingServers: StreamingServers[];
}

export interface StreamingServers {
    type: 'sub' | 'dub';
    ID: string;
    serverIndex: string;
    name: string;
}

export interface ZoroSeasonInformation {
    ID: string;
    IDX: string;
    title: string;
}

export interface ZoroSeriesInformation {
    title: string;
    image: string;
    subCount: number;
    dubCount: number;
    episodeCount: number;
    seasons: ExtendedZoroEpisode[][];
}

export interface ZoroReturn {
    total: number;
    episodes: ExtendedZoroEpisode[];
}