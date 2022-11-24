const Aniworld = require('./class/AniWorld');

const anime = new Aniworld('https://aniworld.to/anime/stream/more-than-a-married-couple-but-not-lovers/');

(async () => {
	const informations = await anime.parseInformations();
	console.log(`informations`, informations);
})();
