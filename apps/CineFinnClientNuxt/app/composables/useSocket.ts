import type { AuthHandshake, ClientToServerEvents, ServerToClientEvents } from "@cinefinn/types/socket";
import { wait } from "@cinefinn/utilities/time";
import { io, Socket } from "socket.io-client";


let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
export let socketUniqueID: ReturnType<typeof useState<string>>;


export default function useSocket(type: 'client' | 'rmvcEmitter' = 'client') {
    socketUniqueID = useState('socketUniqueID', () => {
        return Math.random().toString(36).slice(2, 15);
    });
    if (socket !== null) {
        return socket;
    }
    const authStore = useAuthStore();
    watch(() => authStore.authToken, async () => {
        if (socket === null) return;
        (socket as any).io.opts.auth.authToken = authStore.authToken;
        await wait(100);
        await socket.disconnect();
        //If authtoken changes to empty string, don't reconnect probably because of a logout
        if (authStore.authToken == '') {
            return;
        }
        await wait(150);
        socketConnect();
        await wait(10);
    });

    socket = io(useAPIURL(), {
        upgrade: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1 * 1000,
        reconnectionDelayMax: 5 * 1000,
        timeout: 10 * 1000,
        autoConnect: false,
        auth: {
            type,
            authToken: authStore.authToken,
            uniqueID: socketUniqueID.value
        } satisfies AuthHandshake,
    });
    return socket;

}

export function socketConnect() {
    const socket = useSocket();
    if (socket.connected) {
        console.log('socketConnect called but socket already connected');
        umTrackEvent('socket_connect_error', { error: 'socketConnect called but socket already connected' });
        return;
    }
    socket.connect();
    socket.io.open((err) => {
        console.log(err);
        umTrackEvent('socket_connect_error', { error: 'Reopen failed cause of: ' + JSON.stringify(err) });
    });
}