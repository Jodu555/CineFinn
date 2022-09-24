
const { debounce } = require('../utils/utils');
const { writeWatchInfoToDatabase } = require('../utils/watchManager');

const initialize = (socket) => {

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
}

module.exports = {
    initialize,
}