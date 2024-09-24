import path from 'path';
import { getSeries } from '../utils/utils';
import { SerieReference, SerieInfo, SerieObject, Langs, SerieEpisodeObject, SerieMovieObject } from '../types/classes';

class Series {
	ID: string;
	categorie: string;
	title: string;
	movies: Movie[];
	seasons: Episode[][];
	references: SerieReference;
	infos: SerieInfo;
	constructor(ID: string, categorie: string, title: string, movies: Movie[] = [], seasons: Episode[][] = [], references = {}, infos = {}) {
		this.ID = ID;
		this.categorie = categorie;
		this.title = title;
		this.seasons = seasons;
		this.movies = movies;
		this.references = references;
		this.infos = infos;
	}

	static fromObject(o: SerieObject) {
		const mappedSeasons = o?.seasons?.map((v) => v.map((e) => Episode.fromObject(e)));
		const mappedMovies = o?.movies?.map((v) => Movie.fromObject(v));
		return new Series(o.ID, o.categorie, o.title, mappedMovies, mappedSeasons, o.references, o?.infos);
	}
}

class Episode {
	filePath: string;
	primaryName: string;
	secondaryName: string;
	season: number;
	episode: number;
	langs: Langs[];
	subID: string;
	constructor(filePath: string, primaryName: string, secondaryName: string, season: number, episode: number, langs: Langs[], subID: string = 'main') {
		this.filePath = filePath;
		this.primaryName = primaryName;
		this.secondaryName = secondaryName;
		this.season = season;
		this.episode = episode;
		this.langs = langs;
		this.subID = subID;
	}

	static fromObject(o: SerieEpisodeObject) {
		return new Episode(o.filePath, o.primaryName, o.secondaryName, o.season, o.episode, o.langs, o.subID);
	}
}

class Movie {
	filePath: string;
	primaryName: string;
	secondaryName: string;
	langs: Langs[];
	subID: string;
	constructor(filePath: string, primaryName: string, secondaryName: string, langs: Langs[], subID: string = 'main') {
		this.filePath = filePath;
		this.primaryName = primaryName;
		this.secondaryName = secondaryName;
		this.langs = langs;
		this.subID = subID;
	}

	static fromObject(o: SerieMovieObject) {
		return new Movie(o.filePath, o.primaryName, o.secondaryName, o.langs, o.subID);
	}
}

const cleanupSeriesBeforeFrontResponse = (series: Series[]) => {
	//To Ensure that every deep object linking is removed
	series = JSON.parse(JSON.stringify(series));
	return series.map((serie) => {
		const newSeasons = serie.seasons.map((season) =>
			season.map((p) => {
				return { ...p, filePath: path.parse(p.filePath).base };
			})
		);
		const newMovies = serie.movies.map((p) => {
			return { ...p, filePath: path.parse(p.filePath).base };
		});
		// delete serie.references;
		return {
			...serie,
			seasons: newSeasons,
			movies: newMovies,
		};
	});
};

export interface ParsedInformation {
	movie: boolean;
	title: string;
	language: Langs;
	season?: number;
	episode?: number;
	movieTitle?: string;
}

const filenameParser = (filepath: string, filename: string): ParsedInformation | never => {
	// filename exp. Food Wars! Shokugeki no Sōma St#1 Flg#1.mp4

	interface pars {
		re: RegExp;
		parse: (match: RegExpExecArray) => ParsedInformation;
	}

	const parsers: pars[] = [
		{
			//v1 Episode Parser
			re: /^(.*)St#(\d+) Flg#(\d+).mp4/gi,
			parse: (match) => {
				const [original, title, season, episode] = match;
				return { movie: false, title: title.trim(), season: Number(season), episode: Number(episode), language: 'GerDub' } as ParsedInformation;
			},
		},
		{
			//v2 Episode Parser
			re: /^(.*)St#(\d+) Flg#(\d+)_(GerSub|GerDub|EngDub|EngSub|JapDub).mp4/gi,
			parse: (match) => {
				const [original, title, season, episode, language] = match;
				return { movie: false, title: title.trim(), season: Number(season), episode: Number(episode), language } as ParsedInformation;
			},
		},
		{
			//v2 Movie Parser
			re: /^(.*)_(GerSub|GerDub|EngDub|EngSub|JapDub)\.mp4/gi,
			parse: (match) => {
				// console.log(`match`, match);
				const [original, movieTitle, language] = match;
				const title = path.basename(path.dirname(path.dirname(filepath)));
				return { movie: true, title, movieTitle, language } as ParsedInformation;
			},
		},
		{
			//v1 Movie Parser
			re: /^(.*)\.mp4/gi,
			parse: (match) => {
				const [original, movieTitle] = match;
				const title = path.basename(path.dirname(path.dirname(filepath)));
				return { movie: true, title, movieTitle, language: 'GerDub' } as ParsedInformation;
			},
		},
	];

	let found = false;
	let output = {};
	for (const parser of parsers) {
		const match = parser.re.exec(filename);
		// console.log(parser.re, match);
		if (match != null) {
			found = true;
			output = parser.parse(match);
			break;
		}
	}
	if (!found) {
		console.log('No Parser found for', found, filename);
		throw new Error(['No Parser found for', found, filename].join(' '));
	}
	return output as ParsedInformation;
};

async function getVideoEntity(seriesID: string, season: number, episode: number): Promise<Episode> {
	const serie = (await getSeries()).find((x) => x.ID == seriesID);
	// Long (Especially when there are 50 seasons with 100 episodes each)
	// const entity = serie.seasons.flat().find(x => x.season == season && x.episode == episode);
	let entity: Episode;
	const seasonIndex = serie.seasons.findIndex((x) => x[0].season == season);
	if (seasonIndex == -1) return null;
	entity = serie.seasons[seasonIndex].find((x) => x.episode == episode);
	return entity;
}

async function getVideoMovie(seriesID: string, movieID: number): Promise<Movie> {
	const serie = (await getSeries()).find((x) => x.ID == seriesID);
	return serie.movies[movieID - 1];
}

export { Series, Episode, Movie, filenameParser, cleanupSeriesBeforeFrontResponse, getVideoEntity, getVideoMovie };
