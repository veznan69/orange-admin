import { createRouter, createWebHistory } from 'vue-router';
import GoodsManage from '../views/GoodsManage.vue';
import Login from '../views/Login.vue';
import FeedbackManage from '../views/FeedbackManage.vue';
import ChatDashboard from '../views/ChatDashboard.vue';  // 统一组件

const routes = [
  { path: '/login', component: Login, meta: { requiresAuth: false } },
  { path: '/', redirect: '/dashboard' },
  { path: '/goods', component: GoodsManage, meta: { requiresAuth: true, roles: ['admin', 'merchant'] } },
  { path: '/orders', component: () => import('../views/OrderManage.vue'), meta: { requiresAuth: true, roles: ['admin', 'merchant'] } },
  // 客服管理改为两个子路由
  { path: '/chat/manual', component: ChatDashboard, props: { mode: 'manual' }, meta: { requiresAuth: true, roles: ['admin'] } },
  { path: '/chat/ai', component: ChatDashboard, props: { mode: 'ai' }, meta: { requiresAuth: true, roles: ['admin'] } },
  { path: '/chat', redirect: '/chat/manual' },
  { path: '/feedbacks', component: FeedbackManage, meta: { requiresAuth: true, roles: ['admin'] } },
  { path: '/audit', component: () => import('../views/AuditManage.vue'), meta: { requiresAuth: true, roles: ['admin'] } },
  { path: '/coupon', component: () => import('../views/CouponManage.vue'), meta: { requiresAuth: true, roles: ['admin'] } },
  { path: '/user-info', component: () => import('../views/UserInfoQuery.vue'), meta: { requiresAuth: true, roles: ['admin'] } },
  { path: '/dashboard', component: () => import('../views/Dashboard.vue'), meta: { requiresAuth: true, roles: ['admin'] } },
  { path: '/broadcast', component: () => import('../views/BroadcastManage.vue'), meta: { requiresAuth: true, roles: ['admin'] } },
  { path: '/circle', component: () => import('../views/CircleManage.vue'), meta: { requiresAuth: true, roles: ['admin'] } },
  { path: '/data-manage', component: () => import('../views/DataManage.vue'), meta: { requiresAuth: true, roles: ['admin'] } },
  { path: '/adoption', component: () => import('../views/AdoptionManage.vue'), meta: { requiresAuth: true, roles: ['admin'] } },
  { path: '/point-manage', component: () => import('../views/PointManage.vue'), meta: { requiresAuth: true, roles: ['admin'] } },
  // 系统信息（云函数 & 数据库映射）
  { path: '/system-info', component: () => import('../views/SystemInfo.vue'), meta: { requiresAuth: true, roles: ['admin'] } }
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
    if (!isLoggedIn) {
      next('/login');
      return;
    }
    const allowedRoles = to.meta.roles || ['admin'];
    if (allowedRoles.includes(role)) {
      next();
    } else {
      // 商家无权限访问admin页面，重定向到商品管理
      next('/goods');
    }
  } else {
    next();
  }
});

export default router;