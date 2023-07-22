import { ExtendedSocket } from '../types/session';
import { getIO, getAuthHelper } from '../utils/utils';

import { initialize as socketInitScraper } from './scraper.socket';
import { initialize as socketInitClient } from './client.socket';
import { initialize as socketInitRMVCEmitter } from './rmvcEmitter.socket';

const initialize = () => {
	const io = getIO();

	const authHelper = getAuthHelper();

	io.use(async (socket: ExtendedSocket, next) => {
		console.log(socket.handshake);

		const type = socket.handshake.auth.type;
		if (type === 'client') {
			const authToken = socket.handshake.auth.token;
			if (authToken && (await authHelper.getUser(authToken))) {
				console.log(`Socket with`);
				console.log(`   ID: ${socket.id} - ${type.toUpperCase()}`);
				console.log(`   - proposed with: ${authToken} - ${(await authHelper.getUser(authToken)).username}`);
				socket.auth = { token: authToken, user: await authHelper.getUser(authToken), type };
				return next();
			} else {
				next(new Error('Authentication error'));
			}
		}
		if (type === 'scraper') {
			const authToken = socket.handshake.auth.token;
			if (authToken && authToken === process.env.SCRAPER_AUTH_TOKEN) {
				socket.auth = { token: authToken, type };
				return next();
			} else {
				next(new Error('Authentication error'));
			}
		}
		if (type === 'rmvc-emitter') {
			socket.auth = { type };
			return next();
		}
	});

	io.on('connection', async (socket: ExtendedSocket) => {
		const auth = socket.auth;

		if (auth.type == 'client') {
			socketInitClient(socket);
			socketInitRMVCEmitter(socket);
		}
		if (auth.type == 'rmvc-emitter') socketInitRMVCEmitter(socket);
		if (auth.type == 'scraper') socketInitScraper(socket);
	});
};

export { initialize };
