const express = require('express');
const router = express.Router();
const { cleanupSeriesBeforeFrontResponse } = require('../classes/series');
const { getSeries, setSeries, deepMerge } = require('../utils/utils');
const axios = require('axios');

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
	console.log(req.params);
	console.log(req.body);
	const out = deepMerge(
		{
			references: {
				sto: 'Hello 123',
			},
			infos: {},
		},
		req.body
	);
	res.json(out);
	// setSeries(
	// 	getSeries.map((x) => {
	// 		if (x.ID == req.params.ID) {
	// 			return {...x, ...req.body}
	// 		} else {
	// 			return x;
	// 		}
	// 	})
	// );
});

module.exports = { router };
