const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();
const axios = require('axios');
const io = require('socket.io-client');
const Aniworld = require('./class/AniWorld');
const { compareForNewReleases } = require('./utils/compare');
const { similar } = require('./utils/utils');

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

	// const res = await axios.get('http://cinema-api.jodu555.de/index/all?auth-token=' + process.env.AUTH_TOKEN_REST);

	// const cleaned = res.data.filter((x) => x.categorie == 'Aniworld' && !x.infos.infos && !x.title.includes('She-Ra'));

	// const commands = [];

	// for (const x of cleaned) {
	// 	const img = await manuallyPrintTheInfosOut(x.references.aniworld);
	// 	commands.push(`wget ${img} -O ${x.ID}/cover.jpg`);
	// }

	// console.log(commands);

	// await checkForUpdates();
	// await manuallyCraftTheList();
	// await generateNewDownloadList();
	// await manuallyPrintTheInfosOut();
	await programmaticallyInsertTheInfos();
});

async function checkForUpdates() {
	const res = await axios.get('http://cinema-api.jodu555.de/index/all?auth-token=' + process.env.AUTH_TOKEN_REST);
	// res.data = res.data.filter((x) => x.title.includes('To Love-Ru') || x.title.includes('Irregular'));
	await compareForNewReleases(res.data);
}

async function generateNewDownloadList() {
	const arr = [
		{
			title: 'Ya Boy Kongming!',
			url: 'ya-boy-kongming',
		},
	];

	const mappedArr = arr.map((x) => {
		return {
			ID: crypto.randomUUID().split('-')[0],
			title: x.title,
			references: { aniworld: 'https://aniworld.to/anime/stream/' + x.url },
			seasons: [],
			movies: [],
		};
	});

	compareForNewReleases(mappedArr);
}

async function manuallyPrintTheInfosOut(refUrl) {
	const anime = !refUrl ? new Aniworld('https://aniworld.to/anime/stream/reincarnated-as-a-sword') : new Aniworld(refUrl);
	const { url, informations } = await anime.parseInformations();

	const output = {
		references: { aniworld: url },
		infos: {
			...informations,
			image: true,
		},
	};

	console.log(JSON.stringify(output, null, 3));
	// console.log(informations.image);
	return informations.image;
}

async function programmaticallyInsertTheInfos() {
	// const res = await axios.get('http://localhost:3100/index/all?auth-token=' + process.env.AUTH_TOKEN_REST);
	const res = await axios.get('http://cinema-api.jodu555.de/index/all?auth-token=' + process.env.AUTH_TOKEN_REST);

	res.data = res.data.filter((x) => x.references?.aniworld);
	res.data = res.data.filter((x) => !(x.infos.title || x.infos.description));

	console.log(res.data);

	const imageList = [];

	for (const series of res.data) {
		const anime = new Aniworld(series.references.aniworld);
		const { url, informations } = await anime.parseInformations();

		const img = informations.image;
		delete informations.image;
		const patchBody = {
			infos: {
				...informations,
				// imageURL: img,
				image: true, //This is here because no on local i would download the images to disk
			},
		};

		imageList.push(img);

		const response = await axios.patch(`http://cinema-api.jodu555.de/index/${series.ID}?auth-token=${process.env.AUTH_TOKEN_REST}`, patchBody);

		// console.log(response.status, { ID: series.ID, title: series.title, infos: series.infos, references: series.references }, patchBody);

		console.log(`Patched Series ${series.ID} - ${series.title} with the reference ${series.references}`);
		console.log('  => With ', patchBody);
		console.log(`  => Resulting In ${response.status}`);
	}

	imageList.forEach((imgs) => {
		console.log(imgs);
	});
}

async function manuallyCraftTheList() {
	const seasons = [11, 10, 10, 10, 10, 10];

	const output = seasons
		.map((x, i) => {
			const s = i + 1;
			const out = [];
			for (let j = 0; j < x; j++) {
				const e = j + 1;
				out.push({
					_animeFolder: 'Rick and Morty',
					finished: false,
					folder: `Season ${s}`,
					file: `Rick and Morty St.${s} Flg.${e}_GerDub`,
					url: `http://190.115.18.20/serie/stream/rick-and-morty/staffel-${s}/episode-${e}`,
					m3u8: '',
				});
			}
			return out;
		})
		.flat();

	fs.writeFileSync('dlList.json', JSON.stringify(output, null, 3));
}

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
