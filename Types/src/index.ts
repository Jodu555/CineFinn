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

export interface MovingItem {
    ID: string;
    seriesID: string;
    fromSubID: string;
    toSubID: string;
    filePath: string;
    meta: {
        progress: number;
        isMoving: boolean;
        result: string;
        isAdditional: boolean;
    };
}