import { PassThrough } from 'stream';
import { randomUUID } from 'node:crypto';
import { ExtendedSocket } from '../types/session';
import { Langs } from '../types/classes';
import { getSeries, setSeries } from '../utils/utils';
import { sendSeriesReloadToAll } from './client.socket';
import { Response } from 'express';

export const subSocketMap = new Map<string, ExtendedSocket>();
// export const ongoingRequests = new Map<string, { res: Response }>();

export const initialize = async (socket: ExtendedSocket) => {
	const auth = socket.auth;
	console.log('Socket Connection:', auth.type.toUpperCase(), auth.id, auth.ptoken);

	subSocketMap.set(auth.id, socket);

	socket.setMaxListeners(555);

	socket.on('disconnect', async () => {
		console.log('Socket DisConnection:', auth.type.toUpperCase());
		subSocketMap.delete(auth.id);

		await toggleSeriesDisableForSubSystem(auth.id, true);
	});

	await toggleSeriesDisableForSubSystem(auth.id, false);
};

export interface SubFile {
	subID: string;
	path: string;
}

const cache = new Map<string, { size: number }>();

export async function getVideoStats(subID: string, filePath: string) {
	const stepIn = Date.now();
	if (cache.has(filePath)) {
		console.log('Got Size from cache', cache.get(filePath).size);
		console.log(' => After', Date.now() - stepIn, 'ms');
		return cache.get(filePath);
	}
	const subSocket = getSubSocketByID(subID);
	return new Promise<{ size: number }>((resolve, reject) => {
		subSocket.emit('video-stats', { filePath: filePath }, ({ size }) => {
			console.log('Got Size', size);
			console.log(' => After', Date.now() - stepIn, 'ms');
			cache.set(filePath, { size });
			resolve({ size });
		});
	});
}

export async function toggleSeriesDisableForSubSystem(subID: string, disabled: boolean) {
	const match = await getSeriesBySubID(subID);

	console.log(`${disabled ? 'Disabling' : 'Enabling'} sub system for: ${subID} affected ${match.length} Series`);

	setSeries(
		(await getSeries()).map((x) => {
			if (match.some((y) => y.ID == x.ID)) {
				x.infos.disabled = disabled;
			}
			return x;
		})
	);
	await sendSeriesReloadToAll();
}

export function getSubSocketByID(subID: string): ExtendedSocket | undefined {
	return subSocketMap.get(subID);
}

export async function getSeriesBySubID(subID: string) {
	const series = await getSeries();

	const serie = series.filter((x) => x.seasons.flat().some((e) => e.subID == subID) || x.movies.some((e) => e.subID == subID));
	return serie;
}

export async function checkifSubExists(subID: string) {
	const series = await getSeriesBySubID(subID);
	return series.length > 0;
}

export async function getAllFilesFromAllSubs() {
	const allFiles = await new Promise<SubFile[]>((resolve, reject) => {
		let waitFor: string[] = [];
		const allFilesInner: SubFile[] = [];
		if (subSocketMap.size == 0) {
			resolve([]);
			return;
		}

		const t = setTimeout(() => {
			reject(new Error('Timeout Reached with: ' + waitFor.join(', ')));
		}, 1000 * 60 * 1);

		subSocketMap.forEach((socket) => {
			socket.once('files', ({ files }) => {
				allFilesInner.push(...files.map((x) => ({ path: x, subID: socket.auth.id })));
				waitFor = waitFor.filter((k) => k !== socket.auth.id);

				console.log('Response from:', `"${socket.auth.id}"`, 'waiting for:', waitFor.join(', '));
				if (waitFor.length == 0) {
					clearTimeout(t);
					resolve(allFilesInner);
				}
			});
			waitFor.push(socket.auth.id);
			console.log('Requesting from:', socket.auth.id, 'waiting for:', waitFor.join(', '));

			socket.emit('listFiles');
		});
	});
	return allFiles;
}

// handleSocketTransmitVideo(videoEntity.subID, requestId, filePath, start, end, res);

// const ongoingRequests = new Map<string, { handleData: () => void; handleError: () => void; handleEnd: () => void; res: Response }>();

const testMap = new Map<string, { time: number }>();

const countMap = new Map<string, number>();

export async function createVideoStreamOverSocket(
	subID: string,
	requestId: string,
	filePath: string,
	opts: { start: number; end: number },
	res: Response
) {
	console.time('createVideoStreamOverSocket-' + requestId.split('-')[0]);
	testMap.set(requestId, { time: Date.now() });
	const subSocket = getSubSocketByID(subID);

	const handleData = ({ chunk, requestId: reqID }) => {
		if (requestId == reqID) {
			if (testMap.has(reqID)) {
				console.log('Got Data from:', reqID, 'after', Date.now() - testMap.get(reqID).time, 'ms');
				testMap.delete(reqID);
			}
			if (countMap.has(reqID)) {
				countMap.set(reqID, countMap.get(reqID) + 1);
			} else {
				countMap.set(reqID, 1);
			}
			res.write(chunk);
		}
	};

	const handleEnd = ({ error, requestId: reqID }) => {
		if (requestId == reqID) {
			if (countMap.has(reqID)) {
				console.log('Got End', reqID, countMap.get(reqID));
			} else {
				console.log('Got End', reqID, -1);
			}
			res.end();
			cleanup();
		}
	};

	const handleError = ({ error, requestId: reqID }) => {
		if (requestId == reqID) {
			if (countMap.has(reqID)) {
				console.log('Got Error', reqID, error, countMap.get(reqID));
			} else {
				console.log('Got Error', reqID, error, -1);
			}
			res.status(500).json(error);
			cleanup();
		}
	};

	const cleanup = () => {
		subSocket.off('video-chunk', handleData);
		subSocket.off('video-chunk-end', handleEnd);
		subSocket.off('video-chunk-error', handleError);
	};

	subSocket.on('video-chunk', handleData);
	subSocket.on('video-chunk-end', handleEnd);
	subSocket.on('video-chunk-error', handleError);

	subSocket.emit('video-range', { ...opts, filePath, requestId });
	console.timeEnd('createVideoStreamOverSocket-' + requestId.split('-')[0]);
}
