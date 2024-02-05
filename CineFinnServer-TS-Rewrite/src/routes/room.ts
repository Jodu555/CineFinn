import express, { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/session';
import { Database } from '@jodu555/mysqlapi';
import { DatabaseSyncRoomItem } from '../types/database';
import { getSyncRoom, roomToFullObject } from '../utils/room.utils';
const database = Database.getDatabase();

const router = express.Router();

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const rooms = (await database.get<DatabaseSyncRoomItem>('sync_rooms').get()).map((r) => roomToFullObject(r));
	res.json(
		rooms.map((r) => {
			delete r.entityInfos;
			return r;
		}).filter(r => parseInt(r.ID) > 0)
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

export { router };
