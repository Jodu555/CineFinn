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
      const response = await fetch('http://192.168.2.112:3100/index');
      const json = await response.json();
      commit('setSeries', json);
    },
  },
  modules: {
    watch,
    auth
  }
})
