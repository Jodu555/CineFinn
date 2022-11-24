const { getIO, getAuthHelper } = require('../utils/utils');
const { initialize: socketInitClient } = require('./client.socket.js');
const { initialize: socketInitScraper } = require('./scraper.socket.js');

const initialize = () => {
	const io = getIO();

	const authHelper = getAuthHelper();

	io.use(async (socket, next) => {
		const type = socket.handshake.auth.type;
		console.log('GOT', type, socket.handshake.auth);
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
	});

	io.on('connection', async (socket) => {
		const auth = socket.auth;

		if (auth.type == 'client') socketInitClient(socket);
		if (auth.type == 'scraper') socketInitScraper(socket);
	});
};

module.exports = {
	initialize,
};
