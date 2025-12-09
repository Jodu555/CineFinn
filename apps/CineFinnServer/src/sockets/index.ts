import type { AuthHandshake, SocketAuthData, SocketAuthDataClient, SocketAuthType, } from "@cinefinn/types/socket";
import { getUser } from "../auth.js";
import { tryCatch } from "../tryCatch.js";
import { debounce, getIO } from "../utils.js";
import { getConfig } from '../config.js';
import type { Account, timestamped } from "@cinefinn/types/database";
import { accountsTable } from "../database.js";
import { app, type definedSocket } from "../index.js";
import { compareSettings } from "../utils/settings.js";
import clientSocket from "./client.socket.js";

export async function setupSocketIO() {

    socketRegistry.set('client', clientSocket.meta);

    setupIOMiddleware();
    setupSocketConnection();
}

export interface SocketConsumerMeta {
    type: SocketAuthType;
    authFunction: (authHandshake: AuthHandshake) => Promise<SocketAuthData<Account | Account & timestamped>>;
    connectionFunction: (socket: definedSocket) => Promise<void>;
}

const socketRegistry = new Map<string, SocketConsumerMeta>();

async function setupIOMiddleware() {
    const io = getIO();
    io.use(async (socket, next) => {
        const authHanshake = socket.handshake.auth as AuthHandshake;
        console.log('Trying to authorize ', socket.id, authHanshake);


        const socketConsumer = socketRegistry.get(authHanshake.type);
        if (!socketConsumer) {
            return next(new Error('Unauthorized'));
        }
        const result = await tryCatch(() => socketConsumer.authFunction(authHanshake));
        if (result.error != null) {
            return next(result.error);
        } else {
            socket.data = {
                auth: result.data,
            };
            next();
        }


        // if (authHanshake.authToken === undefined) {
        //     return next(new Error('Unauthorized'));
        // }

        // const token = authHanshake.authToken;

        // switch (authHanshake.type) {
        //     case 'client':
        //         const { error, data: user } = await tryCatch(() => getUser(token));

        //         if (error != null) {
        //             console.log(error);
        //             return next(new Error('Unauthorized'));
        //         }
        //         if (user == undefined || user == null) {
        //             return next(new Error('Unauthorized'));
        //         }

        //         socket.data = {
        //             auth: {
        //                 type: authHanshake.type,
        //                 token,
        //                 user,
        //             }
        //         };
        //         next();
        //         break;
        //     case 'scraper':
        //         console.log('scraper auth', token, getConfig().scraper.authToken);
        //         if (token !== getConfig().scraper.authToken) {
        //             return next(new Error('Unauthorized'));
        //         }
        //         socket.data = {
        //             auth: {
        //                 type: authHanshake.type,
        //                 token,
        //             }
        //         };
        //         next();
        //         break;
        //     case 'subsystem':
        //         console.log('subsystem auth');
        //         if (token !== getConfig().subsystem.authToken) {
        //             return next(new Error('Unauthorized'));
        //         }
        //         socket.data = {
        //             auth: {
        //                 type: authHanshake.type,
        //                 token,
        //             }
        //         };
        //         next();
        //         break;

        //     default:
        //         break;
        // }



    });
}



async function setupSocketConnection() {
    const io = getIO();
    io.on('connection', async (socket) => {

        const socketConsumer = socketRegistry.get(socket.data.auth.type);
        if (socketConsumer) {
            await socketConsumer.connectionFunction(socket);
        }

        // switch (socket.data.auth.type) {
        //     case 'client':
        //         const socketAuth = socket.data.auth as SocketAuthDataClient<Account | Account & timestamped>;
        //         console.log(socket.id, socketAuth.user.username, 'connected');
        //         const debouncedUpdateTime = debounce(async (data: { watchableUUID: string; time: number }) => {
        //             console.log('debounced updateTime', data);
        //             const response = await app.request(`/watch/updateTime/${data.watchableUUID}/${data.time}`, {
        //                 method: 'POST',
        //                 headers: {
        //                     'auth-token': socketAuth.token,
        //                 },
        //             });
        //         }, 4000);

        //         socket.on('updateTime', async (data) => {
        //             console.log('updateTime', data);
        //             debouncedUpdateTime(data);
        //         });

        //         socket.on('updateSettings', async (data) => {
        //             console.log('updateSettings', data);
        //             await accountsTable.update({ UUID: socketAuth.user.UUID }, { settings: compareSettings(data) });
        //             (await getIO().fetchSockets()).filter(s => s.data.auth.type === 'client' && s.data.auth.user.UUID === socketAuth.user.UUID && s.id !== socket.id).forEach(async s => {
        //                 s.emit('settingsUpdate', data);
        //             });
        //         });

        //         socket.on('disconnect', () => {
        //             console.log(socket.id, 'user disconnected');
        //         });
        //         break;

        //     case 'scraper':
        //         console.log('scraper connected');
        //         break;

        //     case 'subsystem':
        //         console.log('subsystem connected');
        //         break;
        //     default:
        //         console.log('unknown auth type', socket.handshake.auth.type);
        //         break;
        // }

    });
}