import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Login from '@/views/Login.vue'
import NotFound from '@/views/NotFound.vue'

import store from '@/store/index'

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
    meta: { requiresLogin: true }
  },
  {
    path: '/watch',
    name: 'Watch',
    component: function () {
      return import(/* webpackChunkName: "about" */ '../views/Watch.vue')
    },
    meta: { requiresLogin: true }
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound },
]

// console.log(process.env.BASE_URL);
const router = createRouter({
  history: createWebHistory('./'),
  // history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach(async (to, from, next) => {
  if (to.matched.some(record => record.meta.requiresLogin) && store.state.auth.loggedIn == false) {
    await store.dispatch('auth/authenticate');
    if (store.state.auth.loggedIn == false) {
      next("/login")
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
