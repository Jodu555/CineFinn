const { Database } = require('@jodu555/mysqlapi');
const { getSeries } = require('./utils');

/**
 * @param  {[Segment]} segmentList
 * @returns {String}
 */
const generateStr = (segmentList) => {
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
/**
 * @param  {String} str
 * @returns {[Segment]}
 */
const parse = (str) => {
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
	constructor(ID, season, episode, movie, time) {
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
/**
 * @param  {String} UUID account UUID
 * @returns {String} watch String
 */
const load = async (UUID) => {
	const database = Database.getDatabase();
	let data = await database.get('watch_strings').getOne({ account_UUID: UUID });
	if (data == null || data == undefined) {
		data = { account_UUID: UUID, watch_string: '' };
		database.get('watch_strings').create(data);
	}
	return data.watch_string;
};

/**
 * @param  {String} UUID
 * @param  {String} watchString
 */
const save = async (UUID, watchString) => {
	const database = Database.getDatabase();
	let data = await database.get('watch_strings').update({ account_UUID: UUID }, { watch_string: watchString });
};
/**
 * @param  {String} UUID
 * @param  {Object} searchCriteria
 * @param  {Function} segmentUpdateFunction
 * @returns {[Segment]}
 */
const updateSegment = async (UUID, searchCriteria, segmentUpdateFunction) => {
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

const markSeason = async (UUID, seriesID, seasonID, bool) => {
	if (bool == 'true') bool = true;
	if (bool == 'false') bool = false;
	const watchString = await load(UUID);
	let segmentList = parse(watchString);

	if (bool) {
		//Mark as watched
		//Get all episodes for the given ser{iesID and seasonID
		//IN case of watched either Update or add to the segment list time over 301
		const serie = getSeries().find((x) => x.ID == seriesID);

		const season = serie.seasons[seasonID - 1];

		segmentList = segmentList.filter((segment) => segment.ID !== seriesID && segment.season !== seasonID);

		console.log(segmentList.length);
		segmentList.push(
			...season.map((ep) => {
				return new Segment(seriesID, seasonID, ep.episode, -1, 310);
			})
		);
		console.log(segmentList.length);
	} else {
		//Mark as un-watched
		segmentList.map((segment) => {
			if (segment.ID == seriesID && segment.season == seasonID) {
				segment.time = 0;
				segment.calc();
				console.log('Changed', segment);
			}
			return segment;
		});
	}

	await save(UUID, generateStr(segmentList));
	return segmentList;
};

module.exports = {
	Segment,
	generateStr,
	parse,
	load,
	save,
	updateSegment,
	markSeason,
};
