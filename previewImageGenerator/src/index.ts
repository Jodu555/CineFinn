import fs from 'fs'
import path from 'path'
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

    // const worker = new Worker('previewImageQueue', async (job) => {
    //     await wait(500);
    //     console.log(job.id, job.data);
    //     return;
    // }, { connection, concurrency: config.concurrentGenerators });


    const tmp = {
        imagePathPrefix: 'X:\\MediaLib\\Application\\images',
        serieID: 'cfbe03da',
        entity: {
            filePath: 'X:\\MediaLib\\Application\\vids\\Aniworld\\That Time I Got Reincarnated as a Slime\\Season-1\\That Time I Got Reincarnated as a Slime St#1 Flg#22.mp4',
            primaryName: 'That Time I Got Reincarnated as a Slime',
            secondaryName: '',
            season: 1,
            episode: 22,
            langs: ['GerDub']
        },
        lang: 'GerDub',
        output: 'X:\\MediaLib\\Application\\images\\cfbe03da\\previewImages\\1-22\\GerDub',
        filePath: 'X:\\MediaLib\\Application\\vids\\Aniworld\\That Time I Got Reincarnated as a Slime\\Season-1\\That Time I Got Reincarnated as a Slime St#1 Flg#22.mp4'
    }



    config.pathRemapper['X:\\MediaLib\\Application\\'] = '\\media\\pi\\Seagate Expansion Drive\\MediaLib\\Application\\'


    for (const [key, value] of Object.entries(config.pathRemapper)) {
        if (path.normalize(tmp.filePath).startsWith(path.win32.normalize(key))) {

            const inputFile = path.win32.normalize(path.win32.normalize(tmp.filePath).replace(path.win32.normalize(key), value));
            const output = path.win32.normalize(path.win32.normalize(tmp.output).replace(path.win32.normalize(key), value));

            console.log('mp4 file', inputFile);
            console.log('image dir out', output);

            try {
                console.log(1, fs.statSync(inputFile.replaceAll('\\', '/')));
                console.log(2, fs.readdirSync(output.replaceAll('\\', '/')));

            } catch (error) {
                console.error(1);
            }

        }
    }




}

main();