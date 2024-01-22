export interface timeUpdateObject {
	series: string;
	season: number;
	episode: number;
	movie: number;
	time: number;
	force: boolean;
}

export interface TodoItem {
	ID: string;
	categorie: string;
	name: string;
	order: number;
	references: SerieReference;
}

export interface ActiveJob {
	id: string;
	name: string;
	startTime: number;
	data: any;
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
}
export interface SerieMovieObject {
	filePath: string;
	primaryName: string;
	secondaryName: string;
	langs: Langs[];
}

export interface SerieInfo {
	image?: string | boolean;
	infos?: string;
	title?: string;
	startDate?: string;
	endDate?: string;
	description?: string;
}

export type SerieReference = Record<'aniworld' | 'zoro' | 'sto' | string, string | Record<string, string>>;

export type Langs = 'GerDub' | 'GerSub' | 'EngDub' | 'EngSub' | 'JapDub';
