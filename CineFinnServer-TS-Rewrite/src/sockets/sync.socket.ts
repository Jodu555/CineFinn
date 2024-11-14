import { toAllSockets } from '../utils/utils';
import { ExtendedSocket } from '../types/session';
import { Database } from '@jodu555/mysqlapi';
import { fullObjectToDatabase, getRoomCheckIfExists, getRoomCheckIfExistsAndOwner, getSyncRoom } from '../utils/room.utils';
import { DatabaseParsedSyncRoomItem, DatabaseSyncRoomItem } from '@Types/database';
const database = Database.getDatabase();

const initialize = (socket: ExtendedSocket) => {
	const auth = socket.auth;
	console.log('Socket-Sync Connection:', auth.type.toUpperCase(), auth.user.username, socket.id);

	const leave = async () => {
		if (socket.sync == undefined) return;
		console.log('SOCKET with auth', auth.user.username, 'sync-leave', socket.sync);
		const room = await getRoomCheckIfExists(socket?.sync?.ID, socket);
		if (room == false) return;

		//Filter leaving socket out of members
		room.members = room.members.filter((x) => x.UUID != auth.user.UUID);
		socket.sync = undefined;

		if (room.members.length == 0) {
			//Delete Room
			await database.get<Partial<DatabaseSyncRoomItem>>('sync_rooms').delete({ ID: room.ID });

			//Update Room list for other sockets
			await toAllSockets(
				(s) => {
					s.emit('sync-update-rooms');
				},
				(s) => s.auth.type == 'client'
			);
			return;
		}

		//Check if Owner is still present
		if (!room.members.find((x) => x.role == 1)) {
			//Adding next on list to be Owner
			room.members[0].role = 1;
		}

		//Update Database with updated room object
		await database.get<Partial<DatabaseSyncRoomItem>>('sync_rooms').update({ ID: room.ID }, { members: JSON.stringify(room.members) });

		//Update Room list for other sockets
		await toAllSockets(
			(s) => {
				s.emit('sync-update-rooms');
			},
			(s) => s.auth.type == 'client'
		);
	};

	socket.on('disconnect', async () => {
		if (socket.sync == undefined) return;
		console.log('Socket-Sync DisConnection:', auth.type.toUpperCase());
		await leave();
	});

	socket.on('sync-leave', async (obj) => {
		if (obj.ID !== socket?.sync?.ID) {
			console.log('SOCKET with auth', auth.user.username, 'tried to leave room', obj.ID, 'but was not in it');
			socket.emit('sync-message', { type: 'error', message: 'You tried to leave a room that your ID is not enlisted in' });
			return;
		}
		await leave();
	});

	socket.on('sync-create', async (obj) => {
		console.log('SOCKET with auth', auth.user.username, 'sync-create', obj);

		socket.sync = obj;

		//Check if room ID is unique
		const room = getSyncRoom(obj.ID);
		if (!room) {
			socket.emit('sync-message', { type: 'error', message: 'The Room ID is already occupied, please try again!' });
			return;
		}

		//Create room Object
		const roomObject: DatabaseParsedSyncRoomItem = {
			ID: String(obj.ID),
			seriesID: '',
			members: [
				{
					UUID: auth.user.UUID,
					name: auth.user.username,
					role: 1,
				},
			],
			created_at: new Date().getTime(),
		};

		//Insert room Object into database
		await database.get<DatabaseSyncRoomItem>('sync_rooms').create(fullObjectToDatabase(roomObject));

		//Send success message
		socket.emit('sync-message', { type: 'success', message: `Room with ID ${obj.ID} successfully created!` });

		//Update Room list for other sockets
		await toAllSockets(
			(s) => {
				s.emit('sync-update-rooms');
			},
			(s) => s.auth.type == 'client' && s.id != socket.id
		);
	});

	socket.on('sync-join', async (obj) => {
		console.log('SOCKET with auth', auth.user.username, 'sync-join', obj);
		socket.sync = obj;

		//Get Current Room
		const room = await getRoomCheckIfExists(socket.sync?.ID, socket);

		if (!room) {
			return false;
		}

		//Check if user is already in room
		if (room.members.find((x) => x.UUID == auth.user.UUID) !== undefined) {
			socket.emit('sync-message', { type: 'error', message: `You are already in this room!` });
			return;
		}

		//Add current user to room
		room.members.push({
			UUID: auth.user.UUID,
			name: auth.user.username,
			role: 0,
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
	});

	socket.on('sync-selectSeries', async (obj) => {
		const room = await getRoomCheckIfExistsAndOwner(socket.sync?.ID, socket);
		if (room == false) {
			return;
		}

		//Update Database for the new series
		await database.get<Partial<DatabaseSyncRoomItem>>('sync_rooms').update({ ID: room.ID }, { seriesID: String(obj.ID) });

		console.log('SOCKET with auth', auth.user.username, 'and room', socket.sync, 'sync-selectSeries', obj);
		await toAllSockets(
			(s) => {
				s.emit('sync-selectSeries', obj);
			},
			(s) => s.auth.type == 'client' && s.id != socket.id && s.sync?.ID == socket.sync?.ID
		);
		await toAllSockets(
			(s) => {
				s.emit('sync-update-rooms');
			},
			(s) => s.auth.type == 'client' && s.id != socket.id
		);
	});

	socket.on('sync-promote', async ({ userUUID }) => {
		const room = await getRoomCheckIfExistsAndOwner(socket.sync?.ID, socket);
		if (room == false) {
			return;
		}

		if (room.members.find((x) => x.UUID == userUUID) == undefined) {
			socket.emit('sync-message', { type: 'error', message: 'The User you want to promote is not in this room!' });
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
	});

	socket.on('sync-video-change', async (obj) => {
		const room = await getRoomCheckIfExistsAndOwner(socket.sync?.ID, socket);
		if (room == false) {
			return;
		}

		//Update Room Object with the entityInfos
		room.entityInfos = {
			season: obj.season,
			episode: obj.episode,
			movie: obj.movie,
			lang: obj.lang,
		};

		//Update Database with updated room object
		await database.get<Partial<DatabaseSyncRoomItem>>('sync_rooms').update({ ID: room.ID }, { entityInfos: JSON.stringify(room.entityInfos) });

		console.log('SOCKET with auth', auth.user.username, 'and room', socket.sync, 'sync-video-change', obj);
		if (obj.season == -1 && obj.episode == -1 && obj.movie == -1 && obj.langchange == false) return;
		await toAllSockets(
			(s) => {
				s.emit('sync-video-change', obj);
			},
			(s) => s.auth.type == 'client' && s.id != socket.id && s.sync?.ID == socket.sync?.ID
		);
	});

	socket.on('sync-video-action', async (obj) => {
		const room = await getRoomCheckIfExistsAndOwner(socket.sync?.ID, socket);
		if (room == false) {
			return;
		}

		console.log('SOCKET with auth', auth.user.username, 'and room', socket.sync, 'sync-video-action', obj);
		await toAllSockets(
			(s) => {
				s.emit('sync-video-action', obj);
			},
			(s) => s.auth.type == 'client' && s.id != socket.id && s.sync && s.sync.ID == socket.sync?.ID
		);
	});
};

export { initialize };
