import axios from 'axios';
import { JSDOM } from 'jsdom';

export interface MyAsianSeries {
    url: string;
    title: string;
    informations: MyAsianInformations;
    episodes: MyAsianEpisode[];
}

interface MyAsianInformations {
    year: string;
    status: string;
    genres: string[];
    description: string;
    image: string;
}

interface MyAsianEpisode {
    number: number;
    title: string;
    url: string;
}

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
                langs: [...e.querySelectorAll<HTMLImageElement>('img')].map(e => e.alt),
                year: e.querySelector<HTMLSpanElement>('span')?.textContent?.trim(),
            };
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
            },
            episodes: episodes.sort((a, b) => a.number - b.number),
        };
        return informations;
    }
}

export default MyAsianTV;