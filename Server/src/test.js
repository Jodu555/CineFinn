const fs = require('fs');
const path = require('path');
require('dotenv').config();

// const { Database } = require('@jodu555/mysqlapi');
// const database = Database.createDatabase(process.env.DB_HOST, process.env.DB_USERNAME, process.env.DB_PASSWORD, process.env.DB_DATABASE);
// database.connect();

// require('./utils/database')();

// require('./utils/watchString');



const filenameParser = (filepath, filename) => {
    // filename exp. Food Wars! Shokugeki no Sōma St#1 Flg#1.mp4

    const parsers = [
        {
            //v1 Episode Parser
            re: /^(.*)St#(\d+) Flg#(\d+).mp4/ig,
            parse: (match) => {
                console.log('456');
                const [
                    original,
                    title,
                    season,
                    episode,
                ] = match;
                return { movie: false, title: title.trim(), season: Number(season), episode: Number(episode) };
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




// console.log(filenameParser('', 'Food Wars! Shokugeki no Sōma St#1 Flg#1.mp4'));
// console.log(filenameParser('', 'Food Wars! Shokugeki no Sōma St#1 Flg#1_GerDub.mp4'));
// console.log(filenameParser('', 'Games und Rivalen.mp4'));
// console.log(filenameParser('', 'Games und Rivalen_GerDub.mp4'));

const series = JSON.parse(fs.readFileSync(process.env.LOCAL_DB_FILE, 'utf8'));

const seriesID = 1811;

getVideoEntity(seriesID, 1, 5);

function getVideoEntity(seriesID, season, episode) {
    const serie = series.find(x => x.ID == seriesID);

    console.log(serie);

    const entity = serie.seasons.flat().find(x => x.season == season && x.episode == episode);

    console.log(entity);

};

// series[0].seasons[0].forEach(obj => {
//     // console.log(obj);
//     const base = path.parse(obj.filePath).base;
//     const output = filenameParser(base, obj.filePath);

//     console.log(base, output);
// })

