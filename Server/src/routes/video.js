const fs = require('fs');
const path = require('path');


module.exports = (req, res) => {
    const { series: seriesID, season, episode, movie } = req.query;

    // Ensure there is a range given for the video
    const range = req.headers.range;
    if (!range) {
        res.status(400).send("Requires Range header");
        return;
    }

    if (seriesID == -1 || season == -1 || episode == -1) {
        res.status(404).send("No Video!");
        return;
    }

    const series = JSON.parse(fs.readFileSync('out.json', 'utf-8'));

    const serie = series.find(x => x.ID == seriesID);

    if (serie == undefined) {
        res.status(404).send("Cant find serie with " + x.ID);
        return;
    }

    const videoPath = movie ? serie.movies[movie] : serie.seasons[season][episode];
    if (videoPath == null || videoPath == undefined) {
        res.status(400).send("Season or Episode does not exists");
        return;
    }


    const videoSize = fs.statSync(videoPath).size;

    const CHUNK_SIZE = 10 ** 6; // 1MB
    const start = Number(range.replace(/\D/g, ""));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

    // console.log({ videoSize, start, end });

    const contentLength = end - start + 1;
    const headers = {
        "Content-Range": `bytes ${start}-${end}/${videoSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": contentLength,
        "Content-Type": "video/mp4",
    };



    res.writeHead(206, headers);
    const videoStream = fs.createReadStream(videoPath, { start, end });
    videoStream.pipe(res);
};