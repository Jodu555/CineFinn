import { ExtendedSocket } from '../types/session';
import { Langs } from '../types/classes';
import { randomUUID } from 'node:crypto';
import { getSeries, setSeries } from '../utils/utils';
import { sendSeriesReloadToAll } from './client.socket';

const subSocketMap = new Map<string, ExtendedSocket>();

const initialize = async (socket: ExtendedSocket) => {
	const auth = socket.auth;
	console.log('Socket Connection:', auth.type.toUpperCase(), auth.id, auth.ptoken);

	subSocketMap.set(auth.id, socket);

	socket.setMaxListeners(555);

	socket.on('disconnect', async () => {
		console.log('Socket DisConnection:', auth.type.toUpperCase());
		subSocketMap.delete(auth.id);

		await toggleSeriesDisableForSubSystem(auth.id, true);
	});

	await toggleSeriesDisableForSubSystem(auth.id, false);
};

interface SubFile {
	subID: string;
	path: string;
}

async function toggleSeriesDisableForSubSystem(subID: string, disabled: boolean) {
	const match = await getSeriesBySubID(subID);

	console.log(`${disabled ? 'Disabling' : 'Enabling'} sub system for: ${subID} affected ${match.length} Series`);

	setSeries(
		(await getSeries()).map((x) => {
			if (match.some((y) => y.ID == x.ID)) {
				x.infos.disabled = disabled;
			}
			return x;
		})
	);
	await sendSeriesReloadToAll();
}

function getSubSocketByID(subID: string): ExtendedSocket | undefined {
	return subSocketMap.get(subID);
}

async function getSeriesBySubID(subID: string) {
	const series = await getSeries();

	const serie = series.filter((x) => x.seasons.flat().some((e) => e.subID == subID) || x.movies.some((e) => e.subID == subID));
	return serie;
}

async function checkifSubExists(subID: string) {
	const series = await getSeriesBySubID(subID);
	return series.length > 0;
}

async function getAllFilesFromAllSubs() {
	const allFiles = await new Promise<SubFile[]>((resolve, reject) => {
		let waitFor: string[] = [];
		const allFilesInner: SubFile[] = [];
		if (subSocketMap.size == 0) {
			resolve([]);
			return;
		}

		setTimeout(() => {
			reject(new Error('Timeout Reached with: ' + waitFor.join(', ')));
		}, 1000 * 60 * 1);

		subSocketMap.forEach((socket) => {
			socket.once('files', ({ files }) => {
				allFilesInner.push(...files.map((x) => ({ path: x, subID: socket.auth.id })));
				waitFor = waitFor.filter((k) => k !== socket.auth.id);

				console.log('Response from:', `"${socket.auth.id}"`, 'waiting for:', waitFor.join(', '));
				if (waitFor.length == 0) {
					resolve(allFilesInner);
				}
			});
			waitFor.push(socket.auth.id);
			console.log('Requesting from:', socket.auth.id, 'waiting for:', waitFor.join(', '));

			socket.emit('listFiles');
		});
	});
	return allFiles;
}

export { initialize, subSocketMap, getAllFilesFromAllSubs, SubFile, getSubSocketByID, toggleSeriesDisableForSubSystem, checkifSubExists };