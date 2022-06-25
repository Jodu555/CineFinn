const express = require('express');
const { crawlAndIndex } = require('../utils/crawler');
const { getActiveJobs, setActiveJobs } = require('../utils/utils');
const router = express.Router();

const LOOKUP = {
    crawl: 'Recrawl the archive'
}

router.get('/jobs/available', (req, res, next) => {
    res.json(LOOKUP);
})

router.get('/jobs/active', (req, res, next) => {
    res.json(getActiveJobs());
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