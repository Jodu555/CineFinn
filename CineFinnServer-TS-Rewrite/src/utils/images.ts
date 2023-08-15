import { Langs, Serie } from './../../../Scraper/src/utils/types';
import fs from 'fs';
import path from 'path';
import { Episode, Movie, Series, filenameParser } from '../classes/series';
import child_process from 'child_process';
import pLimit from 'p-limit';
import { CommandManager } from '@jodu555/commandmanager';
const commandManager = CommandManager.getCommandManager();
const { getVideoDurationInSeconds } = require('get-video-duration');

const wait = (ms: number): Promise<void> => new Promise((r, _) => setTimeout(r, ms));

const newProgress = false;

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
			const filePath = entity.langs.length > 1 ? path.join(dir, `${name.split('_')[0]}_${lang}${ext}`) : entity.filePath;

			const command = `ffmpeg -i "${filePath}" -vf fps=1/10,scale=120:-1 "${path.join(output, 'preview%d.jpg')}"`;
			// console.log(command);
			// await deepExecPromisify(command);
			await wait(2000);
			if (entity instanceof Episode) {
				newProgress &&
					commandManager
						.getWriter()
						.deepSameLineClear(
							`Checked: ${serie.title} with ${seasons.length + serie.movies.length} Items \n  => Video (SE-EP) ${i + 1} / ${seasons.length} - ${
								path.parse(entity.filePath).base
							}`,
							2
						);
				!newProgress && console.log(`  => Video (SE-EP) ${i + 1} / ${seasons.length} - ${path.parse(entity.filePath).base}`);
			} else if (entity instanceof Movie) {
				newProgress &&
					commandManager
						.getWriter()
						.deepSameLineClear(
							`Checked: ${serie.title} with ${seasons.length + serie.movies.length} Items \n  => Video (Movie) ${i + 1} / ${serie.movies.length} - ${
								entity.primaryName
							}`,
							2
						);
				!newProgress && console.log(`  => Video (Movie) ${i + 1} / ${serie.movies.length} - ${entity.primaryName}`);
			}
		}
	}
}

const generateImages = async (series: Series[], cleanup: () => void = () => {}) => {
	console.log('Started generateImages()');

	const limit = pLimit(Number(process.env.IMG_CONCURRENT_LIMIT_GENERATION || 5));

	for (const serie of series) {
		const seasons = serie.seasons.flat();
		newProgress && commandManager.getWriter().deepSameLineClear(`Checked: ${serie.title} with ${seasons.length + serie.movies.length} Items \n `, 2);
		!newProgress && console.log(`Checked: ${serie.title} with ${seasons.length + serie.movies.length} Items`);

		const episodeImageGeneratingPromises = seasons.map((episode, i) => {
			return limit(
				() =>
					new Promise<void>(async (resolve, _) => {
						await generateEntityImages(i, serie, episode, seasons);
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
