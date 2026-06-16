import fs from 'fs';
import watchStringUtils, { type ISegment } from './utils/translationV1WatchString.js';
import { Database } from '@jodu555/mysqlapi';

const affectedAccounts = [
    'ad733837-b2cf-47a2-b968-abaa70edbffe',
    '44b563a2-7e6d-44e3-8cf1-353b4c9213d1',
    'b92e931c-48d1-458b-9e64-6df8ebbbbda2'
]

async function main() {
    const oldDB = Database.createDatabase(process.env.OLD_DB_HOST!, process.env.OLD_DB_USERNAME!, process.env.OLD_DB_PASSWORD!, process.env.OLD_DB_DATABASE!);
    await oldDB.connect();
    const watchStringDatas = await oldDB.get('watch_strings').get({}) as { account_UUID: string; watch_string: string; }[];

    const segmentToKey = (segment: ISegment) => `${segment.ID}:${segment.season}:${segment.episode}:${segment.movie}`;

    for (const watchStringData of watchStringDatas) {
        if (affectedAccounts.includes(watchStringData.account_UUID)) {
            const data = watchStringUtils.parse(watchStringData.watch_string);
            const bucketMap = new Map<string, ISegment>();
            for (const segment of data) {
                const key = `${segment.ID}:${segment.season}:${segment.episode}:${segment.movie}`;
                if (bucketMap.has(key)) {
                    const existing = bucketMap.get(key)!;
                    if (Number(existing.time) > segment.time) {
                        bucketMap.set(key, segment as any as ISegment);
                    }
                } else {
                    bucketMap.set(key, segment as any as ISegment);
                }
            }
            const newData = [];
            for (const [key, segment] of bucketMap) {
                newData.push(segment);
            }
            if (newData.length !== data.length) {
                console.log('Different length', newData.length, data.length);
                watchStringUtils.save(watchStringData.account_UUID, watchStringUtils.generateStr(newData as any));
            }
        }
    }


}

main().catch(console.error).finally(() => {
    process.exit(0);
});