import type { Account, timestamped } from '@cinefinn/types/database';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '@cinefinn/types/socket';
import type { Server } from 'socket.io';

let io: Server<ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData<Account | Account & timestamped>>;

export function setIO(newIO: Server<ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData<Account | Account & timestamped>>) {
    io = newIO;
}

export function getIO() {
    return io;
}