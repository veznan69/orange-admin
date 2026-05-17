<template>
  <div class="point-manage">
    <!-- 顶部操作栏 -->
    <t-card :bordered="false" class="top-bar">
      <t-row justify="space-between" align="middle">
        <t-col>
          <t-tabs v-model="activeTab">
            <t-tab-panel value="goods" label="积分商品管理" />
            <t-tab-panel value="virtual" label="虚拟商品管理" />
            <t-tab-panel value="exchanges" label="兑换记录" />
            <t-tab-panel value="rules" label="积分规则" />
          </t-tabs>
        </t-col>
        <t-col>
          <t-space v-if="activeTab === 'goods'">
            <t-button theme="primary" @click="showGoodsDialog = true">
              <template #icon><t-icon name="add" /></template>
              添加积分商品
            </t-button>
          </t-space>
          <t-space v-if="activeTab === 'virtual'">
            <t-button theme="primary" @click="showVirtualDialog = true">
              <template #icon><t-icon name="add" /></template>
              添加虚拟商品
            </t-button>
          </t-space>
        </t-col>
      </t-row>
    </t-card>

    <!-- 积分商品管理 -->
    <t-card :bordered="false" class="content-card" v-if="activeTab === 'goods'">
      <!-- 搜索栏 -->
      <t-row justify="space-between" class="search-bar">
        <t-col>
          <t-space>
            <t-input
              v-model="goodsKeyword"
              placeholder="搜索商品名称"
              clearable
              style="width: 300px"
              @enter="loadGoods"
              @clear="loadGoods"
            >
              <template #prefix-icon><t-icon name="search" /></template>
            </t-input>
            <t-select
              v-model="goodsTypeFilter"
              placeholder="商品类型"
              clearable
              style="width: 150px"
              @change="loadGoods"
            >
              <t-option value="" label="全部" />
              <t-option value="physical" label="实物商品" />
              <t-option value="virtual" label="虚拟商品" />
            </t-select>
            <t-select
              v-model="goodsStatusFilter"
              placeholder="状态"
              clearable
              style="width: 150px"
              @change="loadGoods"
            >
              <t-option value="" label="全部" />
              <t-option :value="true" label="上架中" />
              <t-option :value="false" label="已下架" />
            </t-select>
          </t-space>
        </t-col>
      </t-row>

      <!-- 商品表格 -->
      <t-table
        :data="goodsList"
        :columns="goodsColumns"
        :loading="goodsLoading"
        :pagination="goodsPagination"
        row-key="_id"
        @page-change="handleGoodsPageChange"
        bordered
        hover
      >
        <template #type="{ row }">
          <t-tag :theme="row.type === 'physical' ? 'primary' : 'success'">
            {{ row.type === 'physical' ? '实物商品' : '虚拟商品' }}
          </t-tag>
        </template>
        <template #onShelf="{ row }">
          <t-switch v-model="row.onShelf" @change="toggleGoodsStatus(row)" />
        </template>
        <template #stock="{ row }">
          <span :class="{ 'low-stock': row.stock < 10 }">{{ row.stock }}</span>
        </template>
        <template #action="{ row }">
          <t-space>
            <t-button variant="text" theme="primary" @click="editGoods(row)">编辑</t-button>
            <t-popconfirm content="确定删除该商品？" @confirm="deleteGoods(row._id)">
              <t-button variant="text" theme="danger">删除</t-button>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 虚拟商品管理 -->
    <t-card :bordered="false" class="content-card" v-if="activeTab === 'virtual'">
      <!-- 搜索栏 -->
      <t-row justify="space-between" class="search-bar">
        <t-col>
          <t-space>
            <t-input
              v-model="virtualKeyword"
              placeholder="搜索商品名称"
              clearable
              style="width: 300px"
              @enter="loadVirtualGoods"
              @clear="loadVirtualGoods"
            >
              <template #prefix-icon><t-icon name="search" /></template>
            </t-input>
            <t-select
              v-model="virtualTypeFilter"
              placeholder="商品类型"
              clearable
              style="width: 150px"
              @change="loadVirtualGoods"
            >
              <t-option value="" label="全部" />
              <t-option value="coupon" label="优惠券" />
              <t-option value="other" label="其他" />
            </t-select>
            <t-select
              v-model="virtualStatusFilter"
              placeholder="状态"
              clearable
              style="width: 150px"
              @change="loadVirtualGoods"
            >
              <t-option value="" label="全部" />
              <t-option :value="true" label="上架中" />
              <t-option :value="false" label="已下架" />
            </t-select>
          </t-space>
        </t-col>
      </t-row>

      <!-- 虚拟商品表格 -->
      <t-table
        :data="virtualList"
        :columns="virtualColumns"
        :loading="virtualLoading"
        :pagination="virtualPagination"
        row-key="_id"
        @page-change="handleVirtualPageChange"
        bordered
        hover
      >
        <template #virtualType="{ row }">
          <t-tag :theme="row.virtualType === 'coupon' ? 'warning' : 'default'">
            {{ row.virtualType === 'coupon' ? '优惠券' : '其他' }}
          </t-tag>
        </template>
        <template #onShelf="{ row }">
          <t-switch v-model="row.onShelf" @change="toggleVirtualStatus(row)" />
        </template>
        <template #stock="{ row }">
          <span :class="{ 'low-stock': row.stock < 10 }">{{ row.stock }}</span>
        </template>
        <template #action="{ row }">
          <t-space>
            <t-button variant="text" theme="primary" @click="editVirtual(row)">编辑</t-button>
            <t-popconfirm content="确定删除该商品？" @confirm="deleteVirtual(row._id)">
              <t-button variant="text" theme="danger">删除</t-button>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 兑换记录 -->
    <t-card :bordered="false" class="content-card" v-if="activeTab === 'exchanges'">
      <!-- 搜索栏 -->
      <t-row justify="space-between" class="search-bar">
        <t-col>
          <t-space>
            <t-input
              v-model="exchangeKeyword"
              placeholder="搜索用户或商品"
              clearable
              style="width: 300px"
              @enter="loadExchanges"
              @clear="loadExchanges"
            >
              <template #prefix-icon><t-icon name="search" /></template>
            </t-input>
            <t-select
              v-model="exchangeStatusFilter"
              placeholder="状态"
              clearable
              style="width: 150px"
              @change="loadExchanges"
            >
              <t-option value="" label="全部" />
              <t-option value="pending" label="待发货" />
              <t-option value="shipped" label="已发货" />
              <t-option value="completed" label="已完成" />
            </t-select>
          </t-space>
        </t-col>
      </t-row>

      <!-- 兑换记录表格 -->
      <t-table
        :data="exchangeList"
        :columns="exchangeColumns"
        :loading="exchangeLoading"
        :pagination="exchangePagination"
        row-key="_id"
        @page-change="handleExchangePageChange"
        bordered
        hover
      >
        <template #user="{ row }">
          <t-space size="small">
            <t-avatar size="small" :image="row.userAvatar" />
            <span>{{ row.userNickName }}</span>
          </t-space>
        </template>
        <template #goodsInfo="{ row }">
          <t-space size="small">
            <t-image :src="row.goodsImage" fit="cover" style="width: 40px; height: 40px" />
            <span>{{ row.goodsName }}</span>
          </t-space>
        </template>
        <template #status="{ row }">
          <t-tag :theme="getStatusTheme(row.status)">{{ getStatusText(row.status) }}</t-tag>
        </template>
        <template #action="{ row }">
          <t-space>
            <template v-if="row.status === 'pending'">
              <t-button variant="text" theme="primary" @click="showShipDialog(row)">发货</t-button>
            </template>
            <template v-if="row.status === 'shipped'">
              <t-button variant="text" theme="success" @click="completeExchange(row._id)">完成</t-button>
            </template>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 积分规则 -->
    <t-card :bordered="false" class="content-card" v-if="activeTab === 'rules'">
      <t-loading :loading="rulesLoading" style="min-height: 200px">
        <t-form :data="rulesForm" label-width="150px" @submit="saveRules">
          <t-divider align="left">基础规则</t-divider>
          <t-form-item label="每日签到积分">
            <t-input-number v-model="rulesForm.signInPoints" :min="0" :max="100" />
            <template #help><span class="form-help">用户每日签到获得的积分</span></template>
          </t-form-item>
          <t-form-item label="购物积分比例">
            <t-input-adornment append="积分/元">
              <t-input-number v-model="rulesForm.purchasePointsRate" :min="0" :max="10" :step="0.01" :decimal-places="2" />
            </t-input-adornment>
            <template #help><span class="form-help">每消费1元获得的积分</span></template>
          </t-form-item>
          <t-form-item label="积分抵扣比例">
            <t-input-adornment append="积分=1元">
              <t-input-number v-model="rulesForm.exchangePointsRate" :min="1" :max="1000" />
            </t-input-adornment>
            <template #help><span class="form-help">多少积分可抵扣1元</span></template>
          </t-form-item>

          <t-divider align="left">获取积分途径</t-divider>
          <t-form-item label="橙友圈发帖积分">
            <t-input-number v-model="rulesForm.sharePoints" :min="0" :max="100" />
            <template #help><span class="form-help">发帖审核通过后获得的积分</span></template>
          </t-form-item>
          <t-form-item label="果树认养积分">
            <t-input-number v-model="rulesForm.adoptionPoints" :min="0" :max="500" />
            <template #help><span class="form-help">成功认养果树后获得的积分</span></template>
          </t-form-item>
          <t-form-item label="预约课程积分">
            <t-input-number v-model="rulesForm.coursePoints" :min="0" :max="200" />
            <template #help><span class="form-help">成功预约课程后获得的积分</span></template>
          </t-form-item>
          <t-form-item label="预约采摘积分">
            <t-input-number v-model="rulesForm.pickingPoints" :min="0" :max="200" />
            <template #help><span class="form-help">成功预约采摘后获得的积分</span></template>
          </t-form-item>
          <t-form-item label="确认收货积分">
            <t-input-number v-model="rulesForm.confirmReceiptPoints" :min="0" :max="100" />
            <template #help><span class="form-help">确认收货后获得的积分</span></template>
          </t-form-item>
          <t-form-item label="商品评价积分">
            <t-input-number v-model="rulesForm.reviewPoints" :min="0" :max="50" />
            <template #help><span class="form-help">发表商品评价后获得的积分</span></template>
          </t-form-item>
          <t-form-item label="图文评价额外积分">
            <t-input-number v-model="rulesForm.reviewWithImagePoints" :min="0" :max="50" />
            <template #help><span class="form-help">含图文的评价额外获得的积分</span></template>
          </t-form-item>

          <t-divider align="left">规则说明</t-divider>
          <t-form-item label="规则说明">
            <t-textarea v-model="rulesForm.ruleDesc" placeholder="请输入积分规则说明" />
          </t-form-item>
          <t-form-item>
            <t-space>
              <t-button theme="primary" type="submit" :loading="saving">保存规则</t-button>
            </t-space>
          </t-form-item>
        </t-form>
      </t-loading>
    </t-card>

    <!-- 添加/编辑积分商品对话框 -->
    <t-dialog
      v-model:visible="showGoodsDialog"
      :header="editingGoods ? '编辑积分商品' : '添加积分商品'"
      @confirm="saveGoods"
    >
      <t-form :data="goodsForm" label-width="100px">
        <t-form-item label="商品名称" required>
          <t-input v-model="goodsForm.name" placeholder="请输入商品名称" />
        </t-form-item>
        <t-form-item label="商品图片" required>
          <t-input v-model="goodsForm.image" placeholder="请输入图片URL" />
        </t-form-item>
        <t-form-item label="所需积分" required>
          <t-input-number v-model="goodsForm.points" :min="1" :max="100000" />
        </t-form-item>
        <t-form-item label="库存" required>
          <t-input-number v-model="goodsForm.stock" :min="0" :max="10000" />
        </t-form-item>
        <t-form-item label="商品类型" required>
          <t-radio-group v-model="goodsForm.type">
            <t-radio value="physical">实物商品</t-radio>
            <t-radio value="virtual">虚拟商品</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item label="关联赠送商品" v-if="goodsForm.type === 'physical'">
          <t-input v-model="goodsForm.giftProductId" placeholder="请输入赠送商品ID" />
        </t-form-item>
        <t-form-item label="兑换限制">
          <t-input-number v-model="goodsForm.exchangeLimit" :min="0" />
          <span style="margin-left: 8px; color: #999">0表示不限</span>
        </t-form-item>
        <t-form-item label="商品描述">
          <t-textarea v-model="goodsForm.description" placeholder="请输入商品描述" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 添加/编辑虚拟商品对话框 -->
    <t-dialog
      v-model:visible="showVirtualDialog"
      :header="editingVirtual ? '编辑虚拟商品' : '添加虚拟商品'"
      @confirm="saveVirtual"
    >
      <t-form :data="virtualForm" label-width="100px">
        <t-form-item label="商品名称" required>
          <t-input v-model="virtualForm.name" placeholder="请输入商品名称" />
        </t-form-item>
        <t-form-item label="商品图片">
          <t-input v-model="virtualForm.image" placeholder="请输入图片URL" />
        </t-form-item>
        <t-form-item label="所需积分" required>
          <t-input-number v-model="virtualForm.points" :min="1" :max="100000" />
        </t-form-item>
        <t-form-item label="库存" required>
          <t-input-number v-model="virtualForm.stock" :min="0" :max="10000" />
        </t-form-item>
        <t-form-item label="虚拟商品类型" required>
          <t-radio-group v-model="virtualForm.virtualType">
            <t-radio value="coupon">优惠券</t-radio>
            <t-radio value="other">其他</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item label="关联优惠券模板" v-if="virtualForm.virtualType === 'coupon'">
          <t-input v-model="virtualForm.couponTemplateId" placeholder="请输入优惠券模板ID" />
        </t-form-item>
        <t-form-item label="商品描述">
          <t-textarea v-model="virtualForm.description" placeholder="请输入商品描述" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 发货对话框 -->
    <t-dialog
      v-model:visible="shipDialogVisible"
      header="发货"
      @confirm="shipExchange"
    >
      <t-form :data="shipForm" label-width="100px">
        <t-form-item label="物流公司">
          <t-input v-model="shipForm.logisticsCompany" placeholder="请输入物流公司" />
        </t-form-item>
        <t-form-item label="物流单号">
          <t-input v-model="shipForm.logisticsNo" placeholder="请输入物流单号" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { callCloudFunction } from '../utils/cloudbase';

// 当前登录用户 openid
const adminOpenid = localStorage.getItem('admin_openid') || '';

// 当前标签页
const activeTab = ref('goods');

// ==================== 积分商品管理 ====================
const goodsKeyword = ref('');
const goodsTypeFilter = ref('');
const goodsStatusFilter = ref('');
const goodsList = ref([]);
const goodsLoading = ref(false);
const goodsPagination = ref({ current: 1, pageSize: 20, total: 0 });
const showGoodsDialog = ref(false);
const editingGoods = ref(null);
const goodsForm = ref({
  name: '',
  image: '',
  points: 0,
  stock: 0,
  type: 'physical',
  giftProductId: '',
  exchangeLimit: 0,
  description: ''
});

const goodsColumns = [
  { colKey: 'name', title: '商品名称', width: 200 },
  { colKey: 'image', title: '图片', width: 100, cell: (h, { row }) => h('img', { src: row.image, style: 'width: 40px; height: 40px; object-fit: cover;' }) },
  { colKey: 'type', title: '类型', width: 120 },
  { colKey: 'points', title: '所需积分', width: 120 },
  { colKey: 'stock', title: '库存', width: 100 },
  { colKey: 'onShelf', title: '状态', width: 120 },
  { colKey: 'createdAt', title: '创建时间', width: 180, cell: (h, { row }) => row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' },
  { colKey: 'action', title: '操作', width: 200, fixed: 'right' }
];

async function loadGoods() {
  goodsLoading.value = true;
  try {
    const res = await callCloudFunction('pointMallManage', {
      action: 'listPointGoods',
      data: {
        adminOpenid,
        page: goodsPagination.value.current,
        pageSize: goodsPagination.value.pageSize,
        keyword: goodsKeyword.value,
        type: goodsTypeFilter.value,
        onShelf: goodsStatusFilter.value
      }
    });
    if (res.success) {
      goodsList.value = res.list || [];
      goodsPagination.value.total = res.total || 0;
    } else {
      MessagePlugin.error(res.error || '加载失败');
    }
  } catch (err) {
    MessagePlugin.error('加载失败：' + err.message);
  } finally {
    goodsLoading.value = false;
  }
}

function editGoods(row) {
  editingGoods.value = row;
  goodsForm.value = {
    id: row._id,
    name: row.name,
    image: row.image || '',
    points: row.points,
    stock: row.stock,
    type: row.type || 'physical',
    giftProductId: row.giftProductId || '',
    exchangeLimit: row.exchangeLimit || 0,
    description: row.description || ''
  };
  showGoodsDialog.value = true;
}

async function saveGoods() {
  if (!goodsForm.value.name || !goodsForm.value.points || !goodsForm.value.stock) {
    MessagePlugin.warning('请填写完整信息');
    return;
  }
  try {
    const data = {
      adminOpenid,
      ...goodsForm.value
    };
    let res;
    if (editingGoods.value) {
      res = await callCloudFunction('pointMallManage', {
        action: 'updatePointGoods',
        data
      });
    } else {
      res = await callCloudFunction('pointMallManage', {
        action: 'addPointGoods',
        data
      });
    }
    if (res.success) {
      MessagePlugin.success(editingGoods.value ? '更新成功' : '添加成功');
      showGoodsDialog.value = false;
      editingGoods.value = null;
      goodsForm.value = {
        name: '',
        image: '',
        points: 0,
        stock: 0,
        type: 'physical',
        giftProductId: '',
        exchangeLimit: 0,
        description: ''
      };
      loadGoods();
    } else {
      MessagePlugin.error(res.error || '操作失败');
    }
  } catch (err) {
    MessagePlugin.error('操作失败：' + err.message);
  }
}

async function deleteGoods(id) {
  try {
    const res = await callCloudFunction('pointMallManage', {
      action: 'deletePointGoods',
      data: { adminOpenid, id }
    });
    if (res.success) {
      MessagePlugin.success('删除成功');
      loadGoods();
    } else {
      MessagePlugin.error(res.error || '删除失败');
    }
  } catch (err) {
    MessagePlugin.error('删除失败：' + err.message);
  }
}

async function toggleGoodsStatus(row) {
  try {
    const res = await callCloudFunction('pointMallManage', {
      action: 'togglePointGoodsStatus',
      data: { adminOpenid, id: row._id, onShelf: row.onShelf }
    });
    if (!res.success) {
      row.onShelf = !row.onShelf;
      MessagePlugin.error(res.error || '操作失败');
    }
  } catch (err) {
    row.onShelf = !row.onShelf;
    MessagePlugin.error('操作失败：' + err.message);
  }
}

function handleGoodsPageChange(pageInfo) {
  goodsPagination.value.current = pageInfo.current;
  goodsPagination.value.pageSize = pageInfo.pageSize;
  loadGoods();
}

// ==================== 虚拟商品管理 ====================
const virtualKeyword = ref('');
const virtualTypeFilter = ref('');
const virtualStatusFilter = ref('');
const virtualList = ref([]);
const virtualLoading = ref(false);
const virtualPagination = ref({ current: 1, pageSize: 20, total: 0 });
const showVirtualDialog = ref(false);
const editingVirtual = ref(null);
const virtualForm = ref({
  name: '',
  image: '',
  points: 0,
  stock: 0,
  virtualType: 'coupon',
  couponTemplateId: '',
  description: ''
});

const virtualColumns = [
  { colKey: 'name', title: '商品名称', width: 200 },
  { colKey: 'image', title: '图片', width: 100, cell: (h, { row }) => h('img', { src: row.image, style: 'width: 40px; height: 40px; object-fit: cover;' }) },
  { colKey: 'virtualType', title: '类型', width: 120 },
  { colKey: 'points', title: '所需积分', width: 120 },
  { colKey: 'stock', title: '库存', width: 100 },
  { colKey: 'onShelf', title: '状态', width: 120 },
  { colKey: 'createdAt', title: '创建时间', width: 180, cell: (h, { row }) => row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' },
  { colKey: 'action', title: '操作', width: 200, fixed: 'right' }
];

async function loadVirtualGoods() {
  virtualLoading.value = true;
  try {
    const res = await callCloudFunction('pointMallManage', {
      action: 'listVirtualGoods',
      data: {
        adminOpenid,
        page: virtualPagination.value.current,
        pageSize: virtualPagination.value.pageSize,
        keyword: virtualKeyword.value,
        type: virtualTypeFilter.value,
        onShelf: virtualStatusFilter.value
      }
    });
    if (res.success) {
      virtualList.value = res.list || [];
      virtualPagination.value.total = res.total || 0;
    } else {
      MessagePlugin.error(res.error || '加载失败');
    }
  } catch (err) {
    MessagePlugin.error('加载失败：' + err.message);
  } finally {
    virtualLoading.value = false;
  }
}

function editVirtual(row) {
  editingVirtual.value = row;
  virtualForm.value = {
    id: row._id,
    name: row.name,
    image: row.image || '',
    points: row.points,
    stock: row.stock,
    virtualType: row.virtualType || 'coupon',
    couponTemplateId: row.couponTemplateId || '',
    description: row.description || ''
  };
  showVirtualDialog.value = true;
}

async function saveVirtual() {
  if (!virtualForm.value.name || !virtualForm.value.points || !virtualForm.value.stock) {
    MessagePlugin.warning('请填写完整信息');
    return;
  }
  try {
    const data = {
      adminOpenid,
      ...virtualForm.value
    };
    let res;
    if (editingVirtual.value) {
      res = await callCloudFunction('pointMallManage', {
        action: 'updateVirtualGoods',
        data
      });
    } else {
      res = await callCloudFunction('pointMallManage', {
        action: 'addVirtualGoods',
        data
      });
    }
    if (res.success) {
      MessagePlugin.success(editingVirtual.value ? '更新成功' : '添加成功');
      showVirtualDialog.value = false;
      editingVirtual.value = null;
      virtualForm.value = {
        name: '',
        image: '',
        points: 0,
        stock: 0,
        virtualType: 'coupon',
        couponTemplateId: '',
        description: ''
      };
      loadVirtualGoods();
    } else {
      MessagePlugin.error(res.error || '操作失败');
    }
  } catch (err) {
    MessagePlugin.error('操作失败：' + err.message);
  }
}

async function deleteVirtual(id) {
  try {
    const res = await callCloudFunction('pointMallManage', {
      action: 'deleteVirtualGoods',
      data: { adminOpenid, id }
    });
    if (res.success) {
      MessagePlugin.success('删除成功');
      loadVirtualGoods();
    } else {
      MessagePlugin.error(res.error || '删除失败');
    }
  } catch (err) {
    MessagePlugin.error('删除失败：' + err.message);
  }
}

async function toggleVirtualStatus(row) {
  try {
    const res = await callCloudFunction('pointMallManage', {
      action: 'toggleVirtualGoodsStatus',
      data: { adminOpenid, id: row._id, onShelf: row.onShelf }
    });
    if (!res.success) {
      row.onShelf = !row.onShelf;
      MessagePlugin.error(res.error || '操作失败');
    }
  } catch (err) {
    row.onShelf = !row.onShelf;
    MessagePlugin.error('操作失败：' + err.message);
  }
}

function handleVirtualPageChange(pageInfo) {
  virtualPagination.value.current = pageInfo.current;
  virtualPagination.value.pageSize = pageInfo.pageSize;
  loadVirtualGoods();
}

// ==================== 兑换记录 ====================
const exchangeKeyword = ref('');
const exchangeStatusFilter = ref('');
const exchangeList = ref([]);
const exchangeLoading = ref(false);
const exchangePagination = ref({ current: 1, pageSize: 20, total: 0 });
const shipDialogVisible = ref(false);
const shipForm = ref({ id: '', logisticsCompany: '', logisticsNo: '' });

const exchangeColumns = [
  { colKey: 'user', title: '用户信息', width: 200 },
  { colKey: 'goodsInfo', title: '商品信息', width: 250 },
  { colKey: 'points', title: '消耗积分', width: 120 },
  { colKey: 'status', title: '状态', width: 120 },
  { colKey: 'createTime', title: '兑换时间', width: 180, cell: (h, { row }) => row.createTime ? new Date(row.createTime).toLocaleString() : '-' },
  { colKey: 'action', title: '操作', width: 150, fixed: 'right' }
];

async function loadExchanges() {
  exchangeLoading.value = true;
  try {
    const res = await callCloudFunction('pointMallManage', {
      action: 'listExchanges',
      data: {
        adminOpenid,
        page: exchangePagination.value.current,
        pageSize: exchangePagination.value.pageSize,
        status: exchangeStatusFilter.value,
        keyword: exchangeKeyword.value
      }
    });
    if (res.success) {
      exchangeList.value = res.list || [];
      exchangePagination.value.total = res.total || 0;
    } else {
      MessagePlugin.error(res.error || '加载失败');
    }
  } catch (err) {
    MessagePlugin.error('加载失败：' + err.message);
  } finally {
    exchangeLoading.value = false;
  }
}

function showShipDialog(row) {
  shipForm.value = {
    id: row._id,
    logisticsCompany: '',
    logisticsNo: ''
  };
  shipDialogVisible.value = true;
}

async function shipExchange() {
  try {
    const res = await callCloudFunction('pointMallManage', {
      action: 'shipExchange',
      data: {
        adminOpenid,
        id: shipForm.value.id,
        logisticsCompany: shipForm.value.logisticsCompany,
        logisticsNo: shipForm.value.logisticsNo
      }
    });
    if (res.success) {
      MessagePlugin.success('发货成功');
      shipDialogVisible.value = false;
      loadExchanges();
    } else {
      MessagePlugin.error(res.error || '操作失败');
    }
  } catch (err) {
    MessagePlugin.error('操作失败：' + err.message);
  }
}

async function completeExchange(id) {
  try {
    const res = await callCloudFunction('pointMallManage', {
      action: 'completeExchange',
      data: { adminOpenid, id }
    });
    if (res.success) {
      MessagePlugin.success('操作成功');
      loadExchanges();
    } else {
      MessagePlugin.error(res.error || '操作失败');
    }
  } catch (err) {
    MessagePlugin.error('操作失败：' + err.message);
  }
}

function handleExchangePageChange(pageInfo) {
  exchangePagination.value.current = pageInfo.current;
  exchangePagination.value.pageSize = pageInfo.pageSize;
  loadExchanges();
}

function getStatusTheme(status) {
  const map = { pending: 'warning', shipped: 'primary', completed: 'success' };
  return map[status] || 'default';
}

function getStatusText(status) {
  const map = { pending: '待发货', shipped: '已发货', completed: '已完成' };
  return map[status] || status;
}

// ==================== 积分规则 ====================
const rulesLoading = ref(false);
const saving = ref(false);
const rulesForm = ref({
  signInPoints: 5,
  sharePoints: 10,
  purchasePointsRate: 0.01,
  exchangePointsRate: 100,
  // 新增积分途径
  adoptionPoints: 100,
  coursePoints: 50,
  pickingPoints: 30,
  confirmReceiptPoints: 5,
  reviewPoints: 5,
  reviewWithImagePoints: 5,
  ruleDesc: ''
});

async function loadRules() {
  rulesLoading.value = true;
  try {
    const res = await callCloudFunction('pointMallManage', {
      action: 'getPointRules',
      data: { adminOpenid }
    });
    if (res.success && res.data) {
      const d = res.data;
      rulesForm.value = {
        signInPoints: d.signInPoints ?? 5,
        sharePoints: d.sharePoints ?? 10,
        purchasePointsRate: d.purchasePointsRate ?? 0.01,
        exchangePointsRate: d.exchangePointsRate ?? 100,
        // 新增积分途径
        adoptionPoints: d.adoptionPoints ?? 100,
        coursePoints: d.coursePoints ?? 50,
        pickingPoints: d.pickingPoints ?? 30,
        confirmReceiptPoints: d.confirmReceiptPoints ?? 5,
        reviewPoints: d.reviewPoints ?? 5,
        reviewWithImagePoints: d.reviewWithImagePoints ?? 5,
        ruleDesc: d.ruleDesc || ''
      };
    }
  } catch (err) {
    MessagePlugin.error('加载规则失败：' + err.message);
  } finally {
    rulesLoading.value = false;
  }
}

async function saveRules() {
  saving.value = true;
  try {
    const res = await callCloudFunction('pointMallManage', {
      action: 'updatePointRules',
      data: {
        adminOpenid,
        ...rulesForm.value
      }
    });
    if (res.success) {
      MessagePlugin.success('保存成功');
    } else {
      MessagePlugin.error(res.error || '保存失败');
    }
  } catch (err) {
    MessagePlugin.error('保存失败：' + err.message);
  } finally {
    saving.value = false;
  }
}

// 标签页切换
function handleTabChange(value) {
  if (value === 'rules') {
    loadRules();
  }
}

onMounted(() => {
  loadGoods();
});
</script>

<style scoped>
.point-manage {
  min-height: 100%;
}

.top-bar {
  margin-bottom: 16px;
}

.content-card {
  margin-bottom: 16px;
}

.search-bar {
  margin-bottom: 16px;
}

.low-stock {
  color: #e34d59;
  font-weight: bold;
}
</style>
