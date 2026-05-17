/**
 * 路由 → 云函数 → 数据库 映射配置
 * 修改此文件即可动态更新"系统信息"Tab 的展示内容
 *
 * 格式说明：
 * - route: 前端路由路径
 * - label: 侧边栏显示名称
 * - icon: TDesign 图标名称
 * - cloudFunctions: 该页面调用的云函数列表
 * - databases: 该页面涉及的数据库集合列表
 * - adminOnly: 是否仅管理员可见
 */
export const routeServiceMap = [
  // ========== 固定顶部 ==========
  {
    route: '/dashboard',
    label: '数据看板',
    icon: 'chart-bar',
    adminOnly: true,
    cloudFunctions: ['dataDashboard'],
    databases: ['orders', 'goods_products', 'users', 'adoptions', 'verify_logs']
  },
  // ========== 常规菜单 ==========
  {
    route: '/goods',
    label: '商品管理',
    icon: 'shop',
    adminOnly: false,
    cloudFunctions: ['goodsCenter'],
    databases: ['goods_products', 'gift_products', 'categories']
  },
  {
    route: '/orders',
    label: '订单管理',
    icon: 'cart',
    adminOnly: false,
    cloudFunctions: ['orderManageCenter', 'refundManage', 'shipOrder', 'mockShipment'],
    databases: ['orders', 'refunds', 'goods_products', 'users']
  },
  {
    route: '/coupon',
    label: '优惠券管理',
    icon: 'wallet',
    adminOnly: true,
    cloudFunctions: ['couponManage', 'couponManager'],
    databases: ['user_coupons', 'coupon_templates', 'users']
  },
  {
    route: '/chat/manual',
    label: '人工客服',
    icon: 'user',
    adminOnly: true,
    cloudFunctions: ['chatService'],
    databases: ['chat_messages', 'users']
  },
  {
    route: '/chat/ai',
    label: 'AI客服记录',
    icon: 'robot',
    adminOnly: true,
    cloudFunctions: ['aiCustomerService'],
    databases: ['ai_chat_records', 'users']
  },
  {
    route: '/audit',
    label: '审核管理',
    icon: 'file-excel',
    adminOnly: true,
    cloudFunctions: ['merchantApplication'],
    databases: ['merchant_applications', 'users']
  },
  {
    route: '/user-info',
    label: '用户信息查询',
    icon: 'user-search',
    adminOnly: true,
    cloudFunctions: ['userInfoQuery'],
    databases: ['users', 'adoptions', 'orders', 'point_records', 'user_points']
  },
  {
    route: '/feedbacks',
    label: '投诉建议',
    icon: 'notification',
    adminOnly: true,
    cloudFunctions: ['feedbackManage'],
    databases: ['feedbacks', 'users']
  },
  {
    route: '/broadcast',
    label: '信息广播',
    icon: 'mail',
    adminOnly: true,
    cloudFunctions: ['messageCenter'],
    databases: ['broadcast_messages', 'users']
  },
  {
    route: '/adoption',
    label: '认养管理',
    icon: 'app',
    adminOnly: true,
    cloudFunctions: ['adoptionManager'],
    databases: ['adoptions', 'verify_logs', 'users', 'benefit_manager']
  },
  {
    route: '/circle',
    label: '橙友圈管理',
    icon: 'chat',
    adminOnly: true,
    cloudFunctions: ['youquan'],
    databases: ['youquan_posts', 'youquan_comments', 'youquan_reports', 'users']
  },
  {
    route: '/point-manage',
    label: '积分商城管理',
    icon: 'discount',
    adminOnly: true,
    cloudFunctions: ['pointMallManage', 'pointsManager'],
    databases: ['point_goods', 'point_virtual_goods', 'point_exchanges', 'point_rules', 'user_points', 'point_records']
  },
  // ========== 固定底部 ==========
  {
    route: '/data-manage',
    label: '数据管理',
    icon: 'delete',
    adminOnly: true,
    cloudFunctions: ['dataDashboard', 'userInfoQuery'],
    databases: ['orders', 'refunds', 'users', 'adoptions', 'verify_logs', 'point_records']
  },
  // ========== 系统信息（新增 Tab）==========
  {
    route: '/system-info',
    label: '系统信息',
    icon: 'server',
    adminOnly: true,
    cloudFunctions: [],
    databases: []
  }
];

/**
 * 获取固定顶部的路由列表
 */
export function getPinnedTopRoutes() {
  return routeServiceMap.filter(r => r.route === '/dashboard');
}

/**
 * 获取固定底部的路由列表
 * 顺序：系统信息 → 数据管理（数据管理永远在最底边）
 */
export function getPinnedBottomRoutes() {
  return [
    routeServiceMap.find(r => r.route === '/system-info'),
    routeServiceMap.find(r => r.route === '/data-manage')
  ].filter(Boolean);
}

/**
 * 获取常规菜单路由列表（不含固定顶底和系统信息）
 */
export function getNormalRoutes() {
  return routeServiceMap.filter(r =>
    r.route !== '/dashboard' &&
    r.route !== '/data-manage' &&
    r.route !== '/system-info'
  );
}

/**
 * 根据路由获取配置
 */
export function getRouteConfig(route) {
  return routeServiceMap.find(r => r.route === route) || null;
}
