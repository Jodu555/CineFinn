import { defineStore } from 'pinia';
import useAPIURL from '~/hooks/useAPIURL';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        loggedIn: false,
        authToken: '',
        error: '',
        user: null as any as Account,
        settings: null,
    }),
    actions: {
        async login(credentials: { username: string; password: string; }) {
            const response = await $fetch<{ token: string; error?: { message: string; }; }>(useAPIURL() + '/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials),
            });


            if (response.error) {
                console.log(response);
                this.error = response.error.message;
                return;
            }

            this.loggedIn = true;
            this.authToken = response.token;
            useCookie('auth-token').value = this.authToken;
            await this.authenticate();
        },
        async register(credentials: { username: string; password: string; token: string; }) {
            const response = await $fetch<{ token: string; error?: { message: string; }; }>(useAPIURL() + '/auth/register', {
                method: 'POST',
                body: JSON.stringify(credentials),
            });


            this.loggedIn = true;
            this.authToken = response.token;
            await this.authenticate();
        },
        async authenticate() {
            try {
                console.log('Authenticating user TRYING');
                if (this.authToken == '') {
                    this.authToken = useCookie('auth-token').value as string;
                }
                if (!this.authToken)
                    return;
                const token = this.authToken;

                const response = await $fetch<Account>(useAPIURL() + '/auth/info', {
                    headers: {
                        'auth-token': token,
                    },
                });

                console.log('Authenticating user', response);
                // useCookie('auth-token').value = this.authToken;
                this.loggedIn = true;
                this.user = response;
                return response;
            } catch (error) {
                console.log('Authenticating user FAILED', error);
                const authCookie = useCookie('auth-token');
                authCookie.value = '';
                this.authToken = '';
                this.loggedIn = false;
                this.user = null as any as Account;
            }
        },
        async logout() {
            const response = await $fetch<Account>('http://big.jodu555.de:8081/api/v1/auth/logout', {
                headers: {
                    'auth-token': this.authToken as string,
                },
            });
            const authCookie = useCookie('auth-token');
            authCookie.value = '';
            this.authToken = '';
            this.loggedIn = false;
            this.user = null as any as Account;
        }
    }
});