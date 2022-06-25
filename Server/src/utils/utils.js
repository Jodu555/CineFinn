const fs = require('fs');
const { crawlAndIndex } = require("./crawler");
const outputFileName = 'out.json';

let series = null;
let activeJobs = [
    {
        identifier: 'scrape',
        name: 'Rescraping the archive',
        startTime: Date.now(),
        data: {},
    }
];



const getSeries = (forceLoad = false) => {
    if (forceLoad || !series) {
        if (fs.existsSync(outputFileName) && !forceLoad) {
            console.log('Loaded series from file');
            series = JSON.parse(fs.readFileSync(outputFileName, 'utf8'));
        } else {
            console.log('Recrawled the series');
            series = crawlAndIndex();
            fs.writeFileSync(outputFileName, JSON.stringify(series, null, 3), 'utf8');
        }
    }
    return series;
};

const getActiveJobs = () => activeJobs;


module.exports = {
    getSeries,
    getActiveJobs
}