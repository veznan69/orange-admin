<template>
  <div class="data-manage-container">
    <!-- 密码验证弹窗 -->
    <t-dialog
      v-model:visible="authDialogVisible"
      header="管理员身份验证"
      :close-on-overlay-click="false"
      :close-btn="false"
      :confirm-btn="{ content: '验证', theme: 'primary' }"
      :cancel-btn="{ content: '返回', theme: 'default' }"
      @confirm="handleAuthConfirm"
      @cancel="handleAuthCancel"
      @close="handleAuthCancel"
    >
      <t-form :data="authForm" layout="vertical">
        <t-form-item label="管理员ID">
          <t-input v-model="authForm.adminId" placeholder="请输入管理员ID" />
        </t-form-item>
        <t-form-item label="密码">
          <t-input v-model="authForm.password" type="password" placeholder="请输入密码" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 主内容区：仅验证通过后显示 -->
    <t-card v-if="isAuthenticated" title="批量数据删除" subtitle="⚠️ 危险操作，请谨慎使用">
      <t-alert theme="error" message="警告：此功能将永久删除选定集合的所有数据，操作不可恢复！" style="margin-bottom: 16px;" />
      
      <t-form :data="formData" layout="vertical">
        <t-form-item label="选择数据集合">
          <t-select v-model="formData.collection" placeholder="请选择要删除的数据集合">
            <t-option v-for="item in collectionOptions" :key="item.value" :label="item.label" :value="item.value" />
          </t-select>
        </t-form-item>
        
        <t-form-item label="数据预览">
          <t-button theme="default" :disabled="!formData.collection || loading" @click="previewData">
            <t-icon name="search" />
            查询数据量
          </t-button>
          <span v-if="dataCount !== null" style="margin-left: 12px; color: #ff6600; font-weight: bold;">
            该集合共有 {{ dataCount }} 条数据
          </span>
        </t-form-item>

        <t-form-item>
          <t-button theme="danger" :disabled="!formData.collection || !isAuthenticated || loading" @click="handleDelete">
            <t-icon name="delete" />
            批量删除全部数据
          </t-button>
          <span v-if="!isAuthenticated" style="margin-left: 12px; color: #999;">
            （需先通过身份验证）
          </span>
        </t-form-item>
      </t-form>
    </t-card>

    <!-- 支持扩展的数据集合列表：仅验证通过后显示 -->
    <t-card v-if="isAuthenticated" title="可管理的数据集合" style="margin-top: 16px;">
      <t-table
        :data="collectionTableData"
        :columns="collectionColumns"
        row-key="value"
        size="small"
      />
    </t-card>

    <!-- 未验证时显示占位提示 -->
    <t-card v-if="!isAuthenticated" title="访问受限" style="margin-top: 16px;">
      <t-alert theme="warning" message="请先完成管理员身份验证" />
    </t-card>
  </div>
</template>

<script setup>
/**
 * 数据管理页面 - 批量删除数据
 * 
 * 【涉及数据库集合】
 * - orders: 订单数据
 * - refunds: 退款记录
 * - adoptions: 认养记录
 * - verify_logs: 核销日志
 * - users: 管理员身份验证
 * 
 * 【调用云函数】
 * - adminAuth: 验证管理员身份、查询数据量、删除数据
 */
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { MessagePlugin } from 'tdesign-vue-next';
import { db, _ } from '../utils/cloudbase';

const router = useRouter();

// 身份验证状态
const isAuthenticated = ref(false);
const authDialogVisible = ref(true);
const loading = ref(false);
const dataCount = ref(null);

// 身份验证表单
const authForm = reactive({
  adminId: '',
  password: ''
});

// 删除表单
const formData = reactive({
  collection: ''
});

// 可管理的数据集合配置（方便扩展）
const collectionOptions = [
  { label: '订单数据 (orders + refunds)', value: 'orders', description: '用户订单信息及关联退款记录' },
  { label: '认养数据 (adoptions + verify_logs)', value: 'adoptions', description: '果树认养记录及核销日志（包含所有核销码）' },
  // 预留扩展：后续可添加更多集合
  // { label: '用户数据 (users)', value: 'users', description: '用户信息' },
  // { label: '商品数据 (goods)', value: 'goods', description: '商品信息' },
];

// 关联集合映射（删除主集合时同步删除的关联集合）
const relatedCollections = {
  orders: ['refunds'],      // 删除 orders 时同时删除 refunds
  adoptions: ['verify_logs'] // 删除 adoptions 时同时删除 verify_logs（核销日志包含核销码）
};

const collectionTableData = computed(() => collectionOptions);

const collectionColumns = [
  { colKey: 'label', title: '集合名称' },
  { colKey: 'value', title: '集合标识' },
  { colKey: 'description', title: '说明' }
];

// 调用云函数验证管理员身份
async function verifyAdminPassword() {
  const app = (await import('../utils/cloudbase')).app;
  const adminOpenid = localStorage.getItem('admin_openid');
  
  const res = await app.callFunction({
    name: 'adminAuth',
    data: {
      adminId: adminOpenid || authForm.adminId,
      password: authForm.password
    }
  });
  
  return res.result;
}

// 身份验证确认
async function handleAuthConfirm() {
  if (!authForm.adminId.trim()) {
    MessagePlugin.error('请输入管理员ID');
    return;
  }
  if (!authForm.password) {
    MessagePlugin.error('请输入密码');
    return;
  }
  
  loading.value = true;
  try {
    const result = await verifyAdminPassword();
    
    if (!result.success) {
      MessagePlugin.error(result.error || '验证失败');
      authForm.password = '';
      return;
    }
    
    isAuthenticated.value = true;
    authDialogVisible.value = false;
    MessagePlugin.success('身份验证通过');
  } catch (error) {
    console.error('验证请求失败:', error);
    MessagePlugin.error('验证请求失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

// 身份验证取消
function handleAuthCancel() {
  // 验证失败，强制跳转到数据看板
  authDialogVisible.value = false;
  router.push('/dashboard');
}

// 调用云函数查询数据量
async function getCollectionCount(collectionName) {
  const app = (await import('../utils/cloudbase')).app;
  const adminOpenid = localStorage.getItem('admin_openid');
  
  const res = await app.callFunction({
    name: 'adminAuth',
    data: {
      action: 'getCollectionCount',
      collection: collectionName,
      adminOpenid
    }
  });
  
  return res.result;
}

// 预览数据量
async function previewData() {
  if (!formData.collection) {
    MessagePlugin.warning('请先选择数据集合');
    return;
  }
  
  loading.value = true;
  try {
    // 查询主集合数据量（通过云函数）
    const mainResult = await getCollectionCount(formData.collection);
    if (!mainResult.success) {
      MessagePlugin.error(mainResult.error || '查询失败');
      dataCount.value = null;
      return;
    }
    const mainCount = mainResult.count || 0;
    
    // 查询关联集合数据量
    const related = relatedCollections[formData.collection] || [];
    let relatedInfo = [];
    for (const coll of related) {
      const result = await getCollectionCount(coll);
      relatedInfo.push(`${coll}: ${result.count || 0}条`);
    }
    
    const relatedText = relatedInfo.length > 0 ? ` (关联 ${relatedInfo.join(', ')})` : '';
    dataCount.value = `${mainCount}条${relatedText}`;
  } catch (error) {
    console.error('查询失败:', error);
    MessagePlugin.error('查询失败: ' + error.message);
    dataCount.value = null;
  } finally {
    loading.value = false;
  }
}

// 调用云函数删除集合数据
async function deleteCollectionData(collectionName) {
  const app = (await import('../utils/cloudbase')).app;
  const adminOpenid = localStorage.getItem('admin_openid');
  
  const res = await app.callFunction({
    name: 'adminAuth',
    data: {
      action: 'deleteCollection',
      collection: collectionName,
      adminOpenid
    }
  });
  
  return res.result;
}

// 调用云函数删除认养数据（包含关联订单）
async function deleteAdoptionData() {
  const app = (await import('../utils/cloudbase')).app;
  const adminOpenid = localStorage.getItem('admin_openid');
  
  const res = await app.callFunction({
    name: 'adminAuth',
    data: {
      action: 'deleteAdoptionData',
      adminOpenid
    }
  });
  
  return res.result;
}

// 删除数据
async function handleDelete() {
  if (!formData.collection) {
    MessagePlugin.warning('请先选择数据集合');
    return;
  }
  
  // 特殊处理：认养数据删除需要同步删除关联订单
  if (formData.collection === 'adoptions') {
    const confirmText = `确定要删除【认养数据】吗？这将同时删除：\n- 所有认养记录\n- 所有核销日志\n- 所有认养相关的订单\n\n此操作不可恢复！`;
    if (!confirm(confirmText)) {
      return;
    }
    
    // 二次确认
    if (!confirm('⚠️ 最后确认：认养数据及其关联订单删除后将永久丢失，是否继续？')) {
      return;
    }

    loading.value = true;
    try {
      const result = await deleteAdoptionData();
      if (!result.success) {
        MessagePlugin.error(`删除失败: ${result.error}`);
        loading.value = false;
        return;
      }
      
      MessagePlugin.success(result.message || '成功删除认养数据及其关联订单');
      dataCount.value = null;
      formData.collection = '';
    } catch (error) {
      console.error('删除失败:', error);
      MessagePlugin.error('删除失败: ' + error.message);
    } finally {
      loading.value = false;
    }
    return;
  }
  
  // 获取关联集合
  const related = relatedCollections[formData.collection] || [];
  const allCollections = [formData.collection, ...related];
  
  // 再次确认
  const confirmText = `确定要删除【${allCollections.join(' + ')}】集合的全部数据吗？此操作不可恢复！`;
  if (!confirm(confirmText)) {
    return;
  }
  
  // 二次确认
  if (!confirm('⚠️ 最后确认：数据删除后将永久丢失，是否继续？')) {
    return;
  }

  loading.value = true;
  try {
    const results = [];
    
    // 1. 先删除关联集合（避免外键约束问题）
    for (const coll of related) {
      const result = await deleteCollectionData(coll);
      if (!result.success) {
        MessagePlugin.error(`删除 ${coll} 失败: ${result.error}`);
        loading.value = false;
        return;
      }
      results.push(`${coll}: ${result.deletedCount}条`);
    }
    
    // 2. 删除主集合
    const mainResult = await deleteCollectionData(formData.collection);
    if (!mainResult.success) {
      MessagePlugin.error(`删除 ${formData.collection} 失败: ${mainResult.error}`);
      loading.value = false;
      return;
    }
    results.push(`${formData.collection}: ${mainResult.deletedCount}条`);
    
    MessagePlugin.success(`成功删除数据 - ${results.join(', ')}`);
    dataCount.value = null;
    formData.collection = '';
  } catch (error) {
    console.error('删除失败:', error);
    MessagePlugin.error('删除失败: ' + error.message);
  } finally {
    loading.value = false;
  }
}

// 页面加载时检查身份验证状态
onMounted(() => {
  // 重置认证状态，每次进入页面都需要重新验证
  isAuthenticated.value = false;
  authDialogVisible.value = true;
  authForm.adminId = '';
  authForm.password = '';
  dataCount.value = null;
  formData.collection = '';
});
</script>

<style scoped>
.data-manage-container {
  padding: 16px;
}

:deep(.t-card__title) {
  font-weight: bold;
}

:deep(.t-alert--error) {
  background-color: #fff0f0;
  border-color: #ffcccc;
}
</style>
