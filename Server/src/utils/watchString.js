const generate = () => {
    //TODO: Generate the watch string by input
    console.log('FN call');
}

// 'ID:se-ep.time;repeat'
const parse = (str) => {
    //TODO: Parse the watch string to the infos
    const list = str.split(';').map(s => {
        const collenSplit = s.split(':');
        const dashSplit = collenSplit[1].split('-')
        const dotSplit = dashSplit[1].split('.')
        return new Segment(collenSplit[0], dashSplit[0], dotSplit[0], dotSplit[1]);
    });
    return list;
    console.log(list);
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

parse('781:1-1.0;781:1-2.50');