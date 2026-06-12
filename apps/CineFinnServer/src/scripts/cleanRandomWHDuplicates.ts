import { connectDatabase, watchHistoryTable } from "../database.js";

async function run() {
    await connectDatabase(true);
    const historys = await watchHistoryTable.get();
    const duplicateDetector = new Set();
    const duplicateCountMap = new Map<string, number>();
    const duplicateIDMap = new Map<string, string[]>();
    for (const element of historys) {
        const key = `${element.account_UUID}:${element.series_UUID}:${element.watchable_UUID}`;
        if (duplicateDetector.has(key)) {
            console.log('Duplicate', element.UUID, element.account_UUID, element.series_UUID, element.watchable_UUID);
            duplicateCountMap.set(element.account_UUID, (duplicateCountMap.get(element.account_UUID) ?? 0) + 1);
            if (duplicateIDMap.has(key)) {
                duplicateIDMap.get(key)!.push(element.UUID);
            } else {
                duplicateIDMap.set(key, [element.UUID]);
            }
        } else {
            duplicateDetector.add(key);
        }
    }
    console.log(duplicateCountMap);
    console.log('Finished Processing ' + historys.length + ' Episodes BUT ' + duplicateDetector.size);
}

run().catch(console.error).then(() => {
    console.log('Done');
    process.exit(0);
});