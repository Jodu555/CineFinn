const express = require('express');
const router = express.Router();
const { cleanupSeriesBeforeFrontResponse } = require('../classes/series');
const { getSeries, setSeries, deepMerge } = require('../utils/utils');
const axios = require('axios');
const { sendSeriesReloadToAll } = require('../sockets/client.socket');

router.get('/', async (req, res, next) => {
	const series = cleanupSeriesBeforeFrontResponse(getSeries()).map((x) => {
		const y = JSON.parse(JSON.stringify(x));
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

router.get('/all', async (req, res, next) => {
	const series = getSeries();
	res.json(series);
});

router.get('/:ID', async (req, res, next) => {
	const series = cleanupSeriesBeforeFrontResponse(getSeries());
	const serie = series.find((x) => x.ID === req.params.ID);
	if (serie) {
		res.json(serie);
	} else {
		next(new Error('Serie no found!'));
	}
});

router.patch('/:ID', async (req, res, next) => {
	//TODO: IMPORTANT: Add restriction to this route
	setSeries(
		getSeries().map((x) => {
			if (x.ID == req.params.ID) {
				const out = deepMerge(x, req.body);
				res.json(out);
				return out;
			} else {
				return x;
			}
		})
	);

	await sendSeriesReloadToAll();
});

module.exports = { router };
