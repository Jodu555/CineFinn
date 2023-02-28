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

export type Langs = 'GerDub' | 'GerSub' | 'EngDub' | 'EngSub';

export type SerieReference = Record<'aniworld' | 'zoro' | 'sto', string>;
