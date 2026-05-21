import fs, { watch } from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { CacheContext } from "../LRUCache.js";
import { Job } from "./Job.js";
import { episodesTable, moviesTable, seriesTable, watchableEntitysTable } from "../database.js";
import { getConfig } from "../config.js";
import { forEachNonBlockingAsync, getIORedis, watchableUUIDToWatchable } from '../utils.js';
import { Queue, QueueEvents } from 'bullmq';
import type { QueuedPreviewImageGenerationJob, QueuedPreviewImageGenerationJobData, Series, timestamped } from '@cinefinn/types';
import { getSubSocketByID } from '../sockets/subsystem.socket.js';

export async function generatePreviewImages(job: Job) {
    const config = getConfig();
    await job.log('Started Image Crawling');
    // const generatorEpisodesCache = new CacheContext('crawler-generator-episodes', 250);
    // const generatorSeriesCache = new CacheContext('crawler-generator-series', 500);

    await job.time('Loading Watchable Entities from DB');
    const watchableEntities = await watchableEntitysTable.get();
    await job.timeEnd('Loading Watchable Entities from DB');

    const seriesIDMap = new Map<string, (Series & timestamped)>();
    await job.time('Loading Series from DB');
    const series = await seriesTable.get();
    for (const serie of series) {
        seriesIDMap.set(serie.UUID, serie);
    }
    await job.timeEnd('Loading Series from DB');


    await job.time('Handling Watchable Entities');
    const queuedJobs: QueuedPreviewImageGenerationJob[] = [];
    // let i = 0;
    // for await (const watchableEntity of watchableEntities) {
    await forEachNonBlockingAsync(watchableEntities, 15, async (watchableEntity, i) => {
        // i++;
        (i % 5000 == 0 || i == 1) && job.log(`Handling File ${i}/${watchableEntities.length + 1}`);
        // const watchable = await watchableUUIDToWatchable(watchableEntity.watchable_UUID, generatorEpisodesCache);
        // if (watchable == undefined) {
        //     job.log('Watchable not found', watchableEntity.watchable_UUID, 'for', watchableEntity.UUID);
        //     continue;
        // }
        // const { data: series, cacheInfo: existingSeriesCacheInfo } = await generatorSeriesCache.execute(seriesTable, 'getOne', [{
        //     UUID: watchableEntity.serie_UUID,
        //     unique: true,
        // }]);
        const serie = seriesIDMap.get(watchableEntity.serie_UUID)!;
        if (serie == undefined) {
            job.log('Series not found', watchableEntity.watchable_UUID, 'for', watchableEntity.UUID, 'seriesuuid', watchableEntity.serie_UUID);
            return;
        }


        const resultPath = path.join(config.imagePath, serie.UUID, 'previewImages', watchableEntity.watchable_UUID, watchableEntity.UUID);
        if (fs.existsSync(resultPath) && (await fsPromises.readdir(resultPath)).length != 0) {
            //We may predict that greater than 0 files means it worked not the best
            //TODO: lets get back to this and compute it with the actual file length and a rough estimation of how many images there should be
            // Around 15% to 20% deviation should be okay
            return;
        }
        fs.mkdirSync(resultPath, { recursive: true });

        const videoURL = new URL(`${config.system.PUBLIC_API_ENDPOINT}/video/${watchableEntity.UUID}`);
        videoURL.searchParams.set('auth-token', config.system.PUBLIC_API_AUTH_TOKEN);

        const subSystemSocket = await getSubSocketByID(watchableEntity.subID);

        const bandwidth = subSystemSocket ? subSystemSocket.data.auth.bandwidth : 0;

        const generatedQueueJob = {
            UUID: crypto.randomUUID(),
            type: 'generatePreviewImages',
            data: {
                publicStreamURL: videoURL.toString(),
                seriesUUID: serie.UUID,
                entity: watchableEntity,
                resultPath,
                bandwidth,
            }
        } satisfies QueuedPreviewImageGenerationJob;
        queuedJobs.push(generatedQueueJob);
        //job.log(`Queued ${generatedQueueJob.type} series: ${series.UUID} watchableEntity: ${watchableEntity.UUID}`);
    });
    // }


    await job.timeEnd('Handling Watchable Entities');
    await job.setResult({
        count: queuedJobs.length,
        first50: JSON.parse(JSON.stringify(queuedJobs)).slice(0, 50),
    });
    job.log(`Finished Image Crawling (${queuedJobs.length})`);
    job.time('Adding to Queue');
    const previewImageQueue = 'previewImageQueue';
    const connection = getIORedis();
    const queue = new Queue<QueuedPreviewImageGenerationJobData>(previewImageQueue, { connection });
    //TODO: Here queue.addBulk can be used to add all jobs at once
    await forEachNonBlockingAsync(queuedJobs, 2, async (p, i) => {
        await queue.add(p.data.seriesUUID, p.data, { removeOnComplete: false, removeOnFail: false });
    });
    job.timeEnd('Adding to Queue');
    await job.success();
}