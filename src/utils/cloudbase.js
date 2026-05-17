/**
 * 云开发 SDK 封装与 API 服务
 * 
 * 【数据库集合清单】
 * - users: 用户信息 (role: admin/merchant/user)
 * - goods_products: 普通商品
 * - gift_products: 赠品/活动商品
 * - categories: 商品分类
 * - orders: 订单
 * - refunds: 退款记录
 * - coupons: 优惠券
 * - adoptions: 认养记录
 * - verify_logs: 核销日志
 * - chat_messages: 客服聊天记录
 * - user_messages: 用户消息通知
 * - ai_chat_history: AI客服对话记录
 * - feedbacks: 用户反馈
 * - youquan_posts: 橙友圈帖子
 * - youquan_comments: 帖子评论
 * - youquan_reports: 举报记录
 * - check_in_records: 签到记录
 * - user_points: 用户积分
 * - point_records: 积分变动记录
 * - point_goods: 积分商品
 * - point_exchanges: 积分兑换记录
 * - broadcasts: 广播消息
 * - carts: 购物车
 * - addresses: 收货地址
 * - reservations: 课程预约
 */

// src/utils/cloudbase.js
import cloudbase from '@cloudbase/js-sdk';
import { MessagePlugin } from 'tdesign-vue-next';  // 新增这一行

const app = cloudbase.init({
  env: 'cloud1-0gk1j4mb29d57fbd' // 替换为你的环境ID
});

// 匿名登录（或后续改为账号密码登录）
export async function ensureLogin() {
  const auth = app.auth({ persistence: 'local' });
  const loginState = await auth.getLoginState();
  if (!loginState) {
    await auth.signInAnonymously();
  }
  return auth;
}

export const db = app.database();
export const _ = db.command;
export { app };

// 通用云函数调用（供 PointManage.vue 等页面使用）
export async function callCloudFunction(name, payload) {
  const res = await app.callFunction({ name, data: payload });
  return res.result;
}

/**
 * 客服聊天服务
 * 【涉及数据库】chat_messages (聊天记录)
 */
async function callChatAction(action, data = {}) {
  const adminOpenid = localStorage.getItem('admin_openid');
  const res = await app.callFunction({
    name: 'chatService',
    data: { 
      action, 
      data: { ...data, adminOpenid }  // ✅ 携带管理员 openid
    }
  });
  return res.result;
}

// 自定义登录
export async function signInWithTicket(ticket) {
  const auth = app.auth({ persistence: 'local' });
  await auth.customAuthProvider().signIn(ticket);
  const loginState = await auth.getLoginState();
  return loginState;
}

// 获取当前登录用户信息
export async function getCurrentUser() {
  const auth = app.auth({ persistence: 'local' });
  const loginState = await auth.getLoginState();
  if (!loginState) return null;
  return loginState.user;
}

// 登出
export async function logout() {
  const auth = app.auth({ persistence: 'local' });
  await auth.signOut();
}

/**
 * 客服聊天服务
 * 【涉及数据库】chat_messages
 */
export const chatService = {
  // 管理员：获取会话列表
  listSessions: () => callChatAction('listSessions'),
  // 管理员：获取与某用户的聊天记录
  getSessionMessages: (targetOpenid) => callChatAction('getSessionMessages', { targetOpenid }),
  // 管理员：回复用户
  adminReply: (toOpenid, content) => callChatAction('adminReply', { toOpenid, content }),

  /**
   * 监听新会话和消息 (替代轮询)
   * @param {function} onData - 收到数据更新时的回调函数
   * @returns {object} watcher - 用于关闭监听的 watcher 对象
   */
  watchSessions: (onData) => {
    // 【实时监听】chat_messages 集合
    const watcher = db.collection('chat_messages')
      .where({ toOpenid: 'support' })
      .watch({
        onChange: (snapshot) => {
          console.log('实时数据更新:', snapshot);
          onData(snapshot.docs);
        },
        onError: (err) => {
          console.error('监听失败:', err); // 修改为 console.error
        }
      });
    return watcher;
  }
};

// src/utils/cloudbase.js
// ... 原有代码保持不变 ...

/**
 * 商品管理服务
 * 【涉及数据库】goods_products (普通商品), gift_products (赠品), categories (分类)
 */
async function callGoodsAction(action, data = {}) {
  const adminOpenid = localStorage.getItem('admin_openid');
  const res = await app.callFunction({
    name: 'goodsCenter',
    data: { 
      action, 
      data: { ...data, adminOpenid }   // 携带管理员 openid
    }
  });
  return res.result;
}

/**
 * 反馈管理服务
 * 【涉及数据库】feedbacks
 */
async function callFeedbackAction(action, data = {}) {
  const adminOpenid = localStorage.getItem('admin_openid');
  const res = await app.callFunction({
    name: 'feedbackManage',
    data: {
      action,
      data: { ...data, adminOpenid }
    }
  });
  return res.result;
}

export const feedbackService = {
  // 获取所有反馈
  list: () => callFeedbackAction('list'),
  // 标记某条反馈为已处理
  markProcessed: (feedbackId) => callFeedbackAction('markProcessed', { feedbackId }),
  markAllProcessed: () => callFeedbackAction('markAllProcessed')  // ✅ 新增
};

/**
 * AI客服服务
 * 【涉及数据库】ai_chat_history
 */
export const aiChatService = {
  // 获取所有用户与AI的会话列表
  listSessions: async () => {
    const adminOpenid = localStorage.getItem('admin_openid');
    const res = await app.callFunction({
      name: 'aiCustomerService',
      data: { 
        action: 'listSessions',
        adminOpenid
      }
    });
    return res.result;
  },
  // 获取指定用户的完整AI对话历史
  getUserHistory: async (userId) => {
    const adminOpenid = localStorage.getItem('admin_openid');
    const res = await app.callFunction({
      name: 'aiCustomerService',
      data: {
        action: 'getUserHistory',
        userId,
        adminOpenid
      }
    });
    return res.result;
  }
};

/**
 * 商品管理中心
 * 【涉及数据库】goods_products, gift_products, categories
 */
export const goodsCenter = {
  // 获取全部商品（管理员）- 操作 goods_products
  listAllGoods: () => callGoodsAction('listAllGoods'),
  // 获取当前用户商品（商家）- 操作 goods_products
  listMyGoods: () => callGoodsAction('listMyGoods'),
  // 提交新商品（商家/管理员）- 操作 goods_products
  submitGoods: (goodsData) => callGoodsAction('submitGoods', goodsData),
  // 更新商品 - 操作 goods_products
  updateGoods: (id, goodsData) => callGoodsAction('updateGoods', { _id: id, ...goodsData }),
  // 删除商品 - 操作 goods_products
  deleteGoods: (id) => callGoodsAction('deleteGoods', { id }),
  // 上下架 - 操作 goods_products
  toggleShelf: (id, onShelf) => callGoodsAction('toggleShelf', { id, onShelf }),
  // 获取分类列表 - 操作 categories
  listCategories: () => callGoodsAction('listCategories'),
  // 创建分类 - 操作 categories
  createCategory: (name, id) => callGoodsAction('createCategory', { name, id }),
  // 更新分类 - 操作 categories
  updateCategory: (id, name) => callGoodsAction('updateCategory', { id, name }),
  // 删除分类 - 操作 categories
  deleteCategory: (id) => callGoodsAction('deleteCategory', { id }),
  // 赠送商品相关 - 操作 gift_products
  listGiftGoods: () => callGoodsAction('listGiftGoods'),
  submitGiftGoods: (goodsData) => callGoodsAction('submitGiftGoods', goodsData),
  updateGiftGoods: (id, goodsData) => callGoodsAction('updateGiftGoods', { _id: id, ...goodsData }),
  deleteGiftGoods: (id) => callGoodsAction('deleteGiftGoods', { id }),
  toggleGiftShelf: (id, onShelf) => callGoodsAction('toggleGiftShelf', { id, onShelf })
};

/**
 * 优惠券管理 API
 * 【涉及数据库】coupons
 */
async function callCouponAction(action, data = {}) {
  const adminOpenid = localStorage.getItem('admin_openid');
  const res = await app.callFunction({
    name: 'couponManage',
    data: {
      action,
      data: { ...data, adminOpenid }
    }
  });
  return res.result;
}

export const couponService = {
  // 操作 coupons 集合
  list: () => callCouponAction('list'),
  create: (couponData) => callCouponAction('create', couponData),
  update: (id, couponData) => callCouponAction('update', { _id: id, ...couponData }),
  delete: (id) => callCouponAction('delete', { id }),
  getDetail: (id) => callCouponAction('getDetail', { id })
};

/**
 * 审核管理 API
 * 【涉及数据库】merchant_applications (商家申请), goods_products (商品审核), users
 */
async function callMerchantApplicationAction(action, data = {}) {
  const adminOpenid = localStorage.getItem('admin_openid');
  const res = await app.callFunction({
    name: 'merchantApplication',
    data: {
      action,
      data: { ...data, adminOpenid }
    }
  });
  return res.result;
}

export const auditService = {
  // 商家申请列表 - 操作 merchant_applications
  listMerchantApplications: () => callMerchantApplicationAction('list'),
  // 审核商家申请 (通过/驳回) - 操作 merchant_applications, users
  reviewMerchantApplication: (applicationId, approved, rejectReason = '') =>
    callMerchantApplicationAction('review', { applicationId, approved, rejectReason }),

  // 商品待审核列表 - 操作 goods_products
  listPendingGoods: async () => {
    const adminOpenid = localStorage.getItem('admin_openid');
    const res = await app.callFunction({
      name: 'goodsCenter',
      data: {
        action: 'listPendingGoods',
        data: { adminOpenid }
      }
    });
    return res.result;
  },
  // 审核商品 (通过/驳回) - 操作 goods_products
  reviewGoods: async (id, approved, rejectReason = '') => {
    const adminOpenid = localStorage.getItem('admin_openid');
    const res = await app.callFunction({
      name: 'goodsCenter',
      data: {
        action: 'reviewGoods',
        data: { id, approved, rejectReason, adminOpenid }
      }
    });
    return res.result;
  }
};

/**
 * 用户信息查询 API
 * 【涉及数据库】users, orders, adoptions, carts 等
 */
async function callUserInfoQuery(action, data = {}) {
  const adminOpenid = localStorage.getItem('admin_openid');
  const res = await app.callFunction({
    name: 'userInfoQuery',
    data: {
      action,
      data: { ...data, adminOpenid }
    }
  });
  return res.result;
}

export const userInfoService = {
  // 查询用户完整信息 - 操作 users, orders, adoptions 等
  getFullInfo: (targetOpenid) => callUserInfoQuery('getUserFullInfo', { targetOpenid }),
  // 搜索用户 - 操作 users
  searchUsers: (keyword) => callUserInfoQuery('searchUsers', { keyword })
};

/**
 * 信息广播 API
 * 【涉及数据库】broadcasts (广播), user_messages (用户消息)
 */
async function callMessageCenterAction(action, data = {}) {
  const adminOpenid = localStorage.getItem('admin_openid');
  const res = await app.callFunction({
    name: 'messageCenter',
    data: {
      action,
      data: { ...data, adminOpenid }
    }
  });
  return res.result;
}

export const broadcastService = {
  // 发送广播消息（管理员）- 操作 broadcasts, user_messages
  broadcast: (title, content) => callMessageCenterAction('broadcast', { title, content }),
  // 查询广播历史（管理员）- 操作 broadcasts
  listHistory: () => callMessageCenterAction('listBroadcastHistory'),
  // 删除广播（管理员）- 操作 broadcasts
  deleteBroadcast: (id) => callMessageCenterAction('deleteBroadcast', { id })
};

/**
 * 数据统计 API
 * 【涉及数据库】orders, users, goods_products 等
 */
async function calldataDashboard(action, data = {}) {
  const adminOpenid = localStorage.getItem('admin_openid');
  const res = await app.callFunction({
    name: 'dataDashboard',
    data: {
      action,
      data: { ...data, adminOpenid }
    }
  });
  return res.result;
}

export const statService = {
  // 获取仪表盘数据 - 操作 orders, users, goods_products
  getDashboard: (params) => calldataDashboard('getDashboard', params),
  // 获取销售趋势 - 操作 orders
  getSalesTrend: (params) => calldataDashboard('getSalesTrend', params)
};

/**
 * 橙友圈管理 API
 * 【涉及数据库】youquan_posts, youquan_comments, youquan_reports
 */
async function callYouquanAction(action, data = {}) {
  const adminOpenid = localStorage.getItem('admin_openid');
  const res = await app.callFunction({
    name: 'youquan',
    data: {
      action,
      data: { ...data, adminOpenid }
    }
  });
  return res.result;
}

export const youquanService = {
  // 帖子管理 - 操作 youquan_posts
  adminListPosts: (params) => callYouquanAction('adminListPosts', params),
  adminDeletePost: (postId) => callYouquanAction('adminDeletePost', { postId }),
  adminHidePost: (postId) => callYouquanAction('adminHidePost', { postId }),
  adminUnhidePost: (postId) => callYouquanAction('adminUnhidePost', { postId }),
  // 评论管理 - 操作 youquan_comments
  adminListComments: (params) => callYouquanAction('adminListComments', params),
  adminDeleteComment: (commentId) => callYouquanAction('adminDeleteComment', { commentId }),
  adminHideComment: (commentId) => callYouquanAction('adminHideComment', { commentId }),
  adminUnhideComment: (commentId) => callYouquanAction('adminUnhideComment', { commentId }),
  // 举报管理 - 操作 youquan_reports
  adminListReports: (params) => callYouquanAction('adminListReports', params),
  adminProcessReport: (reportId, action, resultText) => callYouquanAction('adminProcessReport', { reportId, action, resultText })
};

/**
 * 订单管理 API
 * 【涉及数据库】orders
 */
async function callOrderAction(action, data = {}) {
  const adminOpenid = localStorage.getItem('admin_openid');
  const res = await app.callFunction({
    name: 'orderManageCenter',
    data: { action, data: { ...data, adminOpenid } }
  });
  return res.result;
}

export const orderService = {
  // 订单列表 - 操作 orders
  listOrders: () => callOrderAction('listOrders'),
  // 订单详情 - 操作 orders
  getOrderDetail: (orderId) => callOrderAction('getOrderDetail', { orderId })
};

/**
 * 发货 API
 * 【涉及数据库】orders
 */
async function callShipAction(action, data = {}) {
  const adminOpenid = localStorage.getItem('admin_openid');
  const res = await app.callFunction({
    name: 'shipOrder',
    data: { ...data, adminOpenid }
  });
  return res.result;
}

export const shipService = {
  // 发货 - 操作 orders
  shipOrder: (orderId, logisticsCompany) => callShipAction('ship', { orderId, logisticsCompany })
};

/**
 * 退款管理 API
 * 【涉及数据库】refunds, orders
 */
async function callRefundAction(action, data = {}) {
  const adminOpenid = localStorage.getItem('admin_openid');
  const res = await app.callFunction({
    name: 'refundManage',
    data: { action, data: { ...data, adminOpenid } }
  });
  return res.result;
}

export const refundService = {
  // 退款列表 - 操作 refunds, orders
  listRefunds: () => callRefundAction('listRefunds'),
  // 处理退款 - 操作 refunds, orders
  processRefund: (refundId, approved, processNote) => callRefundAction('processRefund', { refundId, approved, processNote })
};

/**
 * 云存储图片临时 URL 获取
 * 【涉及存储】云存储 (非数据库)
 * 
 * @param {string[]} fileIDs - 云存储 fileID 数组
 * @returns {Promise<Object>} { success, fileList, error }
 */
export async function getTempImageUrls(fileIDs) {
  if (!fileIDs || fileIDs.length === 0) {
    return { success: true, fileList: [] };
  }
  const res = await app.callFunction({
    name: 'getYouquanImages',
    data: { fileIDs }
  });
  return res.result;
}

/**
 * 认养管理 API
 * 【涉及数据库】adoptions, verify_logs, users
 */
async function callAdoptionAction(action, data = {}) {
  const adminOpenid = localStorage.getItem('admin_openid');
  const res = await app.callFunction({
    name: 'adoptionManager',
    data: { action, data: { ...data, adminOpenid } }
  });
  return res.result;
}

export const adoptionService = {
  // 获取认养列表（管理员）- 操作 adoptions, users
  listAdoptions: async () => {
    const adminOpenid = localStorage.getItem('admin_openid');
    // 调用云函数获取认养列表（管理员权限）
    const res = await app.callFunction({
      name: 'adoptionManager',
      data: { 
        action: 'adminList',
        data: { adminOpenid }
      }
    });
    return res.result;
  },
  // 核销认养
  verifyAdoption: (verifyCode) => callAdoptionAction('verify', { verifyCode }),
  // 核销权益
  verifyBenefit: (code) => callAdoptionAction('verifyBenefit', { code }),
  // 查询核销码
  queryByVerifyCode: async (code) => {
    const adminOpenid = localStorage.getItem('admin_openid');
    const res = await app.callFunction({
      name: 'adoptionManager',
      data: { 
        action: 'queryByCode',
        data: { code, adminOpenid }
      }
    });
    return res.result;
  },
  // 获取核销记录
  getVerifyLogs: async (adoptionId) => {
    const adminOpenid = localStorage.getItem('admin_openid');
    const res = await app.callFunction({
      name: 'adoptionManager',
      data: { 
        action: 'getVerifyLogs',
        data: { adoptionId, adminOpenid }
      }
    });
    return res.result;
  }
};

/**
 * 积分商城管理 API
 * 【涉及数据库】point_goods, point_virtual_goods, point_exchanges, point_rules
 */
async function callPointMallAction(action, data = {}) {
  const adminOpenid = localStorage.getItem('admin_openid');
  const res = await app.callFunction({
    name: 'pointMallManage',
    data: { action, data: { ...data, adminOpenid } }
  });
  return res.result;
}

export const pointMallService = {
  // 积分商品管理 - 操作 point_goods
  listPointGoods: (params) => callPointMallAction('listPointGoods', params),
  addPointGoods: (data) => callPointMallAction('addPointGoods', data),
  updatePointGoods: (data) => callPointMallAction('updatePointGoods', data),
  deletePointGoods: (id) => callPointMallAction('deletePointGoods', { id }),
  togglePointGoodsStatus: (id, onShelf) => callPointMallAction('togglePointGoodsStatus', { id, onShelf }),

  // 虚拟商品管理 - 操作 point_virtual_goods
  listVirtualGoods: (params) => callPointMallAction('listVirtualGoods', params),
  addVirtualGoods: (data) => callPointMallAction('addVirtualGoods', data),
  updateVirtualGoods: (data) => callPointMallAction('updateVirtualGoods', data),
  deleteVirtualGoods: (id) => callPointMallAction('deleteVirtualGoods', { id }),
  toggleVirtualGoodsStatus: (id, onShelf) => callPointMallAction('toggleVirtualGoodsStatus', { id, onShelf }),

  // 兑换记录 - 操作 point_exchanges
  listExchanges: (params) => callPointMallAction('listExchanges', params),
  shipExchange: (id, logisticsCompany, logisticsNo) => callPointMallAction('shipExchange', { id, logisticsCompany, logisticsNo }),
  completeExchange: (id) => callPointMallAction('completeExchange', { id }),

  // 积分规则 - 操作 point_rules
  getPointRules: () => callPointMallAction('getPointRules'),
  updatePointRules: (data) => callPointMallAction('updatePointRules', data)
};