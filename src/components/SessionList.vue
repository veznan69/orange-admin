<template>
  <div class="session-list">
    <div class="session-header">
      <span>用户会话</span>
      <t-button variant="text" shape="square" @click="$emit('refresh')">
        <t-icon name="refresh" />
      </t-button>
    </div>
    <div class="session-items" v-if="!loading">
      <div
        v-for="session in sessions"
        :key="session.openid"
        class="session-item"
        :class="{ active: currentOpenid === session.openid }"
        @click="$emit('select', session)"
      >
        <t-avatar :image="session.avatar" size="44px">
          {{ session.nickName?.charAt(0) || '用' }}
        </t-avatar>
        <div class="session-info">
          <div class="session-top">
            <span class="session-name">{{ session.nickName || '未知用户' }}</span>
            <span class="session-time">{{ formatTime(session.lastTime) }}</span>
          </div>
          <div class="session-bottom">
            <span class="session-last">{{ session.lastContent }}</span>
            <t-badge v-if="session.unread" count="1" />
          </div>
          <div class="session-openid">{{ session.openid }}</div>
        </div>
      </div>
      <t-empty v-if="sessions.length === 0" description="暂无用户咨询" />
    </div>
    <t-loading v-else text="加载中..." />
  </div>
</template>

<script setup>
defineProps({
  sessions: Array,
  currentOpenid: String,
  loading: Boolean
});
defineEmits(['select', 'refresh']);

function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
</script>

<style scoped>
.session-list {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.session-header {
  padding: 16px;
  border-bottom: 1px solid #e7e7e7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 500;
}
.session-items {
  flex: 1;
  overflow-y: auto;
}
.session-item {
  display: flex;
  padding: 16px;
  gap: 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}
.session-item:hover {
  background: #f9f9f9;
}
.session-item.active {
  background: #fff7e6;
  border-left: 3px solid #ff6600;
}
.session-info {
  flex: 1;
  overflow: hidden;
}
.session-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.session-name {
  font-weight: 500;
}
.session-time {
  font-size: 12px;
  color: #999;
}
.session-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.session-last {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}
.session-openid {
  font-size: 11px;
  color: #aaa;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>