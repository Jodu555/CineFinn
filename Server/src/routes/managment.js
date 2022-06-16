const express = require('express');
const { getActiveJobs } = require('../utils/utils');
const router = express.Router();

router.get('/jobs', (req, res, next) => {
    res.json(getActiveJobs());
});

module.exports = { router }