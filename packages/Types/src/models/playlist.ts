import type { timestamped } from "../shared/utilities.js";

export interface Playlist {
    UUID: string;
    account_UUID: string;
    name: string;
    description: string;
    items: string[]; //The Series UUID's
    settings: PlaylistSettings;
}

export type FrontendPlaylist = Playlist & timestamped;

export interface PlaylistSettings {
    sendEmailOnUpdate: boolean;
}
