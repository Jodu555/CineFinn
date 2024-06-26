import fs, { ReadStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
import io from 'socket.io-client';
import express from 'express';
import zlib from 'zlib';

const ptoken = crypto.randomUUID().replaceAll('-', '');
// const ptoken = 'secure-test';

const IDENTIFIER = process.argv[2] || 'local-0x000';
const ENTRYPOINT = process.argv[3] || 'local-0x000';
const PORT = process.argv[4] || 9999;
const SUBENDPOINT = process.argv[5] || 'local-0x000';
const CORE_URL = 'http://localhost:3100';
// const CORE_URL = 'http://cinema-api.jodu555.de:3100';
const CORE_TOKEN = 'dioanoadnosadnsdaonadofvndgpagdmn0gtef';

const app = express();
app.use(express.json());

const socket = io(CORE_URL, { auth: { type: 'sub', id: IDENTIFIER, token: CORE_TOKEN, ptoken, endpoint: SUBENDPOINT } });

interface VideoStreamLog {
	// userUUID: string;
	time: number;
	path: string;
	stream: fs.ReadStream;
	agoms?: number;
	start: number;
	end: number;
}

const videoStreamLog: VideoStreamLog[] = [];

socket.on('connect_error', (error) => {
	console.log('Socket Connect Error: ', error.message); // prints the message associated with the error
	if (error.message.includes('Authentication')) {
		console.log('Wrong Auth-token');
	}
});
socket.on('disconnect', () => {
	console.log('Socket Connection: Disconnected');
});

socket.on('connect', async () => {
	console.log('Socket Connection: Connected', IDENTIFIER);
	const { files, dirs } = await listFilesAsync(ENTRYPOINT);
	console.log('Loaded', files.length, 'files from:', ENTRYPOINT);

	// const raw = JSON.stringify(files);
	// const compressed = zlib.deflateSync(Buffer.from(raw));
	// const uncompressed = zlib.inflateSync(compressed);
	// console.log(raw.length);
	// console.log(compressed.length);
	// console.log(uncompressed.length);
	// console.log(raw === uncompressed.toString('utf-8'));

	console.log('Current pToken:', ptoken);
});

socket.on('listFiles', async () => {
	console.log('Request for List of Files');
	const { files, dirs } = await listFilesAsync(ENTRYPOINT);
	console.log('Sending Files', files.length, 'from Disk from:', ENTRYPOINT);
	socket.emit('files', { files });
});

const map = new Map<
	string,
	{ stream: ReadStream; start: number; end: number; num: number; chunks: (string | Buffer)[]; data: { len: number; all: number } }
>();

socket.on('video-stats', ({ filePath }, callback) => {
	console.log('Got Stats for:', filePath);
	callback({ size: fs.statSync(filePath).size });
});

interface VideoRangeRequest {
	filePath: string;
	start: number;
	end: number;
	requestId: string;
}

socket.on('video-range', ({ filePath, start, end, requestId }: VideoRangeRequest) => {
	const videoStream = fs.createReadStream(filePath, { start, end });
	if (map.get(requestId) == undefined) {
		map.set(requestId, { stream: videoStream, start, end, num: 0, chunks: [], data: { len: 0, all: 0 } });
	}

	videoStream.on('data', (chunk) => {
		map.get(requestId).num += 1;
		// map.get(requestId).chunks.push(chunk);
		map.get(requestId).data.all += 1;
		map.get(requestId).data.len += chunk.length;

		socket.emit('video-chunk', { chunk, requestId });
	});

	videoStream.on('end', () => {
		const mapObj = map.get(requestId);
		mapObj.stream.destroy();
		const chunks = mapObj.chunks;
		delete mapObj.stream;
		delete mapObj.chunks;
		console.log(
			'Sent:',
			requestId,
			mapObj,
			mapObj.data.all / 1024 / 1024,
			// chunks.reduce((a, b) => a + b.length, 0) / 1024 / 1024,
			'MB',
			'Evrage Chunk length ',
			mapObj.data.len / chunks.length
			// chunks.reduce((a, b) => a + b.length, 0) / chunks.length
		);
		map.delete(requestId); //This is very important so i dont leak memory all over the place

		socket.emit('video-chunk-end', { requestId });
	});

	videoStream.on('error', (error) => {
		console.error('Error reading video file:', error);
		socket.emit('video-chunk-error', { error: error.message, requestId });
	});
});

function listFilesSync(lcPath: string) {
	const files: string[] = [];
	const dirs: string[] = [];
	fs.readdirSync(lcPath)
		.map((e) => {
			return { name: e, path: path.join(lcPath, e) };
		})
		.forEach((entity) => {
			if (fs.statSync(entity.path).isDirectory()) {
				dirs.push(entity.name);
				const revOutput = listFilesSync(path.join(entity.path));
				files.push(...revOutput.files);
				dirs.push(...revOutput.dirs);
			} else {
				files.push(entity.path);
			}
		});
	return { files, dirs };
}

async function listFilesAsync(lcPath: string) {
	const files: string[] = [];
	const dirs: string[] = [];

	const items = await fs.promises.readdir(lcPath, { withFileTypes: true });
	const promises = items.map(async (item) => {
		const fullPath = path.join(lcPath, item.name);
		if (item.isDirectory()) {
			dirs.push(fullPath);
			const { files: subFiles, dirs: subDirs } = await listFilesAsync(fullPath);
			files.push(...subFiles);
			dirs.push(...subDirs);
		} else {
			files.push(fullPath);
		}
	});

	await Promise.all(promises);
	return { files, dirs };
}

app.get('/files', async (req, res) => {
	const { ptoken: token } = req.query;
	if (token !== ptoken) {
		res.status(403).send('Wrong PToken please authenticate first');
		return;
	}

	const { files, dirs } = await listFilesAsync(ENTRYPOINT);

	// const raw = JSON.stringify(files);
	// const compressed = zlib.deflateSync(Buffer.from(raw));
	// const uncompressed = zlib.inflateSync(compressed);
	// console.log(raw.length);
	// console.log(compressed.length);
	// console.log(uncompressed.length);
	// console.log(raw === uncompressed.toString('utf-8'));

	// raw, compressed: compressed.toString('utf-16le'), uncompressed: uncompressed.toString('utf-8')

	res.json({
		success: true,
		result: { files, dirs },
	});
});

app.get('/streams', async (req, res) => {
	const { ptoken: token } = req.query;
	if (token !== ptoken) {
		res.status(403).send('Wrong PToken please authenticate first');
		return;
	}

	res.json({
		success: true,
		result: {
			videoStreamLog: videoStreamLog.map((x) => {
				x.stream = null;
				x.agoms = Date.now() - x.time;
				return x;
			}),
		},
	});
});

app.get('/streams/clear', async (req, res) => {
	const { ptoken: token } = req.query;
	if (token !== ptoken) {
		res.status(403).send('Wrong PToken please authenticate first');
		return;
	}
	videoStreamLog.forEach((old, idx) => {
		old.stream.destroy();
		console.log('Destroyed stream from', (Date.now() - old.time) / 1000, 's', old.path);
		videoStreamLog.splice(idx, 1);
	});

	res.json({
		success: true,
		result: {
			videoStreamLog: videoStreamLog.map((x) => {
				x.stream = null;
				return x;
			}),
		},
	});
});

app.get('/video', async (req, res) => {
	const { path: filePath, ptoken: token } = req.query;

	console.log(filePath, token);

	const debug = false;

	if (token !== ptoken) {
		res.status(403).send('Wrong PToken please authenticate first');
		return;
	}

	if (typeof filePath !== 'string') {
		res.status(400).send('No Valid Filepath provided');
		return;
	}

	let start: number;
	let end: number;
	const range = req.headers.range;
	if (range) {
		const bytesPrefix = 'bytes=';
		if (range.startsWith(bytesPrefix)) {
			const bytesRange = range.substring(bytesPrefix.length);
			const parts = bytesRange.split('-');
			if (parts.length === 2) {
				const rangeStart = parts[0] && parts[0].trim();
				if (rangeStart && rangeStart.length > 0) {
					start = parseInt(rangeStart);
				}
				const rangeEnd = parts[1] && parts[1].trim();
				if (rangeEnd && rangeEnd.length > 0) {
					end = parseInt(rangeEnd);
				}
			}
		}
	}

	res.setHeader('content-type', 'video/mp4');

	debug && console.log('Got Range', { start, end });

	res.setHeader('content-type', 'video/mp4');

	debug && console.log('Got filePath', filePath);

	const stat = fs.statSync(filePath);
	const contentLength = stat.size;

	// Listing 4.
	if (req.method === 'HEAD') {
		res.statusCode = 200;
		res.setHeader('accept-ranges', 'bytes');
		res.setHeader('content-length', contentLength);
		res.end();
		return;
	}

	let retrievedLength: number;
	if (start !== undefined && end !== undefined) {
		retrievedLength = end + 1 - start;
	} else if (start !== undefined) {
		retrievedLength = contentLength - start;
	} else if (end !== undefined) {
		retrievedLength = end + 1;
	} else {
		retrievedLength = contentLength;
	}

	// if (end == undefined) {
	// 	const CHUNK_SIZE = Number(process.env.VIDEO_CHUNK_SIZE);
	// 	console.log(end, start, contentLength);
	// 	end = start + CHUNK_SIZE - 1;
	// 	console.log('tmp end', end);

	// 	if (end > contentLength) {
	// 		console.log('Bound reached');

	// 		end = contentLength - 1;
	// 	}
	// }

	debug && console.log('Calculated contentLength', contentLength);
	res.statusCode = start !== undefined || end !== undefined ? 206 : 200;

	res.setHeader('content-length', retrievedLength);

	if (range !== undefined) {
		res.setHeader('content-range', `bytes ${start || 0}-${end || contentLength - 1}/${contentLength}`);
		res.setHeader('accept-ranges', 'bytes');
	}

	const fileStream = fs.createReadStream(filePath, { start, end });
	fileStream.on('error', (error) => {
		console.log(`Error reading file ${filePath}.`);
		console.log(error);
		res.sendStatus(500);
	});

	videoStreamLog
		.filter((x) => Date.now() - x.time > 5000)
		.forEach((old, idx) => {
			old.stream.destroy();
			console.log('Destroyed stream from', Date.now() - old.time, 'ms', old.path);
			videoStreamLog.splice(idx, 1);
		});

	videoStreamLog.push({
		stream: fileStream,
		time: Date.now(),
		path: filePath,
		start: start,
		end: end,
	});

	fileStream.pipe(res);
});

app.get('/', (_, res) => {
	res.status(200).json({ success: true, result: map.entries() });
});

app.listen(PORT, () => {
	console.log('Sub System listening on port http://localhost:' + PORT);
});
