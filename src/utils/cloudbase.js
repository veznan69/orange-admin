// src/utils/cloudbase.js
import cloudbase from '@cloudbase/js-sdk';

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
  const res = await app.callFunction({
    name: 'chatService',
    data: { action, data }
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