import axios from 'axios';
import jsdom from 'jsdom';
import fs from 'fs';
import path from 'path';
import type { Calendar, StoCalendarEntry } from '@cinefinn/types';


async function getStoCalendar(): Promise<StoCalendarEntry[]> {
    const response = await axios.get('http://186.2.175.5/');
    const { document } = new jsdom.JSDOM(response.data).window;

    const latestEpisodes = document.querySelector('div.latest-episodes-compact');

    const newEpisodes = [...latestEpisodes!.querySelectorAll('a.latest-episode-row')].map(x => {
        const href = x.getAttribute('href');
        const title = x.querySelector('span.ep-title')?.getAttribute('title');
        if (href == undefined || title == undefined) {
            console.log('No href or title found', { href, title });
            return null;
        }

        const season = href.split('/staffel-')[1].split('/episode-')[0];
        const episode = href.split('/episode-')[1];


        const serieSlug = href.split('/')[2];

        const filmID = season === '0' ? episode : null;

        return {
            type: 'sto',
            href,
            title,
            parsed: {
                filmID,
                season: filmID == null ? season : null,
                episode: filmID == null ? episode : null,
                serieSlug
            }
        } satisfies StoCalendarEntry;
    }).filter(x => x != null);

    return newEpisodes;

}

const filePath = path.join(process.cwd(), 'stoCalendar.json');

export async function storeStoCalendar() {
    const newEpisodes = await getStoCalendar();
    const calendar = await getStoCalendarFromFile();
    calendar[new Date().getTime()] = newEpisodes;
    fs.writeFileSync(filePath, JSON.stringify(calendar, null, 2));
    return calendar;
}

export async function getStoCalendarFromFile() {

    if (fs.existsSync(filePath) == false) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
    }
    const calendar = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Calendar<StoCalendarEntry>;
    return calendar;
}