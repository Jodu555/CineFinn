module.exports = (req, res) => {
    // console.log(req.query);
    // Ensure there is a range given for the video
    const range = req.headers.range;
    if (!range) {
        res.status(400).send("Requires Range header");
        return;
    }

    const videoPath = path.join(path.join(process.env.VIDEO_PATH, 'STO', 'Mia and Me – Abenteuer in Centopia', 'Season-1', 'Mia and Me – Abenteuer in Centopia St#1 Flg#1.mp4'));
    const videoSize = fs.statSync(videoPath).size;

    const CHUNK_SIZE = 10 ** 6; // 1MB
    const start = Number(range.replace(/\D/g, ""));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

    // console.log({ videoPath, videoSize, start, end });

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