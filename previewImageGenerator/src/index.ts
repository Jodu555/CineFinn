import fs from 'fs';
import path from 'path';
import child_process from 'child_process';
import IORedis from 'ioredis';
import { Job, Queue, Worker, tryCatch } from 'bullmq';

export const wait = (timeout: number) => {
	return new Promise((resolve) => {
		setTimeout(resolve, timeout);
	});
};

interface Config {
	version: string;
	generatorName: string;
	redisConnection: {
		host: string;
		port: number;
		password: string;
	};
	concurrentGenerators: number;
	pathRemapper: Record<string, string>;
}

const defaultConfig: Config = {
	version: '1.0.1',
	generatorName: 'previewImageGenerator',
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

interface JobMeta {
	serieID: string;
	entity: any;
	lang: string;
	filePath: string;
	output: string;
	imagePathPrefix: string;
	publicStreamURL: string;
	generatorName: string;
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

	const worker = new Worker<JobMeta>(
		'previewImageQueue',
		async (job) => {
			await job.updateData({
				...job.data,
				generatorName: config.generatorName,
			});

			await job.log('--------------------- ' + new Array(config.generatorName.length).fill('=').join('') + ' ---------------------');
			for (let i = 0; i < 5; i++) {
				await job.log('--------------------- ' + config.generatorName + ' ---------------------');
			}
			await job.log('--------------------- ' + new Array(config.generatorName.length).fill('=').join('') + ' ---------------------');

			console.log('Recieve Job: ', job.id);
			const vidFile = evalPath(config, job.data.filePath);
			const imgDir = evalPath(config, job.data.output);

			job.log('Evaluated Path Video File: ' + vidFile);
			job.log('Evaluated Path Image Directory: ' + imgDir);

			let command = '';

			if (job.data.entity.subID != 'main' && job.data.publicStreamURL == undefined) {
				await job.moveToFailed(new Error('No publicStreamURL found for subID: ' + job.data.entity.subID), job.token);
				return;
			}

			if (job.data.publicStreamURL && job.data.entity.subID != 'main') {
				command = `ffmpeg -hide_banner -i "${job.data.publicStreamURL}" -vf fps=1/10,scale=120:-1 "${path.join(imgDir, 'preview%d.jpg')}"`;
			} else {
				command = `ffmpeg -hide_banner -i "${vidFile}" -vf fps=1/10,scale=120:-1 "${path.join(imgDir, 'preview%d.jpg')}"`;
			}

			await job.log('Crafted Command: ' + command);

			// console.log(job.id, ' => ', command);

			if (!job.data.publicStreamURL && !fs.existsSync(vidFile)) {
				console.log('Video File Missing', vidFile);
				console.log('This is probably a misconfiguration of the config pathRemapper');
				throw new Error('Video File Missing' + vidFile);
				process.exit(1);
			}

			let failCount = 0;
			let success = false;

			while (failCount < 3 && success == false) {
				failCount++;
				try {
					console.log(job.id, ' => Attempt: #' + failCount + ' with Command: ' + command);
					await job.log('Attempt: #' + failCount + ' with Command: ' + command);
					const result = await tryCommand(job, imgDir, command);
					if (result) {
						success = true;
						break;
					}
				} catch (error) {
					await job.log('Attempt Failed! ' + failCount);
				}
			}

			if (success == true) {
				await job.log('Job Finished Successfully! After #' + failCount + ' Times!');
			} else {
				await job.log('Job Failed! After #' + failCount + ' Times!');
				await job.log('See Log on why this happend!');
				throw new Error('Job Failed! After #' + failCount + ' Times!');
			}

			// try {
			// 	fs.mkdirSync(imgDir, { recursive: true });
			// 	// await deepExecPromisify(command, imgDir);
			// 	let lastPercent = 0;
			// 	const { code, duration, highestSpeed, output } = await spawnFFmpegProcess(command, imgDir, async (speed, percent) => {
			// 		percent = parseFloat(parseFloat(String(percent)).toFixed(2));
			// 		lastPercent = percent;
			// 		await job.log('FFmpeg Tick with speed: ' + speed + 'x and percent: ' + percent + '%');
			// 		await job.updateProgress(percent);
			// 		console.log(job.id, speed + 'x', percent + '%');
			// 	});

			// 	const durationString = `${duration.h || '00'}:${duration.m || '00'}:${duration.s || '00'}`;
			// 	if (lastPercent < 99) {
			// 		await job.log('Video Duration: ' + durationString);
			// 		await job.log(`Lines of ffmpeg output: ${JSON.stringify(output, null, 3)}`);
			// 		// await job.log(`Last 25 Lines of ffmpeg output: ${JSON.stringify(output.slice(Math.max(output.length - 25, 1)), null, 3)}`);
			// 		await job.log('99 Percent mark not reached lastPercent: ' + lastPercent);
			// 		await job.moveToFailed(new Error('Somehow the 99 Percent mark was not reached'), job.token);
			// 		return;
			// 	}
			// 	await job.log(`Finished Command with Exit-Code: ${code} on a ${durationString} Video with the highest speed of ${highestSpeed}x`);
			// } catch (error) {
			// 	await job.log('Error on execution command: ' + command);
			// 	await job.log('Error: ' + error);
			// 	await job.log('Error: ' + JSON.stringify(error, null, 3));
			// 	console.error('Error on execution command:', command, 'Error:', error);
			// 	if (job.attemptsMade >= 5) {
			// 		await job.moveToFailed(error, job.token);
			// 	} else {
			// 		await job.retry('failed');
			// 	}
			// }

			return;
		},
		{ connection, concurrency: config.concurrentGenerators, removeOnComplete: { count: 1000 }, removeOnFail: { count: 5000 } }
	);
}

const DEBUG = false;

async function tryCommand(job: Job<JobMeta, any, string>, imgDir: string, command: string) {
	try {
		fs.mkdirSync(imgDir, { recursive: true });
		// await deepExecPromisify(command, imgDir);
		let lastPercent = 0;
		const { code, duration, highestSpeed, output } = await spawnFFmpegProcess(command, imgDir, async (speed, percent) => {
			percent = parseFloat(parseFloat(String(percent)).toFixed(2));
			lastPercent = percent;
			await job.log('FFmpeg Tick with speed: ' + speed + 'x and percent: ' + percent + '%');
			await job.updateProgress(percent);
			DEBUG && console.log(job.id, speed + 'x', percent + '%');
		});
		const durationString = `${duration.h || '00'}:${duration.m || '00'}:${duration.s || '00'}`;

		console.log(
			job.id,
			` => Finished Command with Exit-Code: ${code} on a ${durationString} Video with the highest speed of ${highestSpeed}x and the lastPercent: ${lastPercent}%`
		);

		if (lastPercent < 99) {
			await job.log('Video Duration: ' + durationString);
			await job.log(`Lines of ffmpeg output: ${JSON.stringify(output, null, 3)}`);
			// await job.log(`Last 25 Lines of ffmpeg output: ${JSON.stringify(output.slice(Math.max(output.length - 25, 1)), null, 3)}`);
			await job.log('99 Percent mark not reached lastPercent: ' + lastPercent);
			// await job.moveToFailed(new Error('Somehow the 99 Percent mark was not reached'), job.token);
			return false;
		}
		await job.log(
			`Finished Command with Exit-Code: ${code} on a ${durationString} Video with the highest speed of ${highestSpeed}x and the lastPercent: ${lastPercent}%`
		);
		return true;
	} catch (error) {
		await job.log('Error on execution command: ' + command);
		await job.log('Error: ' + error);
		await job.log('Error: ' + JSON.stringify(error, null, 3));
		console.error('Error on execution command:', command, 'Error:', error);
		return false;
	}
}

async function spawnFFmpegProcess(command: string, cwd: string = undefined, progress: (speed: number, percent: number) => void) {
	return new Promise<{ code: number; output: string[]; duration: { h: number; m: number; s: number }; highestSpeed: number }>((resolve, reject) => {
		const proc = child_process.spawn(command, { shell: true, cwd: cwd });
		let duration: { h: number; m: number; s: number } = null;
		let highestSpeed: number = 0;
		let cumOutput = [];

		let latestUpdate = Date.now();

		let timeout = setTimeout(() => {
			const err = new Error('Timeout Reached: ' + JSON.stringify(cumOutput, null, 3));
			reject(err);
		}, 1000 * 60 * 1);

		let interval = setInterval(() => {
			const sAgo = (Date.now() - latestUpdate) / 1000;
			if (sAgo > 5) {
				DEBUG && console.log('Last Update ' + sAgo + 's ago');
			}

			if (sAgo > 60 * 7) {
				console.log('No output for 7 minutes, killing process', sAgo);
				proc.kill();
				clearInterval(interval);
				reject(new Error('No output for 7 minutes, killing process: ' + JSON.stringify(cumOutput, null, 3)));
			}
		}, 1000);

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
						latestUpdate = Date.now();
						progress(speed, percent);
						if (timeout) {
							clearTimeout(timeout);
							timeout = null;
						}
					} catch (_) {}
				}
			});
			cumOutput.push(...lines);
			// console.log('stderr: ', lines);
		});

		proc.on('close', (code) => {
			clearInterval(interval);
			clearTimeout(timeout);
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
