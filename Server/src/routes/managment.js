const { Database } = require('@jodu555/mysqlapi');
const database = Database.getDatabase();
const express = require('express');
const { cleanupSeriesBeforeFrontResponse } = require('../classes/series');
const { crawlAndIndex } = require('../utils/crawler');
const { generateImages, validateImages } = require('../utils/images');
const { getActiveJobs, setActiveJobs, getSeries, setSeries, toAllSockets } = require('../utils/utils');
const router = express.Router();

const LOOKUP = {
    crawl: { name: 'Recrawl the archive', callpoint: '/job/crawl' },
    generate: { name: 'Generating Preview-Images', callpoint: '/job/img/generate' },
    validator: { name: 'Validating Preview-Images', callpoint: '/job/img/validate' },
}

const callpointToEvent = (callpoint) => `${callpoint.replace('/', '').replaceAll('/', '_')}-end`;

Promise.all(Object.keys(LOOKUP).map(async id => {
    const jobDB = await database.get('jobs').getOne({ ID: id });
    if (jobDB) {
        const lastRun = jobDB.lastRun ? Number(jobDB.lastRun) : undefined;
        LOOKUP[id] = { ...LOOKUP[id], lastRun };
    } else {
        database.get('jobs').create({ ID: id, lastRun: '' });
    }
    return id;
}));


router.use((req, res, next) => {
    const jobID = Object.keys(LOOKUP).find(v => LOOKUP[v].callpoint == req.path);
    if (jobID) {
        const lastRun = Date.now();
        database.get('jobs').update({ ID: jobID }, { lastRun });
        LOOKUP[jobID] = { ...LOOKUP[jobID], lastRun };
    }
    next();
});

router.get('/jobs/info', (req, res, next) => {
    const response = [];
    Object.keys(LOOKUP).forEach(id => {
        response.push({
            id,
            ...LOOKUP[id],
            running: Boolean(getActiveJobs().find(x => x.id == id)),
        });
    });
    res.json(response);
});

router.get('/job/img/generate', (req, res, next) => {
    const id = 'generate';
    const job = getActiveJobs().find(x => x.id == id);
    if (job) {
        const error = new Error('Job is already running!')
        next(error);
    } else {
        getActiveJobs().push({
            id,
            name: LOOKUP[id].name,
            startTime: Date.now(),
            data: {},
        });
        generateImages(getSeries(), async () => {
            setActiveJobs(getActiveJobs().filter(x => x.id !== id));
            toAllSockets(s => { s.emit(callpointToEvent(LOOKUP[id].callpoint)) }, s => s.auth.type == 'client');
        });
        res.json(getActiveJobs());
    }
});

router.get('/job/img/validate', (req, res, next) => {
    const id = 'validator';
    const job = getActiveJobs().find(x => x.id == id);
    if (job) {
        const error = new Error('Job is already running!')
        next(error);
    } else {
        getActiveJobs().push({
            id,
            name: LOOKUP[id].name,
            startTime: Date.now(),
            data: {},
        });
        validateImages(getSeries(), async () => {
            setActiveJobs(getActiveJobs().filter(x => x.id !== id));
            toAllSockets(s => { s.emit(callpointToEvent(LOOKUP[id].callpoint)) }, s => s.auth.type == 'client');
        });
        res.json(getActiveJobs());
    }
});

router.get('/job/crawl', (req, res, next) => {
    const id = 'crawl';
    const job = getActiveJobs().find(x => x.id == id);
    if (job) {
        const error = new Error('Job is already running!')
        next(error);
    } else {
        getActiveJobs().push({
            id,
            name: LOOKUP[id].name,
            startTime: Date.now(),
            data: {},
        });
        setSeries(crawlAndIndex());
        setTimeout(async () => {
            setActiveJobs(getActiveJobs().filter(x => x.id !== id));
            toAllSockets(s => {
                s.emit(callpointToEvent(LOOKUP[id].callpoint))
                s.emit('reloadSeries', cleanupSeriesBeforeFrontResponse(getSeries()));
            }, s => s.auth.type == 'client');
        }, 3600);
        res.json(getActiveJobs());
    }
});

module.exports = { router }