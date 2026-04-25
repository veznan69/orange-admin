import { createRouter, createWebHistory } from 'vue-router';
import GoodsManage from '../views/GoodsManage.vue';
import ChatManage from '../views/ChatManage.vue';
import Login from '../views/Login.vue';

const routes = [
  { path: '/login', component: Login, meta: { requiresAuth: false } },
  { path: '/', redirect: '/goods' },
  { path: '/goods', component: GoodsManage, meta: { requiresAuth: true } },
  { path: '/chat', component: ChatManage, meta: { requiresAuth: true } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 全局前置守卫
router.beforeEach((to, from, next) => {
  const isLoggedIn = localStorage.getItem('admin_logged_in') === 'true';
  const role = localStorage.getItem('admin_role');

  if (to.meta.requiresAuth) {
    if (isLoggedIn && role === 'admin') {
      next();
    } else {
      next('/login');
    }
  } else {
    next();
  }
});

export default router;