import { Request } from 'express';
import { RemoteSocket, Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { Langs, TodoItem, timeUpdateObject } from './classes';

export enum Role {
	Admin = 3,
	Mod = 2,
	User = 1
}

export interface User {
	UUID: string;
	username: string;
	email: string;
	password?: string;
	settings: SettingsObject | string;
	role: Role
	activityDetails: ActivityDetails | string;
}

export type ActivityDetails = {
	lastIP?: string,
	lastHandshake?: string,
	lastLogin?: string,
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
	}
	volume: {
		type: 'hide';
		value: number;
	};
};

export interface AuthCredentials {
	user: User;
}

export interface AuthenticatedRequest extends Request {
	credentials: AuthCredentials;
}

export interface SocketAuthObject {
	type: 'client' | 'scraper' | 'rmvc-emitter';
	token?: string;
	user?: User;
	debounce?: any;
	RMVCSessionID?: string;
	RMVCEmitterSessionID?: string;
}

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
	'sync-create': (obj: { ID: number }) => void;
	'sync-join': (obj: { ID: number }) => void;
	'sync-leave': (obj: { ID: number }) => void;
	'sync-selectSeries': (obj: { ID: number }) => void;
	'sync-video-change': (obj: { season: number, episode: number, movie: number, langchange: Boolean, lang: Langs }) => void;
	'sync-video-action': (obj: { action: VideoAction, value: boolean | string, time?: string }) => void;
	'sync-video-info': (obj: { currentTime: number, isPlaying: boolean }) => void;
}


export type VideoAction = 'sync-playback' | 'sync-skip' | 'sync-skipTimeline';
export interface ExtendedSocket extends Socket<ClientToServerEvents, DefaultEventsMap, any> {
	auth: SocketAuthObject;
	sync?: any;
}
export interface ExtendedRemoteSocket extends RemoteSocket<DefaultEventsMap, any> {
	auth: SocketAuthObject;
	sync?: { ID: number | string };
}