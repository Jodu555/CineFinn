import express, { NextFunction, Response } from 'express';
import axios from 'axios';
import { Database } from '@jodu555/mysqlapi';
import { DatabaseJobItem, DatabaseNewsItem, DatabaseTodoItem } from '../types/database';
import { cleanupSeriesBeforeFrontResponse, Series } from '../classes/series';
import { sendSeriesReloadToAll } from '../sockets/client.socket';
import { generateID } from '../utils/crawler';
import { getSeries, setSeries, deepMerge } from '../utils/utils';
import { AuthenticatedRequest, Role } from '../types/session';
import { roleAuthorization } from '../utils/roleManager';
import { load, parse } from '../utils/watchString';
import { SerieObject } from '../types/classes';
const database = Database.getDatabase();

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

router.patch('/:ID', roleAuthorization(Role.Mod), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

router.post('/', roleAuthorization(Role.Admin), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	req.body.ID = generateID();
	const serie = Series.fromObject(req.body);
	setSeries([...getSeries(), serie]);

	await sendSeriesReloadToAll();
	res.json(serie);
});

router.get('/index/recommendations', async (req, res) => {
	const response = await axios.get<Series[]>(`http://cinema-api.jodu555.de/index/all?auth-token=${process.env.TEST_AUTH_TOKEN_FROM_PUBLIC_API}`);

	const remoteSeries = response.data;

	const forYouItems = 20;
	const newestItems = 15;
	const watchAgainItems = 15;


	console.time('LoadParse')
	const list = parse(await load('ad733837-b2cf-47a2-b968-abaa70edbffe'));
	console.timeEnd('LoadParse')


	console.time('map')
	const group: { [key: string]: number } = {};
	list.map(x => x?.ID).forEach(n => {
		group[n] = !group[n] ? 1 : group[n] + 1
	})
	console.timeEnd('map')



	function groupit(group: { [key: string]: number }): { ID: string, name: string, watched: number, total: number, percent: number }[] {
		const out = new Array(Object.keys(group).length);

		Object.keys(group).forEach(x => {
			const remoteSerie = remoteSeries.find(s => s.ID == x);
			if (!remoteSerie)
				return;

			const totalEntitys = remoteSerie.seasons.flat().length + remoteSerie.movies.length;
			console.log(remoteSerie.title, remoteSerie.seasons.flat().length, remoteSerie.movies.length, totalEntitys);

			let percent = parseFloat(String(group[x] / totalEntitys * 100))
			if (percent > 100)
				percent = 100;
			out.push({
				ID: x,
				name: remoteSerie.title,
				watched: group[x],
				total: totalEntitys,
				percent: parseFloat(percent.toFixed(2)),
			});
		});
		return out;
	}

	const out = groupit(group);

	console.log(out);


	let foryou = [];
	let newest = [];
	let watchagain = [];
	let continueWatching = [];

	const series = remoteSeries
		// .filter((x) => x.categorie == 'Aniworld')
		.map((x) => ({
			ID: x.ID,
			url: `http://cinema-api.jodu555.de/images/${x.ID}/cover.jpg?auth-token=${process.env.TEST_AUTH_TOKEN_FROM_PUBLIC_API}`,
			title: x.title,
			infos: x.infos,
		}));

	foryou = series
		.slice()
		.sort((a, b) => 0.5 - Math.random())
		.slice(0, forYouItems);

	newest = series.reverse().slice(0, newestItems);

	watchagain = out.sort((a, b) => b.percent - a.percent).slice(0, watchAgainItems * 3).sort((a, b) => 0.5 - Math.random()).slice(0, watchAgainItems);

	res.json({
		foryou: { title: 'For You:', data: foryou },
		newest: { title: 'newest:', data: newest },
		watchagain: { title: 'Watch Again:', data: watchagain },
		continue: { title: 'Continue Watching:', data: continueWatching },
	});
});

export { router };
