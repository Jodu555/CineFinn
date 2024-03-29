const { Database } = require('@jodu555/mysqlapi');
const { toAllSockets, getIO } = require('../utils/utils');

const database = Database.getDatabase();

const debug = false;

const initialize = (socket) => {
	const auth = socket.auth;
	console.log('Socket Connection:', auth.type.toUpperCase(), socket.id);

	socket.on('rmvc-connect', async ({ rmvcID }) => {
		const sockets = await getIO().fetchSockets();
		const recieverSocket = sockets.find((s) => s.auth.type == 'client' && s.auth.RMVCSessionID == rmvcID);
		const rmvcIDValid = recieverSocket != null;
		socket.auth.RMVCEmitterSessionID = rmvcID;
		debug && console.log('GOT rmvc-connect with ID', rmvcID, 'status', rmvcIDValid);
		if (recieverSocket) {
			debug && console.log('rmvc-get-videoState');
			recieverSocket.emit('rmvc-get-videoState');
		}
		socket.emit('rmvc-connection', { status: rmvcIDValid });
	});

	socket.on('rmvc-send-action', async ({ rmvcID: RMVCSessionID, action }) => {
		debug && console.log('Recieved rmvc-emitter-action', action, socket.id);
		const sockets = await getIO().fetchSockets();
		const rmvcIDValid = sockets.find((s) => s.auth.type == 'client' && s.auth.RMVCSessionID == RMVCSessionID) != null;
		if (rmvcIDValid && RMVCSessionID == socket.auth.RMVCEmitterSessionID) {
			await toAllSockets(
				(s) => {
					s.emit('rmvc-recieve-action', action);
				},
				(s) => s.auth.type == 'client' && s.auth.RMVCSessionID == RMVCSessionID
			);
		} else {
			socket.emit('rmvc-connection', { status: rmvcIDValid });
		}
	});

	socket.on('disconnect', () => {
		console.log('Socket DisConnection:', auth.type.toUpperCase(), socket.id);
	});

	// socket.emit('reloadSeries', cleanupSeriesBeforeFrontResponse(getSeries()));
};

module.exports = {
	initialize,
};
