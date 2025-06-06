import { Database } from '@jodu555/mysqlapi';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import express, { NextFunction, Response } from 'express';
import { Series, cleanupSeriesBeforeFrontResponse } from '../classes/series';
import { sendSeriesReloadToAll } from '../sockets/client.socket';
import { AuthenticatedRequest, Role } from '../types/session';
import { generateID } from '../utils/crawler';
import { roleAuthorization } from '../utils/roleManager';
import { deepMerge, getSeries, setSeries } from '../utils/utils';
const database = Database.getDatabase();

const router = express.Router();

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const series = cleanupSeriesBeforeFrontResponse(await getSeries()).map((x) => {
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
	const series = await getSeries();
	res.json(series);
});

router.get('/:ID', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const series = cleanupSeriesBeforeFrontResponse(await getSeries());
	const serie = series.find((x) => x.ID === req.params.ID);
	if (serie) {
		res.json(serie);
	} else {
		next(new Error('Serie no found!'));
	}
});

router.patch('/:ID', roleAuthorization(Role.Mod), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	setSeries(
		(await getSeries()).map((x) => {
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

router.post('/:ID/cover', roleAuthorization(Role.Admin), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const serieID = req.params.ID;
	const serie = (await getSeries()).find((x) => x.ID === serieID);
	if (serie == undefined) {
		next(new Error('Serie not found!'));
		return;
	}
	const imageUrl = req.body.imageUrl;
	const imagePath = path.join(process.env.PREVIEW_IMGS_PATH, serie.ID, 'cover.jpg');
	console.log(`Downloading Cover for ${serie.title}(${serie.ID}) URL: ${imageUrl} TO: ${imagePath}`);
	await downloadImage(imageUrl, imagePath);
	setSeries(
		(await getSeries()).map((x) => {
			if (x.ID == req.params.ID) {
				const out = deepMerge<Series>(x, {
					infos: {
						image: true,
					}
				});
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
	setSeries([...(await getSeries()), serie]);

	await sendSeriesReloadToAll();
	res.json(serie);
});

async function downloadImage(url: string, imagePath: string) {
	try {
		fs.mkdirSync(path.join(imagePath, '..'), { recursive: true });
		const response = await axios({
			url,
			responseType: 'stream',
		});
		return new Promise<void>((resolve, reject) => {
			response.data
				.pipe(fs.createWriteStream(imagePath))
				.on('finish', () => resolve())
				.on('error', (e: Error) => reject(e));
		});
	} catch (error) {
		console.error(url, imagePath);
		return null;
	}
}

export { router };
