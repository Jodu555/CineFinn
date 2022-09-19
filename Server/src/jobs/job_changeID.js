const fs = require('fs');


module.exports = {
    //This job i wrote cause aproximately it happens over and over that i tweak the series object definition
    help: {
        description: 'This job changes the seriesID from x to y',
        options: ['from', 'to']
    },
    run: (options) => {

        console.log(process.env.PREVIEW_IMGS_PATH);

        //Change in the config
        //Change the preview images folder

    }
}