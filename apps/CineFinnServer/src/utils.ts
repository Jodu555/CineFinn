import type { Account, timestamped } from '@cinefinn/types/database';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '@cinefinn/types/socket';
import type { Server } from 'socket.io';
import { CacheContext } from './LRUCache.js';
import { episodesTable, moviesTable } from './database.js';

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

export async function watchableUUIDToWatchable(watchableUUID: string, cache?: CacheContext) {
    if (cache == undefined) {
        cache = new CacheContext('noop', 1);
    }
    if (watchableUUID.startsWith('EP-')) {
        let { data: episode, cacheInfo: existingSeasonCacheInfo } = await cache.execute(episodesTable, 'getOne', [{
            UUID: watchableUUID,
            unique: true,
        }]);
        return episode;
    } else if (watchableUUID.startsWith('MO-')) {
        const movie = await moviesTable.getOne({ UUID: watchableUUID });
        return movie;
    } else {
        throw new Error('Unknown Watchable UUID ' + watchableUUID);
    }
}

export function getIO() {
    return io;
}