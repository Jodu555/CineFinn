
import path from 'path';

export type Langs = 'GerDub' | 'GerSub' | 'GerSubK' | 'GerSubC' | 'EngDub' | 'EngSub' | 'EngSubK' | 'EngSubC' | 'JapDub';

// export interface ParsedInformation {
//     movie: boolean;
//     title: string;
//     language: Langs;
//     season?: number;
//     episode?: number;
//     movieTitle?: string;
// }

export type ParsedInformation = ParsedMInformation | ParsedEInformation;

interface ParsedMInformation {
    movie: true;
    title: string;
    language: Langs;
    movieTitle: string;
}

interface ParsedEInformation {
    movie: false;
    title: string;
    language: Langs;
    season: number;
    episode: number;
}

type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

export const filenameParser = (filepath: string, filename: string): Prettify<ParsedInformation | never> => {
    // filename exp. Food Wars! Shokugeki no Sōma St#1 Flg#1.mp4

    interface pars {
        re: RegExp;
        parse: (match: RegExpExecArray) => ParsedInformation;
    }

    const parsers: pars[] = [
        {
            //v1 Episode Parser
            re: /^(.*)St#(\d+) Flg#(\d+).mp4/gi,
            parse: (match) => {
                const [original, title, season, episode] = match;
                return { movie: false, title: title.trim(), season: Number(season), episode: Number(episode), language: 'GerDub' } as ParsedInformation;
            },
        },
        {
            //v2 Episode Parser
            re: /^(.*)St#(\d+) Flg#(\d+)_(GerSub|GerDub|EngDub|EngSub|JapDub|EngSubK|GerSubK|GerSubC|EngSubC)\.mp4/gi,
            parse: (match) => {
                const [original, title, season, episode, language] = match;
                return { movie: false, title: title.trim(), season: Number(season), episode: Number(episode), language } as ParsedInformation;
            },
        },
        {
            //v2 Movie Parser
            re: /^(.*)_(GerSub|GerDub|EngDub|EngSub|JapDub|EngSubK|GerSubK|GerSubC|EngSubC)\.mp4/gi,
            parse: (match) => {
                // console.log(`match`, match);
                const [original, movieTitle, language] = match;
                const title = path.basename(path.dirname(path.dirname(filepath)));
                return { movie: true, title, movieTitle, language } as ParsedInformation;
            },
        },
        {
            //v1 Movie Parser
            re: /^(.*)\.mp4/gi,
            parse: (match) => {
                const [original, movieTitle] = match;
                const title = path.basename(path.dirname(path.dirname(filepath)));
                return { movie: true, title, movieTitle, language: 'GerDub' } as ParsedInformation;
            },
        },
    ];

    let found = false;
    let output = {};
    for (const parser of parsers) {
        const match = parser.re.exec(filename);
        // console.log(parser.re, match);
        if (match != null) {
            found = true;
            output = parser.parse(match);
            break;
        }
    }
    if (!found) {
        console.log('No Parser found for', found, filename);
        throw new Error(['No Parser found for', found, filename].join(' '));
    }
    return output as ParsedInformation;
};