import { ExtendedSocket } from '../types/session';
import { Langs } from '../types/classes';
import { randomUUID } from 'node:crypto';

let $socket: ExtendedSocket;

const initialize = async (socket: ExtendedSocket) => {
	const auth = socket.auth;
	console.log('Socket Connection:', auth.type.toUpperCase());
	$socket = socket;

	socket.on('disconnect', () => {
		console.log('Socket DisConnection:', auth.type.toUpperCase());
		$socket = null;
	});
};

export interface AniWorldEntity {
	mainName: string;
	secondName: string;
	langs: Langs[];
}

export interface AniWorldAdditionalSeriesInformations {
	infos: string;
	startDate: string;
	endDate: string;
	description: string;
	image: string | boolean;
}

export interface AniWorldSeriesInformations {
	url: string;
	informations: AniWorldAdditionalSeriesInformations;
	hasMovies: boolean;
	movies?: AniWorldEntity[];
	seasons: AniWorldEntity[][];
}

export interface SimpleZoroEpisode {
	ID: string;
	title: string;
	number: string;
	url: string;
}

export interface ExtendedZoroEpisode extends SimpleZoroEpisode {
	langs: string[];
	streamingServers: StreamingServers[];
}

export interface StreamingServers {
	type: 'sub' | 'dub';
	ID: string;
	serverIndex: string;
	name: string;
}

export interface SeasonInformation {
	ID: string;
	IDX: string;
	title: string;
}

export interface ZoroReturn {
	total: number;
	episodes: ExtendedZoroEpisode[];
}

const getAniworldInfos = buildAwaitSocketReturn<AniWorldSeriesInformations | void, { url: string }>('AniworldData');
const getZoroInfos = buildAwaitSocketReturn<ZoroReturn | void, { ID: string | number }>('ZoroData');

const manageTitle = buildAwaitSocketReturn('manageTitle');

function buildAwaitSocketReturn<R, T>(method: string): (arg0: T) => Promise<R> {
	return (input: T) => {
		return new Promise<R>((resolve, reject) => {
			const __refID = randomUUID().split('-')[0];
			if (!$socket) return reject(new Error('Socket not reachable'));
			const timeout = setTimeout(() => reject(new Error('Timeout reached')), 1000 * 60 * 2);
			const listener = (data: R & { __refID: string }) => {
				if (data.__refID == __refID) {
					delete data.__refID;
					resolve(data);
					clearTimeout(timeout);
					$socket.off(`return${method}`, listener);
				}
			}
			// TODO: Why is this failing
			// @ts-ignore:next-line
			$socket.on(`return${method}`, listener);
			$socket.emit(`call${method}`, { ...input, __refID });
		});
	};
}

function isScraperSocketConnected() {
	return Boolean($socket);
}

export { initialize, getAniworldInfos, manageTitle, isScraperSocketConnected };
