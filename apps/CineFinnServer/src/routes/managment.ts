import type { CallJobResponse, JobType } from '@cinefinn/types/models/system';
import { Role } from '@cinefinn/types/models/user';
import { Hono, type Context } from 'hono';
import { jobsTable } from '../database.js';
import { crawl } from '../job/crawler.js';
import { generatePreviewImages } from '../job/images.js';
import { Job } from '../job/Job.js';
import { authFullMiddleware, type AuthedVars } from '../middleware/auth.js';
import { checkForUpdates } from '../sockets/scraper.socket.js';
import { generateJobID } from '../utils/IdGenerators.js';



interface JobRegister {
    minimumRole: number;
    callFunction: (job: Job) => Promise<void>;
}

const jobRegistry: Record<JobType, JobRegister> = {
    crawl: {
        minimumRole: 2,
        callFunction: crawl,
    },
    generatePreviewImages: {
        minimumRole: 3,
        callFunction: generatePreviewImages,
    },
    'checkForUpdates-old': {
        minimumRole: 3,
        callFunction: (job) => checkForUpdates(job, false),
    },
    'checkForUpdates-smart': {
        minimumRole: 2,
        callFunction: (job) => checkForUpdates(job, true),
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

export async function callJob(type: JobType): Promise<CallJobResponse> {

    const jobRegister = jobRegistry[type];
    if (jobRegister == undefined) {
        return {
            error: true,
            message: 'Job not found in jobRegistry',
        };
    }

    if (await checkIfRunning(type)) {
        return {
            error: true,
            message: 'Job is already running!',
        };
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
        return {
            error: true,
            message: 'Job not found',
        };
    }
    const job = Job.fromDB(dbJob);
    jobRegister.callFunction(job).catch(async e => {
        console.log(`Job Processing ERROR: ${e}`);
        await job.log(`Job Processing ERROR: ${e}`);
        await job.fail();
    });
    return {
        error: false,
        message: 'Job started',
        jobUUID: job.UUID,
    };
}

async function handleJobHonoContext(type: JobType, c: Context<AuthedVars>) {
    const jobCallResponse = await callJob(type);
    if (jobCallResponse.error) {
        return c.json(jobCallResponse.message, 400);
    } else {
        return c.json(jobCallResponse);
    }
}

const router = new Hono()
    .get('/jobs/info', authFullMiddleware((user) => user.role >= Role.Mod), async (c) => {
        const jobs = await jobsTable.get();
        return c.json(jobs.filter(job => {
            return jobRegistry[job.type as JobType]?.minimumRole <= c.get('credentials').user.role;
        }));
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
        return await handleJobHonoContext('crawl', c);
    })
    .get('/job/generatePreviewImages', authFullMiddleware((user) => user.role >= jobRegistry.generatePreviewImages.minimumRole), async (c) => {
        return await handleJobHonoContext('generatePreviewImages', c);
    })
    .get('/job/checkForUpdates-smart', authFullMiddleware((user) => user.role >= jobRegistry['checkForUpdates-smart'].minimumRole), async (c) => {
        return await handleJobHonoContext('checkForUpdates-smart', c);
    })
    .get('/job/checkForUpdates-old', authFullMiddleware((user) => user.role >= jobRegistry['checkForUpdates-old'].minimumRole), async (c) => {
        return await handleJobHonoContext('checkForUpdates-old', c);
    });

export { router as managmentRouter };
