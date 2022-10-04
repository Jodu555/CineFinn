const path = require('path');
class Series {
    constructor(ID, categorie, title, movies = [], seasons = []) {
        this.ID = ID;
        this.categorie = categorie;
        this.title = title;
        // this.externalStreamURL = '';
        this.seasons = seasons;
        this.movies = movies;
    }
}

class Episode {
    constructor(filePath, primaryName, secondaryName, season, episode, langs) {
        this.filePath = filePath;
        this.primaryName = primaryName;
        this.secondaryName = secondaryName;
        this.season = season;
        this.episode = episode;
        this.langs = langs;
    }
}

const cleanupSeriesBeforeFrontResponse = (series) => {
    //To Ensure that every deep object linking is removed
    series = JSON.parse(JSON.stringify(series));
    return series.map(serie => {
        const newSeasons = serie.seasons.map(season => season.map(p => { return { ...p, filePath: path.parse(p.filePath).base } }));
        const newMovies = serie.movies.map(p => path.parse(p).base);
        return {
            ...serie,
            seasons: newSeasons,
            movies: newMovies,
        }
    });
}

const filenameParser = (filepath, filename) => {
    // filename exp. Food Wars! Shokugeki no Sōma St#1 Flg#1.mp4

    const parsers = [
        {
            //v1 Episode Parser
            re: /^(.*)St#(\d+) Flg#(\d+).mp4/ig,
            parse: (match) => {
                const [
                    original,
                    title,
                    season,
                    episode,
                ] = match;
                return { movie: false, title: title.trim(), season: Number(season), episode: Number(episode), language: ['GerDub'] };
            }
        },
        {
            //v2 Episode Parser
            re: /^(.*)St#(\d+) Flg#(\d+)_(GerSub|GerDub).mp4/ig,
            parse: (match) => {
                const [
                    original,
                    title,
                    season,
                    episode,
                    language,
                ] = match;
                return { movie: false, title: title.trim(), season: Number(season), episode: Number(episode), language };
            }
        },
        {
            //v2 Movie Parser
            re: /^(.*)_(GerSub|GerDub)\.mp4/ig,
            parse: (match) => {
                console.log(`match`, match);
                const [
                    original,
                    movieTitle,
                    language,
                ] = match;
                const title = path.basename(path.dirname(path.dirname(filepath)));
                return { movie: true, title, movieTitle, language };
            }
        },
        {
            //v1 Movie Parser
            re: /^(.*)\.mp4/ig,
            parse: (match) => {
                const [
                    original,
                    movieTitle,
                ] = match;
                const title = path.basename(path.dirname(path.dirname(filepath)));
                return { movie: true, title, movieTitle };
            }
        },
    ]

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
    }
    return output;

}

// const filenameParser = (filepath, filename) => {
//     // filename exp. Food Wars! Shokugeki no Sōma St#1 Flg#1.mp4
//     // if (filename.includes('St#') && filename.includes('Flg#')) {
//     //     const [title, rest] = filename.split('St#')
//     //     const [season, rest2] = rest.split(' ');
//     //     const episode = rest2.split('#')[1].split('.')[0];
//     //     // console.log(episode);

//     //     return { movie: false, title: title.trim(), season: Number(season), episode: Number(episode) };
//     // } else {
//     //     const title = path.basename(path.dirname(path.dirname(filepath)));
//     //     return { movie: true, title, movieTitle: filename }
//     // }

//     const re = /^(.*)St#(\d+) Flg#(\d+).mp4/ig;
//     const match = re.exec(filename);
//     if (match != null) {
//         const [
//             original,
//             title,
//             season,
//             episode,
//         ] = match;
//         return { movie: false, title: title.trim(), season: Number(season), episode: Number(episode) };
//     } else {
//         const title = path.basename(path.dirname(path.dirname(filepath)));
//         return { movie: true, title, movieTitle: filename }
//     }

// }

module.exports = {
    Series,
    Episode,
    filenameParser,
    cleanupSeriesBeforeFrontResponse
}