const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const { filenameParser, Series } = require('../classes/series');
const { getVideoDurationInSeconds } = require('get-video-duration');
const { promiseAllLimit } = require('./utils');

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
/**
 * @param  {[Series]} series
 * @param  {function} cleanup
 */
const generateImages = async (series, cleanup = () => { }) => {
    console.log('Started generateImages()');

    const limit = await promiseAllLimit(Number(process.env.IMG_CONCURRENT_LIMIT_GENERATION || 5));

    for (const serie of series) {
        const seasons = serie.seasons.flat();
        console.log(`Checked: ${serie.title} with ${seasons.length + serie.movies.length} Items`);

        const episodeImageGeneratingPromises = seasons.map((episode, i) => {
            return limit(() => new Promise(async (resolve, _) => {
                const output = path.join(process.env.PREVIEW_IMGS_PATH, String(serie.ID), `${episode.season}-${episode.episode}`);
                fs.mkdirSync(output, { recursive: true });
                if (fs.readdirSync(output).length == 0) {
                    const command = `ffmpeg -i "${episode.filePath}" -vf fps=1/10,scale=120:-1 "${path.join(output, 'preview%d.jpg')}"`;
                    await deepExecPromisify(command);
                    console.log(`  => Video (SE-EP) ${i + 1} / ${seasons.length} - ${path.parse(episode.filePath).base}`);
                }
                resolve();
            }))
        });

        await Promise.all(episodeImageGeneratingPromises);


        const movieImageGeneratingPromises = serie.movies.map((movie, i) => {
            return limit(() => new Promise(async (resolve, _) => {
                const output = path.join(process.env.PREVIEW_IMGS_PATH, String(serie.ID), 'Movies', `${movie.primaryName}`);
                fs.mkdirSync(output, { recursive: true });
                if (fs.readdirSync(output).length == 0) {
                    const command = `ffmpeg -i "${movie.filePath}" -vf fps=1/10,scale=120:-1 "${path.join(output, 'preview%d.jpg')}"`;
                    await deepExecPromisify(command);
                    console.log(`  => Video (Movie) ${i + 1} / ${serie.movies.length} - ${movie.primaryName}`);
                }
                resolve();
            }))
        });

        await Promise.all(movieImageGeneratingPromises);


    }

    console.log('Finished generateImages()');
    cleanup();
}

const validateImages = async (series, cleanup = () => { }) => {
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
    cleanup();
}

module.exports = {
    generateImages,
    // validateImages
}