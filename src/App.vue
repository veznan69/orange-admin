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
        <!-- 固定顶部：数据看板 -->
        <template v-for="item in pinnedTop" :key="item.route">
          <t-menu-item v-if="!item.adminOnly || userRole === 'admin'" :value="item.route">
            <template #icon><t-icon :name="item.icon" /></template>
            {{ item.label }}
          </t-menu-item>
        </template>

        <!-- 中间菜单（含客服管理二级菜单） -->
        <template v-for="item in menuList" :key="item.value || item.route">
          <t-submenu
            v-if="item.type === 'submenu' && (!item.adminOnly || userRole === 'admin')"
            :value="item.value"
            :title="item.label"
          >
            <template #icon><t-icon :name="item.icon" /></template>
            <t-menu-item
              v-for="child in item.children"
              :key="child.route"
              :value="child.route"
            >
              <template #icon><t-icon :name="child.icon" /></template>
              {{ child.label }}
            </t-menu-item>
          </t-submenu>
          <t-menu-item
            v-else-if="item.type === 'item' && (!item.adminOnly || userRole === 'admin')"
            :value="item.route"
          >
            <template #icon><t-icon :name="item.icon" /></template>
            {{ item.label }}
          </t-menu-item>
        </template>

        <!-- 固定底部：系统信息 + 数据管理（数据管理永远在最底边） -->
        <template v-for="item in pinnedBottom" :key="item.route">
          <t-menu-item v-if="!item.adminOnly || userRole === 'admin'" :value="item.route">
            <template #icon><t-icon :name="item.icon" /></template>
            {{ item.label }}
          </t-menu-item>
        </template>
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
          <t-tag v-if="pageDatabaseInfo" theme="success" variant="light" class="db-tag">
            <template #icon><t-icon name="database" /></template>
            {{ pageDatabaseInfo }}
          </t-tag>
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
        <!-- 固定顶部：数据看板 -->
        <template v-for="item in pinnedTop" :key="item.route">
          <t-menu-item v-if="!item.adminOnly || userRole === 'admin'" :value="item.route">
            <template #icon><t-icon :name="item.icon" /></template>
            {{ item.label }}
          </t-menu-item>
        </template>

        <!-- 中间菜单（含客服管理二级菜单） -->
        <template v-for="item in menuList" :key="item.value || item.route">
          <t-submenu
            v-if="item.type === 'submenu' && (!item.adminOnly || userRole === 'admin')"
            :value="item.value"
            :title="item.label"
          >
            <template #icon><t-icon :name="item.icon" /></template>
            <t-menu-item
              v-for="child in item.children"
              :key="child.route"
              :value="child.route"
            >
              <template #icon><t-icon :name="child.icon" /></template>
              {{ child.label }}
            </t-menu-item>
          </t-submenu>
          <t-menu-item
            v-else-if="item.type === 'item' && (!item.adminOnly || userRole === 'admin')"
            :value="item.route"
          >
            <template #icon><t-icon :name="item.icon" /></template>
            {{ item.label }}
          </t-menu-item>
        </template>

        <!-- 固定底部：系统信息 + 数据管理（数据管理永远在最底边） -->
        <template v-for="item in pinnedBottom" :key="item.route">
          <t-menu-item v-if="!item.adminOnly || userRole === 'admin'" :value="item.route">
            <template #icon><t-icon :name="item.icon" /></template>
            {{ item.label }}
          </t-menu-item>
        </template>
      </t-menu>
    </t-drawer>
  </t-layout>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { routeServiceMap } from './config/routeServiceMap';

const router = useRouter();
const route = useRoute();

const userRole = ref(localStorage.getItem('admin_role') || 'admin');
const menuCollapsed = ref(false);
const mobileDrawerVisible = ref(false);

const activeMenu = computed(() => route.path);

// 从 routeServiceMap 动态生成页面标题
const pageTitle = computed(() => {
  const found = routeServiceMap.find(r => r.route === route.path);
  return found ? found.label : '后台管理';
});

// 从 routeServiceMap 动态生成数据库连接信息
const pageDatabaseInfo = computed(() => {
  const found = routeServiceMap.find(r => r.route === route.path);
  if (!found) return '';
  return found.databases.join(', ');
});

// 固定顶部：数据看板
const pinnedTop = computed(() =>
  routeServiceMap.filter(r => r.route === '/dashboard')
);

// 固定底部：系统信息 + 数据管理（数据管理永远在最底边）
const pinnedBottom = computed(() => [
  routeServiceMap.find(r => r.route === '/system-info'),
  routeServiceMap.find(r => r.route === '/data-manage')
].filter(Boolean));

// 中间菜单（把客服管理合并为 submenu）
const menuList = computed(() => {
  const result = [];
  let chatGroup = null;

  for (const item of routeServiceMap) {
    // 跳过固定顶部和底部
    if (['/dashboard', '/data-manage', '/system-info'].includes(item.route)) {
      continue;
    }

    // 合并 /chat/* 为客服管理 submenu
    if (item.route.startsWith('/chat')) {
      if (!chatGroup) {
        chatGroup = {
          type: 'submenu',
          value: 'chat-group',
          label: '客服管理',
          icon: 'chat',
          adminOnly: true,
          children: []
        };
        result.push(chatGroup);
      }
      chatGroup.children.push({ type: 'item', ...item });
    } else {
      result.push({ type: 'item', ...item });
    }
  }

  return result;
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

.db-tag {
  margin-left: 12px;
  font-size: 12px;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
