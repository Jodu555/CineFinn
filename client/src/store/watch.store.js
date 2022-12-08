import store from './index';

const getDefaultState = () => {
	return {
		currentSeries: { ID: -1 },
		currentMovie: -1,
		currentSeason: -1,
		currentEpisode: -1,
		currentLanguage: '',
		watchList: [],
	};
};

export default {
	state: getDefaultState(),
	mutations: {
		reset(state) {
			Object.assign(state, getDefaultState());
		},
		setCurrentSeries(state, series) {
			state.currentSeries = series;
		},
		setCurrentMovie(state, movie) {
			state.currentMovie = movie;
		},
		setCurrentSeason(state, season) {
			state.currentSeason = season;
		},
		setCurrentEpisode(state, episode) {
			state.currentEpisode = episode;
		},
		setCurrentLanguage(state, language) {
			state.currentLanguage = language;
		},
		setWatchList(state, watchList) {
			state.watchList = watchList;
		},
	},
	getters: {
		videoSrc(state, o) {
			if (state.currentSeries == undefined || !o.entityObject || o.entityObject == undefined || o.entityObject == null) return '';
			const url = new URL(store.$networking.API_URL + '/video');
			url.searchParams.append('auth-token', store.$networking.auth_token);
			url.searchParams.append('series', state.currentSeries.ID);
			url.searchParams.append('language', state.currentLanguage);
			if (state.currentSeason == -1) {
				if (state.currentMovie == -1) return '';
				url.searchParams.append('movie', state.currentMovie);
			} else {
				url.searchParams.append('season', o.entityObject.season);
				url.searchParams.append('episode', o.entityObject.episode);
			}
			return url.href;
		},
		entityObject(state) {
			try {
				if (state.currentMovie != -1) {
					return state.currentSeries?.movies?.[state.currentMovie - 1];
				} else if (state.currentSeason != -1 && state.currentEpisode != -1) {
					// Long (Especially when there are 50 seasons with 100 episodes each)

					// console.log(state.currentSeries);
					// console.log(state.currentSeason, state.currentEpisode);

					const entity = state.currentSeries.seasons.flat().find((x) => x.season == state.currentSeason && x.episode == state.currentEpisode);

					// console.log(entity);
					// let entity;
					// let seasonIndex = -1;
					// entity = state.currentSeries.seasons[state.currentSeason - 1][0];

					// if (entity && entity.season == state.currentSeason) {
					//     seasonIndex = state.currentSeason - 1;
					// } else {
					//     seasonIndex = state.currentSeries.seasons.findIndex(
					//         (x) => x[0].season == state.currentSeason
					//     );
					// }

					// entity = state.currentSeries.seasons[seasonIndex].find(
					//     (x) => x.episode == state.currentEpisode
					// );

					return entity;
				}
			} catch (error) {
				console.error('watch.store.js', error);
			}

			return null;
		},
	},
	actions: {
		async loadSeriesInfo({ commit, dispatch, rootState }, ID) {
			//Series array is empty cause the user got direct to the /watch route
			if (rootState.series.length == 0) {
				await dispatch('loadSeries', null, { root: true });
			}

			//Load the Series Details
			const response = await this.$networking.get('/index/' + ID);
			if (response.success) {
				const json = response.json;
				const data = rootState.series.map((s) => {
					if (s.ID === ID) {
						return json;
					} else {
						return s;
					}
				});
				commit('setSeries', data, { root: true });
			}

			//Update The Series
			const series = rootState.series.find((x) => x.ID == ID);
			commit('setCurrentSeries', series);
		},
		async loadWatchList({ commit, dispatch, rootState }, ID) {
			const response = await this.$networking.get(`/watch/info?series=${ID}`);
			if (response.success) commit('setWatchList', response.json);
		},
	},
	namespaced: true,
};
