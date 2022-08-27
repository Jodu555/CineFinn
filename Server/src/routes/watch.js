const express = require('express');
const { load, parse } = require('../utils/watchString');
const router = express.Router();


router.get('/info', async (req, res, next) => {
    console.log('GOT Watch Route', req.credentials, req.query.series);
    // 'ID|se-ep;next'
    const segList = parse(await load(req.credentials.user.UUID));
    res.json(segList.filter(seg => seg.ID == req.query.series));
});

module.exports = { router }