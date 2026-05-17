<template>
  <!-- 
    反馈管理页面
    【涉及数据库】feedbacks
  -->
  <div class="feedback-manage">
    <t-card :bordered="false" class="header-card">
      <div class="header-actions">
        <t-space>
          <t-button theme="primary" @click="fetchFeedbackList">刷新列表</t-button>
          <t-button theme="warning" @click="handleMarkAllProcessed">一键已处理</t-button>
        </t-space>
      </div>
    </t-card>

    <t-card :bordered="false" class="table-card">
      <t-table
        :data="feedbackList"
        :columns="columns"
        row-key="_id"
        :loading="loading"
        :pagination="pagination"
        @page-change="onPageChange"
      >
        <template #status="{ row }">
          <t-tag :theme="row.status === '未处理' ? 'warning' : 'success'">
            {{ row.status || '未处理' }}
          </t-tag>
        </template>
        <template #operation="{ row }">
          <t-button
            v-if="row.status === '未处理'"
            size="small"
            theme="primary"
            @click="handleMarkProcessed(row._id)"
          >
            标记已处理
          </t-button>
          <span v-else style="color: #999;">已处理</span>
        </template>
      </t-table>
    </t-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { feedbackService } from '../utils/cloudbase';
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next';

const feedbackList = ref([]);
const loading = ref(false);

const pagination = reactive({ current: 1, pageSize: 10, total: 0 });

const columns = [
  { colKey: 'nickName', title: '用户昵称', width: 120 },
  { colKey: 'content', title: '反馈内容', width: 300 },
  { colKey: 'contact', title: '联系方式', width: 150 },
  { colKey: 'createTime', title: '提交时间', width: 180, cell: (h, { row }) => new Date(row.createTime).toLocaleString() },
  { colKey: 'status', title: '状态', width: 100, cell: 'status' },
  { colKey: 'operation', title: '操作', width: 120, cell: 'operation' }
];

// 加载反馈列表
async function fetchFeedbackList() {
  loading.value = true;
  try {
    const res = await feedbackService.list();
    if (res.success) {
      feedbackList.value = res.list || [];
      pagination.total = feedbackList.value.length;
    } else {
      MessagePlugin.error(res.error || '加载失败');
    }
  } catch (err) {
    MessagePlugin.error('加载失败');
  } finally {
    loading.value = false;
  }
}

// 分页处理
function onPageChange(pageInfo) {
  pagination.current = pageInfo.current;
  // 本地分页，无需重新请求
}

// 标记已处理
async function handleMarkProcessed(id) {
  try {
    const res = await feedbackService.markProcessed(id);
    if (res.success) {
      MessagePlugin.success('已标记处理');
      await fetchFeedbackList();
    } else {
      MessagePlugin.error(res.error || '操作失败');
    }
  } catch (err) {
    MessagePlugin.error('操作失败');
  }
}

onMounted(() => {
  fetchFeedbackList();
});

// 一键标记所有未处理反馈为已处理
async function handleMarkAllProcessed() {
  const unprocessedCount = feedbackList.value.filter(item => item.status === '未处理').length;
  if (unprocessedCount === 0) {
    MessagePlugin.info('没有需要处理的反馈');
    return;
  }

  // 弹出确认框
  const confirmed = await new Promise(resolve => {
    const dialog = DialogPlugin.confirm({
      header: '确认操作',
      body: `确定要将当前 ${unprocessedCount} 条未处理反馈全部标记为“已处理”吗？`,
      onConfirm: () => { dialog.hide(); resolve(true); },
      onCancel: () => { dialog.hide(); resolve(false); },
      onClose: () => { dialog.hide(); resolve(false); }
    });
  });

  if (!confirmed) return;

  try {
    const res = await feedbackService.markAllProcessed();
    if (res.success) {
      MessagePlugin.success(`已标记 ${res.updated} 条反馈为“已处理”`);
      await fetchFeedbackList();
    } else {
      MessagePlugin.error(res.error || '操作失败');
    }
  } catch (err) {
    MessagePlugin.error('操作失败');
  }
}
</script>

<style scoped>
.feedback-manage {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}
.header-card {
  margin-bottom: 16px;
}
.header-actions {
  display: flex;
  justify-content: flex-start;
}
</style>