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
