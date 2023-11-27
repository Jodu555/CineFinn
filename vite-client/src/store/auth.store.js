import router from '@/router/index';

const getDefaultState = () => {
	return {
		loggedIn: false,
		authToken: '',
		error: null,
		userInfo: {
			UUID: '',
			username: '',
			email: '',
		},
		settings: {
			preferredLanguage: { title: 'Your Preffered Language', value: 'GerDub' },
			showVideoTitleContainer: { title: 'Show the Video Title Container?', type: 'checkbox', value: true },
			showLatestWatchButton: { title: 'Show the latest watch button?', type: 'checkbox', value: true },
			developerMode: { title: 'Show the developer Infos?', type: 'checkbox', value: false },
			showNewsAddForm: { title: 'Show the Add News Form', type: 'checkbox', value: true },
			volume: { type: 'hide', value: 1 },
		},
	};
};

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
		setSettings(state, settings) {
			state.settings = settings;
			setCookie('account_settings', JSON.stringify(settings));
		},
		logout(state) {
			state.loggedIn = false;
			state.authToken = '';
			state.userInfo = {
				UUID: '',
				username: '',
				email: '',
			};
		},
	},
	actions: {
		async updateSettings({ commit, state, dispatch }) {
			console.log('Settings Emitted', state.settings);
			this.$socket.emit('updateSettings', state.settings);
		},
		async resetSettings() {
			this.$socket.emit('resetSettings');
		},
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
		async register({ commit, state, dispatch }, credentials) {
			const response = await this.$networking.post('/auth/register', JSON.stringify(credentials));
			if (response.success) {
				delete credentials?.token;
				await dispatch('login', credentials);
			} else {
				commit('setError', response);
			}
		},
		async authenticate({ state, commit, dispatch }, redirectToSlash = false) {
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
							role: json.role,
						});
						commit('setSettings', JSON.parse(json.settings));
						await commit('setLoggedIn', true);
						await commit('setAuthToken', authtoken);
						setCookie('auth-token', authtoken, 30);

						this.$socket.auth = { token: authtoken, type: 'client' };
						await this.$socket.connect();

						redirectToSlash && (await router.push('/'));
					} else {
						await commit('setError', response);
						await dispatch('logout');
						await dispatch('reset', null, { root: true });
						deleteCookie('auth-token');
					}
				} else {
					await commit('logout');
					await dispatch('reset', null, { root: true });
					// deleteCookie('auth-token');
				}
			} catch (error) {
				// deleteCookie('auth-token');
				await dispatch('logout');
			}
		},
		async logout({ state, commit, dispatch }) {
			await commit('setLoggedIn', false);
			if (getCookie('auth-token') || state.authToken) {
				this.$networking.auth_token = getCookie('auth-token') || state.authToken;
				// deleteCookie('auth-token');
				try {
					const response = await this.$networking.get('/auth/logout');
					if (response.success) {
						await commit('logout');
						await dispatch('reset', null, { root: true });
					} else {
						await commit('setError', response);
					}
				} catch (error) {}
			}
			await this.$socket.disconnect();
			await router.push('/login');
		},
	},
	namespaced: true,
};
