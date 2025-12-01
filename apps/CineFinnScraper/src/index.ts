import { io, Socket } from 'socket.io-client';
import { getConfig } from './config.js';
import type { AuthHandshake, ClientToServerEvents, ServerToClientEvents } from '@cinefinn/types/socket';

const config = getConfig();

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

socket = io(config.CORE.URL, {
    transports: ['websocket'],
    reconnection: true,
    upgrade: true,
    autoConnect: false,
    auth: {
        type: 'scraper',
        authToken: config.CORE.AUTH_TOKEN,
    } satisfies AuthHandshake,
});

socket.on('connect', () => {
    console.log('Connected to Core');
});

socket.on('disconnect', () => {
    console.log('Disconnected from Core');
});

socket.connect();
