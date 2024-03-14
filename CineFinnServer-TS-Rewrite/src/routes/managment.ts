import { AuthenticationError } from '@jodu555/express-helpers';
import { Database } from '@jodu555/mysqlapi';
import express, { NextFunction, Response } from 'express';
import { checkForUpdates, isScraperSocketConnected } from '../sockets/scraper.socket';
import { sendSeriesReloadToAll } from '../sockets/client.socket';
import { DatabaseJobItem } from '../types/database';
import { AuthenticatedRequest, Role } from '../types/session';
import { crawlAndIndex } from '../utils/crawler';
import { generateImages } from '../utils/images';
import { getActiveJobs, getSeries, setActiveJobs, setSeries, toAllSockets } from '../utils/utils';
const database = Database.getDatabase();
const router = express.Router();

const LOOKUP = {
	crawl: { name: 'Recrawl the archive', callpoint: '/job/crawl', role: Role.Mod },
	generate: { name: 'Generating Preview-Images', callpoint: '/job/img/generate', role: Role.Admin },
	// validator: { name: 'Validating Preview-Images', callpoint: '/job/img/validate' },
	checkForUpdates: { name: 'Check for Updates', callpoint: '/job/checkForUpdates', role: Role.Admin }
} as const;

const callpointToEvent = (callpoint: string) => `${callpoint.replace('/', '').replaceAll('/', '_')}-end`;

Promise.all(
	Object.keys(LOOKUP).map(async (id) => {
		const jobDB = await database.get<DatabaseJobItem>('jobs').getOne({ ID: id });
		if (jobDB) {
			const lastRun = jobDB.lastRun ? Number(jobDB.lastRun) : undefined;
			LOOKUP[id] = { ...LOOKUP[id], lastRun };
		} else {
			database.get('jobs').create({ ID: id, lastRun: '' });
		}
		return id;
	})
);

router.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const jobID = Object.keys(LOOKUP).find((v) => LOOKUP[v].callpoint == req.path);
	if (jobID) {
		if (req.credentials.user.role >= LOOKUP[jobID].role) {
			const lastRun = Date.now();
			database.get('jobs').update({ ID: jobID }, { lastRun });
			LOOKUP[jobID] = { ...LOOKUP[jobID], lastRun };
		} else {
			next(new AuthenticationError('Insufficent Permission'));
		}
	}
	next();
});

router.get('/jobs/info', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const response = [];
	Object.keys(LOOKUP).forEach((id) => {
		response.push({
			id,
			...LOOKUP[id],
			running: Boolean(getActiveJobs().find((x) => x.id == id)),
		});
	});
	res.json(response);
});

router.get('/job/img/generate', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const id = 'generate';
	const job = getActiveJobs().find((x) => x.id == id);
	if (job) {
		const error = new Error('Job is already running!');
		next(error);
	} else {
		getActiveJobs().push({
			id,
			name: LOOKUP[id].name,
			startTime: Date.now(),
			data: {},
		});
		try {
			generateImages(getSeries(), async () => {
				setActiveJobs(getActiveJobs().filter((x) => x.id !== id));
				toAllSockets(
					(s) => {
						s.emit(callpointToEvent(LOOKUP[id].callpoint));
					},
					(s) => s.auth.type == 'client' && s.auth.user.role >= LOOKUP[id].role
				);
			});
		} catch (error) {
			setActiveJobs(getActiveJobs().filter((x) => x.id !== id));
		}
		res.json(getActiveJobs());
	}
});

router.get('/job/checkForUpdates', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const id = 'checkForUpdates';
	const job = getActiveJobs().find((x) => x.id == id);
	if (job) {
		const error = new Error('Job is already running!');
		next(error);
		return;
	}

	if (!isScraperSocketConnected()) {
		const error = new Error('There is currently no scraper socket connected!');
		next(error);
		return;
	}

	getActiveJobs().push({
		id,
		name: LOOKUP[id].name,
		startTime: Date.now(),
		data: {},
	});
	try {
		checkForUpdates();
	} catch (error) {
		setActiveJobs(getActiveJobs().filter((x) => x.id !== id));
	}
	res.json(getActiveJobs());

});

// router.get('/job/img/validate', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const id = 'validator';
//     const job = getActiveJobs().find(x => x.id == id);
//     if (job) {
//         const error = new Error('Job is already running!')
//         next(error);
//     } else {
//         getActiveJobs().push({
//             id,
//             name: LOOKUP[id].name,
//             startTime: Date.now(),
//             data: {},
//         });
//         validateImages(getSeries(), async () => {
//             setActiveJobs(getActiveJobs().filter(x => x.id !== id));
//             toAllSockets(s => { s.emit(callpointToEvent(LOOKUP[id].callpoint)) }, s => s.auth.type == 'client');
//         });
//         res.json(getActiveJobs());
//     }
// });

router.get('/job/crawl', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const id = 'crawl';
	const job = getActiveJobs().find((x) => x.id == id);
	if (job) {
		const error = new Error('Job is already running!');
		next(error);
	} else {
		try {
			getActiveJobs().push({
				id,
				name: LOOKUP[id].name,
				startTime: Date.now(),
				data: {},
			});
			setSeries(crawlAndIndex());
			setTimeout(async () => {
				setActiveJobs(getActiveJobs().filter((x) => x.id !== id));
				sendSeriesReloadToAll((s) => s.emit(callpointToEvent(LOOKUP[id].callpoint)));
			}, 3600);
			res.json(getActiveJobs());
		} catch (error) {
			setActiveJobs(getActiveJobs().filter((x) => x.id !== id));
		}
	}
});

export { router };

