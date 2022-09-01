const express = require('express');
const { load, parse } = require('../utils/watchString');
const router = express.Router();


router.get('/info', async (req, res, next) => {
    // 'ID|se-ep;next'
    console.log('/watch/info', req.credentials.user.username, req.query.series);
    const segList = parse(await load(req.credentials.user.UUID));
    res.json(segList.filter(seg => seg.ID == req.query.series));
});

module.exports = { router }