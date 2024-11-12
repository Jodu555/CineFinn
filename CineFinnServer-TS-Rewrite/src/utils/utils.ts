import fs from 'fs';
import { RemoteSocket, Server, Socket } from 'socket.io';
import IORedis from 'ioredis';
import { Series } from '../classes/series';
import { crawlAndIndex, mergeSeriesArrays } from './crawler';
import { SerieObject } from '@Types/classes';
import { ExtendedRemoteSocket, User } from '../types/session';
import { AuthenticationHelper } from '@jodu555/express-helpers';
const outputFileName = process.env.LOCAL_DB_FILE;

let series: Series[] = null;
let io: Server = null;
let authHelper: AuthenticationHelper<User> = null;
let redisConn: IORedis | void = null;
let videoStreamLog: VideoStreamLog[] = [];

interface VideoStreamLog {
	userUUID: string;
	time: number;
	path: string;
	stream: fs.ReadStream;
	start: number;
	end: number;
}

function debounce(cb: Function, delay = 1000) {
	let timeout: NodeJS.Timeout;

	return (...args) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			cb(...args);
		}, delay);
	};
}
const getSeries = async (forceLoad: boolean = false, forceFile: boolean = false, keepCurrentlyNotPresent = true): Promise<Series[]> => {
	if (forceLoad || !series || forceFile) {
		if ((fs.existsSync(outputFileName) && !forceLoad) || forceFile) {
			console.log('Loaded series from file!');
			const fileObject = JSON.parse(fs.readFileSync(outputFileName, 'utf8')) as SerieObject[];
			setSeries(
				fileObject.map((e) => Series.fromObject(e)),
				keepCurrentlyNotPresent
			);
		} else {
			console.log('Crawled the series!');
			setSeries(await crawlAndIndex(), keepCurrentlyNotPresent);

			fs.writeFileSync(outputFileName, JSON.stringify(series, null, 3), 'utf8');
		}
	}
	return series;
};

const dangerouslySetSeries = (newSeries: Series[]) => {
	console.log('Dangerously setted new Series!');
	series = newSeries;
	fs.writeFileSync(outputFileName, JSON.stringify(series, null, 3), 'utf8');
};

const setSeries = (_series: Series[], keepCurrentlyNotPresent = true) => {
	console.log('Loaded or Setted & merged new Series!');
	if (series != null) {
		series = mergeSeriesArrays(series, _series, keepCurrentlyNotPresent);
	} else {
		series = _series;
	}
	fs.writeFileSync(outputFileName, JSON.stringify(series, null, 3), 'utf8');
};

const getAuthHelper = () => authHelper;
const setAuthHelper = (_authHelper: AuthenticationHelper<User>) => (authHelper = _authHelper);

const getIO = () => io;
const setIO = (_io: Server) => (io = _io);

const getIORedis = (): IORedis | void => redisConn;
const setIORedis = (_redisConn: IORedis | void) => (redisConn = _redisConn);

const getVideoStreamLog = () => videoStreamLog;
const setVideoStreamLog = (_VideoStreamLog: VideoStreamLog[]) => (videoStreamLog = _VideoStreamLog);

type toAllSocketsFunctionCB = (socket: ExtendedRemoteSocket) => void;
type toAllSocketsFunctionFilter = (socket: ExtendedRemoteSocket) => boolean;

const toAllSockets = async (cb: toAllSocketsFunctionCB, filter: toAllSocketsFunctionFilter = () => true) => {
	const sockets = await getIO().fetchSockets();
	sockets.filter(filter).forEach(cb);
};

function deepMerge<T>(current: T, updates: T): T {
	// if (updates === null) return current;
	if (typeof updates !== 'object') return current;
	for (const key of Object.keys(updates)) {
		if (!current.hasOwnProperty(key) || typeof updates[key] !== 'object') current[key] = updates[key];
		else deepMerge(current[key], updates[key]);
	}
	return current;
}

export {
	getSeries,
	setSeries,
	getAuthHelper,
	setAuthHelper,
	getIO,
	setIO,
	getIORedis,
	setIORedis,
	getVideoStreamLog,
	setVideoStreamLog,
	debounce,
	toAllSockets,
	deepMerge,
	dangerouslySetSeries,
};
