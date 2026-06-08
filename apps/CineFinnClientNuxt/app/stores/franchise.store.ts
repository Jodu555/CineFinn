import type { FranchiseDataExtended } from '@cinefinn/types/models/franchise';
import { defineStore } from 'pinia'

export const useFranchiseStore = defineStore('franchise', {
    state: () => ({
        franchises: [] as FranchiseDataExtended[],
    }),
    actions: {
        async loadFranchises() {
            const { data, error } = await tryCatch<Promise<FranchiseDataExtended[]>, Error>(() => $fetch<FranchiseDataExtended[]>(`${useAPIURL()}/franchise`, {
                method: 'GET',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
            }));
            if (error) {
                console.error('Failed to fetch franchises:', error);
                this.franchises = [];
                return;
            }
            this.franchises = data;
        },
        async updateFranchises(franchises: FranchiseDataExtended[]) {
            this.franchises = franchises;
        }
    }
})
