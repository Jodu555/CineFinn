import { createStore } from 'vuex'

import watch from '@/store/watch.store';

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
      const response = await fetch('http://localhost:3100/index');
      const json = await response.json();
      commit('setSeries', json);
    },
  },
  modules: {
    watch
  }
})
