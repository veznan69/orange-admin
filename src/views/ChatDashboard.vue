<template>
  <!-- 
    客服聊天仪表盘
    【涉及数据库】chat_messages, ai_chat_history
  -->
  <div class="chat-dashboard">
    <!-- 移动端会话列表 -->
    <div v-if="isMobile && !currentSession" class="session-list-mobile">
      <SessionList
        :sessions="sessions"
        :current-openid="currentSession?.openid"
        :loading="loadingSessions"
        @select="selectSession"
      />
    </div>

    <t-card :bordered="false" class="chat-card" :class="{ 'ai-mode': mode === 'ai' }">
      <div class="chat-container" :class="{ 'mobile-chat': isMobile && currentSession }">
        <!-- 左侧会话列表（桌面端） -->
        <div v-if="!isMobile" class="session-panel">
          <SessionList
            :sessions="sessions"
            :current-openid="currentSession?.openid"
            :loading="loadingSessions"
            @select="selectSession"
            @refresh="loadSessions"
          />
        </div>

        <!-- 右侧聊天区 -->
        <div class="chat-panel">
          <div v-if="isMobile && currentSession" class="mobile-back">
            <t-button variant="text" @click="currentSession = null">
              <t-icon name="chevron-left" /> 返回会话列表
            </t-button>
          </div>

          <div v-if="!currentSession" class="empty-chat">
            <t-icon name="chat" size="64px" style="color: #ddd;" />
            <p>{{ mode === 'ai' ? '选择一位用户查看AI对话记录' : '选择一位用户开始聊天' }}</p>
          </div>

          <template v-else>
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

            <div class="message-list" ref="messageListRef">
              <div
                v-for="msg in messages"
                :key="msg._id"
                class="message-item"
                :class="{ self: msg.side === 'self' }"
              >
                <t-avatar
                  v-if="msg.side === 'user'"
                  :image="currentSession.avatar"
                  size="36px"
                >
                  {{ currentSession.nickName?.charAt(0) || '用' }}
                </t-avatar>
                <t-avatar
                  v-else
                  size="36px"
                  :style="msg.side === 'self' ? 'background: #0052d9;' : 'background: #ff6600;'"
                >
                  {{ mode === 'ai' ? 'AI' : '客' }}
                </t-avatar>
                <div class="message-body">
                  <div class="message-bubble">
                    <div class="message-content">{{ msg.content }}</div>
                  </div>
                  <div class="message-time">{{ formatTime(msg.createTime) }}</div>
                </div>
              </div>
            </div>

            <!-- 输入框 (仅人工客服模式显示) -->
            <div v-if="mode === 'manual'" class="message-input">
              <t-textarea
                v-model="inputText"
                placeholder="输入回复内容..."
                :autosize="{ minRows: 1, maxRows: 4 }"
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
import { watch } from 'vue';
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { chatService, aiChatService } from '../utils/cloudbase';
import SessionList from '../components/SessionList.vue';

const props = defineProps({
  mode: { type: String, required: true, validator: v => ['manual', 'ai'].includes(v) }
});

// 当前管理员 openid（登录时存入 localStorage）
const adminOpenid = ref(localStorage.getItem('admin_openid') || '');

const isManual = computed(() => props.mode === 'manual');
const isAI = computed(() => props.mode === 'ai');
const service = computed(() => (isManual.value ? chatService : aiChatService));

// 响应式数据
const isMobile = ref(window.innerWidth <= 768);
const sessions = ref([]);
const loadingSessions = ref(false);
const currentSession = ref(null);
const messages = ref([]);
const loadingMessages = ref(false);
const inputText = ref('');
const sending = ref(false);
const messageListRef = ref(null);

// 以下三个变量仅人工模式使用
const allSupportMessages = ref([]);
let watcher = null;

// ---------- 通用工具函数 ----------
function parseCreateTime(ct) {
  if (!ct) return new Date().toISOString();
  if (typeof ct === 'number') return new Date(ct).toISOString();
  if (typeof ct === 'string') {
    if (/^\d+$/.test(ct)) return new Date(Number(ct)).toISOString();
    return ct;
  }
  if (ct.$date) return ct.$date;
  if (ct instanceof Date) return ct.toISOString();
  return String(ct);
}

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

function scrollToBottom() {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
  }
}

// ---------- 消息标准化（添加 side 字段） ----------
function normalizeMessages(msgs) {
  return msgs.map(msg => {
    const base = {
      ...msg,
      _id: msg._id || msg.messageId || Date.now(),
      createTime: msg.createTime || msg.timestamp || new Date().toISOString()
    };
    if (props.mode === 'manual') {
      base.side = msg.fromOpenid === adminOpenid.value ? 'self' : 'user';
    } else {
      base.side = msg.role === 'assistant' ? 'self' : 'user';
    }
    return base;
  });
}

// ---------- 会话列表加载 ----------
async function loadSessions() {
  loadingSessions.value = true;
  try {
    const res = await service.value.listSessions();
    if (res.success) {
      sessions.value = (res.sessions || []).map(s => {
        // AI 模式需要将 userId 映射为 openid
        const base = {
          openid: isAI.value ? s.userId : s.openid,
          nickName: s.nickName || '未知用户',
          avatar: s.avatar || '',
          lastContent: s.lastContent || '',
          lastTime: s.lastTime || '',
          hasUnread: isAI.value ? false : s.hasUnread
        };
        return base;
      });
    } else {
      MessagePlugin.error(res.error || '加载会话列表失败');
    }
  } catch (err) {
    MessagePlugin.error('请求失败');
  } finally {
    loadingSessions.value = false;
  }
}

// ---------- 选择会话 ----------
async function selectSession(session) {
  currentSession.value = session;
  loadingMessages.value = true;

  try {
    if (isManual.value) {
      // 人工客服：使用 getSessionMessages
      const res = await service.value.getSessionMessages(session.openid);
      if (res.success && res.messages) {
        allSupportMessages.value = res.messages;
        updateCurrentMessages();
      } else {
        messages.value = [];
      }
    } else {
      // AI 模式：直接拉取历史
      const res = await service.value.getUserHistory(session.openid);
      if (res.success) {
        messages.value = normalizeMessages(res.messages || []);
        nextTick(scrollToBottom);
      } else {
        messages.value = [];
      }
    }
  } catch (err) {
    MessagePlugin.error('加载消息失败');
  } finally {
    loadingMessages.value = false;
  }
}

// ---------- 人工客服：从 allSupportMessages 中筛选当前会话消息 ----------
function updateCurrentMessages() {
  if (!currentSession.value) return;
  const currentUserOpenid = currentSession.value.openid;
  const msgs = allSupportMessages.value.filter(msg =>
    (msg.fromOpenid === currentUserOpenid && msg.toOpenid === 'support') ||
    (msg.fromOpenid === adminOpenid.value && msg.toOpenid === currentUserOpenid)
  );
  // 排序
  msgs.sort((a, b) => {
    const ta = new Date(parseCreateTime(a.createTime)).getTime();
    const tb = new Date(parseCreateTime(b.createTime)).getTime();
    return ta - tb || String(a._id).localeCompare(String(b._id));
  });
  messages.value = normalizeMessages(msgs);
  scrollToBottom();
}

// ---------- 人工客服：发送回复 ----------
async function sendReply() {
  if (!isManual.value) return;
  const content = inputText.value.trim();
  if (!content || !currentSession.value) return;

  sending.value = true;
  try {
    const res = await chatService.adminReply(currentSession.value.openid, content);
    if (res.success) {
      inputText.value = '';
      // 本地插入消息
      allSupportMessages.value.push({
        _id: Date.now().toString(),
        fromOpenid: adminOpenid.value,
        toOpenid: currentSession.value.openid,
        content,
        createTime: new Date().toISOString()
      });
      updateCurrentMessages();
      currentSession.value.hasUnread = false;
    } else {
      MessagePlugin.error(res.error || '发送失败');
    }
  } catch (err) {
    MessagePlugin.error('发送失败');
  } finally {
    sending.value = false;
  }
}

// ---------- 人工客服：实时监听 ----------
function startWatching() {
  if (!isManual.value) return;
  console.log('开始实时监听客服消息...');
  watcher = chatService.watchSessions(async (newMessages) => {
    const newDocs = newMessages || [];
    const existIds = new Set(allSupportMessages.value.map(m => m._id));
    const toAdd = newDocs.filter(doc => !existIds.has(doc._id));

    if (toAdd.length > 0) {
      const normalizedToAdd = toAdd.map(doc => ({
        ...doc,
        createTime: parseCreateTime(doc.createTime)
      }));
      allSupportMessages.value = [...allSupportMessages.value, ...normalizedToAdd];

      for (const msg of normalizedToAdd) {
        if (msg.toOpenid !== 'support') continue;
        if (msg.fromOpenid !== adminOpenid.value) {
          const idx = sessions.value.findIndex(s => s.openid === msg.fromOpenid);
          if (idx >= 0) {
            sessions.value[idx].lastContent = msg.content;
            sessions.value[idx].lastTime = msg.createTime;
            sessions.value[idx].hasUnread = true;
          } else {
            await loadSessions();
            break;
          }
        }
      }
      if (currentSession.value) updateCurrentMessages();
    }
  });
}

function handleResize() {
  isMobile.value = window.innerWidth <= 768;
}

watch(() => props.mode, (newMode, oldMode) => {
  if (newMode !== oldMode) {
    // 1. 清空当前选中和消息
    currentSession.value = null;
    messages.value = [];
    allSupportMessages.value = [];
    inputText.value = '';

    // 2. 停止旧的实时监听（如果存在）
    if (watcher) {
      watcher.close();
      watcher = null;
    }

    // 3. 重新加载会话列表（service 是 computed 会根据 mode 自动切换）
    loadSessions();

    // 4. 如果是人工模式，启动监听
    if (newMode === 'manual') {
      startWatching();
    }
  }
});

// ---------- 生命周期 ----------
onMounted(() => {
  loadSessions();
  if (isManual.value) startWatching();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  if (watcher) {
    watcher.close();
    console.log('已关闭实时监听');
  }
  window.removeEventListener('resize', handleResize);
});
</script>
<style scoped>
.chat-dashboard {
  height: 100%;
}
.chat-card {
  height: calc(100vh - 104px);
  min-height: 500px;
}
.chat-container {
  display: flex;
  height: 100%;
  min-height: 0;
}
/* ========== 会话面板高度写死，完全仿造聊天框 ========== */
.session-panel {
  width: 300px;
  border-right: 1px solid #e7e7e7;
  /* 写死高度：卡片高度 - 卡片上下padding(约32px) */
  height: calc(100vh - 104px - 32px);
  min-height: 0;
  overflow: hidden;
  display: flex;        /* 关键：让 SessionList 填满 */
  flex-direction: column;
  flex-shrink: 0;
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
.user-name {
  font-weight: 500;
  font-size: 16px;
}
.user-openid {
  font-size: 12px;
  color: #999;
}
.message-list {
  height: calc(100vh - 104px - 60px - 60px - 100px); /* 与 ChatManage 相同，AI 模式实际会少输入框高度，但保留兼容 */
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
/* AI 模式下消息列表更高一些，因为无输入框 */
.ai-mode .message-list {
  height: calc(100vh - 104px - 60px - 60px);
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
  background: #e6f4ff;  /* 统一用淡蓝色表示客服/AI */
  color: #333;
}
.message-content {
  word-break: break-word;
}
.message-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
.message-input {
  padding: 16px;
  border-top: 1px solid #e7e7e7;
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-shrink: 0;
  max-height: 120px;
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
<style>
.chat-dashboard .message-list::-webkit-scrollbar {
  width: 6px;
}
.chat-dashboard .message-list::-webkit-scrollbar-track {
  background: transparent;
}
.chat-dashboard .message-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}
.chat-dashboard .message-list::-webkit-scrollbar-thumb:hover {
  background: #a0a0a0;
}
</style>