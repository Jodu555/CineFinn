import type { timestamped, WatchHistory } from "@cinefinn/types";
import { connectDatabase, watchHistoryTable } from "../database.js";

async function run() {
    await connectDatabase(true);
    const historys = await watchHistoryTable.get();
    const watchHistoryUUIDToHistory = new Map<string, (WatchHistory & timestamped)>();

    const duplicateDetector = new Set();
    const duplicateCountMap = new Map<string, number>();
    const duplicateIDMap = new Map<string, string[]>();
    for (const history of historys) {
        if (watchHistoryUUIDToHistory.has(history.UUID)) {
            console.log('Duplicate', history.UUID, history.account_UUID, history.series_UUID, history.watchable_UUID);
            process.exit(1);
            continue;
        }
        watchHistoryUUIDToHistory.set(history.UUID, history);
        const key = `${history.account_UUID}:${history.series_UUID}:${history.watchable_UUID}`;
        if (duplicateDetector.has(key)) {
            console.log('Duplicate', history.UUID, history.account_UUID, history.series_UUID, history.watchable_UUID);
            duplicateCountMap.set(history.account_UUID, (duplicateCountMap.get(history.account_UUID) ?? 0) + 1);
            if (duplicateIDMap.has(key)) {
                duplicateIDMap.get(key)!.push(history.UUID);
            } else {
                duplicateIDMap.set(key, [history.UUID]);
            }
        } else {
            duplicateDetector.add(key);
        }
    }
    console.log(duplicateIDMap);
    console.log(duplicateCountMap);
    console.log('Finished Processing ' + historys.length + ' Episodes BUT ' + duplicateDetector.size);

    for (const [key, WHIDs] of duplicateIDMap) {
        const allWatchtimes = WHIDs.map(x => watchHistoryUUIDToHistory.get(x)!.watchTime).filter(x => x != undefined)
        const highestWatchTime = Math.max(...allWatchtimes);
        console.log('Highest Watchtime', highestWatchTime, 'for', key, 'is', allWatchtimes);
    }
}

run().catch(console.error).then(() => {
    console.log('Done');
    process.exit(0);
});