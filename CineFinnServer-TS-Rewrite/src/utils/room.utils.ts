
import { Database } from '@jodu555/mysqlapi';
import { DatabaseParsedSyncRoomItem, DatabaseSyncRoomItem, DatabaseSyncRoomMember } from "../types/database";
import { ExtendedSocket } from '../types/session';
const database = Database.getDatabase();

async function getSyncRoom(ID: number) {
    if (ID == -1 || ID == undefined || isNaN(ID)) return false;

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

async function getRoomCheckIfExistsAndOwner(roomID: number, socket: ExtendedSocket): Promise<false | DatabaseParsedSyncRoomItem> {
    //Check if Owner
    // const room = await getSyncRoom(socket.sync?.ID);

    // if (!room) {
    //     socket.emit('sync-message', { type: 'error', message: 'The Room ID does not exist!' })
    //     return false;
    // }
    const room = await getRoomCheckIfExists(roomID, socket);
    if (room == false)
        return false;

    if (room.members.find(x => x.UUID == socket.auth.user.UUID).role != 1) return false;

    return room;
}

async function getRoomCheckIfExists(roomID: number, socket: ExtendedSocket): Promise<false | DatabaseParsedSyncRoomItem> {
    //Check if Owner
    const room = await getSyncRoom(socket.sync?.ID);

    if (!room) {
        socket.emit('sync-message', { type: 'error', message: 'The Room ID does not exist!' })
        return false;
    }

    return room;
}

export {
    getSyncRoom,
    roomToFullObject,
    fullObjectToDatabase,
    getRoomCheckIfExists,
    getRoomCheckIfExistsAndOwner,
}