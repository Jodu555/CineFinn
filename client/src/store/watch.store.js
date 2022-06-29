const getDefaultState = () => {
    return {
        currentSeries: { ID: -1 },
        currentMovie: -1,
        currentSeason: -1,
        currentEpisode: -1,
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
        }
    },
    actions: {
        async loadSeriesInfo({ commit, rootState }, ID) {
            const series = rootState.series.find((x) => x.ID == ID);
            commit('setCurrentSeries', series);
        },
    },
    namespaced: true,
}