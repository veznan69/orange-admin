<template>
  <t-layout class="app-layout">
    <!-- 侧边栏菜单 -->
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
      >
        <t-menu-item value="/goods">
          <template #icon><t-icon name="shop" /></template>
          商品管理
        </t-menu-item>
        <t-menu-item value="/chat">
          <template #icon><t-icon name="chat" /></template>
          客服管理
        </t-menu-item>
        <!-- 后续新增功能在此添加菜单项 -->
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

    <!-- 内容区域 -->
    <t-layout>
      <t-header class="app-header">
        <div class="header-left">
          <!-- 移动端菜单按钮 -->
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
          <!-- 新增：退出登录按钮 -->
          <t-button variant="text" @click="handleLogout">
            <t-icon name="poweroff" />
            <span class="logout-text">退出</span>
          </t-button>
        </div>
      </t-header>

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
        <t-menu-item value="/goods">
          <template #icon><t-icon name="shop" /></template>
          商品管理
        </t-menu-item>
        <t-menu-item value="/chat">
          <template #icon><t-icon name="chat" /></template>
          客服管理
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

const userRole = ref('admin'); // 实际应从登录获取

const menuCollapsed = ref(false);
const mobileDrawerVisible = ref(false);

const activeMenu = computed(() => route.path);

const pageTitle = computed(() => {
  const titles = {
    '/goods': '商品管理',
    '/chat': '客服管理'
  };
  return titles[route.path] || '后台管理';
});

function handleLogout() {
  // 清除所有登录相关的本地存储
  localStorage.removeItem('admin_openid');
  localStorage.removeItem('admin_role');
  localStorage.removeItem('admin_logged_in');
  // 可选：保留上次输入的 openid 以便下次登录自动填充
  // localStorage.removeItem('last_admin_openid'); 

  // 跳转到登录页
  router.push('/login');
}

function handleMenuChange(value) {
  router.push(value);
}

function handleMobileMenuChange(value) {
  router.push(value);
  mobileDrawerVisible.value = false;
}

// 监听路由变化，移动端自动关闭抽屉
watch(() => route.path, () => {
  mobileDrawerVisible.value = false;
});
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
}

.app-aside {
  background: #fff;
  border-right: 1px solid #e7e7e7;
  display: flex;
  flex-direction: column;
  transition: width 0.2s;
}

.logo-area {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  color: #ff6600;
  border-bottom: 1px solid #f0f0f0;
}

.aside-footer {
  margin-top: auto;
  padding: 16px;
  text-align: center;
  border-top: 1px solid #f0f0f0;
}

.app-header {
  background: #fff;
  border-bottom: 1px solid #e7e7e7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 18px;
  font-weight: 500;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.mobile-menu-btn {
  display: none;
}

.app-content {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 64px);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .app-aside {
    display: none;
  }
  .mobile-menu-btn {
    display: inline-flex;
  }
  .app-header {
    padding: 0 16px;
  }
  .app-content {
    padding: 12px;
  }
}

.logout-text {
  margin-left: 4px;
}
@media (max-width: 768px) {
  .logout-text {
    display: none; /* 移动端只显示图标 */
  }
}
</style>