import { useAxios } from '@/utils';
import { defineStore } from 'pinia';

interface DBAccount {
	UUID: string;
	username: string;
	email: string;
	role: number;
	settings: object;
	activityDetails: {
		lastIP: string;
		lastHandshake: string;
		lastLogin: string;
	};
}

interface Overview {
	accounts: number;
	series: number;
	episodes: number;
	movies: number;
	connectedSubSystems: number;
	possibleSubSystems: number;
	sockets: number;
	streams: number;
	scraper: boolean;
}

interface SubSystem {
	id: string;
	ptoken: string;
	endpoint: string;
	readrate: number;
	affectedSeriesIDs: string[];
	type: 'sub';
}

export interface MovingItem {
	ID: string;
	seriesID: string;
	fromSubID: string;
	toSubID: string;
	filePath: string;
	meta: {
		progress: number;
		isMoving: boolean;
		result: string;
	};
}

interface SubSystemsAPIRes {
	knownSubSystems: string[];
	subSockets: SubSystem[];
	movingItems: MovingItem[];
}

export const useAdminStore = defineStore('admin', {
	state: () => {
		return {
			loading: true,
			accounts: [] as DBAccount[],
			overview: {} as Partial<Overview>,
			subsystems: {} as SubSystemsAPIRes,
		};
	},
	actions: {
		async loadOverview() {
			const response = await useAxios().get<Overview>('/admin/overview');

			if (response.status == 200) {
				this.overview = response?.data;
			}
		},
		async loadAccounts() {
			const response = await useAxios().get<DBAccount[]>('/admin/accounts');

			if (response.status == 200) {
				this.accounts = response?.data;
			}
		},
		async loadSubSystems() {
			const response = await useAxios().get<SubSystemsAPIRes>('/admin/subsystems');

			if (response.status == 200) {
				response.data.movingItems = response.data.movingItems.map((x) => {
					x.meta = {
						isMoving: false,
						progress: 0,
						result: '',
					};
					return x;
				});
				this.subsystems = response?.data;
			}
		},
	},
});
