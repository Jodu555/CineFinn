import fs from 'fs';
import axios from 'axios';
import jsdom from 'jsdom';
import cheerio from 'cheerio';
import { Langs } from '@Types/classes';

// export interface AniWorldEntity {
//     mainName: string;
//     secondName: string;
//     langs: Langs[];
// }

// export interface AniWorldAdditionalSeriesInformations {
//     infos: string;
//     startDate: string;
//     endDate: string;
//     description: string;
//     image: string | boolean;
// }

// export interface AniWorldSeriesInformations {
//     url: string;
//     informations: AniWorldAdditionalSeriesInformations;
//     hasMovies: boolean;
//     movies?: AniWorldEntity[];
//     seasons: AniWorldEntity[][];
// }

export interface SimpleZoroEpisode {
    ID: string;
    title: string;
    number: string;
    url: string;
}

export interface ExtendedZoroEpisode extends SimpleZoroEpisode {
    langs: string[];
    streamingServers: StreamingServers[];
}

export interface StreamingServers {
    type: 'sub' | 'dub';
    ID: string;
    serverIndex: string;
    name: string;
}

export interface SeasonInformation {
    ID: string;
    IDX: string;
    title: string;
}

interface ZoroSeriesInformation {
    title: string;
    image: string;
    subCount: number;
    dubCount: number;
    episodeCount: number;
    seasons: ExtendedZoroEpisode[][];
}

interface SeriesAdditionalInformation {
    infos?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    image: string | boolean;
}

interface SeriesInformation {
    title: string;
    url: string;
    informations: SeriesAdditionalInformation;
    hasMovies: boolean;
    movies?: SeriesEntity[];
    seasons: SeriesEntity[][];
}

interface SeriesEntity {
    mainName?: string;
    secondName?: string;
    langs: Langs[];
}

abstract class BaseScraper {
    protected url: string;
    protected cache: Map<string, any>;
    protected initialized: boolean;

    constructor(url: string) {
        this.url = url;
        this.cache = new Map();
        this.initialized = false;
    }

    abstract initialize(): Promise<void>;
    abstract parseInformations(): Promise<void | SeriesInformation>;
    abstract terminate(): Promise<void>;

    protected getCached<T>(key: string): T | undefined {
        return this.cache.get(key) as T;
    }

    protected setCache<T>(key: string, value: T): void {
        this.cache.set(key, value);
    }

    protected clearCache(): void {
        this.cache.clear();
    }

    protected async fetchWithCache<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttl: number = 3600000 // 1 hour default
    ): Promise<T> {
        const cached = this.getCached<{ data: T; timestamp: number; }>(key);

        if (cached && Date.now() - cached.timestamp < ttl) {
            return cached.data;
        }

        const data = await fetcher();
        this.setCache(key, { data, timestamp: Date.now() });
        return data;
    }
}

class TestScraper extends BaseScraper {
    initialize(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    parseInformations(): Promise<void | any> {
        throw new Error('Method not implemented.');
    }
    terminate(): Promise<void> {
        throw new Error('Method not implemented.');
    }
}

class AniworldScraper extends BaseScraper {
    private imageSRCPrefix: string;

    constructor(url: string) {
        super(url);
        this.imageSRCPrefix = new URL(url).origin;
    }
    async initialize(): Promise<void> {
    }
    async terminate(): Promise<void> {
    }
    async parseInformations(): Promise<SeriesInformation> {
        try {
            const response = await axios.get(this.url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36' },
            });

            const additional = this.parseAdditionalInformations(response.data);

            const { numberOfSeasons, hasMovies } = this.parseEntityInformations(response.data);

            const output: SeriesInformation = { title: additional.infos, url: this.url, informations: additional, hasMovies, seasons: new Array(numberOfSeasons) };

            console.log('Parsed: ');
            console.log(' ' + this.url);
            console.log(`   => Seasons: ${numberOfSeasons} - Movies: ${hasMovies}`);

            if (hasMovies) {
                const movResponse = await axios.get(`${this.url}/filme`);
                output.movies = this.getListInformations(movResponse.data);
                console.log(`    => Got ${output.movies.length} Movies`);
            }

            output.seasons[0] = this.getListInformations(response.data);
            console.log(`    => Got Season ${0} with ${output.seasons[0].length} Episodes`);
            for (let i = 1; i < numberOfSeasons; i++) {
                const seaResponse = await axios.get(`${this.url}/staffel-${i + 1}`);
                output.seasons[i] = this.getListInformations(seaResponse.data);
                console.log(`    => Got Season ${i} with ${output.seasons[i].length} Episodes`);
            }
            return output;
        } catch (error) {
            return null;
        }
    }

    parseEntityInformations(data: string): { numberOfSeasons: number; hasMovies: boolean; } {
        const { document } = new jsdom.JSDOM(data).window;
        const seasonsUl = [...document.querySelectorAll('span')].find((e) => e.textContent.includes('Staffeln:')).parentElement.parentElement;
        const seasonsTab = [...seasonsUl.querySelectorAll('li')].map((e) => e.querySelector('a')?.title).filter((e) => e != undefined);

        const numberOfSeasons = seasonsTab.filter((e) => e.includes('Staffel')).length;
        const hasMovies = seasonsTab.find((e) => e.includes('Film')) != null;

        return {
            numberOfSeasons,
            hasMovies,
        };
    }
    parseAdditionalInformations(data: string): SeriesAdditionalInformation {
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
    getListInformations(data: string): SeriesEntity[] {
        const { document } = new jsdom.JSDOM(data).window;
        const episodes = [...document.querySelectorAll('tr[itemprop="episode"]')];
        const out: SeriesEntity[] = [];
        episodes.forEach((ep) => {
            let langs = [];
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
                    }
                })
                .filter((x) => x != null);

            const mainName = ep.querySelector('.seasonEpisodeTitle strong').textContent;
            const secondName = ep.querySelector('.seasonEpisodeTitle span').textContent;

            if (langs.length > 0) out.push({ mainName, secondName, langs });
        });
        return out;
    }
}

class ZoroScraper extends BaseScraper {
    private debug = true;
    private hostname = 'hianime.to';
    private headers = {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-language': 'en-GB,en;q=0.8',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        priority: 'u=0, i',
        'sec-ch-ua': '"Brave";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'sec-gpc': '1',
        'upgrade-insecure-requests': '1',
    };
    private ID: string;
    constructor(url: string) {
        super(url);
        this.initialized = false;
        this.cache = new Map();
        if (url.includes('/')) {
            this.url = url;
            this.ID = this.url?.split('/')?.pop()?.split('-').pop();
            this.initialized = true;
        } else {
            this.ID = url;
            // this.initialize();
        }
    }
    async initialize() {
        this.debug && console.log('Called Zoro.initialize');

        const list = await this.getEpisodeList();

        this.url = list.episodes[0].url.replace('/watch', '').split('?')[0];
        this.initialized = true;
        console.log('Parsed: ');
        console.log(' ' + this.url);
        await new Promise((res, _) => setTimeout(res, 100));
    }

    terminate(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    async parseInformations(): Promise<void | SeriesInformation> {
        this.debug && console.log('Called Zoro.parseInformations');
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const response = await axios.get(this.url, {
                headers: this.headers,
            });
            const { document } = new jsdom.JSDOM(response.data).window;

            const title = document.querySelector('.film-name.dynamic-name').textContent.trim();

            const imageSrc = document.querySelector<HTMLImageElement>('img.film-poster-img')?.src;

            const tickContainer = document.querySelector('.tick');

            const subCount = tickContainer.querySelector('.tick-item.tick-sub')?.textContent.trim();
            const dubCount = tickContainer.querySelector('.tick-item.tick-dub')?.textContent.trim();
            const episodeCount = tickContainer.querySelector('.tick-item.tick-eps')?.textContent.trim();

            console.log('Information:', {
                subCount,
                dubCount,
                episodeCount,
            });

            const seasonInfo = [...document.querySelectorAll('.os-item')]
                .map((anchor: HTMLAnchorElement) => {
                    return {
                        ID: anchor.href.split('-')[anchor.href.split('-').length - 1] as string,
                        IDX: anchor.querySelector('.title').textContent.trim().replaceAll('Season ', ''),
                        title: anchor.querySelector('.title').textContent.trim() as string,
                    } as SeasonInformation;
                })
                .filter((x) => !x.title.includes('(') && x.title.includes('Season'));

            const seasons: ExtendedZoroEpisode[][] = [];

            if (seasonInfo.length == 0) {
                console.log('Seems like the Season div does not yet exists, assuming the provided ID is the first season');
                seasonInfo.push({
                    ID: this.ID.toString(),
                    IDX: '1',
                    title: 'Season 1',
                });
            }

            for (const si of seasonInfo) {
                console.log('Parsing: ' + si.title);
                let inst = si.ID == this.ID ? this : new ZoroScraper(si.ID);
                const interEps = await inst.getEpisodeList();
                if (dubCount == undefined || (subCount == dubCount && subCount === episodeCount)) {
                    seasons.push(
                        interEps.episodes.map((x) => {
                            return {
                                ...x,
                                langs: ['sub', 'dub'],
                            } as ExtendedZoroEpisode;
                        })
                    );
                } else {
                    seasons.push((await inst.getExtendedEpisodeList(interEps)).episodes);
                }
            }

            // return {
            //     title,
            //     image: imageSrc,
            //     subCount: parseInt(subCount),
            //     dubCount: parseInt(dubCount),
            //     episodeCount: parseInt(episodeCount),
            //     seasons,
            // };

            const transformedSeasons: SeriesEntity[][] = seasons.map(x => x.map(e => {
                return {
                    langs: e.langs.map(l => {
                        switch (l) {
                            case 'sub':
                                return 'EngSub';
                            case 'dub':
                                return 'EngDub';
                            default:
                                return null;
                        }
                    })
                    // filePath: e.url,
                    // primaryName: e.title,
                    // secondaryName: e.number,
                    // season: parseInt(e.number),
                    // episode: parseInt(e.number),
                    // langs: e.langs,
                } as SeriesEntity;
            }));

            return {
                title,
                url: this.url,
                informations: {
                    image: imageSrc,
                },
                hasMovies: false,
                movies: [],
                seasons: transformedSeasons,
            };

        } catch (error) {
            this.debug && console.log(error);

            console.log('Seems like the Season div does not yet exists');

            return null;
        }
    }
    async getSeasons(): Promise<SeasonInformation[]> {
        this.debug && console.log('Called Zoro.getSeasons');
        if (!this.initialized) {
            await this.initialize();
        }
        try {
            const response = await axios.get(this.url, {
                headers: this.headers,
            });
            const { document } = new jsdom.JSDOM(response.data).window;

            const infos = [...document.querySelectorAll('.os-item')]
                .map((anchor: HTMLAnchorElement) => {
                    return {
                        ID: anchor.href.split('-')[anchor.href.split('-').length - 1] as string,
                        IDX: anchor.querySelector('.title').textContent.trim().replaceAll('Season ', ''),
                        title: anchor.querySelector('.title').textContent.trim() as string,
                    };
                })
                .filter((x) => !x.title.includes('(') && x.title.includes('Season'));
            return infos;
        } catch (error) {
            this.debug && console.log(error);

            console.log('Seems like the Season div does not yet exists');

            return [];
        }
    }

    async getEpisodeList(): Promise<{ total: number; episodes: SimpleZoroEpisode[]; }> {
        this.debug && console.log('Called Zoro.getEpisodeList');

        if (this.cache.get('getEpisodeList')) {
            this.debug && console.log('Cache Hit');
            return this.cache.get('getEpisodeList');
        }
        this.debug && console.log('Cache Miss');

        const response = await axios.get(`https://${this.hostname}/ajax/v2/episode/list/${this.ID}`, {
            headers: this.headers,
        });
        const total = response.data.totalItems;
        const { document } = new jsdom.JSDOM(response.data.html).window;

        const episodes = [...document.querySelectorAll('a.ep-item')].map((anchor: HTMLAnchorElement) => {
            return {
                ID: anchor.dataset.id,
                title: anchor.title,
                number: anchor.dataset.number,
                url: `https://${this.hostname}${anchor.href}`,
            };
        });

        const returnObj = {
            total,
            episodes,
        };

        this.cache.set('getEpisodeList', returnObj);

        return returnObj;
    }

    async getExtendedEpisodeList(preData?: {
        total: number;
        episodes: SimpleZoroEpisode[];
    }): Promise<{ total: number; episodes: ExtendedZoroEpisode[]; }> {
        this.debug && console.log('Called Zoro.getExtendedEpisodeList');

        if (!this.initialized) {
            await this.initialize();
        }

        if (this.cache.get('getExtendedEpisodeList')) {
            this.debug && console.log('Cache Hit');
            return this.cache.get('getExtendedEpisodeList');
        }
        this.debug && console.log('Cache Miss');

        let total = 0;
        let episodes: SimpleZoroEpisode[] = [];
        if (!preData) {
            const res = await this.getEpisodeList();
            total = res.total;
            episodes = res.episodes;
        } else {
            total = preData.total;
            episodes = preData.episodes;
        }

        const extendedEpisodes: ExtendedZoroEpisode[] = [];

        let i = 0;
        for (const episode of episodes) {
            i++;
            console.log('Fetching infos for', episode.ID, episode.number, episodes.length, '/', i);

            const outputEpisode = { ...episode } as ExtendedZoroEpisode;
            const response = await axios.get(`https://${this.hostname}/ajax/v2/episode/servers?episodeId=${episode.ID}`, {
                headers: this.headers,
            });
            const { document } = new jsdom.JSDOM(response.data.html).window;
            const streamingServers: StreamingServers[] = [...document.querySelectorAll('div.server-item')].map((server: HTMLAnchorElement) => {
                return {
                    type: server.dataset.type as 'sub' | 'dub',
                    ID: server.dataset.id,
                    serverIndex: server.dataset.serverId,
                    name: server.querySelector('a').text,
                };
            });

            outputEpisode.langs = [...new Set(streamingServers.map((x) => x.type))];
            outputEpisode.streamingServers = streamingServers;
            extendedEpisodes.push(outputEpisode);
        }

        const returnObj = {
            total,
            episodes: extendedEpisodes,
        };

        this.cache.set('getExtendedEpisodeList', returnObj);

        return returnObj;
    }

    async getStream(streamID: string): Promise<string> {
        const response = await axios.get(`https://${this.hostname}/ajax/v2/episode/sources?id=${streamID}`);
        return response.data.link;
    }
}


async function main() {
    const scrapers: BaseScraper[] = [
        // new TestScraper('https://aniworld.to/anime/stream/by-the-grace-of-the-gods'),
        new AniworldScraper('https://aniworld.to/anime/stream/by-the-grace-of-the-gods'),
        new ZoroScraper('631')
    ];

    const aniworld = scrapers[1];
    await aniworld.initialize();
    const info = await aniworld.parseInformations();
    // const episodes = await aniworld.getEpisodeList();
    // await aniworld.terminate();
    console.dir(info, { depth: Infinity });
}
main();