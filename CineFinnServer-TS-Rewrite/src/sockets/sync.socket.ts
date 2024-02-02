import { ExtendedSocket } from "../types/session";

const initialize = (socket: ExtendedSocket) => {
    const auth = socket.auth;
    console.log('Socket-Sync Connection:', auth.type.toUpperCase(), auth.user.username, socket.id);

    socket.on('disconnect', () => {
        console.log('Socket-Sync DisConnection:', auth.type.toUpperCase());
    });

    socket.on('sync-selectSeries', (obj) => {

    });

}

export { initialize };