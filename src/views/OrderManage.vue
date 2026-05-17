<template>
  <!-- 
    订单管理页面
    【涉及数据库】orders, refunds
  -->
  <div class="order-manage">
    <!-- 标签页 -->
    <t-card :bordered="false" class="header-card">
      <t-tabs v-model="activeTab" @change="onTabChange">
        <t-tab-panel value="pending" label="待发货" />
        <t-tab-panel value="shipped" label="已发货" />
        <t-tab-panel value="completed" label="已完成" />
        <t-tab-panel value="refunding" label="退款中" />
        <t-tab-panel value="gift" label="赠送订单" />
      </t-tabs>
    </t-card>

    <!-- 订单表格 -->
    <t-card :bordered="false" class="table-card">
      <t-table
        :data="list"
        :columns="columns"
        row-key="_id"
        :loading="loading"
        :pagination="pagination"
        @page-change="onPageChange"
      >
        <template #items="{ row }">
          <div class="items-preview">
            <div v-for="(item, idx) in (row.items || []).slice(0, 2)" :key="idx" class="item-mini">
              <img :src="item.image || ''" class="item-img" />
              <span class="item-name">{{ item.name }}</span>
              <span class="item-meta">
                <span v-if="row.isGift">赠送 × {{ item.num }}</span>
                <span v-else>¥{{ item.price }} × {{ item.num }}</span>
              </span>
            </div>
            <div v-if="(row.items || []).length > 2" class="item-more">+{{ (row.items || []).length - 2 }} 件商品</div>
          </div>
        </template>
        <template #status="{ row }">
          <t-tag :theme="getStatusTheme(row.status)">{{ row.status }}</t-tag>
        </template>
        <template #totalPrice="{ row }">
          <t-tag v-if="row.isGift" theme="success" variant="light">赠送</t-tag>
          <span v-else>¥{{ Number(row.totalPrice || 0).toFixed(2) }}</span>
        </template>
        <template #createTime="{ row }">
          {{ formatTime(row.createTime) }}
        </template>
        <template #operation="{ row }">
          <t-space>
            <t-link v-if="activeTab === 'pending' && canShip(row)" theme="primary" @click="openShipDialog(row)">发货</t-link>
            <t-link v-if="activeTab === 'refunding'" theme="warning" @click="openRefundDialog(row)">处理退款</t-link>
            <t-link theme="default" @click="openDetailDialog(row)">详情</t-link>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 发货弹窗 -->
    <t-dialog v-model:visible="shipVisible" header="订单发货" @confirm="submitShip">
      <t-form label-width="100px">
        <t-form-item label="物流公司">
          <t-input v-model="shipForm.company" placeholder="请输入物流公司名称，如：顺丰速运" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 退款处理弹窗 -->
    <t-dialog v-model:visible="refundVisible" header="处理退款申请" @confirm="submitRefundProcess">
      <t-form label-width="100px">
        <t-form-item label="退款原因">
          <t-input :value="currentRefund.reason" readonly />
        </t-form-item>
        <t-form-item label="退款说明">
          <t-textarea :value="currentRefund.detail || '无'" readonly />
        </t-form-item>
        <t-form-item label="退款金额">
          <t-input :value="'¥' + Number(currentRefund.amount || 0).toFixed(2)" readonly />
        </t-form-item>
        <t-form-item label="处理方式">
          <t-radio-group v-model="refundForm.approved">
            <t-radio :value="true">同意退款</t-radio>
            <t-radio :value="false">驳回退款</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item label="处理备注">
          <t-textarea v-model="refundForm.note" placeholder="请输入处理备注（选填）" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 订单详情弹窗 -->
    <t-dialog v-model:visible="detailVisible" header="订单详情" :confirm-btn="null" cancel-btn="取消">
      <div v-if="currentOrder" class="order-detail">
        <div class="detail-row"><span class="detail-label">订单状态</span><t-tag :theme="getStatusTheme(currentOrder.status)">{{ currentOrder.status }}</t-tag></div>
        <div class="detail-row"><span class="detail-label">创建时间</span>{{ formatTime(currentOrder.createTime) }}</div>
        <div class="detail-row"><span class="detail-label">收货地址</span>{{ currentOrder.address ? formatAddress(currentOrder.address) : '暂无' }}</div>
        <div class="detail-row">
          <span class="detail-label">订单金额</span>
          <t-tag v-if="currentOrder.isGift" theme="success" variant="light">赠送订单</t-tag>
          <span v-else>¥{{ Number(currentOrder.totalPrice || 0).toFixed(2) }}</span>
        </div>
        <div v-if="currentOrder.logistics" class="detail-row"><span class="detail-label">物流信息</span>{{ currentOrder.logistics.company }} {{ currentOrder.logistics.shipmentOrderNo }}</div>
        <div class="detail-section">
          <div class="detail-label">商品清单</div>
          <div v-for="(item, idx) in (currentOrder.items || [])" :key="idx" class="detail-item">
            <img :src="item.image || ''" class="detail-img" />
            <div class="detail-item-info">
              <div>{{ item.name }}</div>
              <div class="detail-item-meta">
                <span v-if="currentOrder.isGift">赠送 × {{ item.num }}</span>
                <span v-else>¥{{ item.price }} × {{ item.num }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { orderService, shipService, refundService } from '../utils/cloudbase';

const userRole = ref(localStorage.getItem('admin_role') || 'admin');
const activeTab = ref('pending');
const allOrders = ref([]);
const allRefunds = ref([]);
const list = ref([]);
const loading = ref(false);

const shipVisible = ref(false);
const shipForm = reactive({ company: '', orderId: '' });

const refundVisible = ref(false);
const refundForm = reactive({ approved: true, note: '' });
const currentRefund = reactive({ _id: '', reason: '', detail: '', amount: 0 });

const detailVisible = ref(false);
const currentOrder = ref(null);

const pagination = reactive({ current: 1, pageSize: 10, total: 0 });

const columns = [
  { colKey: '_id', title: '订单ID', width: 220, ellipsis: true },
  { colKey: 'items', title: '商品', width: 280, cell: 'items' },
  { colKey: 'status', title: '状态', width: 100, cell: 'status' },
  { colKey: 'totalPrice', title: '金额', width: 100, cell: 'totalPrice' },
  { colKey: 'createTime', title: '创建时间', width: 160, cell: 'createTime' },
  { colKey: 'operation', title: '操作', width: 180, cell: 'operation' }
];

function getStatusTheme(status) {
  const map = {
    '待发货': 'warning',
    '已发货': 'primary',
    '已完成': 'success',
    '退款中': 'danger',
    '已退款': 'default',
    '退款失败': 'default',
    '赠送订单': 'success'
  };
  return map[status] || 'default';
}

function formatTime(dateLike) {
  if (!dateLike) return '';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

function formatAddress(address) {
  if (!address) return '';
  const parts = [
    address.province || '',
    address.city || '',
    address.district || '',
    address.detail || address.address || address.fullAddress || ''
  ];
  return parts.filter(Boolean).join('');
}

function canShip(row) {
  return row.status === '待发货';
}

async function loadOrders() {
  loading.value = true;
  try {
    const res = await orderService.listOrders();
    if (!res.success) {
      MessagePlugin.error(res.error || '加载订单失败');
      return;
    }
    allOrders.value = res.list || [];
    filterList();
  } catch (err) {
    MessagePlugin.error('加载订单失败: ' + err.message);
  } finally {
    loading.value = false;
  }
}

async function loadRefunds() {
  try {
    const res = await refundService.listRefunds();
    if (res.success) {
      allRefunds.value = res.list || [];
    }
  } catch (err) {
    console.error('加载退款失败', err);
  }
}

function filterList() {
  let data = [];
  if (activeTab.value === 'refunding') {
    // 退款中：从退款记录构建列表
    data = allRefunds.value
      .filter(r => r.status === '待审核')
      .map(r => ({
        _id: r.orderId,
        status: '退款中',
        totalPrice: r.amount,
        createTime: r.createTime,
        items: (r.order && r.order.items) || [],
        _refundId: r._id,
        _refundData: r
      }));
  } else if (activeTab.value === 'gift') {
    // 赠送订单：筛选 isGift 为 true 的订单
    data = allOrders.value.filter(o => o.isGift === true);
  } else {
    const statusMap = {
      pending: '待发货',
      shipped: '已发货',
      completed: '已完成'
    };
    const targetStatus = statusMap[activeTab.value];
    data = allOrders.value.filter(o => o.status === targetStatus && !o.isGift);
  }
  pagination.total = data.length;
  const start = (pagination.current - 1) * pagination.pageSize;
  list.value = data.slice(start, start + pagination.pageSize);
}

function onTabChange() {
  pagination.current = 1;
  if (activeTab.value === 'refunding') {
    loadRefunds().then(() => filterList());
  } else {
    filterList();
  }
}

function onPageChange(pageInfo) {
  pagination.current = pageInfo.current;
  filterList();
}

function openShipDialog(row) {
  shipForm.orderId = row._id;
  shipForm.company = '';
  shipVisible.value = true;
}

async function submitShip() {
  if (!shipForm.company) {
    MessagePlugin.warning('请输入物流公司');
    return;
  }
  try {
    const res = await shipService.shipOrder(shipForm.orderId, shipForm.company);
    if (res.success) {
      MessagePlugin.success('发货成功');
      shipVisible.value = false;
      await loadOrders();
      filterList();
    } else {
      MessagePlugin.error(res.error || '发货失败');
    }
  } catch (err) {
    MessagePlugin.error('发货失败: ' + err.message);
  }
}

function openRefundDialog(row) {
  const refund = row._refundData;
  if (!refund) return;
  Object.assign(currentRefund, {
    _id: refund._id,
    reason: refund.reason,
    detail: refund.detail,
    amount: refund.amount
  });
  refundForm.approved = true;
  refundForm.note = '';
  refundVisible.value = true;
}

async function submitRefundProcess() {
  try {
    const res = await refundService.processRefund(
      currentRefund._id,
      refundForm.approved,
      refundForm.note
    );
    if (res.success) {
      MessagePlugin.success(refundForm.approved ? '已同意退款' : '已驳回退款');
      refundVisible.value = false;
      await loadRefunds();
      filterList();
    } else {
      MessagePlugin.error(res.error || '操作失败');
    }
  } catch (err) {
    MessagePlugin.error('操作失败: ' + err.message);
  }
}

function openDetailDialog(row) {
  currentOrder.value = row;
  detailVisible.value = true;
}

onMounted(() => {
  loadOrders();
  loadRefunds();
});
</script>

<style scoped>
.order-manage { padding: 20px; background: #f5f7fa; min-height: 100vh; }
.header-card { margin-bottom: 16px; }
.table-card { margin-bottom: 16px; }

.items-preview { display: flex; flex-direction: column; gap: 6px; }
.item-mini { display: flex; align-items: center; gap: 8px; }
.item-img { width: 36px; height: 36px; object-fit: cover; border-radius: 4px; }
.item-name { font-size: 13px; color: #333; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-meta { font-size: 12px; color: #999; }
.item-more { font-size: 12px; color: #999; }

.order-detail { padding: 8px 0; }
.detail-row { display: flex; align-items: center; margin-bottom: 12px; }
.detail-label { width: 80px; color: #666; font-size: 14px; flex-shrink: 0; }
.detail-section { margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee; }
.detail-item { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.detail-img { width: 50px; height: 50px; object-fit: cover; border-radius: 6px; }
.detail-item-info { flex: 1; }
.detail-item-meta { font-size: 13px; color: #999; margin-top: 4px; }
</style>
