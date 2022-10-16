import store from "./index"

const getDefaultState = () => {
    return {
        currentSeries: { ID: -1 },
        currentMovie: -1,
        currentSeason: -1,
        currentEpisode: -1,
        currentLanguage: '',
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
        setCurrentLanguage(state, language) {
            state.currentLanguage = language;
        },
        setWatchList(state, watchList) {
            state.watchList = watchList;
        }
    },
    getters: {
        videoSrc(state, o) {
            if (state.currentSeries == undefined) return '';
            const url = new URL(store.$networking.API_URL + '/video');
            url.searchParams.append('auth-token', store.$networking.auth_token)
            url.searchParams.append('series', state.currentSeries.ID)
            url.searchParams.append('language', state.currentLanguage)

            let out = `${store.$networking.API_URL}/video?auth-token=${store.$networking.auth_token}&series=${state.currentSeries.ID}&language=${state.currentLanguage}`;
            if (state.currentSeason == -1) {
                if (state.currentMovie == -1) return '';
                out += `&movie=${state.currentMovie + 1}`;

                url.searchParams.append('movie', state.currentMovie + 1)
            } else {
                out += `&season=${o.entityObject.season}&episode=${o.entityObject.episode}`;
                url.searchParams.append('season', o.entityObject.season)
                url.searchParams.append('episode', o.entityObject.episode)
                // out += `&season=${state.currentSeason}&episode=${state.currentEpisode}`;
            }
            console.log(url.href);
            return url.href;
            return out;
        },
        entityObject(state) {
            try {
                if (state.currentMovie != -1) {
                    return state.currentSeries?.movies?.[state.currentMovie - 1];
                } else if (state.currentSeason != -1 && state.currentEpisode != -1) {
                    // Long (Especially when there are 50 seasons with 100 episodes each)
                    // const entity = serie.seasons.flat().find(x => x.season == season && x.episode == episode);

                    let entity;
                    let seasonIndex = -1;
                    entity = state.currentSeries.seasons[state.currentSeason - 1][0];
                    if (entity && entity.season == state.currentSeason) {
                        seasonIndex = state.currentSeason - 1;
                    } else {
                        seasonIndex = state.currentSeries.seasons.findIndex(
                            (x) => x[0].season == state.currentSeason
                        );
                    }

                    entity = state.currentSeries.seasons[seasonIndex].find(
                        (x) => x.episode == state.currentEpisode
                    );

                    return entity;
                }
            } catch (error) {
                console.error(error);
            }

            return null;
        },
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