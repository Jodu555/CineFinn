import { useWatchStore } from './watch.store';
import { useAxios } from '@/utils';
import { defineStore } from 'pinia';
import { useAuthStore } from './auth.store';
import type { Langs } from '@/types';
import { useSocket } from '@/utils/socket';

export interface SyncRoomEntityInfos {
	season: number;
	episode: number;
	movie: number;
	lang: Langs;
}

export interface SyncRoomMember {
	UUID: string;
	name: string;
	role: number;
}

export interface SyncRoomItem {
	ID: string;
	seriesID: string;
	entityInfos?: SyncRoomEntityInfos;
	members?: SyncRoomMember[];
	created_at: number;
}

export const useSyncStore = defineStore('sync', {
	state: () => {
		return {
			loading: false,
			roomList: [] as SyncRoomItem[],
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
		currentRoom(state): SyncRoomItem {
			return state.roomList.find((r) => r.ID == state.currentRoomID) as SyncRoomItem;
		},
	},
	actions: {
		async createRoom() {
			const ID = String(Math.round(Math.random() * 10000));
			useSocket().emit('sync-create', { ID });
			this.currentRoomID = ID;

			this.loadRooms();
			this.loadRoomInfo();

			if (this.currentRoomID == ID) {
				const router = (await import('@/router')).default;
				await router.push('/sync/' + ID);
			}
		},
		async joinRoom(ID: string) {
			this.currentRoomID = ID;
			this.loadRoomInfo();
			if (this.currentRoomID == ID) {
				useSocket().emit('sync-join', { ID });
				const router = (await import('@/router')).default;
				await router.push('/sync/' + ID);
			}
		},
		async leaveRoom() {
			useSocket().emit('sync-leave', { ID: this.currentRoomID });
			this.$reset();
			this.loadRooms();
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
			}
			this.loading = false;
		},
		async loadRoomInfo() {
			this.loading = true;

			//Load the Series Details
			const response = await useAxios().get('/room/' + this.currentRoomID);
			console.log(response);
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
