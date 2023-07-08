import { Database } from '@jodu555/mysqlapi';
import { DatabaseTodoItem, ExtendedRemoteSocket, ExtendedSocket } from '../utils/types';
import { debounce, toAllSockets, getSeries } from '../utils/utils';
import { writeWatchInfoToDatabase } from '../utils/watchManager';
import { parse, load, Segment, searchObject } from '../utils/watchString';
import { defaultSettings, compareSettings } from '../utils/settings';
import { cleanupSeriesBeforeFrontResponse } from '../classes/series';

const database = Database.getDatabase();

const timeDebug = false;

const initialize = (socket: ExtendedSocket) => {
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

	socket.on('getWatchList', async ({ ID }) => {
		const segList = parse(await load(auth.user.UUID));
		socket.emit('watchListChange', { watchList: segList.filter((seg) => seg.ID == ID) });
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
		const sessionID = Math.floor(Math.random() * 10 ** 5).toString();
		console.log('User', auth.user.username, 'Just started a rmvc Session with ID', sessionID);
		socket.auth.RMVCSessionID = sessionID;
		socket.emit('rmvc-sessionCreated', sessionID);
	});

	socket.on('rmvc-send-sessionStop', () => {
		console.log('User', auth.user.username, 'Just destroyed his/her rmvc Session with ID', socket.auth.RMVCSessionID);
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
		const didID: string[] = [];
		for (const todo of list) {
			const item = await database.get<DatabaseTodoItem>('todos').getOne({ ID: todo.ID });
			if (item) {
				await database.get('todos').update({ ID: todo.ID }, { content: JSON.stringify(todo) });
			} else {
				await database.get('todos').create({ ID: todo.ID, content: JSON.stringify(todo) });
			}
			didID.push(todo.ID);
		}
		const items = await database.get<DatabaseTodoItem>('todos').get();
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

async function sendSeriesReloadToAll(cb?: (socket: ExtendedRemoteSocket) => void) {
	toAllSockets(
		(s) => {
			if (typeof cb === 'function') cb(s);
			s.emit('reloadSeries', cleanupSeriesBeforeFrontResponse(getSeries()));
		},
		(s) => s.auth.type == 'client'
	);
}

export interface WatchListChangeSearchObject {
	series: string;
}

async function sendWatchListChange(
	updatedSegmentList: Segment[],
	socket: ExtendedRemoteSocket | ExtendedSocket,
	searchOBJ: WatchListChangeSearchObject
) {
	if (searchOBJ) {
		socket.emit('watchListChange', { watchList: updatedSegmentList.filter((x) => x.ID == searchOBJ.series), seriesID: searchOBJ.series });
	} else {
		socket.emit('watchListChange', { watchList: updatedSegmentList });
	}
}

export { initialize, sendSiteReload, sendWatchListChange, sendSeriesReloadToAll };
