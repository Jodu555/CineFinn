import { toAllSockets } from "../utils/utils";
import { ExtendedSocket } from "../types/session";
import { Database } from '@jodu555/mysqlapi';
import { DatabaseParsedSyncRoomItem, DatabaseSyncRoomItem, DatabaseSyncRoomMember } from "../types/database";
import { fullObjectToDatabase, getRoomCheckIfExistsAndOwner, getSyncRoom } from "../utils/room.utils";
const database = Database.getDatabase();

const initialize = (socket: ExtendedSocket) => {
    const auth = socket.auth;
    console.log('Socket-Sync Connection:', auth.type.toUpperCase(), auth.user.username, socket.id);

    socket.on('disconnect', () => {
        console.log('Socket-Sync DisConnection:', auth.type.toUpperCase());
    });

    socket.on('sync-create', async (obj) => {
        console.log('SOCKET with auth', auth.user.username, 'sync-create', obj);

        //Check if room ID is unique
        const room = getSyncRoom(obj.ID);
        if (!room) {
            socket.emit('sync-message', { type: 'error', message: 'The Room ID is already occupied, please try again!' })
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
                }
            ],
            created_at: new Date().getTime(),
        }

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
        const room = await getSyncRoom(socket.sync?.ID);

        if (!room) {
            socket.emit('sync-message', { type: 'error', message: 'The Room ID does not exist!' })
            return;
        }

        //Check if user is already in room
        if (room.members.find(x => x.UUID == auth.user.UUID) !== undefined) {
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
            (s) => s.auth.type == 'client' && s.id != socket.id
        );
    });

    socket.on('sync-selectSeries', async (obj) => {
        const room = await getRoomCheckIfExistsAndOwner(socket.sync?.ID, socket)
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

    socket.on('sync-video-change', async (obj) => {
        const room = await getRoomCheckIfExistsAndOwner(socket.sync?.ID, socket)
        if (room == false) {
            return;
        }

        //Update Room Object with the entityInfos
        room.entityInfos = {
            season: obj.season,
            episode: obj.episode,
            movie: obj.movie,
            lang: obj.lang
        }

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
    })

    socket.on('sync-video-action', async (obj) => {

        const room = await getRoomCheckIfExistsAndOwner(socket.sync?.ID, socket)
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
    })

}

export { initialize };