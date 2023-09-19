import express, { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/session';
import { Database } from '@jodu555/mysqlapi';
import { DatabaseSyncRoomItem, DatabaseParsedSyncRoomItem } from '../types/database';
const database = Database.getDatabase();

const router = express.Router();

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const rooms = (await database.get<DatabaseSyncRoomItem>('sync_rooms').get()).filter((r) => roomToFullObject(r));

	console.log(rooms);

	res.json(rooms);
});

function roomToFullObject(room: DatabaseSyncRoomItem): DatabaseParsedSyncRoomItem {
	let newRoom: DatabaseParsedSyncRoomItem;
	newRoom.ID = room.ID;
	newRoom.seriesID = room.seriesID;
	newRoom.entityInfos = JSON.parse(room.entityInfos);
	newRoom.members = JSON.parse(room.members);
	newRoom.created_at = room.created_at;
	return newRoom;
}

export { router };
