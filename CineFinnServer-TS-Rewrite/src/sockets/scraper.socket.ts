import { ExtendedSocket } from '../types/session';
import { Langs } from '../types/classes';
import { randomUUID } from 'node:crypto';

let $socket: ExtendedSocket;

export interface AbstractSocketCall {
	__returnValue: boolean;
	__refID: string;
}

const waitingForResponse: {
	__refID: string;
	listener: (args: AbstractSocketCall) => void;
}[] = [];

const initialize = async (socket: ExtendedSocket) => {
	const auth = socket.auth;
	console.log('Socket Connection:', auth.type.toUpperCase());
	$socket = socket;

	$socket.setMaxListeners(555);

	socket.on('disconnect', () => {
		console.log('Socket DisConnection:', auth.type.toUpperCase());
		if (waitingForResponse.length > 0) {
			console.log("Scraper Socket Disconnected while the following function's where waiting ");
			waitingForResponse.forEach((e) => {
				console.log(' =>', e.__refID);
				e.listener({ __refID: e.__refID, __returnValue: false });
			});
		}
		$socket = null;
	});

	// const i = await getAniworldInfos({ url: 'aaaaaaaaaaaaa' })

	// if (!i) {
	// 	console.log('i bad', i);
	// 	return;
	// }

	// console.log(`i`, i);
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

export interface ZoroSeriesInformation {
	title: string;
	image: string;
	subCount: number;
	dubCount: number;
	episodeCount: number;
	seasons: ExtendedZoroEpisode[][];
}

const getAniworldInfos = buildAwaitSocketReturn<AniWorldSeriesInformations, { url: string }>('AniworldData');
const getZoroInfos = buildAwaitSocketReturn<ZoroReturn, { ID: string | number }>('ZoroData');
const getNewZoroInfos = buildAwaitSocketReturn<ZoroSeriesInformation, { ID: string | number }>('newZoroData');
const checkForUpdates = buildAwaitSocketReturn<{ success: boolean; error: Error }, void>('checkForUpdates');

const manageTitle = buildAwaitSocketReturn('manageTitle');

function buildAwaitSocketReturn<R, T>(method: string): (arg0: T) => Promise<R | void> {
	return (input: T) => {
		return new Promise<R | void>((resolve, reject) => {
			const __refID = randomUUID().split('-')[0];
			if (!$socket) return reject(new Error('Socket not reachable'));
			const timeout = setTimeout(() => reject(new Error('Timeout reached')), 1000 * 60 * 15);
			const listener = (data: R & AbstractSocketCall) => {
				if (data.__refID == __refID) {
					delete data.__refID;
					const __returnValue = data.__returnValue;
					delete data.__returnValue;
					if (__returnValue == false) {
						resolve(null);
					}
					resolve(data);
					clearTimeout(timeout);
					$socket.off(`return${method}`, listener);
				}
			};
			// TODO: Why is this failing
			// @ts-ignore:next-line
			$socket.on(`return${method}`, listener);
			$socket.emit(`call${method}`, { ...input, __refID });
			waitingForResponse.push({
				__refID,
				listener,
			});
		});
	};
}

function isScraperSocketConnected() {
	return Boolean($socket);
}

export { initialize, getAniworldInfos, getZoroInfos, getNewZoroInfos, checkForUpdates, manageTitle, isScraperSocketConnected, waitingForResponse };
