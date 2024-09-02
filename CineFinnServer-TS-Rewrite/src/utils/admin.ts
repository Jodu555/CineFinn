import { Database } from '@jodu555/mysqlapi';
import { ExtendedSocket, User } from '../types/session';
import { getIO, getSeries, getVideoStreamLog, toAllSockets } from './utils';
import { generateMovingItemArray, getAllKnownSubSystems, getSeriesBySubID, subSocketMap } from '../sockets/sub.socket';
import { isScraperSocketConnected } from '../sockets/scraper.socket';
const database = Database.getDatabase();

export async function generateOverview() {
	const accounts = await database.get<User>('accounts').get({});
	const series = await getSeries();

	let episodes = 0;
	let movies = 0;

	series.map((x) => {
		episodes += x.seasons.flat().length;
		movies += x.movies.length;
	});

	return {
		accounts: accounts.length,
		series: series.length,
		episodes,
		movies,
		connectedSubSystems: subSocketMap.size,
		possibleSubSystems: (await getAllKnownSubSystems()).length, //Necessary to subtract the main subID since it technically isn't a SubSystem
		streams: getVideoStreamLog().length,
		sockets: (await getIO().fetchSockets()).length,
		scraper: isScraperSocketConnected(),
	};
}

export async function generateSubSystems() {
	const subSockets: {
		id: string;
		ptoken: string;
		endpoint: string;
		affectedSeriesIDs: string[];
		type: 'sub';
	}[] = [];
	subSocketMap.forEach(async (value, key) => {
		subSockets.push({
			id: value.auth.id,
			ptoken: value.auth.ptoken,
			endpoint: value.auth.endpoint,
			affectedSeriesIDs: (await getSeriesBySubID(value.auth.id)).map((x) => x.ID),
			type: value.auth.type == 'sub' ? 'sub' : 'sub',
		});
	});
	const known = await getAllKnownSubSystems();

	const movingItems = await generateMovingItemArray();

	return { knownSubSystems: known, subSockets, movingItems: movingItems };
}

export async function generateAccounts() {
	const accounts = await database.get<User>('accounts').get({});
	return accounts.map((x) => {
		delete x.password;
		if (typeof x.activityDetails == 'string') {
			x.activityDetails = x.activityDetails ? JSON.parse(x.activityDetails) : {};
		}
		return x;
	});
}

export async function sendSocketAdminUpdate() {
	toAllSockets(
		async (socket) => {
			socket.emit('admin-update', { context: 'overview', data: await generateOverview() });
			socket.emit('admin-update', { context: 'accounts', data: await generateAccounts() });
			socket.emit('admin-update', { context: 'subsystem', data: await generateSubSystems() });
		},
		(s) => s.auth.user?.role >= 2
	);
}
