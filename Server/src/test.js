const fs = require('fs');
const { default: getVideoDurationInSeconds } = require('get-video-duration');
const path = require('path');
require('dotenv').config();
const { getVideoEntity } = require('./classes/series');
const { generateImages } = require('./utils/images');
const { promiseAllLimit } = require('./utils/utils');

// const { Database } = require('@jodu555/mysqlapi');
// const database = Database.createDatabase(process.env.DB_HOST, process.env.DB_USERNAME, process.env.DB_PASSWORD, process.env.DB_DATABASE);
// database.connect();

// require('./utils/database')();

const { parse, Segment } = require('./utils/watchString');

const watchStr = '7830:1-1.1047;7830:1-2.0;5724:1-2.0;5724:1-1.0;6759:2-1.1469;6759:2-2.1504;6759:2-3.1506;6759:2-4.1446;3839:1-1.0;3531:1-1.0;4020:1-1.0;6759:2-5.1442;6759:2-6.1502;6759:2-7.1500;6759:2-8.1387;6759:2-9.1470;6759:2-10.1502;6759:2-11.1498;6759:2-12.1504;5724:1-7.1331;5724:1-8.364;5724:1-9.1427;5724:1-10.1348;5724:1-11.1367;5724:1-12.1226;3773:1-1.276;2981:1-1.26;2981:2-1.1;2981:2-11.1324;2981:2-4.1333;2981:2-6.1255;2981:3-1.2;2981:3-12.701;2981:1-20.959;2981:2-9.934;2981:3-5.241;2432:1-1.0;2432:1-8.1441;2432:1-7.1441;2432:1-9.1411;2432:1-10.1205;2432:1-11.950;2432:1-12.1441;2432:2-1.1421;1030:1-1.1537;2432:2-2.1418;2432:2-3.1359;2432:2-4.1374;2432:2-5.1408;2432:2-6.1421;2432:2-7.1421;2432:2-8.35;2432:2-9.1341;2432:2-10.1346;2432:2-11.1410;2432:1-2.0;2432:1-3.3;2432:1-4.0;2432:2-12.1401;5345:2-12.0;5345:2-1.0;5345:2-24.133;2491:1-1.0;5724:1-13.1413;2432:2-13.1421;8007:1-1.0;8007:2-1.0;8007:3-1.0;8007:4-1.0;8007:5-1.0;6693:1-1.0;582:1-1.188;4222:2-1.0;4222:1-1.0;4222:3-1.0;1030:1-2.1361;1030:1-3.1204;1030:1-4.1535;1030:1-5.1346;1079:2-12.0;1079:1-1.0;8349:1-1.0;1063:1.0;1063:2.0;1063:3.0;1063:1-1.0;4020:2.0;4020:1.0;4083:1.0;4083:1-1.0;1030:1-6.1462;1030:1-7.1361;1030:1-8.1383;1030:1-9.1433;1030:1-10.1697;';



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


function new_parse(str) {
    const re = /(\d+):(?:(\d+)-(\d+)|(\d+))\.(\d+);/gmi;

    const list = [];

    // const str = '2491:1-1.570;2491:1-2.5555;2491:1.0;';
    var outp;
    while ((outp = re.exec(str)) !== null) {
        // console.log(outp);
        let isMovie = false;
        const [
            og,
            ID,
            se = -1,
            ep = -1,
            movie = -1,
            time
        ] = outp;
        list.push(new Segment(ID, se, ep, movie, time))
        // console.log({
        //     ID,
        //     isMovie: movie != undefined,
        //     se,
        //     ep,
        //     movie,
        //     time
        // });
    }
    return list;
}

// console.log(parse(watchStr));

// console.log(new_parse(watchStr));


// console.log(JSON.stringify(parse(watchStr)) == JSON.stringify(new_parse(watchStr)));


const series = JSON.parse(fs.readFileSync(process.env.LOCAL_DB_FILE, 'utf8'));

const wait = ms => new Promise((rs, _) => setTimeout(_ => { console.log('Run'); rs(); }, ms));


(async () => {

    // const limit = await promiseAllLimit(5);

    // // const limit = pLimit(10);
    // const arr = Array.from({
    //     length: 100
    // }, () => {
    //     return limit(() => wait(5000));
    // });

    // await Promise.all(arr);

    // console.log(`arr`, arr);

    const serie = series.find(s => s.title == 'The Irregular at Magic High School');

    console.log(serie);

    generateImages([serie]);

    return;
    const newSeries = await Promise.all(series.map(serie => {
        return new Promise(async (resolve, _) => {
            const newSeasons = await Promise.all(serie.seasons.map(async season => {
                return await Promise.all(season.map(e => {
                    return new Promise(async (resolve, _) => {
                        const duration = await getVideoDurationInSeconds(e.filePath);
                        console.log('got', e.primaryName, duration);
                        resolve({ ...e, duration })
                    })
                }));
            }));
            resolve({ ...serie, seasons: newSeasons });
        })
    }));
    fs.writeFileSync('new-time.json', JSON.stringify(newSeries, null, 3))

    // console.log(JSON.stringify(newSeries, null, 3));

})();


// getVideoEntity(seriesID, 2, 5);


