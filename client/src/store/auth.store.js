import router from '@/router/index'

const getDefaultState = () => {
    return {
        loggedIn: false,
        authToken: '',
        error: null,
        userInfo: {
            UUID: '',
            username: '',
            email: '',
        }
    }
}

export default {
    state: getDefaultState(),
    mutations: {
        reset(state) {
            Object.assign(state, getDefaultState());
        },
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
                await dispatch('authenticate', true);
            } else {
                commit('setError', response);
            }
        },
        async authenticate({ state, commit }, redirectToSlash = false) {
            try {
                const authtoken = getCookie('auth-token') || state.authToken;
                if (authtoken) {
                    this.$networking.auth_token = authtoken;
                    const response = await this.$networking.get('/auth/info');
                    if (response.success) {
                        const json = response.json;
                        commit('setUser', {
                            UUID: json.UUID,
                            username: json.username,
                            email: json.email,
                        });
                        await commit('setLoggedIn', true);
                        await commit('setAuthToken', authtoken);
                        setCookie('auth-token', authtoken, 30);
                        redirectToSlash && await router.push('/');
                    } else {
                        await commit('setError', response);
                        await commit('logout');
                        await commit('reset', null, { root: true })
                        deleteCookie('auth-token');
                    }
                } else {
                    await commit('logout');
                    await commit('reset', null, { root: true })
                    deleteCookie('auth-token');
                }
            } catch (error) {
                deleteCookie('auth-token');
            }
        },
        async logout({ state, commit, dispatch }) {
            if (getCookie('auth-token') || state.authToken) {
                this.$networking.auth_token = getCookie('auth-token') || state.authToken;
                const response = await this.$networking.get('/auth/logout');
                deleteCookie('auth-token');
                if (response.success) {
                    await commit('logout');
                    await dispatch('reset', null, { root: true });
                    await router.push('/login');
                } else {
                    await commit('setError', response);
                }
            } else {
                await commit('setLoggedIn', false);
            }
        }
    },
    namespaced: true,
}