import { Database } from '@jodu555/mysqlapi';
import { ExtendedSocket, User } from '../types/session';
import { getIO, getSeries, getVideoStreamLog, toAllSockets } from './utils';
import { subSocketMap } from '../sockets/sub.socket';
import { isScraperSocketConnected } from '../sockets/scraper.socket';
const database = Database.getDatabase();

async function generateOverview() {
	const accounts = await database.get<User>('accounts').get({});
	const series = await getSeries();

	const possibleSubSystems = new Set();

	let episodes = 0;
	let movies = 0;
	series.map((x) => {
		episodes += x.seasons.flat().length;
		movies += x.movies.length;
		[...x.movies, ...x.seasons.flat()].forEach((y) => {
			possibleSubSystems.add(y.subID);
		});
	});

	return {
		accounts: accounts.length,
		series: series.length,
		episodes,
		movies,
		connectedSubSystems: subSocketMap.size,
		possibleSubSystems: possibleSubSystems.size - 1, //Necessary to subtract the main subID since it technically isn't a SubSystem
		streams: getVideoStreamLog().length,
		sockets: (await getIO().fetchSockets()).length,
		scraper: isScraperSocketConnected(),
	};
}

async function generateAccounts() {
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
		},
		(s) => s.auth.user?.role >= 2
	);
}
