const path = require('path');
const { listFiles } = require('./fileutils');

const generateID = () => Math.floor(Math.random() * 10000);

const crawlAndIndex = () => {
    const { Series, filenameParser, Episode } = require('../classes/series');

    const overcategories = ['Aniworld', 'STO'];
    const obj = {};

    let { dirs, files } = listFiles(process.env.VIDEO_PATH);

    //Strip all non mp4 files from the files
    files = files.filter(f => path.parse(f).ext == '.mp4');

    //Sort dirs into the overcategories into the object
    let sortIdx = -1;
    dirs.forEach(dir => {
        if (overcategories.includes(dir)) {
            sortIdx == -1 ? sortIdx = 0 : sortIdx++;
        } else {
            obj[overcategories[sortIdx]] == undefined ? obj[overcategories[sortIdx]] = [dir] : obj[overcategories[sortIdx]].push(dir);
        }
    });

    // Strip the dirs down and seperate between season or movie dirs or series dirs
    const series = [];


    Object.keys(obj).forEach(categorie => {
        const dirs = obj[categorie]
        for (let i = 0; i < dirs.length;) {
            const title = dirs[i];
            const seasons = [];
            const movies = []
            i++;
            while (dirs[i] != undefined && (dirs[i].includes('Season-') || dirs[i].includes('Movies'))) {
                // dirs[i].includes('Season-') ? seasons.push(dirs[i]) : movies.push(dirs[i]);
                i++;
            }
            series.push(new Series(generateID(), categorie, title, movies, seasons));
        }
    });

    files.forEach(e => {
        const base = path.parse(e).base;
        const parsedData = filenameParser(e, base);

        const item = series.find(x => x.title.includes(parsedData.title));
        if (parsedData.movie == true) {
            item.movies.push(e)
        } else {
            //TODO: Manage here multiple files with different languages
            const episode = new Episode(e, parsedData.title, '', parsedData.season, parsedData.episode, [parsedData.language]);
            // const episode = new Episode(e, parsedData.title, '', parsedData.season, parsedData.episode, ['GerDub']);
            if (Array.isArray(item.seasons[parsedData.season - 1])) {
                item.seasons[parsedData.season - 1].push(episode);
            } else {
                item.seasons[parsedData.season - 1] = [episode];
            }
        }
    });

    const sorterFunction = (a, b) => {
        // const ap = filenameParser(a, path.parse(a).base);
        // const bp = filenameParser(b, path.parse(b).base);
        return a.episode - b.episode;
    }

    series.forEach(e => e.seasons.forEach(x => x.sort(sorterFunction)));

    return series;
}

const mergeSeriesArrays = (before, after) => {
    return before;
    const output = [];

    //Compare and overwrite ids
    before.forEach(beforeSerie => {
        const afterSerie = after.find(as => as.title == beforeSerie.title && as.categorie == beforeSerie.categorie)
        if (afterSerie) {
            // console.log('Found Overlapping', beforeSerie.title, afterSerie.title, beforeSerie.ID, afterSerie.ID);
            output.push(new Series(beforeSerie.ID, beforeSerie.categorie, beforeSerie.title, afterSerie.movies, afterSerie.seasons));
        }
    });

    //Add the non existent series and watch for ID overlaps
    after.forEach(afterSerie => {
        const beforeSerie = before.find(bs => afterSerie.title == bs.title)
        if (!beforeSerie) {
            const overlapID = before.find(bs => bs.ID == afterSerie.ID)
            const newID = overlapID ? generateID() : afterSerie.ID
            output.push(new Series(newID, afterSerie.categorie, afterSerie.title, afterSerie.movies, afterSerie.seasons));
        }
    });

    return output;
}

module.exports = { crawlAndIndex, mergeSeriesArrays }