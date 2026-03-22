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
    ID: string;
    title: string;
    image: string;
    subCount: number;
    dubCount: number;
    episodeCount: number;
    seasons: AnixEpisode[][];
}
