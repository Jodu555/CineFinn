
import { Database } from '@jodu555/mysqlapi';
import { DatabaseParsedSyncRoomItem, DatabaseSyncRoomItem, DatabaseSyncRoomMember } from "../types/database";
import { ExtendedSocket } from '../types/session';
const database = Database.getDatabase();

async function getSyncRoom(ID: number) {
    const room = await database.get<DatabaseSyncRoomItem>('sync_rooms').getOne({ ID });

    return room != undefined ? roomToFullObject(room) : false;
}


function roomToFullObject(room: DatabaseSyncRoomItem): DatabaseParsedSyncRoomItem {
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

async function getRoomCheckIfExistsAndOwner(roomID: number, socket: ExtendedSocket): Promise<Boolean | DatabaseParsedSyncRoomItem> {
    return false;
}

export {
    getSyncRoom,
    roomToFullObject,
    fullObjectToDatabase
}