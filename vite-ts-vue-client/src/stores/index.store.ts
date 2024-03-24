import type { Serie } from '@/types/index';
import { useAxios } from '@/utils';
import { defineStore } from 'pinia';

export const useIndexStore = defineStore('index', {
	state: () => {
		return {
			series: [] as Serie[],
			loading: false as boolean,
		};
	},
	actions: {
		async loadSeries() {
			this.loading = true;
			const response = await useAxios().get('/index');
			if (response.status === 200) {
				const json = response.data;
				this.series = json;
				this.loading = false;
			} else {
				console.log('Error', response);
			}
		},
		async reloadSeries(series: Serie[]) {
			this.series = series;
			// if (rootState.watch.currentSeries.ID != -1) {
			//     // dispatch('watch/loadSeriesInfo', series.find((x) => x.ID == rootState.watch.currentSeries.ID).ID);
			//     dispatch('watch/loadSeriesInfo', rootState.watch.currentSeries.ID);
			// }
		},
	},
});
