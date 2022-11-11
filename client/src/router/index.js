import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import Login from '@/views/Login.vue';
import NotFound from '@/views/NotFound.vue';

import store from '@/store/index';

const routes = [
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
		path: '/watch',
		name: 'Watch',
		component: function () {
			return import(/* webpackChunkName: "about" */ '../views/Watch.vue');
		},
		meta: { requiresLogin: true },
	},
	{
		path: '/news',
		name: 'News',
		component: function () {
			return import(/* webpackChunkName: "about" */ '../views/News.vue');
		},
		meta: { requiresLogin: true },
	},
	{ path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound },
];

// const rBase = location.hostname == 'localhost' ? process.env.BASE_URL : '/cinema/'
const rBase = location.hostname == 'localhost' ? './' : './';
// const rBase = './';
// console.log({ rBase, hst: location.hostname });
// history: createWebHistory(process.env.BASE_URL),

const router = createRouter({
	base: rBase,
	history: createWebHistory(rBase),
	routes,
});

router.beforeEach(async (to, from, next) => {
	if (
		to.matched.some((record) => record.meta.requiresLogin) &&
		store.state.auth.loggedIn == false
	) {
		await store.dispatch('auth/authenticate');
		if (store.state.auth.loggedIn == false) {
			next('/login');
		} else {
			next();
		}
	} else {
		next();
	}
});

export default router;
