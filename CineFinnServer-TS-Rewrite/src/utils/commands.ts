import fs from 'fs';
import path from 'path';
import { sendSeriesReloadToAll, sendSiteReload } from '../sockets/client.socket';
import { getAniworldInfos } from '../sockets/scraper.socket';
import { getSeries, getAuthHelper, getIO, getVideoStreamLog } from './utils';
import { CommandManager, Command } from '@jodu555/commandmanager';
import { ExtendedRemoteSocket } from '../types/session';

const commandManager = CommandManager.getCommandManager();

function registerCommands() {
	commandManager.registerCommand(
		new Command(
			['reload', 'rl'],
			'reload',
			'Reloads the infos from current out.json file wihout before saving them',
			async (command, [...args], scope) => {
				getSeries(false, true);
				await sendSeriesReloadToAll();

				return 'Reloaded the series config successfully';
			}
		)
	);
	commandManager.registerCommand(
		new Command(
			['reloadDel', 'rld'],
			'reload',
			'Rescrapes the archive with being agressive when a series does not exist',
			async (command, [...args], scope) => {
				getSeries(true, false, false);
				await sendSeriesReloadToAll();

				return 'Reloaded the series config successfully';
			}
		)
	);
	commandManager.registerCommand(
		new Command(['authsession', 'as'], 'authsession [list]', 'Lists the current authenticated session', (command, [...args], scope) => {
			if (args[1] == 'list') {
				const output = ['Current authsessions:'];
				for (const [token, obj] of getAuthHelper().tokens) {
					output.push(` - ${token} => ${obj.username}`);
				}
				output.push('', '------------------------------------');
				return output;
			} else {
				return 'You need to specify an argument!';
			}
		})
	);

	commandManager.registerCommand(
		new Command(['socketsessions', 'ss'], 'socketsessions', 'Lists the current active socket sessions', async (command, [...args], scope) => {
			const output = ['Current socket sessions:'];
			const sockets = (await getIO().fetchSockets()) as ExtendedRemoteSocket[];
			for (const socket of sockets) {
				output.push(` - ${socket.auth.type.toUpperCase()} => ${socket.auth.user?.username || ''} ${socket.sync ? socket.sync?.ID : ''} `);
			}
			output.push('', '------------------------------------');
			return output;
		})
	);

	commandManager.registerCommand(
		new Command(['reloadClient', 'rlc'], 'reloadClient', 'Reloads the page for all current connected sockets', (command, [...args], scope) => {
			sendSiteReload();
			return '';
		})
	);

	commandManager.registerCommand(
		new Command(['save'], 'save', 'Saves the current series data to the file', (command, [...args], scope) => {
			fs.writeFileSync(process.env.LOCAL_DB_FILE, JSON.stringify(getSeries(), null, 3), 'utf8');
			return '';
		})
	);

	commandManager.registerCommand(
		new Command(['fetchInfos', 'fi'], 'fetchInfos [all/seriesID]', 'Fetches the informations for a secified series', (command, [...args], scope) => {
			if (args[1] == 'all') {
				console.log('Started to fetch all Series Informations!');
			} else {
				console.log(`Started to fetch the Informations for ${args[1]}!`);
				const serie = getSeries().find((x) => x.ID == args[1]);
				if (serie == undefined) {
					return 'Cant find series with that ID';
				}
				if (serie.references.aniworld == undefined) {
					return 'The Series has no reference point for aniworld';
				}
				getAniworldInfos({ url: serie.references.aniworld as string });
			}
			return '';
		})
	);

	commandManager.registerCommand(
		new Command(['stream', 'streams'], 'stream [list/clear]', 'Manages The File Streams', (command, [...args], scope) => {
			if (args[1] == 'list') {
				console.log(`There are currently ${getVideoStreamLog().length} open streams`);
				for (const streamLog of getVideoStreamLog()) {
					console.log(
						` => ${(Date.now() - streamLog.time) / 1000}s Old From: ${streamLog.start} - ${streamLog.end} in File: ${path.parse(streamLog.path).name}`
					);
				}
			} else if (args[1] == 'clear') {
				console.log('All File Streams are now Cleared end Ended');
				getVideoStreamLog().forEach((old, idx) => {
					old.stream.destroy();
					console.log('Destroyed stream for', old.userUUID, (Date.now() - old.time) / 1000, 's', old.path);
					getVideoStreamLog().splice(idx, 1);
				});
			}
			return '';
		})
	);
}

export { registerCommands };
