const express = require('express');
const { crawlAndIndex } = require('../utils/crawler');
const { genearteImages, validateImages } = require('../utils/images');
const { getActiveJobs, setActiveJobs } = require('../utils/utils');
const router = express.Router();

const LOOKUP = {
    crawl: 'Recrawl the archive',
    generate: 'Generating Preview-Images',
    validator: 'Validating Preview-Images',
}

router.get('/jobs/info', (req, res, next) => {
    const response = [];
    Object.keys(LOOKUP).forEach(id => {
        response.push({
            id,
            name: LOOKUP[id],
            running: Boolean(getActiveJobs().find(x => x.id == id))
        });
    });
    res.json(response);
})

router.get('/job/img/generate', (req, res, next) => {
    const id = 'generate';
    const job = getActiveJobs().find(x => x.id == id);
    if (job) {
        const error = new Error('Job is already running!')
        next(error);
    } else {
        getActiveJobs().push({
            id,
            name: LOOKUP[id],
            startTime: Date.now(),
            data: {},
        });
        genearteImages();
        setTimeout(() => {
            setActiveJobs(getActiveJobs().filter(x => x.id !== id));
            console.log('Removed');
        }, 3600);
        res.json(getActiveJobs());
    }
})
router.get('/job/img/validate', (req, res, next) => {
    const id = 'validator';
    const job = getActiveJobs().find(x => x.id == id);
    if (job) {
        const error = new Error('Job is already running!')
        next(error);
    } else {
        getActiveJobs().push({
            id,
            name: LOOKUP[id],
            startTime: Date.now(),
            data: {},
        });
        validateImages();
        setTimeout(() => {
            setActiveJobs(getActiveJobs().filter(x => x.id !== id));
            console.log('Removed');
        }, 3600);
        res.json(getActiveJobs());
    }
})

router.get('/job/crawl', (req, res, next) => {
    const id = 'crawl';
    const job = getActiveJobs().find(x => x.id == id);
    if (job) {
        const error = new Error('Job is already running!')
        next(error);
    } else {
        getActiveJobs().push({
            id,
            name: LOOKUP[id],
            startTime: Date.now(),
            data: {},
        });
        crawlAndIndex();
        setTimeout(() => {
            setActiveJobs(getActiveJobs().filter(x => x.id !== id));
            console.log('Removed');
        }, 3600);
        res.json(getActiveJobs());
    }
});

module.exports = { router }