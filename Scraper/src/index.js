const fs = require('fs');
require('dotenv').config();
const axios = require('axios');
const io = require('socket.io-client');
const Aniworld = require('./class/AniWorld');
const { compareForNewReleases } = require('./utils/compare');

const socket = io(process.env.CORE_URL, { auth: { type: 'scraper', token: process.env.AUTH_TOKEN } });

socket.on('connect_error', (error) => {
	console.log('Socket Connect Error: ', error.message); // prints the message associated with the error
	if (error.message.includes('Authentication')) {
		console.log('Wrong Auth-token');
	}
});
socket.on('disconnect', () => {
	console.log('Socket Connection: Disconnected');
});
socket.on('connect', async () => {
	console.log('Socket Connection: Connected');

	// const data = JSON.parse(fs.readFileSync('dlList.json', 'utf-8'));
	// console.log(data.length);

	const res = await axios.get('http://cinema-api.jodu555.de/index/all?auth-token=' + process.env.AUTH_TOKEN_REST);
	// const res = await axios.get('http://localhost:4895/index/all?auth-token=SECR-DEV');

	// Check if there are missing refenreces
	// console.log(res.data.filter((d) => !Boolean(d.references.aniworld)).map((d) => ({ ID: d.ID, title: d.title })));

	res.data = res.data.filter((x) => x.title.includes('Grace'));

	// console.log(`res.data`, res.data);

	compareForNewReleases(res.data);

	// Sub manually print the infos out
	// const anime = new Aniworld('https://aniworld.to/anime/stream/black-summoner');
	// const { url, informations } = await anime.parseInformations();

	// const output = {
	// 	references: { aniworld: url },
	// 	infos: {
	// 		...informations,
	// 		image: true,
	// 	},
	// };

	// console.log(JSON.stringify(output, null, 3));
	// console.log(informations.image);
});

function buildFunction(method, cb) {
	socket.on(`call${method}`, async (data) => {
		const returnValue = await cb(data);
		socket.emit(`return${method}`, returnValue);
	});
}

buildFunction('AniworldData', async ({ url }) => {
	const anime = new Aniworld(url);
	const informations = await anime.parseInformations();
	return { informations };
});

buildFunction('manageTitle', async ({ title, aniworld }) => {
	function doStuff(input, aniworld = true) {
		input = input
			.replaceAll('!', '')
			.replaceAll('+', '')
			.replaceAll('’', '')
			.replaceAll(',', '')
			.replaceAll('ō', '')
			.replaceAll('ä', '')
			.replaceAll('ö', '')
			.replaceAll('ü', '')
			.replaceAll('?', '')
			.replaceAll('ß', '')
			.replaceAll(' - ', '-')
			.replaceAll(' – ', '-')
			.replaceAll(' & ', '-')
			.replaceAll('&', '')
			.replaceAll(':', '');

		if (aniworld) {
			input = input.replaceAll("'", '');
		} else {
			input = input.replaceAll("'", '-');
		}

		input = input.replace(/  +/g, '-');
		input = input.replaceAll(' ', '-');
		return input.toLowerCase();
	}
	return { url: doStuff(title, aniworld) };
});
