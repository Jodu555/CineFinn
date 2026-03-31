import { Hono } from "hono";
import { authFullMiddleware } from "../../middleware/auth.js";
import { getSubSystems } from "../../sockets/subsystem.socket.js";
import { getMovingItems, prepareProcessMovingItem } from "../../utils/movingItems.js";
import { Role } from "@cinefinn/types";
import z from "zod";
import { watchableEntitysTable } from "../../database.js";

const processMovingItemsSchema = z.object({
    IDs: z.array(z.string()),
});

const createMovingItemSchema = z.object({
    to: z.string(),
    seriesIDs: z.array(z.string()),
})

export const subsystemRouter = new Hono()
    .get('', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const subsystems = await getSubSystems();
        return c.json(await Promise.all(subsystems));
    })
    .get('/movingItems', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const movingItems = getMovingItems();
        return c.json(movingItems);
    })
    .post('/movingItems', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const body = await c.req.json();
        const processMovingItemsBody = processMovingItemsSchema.parse(body);
        for (const toProcessID of processMovingItemsBody.IDs) {
            prepareProcessMovingItem(toProcessID);
        }
        return c.json(getMovingItems());
    })
    .patch('/movingItems', authFullMiddleware((user) => user.role >= Role.Admin), async (c) => {
        const body = await c.req.json();
        const createMovingItemBody = createMovingItemSchema.parse(body);

        const { to, seriesIDs: series } = createMovingItemBody;

        for await (const serieUUID of series) {
            const watchableEntitys = await watchableEntitysTable.get({ serie_UUID: serieUUID });

            for await (const watchableEntity of watchableEntitys) {

                if (watchableEntity.subID === to) {
                    console.log(`Skipping watchable entity ${watchableEntity.UUID} because it is already on the target sub-system ${to}`);
                    continue;
                }

                getMovingItems().push({
                    ID: watchableEntity.UUID,
                    serie_UUID: serieUUID,
                    fromSubID: watchableEntity.subID,
                    toSubID: to,
                    watchableEntityUUID: watchableEntity.UUID,
                    meta: {
                        progress: 0,
                        movingStarted: 0,
                        result: '',
                        isAdditional: true,
                    }
                })
            }
        }
    });