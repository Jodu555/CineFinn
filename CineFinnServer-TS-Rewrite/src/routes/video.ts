import path from 'path';
import fs from 'fs';
import { Response } from 'express';
import { getSeries } from '../utils/utils';
import { AuthenticatedRequest } from '../types/session';
import { getVideoMovie, getVideoEntity } from '../classes/series';

export = (req: AuthenticatedRequest, res: Response) => {
	const { series: seriesID, season, episode, movie, language, debug: rmtDebug } = req.query;

	const debug = Boolean(rmtDebug) || false;

	// Ensure there is a range given for the video
	const range = req.headers.range;
	if (!range) {
		res.status(400).send('Requires Range header');
		return;
	}
	debug && console.log('Got Range', range);

	if (seriesID == '' || Number(season) == -1 || Number(episode) == -1) {
		res.status(404).send('No Video!');
		return;
	}
	debug && console.log('Got Video');

	//TODO: This is duplicate cause im doing this in getVideoEntity but still there for error
	const serie = getSeries().find((x) => x.ID == seriesID);

	debug && console.log('Tried to find serie');

	if (serie == undefined) {
		res.status(404).send('Cant find serie with ' + seriesID);
		return;
	}

	debug && console.log('Got Serie', serie.ID);

	const isMovie = Boolean(movie);

	// let videoEntity = isMovie ? serie.movies[movie] : serie.seasons[season][episode];
	let videoEntity = null;
	if (isMovie) {
		videoEntity = getVideoMovie(serie.ID, Number(movie));
	} else {
		videoEntity = getVideoEntity(serie.ID, Number(season), Number(episode));
	}
	if (videoEntity == null || videoEntity == undefined) {
		res.status(400).send('Season or Episode does not exists');
		return;
	}

	debug && console.log('Got Video Entitiy', videoEntity);

	const settings = JSON.parse(req.credentials.user.settings as string);

	debug && console.log('Got Settings', settings);

	let filePath: string;
	//The Birthday stuff
	if (settings?.isBirthday != undefined && settings?.isBirthday) {
		filePath = path.join(process.cwd(), 'test.mp4');
	} else {
		filePath = videoEntity.filePath;

		if (videoEntity.langs.length > 1) {
			if (language) {
				const { dir, name, ext } = path.parse(filePath);
				filePath = path.join(dir, `${name.split('_')[0]}_${language}${ext}`);
			}
		}
	}

	debug && console.log('Got filePath', filePath);

	const videoSize = fs.statSync(filePath).size;

	debug && console.log('Got videoSize', videoSize);

	// const CHUNK_SIZE = 10 ** 6; // 1MB
	const CHUNK_SIZE = Number(process.env.VIDEO_CHUNK_SIZE);
	const start = Number(range.replace(/\D/g, ''));
	const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

	const contentLength = end - start + 1;

	debug && console.log('Calculated contentLength', contentLength);
	const headers = {
		'Content-Range': `bytes ${start}-${end}/${videoSize}`,
		'Accept-Ranges': 'bytes',
		'Content-Length': contentLength,
		'Content-Type': 'video/mp4',
	};

	debug && console.log('Generated headers', headers);

	res.writeHead(206, headers);
	const videoStream = fs.createReadStream(filePath, { start, end });
	debug && console.log('Created read stream', headers);
	videoStream.pipe(res);
};
