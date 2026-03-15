import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { playlistsTable, seriesTable } from "../database.js";
import z from "zod";

const playlistCreateSchema = z.object({
    name: z.string().min(3).max(64).trim(),
    description: z.string().max(256).trim().optional(),
});

const playlistItemsSchema = z.object({
    items: z.array(z.string()).min(4).max(50),
});

const router = new Hono()
    .get('/', authMiddleware, async (c) => {
        const user = c.get('credentials').user;
        const playlists = await playlistsTable.get({
            account_UUID: user.UUID,
        });
        return c.json(playlists);
    })
    .post('/', authMiddleware, async (c) => {
        const jsonBody = await c.req.json();
        const playlistData = playlistCreateSchema.parse(jsonBody);

        const user = c.get('credentials').user;

        const playlistUUID = crypto.randomUUID();
        await playlistsTable.create({
            UUID: playlistUUID,
            account_UUID: user.UUID,
            name: playlistData.name,
            description: playlistData.description || '',
            items: [],
            settings: {
                sendEmailOnUpdate: false,
            },
        });

        return c.json({
            message: 'Successfully created playlist',
            playlistUUID,
        });
    })
    .put('/:UUID', authMiddleware, async (c) => {
        const jsonBody = await c.req.json();
        const playlistData = playlistCreateSchema.parse(jsonBody);

        const user = c.get('credentials').user;

        const playlist = await playlistsTable.getOne({
            UUID: c.req.param('UUID'),
            account_UUID: user.UUID,
            unique: true,
        });

        if (playlist == undefined) {
            return c.json({
                message: 'Playlist not found',
            });
        }

        await playlistsTable.update({
            UUID: playlist.UUID,
            account_UUID: user.UUID,
            unique: true,
        }, {
            name: playlistData.name,
            description: playlistData.description || '',
        });

        return c.json({
            message: 'Successfully updated playlist',
        });
    })
    .delete('/:UUID', authMiddleware, async (c) => {
        const user = c.get('credentials').user;

        const playlist = await playlistsTable.getOne({
            UUID: c.req.param('UUID'),
            account_UUID: user.UUID,
            unique: true,
        });

        if (playlist == undefined) {
            return c.json({
                message: 'Playlist not found',
            });
        }

        await playlistsTable.delete({
            UUID: playlist.UUID,
            account_UUID: user.UUID,
        });

        return c.json({
            message: 'Successfully deleted playlist',
        });
    })
    .put('/:UUID/:itemUUID', authMiddleware, async (c) => {
        const playlistUUID = c.req.param('UUID');
        const itemUUID = c.req.param('itemUUID');

        const user = c.get('credentials').user;

        const [
            playlist,
            series,
        ] = await Promise.all([
            playlistsTable.getOne({
                UUID: playlistUUID,
                account_UUID: user.UUID,
                unique: true,
            }),
            seriesTable.getOne({
                UUID: itemUUID,
                unique: true,
            })
        ]);

        if (playlist == undefined) {
            return c.json({
                message: 'Playlist not found',
            });
        }

        if (series == undefined) {
            return c.json({
                message: 'Series with that UUID not found',
            });
        }

        await playlistsTable.update({
            UUID: playlist.UUID,
            account_UUID: user.UUID,
            unique: true,
        }, {
            items: playlist.items.concat([itemUUID]),
        });

        return c.json({
            message: 'Successfully added items to playlist',
        });
    })
    .delete('/:UUID/:itemUUID', authMiddleware, async (c) => {
        const playlistUUID = c.req.param('UUID');
        const itemUUID = c.req.param('itemUUID');

        const user = c.get('credentials').user;

        const playlist = await playlistsTable.getOne({
            UUID: playlistUUID,
            account_UUID: user.UUID,
            unique: true,
        });

        if (playlist == undefined) {
            return c.json({
                message: 'Playlist not found',
            });
        }

        if (playlist.items.find(UUID => UUID === itemUUID) === undefined) {
            return c.json({
                message: 'Item not found in playlist',
            });
        }

        await playlistsTable.update({
            UUID: playlist.UUID,
            account_UUID: user.UUID,
            unique: true,
        }, {
            items: playlist.items.filter((i) => i !== itemUUID),
        });

        return c.json({
            message: 'Successfully removed items from playlist',
        });
    });

export { router as playlistRouter };