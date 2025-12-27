import type { Account, timestamped } from '@cinefinn/types/database';
import type { Overview, SubSystem } from '@cinefinn/types/socket';
import type { FetchError } from 'ofetch';
import { defineStore } from 'pinia';
import useAPIURL from '~/hooks/useAPIURL';

export const useAdminStore = defineStore('admin', {
    state: () => ({
        loading: false,
        error: '',
        overview: {} as Overview,
        accounts: [] as (Account & timestamped)[],
        subsystems: [] as SubSystem[],
    }),
    actions: {
        async loadOverview() {
            this.loading = true;
            const { data, error } = await tryCatch<Promise<Overview>, FetchError>(() => $fetch<Overview>(useAPIURL() + '/admin/overview', {
                method: 'GET',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
            }));
            if (error) {
                this.error = error.data || 'An unknown error occurred.';
                return;
            } else {
                this.overview = data;
            }
            this.loading = false;
        },
        async loadAccounts() {
            this.loading = true;
            const { data, error } = await tryCatch<Promise<(Account & timestamped)[]>, FetchError>(() => $fetch<(Account & timestamped)[]>(useAPIURL() + '/admin/accounts', {
                method: 'GET',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
            }));
            if (error) {
                this.error = error.data || 'An unknown error occurred.';
                return;
            } else {
                this.accounts = data;
            }
            this.loading = false;
        },
        async loadSubsystems() {
            this.loading = true;
            const { data, error } = await tryCatch<Promise<SubSystem[]>, FetchError>(() => $fetch<SubSystem[]>(useAPIURL() + '/admin/subsystems', {
                method: 'GET',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
            }));
            if (error) {
                this.error = error.data || 'An unknown error occurred.';
            } else {
                this.subsystems = data;
            }
            this.loading = false;
        },
        async updateOverview(overview: Partial<Overview>) {
            this.overview = { ...this.overview, ...overview };
        }
    }
});
