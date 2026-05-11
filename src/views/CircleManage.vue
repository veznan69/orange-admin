<template>
  <div class="circle-manage">
    <t-tabs v-model="activeTab" @change="onTabChange">
      <!-- 帖子管理 -->
      <t-tab-panel value="posts" label="帖子管理">
        <t-card :bordered="false" class="section-card">
          <template #header>
            <div class="card-header">
              <span class="title">橙友圈帖子</span>
              <t-space>
                <t-input
                  v-model="postKeyword"
                  placeholder="搜索帖子内容、标题、作者或用户ID"
                  clearable
                  style="width: 300px"
                  @enter="fetchPosts"
                />
                <t-button theme="primary" @click="fetchPosts">刷新</t-button>
              </t-space>
            </div>
          </template>

          <t-table
            :data="postList"
            :columns="postColumns"
            row-key="_id"
            :loading="postLoading"
            :pagination="postPagination"
            @page-change="onPostPageChange"
          >
            <template #content="{ row }">
              <div class="post-content-cell">
                <t-image
                  v-if="row.images && row.images.length"
                  :src="row.images[0]"
                  fit="cover"
                  style="width: 60px; height: 60px; border-radius: 4px; flex-shrink: 0;"
                />
                <div class="post-text">
                  <div class="post-title">{{ row.title || '无标题' }}</div>
                  <div class="post-body">{{ truncate(row.content, 80) }}</div>
                </div>
              </div>
            </template>
            <template #author="{ row }">
              <div class="author-cell">
                <t-avatar :image="row.userAvatar" size="32px">{{ row.userName?.charAt(0) || '?' }}</t-avatar>
                <span class="author-name">{{ row.userName || '-' }}</span>
              </div>
            </template>
            <template #stats="{ row }">
              <t-space size="small">
                <t-tag variant="light">👍 {{ row.likeCount || 0 }}</t-tag>
                <t-tag variant="light">💬 {{ row.commentCount || 0 }}</t-tag>
                <t-tag v-if="row.status === 'hidden'" theme="danger">已隐藏</t-tag>
                <t-tag v-else theme="success">正常</t-tag>
              </t-space>
            </template>
            <template #createTime="{ row }">
              {{ formatTime(row.createTime) }}
            </template>
            <template #operation="{ row }">
              <t-space size="small">
                <t-button size="small" theme="default" variant="outline" @click="viewPostDetail(row)">
                  查看详情
                </t-button>
                <t-button size="small" theme="primary" variant="outline" @click="viewComments(row)">
                  查看评论
                </t-button>
                <t-button
                  v-if="row.status === 'hidden'"
                  size="small"
                  theme="warning"
                  variant="outline"
                  @click="handleUnhidePost(row)"
                >
                  取消隐藏
                </t-button>
                <t-popconfirm
                  v-else
                  content="隐藏后其他用户将无法查看该帖子，并会通知发帖人，确认隐藏？"
                  @confirm="handleHidePost(row)"
                >
                  <t-button size="small" theme="warning" variant="outline">隐藏</t-button>
                </t-popconfirm>
                <t-popconfirm
                  content="删除后该帖子的所有评论也将被删除，并会通知发帖人，确认删除？"
                  @confirm="handleDeletePost(row)"
                >
                  <t-button size="small" theme="danger" variant="outline">删除</t-button>
                </t-popconfirm>
              </t-space>
            </template>
          </t-table>

          <t-empty v-if="!postLoading && postList.length === 0" description="暂无帖子" />
        </t-card>
      </t-tab-panel>

      <!-- 举报管理 -->
      <t-tab-panel value="reports" label="举报管理">
        <t-card :bordered="false" class="section-card">
          <template #header>
            <div class="card-header">
              <span class="title">举报列表</span>
              <t-space>
                <t-select v-model="reportStatus" :options="reportStatusOptions" style="width: 140px" @change="fetchReports" />
                <t-button theme="primary" @click="fetchReports">刷新</t-button>
              </t-space>
            </div>
          </template>

          <t-table
            :data="reportList"
            :columns="reportColumns"
            row-key="_id"
            :loading="reportLoading"
            :pagination="reportPagination"
            @page-change="onReportPageChange"
          >
            <template #target="{ row }">
              <div class="report-target">
                <t-tag :theme="row.targetType === 'post' ? 'primary' : 'warning'" size="small">
                  {{ row.targetType === 'post' ? '帖子' : '评论' }}
                </t-tag>
                <span class="target-content" :title="row.targetContent">{{ truncate(row.targetContent, 60) }}</span>
              </div>
            </template>
            <template #reason="{ row }">
              <t-tag theme="danger" variant="light" size="small">{{ row.reason }}</t-tag>
            </template>
            <template #status="{ row }">
              <t-tag :theme="getReportStatusTheme(row.status)">
                {{ getReportStatusText(row.status) }}
              </t-tag>
            </template>
            <template #createTime="{ row }">
              {{ formatTime(row.createTime) }}
            </template>
            <template #operation="{ row }">
              <t-space v-if="row.status === 'pending'" size="small">
                <t-button size="small" theme="success" variant="outline" @click="handleProcessReport(row, 'accept')">
                  通过
                </t-button>
                <t-button size="small" theme="danger" variant="outline" @click="handleProcessReport(row, 'reject')">
                  驳回
                </t-button>
              </t-space>
              <span v-else style="color: #999;">{{ row.result || '-' }}</span>
            </template>
          </t-table>

          <t-empty v-if="!reportLoading && reportList.length === 0" description="暂无举报记录" />
        </t-card>
      </t-tab-panel>

      <!-- 已隐藏内容 -->
      <t-tab-panel value="hidden" label="已隐藏内容">
        <t-tabs v-model="hiddenActiveTab" @change="onHiddenSubTabChange">
          <t-tab-panel value="hiddenPosts" label="已隐藏帖子">
            <t-card :bordered="false" class="section-card">
              <template #header>
                <div class="card-header">
                  <span class="title">已隐藏帖子</span>
                  <t-space>
                    <t-input
                      v-model="hiddenPostKeyword"
                      placeholder="搜索帖子内容、标题、作者或用户ID"
                      clearable
                      style="width: 300px"
                      @enter="fetchHiddenPosts"
                    />
                    <t-button theme="primary" @click="fetchHiddenPosts">刷新</t-button>
                  </t-space>
                </div>
              </template>

              <t-table
                :data="hiddenPostList"
                :columns="postColumns"
                row-key="_id"
                :loading="hiddenPostLoading"
                :pagination="hiddenPostPagination"
                @page-change="onHiddenPostPageChange"
              >
                <template #content="{ row }">
                  <div class="post-content-cell">
                    <t-image
                      v-if="row.images && row.images.length"
                      :src="row.images[0]"
                      fit="cover"
                      style="width: 60px; height: 60px; border-radius: 4px; flex-shrink: 0;"
                    />
                    <div class="post-text">
                      <div class="post-title">{{ row.title || '无标题' }}</div>
                      <div class="post-body">{{ truncate(row.content, 80) }}</div>
                    </div>
                  </div>
                </template>
                <template #author="{ row }">
                  <div class="author-cell">
                    <t-avatar :image="row.userAvatar" size="32px">{{ row.userName?.charAt(0) || '?' }}</t-avatar>
                    <span class="author-name">{{ row.userName || '-' }}</span>
                  </div>
                </template>
                <template #stats="{ row }">
                  <t-space size="small">
                    <t-tag variant="light">👍 {{ row.likeCount || 0 }}</t-tag>
                    <t-tag variant="light">💬 {{ row.commentCount || 0 }}</t-tag>
                    <t-tag theme="danger">已隐藏</t-tag>
                  </t-space>
                </template>
                <template #createTime="{ row }">
                  {{ formatTime(row.createTime) }}
                </template>
                <template #operation="{ row }">
                  <t-space size="small">
                    <t-button size="small" theme="default" variant="outline" @click="viewPostDetail(row)">
                      查看详情
                    </t-button>
                    <t-button size="small" theme="primary" variant="outline" @click="viewComments(row)">
                      查看评论
                    </t-button>
                    <t-button size="small" theme="warning" variant="outline" @click="handleUnhidePost(row)">
                      取消隐藏
                    </t-button>
                    <t-popconfirm
                      content="删除后该帖子的所有评论也将被删除，并会通知发帖人，确认删除？"
                      @confirm="handleDeletePost(row, 'hidden')"
                    >
                      <t-button size="small" theme="danger" variant="outline">删除</t-button>
                    </t-popconfirm>
                  </t-space>
                </template>
              </t-table>

              <t-empty v-if="!hiddenPostLoading && hiddenPostList.length === 0" description="暂无已隐藏帖子" />
            </t-card>
          </t-tab-panel>

          <t-tab-panel value="hiddenComments" label="已隐藏评论">
            <t-card :bordered="false" class="section-card">
              <template #header>
                <div class="card-header">
                  <span class="title">已隐藏评论</span>
                  <t-space>
                    <t-input
                      v-model="hiddenCommentKeyword"
                      placeholder="搜索评论内容、评论人或用户ID"
                      clearable
                      style="width: 300px"
                      @enter="fetchHiddenComments"
                    />
                    <t-button theme="primary" @click="fetchHiddenComments">刷新</t-button>
                  </t-space>
                </div>
              </template>

              <t-table
                :data="hiddenCommentList"
                :columns="hiddenCommentColumns"
                row-key="_id"
                :loading="hiddenCommentLoading"
                :pagination="hiddenCommentPagination"
                @page-change="onHiddenCommentPageChange"
              >
                <template #content="{ row }">
                  <div class="comment-content">{{ row.content }}</div>
                </template>
                <template #author="{ row }">
                  <div class="author-cell">
                    <t-avatar :image="row.userAvatar" size="28px">{{ row.userName?.charAt(0) || '?' }}</t-avatar>
                    <span class="author-name">{{ row.userName || '-' }}</span>
                  </div>
                </template>
                <template #postInfo="{ row }">
                  <t-button size="small" theme="default" variant="text" @click="viewPostById(row.postId)">
                    查看帖子
                  </t-button>
                </template>
                <template #createTime="{ row }">
                  {{ formatTime(row.createTime) }}
                </template>
                <template #operation="{ row }">
                  <t-space size="small">
                    <t-button size="small" theme="warning" variant="outline" @click="handleUnhideComment(row, 'hidden')">
                      取消隐藏
                    </t-button>
                    <t-popconfirm
                      content="删除后会通知评论人，确认删除？"
                      @confirm="handleDeleteComment(row, 'hidden')"
                    >
                      <t-button size="small" theme="danger" variant="outline">删除</t-button>
                    </t-popconfirm>
                  </t-space>
                </template>
              </t-table>

              <t-empty v-if="!hiddenCommentLoading && hiddenCommentList.length === 0" description="暂无已隐藏评论" />
            </t-card>
          </t-tab-panel>
        </t-tabs>
      </t-tab-panel>
    </t-tabs>

    <!-- 帖子详情弹窗 -->
    <t-dialog
      v-model:visible="postDetailVisible"
      header="帖子详情"
      width="700px"
      :footer="false"
    >
      <div v-if="currentPostDetail" class="post-detail-body">
        <div class="detail-header">
          <t-avatar :image="currentPostDetail.userAvatar" size="48px">{{ currentPostDetail.userName?.charAt(0) || '?' }}</t-avatar>
          <div class="detail-user-info">
            <div class="detail-user-name">{{ currentPostDetail.userName || '未知用户' }}</div>
            <div class="detail-time">{{ formatTime(currentPostDetail.createTime) }}</div>
          </div>
          <t-tag v-if="currentPostDetail.status === 'hidden'" theme="danger">已隐藏</t-tag>
        </div>
        <div class="detail-title" v-if="currentPostDetail.title">{{ currentPostDetail.title }}</div>
        <div class="detail-content">{{ currentPostDetail.content }}</div>
        <div v-if="currentPostDetail.images && currentPostDetail.images.length" class="detail-images">
          <t-image
            v-for="(img, idx) in currentPostDetail.images"
            :key="idx"
            :src="img"
            fit="cover"
            style="width: 160px; height: 160px; border-radius: 8px;"
            @click="previewImage(img, currentPostDetail.images)"
          />
        </div>
        <div class="detail-stats">
          <t-tag variant="light">👍 点赞 {{ currentPostDetail.likeCount || 0 }}</t-tag>
          <t-tag variant="light">💬 评论 {{ currentPostDetail.commentCount || 0 }}</t-tag>
        </div>
      </div>
    </t-dialog>

    <!-- 评论管理弹窗 -->
    <t-dialog
      v-model:visible="commentDialogVisible"
      :header="`评论管理 — ${currentPost?.userName || ''} 的帖子`"
      width="900px"
      :footer="false"
    >
      <t-card :bordered="false" style="margin: -16px;">
        <t-table
          :data="commentList"
          :columns="commentColumns"
          row-key="_id"
          :loading="commentLoading"
          :pagination="commentPagination"
          @page-change="onCommentPageChange"
        >
          <template #content="{ row }">
            <div class="comment-content">{{ row.content }}</div>
          </template>
          <template #author="{ row }">
            <div class="author-cell">
              <t-avatar :image="row.userAvatar" size="28px">{{ row.userName?.charAt(0) || '?' }}</t-avatar>
              <span class="author-name">{{ row.userName || '-' }}</span>
            </div>
          </template>
          <template #status="{ row }">
            <t-tag v-if="row.status === 'hidden'" theme="danger" size="small">已隐藏</t-tag>
            <t-tag v-else theme="success" size="small">正常</t-tag>
          </template>
          <template #createTime="{ row }">
            {{ formatTime(row.createTime) }}
          </template>
          <template #operation="{ row }">
            <t-space size="small">
              <t-button
                v-if="row.status === 'hidden'"
                size="small"
                theme="warning"
                variant="outline"
                @click="handleUnhideComment(row)"
              >
                取消隐藏
              </t-button>
              <t-popconfirm
                v-else
                content="隐藏后其他用户将无法查看该评论，并会通知评论人，确认隐藏？"
                @confirm="handleHideComment(row)"
              >
                <t-button size="small" theme="warning" variant="outline">隐藏</t-button>
              </t-popconfirm>
              <t-popconfirm
                content="删除后会通知评论人，确认删除？"
                @confirm="handleDeleteComment(row)"
              >
                <t-button size="small" theme="danger" variant="outline">删除</t-button>
              </t-popconfirm>
            </t-space>
          </template>
        </t-table>

        <t-empty v-if="!commentLoading && commentList.length === 0" description="暂无评论" />
      </t-card>
    </t-dialog>

    <!-- 处理举报弹窗 -->
    <t-dialog
      v-model:visible="processReportVisible"
      :header="processReportAction === 'accept' ? '通过举报' : '驳回举报'"
      width="500px"
      :confirm-btn="{ content: '确认', theme: processReportAction === 'accept' ? 'success' : 'danger', loading: processReportLoading }"
      :cancel-btn="{ content: '取消' }"
      @confirm="confirmProcessReport"
      @close="processReportVisible = false"
    >
      <t-form v-if="currentReport">
        <t-form-item label="举报目标">
          <t-tag :theme="currentReport.targetType === 'post' ? 'primary' : 'warning'" size="small">
            {{ currentReport.targetType === 'post' ? '帖子' : '评论' }}
          </t-tag>
          <span style="margin-left: 8px;">{{ truncate(currentReport.targetContent, 50) }}</span>
        </t-form-item>
        <t-form-item label="举报原因">
          <t-tag theme="danger" variant="light" size="small">{{ currentReport.reason }}</t-tag>
        </t-form-item>
        <t-form-item label="处理说明">
          <t-textarea
            v-model="processReportResult"
            :placeholder="processReportAction === 'accept' ? '请输入处理说明（可选）' : '请输入驳回原因（可选）'"
            :autosize="{ minRows: 3, maxRows: 6 }"
          />
        </t-form-item>
        <t-form-item v-if="processReportAction === 'accept'">
          <t-alert theme="warning">
            通过举报将自动隐藏该{{ currentReport.targetType === 'post' ? '帖子' : '评论' }}，并通知相关用户。如需彻底删除请使用删除按钮。
          </t-alert>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 图片预览 -->
    <t-image-viewer
      v-model:visible="imagePreviewVisible"
      :images="previewImages"
      :default-index="previewIndex"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { youquanService, getTempImageUrls } from '../utils/cloudbase';

const activeTab = ref('posts');

// 帖子管理
const postKeyword = ref('');
const postList = ref([]);
const postLoading = ref(false);
const postPagination = reactive({ current: 1, pageSize: 10, total: 0 });

// 评论弹窗
const commentDialogVisible = ref(false);
const currentPost = ref(null);
const commentList = ref([]);
const commentLoading = ref(false);
const commentPagination = reactive({ current: 1, pageSize: 10, total: 0 });

// 帖子详情
const postDetailVisible = ref(false);
const currentPostDetail = ref(null);

// 举报管理
const reportStatus = ref('');
const reportStatusOptions = [
  { label: '全部状态', value: '' },
  { label: '待处理', value: 'pending' },
  { label: '已处理', value: 'processed' },
  { label: '已驳回', value: 'rejected' }
];
const reportList = ref([]);
const reportLoading = ref(false);
const reportPagination = reactive({ current: 1, pageSize: 10, total: 0 });

// 处理举报
const processReportVisible = ref(false);
const processReportAction = ref('accept');
const processReportResult = ref('');
const processReportLoading = ref(false);
const currentReport = ref(null);

// 已隐藏内容
const hiddenActiveTab = ref('hiddenPosts');
const hiddenPostKeyword = ref('');
const hiddenPostList = ref([]);
const hiddenPostLoading = ref(false);
const hiddenPostPagination = reactive({ current: 1, pageSize: 10, total: 0 });
const hiddenCommentKeyword = ref('');
const hiddenCommentList = ref([]);
const hiddenCommentLoading = ref(false);
const hiddenCommentPagination = reactive({ current: 1, pageSize: 10, total: 0 });

// 图片预览
const imagePreviewVisible = ref(false);
const previewImages = ref([]);
const previewIndex = ref(0);

const postColumns = [
  { colKey: 'content', title: '帖子内容', width: 360, cell: 'content' },
  { colKey: 'author', title: '作者', width: 140, cell: 'author' },
  { colKey: 'stats', title: '互动', width: 160, cell: 'stats' },
  { colKey: 'createTime', title: '发布时间', width: 170, cell: 'createTime' },
  { colKey: 'operation', title: '操作', width: 260, cell: 'operation' }
];

const commentColumns = [
  { colKey: 'content', title: '评论内容', width: 380, cell: 'content' },
  { colKey: 'author', title: '评论人', width: 130, cell: 'author' },
  { colKey: 'status', title: '状态', width: 80, cell: 'status' },
  { colKey: 'createTime', title: '评论时间', width: 170, cell: 'createTime' },
  { colKey: 'operation', title: '操作', width: 180, cell: 'operation' }
];

const hiddenCommentColumns = [
  { colKey: 'content', title: '评论内容', width: 340, cell: 'content' },
  { colKey: 'author', title: '评论人', width: 130, cell: 'author' },
  { colKey: 'postInfo', title: '所属帖子', width: 100, cell: 'postInfo' },
  { colKey: 'createTime', title: '评论时间', width: 170, cell: 'createTime' },
  { colKey: 'operation', title: '操作', width: 180, cell: 'operation' }
];

const reportColumns = [
  { colKey: 'target', title: '举报目标', width: 300, cell: 'target' },
  { colKey: 'reason', title: '举报原因', width: 120, cell: 'reason' },
  { colKey: 'status', title: '状态', width: 100, cell: 'status' },
  { colKey: 'createTime', title: '举报时间', width: 170, cell: 'createTime' },
  { colKey: 'operation', title: '操作', width: 160, cell: 'operation' }
];

function formatTime(time) {
  if (!time) return '-';
  try {
    return new Date(time).toLocaleString('zh-CN');
  } catch {
    return '-';
  }
}

function truncate(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}

function getReportStatusTheme(status) {
  const map = { pending: 'warning', processed: 'success', rejected: 'danger' };
  return map[status] || 'default';
}

function getReportStatusText(status) {
  const map = { pending: '待处理', processed: '已处理', rejected: '已驳回' };
  return map[status] || status;
}

// ========== Tab 切换自动刷新 ==========
function onTabChange(val) {
  if (val === 'posts') {
    fetchPosts();
  } else if (val === 'reports') {
    fetchReports();
  } else if (val === 'hidden') {
    if (hiddenActiveTab.value === 'hiddenPosts') {
      fetchHiddenPosts();
    } else {
      fetchHiddenComments();
    }
  }
}

function onHiddenSubTabChange(val) {
  if (val === 'hiddenPosts') {
    fetchHiddenPosts();
  } else {
    fetchHiddenComments();
  }
}

// ========== 帖子列表（通用） ==========
async function loadPostList({ keyword, page, pageSize, status }, listRef, paginationRef, loadingRef) {
  loadingRef.value = true;
  try {
    const res = await youquanService.adminListPosts({
      keyword: keyword.trim(),
      page,
      pageSize,
      status
    });
    if (!res.success) {
      MessagePlugin.error(res.error || '加载失败');
      return;
    }
    let list = res.list || [];

    const fileIDs = [];
    list.forEach(post => {
      if (post.userAvatar && String(post.userAvatar).startsWith('cloud://')) {
        fileIDs.push(post.userAvatar);
      }
      if (post.images && Array.isArray(post.images)) {
        post.images.forEach(img => {
          if (img && String(img).startsWith('cloud://')) {
            fileIDs.push(img);
          }
        });
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
          list = list.map(post => ({
            ...post,
            userAvatar: urlMap[post.userAvatar] || post.userAvatar || '',
            images: (post.images || []).map(fileID => urlMap[fileID] || fileID)
          }));
        }
      } catch (e) {
        console.error('获取图片临时URL失败', e);
      }
    }

    listRef.value = list;
    paginationRef.total = res.total || 0;
  } catch (err) {
    console.error('加载帖子失败', err);
    MessagePlugin.error('加载失败');
  } finally {
    loadingRef.value = false;
  }
}

async function fetchPosts() {
  await loadPostList(
    { keyword: postKeyword.value, page: postPagination.current, pageSize: postPagination.pageSize, status: '' },
    postList,
    postPagination,
    postLoading
  );
}

function onPostPageChange(pageInfo) {
  postPagination.current = pageInfo.current;
  fetchPosts();
}

async function fetchHiddenPosts() {
  await loadPostList(
    { keyword: hiddenPostKeyword.value, page: hiddenPostPagination.current, pageSize: hiddenPostPagination.pageSize, status: 'hidden' },
    hiddenPostList,
    hiddenPostPagination,
    hiddenPostLoading
  );
}

function onHiddenPostPageChange(pageInfo) {
  hiddenPostPagination.current = pageInfo.current;
  fetchHiddenPosts();
}

// ========== 评论列表（通用） ==========
async function loadCommentList({ keyword, page, pageSize, status, postId }, listRef, paginationRef, loadingRef) {
  loadingRef.value = true;
  try {
    const res = await youquanService.adminListComments({
      keyword: keyword.trim(),
      page,
      pageSize,
      status,
      postId
    });
    if (!res.success) {
      MessagePlugin.error(res.error || '加载失败');
      return;
    }
    let list = res.list || [];

    const fileIDs = [];
    list.forEach(comment => {
      if (comment.userAvatar && String(comment.userAvatar).startsWith('cloud://')) {
        fileIDs.push(comment.userAvatar);
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
          list = list.map(comment => ({
            ...comment,
            userAvatar: urlMap[comment.userAvatar] || comment.userAvatar || ''
          }));
        }
      } catch (e) {
        console.error('获取头像临时URL失败', e);
      }
    }

    listRef.value = list;
    paginationRef.total = res.total || 0;
  } catch (err) {
    console.error('加载评论失败', err);
    MessagePlugin.error('加载失败');
  } finally {
    loadingRef.value = false;
  }
}

async function fetchComments() {
  if (!currentPost.value) return;
  await loadCommentList(
    { keyword: '', page: commentPagination.current, pageSize: commentPagination.pageSize, status: '', postId: currentPost.value._id },
    commentList,
    commentPagination,
    commentLoading
  );
}

function onCommentPageChange(pageInfo) {
  commentPagination.current = pageInfo.current;
  fetchComments();
}

async function fetchHiddenComments() {
  await loadCommentList(
    { keyword: hiddenCommentKeyword.value, page: hiddenCommentPagination.current, pageSize: hiddenCommentPagination.pageSize, status: 'hidden' },
    hiddenCommentList,
    hiddenCommentPagination,
    hiddenCommentLoading
  );
}

function onHiddenCommentPageChange(pageInfo) {
  hiddenCommentPagination.current = pageInfo.current;
  fetchHiddenComments();
}

// ========== 详情与预览 ==========
function viewPostDetail(post) {
  currentPostDetail.value = post;
  postDetailVisible.value = true;
}

function previewImage(img, images) {
  previewImages.value = images || [img];
  previewIndex.value = (images || []).indexOf(img);
  imagePreviewVisible.value = true;
}

async function viewComments(post) {
  currentPost.value = post;
  commentDialogVisible.value = true;
  commentPagination.current = 1;
  await fetchComments();
}

async function viewPostById(postId) {
  if (!postId) {
    MessagePlugin.warning('无关联帖子');
    return;
  }
  try {
    const res = await youquanService.adminListPosts({ keyword: '', page: 1, pageSize: 1, status: '' });
    const post = (res.list || []).find(p => p._id === postId);
    if (post) {
      viewPostDetail(post);
    } else {
      MessagePlugin.warning('帖子不存在或已被删除');
    }
  } catch (err) {
    console.error('加载帖子失败', err);
  }
}

// ========== 操作 ==========
async function handleDeletePost(row, from = 'posts') {
  try {
    const res = await youquanService.adminDeletePost(row._id);
    if (res.success) {
      MessagePlugin.success('已删除帖子，并已通知发帖人');
      if (from === 'hidden') {
        fetchHiddenPosts();
      } else {
        fetchPosts();
      }
    } else {
      MessagePlugin.error(res.error || '删除失败');
    }
  } catch (err) {
    console.error('删除帖子失败', err);
    MessagePlugin.error('删除失败');
  }
}

async function handleHidePost(row) {
  try {
    const res = await youquanService.adminHidePost(row._id);
    if (res.success) {
      MessagePlugin.success('已隐藏帖子，并已通知发帖人');
      fetchPosts();
    } else {
      MessagePlugin.error(res.error || '隐藏失败');
    }
  } catch (err) {
    console.error('隐藏帖子失败', err);
    MessagePlugin.error('隐藏失败');
  }
}

async function handleUnhidePost(row) {
  try {
    const res = await youquanService.adminUnhidePost(row._id);
    if (res.success) {
      MessagePlugin.success('已取消隐藏帖子，并已通知发帖人');
      if (activeTab.value === 'hidden') {
        fetchHiddenPosts();
      } else {
        fetchPosts();
      }
    } else {
      MessagePlugin.error(res.error || '取消隐藏失败');
    }
  } catch (err) {
    console.error('取消隐藏帖子失败', err);
    MessagePlugin.error('取消隐藏失败');
  }
}

async function handleDeleteComment(row, from = 'comments') {
  try {
    const res = await youquanService.adminDeleteComment(row._id);
    if (res.success) {
      MessagePlugin.success('已删除评论，并已通知评论人');
      if (from === 'hidden') {
        fetchHiddenComments();
      } else {
        fetchComments();
        const post = postList.value.find(p => p._id === currentPost.value._id);
        if (post && post.commentCount > 0) {
          post.commentCount -= 1;
        }
      }
    } else {
      MessagePlugin.error(res.error || '删除失败');
    }
  } catch (err) {
    console.error('删除评论失败', err);
    MessagePlugin.error('删除失败');
  }
}

async function handleHideComment(row) {
  try {
    const res = await youquanService.adminHideComment(row._id);
    if (res.success) {
      MessagePlugin.success('已隐藏评论，并已通知评论人');
      fetchComments();
    } else {
      MessagePlugin.error(res.error || '隐藏失败');
    }
  } catch (err) {
    console.error('隐藏评论失败', err);
    MessagePlugin.error('隐藏失败');
  }
}

async function handleUnhideComment(row, from = 'comments') {
  try {
    const res = await youquanService.adminUnhideComment(row._id);
    if (res.success) {
      MessagePlugin.success('已取消隐藏评论，并已通知评论人');
      if (from === 'hidden') {
        fetchHiddenComments();
      } else {
        fetchComments();
      }
    } else {
      MessagePlugin.error(res.error || '取消隐藏失败');
    }
  } catch (err) {
    console.error('取消隐藏评论失败', err);
    MessagePlugin.error('取消隐藏失败');
  }
}

// ========== 举报管理 ==========
async function fetchReports() {
  reportLoading.value = true;
  try {
    const res = await youquanService.adminListReports({
      status: reportStatus.value,
      page: reportPagination.current,
      pageSize: reportPagination.pageSize
    });
    if (res.success) {
      reportList.value = res.list || [];
      reportPagination.total = res.total || 0;
    } else {
      MessagePlugin.error(res.error || '加载失败');
    }
  } catch (err) {
    console.error('加载举报列表失败', err);
    MessagePlugin.error('加载失败');
  } finally {
    reportLoading.value = false;
  }
}

function onReportPageChange(pageInfo) {
  reportPagination.current = pageInfo.current;
  fetchReports();
}

function handleProcessReport(row, action) {
  currentReport.value = row;
  processReportAction.value = action;
  processReportResult.value = '';
  processReportVisible.value = true;
}

async function confirmProcessReport() {
  if (!currentReport.value) return;
  processReportLoading.value = true;
  try {
    const res = await youquanService.adminProcessReport(
      currentReport.value._id,
      processReportAction.value,
      processReportResult.value
    );
    if (res.success) {
      MessagePlugin.success(processReportAction.value === 'accept' ? '已通过举报' : '已驳回举报');
      processReportVisible.value = false;
      fetchReports();
      if (processReportAction.value === 'accept') {
        fetchPosts();
        if (activeTab.value === 'hidden') {
          fetchHiddenPosts();
          fetchHiddenComments();
        }
      }
    } else {
      MessagePlugin.error(res.error || '操作失败');
    }
  } catch (err) {
    console.error('处理举报失败', err);
    MessagePlugin.error('操作失败');
  } finally {
    processReportLoading.value = false;
  }
}

onMounted(() => {
  fetchPosts();
});
</script>

<style scoped>
.circle-manage {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}
.section-card {
  margin-bottom: 16px;
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
.post-content-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.post-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}
.post-title {
  font-weight: 500;
  color: #333;
}
.post-body {
  color: #666;
  font-size: 13px;
}
.author-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.author-name {
  font-size: 13px;
  color: #333;
}
.comment-content {
  color: #333;
  font-size: 14px;
  word-break: break-all;
}
/* 帖子详情 */
.post-detail-body {
  padding: 8px;
}
.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.detail-user-info {
  flex: 1;
}
.detail-user-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}
.detail-time {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}
.detail-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}
.detail-content {
  font-size: 14px;
  color: #555;
  line-height: 1.8;
  margin-bottom: 16px;
  white-space: pre-wrap;
}
.detail-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}
.detail-stats {
  display: flex;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}
/* 举报 */
.report-target {
  display: flex;
  align-items: center;
  gap: 8px;
}
.target-content {
  color: #333;
  font-size: 13px;
}
</style>
