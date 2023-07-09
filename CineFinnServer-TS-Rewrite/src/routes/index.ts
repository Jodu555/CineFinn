import express, { NextFunction, Response } from 'express';
import axios from 'axios';
import { AuthenticatedRequest, DatabaseJobItem, DatabaseNewsItem, DatabaseTodoItem } from '../utils/types';
import { cleanupSeriesBeforeFrontResponse, Series } from '../classes/series';
import { sendSeriesReloadToAll } from '../sockets/client.socket';
import { generateID } from '../utils/crawler';
import { getSeries, setSeries, deepMerge } from '../utils/utils';

const router = express.Router();

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const series = cleanupSeriesBeforeFrontResponse(getSeries()).map((x) => {
		const y = JSON.parse(JSON.stringify(x)) as Series;
		y.seasons = new Array(y.seasons.length).fill(-1);
		y.movies = new Array(y.movies.length).fill(-1);
		return y;
	});
	try {
		const response = await axios.post('http://localhost:4895', series);
		res.json(response.data);
	} catch (error) {
		res.json(series);
	}
});

router.get('/all', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const series = getSeries();
	res.json(series);
});

router.get('/:ID', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const series = cleanupSeriesBeforeFrontResponse(getSeries());
	const serie = series.find((x) => x.ID === req.params.ID);
	if (serie) {
		res.json(serie);
	} else {
		next(new Error('Serie no found!'));
	}
});

router.patch('/:ID', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	//TODO: IMPORTANT: Add restriction to this route
	setSeries(
		getSeries().map((x) => {
			if (x.ID == req.params.ID) {
				const out = deepMerge<Series>(x, req.body);
				res.json(out);
				return out;
			} else {
				return x;
			}
		})
	);
	await sendSeriesReloadToAll();
});

router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	// res.status(501).json({});
	// return;
	//TODO: IMPORTANT: Add restriction to this route
	req.body.ID = generateID();
	const serie = Series.fromObject(req.body);
	setSeries([...getSeries(), serie]);

	await sendSeriesReloadToAll();
	res.json(serie);
});

module.exports = { router };
