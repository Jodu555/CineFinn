const fs = require('fs');
const path = require('path');
const { load, parse, save, generateStr } = require('../utils/watchString');


const getChangesMap = (from, to) => {
    const changes = new Map();
    from.forEach(se => {
        const cse = to.find(s => se.title == s.title);
        if (cse == undefined) {
            changes.set(String(se.ID), String(se.ID));
        } else {
            changes.set(String(se.ID), String(cse.ID));
        }
    });
    return changes
}

module.exports = {
    //This job i wrote cause aproximately it happens over and over that i want to change the indexing
    help: {
        description: 'This job changes the seriesID from x to y',
        options: ['from', 'to']
    },
    run: async (options) => {
        const { Database } = require('@jodu555/mysqlapi');
        const database = Database.createDatabase(process.env.DB_HOST, process.env.DB_USERNAME, process.env.DB_PASSWORD, process.env.DB_DATABASE);
        database.connect();
        require('../utils/database')();

        console.log(`options`, options);

        const from = JSON.parse(fs.readFileSync(options.from));
        const to = JSON.parse(fs.readFileSync(options.to));

        const changes = getChangesMap(from, to);

        console.log(changes);

        //Change the watchlist
        const watchStrings = await database.get('watch_strings').get({});
        for (const { account_UUID, watch_string: watchString } of watchStrings) {

            let watchSegmentList = parse(watchString);
            watchSegmentList = watchSegmentList.map(seg => {
                if (changes.has(seg.ID))
                    console.log('Watch String Change');
                return {
                    ...seg,
                    ID: changes.get(seg.ID)
                }
            });
            save(account_UUID, generateStr(watchSegmentList));
        }

        const dir = fs.readdirSync(process.env.PREVIEW_IMGS_PATH);

        dir.forEach(preID => {
            if (changes.has(preID)) {

                fs.renameSync(path.join(process.env.PREVIEW_IMGS_PATH, preID), path.join(process.env.PREVIEW_IMGS_PATH, changes.get(preID)));
            }
        });

    }
}