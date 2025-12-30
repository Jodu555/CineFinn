import type { AniWorldEntity, AniWorldSeriesInformations } from '@cinefinn/types/scrapers';
import type { Ref } from 'vue';

export const scrapers = [
    {
        referenceKey: 'aniworld',
        scrapeKey: 'aniworld',
        imagePath: ['informations', 'image'],
        seasonsPath: ['seasons'],
        episodeCallback: (episode: AniWorldEntity) => {
            return {
                langs: episode.langs,
            };
        },
    },
    {
        referenceKey: 'sto',
        scrapeKey: 'sto',
        imagePath: ['informations', 'image'],
        // seasonsPath: ['seasons'],
        // episodeCallback: (episode: AniWorldEntity) => {
        //     return {
        //         langs: episode.langs,
        //     };
        // },
    },
    // {
    //     referenceKey: 'zoro',
    //     scrapeKey: 'scrapednewZoro',
    //     imagePath: ['image'],
    //     seasonsPath: ['seasons'],
    //     episodeCallback: (episode: ExtendedZoroEpisode) => {
    //         return {
    //             langs: episode.langs.map((l) => {
    //                 if (l == 'sub') return 'EngSub';
    //                 if (l == 'dub') return 'EngDub';
    //                 if (l == 'raw') return 'JapDub';
    //                 return 'JapDub';
    //             }),
    //         };
    //     },
    // },
    // {
    //     referenceKey: 'zoro',
    //     scrapeKey: 'scrapedZoro',
    //     imagePath: ['image'],
    //     seasonsPath: ['episodes'],
    //     episodeCallback: (episode: ExtendedZoroEpisode) => {
    //         return {
    //             langs: episode.langs.map((l) => {
    //                 if (l == 'sub') return 'EngSub';
    //                 if (l == 'dub') return 'EngDub';
    //                 if (l == 'raw') return 'JapDub';
    //                 return 'JapDub';
    //             }),
    //         };
    //     },
    // },
    // {
    //     referenceKey: 'anix',
    //     scrapeKey: 'scrapedAnix',
    //     imagePath: ['image'],
    //     seasonsPath: ['seasons'],
    //     episodeCallback: (episode: AnixEpisode) => {
    //         return {
    //             langs: episode.langs.map(l => {
    //                 if (l == 'sub') return 'EngSub';
    //                 if (l == 'dub') return 'EngDub';
    //                 return 'JapDub';
    //             }),
    //         };
    //     },
    // },
    // {
    //     referenceKey: 'myasiantv',
    //     scrapeKey: 'scrapedMyasiantv',
    //     imagePath: ['informations', 'image'],
    //     seasonsPath: ['episodes'],
    //     episodeCallback: (episode: MyAsianEpisode) => {
    //         return {
    //             langs: episode.langs.map(l => {
    //                 if (l == 'Subtitle') {
    //                     return 'EngSubK';
    //                 } else {
    //                     return 'RawK';
    //                 }
    //             })
    //         };
    //     },
    // },
] satisfies ScraperDefinition[];

export type TodoReferences = Record<keyof RefRef, string>;

export type RefRef = {
    'aniworld': undefined | AniWorldSeriesInformations;
    'sto': undefined | AniWorldSeriesInformations;
};

export interface TodoItem {
    ID: string;
    order: number;
    name: string;
    creator?: string;
    categorie: 'Aniworld' | 'STO' | 'KDrama';
    references: TodoReferences;
    scrapingInfo?: {
        [key in keyof Partial<TodoReferences>]: {
            key: key;
            message: string;
            state: 'loading' | 'success' | 'error';
            scrapedAt: number;
            data: RefRef[key];
        };
    };
    edited?: boolean;
}

const item = {
    ID: '1',
    order: 1,
    name: 'John',
    categorie: 'Aniworld',
    creator: '1',
    references: {
        aniworld: 'https://aniworld.to/anime/1',
        sto: 'https://sto.to/anime/1',
    },
    scrapingInfo: {
        aniworld: {
            key: 'aniworld',
            message: 'Loading...',
            state: 'loading',
            scrapedAt: 0,
            data: {
                url: '',
                informations: {
                    infos: '',
                    startDate: '',
                    endDate: '',
                    description: '',
                    image: ''
                },
                hasMovies: false,
                seasons: []
            },
        },
    },
    edited: false,
} satisfies TodoItem;


interface ScraperDefinition {
    referenceKey: keyof TodoReferences;
    scrapeKey: keyof RefRef;
    imagePath: string[];
    seasonsPath?: string[];
    episodeCallback?: (episode: any) => { langs: string[]; };
}

function lookDeep(obj: any, keys: string[]) {
    let current = obj;
    for (const key of keys) {
        if (current[key] === undefined) {
            return undefined;
        }
        current = current[key];
    }
    return current;
}

export function decideImageURL(minimal: boolean, element: TodoItem) {
    if (minimal) return '';

    for (const scraper of scrapers) {
        const scrapeInfo = element.scrapingInfo?.[scraper.scrapeKey];
        // console.log(element, scraper.scrapeKey, scrapeInfo);
        if (scrapeInfo != undefined && scrapeInfo.state === 'success') {
            const img = lookDeep(scrapeInfo.data, scraper.imagePath);
            // console.log(img);
            if (img && typeof img == 'string') {
                console.log(new URL(img).protocol);
                // if (new URL(img).protocol == 'http:') {
                // return `${useBaseURL()}/imageRewriteSSL?auth-token=${}&url=${encodeURIComponent(img)}`;
                // return `${useBaseURL()}/imageRewriteSSL?url=${encodeURIComponent(img)}`;
                // }

                return img;
            }
        }
    }
    return '';
}

const cache = new Map<string, any>();

export function languageDevision(element: TodoItem) {
    if (cache.has(element.ID)) {
        // console.log('Getting from Cache', element.ID);
        return cache.get(element.ID);
    } else {
        const newDevision = newLanguageDevision(element);
        // const oldDevision = oldLanguageDevision(element);

        // if (JSON.stringify(newDevision.devision) !== JSON.stringify(oldDevision.devision)) {
        //     console.log('Mismatch', element.ID, newDevision.devision, oldDevision.devision, newDevision.total, oldDevision.total);
        // }

        // const out = { total: oldDevision.total, devision: oldDevision.devision };
        const out = { total: newDevision.total, devision: newDevision.devision };
        // cache.set(element.ID, out);
        return out;
    }


};

function newLanguageDevision(element: TodoItem) {

    const out: Record<string, number> = {};
    let total = -1;

    const setOrIncrement = (lang: string) => {
        if (!out[lang]) {
            out[lang] = 1;
        } else {
            out[lang] += 1;
        }
    };

    for (const scraper of scrapers) {
        const scrapeInfo = element.scrapingInfo?.[scraper.scrapeKey];
        if (scrapeInfo == undefined || scrapeInfo.state === 'loading' || scrapeInfo.state === 'error' || scraper.seasonsPath == undefined || scraper.episodeCallback == undefined)
            continue;
        const episodes = lookDeep(scrapeInfo.data, scraper.seasonsPath);
        // if (element.ID == '29062') {
        //     console.log('LOG', element, scraper, scraper.referenceKey, episodes);
        //     console.log(scraper.seasonsPath, scrapeInfo);
        // }
        if (episodes == undefined) {
            console.log('Early Exit', element.ID, scraper.scrapeKey, scraper.seasonsPath);
            continue;
        }
        if (total == -1) {
            total = episodes.flat().length;
        }

        episodes.flat().forEach((episode: any) => {
            const cbOutput = scraper.episodeCallback(episode);
            cbOutput.langs.forEach((l) => {
                setOrIncrement(l);
            });
        });
    }

    for (const [key, value] of Object.entries(out)) {
        // if (element.ID == '29062') {
        //     console.log(element.ID, { key, value: value, total, eq: (value / total) * 100 });
        // }
        out[key] = Math.min(100, parseFloat(parseFloat(String((value / total) * 100)).toFixed(2)));
    }

    if (out['GerDub'] == 100) {
        delete out['GerSub'];
        delete out['EngSub'];
    } else if (out['GerSub'] == 100 && out['EngSub']) {
        delete out['EngSub'];
    }

    // if (element.ID == '833746' || element.ID == '135947') {
    //     console.log(element.ID, out, total);
    // }

    return { total, devision: out };
}