<template>
  <!-- 
    认养管理页面
    【涉及数据库】adoptions, verify_logs, users
  -->
  <div class="adoption-manage">
    <!-- 统计卡片 -->
    <t-row :gutter="16" class="stat-row">
      <t-col :span="3">
        <t-card class="stat-card">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">认养总数</div>
        </t-card>
      </t-col>
      <t-col :span="3">
        <t-card class="stat-card">
          <div class="stat-value" style="color: #ffc107;">{{ stats.pending }}</div>
          <div class="stat-label">待核销</div>
        </t-card>
      </t-col>
      <t-col :span="3">
        <t-card class="stat-card">
          <div class="stat-value" style="color: #1890ff;">{{ stats.paid }}</div>
          <div class="stat-label">已认养</div>
        </t-card>
      </t-col>
      <t-col :span="3">
        <t-card class="stat-card">
          <div class="stat-value" style="color: #52c41a;">{{ stats.verified }}</div>
          <div class="stat-label">已完成</div>
        </t-card>
      </t-col>
    </t-row>

    <!-- 搜索筛选区 -->
    <t-card :bordered="false" class="search-card">
      <t-form layout="inline">
        <t-form-item label="果树编号">
          <t-input v-model="searchForm.treeNo" placeholder="如：GZ202501010001" clearable />
        </t-form-item>
        <t-form-item label="核销码">
          <t-input v-model="searchForm.verifyCode" placeholder="8位核销码" clearable />
        </t-form-item>
        <t-form-item label="用户搜索">
          <t-input v-model="searchForm.keyword" placeholder="昵称/手机号/OpenID" clearable />
        </t-form-item>
        <t-form-item label="状态">
          <t-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 140px;">
            <t-option value="" label="全部" />
            <t-option value="pending" label="待核销" />
            <t-option value="paid" label="已认养" />
            <t-option value="verified" label="已完成" />
          </t-select>
        </t-form-item>
        <t-form-item label="套餐">
          <t-select v-model="searchForm.benefitChoice" placeholder="全部套餐" clearable style="width: 140px;">
            <t-option value="" label="全部" />
            <t-option :value="1" label="套餐1：酒店+门票" />
            <t-option :value="2" label="套餐2：农产品" />
          </t-select>
        </t-form-item>
        <t-form-item>
          <t-space>
            <t-button theme="primary" @click="handleSearch">查询</t-button>
            <t-button theme="default" @click="handleReset">重置</t-button>
            <t-button theme="success" variant="outline" @click="openVerifyQueryDialog">
              <template #icon><t-icon name="scan" /></template>
              核销码查询
            </t-button>
          </t-space>
        </t-form-item>
      </t-form>
    </t-card>

    <!-- 标签页 -->
    <t-card :bordered="false" class="header-card">
      <t-tabs v-model="activeTab" @change="onTabChange">
        <t-tab-panel value="all" label="全部认养" />
        <t-tab-panel value="pending" label="待核销" />
        <t-tab-panel value="paid" label="已认养" />
        <t-tab-panel value="verified" label="已完成" />
      </t-tabs>
    </t-card>

    <!-- 认养表格 -->
    <t-card :bordered="false" class="table-card">
      <t-table
        :data="list"
        :columns="columns"
        row-key="_id"
        :loading="loading"
        :pagination="pagination"
        @page-change="onPageChange"
      >
        <template #treeNo="{ row }">
          <div class="tree-info">
            <t-icon name="app" class="tree-icon" />
            <span class="tree-no">{{ row.treeNo }}</span>
          </div>
        </template>
        <template #user="{ row }">
          <div class="user-info">
            <img :src="row.userInfo?.avatarUrl || '/default-avatar.png'" class="user-avatar" />
            <div class="user-meta">
              <div class="user-name">{{ row.userInfo?.nickName || '未知用户' }}</div>
              <div class="user-phone">{{ row.userInfo?.phone || '' }}</div>
            </div>
          </div>
        </template>
        <template #benefitChoice="{ row }">
          <t-tag :theme="row.benefitChoice === 1 ? 'primary' : 'success'">
            {{ row.benefitChoice === 1 ? '套餐1：酒店+门票' : '套餐2：农产品' }}
          </t-tag>
        </template>
        <template #status="{ row }">
          <t-tag :theme="getStatusTheme(row.status)">
            {{ getStatusText(row.status) }}
          </t-tag>
        </template>
        <template #benefits="{ row }">
          <div class="benefits-preview">
            <div v-for="(benefit, idx) in (row.benefits || [])" :key="idx" class="benefit-tag">
              <t-tag 
                :theme="getBenefitTheme(benefit.status)" 
                variant="light"
                size="small"
              >
                {{ benefit.name }}
                <span v-if="benefit.status === 'used'" class="benefit-used">✓</span>
                <span v-else-if="benefit.status === 'pending_redeem'" class="benefit-pending">中</span>
              </t-tag>
            </div>
          </div>
        </template>
        <template #verifyCode="{ row }">
          <div class="verify-code" @click="copyCode(row.verifyCode)">
            <span class="code-text">{{ row.verifyCode }}</span>
            <t-icon name="copy" class="copy-icon" />
          </div>
        </template>
        <template #time="{ row }">
          <div class="time-info">
            <div>创建：{{ formatTime(row.createTime) }}</div>
            <div class="expire-time">到期：{{ formatTime(row.expireTime) }}</div>
          </div>
        </template>
        <template #operation="{ row }">
          <t-space>
            <t-link theme="primary" @click="openDetailDialog(row)">详情</t-link>
            <t-link v-if="row.status === 'paid'" theme="warning" @click="openVerifyDialog(row)">核销</t-link>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 认养详情弹窗 -->
    <t-dialog v-model:visible="detailVisible" header="认养详情" :confirm-btn="null" cancel-btn="关闭" width="700px">
      <div v-if="currentAdoption" class="adoption-detail">
        <!-- 基本信息 -->
        <t-divider align="left" class="section-divider">基本信息</t-divider>
        <t-descriptions :column="2" border>
          <t-descriptions-item label="果树编号">{{ currentAdoption.treeNo }}</t-descriptions-item>
          <t-descriptions-item label="认养状态">
            <t-tag :theme="getStatusTheme(currentAdoption.status)">{{ getStatusText(currentAdoption.status) }}</t-tag>
          </t-descriptions-item>
          <t-descriptions-item label="套餐类型">
            {{ currentAdoption.benefitChoice === 1 ? '套餐1：酒店住宿+景区门票' : '套餐2：农产品套餐' }}
          </t-descriptions-item>
          <t-descriptions-item label="主核销码">
            <span class="detail-code">{{ currentAdoption.verifyCode }}</span>
            <t-link theme="primary" size="small" @click="copyCode(currentAdoption.verifyCode)">复制</t-link>
          </t-descriptions-item>
          <t-descriptions-item label="创建时间">{{ formatTime(currentAdoption.createTime) }}</t-descriptions-item>
          <t-descriptions-item label="到期时间">{{ formatTime(currentAdoption.expireTime) }}</t-descriptions-item>
        </t-descriptions>

        <!-- 用户信息 -->
        <t-divider align="left" class="section-divider">用户信息</t-divider>
        <div class="user-detail" v-if="currentAdoption.userInfo">
          <img :src="currentAdoption.userInfo.avatarUrl || '/default-avatar.png'" class="detail-avatar" />
          <div class="user-detail-info">
            <div><strong>{{ currentAdoption.userInfo.nickName || '未知用户' }}</strong></div>
            <div v-if="currentAdoption.userInfo.phone">手机：{{ currentAdoption.userInfo.phone }}</div>
            <div class="openid-text">OpenID：{{ currentAdoption._openid }}</div>
          </div>
        </div>

        <!-- 权益详情 -->
        <t-divider align="left" class="section-divider">权益详情</t-divider>
        <div class="benefits-list">
          <div v-for="(benefit, idx) in (currentAdoption.benefits || [])" :key="idx" class="benefit-card">
            <div class="benefit-header">
              <span class="benefit-name">{{ benefit.name }}</span>
              <t-tag :theme="getBenefitTheme(benefit.status)" size="small">
                {{ getBenefitStatusText(benefit.status) }}
              </t-tag>
            </div>
            <div class="benefit-desc">{{ benefit.desc }}</div>
            <div class="benefit-meta" v-if="benefit.code">
              <span>核销码：<code class="benefit-code">{{ benefit.code }}</code></span>
              <t-link theme="primary" size="small" @click="copyCode(benefit.code)">复制</t-link>
            </div>
            <div class="benefit-meta" v-if="benefit.usedTime">
              <span>核销时间：{{ formatTime(benefit.usedTime) }}</span>
            </div>
            <div class="benefit-meta" v-if="benefit.products && benefit.products.length">
              <div>包含商品：</div>
              <div v-for="(p, pidx) in benefit.products" :key="pidx" class="product-item">
                • {{ p.name }} × {{ p.num }}
              </div>
            </div>
          </div>
        </div>

        <!-- 核销记录 -->
        <t-divider align="left" class="section-divider">核销记录</t-divider>
        <t-table :data="verifyLogs" :columns="logColumns" size="small" :bordered="true" />
      </div>
    </t-dialog>

    <!-- 核销确认弹窗 -->
    <t-dialog v-model:visible="verifyVisible" header="确认核销" @confirm="submitVerify">
      <div v-if="currentAdoption" class="verify-confirm">
        <p>确认核销以下认养记录？</p>
        <t-descriptions :column="1" border class="verify-info">
          <t-descriptions-item label="果树编号">{{ currentAdoption.treeNo }}</t-descriptions-item>
          <t-descriptions-item label="用户">{{ currentAdoption.userInfo?.nickName || '未知用户' }}</t-descriptions-item>
          <t-descriptions-item label="核销码">{{ currentAdoption.verifyCode }}</t-descriptions-item>
        </t-descriptions>
        <p class="verify-warning">核销后状态将变为"已完成"，不可撤销。</p>
      </div>
    </t-dialog>

    <!-- 核销码查询弹窗 -->
    <t-dialog v-model:visible="verifyQueryVisible" header="核销码查询" @confirm="queryByVerifyCode" width="600px">
      <t-form>
        <t-form-item label="输入核销码">
          <t-input v-model="queryCode" placeholder="请输入8位核销码" maxlength="8" />
        </t-form-item>
      </t-form>
      <div v-if="queryResult" class="query-result">
        <t-alert v-if="queryResult.success" theme="success" message="查询成功">
          <div class="result-content">
            <p><strong>果树编号：</strong>{{ queryResult.data.treeNo }}</p>
            <p><strong>状态：</strong>
              <t-tag :theme="getStatusTheme(queryResult.data.status)">{{ getStatusText(queryResult.data.status) }}</t-tag>
            </p>
            <p><strong>套餐：</strong>{{ queryResult.data.benefitChoice === 1 ? '套餐1' : '套餐2' }}</p>
            <p><strong>用户：</strong>{{ queryResult.data.userInfo?.nickName || '未知用户' }}</p>
            <p v-if="queryResult.data.benefitName"><strong>权益：</strong>{{ queryResult.data.benefitName }}</p>
          </div>
        </t-alert>
        <t-alert v-else theme="error" :message="queryResult.error || '查询失败'" />
      </div>
    </t-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { adoptionService, getTempImageUrls } from '../utils/cloudbase';

// 状态标签映射
const statusMap = {
  'pending': { text: '待核销', theme: 'warning' },
  'paid': { text: '已认养', theme: 'primary' },
  'verified': { text: '已完成', theme: 'success' }
};

// 权益状态映射
const benefitStatusMap = {
  'unused': { text: '未使用', theme: 'default' },
  'pending_redeem': { text: '核销中', theme: 'warning' },
  'used': { text: '已核销', theme: 'success' }
};

// 统计数据
const stats = reactive({
  total: 0,
  pending: 0,
  paid: 0,
  verified: 0
});

// 搜索表单
const searchForm = reactive({
  treeNo: '',
  verifyCode: '',
  keyword: '',
  status: '',
  benefitChoice: ''
});

// 表格数据
const activeTab = ref('all');
const list = ref([]);
const allData = ref([]);
const loading = ref(false);
const pagination = reactive({ current: 1, pageSize: 10, total: 0 });

// 弹窗状态
const detailVisible = ref(false);
const verifyVisible = ref(false);
const verifyQueryVisible = ref(false);
const currentAdoption = ref(null);
const queryCode = ref('');
const queryResult = ref(null);
const verifyLogs = ref([]);

// 表格列定义
const columns = [
  { colKey: 'treeNo', title: '果树编号', width: 150, cell: 'treeNo' },
  { colKey: 'user', title: '用户', width: 180, cell: 'user' },
  { colKey: 'benefitChoice', title: '套餐', width: 160, cell: 'benefitChoice' },
  { colKey: 'status', title: '状态', width: 100, cell: 'status' },
  { colKey: 'benefits', title: '权益状态', width: 200, cell: 'benefits' },
  { colKey: 'verifyCode', title: '核销码', width: 120, cell: 'verifyCode' },
  { colKey: 'time', title: '时间', width: 180, cell: 'time' },
  { colKey: 'operation', title: '操作', width: 120, cell: 'operation' }
];

// 核销记录列
const logColumns = [
  { colKey: 'type', title: '类型', width: 100 },
  { colKey: 'code', title: '核销码', width: 120 },
  { colKey: 'benefitName', title: '权益名称', width: 120 },
  { colKey: 'verifyTime', title: '核销时间', width: 160 },
  { colKey: 'operator', title: '操作人', width: 120 }
];

function getStatusText(status) {
  return statusMap[status]?.text || status;
}

function getStatusTheme(status) {
  return statusMap[status]?.theme || 'default';
}

function getBenefitStatusText(status) {
  return benefitStatusMap[status]?.text || status;
}

function getBenefitTheme(status) {
  return benefitStatusMap[status]?.theme || 'default';
}

function formatTime(dateLike) {
  if (!dateLike) return '-';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

// 加载认养数据
async function loadAdoptions() {
  loading.value = true;
  try {
    const res = await adoptionService.listAdoptions();
    if (!res.success) {
      MessagePlugin.error(res.error || '加载认养数据失败');
      return;
    }
    let list = res.list || [];
    
    // 处理头像云存储URL转换
    const fileIDs = [];
    list.forEach(item => {
      if (item.userInfo?.avatarUrl && String(item.userInfo.avatarUrl).startsWith('cloud://')) {
        fileIDs.push(item.userInfo.avatarUrl);
      }
    });
    
    if (fileIDs.length > 0) {
      try {
        const urlRes = await getTempImageUrls(fileIDs);
        if (urlRes.success) {
          const urlMap = {};
          (urlRes.fileList || []).forEach(item => {
            if (item.fileID) {
              urlMap[item.fileID] = item.tempFileURL || item.fileID;
            }
          });
          list = list.map(item => ({
            ...item,
            userInfo: item.userInfo ? {
              ...item.userInfo,
              avatarUrl: urlMap[item.userInfo.avatarUrl] || item.userInfo.avatarUrl
            } : null
          }));
        }
      } catch (e) {
        console.error('获取头像临时URL失败', e);
      }
    }
    
    allData.value = list;
    calculateStats();
    filterList();
  } catch (err) {
    MessagePlugin.error('加载认养数据失败: ' + err.message);
  } finally {
    loading.value = false;
  }
}

// 计算统计数据
function calculateStats() {
  stats.total = allData.value.length;
  stats.pending = allData.value.filter(item => item.status === 'pending').length;
  stats.paid = allData.value.filter(item => item.status === 'paid').length;
  stats.verified = allData.value.filter(item => item.status === 'verified').length;
}

// 筛选列表
function filterList() {
  let data = [...allData.value];
  
  // 按标签页筛选
  if (activeTab.value !== 'all') {
    data = data.filter(item => item.status === activeTab.value);
  }
  
  // 按搜索条件筛选
  if (searchForm.treeNo) {
    data = data.filter(item => item.treeNo?.toLowerCase().includes(searchForm.treeNo.toLowerCase()));
  }
  if (searchForm.verifyCode) {
    data = data.filter(item => item.verifyCode?.toLowerCase().includes(searchForm.verifyCode.toLowerCase()));
  }
  if (searchForm.keyword) {
    const kw = searchForm.keyword.toLowerCase();
    data = data.filter(item => {
      const user = item.userInfo || {};
      return user.nickName?.toLowerCase().includes(kw) ||
             user.phone?.includes(kw) ||
             item._openid?.toLowerCase().includes(kw);
    });
  }
  if (searchForm.status) {
    data = data.filter(item => item.status === searchForm.status);
  }
  if (searchForm.benefitChoice !== '') {
    data = data.filter(item => item.benefitChoice === Number(searchForm.benefitChoice));
  }
  
  pagination.total = data.length;
  const start = (pagination.current - 1) * pagination.pageSize;
  list.value = data.slice(start, start + pagination.pageSize);
}

// 搜索
function handleSearch() {
  pagination.current = 1;
  filterList();
}

// 重置
function handleReset() {
  searchForm.treeNo = '';
  searchForm.verifyCode = '';
  searchForm.keyword = '';
  searchForm.status = '';
  searchForm.benefitChoice = '';
  pagination.current = 1;
  filterList();
}

// 标签切换
function onTabChange() {
  pagination.current = 1;
  filterList();
}

// 分页切换
function onPageChange(pageInfo) {
  pagination.current = pageInfo.current;
  filterList();
}

// 复制核销码
function copyCode(code) {
  if (!code) return;
  navigator.clipboard.writeText(code).then(() => {
    MessagePlugin.success('核销码已复制');
  }).catch(() => {
    MessagePlugin.warning('复制失败，请手动复制');
  });
}

// 打开详情弹窗
async function openDetailDialog(row) {
  currentAdoption.value = row;
  detailVisible.value = true;
  
  // 加载核销记录
  try {
    const res = await adoptionService.getVerifyLogs(row._id);
    if (res.success) {
      verifyLogs.value = (res.logs || []).map(log => ({
        ...log,
        type: log.type === 'adoption' ? '认养核销' : '权益核销',
        verifyTime: formatTime(log.verifyTime),
        operator: log.operatorName || '系统'
      }));
    }
  } catch (err) {
    console.error('加载核销记录失败', err);
    verifyLogs.value = [];
  }
}

// 打开核销确认弹窗
function openVerifyDialog(row) {
  currentAdoption.value = row;
  verifyVisible.value = true;
}

// 提交核销
async function submitVerify() {
  if (!currentAdoption.value) return;
  
  try {
    const res = await adoptionService.verifyAdoption(currentAdoption.value.verifyCode);
    if (res.success) {
      MessagePlugin.success('核销成功');
      verifyVisible.value = false;
      await loadAdoptions();
    } else {
      MessagePlugin.error(res.error || '核销失败');
    }
  } catch (err) {
    MessagePlugin.error('核销失败: ' + err.message);
  }
}

// 打开核销码查询弹窗
function openVerifyQueryDialog() {
  queryCode.value = '';
  queryResult.value = null;
  verifyQueryVisible.value = true;
}

// 查询核销码
async function queryByVerifyCode() {
  if (!queryCode.value || queryCode.value.length < 4) {
    MessagePlugin.warning('请输入有效的核销码');
    return;
  }
  
  try {
    const res = await adoptionService.queryByVerifyCode(queryCode.value);
    queryResult.value = res;
  } catch (err) {
    queryResult.value = { success: false, error: err.message };
  }
}

onMounted(() => {
  loadAdoptions();
});
</script>

<style scoped>
.adoption-manage { padding: 20px; background: #f5f7fa; min-height: 100vh; }

/* 统计卡片 */
.stat-row { margin-bottom: 16px; }
.stat-card { text-align: center; }
.stat-value { font-size: 32px; font-weight: bold; color: #333; }
.stat-label { font-size: 14px; color: #666; margin-top: 8px; }

/* 搜索区域 */
.search-card { margin-bottom: 16px; }

/* 表格样式 */
.header-card { margin-bottom: 16px; }
.table-card { margin-bottom: 16px; }

.tree-info { display: flex; align-items: center; gap: 8px; }
.tree-icon { color: #52c41a; font-size: 18px; }
.tree-no { font-weight: 500; color: #333; }

.user-info { display: flex; align-items: center; gap: 10px; }
.user-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
.user-meta { display: flex; flex-direction: column; }
.user-name { font-size: 14px; color: #333; }
.user-phone { font-size: 12px; color: #999; }

.benefits-preview { display: flex; flex-wrap: wrap; gap: 6px; }
.benefit-tag { display: flex; align-items: center; }
.benefit-used { margin-left: 4px; color: #52c41a; }
.benefit-pending { margin-left: 4px; color: #ffc107; }

.verify-code { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.code-text { font-family: monospace; font-weight: 500; color: #1890ff; }
.copy-icon { color: #999; font-size: 14px; }
.verify-code:hover .copy-icon { color: #1890ff; }

.time-info { font-size: 12px; }
.expire-time { color: #999; margin-top: 2px; }

/* 详情弹窗 */
.adoption-detail { padding: 8px 0; }
.section-divider { margin: 16px 0; }
.user-detail { display: flex; align-items: center; gap: 16px; margin: 16px 0; }
.detail-avatar { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; }
.user-detail-info { flex: 1; }
.openid-text { font-size: 12px; color: #999; margin-top: 4px; }

.benefits-list { display: flex; flex-direction: column; gap: 12px; margin: 16px 0; }
.benefit-card { background: #f8f9fa; border-radius: 8px; padding: 16px; }
.benefit-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.benefit-name { font-weight: 500; font-size: 15px; }
.benefit-desc { color: #666; font-size: 13px; margin-bottom: 8px; }
.benefit-meta { font-size: 13px; color: #666; margin-top: 6px; }
.benefit-code { background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
.product-item { margin-left: 16px; margin-top: 4px; }

.detail-code { font-family: monospace; font-weight: 500; margin-right: 8px; }

/* 核销确认 */
.verify-confirm { padding: 8px 0; }
.verify-info { margin: 16px 0; }
.verify-warning { color: #ff4d4f; margin-top: 16px; font-size: 13px; }

/* 查询结果 */
.query-result { margin-top: 16px; }
.result-content { padding: 8px 0; }
.result-content p { margin: 8px 0; }
</style>
