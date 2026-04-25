<template>
  <div class="login-container">
    <t-card class="login-card" :bordered="false">
      <h2 class="login-title">管理员登录</h2>
      <t-form :data="formData" @submit="handleLogin">
        <t-form-item label="管理员 OpenID" name="openid">
          <t-input
            v-model="formData.openid"
            placeholder="请输入管理员 openid"
            clearable
          />
        </t-form-item>
        <t-form-item>
          <t-button
            theme="primary"
            type="submit"
            :loading="loading"
            block
          >
            登录
          </t-button>
        </t-form-item>
      </t-form>
      <p class="login-tip">请输入在 users 集合中 role 为 admin 的 openid</p>
    </t-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { MessagePlugin } from 'tdesign-vue-next';
import { app, ensureLogin } from '../utils/cloudbase';

const router = useRouter();
const loading = ref(false);
const formData = reactive({
  openid: ''
});

// ========== 新增：自动填充上次输入的 openid ==========
onMounted(() => {
  const lastOpenid = localStorage.getItem('last_admin_openid');
  if (lastOpenid) {
    formData.openid = lastOpenid;
  }
});
// =================================================

async function handleLogin() {
  const openid = formData.openid.trim();
  if (!openid) {
    MessagePlugin.warning('请输入 openid');
    return;
  }

  loading.value = true;
  try {
    await ensureLogin();

    const res = await app.callFunction({
      name: 'verifyAdmin',
      data: { openid }
    });

    console.log('verifyAdmin 返回原始数据:', res);

    const result = res.result;
    if (!result.success) {
      MessagePlugin.error(result.error || '验证失败');
      return;
    }

    if (!result.isAdmin) {
      MessagePlugin.error('该用户不是管理员，无权登录');
      return;
    }

    let adminOpenid = result.openid || result.userInfo?.openid || openid;
    let role = result.role || result.userInfo?.role || 'admin';
    if (!role) role = 'admin';

    // 存储登录状态
    localStorage.setItem('admin_openid', adminOpenid);
    localStorage.setItem('admin_role', role);
    localStorage.setItem('admin_logged_in', 'true');

    // ========== 新增：记住本次成功登录的 openid ==========
    localStorage.setItem('last_admin_openid', openid);
    // =================================================

    console.log('登录成功，存储的 admin_openid:', adminOpenid);

    MessagePlugin.success('登录成功');
    router.push('/goods');
  } catch (err) {
    console.error('登录失败:', err);
    MessagePlugin.error('网络错误，请稍后重试');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #ff9944, #ff6600);
}
.login-card {
  width: 450px;
  max-width: 90%;
  padding: 40px 30px;
  border-radius: 16px;
  text-align: center;
}
.login-title {
  margin-bottom: 30px;
  color: #ff6600;
}
.login-tip {
  margin-top: 20px;
  font-size: 14px;
  color: #999;
}
</style>