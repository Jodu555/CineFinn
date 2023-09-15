// const path = require('path');
// const { listFiles } = require('./fileutils');
// const { v4: uuidv4 } = require('uuid');

import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { listFiles } from './fileutils';
import { Episode, Movie, Series, filenameParser } from '../classes/series';
import { SerieEpisodeObject, SerieObject } from '../types/classes';

const generateID = () => {
	return uuidv4().split('-')[0];
	// return Math.floor(Math.random() * 10000);
};

const oldCrawlAndIndex = () => {
	const { Series, filenameParser, Episode, Movie } = require('../classes/series');

	const overcategories = ['Aniworld', 'STO'];
	const obj = {};

	let { dirs, files } = listFiles(process.env.VIDEO_PATH);

	//Strip all non mp4 files from the files
	files = files.filter((f) => path.parse(f).ext == '.mp4');

	//Sort dirs into the overcategories into the object
	let sortIdx = -1;
	dirs.forEach((dir) => {
		if (overcategories.includes(dir)) {
			sortIdx == -1 ? (sortIdx = 0) : sortIdx++;
		} else {
			obj[overcategories[sortIdx]] == undefined ? (obj[overcategories[sortIdx]] = [dir]) : obj[overcategories[sortIdx]].push(dir);
		}
	});

	// Strip the dirs down and seperate between season or movie dirs or series dirs
	let series: SerieObject[] = [];

	Object.keys(obj).forEach((categorie) => {
		const dirs = obj[categorie];
		for (let i = 0; i < dirs.length; ) {
			const title = dirs[i];
			const seasons = [];
			const movies = [];
			i++;
			while (dirs[i] != undefined && (dirs[i].includes('Season-') || dirs[i].includes('Movies'))) {
				// dirs[i].includes('Season-') ? seasons.push(dirs[i]) : movies.push(dirs[i]);
				i++;
			}
			series.push(new Series(generateID(), categorie, title, movies, seasons));
		}
	});

	files.forEach((e) => {
		const base = path.parse(e).base;
		const parsedData = filenameParser(e, base);

		const item = series.find((x) => x.title.includes(parsedData.title));
		if (parsedData.movie == true) {
			const existMovie = item.movies.find((x) => x.primaryName.includes(parsedData.movieTitle));
			if (existMovie) {
				existMovie.langs.push(parsedData.language);
			} else {
				const movie = new Movie(e, parsedData.movieTitle, '', [parsedData.language]);
				item.movies.push(movie);
			}
		} else {
			const currentArr = item.seasons[parsedData.season - 1];

			const episode = new Episode(e, parsedData.title, '', parsedData.season, parsedData.episode, [parsedData.language]);

			if (Array.isArray(currentArr)) {
				const existEpisode = currentArr.find((eps) => eps.season == parsedData.season && eps.episode == parsedData.episode);
				if (existEpisode) {
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

	const sorterFunction = (a, b) => {
		return a.episode - b.episode;
	};

	//Strinify in Json and then parse to deal with the empty array items the they are null
	series = JSON.parse(JSON.stringify(series));

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

const crawlAndIndex = () => {
	const pathEntries = [process.env.VIDEO_PATH];

	let files: string[] = [];

	for (const pathEntry of pathEntries) {
		let { files: tmp_files } = listFiles(pathEntry);
		files.push(...tmp_files);
		tmp_files = null;
	}

	// let { files: tmp2_files } = listFiles('Z:\\home\\laterIntegrate');
	// files.push(...tmp2_files);
	// tmp_files = null;

	//Strip all non mp4 files from the files
	files = files.filter((f) => path.parse(f).ext == '.mp4');

	// console.log(categorieMap);

	// Strip the dirs down and seperate between season or movie dirs or series dirs
	let series: SerieObject[] = [];

	files.forEach((e) => {
		const base = path.parse(e).base;
		const parsedData = filenameParser(e, base);

		let item = series.find((x) => x.title.includes(parsedData.title));
		if (item == undefined) {
			const categorie = path.parse(path.join(path.parse(e).dir, '../../')).base;
			const serie = new Series(generateID(), categorie, parsedData.title, [], []);
			series.push(serie);
			item = serie;
		}
		if (parsedData.movie == true) {
			const existMovie = item.movies.find((x) => x.primaryName.includes(parsedData.movieTitle));
			if (existMovie) {
				existMovie.langs.push(parsedData.language);
			} else {
				const movie = new Movie(e, parsedData.movieTitle, '', [parsedData.language]);
				item.movies.push(movie);
			}
		} else {
			const currentArr = item.seasons[parsedData.season - 1];

			const episode = new Episode(e, parsedData.title, '', parsedData.season, parsedData.episode, [parsedData.language]);

			if (Array.isArray(currentArr)) {
				const existEpisode = currentArr.find((eps) => eps.season == parsedData.season && eps.episode == parsedData.episode);
				if (existEpisode) {
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

const mergeSeriesArrays = (before: Series[], after: Series[]) => {
	const { Series } = require('../classes/series');
	const output = [];

	//Compare and overwrite ids
	before.forEach((beforeSerie) => {
		const afterSerie = after.find((as) => as.title == beforeSerie.title && as.categorie == beforeSerie.categorie);
		if (afterSerie) {
			// console.log('Found Overlapping', beforeSerie.title, afterSerie.title, beforeSerie.ID, afterSerie.ID);
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

	return output;
};

export { crawlAndIndex, mergeSeriesArrays, generateID };
