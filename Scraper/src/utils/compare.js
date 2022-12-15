const Aniworld = require('../class/AniWorld');

/**
 * @param  {Object} series the current series[] object
 */
async function compareForNewReleases(series) {
	const data = series.filter((x) => x.references?.aniworld);
	const compare = await Promise.all(
		data.map(async (serie) => {
			return new Promise(async (res, _) => {
				const world = new Aniworld(serie.references.aniworld);
				const out = await world.parseInformations();
				res({
					ID: serie.ID,
					title: serie.title,
					references: serie.references,
					...out,
				});
			});
		})
	);
	for (const aniworldSeries of compare) {
		const currentSeries = series.find((e) => e.ID == aniworldSeries.ID);

		//Check if there are the same number of seasons
		const numberSeasons = aniworldSeries.seasons.length == currentSeries.seasons.length;

		//TODO: Combine the diff and lnaguage check into one loop to save some computation + make it look cleaner

		//Check if there are episode differences
		const diff = aniworldSeries.seasons.map((e, i) => ({
			value: currentSeries.seasons?.[i]?.length == e.length,
			diff: e.length - currentSeries.seasons?.[i]?.length,
		}));

		//Check if there are language losses
		const languages = aniworldSeries.seasons.map((s, i) => [
			...s.map((e, j) => {
				const episodeCurrent = currentSeries.seasons?.[i]?.[j];
				const currFilteredLangs = episodeCurrent?.langs.filter((e) => e === 'GerDub');
				const newFilteredLangs = e.langs.filter((e) => e === 'GerDub');
				return {
					info: { ID: aniworldSeries.ID, season: episodeCurrent?.season, episode: episodeCurrent?.episode },
					value: currFilteredLangs?.length == newFilteredLangs?.length,
				};
			}),
		]);

		const langThere = languages.map((s) => s.filter((x) => !x.value)).flat();

		if (numberSeasons == false || diff.some((v) => v.diff > 0 || isNaN(v.diff)) || langThere.length > 0) {
			console.log(currentSeries.title);
			console.log('  =>', numberSeasons, diff);
			if (langThere.length >= 0) {
				console.log('  langThere =>', langThere.length);
			}
		}
	}
}

module.exports = {
	compareForNewReleases,
};
