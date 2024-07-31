import fs from 'fs';
import path from 'path';
import { Episode, Movie, Series, filenameParser } from '../classes/series';
import child_process from 'child_process';
import pLimit from 'p-limit';
import { CommandManager } from '@jodu555/commandmanager';
import { getIORedis } from './utils';
import { Queue, QueueEvents } from 'bullmq';
const commandManager = CommandManager.getCommandManager();
const { getVideoDurationInSeconds } = require('get-video-duration');

const wait = (ms: number): Promise<void> => new Promise((r, _) => setTimeout(r, ms));

const newProgress = false;

interface PromissesJob {
	meta: {
		serieID: string;
		entity: Episode | Movie;
		lang: string;
		filePath: string;
		output: string;
		imagePathPrefix: string;
		publicStreamURL: string;
	};
	run: () => Promise<void>;
}

async function deepExecPromisify(command: string, cwd: string = undefined) {
	return await new Promise((resolve, reject) => {
		//maxBuffer: Default: 200KB and this sets it to 900KB
		child_process.exec(command, { encoding: 'utf8', cwd, maxBuffer: 1024 * 900 }, (error, stdout, stderr) => {
			if (error) {
				reject(error);
			}
			resolve([...stdout?.split('\n'), ...stderr?.split('\n')]);
		});
	});
}

function generateEntityImages(i: number, serie: Series, entity: Episode | Movie, seasons: Episode[]): PromissesJob[] {
	const returnArr: PromissesJob[] = [];
	for (const lang of entity.langs) {
		let output = path.join(process.env.PREVIEW_IMGS_PATH, String(serie.ID), 'previewImages');
		if (entity instanceof Episode) {
			output = path.join(output, `${entity.season}-${entity.episode}`, lang);
		} else if (entity instanceof Movie) {
			output = path.join(output, 'Movies', `${entity.primaryName}`, lang);
		}

		if (fs.existsSync(output) && fs.readdirSync(output).length != 0) {
			// console.log('Images Present skipping', lang);
			continue;
		}

		const { dir, name, ext } = path.parse(entity.filePath);
		const filePath = entity.langs.length > 1 ? path.join(dir, `${name.split('_')[0]}_${lang}${ext}`) : entity.filePath;

		const url = new URL(`${process.env.PUBLIC_API_ENDPOINT}/video`);

		url.searchParams.append('auth-token', process.env.PUBLIC_API_AUTHTOKEN);

		url.searchParams.append('series', serie.ID);
		url.searchParams.append('language', lang);
		if (entity instanceof Episode) {
			url.searchParams.append('season', entity.season.toString());
			url.searchParams.append('episode', entity.episode.toString());
		} else {
			url.searchParams.append('movie', (i + 1).toString());
		}

		const publicStreamURL = url.href;

		returnArr.push({
			meta: {
				imagePathPrefix: process.env.PREVIEW_IMGS_PATH,
				serieID: serie.ID,
				entity,
				lang,
				output,
				filePath,
				publicStreamURL,
			},
			run: () =>
				new Promise<void>(async (resolve, reject) => {
					try {
						fs.mkdirSync(output, { recursive: true });
						const command = `ffmpeg -i "${publicStreamURL}" -vf fps=1/10,scale=120:-1 "${path.join(output, 'preview%d.jpg')}"`;
						// console.log(command);
						await deepExecPromisify(command);
						// await wait(1000 + Math.floor(Math.random() * 100));

						//Logging
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
										`Checked: ${serie.title} with ${seasons.length + serie.movies.length} Items \n  => Video (Movie) ${i + 1} / ${
											serie.movies.length
										} - ${entity.primaryName}`,
										2
									);
							!newProgress && console.log(`  => Video (Movie) ${i + 1} / ${serie.movies.length} - ${entity.primaryName}`);
						}
						resolve();
					} catch (error) {
						reject(error);
					}
				}),
		});
	}
	return returnArr;
}

const generateImages = async (series: Series[], cleanup: () => void = () => {}) => {
	console.log('Started generateImages()');

	const limit = pLimit(Number(process.env.IMG_CONCURRENT_LIMIT_GENERATION || 5));

	const promises: PromissesJob[] = [];
	// let start = Date.now();
	for (const serie of series) {
		const seasons = serie.seasons.flat();

		const fn = (item: Episode | Movie, index: number) => {
			const result = generateEntityImages(index, serie, item, seasons);
			promises.push(...result);
		};

		// Non Blocking GOOD
		await new Promise<void>((resolve, reject) => {
			forEachNonBlocking(seasons, 1, fn, resolve);
		});
		await new Promise<void>((resolve, reject) => {
			forEachNonBlocking(serie.movies, 1, fn, resolve);
		});

		// Blocking BAD
		// seasons.forEach(fn);
		// serie.movies.forEach(fn);

		// console.log(serie.title, promises.length);
	}

	console.log(`Every Series has been checked and there are ${promises.length} Processes Waiting!`);
	// console.log('Took:', Date.now() - start, 'ms');

	if (promises.length == 0) {
		console.log('Finished generateImages()');
		cleanup();
		return;
	}

	const connection = getIORedis();
	if (connection) {
		const previewImageQueue = 'previewImageQueue';
		const queue = new Queue(previewImageQueue, { connection });

		const queueEvents = new QueueEvents(previewImageQueue, { connection });

		forEachNonBlocking(promises, 2, (p) => {
			queue.add(p.meta.serieID, p.meta, { removeOnComplete: false, removeOnFail: false });
		});

		await new Promise<void>((resolve, reject) => {
			queueEvents.once('drained', async () => {
				console.log('Queue drained');
				queue.drain();
				resolve();
			});
		});
	} else {
		await Promise.all(
			promises.map((p) => {
				return limit(
					() =>
						new Promise<void>(async (resolve, _) => {
							console.log(
								'  => Started',
								p.meta.serieID,
								series.find((x) => x.ID == p.meta.serieID)?.title,
								path.parse(p.meta.entity.filePath).base,
								p.meta.lang
							);
							await p.run();
							console.log(
								'  => Finished',
								p.meta.serieID,
								series.find((x) => x.ID == p.meta.serieID)?.title,
								path.parse(p.meta.entity.filePath).base,
								p.meta.lang
							);
							resolve();
						})
				);
			})
		);
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

function forEachNonBlocking<T>(array: T[], chunkSize: number, cb: (element: T, index: number) => void, finished?: () => void) {
	let index = 0;

	function processChunk() {
		const end = Math.min(index + chunkSize, array.length);
		for (let i = index; i < end; i++) {
			cb(array[i], i);
		}
		index = end;
		if (index < array.length) {
			setImmediate(processChunk);
		} else {
			if (finished) finished();
		}
	}
	processChunk();
}

export {
	generateImages,
	// validateImages
};
