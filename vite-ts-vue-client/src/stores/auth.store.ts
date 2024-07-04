import { defineStore } from 'pinia';
import { AxiosError } from 'axios';
import { deleteCookie, getCookie, setCookie, useAxios } from '@/utils';
import { useSocket } from '@/utils/socket';
import { useRouter } from 'vue-router';
import type { Setting, SettingsObject } from '@/types';

export const useAuthStore = defineStore('auth', {
	state: () => {
		return {
			loggedIn: false,
			authToken: '',
			error: '',
			userInfo: {
				UUID: '',
				username: '',
				email: '',
				role: 0,
			},
			settings: {
				preferredLanguage: { title: 'Your Preffered Language', value: 'GerDub' } as Setting,
				showVideoTitleContainer: { title: 'Show the Video Title Container?', type: 'checkbox', value: true } as Setting,
				showLatestWatchButton: { title: 'Show the latest watch button?', type: 'checkbox', value: true } as Setting,
				developerMode: { title: 'Show the developer Infos?', type: 'checkbox', value: false } as Setting,
				showNewsAddForm: { title: 'Show the Add News Form', type: 'checkbox', value: true } as Setting,
				volume: { type: 'hide', value: 1 } as Setting,
				autoSkip: { title: 'Auto Skip to next Episode at the end?', type: 'checkbox', value: true } as Setting,
				skipSegments: { title: 'Skip Segments?', type: 'checkbox', value: false } as Setting,
				enableBetaFeatures: { title: 'Enable Beta Features?', type: 'checkbox', value: false } as Setting,
			},
		};
	},
	actions: {
		async setSettings(settings: SettingsObject) {
			this.settings = settings as any;
			setCookie('account_settings', JSON.stringify(settings), 30);
		},
		async updateSettings() {
			console.log('Settings Emitted', this.settings);
			useSocket().emit('updateSettings', this.settings);
		},
		async resetSettings() {
			useSocket().emit('resetSettings');
		},
		async login(credentials: { username: string; password: string }) {
			const response = await useAxios().post('/auth/login', credentials);
			console.log(response);

			if (response.status == 200) {
				this.loggedIn = true;
				this.authToken = response.data.token;
				this.authenticate(true);
			} else {
				this.error = response.data?.error?.message;
			}
		},
		async register(credentials: { username: string; password: string; token?: string }) {
			const response = await useAxios().post('/auth/register', credentials);
			if (response.status == 200) {
				delete credentials?.token;
				this.login(credentials);
			} else {
				this.error = response.data?.error?.message;
			}
		},
		async authenticate(redirectToSlash = false) {
			try {
				const authtoken = getCookie('auth-token') || this.authToken;
				if (authtoken) {
					useAxios().defaults.headers.common['auth-token'] = authtoken;
					useAxios().defaults.headers['auth-token'] = authtoken;
					const response = await useAxios().get('/auth/info');
					if (response.status == 200) {
						const json = response.data;
						this.userInfo = {
							UUID: json.UUID,
							username: json.username,
							email: json.email,
							role: json.role,
						};
						this.settings = JSON.parse(json.settings);
						this.loggedIn = true;
						this.authToken = authtoken;

						setCookie('auth-token', authtoken, 30);

						useSocket().auth = { token: authtoken, type: 'client' };
						useSocket().connect();

						if (redirectToSlash) {
							const router = (await import('@/router')).default;
							await router.push('/');
						}
					} else {
						this.error = response.data?.error?.message;
						this.logout();
						this.$reset();
						deleteCookie('auth-token');
					}
				} else {
					this.logout();
					this.$reset();
				}
			} catch (error) {
				deleteCookie('auth-token');
				this.logout();
			}
		},
		async logout() {
			this.loggedIn = false;
			const token = getCookie('auth-token') || this.authToken;
			if (token) {
				useAxios().defaults.headers.common['auth-token'] = token;
				useAxios().defaults.headers['auth-token'] = token;
				deleteCookie('auth-token');
				const response = await useAxios().get('/auth/logout');
				if (response.status == 200) {
					this.authToken = '';
					this.userInfo = {
						UUID: '',
						username: '',
						email: '',
						role: 0,
					};
				} else {
					this.error = response.data?.error?.message;
				}
			}
			useSocket().disconnect();
			const router = (await import('@/router')).default;
			await router.push('/login');
		},
	},
});
