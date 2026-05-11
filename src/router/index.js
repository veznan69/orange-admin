import { createRouter, createWebHistory } from 'vue-router';
import GoodsManage from '../views/GoodsManage.vue';
import Login from '../views/Login.vue';
import FeedbackManage from '../views/FeedbackManage.vue';
import ChatDashboard from '../views/ChatDashboard.vue';  // 统一组件

const routes = [
  { path: '/login', component: Login, meta: { requiresAuth: false } },
  { path: '/', redirect: '/dashboard' },
  { path: '/goods', component: GoodsManage, meta: { requiresAuth: true } },
  // 客服管理改为两个子路由
  { path: '/chat/manual', component: ChatDashboard, props: { mode: 'manual' }, meta: { requiresAuth: true } },
  { path: '/chat/ai', component: ChatDashboard, props: { mode: 'ai' }, meta: { requiresAuth: true } },
  { path: '/chat', redirect: '/chat/manual' },  // 兼容旧路径
  { path: '/feedbacks', component: FeedbackManage, meta: { requiresAuth: true } },
  { path: '/audit', component: () => import('../views/AuditManage.vue'), meta: { requiresAuth: true } },
  { path: '/coupon', component: () => import('../views/CouponManage.vue'), meta: { requiresAuth: true } },
  { path: '/user-info', component: () => import('../views/UserInfoQuery.vue'), meta: { requiresAuth: true } },
  { path: '/dashboard', component: () => import('../views/Dashboard.vue'), meta: { requiresAuth: true } },
  { path: '/broadcast', component: () => import('../views/BroadcastManage.vue'), meta: { requiresAuth: true } },
  { path: '/circle', component: () => import('../views/CircleManage.vue'), meta: { requiresAuth: true } }
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