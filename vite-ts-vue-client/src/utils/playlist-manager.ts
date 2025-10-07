export interface Playlist {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    itemIds: number[];
    coverImage?: string;
}

const PLAYLISTS_KEY = "cinefinn_playlists";

export function getPlaylists(): Playlist[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(PLAYLISTS_KEY);
    return stored ? JSON.parse(stored) : [];
}

export function savePlaylist(playlist: Playlist): void {
    const playlists = getPlaylists();
    const existingIndex = playlists.findIndex((p) => p.id === playlist.id);

    if (existingIndex >= 0) {
        playlists[existingIndex] = playlist;
    } else {
        playlists.push(playlist);
    }

    localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}

export function deletePlaylist(playlistId: string): void {
    const playlists = getPlaylists().filter((p) => p.id !== playlistId);
    localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}

export function addToPlaylist(playlistId: string, itemId: number): void {
    const playlists = getPlaylists();
    const playlist = playlists.find((p) => p.id === playlistId);

    if (playlist && !playlist.itemIds.includes(itemId)) {
        playlist.itemIds.push(itemId);
        savePlaylist(playlist);
    }
}

export function removeFromPlaylist(playlistId: string, itemId: number): void {
    const playlists = getPlaylists();
    const playlist = playlists.find((p) => p.id === playlistId);

    if (playlist) {
        playlist.itemIds = playlist.itemIds.filter((id) => id !== itemId);
        savePlaylist(playlist);
    }
}

export function isInPlaylist(playlistId: string, itemId: number): boolean {
    const playlists = getPlaylists();
    const playlist = playlists.find((p) => p.id === playlistId);
    return playlist ? playlist.itemIds.includes(itemId) : false;
}
