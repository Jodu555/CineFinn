import type { AuthHandshake, AuthHandshakeClient, SocketAuthDataClient, SocketAuthDataRmvcEmitter } from "@cinefinn/types/socket";
import { tryCatch } from "../tryCatch.js";
import { getUser } from "../middleware/auth.js";
import type { Account, timestamped } from "@cinefinn/types/database";
import type { SocketConsumerMeta } from "./index.js";
import { app, type definedSocket } from "../index.js";
import { accountsTable } from "../database.js";
import { debounce, getIO } from "../utils.js";
import { compareSettings } from "../utils/settings.js";
import { getFrontEndSeries } from "../routes/index.js";
import { randomUUID } from "crypto";

type LocalAuthData = SocketAuthDataRmvcEmitter<Account | Account & timestamped>;

async function authFunction(authHandshake: AuthHandshakeClient): Promise<LocalAuthData> {
    return {
        type: 'rmvcEmitter',
    } as LocalAuthData
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
}