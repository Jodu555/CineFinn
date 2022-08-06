const express = require('express');
const { crawlAndIndex } = require('../utils/crawler');
const { generateImages, validateImages } = require('../utils/images');
const { getActiveJobs, setActiveJobs, getSeries, getIO } = require('../utils/utils');
const router = express.Router();

const LOOKUP = {
    crawl: { name: 'Recrawl the archive', callpoint: '/job/crawl' },
    generate: { name: 'Generating Preview-Images', callpoint: '/job/img/generate' },
    validator: { name: 'Validating Preview-Images', callpoint: '/job/img/validate' },
}

const callpointToEvent = (callpoint) => `${callpoint.replace('/', '').replaceAll('/', '_')}-end`;

router.get('/jobs/info', (req, res, next) => {
    const response = [];
    Object.keys(LOOKUP).forEach(id => {
        response.push({
            id,
            ...LOOKUP[id],
            running: Boolean(getActiveJobs().find(x => x.id == id))
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
        generateImages(getSeries(), () => {
            setActiveJobs(getActiveJobs().filter(x => x.id !== id));
            const sockets = await getIO().fetchSockets();
            await Promise.all(sockets.map(async socket => {
                socket.emit(callpointToEvent(LOOKUP[id].callpoint))
            }));
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
        validateImages(getSeries(), () => {
            setActiveJobs(getActiveJobs().filter(x => x.id !== id));
            const sockets = await getIO().fetchSockets();
            await Promise.all(sockets.map(async socket => {
                socket.emit(callpointToEvent(LOOKUP[id].callpoint))
            }));
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
        crawlAndIndex();
        setTimeout(() => {
            setActiveJobs(getActiveJobs().filter(x => x.id !== id));
            const sockets = await getIO().fetchSockets();
            await Promise.all(sockets.map(async socket => {
                socket.emit(callpointToEvent(LOOKUP[id].callpoint))
            }));
        }, 3600);
        res.json(getActiveJobs());
    }
});

module.exports = { router }