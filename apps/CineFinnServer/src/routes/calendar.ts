import { Hono } from "hono";
import { getCalendar } from "../sockets/scraper.socket.js";
import { getFrontEndSeries } from "./index.js";

const router = new Hono()
    .get('/', async (c) => {
        const calendarMap = await getCalendar();
        if (calendarMap == undefined) {
            return c.json({ message: 'Scraper Socket not connected Calendar not available' }, 400);
        }

        type newCalendarEntry = {
            type: 'aniworld' | 'sto';
            ts: number;
            title: string;
            slug: string;
            href: string;
            season: string | null;
            episode: string | null;
            filmID: string | null;
            serieID: string;
        }

        const aniworldEntrys = [] as newCalendarEntry[];


        /**
         * Maps the slugs to a seriesID
         */
        const slugMap = new Map<string, string>();

        const series = await getFrontEndSeries();

        [...Object.entries(calendarMap.aniworld), ...Object.entries(calendarMap.sto)].forEach(([calendarTimestamp, calendarEntry]) => {
            const newCalEntrys = calendarEntry.map(e => {
                const slug = e.parsed.serieSlug;
                let serieID = slugMap.get(slug);
                if (serieID == undefined) {
                    for (const serie of series) {
                        if (serie.refs.aniworld?.includes(slug)) {
                            serieID = serie.UUID;
                            slugMap.set(slug, serieID);
                            break;
                        }
                        if (serie.refs.sto?.includes(slug)) {
                            serieID = serie.UUID;
                            slugMap.set(slug, serieID);
                            break;
                        }
                    }
                }
                return {
                    type: e.type,
                    ts: calendarTimestamp,
                    date: new Date(+calendarTimestamp).toLocaleString(),
                    title: e.title,
                    slug: slug,
                    href: e.href,
                    season: e.parsed.season,
                    episode: e.parsed.episode,
                    filmID: e.parsed.filmID,
                    serieID: serieID,
                } as any as newCalendarEntry;
            });
            aniworldEntrys.push(...newCalEntrys);
        });

        return c.json(aniworldEntrys.filter(x => x.serieID != undefined));
    })

export { router as calendarRouter };