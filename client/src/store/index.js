import { createStore } from 'vuex'

import watch from '@/store/watch.store';
import auth from '@/store/auth.store';

const getDefaultState = () => {
  return {
    series: []
  }
}


export default createStore({
  state: getDefaultState(),
  getters: {
  },
  mutations: {
    reset(state) {
      Object.assign(state, getDefaultState());
    },
    setSeries(state, series) {
      state.series = series;
    },
  },
  actions: {
    reset({ commit }) {
      commit('watch/reset')
      commit('auth/reset')
      commit('reset')
    },
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
