import fs from 'fs'
import path from 'path'
import IORedis from 'ioredis';
import { Queue, Worker } from 'bullmq';



export const wait = (timeout: number) => {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    });
};

interface Config {
    version: string;
    redisConnection: {
        host: string;
        port: number;
        password: string;
    }
    concurrentGenerators: number,
    pathRemapper: Record<string, string>;
}

const defaultConfig: Config = {
    version: '1.0.0',
    redisConnection: {
        host: 'localhost',
        port: 6379,
        password: null
    },
    concurrentGenerators: 5,
    pathRemapper: {
        '/media/all/CineFinn-data': '/mnt/test'
    }
};



async function main() {

    const previewImageQueue = 'previewImageQueue'

    if (!fs.existsSync(path.join(__dirname, 'config.json'))) {
        fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(defaultConfig, null, 3));
        console.error('Config file not found, creating default config...');
        process.exit(1);
    }

    const config: Config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

    if (config.version !== defaultConfig.version) {
        console.error('Config version mismatch! It could be that your config is outdated. Exiting...');
        process.exit(1);
    }

    const connection = new IORedis({
        maxRetriesPerRequest: null,
        host: config.redisConnection.host,
        port: config.redisConnection.port,
        password: config.redisConnection.password
    });

    const worker = new Worker('previewImageQueue', async (job) => {
        await wait(500);
        console.log(job.id, job.data);
        return;
    }, { connection, concurrency: config.concurrentGenerators });


}

main();