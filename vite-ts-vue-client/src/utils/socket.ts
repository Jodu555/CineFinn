import { Socket, io } from 'socket.io-client';
import { useBaseURL } from '.';
import type { Langs, Segment, Serie, Setting, SettingsObject, TodoItem } from '@/types';

let socket: ExtendedSocket | null = null;

const socketPlugin = {
	install: (app: any) => {
		app.config.globalProperties.$socket = useSocket();
	},
};

interface DefaultEventsMap {
	[event: string]: (...args: any[]) => void;
}

interface ClientToServerEvents {
	reload: () => void;
	reloadSeries: (series: Serie[]) => void;
	updateSettings: (settings: SettingsObject) => void;
	watchListChange: (obj: { watchList: Segment[]; seriesID: string | undefined }) => void;
	jobEvent: (...args: any[]) => void;
	'rmvc-get-videoState': () => void;
	'rmvc-sessionCreated': (sessionID: string) => void;
	'rmvc-sessionDestroyed': () => void;
	'rmvc-recieve-action': (action: string) => void;
	'rmvc-connection': (obj: { status: boolean }) => void;
	'rmvc-recieve-videoStateChange': (obj: { isPlaying: boolean }) => void;
	todoListUpdate: (list: TodoItem[]) => void;
	'sync-update-rooms': () => void;
	'sync-message': (obj: { type: 'success' | 'error'; message: string }) => void;
	'sync-video-action': (obj: { action: string; value: boolean | number; time?: number }) => void;
	'sync-selectSeries': (obj: { ID: string }) => void;
	'sync-video-change': (obj: { season: number; episode: number; movie: number; langchange: boolean; lang: Langs }) => void;
	'sync-video-info': () => void;
	'admin-update': (obj: { context: 'overview' | 'accounts' | 'subsystem'; data: any }) => void;
	'admin-movingItem-update': (obj: { ID: string; progress: number }) => void;
}

interface ExtendedSocket extends Socket<ClientToServerEvents, DefaultEventsMap> {
	auth: {
		type: 'client' | 'rmvc-emitter';
		token?: string;
	};
	sync?: any;
}

declare module 'vue' {
	interface ComponentCustomProperties {
		$socket: ExtendedSocket;
	}
}

function useSocket() {
	if (socket == null) socket = io(useBaseURL(), { autoConnect: false }) as ExtendedSocket;

	return socket;
}

export { useSocket, socketPlugin };
