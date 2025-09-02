import type { DatabaseParsedTodoItem, TodoReferences } from '@Types/database';
import type { AniWorldEntity, AnixEpisode, ExtendedZoroEpisode, MyAsianEpisode, SimpleZoroEpisode } from '@Types/scrapers';
import type { Ref } from 'vue';
import { useBaseURL } from '.';

export interface TodoItem extends DatabaseParsedTodoItem {
    edited?: boolean;
}

export const scrapers = [
    {
        referenceKey: 'aniworld',
        scrapeKey: 'scraped',
        imagePath: ['informations', 'image'],
        seasonsPath: ['seasons'],
        episodeCallback: (episode: AniWorldEntity) => {
            return {
                langs: episode.langs,
            };
        },
    },
    {
        referenceKey: 'zoro',
        scrapeKey: 'scrapednewZoro',
        imagePath: ['image'],
        seasonsPath: ['seasons'],
        episodeCallback: (episode: ExtendedZoroEpisode) => {
            return {
                langs: episode.langs.map((l) => {
                    if (l == 'sub') return 'EngSub';
                    if (l == 'dub') return 'EngDub';
                    if (l == 'raw') return 'JapDub';
                    return 'JapDub';
                }),
            };
        },
    },
    {
        referenceKey: 'zoro',
        scrapeKey: 'scrapedZoro',
        imagePath: ['image'],
        seasonsPath: ['episodes'],
        episodeCallback: (episode: ExtendedZoroEpisode) => {
            return {
                langs: episode.langs.map((l) => {
                    if (l == 'sub') return 'EngSub';
                    if (l == 'dub') return 'EngDub';
                    if (l == 'raw') return 'JapDub';
                    return 'JapDub';
                }),
            };
        },
    },
    {
        referenceKey: 'anix',
        scrapeKey: 'scrapedAnix',
        imagePath: ['image'],
        seasonsPath: ['seasons'],
        episodeCallback: (episode: AnixEpisode) => {
            return {
                langs: episode.langs.map(l => {
                    if (l == 'sub') return 'EngSub';
                    if (l == 'dub') return 'EngDub';
                    return 'JapDub';
                }),
            };
        },
    },
    {
        referenceKey: 'sto',
        scrapeKey: 'scraped',
        imagePath: ['informations', 'image'],
        // seasonsPath: ['seasons'],
        // episodeCallback: (episode: AniWorldEntity) => {
        //     return {
        //         langs: episode.langs,
        //     };
        // },
    },
    {
        referenceKey: 'myasiantv',
        scrapeKey: 'scrapedMyasiantv',
        imagePath: ['informations', 'image'],
        seasonsPath: ['episodes'],
        episodeCallback: (episode: MyAsianEpisode) => {
            return {
                langs: episode.langs.map(l => {
                    if (l == 'Subtitle') {
                        return 'EngSubK';
                    } else {
                        return 'RawK';
                    }
                })
            };
        },
    },
] satisfies ScraperDefinition[];

interface ScraperDefinition {
    referenceKey: keyof TodoReferences;
    scrapeKey: keyof TodoItem;
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
        const scrapeInfo = element[scraper.scrapeKey] as any;
        // console.log(element, scraper.scrapeKey, scrapeInfo);
        if (scrapeInfo != undefined && scrapeInfo !== true) {
            const img = lookDeep(scrapeInfo, scraper.imagePath);
            // console.log(img);
            if (img && typeof img == 'string') {
                console.log(new URL(img).protocol);
                if (new URL(img).protocol == 'http:') {
                    // return `${useBaseURL()}/imageRewriteSSL?auth-token=${}&url=${encodeURIComponent(img)}`;
                    return `${useBaseURL()}/imageRewriteSSL?url=${encodeURIComponent(img)}`;
                }

                return img;
            }
        }
    }
    return '';
    // if (
    // 	element.scraped != undefined &&
    // 	element.scraped !== true &&
    // 	element.scraped.informations.image &&
    // 	typeof element.scraped.informations.image == 'string'
    // ) {
    // 	return element.scraped.informations.image;
    // }
    // if (
    // 	element.scrapednewZoro != undefined &&
    // 	element.scrapednewZoro !== true &&
    // 	element.scrapednewZoro.image &&
    // 	typeof element.scrapednewZoro.image == 'string'
    // ) {
    // 	return element.scrapednewZoro.image;
    // }

    // if (element.scrapedAnix != undefined && element.scrapedAnix !== true && element.scrapedAnix.image && typeof element.scrapedAnix.image == 'string') {
    // 	return element.scrapedAnix.image;
    // }

    // if (
    // 	element.scrapedMyasiantv != undefined &&
    // 	element.scrapedMyasiantv !== true &&
    // 	element.scrapedMyasiantv.informations.image &&
    // 	typeof element.scrapedMyasiantv.informations.image == 'string'
    // ) {
    // 	return element.scrapedMyasiantv.informations.image;
    // }

    // return '';
}

const cache = new Map<string, any>();

export function languageDevision(element: TodoItem) {
    if (cache.has(element.ID)) {
        // console.log('Getting from Cache', element.ID);
        return cache.get(element.ID);
    } else {
        const newDevision = newLanguageDevision(element);
        const oldDevision = oldLanguageDevision(element);

        if (JSON.stringify(newDevision.devision) !== JSON.stringify(oldDevision.devision)) {
            console.log('Mismatch', element.ID, newDevision.devision, oldDevision.devision, newDevision.total, oldDevision.total);
        }

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
        const scrapeInfo = element[scraper.scrapeKey] as any;
        if (scrapeInfo == undefined || scrapeInfo === true || scraper.seasonsPath == undefined || scraper.episodeCallback == undefined)
            continue;
        const episodes = lookDeep(scrapeInfo, scraper.seasonsPath);
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

function oldLanguageDevision(element: TodoItem) {
    const out: Record<string, number> = {};
    let total = -1;

    const setOrIncrement = (lang: string) => {
        if (!out[lang]) {
            out[lang] = 1;
        } else {
            out[lang] += 1;
        }
    };
    if (element.scraped != undefined && element.scraped !== true) {
        total = element.scraped.seasons.flat().length;
        element.scraped.seasons.flat().forEach((x) => x.langs.forEach((l) => setOrIncrement(l)));
    }
    if (element.scrapedZoro != undefined && element.scrapedZoro !== true) {
        if (total == -1) total = element.scrapedZoro.episodes.length;
        const zoroEps = element.scrapedZoro?.episodes;
        zoroEps.forEach((e) => {
            e.langs.forEach((l) => {
                if (l == 'sub') l = 'EngSub';
                if (l == 'dub') l = 'EngDub';
                setOrIncrement(l);
            });
        });
    }
    if (element.scrapednewZoro != undefined && element.scrapednewZoro !== true) {
        if (total == -1) total = element.scrapednewZoro?.seasons.flat().length;
        const zoroEps = element.scrapednewZoro?.seasons.flat();
        zoroEps.forEach((e) => {
            e.langs.forEach((l) => {
                if (l == 'sub') l = 'EngSub';
                if (l == 'dub') l = 'EngDub';
                if (l == 'raw') l = 'JapDub';
                setOrIncrement(l);
            });
        });
    }
    if (element.scrapedAnix != undefined && element.scrapedAnix !== true) {
        if (total == -1) total = element.scrapedAnix?.seasons.flat().length;
        const anixEps = element.scrapedAnix?.seasons.flat();
        anixEps.forEach((e) => {
            e.langs.forEach((l) => {
                if (l == 'sub') l = 'EngSub';
                if (l == 'dub') l = 'EngDub';
                setOrIncrement(l);
            });
        });
    }
    if (element.scrapedMyasiantv != undefined && element.scrapedMyasiantv !== true) {
        total = element.scrapedMyasiantv.episodes.length;
        element.scrapedMyasiantv.episodes.forEach((ep) => {
            ep.langs.forEach((l) => {
                if (l == 'Subtitle') {
                    setOrIncrement('EngSubK');
                } else {
                    setOrIncrement('RawK');
                }
            });
        });
    }

    for (const [key, value] of Object.entries(out)) {
        // if (element.ID == '29062') {
        //     console.log('OLD', element.ID, { key, value, total, eq: (value / total) * 100 });
        // }
        out[key] = Math.min(100, parseFloat(parseFloat(String((value / total) * 100)).toFixed(2)));
    }

    if (out['GerDub'] == 100) {
        delete out['GerSub'];
        delete out['EngSub'];
    } else if (out['GerSub'] == 100 && out['EngSub']) {
        delete out['EngSub'];
    }

    // console.log(out);
    // if (element.ID == '833746' || element.ID == '135947') {
    //     console.log('OLD', element.ID, out, total);
    // }

    return { total, devision: out };
}