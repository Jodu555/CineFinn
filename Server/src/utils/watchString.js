const { Database } = require('@jodu555/mysqlapi');

/**
 * @param  {[Segment]} segmentList
 * @returns {String}
 */
const generateStr = (segmentList) => {
    let str = '';
    segmentList.forEach(segment => {
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
}

// 'ID:se-ep.time;repeat'
/**
 * @param  {String} str
 * @returns {[Segment]}
 */
const parse = (str) => {

    // const re = /(\d+):(?:(\d+)-(\d+)|(\d+))\.(\d+);/gmi;

    // const str = '2491:1-1.570;2491:1-2.5555;2491:1.0;';
    // var outp;
    // while ((outp = re.exec(str)) !== null) {
    //     // console.log(outp);
    //     let isMovie = false;
    //     const [
    //         og,
    //         ID,
    //         se,
    //         ep,
    //         movie,
    //         time
    //     ] = outp;

    //     console.log({
    //         ID,
    //         isMovie: movie != undefined,
    //         se,
    //         ep,
    //         movie,
    //         time
    //     });

    // }

    const list = str.split(';').map(s => {
        if (!(s.length > 0)) return null;
        const collenSplit = s.split(':');
        const dashSplit = collenSplit[1].split('-')
        const isMovie = dashSplit.length == 1
        const dotSplit = isMovie ? dashSplit[0].split('.') : dashSplit[1].split('.');
        if (isMovie) {
            return new Segment(collenSplit[0], -1, -1, dotSplit[0], dotSplit[1]);
        } else {
            return new Segment(collenSplit[0], dashSplit[0], dotSplit[0], -1, dotSplit[1]);
        }
    }).filter(s => s != null);
    return list;
}

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
}

/**
 * @param  {String} UUID
 * @param  {String} watchString
 */
const save = async (UUID, watchString) => {
    const database = Database.getDatabase();
    let data = await database.get('watch_strings').update({ account_UUID: UUID }, { watch_string: watchString });
}
/**
 * @param  {String} UUID
 * @param  {Object} searchCriteria
 * @param  {Function} segmentUpdateFunction
 * @returns {[Segment]}
 */
const updateSegment = async (UUID, searchCriteria, segmentUpdateFunction) => {
    const watchString = await load(UUID);
    const segmentList = parse(watchString);
    let segment = segmentList.find(segment =>
        segment.ID == searchCriteria.series &&
        segment.season == searchCriteria.season &&
        segment.episode == searchCriteria.episode &&
        segment.movie == searchCriteria.movie);

    if (!segment) {
        segment = new Segment(searchCriteria.series, searchCriteria.season, searchCriteria.episode, searchCriteria.movie, 0);
        segmentList.push(segment);
    }
    segmentUpdateFunction(segment);
    segment.calc();
    await save(UUID, generateStr(segmentList));
    return segmentList;
}

// const UUID = 'ad733837-b2cf-47a2-b968-abaa70edbffe'


// const watchString load(UUID);
// const STR = '781:1-1.0;781:1-2.50;781:1.0'
// const segList = parse(STR);

// console.log(segList);

// console.log(STR);
// console.log();
// generateStr(segList)
// console.log(STR == generateStr(segList));

// const segment = segList.find(seg => seg.ID == 781 && seg.season == 1 && seg.episode == 2);

// segment.time = 10000;
// console.log(segment);


// console.log(segList);

// save(UUID, generateStr(segList));


module.exports = {
    Segment,
    generateStr,
    parse,
    load,
    save,
    updateSegment
}