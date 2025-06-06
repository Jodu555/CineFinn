export interface timeUpdateObject {
    series: string;
    season: number;
    episode: number;
    movie: number;
    time: number;
    force: boolean;
}

export interface SerieObject {
    ID: string;
    categorie: string;
    title: string;
    seasons: SerieEpisodeObject[][];
    movies: SerieMovieObject[];
    references: SerieReference;
    infos: SerieInfo;
}

export interface SerieEpisodeObject {
    filePath: string;
    primaryName: string;
    secondaryName: string;
    season: number;
    episode: number;
    langs: Langs[];
    subID: string;
}
export interface SerieEpisode {
    filePath: string;
    primaryName: string;
    secondaryName: string;
    season: number;
    episode: number;
    langs: Langs[];
    subID: string;
}
export interface SerieMovieObject {
    filePath: string;
    primaryName: string;
    secondaryName: string;
    langs: Langs[];
    subID: string;
}
export interface SerieMovie {
    filePath: string;
    primaryName: string;
    secondaryName: string;
    langs: Langs[];
    subID: string;
}

export interface SerieInfo {
    image?: boolean;
    imageURL?: string;
    infos?: string;
    title?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    disabled?: boolean;
}

export interface Serie {
    ID: string;
    categorie: string;
    title: string;
    seasons: SerieEntity[][];
    movies: SerieEntity[];
    references: SerieReference;
    infos: SerieInfo;
}

export interface SerieEntity {
    filePath: string;
    primaryName: string;
    secondaryName: string;
    season: number;
    episode: number;
    langs: Langs[];
    subID: string;
}

export type SerieReference = Record<'aniworld' | 'zoro' | 'sto' | string, string | Record<string, string>>;

export type Langs = 'GerDub' | 'GerSub' | 'EngDub' | 'EngSub' | 'JapDub' | 'EngSubK' | 'GerSubK' | 'GerSubC' | 'EngSubC';


export interface IgnoranceItem {
    ID?: string;
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

export interface Segment {
    ID: string;
    season: number;
    episode: number;
    movie: number;
    time: number;
    watched: boolean;
}
