import { Role } from "@cinefinn/types";
import { Hono } from "hono";
import { ignoranceTable, seriesTable } from "../../database.js";
import { authFullMiddleware } from "../../middleware/auth.js";
import z from "zod";

const createIgnoranceItemSchema = z.object({
    serie_UUID: z.string(),
    lang: z.enum(['GerDub', 'GerSub', 'EngDub', 'EngSub', 'JapDub', 'EngSubK', 'GerSubK', 'GerSubC', 'EngSubC']).optional(),
});

export const ignoranceItemsRouter = new Hono()
    .get('/', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const ignoranceItems = await ignoranceTable.get();
        return c.json(ignoranceItems);
    })
    .post('/', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
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
    .delete('/:SerieUUID', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
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
    })