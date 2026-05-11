<template>
  <div class="coupon-manage">
    <!-- 头部操作栏 -->
    <t-card :bordered="false" class="header-card">
      <div class="header-actions">
        <t-space>
          <t-button theme="primary" @click="fetchList">刷新</t-button>
          <t-button @click="openAddDialog">新增优惠券</t-button>
        </t-space>
        <t-tag theme="primary">管理员</t-tag>
      </div>
    </t-card>

    <!-- 优惠券表格 -->
    <t-card :bordered="false" class="table-card">
      <t-table
        :data="couponList"
        :columns="columns"
        row-key="_id"
        :loading="loading"
        :pagination="pagination"
        @page-change="onPageChange"
      >
        <template #rule="{ row }">
          {{ row.type === 'discount' ? `${row.value}折` : `满${row.minAmount}减${row.value}` }}
        </template>
        <template #time="{ row }">
          <span v-if="row.startTime || row.endTime">
            {{ formatDate(row.startTime) || '?' }} ~ {{ formatDate(row.endTime) || '?' }}
          </span>
          <span v-else>未设置</span>
        </template>
        <template #status="{ row }">
          <t-tag :theme="row.status ? 'success' : 'default'">
            {{ row.status ? '启用' : '禁用' }}
          </t-tag>
        </template>
        <template #operation="{ row }">
          <t-space>
            <t-link theme="primary" @click="openEditDialog(row)">编辑</t-link>
            <t-popconfirm content="确认删除该优惠券？" @confirm="deleteCoupon(row._id)">
              <t-link theme="danger">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 新增/编辑弹窗 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :header="isEdit ? '编辑优惠券' : '新增优惠券'"
      width="580px"
      @confirm="submitForm"
    >
      <t-form :data="formData" label-width="110px">
        <t-row :gutter="16">
          <t-col :span="6">
            <t-form-item label="优惠券名称" name="name">
              <t-input v-model="formData.name" placeholder="如：新年满减券" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="类型" name="type">
              <t-select v-model="formData.type">
                <t-option value="cash" label="现金券" />
                <t-option value="discount" label="折扣券" />
                <t-option value="special" label="特殊券" />
              </t-select>
            </t-form-item>
          </t-col>
        </t-row>
        <t-row :gutter="16">
          <t-col :span="6">
            <t-form-item label="优惠金额" name="value">
              <t-input-number v-model="formData.value" :min="0" :decimal-places="2" />
              <template #tips>现金券为元，折扣券为%</template>
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="最低消费" name="minAmount">
              <t-input-number v-model="formData.minAmount" :min="0" :decimal-places="2" />
              <template #tips>0 表示无门槛</template>
            </t-form-item>
          </t-col>
        </t-row>
        <t-row :gutter="16">
          <t-col :span="6">
            <t-form-item label="最高优惠" name="maxDiscount">
              <t-input-number v-model="formData.maxDiscount" :min="0" :decimal-places="2" />
              <template #tips>0 表示不限制</template>
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="库存" name="stock">
              <t-input-number v-model="formData.stock" :min="-1" />
              <template #tips>-1 无限量</template>
            </t-form-item>
          </t-col>
        </t-row>
        <t-row :gutter="16">
          <t-col :span="6">
            <t-form-item label="每人限领" name="limitPerUser">
              <t-input-number v-model="formData.limitPerUser" :min="0" />
              <template #tips>0 不限</template>
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="使用范围" name="range">
              <t-select v-model="formData.range">
                <t-option value="all" label="全场通用" />
                <t-option value="goods" label="仅商品" />
                <t-option value="course" label="仅课程" />
              </t-select>
            </t-form-item>
          </t-col>
        </t-row>
        <t-row :gutter="16">
          <t-col :span="6">
            <t-form-item label="开始时间" name="startTime">
              <t-date-picker v-model="formData.startTime" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="截止日期" name="endTime">
              <t-date-picker v-model="formData.endTime" />
            </t-form-item>
          </t-col>
        </t-row>
        <t-form-item label="描述" name="desc">
          <t-textarea v-model="formData.desc" placeholder="选填" />
        </t-form-item>
        <t-form-item label="图片URL" name="image">
          <t-input v-model="formData.image" placeholder="可选，优惠券图片链接" />
        </t-form-item>
        <t-form-item label="启用状态" name="status" label-width="110px">
          <t-switch v-model="formData.status" :custom-value="[true, false]" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { couponService } from '../utils/cloudbase';

const couponList = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const editingId = ref('');

const formData = reactive({
  name: '',
  type: 'cash',
  value: 0,
  minAmount: 0,
  maxDiscount: 0,
  desc: '',
  range: 'all',
  stock: -1,
  limitPerUser: 0,
  startTime: '',
  endTime: '',
  status: true,
  image: ''
});

const pagination = reactive({ current: 1, pageSize: 10, total: 0 });

const columns = [
  { colKey: 'name', title: '优惠券名称', width: 120 },
  { colKey: 'rule', title: '优惠规则', width: 150, cell: 'rule' },
  { colKey: 'time', title: '有效期', width: 160, cell: 'time' },
  { colKey: 'status', title: '状态', width: 80, cell: 'status' },
  { colKey: 'operation', title: '操作', width: 120, cell: 'operation' }
];

async function fetchList() {
  loading.value = true;
  try {
    const res = await couponService.list();
    if (res.success) {
      couponList.value = res.list || [];
      pagination.total = couponList.value.length;
    } else {
      MessagePlugin.error(res.error || '加载失败');
    }
  } catch (e) {
    MessagePlugin.error('请求失败');
  } finally {
    loading.value = false;
  }
}

function onPageChange(pageInfo) {
  pagination.current = pageInfo.current;
}

function openAddDialog() {
  isEdit.value = false;
  editingId.value = '';
  Object.assign(formData, {
    name: '',
    type: 'cash',
    value: 0,
    minAmount: 0,
    maxDiscount: 0,
    desc: '',
    range: 'all',
    stock: -1,
    limitPerUser: 0,
    startTime: '',
    endTime: '',
    status: true,
    image: ''
  });
  dialogVisible.value = true;
}

function openEditDialog(row) {
  isEdit.value = true;
  editingId.value = row._id;
  Object.assign(formData, {
    name: row.name || '',
    type: row.type || 'cash',
    value: row.value || 0,
    minAmount: row.minAmount || 0,
    maxDiscount: row.maxDiscount || 0,
    desc: row.desc || '',
    range: row.range || 'all',
    stock: row.stock != null ? row.stock : -1,
    limitPerUser: row.limitPerUser || 0,
    startTime: row.startTime ? new Date(row.startTime) : '',
    endTime: row.endTime ? new Date(row.endTime) : '',
    status: !!row.status,
    image: row.image || ''
  });
  dialogVisible.value = true;
}

async function submitForm() {
  if (!formData.name || !formData.value) {
    MessagePlugin.warning('请填写名称和优惠金额');
    return;
  }
  try {
    const data = { ...formData };
    if (!data.endTime) delete data.endTime;  // 未选日期时清空
    let res;
    if (isEdit.value) {
      res = await couponService.update(editingId.value, data);
    } else {
      res = await couponService.create(data);
    }
    if (res.success) {
      MessagePlugin.success(isEdit.value ? '更新成功' : '创建成功');
      dialogVisible.value = false;
      fetchList();
    } else {
      MessagePlugin.error(res.error || '操作失败');
    }
  } catch (e) {
    MessagePlugin.error('操作失败');
  }
}

async function deleteCoupon(id) {
  try {
    const res = await couponService.delete(id);
    if (res.success) {
      MessagePlugin.success('删除成功');
      fetchList();
    } else {
      MessagePlugin.error(res.error || '删除失败');
    }
  } catch (e) {
    MessagePlugin.error('操作失败');
  }
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('zh-CN');
}

onMounted(() => fetchList());
</script>

<style scoped>
.coupon-manage { padding: 20px; background: #f5f7fa; min-height: 100vh; }
.header-card { margin-bottom: 16px; }
.header-actions { display: flex; justify-content: space-between; align-items: center; }
</style>