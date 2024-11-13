import { SerieEpisodeObject, SerieMovieObject } from './classes';

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