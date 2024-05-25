import axios from 'axios';
import jsdom from 'jsdom';

/**
 *
 * # Reverse Enginneered:
 * ## To Get all Episodes of the anime ID
 * https://hianime.to/ajax/v2/episode/list/17978
 *
 * ## To Get Episode Informations (Sub / Dub)
 * https://hianime.to/ajax/v2/episode/servers?episodeId=92390
 *
 * ## To Get the stream embed iframe
 * https://hianime.to/ajax/v2/episode/sources?id=serverid
 *
 * ## To Get a Character List
 * https://hianime.to/ajax/character/list/17978
 *
 */

export interface SimpleZoroEpisode {
	ID: string;
	title: string;
	number: string;
	url: string;
}

export interface ExtendedZoroEpisode extends SimpleZoroEpisode {
	langs: string[];
	streamingServers: StreamingServers[];
}

export interface StreamingServers {
	type: 'sub' | 'dub';
	ID: string;
	serverIndex: string;
	name: string;
}

export interface SeasonInformation {
	ID: string;
	IDX: string;
	title: string;
}

const debug = true;

const hostname = 'hianime.to';

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

interface ZoroSeriesInformation {
	title: string;
	image: string;
	subCount: number;
	dubCount: number;
	episodeCount: number;
	seasons: ExtendedZoroEpisode[][];
}

class Zoro {
	url: string;
	ID: string | number;
	initialized: boolean;
	constructor(url: string) {
		this.initialized = false;
		if (url.includes('/')) {
			this.url = url;
			this.ID = this.url?.split('/')?.pop()?.split('-').pop();
			this.initialized = true;
		} else {
			this.ID = url;
			// this.initialize();
		}
	}

	async initialize() {
		debug && console.log('Called Zoro.initialize');

		const list = await this.getEpisodeList();

		this.url = list.episodes[0].url.replace('/watch', '').split('?')[0];
		this.initialized = true;
		console.log('Parsed: ');
		console.log(' ' + this.url);
		await new Promise((res, _) => setTimeout(res, 100));
	}

	async parseInformations(): Promise<void | ZoroSeriesInformation> {
		debug && console.log('Called Zoro.parseInformations');
		if (!this.initialized) {
			await this.initialize();
		}

		try {
			const response = await axios.get(this.url, {
				headers,
			});
			const { document } = new jsdom.JSDOM(response.data).window;

			const title = document.querySelector('.film-name.dynamic-name').textContent.trim();

			const imageSrc = document.querySelector<HTMLImageElement>('img.film-poster-img')?.src;

			const tickContainer = document.querySelector('.tick');

			const subCount = tickContainer.querySelector('.tick-item.tick-sub').textContent.trim();
			const dubCount = tickContainer.querySelector('.tick-item.tick-dub').textContent.trim();
			const episodeCount = tickContainer.querySelector('.tick-item.tick-eps').textContent.trim();

			const seasonInfo = [...document.querySelectorAll('.os-item')]
				.map((anchor: HTMLAnchorElement) => {
					return {
						ID: anchor.href.split('-')[anchor.href.split('-').length - 1] as string,
						IDX: anchor.querySelector('.title').textContent.trim().replaceAll('Season ', ''),
						title: anchor.querySelector('.title').textContent.trim() as string,
					} as SeasonInformation;
				})
				.filter((x) => !x.title.includes('(') && x.title.includes('Season'));

			const seasons: ExtendedZoroEpisode[][] = [];

			if (seasonInfo.length === 0) {
				console.log('Seems like the Season div does not yet exists');
				const interEps = await this.getEpisodeList();
				if (subCount == dubCount && subCount === episodeCount) {
					seasons.push(
						interEps.episodes.map((x) => {
							return {
								...x,
								langs: ['sub', 'dub'],
							} as ExtendedZoroEpisode;
						})
					);
				} else {
					seasons.push((await this.getExtendedEpisodeList(interEps)).episodes);
				}
			}

			console.log(subCount, dubCount, episodeCount);

			return {
				title,
				image: imageSrc,
				subCount: parseInt(subCount),
				dubCount: parseInt(dubCount),
				episodeCount: parseInt(episodeCount),
				seasons,
			};
		} catch (error) {
			debug && console.log(error);

			console.log('Seems like the Season div does not yet exists');

			return null;
		}
	}

	async getSeasons(): Promise<SeasonInformation[]> {
		debug && console.log('Called Zoro.getSeasons');
		if (!this.initialized) {
			await this.initialize();
		}
		try {
			const response = await axios.get(this.url, {
				headers,
			});
			const { document } = new jsdom.JSDOM(response.data).window;

			const infos = [...document.querySelectorAll('.os-item')]
				.map((anchor: HTMLAnchorElement) => {
					return {
						ID: anchor.href.split('-')[anchor.href.split('-').length - 1] as string,
						IDX: anchor.querySelector('.title').textContent.trim().replaceAll('Season ', ''),
						title: anchor.querySelector('.title').textContent.trim() as string,
					};
				})
				.filter((x) => !x.title.includes('(') && x.title.includes('Season'));
			return infos;
		} catch (error) {
			debug && console.log(error);

			console.log('Seems like the Season div does not yet exists');

			return [];
		}
	}

	async getEpisodeList(): Promise<{ total: number; episodes: SimpleZoroEpisode[] }> {
		debug && console.log('Called Zoro.getEpisodeList');
		const response = await axios.get(`https://${hostname}/ajax/v2/episode/list/${this.ID}`, {
			headers,
		});
		const total = response.data.totalItems;
		const { document } = new jsdom.JSDOM(response.data.html).window;

		const episodes = [...document.querySelectorAll('a.ep-item')].map((anchor: HTMLAnchorElement) => {
			return {
				ID: anchor.dataset.id,
				title: anchor.title,
				number: anchor.dataset.number,
				url: `https://${hostname}${anchor.href}`,
			};
		});
		return {
			total,
			episodes,
		};
	}

	async getExtendedEpisodeList(preData?: {
		total: number;
		episodes: SimpleZoroEpisode[];
	}): Promise<{ total: number; episodes: ExtendedZoroEpisode[] }> {
		debug && console.log('Called Zoro.getExtendedEpisodeList');

		if (!this.initialized) {
			await this.initialize();
		}
		let total = 0;
		let episodes: SimpleZoroEpisode[] = [];
		if (!preData) {
			const res = await this.getEpisodeList();
			total = res.total;
			episodes = res.episodes;
		} else {
			total = preData.total;
			episodes = preData.episodes;
		}

		const extendedEpisodes: ExtendedZoroEpisode[] = [];

		let i = 0;
		for (const episode of episodes) {
			i++;
			console.log('Fetching infos for', episode.ID, episode.number, episodes.length, '/', i);

			const outputEpisode = { ...episode } as ExtendedZoroEpisode;
			const response = await axios.get(`https://${hostname}/ajax/v2/episode/servers?episodeId=${episode.ID}`, {
				headers,
			});
			const { document } = new jsdom.JSDOM(response.data.html).window;
			const streamingServers: StreamingServers[] = [...document.querySelectorAll('div.server-item')].map((server: HTMLAnchorElement) => {
				return {
					type: server.dataset.type as 'sub' | 'dub',
					ID: server.dataset.id,
					serverIndex: server.dataset.serverId,
					name: server.querySelector('a').text,
				};
			});

			outputEpisode.langs = [...new Set(streamingServers.map((x) => x.type))];
			outputEpisode.streamingServers = streamingServers;
			extendedEpisodes.push(outputEpisode);
		}

		return {
			total,
			episodes: extendedEpisodes,
		};
	}

	async getStream(streamID: string): Promise<string> {
		const response = await axios.get(`https://${hostname}/ajax/v2/episode/sources?id=${streamID}`);
		return response.data.link;
	}
}

export default Zoro;
