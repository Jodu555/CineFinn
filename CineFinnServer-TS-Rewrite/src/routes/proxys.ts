import axios from 'axios';
import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/session';
import crypto from 'crypto';

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

interface CacheEntry {
	data: Buffer;
	contentType: string;
	timestamp: number;
}

// In-memory cache with config
export const imageCache = new Map<string, CacheEntry>();
const HTTP_CACHE_TTL = 24 * 60 * 60; // 1 hour
const CACHE_TTL = HTTP_CACHE_TTL * 1000; // 24 hours
const MAX_CACHE_SIZE = 100;

const getCacheKey = (url: string): string =>
	crypto.createHash('md5').update(url).digest('hex');

const isExpired = (entry: CacheEntry): boolean =>
	Date.now() - entry.timestamp > CACHE_TTL;

const evictOldest = () => {
	if (imageCache.size >= MAX_CACHE_SIZE) {
		const oldest = Array.from(imageCache.entries())
			.sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
		imageCache.delete(oldest[0]);
	}
};

export const clearImageCache = () => imageCache.clear();

export const imageRewriteSSL = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	if (typeof req.query.url !== 'string') {
		return res.status(400).json({ message: 'No URL was provided' });
	}

	const cacheKey = getCacheKey(req.query.url);
	const cached = imageCache.get(cacheKey);

	// Return cached if valid
	if (cached && !isExpired(cached)) {
		console.log('Cache hit for:', req.query.url);
		res.set({
			'Content-Type': cached.contentType,
			'Cache-Control': `public, max-age=${HTTP_CACHE_TTL}`,
			'X-Cache': 'HIT'
		});
		return res.send(cached.data);
	}

	console.log('Cache miss for:', req.query.url);

	try {
		const proxy = await axios({
			method: 'GET',
			url: req.query.url,
			responseType: 'arraybuffer',
			timeout: 10000,
			validateStatus: () => true,
		});

		if (proxy.status !== 200) {
			return res.status(proxy.status).json({});
		}

		const contentType = proxy.headers['content-type'] || 'application/octet-stream';
		const imageBuffer = Buffer.from(proxy.data);

		evictOldest();
		imageCache.set(cacheKey, {
			data: imageBuffer,
			contentType,
			timestamp: Date.now(),
		});

		res.set({
			'Content-Type': contentType,
			'Cache-Control': `public, max-age=${HTTP_CACHE_TTL}`,
			'X-Cache': 'MISS'
		});
		res.send(imageBuffer);

	} catch (error) {
		console.error('Proxy error:', error);
		res.status(500).json({
			message: 'The Proxied API did not respond with anything',
		});
	}
};