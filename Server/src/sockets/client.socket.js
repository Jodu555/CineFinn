
const { debounce } = require('../utils/utils');
const { writeWatchInfoToDatabase } = require('../utils/watchManager');

const initialize = (socket) => {
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

    socket.on('getWatchList', () => {
        new Promise(async (resolve, _) => {
            const segList = parse(await load(req.credentials.user.UUID));
            socket.emit('watchListChange', segList.filter(seg => seg.ID == req.query.series))
            resolve();
        })
    });

    socket.on('disconnect', () => {
        console.log('Socket DisConnection:', auth.type.toUpperCase(), auth.user.username, socket.id);
    })
}

module.exports = {
    initialize,
}