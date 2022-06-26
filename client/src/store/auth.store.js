export default {
    state: {
        loggedIn: false,
        authToken: '',
        error: null,
        userInfo: {
            UUID: '',
            username: '',
            email: '',
        }
    },
    mutations: {
        setUser(state, user) {
            state.userInfo = user;
        },
        setLoggedIn(state, loggedIn) {
            state.loggedIn = loggedIn;
        },
        setAuthToken(state, authToken) {
            state.authToken = authToken;
        },
        setError(state, error) {
            state.error = error;
        },
        logout(state) {
            state.loggedIn = false;
            state.authToken = '';
            state.userInfo = {
                UUID: '',
                username: '',
                email: ''
            };
        }
    },
    actions: {
        async login({ commit, state, dispatch }, credentials) {
            const response = await this.$networking.post('/auth/login', JSON.stringify(credentials));
            if (response.success) {
                const json = response.json;
                commit('setLoggedIn', true);
                commit('setAuthToken', json.token);
                setCookie('auth-token', json.token, 30);
                dispatch('authenticate');
            } else {
                commit('setError', response);
            }
        },
        async authenticate({ state, commit }) {
            if (getCookie('auth-token') || state.authToken) {
                this.$networking.auth_token = getCookie('auth-token') || state.authToken
                const response = await this.$networking.get('/auth/info');
                if (response.success) {
                    const json = response.json;
                    commit('setUser', {
                        UUID: json.UUID,
                        username: json.username,
                        email: json.email,
                    });
                    this.$app.config.globalProperties.$router.push('/users')
                } else {
                    commit('setError', response);
                }
            } else {
                commit('logout');
            }
        },
        async logout({ commit }) {
            if (getCookie('auth-token') || state.authToken) {
                this.$networking.auth_token = getCookie('auth-token') || state.authToken;
                const response = await this.$networking.get('/auth/logout');
                deleteCookie('auth-token');
                if (response.success) {
                    commit('logout');
                } else {
                    commit('setError', response);
                }
            } else {
                state.loggedIn = false;
            }
        }

    },
    namespaced: true,
}