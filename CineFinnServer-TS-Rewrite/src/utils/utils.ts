import fs from 'fs';
import { RemoteSocket, Server, Socket } from 'socket.io';
import IORedis from 'ioredis';
import { Series } from '../classes/series';
import { crawlAndIndex, mergeSeriesArrays } from './crawler';
import { ActiveJob, SerieObject } from '../types/classes';
import { ExtendedRemoteSocket, User } from '../types/session';
import { AuthenticationHelper } from '@jodu555/express-helpers';
const outputFileName = process.env.LOCAL_DB_FILE;

let series: Series[] = null;
let activeJobs: ActiveJob[] = [];
let io: Server = null;
let authHelper: AuthenticationHelper<User> = null;
let redisConn: IORedis | void = null;

function debounce(cb: Function, delay = 1000) {
	let timeout: NodeJS.Timeout;

	return (...args) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			cb(...args);
		}, delay);
	};
}
const getSeries = (forceLoad: boolean = false, forceFile: boolean = false, keepCurrentlyNotPresent = true): Series[] => {
	if (forceLoad || !series || forceFile) {
		if ((fs.existsSync(outputFileName) && !forceLoad) || forceFile) {
			console.log('Loaded series from file!');
			const fileObject = JSON.parse(fs.readFileSync(outputFileName, 'utf8')) as SerieObject[];
			setSeries(fileObject.map((e) => Series.fromObject(e)), keepCurrentlyNotPresent);
		} else {
			console.log('Crawled the series!');
			setSeries(crawlAndIndex(), keepCurrentlyNotPresent);

			fs.writeFileSync(outputFileName, JSON.stringify(series, null, 3), 'utf8');
		}
	}
	return series;
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

const getActiveJobs = () => activeJobs;
const setActiveJobs = (_activeJobs: ActiveJob[]) => (activeJobs = _activeJobs);

const getAuthHelper = () => authHelper;
const setAuthHelper = (_authHelper: AuthenticationHelper<User>) => (authHelper = _authHelper);

const getIO = () => io;
const setIO = (_io: Server) => (io = _io);

const getIORedis = (): IORedis | void => redisConn;
const setIORedis = (_redisConn: IORedis | void) => (redisConn = _redisConn);

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

export { getSeries, setSeries, getActiveJobs, setActiveJobs, getAuthHelper, setAuthHelper, getIO, setIO, getIORedis, setIORedis, debounce, toAllSockets, deepMerge };
