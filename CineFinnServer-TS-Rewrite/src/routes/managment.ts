import { AuthenticationError } from '@jodu555/express-helpers';
import { Database } from '@jodu555/mysqlapi';
import express, { NextFunction, Response } from 'express';
import { checkForUpdates, isScraperSocketConnected } from '../sockets/scraper.socket';
import { sendSeriesReloadToAll } from '../sockets/client.socket';
import { DatabaseJobItem } from '../types/database';
import { AuthenticatedRequest, Role } from '../types/session';
import { crawlAndIndex } from '../utils/crawler';
import { generateImages } from '../utils/images';
import { getSeries, setSeries, toAllSockets } from '../utils/utils';
const database = Database.getDatabase();
const router = express.Router();

const LOOKUP = {
	crawl: { name: 'Recrawl the archive', callpoint: '/job/crawl', role: Role.Mod },
	generate: { name: 'Generating Preview-Images', callpoint: '/job/img/generate', role: Role.Admin },
	// validator: { name: 'Validating Preview-Images', callpoint: '/job/img/validate' },
	checkForUpdates: { name: 'Check for Updates', callpoint: '/job/checkForUpdates', role: Role.Admin },
} as const;

const callpointToEvent = (callpoint: string) => `${callpoint.replace('/', '').replaceAll('/', '_')}-end`;

router.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const jobID = Object.keys(LOOKUP).find((v) => LOOKUP[v].callpoint == req.path);
	if (jobID) {
		if (req.credentials.user.role >= LOOKUP[jobID].role) {
			const lastRun = Date.now();
			database.get<Partial<DatabaseJobItem>>('jobs').update({ ID: jobID }, { lastRun });
		} else {
			next(new AuthenticationError('Insufficent Permission'));
		}
	}
	next();
});

router.get('/jobs/info', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const response = await assembleJobArray();
	res.json(response);
});

async function assembleJobArray() {
	const response = [];
	for (const id of Object.keys(LOOKUP)) {
		const jobDB = await database.get<DatabaseJobItem>('jobs').getOne({ ID: id });
		delete jobDB.ID;
		response.push({
			id,
			...LOOKUP[id],
			...jobDB,
			running: jobDB.running == 'true',
		});
	}
	return response;
}

router.get('/job/img/generate', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const id = 'generate';
	const job = await database.get<DatabaseJobItem>('jobs').getOne({ ID: id });
	if (job.running == 'true') {
		const error = new Error('Job is already running!');
		next(error);
	} else {
		database.get<Partial<DatabaseJobItem>>('jobs').update({ ID: id }, { running: 'true' });
		try {
			generateImages(getSeries(), async () => {
				database.get<Partial<DatabaseJobItem>>('jobs').update({ ID: id }, { running: 'false' });
				toAllSockets(
					(s) => {
						s.emit(callpointToEvent(LOOKUP[id].callpoint));
					},
					(s) => s.auth.type == 'client' && s.auth.user.role >= LOOKUP[id].role
				);
			});
		} catch (error) {
			database.get<Partial<DatabaseJobItem>>('jobs').update({ ID: id }, { running: 'false' });
		}
		res.json(await assembleJobArray());
	}
});

router.get('/job/checkForUpdates', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const id = 'checkForUpdates';
	const job = await database.get<DatabaseJobItem>('jobs').getOne({ ID: id });
	if (job.running == 'true') {
		const error = new Error('Job is already running!');
		next(error);
		return;
	}

	if (!isScraperSocketConnected()) {
		const error = new Error('There is currently no scraper socket connected!');
		next(error);
		return;
	}

	database.get<Partial<DatabaseJobItem>>('jobs').update({ ID: id }, { running: 'true' });
	//TODO: this is ugly and shittie there is a better way to solve this but i dont have time for it now
	try {
		new Promise<void>(async (resolve, reject) => {
			try {
				await checkForUpdates();
				database.get<Partial<DatabaseJobItem>>('jobs').update({ ID: id }, { running: 'false' });
				await toAllSockets(
					(s) => {
						s.emit(callpointToEvent(LOOKUP[id].callpoint));
					},
					(s) => s.auth.type == 'client' && s.auth.user.role >= LOOKUP[id].role
				);
				resolve();
			} catch (error) {
				database.get<Partial<DatabaseJobItem>>('jobs').update({ ID: id }, { running: 'false' });
				await toAllSockets(
					(s) => {
						s.emit(callpointToEvent(LOOKUP[id].callpoint));
					},
					(s) => s.auth.type == 'client' && s.auth.user.role >= LOOKUP[id].role
				);
				reject(error);
			}
		});
	} catch (error) {
		database.get<Partial<DatabaseJobItem>>('jobs').update({ ID: id }, { running: 'false' });
		toAllSockets(
			(s) => {
				s.emit(callpointToEvent(LOOKUP[id].callpoint));
			},
			(s) => s.auth.type == 'client' && s.auth.user.role >= LOOKUP[id].role
		);
	}
	res.json(await assembleJobArray());
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

router.get('/job/crawl', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const id = 'crawl';
	const job = await database.get<DatabaseJobItem>('jobs').getOne({ ID: id });
	console.log(job);

	if (job.running == 'true') {
		const error = new Error('Job is already running!');
		next(error);
	} else {
		try {
			database.get<Partial<DatabaseJobItem>>('jobs').update({ ID: id }, { running: 'true' });
			setSeries(crawlAndIndex());
			setTimeout(async () => {
				database.get<Partial<DatabaseJobItem>>('jobs').update({ ID: id }, { running: 'false' });
				sendSeriesReloadToAll((s) => s.emit(callpointToEvent(LOOKUP[id].callpoint)));
			}, 3600);
			res.json(await assembleJobArray());
		} catch (error) {
			database.get<Partial<DatabaseJobItem>>('jobs').update({ ID: id }, { running: 'false' });
		}
	}
});

export { router, LOOKUP, callpointToEvent };
