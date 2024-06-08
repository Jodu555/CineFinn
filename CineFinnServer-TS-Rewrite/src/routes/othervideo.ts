import path from 'path';
import crypto from 'crypto';
import { Response } from 'express';
import { AuthenticatedRequest } from '../types/session';
import { Episode, Movie, getVideoEntity, getVideoMovie } from '../classes/series';
import { getSeries } from '../utils/utils';
import { getVideoStats, createVideoStreamOverSocket } from '../sockets/sub.socket';

export = async (req: AuthenticatedRequest, res: Response) => {
	const { series: seriesID, season, episode, movie, language, debug: rmtDebug } = req.query;
	const num = req.query.num as string;
	const range = req.headers.range;

	if (!range) {
		res.status(400).send('Requires Range header');
		return;
	}

	// const serie = (await getSeries()).find((x) => x.ID == seriesID);

	// const isMovie = Boolean(movie);

	// let videoEntity: Movie | Episode = null;
	// if (isMovie) {
	// 	videoEntity = await getVideoMovie(serie.ID, Number(movie));
	// } else {
	// 	videoEntity = await getVideoEntity(serie.ID, Number(season), Number(episode));
	// }
	// if (videoEntity == null || videoEntity == undefined) {
	// 	res.status(400).send('Season or Episode does not exists');
	// 	return;
	// }

	// let filePath: string;
	// filePath = videoEntity.filePath;

	// if (videoEntity.langs.length > 1) {
	// 	if (language) {
	// 		const { dir, name, ext } = path.parse(filePath);
	// 		filePath = path.join(dir, `${name.split('_')[0]}_${language}${ext}`);
	// 	}
	// }
	const filePath = `X:\\MediaLib\\K-Drama\\I'm Not a Robot\\Season-1\\I'm Not a Robot St#1 Flg#12_EngSub.mp4`;

	// const subID = videoEntity.subID;
	const subID = 'local-north';

	console.log(subID, filePath);

	const stat = await getVideoStats(subID, filePath);
	const videoLength = stat.size; // Placeholder for video length in bytes (should be obtained dynamically if possible)
	const parts = range.replace(/bytes=/, '').split('-');
	const start = parseInt(parts[0], 10);
	const end = parts[1] ? parseInt(parts[1], 10) : videoLength - 1;

	if (start >= videoLength || end >= videoLength) {
		res.status(416).send(`Requested range not satisfiable\n${start} >= ${videoLength}`);
		return;
	}

	const requestId = crypto.randomUUID();

	res.setHeader('Content-Range', `bytes ${start}-${end}/${videoLength}`);
	res.setHeader('Accept-Ranges', 'bytes');
	res.setHeader('Content-Length', end - start + 1);
	res.setHeader('Content-Type', 'video/mp4');
	res.status(206);

	console.log(subID, start, end);
	// handleSocketTransmitVideo(subID, requestId, filePath, start, end, res);
	createVideoStreamOverSocket(subID, requestId, filePath, { start, end }, res);
};
