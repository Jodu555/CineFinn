import { createLogger, createStore } from 'vuex';

import sync from '@/store/sync.store';
import watch from '@/store/watch.store';
import auth from '@/store/auth.store';

const getDefaultState = () => {
	return {
		series: [],
		loading: false,
	};
};

const logger = createLogger({
	collapsed: true, // auto-expand logged mutations
	logActions: true, // Log Actions
	logMutations: true, // Log mutations
	logger: {
		log: (...args) => {
			let arr = [...args];

			console.log('Before', arr);

			arr = arr.filter((l) => {
				console.log(l, typeof l);
				if (typeof l !== 'string') {
					console.log('Came');
					return true;
				}

				const keep = l.includes('%c') && l.includes('font-weight:') && l.includes('--');
				console.log('Came 2', keep);
				return keep;
			});
			console.log('After', arr);

			if (arr.length > 0) console.log('log', JSON.stringify(arr));
		},
		info: (...args) => {
			console.log('info', JSON.stringify([...args]));
		},
		debug: (...args) => {
			console.log('debug', JSON.stringify([...args]));
		},
		trace: (...args) => {
			console.log('trace', JSON.stringify([...args]));
		},
	}, // implementation of the `console` API, default `console`
});

export default createStore({
	state: getDefaultState(),
	getters: {},
	mutations: {
		reset(state) {
			Object.assign(state, getDefaultState());
		},
		setSeries(state, series) {
			state.series = series;
		},
		setLoading(state, loading) {
			state.loading = loading;
		},
	},
	actions: {
		reset({ commit }) {
			commit('watch/reset');
			commit('auth/reset');
			commit('reset');
		},
		async loadSeries({ commit }) {
			commit('setLoading', true);
			const response = await this.$networking.get('/index');
			if (response.success) {
				const json = response.json;
				// console.log(json);
				commit('setLoading', false);
				commit('setSeries', json);
			}
		},
		async reloadSeries({ commit, dispatch, rootState }, series) {
			commit('setSeries', series);
			if (rootState.watch.currentSeries.ID != -1) {
				// dispatch('watch/loadSeriesInfo', series.find((x) => x.ID == rootState.watch.currentSeries.ID).ID);
				dispatch('watch/loadSeriesInfo', rootState.watch.currentSeries.ID);
			}
		},
	},
	modules: {
		watch,
		auth,
		sync,
	},
	// plugins: [logger]
});
