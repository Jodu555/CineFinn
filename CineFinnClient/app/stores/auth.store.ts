import { defineStore } from 'pinia';

const CURRENT_EXTERNAL_API = 'http://localhost:3000';

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
            const { data, error } = await tryCatch($fetch<{ token: string; error?: { message: string; }; }>(CURRENT_EXTERNAL_API + '/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials),
            }));
            if (error) {
                console.log(error);
                this.error = error.message;
                return;
            }

            if (data.error) {
                console.log(data);
                this.error = data.error.message;
                return;
            }

            this.loggedIn = true;
            this.authToken = data.token;
            useCookie('auth-token').value = this.authToken;
            await this.authenticate();
        },
        async register(credentials: { username: string; password: string; token: string; }) {
            const { data, error } = await tryCatch($fetch<{ token: string; error?: { message: string; }; }>(CURRENT_EXTERNAL_API + '/auth/register', {
                method: 'POST',
                body: JSON.stringify(credentials),
            }));
            if (error) {
                console.log(error);
                this.error = error.message;
                return;
            }

            if (data.error) {
                console.log(data);
                this.error = data.error.message;
                return;
            }

            this.loggedIn = true;
            this.authToken = data.token;
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

                const response = await $fetch<Account>(CURRENT_EXTERNAL_API + '/auth/info', {
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