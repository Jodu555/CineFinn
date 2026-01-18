import type { Account, Email, MovingItem, timestamped } from '@cinefinn/types/database';
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
        movingItems: [] as MovingItem[],
        emails: [] as (Email & timestamped)[],
        config: {} as any,
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
        async loadMovingItems() {
            this.loading = true;
            const { data, error } = await tryCatch<Promise<MovingItem[]>, FetchError>(() => $fetch<MovingItem[]>(useAPIURL() + '/admin/subsystems/movingItems', {
                method: 'GET',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
            }));
            if (error) {
                this.error = error.data || 'An unknown error occurred.';
                return;
            } else {
                this.movingItems = data;
            }
            this.loading = false;
        },
        async loadEmails() {
            this.loading = true;
            const { data, error } = await tryCatch<Promise<(Email & timestamped)[]>, FetchError>(() => $fetch<(Email & timestamped)[]>(useAPIURL() + '/admin/emails', {
                method: 'GET',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
            }));
            if (error) {
                this.error = error.data || 'An unknown error occurred.';
                return;
            } else {
                this.emails = data;
            }
            this.loading = false;
        },
        async loadConfig() {
            this.loading = true;
            const { data, error } = await tryCatch<Promise<any>, FetchError>(() => $fetch<any>(useAPIURL() + '/admin/config', {
                method: 'GET',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
            }));
            if (error) {
                this.error = error.data || 'An unknown error occurred.';
                return;
            } else {
                this.config = data;
            }
            this.loading = false;
        },
        async updateConfigValue(key: string, value: any) {
            key = key.replace('config.', '');
            const { data, error } = await tryCatch<Promise<any>, FetchError>(() => $fetch<any>(useAPIURL() + '/admin/config', {
                method: 'POST',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
                body: {
                    key,
                    value,
                },
            }));
            if (error) {
                this.error = error.data || 'An unknown error occurred.';
                return;
            } else {
                this.config = data;
            }
        },
        async updateOverview(overview: Partial<Overview>) {
            this.overview = { ...this.overview, ...overview };
        },
        async updateSubsystems(subsystems: SubSystem[]) {
            this.subsystems = subsystems;
        },
        async updateAccounts(accounts: (Account & timestamped)[]) {
            this.accounts = accounts;
        }
    }
});
