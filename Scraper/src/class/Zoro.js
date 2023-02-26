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
 * ## To Get a Character List
 * https://zoro.to/ajax/character/list/17978
 *
 */

class Zoro {
	constructor(url) {
		this.url = url;
		this.ID = this.url.split('/').pop().split('-').pop();
	}

	async getEpisodeList() {
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

	async getEpisodeListWithLang() {
		const { total, episodes } = await this.getEpisodeList();

		const episode = episodes[0];

		for (const episode of episodes) {
			const response = await axios.get('https://zoro.to/ajax/v2/episode/servers?episodeId=' + episode.ID);
			// console.log(response);
			const { document } = new jsdom.JSDOM(response.data.html).window;
			const streamingServers = [...document.querySelectorAll('div.server-item')].map((server) => {
				return {
					type: server.dataset.type,
					ID: server.dataset.id,
					serverId: server.dataset.serverId,
					name: server.querySelector('a').text,
				};
			});

			episode.langs = [...new Set(streamingServers.map((x) => x.type))];
		}

		return {
			total,
			episodes,
		};
	}
}

module.exports = Zoro;
