import axios from 'axios';
import jsdom from 'jsdom';

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

export interface SeasonInformation {
	slug: string;
	IDX: string;
	title: string;
}

const vrf = 'QytQVDtrVFg2PVJM';

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

	async parseInformations(): Promise<void | any> {
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

			const seasonInfo = [...seasonBody.querySelectorAll('a.swiper-slide')].map((anchor: HTMLAnchorElement) => {
				return {
					slug: anchor.href.replace(/.*\/anime\//gi, ''),
					IDX: anchor.querySelector('span').textContent.trim().replaceAll('Season ', ''),
					title: anchor.querySelector('span').textContent.trim().replaceAll('Season ', ''),
				} as SeasonInformation;
			});

			console.log(seasonInfo);

			const seasons: any[][] = [];

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
				if (subCount == dubCount && subCount === episodeCount) {
					seasons.push(
						interEps.episodes.map((x) => {
							return {
								...x,
								langs: ['sub', 'dub'],
							} as any;
						})
					);
				} else {
					// seasons.push((await inst.getExtendedEpisodeList(interEps)).episodes);
				}
			}

			return {
				ID,
				title,
				image: imageSrc,
				subCount: parseInt(subCount),
				dubCount: parseInt(dubCount),
				episodeCount: parseInt(episodeCount),
				// seasons,
			};
		} catch (error) {
			debug && console.log(error);

			console.log('Seems like the Season div does not yet exists');

			return null;
		}
	}

	async getEpisodeList(): Promise<{ total: number; episodes: any[] }> {
		await this.initialize();
		debug && console.log('Called Anix.getEpisodeList');
		// const url = `https://${hostname}/ajax/episode/list/${this.ID}?vrf=${vrf}`;
		// console.log(url);
		// return;

		const response = await axios.get(`https://${hostname}/ajax/episode/list/${this.ID}?vrf=${vrf}`, {
			// headers: {
			// 	...headers,
			// 	cookie: `_ga=GA1.1.1675990185.1716811273; usertype=guest; dom3ic8zudi28v8lr6fgphwffqoz0j6c=f1994769-8308-4826-a53a-08fde95d4942%3A2%3A1; __pf=1; pp_main_13a2cc546d58c4e8026278f34cba6491=1; pp_sub_13a2cc546d58c4e8026278f34cba6491=1; pp_delay_13a2cc546d58c4e8026278f34cba6491=1; _ga_EMMQD7K482=GS1.1.1716818532.2.1.1716818532.0.0.0`,
			// },
		});
		const total = response.data.totalItems;
		const { document } = new jsdom.JSDOM(response.data.html).window;

		const episodes = [...document.querySelectorAll('a')].map((anchor: HTMLAnchorElement) => {
			return {
				ID: anchor.dataset.id,
				title: anchor.title,
				sub: anchor.getAttribute('data-sub'),
				dub: anchor.getAttribute('data-dub'),
				slug: anchor.getAttribute('data-slug'),
				number: anchor.getAttribute('data-num'),
				ids: anchor.getAttribute('data-ids'),
			};
		});
		return {
			total,
			episodes,
		};
	}

	// async getExtendedEpisodeList(preData?: { total: number; episodes: any[] }): Promise<{ total: number; episodes: any[] }> {
	// 	debug && console.log('Called Anix.getExtendedEpisodeList');

	// 	let total = 0;
	// 	let episodes: any[] = [];
	// 	if (!preData) {
	// 		const res = await this.getEpisodeList();
	// 		total = res.total;
	// 		episodes = res.episodes;
	// 	} else {
	// 		total = preData.total;
	// 		episodes = preData.episodes;
	// 	}

	// 	const extendedEpisodes: any[] = [];

	// 	let i = 0;
	// 	for (const episode of episodes) {
	// 		i++;
	// 		console.log('Fetching infos for', episode.ID, episode.number, episodes.length, '/', i);

	// 		const outputEpisode = { ...episode } as any;
	// 		const response = await axios.get(`https://${hostname}/ajax/v2/episode/servers?episodeId=${episode.ID}`, {
	// 			headers,
	// 		});
	// 		const { document } = new jsdom.JSDOM(response.data.html).window;
	// 		const streamingServers: any[] = [...document.querySelectorAll('div.server-item')].map((server: HTMLAnchorElement) => {
	// 			return {
	// 				type: server.dataset.type as 'sub' | 'dub',
	// 				ID: server.dataset.id,
	// 				serverIndex: server.dataset.serverId,
	// 				name: server.querySelector('a').text,
	// 			};
	// 		});

	// 		outputEpisode.langs = [...new Set(streamingServers.map((x) => x.type))];
	// 		outputEpisode.streamingServers = streamingServers;
	// 		extendedEpisodes.push(outputEpisode);
	// 	}

	// 	return {
	// 		total,
	// 		episodes: extendedEpisodes,
	// 	};
	// }
}

export default Anix;
