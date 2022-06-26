import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Login from '@/views/Login.vue'

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
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.matched.some(record => record.meta.requiresLogin) && store.state.auth.loggedIn == false) {
    next("/login")
  } else {
    next()
  }
})

export default router
