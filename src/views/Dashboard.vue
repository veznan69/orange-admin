<template>
  <div class="data-statistics">
    <!-- 顶部筛选栏 -->
    <t-card :bordered="false" class="filter-card">
      <div class="filter-area">
        <t-space>
          <t-button :theme="timeRange === 'today' ? 'primary' : 'default'" @click="setTimeRange('today')">今日</t-button>
          <t-button :theme="timeRange === 'week' ? 'primary' : 'default'" @click="setTimeRange('week')">本周</t-button>
          <t-button :theme="timeRange === 'month' ? 'primary' : 'default'" @click="setTimeRange('month')">本月</t-button>
          <t-button :theme="timeRange === 'year' ? 'primary' : 'default'" @click="setTimeRange('year')">本年</t-button>
          <t-button :theme="timeRange === 'custom' ? 'primary' : 'default'" @click="setTimeRange('custom')">自定义</t-button>
        </t-space>
        <t-space v-if="timeRange === 'custom'" style="margin-left: 16px;">
          <t-date-picker v-model="customStart" placeholder="开始日期" />
          <t-date-picker v-model="customEnd" placeholder="结束日期" />
          <t-button theme="primary" @click="applyCustomRange">查询</t-button>
        </t-space>
      </div>
    </t-card>

    <!-- 指标卡片 -->
    <t-row :gutter="16" class="stat-row">
      <t-col :span="3">
        <t-card :bordered="false" class="stat-card">
          <div class="stat-label">总用户数</div>
          <div class="stat-value">{{ dashData.totalUsers }}</div>
        </t-card>
      </t-col>
      <t-col :span="3">
        <t-card :bordered="false" class="stat-card">
          <div class="stat-label">今日新增</div>
          <div class="stat-value">{{ dashData.todayNewUsers }}</div>
        </t-card>
      </t-col>
      <t-col :span="3">
        <t-card :bordered="false" class="stat-card">
          <div class="stat-label">订单总数</div>
          <div class="stat-value">{{ dashData.totalOrders }}</div>
        </t-card>
      </t-col>
      <t-col :span="3">
        <t-card :bordered="false" class="stat-card">
          <div class="stat-label">今日交易额</div>
          <div class="stat-value">¥{{ formatMoney(dashData.todayGMV) }}</div>
        </t-card>
      </t-col>
    </t-row>

    <t-row :gutter="16" class="stat-row">
      <t-col :span="3">
        <t-card :bordered="false" class="stat-card">
          <div class="stat-label">时间段内交易额</div>
          <div class="stat-value">¥{{ formatMoney(dashData.totalAmount) }}</div>
        </t-card>
      </t-col>
      <t-col :span="3">
        <t-card :bordered="false" class="stat-card">
          <div class="stat-label">待审商家</div>
          <div class="stat-value">{{ dashData.pending?.merchants || 0 }}</div>
        </t-card>
      </t-col>
      <t-col :span="3">
        <t-card :bordered="false" class="stat-card">
          <div class="stat-label">待审商品</div>
          <div class="stat-value">{{ dashData.pending?.goods || 0 }}</div>
        </t-card>
      </t-col>
      <t-col :span="3">
        <t-card :bordered="false" class="stat-card">
          <div class="stat-label">待处理投诉</div>
          <div class="stat-value">{{ dashData.pending?.feedbacks || 0 }}</div>
        </t-card>
      </t-col>
    </t-row>

    <!-- 销售趋势图 -->
    <!-- 销售趋势图 -->
    <t-card :bordered="false" class="chart-card">
      <div ref="chartRef" style="width: 100%; height: 400px;"></div>
      <div style="text-align: center; color: #999; font-size: 12px; margin-top: 8px;">
        💡 点击上方图例可隐藏/显示对应数据
      </div>
    </t-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, watch } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { statService } from '../utils/cloudbase';
import * as echarts from 'echarts';

const timeRange = ref('today');
const showDatePicker = ref(false);
const customStart = ref('');
const customEnd = ref('');
const chartRef = ref(null);
let chartInstance = null;

const dashData = reactive({
  totalUsers: 0,
  todayNewUsers: 0,
  totalOrders: 0,
  totalAmount: 0,
  paidOrders: 0,
  todayOrdersCount: 0,
  todayGMV: 0,
  pending: { merchants: 0, goods: 0, feedbacks: 0 }
});

// 格式化金额
function formatMoney(amount) {
  return (amount || 0).toFixed(2);
}

// 设置时间范围
function setTimeRange(range) {
  timeRange.value = range;
  showDatePicker.value = range === 'custom';
  if (range !== 'custom') {
    fetchData();
  }
}

function applyCustomRange() {
  if (customStart.value && customEnd.value) {
    fetchData();
  } else {
    MessagePlugin.warning('请选择开始和结束日期');
  }
}

// 获取当前时间范围对应的 start/end
function getTimeParams() {
  const now = new Date();
  // 在 getTimeParams 函数中
  if (timeRange.value === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start.getTime() + 86400000 - 1);
    return { start, end, type: 'hour' }; // 改为 'hour'
  } else if (timeRange.value === 'week') {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=周日 1=周一 ...
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
    const end = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59, 999);
    return { start, end, type: 'day' };
  }else if (timeRange.value === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end, type: 'day' };
  } else if (timeRange.value === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    return { start, end, type: 'month' };
  } else if (timeRange.value === 'custom') {
    const start = new Date(customStart.value);
    const end = new Date(customEnd.value);
    end.setHours(23, 59, 59, 999);
    return { start, end, type: 'day' };
  }
  return { start: now, end: now, type: 'day' };
}

// 补全趋势数据中缺失的日期或月份（数据补0）
function fillZeroTrends(trends, type, startDate, endDate) {
  if (type === 'hour') {
    const map = new Map(trends.map(item => [item.date, item]));
    const result = [];
    const cursor = new Date(startDate);
    const end = new Date(endDate);

    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')} ${String(cursor.getHours()).padStart(2, '0')}:00`;
      result.push(map.get(key) || { date: key, amount: 0, count: 0 });
      cursor.setHours(cursor.getHours() + 1);
    }
    return result;
  }
  if (type === 'day') {
    // 按天补全
    const map = new Map(trends.map(item => [item.date, item]));
    const result = [];
    const cursor = new Date(startDate);
    const end = new Date(endDate);

    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      result.push(map.get(key) || { date: key, amount: 0, count: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }

  if (type === 'month') {
    // 按月补全
    const map = new Map(trends.map(item => [item.date, item]));
    const result = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      result.push(map.get(key) || { date: key, amount: 0, count: 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return result;
  }

  return trends;
}

async function fetchData() {
  const params = getTimeParams();
  try {
    const [dashboardRes, trendRes] = await Promise.all([
      statService.getDashboard({
        startDate: params.start,
        endDate: params.end
      }),
      statService.getSalesTrend({
        startDate: params.start,
        endDate: params.end,
        type: params.type
      })
    ]);

    if (dashboardRes.success) {
      Object.assign(dashData, dashboardRes.data);
    } else {
      MessagePlugin.error('获取概览失败');
    }

    if (trendRes.success) {
      const trends = trendRes.data || [];
      renderChart(trends, params.type);
    }

    if (trendRes.success) {
      let trends = trendRes.data || [];
      // 对日级别或月级别的数据，补全整个时间范围
      trends = fillZeroTrends(trends, params.type, params.start, params.end);
      renderChart(trends, params.type);
    }
  } catch (e) {
    MessagePlugin.error('请求失败');
  }
}

function renderChart(trends, type) {
  if (!chartRef.value) return;
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }

  const dates = trends.map(item => item.date);
  const amounts = trends.map(item => item.amount);
  const counts = trends.map(item => item.count);

  const option = {
    alignTicks: true,   // ← 新增这个属性，使双轴刻度对齐
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '12%',
      top: '15%', // 给顶部图例留出空间
      containLabel: true
    },
    legend: {
      data: ['交易额(元)', '订单数'],
      top: '5%', // 图例置于图表上方
      left: 'center'
    },
    xAxis: {
      data: dates,
      axisLabel: { rotate: 45 }
    },
    yAxis: [
      {
        type: 'value',
        name: '交易额',
        axisLabel: { formatter: '¥{value}' }
      },
      {
        type: 'value',
        name: '订单数',
        axisLabel: { formatter: '{value}' }
      }
    ],
    series: [
      {
        name: '交易额(元)',
        type: 'bar',
        data: amounts,
        itemStyle: { color: '#0052d9' }
      },
      {
        name: '订单数',
        type: 'line',
        yAxisIndex: 1,
        data: counts,
        smooth: true,
        itemStyle: { color: '#e37318' }
      }
    ]
  };
  chartInstance.setOption(option);
}

onMounted(() => {
  fetchData();
});

// 监听时间范围变化自动刷新已在 setTimeRange 中处理
</script>

<style scoped>
.data-statistics { padding: 20px; background: #f5f7fa; min-height: 100vh; }
.filter-card { margin-bottom: 16px; }
.filter-area { display: flex; align-items: center; }
.stat-row { margin-bottom: 16px; }
.stat-card { text-align: center; padding: 20px 10px; }
.stat-label { font-size: 14px; color: #666; margin-bottom: 8px; }
.stat-value { font-size: 24px; font-weight: bold; color: #333; }
.chart-card { margin-top: 16px; }
</style>