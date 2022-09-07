const { updateSegment } = require("./watchString");
const { getIO } = require("./utils");

async function writeWatchInfoToDatabase(socket, obj) {
    console.log('Write Through:', socket.auth.user.username, obj);

    const { movie = -1, season, episode, time } = obj;

    const searchOBJ = {
        series: obj.series,
        movie: obj.movie || -1,
        season: obj.season,
        episode: obj.episode,
    }

    let update = false;
    let updatedSegmentList;

    const updateFunction = seg => {
        if (seg.time < time) {
            update = true;
            seg.time = time;
        }
    }

    if (!searchOBJ.series || isNaN(searchOBJ.series) || searchOBJ.series == null || searchOBJ.series == -1) {
        return;
    }

    if (movie !== -1 && movie !== undefined) {
        updatedSegmentList = await updateSegment(socket.auth.user.UUID, searchOBJ, updateFunction);
    }

    if (season !== -1 && episode !== -1) {
        updatedSegmentList = await updateSegment(socket.auth.user.UUID, searchOBJ, updateFunction);
    }

    if (update) {

        console.log('  => Updated');

        const sockets = await getIO().fetchSockets();
        sockets.forEach(bcsocket => {
            //This Ensures even if the user is logged in on multiple pages everything reflects
            if (bcsocket.auth.user.UUID == socket.auth.user.UUID) {
                bcsocket.emit('watchListChange', updatedSegmentList);
            }
        })
    }
}

module.exports = {
    writeWatchInfoToDatabase,
}