export interface Serie {
	ID: string;
	categorie: string;
	title: string;
	seasons: SerieEpisode[][];
	movies: SerieMovie[];
	references: SerieReference;
	infos: SerieInfo;
}

export interface SerieEpisode {
	filePath: string;
	primaryName: string;
	secondaryName: string;
	season: number;
	episode: number;
	langs: Langs[];
}
export interface SerieMovie {
	filePath: string;
	primaryName: string;
	secondaryName: string;
	langs: Langs[];
}

export interface SerieInfo {
	image?: boolean;
	imageURL?: string;
	infos?: string;
	title?: string;
	startDate?: string;
	endDate?: string;
	description?: string;
}

export type SerieReference = Record<'aniworld' | 'zoro' | 'sto' | string, string>;
// export type SerieReference = Record<'aniworld' | 'zoro' | 'sto' | string, string | Record<string, string>>;

export type Langs = 'GerDub' | 'GerSub' | 'EngDub' | 'EngSub' | 'JapDub';

export interface Job {
	id: string;
	name: string;
	callpoint: string;
	role: number;
	running: boolean;
	lastRun: number;
}

export interface Setting {
	title: string;
	value: string | boolean | number;
	type?: 'checkbox' | 'hide';
}

export type SettingsObject = {
	preferredLanguage: {
		title: string;
		value: string;
	};
	showVideoTitleContainer: {
		title: string;
		type: string;
		value: boolean;
	};
	showLatestWatchButton: {
		title: string;
		type: string;
		value: boolean;
	};
	developerMode: {
		title: string;
		value: boolean;
		type: string;
	};
	showNewsAddForm: {
		title: string;
		type: string;
		value: boolean;
	};
	autoSkip: {
		title: string;
		value: boolean;
		type: string;
	};
	enableBetaFeatures: {
		title: string;
		value: boolean;
		type: string;
	};
	volume: {
		type: 'hide';
		value: number;
	};
};
