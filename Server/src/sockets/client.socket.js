const { Database } = require('@jodu555/mysqlapi');
const { cleanupSeriesBeforeFrontResponse } = require('../classes/series');
const { compareSettings, defaultSettings } = require('../utils/settings');
const { debounce, toAllSockets, getSeries } = require('../utils/utils');
const { writeWatchInfoToDatabase } = require('../utils/watchManager');
const { parse, load } = require('../utils/watchString');

const database = Database.getDatabase();

const timeDebug = false;

const initialize = (socket) => {
	const auth = socket.auth;
	console.log('Socket Connection:', auth.type.toUpperCase(), auth.user.username, socket.id);

	socket.on('timeUpdate', (obj) => {
		obj.time = Math.ceil(obj.time);
		if (obj.movie == -1 && obj.season == -1 && obj.episode == -1) return;
		timeDebug && console.log('TUpd:', auth.user.username, obj);
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

	socket.on('updateSettings', async (settings) => {
		const outSettings = compareSettings(settings);
		await database.get('accounts').update({ UUID: auth.user.UUID }, { settings: JSON.stringify(outSettings) });
		await toAllSockets(
			(s) => {
				s.emit('updateSettings', outSettings);
			},
			(s) => s.auth.type == 'client' && s.auth.user.UUID == auth.user.UUID
		);
	});

	socket.on('resetSettings', async () => {
		await database.get('accounts').update({ UUID: auth.user.UUID }, { settings: JSON.stringify(defaultSettings) });
		await toAllSockets(
			(s) => {
				s.emit('updateSettings', defaultSettings);
			},
			(s) => s.auth.type == 'client' && s.auth.user.UUID == auth.user.UUID
		);
	});

	socket.on('rmvc-send-sessionInfo', () => {
		const sessionID = socket.auth.RMVCSessionID;
		if (sessionID) {
			socket.emit('rmvc-sessionCreated', sessionID);
		} else {
			socket.emit('rmvc-sessionDestroyed');
		}
	});

	socket.on('rmvc-send-sessionStart', () => {
		const sessionID = Math.floor(Math.random() * 10 ** 5);
		console.log('User', auth.user.username, 'Just started a rmvc Session with ID', sessionID);
		socket.auth.RMVCSessionID = sessionID;
		socket.emit('rmvc-sessionCreated', sessionID);
	});

	socket.on('rmvc-send-sessionStop', () => {
		console.log('User', auth.user.username, 'Just destroyed his/her rmvc Session with ID', socket.RMVCSessionID);
		socket.auth.RMVCSessionID = '';
		socket.emit('rmvc-sessionDestroyed');
	});

	socket.on('rmvc-send-videoStateChange', async ({ isPlaying }) => {
		await toAllSockets(
			(s) => {
				s.emit('rmvc-recieve-videoStateChange', { isPlaying });
			},
			(s) => s.auth.RMVCEmitterSessionID == socket.auth.RMVCSessionID
		);
	});

	socket.on('todoListUpdate', async (list) => {
		const didID = [];
		for (const todo of list) {
			const item = await database.get('todos').getOne({ ID: todo.ID });
			if (item) {
				await database.get('todos').update({ ID: todo.ID }, { content: JSON.stringify(todo) });
			} else {
				await database.get('todos').create({ ID: todo.ID, content: JSON.stringify(todo) });
			}
			didID.push(todo.ID);
		}
		const items = await database.get('todos').get();
		const deleted = items.filter((x) => !didID.find((y) => y == x.ID));

		for (const deletedItem of deleted) {
			await database.get('todos').delete({ ID: deletedItem.ID, content: deletedItem.content });
		}

		await toAllSockets(
			(s) => {
				s.emit('todoListUpdate', list);
			},
			(s) => s.auth.type == 'client' && s.id != socket.id
		);
	});

	socket.on('disconnect', () => {
		console.log('Socket DisConnection:', auth.type.toUpperCase(), auth.user.username, socket.id);
	});

	// socket.emit('reloadSeries', cleanupSeriesBeforeFrontResponse(getSeries()));
};

async function sendSiteReload() {
	await toAllSockets(
		(s) => {
			s.emit('reload');
		},
		(s) => s.auth.type == 'client'
	);
}

async function sendSeriesReloadToAll(cb) {
	toAllSockets(
		(s) => {
			if (typeof cb === 'function') cb(s);
			s.emit('reloadSeries', cleanupSeriesBeforeFrontResponse(getSeries()));
		},
		(s) => s.auth.type == 'client'
	);
}

async function sendWatchListChange(updatedSegmentList, socket, searchOBJ) {
	if (searchOBJ) {
		socket.emit('watchListChange', { watchList: updatedSegmentList.filter((x) => x.ID == searchOBJ.series), seriesID: searchOBJ.series });
	} else {
		socket.emit('watchListChange', { watchList: updatedSegmentList });
	}
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
	sendSeriesReloadToAll,
};
