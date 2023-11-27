import { Request } from 'express';
import { RemoteSocket, Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { TodoItem, timeUpdateObject } from './classes';

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
}
export interface ExtendedSocket extends Socket<ClientToServerEvents, DefaultEventsMap, any> {
	auth: SocketAuthObject;
}
export interface ExtendedRemoteSocket extends RemoteSocket<DefaultEventsMap, any> {
	auth: SocketAuthObject;
}
