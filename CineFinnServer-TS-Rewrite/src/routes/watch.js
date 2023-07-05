const express = require('express');
const { load, parse, markSeason } = require('../utils/watchString');
const { sendWatchListChange } = require('../sockets/client.socket');
const { toAllSockets } = require('../utils/utils');
const router = express.Router();

router.get('/info', async (req, res) => {
	// 'ID|se-ep;next'
	console.log('/watch/info', req.credentials.user.username, req.query.series);
	const segList = parse(await load(req.credentials.user.UUID));
	res.json(segList.filter((seg) => seg.ID == req.query.series));
});

router.get('/mark/:seriesID/season/:seasonID/:bool', async (req, res) => {
	const { seriesID, seasonID, bool } = req.params;
	const list = await markSeason(req.credentials.user.UUID, seriesID, Number(seasonID), bool);
	toAllSockets(
		(s) => {
			sendWatchListChange(list, s, { series: seriesID });
		},
		(s) => s.auth.type == 'client' && s.auth.user.UUID == req.credentials.user.UUID
	);
	res.json(list.filter((s) => s.ID == seriesID));
});

module.exports = { router };
