import fs from 'fs';
import path from 'path';
import getVideoDurationInSeconds from 'get-video-duration';
import dotenv from 'dotenv';
import { SerieObject } from './types/classes';
import { generateImages } from './utils/images';
import { load, parse } from './utils/watchString';
import axios from 'axios';
import { DatabaseWatchStringItem } from './types/database';
dotenv.config();

const { Database } = require('@jodu555/mysqlapi');
const database = Database.createDatabase(process.env.DB_HOST, process.env.DB_USERNAME, process.env.DB_PASSWORD, process.env.DB_DATABASE);
database.connect();

// require('./utils/database')();

// // console.log(new_parse(watchStr));

// console.log(JSON.stringify(parse(watchStr)) == JSON.stringify(new_parse(watchStr)));

const series: SerieObject[] = JSON.parse(fs.readFileSync(process.env.LOCAL_DB_FILE, 'utf8'));

// const irregular = series.find((x) => x.title.includes('Irregular'));

// irregular.seasons[0].length = 5;
// irregular.seasons[1].length = 5;

// generateImages([irregular], () => {
// 	console.log('Finished');
// });

// const serie = series.find((x) => x.ID == 'cc3a933b');
// console.log(serie);

const wait = (ms: number) => new Promise((rs, _) => setTimeout(rs, ms));

async function getDuplicateEpisodesWithDubAndSub() {
	const remoteSeriesResponse = await axios.get<SerieObject[]>(
		'http://cinema-api.jodu555.de/index/all?auth-token=' + process.env.TEST_AUTH_TOKEN_FROM_PUBLIC_API
	);

	const remoteSeries = remoteSeriesResponse.data;

	const episodesWithDubAndSub: Record<string, number> = {};

	for (const serie of remoteSeries) {
		if (serie.title.includes('Date a Live')) continue;
		for (const season of serie.seasons) {
			for (const episode of season) {
				if (episode.langs.includes('GerDub') && episode.langs.includes('GerSub')) {
					if (!episodesWithDubAndSub[serie.title]) {
						episodesWithDubAndSub[serie.title] = 1;
					}
					episodesWithDubAndSub[serie.title] += 1;
					// episodesWithDubAndSub.push(episode);
				}
			}
		}
	}

	console.log(episodesWithDubAndSub);

	let episodesAcc = Object.values(episodesWithDubAndSub).reduce((a, b) => a + b, 0);

	console.log(episodesAcc);

	console.log(parseFloat(String((episodesAcc * 300) / 1024)).toFixed(2) + 'GB');
}

async function findNeverWatchedSeries() {
	const remoteSeriesResponse = await axios.get<SerieObject[]>(
		'http://cinema-api.jodu555.de/index/all?auth-token=' + process.env.TEST_AUTH_TOKEN_FROM_PUBLIC_API
	);

	const serieIDS = new Set(remoteSeriesResponse.data.map((x) => x.ID));

	const watchStringDB: DatabaseWatchStringItem[] = await database.get('watch_strings').get();

	const allWatchedIDs = new Set<string>();

	for (const dbitem of watchStringDB) {
		const list = parse(dbitem.watch_string);
		const ids = new Set(list.map((x) => x.ID));
		ids.forEach((i) => {
			allWatchedIDs.add(i);
		});
	}

	for (const serieID of serieIDS) {
		if (!allWatchedIDs.has(serieID)) {
			console.log('Has never been watched', remoteSeriesResponse.data.find((x) => x.ID == serieID).title);
		}
	}

	console.log(allWatchedIDs.size, serieIDS.size);
}

(async () => {
	await getDuplicateEpisodesWithDubAndSub();
	return;
	// const list = parse(str);

	// await generateImages([serie]);
	// console.log('Came');

	// const limit = await promiseAllLimit(5);

	// // const limit = pLimit(10);
	// const arr = Array.from({
	//     length: 100
	// }, () => {
	//     return limit(() => wait(5000));
	// });

	// await Promise.all(arr);

	// console.log(`arr`, arr);

	return;
	const newSeries = await Promise.all(
		series.map((serie) => {
			return new Promise(async (resolve, _) => {
				const newSeasons = await Promise.all(
					serie.seasons.map(async (season) => {
						return await Promise.all(
							season.map((e) => {
								return new Promise(async (resolve, _) => {
									console.log('started', e.primaryName);
									const duration = await getVideoDurationInSeconds(e.filePath);
									console.log('got', e.primaryName, duration);
									resolve({ ...e, duration });
								});
							})
						);
					})
				);
				resolve({ ...serie, seasons: newSeasons });
			});
		})
	);
	fs.writeFileSync('new-time.json', JSON.stringify(newSeries, null, 3));

	// console.log(JSON.stringify(newSeries, null, 3));
})();

// getVideoEntity(seriesID, 2, 5);
