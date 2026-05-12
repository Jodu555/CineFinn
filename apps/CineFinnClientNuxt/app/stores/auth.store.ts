import type { Account, SettingsObject } from '@cinefinn/types/models/user';
import { defineStore } from 'pinia';
import type { FetchError } from 'ofetch';

import { useAuthCookie } from '~/composables/useAuthCookie';

const DEBUG = false;

export const useAuthStore = defineStore('auth', {
    state: () => ({
        loggedIn: false,
        authToken: '',
        error: '',
        user: null as any as Account,
    }),
    actions: {
        async login(credentials: { username: string; password: string; }) {
            const { data, error } = await tryCatch<Promise<{ token: string; error?: { message: string; }; }>, FetchError>(() => $fetch<{ token: string; error?: { message: string; }; }>(useAPIURL() + '/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials),
            }));
            if (error) {
                DEBUG && console.log(error);
                this.error = error.data || 'An unknown error occurred.';
                return;
            }

            this.authToken = data.token;
            useAuthCookie().value = this.authToken;
            await this.authenticate(true);
        },
        async register(credentials: { username: string; password: string; token: string; }) {
            const { data, error } = await tryCatch<Promise<{ token: string, user: Account; }>, FetchError>(() => $fetch<{ token: string, user: Account; }>(useAPIURL() + '/auth/register', {
                method: 'POST',
                body: JSON.stringify(credentials),
            }));
            if (error) {
                this.error = error.data || 'An unknown error occurred.';
                return;
            }

            DEBUG && console.log(data);


            this.authToken = data.token;
            useAuthCookie().value = this.authToken;
            await this.authenticate(true);
        },
        async authenticate(redirectToSlash = false) {
            try {
                DEBUG && console.log('Authenticating user TRYING');
                if (this.authToken == '') {
                    this.authToken = useAuthCookie().value as string;
                }
                if (!this.authToken)
                    return;
                const token = this.authToken;
                useAuthCookie().value = token;

                const response = await $fetch<Account>(`${useAPIURL()}/auth/info`, {
                    headers: {
                        'auth-token': token,
                    },
                });

                DEBUG && console.log('Authenticating user', response.UUID, response.username, response.role, response.status);
                // useAuthCookie().value = this.authToken;
                this.user = response;
                this.loggedIn = true;

                if (redirectToSlash) {
                    await useIndexStore().loadSeries();
                    const router = useRouter();
                    await router.push('/');
                }

                return response;
            } catch (error) {
                DEBUG && console.log('Authenticating user FAILED', error);
                // const authCookie = useAuthCookie();
                // authCookie.value = '';
                this.authToken = '';
                this.loggedIn = false;
                this.user = null as any as Account;
            }
        },
        async logout() {
            const { data, error } = await tryCatch<Promise<void>, FetchError>(() => $fetch<void>(`${useAPIURL()}/auth/logout`, {
                headers: {
                    'auth-token': this.authToken as string,
                },
            }));
            if (error) {
                console.log(error);
                const { $swal } = useNuxtApp();
                $swal.fire({
                    title: 'Error',
                    text: 'An error occurred while logging out: ' + error.message,
                    icon: 'error',
                    confirmButtonText: 'Ok',
                });
            }
            const authCookie = useAuthCookie();
            authCookie.value = '';
            this.authToken = '';
            this.user = null as any as Account;
            this.loggedIn = false;

            useAuthStore().$reset();
            useIndexStore().$reset();

            useRouter().push('/login');
        },
        updateSettings(settings: SettingsObject) {
            this.user.settings = settings;
        }
    }
});