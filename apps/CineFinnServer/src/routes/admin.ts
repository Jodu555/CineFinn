import { Hono } from "hono";
import { authFullMiddleware } from "../auth.js";
import { accountsTable, episodesTable, moviesTable, playlistsTable, seasonsTable, seriesTable, watchableEntitysTable, watchHistoryTable } from "../database.js";
import { getKnownSubSystems, getSeriesRelatedToSubSystem, getSubSystems } from "../sockets/subsystem.socket.js";
import { getIO } from "../utils.js";
import type { SocketAuthDataSubsystem } from "@cinefinn/types/socket";
import { Role } from "@cinefinn/types/database";


export async function generateOverview() {
    const [
        accounts,
        subsystems,
        series,
        seasons,
        episodes,
        movies,
        watchableEntitys,
        watchHistoryEntrys,
        playlists,
        sockets,
    ] = await Promise.all([
        accountsTable.count(),
        getSubSystems(),
        seriesTable.count(),
        seasonsTable.count(),
        episodesTable.count(),
        moviesTable.count(),
        watchableEntitysTable.count(),
        watchHistoryTable.count(),
        playlistsTable.count(),
        getIO().fetchSockets(),
    ]);
    const overview = {
        accounts: accounts,
        subsystems: {
            all: subsystems.length,
            offline: subsystems.filter(s => s.status === 'offline').length,
        },
        series: series,
        seasons: seasons,
        episodes: episodes,
        movies: movies,
        watchableEntitys: watchableEntitys,
        watchHistoryEntrys: watchHistoryEntrys,
        playlists: playlists,
        sockets: sockets.length,
        scraper: sockets.find(s => s.data.auth.type === 'scraper') !== undefined,
    };
}

export async function rebroadcastOverview() {
    // database
}

export async function rebroadcastAccounts() {

}

export async function rebroadcastSubsystems() {

}

const router = new Hono()
    .get('/accounts', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const accounts = await accountsTable.get();
        accounts.forEach(a => {
            delete a.password;
        });
        return c.json(accounts);
    })
    .get('/subsystems', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const subsystems = await getSubSystems();
        return c.json(await Promise.all(subsystems));
    })
    .get('/overview', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const overview = await generateOverview();
        return c.json(overview);
    });

export { router as adminRouter };