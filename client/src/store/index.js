import { createStore } from 'vuex'

import watch from '@/store/watch.store';
import auth from '@/store/auth.store';

export default createStore({
  state: {
    series: []
  },
  getters: {
  },
  mutations: {
    setSeries(state, series) {
      state.series = series;
    },
  },
  actions: {
    async loadSeries({ commit }) {
      const response = await this.$networking.get('/index');
      if (response.success) {
        const json = response.json;
        commit('setSeries', json);
      }
    },
  },
  modules: {
    watch,
    auth
  }
})
