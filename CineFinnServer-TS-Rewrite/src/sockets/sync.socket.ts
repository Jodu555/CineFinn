import { toAllSockets } from "../utils/utils";
import { ExtendedSocket } from "../types/session";
import { Database } from '@jodu555/mysqlapi';
import { DatabaseSyncRoomItem } from "../types/database";
import { roomToFullObject } from "../routes/room";
const database = Database.getDatabase();

const initialize = (socket: ExtendedSocket) => {
    const auth = socket.auth;
    console.log('Socket-Sync Connection:', auth.type.toUpperCase(), auth.user.username, socket.id);

    socket.on('disconnect', () => {
        console.log('Socket-Sync DisConnection:', auth.type.toUpperCase());
    });

    socket.on('sync-selectSeries', async (obj) => {
        console.log('SOCKET with auth', auth.user.username, 'and room', socket.sync, 'sync-selectSeries', obj);
        await toAllSockets(
            (s) => {
                s.emit('sync-selectSeries', obj);
            },
            (s) => s.auth.type == 'client' && s.id != socket.id && s.sync?.ID == socket.sync?.ID
        );
    });

    socket.on('sync-video-change', async (obj) => {

        //Check if Owner
        const room = await getSyncRoom(socket.sync?.ID);
        if (room.members.find(x => x.UUID == auth.user.UUID).role != 1) return;

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

        //Check if Owner
        const room = await getSyncRoom(socket.sync?.ID);
        if (room.members.find(x => x.UUID == auth.user.UUID).role != 1) return;

        console.log('SOCKET with auth', auth.user.username, 'and room', socket.sync, 'sync-video-action', obj);
        await toAllSockets(
            (s) => {
                s.emit('sync-video-action', obj);
            },
            (s) => s.auth.type == 'client' && s.id != socket.id && s.sync && s.sync.ID == socket.sync?.ID
        );
    })

    socket.on('sync-join', (obj) => {
        console.log('SOCKET with auth', auth.user.username, 'sync-join', obj);
        socket.sync = obj;
        //TODO: Add to room
    });

}


async function getSyncRoom(ID: number) {
    const room = await database.get<DatabaseSyncRoomItem>('sync_rooms').getOne({ ID });
    return roomToFullObject(room);
}

export { initialize };