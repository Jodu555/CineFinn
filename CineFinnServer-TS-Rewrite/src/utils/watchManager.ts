import { ExtendedSocket, timeUpdateObject } from './types';

const { updateSegment } = require('./watchString');

async function writeWatchInfoToDatabase(socket: ExtendedSocket, obj: timeUpdateObject) {
	console.log('Write Through:', socket.auth.user.username, obj);

	const { movie = -1, season, episode, time } = obj;

	const searchOBJ = {
		series: obj.series,
		movie: obj.movie || -1,
		season: obj.season,
		episode: obj.episode,
	};

	let update = false;
	let updatedSegmentList;

	const updateFunction = (seg) => {
		if (seg.time < time) {
			update = true;
			seg.time = time;
		}
	};

	if (!searchOBJ.series || searchOBJ.series == null || searchOBJ.series == -1) {
		return;
	}
	if (movie !== -1 && movie !== undefined) {
		updatedSegmentList = await updateSegment(socket.auth.user.UUID, searchOBJ, updateFunction);
	}

	if (season !== -1 && episode !== -1) {
		updatedSegmentList = await updateSegment(socket.auth.user.UUID, searchOBJ, updateFunction);
	}

	if (update) {
		const { sendWatchListChange } = require('../sockets/client.socket');
		sendWatchListChange(updatedSegmentList, socket, searchOBJ);
		console.log('  => Updated');
	}
}

export { writeWatchInfoToDatabase };
