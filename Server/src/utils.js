const { crawlAndIndex } = require("./utils/crawler");

let series = null;



const getSeries = () => {
    if (!series) {
        if (fs.existsSync('out.json')) {
            series = JSON.parse(fs.readFileSync('out.json', 'utf8'));
        } else {
            series = crawlAndIndex();
            fs.writeFileSync('out.json', JSON.stringify(series), 'utf8');
        }
    }
    return series;
};


module.exports = {
    getSeries
}