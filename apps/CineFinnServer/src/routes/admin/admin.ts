import { Hono } from "hono";
import { authFullMiddleware } from "../../middleware/auth.js";
import { accountsTable, emailsTable, episodesTable, ignoranceTable, moviesTable, playlistsTable, seasonsTable, seriesTable, watchableEntitysTable, watchHistoryTable } from "../../database.js";
import { getSubSystems } from "../../sockets/subsystem.socket.js";
import { getIO, queryDatabase } from "../../utils.js";
import type { Overview } from "@cinefinn/types/socket";
import { Role } from "@cinefinn/types/models/user";
import { getMovingItems } from "../../utils/movingItems.js";
import { cacheRouter } from "./cache.js";
import { subsystemRouter } from "./subsystems.js";
import { configRouter } from "./config.js";
import { toolingRouter } from "./tooling.js";
import { ignoranceItemsRouter } from "./ignoranceItems.js";

async function getTotalRuntime(): Promise<number> {
    const result = await queryDatabase(`
            SELECT COALESCE(SUM(runtime), 0) AS total_runtime
            FROM watchableEntitys;
        `)

    const finalResult = result[0].total_runtime > 0 ? parseInt(result[0].total_runtime) : 0;
    return finalResult;
}

export async function generateOverview() {
    const [
        accounts,
        subsystems,
        series,
        seasons,
        episodes,
        movies,
        watchableEntitys,
        totalRuntime,
        watchHistoryEntrys,
        playlists,
        ignoreItems,
        sockets,
    ] = await Promise.allSettled([
        accountsTable.count(),
        getSubSystems(),
        seriesTable.count(),
        seasonsTable.count(),
        episodesTable.count(),
        moviesTable.count(),
        watchableEntitysTable.count(),
        getTotalRuntime(),
        watchHistoryTable.count(),
        playlistsTable.count(),
        ignoranceTable.count(),
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
        totalRuntime: totalRuntime.status === 'fulfilled' ? totalRuntime.value : 0,
        watchHistoryEntrys: watchHistoryEntrys.status === 'fulfilled' ? watchHistoryEntrys.value : 0,
        playlists: playlists.status === 'fulfilled' ? playlists.value : 0,
        ignoranceItems: ignoreItems.status === 'fulfilled' ? ignoreItems.value : 0,
        sockets: sockets.status === 'fulfilled' ? sockets.value.length : 0,
        scraper: sockets.status === 'fulfilled' ? sockets.value.find(s => s.data.auth.type === 'scraper') !== undefined : false,
    } satisfies Overview;
    return overview;
}

export async function rebroadcastOverview() {
    // database
    try {
        const sockets = await getIO().fetchSockets();
        const overview = await generateOverview();
        sockets.forEach((socket) => {
            if (socket.data.auth.type === 'client' && socket.data.auth.user.role >= Role.Mod) {
                socket.emit('adminOverview', overview);
            }
        });
    } catch (error) {

    }
}

export async function rebroadcastAccounts() {
    const sockets = await getIO().fetchSockets();
    const accounts = await accountsTable.get();
    accounts.forEach(a => {
        delete a.password;
    });
    sockets.forEach((socket) => {
        if (socket.data.auth.type === 'client' && socket.data.auth.user.role >= Role.Mod) {
            socket.emit('adminAccounts', accounts);
        }
    });
}

export async function rebroadcastSubsystems() {
    const sockets = await getIO().fetchSockets();
    const subsystems = await getSubSystems();
    sockets.forEach((socket) => {
        if (socket.data.auth.type === 'client' && socket.data.auth.user.role >= Role.Mod) {
            socket.emit('adminSubsystems', subsystems);
        }
    });
}

export async function rebroadcastMovingItems() {
    const sockets = await getIO().fetchSockets();
    const movingItems = getMovingItems();
    sockets.forEach((socket) => {
        if (socket.data.auth.type === 'client' && socket.data.auth.user.role >= Role.Mod) {
            socket.emit('adminMovingItems', movingItems);
        }
    });
}

const router = new Hono()
    .get('/accounts', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const accounts = await accountsTable.get();
        accounts.forEach(a => {
            delete a.password;
        });
        return c.json(accounts);
    })
    .get('/overview', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const overview = await generateOverview();
        return c.json(overview);
    })
    .get('/emails', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const emails = await emailsTable.get();
        return c.json(emails);
    })
    .route('/subsystems', subsystemRouter)
    .route('/cache', cacheRouter)
    .route('/config', configRouter)
    .route('/tooling', toolingRouter)
    .route('/ignoranceItems', ignoranceItemsRouter)



export { router as adminRouter };