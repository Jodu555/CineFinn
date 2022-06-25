const express = require('express');
const { getActiveJobs } = require('../utils/utils');
const router = express.Router();

router.get('/jobs', (req, res, next) => {
    res.json(getActiveJobs());
});

router.get('/job/scrape', (req, res, next) => {
    const id = 'scrape';
    if (getActiveJobs().find(x => x.identifier == id)) {
        next(new Error('Job is already running'));
    }
    // check if this job is running, if return infos (when started and how far)
    // if NOT start a new job
});

module.exports = { router }