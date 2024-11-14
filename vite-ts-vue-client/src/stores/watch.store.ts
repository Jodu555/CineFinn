import { useAxios, useBaseURL } from '@/utils';
import { defineStore } from 'pinia';
import { useIndexStore } from './index.store';
import { useAuthStore } from './auth.store';
import type { Langs, Segment, Serie, SerieEpisode, SerieMovie } from '@Types/classes';

export const useWatchStore = defineStore('watch', {
	state: () => {
		return {
			loading: false,
			currentSeries: { ID: '-1' } as Serie,
			currentMovie: -1,
			currentSeason: -1,
			currentEpisode: -1,
			currentLanguage: '' as Langs,
			watchList: [] as Segment[],
		};
	},
	getters: {
		videoSrc(state) {
			if (state.currentSeries == undefined || !this.entityObject || this.entityObject == undefined || this.entityObject == null) return '';
			const url = new URL(useBaseURL() + '/video');
			const axios = useAxios();
			if (typeof axios.defaults.headers.common['auth-token'] == 'string') {
				url.searchParams.append('auth-token', axios.defaults.headers.common['auth-token']);
			}
			url.searchParams.append('series', state.currentSeries.ID);

			if (this.entityObject.langs.includes(state.currentLanguage)) {
				url.searchParams.append('language', state.currentLanguage);
			} else {
				url.searchParams.append('language', this.entityObject.langs[0]);
			}
			// if (useAuthStore().settings.developerMode.value) {
			// 	url.searchParams.append('debug', 'true');
			// }
			if (state.currentSeason == -1) {
				if (state.currentMovie == -1) return '';
				url.searchParams.append('movie', state.currentMovie.toString());
			} else {
				url.searchParams.append('season', (this.entityObject as SerieEpisode).season.toString());
				url.searchParams.append('episode', (this.entityObject as SerieEpisode).episode.toString());
			}
			return url.href;
		},
		entityObject(state): SerieEpisode | SerieMovie | null {
			// console.log('entityObject eval ', JSON.stringify(state, null, 3));
			try {
				if (state.currentMovie != -1) {
					console.log('entityObject eval ', 1);
					return state.currentSeries?.movies?.[state.currentMovie - 1];
				} else if (state.currentSeason != -1 && state.currentEpisode != -1) {
					// Long (Especially when there are 50 seasons with 100 episodes each)

					// console.log(state.currentSeries);
					// console.log(state.currentSeason, state.currentEpisode);
					console.log('entityObject eval ', 2);

					const entity = state.currentSeries.seasons
						.flat()
						.find((x) => x.season == state.currentSeason && x.episode == state.currentEpisode) as SerieEpisode;
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
					console.log('entityObject eval ', 3);

					return entity;
				}
			} catch (error) {
				console.log('entityObject eval ', 4);
				console.error('watch.store.js', error);
			}
			console.log('entityObject eval ', 5);

			return null;
		},
	},
	actions: {
		async loadSeriesInfo(ID: string, showLoading = true) {
			if (showLoading) this.loading = true;
			//Series array is empty cause the user got direct to the /watch route
			const index = useIndexStore();
			if (index.series.length == 0) {
				await index.loadSeries();
			}

			//Load the Series Details
			const response = await useAxios().get(`/index/${ID}`);
			if (response.status === 200) {
				const data = index.series.map((s) => {
					if (s.ID === ID) {
						return response.data;
					} else {
						return s;
					}
				});
				index.series = data;
			}

			//Update The Series
			this.currentSeries = index.series.find((x) => x.ID == ID) as Serie;
			if (showLoading) this.loading = false;
		},
		async loadWatchList(ID: string) {
			const response = await useAxios().get(`/watch/info?series=${ID}`);
			if (response.status == 200) this.watchList = response.data;
		},
		async markSeason(marking: boolean) {
			console.log(this);
			await useAxios().get(`/watch/mark/${this.currentSeries.ID}/season/${this.currentSeason}/${marking}`);
		},
		async markMovie(marking: boolean) {
			console.log(this);
			await useAxios().get(`/watch/mark/${this.currentSeries.ID}/movie/${this.currentMovie}/${marking}`);
		},
	},
});
