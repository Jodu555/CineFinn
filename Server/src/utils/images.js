const child_process = require('child_process');
const { filenameParser } = require('../classes/series');
const { getVideoDurationInSeconds } = require('get-video-duration')

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

const genearteImages = async (series) => {

    const serie = series[6];
    const seasons = serie.seasons.flat().splice(0, 7);

    console.log(seasons.length);
    // return;
    let i = 0;
    for (const season of seasons) {
        i++;
        const data = filenameParser(season, path.parse(season).base);
        const output = path.join(process.env.PREVIEW_IMGS_PATH, String(serie.ID), `${data.season}-${data.episode}`);
        fs.mkdirSync(output, { recursive: true });

        const command = `ffmpeg -i "${season}" -vf fps=1/10,scale=120:-1 "${path.join(output, 'preview%d.jpg')}"`;
        console.log(`Video ${i} / ${seasons.length} - ${path.parse(season).base}`);
        // await deepExecPromisify(command);
    }
    console.log('Finished');
}

const checkImages = async (series) => {
    let totalImgs = 0;

    // return;
    for (const serie of series) {
        const seasons = serie.seasons.flat(2);
        let i = 0;
        for (const season of seasons) {
            i++;
            const data = filenameParser(season, path.parse(season).base);
            const location = path.join(process.env.PREVIEW_IMGS_PATH, String(serie.ID), `${data.season}-${data.episode}`);
            const duration = await getVideoDurationInSeconds(season);
            const imageAmount = Math.ceil(duration / 10)
            totalImgs += imageAmount;
            console.log(totalImgs);
            if (!fs.existsSync(location)) {
                //Failure
                continue;
            }
            const files = fs.readdirSync(location);
            console.log(`Check ${i} / ${seasons.length} - ${path.parse(season).base} = ${imageAmount} == ${files.length}`);
        }
    }

    console.log('Finished');
}

module.exports = {
    genearteImages,
    checkImages
}