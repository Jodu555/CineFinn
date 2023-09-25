import store from './index';
import router from '@/router/index';

const getDefaultState = () => {
	return {
		loading: false,
		roomList: [
			// {
			// 	//Let's say im in this room
			// 	ID: '58932',
			// 	created: Date.now(),
			// 	seriesID: '8dc12299',
			// 	entityInfos: {
			// 		season: 1,
			// 		episode: 1,
			// 		movie: 0,
			// 		lang: 'GerDub',
			// 	},
			// 	members: ['Jodu555', 'TRyFlow'],
			// 	// members: [
			// 	// 	{ name: 'Jodu555', UUID: '', role: 1 },
			// 	// 	{ name: 'TRyFlow', UUID: '', role: 1 },
			// 	// ],
			// },
			// {
			// 	ID: '58962',
			// 	created: Date.now(),
			// 	seriesID: 'c5ea6cb7',
			// 	members: [
			// 		{ name: 'Jodu555', UUID: '', role: 1 },
			// 		{ name: 'TRyFlow', UUID: '', role: 1 },
			// 	],
			// },
			// {
			// 	ID: '58972',
			// 	created: Date.now(),
			// 	seriesID: '1998be8e',
			// 	members: [{ name: 'Jodu555', UUID: '', role: 1 }],
			// },
		],
		currentRoomID: -1,
		own: false,
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
		setRoomList(state, roomList) {
			state.roomList = roomList;
		},
		setLoading(state, loading) {
			state.loading = loading;
		},
	},
	getters: {
		isOwner(state, getters, rootState) {
			if (getters.currentRoom == undefined) return;
			const userUUID = rootState.auth?.userInfo?.UUID;
			if (userUUID == undefined) return;
			const memberObject = getters.currentRoom.members.find((x) => x.UUID == userUUID);
			if (memberObject == undefined) return;
			return memberObject.role == 1;
		},
		currentRoom(state) {
			return state.roomList.find((r) => r.ID == state.currentRoomID);
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
			await dispatch('loadRoomInfo');
			await router.push('/sync/' + ID);
		},
		async leaveRoom({ commit, dispatch, rootState }) {
			//TODO: make the socket call
			commit('reset');
			await router.push('/sync/');
		},
		async loadRooms({ commit, state, dispatch, rootState }) {
			commit('setLoading', true);

			//Load the Series Details
			const response = await this.$networking.get('/room/');
			if (response.success) {
				const json = response.json;
				commit('setRoomList', json);
			}

			commit('setLoading', false);
		},
		async loadRoomInfo({ commit, state, dispatch, rootState }) {
			commit('setLoading', true);

			//Load the Series Details
			const response = await this.$networking.get('/room/' + state.currentRoomID);
			if (response.success) {
				const json = response.json;
				commit(
					'setRoomList',
					state.roomList.map((r) => {
						if (r.ID == json.ID) {
							r = json;
						}
						return r;
					})
				);
			}

			commit('setLoading', false);
		},
		async loadWatchList({ commit, dispatch, rootState }, ID) {
			const response = await this.$networking.get(`/watch/info?series=${ID}`);
			if (response.success) commit('setWatchList', response.json);
		},
	},
	namespaced: true,
};
