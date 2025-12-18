import type { Job, JobType, timestamped } from '@cinefinn/types/database'
import { defineStore } from 'pinia'
import useAPIURL from '~/hooks/useAPIURL';

export interface Playlist {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    itemIds: number[];
    coverImage?: string;
}

export const usePlaylistStore = defineStore('playlist', {
    state: () => ({
        loading: false,
        playlists: [] as Playlist[],
    }),
    actions: {
        async loadPlaylists() {
            this.loading = true;

            this.loading = false;
        },
        async createPlaylist(name: string, description: string) {
            const newPlaylist: Playlist = {
                id: `playlist-${Date.now()}`,
                name: name,
                description: description,
                createdAt: new Date().toISOString(),
                itemIds: [1, 2],
            };
            this.loading = true;
            // const response = await $fetch<Playlist>(useAPIURL() + '/playlists', {
            //     method: 'POST',
            //     headers: {
            //         'auth-token': useAuthStore().authToken,
            //     },
            //     body: JSON.stringify({
            //         name,
            //         description,
            //     }),
            // });
            // this.playlists.push(response);
            this.playlists.push(newPlaylist);
            this.loading = false;
        },
        async deletePlaylist(id: string) {
            this.loading = true;
            const response = await $fetch<Playlist>(useAPIURL() + '/playlists/' + id, {
                method: 'DELETE',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
            });
            this.playlists = this.playlists.filter((p) => p.id !== id);
            this.loading = false;
        },
        async updatePlaylist(id: string, body: { name: string, description: string }) {
            this.loading = true;
            const response = await $fetch<Playlist>(useAPIURL() + '/playlists/' + id, {
                method: 'PUT',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
                body: JSON.stringify({
                    name: body.name,
                    description: body.description,
                }),
            });
            this.playlists = this.playlists.map((p) => {
                if (p.id === response.id) {
                    return response;
                }
                return p;
            });
            this.loading = false;
        },
    }
})
