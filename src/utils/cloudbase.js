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

// 封装 chatService 云函数调用
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

// 新增：封装 goodsCenter 云函数调用
// cloudbase.js 中
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

// 新增：封装 feedbackManage 云函数调用
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

// src/utils/cloudbase.js（在现有代码中追加）

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

export const goodsCenter = {
  // 获取全部商品（管理员）
  listAllGoods: () => callGoodsAction('listAllGoods'),
  // 获取当前用户商品（商家）
  listMyGoods: () => callGoodsAction('listMyGoods'),
  // 提交新商品（商家/管理员）
  submitGoods: (goodsData) => callGoodsAction('submitGoods', goodsData),
  // 更新商品
  updateGoods: (id, goodsData) => callGoodsAction('updateGoods', { _id: id, ...goodsData }),
  // 删除商品
  deleteGoods: (id) => callGoodsAction('deleteGoods', { id }),
  // 上下架
  toggleShelf: (id, onShelf) => callGoodsAction('toggleShelf', { id, onShelf })
};

// ========== 优惠券管理 API ==========
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
  list: () => callCouponAction('list'),
  create: (couponData) => callCouponAction('create', couponData),
  update: (id, couponData) => callCouponAction('update', { _id: id, ...couponData }),
  delete: (id) => callCouponAction('delete', { id }),
  getDetail: (id) => callCouponAction('getDetail', { id })
};

// ========== 审核管理 API ==========
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
  // 商家申请列表
  listMerchantApplications: () => callMerchantApplicationAction('list'),
  // 审核商家申请 (通过/驳回)
  reviewMerchantApplication: (applicationId, approved, rejectReason = '') =>
    callMerchantApplicationAction('review', { applicationId, approved, rejectReason }),

  // 商品待审核列表
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
  // 审核商品 (通过/驳回)
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

// ========== 用户信息查询 API ==========
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
  getFullInfo: (targetOpenid) => callUserInfoQuery('getUserFullInfo', { targetOpenid }),
  searchUsers: (keyword) => callUserInfoQuery('searchUsers', { keyword })
};

// ========== 信息广播 API ==========
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
  // 发送广播消息（管理员）
  broadcast: (title, content) => callMessageCenterAction('broadcast', { title, content }),
  // 查询广播历史（管理员）
  listHistory: () => callMessageCenterAction('listBroadcastHistory'),
  // 删除广播（管理员）
  deleteBroadcast: (id) => callMessageCenterAction('deleteBroadcast', { id })
};

// ========== 数据统计 API ==========
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
  getDashboard: (params) => calldataDashboard('getDashboard', params),
  getSalesTrend: (params) => calldataDashboard('getSalesTrend', params)
};

// ========== 橙友圈管理 API ==========
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
  // 管理员获取帖子列表
  adminListPosts: (params) => callYouquanAction('adminListPosts', params),
  // 管理员删除帖子
  adminDeletePost: (postId) => callYouquanAction('adminDeletePost', { postId }),
  // 管理员隐藏帖子
  adminHidePost: (postId) => callYouquanAction('adminHidePost', { postId }),
  // 管理员取消隐藏帖子
  adminUnhidePost: (postId) => callYouquanAction('adminUnhidePost', { postId }),
  // 管理员获取评论列表
  adminListComments: (params) => callYouquanAction('adminListComments', params),
  // 管理员删除评论
  adminDeleteComment: (commentId) => callYouquanAction('adminDeleteComment', { commentId }),
  // 管理员隐藏评论
  adminHideComment: (commentId) => callYouquanAction('adminHideComment', { commentId }),
  // 管理员取消隐藏评论
  adminUnhideComment: (commentId) => callYouquanAction('adminUnhideComment', { commentId }),
  // 管理员获取举报列表
  adminListReports: (params) => callYouquanAction('adminListReports', params),
  // 管理员处理举报
  adminProcessReport: (reportId, action, resultText) => callYouquanAction('adminProcessReport', { reportId, action, resultText })
};

// ========== 云存储图片临时 URL 获取 ==========
/**
 * 批量将云存储 fileID 转换为临时访问 URL
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