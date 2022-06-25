const express = require('express');
const { getActiveJobs } = require('../utils/utils');
const router = express.Router();

const LOOKUP = {
    scrape: 'Rescraping the archive'
}

router.get('/jobs', (req, res, next) => {
    res.json(getActiveJobs());
});

router.get('/job/scrape', (req, res, next) => {
    const id = 'scrape';
    const job = getActiveJobs().find(x => x.identifier == id);
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
    }
    res.json(getActiveJobs());
});

module.exports = { router }