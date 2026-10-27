import type { ServerToSubSystemEvents, SubSystemToServerEvents } from "@cinefinn/types/socket";
import type { Socket } from "socket.io-client";
import path from "path";
import fs from "fs";
import { getConfig } from "../config.js";

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

/**
 * Path-containment guard.
 *
 * Verifies that `filePath` stays inside the library entry directory and has no
 * `..` segments / symlink escapes. Every remote-triggered file access (video
 * streaming routes, video-range, pull_request) MUST run through this before
 * touching the file system — otherwise a compromised main server could read
 * `/etc/passwd` and friends off the sub system.
 *
 * Symlink policy: the check compares the REAL filesystem identity of the
 * target against the REAL identity of the entry root, so a symlinked
 * entrypoint (or any symlinked directory inside the library, e.g. mounted
 * media roots) keeps working, while a symlink that resolves outside the entry
 * root is rejected. For a not-yet-existing target the nearest EXISTING
 * ancestor is resolved the same way, which closes the hole where a new file
 * under a symlinked parent dir would silently be created outside the library.
 */
export function assertInsideEntry(filePath: string): { ok: true; resolved: string } | { ok: false; error: string } {
    try {
        if (typeof filePath !== "string" || filePath.length === 0 || filePath.includes("\0")) {
            return { ok: false, error: "Invalid file path" };
        }

        const entryRoot = path.resolve(getConfig().entrypoint);
        const resolved = path.resolve(filePath);

        if (resolved !== entryRoot && !resolved.startsWith(entryRoot + path.sep)) {
            return { ok: false, error: "File path escapes the library entry directory" };
        }

        let realRoot: string;
        try {
            realRoot = fs.realpathSync(entryRoot);
        } catch {
            // Broken/missing root configured — compare lexically as a fallback.
            realRoot = entryRoot;
        }

        // Follow the real filesystem: climb to the nearest existing ancestor
        // (the target itself when it exists) and verify it against the real
        // entry root. A symlinked target or parent pointing outside the
        // library is rejected; one resolving inside it is allowed.
        let probe = resolved;
        while (probe !== path.dirname(probe) && !fs.existsSync(probe)) {
            probe = path.dirname(probe);
        }
        const realProbe = fs.realpathSync(probe);
        if (realProbe !== realRoot && !realProbe.startsWith(realRoot + path.sep)) {
            return { ok: false, error: "File resolves outside the library entry directory" };
        }

        return { ok: true, resolved };
    } catch (error: any) {
        return { ok: false, error: error?.message ?? "Path validation failed" };
    }
}
