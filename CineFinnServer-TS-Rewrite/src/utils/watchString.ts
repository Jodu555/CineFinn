import { Database } from '@jodu555/mysqlapi';
import { getSeries } from './utils';
import { DatabaseWatchStringItem } from '../types/database';

const generateStr = (segmentList: Segment[]): string => {
	let str = '';
	segmentList.forEach((segment) => {
		// console.log(segment);
		if (segment.movie == -1 || isNaN(segment.movie)) {
			// console.log(1, 'Normal');
			str += `${segment.ID}:${segment.season}-${segment.episode}.${segment.time};`;
		} else {
			// console.log(2, 'Movie');
			str += `${segment.ID}:${segment.movie}.${segment.time};`;
		}
	});
	return str;
};

// 'ID:se-ep.time;repeat'
const parse = (str: string): Segment[] => {
	const re = /(\w+):(?:(\d+)-(\d+)|(\d+))\.(\d+);/gim;

	const list = [];

	// const str = '2491:1-1.570;2491:1-2.5555;2491:1.0;';
	var outp;
	while ((outp = re.exec(str)) !== null) {
		// console.log(outp);
		let isMovie = false;
		const [og, ID, se = -1, ep = -1, movie = -1, time] = outp;
		list.push(new Segment(ID, se, ep, movie, time));
	}
	return list;
};

class Segment {
	ID: string;
	season: number;
	episode: number;
	movie: number;
	time: number;
	watched: boolean;
	constructor(ID: string, season: number, episode: number, movie: number, time: number) {
		this.ID = ID;
		this.season = Number(season); // 1 based (number)
		this.episode = Number(episode); // 1 based (number)
		this.movie = Number(movie);
		this.time = Number(time);
		this.watched = this.time > 300;
	}
	calc() {
		this.watched = this.time > 300;
	}
}

const load = async (UUID: string): Promise<string> => {
	const database = Database.getDatabase();
	let data = await database.get<DatabaseWatchStringItem>('watch_strings').getOne({ account_UUID: UUID });
	if (data == null || data == undefined) {
		data = { account_UUID: UUID, watch_string: '' };
		database.get('watch_strings').create(data);
	}
	return data.watch_string;
};

const save = async (UUID: string, watchString: string) => {
	const database = Database.getDatabase();
	let data = await database.get('watch_strings').update({ account_UUID: UUID }, { watch_string: watchString });
};

interface searchObject {
	series: string;
	season: number;
	episode: number;
	movie: number;
}

const updateSegment = async (UUID: string, searchCriteria: searchObject, segmentUpdateFunction: (arg0: Segment) => void): Promise<Segment[]> => {
	const watchString = await load(UUID);
	const segmentList = parse(watchString);
	let segment = segmentList.find(
		(segment) =>
			segment.ID == searchCriteria.series &&
			segment.season == searchCriteria.season &&
			segment.episode == searchCriteria.episode &&
			segment.movie == searchCriteria.movie
	);

	if (!segment) {
		segment = new Segment(searchCriteria.series, searchCriteria.season, searchCriteria.episode, searchCriteria.movie, 0);
		segmentList.push(segment);
	}
	segmentUpdateFunction(segment);
	segment.calc();
	await save(UUID, generateStr(segmentList));
	return segmentList;
};

const markSeason = async (UUID: string, seriesID: string, seasonID: number, bool: string | boolean) => {
	if (bool == 'true') bool = true;
	if (bool == 'false') bool = false;
	console.log('Marked Series', seriesID, 'Season', seasonID, 'as', bool, 'watched', 'for', UUID);

	const watchString = await load(UUID);
	let segmentList = parse(watchString);

	if (bool) {
		//Mark as watched
		//Get all episodes for the given ser{iesID and seasonID
		//IN case of watched either Update or add to the segment list time over 301
		const serie = getSeries().find((x) => x.ID == seriesID);

		const season = serie.seasons[seasonID - 1];

		//Filter out all segments that are the current series and the current season
		segmentList = segmentList.filter((segment) => {
			return segment.ID !== seriesID || segment.season !== seasonID;
		});

		segmentList.push(
			...season.map((ep) => {
				return new Segment(seriesID, seasonID, ep.episode, -1, 310);
			})
		);
	} else {
		//Mark as un-watched
		segmentList.map((segment) => {
			if (segment.ID == seriesID && segment.season == seasonID) {
				segment.time = 0;
				segment.calc();
			}
			return segment;
		});
	}

	await save(UUID, generateStr(segmentList));
	return segmentList;
};

export { Segment, generateStr, parse, load, save, updateSegment, markSeason, searchObject };
