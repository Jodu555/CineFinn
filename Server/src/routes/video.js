const fs = require('fs');
const path = require('path');


module.exports = (req, res) => {
    const { series: seriesID, season, episode, movie } = req.query;

    const debug = false;

    // Ensure there is a range given for the video
    const range = req.headers.range;
    if (!range) {
        res.status(400).send('Requires Range header');
        return;
    }
    debug && console.log('Got Range', range);

    if (seriesID == -1 || season == -1 || episode == -1) {
        res.status(404).send('No Video!');
        return;
    }

    debug && console.log('Got Video');

    const series = JSON.parse(fs.readFileSync('out.json', 'utf-8'));
    const serie = series.find(x => x.ID == seriesID);

    debug && console.log('Tried to find serie');


    if (serie == undefined) {
        res.status(404).send('Cant find serie with ' + seriesID);
        return;
    }

    debug && console.log('Got Serie', serie.ID);

    const videoPath = movie ? serie.movies[movie] : serie.seasons[season][episode];
    if (videoPath == null || videoPath == undefined) {
        res.status(400).send('Season or Episode does not exists');
        return;
    }


    debug && console.log('Got Video Path', videoPath);

    const videoSize = fs.statSync(videoPath).size;

    // const CHUNK_SIZE = 10 ** 6; // 1MB
    const CHUNK_SIZE = process.env.VIDEO_CHUNK_SIZE;
    const start = Number(range.replace(/\D/g, ''));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);


    const contentLength = end - start + 1;

    debug && console.log('Calculated contentLength', contentLength);
    const headers = {
        'Content-Range': `bytes ${start}-${end}/${videoSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': contentLength,
        'Content-Type': 'video/mp4',
    };


    res.writeHead(206, headers);
    const videoStream = fs.createReadStream(videoPath, { start, end });
    videoStream.pipe(res);
};