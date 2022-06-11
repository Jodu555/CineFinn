const path = require('path');
const fs = require('fs');


const http = require('http');
const express = require('express');
const https = require('https');
const cors = require('cors');
const morgan = require('morgan');
const { listFiles } = require('../src/utils.js');
const dotenv = require('dotenv').config();

const { exec } = require('child_process');

function execPromise(command) {
    return new Promise(function (resolve, reject) {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout.trim());
        });
    });
}

// const { Database } = require('@jodu555/mysqlapi');
// const database = Database.createDatabase('localhost', 'root', '', 'rt-chat');
// database.connect();
// require('./utils/database')();

const app = express();
app.use(cors());
app.use(morgan('dev'));
// app.use(helmet());
app.use(express.json());

app.use((req, res, next) => {
    if (req.path.includes('/assets/previewImgs')) {
        res.set('Cache-control', `public, max-age=${60 * 5}`)
    }
    next();
})

let server;
if (process.env.https) {
    const sslProperties = {
        key: fs.readFileSync(process.env.KEY_FILE),
        cert: fs.readFileSync(process.env.CERT_FILE),
    };
    server = https.createServer(sslProperties, app)
} else {
    server = http.createServer(app);
}


// Your Middleware handlers here
app.use(express.static(path.join('static')));

app.get("/video", require('../src/video.js'));

app.get('/index', (req, res, next) => {
    res.json(crawlAndIndex());
});

const generateID = () => Math.floor(Math.random() * 1000);

const crawlAndIndex = () => {

    if (fs.existsSync('out.json')) {
        return JSON.parse(fs.readFileSync('out.json', 'utf-8'));
    }

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


    fs.writeFileSync('out.json', JSON.stringify(series, null, 3));

    console.log('Written');

    return series;
}

const filenameParser = (filepath, filename) => {
    // filename exp. Food Wars! Shokugeki no Sōma St#1 Flg#1.mp4
    if (filename.includes('St#') && filename.includes('Flg#')) {
        const [title, rest] = filename.split('St#')
        const [season, rest2] = rest.split(' ');
        const episode = rest2.split('#')[1].split('.')[0];
        // console.log(episode);

        return { movie: false, title: title.trim(), season: Number(season), episode: Number(episode) };
    } else {
        const title = path.basename(path.dirname(path.dirname(filepath)));
        return { movie: true, title, movieTitle: filename }
    }

}

class Series {
    constructor(ID, categorie, title, movies = [], seasons = []) {
        this.ID = ID;
        this.categorie = categorie;
        this.title = title;
        this.seasons = seasons;
        this.movies = movies;
    }
}

const genearteImages = async (series) => {

    const serie = series[6];
    const seasons = serie.seasons.flat();

    const ffmpeg = require('ffmpeg');
    try {

        const s = 'D:\\Allgemein\\Ich\\Hobbys\\Programmieren\\Web Development\\NodeJS\\AniWorldDownloader\\Downloads\\Aniworld\\Food Wars! Shokugeki no Sōma\\Season-2\\Food Wars! Shokugeki no Sōma St#2 Flg#1.mp4';

        const video = await new ffmpeg(s);

        const data = filenameParser(s, path.parse(s).base);
        // console.log(data);
        const output = path.join(process.env.PREVIEW_IMGS_PATH, 'previmgs', String(serie.ID), `${data.season}-${data.episode}`);
        fs.mkdirSync(output, { recursive: true });
        const paths = await video.fnExtractFrameToJPG(output,
            {
                keep_aspect_ratio: true,
                keep_pixel_aspect_ratio: true,
                // size: '120x',
                frame_rate: 1,
                every_n_seconds: 10,
                // file_name: 'preview%d.jpg'
            }
        )

        console.log(paths);
        return;
    } catch (error) {
        console.log(error);
    }

    //     // console.log(seasons);
    //     const output = await Promise.all(seasons.map(s => {

    //         const data = filenameParser(s, path.parse(s).base);
    //         const output = path.join(process.env.PREVIEW_IMGS_PATH, 'previmgs', String(serie.ID), `${data.season}-${data.episode}`);
    //         fs.mkdirSync(output, { recursive: true });
    //         // const command = [
    //         //     'ffmpeg',
    //         //     '-i',
    //         //     s,
    //         //     '-vf',
    //         //     'fps=1/10,scale=120:-1',
    //         //     path.join(output, 'preview%d.jpg')
    //         // ]
    //         // console.log(1337, s.replaceAll(' ', '%20'));
    //         // return;
    //         const command = `ffmpeg -i '${s}' -vf fps=1/10,scale=120:-1 '${path.join(output, 'preview%d.jpg')}'`;
    //         console.log(command);
    //         return execPromise(command);
    //     }));

    //     console.log(output);
}

const PORT = process.env.PORT || 3100;
server.listen(PORT, async () => {
    const series = crawlAndIndex();
    await genearteImages(series);
    console.log(`Express App Listening ${process.env.https ? 'with SSL ' : ''}on ${PORT}`);


    // console.log(
    //     filenameParser('Food Wars! Shokugeki no Sōma St#1 Flg#1.mp4')
    // );

});
