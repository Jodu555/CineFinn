const getDefaultState = () => {
    return {
        currentSeries: { ID: -1 },
        currentMovie: -1,
        currentSeason: -1,
        currentEpisode: -1,
        watchList: [],
    }
}

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
        setWatchList(state, watchList) {
            state.watchList = watchList;
        }
    },
    actions: {
        async loadSeriesInfo({ commit, dispatch, rootState }, ID) {
            if (rootState.series.length == 0) {
                //Series array is empty cause the user got direct to the /watch route
                await dispatch('loadSeries', null, { root: true });
            }
            const series = rootState.series.find((x) => x.ID == ID);
            commit('setCurrentSeries', series);
        },

        async loadWatchList({ commit, dispatch, rootState }, ID) {
            const response = await this.$networking.get(`/watch/info?series=${ID}`);
            if (response.success) commit('setWatchList', response.json);

        }
    },
    namespaced: true,
}