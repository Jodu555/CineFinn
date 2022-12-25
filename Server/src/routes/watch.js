const express = require('express');
const { load, parse, markSeason } = require('../utils/watchString');
const { sendWatchListChange } = require('../sockets/client.socket');
const router = express.Router();

router.get('/info', async (req, res, next) => {
	// 'ID|se-ep;next'
	console.log('/watch/info', req.credentials.user.username, req.query.series);
	const segList = parse(await load(req.credentials.user.UUID));
	res.json(segList.filter((seg) => seg.ID == req.query.series));
});

router.get('/mark/:seriesID/season/:seasonID/:bool', (req, res, next) => {
	const { seriesID, seasonID, bool } = req.params;
	new Promise(async (resolve, reject) => {
		const list = await markSeason(req.credentials.user.UUID, seriesID, seasonID, bool);
		sendWatchListChange(list, s, { series: seriesID });
	});
	res.json();
});

module.exports = { router };
