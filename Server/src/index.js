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
    const { dirs, files } = listFiles(process.env.VIDEO_PATH);

    const overcategories = ['Aniworld', 'STO'];

    const obj = {};

    let sortIdx = -1;
    dirs.forEach(dir => {
        if (overcategories.includes(dir)) {
            sortIdx == -1 ? sortIdx = 0 : sortIdx++;
        } else {
            obj[overcategories[sortIdx]] == undefined ? obj[overcategories[sortIdx]] = [dir] : obj[overcategories[sortIdx]].push(dir);
        }
    });

    const items = [];
    Object.keys(obj).forEach(categorie => {
        const dirs = obj[categorie]
        for (let i = 0; i < dirs.length;) {
            const title = dirs[i];
            const seasons = [];
            const movies = []
            i++;
            while (dirs[i] != undefined && (dirs[i].includes('Season-') || dirs[i].includes('Movies'))) {
                dirs[i].includes('Season-') ? seasons.push(dirs[i]) : movies.push(dirs[i]);
                i++;
            }
            items.push(new Item(null, categorie, title, movies, seasons));
        }
    });

    // console.log(items);

    files.forEach(e => {
        const base = path.parse(e).base;
        const parsedData = filenameParser(base);

        const item = items.find(x => x.title == parsedDatatitle)[0];
        parsedData.movie ? item.movies.push(e) : item.seasons.push(e);
        // console.log(item.categorie);
    });

    // console.log(files.map(e => path.parse(e).base));

    console.log(items);

    return items;
}

const filenameParser = (filename) => {
    if (filename.includes('St#') && filename.includes('Flg#')) {
        const [title, rest] = filename.split('St#')
        const [season, rest2] = rest.split(' ');
        const episode = rest2.split('#')[1].split('.')[0];
        console.log(episode);

        return { movie: false, title: title.trim(), season: Number(season), episode: Number(episode) };
    } else {
        return { movie: true, title: filename }
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

    crawlAndIndex();
    // console.log(
    //     filenameParser('Food Wars! Shokugeki no Sōma St#1 Flg#1.mp4')
    // );

});
