import * as fs from 'fs';
const crypto = require('crypto');
require('dotenv').config();
import axios from 'axios';
const io = require('socket.io-client');
import Aniworld from './class/Aniworld';
import { compareForNewReleases, compareForNewReleasesAniWorld, compareForNewReleasesZoro } from './utils/compare';
const { similar } = require('./utils/utils');
import Zoro from './class/Zoro';
import { IgnoranceItem, Serie } from './utils/types';

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

	// {
	// 	"_animeFolder": "By the Grace of the Gods",
	// 	"finished": false,
	// 	"folder": "Season 2",
	// 	"file": "By the Grace of the Gods St.2 Flg.7_GerSub",
	// 	"url": "https://aniworld.to/anime/stream/by-the-grace-of-the-gods/staffel-2/episode-7",
	// 	"m3u8": ""
	// },

	// const array: ExtendedEpisodeDownload[] = [];

	// const zoro = new Zoro('18244');
	// const zoro = new Zoro('1560');

	// const ret = await zoro.getSeasons();

	// console.log(ret);

	// const { total, episodes } = await zoro.getExtendedEpisodeList();
	// console.log(episodes);

	// for (const episode of episodes) {
	// 	if (episode.langs.includes('dub')) {
	// 		array.push({
	// 			_animeFolder: 'The Reincarnation of the Strongest Exorcist in Another World',
	// 			finished: false,
	// 			folder: 'Season-1',
	// 			file: `The Reincarnation of the Strongest Exorcist in Another World St.1 Flg.${episode.number}_EngDub`,
	// 			url: episode.url,
	// 			m3u8: '',
	// 		});
	// 	}
	// }

	// console.log(array);

	// fs.writeFileSync('zorolist.json', JSON.stringify(array, null, 3));

	// const res = await axios.get<Serie[]>('http://cinema-api.jodu555.de/index/all?auth-token=' + process.env.AUTH_TOKEN_REST);

	// const refs = new Set();

	// res.data.forEach((serie) => {
	// 	refs.add(serie.references);
	// });

	// console.log(refs);

	// await checkForUpdates();
	// await manuallyCraftTheList();
	// await generateNewDownloadList();
	// await manuallyPrintTheInfosOut();
	// await programmaticallyInsertTheInfos();
	// await addReference();
});

async function addReference() {
	const update: { [key: string]: string } = {
		ed0b1eba: '18122', //War God System! I’m Counting On You! --------
		'2fb85af9': '18161', // Reincarnated as a Sword ------------
		e26e2bf8: '17372', // Banished From the Heroes' Party !!!!!!!!!!!!!!!!!!!!!!
	};

	for (const ID in update) {
		const zoroID = update[ID];
		const patchBody = {
			references: {
				zoro: zoroID,
			},
		};

		const response = await axios.patch(`http://cinema-api.jodu555.de/index/${ID}?auth-token=${process.env.AUTH_TOKEN_REST}`, patchBody);
		// console.log(patchBody, response.status);
	}
}

async function checkForUpdates() {
	const res = await axios.get<Serie[]>('http://cinema-api.jodu555.de/index/all?auth-token=' + process.env.AUTH_TOKEN_REST);
	// res.data = res.data.filter((x) => x.ID == 'a9f36e78');
	// res.data = res.data.filter((x) => x.title.includes('Kaguya'));
	// res.data = res.data.filter((x) => x.title.includes('Mushoku'));
	// res.data = res.data.filter((x) => x.title.includes('Honor'));
	// res.data = res.data.filter((x) => x.title.includes('Grace'));

	// console.log(res.data);

	//This list should say, that these animes should the new episodes no be included unless they are german dubbed
	const ignoranceList: IgnoranceItem[] = [
		{
			ID: 'c8001b23', // Detektiv Conan
		},
		{
			ID: 'a9f36e78', // Peter Grill and the Philosopher’s Time
			lang: 'GerDub', // Has only the first episode in GerSub rest in EngSub
		},
	];

	// console.log(await compareForNewReleasesAniWorld(res.data, ignoranceList));
	// await compareForNewReleasesZoro(res.data, ignoranceList, false);

	await compareForNewReleases(res.data, ignoranceList);
}

async function generateNewDownloadList() {
	const arr = [
		{
			title: 'Tsuredure Children',
			aniworldID: '',
			zoroID: '1002',
		},
	];

	const mappedArr = arr.map((x) => {
		const ref = { aniworld: '', zoro: '' };
		if (x.aniworldID) {
			ref.aniworld = 'https://aniworld.to/anime/stream/' + x.aniworldID;
		}
		if (x.zoroID) {
			ref.zoro = x.zoroID;
		}
		return {
			ID: crypto.randomUUID().split('-')[0],
			title: x.title,
			references: ref,
			categorie: 'aniworld',
			infos: {},
			seasons: [],
			movies: [],
		};
	});

	compareForNewReleases(mappedArr, []);
}

async function manuallyPrintTheInfosOut(refUrl: string) {
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
	const res = await axios.get<Serie[]>('http://cinema-api.jodu555.de/index/all?auth-token=' + process.env.AUTH_TOKEN_REST);

	res.data = res.data.filter((x) => x.references?.aniworld);
	res.data = res.data.filter((x) => !(x.infos.title || x.infos.description));

	console.log(res.data);

	const imageList = [];

	for (const series of res.data) {
		const anime = new Aniworld(series.references.aniworld as string);
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

buildFunction('ZoroData', async ({ ID }) => {
	const zoro = new Zoro(ID);
	const informations = await zoro.getExtendedEpisodeList();
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
