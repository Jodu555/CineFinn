import { PassThrough } from 'stream';
import { randomUUID } from 'node:crypto';
import { ExtendedSocket } from '../types/session';
import { Langs } from '../types/classes';
import { getSeries, setSeries } from '../utils/utils';
import { sendSeriesReloadToAll } from './client.socket';
import { Response } from 'express';

export const subSocketMap = new Map<string, ExtendedSocket>();

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

export async function getVideoStats(subID: string, filePath: string) {
	const subSocket = getSubSocketByID(subID);
	return new Promise<{ size: number }>((resolve, reject) => {
		subSocket.emit('video-stats', { filePath: filePath }, ({ size }) => {
			console.log('Got Size', size);
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

const ongoingRequests = new Map<string, { res: Response }>();

export async function createVideoStreamOverSocket(
	subID: string,
	requestId: string,
	filePath: string,
	opts: { start: number; end: number },
	res: Response
) {
	const subSocket = getSubSocketByID(subID);
	// ongoingRequests.set(requestId, { res });

	const handleData = ({ chunk, requestId: reqID }) => {
		if (requestId == reqID) {
			res.write(chunk);
		}
	};

	const handleError = ({ error, requestId: reqID }) => {
		if (requestId == reqID) {
			console.log('Got Error', error);
			res.status(500).json(error);
			cleanup();
		}
	};

	const handleEnd = ({ requestId: reqID }) => {
		if (requestId == reqID) {
			console.log('Got End');
			res.end();
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
}
