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

class Anix {
	url: string;
	ID: string;
	constructor(slug: string) {
		// https://anix.to/anime/
		this.url = `https://${hostname}/anime/${slug}`;
	}

	async parseInformations(): Promise<void | any> {
		debug && console.log('Called Zoro.parseInformations');

		try {
			const response = await axios.get(this.url, {
				headers,
			});
			const { document } = new jsdom.JSDOM(response.data).window;

			const ID = document.querySelector('.container[itemprop="mainEntity"]').getAttribute('data-id');

			this.ID = ID;

			const title = document.querySelector('h1.ani-name').textContent.trim();

			const imageSrc = document.querySelector<HTMLImageElement>('.poster img[itemprop="image"]')?.src;

			const subDubContainer = document.querySelector('.sub-dub-total');

			const subCount = subDubContainer.querySelector('span.sub').textContent.trim();
			const dubCount = subDubContainer.querySelector('span.dub').textContent.trim();
			const episodeCount = subDubContainer.querySelector('span.total').textContent.trim();

			const seasonBody = document.querySelector('.ani-season-body');

			console.log(seasonBody.innerHTML);

			const seasonInfo = [...seasonBody.querySelectorAll('a.swiper-slide')].map((anchor: HTMLAnchorElement) => {
				console.log(anchor, anchor.href, anchor.querySelector('span').innerHTML);

				return {
					slug: anchor.href.replace(/.*\/anime\//gi, ''),
					IDX: anchor.querySelector('span').textContent.trim().replaceAll('Season ', ''),
					title: anchor.querySelector('span').textContent.trim().replaceAll('Season ', ''),
				} as SeasonInformation;
			});

			console.log(seasonInfo);

			// const seasons: any[][] = [];

			// if (seasonInfo.length === 0) {
			// 	console.log('Seems like the Season div does not yet exists');
			// 	const interEps = await this.getEpisodeList();
			// 	if (subCount == dubCount && subCount === episodeCount) {
			// 		seasons.push(
			// 			interEps.episodes.map((x) => {
			// 				return {
			// 					...x,
			// 					langs: ['sub', 'dub'],
			// 				} as any;
			// 			})
			// 		);
			// 	} else {
			// 		seasons.push((await this.getExtendedEpisodeList(interEps)).episodes);
			// 	}
			// }

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

	// async getEpisodeList(): Promise<{ total: number; episodes: any[] }> {
	// 	debug && console.log('Called Zoro.getEpisodeList');
	// 	const response = await axios.get(`https://${hostname}/ajax/v2/episode/list/${this.ID}`, {
	// 		headers,
	// 	});
	// 	const total = response.data.totalItems;
	// 	const { document } = new jsdom.JSDOM(response.data.html).window;

	// 	const episodes = [...document.querySelectorAll('a.ep-item')].map((anchor: HTMLAnchorElement) => {
	// 		return {
	// 			ID: anchor.dataset.id,
	// 			title: anchor.title,
	// 			number: anchor.dataset.number,
	// 			url: `https://${hostname}${anchor.href}`,
	// 		};
	// 	});
	// 	return {
	// 		total,
	// 		episodes,
	// 	};
	// }

	// async getExtendedEpisodeList(preData?: { total: number; episodes: any[] }): Promise<{ total: number; episodes: any[] }> {
	// 	debug && console.log('Called Zoro.getExtendedEpisodeList');

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
