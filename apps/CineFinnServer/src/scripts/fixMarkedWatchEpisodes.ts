import dotenv from 'dotenv';
import { connectDatabase, watchableEntitysTable, watchHistoryTable } from '../database.js';
dotenv.config();;

/**
 * This is a justification for why this script exists.
 * This Script is important cuase in the old system we assumed 310 seconds watchtime to be marked as watched cause we did not know the actual runtime
 * the actual runtime only got saved when the user actually watched the video but the system had a mark as watched button for seasons and episodes
 * And cause we did not know the actual runtime we assumed 310 seconds watchtime to be marked as watched. Cause over 500 or something sometimes broke
 * the system when the user wanted to jump to the time to resume watching but the video was not long enough for that.
 */

async function run() {
    await connectDatabase(true);

    const autoMarkedEpisodes = await watchHistoryTable.get({
        watchTime: 310,
    });

    let i = 0;
    for (const autoMarkedEpisode of autoMarkedEpisodes) {
        i++;
        (i === 1 || i % 50 === 0) && console.log(`Working on (${i}/${autoMarkedEpisodes.length}): ${autoMarkedEpisode.watchable_UUID}`);

        const watchableEntitys = await watchableEntitysTable.get({
            watchable_UUID: autoMarkedEpisode.watchable_UUID
        })

        if (watchableEntitys.some(x => x.runtime === -1)) {
            console.log('Skipping', autoMarkedEpisode.watchable_UUID, 'because of missing runtime');
            continue;
        }

        const averageWatchTime = watchableEntitys.reduce((prev, curr) => prev + curr.runtime, 0) / watchableEntitys.length;

        if (autoMarkedEpisode.watchTime !== averageWatchTime) {
            console.log('Updating', autoMarkedEpisode.watchable_UUID, 'from', autoMarkedEpisode.watchTime, 'to', averageWatchTime);
            await watchHistoryTable.update({
                UUID: autoMarkedEpisode.UUID,
            }, {
                watchTime: averageWatchTime,
            });
        }
    }

}