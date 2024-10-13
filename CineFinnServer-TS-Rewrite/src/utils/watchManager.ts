import { timeUpdateObject } from '../types/classes';
import { ExtendedSocket } from '../types/session';
import { sendWatchListChange } from '../sockets/client.socket';
import { Segment, searchObject, updateSegment } from './watchString';

async function writeWatchInfoToDatabase(socket: ExtendedSocket, obj: timeUpdateObject) {
	if (obj.time != 0) {
		console.log('Write Through:', socket.auth.user.username, obj);
	}

	const { movie = -1, season, episode, time } = obj;

	const searchOBJ: searchObject = {
		series: obj.series,
		movie: obj.movie || -1,
		season: obj.season,
		episode: obj.episode,
	};

	let update = false;
	let updatedSegmentList: Segment[];

	const updateFunction = (seg: Segment) => {
		if (seg.time < time) {
			update = true;
			seg.time = time;
		}
	};

	if (!searchOBJ.series || searchOBJ.series == null || Number(searchOBJ.series) == -1) {
		return;
	}

	if (movie !== -1 && movie !== undefined) {
		updatedSegmentList = await updateSegment(socket.auth.user.UUID, searchOBJ, updateFunction);
	}

	if (season !== -1 && episode !== -1) {
		updatedSegmentList = await updateSegment(socket.auth.user.UUID, searchOBJ, updateFunction);
	}

	if (update) {
		sendWatchListChange(updatedSegmentList, socket, { series: searchOBJ.series });
		console.log('  => Updated');
	}
}

export { writeWatchInfoToDatabase };
