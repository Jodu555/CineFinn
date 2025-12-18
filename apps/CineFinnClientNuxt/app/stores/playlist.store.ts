import type { FrontendPlaylist } from '@cinefinn/types/database'
import { defineStore } from 'pinia'
import useAPIURL from '~/hooks/useAPIURL';

export const usePlaylistStore = defineStore('playlist', {
    state: () => ({
        loading: false,
        playlists: [] as FrontendPlaylist[],
    }),
    actions: {
        async loadPlaylists() {
            this.loading = true;

            const response = await $fetch<FrontendPlaylist[]>(useAPIURL() + '/playlists', {
                headers: {
                    'auth-token': useAuthStore().authToken || '',
                },
            });
            this.playlists = response;

            this.loading = false;
        },
        async createPlaylist(name: string, description: string) {
            this.loading = true;
            const response = await $fetch<FrontendPlaylist>(useAPIURL() + '/playlists', {
                method: 'POST',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
                body: JSON.stringify({
                    name,
                    description,
                }),
            });
            await this.loadPlaylists();
            this.loading = false;
        },
        async deletePlaylist(id: string) {
            this.loading = true;
            const response = await $fetch<FrontendPlaylist>(useAPIURL() + '/playlists/' + id, {
                method: 'DELETE',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
            });
            await this.loadPlaylists();
            this.loading = false;
        },
        async updatePlaylist(id: string, body: { name: string, description: string }) {
            this.loading = true;
            const response = await $fetch<FrontendPlaylist>(useAPIURL() + '/playlists/' + id, {
                method: 'PUT',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
                body: JSON.stringify({
                    name: body.name,
                    description: body.description,
                }),
            });
            await this.loadPlaylists();
            this.loading = false;
        },
    }
})
