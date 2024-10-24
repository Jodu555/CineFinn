import type { AniWorldSeriesInformations, AnixSeriesInformation, ZoroReturn, ZoroSeriesInformation } from './scraper';

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
	subID: string;
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
	disabled?: boolean;
}

export type SerieReference = Record<'aniworld' | 'zoro' | 'sto' | string, string>;
// export type SerieReference = Record<'aniworld' | 'zoro' | 'sto' | string, string | Record<string, string>>;

export type Langs = '' | 'GerDub' | 'GerSub' | 'EngDub' | 'EngSub' | 'JapDub';

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
	skipSegments: {
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

export interface Segment {
	ID: string;
	season: number;
	episode: number;
	movie: number;
	time: number;
	watched: boolean;
}

export interface NewsItem {
	time: number;
	content: string;
}

export type References = Record<'aniworld' | 'zoro' | 'anix' | 'sto', string>;

export interface TodoItem {
	ID: string;
	order: number;
	name: string;
	creator?: string;
	categorie: 'Aniworld' | 'STO' | 'KDrama' | '';
	references: References;
	scraped?: AniWorldSeriesInformations | true;
	scrapedZoro?: ZoroReturn | true;
	scrapednewZoro?: ZoroSeriesInformation | true;
	scrapedAnix?: AnixSeriesInformation | true;
	scrapingError?: string;
	edited?: boolean;
}

export type BrowseSerie = Serie & { url?: string; };

export interface SyncRoomEntityInfos {
	season: number;
	episode: number;
	movie: number;
	lang: Langs;
}

export interface SyncRoomMember {
	UUID: string;
	name: string;
	role: number;
}

export interface SyncRoomItem {
	ID: string;
	seriesID: string;
	entityInfos?: SyncRoomEntityInfos;
	members?: SyncRoomMember[];
	created_at: number;
}
