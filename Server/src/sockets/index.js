const { getIO, getAuthHelper } = require("../utils/utils");
const { initialize: socketInitClient } = require('./client.socket.js');

const initialize = () => {
    const io = getIO();

    const authHelper = getAuthHelper();

    io.use((socket, next) => {
        const type = socket.handshake.auth.type;
        if (type == 'client') {
            const authToken = socket.handshake.auth.token;
            if (authToken && authHelper.getUser(authToken)) {
                console.log(`Socket with`);
                console.log(`   ID: ${socket.id} - ${type.toUpperCase()}`);
                console.log(`   - proposed with: ${authToken} - ${authHelper.getUser(authToken).username}`);
                socket.auth = { token: authToken, user: authHelper.getUser(authToken), type };
                return next();
            } else {
                next(new Error('Authentication error'));
            }
        }
    });

    io.on('connection', async (socket) => {
        const auth = socket.auth;


        console.log('Socket Connection:', auth.type.toUpperCase(), auth.user.username, socket.id);

        if (type == 'client')
            socketInitClient(socket);

    });

}

module.exports = {
    initialize
};