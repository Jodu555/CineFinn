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

export const useAdminStore = defineStore('admin', {
	state: () => {
		return {
			loading: false,
			accounts: [] as DBAccount[],
			overview: {} as Partial<Overview>,
		};
	},
	actions: {
		async loadOverview() {
			this.loading = true;

			const response = await useAxios().get<Overview>('/admin/overview');

			if (response.status == 200) {
				this.overview = response?.data;
			}

			this.loading = false;
		},
		async loadAccounts() {
			this.loading = true;

			const response = await useAxios().get<DBAccount[]>('/admin/accounts');

			if (response.status == 200) {
				this.accounts = response?.data;
			}

			this.loading = false;
		},
	},
});
