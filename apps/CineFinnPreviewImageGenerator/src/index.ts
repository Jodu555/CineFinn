import fs from 'fs';
import path from 'path';
import axios from 'axios';
import child_process from 'child_process';
import { Redis } from 'ioredis';
import { Job, Worker } from 'bullmq';
// import { JobMeta } from '@Types/index';
import { CommandManager, Command } from '@jodu555/commandmanager';
import { getConfig, type Config } from './config.js';
import type { QueuedPreviewImageGenerationJobData } from '@cinefinn/types';


interface FFmpegDuration {
    h: number;
    m: number;
    s: number;
}

interface FFmpegResult {
    code: number | null;
    output: string[];
    duration: FFmpegDuration | null;
    highestSpeed: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PREVIEW_IMAGE_QUEUE = 'previewImageQueue';
const CONFIG_PATH = path.join('.', 'config.json');
const MAX_JOB_ATTEMPTS = 3;
const FFMPEG_START_TIMEOUT_MS = 2 * 60 * 1000;   // 2 minutes to produce first output
const FFMPEG_STALL_TIMEOUT_MS = 4 * 60 * 1000;   // 4 minutes between any output lines
const MIN_COMPLETION_PERCENT = 98;


/** Splits an array into chunks of at most `size` items. but could be smaller */
function chunkArray<T>(arr: T[], size: number): T[][] {
    return arr.reduce<T[][]>((acc, item, i) => {
        const idx = Math.floor(i / size);
        (acc[idx] ??= []).push(item);
        return acc;
    }, []);
}

/** Converts an FFmpegDuration to total num of seconds */
function durationToSeconds({ h, m, s }: FFmpegDuration): number {
    return s + m * 60 + h * 3600;
}

/** Formats an FFmpegDuration as HH:MM:SS */
function formatDuration({ h, m, s }: FFmpegDuration): string {
    return [h, m, s].map((n) => String(n ?? 0).padStart(2, '0')).join(':');
}

/**
 * Spawns an FFmpeg process and resolves once it exits with code 0.
 * Rejects if:
 *  - FFmpeg never produces its first progress line within FFMPEG_START_TIMEOUT_MS
 *  - FFmpeg stalls (no new output) for FFMPEG_STALL_TIMEOUT_MS
 *  - FFmpeg exits with a non-zero code
 *
 * The `onProgress` callback is fire-and-forget (not awaited) to avoid
 * blocking the stderr reader and causing the process to stall.
 */
function spawnFFmpegProcess(
    command: string,
    cwd: string | undefined,
    onProgress: (speed: number, percent: number) => void,
): Promise<FFmpegResult> {
    return new Promise((resolve, reject) => {
        const proc = child_process.spawn(command, { shell: true, cwd });

        let duration: FFmpegDuration | null = null;
        let highestSpeed = 0;
        const outputLines: string[] = [];
        let lastOutputAt = Date.now();
        let firstProgressSeen = false;

        // Reject if FFmpeg never starts producing progress output.
        const startTimeout = setTimeout(() => {
            proc.kill();
            reject(new Error(`FFmpeg never produced progress output within ${FFMPEG_START_TIMEOUT_MS / 1000}s`));
        }, FFMPEG_START_TIMEOUT_MS);

        // Reject if FFmpeg stalls mid-run.
        const stallCheck = setInterval(() => {
            const stalledFor = Date.now() - lastOutputAt;
            if (firstProgressSeen && stalledFor > FFMPEG_STALL_TIMEOUT_MS) {
                console.error(`FFmpeg stalled for ${stalledFor / 1000}s — killing process`);
                proc.kill();
                clearInterval(stallCheck);
                reject(new Error(`FFmpeg stalled for ${stalledFor / 1000}s`));
            }
        }, 5_000);

        proc.stderr.setEncoding('utf8');
        proc.stderr.on('data', (data: string) => {
            const lines = data.split('\n');
            outputLines.push(...lines);
            lastOutputAt = Date.now();

            for (const line of lines) {
                // Progress lines look like: frame=  42 fps=0.0 ... time=00:07:00 ... speed=  2x
                if (!line.includes('frame=') || !line.includes('fps=') || !line.includes('time=')) continue;

                // Parse total duration once from the accumulated output header.
                if (duration === null) {
                    try {
                        const joined = outputLines.join(' ').replaceAll(/[\r\n\t]/g, '');
                        const [, afterDuration] = joined.split('Duration: ');
                        const [timeStr] = afterDuration.split(',');
                        const [h, m, sc] = timeStr.split(':');
                        duration = { h: Number(h), m: Number(m), s: parseInt(sc) };
                    } catch {
                        // Duration not yet available in buffer — will retry on next line.
                    }
                }

                if (duration === null) continue;

                try {
                    const speed = parseFloat(line.split('speed=')[1].split('x')[0]);
                    const [timeStr] = line.split('time=')[1].split(' ');
                    const [h, m, sc] = timeStr.split(':');
                    const elapsed: FFmpegDuration = { h: Number(h), m: Number(m), s: parseInt(sc) };
                    const percent = (durationToSeconds(elapsed) / durationToSeconds(duration)) * 100;

                    if (speed > highestSpeed) highestSpeed = speed;

                    if (!firstProgressSeen) {
                        firstProgressSeen = true;
                        clearTimeout(startTimeout);
                    }

                    // Fire-and-forget — do NOT await here to avoid blocking stderr.
                    onProgress(speed, percent);
                } catch {
                    // Malformed progress line — skip.
                }
            }
        });

        proc.on('close', (code) => {
            clearInterval(stallCheck);
            clearTimeout(startTimeout);

            const result: FFmpegResult = { code, output: outputLines, duration, highestSpeed };

            if (code === 0) {
                resolve(result);
            } else {
                reject(result);
            }
        });
    });
}

/** Runs the FFmpeg command up to MAX_JOB_ATTEMPTS times. Returns true on success. */
async function runFFmpegWithRetries(job: Job<QueuedPreviewImageGenerationJobData>, outputDir: string, command: string): Promise<boolean> {
    for (let attempt = 1; attempt <= MAX_JOB_ATTEMPTS; attempt++) {
        await job.log(`Attempt #${attempt} — ${command}`);
        console.log(`${job.id} => Attempt #${attempt}`);

        try {
            fs.mkdirSync(outputDir, { recursive: true });

            let lastPercent = 0;
            const { code, duration, highestSpeed } = await spawnFFmpegProcess(command, outputDir, (speed, percent) => {
                lastPercent = parseFloat(percent.toFixed(2));
                // Async log — intentionally not awaited to avoid stalling FFmpeg stderr.
                job.log(`FFmpeg: ${speed}x speed, ${lastPercent}%`);
                job.updateProgress(lastPercent);
            });

            const durationStr = formatDuration(duration!);
            console.log(`${job.id} => Done (exit ${code}) — ${durationStr} video, peak ${highestSpeed}x speed, ${lastPercent}% complete`);

            if (lastPercent < MIN_COMPLETION_PERCENT) {
                await job.log(`Incomplete: only reached ${lastPercent}% (threshold: ${MIN_COMPLETION_PERCENT}%)`);
                continue; // Retry
            }

            await job.log(`Success on attempt #${attempt} — exit ${code}, ${durationStr} video, peak ${highestSpeed}x`);
            return true;

        } catch (error) {
            await job.log(`Attempt #${attempt} failed: ${error}`);
            console.error(`${job.id} => Attempt #${attempt} failed:`, error);
        }
    }

    return false;
}

/** Uploads generated preview images to the API and cleans up the temp directory. */
async function uploadPreviewImages(job: Job<QueuedPreviewImageGenerationJobData>, outputDir: string): Promise<void> {
    const log = async (...args: unknown[]) => {
        const msg = args.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ');
        await job.log(msg);
        console.log(job.id, msg);
    };

    const url = new URL(job.data.publicStreamURL);
    const token = url.searchParams.get('auth-token');

    await log('Uploading via experimental API —', url.origin);

    type PresignMeta = {
        type: 'movie' | 'episode';
        seriesUUID: string;
        watchableEntityUUID: string;
        watchableUUID: string;
    };

    const entity = job.data.entity as any;
    const presignMeta: PresignMeta = entity.season !== undefined
        ? {
            type: 'episode',
            seriesUUID: job.data.seriesUUID,
            watchableEntityUUID: job.data.entity.UUID,
            watchableUUID: job.data.entity.watchable_UUID,
        }
        : {
            type: 'movie',
            seriesUUID: job.data.seriesUUID,
            watchableEntityUUID: job.data.entity.UUID,
            watchableUUID: job.data.entity.watchable_UUID,
        };

    const presignRes = await axios.post(
        `${url.origin}/previewImages/createPresignedURL?auth-token=${token}`,
        presignMeta,
    );
    const { key } = presignRes.data;
    await log('Presigned URL created — key:', key, 'meta:', presignMeta);

    const files = fs.readdirSync(outputDir);
    const chunks = chunkArray(files, 100);
    await log(`Uploading ${files.length} files in ${chunks.length} chunk(s)`);

    for (let i = 0; i < chunks.length; i++) {
        const formData = new FormData();
        for (const file of chunks[i]) {
            const blob = new Blob([fs.readFileSync(path.join(outputDir, file))], { type: 'image/jpeg' });
            formData.append('file', blob, file);
        }

        const start = Date.now();
        await axios.post(
            `${url.origin}/previewImages/upload?auth-token=${token}&key=${key}`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        await log(`Uploaded chunk ${i + 1}/${chunks.length} (${chunks[i].length} files, ${Date.now() - start}ms)`);
    }

    const deleteRes = await axios.post(
        `${url.origin}/previewImages/deletePresignedURL?auth-token=${token}`,
        { key },
    );
    await log('Presigned URL deleted — key:', key, 'response:', deleteRes.data);

    fs.rmSync(outputDir, { recursive: true, force: true });
}

function calcReadrate(bandwidthMBs: number, inputFile: string): number {
    const result = child_process.execSync(
        `ffprobe -v error -show_entries format=bit_rate \
     -of default=noprint_wrappers=1:nokey=1 "${inputFile}"`
    ).toString().trim();

    const streamBitrateBps = parseInt(result, 10);

    if (!streamBitrateBps || streamBitrateBps <= 0) {
        return -1;
    }

    const bandwidthBps = bandwidthMBs * 8_000_000;

    const readrate = bandwidthBps / streamBitrateBps;

    return Math.min(50, Math.max(0.5, readrate));
}

async function main() {
    const config = getConfig();

    const connection = new Redis({
        maxRetriesPerRequest: null,
        host: config.redisConnection.host,
        port: config.redisConnection.port,
        password: config.redisConnection.password,
    });

    const worker = new Worker<QueuedPreviewImageGenerationJobData>(
        PREVIEW_IMAGE_QUEUE,
        async (job) => {
            await job.updateData({ ...job.data, generatorName: config.generatorName });

            // Decorative header in the job log so it's easy to spot which generator handled it.
            const bar = '='.repeat(config.generatorName.length);
            await job.log(`----- ${bar} -----`);
            for (let i = 0; i < 5; i++) await job.log(`----- ${config.generatorName} -----`);
            await job.log(`----- ${bar} -----`);

            console.log(`Received job: ${job.id}`);

            // Non-main sub-items (e.g. dubbed tracks) must supply a stream URL.
            if (job.data.entity.subID !== 'main' && !job.data.publicStreamURL) {
                throw new Error(`No publicStreamURL for subID: ${job.data.entity.subID}`);
            }

            // Resolve the input — either a remote stream URL or a local (remapped) file path.


            let readRateArg = '';
            if (config.useReadRate && job.data.bandwidth != 0) {
                const readRate = calcReadrate(job.data.bandwidth, job.data.publicStreamURL);
                await job.log(`Calculated readrate: ${readRate}`);
                console.log('Using Readrate:', readRate);

                if (readRate > 0) {
                    readRateArg = `-readrate ${readRate}`;
                }
            }

            const workingOutputDir = path.join(config.tempImagePath, job.data.entity.UUID)
            fs.mkdirSync(workingOutputDir, { recursive: true });

            // Generate one JPEG every 10 seconds, scaled to 120px wide.
            const command = [
                'ffmpeg -hide_banner',
                readRateArg,
                `-i "${job.data.publicStreamURL}"`,
                '-vf fps=1/10,scale=120:-1',
                `"${path.join(workingOutputDir, 'preview%d.jpg')}"`,
            ].filter(Boolean).join(' ');

            await job.log(`Command: ${command}`);

            const succeeded = await runFFmpegWithRetries(job, workingOutputDir, command);

            if (!succeeded) {
                throw new Error(`Job failed after ${MAX_JOB_ATTEMPTS} attempt(s)`);
            }

            await uploadPreviewImages(job, workingOutputDir);
        },
        {
            connection,
            concurrency: config.concurrentGenerators,
            removeOnComplete: { count: 1000 },
            removeOnFail: { count: 5000 },
        },
    );

    // CLI commands

    const commandManager = CommandManager.createCommandManager(process.stdin, process.stdout);

    commandManager.registerCommand(new Command(
        ['info', 'i'],
        'info',
        'Prints current worker information',
        () => {
            const pad = 20;
            return [
                '-'.repeat(pad) + ' Information ' + '-'.repeat(pad),
                `Version:              ${config.version}`,
                `Generator Name:       ${config.generatorName}`,
                `Redis:                ${config.redisConnection.host}:${config.redisConnection.port}`,
                `Concurrency:          ${worker.opts.concurrency}`,
                `Use Read Rate:        ${config.useReadRate}`,
                `Paused:               ${worker.isPaused()}`,
                '-'.repeat(pad) + ' Information ' + '-'.repeat(pad),
            ];
        },
    ));

    commandManager.registerCommand(new Command(
        'pause',
        'pause',
        'Pauses the worker',
        () => {
            worker.pause();
            return ['Worker paused.'];
        },
    ));

    commandManager.registerCommand(new Command(
        'resume',
        'resume',
        'Resumes the worker',
        () => {
            worker.resume();
            return ['Worker resumed.'];
        },
    ));

    commandManager.registerCommand(new Command(
        'set',
        'set concurrency <number>',
        'Sets the worker concurrency at runtime',
        (_cmd, args) => {
            // args[0] = 'set', args[1] = subcommand, args[2] = value
            if (args[1] !== 'concurrency') return ['Unknown sub-command. Usage: set concurrency <number>'];

            const value = parseInt(args[2]);
            if (isNaN(value) || value < 1) return ['Please provide a positive integer for concurrency.'];

            worker.concurrency = value;
            worker.opts.concurrency = value;
            return [`Worker concurrency set to ${value}.`];
        },
    ));
}

main();