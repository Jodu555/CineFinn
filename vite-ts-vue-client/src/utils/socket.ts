import { Socket, io } from 'socket.io-client';
import { useBaseURL } from '.';
import type { Segment, Serie, Setting, SettingsObject } from '@/types';

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
}

interface ExtendedSocket extends Socket<ClientToServerEvents, DefaultEventsMap> {
	auth: {
		type: 'client' | 'rmvc-emitter';
		token: string;
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
