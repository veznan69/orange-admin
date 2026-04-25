<template>
  <div class="chat-manage">
    <!-- 移动端会话列表（独立显示） -->
    <div v-if="isMobile && !currentSession" class="session-list-mobile">
      <SessionList
        :sessions="sessions"
        :current-openid="currentSession?.openid"
        :loading="loadingSessions"
        @select="selectSession"
      />
    </div>

    <!-- 桌面端 / 移动端聊天窗口 -->
    <t-card :bordered="false" class="chat-card">
      <div class="chat-container" :class="{ 'mobile-chat': isMobile && currentSession }">
        <!-- 会话列表（桌面端始终显示） -->
        <div v-if="!isMobile" class="session-panel">
          <SessionList
            :sessions="sessions"
            :current-openid="currentSession?.openid"
            :loading="loadingSessions"
            @select="selectSession"
            @refresh="loadSessions"
          />
        </div>

        <!-- 聊天区域 -->
        <div class="chat-panel">
          <!-- 移动端返回按钮 -->
          <div v-if="isMobile && currentSession" class="mobile-back">
            <t-button variant="text" @click="currentSession = null">
              <t-icon name="chevron-left" /> 返回会话列表
            </t-button>
          </div>

          <div v-if="!currentSession" class="empty-chat">
            <t-icon name="chat" size="64px" style="color: #ddd;" />
            <p>选择一位用户开始聊天</p>
          </div>

          <template v-else>
            <!-- 会话头部 -->
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

            <!-- 消息列表 -->
            <div class="message-list" ref="messageListRef">
              <div
                v-for="msg in messages"
                :key="msg._id"
                class="message-item"
                :class="{ 'self': msg.fromOpenid === adminOpenid }"
              >
                <t-avatar
                  v-if="msg.fromOpenid !== adminOpenid"
                  :image="currentSession.avatar"
                  size="36px"
                >
                  {{ currentSession.nickName?.charAt(0) || '用' }}
                </t-avatar>
                <t-avatar
                  v-else
                  size="36px"
                  style="background: #ff6600;"
                >
                  客
                </t-avatar>
                <div class="message-bubble">
                  <div class="message-content">{{ msg.content }}</div>
                  <div class="message-time">{{ formatTime(msg.createTime) }}</div>
                </div>
              </div>
              <div v-if="loadingMessages" class="loading-messages">
                <t-loading size="small" /> 加载中...
              </div>
            </div>

            <!-- 输入区域 -->
            <div class="message-input">
              <t-textarea
                v-model="inputText"
                placeholder="输入回复内容..."
                :autosize="{ minRows: 1, maxRows: 4 }"
                @keydown.enter.exact.prevent="sendReply"
              />
              <t-button theme="primary" @click="sendReply" :loading="sending">
                发送
              </t-button>
            </div>
          </template>
        </div>
      </div>
    </t-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { chatService } from '../utils/cloudbase';
import SessionList from '../components/SessionList.vue';

const adminOpenid = 'ojWd418mR3Z_TqtUeq5wJo4BisdQ';

// 响应式状态
const isMobile = ref(window.innerWidth <= 768);
const sessions = ref([]);
const loadingSessions = ref(false);
const currentSession = ref(null);
const messages = ref([]);
const loadingMessages = ref(false);
const inputText = ref('');
const sending = ref(false);
const messageListRef = ref(null);

let pollTimer = null;

// 加载会话列表
async function loadSessions() {
  loadingSessions.value = true;
  try {
    const res = await chatService.listSessions();
    if (res.success) {
      sessions.value = res.sessions.map(s => ({
        ...s,
        nickName: s.nickName || '微信用户',
        avatar: s.avatar || ''
      }));
    }
  } catch (err) {
    MessagePlugin.error('加载会话失败');
  } finally {
    loadingSessions.value = false;
  }
}

// 选择会话
async function selectSession(session) {
  currentSession.value = session;
  await loadMessages(session.openid);
  startPolling();
}

// 加载消息
async function loadMessages(targetOpenid) {
  loadingMessages.value = true;
  try {
    const res = await chatService.getSessionMessages(targetOpenid);
    if (res.success) {
      messages.value = res.messages;
      await nextTick();
      scrollToBottom();
    }
  } catch (err) {
    MessagePlugin.error('加载消息失败');
  } finally {
    loadingMessages.value = false;
  }
}

// 发送回复
async function sendReply() {
  const content = inputText.value.trim();
  if (!content || !currentSession.value) return;

  sending.value = true;
  try {
    const res = await chatService.adminReply(currentSession.value.openid, content);
    if (res.success) {
      inputText.value = '';
      await loadMessages(currentSession.value.openid);
    } else {
      MessagePlugin.error(res.error || '发送失败');
    }
  } catch (err) {
    MessagePlugin.error('发送失败');
  } finally {
    sending.value = false;
  }
}

// 滚动到底部
function scrollToBottom() {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
  }
}

// 轮询新消息
function startPolling() {
  stopPolling();
  pollTimer = setInterval(async () => {
    if (currentSession.value) {
      await loadMessages(currentSession.value.openid);
      loadSessions(); // 同时更新会话列表
    }
  }, 5000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// 格式化时间
function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '刚刚';
  if (diff < hour) return Math.floor(diff / minute) + '分钟前';
  if (diff < day) return Math.floor(diff / hour) + '小时前';
  if (diff < 7 * day) return Math.floor(diff / day) + '天前';

  const month = d.getMonth() + 1;
  const dateNum = d.getDate();
  return `${month}月${dateNum}日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 监听窗口大小变化
function handleResize() {
  isMobile.value = window.innerWidth <= 768;
}

onMounted(() => {
  loadSessions();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  stopPolling();
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.chat-manage {
  height: 100%;
}
.chat-card {
  height: calc(100vh - 104px);
  min-height: 500px;
}
.chat-container {
  display: flex;
  height: 100%;
}
.session-panel {
  width: 300px;
  border-right: 1px solid #e7e7e7;
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
.user-name {
  font-weight: 500;
  font-size: 16px;
}
.user-openid {
  font-size: 12px;
  color: #999;
}
.message-list {
  flex: 1;
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
.message-bubble {
  max-width: 70%;
  background: #fff;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.self .message-bubble {
  background: #ff6600;
  color: #fff;
}
.message-content {
  word-break: break-word;
}
.message-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
.self .message-time {
  color: rgba(255,255,255,0.7);
}
.message-input {
  padding: 16px;
  border-top: 1px solid #e7e7e7;
  display: flex;
  gap: 12px;
  align-items: flex-end;
}
.loading-messages {
  text-align: center;
  color: #999;
  padding: 12px;
}
.mobile-back {
  padding: 12px;
  border-bottom: 1px solid #e7e7e7;
}
.session-list-mobile {
  height: 100%;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .chat-card {
    height: calc(100vh - 80px);
  }
  .chat-container.mobile-chat .session-panel {
    display: none;
  }
  .message-bubble {
    max-width: 85%;
  }
}
</style>