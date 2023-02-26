import * as fs from 'fs';
const crypto = require('crypto');
require('dotenv').config();
import axios from 'axios';
const io = require('socket.io-client');
const Aniworld = require('./class/AniWorld');
const { compareForNewReleases } = require('./utils/compare');
const { similar } = require('./utils/utils');
import Zoro from './class/Zoro';

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

	interface ExtendedEpisodeDownload {
		_animeFolder: string;
		finished: boolean;
		folder: string;
		file: string;
		url: string;
		m3u8: string;
	}

	// {
	// 	"_animeFolder": "By the Grace of the Gods",
	// 	"finished": false,
	// 	"folder": "Season 2",
	// 	"file": "By the Grace of the Gods St.2 Flg.7_GerSub",
	// 	"url": "https://aniworld.to/anime/stream/by-the-grace-of-the-gods/staffel-2/episode-7",
	// 	"m3u8": ""
	// },

	const array: ExtendedEpisodeDownload[] = [];

	const zoro = new Zoro('https://zoro.to/watch/saving-80000-gold-in-another-world-for-my-retirement-18297');
	const { total, episodes } = await zoro.getExtendedEpisodeList();
	console.log('Got', total, 'Episodes');

	for (const episode of episodes) {
		if (episode.langs.includes('dub')) {
			array.push({
				_animeFolder: 'Saving 80,000 Gold in Another World for My Retirement',
				finished: false,
				folder: 'Season-1',
				file: `Saving 80,000 Gold in Another World for My Retirement St.1 Flg.${episode.number}_EngDub`,
				url: episode.url,
				m3u8: '',
			});
		}
	}

	console.log(array);

	fs.writeFileSync('zorolist.json', JSON.stringify(array));

	// await checkForUpdates();
	// await manuallyCraftTheList();
	// await generateNewDownloadList();
	// await manuallyPrintTheInfosOut();
	// await programmaticallyInsertTheInfos();
});

async function checkForUpdates() {
	const res = await axios.get('http://cinema-api.jodu555.de/index/all?auth-token=' + process.env.AUTH_TOKEN_REST);
	// res.data = res.data.filter((x) => x.ID == 'a9f36e78');
	// res.data = res.data.filter((x) => x.ID == 'c8001b23' || x.ID == 'a9f36e78');

	// console.log(res.data);

	//This list should say, that these animes should the new episodes no be included unless they are german dubbed
	const ignoranceList = [
		{
			ID: 'c8001b23', // Detektiv Conan
			lang: 'GerDub',
		},
		{
			ID: 'a9f36e78', // Peter Grill and the Philosopher’s Time
			lang: 'GerDub',
		},
	];
	await compareForNewReleases(res.data, ignoranceList);
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
