import fs from 'fs'
import path from 'path'
import child_process from 'child_process';
import IORedis from 'ioredis';
import { Queue, Worker, tryCatch } from 'bullmq';



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

function evalPath(config: Config, evalPath: string) {
    for (const [key, value] of Object.entries(config.pathRemapper)) {
        if (path.normalize(evalPath).startsWith(path.win32.normalize(key))) {
            const mappedPath = path.win32.normalize(path.win32.normalize(evalPath).replace(path.win32.normalize(key), value));
            return mappedPath.replaceAll('\\', '/')
        }
    }
}

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

    config.pathRemapper['X:\\MediaLib\\Application\\'] = '\\media\\pi\\Seagate Expansion Drive\\MediaLib\\Application\\'

    interface JobMeta {
        serieID: string;
        entity: any;
        lang: string;
        filePath: string,
        output: string,
        imagePathPrefix: string,
    };

    const worker = new Worker<JobMeta>('previewImageQueue', async (job) => {
        console.log(job.id, job.data);
        const vidFile = evalPath(config, job.data.filePath)
        const imgDir = evalPath(config, job.data.output)

        console.log(vidFile);
        console.log(imgDir);

        const command = `ffmpeg -i "${vidFile}" -vf fps=1/10,scale=120:-1 "${path.join(imgDir, 'preview%d.jpg')}"`;

        console.log('=> ', command);

        await wait(10000);
        return;
    }, { connection, concurrency: config.concurrentGenerators });

}

async function deepExecPromisify(command: string, cwd: string = undefined) {
    return await new Promise((resolve, reject) => {
        //maxBuffer: Default: 200KB and this sets it to 900KB
        child_process.exec(command, { encoding: 'utf8', cwd, maxBuffer: 1024 * 900 }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            resolve([...stdout?.split('\n'), ...stderr?.split('\n')]);
        });
    });
}

main();