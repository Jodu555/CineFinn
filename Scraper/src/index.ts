import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import io from 'socket.io-client';
import { changeEpisode, compareForNewReleases, compareForNewReleasesAniWorld, compareForNewReleasesZoro, ChangedZoroEpisode } from './utils/compare';
import Aniworld from './class/Aniworld';
import Zoro from './class/Zoro';
import Anix from './class/Anix';
const { similar } = require('./utils/utils');
import MyAsianTV from './class/MyAsianTv';
import { Serie, IgnoranceItem, ExtendedEpisodeDownload } from '@Types/classes';
import { AniWorldSeriesInformations, MyAsianSeries, ZoroReturn } from '@Types/scrapers';
import { downloadImage } from './utils/utils';

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

	// await fixer();
	// await checkForUpdates();
	// await manuallyCraftTheList();
	// await generateNewDownloadList();
	// await programmaticallyInsertTheInfos();
	// await addReference();

	// await checkAllAnimes();
	// await downloadImages();
});





// async function fixer() {
// 	const animes = [{
// 		ID: '75941d47',
// 		url: 'https://aniworld.to/anime/stream/bogus-skill-fruitmaster-about-that-time-i-became-able-to-eat-unlimited-numbers-of-skill-fruits-that-kill-you',
// 		name: 'Bogus Skill „Fruitmaster“ - About That Time I Became Able to Eat Unlimited Numbers of Skill Fruits (That Kill You)'
// 	},
// 	{
// 		ID: 'e6a8551f',
// 		url: 'https://aniworld.to/anime/stream/no-longer-allowed-in-another-world',
// 		name: 'No Longer Allowed in Another World'
// 	},
// 	{
// 		ID: '73c9c55e',
// 		url: 'https://aniworld.to/anime/stream/magic-maker-how-to-make-magic-in-another-world',
// 		name: 'Magic Maker - How to Make Magic in Another World '
// 	},
// 	{
// 		ID: 'f61a3e61',
// 		url: 'https://aniworld.to/anime/stream/7th-time-loop-the-villainess-enjoys-a-carefree-life-married-to-her-worst-enemy',
// 		name: '7th Time Loop - The Villainess Enjoys a Carefree Life Married to Her Worst Enemy!'
// 	},
// 	{
// 		ID: 'a6abd489',
// 		url: 'https://aniworld.to/anime/stream/ragna-crimson',
// 		name: 'Ragna Crimson'
// 	},
// 	{
// 		ID: '8ae04a49',
// 		url: 'https://aniworld.to/anime/stream/why-does-nobody-remember-me-in-this-world',
// 		name: 'Why does Nobody Remember Me in This World'
// 	},
// 	{
// 		ID: 'e4854fdf',
// 		url: 'https://aniworld.to/anime/stream/i-want-to-escape-from-princess-lessons',
// 		name: 'I Want to Escape from Princess Lessons'
// 	},
// 	{
// 		ID: '0c46842e',
// 		url: 'https://aniworld.to/anime/stream/uncle-from-another-world',
// 		name: 'Uncle from Another World'
// 	},
// 	{
// 		ID: 'e3c02a81',
// 		url: 'https://aniworld.to/anime/stream/outbreak-company',
// 		name: 'Outbreak Company'
// 	},
// 	{
// 		ID: '9e77527f',
// 		url: 'https://aniworld.to/anime/stream/ascendance-of-a-bookworm',
// 		name: 'Ascendance of a Bookworm'
// 	}
// 	];

// 	for (const _anime of animes) {
// 		const anime = new Aniworld(_anime.url);
// 		const informations = await anime.parseInformations();
// 		if (!informations) {
// 			console.log(`Could not parse ${_anime.url}`);
// 			continue;
// 		}

// 		const seriesObject = {
// 			ID: _anime.ID,
// 			categorie: 'Aniworld',
// 			title: _anime.name,
// 			movies: [],
// 			seasons: [],
// 			references: {
// 				aniworld: _anime.url,
// 			},
// 			infos: informations.informations,
// 		};
// 		const imageObject = { imageUrl: informations.informations.image };

// 		console.log(seriesObject, imageObject);


// 		const response = await axios.post(`${process.env.ACTION_API_HOST}/index/?auth-token=${process.env.AUTH_TOKEN_REST}`, seriesObject);
// 		const imageResponse = await axios.post(`${process.env.ACTION_API_HOST}/index/${_anime.ID}/cover?auth-token=${process.env.AUTH_TOKEN_REST}`, imageObject);

// 		console.log(response.status);
// 	}



// }

async function downloadImages() {
	const res = await axios.get<Serie[]>(`${process.env.ACTION_API_HOST}/index/all?auth-token=${process.env.AUTH_TOKEN_REST}`);
	console.log(res.data.length);
	const doable = res.data.filter((x) => x.references.aniworld || x.references.sto);

	console.log(doable.length);

	for (const serie of doable) {
		// const imagePath = path.join('D:', 'Allgemein', 'Ich', 'Temp', 'images', serie.ID);
		// const imagePath = path.join('S:', 'CineFinn-data', 'previewImages', serie.ID);
		const imagePath = path.join('S:', 'slash', 'media', 'ms2', 'CineFinn-data', 'previewImages', serie.ID);
		if (fs.existsSync(path.join(imagePath, 'cover.jpg'))) {
			console.log('Already exists: ', serie.title);
			continue;
		}
		console.log('Parsing: ', serie.title, serie.references.aniworld);

		const aniworld = new Aniworld(serie.references.aniworld as string || serie.references.sto as string);
		const informations = await aniworld.parseInformations();
		if (!informations) {
			console.log('no informations from ', serie.references.aniworld);
			continue;
		}

		fs.mkdirSync(imagePath, { recursive: true });
		await downloadImage(informations.informations.image as string, path.join(imagePath, 'cover.jpg'));
		console.log('Downloaded ', serie.title, 'Cover');
		console.log(imagePath);
	}

	console.log('Done');



	// const imageResponse = await useAxios().post(`/index/${serieID}/cover`, { imageUrl });

	// 			if (imageResponse.status !== 200) {
	// 				instance.$swal({
	// 					toast: true,
	// 					position: 'top-end',
	// 					showConfirmButton: false,
	// 					timer: 3000,
	// 					icon: 'error',
	// 					title: `${imageResponse.data.error.message || 'An Error occurd'}`,
	// 					timerProgressBar: true,
	// 				});
	// 			}
}

async function checkAllAnimes() {
	const data = JSON.parse(fs.readFileSync('allaniworldanimes.json', 'utf8'));
	let accEpisodes = 0;
	let accMovies = 0;

	for (let i = 0; i < data.length; i++) {
		console.log('Parsed ', data[i], i, '/', data.length);

		const scope = {
			anime: new Aniworld(data[i]),
			informations: null,
		} as {
			anime: Aniworld;
			informations: AniWorldSeriesInformations | void;
		};
		scope.informations = await scope.anime.parseInformations();
		if (!scope.informations) {
			continue;
		}
		accEpisodes += scope.informations.seasons.flat().length;
		accMovies += scope.informations.movies?.length || 0;
		delete scope.anime;
		delete scope.informations;
	}

	console.log(accEpisodes);
	console.log(accMovies);
}

async function addReference() {
	const update: { [key: string]: string; } = {
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
	const res = await axios.get<Serie[]>(`${process.env.ACTION_API_HOST}/index/all?auth-token=${process.env.AUTH_TOKEN_REST}`);
	// const res = await axios.get<Serie[]>('http://cinema-api.jodu555.de/index/all?auth-token=' + process.env.AUTH_TOKEN_REST);
	// res.data = res.data.filter((x) => x.references.zoro == '18586');
	// res.data = res.data.filter((x) => x.ID == '1136c6bb');
	// res.data = res.data.filter((x) => x.title.includes('Honor') || x.title.includes('Grace'));
	// res.data.length = res.data.length / 0.5;
	// res.data.push(
	// 	...([
	// 		{
	// 			ID: 'xxxxxxxxxxx',
	// 			title: 'Kakuriyo - Bed and Breakfast for Spirits',
	// 			categorie: 'Aniworld',
	// 			seasons: [],
	// 			movies: [],
	// 			infos: {},
	// 			references: {
	// 				zoro: '1520',
	// 			},
	// 		},
	// 	] as Serie[])
	// );
	// console.log(res.data);

	// res.data.map(x => {
	// 	if (x.infos.disabled) {
	// 		x.seasons = [];
	// 		x.movies = [];
	// 	}
	// 	return x;
	// });

	//This list should say, that these animes should the new episodes no be included unless they are german dubbed
	const ignoranceList: IgnoranceItem[] = [];

	if (process.env.IGNORE_API_HOST) {
		const ignoreResponse = await axios.get<{ ID: string; title: string; }[]>(`${process.env.ACTION_API_HOST}/ignoreList/?auth-token=${process.env.AUTH_TOKEN_REST}`);
		// const ignoreResponse = await axios.get<{ ID: string, title: string; }[]>(`http://cinema-api.jodu555.de/ignoreList/?auth-token=${process.env.AUTH_TOKEN_REST}`);
		console.log('Loaded', ignoreResponse.data.length, 'Animes/Series to Ignore for now!');
		for (const item of ignoreResponse.data) {
			ignoranceList.push({
				ID: item.ID,
			});
		}
	}

	console.time('Compare');
	// const output = await compareForNewReleases(res.data, ignoranceList, { aniworld: false, sto: true, zoro: false });
	const output = await compareForNewReleases(res.data, ignoranceList, { aniworld: true, sto: true, zoro: false });
	console.timeEnd('Compare');


	const condensedArray = [
		...output.aniworld.map(x => ({ _categorie: 'Aniworld', ...x })),
		...output.sto.map(x => ({ _categorie: 'STO', ...x }))
	];
	if (condensedArray.length == 0) return;

	console.log(condensedArray);
	console.log(condensedArray.length);
	// return;

	await kickOffAniDl(condensedArray);

	await recrawlArchive();
	await generateImages();
}

async function kickOffAniDl(list: ExtendedEpisodeDownload[]) {
	const headers = {
		token: process.env.ANI_DL_TOKEN,
	};

	try {
		console.time('Upload');
		let out = await axios.post(
			`${process.env.ANI_DL_HOST}/upload`,
			{
				data: list,
			},
			{
				headers,
			}
		);
		console.log(out.status, out.data);
		const ID = out.data.ID;
		console.timeEnd('Upload');

		console.time('Collect');
		out = await axios.get(`${process.env.ANI_DL_HOST}/collect/${ID}`, {
			headers,
		});
		console.log(out.status, out.data);
		console.timeEnd('Collect');

		console.time('Download');
		out = await axios.get(`${process.env.ANI_DL_HOST}/download/${ID}`, {
			headers,
		});
		console.log(out.status, out.data);
		console.timeEnd('Download');

		console.time('Finish');
		out = await axios.get(`${process.env.ANI_DL_HOST}/finish/${ID}`, {
			headers,
		});
		console.log(out.status, out.data);
		console.timeEnd('Finish');
	} catch (error) {
		console.error(error);
	}
}

async function recrawlArchive() {
	console.time('Recrawl');
	await axios.get(`${process.env.ACTION_API_HOST}/managment/job/crawl`, {
		headers: {
			'auth-token': process.env.AUTH_TOKEN_REST,
		},
	});
	console.timeEnd('Recrawl');
}

async function generateImages() {
	console.time('GenerateImg');
	await axios.get(`${process.env.ACTION_API_HOST}/managment/job/img/generate`, {
		headers: {
			'auth-token': process.env.AUTH_TOKEN_REST,
		},
	});
	console.timeEnd('GenerateImg');
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

async function programmaticallyInsertTheInfos() {
	const res = await axios.get<Serie[]>(`${process.env.ACTION_API_HOST}/index/all?auth-token=${process.env.AUTH_TOKEN_REST}`);
	// const res = await axios.get<Serie[]>('http://localhost:3100/index/all?auth-token=' + process.env.AUTH_TOKEN_REST);
	// const res = await axios.get<Serie[]>('http://cinema-api.jodu555.de/index/all?auth-token=' + process.env.AUTH_TOKEN_REST);

	console.log(
		'Loaded',
		res.data.length,
		'Animes/Series to check for the informations'
	);


	res.data = res.data.filter((x) => x.references?.aniworld || x.references?.sto);
	console.log('Came', res.data.length);

	res.data = res.data.filter((x) => {
		if (x.infos.title == undefined || x.infos.description == undefined) {
			return true;
		}
		const result = !(x.infos.title.trim().length > 2 && x.infos.description.trim().length > 10);
		return result;
	});

	console.log(
		'Filtered',
		res.data.length,
		'Animes/Series to check for the informations'
	);

	const imageList = [];

	for (const series of res.data) {
		const anime = new Aniworld(series.references.aniworld as string || series.references.sto as string);
		const infos = await anime.parseInformations();
		if (!infos) {
			console.log(`Could not parse ${series.title}`);
			continue;
		}
		const { informations } = infos;

		const img = informations.image;
		delete informations.image;
		const patchBody = {
			infos: {
				...informations,
				imageURL: img,
				// image: true, //This is here because no on local i would download the images to disk
			},
		};

		// imageList.push(img);

		const response = await axios.patch(`${process.env.ACTION_API_HOST}/index/${series.ID}?auth-token=${process.env.AUTH_TOKEN_REST}`, patchBody);

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

function buildFunction<R, T>(method: string, cb: (arg: T) => Promise<R | void>) {
	socket.on(`call${method}`, async (data: T & { __refID: string; }) => {
		const __refID = data.__refID;
		delete data.__refID;
		const returnValue = await cb(data as T);
		socket.emit(`return${method}`, { ...returnValue, __refID, __returnValue: Boolean(returnValue) });
	});
}

buildFunction<AniWorldSeriesInformations, { url: string; }>('AniworldData', async ({ url }) => {
	console.log('Recieved AniworldData', url);
	const anime = new Aniworld(url);
	const informations = await anime.parseInformations();
	return informations;
});

buildFunction<ZoroReturn, { ID: string | number; }>('ZoroData', async ({ ID }) => {
	console.log('Recieved ZoroData', ID);
	const zoro = new Zoro(String(ID));
	await zoro.initialize();
	const informations = await zoro.getExtendedEpisodeList();
	return { ...informations };
});

buildFunction<any, { ID: string | number; }>('newZoroData', async ({ ID }) => {
	console.log('Recieved newZoroData', ID);

	const anime = new Zoro(ID.toString());
	const informations = await anime.parseInformations();
	return informations;
});

buildFunction<any, { slug: string; }>('AnixData', async ({ slug }) => {
	console.log('Recieved AnixData', slug);
	const anix = new Anix(slug);
	await anix.initialize();
	const informations = await anix.parseInformations();
	return { ...informations };
});

buildFunction<MyAsianSeries, { slug: string; }>('MyAsianTVData', async ({ slug }) => {
	console.log('Recieved MyAsianTVData', slug);
	const myAsianTV = new MyAsianTV(slug);
	const informations = await myAsianTV.parseInformations();
	console.log(informations);

	return informations;
});

buildFunction<any, { title: string; aniworld: boolean; }>('manageTitle', async ({ title, aniworld }) => {
	function doStuff(input: string, aniworld = true) {
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

buildFunction<{ success: boolean; error?: Error; }, void>('checkForUpdates', async () => {
	try {
		await checkForUpdates();
		return { success: true };
	} catch (error) {
		return { success: false, error };
	}
});

process.on('unhandledRejection', (reason: string, p: Promise<any>) => {
	// console.error('Unhandled Rejection at:', p, 'reason:', reason);
});

process.on('uncaughtException', (error: Error) => {
	// console.error(`Caught exception: ${error}\n` + `Exception origin: ${error.stack}`);
});
