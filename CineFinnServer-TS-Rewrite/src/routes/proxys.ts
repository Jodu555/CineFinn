import axios from 'axios';
import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/session';

export const segmentProxy = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	// console.log(req.originalUrl, req.method, req.body);
	const proxyUrl = `${process.env.SEGMENT_API_URL}${req.originalUrl}`;
	// console.log('Proxying to', proxyUrl);
	try {
		const proxy = await axios({
			method: req.method,
			url: proxyUrl,
			headers: req.headers,
			data: req.body,
			responseType: 'stream',
			validateStatus: () => true,
		});
		// console.log(proxy.status, proxy.headers);

		if (proxy.status != 200) {
			res.status(proxy.status).json({});
			return;
		} else {
			proxy.data.pipe(res);
		}
	} catch (error) {
		res.status(500).json({
			message: 'The Proxied API did not respond with anything',
		});
	}
};

export const aniDBAPIProxy = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	// console.log(req.originalUrl, req.method, req.body);
	// originalUrl is /anidb/anime/123456789 or /anidb/list
	const proxyUrl = `${process.env.ANIDB_API_URL}${req.originalUrl}`;
	// console.log('Proxying to', proxyUrl);
	try {
		const proxy = await axios({
			method: req.method,
			url: proxyUrl,
			headers: req.headers,
			data: req.body,
			responseType: 'stream',
			validateStatus: () => true,
		});
		// console.log(proxy.status, proxy.headers);

		if (proxy.status != 200) {
			res.status(proxy.status).json({});
			return;
		} else {
			proxy.data.pipe(res);
		}
	} catch (error) {
		res.status(500).json({
			message: 'The Proxied API did not respond with anything',
		});
	}
};

export const bullBoardProxy = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	// console.log(req.originalUrl, req.method, req.body);

	const proxyUrl = `${process.env.BULLBOARD_API_URL}api${req.originalUrl.replace('/bullboard', '')}`;
	// console.log('Proxying to', proxyUrl);
	try {
		const proxy = await axios({
			method: req.method,
			url: proxyUrl,
			headers: { ...req.headers, token: process.env.BULLBOARD_API_TOKEN },
			data: req.body,
			responseType: 'stream',
			validateStatus: () => true,
		});
		// console.log(proxy.status, proxy.headers);

		if (proxy.status != 200) {
			res.status(proxy.status).json({});
			return;
		} else {
			proxy.data.pipe(res);
		}
	} catch (error) {
		res.status(500).json({
			message: 'The Proxied API did not respond with anything',
		});
	}
};
