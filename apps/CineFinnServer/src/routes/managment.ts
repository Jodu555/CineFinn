import { Hono, type Context } from 'hono';
import { authFullMiddleware, type AuthedVars } from '../auth.js';
import { jobsTable } from '../database.js';
import { crawl } from '../job/crawler.js';
import type { JobType } from '@cinefinn/types/database';
import { generatePreviewImages } from '../job/images.js';
import { tryCatch } from '../tryCatch.js';
import { Job } from '../job/Job.js';

const router = new Hono();

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

router.get('/jobs/info', authFullMiddleware((user) => user.role >= 1), async (c) => {
    const jobs = await jobsTable.get();
    return c.json(jobs);
});

async function handleJob(type: JobType, c: Context<AuthedVars>, callFunction: (job: Job) => Promise<void>) {
    if (await checkIfRunning(type)) {
        return c.json({
            message: 'Job is already running!',
        });
    }
    const jobUUID = crypto.randomUUID();
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
        await job.log(`JOb Processing ERROR: ${e}`);
        await job.fail();
    });
    return c.json({
        message: 'Job started',
        jobUUID: job.UUID,
    });
}

router.get('/job/crawl', authFullMiddleware((user) => user.role >= 1), async (c) => {
    return await handleJob('crawl', c, crawl);
});

router.get('/job/generatePreviewImages', authFullMiddleware((user) => user.role >= 1), async (c) => {
    return await handleJob('generatePreviewImages', c, generatePreviewImages);
    // return c.json({
    //     message: 'Not implemented yet',
    // });
});

router.get('/job/checkForUpdates-smart', authFullMiddleware((user) => user.role >= 1), async (c) => {
    return c.json({
        message: 'Not implemented yet',
    });
});

router.get('/job/checkForUpdates-old', authFullMiddleware((user) => user.role >= 1), async (c) => {
    return c.json({
        message: 'Not implemented yet',
    });
});

export { router as managmentRouter };