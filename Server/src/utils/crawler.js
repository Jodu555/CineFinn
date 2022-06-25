const path = require('path');
const { Series, filenameParser } = require("../classes/series");
const { listFiles } = require("./fileutils");

const generateID = () => Math.floor(Math.random() * 1000);

const crawlAndIndex = () => {

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


    // Fill the series array with its corresponding seasons and episodes
    files.forEach(e => {
        const base = path.parse(e).base;
        const parsedData = filenameParser(e, base);

        const item = series.find(x => x.title.includes(parsedData.title));
        if (parsedData.movie == true) {
            item.movies.push(e)
        } else {
            if (Array.isArray(item.seasons[parsedData.season - 1])) {
                item.seasons[parsedData.season - 1].push(e);
            } else {
                item.seasons[parsedData.season - 1] = [e]
            }
        }
    });


    // Sorts the episodes in the right order
    const sorterFunction = (a, b) => {
        const ap = filenameParser(a, path.parse(a).base);
        const bp = filenameParser(b, path.parse(b).base);
        return ap.episode - bp.episode;
    }
    series.forEach(e => e.seasons.forEach(x => x.sort(sorterFunction)));



    return series;
}

module.exports = { crawlAndIndex }