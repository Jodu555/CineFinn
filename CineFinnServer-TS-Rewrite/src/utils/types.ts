export interface User {
	UUID: string;
	username: string;
	email: string;
	password?: string;
	settings: SettingsObject | string;
}

type SettingsObject = {
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
		value: boolean;
	};
	showNewsAddForm: {
		value: boolean;
	};
	autoSkip: {
		value: boolean;
	};
	volume: {
		value: number;
	};
};

export interface SocketAuthObject {
	type: 'client' | 'scraper' | 'rmvc-emitter';
	token?: string;
	user?: User;
	debounce?: any;
	RMVCSessionID?: string;
	RMVCEmitterSessionID?: string;
}

import { RemoteSocket, Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';

interface videoStateChangeArg {
	isPlaying: boolean;
}
interface rmvcConnectArg {
	rmvcID: string;
}
interface rmvcSendActionArg {
	rmvcID: string;
	action: string;
}

interface ClientToServerEvents {
	timeUpdate: (obj: timeUpdateObject) => void;
	getWatchList: (obj: any) => void;
	updateSettings: (obj: SettingsObject) => void;
	resetSettings: () => void;
	'rmvc-send-sessionInfo': () => void;
	'rmvc-send-sessionStart': () => void;
	'rmvc-send-sessionStop': () => void;
	'rmvc-send-videoStateChange': (arg0: videoStateChangeArg) => void;
	'rmvc-connect': (arg0: rmvcConnectArg) => void;
	'rmvc-send-action': (arg0: rmvcSendActionArg) => void;
	todoListUpdate: (list: TodoItem[]) => void;
}

export interface timeUpdateObject {
	series: number;
	season: number;
	episode: number;
	movie: number;
	time: number;
	force: boolean;
}

export interface ExtendedSocket extends Socket<ClientToServerEvents, DefaultEventsMap, any> {
	auth: SocketAuthObject;
}
export interface ExtendedRemoteSocket extends RemoteSocket<DefaultEventsMap, any> {
	auth: SocketAuthObject;
}

export interface DatabaseWatchStringItem {
	account_UUID: string;
	watch_string: string;
}

export interface DatabaseTodoItem {
	ID: string;
	content: string;
}

export interface TodoItem {
	ID: string;
	categorie: string;
	name: string;
	order: number;
	references: SerieReference;
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

export type Langs = 'GerDub' | 'GerSub' | 'EngDub' | 'EngSub';
