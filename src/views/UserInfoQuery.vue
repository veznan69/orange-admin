<template>
    <div class="user-info-query">
      <!-- 搜索栏 -->
      <t-card :bordered="false" class="header-card">
        <div class="search-area">
          <t-input
            v-model="searchKeyword"
            placeholder="输入用户昵称或 OpenID"
            clearable
            style="width: 400px;"
            @enter="handleSearch"
          />
          <t-button theme="primary" @click="handleSearch" :loading="searchLoading">
            搜索
          </t-button>
        </div>
      </t-card>
  
      <!-- 搜索结果列表 -->
      <t-card v-if="showList && userList.length > 0" :bordered="false" class="list-card">
        <div class="list-header">搜索结果（{{ userList.length }} 人）</div>
        <div
          v-for="user in userList"
          :key="user.openid"
          class="user-row"
          @click="selectUser(user.openid)"
        >
          <t-avatar :image="user.avatarUrl" size="44px">
            {{ user.nickName?.charAt(0) || '用' }}
          </t-avatar>
          <div class="user-row-info">
            <span class="row-nick">{{ user.nickName }}</span>
            <span class="row-openid">{{ user.openid }}</span>
          </div>
        </div>
      </t-card>
  
      <!-- 无结果或未搜索 -->
      <t-card v-if="showList && userList.length === 0 && !searchLoading" :bordered="false" class="empty-card">
        <t-empty description="未找到匹配的用户" />
      </t-card>
  
      <!-- 用户详情 -->
      <t-card v-if="currentUserData" :bordered="false" class="info-card">
        <div class="detail-header">
          <t-button variant="text" @click="backToList">
            <t-icon name="chevron-left" /> 返回列表
          </t-button>
        </div>
  
        <div class="user-header">
          <t-avatar :image="currentUserData.userInfo?.avatarUrl" size="60px">
            {{ currentUserData.userInfo?.nickName?.charAt(0) || '用' }}
          </t-avatar>
          <div class="user-basic">
            <span class="user-nick">{{ currentUserData.userInfo?.nickName || '未知用户' }}</span>
            <span class="user-openid">{{ currentOpenid }}</span>
          </div>
        </div>
  
        <t-tabs v-model="activeTab">
          <!-- 基本信息 -->
          <t-tab-panel value="basic" label="基本信息">
            <t-descriptions bordered :column="2">
              <t-descriptions-item label="昵称">{{ currentUserData.userInfo?.nickName || '-' }}</t-descriptions-item>
              <t-descriptions-item label="角色">{{ currentUserData.userInfo?.role || 'user' }}</t-descriptions-item>
              <t-descriptions-item label="会员等级">{{ currentUserData.userInfo?.memberLevel || '-' }}</t-descriptions-item>
              <t-descriptions-item label="手机号">{{ currentUserData.userInfo?.phone || '-' }}</t-descriptions-item>
              <t-descriptions-item label="注册时间">{{ formatTime(currentUserData.userInfo?.createTime) }}</t-descriptions-item>
              <t-descriptions-item label="最后登录">{{ formatTime(currentUserData.userInfo?.lastLoginTime) }}</t-descriptions-item>
            </t-descriptions>
  
            <h4 style="margin-top: 24px;">积分信息</h4>
            <t-descriptions bordered :column="2" v-if="currentUserData.pointsInfo">
              <t-descriptions-item label="总积分">{{ currentUserData.pointsInfo.totalPoints || 0 }}</t-descriptions-item>
              <t-descriptions-item label="可用积分">{{ currentUserData.pointsInfo.availablePoints || 0 }}</t-descriptions-item>
              <t-descriptions-item label="已用积分">{{ currentUserData.pointsInfo.usedPoints || 0 }}</t-descriptions-item>
            </t-descriptions>
            <t-empty v-else description="暂无积分信息" />
  
            <h4 style="margin-top: 24px;">收货地址</h4>
            <t-table
              v-if="currentUserData.addresses?.length"
              :data="currentUserData.addresses"
              :columns="addressColumns"
              row-key="_id"
              size="small"
            />
            <t-empty v-else description="暂无收货地址" />
          </t-tab-panel>
  
          <!-- 优惠券 -->
          <t-tab-panel value="coupon" label="优惠券">
            <t-descriptions bordered :column="3">
              <t-descriptions-item label="总数">{{ currentUserData.couponStats?.total || 0 }}</t-descriptions-item>
              <t-descriptions-item label="未使用">{{ currentUserData.couponStats?.unused || 0 }}</t-descriptions-item>
              <t-descriptions-item label="已使用">{{ currentUserData.couponStats?.used || 0 }}</t-descriptions-item>
            </t-descriptions>
          </t-tab-panel>
  
          <!-- 订单 -->
          <t-tab-panel value="orders" label="订单列表">
            <t-table
              :data="currentUserData.orders || []"
              :columns="orderColumns"
              row-key="_id"
              :pagination="orderPagination"
              @page-change="onOrderPageChange"
              size="small"
            >
              <template #status="{ row }">
                <t-tag :theme="getOrderTheme(row.status)">{{ row.status }}</t-tag>
              </template>
              <template #totalPrice="{ row }">
                ¥{{ row.finalPrice || row.totalPrice || 0 }}
              </template>
            </t-table>
          </t-tab-panel>
  
          <!-- 投诉建议 -->
          <t-tab-panel value="feedbacks" label="投诉建议">
            <t-table
              v-if="currentUserData.feedbacks?.length"
              :data="currentUserData.feedbacks"
              :columns="feedbackColumns"
              row-key="_id"
              size="small"
            />
            <t-empty v-else description="暂无投诉记录" />
          </t-tab-panel>
        </t-tabs>
      </t-card>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive } from 'vue';
  import { MessagePlugin } from 'tdesign-vue-next';
  import { userInfoService } from '../utils/cloudbase';
  
  const searchKeyword = ref('');
  const searchLoading = ref(false);
  const showList = ref(false);
  const userList = ref([]);
  const currentOpenid = ref('');
  const currentUserData = ref(null);
  const activeTab = ref('basic');
  const orderPagination = reactive({ current: 1, pageSize: 10, total: 0 });
  
  const addressColumns = [
    { colKey: 'name', title: '收件人', width: 100 },
    { colKey: 'phone', title: '电话', width: 130 },
    { colKey: 'province', title: '省市区', width: 180, cell: (h, { row }) => `${row.province}${row.city}${row.district}` },
    { colKey: 'detail', title: '详细地址', ellipsis: true }
  ];
  
  const orderColumns = [
    { colKey: '_id', title: '订单ID', width: 180, ellipsis: true },
    { colKey: 'status', title: '状态', width: 100, cell: 'status' },
    { colKey: 'totalPrice', title: '金额', width: 100, cell: 'totalPrice' },
    { colKey: 'createTime', title: '下单时间', width: 180, cell: (h, { row }) => formatTime(row.createTime) }
  ];
  
  const feedbackColumns = [
    { colKey: 'content', title: '内容', ellipsis: true },
    { colKey: 'contact', title: '联系方式', width: 130 },
    { colKey: 'status', title: '状态', width: 100 },
    { colKey: 'createTime', title: '时间', width: 180, cell: (h, { row }) => formatTime(row.createTime) }
  ];
  
  function getOrderTheme(status) {
    const map = { '待发货': 'warning', '已发货': 'primary', '已完成': 'success', '已取消': 'danger', '待付款': 'warning' };
    return map[status] || 'default';
  }
  
  async function handleSearch() {
    const keyword = searchKeyword.value.trim();
    if (!keyword) {
      MessagePlugin.warning('请输入昵称或 OpenID');
      return;
    }
    searchLoading.value = true;
    showList.value = false;
    userList.value = [];
    currentUserData.value = null;
    try {
      const res = await userInfoService.searchUsers(keyword);
      if (res.success) {
        userList.value = res.users || [];
        showList.value = true;
        if (userList.value.length === 0) {
          MessagePlugin.info('未找到匹配用户');
        }
      } else {
        MessagePlugin.error(res.error || '搜索失败');
      }
    } catch (e) {
      MessagePlugin.error('请求失败');
    } finally {
      searchLoading.value = false;
    }
  }
  
  async function selectUser(openid) {
    currentOpenid.value = openid;
    currentUserData.value = null;
    try {
      const res = await userInfoService.getFullInfo(openid);
      if (res.success) {
        currentUserData.value = res.data;
        showList.value = false; // 隐藏列表，显示详情
      } else {
        MessagePlugin.error(res.error || '获取用户信息失败');
      }
    } catch (e) {
      MessagePlugin.error('请求失败');
    }
  }
  
  function backToList() {
    currentUserData.value = null;
    currentOpenid.value = '';
    showList.value = true;
  }
  
  function onOrderPageChange(pageInfo) {
    orderPagination.current = pageInfo.current;
  }
  
  function formatTime(date) {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
  }
  </script>
  
  <style scoped>
  .user-info-query { padding: 20px; background: #f5f7fa; min-height: 100vh; }
  .header-card { margin-bottom: 16px; }
  .search-area { display: flex; gap: 12px; align-items: center; }
  .list-card { margin-bottom: 16px; }
  .list-header { font-size: 16px; font-weight: 500; margin-bottom: 12px; }
  .user-row { display: flex; align-items: center; gap: 12px; padding: 12px 8px; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background 0.2s; }
  .user-row:hover { background: #f9f9f9; }
  .user-row-info { display: flex; flex-direction: column; }
  .row-nick { font-weight: 500; }
  .row-openid { font-size: 12px; color: #999; }
  .empty-card { text-align: center; padding: 40px 0; }
  .info-card { margin-bottom: 16px; }
  .detail-header { margin-bottom: 16px; }
  .user-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
  .user-basic { display: flex; flex-direction: column; }
  .user-nick { font-size: 18px; font-weight: 500; }
  .user-openid { font-size: 13px; color: #999; }
  </style>