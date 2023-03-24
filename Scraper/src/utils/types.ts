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
}

export interface SerieInfo {
	image?: string | boolean;
	infos?: string;
	startDate?: string;
	endDate?: string;
	description?: string;
}

export type SerieReference = Record<'aniworld' | 'zoro' | 'sto' | string, string | Record<string, string>>;

export type Langs = 'GerDub' | 'GerSub' | 'EngDub' | 'EngSub';

export interface IgnoranceItem {
	ID?: string;
	lang?: Langs;
}

export interface ExtendedEpisodeDownload {
	_animeFolder: string;
	finished: boolean;
	folder: string;
	file: string;
	url: string;
	m3u8: string;
}
