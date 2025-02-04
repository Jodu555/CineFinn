import { useWatchStore } from './watch.store';
import { getApp, useAxios, useSwal } from '@/utils';
import { defineStore } from 'pinia';
import { useAuthStore } from './auth.store';
import { useSocket } from '@/utils/socket';
import type { DatabaseParsedSyncRoomItem } from '@Types/database';

export const useSyncStore = defineStore('sync', {
	state: () => {
		return {
			loading: false,
			roomList: [] as DatabaseParsedSyncRoomItem[],
			currentRoomID: '-1',
		};
	},
	getters: {
		isOwner(): boolean {
			if (this.currentRoom == undefined) return false;
			const userUUID = useAuthStore().userInfo.UUID;
			if (userUUID == undefined) return false;
			const memberObject = this.currentRoom.members?.find((x) => x.UUID == userUUID);
			if (memberObject == undefined) return false;
			return memberObject.role == 1;
		},
		currentRoom(state): DatabaseParsedSyncRoomItem {
			return state.roomList.find((r) => r.ID == state.currentRoomID) as DatabaseParsedSyncRoomItem;
		},
	},
	actions: {
		async createRoom() {
			const ID = String(Math.round(Math.random() * 10000));
			useSocket().emit('sync-create', { ID });
			this.currentRoomID = ID;

			await this.loadRooms();
			await this.loadRoomInfo();

			if (this.currentRoomID == ID) {
				const router = (await import('@/router')).default;
				await router.push('/sync/' + ID);
			}
		},
		async joinRoom(ID: string) {
			this.currentRoomID = ID;
			await this.loadRoomInfo();
			console.log(this.currentRoomID);

			if (this.currentRoomID == ID) {
				useSocket().emit('sync-join', { ID });
				const router = (await import('@/router')).default;
				await router.push('/sync/' + ID);
			}
		},
		async leaveRoom() {
			if (this.currentRoomID == '-1') return;
			useSocket().emit('sync-leave', { ID: this.currentRoomID });
			this.$reset();
			await this.loadRooms();
			const router = (await import('@/router')).default;
			await router.push('/sync/');
		},
		async loadRooms() {
			this.loading = true;

			//Load the Series Details
			const response = await useAxios().get('/room/');
			if (response.status === 200) {
				const json = response.data;
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

				this.roomList = json;
				if (this.currentRoomID != '-1') {
					await this.loadRoomInfo();
				}
			} else {
				useSwal({
					toast: true,
					position: 'top-end',
					showConfirmButton: false,
					timer: 3000,
					icon: 'error',
					title: `${response.data.error.message}`,
					timerProgressBar: true,
				});
			}
			this.loading = false;
		},
		async loadRoomInfo() {
			this.loading = true;
			//Load the Series Details
			const response = await useAxios().get('/room/' + this.currentRoomID);
			if (response.status === 200) {
				const json = response.data;
				this.roomList = this.roomList.map((r) => {
					if (r.ID == json.ID) {
						r = json;
					}
					return r;
				});
			} else {
				this.currentRoomID = '-1';
				useSwal({
					toast: true,
					position: 'top-end',
					showConfirmButton: false,
					timer: 3000,
					icon: 'error',
					title: `${response.data.error.message}`,
					timerProgressBar: true,
				});
				const router = (await import('@/router')).default;
				await router.push('/sync');
			}

			this.loading = false;
		},
		async loadWatchList(ID: string) {
			const response = await useAxios().get(`/watch/info?series=${ID}`);

			if (response.status === 200) useWatchStore().watchList = response.data;
			// if (response.status === 200) commit('setWatchList', response.json);
		},
	},
});
