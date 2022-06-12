const fs = require('fs');
const { crawlAndIndex } = require("./crawler");
const outputFileName = 'out.json';

let series = null;



const getSeries = () => {
    if (!series) {
        if (fs.existsSync(outputFileName)) {
            series = JSON.parse(fs.readFileSync(outputFileName, 'utf8'));
        } else {
            series = crawlAndIndex();
            fs.writeFileSync(outputFileName, JSON.stringify(series, null, 3), 'utf8');
        }
    }
    return series;
};


module.exports = {
    getSeries,
}