import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { Response } from 'express';
import { getSeries, getVideoStreamLog, setVideoStreamLog } from '../utils/utils';
import { AuthenticatedRequest } from '../types/session';
import { getVideoMovie, getVideoEntity, Episode, Movie } from '../classes/series';
import { getSubSocketByID } from '../sockets/sub.socket';

export = async (req: AuthenticatedRequest, res: Response) => {
	console.time('total-video');
	const { series: seriesID, season, episode, movie, language, debug: rmtDebug } = req.query;

	const debug = false;
	// const debug = Boolean(rmtDebug) || false;

	let start: number;
	let end: number;
	const range = req.headers.range;
	if (range) {
		const bytesPrefix = 'bytes=';
		if (range.startsWith(bytesPrefix)) {
			const bytesRange = range.substring(bytesPrefix.length);
			const parts = bytesRange.split('-');
			if (parts.length === 2) {
				const rangeStart = parts[0] && parts[0].trim();
				if (rangeStart && rangeStart.length > 0) {
					start = parseInt(rangeStart);
				}
				const rangeEnd = parts[1] && parts[1].trim();
				if (rangeEnd && rangeEnd.length > 0) {
					end = parseInt(rangeEnd);
				}
			}
		}
	}

	res.setHeader('content-type', 'video/mp4');

	debug && console.log('Got Range', { start, end });

	if (seriesID == '' || Number(season) == -1 || Number(episode) == -1) {
		res.status(404).send('No Video!');
		return;
	}
	debug && console.log('Got Video');

	//TODO: This is duplicate cause im doing this in getVideoEntity but still there for error
	const serie = (await getSeries()).find((x) => x.ID == seriesID);

	debug && console.log('Tried to find serie');

	if (serie == undefined) {
		res.status(404).send('Cant find serie with ' + seriesID);
		return;
	}

	debug && console.log('Got Serie', serie.ID);

	const isMovie = Boolean(movie);

	// let videoEntity = isMovie ? serie.movies[movie] : serie.seasons[season][episode];
	let videoEntity: Movie | Episode = null;
	if (isMovie) {
		videoEntity = await getVideoMovie(serie.ID, Number(movie));
	} else {
		videoEntity = await getVideoEntity(serie.ID, Number(season), Number(episode));
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

	if (videoEntity.subID != 'main') {
		const subSocket = getSubSocketByID(videoEntity.subID);
		if (!subSocket) {
			res.status(404).send('Sub System Currently not reachable');
			return;
		}
		try {
			const response = await axios({
				responseType: 'stream',
				url: `${subSocket.auth.endpoint}/video?ptoken=${subSocket.auth.ptoken}&path=${encodeURIComponent(filePath)}`,
				headers: {
					range: req.headers.range,
					connection: 'keep-alive',
					'user-agent': req.headers['user-agent'],
				},
				method: req.method,
				maxRedirects: 0,
				validateStatus: (status: number) => status >= 200 && status < 500,
				timeout: 5000,
				decompress: true,
				onDownloadProgress(progressEvent) {
					// console.log((progressEvent.loaded / progressEvent.total) * 100);
				},
			});

			// console.log(response.status, response.headers);
			// res.status(200).json({ ok: true });

			res.status(response.status);
			res.set(response.headers);

			response.data.pipe(res);
		} catch (error) {
			res.status(500).json(error);
		}
	} else {
		res.setHeader('content-type', 'video/mp4');

		debug && console.log('Got filePath', filePath);

		const stat = fs.statSync(filePath);
		const contentLength = stat.size;

		// Listing 4.
		if (req.method === 'HEAD') {
			res.statusCode = 200;
			res.setHeader('accept-ranges', 'bytes');
			res.setHeader('content-length', contentLength);
			res.end();
			return;
		}

		let retrievedLength: number;
		if (start !== undefined && end !== undefined) {
			retrievedLength = end + 1 - start;
		} else if (start !== undefined) {
			retrievedLength = contentLength - start;
		} else if (end !== undefined) {
			retrievedLength = end + 1;
		} else {
			retrievedLength = contentLength;
		}

		// if (end == undefined) {
		// 	const CHUNK_SIZE = Number(process.env.VIDEO_CHUNK_SIZE);
		// 	console.log(end, start, contentLength);
		// 	end = start + CHUNK_SIZE - 1;
		// 	console.log('tmp end', end);

		// 	if (end > contentLength) {
		// 		console.log('Bound reached');

		// 		end = contentLength - 1;
		// 	}
		// }

		debug && console.log('Calculated contentLength', contentLength);
		res.statusCode = start !== undefined || end !== undefined ? 206 : 200;

		res.setHeader('content-length', retrievedLength);

		if (range !== undefined) {
			res.setHeader('content-range', `bytes ${start || 0}-${end || contentLength - 1}/${contentLength}`);
			res.setHeader('accept-ranges', 'bytes');
		}

		const fileStream = fs.createReadStream(filePath, { start, end });
		fileStream.on('error', (error) => {
			console.log(`Error reading file ${filePath}.`);
			console.log(error);
			res.sendStatus(500);
		});

		console.time('sub-video');
		getVideoStreamLog()
			.filter((x) => x.userUUID == req.credentials.user.UUID && Date.now() - x.time > 5000)
			.forEach((old, idx) => {
				old.stream.destroy();
				console.log('Destroyed stream for', old.userUUID, Date.now() - old.time, 'ms', old.path);
				getVideoStreamLog().splice(idx, 1);
			});
		console.timeEnd('sub-video');

		getVideoStreamLog().push({
			stream: fileStream,
			userUUID: req.credentials.user.UUID,
			time: Date.now(),
			path: filePath,
			start: start,
			end: end,
		});

		fileStream.pipe(res);
		console.timeEnd('total-video');
	}
};
