const { getIO, getAuthHelper, debounce } = require("../utils/utils");
const { writeWatchInfoToDatabase } = require('../utils/watchManager');

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
        socket.on('timeUpdate', (obj) => {
            obj.time = Math.ceil(obj.time);
            if (obj.movie == -1 && obj.season == -1 && obj.episode == -1)
                return;
            console.log('TUpd:', auth.user.username, obj);
            if (obj.force) {
                writeWatchInfoToDatabase(socket, obj);
            } else {
                if (!auth.debounce) auth.debounce = debounce(writeWatchInfoToDatabase, 4000);

                auth.debounce(socket, obj);
            }
        });

        socket.on('disconnect', () => {
            console.log('Socket DisConnection:', auth.user.username, socket.id);
        })

    });

}

module.exports = {
    initialize
};