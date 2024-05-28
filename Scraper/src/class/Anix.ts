import axios from 'axios';
import jsdom from 'jsdom';
import puppeteer, { Browser, HTTPRequest, Page } from 'puppeteer';

export interface AnixEpisode {
	title: string;
	langs: string[];
	slug: string;
	number: string;
	ids: string;
}

export interface SeasonInformation {
	slug: string;
	IDX: string;
	title: string;
}

interface AnixSeriesInformation {
	title: string;
	image: string;
	subCount: number;
	dubCount: number;
	episodeCount: number;
	seasons: AnixEpisode[][];
}

const debug = true;

const hostname = 'anix.to';

const headers = {
	accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
	'accept-language': 'en-GB,en;q=0.8',
	'cache-control': 'no-cache',
	pragma: 'no-cache',
	priority: 'u=0, i',
	'sec-ch-ua': '"Brave";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
	'sec-ch-ua-mobile': '?0',
	'sec-ch-ua-platform': '"Windows"',
	'sec-fetch-dest': 'document',
	'sec-fetch-mode': 'navigate',
	'sec-fetch-site': 'none',
	'sec-fetch-user': '?1',
	'sec-gpc': '1',
	'upgrade-insecure-requests': '1',
};

let STATIC_BROWSER: Browser = null;

class Anix {
	url: string;
	ID: string;
	slug: string;
	cache: Map<string, any>;
	constructor(slug: string) {
		// https://anix.to/anime/
		this.slug = slug;
		this.url = `https://${hostname}/anime/${slug}`;
		this.cache = new Map();
	}

	async initialize() {
		debug && console.log('Called Anix.initialize');
		let data: string;
		if (this.cache.get('homepage-res-data')) {
			data = this.cache.get('homepage-res-data');
		} else {
			const response = await axios.get(this.url, {
				headers,
			});
			data = response.data;
		}
		const { document } = new jsdom.JSDOM(data).window;

		const ID = document.querySelector('.container[itemprop="mainEntity"]').getAttribute('data-id');

		this.ID = ID;
	}

	async parseInformations(): Promise<void | AnixSeriesInformation> {
		debug && console.log('Called Anix.parseInformations');

		try {
			let data: string;
			if (this.cache.get('homepage-res-data')) {
				data = this.cache.get('homepage-res-data');
			} else {
				const response = await axios.get(this.url, {
					headers,
				});
				data = response.data;
			}
			const { document } = new jsdom.JSDOM(data).window;

			const ID = document.querySelector('.container[itemprop="mainEntity"]').getAttribute('data-id');

			this.ID = ID;

			const title = document.querySelector('h1.ani-name').textContent.trim();

			const imageSrc = document.querySelector<HTMLImageElement>('.poster img[itemprop="image"]')?.src;

			const subDubContainer = document.querySelector('.sub-dub-total');

			const subCount = subDubContainer.querySelector('span.sub').textContent.trim();
			const dubCount = subDubContainer.querySelector('span.dub').textContent.trim();
			const episodeCount = subDubContainer.querySelector('span.total').textContent.trim();

			const seasonBody = document.querySelector('.ani-season-body');

			const seasonInfo = seasonBody
				? [...seasonBody.querySelectorAll('a.swiper-slide')].map((anchor: HTMLAnchorElement) => {
						return {
							slug: anchor.href.replace(/.*\/anime\//gi, ''),
							IDX: anchor.querySelector('span').textContent.trim().replaceAll('Season ', ''),
							title: anchor.querySelector('span').textContent.trim().replaceAll('Season ', ''),
						} as SeasonInformation;
				  })
				: [];

			console.log(seasonInfo);

			const seasons: AnixEpisode[][] = [];

			if (seasonInfo.length == 0) {
				console.log('Seems like the Season div does not yet exists, assuming the provided ID is the first season');
				seasonInfo.push({
					slug: this.slug,
					IDX: '1',
					title: 'Season 1',
				});
			}

			for (const si of seasonInfo) {
				console.log('Parsing Season: ' + si.title);
				let inst = si.slug == this.slug ? this : new Anix(si.slug);
				const interEps = await inst.getEpisodeList();
				seasons.push(interEps);
			}

			try {
				const pages = await STATIC_BROWSER.pages();
				for (const page of pages) {
					console.log(page.isClosed());

					await page.close();
				}
				// await STATIC_BROWSER.close();
			} catch (error) {}

			return {
				ID,
				title,
				image: imageSrc,
				subCount: parseInt(subCount),
				dubCount: parseInt(dubCount),
				episodeCount: parseInt(episodeCount),
				seasons,
			} as AnixSeriesInformation;
		} catch (error) {
			debug && console.log(error);

			console.log('Seems like the Season div does not yet exists');

			return null;
		}
	}

	async getEpisodeList() {
		await this.initialize();
		debug && console.log('Called Anix.getEpisodeList');
		const reqURL = await this._getPuppeteerEpisodeListURL();

		console.log(reqURL);

		const response = await axios.get(reqURL, {
			// headers: {
			// 	...headers,
			// 	},
		});
		const { document } = new jsdom.JSDOM(response.data.result).window;

		const episodes = [...document.querySelectorAll('a')]
			.map((anchor: HTMLAnchorElement) => {
				if (anchor.className.includes('dropdown-item')) return;

				const langs = [];
				if (anchor.getAttribute('data-dub') == '1') {
					langs.push('dub');
				}
				if (anchor.getAttribute('data-sub') == '1') {
					langs.push('sub');
				}
				return {
					title: anchor.title,
					langs,
					slug: anchor.getAttribute('data-slug'),
					number: anchor.getAttribute('data-num'),
					ids: anchor.getAttribute('data-ids'),
				} as AnixEpisode;
			})
			.filter((x) => x != undefined);

		return episodes;
	}

	async getBrowser() {
		debug && console.log('Called Anix.getBrowser');
		// return await puppeteer.launch({
		// 	// defaultViewport: null,
		// 	headless: false,
		// 	// devtools: false,
		// 	ignoreHTTPSErrors: true,
		// 	executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', // Windows
		// 	args: [
		// 		// `--disable-extensions-except=${pathToM3Extension}`,
		// 		// `--load-extension=${pathToM3Extension}`,
		// 		'--ignore-certificate-errors',
		// 		'--ignore-certificate-errors-spki-list',
		// 		// '--disable-features=site-per-process',
		// 	],
		// });
		if (STATIC_BROWSER == null) {
			STATIC_BROWSER = await puppeteer.launch({
				// defaultViewport: null,
				headless: false,
				// devtools: false,
				ignoreHTTPSErrors: true,
				executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', // Windows
				args: [
					// `--disable-extensions-except=${pathToM3Extension}`,
					// `--load-extension=${pathToM3Extension}`,
					'--ignore-certificate-errors',
					'--ignore-certificate-errors-spki-list',
					// '--disable-features=site-per-process',
				],
			});
		}
		return STATIC_BROWSER;
	}

	async _getPuppeteerEpisodeListURL() {
		debug && console.log('Called Anix._getPuppeteerEpisodeListURL');
		const wait = (ms: number) => new Promise((resolve, reject) => setTimeout(resolve, ms));
		const browser = await this.getBrowser();

		let page: Page;

		const url = await new Promise<string>(async (resolve, reject) => {
			page = await browser.newPage();

			await page.waitForNetworkIdle();
			await page.setRequestInterception(true);
			const handle = (interceptedRequest: HTTPRequest) => {
				const url = interceptedRequest.url();
				if (url.includes('/episode/list')) {
					console.log('request', url);
					page.off('request');
					interceptedRequest.continue();
					resolve(url);
					return;
				}
				interceptedRequest.continue();
			};
			page.on('request', handle);

			await page.goto(this.url);
		});

		try {
			console.log('URL', url, 'waiting....');
			await wait(500);
			// const pages = await browser.pages();
			// for (const page of pages) {
			// 	console.log(page.isClosed());
			// 	await page.close();
			// }
			// await wait(800);
		} catch (error) {
			console.log('IGNORING', error);
		}

		return url;
	}
}

export default Anix;
