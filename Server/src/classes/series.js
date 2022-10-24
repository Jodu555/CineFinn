const path = require('path');
const { getSeries } = require('../utils/utils');
class Series {
    /**
     * @param  {String} ID
     * @param  {String} categorie
     * @param  {String} title
     * @param  {[Movie]} movies=[]
     * @param  {[[Episode]]} seasons=[]
     */
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
    /**
     * @param  {String} filePath
     * @param  {String} primaryName
     * @param  {String} secondaryName
     * @param  {Number} season
     * @param  {Number} episode
     * @param  {[String]} langs
     */
    constructor(filePath, primaryName, secondaryName, season, episode, langs) {
        this.filePath = filePath;
        this.primaryName = primaryName;
        this.secondaryName = secondaryName;
        this.season = season;
        this.episode = episode;
        this.langs = langs;
    }
}

class Movie {
    /**
     * @param  {String} filePath
     * @param  {String} primaryName
     * @param  {String} secondaryName
     * @param  {[String]} langs
     */
    constructor(filePath, primaryName, secondaryName, langs) {
        this.filePath = filePath;
        this.primaryName = primaryName;
        this.secondaryName = secondaryName;
        this.langs = langs;
    }
}

const cleanupSeriesBeforeFrontResponse = (series) => {
    //To Ensure that every deep object linking is removed
    series = JSON.parse(JSON.stringify(series));
    return series.map(serie => {
        const newSeasons = serie.seasons.map(season => season.map(p => { return { ...p, filePath: path.parse(p.filePath).base } }));
        const newMovies = serie.movies.map(p => { return { ...p, filePath: path.parse(p.filePath).base } });
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
                return { movie: false, title: title.trim(), season: Number(season), episode: Number(episode), language: 'GerDub' };
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
                return { movie: true, title, movieTitle, language: 'GerDub' };
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


/**
 * @param  {String} seriesID the seriesID
 * @param  {Number} season the season 1 based
 * @param  {Number} episode the episode also 1 based
 * @returns {Episode}
 */
function getVideoEntity(seriesID, season, episode) {
    const serie = getSeries().find(x => x.ID == seriesID);
    // Long (Especially when there are 50 seasons with 100 episodes each)
    // const entity = serie.seasons.flat().find(x => x.season == season && x.episode == episode);
    let entity;
    const seasonIndex = serie.seasons.findIndex(x => x[0].season == season);
    entity = serie.seasons[seasonIndex].find(x => x.episode == episode);
    return entity;
}

/**
 * @param  {String} seriesID the seriesID
 * @param  {Number} season the season 1 based
 * @param  {Number} episode the episode also 1 based
 * @returns {Movie}
 */
function getVideoMovie(seriesID, movie) {
    const serie = getSeries().find(x => x.ID == seriesID);
    return serie.movies[movie - 1];
}

module.exports = {
    Series,
    Episode,
    Movie,
    filenameParser,
    cleanupSeriesBeforeFrontResponse,
    getVideoEntity,
    getVideoMovie
}