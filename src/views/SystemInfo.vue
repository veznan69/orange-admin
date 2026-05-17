<template>
  <div class="system-info">
    <t-card :bordered="false" class="info-card">
      <template #header>
        <div class="card-header">
          <t-icon name="server" style="margin-right: 8px;" />
          系统信息 — 云函数 & 数据库映射
        </div>
      </template>

      <t-alert theme="info" style="margin-bottom: 24px;">
        本页面动态读取 <code>src/config/routeServiceMap.js</code> 配置，
        展示每个后台管理 Tab 所对应的云函数和数据库集合。修改配置文件后刷新即可同步更新。
      </t-alert>

      <!-- 统计概览 -->
      <t-row :gutter="16" style="margin-bottom: 24px;">
        <t-col :span="4">
          <t-card :bordered="true" class="stat-card">
            <div class="stat-label">菜单项总数</div>
            <div class="stat-value">{{ allRoutes.length }}</div>
          </t-card>
        </t-col>
        <t-col :span="4">
          <t-card :bordered="true" class="stat-card">
            <div class="stat-label">云函数总数</div>
            <div class="stat-value">{{ allCloudFunctions.length }}</div>
          </t-card>
        </t-col>
        <t-col :span="4">
          <t-card :bordered="true" class="stat-card">
            <div class="stat-label">数据库集合总数</div>
            <div class="stat-value">{{ allDatabases.length }}</div>
          </t-card>
        </t-col>
      </t-row>

      <!-- 映射列表 -->
      <div v-for="item in allRoutes" :key="item.route" class="route-block">
        <t-card :bordered="true" class="route-card">
          <template #header>
            <div class="route-header">
              <t-icon :name="item.icon" style="margin-right: 8px;" />
              <span class="route-label">{{ item.label }}</span>
              <t-tag v-if="item.adminOnly" theme="warning" variant="light" size="small" style="margin-left: 8px;">仅管理员</t-tag>
              <t-tag theme="default" variant="light" size="small" style="margin-left: auto; font-family: monospace;">{{ item.route }}</t-tag>
            </div>
          </template>

          <t-row :gutter="24">
            <!-- 云函数 -->
            <t-col :span="6">
              <div class="section-title">
                <t-icon name="code" style="margin-right: 4px;" />云函数
              </div>
              <div v-if="item.cloudFunctions.length === 0" class="empty-hint">—</div>
              <t-tag
                v-for="fn in item.cloudFunctions"
                :key="fn"
                theme="primary"
                variant="light"
                style="margin-right: 8px; margin-bottom: 8px;"
              >
                {{ fn }}
              </t-tag>
            </t-col>

            <!-- 数据库 -->
            <t-col :span="6">
              <div class="section-title">
                <t-icon name="database" style="margin-right: 4px;" />数据库集合
              </div>
              <div v-if="item.databases.length === 0" class="empty-hint">—</div>
              <t-tag
                v-for="db in item.databases"
                :key="db"
                theme="success"
                variant="light"
                style="margin-right: 8px; margin-bottom: 8px;"
              >
                {{ db }}
              </t-tag>
            </t-col>
          </t-row>
        </t-card>
      </div>
    </t-card>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { routeServiceMap } from '../config/routeServiceMap';

// 所有菜单项（含固定顶/底）
const allRoutes = computed(() => routeServiceMap);

// 所有云函数（去重）
const allCloudFunctions = computed(() => {
  const set = new Set();
  routeServiceMap.forEach(r => {
    (r.cloudFunctions || []).forEach(fn => set.add(fn));
  });
  return [...set].sort();
});

// 所有数据库集合（去重）
const allDatabases = computed(() => {
  const set = new Set();
  routeServiceMap.forEach(r => {
    (r.databases || []).forEach(db => set.add(db));
  });
  return [...set].sort();
});
</script>

<style scoped>
.system-info {
  min-height: 100%;
}

.card-header {
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.stat-card {
  text-align: center;
  border-radius: 8px;
}

.stat-label {
  font-size: 13px;
  color: #888;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #ff6600;
}

.route-block {
  margin-bottom: 16px;
}

.route-card {
  border-radius: 8px;
}

.route-header {
  display: flex;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #666;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
}

.empty-hint {
  color: #bbb;
  font-size: 13px;
}
</style>
