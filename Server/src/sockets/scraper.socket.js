const { Database } = require('@jodu555/mysqlapi');
const { compareSettings } = require('../utils/settings');
const { debounce, toAllSockets } = require('../utils/utils');
const { writeWatchInfoToDatabase } = require('../utils/watchManager');
const { parse, load } = require('../utils/watchString');

const database = Database.getDatabase();

let $socket;

const initialize = async (socket) => {
	const auth = socket.auth;
	console.log('Socket Connection:', auth.type.toUpperCase());
	$socket = socket;
};

const getAniworldInfos = buildAwaitSocketReturn('AniworldData');
const getZoroInfos = buildAwaitSocketReturn('ZoroData');

const manageTitle = buildAwaitSocketReturn('manageTitle');

function buildAwaitSocketReturn(method) {
	return (input) => {
		return new Promise((resolve, reject) => {
			if (!$socket) return reject();
			const timeout = setTimeout(() => reject(), 1000 * 5);
			$socket.once(`return${method}`, (data) => {
				resolve(data);
				clearTimeout(timeout);
			});
			$socket.emit(`call${method}`, input);
		});
	};
}

module.exports = {
	initialize,
	getAniworldInfos,
	manageTitle,
};
