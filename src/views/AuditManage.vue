<template>
  <div class="audit-manage">
    <t-card :bordered="false" class="header-card">
      <div class="header-actions">
        <h3>审核管理</h3>
      </div>
    </t-card>

    <t-card :bordered="false">
      <t-tabs v-model="activeTab">
        <t-tab-panel value="merchant" label="商家入驻审核">
          <t-table
            :data="merchantList"
            :columns="merchantColumns"
            row-key="_id"
            :loading="merchantLoading"
            :pagination="merchantPagination"
            @page-change="onMerchantPageChange"
          >
            <template #operation="{ row }">
              <t-space v-if="row.status === 'pending'">
                <t-button theme="primary" size="small" @click="handleApproveMerchant(row)">
                  通过
                </t-button>
                <t-button theme="warning" size="small" @click="handleRejectMerchant(row)">
                  驳回
                </t-button>
              </t-space>
              <t-tag v-else :theme="row.status === 'approved' ? 'success' : 'danger'">
                {{ row.status === 'approved' ? '已通过' : '已驳回' }}
              </t-tag>
            </template>
          </t-table>
        </t-tab-panel>

        <t-tab-panel value="goods" label="商品审核">
          <t-table
            :data="goodsList"
            :columns="goodsColumns"
            row-key="_id"
            :loading="goodsLoading"
            :pagination="goodsPagination"
            @page-change="onGoodsPageChange"
          >
            <template #image="{ row }">
              <img :src="row.image" class="goods-image" />
            </template>
            <template #owner="{ row }">
              {{ row.ownerOpenid || '未知' }}
            </template>
            <template #operation="{ row }">
              <t-space v-if="row.status === 'pending'">
                <t-button theme="primary" size="small" @click="handleApproveGoods(row)">
                  通过
                </t-button>
                <t-button theme="warning" size="small" @click="handleRejectGoods(row)">
                  驳回
                </t-button>
              </t-space>
              <t-tag v-else :theme="row.status === 'approved' ? 'success' : 'danger'">
                {{ row.status === 'approved' ? '已通过' : '已拒绝' }}
              </t-tag>
            </template>
          </t-table>
        </t-tab-panel>
      </t-tabs>
    </t-card>

    <!-- 驳回理由输入弹窗 (共用) -->
    <t-dialog
      v-model:visible="rejectDialogVisible"
      header="驳回理由"
      @confirm="confirmReject"
    >
      <t-textarea v-model="rejectReason" placeholder="请输入驳回理由（可选）" />
    </t-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { auditService } from '../utils/cloudbase';

// 当前 tab
const activeTab = ref('merchant');

// ====== 商家审核 ======
const merchantList = ref([]);
const merchantLoading = ref(false);
const merchantPagination = reactive({ current: 1, pageSize: 10, total: 0 });

const merchantColumns = [
  { colKey: 'shopName', title: '店铺名称', width: 150 },
  { colKey: 'contactName', title: '联系人', width: 100 },
  { colKey: 'contactPhone', title: '联系电话', width: 130 },
  { colKey: 'shopAddress', title: '店铺地址', width: 200 },
  { colKey: 'createTime', title: '申请时间', width: 180, cell: (h, { row }) => formatTime(row.createTime) },
  { colKey: 'status', title: '状态', width: 100, cell: 'operation' },
  { colKey: 'operation', title: '操作', width: 150, cell: 'operation' }
];

async function loadMerchantList() {
  merchantLoading.value = true;
  try {
    const res = await auditService.listMerchantApplications();
    if (res.success) {
      merchantList.value = res.data || [];
      merchantPagination.total = merchantList.value.length;
    } else {
      MessagePlugin.error(res.error || '加载商家申请失败');
    }
  } catch (e) {
    MessagePlugin.error('请求失败');
  } finally {
    merchantLoading.value = false;
  }
}

// ====== 商品审核 ======
const goodsList = ref([]);
const goodsLoading = ref(false);
const goodsPagination = reactive({ current: 1, pageSize: 10, total: 0 });

const goodsColumns = [
  { colKey: 'image', title: '图片', width: 80, cell: 'image' },
  { colKey: 'name', title: '商品名称', width: 150 },
  { colKey: 'price', title: '价格', width: 100 },
  { colKey: 'ownerOpenid', title: '所属商家', width: 200, cell: 'owner' },
  { colKey: 'createdAt', title: '提交时间', width: 180, cell: (h, { row }) => formatTime(row.createdAt) },
  { colKey: 'status', title: '状态', width: 100, cell: 'operation' },
  { colKey: 'operation', title: '操作', width: 150, cell: 'operation' }
];

async function loadGoodsList() {
  goodsLoading.value = true;
  try {
    const res = await auditService.listPendingGoods();
    if (res.success) {
      // 只展示 pending 状态的商品
      goodsList.value = (res.data || []).filter(item => item.status === 'pending');
      goodsPagination.total = goodsList.value.length;
    } else {
      MessagePlugin.error(res.error || '加载待审核商品失败');
    }
  } catch (e) {
    MessagePlugin.error('请求失败');
  } finally {
    goodsLoading.value = false;
  }
}

// ====== 通用驳回弹窗 ======
const rejectDialogVisible = ref(false);
const rejectReason = ref('');
let currentRejectTarget = null;   // 当前待驳回的行数据
let currentRejectType = '';       // 'merchant' 或 'goods'

function showRejectDialog(row, type) {
  currentRejectTarget = row;
  currentRejectType = type;
  rejectReason.value = '';
  rejectDialogVisible.value = true;
}

async function confirmReject() {
  if (!currentRejectTarget) return;
  const reason = rejectReason.value.trim();
  try {
    if (currentRejectType === 'merchant') {
      const res = await auditService.reviewMerchantApplication(currentRejectTarget._id, false, reason);
      if (res.success) {
        MessagePlugin.success('已驳回');
        loadMerchantList();
      } else {
        MessagePlugin.error(res.error || '驳回失败');
      }
    } else if (currentRejectType === 'goods') {
      const res = await auditService.reviewGoods(currentRejectTarget._id, false, reason);
      if (res.success) {
        MessagePlugin.success('已驳回');
        loadGoodsList();
      } else {
        MessagePlugin.error(res.error || '驳回失败');
      }
    }
  } catch (e) {
    MessagePlugin.error('操作失败');
  } finally {
    rejectDialogVisible.value = false;
  }
}

// 商家审核操作
async function handleApproveMerchant(row) {
  const res = await auditService.reviewMerchantApplication(row._id, true);
  if (res.success) {
    MessagePlugin.success('已通过审核');
    loadMerchantList();
  } else {
    MessagePlugin.error(res.error || '操作失败');
  }
}

function handleRejectMerchant(row) {
  showRejectDialog(row, 'merchant');
}

// 商品审核操作
async function handleApproveGoods(row) {
  const res = await auditService.reviewGoods(row._id, true);
  if (res.success) {
    MessagePlugin.success('已通过审核');
    loadGoodsList();
  } else {
    MessagePlugin.error(res.error || '操作失败');
  }
}

function handleRejectGoods(row) {
  showRejectDialog(row, 'goods');
}

// 分页处理 (前端分页，因为数据量不大)
function onMerchantPageChange(pageInfo) {
  merchantPagination.current = pageInfo.current;
}
function onGoodsPageChange(pageInfo) {
  goodsPagination.current = pageInfo.current;
}

function formatTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-CN');
}

// 初次加载
onMounted(async () => {
  loadMerchantList();
  loadGoodsList();
});
</script>

<style scoped>
.audit-manage { padding: 20px; background: #f5f7fa; min-height: 100vh; }
.header-card { margin-bottom: 16px; }
.header-actions { display: flex; justify-content: space-between; align-items: center; }
.goods-image { width: 60px; height: 60px; object-fit: cover; border-radius: 8px; }
</style>