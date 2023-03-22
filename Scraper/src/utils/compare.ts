import { ExtendedZoroEpisode } from './../class/Zoro';
import { AniWorldSeriesInformations } from './../class/Aniworld';
import * as fs from 'fs';
const promiseLimit = require('promise-limit');
const sanitizeFilename = require('sanitize-filename');
import Aniworld from '../class/Aniworld';
const { similar } = require('./utils');
import { IgnoranceItem, Langs, Serie, SerieReference } from '../utils/types';
import Zoro from '../class/Zoro';

function sanitizeFileName(str: string): string {
	return sanitizeFilename(str, { replacement: ' ' }).replace(/  +/g, ' ');
}
interface AniWorldSerieCompare extends AniWorldSeriesInformations {
	ID: string;
	title: string;
	references: SerieReference;
}

async function compareForNewReleases(series: Serie[], ignoranceList: IgnoranceItem[]) {
	console.log('------ Compare Aniworld ------');
	await compareForNewReleasesAniWorld(series, ignoranceList);
	console.log('------ Compare Aniworld ------');
}

async function compareForNewReleasesAniWorld(series: Serie[], ignoranceList: IgnoranceItem[]) {
	const limit = promiseLimit(10);
	const data = series.filter((x) => x.references?.aniworld);

	const compare: AniWorldSerieCompare[] = await Promise.all(
		data.map(async (serie) => {
			return limit(() => {
				return new Promise(async (res, _) => {
					let world: Aniworld;
					if (typeof serie.references.aniworld == 'string') world = new Aniworld(serie.references.aniworld);
					const out = await world.parseInformations();
					res({
						ID: serie.ID,
						title: serie.title,
						references: serie.references,
						...out,
					});
				});
			});
		})
	);
	const outputDlList = [];

	/**
	 * Loop through the aniworld series
	 * check if the season amount is equal ?
	 * if it is:
	 * 	check if the episode amount is equal ?
	 * 	if it is:
	 *   check if there is a gerDub out which isnt on the server
	 * 	 if, then add it to the list
	 *  if it is not:
	 * 	 Use the usual method to add to the list:
	 * 	 if GerDub take it, if not just GerSub
	 *
	 * if it is not:
	 *  just proceed with the usual method
	 *
	 */

	//TODO: the system currently only checks if the gerdub is relased, but when we initially have the engsub and the gersub is released, the system does not care

	const addtoOutputList = (title, reference, season, episode, lang: Langs) => {
		outputDlList.push({
			_animeFolder: title,
			finished: false,
			folder: 'Season ' + season,
			file: `${title} St.${season} Flg.${episode}_${lang}`,
			url: `${reference}/staffel-${season}/episode-${episode}`,
			m3u8: '',
		});
	};
	const addtoOutputListMovie = (title, reference, movieTitle, movieIdx, lang) => {
		outputDlList.push({
			_animeFolder: title,
			finished: false,
			folder: 'Movies',
			file: `${movieTitle}_${lang}`,
			url: `${reference}/filme/film-${movieIdx}`,
			m3u8: '',
		});
	};

	for (const aniworldSeries of compare) {
		const localSeries = series.find((e) => e.ID == aniworldSeries.ID);
		const ignoranceObject = ignoranceList.find((x) => x.ID == aniworldSeries.ID) || ({} as IgnoranceItem);
		console.log('-----=====', localSeries.title, '=====-----   START');
		for (const _aniworldSeasonIDX in aniworldSeries.seasons) {
			const aniworldSeasonIDX = Number(_aniworldSeasonIDX);

			const aniworldSeason = aniworldSeries.seasons[aniworldSeasonIDX];
			const localSeason = localSeries.seasons.find((x) => x[0].season == aniworldSeasonIDX + 1);
			if (!localSeason) {
				console.log('Missing Season:', aniworldSeasonIDX + 1, 'with', aniworldSeason.length, 'Episode/s');
				let ignoranceSkip = true;
				for (const _episodeIDX in aniworldSeason) {
					const episodeIDX = Number(_episodeIDX);
					const episode = aniworldSeason[episodeIDX];
					const language = episode.langs.find((e) => ['GerDub', 'GerSub', 'EngSub'].find((x) => x.includes(e)));
					if (ignoranceObject?.lang !== undefined && language !== ignoranceObject?.lang) {
						continue;
					}
					ignoranceSkip = false;
					addtoOutputList(localSeries.title, localSeries.references.aniworld, aniworldSeasonIDX + 1, episodeIDX + 1, language);
				}
				console.log(' => Skipped due to the ignorance list', ignoranceObject);
				continue;
			}
			for (const _aniworldEpisodeIDX in aniworldSeason) {
				const aniworldEpisodeIDX = Number(_aniworldEpisodeIDX);
				const aniworldEpisode = aniworldSeason[aniworldEpisodeIDX];
				const localEpisode = localSeason.find((x) => x.episode == aniworldEpisodeIDX + 1);

				if (!localEpisode) {
					// console.log(aniworldSeasonIDX, aniworldEpisodeIDX, localSeason.find((x) => x.episode == aniworldEpisodeIDX), localSeason.find((x) => x.episode == aniworldEpisodeIDX + 1));
					console.log('The whole Episode is missing Season:', aniworldSeasonIDX + 1, 'Episode:', aniworldEpisodeIDX + 1);
					const language = aniworldEpisode.langs.find((e) => ['GerDub', 'GerSub', 'EngSub'].find((x) => x.includes(e)));
					console.log('Started the language Decision Process Aniworld Langs:', aniworldEpisode.langs, 'Resulted in', { language });
					if (ignoranceObject?.lang !== undefined && language !== ignoranceObject?.lang) {
						console.log('Ignored due to the ignorance List');
						continue;
					}
					addtoOutputList(localSeries.title, localSeries.references.aniworld, aniworldSeasonIDX + 1, aniworldEpisodeIDX + 1, language);
					continue;
				}
				if (aniworldEpisode.langs.includes('GerDub') && !localEpisode.langs.includes('GerDub')) {
					console.log('The German Dub is missing in Season:', aniworldSeasonIDX + 1, 'Episode:', aniworldEpisodeIDX + 1);
					addtoOutputList(localSeries.title, localSeries.references.aniworld, aniworldSeasonIDX + 1, aniworldEpisodeIDX + 1, 'GerDub');
				}
			}
		}
		//TODO: Add the movies too
		if (aniworldSeries.hasMovies) {
			for (const _aniworldMovieIDX in aniworldSeries.movies) {
				const aniworldMovieIDX = Number(_aniworldMovieIDX);
				const aniworldMovie = aniworldSeries.movies[aniworldMovieIDX];

				aniworldMovie.secondName = sanitizeFileName(aniworldMovie.secondName);

				const localMovie = localSeries.movies.find((x) => similar(aniworldMovie.secondName, x.primaryName) > 50);

				if (!localMovie) {
					console.log('Missing Movie:', aniworldMovie.secondName, 'IDX:', aniworldMovieIDX + 1);
					const language = aniworldMovie.langs.find((e) => ['GerDub', 'GerSub', 'EngSub'].find((x) => x.includes(e)));
					console.log('Started the language Decision Process Aniworld Langs:', aniworldMovie.langs, 'Resulted in', { language });
					if (ignoranceObject?.lang !== undefined && language !== ignoranceObject?.lang) {
						console.log('Ignored due to the ignorance List');
						continue;
					}
					addtoOutputListMovie(localSeries.title, localSeries.references.aniworld, aniworldMovie.secondName, aniworldMovieIDX + 1, language);
					continue;
				} else {
					if (aniworldMovie.langs.includes('GerDub') && !localMovie.langs.includes('GerDub')) {
						console.log('The German Dub is missing in Movie:', aniworldMovie.secondName, 'IDX:', aniworldMovieIDX + 1);
						addtoOutputList(localSeries.title, localSeries.references.aniworld, aniworldMovie.secondName, aniworldMovieIDX + 1, 'GerDub');
					}
				}
			}
		}
		console.log('-----=====', localSeries.title, '=====-----   END');
	}

	console.log(outputDlList.length);
	fs.writeFileSync('dlList.json', JSON.stringify(outputDlList, null, 3));

	// for (const aniworldSeries of compare) {
	// 	const currentSeries = series.find((e) => e.ID == aniworldSeries.ID);

	// 	//Check if there are the same number of seasons
	// 	const numberSeasons = aniworldSeries.seasons.length == currentSeries.seasons.length;

	// 	//TODO: Combine the diff and lnaguage check into one loop to save some computation + make it look cleaner

	// 	//Check if there are episode differences
	// 	const diff = aniworldSeries.seasons.map((e, i) => ({
	// 		value: currentSeries.seasons?.[i]?.length == e.length,
	// 		diff: e.length - currentSeries.seasons?.[i]?.length,
	// 	}));

	// 	//Check if there are language losses
	// 	const languages = aniworldSeries.seasons.map((s, i) => [
	// 		...s.map((e, j) => {
	// 			const episodeCurrent = currentSeries.seasons?.[i]?.[j];
	// 			const currFilteredLangs = episodeCurrent?.langs.filter((e) => e === 'GerDub');
	// 			const newFilteredLangs = e.langs.filter((e) => e === 'GerDub');
	// 			return {
	// 				info: { ID: aniworldSeries.ID, season: episodeCurrent?.season, episode: episodeCurrent?.episode },
	// 				value: currFilteredLangs?.length == newFilteredLangs?.length,
	// 			};
	// 		}),
	// 	]);

	// 	const langThere = languages.map((s) => s.filter((x) => !x.value)).flat();

	// 	if (numberSeasons == false || diff.some((v) => v.diff > 0 || isNaN(v.diff)) || langThere.length > 0) {
	// 		console.log(currentSeries.title);
	// 		console.log('  =>', numberSeasons, diff);
	// 		if (langThere.length >= 0) {
	// 			console.log('  langThere =>', langThere.length);
	// 		}
	// 	}
	// }
}

interface ZoroSerieCompare {
	ID: string;
	title: string;
	references: SerieReference;
	seasons: ExtendedZoroEpisode[][];
	movies: ExtendedZoroEpisode[];
}

async function compareForNewReleasesZoro(series: Serie[], ignoranceList: IgnoranceItem[]) {
	const limit = promiseLimit(10);
	const data = series.filter((x) => x.references?.zoro);

	const compare: ZoroSerieCompare[] = await Promise.all(
		data.map(async (serie) => {
			return limit(() => {
				return new Promise(async (res, _) => {
					const out = {
						movies: [],
						seasons: [],
					};
					if (typeof serie.references.zoro == 'string') {
						const zoro = new Zoro(serie.references.zoro);
						const { episodes } = await zoro.getExtendedEpisodeList();
						out.seasons.push(episodes);
					} else {
						for (const [key, value] of Object.entries(serie.references.zoro)) {
							if (key.startsWith('Season-')) {
								const number = parseInt(key.replace('Season-', ''));
								const zoro = new Zoro(value);
								const { episodes } = await zoro.getExtendedEpisodeList();
								out.seasons[number - 1] = episodes;
							} else {
							}
						}
					}
					res({
						ID: serie.ID,
						title: serie.title,
						references: serie.references,
						...out,
					});
				});
			});
		})
	);
	const outputDlList = [];

	console.log(compare[0].seasons);
}

export { compareForNewReleases, compareForNewReleasesAniWorld, compareForNewReleasesZoro };
