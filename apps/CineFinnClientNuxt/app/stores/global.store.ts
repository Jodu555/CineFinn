import { defineStore } from 'pinia'

interface ServerHealth {
    status: 'ok' | 'error';
    version: string;
    motd: {
        show: boolean;
        type: 'info' | 'warning' | 'error';
        message: string;
    };
}

export const useGlobalStore = defineStore('global', {
    state: () => ({
        serverVersion: '0.0.0',
        motd: {
            show: false,
            type: 'info',
            message: 'This is a message of the day.',
        },
    }),
    getters: {
        clientVersion: (state) => {
            return useClientVersion();
        }
    },
    actions: {
        async loadGlobals() {
            const { data, error } = await tryCatch<Promise<ServerHealth>, Error>(() => $fetch<ServerHealth>(`${useAPIURL()}/health`, {
                method: 'GET',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
            }));
            if (error) {
                console.error('Failed to fetch server health:', error);
                this.motd = {
                    show: true,
                    type: 'error',
                    message: 'Failed to reach server.',
                }
                return;
            }
            this.serverVersion = data.version;
            this.motd = data.motd;
        }
    }
})
