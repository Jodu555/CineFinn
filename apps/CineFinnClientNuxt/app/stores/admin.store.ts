import type { Account, timestamped } from '@cinefinn/types/database'
import type { SubSystem } from '@cinefinn/types/socket';
import type { FetchError } from 'ofetch';
import { defineStore } from 'pinia'
import useAPIURL from '~/hooks/useAPIURL';

export const useAdminStore = defineStore('admin', {
    state: () => ({
        loading: false,
        error: '',
        accounts: [] as (Account & timestamped)[],
        subsystems: [] as SubSystem[],
    }),
    actions: {
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
        }
    }
})
