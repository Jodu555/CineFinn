import type { AuthHandshake, AuthHandshakeClient, SocketAuthDataClient } from "@cinefinn/types/socket";
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
import rmvcEmitterSocket from "./rmvcEmitter.socket.js";

type LocalAuthData = SocketAuthDataClient<Account | Account & timestamped>;

async function authFunction(authHandshake: AuthHandshakeClient): Promise<LocalAuthData> {
    const { authToken: token } = authHandshake;

    if (token === undefined) {
        throw new Error('Unauthorized');
    }

    const { error, data: user } = await tryCatch(() => getUser(token));

    if (error != null) {
        console.log(error);
        throw new Error('Unauthorized');
    }
    if (user == undefined || user == null) {
        throw new Error('Unauthorized');
    }

    const result = await tryCatch(() => rmvcEmitterSocket.meta.authFunction(authHandshake));

    if (result.error != null) {
        console.log(result.error);
        throw new Error('Unauthorized Error in RMVC Emitter Auth');
    }

    return {
        type: 'client',
        token,
        user,
        rmvcEmitterSessionID: result.data.rmvcEmitterSessionID,
    }
}



async function connectionFunction(socket: definedSocket) {
    const socketAuth = socket.data.auth as LocalAuthData;
    console.log(socket.id, socketAuth.user.username, 'connected');
    const debouncedUpdateTime = debounce(async (data: { watchableUUID: string; time: number }) => {
        console.log('debounced updateTime', data);
        const response = await app.request(`/watch/updateTime/${data.watchableUUID}/${data.time}`, {
            method: 'POST',
            headers: {
                'auth-token': socketAuth.token,
            },
        });
    }, 4000);

    socket.on('updateTime', async (data) => {
        console.log('updateTime', data);
        debouncedUpdateTime(data);
    });

    socket.on('updateSettings', async (data) => {
        console.log('updateSettings', data);
        await accountsTable.update({ UUID: socketAuth.user.UUID }, { settings: compareSettings(data) });
        (await getIO().fetchSockets()).filter(s => s.data.auth.type === 'client' && s.data.auth.user.UUID === socketAuth.user.UUID && s.id !== socket.id).forEach(async s => {
            s.emit('settingsUpdate', data);
        });
    });

    socket.on('rmvc-createSession', async (cb) => {
        const sessionID = Math.floor(Math.random() * 10 ** 5).toString();
        socketAuth.rmvcSessionID = sessionID;
        console.log('rmvc-createSession', socketAuth.user.username, socketAuth.rmvcSessionID);
        cb(sessionID);
    });

    socket.on('rmvc-destroySession', async () => {
        console.log('rmvc-destroySession', socketAuth.user.username, socketAuth.rmvcSessionID);
        socketAuth.rmvcSessionID = undefined;
    });

    socket.on('rmvc-send-videoStateChange', async (data) => {
        console.log('rmvc-send-videoStateChange', socketAuth.user.username, socketAuth.rmvcSessionID, data);
        if (socketAuth.rmvcSessionID == undefined) return;
        const sockets = await getIO().fetchSockets();
        sockets.filter(s => {
            if (s.data.auth.type === 'client') {
                return s.data.auth.user.UUID === socketAuth.user.UUID && s.id !== socket.id;
            }
            if (s.data.auth.type === 'rmvcEmitter') {
                return s.data.auth.rmvcEmitterSessionID === socketAuth.rmvcSessionID;
            }
        }).forEach(async s => {
            s.emit('rmvc-recieve-videoStateChange', data);
        });
    });

    socket.on('rmvc-send-action', async (data) => {
        console.log('rmvc-send-action', socketAuth.user.username, socketAuth.rmvcSessionID, data);
        if (socketAuth.rmvcSessionID == undefined) return;
        const sockets = await getIO().fetchSockets();
        sockets.filter(s => s.data.auth.type === 'client' && s.data.auth.user.UUID === socketAuth.user.UUID && s.id !== socket.id).forEach(async s => {
            s.emit('rmvc-recieve-action', data.action);
        });
    });


    socket.on('disconnect', () => {
        console.log(socket.id, 'user disconnected');
    });
    rmvcEmitterSocket.meta.connectionFunction(socket);;
}

export async function sendSeriesReloadToAll() {
    const sockets = await getIO().fetchSockets();
    const frontendSeries = await getFrontEndSeries();
    sockets.filter(s => s.data.auth.type === 'client').forEach(async s => {
        s.emit('seriesReload', frontendSeries);
    });
}

export default {
    meta: {
        type: 'client',
        authFunction,
        connectionFunction,
    } satisfies SocketConsumerMeta,
}