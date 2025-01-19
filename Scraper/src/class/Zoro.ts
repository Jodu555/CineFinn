import { ZoroSeriesInformation, ExtendedZoroEpisode, SimpleZoroEpisode, StreamingServers, ZoroSeasonInformation } from '@Types/scrapers';
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

class Zoro {
	url: string;
	ID: string | number;
	initialized: boolean;
	cache: Map<string, any>;
	constructor(url: string) {
		this.initialized = false;
		this.cache = new Map();
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

			const subCount = parseInt(tickContainer.querySelector('.tick-item.tick-sub')?.textContent.trim());
			let dubCount = parseInt(tickContainer.querySelector('.tick-item.tick-dub')?.textContent.trim());
			const episodeCount = parseInt(tickContainer.querySelector('.tick-item.tick-eps')?.textContent.trim());
			if (isNaN(dubCount)) {
				dubCount = 0;
			}
			console.log('Information:', {
				subCount,
				dubCount,
				episodeCount,
			});

			const seasonInfo = [...document.querySelectorAll('.os-item')]
				.map((anchor: HTMLAnchorElement) => {
					return {
						ID: anchor.href.split('-')[anchor.href.split('-').length - 1] as string,
						IDX: anchor.querySelector('.title').textContent.trim().replaceAll('Season ', ''),
						title: anchor.querySelector('.title').textContent.trim() as string,
					} as ZoroSeasonInformation;
				})
				.filter((x) => !x.title.includes('(') && x.title.includes('Season'));

			const seasons: ExtendedZoroEpisode[][] = [];

			if (seasonInfo.length == 0) {
				console.log('Seems like the Season div does not yet exists, assuming the provided ID is the first season');
				seasonInfo.push({
					ID: this.ID.toString(),
					IDX: '1',
					title: 'Season 1',
				});
			}

			for (const si of seasonInfo) {
				console.log('Parsing: ' + si.title);
				let inst = si.ID == this.ID ? this : new Zoro(si.ID);
				const interEps = await inst.getEpisodeList();
				if ((subCount == dubCount && subCount === episodeCount)) {
					seasons.push(
						interEps.episodes.map((x) => {
							return {
								...x,
								langs: ['sub', 'dub'],
							} as ExtendedZoroEpisode;
						})
					);
				} else if (dubCount === 0 && subCount === episodeCount) {
					seasons.push(
						interEps.episodes.map((x) => {
							return {
								...x,
								langs: ['sub'],
							} as ExtendedZoroEpisode;
						})
					);
				} else {
					seasons.push((await inst.getExtendedEpisodeList(interEps)).episodes);
				}
			}

			return {
				title,
				image: imageSrc,
				subCount: subCount,
				dubCount: dubCount,
				episodeCount: episodeCount,
				seasons,
			};
		} catch (error) {
			debug && console.log(error);

			console.log('Seems like the Season div does not yet exists');

			return null;
		}
	}

	async getSeasons(): Promise<ZoroSeasonInformation[]> {
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

	async getEpisodeList(): Promise<{ total: number; episodes: SimpleZoroEpisode[]; }> {
		debug && console.log('Called Zoro.getEpisodeList');

		if (this.cache.get('getEpisodeList')) {
			debug && console.log('Cache Hit');
			return this.cache.get('getEpisodeList');
		}
		debug && console.log('Cache Miss');

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

		const returnObj = {
			total,
			episodes,
		};

		this.cache.set('getEpisodeList', returnObj);

		return returnObj;
	}

	async getExtendedEpisodeList(preData?: {
		total: number;
		episodes: SimpleZoroEpisode[];
	}): Promise<{ total: number; episodes: ExtendedZoroEpisode[]; }> {
		debug && console.log('Called Zoro.getExtendedEpisodeList');

		if (!this.initialized) {
			await this.initialize();
		}

		if (this.cache.get('getExtendedEpisodeList')) {
			debug && console.log('Cache Hit');
			return this.cache.get('getExtendedEpisodeList');
		}
		debug && console.log('Cache Miss');

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

		const returnObj = {
			total,
			episodes: extendedEpisodes,
		};

		this.cache.set('getExtendedEpisodeList', returnObj);

		return returnObj;
	}

	async getStream(streamID: string): Promise<string> {
		const response = await axios.get(`https://${hostname}/ajax/v2/episode/sources?id=${streamID}`);
		return response.data.link;
	}
}

export default Zoro;
