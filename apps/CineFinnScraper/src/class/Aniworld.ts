import * as cheerio from 'cheerio';
import type { Langs } from '@cinefinn/types/database';
import type { AniWorldAdditionalSeriesInformations, AniWorldEntity, AniWorldSeriesInformations } from '@cinefinn/types/scrapers';
import axios from 'axios';
import jsdom from 'jsdom';

const timing = false;
class Aniworld {
    url: string;
    imageSRCPrefix: string;
    isv2: boolean;
    constructor(url: string) {
        this.url = url;
        this.imageSRCPrefix = new URL(url).origin;
        this.isv2 = false;

        if (this.url.endsWith('/')) {
            this.url = this.url.slice(0, -1);
        }
    }

    async parseInformations(): Promise<void | AniWorldSeriesInformations> {
        try {
            timing && console.time('parseInformations');
            timing && console.time('firstRequest');
            const response = await axios.get(this.url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36' },
            });
            timing && console.timeEnd('firstRequest');

            timing && console.time('firstParse');
            this.checkV2(response.data);

            const additional = this.isv2 ? this.parseAdditionalInformationsV2(response.data) : this.parseAdditionalInformations(response.data);

            const { numberOfSeasons, hasMovies } = this.isv2 ? this.parseEntityInformationsV2(response.data) : this.parseEntityInformations(response.data);
            timing && console.timeEnd('firstParse');

            const output: AniWorldSeriesInformations = { url: this.url, informations: additional, hasMovies, seasons: new Array(numberOfSeasons) };

            console.log('Parsed: ');
            console.log(' ' + this.url);
            console.log(`   => Seasons: ${numberOfSeasons} - Movies: ${hasMovies}`);

            if (hasMovies) {
                const url = this.isv2 ? `${this.url}/staffel-0` : `${this.url}/filme`
                const movResponse = await axios.get(url);
                output.movies = this.isv2 ? this.getListInformationsV2(movResponse.data) : this.getListInformations(movResponse.data);
                console.log(`    => Got ${output.movies.length} Movies`);
            }

            timing && console.time('getListInformations');
            output.seasons[0] = this.isv2 ? this.getListInformationsV2(response.data) : this.getListInformations(response.data);
            timing && console.timeEnd('getListInformations');
            console.log(`    => Got Season ${0} with ${output.seasons[0].length} Episodes`);
            for (let i = 1; i < numberOfSeasons; i++) {
                const url = `${this.url}/staffel-${i + 1}`;
                const seaResponse = await axios.get(url);
                output.seasons[i] = this.isv2 ? this.getListInformationsV2(seaResponse.data) : this.getListInformations(seaResponse.data);
                console.log(`    => Got Season ${i} with ${output.seasons[i].length} Episodes`);
            }
            timing && console.timeEnd('parseInformations');
            return output;
        } catch (error) {
            return;
        }
    }

    private checkV2(data: string) {
        const $ = cheerio.load(data);
        const isV2 = $('nav.navbar span.logo-summary').text();
        this.isv2 = isV2 === 'UPDATE';
    }

    private parseEntityInformations(data: string): { numberOfSeasons: number; hasMovies: boolean; } {
        const { document } = new jsdom.JSDOM(data).window;
        const seasonsUl = [...document.querySelectorAll('span')].find((e) => e.textContent!.includes('Staffeln:'))!.parentElement!.parentElement;
        const seasonsTab = [...seasonsUl!.querySelectorAll('li')].map((e) => e.querySelector('a')?.title).filter((e) => e != undefined);

        const numberOfSeasons = seasonsTab.filter((e) => e.includes('Staffel')).length;
        const hasMovies = seasonsTab.find((e) => e.includes('Film')) != null;

        return {
            numberOfSeasons,
            hasMovies,
        };
    }

    private parseEntityInformationsV2(data: string): { numberOfSeasons: number; hasMovies: boolean; } {
        const { document } = new jsdom.JSDOM(data).window;

        const seasonList = document.querySelector('nav#season-nav ul.nav');

        if (seasonList == null) {
            console.log('No Season List found');
            return { numberOfSeasons: 0, hasMovies: false };
        }

        const seasonsAndMovies = [...seasonList.querySelectorAll('li.nav-item a[data-season-pill]')];


        let numberOfSeasons = 0;
        let hasMovies = false;
        for (const seasonOrMovie of seasonsAndMovies) {
            if (seasonOrMovie.getAttribute('data-season-pill') !== '0') {
                numberOfSeasons++;
            } else if (seasonOrMovie.getAttribute('data-season-pill') == '0') {
                hasMovies = true;
            }
        }

        return {
            numberOfSeasons,
            hasMovies,
        };
    }

    private parseAdditionalInformations(data: string): AniWorldAdditionalSeriesInformations {
        const $ = cheerio.load(data);
        const infos = $('h1[itemprop="name"] > span').text();
        const description = $('p.seri_des').text();

        const startDate = $('span[itemprop="startDate"]').text();
        const endDate = $('span[itemprop="endDate"]').text();

        const image = $('img[itemprop="image"]');
        const imageSRC = image.attr('data-src');

        if (infos == '') {
            console.log('Not Found!!!!!!', this.url, this.imageSRCPrefix);
        }

        return { infos, startDate, endDate, description, image: `${this.imageSRCPrefix}${imageSRC}` };
    }

    private parseAdditionalInformationsV2(data: string): AniWorldAdditionalSeriesInformations {
        const { document } = new jsdom.JSDOM(data).window;

        const infos = document.querySelector(`div.container-fluid h1.h2`)?.textContent?.trim() || 'NOT FOUND'

        const description = document.querySelector('div.container-fluid div.series-description span.description-text')?.textContent || 'NOT FOUND';

        const dates = [...document.querySelectorAll(`div.container-fluid p.small.text-muted.mb-2 a.small.text-muted`)];
        const startDate = dates[0]?.textContent?.trim() || '';
        const endDate = dates[1]?.textContent?.trim() || '';
        const imdbID = dates[2]?.getAttribute('href') || '';

        const imageSRC = document.querySelector('div.col-3.col-md-3.col-lg-2.d-none.d-md-block picture img')?.getAttribute('data-src') || '';

        if (infos == '') {
            console.log('Not Found!!!!!!', this.url, this.imageSRCPrefix);
        }

        return { infos, startDate, endDate, description, image: `${this.imageSRCPrefix}${imageSRC}` };
    }

    private getListInformations(data: string): AniWorldEntity[] {
        const { document } = new jsdom.JSDOM(data).window;
        const episodes = [...document.querySelectorAll('tr[itemprop="episode"]')];
        const out: AniWorldEntity[] = [];
        episodes.forEach((ep) => {
            let langs: string[] = [];
            [...ep.querySelectorAll<HTMLImageElement>('.editFunctions img')].forEach((lang) => {
                langs.push(lang.src);
            });

            langs = langs
                .map((l) => {
                    switch (l) {
                        case '/public/img/german.svg':
                        case '/public/svg/german.svg':
                            return 'GerDub';
                        case '/public/img/japanese-german.svg':
                            return 'GerSub';
                        case '/public/img/japanese-english.svg':
                            return 'EngSub';
                        case '/public/svg/english.svg':
                        case '/public/img/english.svg':
                            return 'EngDub';
                        default:
                            return null;
                            break;
                    }
                })
                .filter((x) => x != null);

            const mainName = ep.querySelector('.seasonEpisodeTitle strong')?.textContent;
            const secondName = ep.querySelector('.seasonEpisodeTitle span')?.textContent;

            if (mainName == undefined || secondName == undefined) return;

            if (langs.length > 0) out.push({ mainName, secondName, langs: langs as Langs[] });
        });
        return out;
    }

    private getListInformationsV2(data: string): AniWorldEntity[] {
        const { document } = new jsdom.JSDOM(data).window;

        const episodeTable = document.querySelector('section.episode-section table.episode-table tbody');
        const episodes = [...episodeTable!.querySelectorAll('tr.episode-row')].filter(x => !x.classList.contains('upcoming'));

        const out: AniWorldEntity[] = [];
        episodes.forEach((ep) => {

            const rows = [...ep.querySelectorAll('td')];

            const mainName = rows[0]!.querySelector('strong.episode-title-ger')?.getAttribute('title') || '';
            const secondName = rows[0]!.querySelector('span.episode-title-eng')?.getAttribute('title') || '';
            const langs: Langs[] = [];

            const flags = rows[2]!.querySelectorAll('svg.watch-language')

            for (const flag of flags) {
                const flagLangClass = [...flag.classList].find(x => x.includes('svg-flag-'))
                if (flagLangClass == undefined) {
                    console.log('NOT FOUND!!! flagLangClass');
                    continue;
                }

                const language = flagLangClass.split('svg-flag-')[1];

                switch (language) {
                    case 'german':
                        langs.push('GerDub');
                        break;
                    case 'english':
                        langs.push('EngDub');
                        break;
                    case 'japanese':
                        langs.push('JapDub');
                        break;
                }

            }

            out.push({ mainName, secondName, langs: langs as Langs[] })
        });
        return out;
    };
}

export default Aniworld;