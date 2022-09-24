const { getIO, getAuthHelper, debounce } = require("../utils/utils");
const { writeWatchInfoToDatabase } = require('./utils/watchManager');

const initialize = () => {
    const io = getIo();

    const authHelper = getAuthHelper();

    io.use((socket, next) => {
        const authToken = socket.handshake.auth.token;
        console.log(socket.handshake.auth);
        if (authToken && authHelper.getUser(authToken)) {
            if (authToken) {
                console.log(`Socket with`);
                console.log(`   ID: ${socket.id}`);
                console.log(`   - proposed with: ${authToken} - ${authHelper.getUser(authToken).username}`);
                socket.auth = { token: authToken, user: authHelper.getUser(authToken) };
                return next();
            } else {
                return next(new Error('Authentication error'));
            }
        } else {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', async (socket) => {
        console.log('Socket Connection:', socket.auth.user.username, socket.id);
        socket.on('timeUpdate', (obj) => {
            obj.time = Math.ceil(obj.time);
            if (obj.movie == -1 && obj.season == -1 && obj.episode == -1)
                return;
            console.log('TUpd:', socket.auth.user.username, obj);
            if (obj.force) {
                writeWatchInfoToDatabase(socket, obj);
            } else {
                if (!socket.auth.debounce) socket.auth.debounce = debounce(writeWatchInfoToDatabase, 4000);

                socket.auth.debounce(socket, obj);
            }
        });

        socket.on('disconnect', () => {
            console.log('Socket DisConnection:', socket.auth.user.username, socket.id);
        })

    });

}

module.exports = {
    initialize
};