import type { AuthHandshake, AuthHandshakeClient, SocketAuthDataClient } from "@cinefinn/types/socket";
import { tryCatch } from "../tryCatch.js";
import { getUser } from "../auth.js";
import type { Account, timestamped } from "@cinefinn/types/database";
import type { SocketConsumerMeta } from "./index.js";
import { app, type definedSocket } from "../index.js";
import { accountsTable } from "../database.js";
import { debounce, getIO } from "../utils.js";
import { compareSettings } from "../utils/settings.js";

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

    return {
        type: 'client',
        token,
        user,
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

    socket.on('disconnect', () => {
        console.log(socket.id, 'user disconnected');
    });
}

export default {
    meta: {
        type: 'client',
        authFunction,
        connectionFunction,
    } satisfies SocketConsumerMeta,
}