const { Database } = require('@jodu555/mysqlapi');
const { compareSettings } = require('../utils/settings');
const { debounce, toAllSockets } = require('../utils/utils');
const { writeWatchInfoToDatabase } = require('../utils/watchManager');
const { parse, load } = require('../utils/watchString');

const database = Database.getDatabase();

const initialize = (socket) => {
	const auth = socket.auth;
	console.log('Socket Connection:', auth.type.toUpperCase(), auth.user.username, socket.id);

	socket.on('timeUpdate', (obj) => {
		obj.time = Math.ceil(obj.time);
		if (obj.movie == -1 && obj.season == -1 && obj.episode == -1) return;
		console.log('TUpd:', auth.user.username, obj);
		if (obj.force) {
			writeWatchInfoToDatabase(socket, obj);
		} else {
			if (!auth.debounce) auth.debounce = debounce(writeWatchInfoToDatabase, 4000);
			auth.debounce(socket, obj);
		}
	});

	socket.on('getWatchList', ({ ID }) => {
		new Promise(async (resolve, _) => {
			const segList = parse(await load(auth.user.UUID));
			socket.emit(
				'watchListChange',
				segList.filter((seg) => seg.ID == ID)
			);
			resolve();
		});
	});

	socket.on('updateSettings', (settings) => {
		const outSettings = compareSettings(settings);
		database.get('accounts').update({ UUID: auth.user.UUID }, { settings: JSON.stringify(outSettings) });
	});

	socket.on('disconnect', () => {
		console.log('Socket DisConnection:', auth.type.toUpperCase(), auth.user.username, socket.id);
	});
};

async function sendSiteReload() {
	await toAllSockets(
		(s) => {
			s.emit('reload');
		},
		(s) => s.auth.type == 'client'
	);
}

async function sendWatchListChange(updatedSegmentList, socket) {
	socket.emit(
		'watchListChange',
		updatedSegmentList.filter((x) => x.ID == searchOBJ.series)
	);
	// await toAllSockets(
	// 	(s) => {
	// 		s.emit(
	// 			'watchListChange',
	// 			updatedSegmentList.filter((x) => x.ID == searchOBJ.series)
	// 		);
	// 	},
	// 	(s) => s.auth.type == 'client' && s.auth.user.UUID == socket.auth.user.UUID
	// );
}

module.exports = {
	initialize,
	sendSiteReload,
	sendWatchListChange,
};
