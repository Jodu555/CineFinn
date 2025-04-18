import * as fs from 'fs';
const promiseLimit = require('promise-limit');
const sanitizeFilename = require('sanitize-filename');
import Aniworld from '../class/Aniworld';
const { similar } = require('./utils');
import Zoro from '../class/Zoro';
import { SerieReference, Langs, Serie, IgnoranceItem, ExtendedEpisodeDownload, SerieEntity } from '@Types/classes';
import { AniWorldSeriesInformations, ExtendedZoroEpisode, AniWorldEntity } from '@Types/scrapers';

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

export interface ChangedZoroEpisode extends Omit<ExtendedZoroEpisode, 'langs'> {
	langs: Langs[];
}

interface CheckProvider {
	sto: boolean;
	aniworld: boolean;
	zoro: boolean;
}

async function compareForNewReleases(series: Serie[], ignoranceList: IgnoranceItem[], providerCheck?: CheckProvider) {
	const output: ExtendedEpisodeDownload[] = [];

	let sto: ExtendedEpisodeDownload[] = [];
	let aniworld: ExtendedEpisodeDownload[] = [];
	let zoro: ExtendedEpisodeDownload[] = [];

	if (providerCheck.sto) {
		sto = await compareForNewReleasesProvider('STO', 'dlListSTO.json', async () => await compareForNewReleasesSTO(series, ignoranceList));
	}

	if (providerCheck.aniworld) {
		aniworld = await compareForNewReleasesProvider('Aniworld', 'dlListAniworld.json', async () => await compareForNewReleasesAniWorld(series, ignoranceList));
	}

	if (providerCheck.zoro) {
		zoro = await compareForNewReleasesProvider('Zoro', 'dlListZoro.json', async () => await compareForNewReleasesZoro(series, ignoranceList));
	}

	return {
		aniworld,
		zoro,
		sto,
	};
}

async function compareForNewReleasesProvider(name: string, filename: string, compareFunction: () => Promise<ExtendedEpisodeDownload[]>) {
	let output: ExtendedEpisodeDownload[] = [];
	let stats: fs.Stats | null;
	try {
		stats = fs.statSync(filename);
	} catch (error) {
		stats = null;
	}
	const lastAlteredFileMin = (Date.now() - stats?.mtimeMs) / 1000 / 60;
	if (stats != null && lastAlteredFileMin < 50) {
		//Use the previous list maybe the user re ran cause there was an error
		console.log(`------ Compare ${name} ------`);
		console.log('A Previous run from', lastAlteredFileMin, 'minutes ago was found!');
		output = JSON.parse(fs.readFileSync(filename, 'utf-8'));
		console.log(`------ Compare ${name} ------`);
		fs.writeFileSync(filename, JSON.stringify(output, null, 3));
	} else {
		//LETS CHECK IT
		console.log(`------ Compare ${name} ------`);
		output = await compareFunction();
		console.log(`------ Compare ${name} ------`);
		fs.writeFileSync(filename, JSON.stringify(output, null, 3));
	}
	return output;
}

async function compareForNewReleasesAniWorld(
	series: Serie[],
	ignoranceList: IgnoranceItem[],
	inherit: boolean = true
): Promise<ExtendedEpisodeDownload[]> {
	const debug = false;
	const limit = promiseLimit(10);
	const data = series.filter((x) => x.references?.aniworld && !ignoranceList.find((v) => v.ID == x.ID && !v.lang));

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

	const addtoOutputList = (title: string, reference: string, season: number, episode: number, lang: Langs) => {
		outputDlList.push({
			_animeFolder: title,
			finished: false,
			folder: 'Season ' + season,
			file: `${title} St.${season} Flg.${episode}_${lang}`,
			url: `${reference}/staffel-${season}/episode-${episode}`,
			m3u8: '',
		});
	};
	const addtoOutputListMovie = (title: string, reference: string, movieTitle: string, movieIdx: number, lang: Langs) => {
		outputDlList.push({
			_animeFolder: title,
			finished: false,
			folder: 'Movies',
			file: `${movieTitle}_${lang}`,
			url: `${reference}/filme/film-${movieIdx}`,
			m3u8: '',
		});
	};

	interface Indices {
		aniworldSeasonIDX?: number;
		aniworldEpisodeIDX?: number;
		aniworldMovieIDX?: number;
	}

	const existingLanguageDecision = (
		isMovie: boolean,
		remoteEntity: AniWorldEntity,
		localEntity: SerieEntity,
		localSeries: Serie,
		indexes: Indices
	) => {
		let lang: Langs | undefined = undefined;

		if (remoteEntity.langs.includes('GerDub') && !localEntity.langs.includes('GerDub')) {
			lang = 'GerDub';
		}
		if (remoteEntity.langs.includes('GerSub') && !localEntity.langs.includes('GerDub') && !localEntity.langs.includes('GerSub')) {
			lang = 'GerSub';
		}

		if (lang == undefined) return;

		if (!isMovie) {
			console.log('The ' + lang + ' is missing in Season', indexes.aniworldSeasonIDX + 1, 'Episode:', indexes.aniworldEpisodeIDX + 1);
		} else {
			console.log('The ' + lang + ' is missing in Movie:', remoteEntity.secondName, 'IDX:', indexes.aniworldMovieIDX + 1);
		}
		if (!isMovie) {
			addtoOutputList(
				localSeries.title,
				localSeries.references.aniworld as string,
				indexes.aniworldSeasonIDX + 1,
				indexes.aniworldEpisodeIDX + 1,
				lang
			);
		} else {
			addtoOutputListMovie(localSeries.title, localSeries.references.aniworld as string, remoteEntity.secondName, indexes.aniworldMovieIDX + 1, lang);
		}
	};

	for (const aniworldSeries of compare) {
		const localSeries = series.find((e) => e.ID == aniworldSeries.ID);
		const ignoranceObject = ignoranceList.find((x) => x.ID == aniworldSeries.ID) || ({} as IgnoranceItem);
		console.log('-----=====', localSeries.title, '=====-----   START');
		for (const _aniworldSeasonIDX in aniworldSeries.seasons) {
			debug && console.log('Checking Season', localSeries.title, _aniworldSeasonIDX);
			const aniworldSeasonIDX = Number(_aniworldSeasonIDX);

			const aniworldSeason = aniworldSeries.seasons[aniworldSeasonIDX];
			const localSeason = localSeries.seasons.find((x) => x[0].season == aniworldSeasonIDX + 1);
			if (!localSeason) {
				console.log('Missing Season:', aniworldSeasonIDX + 1, 'with', aniworldSeason.length, 'Episode/s');
				let ignoranceSkip = true;
				for (const _episodeIDX in aniworldSeason) {
					const episodeIDX = Number(_episodeIDX);
					const episode = aniworldSeason[episodeIDX];
					const language = episode.langs.find((e) => {
						return ['GerDub', 'GerSub', 'EngSub'].find((x) => x.includes(e));
					});
					if (ignoranceObject?.lang !== undefined && language !== ignoranceObject?.lang) {
						continue;
					}
					ignoranceSkip = false;
					addtoOutputList(localSeries.title, localSeries.references.aniworld as string, aniworldSeasonIDX + 1, episodeIDX + 1, language);
				}
				if (ignoranceSkip) console.log(' => Skipped due to the ignorance Object', ignoranceObject);
				continue;
			}
			for (const _aniworldEpisodeIDX in aniworldSeason) {
				debug && console.log('Checking Episode', localSeries.title, _aniworldSeasonIDX, _aniworldEpisodeIDX);
				const aniworldEpisodeIDX = Number(_aniworldEpisodeIDX);
				const aniworldEpisode = aniworldSeason[aniworldEpisodeIDX];
				const localEpisode = localSeason.find((x) => x.episode == aniworldEpisodeIDX + 1);

				if (!localEpisode) {
					console.log('The whole Episode is missing Season:', aniworldSeasonIDX + 1, 'Episode:', aniworldEpisodeIDX + 1);
					const language = aniworldEpisode.langs.find((e) => {
						return ['GerDub', 'GerSub', 'EngSub'].find((x) => x.includes(e));
					});
					console.log('Started the language Decision Process Aniworld Langs:', aniworldEpisode.langs, 'Resulted in', { language });
					if (ignoranceObject?.lang !== undefined && language !== ignoranceObject?.lang) {
						console.log('Skipped due to the ignorance Object', ignoranceObject);
						continue;
					}
					addtoOutputList(localSeries.title, localSeries.references.aniworld as string, aniworldSeasonIDX + 1, aniworldEpisodeIDX + 1, language);
					continue;
				}
				existingLanguageDecision(false, aniworldEpisode, localEpisode, localSeries, { aniworldSeasonIDX, aniworldEpisodeIDX });
			}
		}

		if (aniworldSeries.hasMovies) {
			for (const _aniworldMovieIDX in aniworldSeries.movies) {
				const aniworldMovieIDX = Number(_aniworldMovieIDX);
				const aniworldMovie = aniworldSeries.movies[aniworldMovieIDX];
				debug && console.log('Checking Movie', localSeries.title, _aniworldMovieIDX, aniworldMovie);

				const movieName = aniworldMovie.secondName || aniworldMovie.mainName;
				aniworldMovie.secondName = sanitizeFileName(movieName);

				const localMovie = localSeries.movies.find((x) => {
					// console.log(aniworldMovie.secondName, x.primaryName, similar(aniworldMovie.secondName, x.primaryName));
					const comparisons = Math.max(similar(aniworldMovie.secondName, x.primaryName), similar(aniworldMovie.mainName, x.primaryName));
					return comparisons > 50;
					// return similar(aniworldMovie.secondName, x.primaryName) > 50;
				});

				if (!localMovie) {
					console.log('Missing Movie:', aniworldMovie.secondName, 'IDX:', aniworldMovieIDX + 1);
					const language = aniworldMovie.langs.find((e) => ['GerDub', 'GerSub', 'EngSub'].find((x) => x.includes(e)));
					console.log('Started the language Decision Process Aniworld Langs:', aniworldMovie.langs, 'Resulted in', { language });
					if (ignoranceObject?.lang !== undefined && language !== ignoranceObject?.lang) {
						console.log('Skipped due to the ignorance Object', ignoranceObject);
						continue;
					}
					addtoOutputListMovie(
						localSeries.title,
						localSeries.references.aniworld as string,
						aniworldMovie.secondName,
						aniworldMovieIDX + 1,
						language
					);
					continue;
				} else {
					// console.log('Got Local Compare Movie', localMovie, aniworldMovie);
					existingLanguageDecision(true, aniworldMovie, localMovie, localSeries, { aniworldMovieIDX });
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

async function compareForNewReleasesSTO(
	series: Serie[],
	ignoranceList: IgnoranceItem[],
	inherit: boolean = true
): Promise<ExtendedEpisodeDownload[]> {
	const debug = false;
	const limit = promiseLimit(10);
	const data = series.filter((x) => x.references?.sto && !ignoranceList.find((v) => v.ID == x.ID && !v.lang));

	const compare: AniWorldSerieCompare[] = await Promise.all(
		data.map(async (serie) => {
			return limit(() => {
				return new Promise(async (res, _) => {
					let world: Aniworld;
					if (typeof serie.references.sto == 'string') world = new Aniworld(serie.references.sto);
					debug && console.log('Started Parsing', serie.references.sto);
					const out = await world.parseInformations();
					debug && console.log('Finished Parsing', serie.references.sto);
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

	const addtoOutputList = (title: string, reference: string, season: number, episode: number, lang: Langs) => {
		outputDlList.push({
			_animeFolder: title,
			finished: false,
			folder: 'Season ' + season,
			file: `${title} St.${season} Flg.${episode}_${lang}`,
			url: `${reference}/staffel-${season}/episode-${episode}`,
			m3u8: '',
		});
	};
	const addtoOutputListMovie = (title: string, reference: string, movieTitle: string, movieIdx: number, lang: Langs) => {
		outputDlList.push({
			_animeFolder: title,
			finished: false,
			folder: 'Movies',
			file: `${movieTitle}_${lang}`,
			url: `${reference}/filme/film-${movieIdx}`,
			m3u8: '',
		});
	};

	interface Indices {
		aniworldSeasonIDX?: number;
		aniworldEpisodeIDX?: number;
		aniworldMovieIDX?: number;
	}

	const existingLanguageDecision = (
		isMovie: boolean,
		remoteEntity: AniWorldEntity,
		localEntity: SerieEntity,
		localSeries: Serie,
		indexes: Indices
	) => {
		let lang: Langs | undefined = undefined;

		if (remoteEntity.langs.includes('GerDub') && !localEntity.langs.includes('GerDub')) {
			lang = 'GerDub';
		}
		if (remoteEntity.langs.includes('GerSub') && !localEntity.langs.includes('GerDub') && !localEntity.langs.includes('GerSub')) {
			lang = 'GerSub';
		}

		if (lang == undefined) return;

		if (!isMovie) {
			console.log('The ' + lang + ' is missing in Season', indexes.aniworldSeasonIDX + 1, 'Episode:', indexes.aniworldEpisodeIDX + 1);
		} else {
			console.log('The ' + lang + ' is missing in Movie:', remoteEntity.secondName, 'IDX:', indexes.aniworldMovieIDX + 1);
		}
		if (!isMovie) {
			addtoOutputList(localSeries.title, localSeries.references.sto as string, indexes.aniworldSeasonIDX + 1, indexes.aniworldEpisodeIDX + 1, lang);
		} else {
			addtoOutputListMovie(localSeries.title, localSeries.references.sto as string, remoteEntity.secondName, indexes.aniworldMovieIDX + 1, lang);
		}
	};

	for (const aniworldSeries of compare) {
		const localSeries = series.find((e) => e.ID == aniworldSeries.ID);
		const ignoranceObject = ignoranceList.find((x) => x.ID == aniworldSeries.ID);
		console.log('-----=====', localSeries.title, '=====-----   START');
		for (const _aniworldSeasonIDX in aniworldSeries.seasons) {
			debug && console.log('Checking Season', localSeries.title, _aniworldSeasonIDX);

			const aniworldSeasonIDX = Number(_aniworldSeasonIDX);

			const aniworldSeason = aniworldSeries.seasons[aniworldSeasonIDX];
			const localSeason = localSeries.seasons.find((x) => x[0].season == aniworldSeasonIDX + 1);
			if (!localSeason) {
				console.log('Missing Season:', aniworldSeasonIDX + 1, 'with', aniworldSeason.length, 'Episode/s');
				let ignoranceSkip = true;
				for (const _episodeIDX in aniworldSeason) {
					const episodeIDX = Number(_episodeIDX);
					const episode = aniworldSeason[episodeIDX];
					const language = episode.langs.find((e) => {
						return ['GerDub', 'GerSub', 'EngSub', 'EngDub'].find((x) => x.includes(e));
					});
					if (ignoranceObject != undefined && ignoranceObject?.lang !== undefined && language !== ignoranceObject?.lang) {
						continue;
					}
					ignoranceSkip = false;
					addtoOutputList(localSeries.title, localSeries.references.sto as string, aniworldSeasonIDX + 1, episodeIDX + 1, language);
				}
				if (ignoranceSkip) console.log(' => Skipped due to the ignorance Object', ignoranceObject);
				continue;
			}
			for (const _aniworldEpisodeIDX in aniworldSeason) {
				debug && console.log('Checking Episode', localSeries.title, _aniworldSeasonIDX, _aniworldEpisodeIDX);
				const aniworldEpisodeIDX = Number(_aniworldEpisodeIDX);
				const aniworldEpisode = aniworldSeason[aniworldEpisodeIDX];
				const localEpisode = localSeason.find((x) => x.episode == aniworldEpisodeIDX + 1);

				if (!localEpisode) {
					console.log('The whole Episode is missing Season:', aniworldSeasonIDX + 1, 'Episode:', aniworldEpisodeIDX + 1);
					const language = aniworldEpisode.langs.find((e) => {
						return ['GerDub', 'GerSub', 'EngSub', 'EngDub'].find((x) => x.includes(e));
					});
					console.log('Started the language Decision Process Aniworld Langs:', aniworldEpisode.langs, 'Resulted in', { language });
					if (ignoranceObject?.lang !== undefined && language !== ignoranceObject?.lang) {
						console.log('Skipped due to the ignorance Object', ignoranceObject);
						continue;
					}
					addtoOutputList(localSeries.title, localSeries.references.sto as string, aniworldSeasonIDX + 1, aniworldEpisodeIDX + 1, language);
					continue;
				}
				existingLanguageDecision(false, aniworldEpisode, localEpisode, localSeries, { aniworldSeasonIDX, aniworldEpisodeIDX });
			}
		}

		if (aniworldSeries.hasMovies) {
			for (const _aniworldMovieIDX in aniworldSeries.movies) {
				const aniworldMovieIDX = Number(_aniworldMovieIDX);
				const aniworldMovie = aniworldSeries.movies[aniworldMovieIDX];
				debug && console.log('Checking Movie', localSeries.title, _aniworldMovieIDX, aniworldMovie);

				const movieName = aniworldMovie.secondName || aniworldMovie.mainName;
				aniworldMovie.secondName = sanitizeFileName(movieName);

				const localMovie = localSeries.movies.find((x) => {
					// console.log(aniworldMovie.secondName, x.primaryName, similar(aniworldMovie.secondName, x.primaryName));
					const comparisons = Math.max(similar(aniworldMovie.secondName, x.primaryName), similar(aniworldMovie.mainName, x.primaryName));
					return comparisons > 50;
				});

				if (!localMovie) {
					console.log('Missing Movie:', aniworldMovie.secondName, 'IDX:', aniworldMovieIDX + 1);
					const language = aniworldMovie.langs.find((e) => ['GerDub', 'GerSub', 'EngSub', 'EngDub'].find((x) => x.includes(e)));
					console.log('Started the language Decision Process Aniworld Langs:', aniworldMovie.langs, 'Resulted in', { language });
					if (ignoranceObject?.lang !== undefined && language !== ignoranceObject?.lang) {
						console.log('Skipped due to the ignorance Object', ignoranceObject);
						continue;
					}
					addtoOutputListMovie(localSeries.title, localSeries.references.sto as string, aniworldMovie.secondName, aniworldMovieIDX + 1, language);
					continue;
				} else {
					// console.log('Got Local Compare Movie', localMovie, aniworldMovie);
					existingLanguageDecision(true, aniworldMovie, localMovie, localSeries, { aniworldMovieIDX });
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

function changeEpisode(ep: ExtendedZoroEpisode): ChangedZoroEpisode {
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
	const limit = promiseLimit(2);
	const data = series.filter((x, i) => x.references?.zoro);
	// .filter((x, i) => i < 1);

	const compare: ZoroSerieCompare[] = await Promise.all(
		data.map(async (serie) => {
			return limit(() => {
				return new Promise(async (res, _) => {
					const out = {
						movies: [],
						seasons: [],
					};
					if (typeof serie.references.zoro == 'string') {
						try {
							const zoro = new Zoro(serie.references.zoro);

							const seasons = await zoro.getSeasons();
							if (seasons.length > 0) {
								for (const seasonObj of seasons) {
									const tmpZoro = new Zoro(seasonObj.ID);
									const { episodes } = await tmpZoro.getExtendedEpisodeList();
									out.seasons[parseInt(seasonObj.IDX) - 1] = episodes.map(changeEpisode);
								}
							} else {
								const { episodes } = await zoro.getExtendedEpisodeList();
								out.seasons.push(episodes.map(changeEpisode));
							}
						} catch (error) {
							console.log(error);
							console.log('Error parsing', JSON.stringify(serie, null, 3));
						}
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
					// if (ignoranceObject?.lang !== undefined && language !== ignoranceObject?.lang) {
					// 	continue;
					// }
					ignoranceSkip = false;

					addtoOutputList(episode.url, localSeries.title, zoroSeasonIDX + 1, episodeIDX + 1, language);
				}
				// console.log(' => Skipped due to the ignorance list', ignoranceObject);
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
					// if (ignoranceObject?.lang !== undefined && language !== ignoranceObject?.lang) {
					// 	console.log('Ignored due to the ignorance List');
					// 	continue;
					// }

					if (language == undefined) {
						console.log('Ignored due to undefined');
						continue;
					}

					addtoOutputList(zoroEpisode.url, localSeries.title, zoroSeasonIDX + 1, zoroEpisodeIDX + 1, language);
					continue;
				}

				if (zoroEpisode.langs.includes('EngDub') && !localEpisode.langs.includes('EngDub') && !localEpisode.langs.includes('GerDub')) {
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

export { compareForNewReleases, compareForNewReleasesAniWorld, compareForNewReleasesZoro, changeEpisode };
