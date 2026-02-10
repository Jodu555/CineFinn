
import type { AuthHandshake, ClientToServerEvents, ServerToClientEvents } from "@cinefinn/types/socket";
import { io, Socket } from "socket.io-client";
import useAPIURL from "~/hooks/useAPIURL";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
export default function useSocket(type: 'client' | 'rmvcEmitter' = 'client') {
    if (socket !== null) {
        return socket;
    }
    const authStore = useAuthStore();
    watch(() => authStore.authToken, () => {
        if (socket === null) return;
        (socket as any).io.opts.auth.token = authStore.authToken;
        socket.disconnect();
        socket.connect();
    });

    socket = io(useAPIURL(), {
        transports: ['websocket'],
        upgrade: true,
        reconnection: true,
        autoConnect: false,
        auth: {
            //@ts-expect-error
            type,
            authToken: authStore.authToken,
        } satisfies AuthHandshake,
    });
    return socket;

}