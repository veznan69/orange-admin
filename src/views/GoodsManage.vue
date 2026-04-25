<template>
    <div class="goods-manage">
      <!-- 头部操作栏 -->
      <t-card :bordered="false" class="header-card">
        <div class="header-actions">
          <t-space>
            <t-select v-model="filterStatus" placeholder="审核状态" clearable style="width: 150px">
              <t-option value="approved" label="已通过" />
              <t-option value="pending" label="待审核" />
              <t-option value="rejected" label="已拒绝" />
            </t-select>
            <t-select v-model="filterOnShelf" placeholder="上架状态" clearable style="width: 150px">
              <t-option :value="true" label="已上架" />
              <t-option :value="false" label="已下架" />
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
          <template #onShelf="{ row }">
            <t-switch v-model="row.onShelf" @change="(val) => toggleShelf(row._id, val)" />
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
  
      <!-- 新增/编辑弹窗 -->
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
          <t-form-item label="所有者 OpenID" name="ownerOpenid" class="vertical-form-item">
            <t-input v-model="formData.ownerOpenid" placeholder="请输入商品所有者的 openid" />
          </t-form-item>
          <t-form-item label="价格" name="price">
            <t-input-number v-model="formData.price" :min="0" :decimal-places="2" />
          </t-form-item>
          
          <!-- 审核状态（仅编辑时显示） -->
          <t-form-item v-if="isEdit" label="审核状态" name="status">
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
        </t-form>
      </t-dialog>
    </div>
  </template>
  
  <script setup>
import { ref, reactive, onMounted } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { goodsCenter, ensureLogin, app } from '../utils/cloudbase';

const userRole = ref('admin');
const userOpenid = ref('');

const goodsList = ref([]);
const loading = ref(false);
const filterStatus = ref('');
const filterOnShelf = ref(undefined);
const dialogVisible = ref(false);
const isEdit = ref(false);
const editingId = ref('');

const formData = reactive({
  name: '',
  ownerOpenid: '',
  price: 0,
  image: '',
  images: [],
  desc: '',
  description: '',
  status: 'pending',     // 审核状态
  isMultiSpec: false,
  variants: [],
  specs: [],
  generateTraceCode: false
});

const pagination = reactive({ current: 1, pageSize: 10, total: 0 });

const columns = [
  { colKey: 'image', title: '图片', width: 100, cell: 'image' },
  { colKey: 'name', title: '商品名称', width: 200 },
  { colKey: 'price', title: '价格', width: 100 },
  { colKey: 'status', title: '审核状态', width: 100, cell: 'status' },
  { colKey: 'onShelf', title: '上架', width: 100, cell: 'onShelf' },
  { colKey: 'operation', title: '操作', width: 150, cell: 'operation' }
];

function getStatusTheme(status) {
  const map = { approved: 'success', pending: 'warning', rejected: 'danger' };
  return map[status] || 'default';
}
function getStatusText(status) {
  const map = { approved: '已通过', pending: '待审核', rejected: '已拒绝' };
  return map[status] || status;
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
  fetchGoods();
}

async function fetchGoods() {
  loading.value = true;
  try {
    const res = await goodsCenter.listAllGoods();
    if (!res.success) { MessagePlugin.error(res.error || '加载失败'); return; }
    let list = res.data || [];
    if (filterStatus.value) list = list.filter(item => item.status === filterStatus.value);
    if (filterOnShelf.value !== undefined) list = list.filter(item => item.onShelf === filterOnShelf.value);
    list = list.map(item => ({
      ...item,
      images: Array.isArray(item.images) ? item.images : [],
      variants: Array.isArray(item.variants) ? item.variants : []
    }));
    pagination.total = list.length;
    const start = (pagination.current - 1) * pagination.pageSize;
    goodsList.value = list.slice(start, start + pagination.pageSize);
  } catch (err) {
    MessagePlugin.error('加载失败: ' + err.message);
  } finally { loading.value = false; }
}

function onPageChange(pageInfo) { pagination.current = pageInfo.current; fetchGoods(); }

async function toggleShelf(id, onShelf) {
  try {
    const res = await goodsCenter.toggleShelf(id, onShelf);
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
    generateTraceCode: false
  });
  dialogVisible.value = true;
}

function openEditDialog(row) {
  isEdit.value = true;
  editingId.value = row._id;
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
    generateTraceCode: row.generateTraceCode || false
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
      status: formData.status,  // 使用表单中选择的状态
      onShelf: userRole.value === 'admin' ? true : false
    };
    let res;
    if (isEdit.value) {
      res = await goodsCenter.updateGoods(editingId.value, data);
    } else {
      data.ownerOpenid = formData.ownerOpenid || userOpenid.value;
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
</script>
  
<style scoped>
.goods-manage { padding: 20px; background: #f5f7fa; min-height: 100vh; }
.header-card { margin-bottom: 16px; }
.header-actions { display: flex; justify-content: space-between; align-items: center; }
.goods-image { width: 60px; height: 60px; object-fit: cover; border-radius: 8px; }
.preview-image { width: 100px; margin-top: 8px; border-radius: 8px; border: 1px solid #eee; }

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