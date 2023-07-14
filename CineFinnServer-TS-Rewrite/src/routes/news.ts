import express, { NextFunction, Response } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { DatabaseNewsItem, DatabaseJobItem } from '../types/database';
import { AuthenticatedRequest } from '../types/session';
const { getAniworldInfos } = require('../sockets/scraper.socket');
const database = Database.getDatabase();
const router = express.Router();

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	try {
		const response = (await database.get<DatabaseNewsItem>('news').get()).map((o) => ({ ...o, time: Number(o.time) }));
		res.json(response);
	} catch (error) {
		next(error);
	}
});

router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	if (req.body.content != undefined && req.body.content.trim() !== '' && req.body.content.length > 5) {
		const jobDB = await database.get<DatabaseJobItem>('jobs').getOne({ ID: 'crawl' });
		const newsObject = {
			time: jobDB.lastRun,
			content: req.body.content,
		};
		await database.get<DatabaseNewsItem>('news').create(newsObject);
		res.json({ success: true });
	} else {
		next(new Error('Parsing Error: news must be a string and should be longer than 5 chars'));
	}
});

export { router };
