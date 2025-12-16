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
    }
})
