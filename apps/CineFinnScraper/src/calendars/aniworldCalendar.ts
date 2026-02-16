import axios from 'axios';
import jsdom from 'jsdom';
import fs from 'fs';
import path from 'path';

interface AniworldCalendarEntry {
    href: string;
    title: string;
    marker: string;
    releasedAt: string;
    parsed: {
        filmID: string | null;
        season: string | null;
        episode: string | null;
        serieSlug: string;
    }
}

type Calendar = Record<number, AniworldCalendarEntry[]>;

async function getAniworldCalendar(): Promise<AniworldCalendarEntry[]> {
    const response = await axios.get('https://aniworld.to/neue-episoden');
    const { document } = new jsdom.JSDOM(response.data).window;

    const newEpisodeList = document.querySelector('div.newEpisodeList');

    const newEpisodes = [...document.querySelectorAll('div.row > div.col-md-12')].map(x => {
        const href = x.querySelector('a')?.getAttribute('href');
        const title = x.querySelector('strong')?.textContent;
        const marker = x.querySelector('span.listTag')?.textContent;
        const releasedAt = x.querySelector('span.elementFloatRight')?.textContent;
        if (href == undefined || title == undefined || marker == undefined || releasedAt == undefined) {
            console.log('No href or title found', { href, title, marker, releasedAt });
            return null;
        }
        const filmID = href.includes('/filme/film-') ? href.split('/filme/film-')[1] : null;

        let season = null;
        let episode = null;
        if (filmID == null) {
            season = href.split('/staffel-')[1].split('/episode-')[0];
            episode = href.split('/episode-')[1];
        }

        const serieSlug = href.split('/')[3];

        return {
            href,
            title,
            marker,
            releasedAt,
            parsed: {
                filmID,
                season,
                episode,
                serieSlug
            }
        };
    }).filter(x => x != null);
    return newEpisodes;

}

const filePath = path.join(process.cwd(), 'aniworldCalendar.json');

export async function storeAniworldCalendar() {
    const newEpisodes = await getAniworldCalendar();
    const calendar = await getAniworldCalendarFromFile();
    calendar[new Date().getTime()] = newEpisodes;
    fs.writeFileSync(filePath, JSON.stringify(calendar, null, 2));
    return calendar;
}

export async function getAniworldCalendarFromFile() {
    if (fs.existsSync(filePath) == false) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
    }
    const calendar = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Calendar;
    return calendar;
}