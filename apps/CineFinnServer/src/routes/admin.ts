import { Hono } from "hono";
import { authFullMiddleware } from "../auth.js";
import { accountsTable, episodesTable, moviesTable, playlistsTable, seasonsTable, seriesTable, watchableEntitysTable, watchHistoryTable } from "../database.js";
import { getKnownSubSystems, getSeriesRelatedToSubSystem, getSubSystems } from "../sockets/subsystem.socket.js";
import { getIO } from "../utils.js";
import type { Overview, SocketAuthDataSubsystem } from "@cinefinn/types/socket";
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
    ] = await Promise.allSettled([
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
        accounts: accounts.status === 'fulfilled' ? accounts.value : 0,
        subsystems: {
            all: subsystems.status === 'fulfilled' ? subsystems.value.length : 0,
            offline: subsystems.status === 'fulfilled' ? subsystems.value.filter(s => s.status === 'offline').length : 0,
            online: subsystems.status === 'fulfilled' ? subsystems.value.filter(s => s.status === 'online').length : 0,
        },
        series: series.status === 'fulfilled' ? series.value : 0,
        seasons: seasons.status === 'fulfilled' ? seasons.value : 0,
        episodes: episodes.status === 'fulfilled' ? episodes.value : 0,
        movies: movies.status === 'fulfilled' ? movies.value : 0,
        watchableEntitys: watchableEntitys.status === 'fulfilled' ? watchableEntitys.value : 0,
        watchHistoryEntrys: watchHistoryEntrys.status === 'fulfilled' ? watchHistoryEntrys.value : 0,
        playlists: playlists.status === 'fulfilled' ? playlists.value : 0,
        sockets: sockets.status === 'fulfilled' ? sockets.value.length : 0,
        scraper: sockets.status === 'fulfilled' ? sockets.value.find(s => s.data.auth.type === 'scraper') !== undefined : false,
    } satisfies Overview;
    return overview;
}

export async function rebroadcastOverview() {
    // database
    const sockets = await getIO().fetchSockets();
    const overview = await generateOverview();
    sockets.forEach((socket) => {
        if (socket.data.auth.type === 'client' && socket.data.auth.user.role >= Role.Mod) {
            socket.emit('adminOverview', overview);
        }
    });
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