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

const cleanupSeriesBeforeFrontResponse = (series) => {
    //To Ensure that every deep object linking is removed
    series = JSON.parse(JSON.stringify(series));
    return series.map(serie => {
        const newSeasons = serie.seasons.map(season => season.map(p => path.parse(p).base));
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
    // if (filename.includes('St#') && filename.includes('Flg#')) {
    //     const [title, rest] = filename.split('St#')
    //     const [season, rest2] = rest.split(' ');
    //     const episode = rest2.split('#')[1].split('.')[0];
    //     // console.log(episode);

    //     return { movie: false, title: title.trim(), season: Number(season), episode: Number(episode) };
    // } else {
    //     const title = path.basename(path.dirname(path.dirname(filepath)));
    //     return { movie: true, title, movieTitle: filename }
    // }

    const re = /^(.*)St#(\d+) Flg#(\d+).mp4/ig;
    const match = re.exec(filename);
    if (match != null) {
        const [
            original,
            title,
            season,
            episode,
        ] = match
        return { movie: false, title: title.trim(), season: Number(season), episode: Number(episode) };
    } else {
        const title = path.basename(path.dirname(path.dirname(filepath)));
        return { movie: true, title, movieTitle: filename }
    }

}

module.exports = {
    Series,
    filenameParser,
    cleanupSeriesBeforeFrontResponse
}