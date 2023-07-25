import fs from 'fs';
import { RemoteSocket, Server, Socket } from 'socket.io';
import { Series } from '../classes/series';
import { crawlAndIndex, mergeSeriesArrays } from './crawler';
import { ActiveJob, SerieObject } from '../types/classes';
import { ExtendedRemoteSocket } from '../types/session';
const outputFileName = process.env.LOCAL_DB_FILE;

let series: Series[] = null;
let activeJobs: ActiveJob[] = [];
let io: Server = null;
let authHelper = null;

function debounce(cb: Function, delay = 1000) {
	let timeout: NodeJS.Timeout;

	return (...args) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			cb(...args);
		}, delay);
	};
}
const getSeries = (forceLoad: boolean = false, forceFile: boolean = false): Series[] => {
	if (forceLoad || !series || forceFile) {
		if ((fs.existsSync(outputFileName) && !forceLoad) || forceFile) {
			console.log('Loaded series from file!');
			const fileObject = JSON.parse(fs.readFileSync(outputFileName, 'utf8')) as SerieObject[];
			setSeries(fileObject.map((e) => Series.fromObject(e)));
		} else {
			console.log('Crawled the series!');
			setSeries(crawlAndIndex());

			fs.writeFileSync(outputFileName, JSON.stringify(series, null, 3), 'utf8');
		}
	}
	return series;
};

const setSeries = (_series: Series[]) => {
	console.log('Loaded or Setted & merged new Series!');
	if (series != null) {
		series = mergeSeriesArrays(series, _series);
	} else {
		series = _series;
	}
	//TODO: Series have changed OR loaded
	// Check if there are new init images to be loaded or other stuff
	fs.writeFileSync(outputFileName, JSON.stringify(series, null, 3), 'utf8');
};

const getActiveJobs = () => activeJobs;
const setActiveJobs = (_activeJobs: ActiveJob[]) => (activeJobs = _activeJobs);

const getAuthHelper = () => authHelper;
const setAuthHelper = (_authHelper) => (authHelper = _authHelper);

const getIO = () => io;
const setIO = (_io: Server) => (io = _io);

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

export { getSeries, setSeries, getActiveJobs, setActiveJobs, getAuthHelper, setAuthHelper, getIO, setIO, debounce, toAllSockets, deepMerge };