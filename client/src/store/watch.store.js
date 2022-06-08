export default {
    state: {
        currentSeries: { ID: -1 },
        currentMovie: -1,
        currentSeason: 1,
        currentEpisode: 1,
    },
    mutations: {
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
        async loadSeriesInfo({ commit, state, rootState }, ID) {
            // console.log(rootState.series);
            // const response = await fetch('http://localhost:3100/index');
            // const json = await response.json();
            const series = rootState.series.find((x) => x.ID == ID);
            commit('setCurrentSeries', series);
        },
    },
    namespaced: true,
}