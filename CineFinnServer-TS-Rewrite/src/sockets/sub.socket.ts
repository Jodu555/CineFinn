import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PassThrough } from 'stream';
import { randomUUID, createHash } from 'node:crypto';
import { ExtendedSocket } from '../types/session';
import { Langs } from '../types/classes';
import { getSeries, setSeries, toAllSockets } from '../utils/utils';
import { sendSeriesReloadToAll } from './client.socket';
import { Response } from 'express';
import { Movie, Episode } from '../classes/series';
import { crawlAndIndex } from '../utils/crawler';

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

	if (match.length == 0) return;

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

export async function getAllKnownSubSystems(): Promise<string[]> {
	const list = new Set<string>();

	const series = await getSeries();

	const serie = series.forEach((s) => {
		[...s.movies, ...s.seasons.flat()].forEach((x) => {
			list.add(x.subID);
		});
	});
	list.delete('main');
	return [...list];
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

export interface MovingItem {
	ID: string;
	seriesID: string;
	fromSubID: string;
	toSubID: string;
	filePath: string;
	entity: Movie | Episode;
}
export async function generateMovingItemArray() {
	const movingArray: MovingItem[] = [];

	const series = await getSeries();

	const test = series.map((x) => {
		const obj: Record<string, number> = {};
		const all = [...x.movies, ...x.seasons.flat()];
		all.forEach((z) => {
			obj[z.subID] = obj[z.subID] ? obj[z.subID] + 1 : 1;
		});

		let prioSub = '';
		let sortable: Record<string, number> = {};

		if (Object.keys(obj).length == 1) {
			prioSub = Object.keys(obj)[0];
			sortable = obj;
		} else {
			sortable = Object.entries(obj)
				.sort(([, a], [, b]) => b - a)
				.reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

			prioSub = Object.entries(sortable)[0][0];

			all.forEach((z) => {
				if (z.subID != prioSub) {
					movingArray.push({
						ID: createHash('md5').update(`${x.ID}${z.subID}${prioSub}${z.filePath}`).digest('base64'),
						seriesID: x.ID,
						fromSubID: z.subID,
						toSubID: prioSub,
						filePath: z.filePath,
						entity: z,
					});
				}
			});
		}

		return {
			ID: x.ID,
			title: x.title,
			obj,
			sortable,
			prioSub,
		};
	});
	// console.log(test, movingArray);
	return movingArray;
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

export async function processMovingItem(ID: string) {
	const movingItems = await generateMovingItemArray();
	const series = await getSeries();
	const movingItem = movingItems.find((x) => x.ID == ID);

	if (!movingItem) {
		console.log('Moving item with ID:', ID, 'not found!');
		return;
	}

	console.log(movingItem);

	const serie = series.find((x) => x.ID == movingItem.seriesID);

	if (!serie) {
		console.log('Serie for moving item ID:', movingItem.ID, 'not found!');
		return;
	}
	const parsed = path.parse(movingItem.filePath);

	let pathGen = '';
	if (movingItem.entity instanceof Movie) {
		pathGen = path.join(serie.categorie, serie.title, `Movies`, `${parsed.name}${parsed.ext}`);
	} else {
		pathGen = path.join(serie.categorie, serie.title, `Season-${movingItem.entity.season}`, `${parsed.name}${parsed.ext}`);
	}

	let lastPercent = 0;
	const percentCB: (percent: number) => void = (percent) => {
		toAllSockets(
			(socket) => {
				if (percent - lastPercent > 1) {
					socket.emit('admin-movingItem-update', { ID, progress: percent });
					lastPercent = percent;
				}
			},
			(socket) => socket.auth.type == 'client' && socket.auth.user.role >= 2
		);
	};

	const result = {
		fingerprintValidation: false,
		elapsedTimeMS: 0,
	};
	try {
		if (movingItem.fromSubID == 'main') {
			console.log(movingItem.filePath, movingItem.toSubID, pathGen);
			const res = await uploadFileToSubSystem(movingItem.filePath, movingItem.toSubID, pathGen, percentCB);
			console.log(res);
			result.elapsedTimeMS = res.elapsedTimeMS;
			result.fingerprintValidation = res.fingerprintValidation;
		}

		if (movingItem.toSubID == 'main') {
			const localPath = path.join(process.env.VIDEO_PATH, pathGen);
			const res = await downloadFileFromSubSystem(movingItem.filePath, movingItem.fromSubID, localPath, percentCB);
			console.log(res);
			result.elapsedTimeMS = res.elapsedTimeMS;
			result.fingerprintValidation = res.fingerprintValidation;
		}

		toAllSockets(
			(socket) => {
				socket.emit('admin-movingItem-update', {
					ID,
					progress: 100,
					message: `Took ${result.elapsedTimeMS / 100}s with a ${result.fingerprintValidation ? 'Valid' : 'Invalid'} fingerprint`,
				});
			},
			(socket) => socket.auth.type == 'client' && socket.auth.user.role >= 2
		);
		setTimeout(async () => {
			setSeries(await crawlAndIndex());
			await sendSeriesReloadToAll();
		}, 5000);
	} catch (error) {
		console.log(movingItem, error);

		toAllSockets(
			(socket) => {
				socket.emit('admin-movingItem-update', {
					ID,
					progress: 99,
					message: `Error on ${error.messsage} - ${error.stack}`,
				});
			},
			(socket) => socket.auth.type == 'client' && socket.auth.user.role >= 2
		);
	}
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

export function downloadFileFromSubSystem(subPath: string, subID: string, localPath: string, percentCb?: (percent: number) => void) {
	return new Promise<{ fingerprintValidation: boolean; elapsedTimeMS: number }>((resolve, reject) => {
		const subSocket = getSubSocketByID(subID);
		const transID = crypto.randomUUID();
		if (subSocket == undefined) {
			console.log('SubSocket not reachable!');
			reject(new Error('SubSocket not reachable!'));
		}

		interface TransmitData {
			fd: number;
			transmitID: string;
			path: string;
			size: number;
			packetCount: number;
			cumSize: number;
			stream: fs.WriteStream;
			hash: crypto.Hash;
			startTime: number;
		}

		const state = {} as TransmitData;

		const cleanup = () => {
			subSocket.off('openStream', openStream);
			subSocket.off('dataStream', dataStream);
			subSocket.off('closeStream', closeStream);
		};

		const openStream = ({ transmitID, fd, size }: { transmitID: string; fd: number; size: number }) => {
			if (transID == transmitID) {
				console.log('Started Recieving Packets', transmitID, fd, size);
				fs.mkdirSync(path.join(localPath, '..'), { recursive: true });
				const stream = fs.createWriteStream(localPath);
				const hash = crypto.createHash('md5');
				state.stream = stream;
				state.hash = hash;
				state.fd = fd;
				state.size = size;

				state.cumSize = 0;
				state.packetCount = 0;
				state.startTime = Date.now();
			}
		};

		const dataStream = ({ transmitID, fd, data }: { transmitID: string; fd: number; data: Buffer }) => {
			if (state.fd !== fd) {
				console.log('We somehow fucked up really bad');
				return;
			}
			state.packetCount++;
			state.cumSize += data.length;
			const percent = ((state.cumSize / state.size) * 100).toFixed(2);
			percentCb(Number(percent));
			// console.log(((state.cumSize / state.size) * 100).toFixed(2) + '%');
			state.hash.update(data);
			state.stream.write(data);
		};

		const closeStream = async (
			{ transmitID, fd, packetCount, fingerprint }: { transmitID: string; fd: number; packetCount: number; fingerprint: string },
			callback: ({ valid }: { valid: boolean }) => void
		) => {
			console.log('Finished, Recieving Packets', transmitID, fd);
			if (state.fd !== fd) {
				console.log('We somehow fucked up really bad');
				return;
			}
			const localPrint = state.hash.digest('hex');
			state.stream.close();
			const stats = fs.statSync(localPath);

			console.log('Validating fingerprint!');
			console.log('Expect:', fingerprint);
			console.log('Actual:', localPrint);

			let valid = false;
			const elapsedTimeMS = Date.now() - state.startTime;

			if (fingerprint != localPrint) {
				console.error('ERROR: Fingerprint mismatch!!!');
				cleanup();
				reject({
					fingerprintValidation: valid,
					elapsedTimeMS: elapsedTimeMS,
				});
				return;
			}
			if (state.packetCount == packetCount && fingerprint == localPrint) {
				valid = true;
				console.log('Theoretical Count:', state.size, packetCount);
				console.log('Actual Count:     ', stats.size, state.packetCount);
				console.log('Took:', elapsedTimeMS / 1000, 's');
			}
			callback({ valid });
			cleanup();
			resolve({
				fingerprintValidation: valid,
				elapsedTimeMS: elapsedTimeMS,
			});
		};

		subSocket.on('openStream', openStream);
		subSocket.on('dataStream', dataStream);
		subSocket.on('closeStream', closeStream);

		subSocket.emit('requestFile', { transmitID: transID, subPath });
	});
}

export function uploadFileToSubSystem(filePath: string, subID: string, remotePath: string, percentCb?: (percent: number) => void) {
	return new Promise<{ fingerprintValidation: boolean; elapsedTimeMS: number }>((resolve, reject) => {
		const transmitID = crypto.randomUUID();

		const subSocket = getSubSocketByID(subID);

		if (subSocket == undefined) {
			console.log('SubSocket not reachable!');
			reject(new Error('SubSocket not reachable!'));
		}

		const stats = fs.statSync(filePath);
		const stream = fs.createReadStream(filePath);

		const hash = crypto.createHash('md5');

		let cumSize = 0;

		let packetCount = 0;
		let fd: number;
		stream.on('data', (data) => {
			cumSize += data.length;
			const percent = ((cumSize / stats.size) * 100).toFixed(2);
			percentCb(Number(percent));
			packetCount++;
			hash.update(data);
			subSocket.emit('dataStream', { transmitID, fd, data });
		});
		stream.on('close', () => {
			const fingerprint = hash.digest('hex');
			console.log('Finished sending Packets', transmitID, fd, packetCount, fingerprint);
			subSocket.emit('closeStream', { transmitID, fd, packetCount, fingerprint }, ({ fingerprintValidation, elapsedTimeMS }) => {
				if (fingerprintValidation === false) {
					reject(new Error('Fingerprint Invalid!! File might be broken at Destination'));
				} else {
					resolve({ fingerprintValidation, elapsedTimeMS });

					console.log('SubSystem Returned valid:', fingerprintValidation);
					if (fingerprintValidation == true) {
						console.log('Removing File:', filePath);
						fs.rmSync(filePath);
					}
				}
			});
		});
		stream.on('open', (_fd) => {
			fd = _fd;
			console.log('Starting sending Packets', transmitID, fd);
			subSocket.emit('openStream', { transmitID, fd: _fd, size: stats.size, remotePath });
		});
	});
}
