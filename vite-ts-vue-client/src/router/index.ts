import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import Home from '@/views/Home.vue';
import Login from '@/views/Login.vue';
import NotFound from '@/views/NotFound.vue';

const rBase = location.hostname == 'localhost' ? './' : './';

const router = createRouter({
	history: createWebHistory(rBase),
	routes: [
		{
			path: '/login',
			name: 'Login',
			component: Login,
		},
		{
			path: '/',
			name: 'Home',
			component: Home,
			meta: { requiresLogin: true },
		},
		{
			path: '/browse',
			name: 'Browse',
			component: function () {
				return import(/* webpackChunkName: "browse" */ '@/views/Browse.vue');
			},
			meta: { requiresLogin: true },
		},
		{
			path: '/watch',
			name: 'Watch',
			component: function () {
				return import(/* webpackChunkName: "watch" */ '@/views/Watch.vue');
			},
			meta: { requiresLogin: true },
		},
		{
			path: '/news',
			name: 'News',
			component: function () {
				return import(/* webpackChunkName: "news" */ '@/views/News.vue');
			},
			meta: { requiresLogin: true },
		},
		{
			path: '/todo',
			name: 'Todo',
			component: function () {
				return import(/* webpackChunkName: "todo" */ '@/views/Todo.vue');
			},
			meta: { requiresLogin: true },
		},
		{
			path: '/vote',
			name: 'Voting',
			component: function () {
				return import(/* webpackChunkName: "todo" */ '@/views/Voting.vue');
			},
			meta: { requiresLogin: true },
		},
		{
			path: '/test',
			name: 'Test',
			component: function () {
				return import(/* webpackChunkName: "todo" */ '@/views/Test.vue');
			},
			meta: { requiresLogin: true },
		},
		{
			path: '/admin',
			name: 'Admin',
			component: function () {
				return import(/* webpackChunkName: "adminmain" */ '@/views/Admin/Admin.vue');
			},
			meta: { requiresLogin: true, requiresTeam: true },
			children: [
				{
					name: 'Overview',
					path: '',
					component: function () {
						return import(/* webpackChunkName: "overview" */ '@/views/Admin/Overview.vue');
					},
					meta: { requiresLogin: true },
				},
				{
					name: 'Accounts',
					path: 'accounts',
					component: function () {
						return import(/* webpackChunkName: "accounts" */ '@/views/Admin/Accounts.vue');
					},
					meta: { requiresLogin: true },
				},
				{
					name: 'Jobs',
					path: 'jobs',
					component: function () {
						return import(/* webpackChunkName: "jobs" */ '@/views/Admin/Jobs.vue');
					},
					meta: { requiresLogin: true },
				},
			],
		},
		{
			path: '/sync',

			component: function () {
				return import(/* webpackChunkName: "syncmain" */ '@/views/Sync/Sync.vue');
			},
			meta: { requiresLogin: true },
			children: [
				{
					name: 'Sync',
					path: '',
					component: function () {
						return import(/* webpackChunkName: "synclist" */ '@/views/Sync/SyncList.vue');
					},
					meta: { requiresLogin: true },
				},
				{
					path: ':key',
					component: function () {
						return import(/* webpackChunkName: "syncroom" */ '@/views/Sync/SyncRoom.vue');
					},
					meta: { requiresLogin: true },
				},
			],
		},
		{
			path: '/playlists',
			name: 'Playlists',
			component: function () {
				return import(/* webpackChunkName: "playlists" */ '@/views/Playlists.vue');
			},
			meta: { requiresLogin: true },
		},
		{
			path: '/rmvc',
			name: 'RemoteVidoeControl',
			component: function () {
				return import(/* webpackChunkName: "rmvc" */ '@/views/Rmvc.vue');
			},
			meta: { requiresLogin: false },
		},

		{ path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound },
	],
});

router.beforeEach(async (to, from, next) => {
	const auth = useAuthStore();
	if (to.matched.some((record) => record.meta.requiresLogin) && auth.loggedIn == false) {
		await auth.authenticate();
		if (auth.loggedIn == false) {
			next('/login');
		} else {
			next();
		}
	} else if (to.matched.some((record) => record.meta.requiresTeam)) {
		if (auth.userInfo.role >= 2) {
			next();
		} else {
			next(from);
		}
	} else {
		next();
	}
});

export default router;
