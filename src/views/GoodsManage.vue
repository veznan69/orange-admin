<template>
  <!-- 
    商品管理页面
    【涉及数据库】goods_products, gift_products, categories
  -->
  <div class="goods-manage">
    <t-tabs v-model="activeTab" @change="onTabChange">
      <!-- Tab 1: 商品管理 -->
      <t-tab-panel value="goods" label="商品管理">
        <!-- 头部操作栏 -->
        <t-card :bordered="false" class="header-card">
          <div class="header-actions">
            <t-space>
              <t-select v-if="userRole === 'admin'" v-model="filterStatus" placeholder="审核状态" clearable style="width: 150px">
                <t-option value="approved" label="已通过" />
                <t-option value="pending" label="待审核" />
                <t-option value="rejected" label="已拒绝" />
              </t-select>
              <t-select v-model="filterOnShelf" placeholder="上架状态" clearable style="width: 150px">
                <t-option :value="true" label="已上架" />
                <t-option :value="false" label="已下架" />
              </t-select>
              <t-select v-model="filterGenerateTraceCode" placeholder="溯源码" clearable style="width: 150px">
                <t-option :value="true" label="生成溯源码" />
                <t-option :value="false" label="不生成溯源码" />
              </t-select>
              <t-button theme="primary" @click="fetchGoods">查询</t-button>
              <t-button @click="openAddDialog">新增商品</t-button>
            </t-space>
            <t-tag theme="primary">{{ userRole === 'admin' ? '管理员' : '商家' }}</t-tag>
          </div>
        </t-card>

        <!-- 商品表格 -->
        <t-card :bordered="false" class="table-card">
          <t-table
            :data="goodsList"
            :columns="columns"
            row-key="_id"
            :loading="loading"
            :pagination="pagination"
            @page-change="onPageChange"
          >
            <template #image="{ row }">
              <img :src="row.image" class="goods-image" />
            </template>
            <template #status="{ row }">
              <t-tag :theme="getStatusTheme(row.status)">
                {{ getStatusText(row.status) }}
              </t-tag>
            </template>
            <template #category="{ row }">
              <t-space v-if="getCategoryNames(row.category).length > 0" size="small">
                <t-tag v-for="(name, idx) in getCategoryNames(row.category)" :key="idx" size="small" variant="light">
                  {{ name }}
                </t-tag>
              </t-space>
              <span v-else>-</span>
            </template>
            <template #onShelf="{ row }">
              <t-switch v-model="row.onShelf" @change="(val) => toggleShelf(row._id, val)" />
            </template>
            <template #generateTraceCode="{ row }">
              <t-switch v-model="row.generateTraceCode" @change="(val) => toggleTraceCode(row._id, val)" />
            </template>
            <template #canPointExchange="{ row }">
              <t-switch v-model="row.canPointExchange" @change="(val) => togglePointExchange(row._id, val)" />
            </template>
            <template #operation="{ row }">
              <t-space>
                <t-link theme="primary" @click="openEditDialog(row)">编辑</t-link>
                <t-popconfirm content="确认删除该商品？" @confirm="deleteGoods(row._id)">
                  <t-link theme="danger">删除</t-link>
                </t-popconfirm>
              </t-space>
            </template>
          </t-table>
        </t-card>
      </t-tab-panel>

      <!-- Tab 2: 分类编辑（仅管理员可见） -->
      <t-tab-panel v-if="userRole === 'admin'" value="category" label="分类编辑">
        <t-card :bordered="false" class="header-card">
          <t-space>
            <t-button theme="primary" @click="categoryDialogVisible = true">新增分类</t-button>
            <t-button theme="success" @click="openBatchAddCategoryDialog">批量给商品添加分类</t-button>
            <t-button theme="warning" @click="openBatchRemoveCategoryDialog">批量给商品删除分类</t-button>
          </t-space>
        </t-card>

        <t-card :bordered="false" class="table-card">
          <t-table :data="categoryList" :columns="categoryColumns" row-key="_id" :loading="categoryLoading">
            <template #operation="{ row }">
              <t-space>
                <t-link theme="primary" @click="openEditCategoryDialog(row)">编辑</t-link>
                <t-popconfirm content="确认删除该分类？" @confirm="handleDeleteCategory(row._id)">
                  <t-link theme="danger">删除</t-link>
                </t-popconfirm>
              </t-space>
            </template>
          </t-table>
        </t-card>
      </t-tab-panel>

      <!-- Tab 3: 赠送商品管理（仅管理员可见） -->
      <t-tab-panel v-if="userRole === 'admin'" value="gift" label="赠送商品管理">
        <t-card :bordered="false" class="header-card">
          <div class="header-actions">
            <t-space>
              <t-select v-model="filterGiftOnShelf" placeholder="上架状态" clearable style="width: 150px">
                <t-option :value="true" label="已上架" />
                <t-option :value="false" label="已下架" />
              </t-select>
              <t-button theme="primary" @click="fetchGiftGoods">查询</t-button>
              <t-button @click="openAddGiftDialog">新增赠送商品</t-button>
            </t-space>
          </div>
        </t-card>

        <t-card :bordered="false" class="table-card">
          <t-table
            :data="giftGoodsList"
            :columns="giftGoodsColumns"
            row-key="_id"
            :loading="giftLoading"
            :pagination="giftPagination"
            @page-change="onGiftPageChange"
          >
            <template #image="{ row }">
              <img :src="row.image" class="goods-image" />
            </template>
        <template #onShelf="{ row }">
          <t-switch v-model="row.onShelf" @change="(val) => toggleGiftShelf(row._id, val)" />
        </template>
        <template #canPointExchange="{ row }">
          <t-switch v-model="row.canPointExchange" @change="(val) => toggleGiftPointExchange(row._id, val)" />
        </template>
        <template #operation="{ row }">
          <t-space>
            <t-link theme="primary" @click="openEditGiftDialog(row)">编辑</t-link>
            <t-popconfirm content="确认删除该赠送商品？" @confirm="deleteGiftGoods(row._id)">
              <t-link theme="danger">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
          </t-table>
        </t-card>
      </t-tab-panel>
    </t-tabs>

    <!-- 新增/编辑商品弹窗 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :header="isEdit ? '编辑商品' : '新增商品'"
      width="600px"
      @confirm="submitForm"
    >
      <t-form :data="formData" label-width="80px">
        <t-form-item label="商品名称" name="name">
          <t-input v-model="formData.name" placeholder="请输入商品名称" />
        </t-form-item>
        <t-form-item label="商品分类" name="category">
          <t-select
            v-model="formData.category"
            placeholder="请选择分类（可多选）"
            filterable
            multiple
            :options="categoryOptions"
          />
        </t-form-item>
        <t-form-item v-if="userRole === 'admin'" label="所有者 OpenID" name="ownerOpenid" class="vertical-form-item">
          <t-input v-model="formData.ownerOpenid" placeholder="请输入商品所有者的 openid" />
        </t-form-item>
        <t-form-item label="价格" name="price">
          <t-input-number v-model="formData.price" :min="0" :decimal-places="2" />
        </t-form-item>

        <!-- 审核状态（仅管理员编辑时显示） -->
        <t-form-item v-if="isEdit && userRole === 'admin'" label="审核状态" name="status">
          <t-select v-model="formData.status" placeholder="请选择审核状态">
            <t-option value="pending" label="待审核" />
            <t-option value="approved" label="已通过" />
            <t-option value="rejected" label="已拒绝" />
          </t-select>
        </t-form-item>

        <!-- 主图：自定义上下布局 -->
        <div class="custom-form-item">
          <div class="custom-label">
            <span>主图</span>
          </div>
          <div class="custom-content">
            <t-input v-model="formData.image" placeholder="请输入图片URL链接" />
            <img v-if="formData.image" :src="formData.image" class="preview-image" @error="formData.image = ''" />
          </div>
        </div>

        <!-- 轮播图：自定义布局 -->
        <div class="custom-form-item">
          <div class="custom-label">
            <span>轮播图</span>
            <t-button variant="outline" size="small" @click="addImage">+ 新增图片</t-button>
          </div>
          <div class="custom-content">
            <div class="images-scroll-container" v-if="formData.images.length > 0">
              <div v-for="(img, idx) in formData.images" :key="idx" class="image-edit-item">
                <div class="image-input-area">
                  <t-input v-model="formData.images[idx]" placeholder="请输入图片URL链接" />
                  <img v-if="formData.images[idx]" :src="formData.images[idx]" class="preview-image" @error="formData.images.splice(idx, 1)" />
                </div>
                <t-button theme="danger" size="small" @click="removeImage(idx)" class="delete-img-btn">删除</t-button>
              </div>
            </div>
          </div>
        </div>

        <t-form-item label="短描述" name="desc">
          <t-textarea v-model="formData.desc" placeholder="简要描述" />
        </t-form-item>
        <t-form-item label="详细描述" name="description">
          <t-textarea v-model="formData.description" placeholder="详细图文（支持HTML）" :autosize="{ minRows: 3 }" />
        </t-form-item>

        <!-- 是否多规格 -->
        <t-form-item label="多规格" name="isMultiSpec">
          <t-switch v-model="formData.isMultiSpec" />
        </t-form-item>

        <!-- 单规格编辑区（上下布局+预览） -->
        <template v-if="!formData.isMultiSpec">
          <div class="custom-form-item">
            <div class="custom-label">
              <span>商品规格</span>
              <t-button variant="outline" size="small" @click="addVariant">+ 新增规格</t-button>
            </div>
            <div class="custom-content">
              <div class="variants-scroll-container" v-if="formData.variants.length > 0">
                <div v-for="(variant, idx) in formData.variants" :key="idx" class="variant-edit-item">
                  <div class="variant-input-area">
                    <t-input v-model="variant.name" placeholder="规格名称（如：透明款）" />
                    <t-input-number v-model="variant.price" placeholder="规格价格" :min="0" />
                    <t-input v-model="variant.image" placeholder="规格图片URL" />
                    <img v-if="variant.image" :src="variant.image" class="preview-image" @error="variant.image = ''" />
                  </div>
                  <t-button theme="danger" size="small" @click="removeVariant(idx)" class="delete-img-btn">删除</t-button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 多规格编辑区 -->
        <template v-if="formData.isMultiSpec">
          <t-form-item label="多规格配置" name="specs">
            <div v-for="(spec, idx) in formData.specs" :key="idx" style="margin-bottom: 12px; border: 1px solid #eee; padding: 12px; border-radius: 8px;">
              <t-space direction="vertical" style="width: 100%">
                <t-input v-model="spec.name" placeholder="规格名称（如：颜色）" size="small" />
                <t-input v-model="spec.style" placeholder="规格值（如：红色、蓝色）" size="small" />
                <t-input-number v-model="spec.price" placeholder="价格" :min="0" size="small" />
                <t-input v-model="spec.image" placeholder="图片URL" size="small" />
                <t-button theme="danger" size="small" @click="removeSpec(idx)">删除规格</t-button>
              </t-space>
            </div>
            <t-button variant="outline" @click="addSpec">+ 新增规格</t-button>
          </t-form-item>
        </template>

        <!-- 是否生成溯源码 -->
        <t-form-item label="生成溯源码" name="generateTraceCode">
          <t-switch v-model="formData.generateTraceCode" />
        </t-form-item>

        <!-- 是否可积分兑换 -->
        <t-form-item label="积分兑换" name="canPointExchange">
          <t-switch v-model="formData.canPointExchange" />
          <div class="form-hint">开启后，该商品可用于积分兑换</div>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 新增/编辑赠送商品弹窗 -->
    <t-dialog
      v-model:visible="giftDialogVisible"
      :header="isGiftEdit ? '编辑赠送商品' : '新增赠送商品'"
      width="600px"
      @confirm="submitGiftForm"
    >
      <t-form :data="giftFormData" label-width="80px">
        <t-form-item label="商品名称" name="name">
          <t-input v-model="giftFormData.name" placeholder="请输入赠送商品名称" />
        </t-form-item>
        <t-form-item label="价格" name="price">
          <t-input-number v-model="giftFormData.price" :min="0" :decimal-places="2" />
          <div class="form-hint">仅用于展示，实际兑换时不收费</div>
        </t-form-item>
        <t-form-item label="库存" name="stock">
          <t-input-number v-model="giftFormData.stock" :min="0" :decimal-places="0" />
        </t-form-item>
        <div class="custom-form-item">
          <div class="custom-label">
            <span>主图</span>
          </div>
          <div class="custom-content">
            <t-input v-model="giftFormData.image" placeholder="请输入图片URL链接" />
            <img v-if="giftFormData.image" :src="giftFormData.image" class="preview-image" @error="giftFormData.image = ''" />
          </div>
        </div>
        <div class="custom-form-item">
          <div class="custom-label">
            <span>轮播图</span>
            <t-button variant="outline" size="small" @click="addGiftImage">+ 新增图片</t-button>
          </div>
          <div class="custom-content">
            <div class="images-scroll-container" v-if="giftFormData.images.length > 0">
              <div v-for="(img, idx) in giftFormData.images" :key="idx" class="image-edit-item">
                <div class="image-input-area">
                  <t-input v-model="giftFormData.images[idx]" placeholder="请输入图片URL链接" />
                  <img v-if="giftFormData.images[idx]" :src="giftFormData.images[idx]" class="preview-image" @error="giftFormData.images.splice(idx, 1)" />
                </div>
                <t-button theme="danger" size="small" @click="removeGiftImage(idx)" class="delete-img-btn">删除</t-button>
              </div>
            </div>
          </div>
        </div>
        <t-form-item label="短描述" name="desc">
          <t-textarea v-model="giftFormData.desc" placeholder="简要描述" />
        </t-form-item>
        <t-form-item label="积分兑换" name="canPointExchange">
          <t-switch v-model="giftFormData.canPointExchange" />
          <div class="form-hint">开启后，该赠送商品可用于积分兑换</div>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 新增分类弹窗 -->
    <t-dialog
      v-model:visible="categoryDialogVisible"
      header="新增分类"
      width="400px"
      @confirm="submitCategoryForm"
    >
      <t-form :data="categoryForm" label-width="100px">
        <t-form-item label="英文标识" name="id">
          <t-input v-model="categoryForm.id" placeholder="如：gan_nan_qi_cheng（留空则自动生成）" />
        </t-form-item>
        <t-form-item label="显示名称" name="name">
          <t-input v-model="categoryForm.name" placeholder="如：赣南脐橙，支持中英文混合" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 编辑分类弹窗 -->
    <t-dialog
      v-model:visible="editCategoryDialogVisible"
      header="编辑分类"
      width="400px"
      @confirm="submitEditCategory"
    >
      <t-form :data="editCategoryForm" label-width="100px">
        <t-form-item label="英文标识" name="id">
          <t-input v-model="editCategoryForm.id" disabled placeholder="英文标识不可修改" />
        </t-form-item>
        <t-form-item label="显示名称" name="name">
          <t-input v-model="editCategoryForm.name" placeholder="请输入新的显示名称" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 批量给商品添加分类弹窗 -->
    <t-dialog
      v-model:visible="batchAddCategoryDialogVisible"
      header="批量给商品添加分类"
      width="800px"
      @confirm="submitBatchAddCategory"
    >
      <t-form label-width="100px">
        <t-form-item label="选择商品" required>
          <div v-if="goodsList.length === 0" class="empty-text">
            暂无商品数据
          </div>
          <t-table
            v-else
            :data="goodsList"
            :columns="batchAddGoodsColumns"
            row-key="_id"
            :selected-row-keys="batchAddCategoryForm.goodsIds"
            @select-change="onBatchAddGoodsSelect"
          >
            <template #image="{ row }">
              <img :src="row.image" class="goods-image-small" />
            </template>
          </t-table>
        </t-form-item>
        <t-form-item>
          <t-space>
            <t-button variant="outline" size="small" @click="selectAllGoodsForAdd">全选</t-button>
            <t-button variant="outline" size="small" @click="clearAllGoodsForAdd">清空</t-button>
          </t-space>
        </t-form-item>
        <t-form-item label="选择分类" required>
          <t-select
            v-model="batchAddCategoryForm.categoryIds"
            placeholder="请选择要添加的分类（可多选）"
            filterable
            multiple
            :options="categoryOptions"
            style="width: 100%"
          />
        </t-form-item>
        <t-form-item>
          <t-alert theme="info" message="提示：选中的商品将被添加上选中的分类，原有分类会保留" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 批量给商品删除分类弹窗 -->
    <t-dialog
      v-model:visible="batchRemoveCategoryDialogVisible"
      header="批量给商品删除分类"
      width="800px"
      @confirm="submitBatchRemoveCategory"
    >
      <t-form label-width="100px">
        <t-form-item label="选择分类" required>
          <t-select
            v-model="batchRemoveCategoryForm.categoryId"
            placeholder="请选择要删除的分类"
            filterable
            :options="categoryOptions"
            style="width: 100%"
            @change="onBatchRemoveCategoryChange"
          />
        </t-form-item>
        <t-form-item v-if="batchRemoveCategoryForm.categoryId" label="选择商品" required>
          <div v-if="filteredGoodsByCategory.length === 0" class="empty-text">
            该分类下暂无商品
          </div>
          <t-table
            v-else
            :data="filteredGoodsByCategory"
            :columns="batchRemoveGoodsColumns"
            row-key="_id"
            :selected-row-keys="batchRemoveCategoryForm.goodsIds"
            @select-change="onBatchRemoveGoodsSelect"
          >
            <template #image="{ row }">
              <img :src="row.image" class="goods-image-small" />
            </template>
          </t-table>
        </t-form-item>
        <t-form-item v-if="batchRemoveCategoryForm.categoryId && filteredGoodsByCategory.length > 0">
          <t-space>
            <t-button variant="outline" size="small" @click="selectAllGoodsForRemove">全选</t-button>
            <t-button variant="outline" size="small" @click="clearAllGoodsForRemove">清空</t-button>
          </t-space>
        </t-form-item>
        <t-form-item>
          <t-alert theme="warning" message="提示：选中的商品将从该分类中移除" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { goodsCenter, ensureLogin, app } from '../utils/cloudbase';

const userRole = ref(localStorage.getItem('admin_role') || 'admin');
const userOpenid = ref(localStorage.getItem('admin_openid') || '');

const activeTab = ref('goods');

// ========== 商品管理 ==========
const goodsList = ref([]);
const loading = ref(false);
const filterStatus = ref('');
const filterOnShelf = ref(undefined);
const filterGenerateTraceCode = ref(undefined);
const dialogVisible = ref(false);
const isEdit = ref(false);
const editingId = ref('');

// ========== 赠送商品管理 ==========
const giftGoodsList = ref([]);
const giftLoading = ref(false);
const filterGiftOnShelf = ref(undefined);
const giftDialogVisible = ref(false);
const isGiftEdit = ref(false);
const editingGiftId = ref('');
const giftFormData = reactive({
  name: '',
  price: 0,
  stock: 0,
  image: '',
  images: [],
  desc: '',
  canPointExchange: false
});
const giftPagination = reactive({ current: 1, pageSize: 10, total: 0 });
const giftGoodsColumns = [
  { colKey: 'image', title: '图片', width: 100, cell: 'image' },
  { colKey: 'name', title: '商品名称', width: 200 },
  { colKey: 'price', title: '参考价', width: 100 },
  { colKey: 'stock', title: '库存', width: 100 },
  { colKey: 'onShelf', title: '上架', width: 100, cell: 'onShelf' },
  { colKey: 'canPointExchange', title: '积分兑换', width: 100, cell: 'canPointExchange' },
  { colKey: 'operation', title: '操作', width: 150, cell: 'operation' }
];

const formData = reactive({
  name: '',
  ownerOpenid: '',
  price: 0,
  image: '',
  images: [],
  desc: '',
  description: '',
  status: 'pending',
  isMultiSpec: false,
  variants: [],
  specs: [],
  generateTraceCode: false,
  canPointExchange: false,
  category: []
});

const pagination = reactive({ current: 1, pageSize: 10, total: 0 });

const columns = computed(() => {
  const base = [
    { colKey: 'image', title: '图片', width: 100, cell: 'image' },
    { colKey: 'name', title: '商品名称', width: 200 },
    { colKey: 'category', title: '分类', width: 180, cell: 'category' },
    { colKey: 'price', title: '价格', width: 100 },
    { colKey: 'onShelf', title: '上架', width: 100, cell: 'onShelf' },
    { colKey: 'generateTraceCode', title: '溯源码', width: 100, cell: 'generateTraceCode' },
    { colKey: 'canPointExchange', title: '积分兑换', width: 100, cell: 'canPointExchange' },
    { colKey: 'operation', title: '操作', width: 150, cell: 'operation' }
  ];
  if (userRole.value === 'admin') {
    base.splice(4, 0, { colKey: 'status', title: '审核状态', width: 100, cell: 'status' });
  }
  return base;
});

// ========== 分类管理 ==========
const categoryList = ref([]);
const categoryLoading = ref(false);
const categoryDialogVisible = ref(false);
const categoryForm = reactive({ id: '', name: '' });

// 编辑分类相关
const editCategoryDialogVisible = ref(false);
const editCategoryForm = reactive({ id: '', name: '' });

const categoryColumns = [
  { colKey: '_id', title: '英文标识（存储值）', width: 220 },
  { colKey: 'name', title: '显示名称', width: 200 },
  { colKey: 'operation', title: '操作', width: 150, cell: 'operation' }
];

// 分类选项列表（从 categories 集合获取）
const categoryOptions = ref([]);
const categoryMap = computed(() => {
  const map = {};
  categoryList.value.forEach(cat => {
    map[cat._id] = cat.name;
  });
  return map;
});

// 批量添加分类相关
const batchAddCategoryDialogVisible = ref(false);
const batchAddCategoryForm = reactive({
  goodsIds: [],
  categoryIds: []
});
const goodsOptions = ref([]);

const batchAddGoodsColumns = [
  { colKey: 'row-select', type: 'multiple', width: 50 },
  { colKey: 'image', title: '图片', width: 80, cell: 'image' },
  { colKey: 'name', title: '商品名称', width: 200 },
  { colKey: 'price', title: '价格', width: 100 }
];

// 批量删除分类相关
const batchRemoveCategoryDialogVisible = ref(false);
const batchRemoveCategoryForm = reactive({
  categoryId: '',
  goodsIds: []
});
const filteredGoodsByCategory = ref([]);

const batchRemoveGoodsColumns = [
  { colKey: 'row-select', type: 'multiple', width: 50 },
  { colKey: 'image', title: '图片', width: 80, cell: 'image' },
  { colKey: 'name', title: '商品名称', width: 200 },
  { colKey: 'price', title: '价格', width: 100 }
];

function getStatusTheme(status) {
  const map = { approved: 'success', pending: 'warning', rejected: 'danger' };
  return map[status] || 'default';
}
function getStatusText(status) {
  const map = { approved: '已通过', pending: '待审核', rejected: '已拒绝' };
  return map[status] || status;
}

// 获取分类显示名称列表（支持数组或字符串）
function getCategoryNames(category) {
  if (!category) return [];
  if (Array.isArray(category)) {
    return category.map(id => categoryMap.value[id] || id).filter(Boolean);
  }
  // 兼容旧数据（字符串）
  const name = categoryMap.value[category] || category;
  return name ? [name] : [];
}

// 图片/规格操作
function addImage() { formData.images.push(''); }
function removeImage(index) { formData.images.splice(index, 1); }
function addVariant() { formData.variants.push({ name: '', price: 0, image: '' }); }
function removeVariant(index) { formData.variants.splice(index, 1); }
function addSpec() { formData.specs.push({ name: '', style: '', price: 0, image: '', images: [] }); }
function removeSpec(index) { formData.specs.splice(index, 1); }

async function initAuth() {
  await ensureLogin();
  const auth = app.auth();
  const loginState = await auth.getLoginState();
  if (loginState) userOpenid.value = loginState.user.uid;
  if (!userOpenid.value) {
    userOpenid.value = localStorage.getItem('admin_openid') || '';
  }
  fetchGoods();
  fetchCategories();
}

async function fetchGoods() {
  loading.value = true;
  try {
    let res;
    if (userRole.value === 'merchant') {
      res = await goodsCenter.listMyGoods();
    } else {
      res = await goodsCenter.listAllGoods();
    }
    if (!res.success) { MessagePlugin.error(res.error || '加载失败'); return; }
    let list = res.data || [];
    if (filterStatus.value) list = list.filter(item => item.status === filterStatus.value);
    if (filterOnShelf.value !== undefined) list = list.filter(item => item.onShelf === filterOnShelf.value);
    if (filterGenerateTraceCode.value !== undefined) {
      list = list.filter(item => {
        const hasTraceCode = item.generateTraceCode === true;
        return filterGenerateTraceCode.value ? hasTraceCode : !hasTraceCode;
      });
    }
    list = list.map(item => ({
      ...item,
      images: Array.isArray(item.images) ? item.images : [],
      variants: Array.isArray(item.variants) ? item.variants : [],
      // 兼容旧数据：如果 category 是字符串，转为数组
      category: item.category ? (Array.isArray(item.category) ? item.category : [item.category]) : []
    }));
    pagination.total = list.length;
    const start = (pagination.current - 1) * pagination.pageSize;
    goodsList.value = list.slice(start, start + pagination.pageSize);
    // 更新商品选项（用于批量添加分类）
    goodsOptions.value = list.map(item => ({
      label: `${item.name} (ID: ${item.customId || item._id.slice(-6)})`,
      value: item._id
    }));
  } catch (err) {
    MessagePlugin.error('加载失败: ' + err.message);
  } finally { loading.value = false; }
}

async function fetchCategories() {
  categoryLoading.value = true;
  try {
    const res = await goodsCenter.listCategories();
    if (res.success) {
      categoryList.value = res.data || [];
      categoryOptions.value = categoryList.value.map(cat => ({
        label: cat.name,
        value: cat._id
      }));
    } else {
      MessagePlugin.error(res.error || '加载分类失败');
    }
  } catch (err) {
    console.error('加载分类失败', err);
  } finally {
    categoryLoading.value = false;
  }
}

async function submitCategoryForm() {
  const name = categoryForm.name.trim();
  const id = categoryForm.id.trim();
  if (!name) {
    MessagePlugin.warning('请输入显示名称');
    return;
  }
  // 前端校验英文标识格式
  if (id && !/^[a-zA-Z0-9_-]+$/.test(id)) {
    MessagePlugin.warning('英文标识只能包含英文字母、数字、下划线和连字符（-）');
    return;
  }
  if (id && id.length > 50) {
    MessagePlugin.warning('英文标识过长，最多50个字符');
    return;
  }
  if (name.length > 50) {
    MessagePlugin.warning('显示名称过长，最多50个字符');
    return;
  }
  try {
    const res = await goodsCenter.createCategory(name, id || undefined);
    if (res.success) {
      MessagePlugin.success('分类创建成功');
      categoryDialogVisible.value = false;
      categoryForm.id = '';
      categoryForm.name = '';
      fetchCategories();
    } else {
      MessagePlugin.error(res.error || '创建失败');
    }
  } catch (err) {
    MessagePlugin.error('创建失败: ' + err.message);
  }
}

async function handleDeleteCategory(id) {
  try {
    const res = await goodsCenter.deleteCategory(id);
    if (res.success) {
      MessagePlugin.success('删除成功');
      fetchCategories();
    } else {
      MessagePlugin.error(res.error || '删除失败');
    }
  } catch (err) {
    MessagePlugin.error('删除失败');
  }
}

// 打开编辑分类弹窗
function openEditCategoryDialog(row) {
  editCategoryForm.id = row._id;
  editCategoryForm.name = row.name;
  editCategoryDialogVisible.value = true;
}

// 提交编辑分类
async function submitEditCategory() {
  const name = editCategoryForm.name.trim();
  if (!name) {
    MessagePlugin.warning('请输入显示名称');
    return;
  }
  if (name.length > 50) {
    MessagePlugin.warning('显示名称过长，最多50个字符');
    return;
  }
  try {
    const res = await goodsCenter.updateCategory(editCategoryForm.id, name);
    if (res.success) {
      MessagePlugin.success('分类更新成功');
      editCategoryDialogVisible.value = false;
      fetchCategories();
    } else {
      MessagePlugin.error(res.error || '更新失败');
    }
  } catch (err) {
    MessagePlugin.error('更新失败: ' + err.message);
  }
}

// 打开批量添加分类弹窗
function openBatchAddCategoryDialog() {
  batchAddCategoryForm.goodsIds = [];
  batchAddCategoryForm.categoryIds = [];
  batchAddCategoryDialogVisible.value = true;
}

// 批量添加分类 - 表格选择变化
function onBatchAddGoodsSelect(selected) {
  batchAddCategoryForm.goodsIds = selected;
}

// 批量添加分类 - 全选商品
function selectAllGoodsForAdd() {
  batchAddCategoryForm.goodsIds = goodsList.value.map(g => g._id);
}

// 批量添加分类 - 清空选择
function clearAllGoodsForAdd() {
  batchAddCategoryForm.goodsIds = [];
}

// 提交批量添加分类
async function submitBatchAddCategory() {
  if (batchAddCategoryForm.goodsIds.length === 0) {
    MessagePlugin.warning('请至少选择一个商品');
    return;
  }
  if (batchAddCategoryForm.categoryIds.length === 0) {
    MessagePlugin.warning('请至少选择一个分类');
    return;
  }
  try {
    let successCount = 0;
    let failCount = 0;
    for (const goodsId of batchAddCategoryForm.goodsIds) {
      // 获取商品当前分类
      const goods = goodsList.value.find(g => g._id === goodsId);
      if (!goods) continue;
      // 合并新分类（去重）
      const currentCategories = Array.isArray(goods.category) ? goods.category : (goods.category ? [goods.category] : []);
      const newCategories = [...new Set([...currentCategories, ...batchAddCategoryForm.categoryIds])];
      const res = await goodsCenter.updateGoods(goodsId, { category: newCategories });
      if (res.success) {
        successCount++;
      } else {
        failCount++;
        console.error(`更新商品 ${goodsId} 失败:`, res.error);
      }
    }
    batchAddCategoryDialogVisible.value = false;
    MessagePlugin.success(`批量添加完成：成功 ${successCount} 个，失败 ${failCount} 个`);
    fetchGoods();
  } catch (err) {
    MessagePlugin.error('批量添加失败: ' + err.message);
  }
}

// 打开批量删除分类弹窗
function openBatchRemoveCategoryDialog() {
  batchRemoveCategoryForm.categoryId = '';
  batchRemoveCategoryForm.goodsIds = [];
  filteredGoodsByCategory.value = [];
  batchRemoveCategoryDialogVisible.value = true;
}

// 选择分类变化时筛选商品
function onBatchRemoveCategoryChange(categoryId) {
  batchRemoveCategoryForm.goodsIds = [];
  if (!categoryId) {
    filteredGoodsByCategory.value = [];
    return;
  }
  // 筛选包含该分类的所有商品
  filteredGoodsByCategory.value = goodsList.value.filter(goods => {
    const categories = Array.isArray(goods.category) ? goods.category : (goods.category ? [goods.category] : []);
    return categories.includes(categoryId);
  });
}

// 表格选择变化
function onBatchRemoveGoodsSelect(selected) {
  batchRemoveCategoryForm.goodsIds = selected;
}

// 全选商品
function selectAllGoodsForRemove() {
  batchRemoveCategoryForm.goodsIds = filteredGoodsByCategory.value.map(g => g._id);
}

// 清空选择
function clearAllGoodsForRemove() {
  batchRemoveCategoryForm.goodsIds = [];
}

// 提交批量删除分类
async function submitBatchRemoveCategory() {
  if (!batchRemoveCategoryForm.categoryId) {
    MessagePlugin.warning('请选择一个分类');
    return;
  }
  if (batchRemoveCategoryForm.goodsIds.length === 0) {
    MessagePlugin.warning('请至少选择一个商品');
    return;
  }
  try {
    let successCount = 0;
    let failCount = 0;
    for (const goodsId of batchRemoveCategoryForm.goodsIds) {
      // 获取商品当前分类
      const goods = filteredGoodsByCategory.value.find(g => g._id === goodsId);
      if (!goods) continue;
      // 移除该分类
      const currentCategories = Array.isArray(goods.category) ? goods.category : (goods.category ? [goods.category] : []);
      const newCategories = currentCategories.filter(c => c !== batchRemoveCategoryForm.categoryId);
      const res = await goodsCenter.updateGoods(goodsId, { category: newCategories });
      if (res.success) {
        successCount++;
      } else {
        failCount++;
        console.error(`更新商品 ${goodsId} 失败:`, res.error);
      }
    }
    batchRemoveCategoryDialogVisible.value = false;
    MessagePlugin.success(`批量删除完成：成功 ${successCount} 个，失败 ${failCount} 个`);
    fetchGoods();
  } catch (err) {
    MessagePlugin.error('批量删除失败: ' + err.message);
  }
}

function onTabChange(val) {
  activeTab.value = val;
  if (val === 'goods') fetchGoods();
  if (val === 'category') fetchCategories();
  if (val === 'gift') fetchGiftGoods();
}

function onPageChange(pageInfo) { pagination.current = pageInfo.current; fetchGoods(); }

async function toggleShelf(id, onShelf) {
  try {
    const res = await goodsCenter.toggleShelf(id, onShelf);
    if (res.success) { MessagePlugin.success('更新成功'); fetchGoods(); }
    else MessagePlugin.error(res.error || '操作失败');
  } catch (err) { MessagePlugin.error('操作失败'); }
}

async function toggleTraceCode(id, generateTraceCode) {
  try {
    const res = await goodsCenter.updateGoods(id, { generateTraceCode });
    if (res.success) { MessagePlugin.success('更新成功'); fetchGoods(); }
    else MessagePlugin.error(res.error || '操作失败');
  } catch (err) { MessagePlugin.error('操作失败'); }
}

async function togglePointExchange(id, canPointExchange) {
  try {
    const res = await goodsCenter.updateGoods(id, { canPointExchange });
    if (res.success) { MessagePlugin.success('更新成功'); fetchGoods(); }
    else MessagePlugin.error(res.error || '操作失败');
  } catch (err) { MessagePlugin.error('操作失败'); }
}

async function deleteGoods(id) {
  try {
    const res = await goodsCenter.deleteGoods(id);
    if (res.success) { MessagePlugin.success('删除成功'); fetchGoods(); }
    else MessagePlugin.error(res.error || '删除失败');
  } catch (err) { MessagePlugin.error('删除失败'); }
}

function openAddDialog() {
  isEdit.value = false;
  editingId.value = '';
  Object.assign(formData, {
    name: '',
    ownerOpenid: localStorage.getItem('admin_openid') || '',
    price: 0,
    image: '',
    images: [],
    desc: '',
    description: '',
    status: 'pending',
    isMultiSpec: false,
    variants: [],
    specs: [],
    generateTraceCode: false,
    category: []
  });
  dialogVisible.value = true;
}

function openEditDialog(row) {
  isEdit.value = true;
  editingId.value = row._id;
  // 兼容旧数据：如果 category 是字符串，转为数组
  const rowCategory = row.category ? (Array.isArray(row.category) ? row.category : [row.category]) : [];
  Object.assign(formData, {
    name: row.name || '',
    ownerOpenid: row.ownerOpenid || '',
    price: row.price || 0,
    image: row.image || '',
    images: Array.isArray(row.images) ? row.images : [],
    desc: row.desc || '',
    description: row.description || '',
    status: row.status || 'pending',
    isMultiSpec: row.isMultiSpec || false,
    variants: Array.isArray(row.variants) ? row.variants : [],
    specs: Array.isArray(row.specs) ? row.specs : [],
    generateTraceCode: row.generateTraceCode || false,
    canPointExchange: row.canPointExchange || false,
    category: rowCategory
  });
  dialogVisible.value = true;
}

async function submitForm() {
  if (!formData.name || !formData.price) {
    MessagePlugin.warning('请填写名称和价格');
    return;
  }
  try {
    let desc = formData.description;
    if (desc && !/^\s*<p/i.test(desc)) {
      desc = '<p>' + desc + '</p>';
    }

    const data = {
      ...formData,
      description: desc,
      updateTime: new Date(),
      status: userRole.value === 'admin' ? formData.status : 'pending',
      onShelf: false
    };
    let res;
    if (isEdit.value) {
      res = await goodsCenter.updateGoods(editingId.value, data);
    } else {
      data.ownerOpenid = userRole.value === 'merchant' ? userOpenid.value : (formData.ownerOpenid || userOpenid.value);
      data.createTime = new Date();
      data.sales = 0;
      res = await goodsCenter.submitGoods(data);
    }
    if (res.success) {
      MessagePlugin.success(isEdit.value ? '更新成功' : '新增成功');
      dialogVisible.value = false;
      fetchGoods();
    } else {
      MessagePlugin.error(res.error || '保存失败');
    }
  } catch (err) {
    MessagePlugin.error('保存失败: ' + err.message);
  }
}

onMounted(() => { initAuth(); });

// ========== 赠送商品管理方法 ==========
async function fetchGiftGoods() {
  giftLoading.value = true;
  try {
    const res = await goodsCenter.listGiftGoods();
    if (!res.success) { MessagePlugin.error(res.error || '加载失败'); return; }
    let list = res.data || [];
    if (filterGiftOnShelf.value !== undefined) list = list.filter(item => item.onShelf === filterGiftOnShelf.value);
    list = list.map(item => ({
      ...item,
      images: Array.isArray(item.images) ? item.images : []
    }));
    giftPagination.total = list.length;
    const start = (giftPagination.current - 1) * giftPagination.pageSize;
    giftGoodsList.value = list.slice(start, start + giftPagination.pageSize);
  } catch (err) {
    MessagePlugin.error('加载失败: ' + err.message);
  } finally { giftLoading.value = false; }
}

function onGiftPageChange(pageInfo) {
  giftPagination.current = pageInfo.current;
  fetchGiftGoods();
}

function openAddGiftDialog() {
  isGiftEdit.value = false;
  editingGiftId.value = '';
  Object.assign(giftFormData, {
    name: '',
    price: 0,
    stock: 0,
    image: '',
    images: [],
    desc: '',
    canPointExchange: false
  });
  giftDialogVisible.value = true;
}

function openEditGiftDialog(row) {
  isGiftEdit.value = true;
  editingGiftId.value = row._id;
  Object.assign(giftFormData, {
    name: row.name || '',
    price: row.price || 0,
    stock: row.stock || 0,
    image: row.image || '',
    images: Array.isArray(row.images) ? row.images : [],
    desc: row.desc || '',
    canPointExchange: row.canPointExchange || false
  });
  giftDialogVisible.value = true;
}

async function submitGiftForm() {
  if (!giftFormData.name || !giftFormData.image) {
    MessagePlugin.warning('请填写名称和主图');
    return;
  }
  try {
    const data = { ...giftFormData };
    let res;
    if (isGiftEdit.value) {
      res = await goodsCenter.updateGiftGoods(editingGiftId.value, data);
    } else {
      res = await goodsCenter.submitGiftGoods(data);
    }
    if (res.success) {
      MessagePlugin.success(isGiftEdit.value ? '更新成功' : '新增成功');
      giftDialogVisible.value = false;
      fetchGiftGoods();
    } else {
      MessagePlugin.error(res.error || '保存失败');
    }
  } catch (err) {
    MessagePlugin.error('保存失败: ' + err.message);
  }
}

async function toggleGiftShelf(id, onShelf) {
  try {
    const res = await goodsCenter.toggleGiftShelf(id, onShelf);
    if (res.success) { MessagePlugin.success('更新成功'); fetchGiftGoods(); }
    else MessagePlugin.error(res.error || '操作失败');
  } catch (err) { MessagePlugin.error('操作失败'); }
}

async function toggleGiftPointExchange(id, canPointExchange) {
  try {
    const res = await goodsCenter.updateGiftGoods(id, { canPointExchange });
    if (res.success) { MessagePlugin.success('更新成功'); fetchGiftGoods(); }
    else MessagePlugin.error(res.error || '操作失败');
  } catch (err) { MessagePlugin.error('操作失败'); }
}

async function deleteGiftGoods(id) {
  try {
    const res = await goodsCenter.deleteGiftGoods(id);
    if (res.success) { MessagePlugin.success('删除成功'); fetchGiftGoods(); }
    else MessagePlugin.error(res.error || '删除失败');
  } catch (err) { MessagePlugin.error('删除失败'); }
}

function addGiftImage() { giftFormData.images.push(''); }
function removeGiftImage(index) { giftFormData.images.splice(index, 1); }
</script>

<style scoped>
.goods-manage { padding: 20px; background: #f5f7fa; min-height: 100vh; }
.header-card { margin-bottom: 16px; }
.header-actions { display: flex; justify-content: space-between; align-items: center; }
.goods-image { width: 60px; height: 60px; object-fit: cover; border-radius: 8px; }
.goods-image-small { width: 50px; height: 50px; object-fit: cover; border-radius: 6px; }
.preview-image { width: 100px; margin-top: 8px; border-radius: 8px; border: 1px solid #eee; }
.empty-text { color: #999; font-size: 14px; text-align: center; padding: 20px; }

.custom-form-item { margin-bottom: 24px; }
.custom-label {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; margin-bottom: 8px; font-size: 14px; color: #333; font-weight: 500;
}
.custom-content { width: 100%; }

.images-scroll-container {
  width: 100%; max-height: 320px; overflow-y: auto;
  border: 1px solid #eee; border-radius: 8px; padding: 8px; background: #fafafa;
}
.image-edit-item {
  display: flex; flex-direction: column; gap: 8px;
  margin-bottom: 16px; padding: 12px; background: #fff; border-radius: 8px;
}
.image-input-area { width: 100%; display: flex; flex-direction: column; }

.variants-scroll-container {
  width: 100%; max-height: 320px; overflow-y: auto;
  border: 1px solid #eee; border-radius: 8px; padding: 8px; background: #fafafa;
}
.variant-edit-item {
  display: flex; flex-direction: column; gap: 8px;
  margin-bottom: 16px; padding: 12px; background: #fff; border-radius: 8px;
}
.variant-input-area { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.delete-img-btn { align-self: flex-end; }
</style>
