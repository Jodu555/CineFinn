import { Hono } from "hono";
import { authFullMiddleware } from "../auth.js";
import { accountsTable, emailsTable, episodesTable, ignoranceTable, moviesTable, playlistsTable, seasonsTable, seriesTable, watchableEntitysTable, watchHistoryTable } from "../database.js";
import { getKnownSubSystems, getSeriesRelatedToSubSystem, getSubSystems } from "../sockets/subsystem.socket.js";
import { getIO } from "../utils.js";
import type { Overview, SocketAuthDataSubsystem } from "@cinefinn/types/socket";
import { Role } from "@cinefinn/types/database";
import { generateEmailID } from "../utils/IdGenerators.js";
import { getConfig, updateConfig } from "../config.js";
import z from "zod";
import { HTTPException } from "hono/http-exception";
import { getMovingItems, prepareProcessMovingItem } from "../utils/movingItems.js";
import type { Langs } from "../parser.js";


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

function redactConfig(config: ReturnType<typeof getConfig>): ReturnType<typeof getConfig> {
    const redactedConfig = JSON.parse(JSON.stringify(config));
    redactedConfig.smtp.auth.pass = 'REDACTED';
    redactedConfig.database.password = 'REDACTED';
    return redactedConfig;
}

const processMovingItemsSchema = z.object({
    IDs: z.array(z.string()),
});

const createIgnoranceItemSchema = z.object({
    serie_UUID: z.string(),
    lang: z.enum(['GerDub', 'GerSub', 'EngDub', 'EngSub', 'JapDub', 'EngSubK', 'GerSubK', 'GerSubC', 'EngSubC']).optional(),
});

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
    .get('/subsystems/movingItems', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const movingItems = getMovingItems();
        return c.json(movingItems);
    })
    .post('/subsystems/movingItems', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const body = await c.req.json();
        const processMovingItemsBody = processMovingItemsSchema.parse(body);
        for (const toProcessID of processMovingItemsBody.IDs) {
            prepareProcessMovingItem(toProcessID);
        }
        return c.json(getMovingItems());
    })
    .get('/overview', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const overview = await generateOverview();
        return c.json(overview);
    })
    .get('/emails', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const emails = await emailsTable.get();
        return c.json(emails);
    })
    .get('/config', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const config = getConfig();
        const redactedConfig = redactConfig(config);
        return c.json(redactedConfig);
    })
    .post('/config', authFullMiddleware((user) => user.role >= Role.Admin), async (c) => {
        const configChangeBody = z.object({
            key: z.string(),
            value: z.any(),
        });
        const body = await c.req.json();

        const configChange = configChangeBody.parse(body);

        //key with dot notation to the actual walking

        const config = getConfig();


        const blockedKeys = ['version', 'system.PORT', 'system.PUBLIC_API_ENDPOINT', 'system.PUBLIC_API_AUTH_TOKEN', 'smtp.auth.host', 'smtp.auth.pass', 'database.password'];

        if (blockedKeys.includes(configChange.key)) {
            throw new HTTPException(400, {
                message: 'Operation not supported! (blocked keys)',
            });
        }

        let tempObject = config as any;
        const parts = configChange.key.split('.');
        let i = 0;
        for (const part of parts) {
            if (tempObject[part] == undefined) {
                throw new HTTPException(400, {
                    message: 'Operation not supported (missing/invalid key)',
                });
            }
            if (i == parts.length - 1) {
                tempObject[part] = configChange.value;
            }
            tempObject = tempObject[part];
            i++;
        }
        updateConfig(config);
        return c.json(redactConfig(config));
    })
    .get('/ignoranceItems', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const ignoranceItems = await ignoranceTable.get();
        return c.json(ignoranceItems);
    })
    .post('/ignoranceItems', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const body = await c.req.json();
        const data = createIgnoranceItemSchema.parse(body);

        const series = await seriesTable.getOne({
            UUID: data.serie_UUID,
            unique: true,
        });
        if (series == undefined) {
            return c.json({
                status: 'error',
                message: 'Serie not found',
            });
        }

        const ignoranceItem = ignoranceTable.create({
            serie_UUID: data.serie_UUID,
            lang: data.lang,
        });
        return c.json(ignoranceItem);
    })
    .delete('/ignoranceItems/:SerieUUID', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const serie_UUID = c.req.param('SerieUUID');
        const ignoranceItem = await ignoranceTable.getOne({
            serie_UUID,
            unique: true,
        });
        if (ignoranceItem == undefined) {
            return c.json({
                status: 'error',
                message: 'IgnoranceItem not found',
            });
        }
        await ignoranceTable.delete({
            serie_UUID,
        });
        return c.json({
            status: 'success',
        });
    });

export { router as adminRouter };