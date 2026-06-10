
import type { AuthHandshake, ClientToServerEvents, ServerToClientEvents } from "@cinefinn/types/socket";
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
    watch(() => authStore.authToken, () => {
        if (socket === null) return;
        (socket as any).io.opts.auth.token = authStore.authToken;
        socket.disconnect();
        socket.connect();
    });

    socket = io(useAPIURL(), {
        upgrade: true,
        reconnection: true,
        autoConnect: false,
        auth: {
            type,
            authToken: authStore.authToken,
            uniqueID: socketUniqueID.value
        } satisfies AuthHandshake,
    });
    return socket;

}