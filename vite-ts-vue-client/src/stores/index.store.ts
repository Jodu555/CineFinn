import { useWatchStore } from './watch.store';
import { useAxios } from '@/utils';
import type { Serie } from '@Types/classes';
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
			const prev = this.series;
			this.series = series;
			const watchStore = useWatchStore();
			if (watchStore.currentSeries.ID != '-1') {
				// const oldCurrSerie = JSON.stringify(prev.find((x) => x.ID == watchStore.currentSeries.ID));
				// const newCurrSerie = JSON.stringify(this.series.find((x) => x.ID == watchStore.currentSeries.ID));
				// if (oldCurrSerie !== newCurrSerie) {
				// 	await watchStore.loadSeriesInfo(watchStore.currentSeries.ID);
				// }
				await watchStore.loadSeriesInfo(watchStore.currentSeries.ID);
			}
		},
	},
});
