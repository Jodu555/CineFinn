require('dotenv').config();
const io = require('socket.io-client');
const Aniworld = require('./class/AniWorld');

const socket = io(process.env.CORE_URL, { auth: { type: 'scraper', token: process.env.AUTH_TOKEN } });

socket.on('connect_error', (error) => {
	console.log('Socket Connect Error: ', error.message); // prints the message associated with the error
	if (err.message.includes('Authentication')) {
		console.log('Wrong Auth-token');
	}
});
socket.on('disconnect', () => {
	console.log('Socket Connection: Disconnected');
});
socket.on('connect', () => {
	console.log('Socket Connection: Connected');
});

(async () => {
	const anime = new Aniworld('https://aniworld.to/anime/stream/more-than-a-married-couple-but-not-lovers/');
	// const informations = await anime.parseInformations();
	// console.log(`informations`, informations);
})();
