import { Hono } from "hono";
import { getStoCalendarFromFile, storeStoCalendar } from "./stoCalendar.js";
import { getAniworldCalendarFromFile, storeAniworldCalendar } from "./aniworldCalendar.js";

const router = new Hono()
    .get('/store/sto', async (c) => {
        console.time('Store STO Calendar');
        const calendar = await storeStoCalendar();
        console.timeEnd('Store STO Calendar');
        return c.json(calendar);
    })
    .get('/show/sto', async (c) => {
        const calendar = await getStoCalendarFromFile();
        return c.json(calendar);
    })
    .get('/store/aniworld', async (c) => {
        console.time('Store Aniworld Calendar');
        const calendar = await storeAniworldCalendar();
        console.timeEnd('Store Aniworld Calendar');
        return c.json(calendar);
    })
    .get('/show/aniworld', async (c) => {
        const calendar = await getAniworldCalendarFromFile();
        return c.json(calendar);
    });

export { router as calendarRouter };