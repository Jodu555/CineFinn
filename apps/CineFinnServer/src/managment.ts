import { Hono, type Context } from 'hono';
import { authFullMiddleware, type AuthedVars } from './auth.js';
import { jobsTable } from './database.js';
import { crawl } from './crawler.js';
import type { JobType } from '@cinefinn/types/database';

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

async function handleJob(type: JobType, c: Context<AuthedVars>, callFunction: (jobUUID: string) => Promise<void>) {
    if (await checkIfRunning(type)) {
        return c.json({
            message: 'Job is already running!',
        });
    }
    const job = await jobsTable.create({
        UUID: crypto.randomUUID(),
        type,
        data: {
        },
        result: {},
        logs: [],
        failed_at: 0,
        finished_at: 0,
    });
    callFunction(job.UUID);
    return c.json({
        message: 'Job started',
        jobUUID: job.UUID,
    });
}

router.get('/job/crawl', authFullMiddleware((user) => user.role >= 1), async (c) => {
    return await handleJob('crawl', c, crawl);
});

router.get('/job/img/generate', authFullMiddleware((user) => user.role >= 1), async (c) => {
    return c.json({
        message: 'Not implemented yet',
    });
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