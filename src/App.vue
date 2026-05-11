<template>
  <t-layout class="app-layout">
    <!-- 左侧固定侧边栏 -->
    <t-aside :width="menuCollapsed ? '64px' : '220px'" class="app-aside">
      <div class="logo-area">
        <span v-if="!menuCollapsed">🍊 赣南脐橙</span>
        <span v-else>🍊</span>
      </div>
      <t-menu
        :value="activeMenu"
        :collapsed="menuCollapsed"
        theme="light"
        @change="handleMenuChange"
        class="app-menu"
      >
        <t-menu-item value="/dashboard">
          <template #icon><t-icon name="chart-bar" /></template>
          数据看板
        </t-menu-item>
        <t-menu-item value="/goods">
          <template #icon><t-icon name="shop" /></template>
          商品管理
        </t-menu-item>
        <t-menu-item value="/coupon">
          <template #icon><t-icon name="wallet" /></template>
          优惠券管理
        </t-menu-item>
        <t-submenu value="chat-group" title="客服管理">
          <template #icon><t-icon name="chat" /></template>
          <t-menu-item value="/chat/ai">
            <template #icon><t-icon name="robot" /></template>
            AI客服
          </t-menu-item>
          <t-menu-item value="/chat/manual">
            <template #icon><t-icon name="user" /></template>
            人工客服
          </t-menu-item>
        </t-submenu>
        <t-menu-item value="/audit">
          <template #icon><t-icon name="file-excel" /></template>
          审核管理
        </t-menu-item>
        <t-menu-item value="/user-info">
          <template #icon><t-icon name="user-search" /></template>
          用户信息查询
        </t-menu-item>
        <t-menu-item value="/feedbacks">
          <template #icon><t-icon name="notification" /></template>
          投诉建议
        </t-menu-item>
        <t-menu-item value="/broadcast">
          <template #icon><t-icon name="mail" /></template>
          信息广播
        </t-menu-item>
        <t-menu-item value="/circle">
          <template #icon><t-icon name="chat" /></template>
          橙友圈管理
        </t-menu-item>
      </t-menu>
      <div class="aside-footer">
        <t-button
          variant="text"
          shape="square"
          @click="menuCollapsed = !menuCollapsed"
        >
          <t-icon :name="menuCollapsed ? 'chevron-right' : 'chevron-left'" />
        </t-button>
      </div>
    </t-aside>

    <!-- 右侧内容区 -->
    <t-layout class="app-main-layout">
      <!-- 顶部固定信息栏 -->
      <t-header class="app-header">
        <div class="header-left">
          <t-button
            variant="text"
            shape="square"
            class="mobile-menu-btn"
            @click="mobileDrawerVisible = true"
          >
            <t-icon name="menu" />
          </t-button>
          <span class="page-title">{{ pageTitle }}</span>
        </div>
        <div class="header-right">
          <t-tag theme="primary">{{ userRole === 'admin' ? '管理员' : '商家' }}</t-tag>
          <t-button variant="text" shape="square">
            <t-icon name="user" />
          </t-button>
          <t-button variant="text" @click="handleLogout">
            <t-icon name="poweroff" />
            <span class="logout-text">退出</span>
          </t-button>
        </div>
      </t-header>

      <!-- 内容区域（自适应高度） -->
      <t-content class="app-content">
        <router-view />
      </t-content>
    </t-layout>

    <!-- 移动端抽屉菜单 -->
    <t-drawer
      v-model:visible="mobileDrawerVisible"
      placement="left"
      :size="220"
      :show-overlay="true"
      :close-on-overlay-click="true"
    >
      <t-menu
        :value="activeMenu"
        theme="light"
        @change="handleMobileMenuChange"
      >
        <t-menu-item value="/dashboard">
          <template #icon><t-icon name="chart-bar" /></template>
          数据看板
        </t-menu-item>
        <t-menu-item value="/goods">
          <template #icon><t-icon name="shop" /></template>
          商品管理
        </t-menu-item>
        <t-menu-item value="/coupon">
          <template #icon><t-icon name="wallet" /></template>
          优惠券管理
        </t-menu-item>
        <t-menu-item value="/chat/manual">
          <template #icon><t-icon name="user" /></template>
          人工客服
        </t-menu-item>
        <t-menu-item value="/chat/ai">
          <template #icon><t-icon name="robot" /></template>
          AI客服记录
        </t-menu-item>
        <t-menu-item value="/audit">
          <template #icon><t-icon name="file-excel" /></template>
          审核管理
        </t-menu-item>
        <t-menu-item value="/user-info">
          <template #icon><t-icon name="user-search" /></template>
          用户信息查询
        </t-menu-item>
        <t-menu-item value="/feedbacks">
          <template #icon><t-icon name="notification" /></template>
          投诉建议
        </t-menu-item>
        <t-menu-item value="/broadcast">
          <template #icon><t-icon name="mail" /></template>
          信息广播
        </t-menu-item>
        <t-menu-item value="/circle">
          <template #icon><t-icon name="chat" /></template>
          橙友圈管理
        </t-menu-item>
      </t-menu>
    </t-drawer>
  </t-layout>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const userRole = ref('admin');
const menuCollapsed = ref(false);
const mobileDrawerVisible = ref(false);

const activeMenu = computed(() => route.path);

const pageTitle = computed(() => {
  const titles = {
    '/dashboard': '数据看板',
    '/goods': '商品管理',
    '/chat/manual': '人工客服',
    '/chat/ai': 'AI客服记录',
    '/feedbacks': '投诉建议',
    '/broadcast': '信息广播',
    '/audit': '审核管理',
    '/coupon': '优惠券管理',
    '/user-info': '用户信息查询',
    '/circle': '橙友圈管理',
  };
  return titles[route.path] || '后台管理';
});

function handleLogout() {
  localStorage.removeItem('admin_openid');
  localStorage.removeItem('admin_role');
  localStorage.removeItem('admin_logged_in');
  router.push('/login');
}

function handleMenuChange(value) {
  router.push(value);
}

function handleMobileMenuChange(value) {
  router.push(value);
  mobileDrawerVisible.value = false;
}

watch(() => route.path, () => {
  mobileDrawerVisible.value = false;
});
</script>

<style scoped>
/* ========== 布局容器 ========== */
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: row;
}

/* ========== 左侧固定侧边栏 ========== */
.app-aside {
  background: #fff;
  border-right: 1px solid #e7e7e7;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
  transition: width 0.3s ease;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
}

.logo-area {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  color: #ff6600;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.app-menu {
  flex: 1;
  overflow-y: auto;
  border: none;
}

.aside-footer {
  padding: 16px;
  text-align: center;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}

/* ========== 右侧内容区 ========== */
.app-main-layout {
  margin-left: 220px;
  display: flex;
  flex-direction: column;
  width: calc(100% - 220px);
  transition: margin-left 0.3s ease;
}

/* ========== 顶部固定信息栏 ========== */
.app-header {
  background: #fff;
  border-bottom: 1px solid #e7e7e7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 60px;
  position: fixed;
  left: 220px;
  right: 0;
  top: 0;
  z-index: 90;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: left 0.3s ease;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.mobile-menu-btn {
  display: none;
}

.logout-text {
  margin-left: 4px;
}

/* ========== 内容区域 ========== */
.app-content {
  margin-top: 60px;
  padding: 24px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
  overflow-y: auto;
}

/* ========== 侧边栏折叠状态 ========== */
.app-layout:has(.app-aside[style*="64px"]) .app-main-layout {
  margin-left: 64px;
  width: calc(100% - 64px);
}

.app-layout:has(.app-aside[style*="64px"]) .app-header {
  left: 64px;
}

/* ========== 移动端适配 ========== */
@media (max-width: 768px) {
  .app-aside {
    display: none;
  }

  .app-main-layout {
    margin-left: 0;
    width: 100%;
  }

  .app-header {
    left: 0;
    padding: 0 16px;
  }

  .app-content {
    padding: 12px;
    margin-top: 60px;
  }

  .mobile-menu-btn {
    display: inline-flex;
  }

  .logout-text {
    display: none;
  }
}

/* ========== 滚动条美化 ========== */
.app-menu::-webkit-scrollbar,
.app-content::-webkit-scrollbar {
  width: 6px;
}

.app-menu::-webkit-scrollbar-track,
.app-content::-webkit-scrollbar-track {
  background: transparent;
}

.app-menu::-webkit-scrollbar-thumb,
.app-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
  transition: background 0.3s ease;
}

.app-menu::-webkit-scrollbar-thumb:hover,
.app-content::-webkit-scrollbar-thumb:hover {
  background: #a0a0a0;
}
</style>
