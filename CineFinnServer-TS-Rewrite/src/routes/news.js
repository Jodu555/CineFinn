const { Database } = require('@jodu555/mysqlapi');
const database = Database.getDatabase();
const express = require('express');
const router = express.Router();

router.get('/', async (req, res, next) => {
	try {
		const response = (await database.get('news').get()).map((o) => ({ ...o, time: Number(o.time) }));
		res.json(response);
	} catch (error) {
		next(error);
	}
});

router.post('/', async (req, res, next) => {
	if (req.body.content != undefined && req.body.content.trim() !== '' && req.body.content.length > 5) {
		const jobDB = await database.get('jobs').getOne({ ID: 'crawl' });
		const newsObject = {
			time: jobDB.lastRun,
			content: req.body.content,
		};
		await database.get('news').create(newsObject);
		res.json({ success: true });
	} else {
		next(new Error('Parsing Error: news must be a string and should be longer than 5 chars'));
	}
});

module.exports = { router };
