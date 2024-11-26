import type { SerieEpisode, SerieEpisodeObject, SerieMovie, SerieMovieObject } from './classes';

export interface JobMeta {
    serieID: string;
    entity: SerieEpisodeObject | SerieMovieObject;
    lang: string;
    filePath: string;
    output: string;
    imagePathPrefix: string;
    publicStreamURL: string;
    readrate: number;
    generatorName?: string;
}
export interface SubSystem {
    id: string;
    ptoken: string;
    endpoint: string;
    readrate: number;
    affectedSeriesIDs: string[];
    type: 'sub';
}