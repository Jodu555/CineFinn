import express, { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/session';
import { Database } from '@jodu555/mysqlapi';
import { DatabaseSyncRoomItem, DatabaseParsedSyncRoomItem } from '../types/database';
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
	// console.log(
	// 	'Got room',
	// 	req.params.id
	// );

	const room = roomToFullObject(await database.get<DatabaseSyncRoomItem>('sync_rooms').getOne({ ID: req.params.id }));

	// console.log('3', room);

	res.json(room);
});

function roomToFullObject(room: DatabaseSyncRoomItem): DatabaseParsedSyncRoomItem {
	// console.log('1', room);

	let newRoom: any = {};
	newRoom.ID = room.ID;
	newRoom.seriesID = room.seriesID;
	newRoom.entityInfos = JSON.parse(room.entityInfos);
	newRoom.members = JSON.parse(room.members);
	newRoom.created_at = room.created_at;
	return newRoom as DatabaseParsedSyncRoomItem;
}

function fullObjectToDatabase(room: DatabaseParsedSyncRoomItem): DatabaseSyncRoomItem {
	const DBroom: DatabaseSyncRoomItem = {
		ID: room.ID,
		seriesID: room.seriesID,
		entityInfos: JSON.stringify(room.entityInfos),
		members: JSON.stringify(room.members),
		created_at: room.created_at,
	}
	return DBroom;
}

export { router, roomToFullObject, fullObjectToDatabase };
