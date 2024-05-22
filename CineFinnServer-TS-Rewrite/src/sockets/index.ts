import { ExtendedSocket } from '../types/session';
import { getIO, getAuthHelper } from '../utils/utils';

import { isScraperSocketConnected, initialize as socketInitScraper } from './scraper.socket';
import { initialize as socketInitSub } from './sub.socket';
import { initialize as socketInitClient } from './client.socket';
import { initialize as socketInitSync } from './sync.socket';
import { initialize as socketInitRMVCEmitter } from './rmvcEmitter.socket';

const initialize = () => {
	const io = getIO();

	const authHelper = getAuthHelper();

	io.use(async (socket: ExtendedSocket, next) => {
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
				if (isScraperSocketConnected()) {
					next(new Error('There is already a scraper connected'));
					return;
				}
				socket.auth = { token: authToken, type };
				return next();
			} else {
				next(new Error('Authentication error'));
			}
		}
		if (type === 'sub') {
			const authToken = socket.handshake.auth.token;
			if (authToken && authToken === 'dioanoadnosadnsdaonadofvndgpagdmn0gtef') {
				socket.auth = {
					token: authToken,
					id: socket.handshake.auth.id,
					ptoken: socket.handshake.auth.ptoken,
					endpoint: socket.handshake.auth.endpoint,
					type,
				};
				return next();
			} else {
				next(new Error('Authentication error'));
			}
			return;
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
			socketInitSync(socket);
			socketInitRMVCEmitter(socket);
		}
		if (auth.type == 'rmvc-emitter') socketInitRMVCEmitter(socket);
		if (auth.type == 'scraper') socketInitScraper(socket);
		if (auth.type == 'sub') socketInitSub(socket);
	});
};

export { initialize };
