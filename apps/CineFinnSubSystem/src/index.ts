import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { setupConfigurationManagment } from '@cinefinn/configuration-manager';
import type { AuthHandshake, ServerToSubSystemEvents, SubSystemToServerEvents } from '@cinefinn/types/socket';
import { io, Socket } from 'socket.io-client';
const cliOptions = [['identifier', 'I'], ['entrypoint', 'E'], ['port', 'P'], ['endpoint'], ['core-url'], ['core-token']];

interface Config {
    version: string;
    identifier: string;
    entrypoint: string;
    port: number;
    endpoint: string | boolean;
    experimental: {
        readrate: number;
    };
    core: {
        url: string;
        token: string;
    };
}

const defaultConfig: Config = {
    version: '1.0.1',
    identifier: 'local-kdrama',
    entrypoint: '/home/Media/K-Drama',
    port: 9999,
    endpoint: false, //Means enable Socket Transmission
    experimental: {
        readrate: 0,
    },
    core: {
        url: 'http://localhost:3100',
        token: 'SUPER-SECURE-CORE-TOKEN',
    },
};

const config = setupConfigurationManagment(defaultConfig, cliOptions);

const ptoken = crypto.randomUUID().replaceAll('-', '');

let socket: Socket<ServerToSubSystemEvents, SubSystemToServerEvents> | null = null;
socket = io(config.core.url, {
    auth: {
        type: 'subsystem',
        authToken: config.core.token,
        // id: config.identifier,
        // token: config.core.token,
        // ptoken,
        // readrate: config.experimental.readrate || 0,
    } satisfies AuthHandshake,
});

socket.on('connect_error', (error) => {
    console.log('Socket Connect Error: ', error.message); // prints the message associated with the error
    if (error.message.includes('Authentication')) {
        console.log('Wrong Auth-token');
    }
});
socket.on('disconnect', () => {
    console.log('Socket Connection: Disconnected');
});

socket.on('connect', async () => {
    console.log('Socket Connection: Connected', config.identifier);
    const { files, dirs } = await listFilesAsync(config.entrypoint);
    console.log('Loaded', files.length, 'files from:', config.entrypoint);

    console.log('Current pToken:', ptoken);
});

socket.on('listFiles', async (callback) => {
    const { files, dirs } = await listFilesAsync(config.entrypoint);
    callback(files);
});

async function listFilesAsync(lcPath: string) {
    const files: string[] = [];
    const dirs: string[] = [];

    const items = await fs.promises.readdir(lcPath, { withFileTypes: true });
    const promises = items.map(async (item) => {
        const fullPath = path.join(lcPath, item.name);
        //TODO: This is not foolproff maybe... cause if the file is a symlink this would trigger as well i guess
        if (item.isDirectory() || item.isSymbolicLink()) {
            dirs.push(fullPath);
            const { files: subFiles, dirs: subDirs } = await listFilesAsync(fullPath);
            files.push(...subFiles);
            dirs.push(...subDirs);
        } else {
            files.push(fullPath);
        }
    });

    await Promise.all(promises);
    return { files, dirs };
}

