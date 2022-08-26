/**
 * @param  {[Segment]} segmentList
 * @returns {String}
 */
const generateStr = (segmentList) => {
    //TODO: Generate the watch string by the segmentList input
    let str = '';
    segmentList.forEach(segment => {
        console.log(segment);
        str += `${segment.ID}:${segment.season}-${segment.episode}.${segment.time};`;
    });
    console.log(str);
    return str;
}

// 'ID:se-ep.time;repeat'
/**
 * @param  {String} str
 * @returns {[Segment]}
 */
const parse = (str) => {
    //TODO: Parse the watch string to the infos
    const list = str.split(';').map(s => {
        if (!(s.length > 0)) return null;
        const collenSplit = s.split(':');
        const dashSplit = collenSplit[1].split('-')
        const dotSplit = dashSplit[1].split('.')
        return new Segment(collenSplit[0], dashSplit[0], dotSplit[0], dotSplit[1]);
    }).filter(s => s != null);
    return list;
}

class Segment {
    constructor(ID, season, episode, time) {
        this.ID = Number(ID);
        this.season = Number(season);
        this.episode = Number(episode);
        this.time = Number(time);
    }
}

const load = (UUID) => {
    //TODO: Returns the current watch string
}

const segList = parse('781:1-1.0;781:1-2.50');

console.log(parse(generateStr(segList)));