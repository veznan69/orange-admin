<template>
  <!-- 
    客服聊天管理页面
    【涉及数据库】chat_messages
  -->
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
                <div class="message-body">
                  <div class="message-bubble">
                    <div class="message-content">{{ msg.content }}</div>
                  </div>
                  <!-- ✅ 将时间从气泡内移出，放在气泡下面 -->
                  <div class="message-time">{{ formatTime(msg.createTime) }}</div>
                </div>
              </div>
            </div>

            <!-- 输入区域 -->
            <div class="message-input">
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
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { chatService } from '../utils/cloudbase';
import SessionList from '../components/SessionList.vue';

const adminOpenid = 'ojWd418mR3Z_TqtUeq5wJo4BisdQ';

const isMobile = ref(window.innerWidth <= 768);
const sessions = ref([]);
const loadingSessions = ref(false);
const currentSession = ref(null);
const messages = ref([]);
const loadingMessages = ref(false);
const inputText = ref('');
const sending = ref(false);
const messageListRef = ref(null);

// ✅ 新增：用于存储“所有用户发给客服的实时消息”
const allSupportMessages = ref([]);
// ✅ 新增：监听器对象
let watcher = null;

function parseCreateTime(ct) {
  if (!ct) return new Date().toISOString();
  // 处理纯数字时间戳（毫秒）
  if (typeof ct === 'number') return new Date(ct).toISOString();
  if (typeof ct === 'string') {
    // 如果字符串是纯数字，也当作时间戳处理
    if (/^\d+$/.test(ct)) return new Date(Number(ct)).toISOString();
    return ct;
  }
  if (ct.$date) return ct.$date;
  if (ct instanceof Date) return ct.toISOString();
  return String(ct);
}

// 加载会话列表
async function loadSessions() {
  console.log('开始加载会话列表...');
  loadingSessions.value = true;
  try {
    const res = await chatService.listSessions();
    console.log('云函数返回原始数据:', JSON.stringify(res, null, 2));
    if (res.success) {
      sessions.value = (res.sessions || []).map(s => ({
        ...s,
        // 确保会话对象包含所有必需字段
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
  
  // 1. 先通过云函数获取该用户的完整历史消息
  const res = await chatService.getSessionMessages(session.openid);
  if (res.success && res.messages) {
    // 2. 将历史消息合并到 allSupportMessages 中（去重）
    const existIds = new Set(allSupportMessages.value.map(m => m._id));
    const newMessages = res.messages.filter(m => !existIds.has(m._id));
    allSupportMessages.value = [...allSupportMessages.value, ...newMessages];
  }
  // 从已有的实时数据中筛选消息
  updateCurrentMessages();
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
      // ✅ 手动添加本地消息
      allSupportMessages.value.push({
        _id: Date.now().toString(),
        fromOpenid: adminOpenid,
        toOpenid: currentSession.value.openid,
        content,
        createTime: new Date().toISOString()
      });
      updateCurrentMessages();

      // ✅ 立即消除当前会话红点
      currentSession.value.hasUnread = false;
      const sessionIndex = sessions.value.findIndex(s => s.openid === currentSession.value.openid);
      if (sessionIndex !== -1) {
        sessions.value[sessionIndex].hasUnread = false;
      }

      // 可选：刷新会话列表（保证其他会话状态最新）
      // await loadSessions();
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

// ✅ 修改：启动实时监听
async function startWatching() {
  console.log('开始实时监听客服消息...');

  watcher = chatService.watchSessions(async (newMessages) => {
    const newDocs = newMessages || [];
    const existIds = new Set(allSupportMessages.value.map(m => m._id));
    const toAdd = newDocs.filter(doc => !existIds.has(doc._id));

    if (toAdd.length > 0) {
      // ✅ 统一转换 createTime
      const normalizedToAdd = toAdd.map(doc => ({
        ...doc,
        createTime: parseCreateTime(doc.createTime)
      }));
      allSupportMessages.value = [...allSupportMessages.value, ...normalizedToAdd];

      // 遍历规范化后的消息（不要再遍历旧的 toAdd）
      for (const msg of normalizedToAdd) {
        const senderOpenid = msg.fromOpenid;
        if (msg.toOpenid !== 'support') continue;
        if (senderOpenid !== adminOpenid) {
          const existingIndex = sessions.value.findIndex(
            s => s.openid === senderOpenid
          );
          if (existingIndex >= 0) {
            const session = sessions.value[existingIndex];
            session.lastContent = msg.content;
            session.lastTime = msg.createTime;
            session.hasUnread = true;
          } else {
            await loadSessions();
            break;
          }
        }
      }

      if (currentSession.value) {
        updateCurrentMessages();
      }
    }
  });
}

// ✅ 新增：从所有消息中筛选出当前会话的消息
function updateCurrentMessages() {
  const currentUserOpenid = currentSession.value.openid;
  const adminOpenid = 'ojWd418mR3Z_TqtUeq5wJo4BisdQ';

  messages.value = allSupportMessages.value.filter(msg =>
    (msg.fromOpenid === currentUserOpenid && msg.toOpenid === 'support') ||
    (msg.fromOpenid === adminOpenid && msg.toOpenid === currentUserOpenid)
  );

  messages.value.forEach(msg => {
    const timeMs = new Date(parseCreateTime(msg.createTime)).getTime();
    msg._sortTime = isNaN(timeMs) ? Infinity : timeMs;
  });

  messages.value.sort((a, b) => {
    if (a._sortTime !== b._sortTime) return a._sortTime - b._sortTime;
    return String(a._id || '').localeCompare(String(b._id || ''));
  });

  // ✅ 临时调试日志（可复制到控制台发给助手）
  console.log('当前会话消息顺序（时间戳从小到大）:',
    messages.value.map(m => ({
      content: m.content?.slice(0, 15),
      _sortTime: m._sortTime,
      createTime: m.createTime
    }))
  );

  // 清理临时属性
  messages.value.forEach(msg => delete msg._sortTime);

  scrollToBottom();
}

// 格式化时间
function formatTime(dateParam) {
  if (!dateParam) return '未知时间';     // 无时间数据时给出提示
  const d = new Date(dateParam);
  if (Number.isNaN(d.getTime())) return '未知时间'; // 无效时间

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

// 监听窗口大小变化
function handleResize() {
  isMobile.value = window.innerWidth <= 768;
}

onMounted(() => {
  loadSessions();
  startWatching();  // ✅ 启动实时监听
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  // ✅ 修改：关闭监听器
  if (watcher) {
    watcher.close();
    console.log('已关闭实时监听');
  }
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
  height: 100%;          /* ✅ 新增 */
  overflow: hidden;      /* ✅ 确保它本身不滚动，让子元素 session-items 滚动 */
}
.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* 不再需要 min-height: 0;，因为 message-list 将写死高度 */
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
  /* 写死高度：100vh（视口高度） 
     - 104px (你预设的 .chat-card 的上下内边距总和，或者直接减去已知固定高度)
     - 60px  (顶部应用栏高度，在 App.vue 中设定)
     - 约 60px (会话头部 .chat-header 的高度)
     - 约 100px (输入框 .message-input 的最大高度)
     实际使用时可以根据你的布局微调这个值 */
  height: calc(100vh - 104px - 60px - 60px - 100px);
  
  padding: 16px;
  overflow-y: auto;        /* 高度写死后，溢出必然滚动 */
  display: flex;
  flex-direction: column;
  gap: 16px;
  
  /* 移除 flex: 1 和 min-height: 0，不再参与弹性计算 */
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
  align-items: flex-start; /* 左对齐 */
}
.self .message-body {
  align-items: flex-end; /* 自己的消息右对齐 */
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
  color: #999;
  /* 管理员消息时间颜色可与气泡内保持一致，这里用半透白 */
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

<style>
/* 聊天消息区域滚动条美化（必须放在非 scoped 块中） */
.chat-manage .message-list::-webkit-scrollbar {
  width: 6px;
}
.chat-manage .message-list::-webkit-scrollbar-track {
  background: transparent;
}
.chat-manage .message-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}
.chat-manage .message-list::-webkit-scrollbar-thumb:hover {
  background: #a0a0a0;
}
</style>