const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const { filenameParser, Series } = require('../classes/series');
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
/**
 * @param  {[Series]} series
 * @param  {function} cleanup
 */
const generateImages = async (series, cleanup = () => { }) => {
    console.log('Started generateImages()');
    for (const serie of series) {
        const seasons = serie.seasons.flat();
        const items = seasons.length + serie.movies.length
        console.log(`Checked: ${serie.title} with ${items} Items`);
        let i = 0;
        for (const episode of seasons) {
            i++;
            const data = filenameParser(episode, path.parse(episode).base);
            //TODO: change here the stuff to the new oop variant
            const output = path.join(process.env.PREVIEW_IMGS_PATH, String(serie.ID), `${data.season}-${data.episode}`);
            fs.mkdirSync(output, { recursive: true });
            if (fs.readdirSync(output).length == 0) {
                const command = `ffmpeg -i "${episode}" -vf fps=1/10,scale=120:-1 "${path.join(output, 'preview%d.jpg')}"`;
                await deepExecPromisify(command);
                console.log(`  => Video (SE-EP) ${i} / ${items} - ${path.parse(episode).base}`);
            }
        }
        for (const movie of serie.movies) {
            i++;
            const data = filenameParser(movie, path.parse(movie).base);
            const output = path.join(process.env.PREVIEW_IMGS_PATH, String(serie.ID), 'Movies', `${data.movieTitle}`);
            fs.mkdirSync(output, { recursive: true });
            if (fs.readdirSync(output).length == 0) {
                const command = `ffmpeg -i "${movie}" -vf fps=1/10,scale=120:-1 "${path.join(output, 'preview%d.jpg')}"`;
                await deepExecPromisify(command);
                console.log(`  => Video (Movie) ${i} / ${items} - ${path.parse(movie).base}`);
            }
        }
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
    validateImages
}