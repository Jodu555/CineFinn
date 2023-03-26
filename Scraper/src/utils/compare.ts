import { ExtendedEpisodeDownload } from './types';
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

interface ZoroSerieCompare {
	ID: string;
	title: string;
	references: SerieReference;
	seasons: ChangedZoroEpisode[][];
	movies: ExtendedZoroEpisode[];
}

interface ChangedZoroEpisode extends Omit<ExtendedZoroEpisode, 'langs'> {
	langs: Langs[];
}

async function compareForNewReleases(series: Serie[], ignoranceList: IgnoranceItem[]) {
	const output: ExtendedEpisodeDownload[] = [];

	console.log('------ Compare Aniworld ------');
	const aniworld = await compareForNewReleasesAniWorld(series, ignoranceList);
	console.log('------ Compare Aniworld ------');

	console.log('------ Compare Zoro ------');
	const zoro = await compareForNewReleasesZoro(series, ignoranceList);
	console.log('------ Compare Zoro ------');

	fs.writeFileSync('dlListAniworld.json', JSON.stringify(aniworld, null, 3));
	fs.writeFileSync('dlListZoro.json', JSON.stringify(zoro, null, 3));
}

async function compareForNewReleasesAniWorld(
	series: Serie[],
	ignoranceList: IgnoranceItem[],
	inherit: boolean = true
): Promise<ExtendedEpisodeDownload[]> {
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
	const outputDlList: ExtendedEpisodeDownload[] = [];

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
	if (inherit) {
		return outputDlList;
	} else {
		fs.writeFileSync('dlList.json', JSON.stringify(outputDlList, null, 3));
		return [];
	}
}

function changeEpisode(ep: any): ChangedZoroEpisode {
	ep.langs = ep.langs.map((x: String) => {
		if (x == 'sub') {
			return 'EngSub';
		} else {
			return 'EngDub';
		}
	});
	return ep as ChangedZoroEpisode;
}

async function compareForNewReleasesZoro(
	series: Serie[],
	ignoranceList: IgnoranceItem[],
	inherit: boolean = true
): Promise<ExtendedEpisodeDownload[]> {
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
						out.seasons.push(episodes.map(changeEpisode));
					} else {
						for (const [key, value] of Object.entries(serie.references.zoro)) {
							if (key.startsWith('Season-')) {
								const number = parseInt(key.replace('Season-', ''));
								const zoro = new Zoro(value);
								const { episodes } = await zoro.getExtendedEpisodeList();

								out.seasons[number - 1] = episodes.map(changeEpisode);
							} else {
								//TODO: Do Movie stuff later here
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
	const outputDlList: ExtendedEpisodeDownload[] = [];

	const addtoOutputList = (url: string, title: string, season: number, episode: number, lang: Langs) => {
		// console.log('addtoOutputList', url, lang);

		outputDlList.push({
			_animeFolder: title,
			finished: false,
			folder: 'Season ' + season,
			file: `${title} St.${season} Flg.${episode}_${lang}`,
			url: `${url}`,
			m3u8: '',
		});
	};

	for (const zoroSeries of compare) {
		const localSeries = series.find((e) => e.ID == zoroSeries.ID);
		const ignoranceObject = ignoranceList.find((x) => x.ID == zoroSeries.ID) || ({} as IgnoranceItem);
		console.log('-----=====', localSeries.title, '=====-----   START');
		for (const _zoroSeasonIDX in zoroSeries.seasons) {
			const zoroSeasonIDX = Number(_zoroSeasonIDX);

			const zoroSeason = zoroSeries.seasons[zoroSeasonIDX];
			const localSeason = localSeries.seasons.find((x) => x[0].season == zoroSeasonIDX + 1);
			if (!localSeason) {
				console.log('Missing Season:', zoroSeasonIDX + 1, 'with', zoroSeason.length, 'Episode/s');
				let ignoranceSkip = true;
				for (const _episodeIDX in zoroSeason) {
					const episodeIDX = Number(_episodeIDX);
					const episode = zoroSeason[episodeIDX];
					const language = episode.langs.find((e) => ['EngDub'].find((x) => x.includes(e)));
					if (ignoranceObject?.lang !== undefined && language !== ignoranceObject?.lang) {
						continue;
					}
					ignoranceSkip = false;

					addtoOutputList(episode.url, localSeries.title, zoroSeasonIDX + 1, episodeIDX + 1, language);
				}
				console.log(' => Skipped due to the ignorance list', ignoranceObject);
				continue;
			}
			for (const _zoroEpisodeIDX in zoroSeason) {
				const zoroEpisodeIDX = Number(_zoroEpisodeIDX);
				const zoroEpisode = zoroSeason[zoroEpisodeIDX];
				const localEpisode = localSeason.find((x) => x.episode == zoroEpisodeIDX + 1);

				if (!localEpisode) {
					// console.log(zoroSeasonIDX, zoroEpisodeIDX, localSeason.find((x) => x.episode == zoroEpisodeIDX), localSeason.find((x) => x.episode == zoroEpisodeIDX + 1));
					console.log('The whole Episode is missing Season:', zoroSeasonIDX + 1, 'Episode:', zoroEpisodeIDX + 1);
					const language = zoroEpisode.langs.find((e) => ['EngDub'].find((x) => x.includes(e)));
					console.log('Started the language Decision Process zoro Langs:', zoroEpisode.langs, 'Resulted in', { language });
					if (ignoranceObject?.lang !== undefined && language !== ignoranceObject?.lang) {
						console.log('Ignored due to the ignorance List');
						continue;
					}

					if (language == undefined) {
						console.log('Ignored due to undefined');
						continue;
					}

					addtoOutputList(zoroEpisode.url, localSeries.title, zoroSeasonIDX + 1, zoroEpisodeIDX + 1, language);
					continue;
				}

				if (zoroEpisode.langs.includes('EngDub') && !localEpisode.langs.includes('EngDub')) {
					console.log('The EngDub is missing in Season:', zoroSeasonIDX + 1, 'Episode:', zoroEpisodeIDX + 1);
					addtoOutputList(zoroEpisode.url, localSeries.title, zoroSeasonIDX + 1, zoroEpisodeIDX + 1, 'EngDub');
				}
			}
		}
		console.log('-----=====', localSeries.title, '=====-----   END');
	}

	console.log(outputDlList.length);
	if (inherit) {
		return outputDlList;
	} else {
		fs.writeFileSync('dlList.json', JSON.stringify(outputDlList, null, 3));
		return [];
	}
}

export { compareForNewReleases, compareForNewReleasesAniWorld, compareForNewReleasesZoro };
