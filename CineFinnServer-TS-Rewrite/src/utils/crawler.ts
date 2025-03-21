// const path = require('path');
// const { listFiles } = require('./fileutils');
// const { v4: uuidv4 } = require('uuid');
import path from 'path';
import { createHash } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { listFiles } from './fileutils';
import { Episode, Movie, Series, filenameParser } from '../classes/series';
import { SerieEpisodeObject, SerieObject } from '@Types/classes';
import { ServerMovingItem, SubFile, additionalMovingItems, getAllFilesFromAllSubs, getPrioSubIDForSerie, processMovingItem } from '../sockets/sub.socket';

const generateID = () => {
	return uuidv4().split('-')[0];
	// return Math.floor(Math.random() * 10000);
};

interface idFile {
	id: string;
	file: string;
}

let toCheckItems: { title: string; existEpisode: Episode; newEpisode: Episode; }[] = [];

const crawlAndIndex = async () => {
	toCheckItems = [];
	const pathEntries = [process.env.VIDEO_PATH];

	//TODO: maybe switch this up to first process the main and then the subs so if there are duplicates the main is chosen
	let files: SubFile[] = [];

	console.time('Getting-SubFiles');
	const subFiles = await getAllFilesFromAllSubs();
	console.timeEnd('Getting-SubFiles');

	files.push(...subFiles);

	//TODO: this is not good takes abt 3s on 800
	// console.time('getting Files');
	for (const pathEntry of pathEntries) {
		let { files: tmp_files } = listFiles(pathEntry);
		files.push(...tmp_files.map((x) => ({ path: x, subID: 'main' })));
		tmp_files = null;
	}
	// console.timeEnd('getting Files');

	// let { files: tmp2_files } = listFiles('Z:\\home\\laterIntegrate');
	// files.push(...tmp2_files);
	// tmp_files = null;

	//Strip all non mp4 files from the files
	files = files.filter((f) => path.parse(f.path).ext == '.mp4');

	// console.log(categorieMap);

	// Strip the dirs down and seperate between season or movie dirs or series dirs
	let series: SerieObject[] = [];



	// console.time('File Loop');
	files.forEach(({ path: e, subID }) => {
		const base = path.parse(e).base;
		const parsedData = filenameParser(e, base);

		let item = series.find((x) => x.title == parsedData.title);
		if (item == undefined) {
			const categorie = path.parse(path.join(path.parse(e).dir, '../../')).base;
			const serie = new Series(generateID(), categorie, parsedData.title, [], []);
			series.push(serie);
			item = serie;
		}
		if (parsedData.movie == true) {
			const existMovie = item.movies.find((x) => x.primaryName == parsedData.movieTitle);
			if (existMovie) {
				existMovie.langs.push(parsedData.language);
			} else {
				const movie = new Movie(e, parsedData.movieTitle, '', [parsedData.language], subID);
				item.movies.push(movie);
			}
		} else {
			const currentArr = item.seasons[parsedData.season - 1];

			const episode = new Episode(e, parsedData.title, '', parsedData.season, parsedData.episode, [parsedData.language], subID);

			if (Array.isArray(currentArr)) {
				const existEpisode = currentArr.find((eps) => eps.season == parsedData.season && eps.episode == parsedData.episode);
				if (existEpisode) {
					if (!existEpisode.langs.includes(parsedData.language)) {
						existEpisode.langs.push(parsedData.language);
						if (existEpisode.subID != subID) {
							const error = `Sub System Language Overlap in ${item.title}(${item.ID}) - ${existEpisode.season}x${existEpisode.episode} Exists in ${existEpisode.subID} at ${existEpisode.filePath} and in ${subID} at ${e}`;
							console.log(error);
							item.infos.disabled = true;
							toCheckItems.push({
								title: item.title,
								existEpisode,
								newEpisode: episode
							});
						}
						return;
					}
					if (existEpisode.subID != subID) {
						const error = `Sub System Overlap in ${item.title}(${item.ID}) - ${existEpisode.season}x${existEpisode.episode} Exists in ${existEpisode.subID} at ${existEpisode.filePath} and in ${subID} at ${e}`;
						console.log(error);
						return;
					}
					if (existEpisode.langs.includes(parsedData.language)) {
						// console.log(item, existEpisode, parsedData, base, e);
						const error = `Overloading Language Detected in ${item.title}(${item.ID}) - ${existEpisode.season}x${existEpisode.episode} ${existEpisode.filePath} - ${e} ${parsedData.language}`;
						console.log(error);
						return;
					}
					existEpisode.langs.push(parsedData.language);
					return;
				} else {
					currentArr.push(episode);
				}
			} else {
				item.seasons[parsedData.season - 1] = [episode];
			}
		}
	});
	// console.timeEnd('File Loop');

	const sorterFunction = (a: SerieEpisodeObject, b: SerieEpisodeObject) => {
		return a.episode - b.episode;
	};

	//Strinify in Json and then parse to deal with the empty array items the they are null
	// series = JSON.parse(JSON.stringify(series));

	series = series.map((e) => {
		const newSeasons = e.seasons
			.filter((x) => {
				// x == null && console.log('innner', e, x, 'out', x == null ? [] : x);

				// return x == null ? [] : x;
				return x != null;
			})
			.map((x) => x.sort(sorterFunction));

		return {
			...e,
			seasons: newSeasons,
		};
	});

	return series;
};

const mergeSeriesArrays = (before: Series[], after: Series[], keepCurrentlyNotPresent = true) => {
	const output = [];

	//Compare and overwrite ids
	before.forEach((beforeSerie) => {
		const afterSerie = after.find((as) => as.title == beforeSerie.title && as.categorie == beforeSerie.categorie);
		if (afterSerie) {
			// console.log('Found Overlapping', beforeSerie.title, afterSerie.title, beforeSerie.ID, afterSerie.ID);
			if (!afterSerie.infos.disabled) beforeSerie.infos.disabled = false;

			if (JSON.stringify(beforeSerie.movies) != JSON.stringify(afterSerie.movies) || JSON.stringify(beforeSerie.seasons) != JSON.stringify(afterSerie.seasons)) {
				console.log(`Actual Change in Serie: ${beforeSerie.title} with ${beforeSerie.ID}`);
				//TODO: update the series latestUpdated and add a property for that
			}
			output.push(
				new Series(
					beforeSerie.ID,
					beforeSerie.categorie,
					beforeSerie.title,
					afterSerie.movies,
					afterSerie.seasons,
					{ ...beforeSerie.references, ...afterSerie.references },
					{ ...beforeSerie.infos, ...afterSerie.infos }
				)
			);
		} else {
			if (keepCurrentlyNotPresent) {
				console.log('Found Non Overlapping or Currently not existing series', beforeSerie.title, beforeSerie.ID);
				output.push(
					new Series(
						beforeSerie.ID,
						beforeSerie.categorie,
						beforeSerie.title,
						beforeSerie.movies,
						beforeSerie.seasons,
						{ ...beforeSerie.references },
						{ ...beforeSerie.infos, disabled: true }
					)
				);
			}
		}
	});

	//Add the non existent series and watch for ID overlaps
	after.forEach((afterSerie) => {
		const beforeSerie = before.find((bs) => afterSerie.title == bs.title);
		if (!beforeSerie) {
			const overlapID = before.find((bs) => bs.ID == afterSerie.ID);
			const newID = overlapID ? generateID() : afterSerie.ID;
			output.push(
				new Series(newID, afterSerie.categorie, afterSerie.title, afterSerie.movies, afterSerie.seasons, afterSerie.references, afterSerie.infos)
			);
		}
	});

	for (const { title, existEpisode, newEpisode } of toCheckItems) {
		const serie = output.find((x) => x.title === title);

		const newPrioSub = getPrioSubIDForSerie(serie);
		console.log('Major Problem needs immediate moval');

		const error = `Sub System Language Overlap in ${serie.title}(${serie.ID}) - ${existEpisode.season}x${existEpisode.episode} Exists in ${existEpisode.subID} at ${existEpisode.filePath} and in ${newEpisode.subID} at ${newEpisode.filePath}`;
		console.log(error);

		console.log(
			newPrioSub,
		);

		if (newPrioSub == newEpisode.subID) return;

		const movingItem = {
			ID: createHash('md5').update(`${serie.ID}${newEpisode.subID}${newPrioSub}${existEpisode.filePath}`).digest('base64'),
			seriesID: serie.ID,
			fromSubID: newEpisode.subID,
			toSubID: newPrioSub,
			filePath: newEpisode.filePath,
			entity: newEpisode,
			meta: {
				isMoving: false,
				progress: 0,
				result: '',
				isAdditional: false,
			}
		} satisfies ServerMovingItem;

		additionalMovingItems.push(movingItem);

		console.log(movingItem.ID);

		// This technically should be implemented in some sort of a queue were we can push the item to process at a later stage
		// This would generally be better for the movingItems a good idea since i dont like the all at one time idea and would prefere a staggered approach
		// await processMovingItem(movingItem.ID);
	}

	return output;
};

export { crawlAndIndex, mergeSeriesArrays, generateID };
