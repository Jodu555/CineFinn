import router from '@/router/index';

const getDefaultState = () => {
	return {
		loading: false,
		roomList: [],
		currentRoomID: -1,
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
			if (getters.currentRoom == undefined) return false;
			const userUUID = rootState.auth?.userInfo?.UUID;
			if (userUUID == undefined) return false;
			const memberObject = getters.currentRoom.members.find((x) => x.UUID == userUUID);
			if (memberObject == undefined) return false;
			return memberObject.role == 1;
		},
		currentRoom(state) {
			return state.roomList.find((r) => r.ID == state.currentRoomID);
		},
	},
	actions: {
		async createRoom({ commit, dispatch, rootState }) {
			const ID = Math.round(Math.random() * 10000);
			this.$socket.emit('sync-create', { ID });
			commit('setCurrentRoomID', ID);
			dispatch('loadRoomInfo');
			await router.push('/sync/' + ID);
		},
		async joinRoom({ commit, dispatch, state, rootState }, ID) {
			commit('setCurrentRoomID', ID);
			await dispatch('loadRoomInfo');
			if (state.currentRoomID == ID) {
				this.$socket.emit('sync-join', { ID });
				await router.push('/sync/' + ID);
			}
		},
		async leaveRoom({ commit, dispatch, state, rootState }) {
			this.$socket.emit('sync-leave', { ID: state.currentRoomID });
			commit('reset');
			await router.push('/sync/');
		},
		async loadRooms({ commit, state, dispatch, rootState }) {
			commit('setLoading', true);

			//Load the Series Details
			const response = await this.$networking.get('/room/');
			if (response.success) {
				const json = response.json;
				//For Testing Purposes
				// json.push({
				// 	ID: '58962',
				// 	created_at: Date.now(),
				// 	seriesID: 'c5ea6cb7',
				// 	members: [
				// 		{ name: 'Jodu555', UUID: '', role: 1 },
				// 		{ name: 'TRyFlow', UUID: '', role: 1 },
				// 	],
				// });
				commit('setRoomList', json);
			}

			commit('setLoading', false);
		},
		async loadRoomInfo({ commit, state, dispatch, rootState }) {
			commit('setLoading', true);

			//Load the Series Details
			const response = await this.$networking.get('/room/' + state.currentRoomID);
			console.log(response);
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
			} else {
				commit('setCurrentRoomID', -1);
				await router.push('/sync');
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
