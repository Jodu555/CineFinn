import fs from 'fs';
import path from 'path';
import { sendSeriesReloadToAll, sendSiteReload } from '../sockets/client.socket';
import { getAniworldInfos, waitingForResponse } from '../sockets/scraper.socket';
import { getSeries, getAuthHelper, getIO, getVideoStreamLog, toAllSockets, setSeries, dangerouslySetSeries } from './utils';
import { CommandManager, Command } from '@jodu555/commandmanager';
import { AuthToken, ExtendedRemoteSocket, User } from '../types/session';
import { getSyncRoom } from './room.utils';
import { Database } from '@jodu555/mysqlapi';
import { DatabaseSyncRoomItem } from '../types/database';
import { checkifSubExists, getAllFilesFromAllSubs, subSocketMap, toggleSeriesDisableForSubSystem } from '../sockets/sub.socket';

const commandManager = CommandManager.getCommandManager();
const database = Database.getDatabase();

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
				await getSeries(true, false, false);
				await sendSeriesReloadToAll();

				return 'Reloaded the series config successfully';
			}
		)
	);
	commandManager.registerCommand(
		new Command(
			['disable'],
			'disable <subID / SeriesID>',
			"Disables a series temporarily like if the series isn't present",
			async (command, [...args], scope) => {
				const id = args[1];
				if (!id) {
					return 'You need to specify a series or sub ID!';
				}

				if (await checkifSubExists(id)) {
					toggleSeriesDisableForSubSystem(id, true);
					return 'Disabled the sub system Series for: ' + id;
				}

				setSeries(
					(await getSeries()).map((x) => {
						if (x.ID == id) {
							x.infos.disabled = true;
						}
						return x;
					})
				);
				await sendSeriesReloadToAll();

				return 'Disabled the series for: ' + id;
			}
		)
	);

	commandManager.registerCommand(
		new Command(['enable'], 'enable <subID / SeriesID>', 'Enables a series back again if previously disabled', async (command, [...args], scope) => {
			const id = args[1];
			if (!id) {
				return 'You need to specify a series or sub ID!';
			}

			if (await checkifSubExists(id)) {
				toggleSeriesDisableForSubSystem(id, false);
				return 'Enables the sub system Series for: ' + id;
			}

			setSeries(
				(await getSeries()).map((x) => {
					if (x.ID == id) {
						x.infos.disabled = false;
					}
					return x;
				})
			);
			await sendSeriesReloadToAll();

			return 'Enabled the series for: ' + id;
		})
	);

	commandManager.registerCommand(
		new Command(['delete', 'del'], 'delete <SeriesID>', 'Deletes a series indefinetly with everything to it', async (command, [...args], scope) => {
			const id = args[1];
			if (!id) {
				return 'You need to specify a Series ID!';
			}
			const series = await getSeries();

			const serie = series.find((x) => x.ID == id);

			if (!serie) {
				return 'Series with ID: ' + id + ' does not exist!';
			}

			dangerouslySetSeries((await getSeries()).filter((x) => x.ID != id));
			await sendSeriesReloadToAll();

			return 'Deleted the series for: ' + id + ' with title ' + serie.title;
		})
	);

	commandManager.registerCommand(
		new Command(['authsession', 'as'], 'authsession [list/pool]', 'Lists the current authenticated session', async (command, [...args], scope) => {
			const accounts = await database.get<User>('accounts').get();
			const tokens = await database.get<AuthToken>('authtokens').get();
			if (args[1] == 'list') {
				const output = ['Current authsessions:'];
				for (const token of tokens) {
					output.push(` - ${token.TOKEN} => ${accounts.find((x) => x.UUID === token.UUID)?.username}`);
				}
				output.push('', '------------------------------------');
				return output;
			} else if (args[1] == 'pool') {
				const aggregatedTokensbyUUID = tokens.reduce<Record<string, AuthToken[]>>((acc, cur) => {
					if (acc[cur.UUID]) {
						acc[cur.UUID].push(cur);
					} else {
						acc[cur.UUID] = [cur];
					}
					return acc;
				}, {});

				const output = ['Current Pooled authsessions by UUID:'];
				for (const UUID in aggregatedTokensbyUUID) {
					output.push(` - ${UUID} => ${accounts.find((x) => x.UUID === UUID)?.username} : ${aggregatedTokensbyUUID[UUID].length}`);
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
			sockets.sort((a, b) => {
				const priorities = { scraper: 2, sub: 1, default: 0 };
				return (priorities[b.auth.type] || priorities.default) - (priorities[a.auth.type] || priorities.default);
			});
			for (const socket of sockets) {
				if (socket.auth.type == 'sub') {
					output.push(
						` - ${socket.auth.type.toUpperCase()} => ${socket.auth.id} ${socket.auth.endpoint} - ${socket.auth.ptoken ? socket.auth?.ptoken : ''} `
					);
				}
				if (socket.auth.type == 'client') {
					output.push(
						` - ${socket.auth.type.toUpperCase()} => ${socket.auth.user?.username || socket.auth.id || ''} ${socket.sync ? socket.sync?.ID : ''} - ${
							socket.id
						}`
					);
				}
				if (socket.auth.type == 'scraper') {
					output.push(` - ${socket.auth.type.toUpperCase()} => Function waiting: ${waitingForResponse.length}`);
				}
			}
			output.push('', '------------------------------------');
			return output;
		})
	);

	commandManager.registerCommand(
		new Command(
			['reloadClient', 'rlc'],
			'reloadClient <all/Socket-ID/User-UUID>',
			'Reloads the page for all current connected sockets',
			async (command, [...args], scope) => {
				if (args[1] == 'all') {
					const num = sendSiteReload();
					return 'Reloaded ' + num + ' socket(s)';
				} else {
					const socketIDOrUserUUID = args[1];
					const sockets = (await getIO().fetchSockets()) as ExtendedRemoteSocket[];
					let i = 0;
					sockets.forEach((x) => {
						if (x.id == socketIDOrUserUUID || x.auth.user?.UUID == args[1]) {
							i++;
							x.emit('reload');
						}
					});
					if (i == 0) {
						return 'No socket found with Socket-ID or User-UUID:' + socketIDOrUserUUID;
					} else {
						return 'Reloaded' + i + 'socket(s)';
					}
				}
			}
		)
	);

	commandManager.registerCommand(
		new Command(['save'], 'save', 'Saves the current series data to the file', (command, [...args], scope) => {
			fs.writeFileSync(process.env.LOCAL_DB_FILE, JSON.stringify(getSeries(), null, 3), 'utf8');
			return '';
		})
	);

	commandManager.registerCommand(
		new Command(
			['fetchInfos', 'fi'],
			'fetchInfos [all/seriesID]',
			'Fetches the informations for a secified series',
			async (command, [...args], scope) => {
				if (args[1] == 'all') {
					console.log('Started to fetch all Series Informations!');
				} else {
					console.log(`Started to fetch the Informations for ${args[1]}!`);
					const serie = (await getSeries()).find((x) => x.ID == args[1]);
					if (serie == undefined) {
						return 'Cant find series with that ID';
					}
					if (serie.references.aniworld == undefined) {
						return 'The Series has no reference point for aniworld';
					}
					getAniworldInfos({ url: serie.references.aniworld as string });
				}
				return '';
			}
		)
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
				console.log('All File Streams are now Cleared and Ended');
				getVideoStreamLog().forEach((old, idx) => {
					old.stream.destroy();
					console.log('Destroyed stream for', old.userUUID, (Date.now() - old.time) / 1000, 's', old.path);
					getVideoStreamLog().splice(idx, 1);
				});
			}
			return '';
		})
	);

	commandManager.registerCommand(
		new Command(['sync'], 'sync set owner <RoomID> <UserUUID>', 'Manages The File Streams', async (command, [...args], scope) => {
			if (args[1] == 'set' && args[2] == 'owner') {
				const roomID = args[3];
				const userUUID = args[4];
				const room = await getSyncRoom(parseInt(roomID));
				if (!room) {
					return `Room with ${roomID} ID not found`;
				}

				if (room.members.find((x) => x.UUID == userUUID) == undefined) {
					return `User with ${userUUID} UUID not found in Room`;
				}

				room.members = room.members.map((x) => {
					if (x.UUID == userUUID) {
						x.role = 1;
					} else {
						x.role = 0;
					}
					return x;
				});

				//Update Database with updated room object
				await database.get<Partial<DatabaseSyncRoomItem>>('sync_rooms').update({ ID: room.ID }, { members: JSON.stringify(room.members) });

				//Update Room list for other sockets
				await toAllSockets(
					(s) => {
						s.emit('sync-update-rooms');
					},
					(s) => s.auth.type == 'client'
				);
			}
			return '';
		})
	);

	commandManager.registerCommand(
		new Command(['test'], 'test', 'Just a simple test command', async (command, [...args], scope) => {
			// console.log(await getAllFilesFromAllSubs());
			// const series = await getSeries();

			// const eps = series.filter((x) => x.seasons.flat().some((e) => e.subID == args[1]));

			// console.log(eps);

			const socketIDOrUserUUID = args[1];
			const sockets = (await getIO().fetchSockets()) as ExtendedRemoteSocket[];
			let i = 0;
			sockets.forEach((socket) => {
				if (socket.id == socketIDOrUserUUID || socket.auth.user?.UUID == args[1]) {
					const sessionID = Math.floor(Math.random() * 10 ** 5).toString();
					console.log('U just forcibly started for', socket.auth.user.username, 'a rmvc Session with ID', sessionID);
					socket.auth.RMVCSessionID = sessionID;
					socket.emit('rmvc-sessionCreated', sessionID);
				}
			});

			return 'Exectued test command successfully';
		})
	);
}

export { registerCommands };
