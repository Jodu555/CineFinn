import express, { NextFunction, Response } from 'express';
import { AuthenticatedRequest, ExtendedRemoteSocket, ExtendedSocket } from '../types/session';
import { Database } from '@jodu555/mysqlapi';
import { DatabaseSyncRoomItem } from '../types/database';
import { getSyncRoom, roomToFullObject } from '../utils/room.utils';
import { getIO } from '../utils/utils';
const database = Database.getDatabase();

const router = express.Router();

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const rooms = (await database.get<DatabaseSyncRoomItem>('sync_rooms').get()).map((r) => roomToFullObject(r));
	res.json(
		rooms
			.map((r) => {
				delete r.entityInfos;
				return r;
			})
			.filter((r) => parseInt(r.ID) > 0)
	);
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const room = await getSyncRoom(parseInt(req.params.id));
	if (!room) {
		next(new Error('Room not found!'));
		return;
	}
	res.json(room);
});

router.get('/:id/headsup', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const room = await getSyncRoom(parseInt(req.params.id));

	if (!room) {
		next(new Error('Room not found!'));
		return;
	}
	console.log('Performing Room Headsup', room.ID);

	if (room.members.find((x) => x.UUID == req.credentials.user.UUID)?.role != 0) {
		next(new Error('You are either not in the room or the owner!'));
		return;
	}

	const sockets: any[] = await getIO().fetchSockets();

	const socket: ExtendedSocket = sockets.find((socket: ExtendedSocket) => {
		if (socket.sync?.ID == room.ID) {
			console.log('Found a room with', room.members, 'to the provided socket.sync', socket.sync, 'with the following auth', socket.auth);
			const owner = room.members.find((x) => x.UUID == socket.auth.user.UUID && x.role == 1);
			console.log('Owner Result:', owner);
			return owner != undefined;
		}
	});

	if (socket == null) {
		next(new Error('Owner connection currently not available!'));
		return;
	}

	const result = await new Promise<
		| false
		| {
				currentTime: number;
				isPlaying: boolean;
		  }
	>((resolve, reject) => {
		const time = Date.now();
		const t = setTimeout(() => {
			console.log('Room Headsup timeout reached after ', Date.now() - time, 'ms');
			socket.removeAllListeners('sync-video-info');
			resolve(false);
		}, 15 * 1000);
		socket.on('sync-video-info', (obj) => {
			console.log('Room Headsup Answer took', Date.now() - time, 'ms');
			socket.removeAllListeners('sync-video-info');
			clearTimeout(t);
			resolve(obj);
		});
		socket.emit('sync-video-info');
	});

	if (result == false) {
		next(new Error('No response from rooms owner!'));
		return;
	}

	res.json(result);
});

export { router };
