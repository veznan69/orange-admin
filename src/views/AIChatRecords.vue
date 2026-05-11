<template>
  <div class="ai-records">
    <!-- 移动端会话列表（独立显示） -->
    <div v-if="isMobile && !currentSession" class="session-list-mobile">
      <SessionList
        :sessions="sessions"
        :current-openid="currentSession?.openid"
        :loading="loadingSessions"
        @select="selectSession"
      />
    </div>

    <!-- 桌面端 / 移动端聊天窗口（完全复用 ChatManage 的卡片布局） -->
    <t-card :bordered="false" class="chat-card">
      <div class="chat-container" :class="{ 'mobile-chat': isMobile && currentSession }">
        <!-- 左侧会话列表（桌面端始终显示） -->
        <div v-if="!isMobile" class="session-panel">
          <SessionList
            :sessions="sessions"
            :current-openid="currentSession?.openid"
            :loading="loadingSessions"
            @select="selectSession"
            @refresh="loadSessions"
          />
        </div>

        <!-- 右侧聊天区域 -->
        <div class="chat-panel">
          <!-- 移动端返回按钮 -->
          <div v-if="isMobile && currentSession" class="mobile-back">
            <t-button variant="text" @click="currentSession = null">
              <t-icon name="chevron-left" /> 返回会话列表
            </t-button>
          </div>

          <div v-if="!currentSession" class="empty-chat">
            <t-icon name="chat" size="64px" style="color: #ddd;" />
            <p>选择一位用户查看AI对话记录</p>
          </div>

          <template v-else>
            <!-- 会话头部（与客服管理一模一样） -->
            <div class="chat-header">
              <div class="user-info">
                <t-avatar :image="currentSession.avatar" size="40px">
                  {{ currentSession.nickName?.charAt(0) || '用' }}
                </t-avatar>
                <div class="user-detail">
                  <span class="user-name">{{ currentSession.nickName || '未知用户' }}</span>
                  <span class="user-openid">{{ currentSession.openid }}</span>
                </div>
              </div>
            </div>

            <!-- 消息列表（使用与 ChatManage 完全相同的结构） -->
            <div class="message-list" ref="messageListRef">
              <div
                v-for="msg in messages"
                :key="msg._id"
                class="message-item"
                :class="{ 'self': msg.role === 'assistant' }"
              >
                <t-avatar
                  v-if="msg.role === 'user'"
                  :image="currentSession.avatar"
                  size="36px"
                >
                  {{ currentSession.nickName?.charAt(0) || '用' }}
                </t-avatar>
                <t-avatar
                  v-else
                  size="36px"
                  style="background: #0052d9;"
                >
                  AI
                </t-avatar>
                <div class="message-body">
                  <div class="message-bubble">
                    <div class="message-content">{{ msg.content }}</div>
                  </div>
                  <div class="message-time">{{ formatTime(msg.createTime) }}</div>
                </div>
              </div>
            </div>

            <!-- 只读模式：不显示输入框 -->
          </template>
        </div>
      </div>
    </t-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { aiChatService } from '../utils/cloudbase';
import SessionList from '../components/SessionList.vue';

const isMobile = ref(window.innerWidth <= 768);
const sessions = ref([]);
const loadingSessions = ref(false);
const currentSession = ref(null);
const messages = ref([]);
const loadingMessages = ref(false);
const messageListRef = ref(null);

// ========== 加载 AI 会话列表，并转换成 SessionList 需要的格式 ==========
async function loadSessions() {
  loadingSessions.value = true;
  try {
    const res = await aiChatService.listSessions();
    if (res.success) {
      // 将 AI 返回的 session 字段映射为 ChatManage / SessionList 需要的字段
      sessions.value = (res.sessions || []).map(s => ({
        openid: s.userId,               // 关键：userId -> openid，供 SessionList 使用
        nickName: s.nickName || '未知用户',
        avatar: s.avatar || '',
        lastContent: s.lastContent || '',
        lastTime: s.lastTime || '',
        hasUnread: false                // AI 记录没有未读概念，始终 false
      }));
    } else {
      MessagePlugin.error('加载AI会话列表失败');
    }
  } catch (err) {
    MessagePlugin.error('请求失败');
  } finally {
    loadingSessions.value = false;
  }
}

// ========== 选择用户，拉取 AI 聊天历史 ==========
async function selectSession(session) {
  // 这里的 session 已经是映射后的对象，currentSession 会被设为它
  currentSession.value = session;
  loadingMessages.value = true;
  try {
    const res = await aiChatService.getUserHistory(session.openid); // 注意这里用 openid（即 userId）
    if (res.success) {
      messages.value = (res.messages || []).map(msg => ({
        ...msg,
        _id: msg._id || msg.messageId,   // 兼容旧数据
        createTime: msg.createTime || msg.timestamp
      }));
      nextTick(() => scrollToBottom());
    } else {
      MessagePlugin.error('加载AI聊天历史失败');
    }
  } catch (err) {
    MessagePlugin.error('请求失败');
  } finally {
    loadingMessages.value = false;
  }
}

// ========== 滚动到底部（复用 ChatManage 逻辑） ==========
function scrollToBottom() {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
  }
}

// ========== 格式化时间（复用 ChatManage 的 formatTime） ==========
function formatTime(dateParam) {
  if (!dateParam) return '未知时间';
  const d = new Date(dateParam);
  if (Number.isNaN(d.getTime())) return '未知时间';

  const now = new Date();
  const diff = now - d;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const dayMs = 24 * hour;
  const yearDiff = now.getFullYear() - d.getFullYear();

  if (diff < 4 * hour) {
    if (diff < minute) return '刚刚';
    if (diff < hour) return Math.floor(diff / minute) + '分钟前';
    return Math.floor(diff / hour) + '小时前';
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (d.getTime() >= todayStart) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  const month = d.getMonth() + 1;
  const dayOfMonth = d.getDate();
  const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  if (yearDiff === 0) {
    return `${month}月${dayOfMonth}日 ${time}`;
  }
  return `${d.getFullYear()}年${month}月${dayOfMonth}日 ${time}`;
}

function handleResize() {
  isMobile.value = window.innerWidth <= 768;
}

onMounted(() => {
  loadSessions();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
/* 完全复用 ChatManage 的样式，只把 .self 改成代表 AI 消息（右侧） */
.ai-records { height: 100%; }
.chat-card { height: calc(100vh - 104px); min-height: 500px; }
.chat-container { display: flex; height: 100%; }
.session-panel {
  width: 300px;
  border-right: 1px solid #e7e7e7;
  height: 100%;
  overflow: hidden;
}
.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.empty-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}
.chat-header {
  padding: 16px;
  border-bottom: 1px solid #e7e7e7;
  flex-shrink: 0;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-detail {
  display: flex;
  flex-direction: column;
}
.user-name { font-weight: 500; font-size: 16px; }
.user-openid { font-size: 12px; color: #999; }

.message-list {
  height: calc(100vh - 104px - 60px - 60px); /* 去掉输入框高度，因为无输入框 */
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.message-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.message-item.self {
  flex-direction: row-reverse;
}
.message-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.self .message-body {
  align-items: flex-end;
}
.message-bubble {
  max-width: 70%;
  background: #fff;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.self .message-bubble {
  background: #e6f4ff;  /* AI 消息使用淡蓝色背景 */
  color: #333;
}
.message-content { word-break: break-word; }
.message-time { font-size: 12px; color: #999; margin-top: 4px; }
.mobile-back {
  padding: 12px;
  border-bottom: 1px solid #e7e7e7;
}
.session-list-mobile { height: 100%; }

/* 移动端适配（与 ChatManage 相同） */
@media (max-width: 768px) {
  .chat-card { height: calc(100vh - 80px); }
  .chat-container.mobile-chat .session-panel { display: none; }
  .message-bubble { max-width: 85%; }
}
</style>

<style>
/* 非 scoped 滚动条（与 ChatManage 保持一致） */
.ai-records .message-list::-webkit-scrollbar { width: 6px; }
.ai-records .message-list::-webkit-scrollbar-track { background: transparent; }
.ai-records .message-list::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 3px; }
.ai-records .message-list::-webkit-scrollbar-thumb:hover { background: #a0a0a0; }
</style>