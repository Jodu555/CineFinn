import fs from 'fs';
import path from 'path';
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
	};
	concurrentGenerators: number;
	pathRemapper: Record<string, string>;
}

const defaultConfig: Config = {
	version: '1.0.0',
	redisConnection: {
		host: 'localhost',
		port: 6379,
		password: null,
	},
	concurrentGenerators: 5,
	pathRemapper: {
		'/media/all/CineFinn-data': '/mnt/test',
	},
};

function evalPath(config: Config, evalPath: string) {
	for (const [key, value] of Object.entries(config.pathRemapper)) {
		if (path.normalize(evalPath).startsWith(path.normalize(key))) {
			const mappedPath = path.normalize(path.normalize(evalPath).replace(path.normalize(key), value));
			return mappedPath.replaceAll('\\', '/');
		}
	}
	return evalPath;
}

async function main() {
	const previewImageQueue = 'previewImageQueue';
	const cfgPath = path.join('.', 'config.json');

	if (!fs.existsSync(cfgPath)) {
		fs.writeFileSync(cfgPath, JSON.stringify(defaultConfig, null, 3));
		console.error('Config file not found, creating default config...');
		process.exit(1);
	}

	const config: Config = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

	if (config.version !== defaultConfig.version) {
		console.error('Config version mismatch! It could be that your config is outdated. Exiting...');
		process.exit(1);
	}

	const connection = new IORedis({
		maxRetriesPerRequest: null,
		host: config.redisConnection.host,
		port: config.redisConnection.port,
		password: config.redisConnection.password,
	});

	//config.pathRemapper['X:\\MediaLib\\Application\\'] = '\\media\\pi\\Seagate Expansion Drive\\MediaLib\\Application\\'

	interface JobMeta {
		serieID: string;
		entity: any;
		lang: string;
		filePath: string;
		output: string;
		imagePathPrefix: string;
		publicStreamURL: string;
	}

	const worker = new Worker<JobMeta>(
		'previewImageQueue',
		async (job) => {
			job.clearLogs();
			console.log('Recieve Job: ', job.id);
			const vidFile = evalPath(config, job.data.filePath);
			const imgDir = evalPath(config, job.data.output);

			job.log('Evaluated Path Video File: ' + vidFile);
			job.log('Evaluated Path Image Directory: ' + imgDir);

			let command = '';
			if (job.data.publicStreamURL) {
				command = `ffmpeg -hide_banner -i "${job.data.publicStreamURL}" -vf fps=1/10,scale=120:-1 "${path.join(imgDir, 'preview%d.jpg')}"`;
			} else {
				command = `ffmpeg -hide_banner -i "${vidFile}" -vf fps=1/10,scale=120:-1 "${path.join(imgDir, 'preview%d.jpg')}"`;
			}

			job.log('Crafted Command: ' + command);

			console.log(job.id, ' => ', command);

			if (!job.data.publicStreamURL && !fs.existsSync(vidFile)) {
				console.log('Video File Missing', vidFile);
				console.log('This is probably a misconfiguration of the config pathRemapper');
				throw new Error('Video File Missing' + vidFile);
				process.exit(1);
			}
			try {
				fs.mkdirSync(imgDir, { recursive: true });
				// await deepExecPromisify(command, imgDir);
				let lastPercent = 0;
				const { code, duration, highestSpeed } = await spawnFFmpegProcess(command, imgDir, async (speed, percent) => {
					percent = parseFloat(parseFloat(String(percent)).toFixed(2));
					lastPercent = percent;
					await job.log('FFmpeg Tick with speed: ' + speed + 'x and percent: ' + percent + '%');
					await job.updateProgress(percent);
					console.log(job.id, speed + 'x', percent + '%');
				});
				if (lastPercent < 100) {
					await job.log('100 Percent mark not reached lastPercent: ' + lastPercent);
					await job.moveToFailed(new Error('Somehow the 100 Percent mark was not reached'), job.token);
					return;
				}
				const durationString = `${duration.h || '00'}:${duration.m || '00'}:${duration.s || '00'}`;
				await job.log(`Finished Command with Exit-Code: ${code} on a ${durationString} Video with the highest speed of ${highestSpeed}x`);
			} catch (error) {
				await job.log('Error on execution command: ' + command);
				await job.log('Error: ' + error);
				console.error('Error on execution command:', command, 'Error:', error);
			}

			return;
		},
		{ connection, concurrency: config.concurrentGenerators, removeOnComplete: { count: 1000 }, removeOnFail: { count: 5000 } }
	);
}

async function spawnFFmpegProcess(command: string, cwd: string = undefined, progress: (speed: number, percent: number) => void) {
	return new Promise<{ code: number; output: string[]; duration: { h: number; m: number; s: number }; highestSpeed: number }>((resolve, reject) => {
		const proc = child_process.spawn(command, { shell: true, cwd: cwd });
		let duration: { h: number; m: number; s: number } = null;
		let highestSpeed: number = 0;
		let cumOutput = [];

		proc.stderr.setEncoding('utf8');
		proc.stderr.on('data', (data: string) => {
			if (data == undefined) return;
			const lines = data.split('\n');
			lines.forEach((line) => {
				if (line.includes('frame=') && line.includes('fps=') && line.includes('time=')) {
					if (duration == null) {
						try {
							const l = cumOutput.join(' ').trim().replaceAll('\r', '').replaceAll('\n', '').replaceAll('\t', '');
							const [_, rest] = l.split('Duration: ');
							const [time, __] = rest.split(',');
							const [h, m, sc] = time.split(':');
							const s = parseInt(sc);
							duration = { h: Number(h), m: Number(m), s };
						} catch (_) {}
					}
					try {
						const speed = parseFloat(line.split('speed=')[1].split('x')[0]);
						const [time, __] = line.split('time=')[1].split(' ');
						const [h, m, sc] = time.split(':');

						const s = parseInt(sc);
						const seconds = s + Number(m) * 60 + Number(h) * 60 * 60;
						const maxSeconds = duration.s + duration.m * 60 + duration.h * 60 * 60;

						const percent = (seconds / maxSeconds) * 100;

						if (speed > highestSpeed) highestSpeed = speed;
						progress(speed, percent);
					} catch (_) {}
				}
			});
			cumOutput.push(...lines);
			// console.log('stderr: ', lines);
		});

		proc.on('close', (code) => {
			console.log('Finished the', duration, 'video with the highest speed of', highestSpeed, 'x');
			console.log('closing code: ' + code);
			if (code == 0) {
				resolve({ code, output: cumOutput, duration, highestSpeed });
			} else {
				reject({ code, output: cumOutput, duration, highestSpeed });
			}
		});
	});
}

async function deepExecPromisify(command: string, cwd?: string) {
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
