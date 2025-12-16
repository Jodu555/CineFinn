import type { AuthHandshakeSubsystem, SocketAuthDataSubsystem } from "@cinefinn/types/socket";
import type { SocketConsumerMeta } from "./index.js";
import { getConfig } from "../config.js";
import { queryDatabase } from "../utils.js";
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

export async function toggleSeriesesForSubSystem(subID: string, disabled: boolean) {
    const seriesIDs = new Set<string>();
    const entitys = await watchableEntitysTable.get({ subID })
    for (const entity of entitys) {
        seriesIDs.add(entity.serie_UUID);
    }
    for (const seriesID of seriesIDs) {
        await seriesTable.update({ UUID: seriesID }, { infos: { disabled } });
    }
    sendSeriesReloadToAll();
    console.log(`Toggling Serieses(${seriesIDs.size}) for SubSystem: ${subID} to Disabled: ${disabled}`);
}


export default {
    meta: {
        type: 'subsystem',
        authFunction,
        connectionFunction,
    } satisfies SocketConsumerMeta,
}