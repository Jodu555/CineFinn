import type { AuthHandshakeSubsystem, OfflineSubSystem, OnlineSubSystem, SocketAuthDataSubsystem, SubSystem } from "@cinefinn/types/socket";
import type { SocketConsumerMeta } from "./index.js";
import { getConfig } from "../config.js";
import { getIO, queryDatabase } from "../utils.js";
import { seriesTable, watchableEntitysTable } from "../database.js";
import type { definedSocket } from "../index.js";
import { sendSeriesReloadToAll } from "./client.socket.js";

async function authFunction(authHandshake: AuthHandshakeSubsystem): Promise<SocketAuthDataSubsystem> {
    console.log('subsystem auth');
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
        readrate: authHandshake.readrate,
    }
}

async function connectionFunction(socket: definedSocket) {
    const socketAuthData = socket.data.auth as SocketAuthDataSubsystem;
    console.log('subsystem connected');
    await toggleSeriesesForSubSystem(socketAuthData.id, false)

    socket.on('disconnect', async () => {
        await toggleSeriesesForSubSystem(socketAuthData.id, true)
    })
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
    const knownSubSystems = await getKnownSubSystems()

    const allSockets = await getIO().fetchSockets()
    const subsystems = knownSubSystems.map(async subID => {
        const subSystemSocket = allSockets.find(sock => {
            return sock.data.auth.type === 'subsystem' && sock.data.auth.id === subID
        });
        const subData = (subSystemSocket?.data.auth as SocketAuthDataSubsystem);
        const series = await getSeriesRelatedToSubSystem(subID);
        if (subData == undefined) {
            return {
                type: 'subsystem',
                id: subID,
                status: 'offline',
                name: subID,
                series
            } as SubSystem;
        } else {
            return {
                status: 'online',
                ...subData,
                series
            } as SubSystem;
        }
    });
    return await Promise.all(subsystems);
}

export async function getSeriesRelatedToSubSystem(subID: string) {
    const seriesIDs = new Set<string>();
    const entitys = await watchableEntitysTable.get({ subID })
    for (const entity of entitys) {
        seriesIDs.add(entity.serie_UUID);
    }
    return [...seriesIDs];
}

export async function toggleSeriesesForSubSystem(subID: string, disabled: boolean) {
    const seriesIDs = await getSeriesRelatedToSubSystem(subID);
    for (const seriesID of seriesIDs) {
        await seriesTable.update({ UUID: seriesID }, { infos: { disabled } });
    }
    sendSeriesReloadToAll();
    console.log(`Toggling Serieses(${seriesIDs.length}) for SubSystem: ${subID} to Disabled: ${disabled}`);
}


export default {
    meta: {
        type: 'subsystem',
        authFunction,
        connectionFunction,
    } satisfies SocketConsumerMeta,
}