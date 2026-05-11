<template>
  <div class="broadcast-manage">
    <!-- 发送广播 -->
    <t-card :bordered="false" class="compose-card">
      <template #header>
        <div class="card-header">
          <span class="title">发送广播</span>
          <t-tag theme="warning" variant="light">所有用户将在"我的消息"中收到</t-tag>
        </div>
      </template>

      <t-form :data="formData" label-width="80px" @submit="handleSend">
        <t-form-item label="标题" name="title">
          <t-input
            v-model="formData.title"
            placeholder="请输入消息标题"
            maxlength="50"
            show-limit-number
          />
        </t-form-item>
        <t-form-item label="内容" name="content">
          <t-textarea
            v-model="formData.content"
            placeholder="请输入消息内容"
            :autosize="{ minRows: 4, maxRows: 10 }"
            maxlength="500"
            show-limit-number
          />
        </t-form-item>
        <t-form-item>
          <t-space>
            <t-button
              theme="primary"
              type="submit"
              :loading="sending"
              :disabled="!formData.title || !formData.content"
            >
              发送广播
            </t-button>
            <t-button theme="default" @click="resetForm">清空</t-button>
          </t-space>
        </t-form-item>
      </t-form>
    </t-card>

    <!-- 广播历史 -->
    <t-card :bordered="false" class="history-card">
      <template #header>
        <div class="card-header">
          <span class="title">广播历史</span>
          <t-button size="small" theme="primary" variant="outline" @click="fetchHistory">
            刷新
          </t-button>
        </div>
      </template>

      <t-table
        :data="historyList"
        :columns="columns"
        row-key="_id"
        :loading="loading"
        :pagination="pagination"
        @page-change="onPageChange"
      >
        <template #createTime="{ row }">
          {{ formatTime(row.createTime) }}
        </template>
        <template #operation="{ row }">
          <t-popconfirm content="删除后所有用户将不再看到此广播，确认删除？" @confirm="handleDelete(row._id)">
            <t-link theme="danger">删除</t-link>
          </t-popconfirm>
        </template>
      </t-table>

      <t-empty v-if="!loading && historyList.length === 0" description="暂无广播记录" />
    </t-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next';
import { broadcastService } from '../utils/cloudbase';

const sending = ref(false);
const loading = ref(false);
const historyList = ref([]);

const formData = reactive({
  title: '',
  content: ''
});

const pagination = reactive({ current: 1, pageSize: 10, total: 0 });

const columns = [
  { colKey: 'title', title: '标题', width: 200, ellipsis: true },
  { colKey: 'content', title: '内容', width: 400, ellipsis: true },
  { colKey: 'createTime', title: '发送时间', width: 180, cell: 'createTime' },
  { colKey: 'operation', title: '操作', width: 100, cell: 'operation' }
];

function formatTime(time) {
  if (!time) return '-';
  try {
    return new Date(time).toLocaleString('zh-CN');
  } catch {
    return '-';
  }
}

function resetForm() {
  formData.title = '';
  formData.content = '';
}

async function handleSend() {
  if (!formData.title.trim() || !formData.content.trim()) {
    MessagePlugin.warning('标题和内容不能为空');
    return;
  }

  const confirmed = await new Promise(resolve => {
    const dialog = DialogPlugin.confirm({
      header: '确认发送',
      body: `确定将「${formData.title.trim()}」发送给所有用户吗？`,
      onConfirm: () => { dialog.hide(); resolve(true); },
      onCancel: () => { dialog.hide(); resolve(false); },
      onClose: () => { dialog.hide(); resolve(false); }
    });
  });

  if (!confirmed) return;

  sending.value = true;
  try {
    const res = await broadcastService.broadcast(
      formData.title.trim(),
      formData.content.trim()
    );
    if (res.success) {
      MessagePlugin.success('广播发送成功');
      resetForm();
      fetchHistory();
    } else {
      MessagePlugin.error(res.error || '发送失败');
    }
  } catch (err) {
    console.error('广播发送失败:', err);
    MessagePlugin.error('发送失败，请稍后重试');
  } finally {
    sending.value = false;
  }
}

async function fetchHistory() {
  loading.value = true;
  try {
    const res = await broadcastService.listHistory();
    if (res.success) {
      historyList.value = res.list || [];
      pagination.total = historyList.value.length;
    } else {
      MessagePlugin.error(res.error || '加载失败');
    }
  } catch (err) {
    console.error('获取广播历史失败:', err);
    MessagePlugin.error('加载失败');
  } finally {
    loading.value = false;
  }
}

async function handleDelete(id) {
  try {
    const res = await broadcastService.deleteBroadcast(id);
    if (res.success) {
      MessagePlugin.success('删除成功');
      fetchHistory();
    } else {
      MessagePlugin.error(res.error || '删除失败');
    }
  } catch (err) {
    console.error('删除广播失败:', err);
    MessagePlugin.error('删除失败');
  }
}

function onPageChange(pageInfo) {
  pagination.current = pageInfo.current;
}

onMounted(() => {
  fetchHistory();
});
</script>

<style scoped>
.broadcast-manage {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}
.compose-card {
  margin-bottom: 16px;
  max-width: 680px;
}
.history-card {
  margin-top: 16px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-header .title {
  font-size: 16px;
  font-weight: 600;
}
</style>
