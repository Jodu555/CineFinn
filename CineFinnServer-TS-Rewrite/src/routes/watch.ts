import express, { Request } from 'express';
import { AuthenticatedRequest } from '../utils/types';
import { sendWatchListChange } from '../sockets/client.socket';
import { toAllSockets } from '../utils/utils';
import { markSeason, load, parse } from '../utils/watchString';
const router = express.Router();

router.get('/info', async (req: AuthenticatedRequest, res) => {
	// 'ID|se-ep;next'
	console.log('/watch/info', req.credentials.user.username, req.query.series);
	const segList = parse(await load(req.credentials.user.UUID));
	res.json(segList.filter((seg) => seg.ID == req.query.series));
});

router.get('/mark/:seriesID/season/:seasonID/:bool', async (req: AuthenticatedRequest, res) => {
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
