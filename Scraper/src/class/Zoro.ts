const axios = require('axios');
const jsdom = require('jsdom');

/**
 *
 * # Reverse Enginneered:
 * ## To Get all Episodes of the anime ID
 * https://zoro.to/ajax/v2/episode/list/17978
 *
 * ## To Get Episode Informations (Sub / Dub)
 * https://zoro.to/ajax/v2/episode/servers?episodeId=92390
 *
 * ## To Get the stream embed iframe
 * https://zoro.to/ajax/v2/episode/sources?id=serverid
 *
 * ## To Get a Character List
 * https://zoro.to/ajax/character/list/17978
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

class Zoro {
	url: string;
	ID: any;
	initialized: boolean;
	constructor(url: string) {
		this.initialized = false;
		if (url.includes('/')) {
			this.url = url;
			this.ID = this.url?.split('/')?.pop()?.split('-').pop();
		} else {
			this.ID = url;
			// this.initialize();
		}
	}

	async initialize() {
		const list = await this.getEpisodeList();

		this.url = list.episodes[0].url;
		console.log('Parsed: ');
		console.log(' ' + this.url);
		this.initialized = true;
	}

	async getSeasons(): Promise<SeasonInformation[]> {
		try {
			if (!this.initialized) {
				await this.initialize();
			}
			const response = await axios.get(this.url);
			const { document } = new jsdom.JSDOM(response.data).window;

			const infos = [...document.querySelectorAll('.os-item')]
				.map((anchor) => {
					return {
						ID: anchor.href.split('-')[anchor.href.split('-').length - 1] as string,
						IDX: anchor.querySelector('.title').textContent.trim().replaceAll('Season ', ''),
						title: anchor.querySelector('.title').textContent.trim() as string,
					};
				})
				.filter((x) => !x.title.includes('(') && x.title.includes('Season'));
			return infos;
		} catch (error) {
			console.log('Seems like the Season div does not yet exists');

			return [];
		}
	}

	async getEpisodeList(): Promise<{ total: number; episodes: SimpleZoroEpisode[] }> {
		const response = await axios.get('https://zoro.to/ajax/v2/episode/list/' + this.ID);
		const total = response.data.totalItems;
		const { document } = new jsdom.JSDOM(response.data.html).window;

		const episodes = [...document.querySelectorAll('a.ep-item')].map((anchor) => {
			return {
				ID: anchor.dataset.id,
				title: anchor.title,
				number: anchor.dataset.number,
				url: 'https://zoro.to' + anchor.href,
			};
		});
		return {
			total,
			episodes,
		};
	}

	async getExtendedEpisodeList(): Promise<{ total: number; episodes: ExtendedZoroEpisode[] }> {
		if (!this.initialized) {
			await this.initialize();
		}
		const { total, episodes } = await this.getEpisodeList();

		const extendedEpisodes: ExtendedZoroEpisode[] = [];

		for (const episode of episodes) {
			const outputEpisode = { ...episode } as ExtendedZoroEpisode;
			const response = await axios.get('https://zoro.to/ajax/v2/episode/servers?episodeId=' + episode.ID);
			const { document } = new jsdom.JSDOM(response.data.html).window;
			const streamingServers: StreamingServers[] = [...document.querySelectorAll('div.server-item')].map((server) => {
				return {
					type: server.dataset.type,
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
		const response = await axios.get('https://zoro.to/ajax/v2/episode/sources?id=' + streamID);
		return response.data.link;
	}
}

export default Zoro;
