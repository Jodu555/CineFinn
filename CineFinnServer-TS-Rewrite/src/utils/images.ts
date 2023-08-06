import { Langs, Serie } from './../../../Scraper/src/utils/types';
import fs from 'fs';
import path from 'path';
import { Episode, Movie, Series, filenameParser } from '../classes/series';
import child_process from 'child_process';
import pLimit from 'p-limit';
const { getVideoDurationInSeconds } = require('get-video-duration');

async function deepExecPromisify(command: string, cwd: string = undefined) {
	return await new Promise((resolve, reject) => {
		child_process.exec(command, { encoding: 'utf8', cwd }, (error, stdout, stderr) => {
			if (error) {
				reject(error);
			}
			resolve([...stdout?.split('\n'), ...stderr?.split('\n')]);
		});
	});
}

async function generateEntityImages(i: number, serie: Series, entity: Episode | Movie, seasons: Episode[]) {
	for (const lang of entity.langs) {
		let output = path.join(process.env.PREVIEW_IMGS_PATH, String(serie.ID), 'previewImages');
		if (entity instanceof Episode) {
			output = path.join(output, `${entity.season}-${entity.episode}`, lang);
		} else if (entity instanceof Movie) {
			output = path.join(output, 'Movies', `${entity.primaryName}`, lang);
		}
		fs.mkdirSync(output, { recursive: true });
		if (fs.readdirSync(output).length == 0) {
			const { dir, name, ext } = path.parse(entity.filePath);
			const filePath = path.join(dir, `${name.split('_')[0]}_${lang}${ext}`);

			const command = `ffmpeg -i "${filePath}" -vf fps=1/10,scale=120:-1 "${path.join(output, 'preview%d.jpg')}"`;
			if (entity instanceof Movie) console.log(command);
			// await deepExecPromisify(command);
			if (entity instanceof Episode) {
				// console.log(`  => Video (SE-EP) ${i + 1} / ${seasons.length} - ${path.parse(entity.filePath).base}`);
			} else if (entity instanceof Movie) {
				console.log(`  => Video (Movie) ${i + 1} / ${serie.movies.length} - ${entity.primaryName}`);
			}
		}
	}
}

const generateImages = async (series: Series[], cleanup: () => void = () => {}) => {
	console.log('Started generateImages()');

	const limit = pLimit(Number(process.env.IMG_CONCURRENT_LIMIT_GENERATION || 5));

	for (const serie of series) {
		const seasons = serie.seasons.flat();
		console.log(`Checked: ${serie.title} with ${seasons.length + serie.movies.length} Items`);

		const episodeImageGeneratingPromises = seasons.map((episode, i) => {
			return limit(
				() =>
					new Promise<void>(async (resolve, _) => {
						await generateEntityImages(i, serie, episode, seasons);
						// for (const lang of episode.langs) {
						// 	const output = path.join(
						// 		process.env.PREVIEW_IMGS_PATH,
						// 		String(serie.ID),
						// 		'previewImages',
						// 		`${episode.season}-${episode.episode}`,
						// 		lang
						// 	);
						// 	fs.mkdirSync(output, { recursive: true });
						// 	if (fs.readdirSync(output).length == 0) {
						// 		const { dir, name, ext } = path.parse(episode.filePath);
						// 		const filePath = path.join(dir, `${name.split('_')[0]}_${lang}${ext}`);

						// 		const command = `ffmpeg -i "${filePath}" -vf fps=1/10,scale=120:-1 "${path.join(output, 'preview%d.jpg')}"`;
						// 		console.log(command);
						// 		// await deepExecPromisify(command);
						// 		console.log(`  => Video (SE-EP) ${i + 1} / ${seasons.length} - ${path.parse(episode.filePath).base}`);
						// 	}
						// }
						resolve();
					})
			);
		});

		await Promise.all(episodeImageGeneratingPromises);

		const movieImageGeneratingPromises = serie.movies.map((movie, i) => {
			return limit(
				() =>
					new Promise<void>(async (resolve, _) => {
						await generateEntityImages(i, serie, movie, seasons);
						// const output = path.join(process.env.PREVIEW_IMGS_PATH, String(serie.ID), 'previewImages', 'Movies', `${movie.primaryName}`);
						// fs.mkdirSync(output, { recursive: true });
						// if (fs.readdirSync(output).length == 0) {
						// 	const command = `ffmpeg -i "${movie.filePath}" -vf fps=1/10,scale=120:-1 "${path.join(output, 'preview%d.jpg')}"`;
						// 	console.log(command);

						// 	// await deepExecPromisify(command);
						// 	console.log(`  => Video (Movie) ${i + 1} / ${serie.movies.length} - ${movie.primaryName}`);
						// }
						resolve();
					})
			);
		});

		await Promise.all(movieImageGeneratingPromises);
	}

	console.log('Finished generateImages()');
	cleanup();
};

// const validateImages = async (series: Series[], cleanup = () => {}) => {
// 	let totalImgs = 0;

// 	// return;
// 	for (const serie of series) {
// 		const seasons = serie.seasons.flat(2);
// 		let i = 0;
// 		for (const season of seasons) {
// 			i++;
// 			const data = filenameParser(season, path.parse(season).base);
// 			const location = path.join(process.env.PREVIEW_IMGS_PATH, String(serie.ID), `${data.season}-${data.episode}`);
// 			const duration = await getVideoDurationInSeconds(season);
// 			const imageAmount = Math.ceil(duration / 10);
// 			totalImgs += imageAmount;
// 			console.log(totalImgs);
// 			if (!fs.existsSync(location)) {
// 				//Failure
// 				continue;
// 			}
// 			const files = fs.readdirSync(location);
// 			console.log(`Check ${i} / ${seasons.length} - ${path.parse(season).base} = ${imageAmount} == ${files.length}`);
// 		}
// 	}
// 	console.log('Finished');
// 	cleanup();
// };

export {
	generateImages,
	// validateImages
};
