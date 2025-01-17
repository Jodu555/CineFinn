import express, { NextFunction, Response } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { AuthenticatedRequest, Role } from '../types/session';
import { roleAuthorization } from '../utils/roleManager';
import { DatabaseJobItem, DatabaseNewsItem } from '@Types/database';
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

router.post('/', roleAuthorization(Role.Mod), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	if (req.body.content != undefined && req.body.content.trim() !== '' && req.body.content.length > 5) {
		const jobDB = await database.get<DatabaseJobItem>('jobs').getOne({ ID: 'crawl' });
		const newsObject = {
			time: parseInt(req.body.time) || jobDB.lastRun,
			content: req.body.content as string,
		};
		await database.get<DatabaseNewsItem>('news').create(newsObject);
		res.json({ success: true, object: newsObject });
	} else {
		next(new Error('Parsing Error: news must be a string and should be longer than 5 chars'));
	}
});

export { router };
