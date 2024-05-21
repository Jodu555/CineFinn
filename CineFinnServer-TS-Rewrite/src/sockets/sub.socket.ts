import { ExtendedSocket } from '../types/session';
import { Langs } from '../types/classes';
import { randomUUID } from 'node:crypto';

const subSocketMap = new Map<string, ExtendedSocket>();

const initialize = async (socket: ExtendedSocket) => {
	const auth = socket.auth;
	console.log('Socket Connection:', auth.type.toUpperCase());
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

export { initialize, subSocketMap };
