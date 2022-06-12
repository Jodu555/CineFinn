const fs = require('fs');
const { crawlAndIndex } = require("./utils/crawler");

let series = null;



const getSeries = () => {
    if (!series) {
        if (fs.existsSync('outs.json')) {
            series = JSON.parse(fs.readFileSync('outs.json', 'utf8'));
        } else {
            series = crawlAndIndex();
            fs.writeFileSync('outs.json', JSON.stringify(series), 'utf8');
        }
    }
    return series;
};


module.exports = {
    getSeries,
}