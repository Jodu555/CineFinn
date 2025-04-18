import { MyAsianEpisode, MyAsianInformations, MyAsianSeries } from '@Types/scrapers';
import axios from 'axios';
import { JSDOM } from 'jsdom';

class MyAsianTV {
    readonly baseURL = 'https://www.myasiantv.ms/';
    slug: string;
    constructor(slug: string) {
        this.slug = slug;
    }
    async parseInformations(): Promise<MyAsianSeries> {
        const url = `${this.baseURL}show/${this.slug}`;
        const response = await axios.get(url);
        const dom = new JSDOM(response.data);
        const document = dom.window.document;

        const movie = document.querySelector<HTMLDivElement>('.movie');

        const titleWithYear = movie.querySelector<HTMLAnchorElement>('a[title]')?.getAttribute('title');
        const image = movie.querySelector<HTMLImageElement>('img.poster')?.src;

        const tableInfo = [...movie.querySelectorAll<HTMLTableElement>('.left p')].map(e => {
            return [
                e.querySelector('strong')?.textContent.trim().replace(':', ''),
                e.querySelector('span')?.textContent.trim(),
            ];
        });
        const desciption = document.querySelector<HTMLDivElement>('.movie .right .info')?.textContent?.trim();

        const episodes = [...movie.querySelectorAll<HTMLLIElement>('ul.list-episode li')].map(e => {
            const anchor = e.querySelector<HTMLAnchorElement>('h2 a[title]');
            const slug = anchor?.getAttribute('title');
            return {
                number: parseInt(slug.split('-').at(-1)),
                slug: slug,
                url: anchor?.href,
                title: anchor?.textContent.trim(),
                langs: [...e.querySelectorAll<HTMLImageElement>('img')].map(e => e.alt as ('Subtitle' | 'Raw')),
                year: e.querySelector<HTMLSpanElement>('span')?.textContent?.trim(),
            } satisfies MyAsianEpisode;
        });


        const informations = {
            url,
            title: titleWithYear.replace(`(${tableInfo.find(x => x[0] == 'Release year')[1].trim()})`, '').trim(),
            informations: {
                year: tableInfo.find(x => x[0] == 'Release year')[1].trim(),
                status: tableInfo.find(x => x[0] == 'Status')[1].trim(),
                genres: tableInfo.find(x => x[0] == 'Genre')[1].trim().split(',').map(x => x.trim()),
                description: desciption,
                image,
            } satisfies MyAsianInformations,
            episodes: episodes.sort((a, b) => a.number - b.number),
        } satisfies MyAsianSeries;
        return informations;
    }
}

export default MyAsianTV;