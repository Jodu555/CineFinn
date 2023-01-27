import store from './index';
import router from '@/router/index';

const getDefaultState = () => {
	return {
		loading: false,
		roomList: [],
		currentRoomID: -1,
		isOwner: false,
		currentSeries: { ID: -1 },
		videoSrc: '',
	};
};

export default {
	state: getDefaultState(),
	mutations: {
		reset(state) {
			Object.assign(state, getDefaultState());
		},
		setCurrentRoomID(state, roomID) {
			state.currentRoomID = roomID;
		},
		setIsOwner(state, isowner) {
			state.isOwner = isowner;
		},
		setCurrentSeries(state, series) {
			state.currentSeries = series;
		},
		setRoomList(state, roomList) {
			state.roomList = roomList;
		},
		setLoading(state, loading) {
			state.loading = loading;
		},
	},
	actions: {
		async createRoom({ commit, dispatch, rootState }) {
			//TODO: call the socket and let them give back an room id
			const ID = Math.round(Math.random() * 10000);
			commit('setCurrentRoomID', ID);
			dispatch('loadRoomInfo');
			await router.push('/sync/' + ID);
		},
		async joinRoom({ commit, dispatch, rootState }, ID) {
			//TODO: make here the socket call to join
			commit('setCurrentRoomID', ID);
			dispatch('loadRoomInfo');
		},
		async loadRoomInfo({ commit, state, dispatch, rootState }) {
			commit('setLoading', true);

			//Load the Series Details
			const response = await this.$networking.get('/room/' + state.currentRoomID);
			if (response.success) {
				const json = response.json;
			}

			commit('setCurrentRoom', series);
			commit('setLoading', false);
		},
		async loadWatchList({ commit, dispatch, rootState }, ID) {
			const response = await this.$networking.get(`/watch/info?series=${ID}`);
			if (response.success) commit('setWatchList', response.json);
		},
	},
	namespaced: true,
};
