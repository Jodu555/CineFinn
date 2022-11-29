const axios = require('axios');
const cheerio = require('cheerio');
const jsdom = require('jsdom');
class Aniworld {
	constructor(url) {
		this.url = url;
		this.imageSRCPrefix = 'https://aniworld.to';
	}

	async parseInformations() {
		const response = await axios.get(this.url, {
			headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36' },
		});

		const additional = this.parseAdditionalInformations(response.data);

		const { numberOfSeasons, hasMovies } = this.parseEntityInformations(response.data);

		const output = { url: this.url, informations: additional, hasMovies, seasons: new Array(numberOfSeasons) };

		console.log('Parsed: ');
		console.log(' ' + this.url);
		console.log(`   => Seasons: ${numberOfSeasons} - Movies: ${hasMovies}`);

		if (hasMovies) {
			const movResponse = await axios.get(`${this.url}/filme`);
			output.movies = this.getListInformations(movResponse.data);
			console.log(`    => Got ${output.movies.length} Movies`);
		}

		output.seasons[0] = this.getListInformations(response.data);
		console.log(`    => Got Season ${0} with ${output.seasons[0].length} Episodes`);
		for (let i = 1; i < numberOfSeasons; i++) {
			const seaResponse = await axios.get(`${this.url}/staffel-${i + 1}`);
			output.seasons[i] = this.getListInformations(seaResponse.data);
			console.log(`    => Got Season ${i} with ${output.seasons[i].length} Episodes`);
		}
		return output;
	}

	parseEntityInformations(data) {
		const { document } = new jsdom.JSDOM(data).window;
		const seasonsUl = [...document.querySelectorAll('span')].find((e) => e.textContent.includes('Staffeln:')).parentElement.parentElement;
		const seasonsTab = [...seasonsUl.querySelectorAll('li')].map((e) => e.querySelector('a')?.title).filter((e) => e != undefined);

		const numberOfSeasons = seasonsTab.filter((e) => e.includes('Staffel')).length;
		const hasMovies = seasonsTab.find((e) => e.includes('Film')) != null;

		return {
			numberOfSeasons,
			hasMovies,
		};
	}

	parseAdditionalInformations(data) {
		const $ = cheerio.load(data);
		const infos = $('h1[itemprop="name"] > span').text();
		const description = $('p.seri_des').text();

		const startDate = $('span[itemprop="startDate"]').text();
		const endDate = $('span[itemprop="endDate"]').text();

		const image = $('img[itemprop="image"]');
		const imageSRC = image.attr('data-src');

		if (infos == '') {
			console.log('Not Found!!!!!!', url, this.imageSRCPrefix);
		}

		return { infos, startDate, endDate, description, image: `${this.imageSRCPrefix}${imageSRC}` };
	}

	getListInformations(data) {
		const { document } = new jsdom.JSDOM(data).window;
		const episodes = [...document.querySelectorAll('tr[itemprop="episode"]')];
		const out = [];
		episodes.forEach((ep) => {
			let langs = [];
			[...ep.querySelectorAll('.editFunctions img')].forEach((lang) => {
				langs.push(lang.src);
			});

			langs = langs.map((l) => {
				switch (l) {
					case '/public/img/german.svg':
						return 'GerDub';
					case '/public/img/japanese-german.svg':
						return 'GerSub';
					case '/public/img/japanese-english.svg':
						return 'EngSub';
					default:
						break;
				}
			});

			const mainName = ep.querySelector('.seasonEpisodeTitle strong').textContent;
			const secondName = ep.querySelector('.seasonEpisodeTitle span').textContent;

			out.push({ mainName, secondName, langs });
		});
		return out;
	}
}

module.exports = Aniworld;
