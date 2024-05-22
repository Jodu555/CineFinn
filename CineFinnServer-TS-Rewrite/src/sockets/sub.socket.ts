import { ExtendedSocket } from '../types/session';
import { Langs } from '../types/classes';
import { randomUUID } from 'node:crypto';

const subSocketMap = new Map<string, ExtendedSocket>();

const initialize = async (socket: ExtendedSocket) => {
	const auth = socket.auth;
	console.log('Socket Connection:', auth.type.toUpperCase());
	console.log(socket.handshake.auth);

	subSocketMap.set(auth.id, socket);

	socket.setMaxListeners(555);

	socket.on('disconnect', () => {
		console.log('Socket DisConnection:', auth.type.toUpperCase());
		subSocketMap.delete(auth.id);
	});

	// socket.on('files', ({ files }) => {
	// 	console.log(files);
	// });
};

interface SubFile {
	subID: string;
	path: string;
}

async function getAllFilesFromAllSubs() {
	const allFiles = await new Promise<SubFile[]>((resolve, reject) => {
		let waitFor: string[] = [];
		const allFilesInner: SubFile[] = [];
		console.log(subSocketMap.keys());

		subSocketMap.forEach((socket) => {
			socket.once('files', ({ files }) => {
				allFilesInner.push(...files.map((x) => ({ path: x, subID: socket.auth.id })));
				waitFor = waitFor.filter((k) => k !== socket.auth.id);

				console.log(
					'Response from:',
					`"${socket.auth.id}"`,
					'waitFor:',
					waitFor,
					'other:',
					waitFor.filter((k) => k == socket.auth.id)
				);
				if (waitFor.length == 0) {
					resolve(allFilesInner);
				}
			});
			waitFor.push(socket.auth.id);
			console.log('Requesting from:', socket.auth.id, 'waitFor:', waitFor);

			socket.emit('listFiles');
		});
	});
	return allFiles;
}

export { initialize, subSocketMap, getAllFilesFromAllSubs, SubFile };
