import type { AuthHandshake, SocketAuthDataSubsystem } from "@cinefinn/types/socket";
import type { SocketConsumerMeta } from "./index.js";
import { getConfig } from "../config.js";

async function authFunction(authHandshake: AuthHandshake): Promise<SocketAuthDataSubsystem> {
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
    }
}

async function connectionFunction() {
    console.log('subsystem connected');
}


export default {
    meta: {
        type: 'subsystem',
        authFunction,
        connectionFunction,
    } satisfies SocketConsumerMeta,
}