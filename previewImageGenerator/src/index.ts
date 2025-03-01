import fs from 'fs';
import path from 'path';
import axios from 'axios';
import child_process from 'child_process';
import IORedis from 'ioredis';
import { Job, Queue, Worker, tryCatch } from 'bullmq';
import { JobMeta } from '@Types/index';
import { CommandManager, Command } from '@jodu555/commandmanager';

const commandManager = CommandManager.createCommandManager(process.stdin, process.stdout);

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
	useReadRate: boolean;
	useExperimantalAPIUpload: boolean;
	tempImagePath: string;
	pathRemapper: Record<string, string>;
}

const defaultConfig: Config = {
	version: '1.0.3',
	generatorName: 'previewImageGenerator',
	redisConnection: {
		host: 'localhost',
		port: 6379,
		password: null,
	},
	concurrentGenerators: 5,
	useReadRate: false,
	useExperimantalAPIUpload: false,
	tempImagePath: '/tmp/previewImageGenerator',
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

	const worker = new Worker<JobMeta>(
		previewImageQueue,
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

			if (job.data.entity.subID != 'main' && job.data.publicStreamURL == undefined) {
				await job.moveToFailed(new Error('No publicStreamURL found for subID: ' + job.data.entity.subID), job.token);
				return;
			}

			/**
			 * Read Rate Information:
			 * 
			 * - https://stackoverflow.com/questions/70649196/how-to-limit-reading-speed-with-ffmpeg
			 * - https://www.ffmpeg.org/ffmpeg.html#Advanced-options
			 * 
			 */
			let input = '';
			let readRateArg = '';
			if (job.data.publicStreamURL && job.data.entity.subID != 'main') {
				input = job.data.publicStreamURL;
				if (config.useReadRate) {
					readRateArg = `-readrate ${job.data.readrate || 0}`;
				}
			} else {
				input = vidFile;
			}

			const output = config.useExperimantalAPIUpload ? path.join(config.tempImagePath, job.id) : imgDir;

			if (!fs.existsSync(output)) {
				fs.mkdirSync(output, { recursive: true });
			}

			const command = `ffmpeg -hide_banner ${readRateArg} -i "${input}" -vf fps=1/10,scale=120:-1 "${path.join(output, 'preview%d.jpg')}"`;

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


			const log = async (...args: any[]) => {
				await job.log(args.map(x => {
					if (typeof x == 'object') {
						return JSON.stringify(x);
					}
					return x;
				}).join(' '));
				console.log(job.id, ...args);
			};

			if (config.useExperimantalAPIUpload && job.data.publicStreamURL) {
				const url = new URL(job.data.publicStreamURL);
				const token = url.searchParams.get('auth-token');
				await log('Uploading to Experimental API!', url.origin, token);

				interface metaEpisode {
					type: 'episode';
					seriesID: string;
					sesasonIdx: number;
					episodeIdx: number;
					language: string;
				}

				interface metaMovie {
					type: 'movie';
					seriesID: string;
					primaryName: string;
					language: string;
				}

				type meta = metaEpisode | metaMovie;


				let presignMeta: meta = null;
				if ((job.data.entity as any).season != undefined) {
					presignMeta = {
						type: 'episode',
						seriesID: job.data.serieID,
						sesasonIdx: (job.data.entity as any).season,
						episodeIdx: (job.data.entity as any).episode,
						language: job.data.lang,
					} satisfies metaEpisode;
				} else {
					presignMeta = {
						type: 'movie',
						seriesID: job.data.serieID,
						primaryName: (job.data.entity as any).name,
						language: job.data.lang,
					} satisfies metaMovie;
				}

				const createPresignedURLRequest = await axios.post(`${url.origin}/previewImages/createPresignedURL?auth-token=${token}`, presignMeta);
				const { key } = createPresignedURLRequest.data;
				await log('Created Presigned URL with Key', key, 'and meta', presignMeta);

				const chunkedFiles = getChunkedFiles(output, 100);

				await log('File Chunk Count:', chunkedFiles.length);

				let i = 0;
				for (const chunk of chunkedFiles) {
					i++;
					const formData = new FormData();
					const now = Date.now();
					for (const file of chunk) {
						const fileData = new Blob([fs.readFileSync(path.join(output, file))], { type: "image/jpeg" });
						formData.append('file', fileData, file);
					}
					const response = await axios.post(`${url.origin}/previewImages/upload?auth-token=SECR-DEV&key=${key}`, formData, {
						headers: {
							"Content-Type": "multipart/form-data",
						},
					});
					const duration = Date.now() - now;
					await log('Uploaded Chunk', i, 'of', chunkedFiles.length, 'with', chunk.length, 'files in', duration, 'ms');
				}

				const deletePresignedURLRequest = await axios.post(`${url.origin}/previewImages/deletePresignedURL?auth-token=${token}`, { key });
				await log('Deleted Presigned URL with Key', key, 'and data', deletePresignedURLRequest.data);

				fs.rmSync(output, { recursive: true, force: true });

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

	commandManager.registerCommand(
		new Command(
			['info', 'i'], // The Command
			'info', // A Usage Info with arguments
			'Prints current information', // A Description what the command does
			(command, [...args], scope) => {
				const count = 20;
				return [
					'-'.repeat(count) + ' Information ' + '-'.repeat(count),
					`Version: ${config.version}`,
					`Generator Name: ${config.generatorName}`,
					`Redis Connection: ${config.redisConnection.host}:${config.redisConnection.port}`,
					`Concurrent Generators: ${worker.opts.concurrency}`,
					`Use Read Rate: ${config.useReadRate}`,
					// `Path Remapper: ${JSON.stringify(config.pathRemapper)}`,
					`Is Paused: ${worker.isPaused()}`,
					'-'.repeat(count) + ' Information ' + '-'.repeat(count),
				];
			}
		)
	);

	commandManager.registerCommand(
		new Command(
			'pause', // The Command
			'pause', // A Usage Info with arguments
			'Pauses the generator', // A Description what the command does
			(command, [...args], scope) => {
				worker.pause();
				return ['Paused the Worker successfully!'];
			}
		)
	);

	commandManager.registerCommand(
		new Command(
			'resume', // The Command
			'resume', // A Usage Info with arguments
			'Resumes the generator', // A Description what the command does
			(command, [...args], scope) => {
				worker.resume();
				return ['Resumed the Worker successfully!'];
			}
		)
	);

	commandManager.registerCommand(
		new Command(
			'set', // The Command
			'set concurrency <number>', // A Usage Info with arguments
			'Sets the concurrency of the generator', // A Description what the command does
			(command, [...args], scope) => {

				if (args[1] == 'concurrency') {
					if (args.length < 2) {
						return ['Please provide a number as second argument!'];
					}
					const concurrency = parseInt(args[2]);
					if (isNaN(concurrency)) {
						return ['Please provide a number as second argument!'];
					}
					worker.concurrency = concurrency;
					worker.opts.concurrency = concurrency;
					return ['Set the Worker concurrency to ' + concurrency];
				}
				return ['Please provide a valid argument!'];
			}
		)
	);

}

const DEBUG = false;

function getChunkedFiles(dir: string, chunkSize: number) {
	const files = fs.readdirSync(dir);
	const chunkedFiles: string[][] = files.reduce((acc, file, index) => {
		const chunkIndex = Math.floor(index / chunkSize);
		if (!acc[chunkIndex]) {
			acc[chunkIndex] = [];
		}
		acc[chunkIndex].push(file);
		return acc;
	}, []);

	return chunkedFiles;
}

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
	return new Promise<{ code: number; output: string[]; duration: { h: number; m: number; s: number; }; highestSpeed: number; }>((resolve, reject) => {
		const proc = child_process.spawn(command, { shell: true, cwd: cwd });
		let duration: { h: number; m: number; s: number; } = null;
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
						} catch (_) { }
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
					} catch (_) { }
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
