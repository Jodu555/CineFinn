const fs = require('fs');
const { load, parse } = require('../utils/watchString');


const getChangesMap = (from, to) => {
    const changes = new Map();
    from.forEach(se => {
        const cse = to.find(s => se.title == s.title);
        if (cse == undefined) {
            changes.set(se.ID, se.ID);
        } else {
            changes.set(se.ID, cse.ID);
        }
    });
    return changes
}

module.exports = {
    //This job i wrote cause aproximately it happens over and over that i tweak the series object definition
    help: {
        description: 'This job changes the seriesID from x to y',
        options: ['from', 'to']
    },
    run: (options) => {
        const { Database } = require('@jodu555/mysqlapi');
        const database = Database.createDatabase(process.env.DB_HOST, process.env.DB_USERNAME, process.env.DB_PASSWORD, process.env.DB_DATABASE);
        database.connect();
        require('../utils/database')();

        console.log(`options`, options);

        const from = JSON.parse(fs.readFileSync(options.from));
        const to = JSON.parse(fs.readFileSync(options.to));

        const changes = getChangesMap(from, to);

        console.log(changes);

        // const watchString = load(/** user_account */);
        // const watchSegmentList = parse(watchString);



        //Change the preview images folder
        //Change the watchlist

    }
}