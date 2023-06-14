const { Database } = require('@jodu555/mysqlapi');
const { toAllSockets } = require('../utils/utils');

const database = Database.getDatabase();

const initialize = (socket) => {
	const auth = socket.auth;
	console.log('Socket Connection:', auth.type.toUpperCase(), socket.id);

	socket.on('rmvc-send-action', async ({ rmvcID: RMVCSessionID, action }) => {
		console.log('Recieved rmvc-emitter-action', action, socket.id);
		await toAllSockets(
			(s) => {
				s.emit('rmvc-recieve-action', action);
			},
			(s) => s.auth.type == 'client' && s.auth.RMVCSessionID == RMVCSessionID
		);
	});

	socket.on('disconnect', () => {
		console.log('Socket DisConnection:', auth.type.toUpperCase(), socket.id);
	});

	// socket.emit('reloadSeries', cleanupSeriesBeforeFrontResponse(getSeries()));
};

module.exports = {
	initialize,
};
