import type { ServerToSubSystemEvents, SubSystemToServerEvents } from "@cinefinn/types/socket";
import type { Socket } from "socket.io-client";

let socket: Socket<ServerToSubSystemEvents, SubSystemToServerEvents>;

let ptoken = '';

export function setSocket(s: typeof socket) {
    socket = s;
}
export function getSocket() {
    return socket;
}

export function setPtoken(p: string) {
    ptoken = p;
}

export function getPtoken() {
    return ptoken;
}