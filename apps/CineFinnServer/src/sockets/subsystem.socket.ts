import type { AuthHandshakeSubsystem, DiskStats, InterServerEvents, ServerToSubSystemEvents, SocketAuthDataSubsystem, SubSystem, SubSystemToServerEvents } from "@cinefinn/types/socket";
import type { SocketConsumerMeta } from "./index.js";
import { getConfig } from "../config.js";
import { getIO, queryDatabase } from "../utils.js";
import { seriesTable, watchableEntitysTable } from "../database.js";
import type { definedSocket } from "../index.js";
import { sendSeriesReloadToAll } from "./client.socket.js";
import { rebroadcastSubsystems } from '../routes/admin/admin.js';
import type { Account } from "@cinefinn/types/models/user";
import type { timestamped } from "@cinefinn/types/shared/utilities";
import type { Socket } from "socket.io";
import { tryCatch } from "@cinefinn/utilities/tryCatch";

async function authFunction(authHandshake: AuthHandshakeSubsystem): Promise<SocketAuthDataSubsystem> {
    const { authToken: token } = authHandshake;

    if (token === undefined) {
        throw new Error('Unauthorized');
    }

    if (token !== getConfig().subsystem.authToken) {
        throw new Error('Unauthorized');
    }
    return {
        type: 'subsystem',
        token,
        id: authHandshake.id,
        ptoken: authHandshake.ptoken,
        bandwith: authHandshake.bandwith,
        endpoint: authHandshake.endpoint,
    };
}

export const subSocketDiskStatsMap = new Map<string, any>()

async function connectionFunction(socket: definedSocket) {
    const socketAuthData = socket.data.auth as SocketAuthDataSubsystem;
    console.log('Subsystem connected', socketAuthData.id);
    socket.on('diskStats', (stats: DiskStats) => {
        subSocketDiskStatsMap.set(socketAuthData.id, stats);
        rebroadcastSubsystems();
    });

    await toggleSeriesesForSubSystem(socketAuthData.id, false);

    await rebroadcastSubsystems();

    socket.on('disconnect', async () => {
        await toggleSeriesesForSubSystem(socketAuthData.id, true);
        subSocketDiskStatsMap.delete(socketAuthData.id);
        await rebroadcastSubsystems();
    });
}

export async function getKnownSubSystems() {
    const subIDs = new Set<string>();
    const rows = await queryDatabase(`SELECT * FROM watchableEntitys WHERE subID != 'main'`);
    rows.forEach(row => {
        subIDs.add(row.subID);
    });
    return [...subIDs];
}

export async function getSubSystems(): Promise<SubSystem[]> {
    const knownSubSystems = await getKnownSubSystems();
    const subsystems = knownSubSystems.map(async subID => {
        const { data: subSystemSocket, error } = await tryCatch(() => getSubSocketByID(subID));
        const subData = (subSystemSocket?.data.auth as SocketAuthDataSubsystem);
        const series = await getSeriesRelatedToSubSystem(subID);
        if (subData == undefined) {
            return {
                type: 'subsystem',
                id: subID,
                status: 'offline',
                name: subID,
                series,
                endpoint: false,
            } as SubSystem;
        } else {

            const diskStats = subSocketDiskStatsMap.get(subID);

            if (diskStats == undefined) {
                subSystemSocket?.emit('getDiskStats');
            }

            return {
                status: 'online',
                ...subData,
                series,
                diskStats: subSocketDiskStatsMap.get(subID) || null,
            } as SubSystem;
        }
    });
    return await Promise.all(subsystems);
}

export async function getSeriesRelatedToSubSystem(subID: string) {
    const seriesIDs = new Set<string>();
    const entitys = await watchableEntitysTable.get({ subID });
    for (const entity of entitys) {
        seriesIDs.add(entity.serie_UUID);
    }
    return [...seriesIDs];
}

export async function toggleSeriesesForSubSystem(subID: string, disabled: boolean) {
    const seriesIDs = await getSeriesRelatedToSubSystem(subID);
    for (const seriesID of seriesIDs) {
        const series = await seriesTable.getOne({ UUID: seriesID });
        if (series == undefined) continue;
        series.infos.disabled = disabled;
        await seriesTable.update({ UUID: seriesID }, { infos: series.infos });
    }
    sendSeriesReloadToAll();
    console.log(`Toggling Serieses(${seriesIDs.length}) for SubSystem: ${subID} to Disabled: ${disabled}`);
}

export type definedSubSystemSocket = Socket<SubSystemToServerEvents, ServerToSubSystemEvents, InterServerEvents, { auth: SocketAuthDataSubsystem<Account | (Account & timestamped)> }>;

export async function getSubSocketByID(subID: string) {
    const subSystemSocket = (await getIO().fetchSockets()).filter(s => s.data.auth.type === 'subsystem' && s.data.auth.id === subID)[0];
    if (subSystemSocket == undefined) {
        return null;
    }
    return subSystemSocket as any as definedSubSystemSocket;
}

export default {
    meta: {
        type: 'subsystem',
        authFunction,
        connectionFunction,
    } satisfies SocketConsumerMeta,
};