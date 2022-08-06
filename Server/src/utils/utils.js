const fs = require('fs');
const { crawlAndIndex } = require("./crawler");
const outputFileName = 'out.json';

let series = null;
let activeJobs = [
];
let io = null;



const getSeries = (forceLoad = false) => {
    if (forceLoad || !series) {
        if (fs.existsSync(outputFileName) && !forceLoad) {
            console.log('Loaded series from file');
            series = JSON.parse(fs.readFileSync(outputFileName, 'utf8'));
        } else {
            console.log('Recrawled the series');
            series = crawlAndIndex(cb);
            fs.writeFileSync(outputFileName, JSON.stringify(series, null, 3), 'utf8');
        }
    }
    return series;
};

const setSeries = async (_series) => {
    series = _series;
    fs.writeFileSync(outputFileName, JSON.stringify(series, null, 3), 'utf8');
}

const getActiveJobs = () => activeJobs;
const setActiveJobs = (_activeJobs) => activeJobs = _activeJobs;

const getIO = () => io;
const setIO = (_io) => io = _io;


module.exports = {
    getSeries,
    setSeries,
    getActiveJobs,
    setActiveJobs,
    getIO,
    setIO
}