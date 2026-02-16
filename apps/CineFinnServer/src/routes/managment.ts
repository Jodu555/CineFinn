import { Hono, type Context } from 'hono';
import { authFullMiddleware, type AuthedVars } from '../middleware/auth.js';
import { jobsTable } from '../database.js';
import { crawl } from '../job/crawler.js';
import { Role, type Job as IJob, type JobType, type timestamped } from '@cinefinn/types/database';
import { generatePreviewImages } from '../job/images.js';
import { Job } from '../job/Job.js';
import { generateJobID } from '../utils/IdGenerators.js';
import { checkForUpdates } from '../sockets/scraper.socket.js';



interface JobRegister {
    minimumRole: number;
}

const jobRegistry: Record<JobType, JobRegister> = {
    crawl: {
        minimumRole: 2,
    },
    generatePreviewImages: {
        minimumRole: 2,
    },
    'checkForUpdates-old': {
        minimumRole: 2,
    },
    'checkForUpdates-smart': {
        minimumRole: 2,
    },
};

async function checkIfRunning(type: string) {
    const jobs = await jobsTable.get();
    for (const job of jobs) {
        if (job.type == type) {
            if (job.finished_at == 0 && job.failed_at == 0) {
                return true;
            }
        }
    }
}


async function handleJob(type: JobType, c: Context<AuthedVars>, callFunction: (job: Job) => Promise<void>) {
    if (await checkIfRunning(type)) {
        return c.json({
            message: 'Job is already running!',
        });
    }
    const jobUUID = generateJobID();
    await jobsTable.create({
        UUID: jobUUID,
        type,
        data: {
        },
        result: {},
        logs: [],
        failed_at: 0,
        finished_at: 0,
    });
    const dbJob = await jobsTable.getOne({ UUID: jobUUID });
    if (dbJob == undefined) {
        //WHAT: This should never happen
        return c.json({
            message: 'Job not found',
        });
    }
    const job = Job.fromDB(dbJob);
    callFunction(job).catch(async e => {
        console.log(`Job Processing ERROR: ${e}`);
        await job.log(`Job Processing ERROR: ${e}`);
        await job.fail();
    });
    return c.json({
        message: 'Job started',
        jobUUID: job.UUID,
    });
}

const router = new Hono()
    .get('/jobs/info', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const jobs = await jobsTable.get();
        return c.json(jobs);
    })
    .delete('/jobs/delete/:UUID', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const jobUUID = c.req.param('UUID');
        const job = await jobsTable.getOne({ UUID: jobUUID });
        if (job == undefined) {
            return c.json({
                message: 'Job not found',
            });
        }
        await jobsTable.delete({ UUID: jobUUID });
        return c.json({
            message: 'Job deleted',
        });
    })
    .get('/job/crawl', authFullMiddleware((user) => user.role >= jobRegistry.crawl.minimumRole), async (c) => {
        return await handleJob('crawl', c, crawl);
    })
    .get('/job/generatePreviewImages', authFullMiddleware((user) => user.role >= jobRegistry.generatePreviewImages.minimumRole), async (c) => {
        return await handleJob('generatePreviewImages', c, generatePreviewImages);
    })
    .get('/job/checkForUpdates-smart', authFullMiddleware((user) => user.role >= jobRegistry['checkForUpdates-smart'].minimumRole), async (c) => {
        return await handleJob('checkForUpdates-old', c, (job) => checkForUpdates(job, true));
        return c.json({
            message: 'Not implemented yet',
        });
    })
    .get('/job/checkForUpdates-old', authFullMiddleware((user) => user.role >= jobRegistry['checkForUpdates-old'].minimumRole), async (c) => {
        return await handleJob('checkForUpdates-old', c, (job) => checkForUpdates(job, false));
        return c.json({
            message: 'Not implemented yet',
        });
    });

export { router as managmentRouter };