const path = require('path');
const fs = require('fs');


const http = require('http');
const express = require('express');
const https = require('https');
const cors = require('cors');
const morgan = require('morgan');
const { listFiles } = require('../src/utils.js');
const dotenv = require('dotenv').config();

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
    const items = [];
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
            items.push(new Item(null, categorie, title, movies, seasons));
        }
    });


    // Fill the items array with its corresponding seasons and episodes
    files.forEach(e => {
        const base = path.parse(e).base;
        const parsedData = filenameParser(e, base);

        const item = items.find(x => x.title.includes(parsedData.title));
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



    fs.writeFileSync('out.json', JSON.stringify(items, null, 3));

    console.log('Written');

    return items;
}

const filenameParser = (filepath, filename) => {
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
    // Food Wars! Shokugeki no Sōma St#1 Flg#1.mp4

}

class Item {
    constructor(ID, categorie, title, movies = [], seasons = []) {
        this.ID = ID;
        this.categorie = categorie;
        this.title = title;
        this.seasons = seasons;
        this.movies = movies;
    }
}

const PORT = process.env.PORT || 3100;
server.listen(PORT, () => {
    console.log(`Express App Listening ${process.env.https ? 'with SSL ' : ''}on ${PORT}`);

    const arr = [
        'hello1',
        'hello2',
        'hello3',
        'hello4',
        'hello5',
        'hello6',
        'hello7',
        'hello8',
        'hello9',
        'hello10',
        'hello11'
    ]

    // console.log(arr.sort());

    // crawlAndIndex();
    // console.log(
    //     filenameParser('Food Wars! Shokugeki no Sōma St#1 Flg#1.mp4')
    // );

});
