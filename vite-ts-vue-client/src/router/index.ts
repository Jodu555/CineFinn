import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import Home from '@/views/Home.vue';
import Login from '@/views/Login.vue';

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
			path: '/watch',
			name: 'Watch',
			component: function () {
				return import(/* webpackChunkName: "watch" */ '../views/Watch.vue');
			},
			meta: { requiresLogin: true },
		},
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
	} else {
		next();
	}
});

export default router;
