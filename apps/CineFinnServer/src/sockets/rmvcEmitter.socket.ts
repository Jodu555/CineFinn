import type { AuthHandshakeClient, SocketAuthDataClient, SocketAuthDataRmvcEmitter } from "@cinefinn/types/socket";
import type { Account } from "@cinefinn/types/models/user";
import type { timestamped } from "@cinefinn/types/shared/utilities";
import type { SocketConsumerMeta } from "./index.js";
import { type definedSocket } from "../index.js";
import { getIO } from "../utils.js";

type LocalAuthData = SocketAuthDataRmvcEmitter<Account | Account & timestamped>;

async function authFunction(authHandshake: AuthHandshakeClient): Promise<LocalAuthData> {
    return {
        type: 'rmvcEmitter',
    } as LocalAuthData;
}



async function connectionFunction(socket: definedSocket) {
    const socketAuth = socket.data.auth as LocalAuthData;
    console.log(socket.id, 'rmvcEmitter connected');

    socket.on('rmvc-connect', async ({ rmvcID }, cb) => {
        console.log('rmvc-connect', rmvcID);

        const sockets = await getIO().fetchSockets();
        const recieverSocket = sockets.find(s => {
            const auth = s.data.auth as SocketAuthDataClient<Account | Account & timestamped>;
            return auth.type === 'client' && auth.rmvcSessionID === rmvcID;
        });
        if (!recieverSocket) {
            console.log('No client found for rmvcID', rmvcID);
            return cb({ status: false });
        }

        recieverSocket.emit('rmvc-get-videoState');
        socketAuth.rmvcEmitterSessionID = rmvcID;

        cb({ status: true });
    });

    socket.on('rmvc-send-action', async ({ rmvcID, action }) => {
        console.log('rmvc-send-action', rmvcID, action);

        if (socketAuth.rmvcEmitterSessionID !== rmvcID) {
            console.log('rmvcID does not match');
            return;
        }

        const sockets = await getIO().fetchSockets();
        const recieverSocket = sockets.find(s => {
            const auth = s.data.auth as SocketAuthDataClient<Account | Account & timestamped>;
            return auth.type === 'client' && auth.rmvcSessionID === rmvcID;
        });
        if (!recieverSocket) {
            console.log('No client found for rmvcID', rmvcID);
            return;
        }
        recieverSocket.emit('rmvc-recieve-action', action);
    });

    socket.on('disconnect', () => {
        console.log(socket.id, 'rmvcEmitter disconnected');
    });
}

export default {
    meta: {
        type: 'rmvcEmitter',
        authFunction,
        connectionFunction,
    } satisfies SocketConsumerMeta,
};