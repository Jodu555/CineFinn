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
        (socket as any).io.opts.auth.token = authStore.authToken;
        await wait(100);
        await socket.disconnect();
        await wait(150);
        socket.connect();
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