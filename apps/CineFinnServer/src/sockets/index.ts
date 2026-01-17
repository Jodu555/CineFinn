import type { Account, timestamped } from "@cinefinn/types/database";
import type { AuthHandshake, SocketAuthData, SocketAuthType } from "@cinefinn/types/socket";
import { type definedSocket } from "../index.js";
import { tryCatch } from "../tryCatch.js";
import { getIO } from "../utils.js";
import clientSocket from "./client.socket.js";
import scraperSocket from "./scraper.socket.js";
import subsystemSocket from "./subsystem.socket.js";
import { rebroadcastOverview } from '../routes/admin.js';

export async function setupSocketIO() {

    socketRegistry.set('client', clientSocket.meta);
    socketRegistry.set('scraper', scraperSocket.meta);
    socketRegistry.set('subsystem', subsystemSocket.meta);

    setupSocketAuthMiddleware();
    setupSocketConnection();
}

export interface SocketConsumerMeta {
    type: SocketAuthType;
    authFunction: (authHandshake: any) => Promise<SocketAuthData<Account | Account & timestamped>>;
    connectionFunction: (socket: definedSocket) => Promise<void>;
}

const socketRegistry = new Map<string, SocketConsumerMeta>();

async function setupSocketAuthMiddleware() {
    const io = getIO();
    io.use(async (socket, next) => {
        const authHanshake = socket.handshake.auth as AuthHandshake;
        // console.log('Trying to authorize ', socket.id, authHanshake);
        const socketConsumer = socketRegistry.get(authHanshake.type);
        if (!socketConsumer) {
            console.log('Unknown socket type', authHanshake.type);
            return next(new Error('Unauthorized'));
        }
        const result = await tryCatch(() => socketConsumer.authFunction(authHanshake));
        if (result.error != null) {
            // console.log('Error while authorizing', result.error);
            return next(result.error);
        } else {
            socket.data = {
                auth: result.data,
            };
            next();
        }
    });
}

async function setupSocketConnection() {
    const io = getIO();
    io.on('connection', async (socket) => {
        const socketConsumer = socketRegistry.get(socket.data.auth.type);
        if (socketConsumer == undefined) {
            console.log('Unknown socket type', socket.data.auth.type);
            return;
        }
        if (socketConsumer) {
            await socketConsumer.connectionFunction(socket);
            await rebroadcastOverview();
        }

        socket.on('disconnect', async () => {
            await rebroadcastOverview();
        });

    });
}