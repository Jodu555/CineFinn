import { toAllSockets } from "../utils/utils";
import { ExtendedSocket } from "../types/session";

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
        console.log('SOCKET with auth', auth.user.username, 'and room', socket.sync, 'sync-video-change', obj);
        if (obj.season == -1 && obj.episode == -1 && obj.movie == -1 && obj.langchange == false) return;
        await toAllSockets(
            (s) => {
                s.emit('sync-video-change', obj);
            },
            (s) => s.auth.type == 'client' && s.id != socket.id && s.sync?.ID == socket.sync?.ID
        );
    })

    socket.on('sync-join', (obj) => {
        console.log('SOCKET with auth', auth.user.username, 'sync-join', obj);
        socket.sync = obj;
        //TODO: Add to room
    });

}

export { initialize };