import fs from 'fs';
import path from 'path';
import getVideoDurationInSeconds from 'get-video-duration';
import dotenv from 'dotenv';
import { Series } from './classes/series';
import { SerieObject } from './types/classes';
dotenv.config();

// const { Database } = require('@jodu555/mysqlapi');
// const database = Database.createDatabase(process.env.DB_HOST, process.env.DB_USERNAME, process.env.DB_PASSWORD, process.env.DB_DATABASE);
// database.connect();

// require('./utils/database')();

// // console.log(new_parse(watchStr));

// console.log(JSON.stringify(parse(watchStr)) == JSON.stringify(new_parse(watchStr)));

const series: SerieObject[] = JSON.parse(fs.readFileSync(process.env.LOCAL_DB_FILE, 'utf8'));

// const serie = series.find((x) => x.ID == 'cc3a933b');
// console.log(serie);

const wait = (ms: number) => new Promise((rs, _) => setTimeout(rs, ms));

(async () => {
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
