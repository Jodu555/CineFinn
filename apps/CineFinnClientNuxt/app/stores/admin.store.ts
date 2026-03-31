import type { ServerConfig } from '@cinefinn/types';
import type { Account, Email } from '@cinefinn/types/models/user';
import type { MovingItem } from '@cinefinn/types/models/system';
import type { IgnoranceItem, timestamped } from '@cinefinn/types/shared';
import type { Overview, SubSystem } from '@cinefinn/types/socket';
import type { FetchError } from 'ofetch';
import { defineStore } from 'pinia';


export const useAdminStore = defineStore('admin', {
    state: () => ({
        loading: false,
        error: '',
        overview: {} as Overview,
        accounts: [] as (Account & timestamped)[],
        subsystems: [] as SubSystem[],
        movingItems: [] as MovingItem[],
        enqueuedMovingItems: new Set<string>() as Set<string>,
        emails: [] as (Email & timestamped)[],
        config: {} as ServerConfig,
        ignoranceItems: [] as (IgnoranceItem & timestamped)[],
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
        async deepProcessMovingItems(itemIds: string[]) {
            itemIds.forEach(id => this.enqueuedMovingItems.add(id));
            const { data, error } = await tryCatch<Promise<MovingItem[]>, FetchError>(() => $fetch<MovingItem[]>(useAPIURL() + '/admin/subsystems/movingItems', {
                method: 'POST',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
                body: {
                    IDs: itemIds,
                },
            }));
            if (error) {
                this.error = error.data || 'An unknown error occurred.';
                return;
            }
        },
        async moveMovingItem(itemID: string) {
            await this.deepProcessMovingItems([itemID]);
        },
        async moveAllMovingItems() {
            await this.deepProcessMovingItems(this.movingItems.map((x) => x.ID));
        },
        async moveAllAdditionalMovingItems() {
            await this.deepProcessMovingItems(this.movingItems.filter((x) => x.meta.isAdditional).map((x) => x.ID));
        },
        async removeAdditionalMovingItems() {

        },
        async createAdditionalMovingItems(toSubID: string, seriesIDs: string[]) {
            const { data, error } = await tryCatch<Promise<MovingItem[]>, FetchError>(() => $fetch<MovingItem[]>(useAPIURL() + '/admin/subsystems/movingItems', {
                method: 'POST',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
                body: {
                    seriesIDs: seriesIDs,
                    toSubID,
                },
            }));
            if (error) {
                useNuxtApp().$toast.fire({
                    toast: true,
                    title: 'Error',
                    text: error.data || 'An unknown error occurred.',
                    icon: 'error',
                });
                return;
            } else {
                await this.loadMovingItems();
            }
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
        async loadIgnoranceItems() {
            this.loading = true;
            const { data, error } = await tryCatch<Promise<(IgnoranceItem & timestamped)[]>, FetchError>(() => $fetch<(IgnoranceItem & timestamped)[]>(`${useAPIURL()}/admin/ignoranceItems`, {
                method: 'GET',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
            }));
            this.loading = false;
            if (error) {
                this.error = error.data || 'An unknown error occurred.';
                return;
            } else {
                this.ignoranceItems = data;
            }
        },
        async createIgnoranceItem(data: IgnoranceItem) {
            const { data: ignoranceItem, error } = await tryCatch<Promise<IgnoranceItem>, FetchError>(() => $fetch<IgnoranceItem>(`${useAPIURL()}/admin/ignoranceItems`, {
                method: 'POST',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
                body: data,
            }));
            if (error) {
                this.error = error.data || 'An unknown error occurred.';
                return;
            } else {
                await this.loadIgnoranceItems();
            }
        },
        async deleteIgnoranceItem(serieUUID: string) {
            const { data, error } = await tryCatch<Promise<IgnoranceItem>, FetchError>(() => $fetch<IgnoranceItem>(`${useAPIURL()}/admin/ignoranceItems/${serieUUID}`, {
                method: 'DELETE',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
            }));
            if (error) {
                this.error = error.data || 'An unknown error occurred.';
                return;
            } else {
                await this.loadIgnoranceItems();
            }
        },
        async updateOverview(overview: Partial<Overview>) {
            this.overview = { ...this.overview, ...overview };
        },
        async updateSubsystems(subsystems: SubSystem[]) {
            this.subsystems = subsystems;
        },
        async updateMovingItems(movingItems: MovingItem[]) {
            this.movingItems = movingItems;
        },
        async updateAccounts(accounts: (Account & timestamped)[]) {
            this.accounts = accounts;
        }
    }
});
