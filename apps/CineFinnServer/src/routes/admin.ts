import { Hono } from "hono";
import { authFullMiddleware } from "../auth.js";
import { accountsTable } from "../database.js";
import { getKnownSubSystems, getSeriesRelatedToSubSystem } from "../sockets/subsystem.socket.js";
import { getIO } from "../utils.js";
import type { SocketAuthDataSubsystem } from "@cinefinn/types/socket";
import { Role } from "@cinefinn/types/database";




const router = new Hono()
    .get('/accounts', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const accounts = await accountsTable.get();
        accounts.forEach(a => {
            delete a.password;
        });
        return c.json(accounts);
    })
    .get('/subsystems', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
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
                    id: subID,
                    name: subID,
                    series
                };
            } else {
                return {
                    ...subData,
                    series
                }
            }
        });
        return c.json(await Promise.all(subsystems));
    });

export { router as adminRouter };