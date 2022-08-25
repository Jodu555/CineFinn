const generate = () => {
    //TODO: Generate the watch string by input
    console.log('FN call');
}

const parse = (str) => {
    //TODO: Parse the watch string to the infos
    const list = str.split(';');
    // 'ID:se-ep.time;next'
    // res.json([
    //     '781|1.0',
    //     '781|1.1',
    //     '781|1.2',
    //     '781|1.3',
    //     '781|1.5',
    //     '781|1.6',
    //     '781|1.9',
    // ])
    console.log(list);
}

const load = (UUID) => {
    //TODO: Returns the current watch string
}

parse('781:1-1.0;781:1-2.50');