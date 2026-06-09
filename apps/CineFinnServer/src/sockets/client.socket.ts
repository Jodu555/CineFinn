import type { AuthHandshake, AuthHandshakeClient, ServerToAnythingEvents, SocketAuthDataClient, SocketData } from "@cinefinn/types/socket";
import { getUser } from "../middleware/auth.js";
import type { Account } from "@cinefinn/types/models/user";
import type { timestamped } from "@cinefinn/types/shared";
import type { SocketConsumerMeta } from "./index.js";
import { app, type definedSocket } from "../index.js";
import { accountsTable, franchiseTable } from "../database.js";
import { debounce, getIO, loggerInstances } from "../utils.js";
import { compareSettings } from "../utils/settings.js";
import { getFrontEndSeries } from "../routes/index.js";
import { randomUUID } from "crypto";
import rmvcEmitterSocket from "./rmvcEmitter.socket.js";
import { tryCatch } from "@cinefinn/utilities/tryCatch";
import { augmentFranchiseData } from "../routes/franchise.js";
import type { RemoteSocket } from "socket.io";
import crypto from "crypto";

type LocalAuthData = SocketAuthDataClient<Account | Account & timestamped>;

async function authFunction(authHandshake: AuthHandshakeClient): Promise<LocalAuthData> {
    const { authToken: token, uniqueID } = authHandshake;


    if (token === undefined || uniqueID === undefined) {
        throw new Error('Auth-Token or UniqueID missing');
    }

    const { error, data: user } = await tryCatch(() => getUser(token));

    if (error != null) {
        console.log(error);
        throw new Error('Unauthorized');
    }
    if (user == undefined || user == null) {
        throw new Error('Unauthorized');
    }

    const rmvcAuthFunctionResult = await tryCatch(() => rmvcEmitterSocket.meta.authFunction(authHandshake));

    if (rmvcAuthFunctionResult.error != null) {
        console.log(rmvcAuthFunctionResult.error);
        throw new Error('Unauthorized Error in RMVC Emitter Auth');
    }

    return {
        type: 'client',
        uniqueID: uniqueID,
        token,
        user,
        rmvcEmitterSessionID: rmvcAuthFunctionResult.data.rmvcEmitterSessionID,
    };
}

export const socketStateMap = new Map<string, string>();

interface SocketAwaitConnection {
    _ID: string;
    once: boolean;
    timeoutMs?: number;
    resolve: (socket?: definedSocket) => Promise<void>;
}

const socketAwaitConnectionMap = new Map<string, SocketAwaitConnection[]>();

export async function removeSocketAwaitConnection(socketID: string, awaitConnectionID: string) {
    socketAwaitConnectionMap.set(socketID, socketAwaitConnectionMap.get(socketID)!.filter(x => x._ID !== awaitConnectionID));
    if (socketAwaitConnectionMap.get(socketID)?.length === 0) {
        socketAwaitConnectionMap.delete(socketID);
    }
}

export async function addSocketAwaitConnection(socketID: string, awaitConnectionProps: Omit<SocketAwaitConnection, '_ID'>) {
    const awaitConnection = {
        ...awaitConnectionProps,
        _ID: crypto.randomUUID(),
    };
    socketAwaitConnectionMap.set(socketID, socketAwaitConnectionMap.get(socketID)?.concat(awaitConnection) || [awaitConnection]);

    const checkSocket = async () => {
        if (!socketAwaitConnectionMap.get(socketID)?.find(x => x._ID === awaitConnection._ID)) {
            //The Socket may have been already finalized in the meantime.
            return;
        }
        const sockets = await getIO().fetchSockets();
        const socket = sockets.find(s => s.data.auth.type === 'client' && s.data.auth.uniqueID === socketID);
        if (socket) {
            await awaitConnection.resolve(socket as any as definedSocket);
            if (awaitConnection.once) {
                removeSocketAwaitConnection(socketID, awaitConnection._ID);
            }
        }
    }
    await checkSocket(); // Check if the socket already exists
    setTimeout(checkSocket, 100); // Check again to prevent race conditions


    if (awaitConnection.timeoutMs !== undefined) {
        setTimeout(async () => {
            if (socketAwaitConnectionMap.has(socketID)) {
                if (awaitConnection.once) {
                    removeSocketAwaitConnection(socketID, awaitConnection._ID);
                    await awaitConnection.resolve(undefined);
                }
            }
        }, awaitConnection.timeoutMs);
    }
}

async function connectionFunction(socket: definedSocket) {
    const socketAuth = socket.data.auth as LocalAuthData;
    console.log(socket.id, socketAuth.user.username, 'connected');
    const debouncedUpdateTime = debounce(
        async (data: { watchableUUID: string; time: number; }) => {
            loggerInstances.updateTime && console.log('debounced updateTime', data, socketAuth.user.username);
            const response = await app.request(`/watch/updateTime/${data.watchableUUID}/${data.time}`, {
                method: 'POST',
                headers: {
                    'auth-token': socketAuth.token,
                },
            });
        },
        2000,
        (data) => data.watchableUUID // This is the key for debouncing, if this changes then the debounce will be flushed!
    );

    socket.on('updateTime', async (data) => {
        loggerInstances.updateTime && console.log('updateTime', data, socketAuth.user.username);
        debouncedUpdateTime(data);
    });

    socket.on('updateSettings', async (data) => {
        // console.log('updateSettings', data);
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

    socket.on('state', ({ url }) => {
        socketStateMap.set(socket.id, url);
    });

    socket.on('disconnect', () => {
        console.log(socket.id, socketAuth.user.username, 'user disconnected');
        socketStateMap.delete(socket.id);
    });

    rmvcEmitterSocket.meta.connectionFunction(socket);

    if (socketAwaitConnectionMap.has(socketAuth.uniqueID)) {
        const awaitConnections = socketAwaitConnectionMap.get(socketAuth.uniqueID)!;
        await Promise.all(awaitConnections.map(async awaitConnection => {
            await awaitConnection.resolve(socket);
            if (awaitConnection.once) {
                removeSocketAwaitConnection(socketAuth.uniqueID, awaitConnection._ID);
            }
        }));
    }

    accountsTable.update({ UUID: socketAuth.user.UUID }, {
        activityDetails: {
            lastHandshake: new Date().toLocaleString('de'),
            lastLogin: socketAuth.user.activityDetails.lastLogin || new Date().toLocaleString('de'),
        }
    });

}

export async function sendSeriesReloadToAll() {
    const sockets = await getIO().fetchSockets();
    const frontendSeries = await getFrontEndSeries();
    sockets.filter(s => s.data.auth.type === 'client').forEach(async s => {
        s.emit('seriesReload', frontendSeries);
    });
}

export async function sendSiteReload() {
    let i = 0;
    const sockets = await getIO().fetchSockets();
    sockets.filter((s) => s.data.auth.type === 'client').forEach((s) => {
        i++;
        s.emit('reload');
    });
    return i;
}

export async function sendFranchisesUpdate() {
    const franchises = await franchiseTable.get();
    const augmentedFranchiseData = await Promise.all(franchises.map(async f => await augmentFranchiseData(f)));
    const sockets = await getIO().fetchSockets();
    sockets.filter((s) => s.data.auth.type === 'client').forEach((s) => {
        s.emit('franchisesUpdate', augmentedFranchiseData);
    });
}

export default {
    meta: {
        type: 'client',
        authFunction,
        connectionFunction,
    } satisfies SocketConsumerMeta,
};