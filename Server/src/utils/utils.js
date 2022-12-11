const fs = require('fs');
const { crawlAndIndex, mergeSeriesArrays } = require('./crawler');
const outputFileName = process.env.LOCAL_DB_FILE;

let series = null;
let activeJobs = [];
let io = null;
let authHelper = null;

function debounce(cb, delay = 1000) {
	let timeout;

	return (...args) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			cb(...args);
		}, delay);
	};
}
/**
 * @param  {Boolen} forceLoad=false If the dir should be crawled
 * @param  {Boolen} forceFile=false If system should forcefully load data from file in ram
 * @returns {[import('../classes/series').Series]}
 */
const getSeries = (forceLoad = false, forceFile = false) => {
	if (forceLoad || !series || forceFile) {
		if (fs.existsSync(outputFileName) && !forceLoad && forceFile) {
			console.log('Came');
			const { Series } = require('../classes/series');
			console.log('Loaded series from file!');
			const fileObject = JSON.parse(fs.readFileSync(outputFileName, 'utf8'));
			setSeries(fileObject.map((e) => Series.fromObject(e)));
		} else {
			console.log('Crawled the series!');
			setSeries(crawlAndIndex());

			fs.writeFileSync(outputFileName, JSON.stringify(series, null, 3), 'utf8');
		}
	}
	return series;
};

const setSeries = async (_series) => {
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
const setActiveJobs = (_activeJobs) => (activeJobs = _activeJobs);

const getAuthHelper = () => authHelper;
const setAuthHelper = (_authHelper) => (authHelper = _authHelper);

const getIO = () => io;
const setIO = (_io) => (io = _io);

const toAllSockets = async (cb, filter = () => {}) => {
	const sockets = await getIO().fetchSockets();
	sockets.filter(filter).forEach(cb);
};

const promiseAllLimit = (...args) => {
	return new Promise((resolve, _) => {
		import('p-limit').then((pMLimit) => {
			resolve(pMLimit.default(...args));
		});
	});
};

module.exports = {
	getSeries,
	setSeries,
	getActiveJobs,
	setActiveJobs,
	getAuthHelper,
	setAuthHelper,
	getIO,
	setIO,
	debounce,
	toAllSockets,
	promiseAllLimit,
};
