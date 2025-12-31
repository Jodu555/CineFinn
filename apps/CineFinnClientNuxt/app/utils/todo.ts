import { validateEmail } from './utils';
import type { RefRef, TodoItem, TodoReferences } from '@cinefinn/types/database';
import type { AniWorldEntity, AniWorldSeriesInformations } from '@cinefinn/types/scrapers';
import type { Ref } from 'vue';

export const scrapers = [
    {
        categorie: 'Anime',
        inputValidationRules: [
            (v: string) => /^https?:\/\/aniworld\.to\/anime\/stream\/[a-zA-Z0-9\-]+\/?$/.test(v) || 'URL must be a valid Aniworld URL',
            (v: string) => !v.includes('/filme') || 'URL must be a valid Aniworld URL and cannot be a movie page',
            (v: string) => !v.includes('/staffel') || 'URL must be a valid Aniworld URL and cannot be an episode page',
        ],
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
        categorie: 'Serien',
        inputValidationRules: [
            (v: string) => (/^https?:\/\/sto\.to\/anime\/stream\/[a-zA-Z0-9\-]+\/?$/.test(v) || /^http?:\/\/186\.2\.175\.5\/serie\/stream\/[a-zA-Z0-9\-]+\/?$/.test(v)) || 'URL must be a valid STO URL',
            (v: string) => !v.includes('/filme') || 'URL must be a valid STO URL and cannot be a movie page',
            (v: string) => !v.includes('/staffel') || 'URL must be a valid STO URL and cannot be an episode page',
        ],
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
    //     categorie: 'Anime',
    //     inputValidationRules: [],
    //     referenceKey: 'anix',
    //     scrapeKey: 'anix',
    //     imagePath: ['image'],
    //     seasonsPath: ['seasons'],
    //     episodeCallback: (episode: any) => {
    //         return {
    //             langs: episode.langs.map((l: any) => {
    //                 if (l == 'sub') return 'EngSub';
    //                 if (l == 'dub') return 'EngDub';
    //                 return 'JapDub';
    //             }),
    //         } as any;
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

interface ScraperDefinition {
    categorie: string;
    inputValidationRules: ((v: string) => string | true)[];
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

type LanguageDevision = {
    total: number
    devision: Record<string, number>
}

const cache = new Map<string, LanguageDevision>();

export function languageDevision(element: TodoItem): LanguageDevision {
    if (cache.has(element.ID)) {
        // console.log('Getting from Cache', element.ID);
        return cache.get(element.ID)!;
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
            cbOutput.langs.forEach((l: any) => {
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