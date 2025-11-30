import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { CacheContext } from "../LRUCache.js";
import { Job } from "./Job.js";
import { episodesTable, moviesTable, seriesTable, watchableEntitysTable } from "../database.js";
import { getConfig } from "../config.js";

async function watchableUUIDToWatchable(wactableUUID: string, cache: CacheContext) {
    if (wactableUUID.startsWith('EP#')) {
        let { data: episode, cacheInfo: existingSeasonCacheInfo } = await cache.execute(episodesTable, 'getOne', [{
            UUID: wactableUUID,
            unique: true,
        }]);
        return episode;
    } else if (wactableUUID.startsWith('MO#')) {
        const movie = await moviesTable.getOne({ UUID: wactableUUID });
        return movie;
    } else {
        throw new Error('Unknown Watchable UUID' + wactableUUID);
    }
}


interface QueuedPreviewImageGenerationJob {
    type: 'generatePreviewImages';
    data: {
        publicStreamURL: string;
        seriesUUID: string;
        watchableEntityUUID: string;
        resultPath: string;
        readrate: number;
    };
}

export async function generateImages(jobUUID: string) {
    const config = getConfig();
    const job = await Job.fromDBUUID(jobUUID);
    await job.log('Started Image Crawling');
    const generatorEpisodesCache = new CacheContext('crawler-generator-episodes', 250);
    const generatorSeriesCache = new CacheContext('crawler-generator-series', 500);

    const watchableEntities = await watchableEntitysTable.get({});


    const queuedJobs: QueuedPreviewImageGenerationJob[] = [];

    for await (const watchableEntity of watchableEntities) {
        const watchable = await watchableUUIDToWatchable(watchableEntity.watchable_UUID, generatorEpisodesCache);
        if (watchable == undefined) {
            await job.log('Watchable not found', watchableEntity.watchable_UUID, 'for', watchableEntity.UUID);
            continue;
        }
        const { data: series, cacheInfo: existingSeriesCacheInfo } = await generatorSeriesCache.execute(seriesTable, 'getOne', [{
            UUID: watchable.serie_UUID,
            unique: true,
        }]);
        if (series == undefined) {
            await job.log('Series not found', watchableEntity.watchable_UUID, 'for', watchableEntity.UUID, 'seriesuuid', watchable.serie_UUID);
            continue;
        }


        const resultPath = path.join(config.imagePath, series.UUID, 'previewImages', watchableEntity.UUID);
        if (fs.existsSync(resultPath) && (await fsPromises.readdir(resultPath)).length != 0) {
            //We may predict that greater than 0 files means it worked not the best
            //TODO: lets get back to this and compute it with the actual file length and a rough estimation of how many images there should be
            // Around 15% to 20% deviation should be okay
            continue;
        }
        fs.mkdirSync(resultPath, { recursive: true });

        const videoURL = new URL(`${config.system.PUBLIC_API_ENDPOINT}/video/${watchableEntity.UUID}`);
        videoURL.searchParams.set('auth-token', config.system.PUBLIC_API_AUTH_TOKEN);

        const generatedQueueJob = {
            type: 'generatePreviewImages',
            data: {
                publicStreamURL: videoURL.toString(),
                seriesUUID: series.UUID,
                watchableEntityUUID: watchableEntity.UUID,
                resultPath,
                readrate: 0 //TODO: implement this via SubSystem
            }
        } satisfies QueuedPreviewImageGenerationJob;
        queuedJobs.push(generatedQueueJob);
        await job.log(`Queued ${generatedQueueJob.type} series: ${series.UUID} watchableEntity: ${watchableEntity.UUID}`);
    }
    await job.setData(queuedJobs);
    await job.success();

}