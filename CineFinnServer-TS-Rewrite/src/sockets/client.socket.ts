import { Database } from '@jodu555/mysqlapi';
import { debounce, toAllSockets, getSeries } from '../utils/utils';
import { writeWatchInfoToDatabase } from '../utils/watchManager';
import { parse, load, Segment, searchObject } from '../utils/watchString';
import { defaultSettings, compareSettings } from '../utils/settings';
import { cleanupSeriesBeforeFrontResponse } from '../classes/series';
import { DatabaseParsedTodoItem, DatabaseTodoItem } from '../types/database';
import { ExtendedSocket, ExtendedRemoteSocket, Role } from '../types/session';
import { isPermitted } from '../utils/roleManager';
import { getAniworldInfos, getZoroInfos, isScraperSocketConnected } from './scraper.socket';
import { LOOKUP, callpointToEvent } from '../routes/managment';

const database = Database.getDatabase();

const timeDebug = false;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));


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
		if (!isPermitted(auth.user, Role.Mod)) {
			const todosDB = await database.get<DatabaseTodoItem>('todos').get();
			const todos: DatabaseParsedTodoItem[] = todosDB.map((t) => JSON.parse(t.content));
			socket.emit('todoListUpdate', todos.sort((a, b) => a.order - b.order));
			return;
		}
		const didID: string[] = [];
		const scrapeJobs = [];
		for (const todo of list) {
			const item = await database.get<DatabaseTodoItem>('todos').getOne({ ID: todo.ID });
			if (item) {
				if (isScraperSocketConnected() && (!todo.scraped && todo.references.aniworld !== '') || (!todo.scrapedZoro && todo.references.zoro !== '')) {
					todo.scraped = true;
					scrapeJobs.push(() => {
						backgroundScrapeTodo(todo)
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

		if (isPermitted(auth.user, Role.Admin)) {
			for (const deletedItem of deleted) {
				await database.get('todos').delete({ ID: deletedItem.ID, content: deletedItem.content });
			}
		}

		await toAllSockets(
			(s) => {
				s.emit('todoListUpdate', list);
			},
			(s) => s.auth.type == 'client'
			// && s.id != socket.id
		);

		scrapeJobs.forEach(f => f());
	});

	socket.on('disconnect', () => {
		console.log('Socket DisConnection:', auth.type.toUpperCase(), auth.user.username, socket.id);
	});

	// socket.emit('reloadSeries', cleanupSeriesBeforeFrontResponse(getSeries()));


	Object.values(LOOKUP).forEach(v => {
		if (auth.user.role >= v.role) {
			socket.emit(callpointToEvent(v.callpoint));
		}
	})


};

async function backgroundScrapeTodo(todo: DatabaseParsedTodoItem) {
	//Create an Independent Copy of todo


	todo = JSON.parse(JSON.stringify(todo)) as DatabaseParsedTodoItem;
	new Promise<void>(async (resolve, reject) => {
		try {
			if (todo.scrapingError != undefined && todo.scrapingError?.trim() != '') {
				throw new Error('Got Scraping error and waiting for user to intervene and retry');
			}
			const time = Date.now();
			console.log('Kicked off scraper', todo.references.aniworld);

			const [aniInfos, zoroInfos] = await Promise.all([
				todo.references.aniworld ? getAniworldInfos({ url: todo.references.aniworld }) : null,
				todo.references.zoro ? getZoroInfos({ ID: todo.references.zoro }) : null,
			]);

			if (todo.references.aniworld && !aniInfos || todo.references.zoro && !zoroInfos) {
				console.log('Got Bad Infos', aniInfos, 'for url', todo.references.aniworld);
				console.log('Got Bad Infos', zoroInfos, 'for url', todo.references.zoro);
				throw new Error('No Aniworld Or Zoro infos found');
			}

			if (todo.scrapingError)
				delete todo.scrapingError;

			if (aniInfos)
				todo.scraped = aniInfos;
			if (zoroInfos)
				todo.scrapedZoro = zoroInfos;
			//Updating db todo
			await database.get('todos').update({ ID: todo.ID }, { content: JSON.stringify(todo) });

			let run = true
			let exitCon = 0;
			let list: DatabaseParsedTodoItem[] = [];
			while (run) {
				exitCon++;
				const todosDBList = await database.get<DatabaseTodoItem>('todos').get();
				list = todosDBList.map((t) => JSON.parse(t.content));

				if (exitCon > 50) {
					run = false;
					console.log('Met Exit condition');
				}

				if (list.find(x => x.ID == todo.ID).scraped == true) {
					console.log('Impossible....');
					await wait(42);
				} else {
					run = false;
				}
			}

			console.log('Scrape and update for', todo.references.aniworld, 'took', Date.now() - time, 'ms');


			//sending out full todo list as update
			await toAllSockets(
				(s) => {
					s.emit('todoListUpdate', list);
				},
				(s) => s.auth.type == 'client'
			);
			resolve()
		} catch (error) {
			console.log('Error while backgroundScrapeTodo:', error);
			todo.scraped = undefined;
			delete todo.scraped;
			todo.scrapingError = 'Error while issuing Scraper';
			await database.get('todos').update({ ID: todo.ID }, { content: JSON.stringify(todo) });
			// reject(error);
			const todosDBList = await database.get<DatabaseTodoItem>('todos').get();
			const list: DatabaseParsedTodoItem[] = todosDBList.map((t) => JSON.parse(t.content));

			//sending out full todo list as update
			await toAllSockets(
				(s) => {
					s.emit('todoListUpdate', list);
				},
				(s) => s.auth.type == 'client'
			);
			resolve();
		}
	})
}

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

export { initialize, sendSiteReload, sendWatchListChange, sendSeriesReloadToAll, backgroundScrapeTodo };
