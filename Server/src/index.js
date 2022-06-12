const path = require('path');
const fs = require('fs');

const http = require('http');
const express = require('express');
const https = require('https');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv').config();
const child_process = require('child_process');

const { getSeries } = require('./utils/utils.js');
const { filenameParser } = require('./classes/series.js');

async function deepExecPromisify(command, cwd) {
    return await new Promise((resolve, reject) => {
        child_process.exec(command, { encoding: 'utf8', cwd }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            resolve([...stdout?.split('\n'), ...stderr?.split('\n')]);
        });
    })
}


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

app.get("/video", require('./routes/video.js'));

app.get('/index', (req, res, next) => {
    res.json(getSeries());
});

const genearteImages = async (series) => {

    const serie = series[6];
    const seasons = serie.seasons.flat().splice(0, 7);

    console.log(seasons.length);
    // return;
    let i = 0;
    for (const season of seasons) {
        i++;
        const data = filenameParser(season, path.parse(season).base);
        const output = path.join(process.env.PREVIEW_IMGS_PATH, 'previmgs', String(serie.ID), `${data.season}-${data.episode}`);
        fs.mkdirSync(output, { recursive: true });

        const command = `ffmpeg -i "${season}" -vf fps=1/10,scale=120:-1 "${path.join(output, 'preview%d.jpg')}"`;
        console.log(`Video ${i} / ${seasons.length} - ${path.parse(season).base}`);
        await deepExecPromisify(command);
    }
    console.log('Finished');
}

const PORT = process.env.PORT || 3100;
server.listen(PORT, async () => {
    console.log(`Express App Listening ${process.env.https ? 'with SSL ' : ''}on ${PORT}`);
    // console.log(getSeries().length);
    // console.log(getSeries(true).map(x => [...x.seasons, ...x.movies]).flat(5).length);
    // await genearteImages(series);

});
