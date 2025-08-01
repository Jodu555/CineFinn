import { Database } from '@jodu555/mysqlapi';
import { debounce, toAllSockets, getSeries } from '../utils/utils';
import { writeWatchInfoToDatabase } from '../utils/watchManager';
import { parse, load, Segment, searchObject } from '../utils/watchString';
import { defaultSettings, compareSettings } from '../utils/settings';
import { cleanupSeriesBeforeFrontResponse } from '../classes/series';
import { ExtendedSocket, ExtendedRemoteSocket, Role } from '../types/session';
import { isPermitted } from '../utils/roleManager';
import { isScraperSocketConnected } from './scraper.socket';
import { LOOKUP, callpointToEvent } from '../routes/managment';
import { backgroundScrapeTodo, checkIfTodoNeedsScrape } from '../utils/todo';
import { sendSocketAdminUpdate } from '../utils/admin';
import { prepareProcessMovingItem, processMovingItem } from './sub.socket';
import { DatabaseParsedTodoItem, DatabaseTodoItem } from '@Types/database';

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
			(s) => s.auth.RMVCEmitterSessionID == socket.auth.RMVCSessionID && s.auth.RMVCEmitterSessionID != ''
		);
	});

	socket.on('todoListUpdate', async (list) => {
		// console.log('TodoListUpdate from', auth.user.username, 'with', list.length, 'items');

		if (!isPermitted(auth.user, Role.Mod)) {
			console.log('Not permitted to update todos');
			const todosDB = await database.get<DatabaseTodoItem>('todos').get();
			const todos: DatabaseParsedTodoItem[] = todosDB.map((t) => JSON.parse(t.content));
			socket.emit(
				'todoListUpdate',
				todos.sort((a, b) => a.order - b.order)
			);
			return;
		}
		const didID: string[] = [];
		const scrapeJobs = [];
		let hadToScrape = false;
		for (const todo of list) {
			const item = await database.get<DatabaseTodoItem>('todos').getOne({ ID: todo.ID });
			if (item) {
				if (isScraperSocketConnected() && checkIfTodoNeedsScrape(todo)) {
					hadToScrape = true;
					todo.scraped = true;
					scrapeJobs.push(() => {
						backgroundScrapeTodo(todo);
					});
				}
				await database.get('todos').update({ ID: todo.ID }, { content: JSON.stringify(todo) });
			} else {
				await database.get('todos').create({ ID: todo.ID, content: JSON.stringify(todo) });
			}
			didID.push(todo.ID);
		}
		const items = await database.get<DatabaseTodoItem>('todos').get();
		const deleted = items.filter((x) => !didID.find((y) => y == x.ID));

		let onedeletionFailed = false;
		for (const deletedItem of deleted) {
			// console.log('Trying to delete todo', deletedItem.ID);
			const deletedTodo = JSON.parse(deletedItem.content) as DatabaseParsedTodoItem;
			if (isPermitted(auth.user, Role.Admin)) {
				// console.log('Deleting todo', deletedItem.ID, 'from DB cause of Admin');
				await database.get('todos').delete({ ID: deletedItem.ID, content: deletedItem.content });
			} else if (deletedTodo.creator == auth.user.UUID && isPermitted(auth.user, Role.Mod)) {
				// console.log('Deleting todo', deletedItem.ID, 'from DB cause of Mod');
				await database.get('todos').delete({ ID: deletedItem.ID, content: deletedItem.content });
			} else {
				onedeletionFailed = true;
				// console.log('Not deleting todo', deletedItem.ID, 'from DB cause of User');
			}
		}

		const newTodos: DatabaseParsedTodoItem[] = (await database.get<DatabaseTodoItem>('todos').get()).map(x => JSON.parse(x.content));

		await toAllSockets(
			(s) => {
				s.emit('todoListUpdate', newTodos);
			},
			(s) => {
				if (s.auth.type == 'client') {

					if (onedeletionFailed) return true;

					if (hadToScrape && s.id == socket.id) return true;

					if (!hadToScrape && s.id != socket.id) return true;
				}
				return false;
			}
		);

		scrapeJobs.forEach((f) => f());
	});

	socket.on('disconnect', () => {
		console.log('Socket DisConnection:', auth.type.toUpperCase(), auth.user.username, socket.id);
	});

	socket.on('move-moving-item', ({ ID }) => {
		if (!isPermitted(auth.user, Role.Mod)) {
			return;
		}
		prepareProcessMovingItem(ID);
	});

	// socket.emit('reloadSeries', cleanupSeriesBeforeFrontResponse(getSeries()));

	//TODO: This does not care if a job is running or not
	// Object.values(LOOKUP).forEach((v) => {
	// 	if (auth.user.role >= v.role) {
	// 		socket.emit(callpointToEvent(v.callpoint));
	// 	}
	// });
};

async function sendSiteReload() {
	let i = 0;
	await toAllSockets(
		(s) => {
			i++;
			s.emit('reload');
		},
		(s) => s.auth.type == 'client'
	);
	return i;
}

async function sendSeriesReloadToAll(cb?: (socket: ExtendedRemoteSocket) => void) {
	toAllSockets(
		async (s) => {
			if (typeof cb === 'function') cb(s);
			s.emit('reloadSeries', cleanupSeriesBeforeFrontResponse(await getSeries()));
		},
		(s) => s.auth.type == 'client'
	);

	sendSocketAdminUpdate();
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
