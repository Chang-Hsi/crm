<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ElButton,
  ElNotification,
  ElOption,
  ElProgress,
  ElSelect,
  ElSkeleton,
  ElTag,
} from "element-plus";
import { Refresh } from "@element-plus/icons-vue";
import VChart from "vue-echarts";
import { ensureDashboardCharts } from "../../components/dashboard/echartsSetup";
import { activityList } from "../../data/activities";
import {
  channelPerformanceRecords,
  partnerLevelMap,
  partnerTypeMap,
} from "../../data/channelPerformance";
import { issueList } from "../../data/issues";

ensureDashboardCharts();

const router = useRouter();
const NOW_TS = new Date("2026-04-11T12:00:00+08:00").getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

const period = ref("month");
const conversionWindow = ref("month");
const loading = ref(true);

const periodOptions = [
  { value: "month", label: "本月" },
  { value: "quarter", label: "本季" },
  { value: "year", label: "本年" },
];

const stageOrder = [
  "prospecting",
  "qualification",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

const stageAliasMap = {
  prospecting: "新建",
  qualification: "洽談",
  proposal: "報價",
  negotiation: "議價",
  won: "成交",
  lost: "流失",
};

const stageNormalizeMap = {
  prospecting: "prospecting",
  qualification: "qualification",
  proposal: "proposal",
  negotiation: "negotiation",
  won: "won",
  lost: "lost",
  prospecting_upper: "prospecting",
  qualification_upper: "qualification",
  proposal_upper: "proposal",
  negotiation_upper: "negotiation",
  closed_won: "won",
  closed_lost: "lost",
};

const scopedRange = computed(() => buildPeriodRange(period.value, NOW_TS));
const conversionRange = computed(() => buildPeriodRange(conversionWindow.value, NOW_TS));

const partnerRows = computed(() =>
  channelPerformanceRecords.map((partner) => {
    const currentMonthRow = partner.monthlyPerformance.find((item) =>
      isWithinRange(toTimestamp(item.month), scopedRange.value)
    );
    const partnerIssues = issueList.filter((item) => item.partnerId === partner.partnerId);
    const recentActivities = activityList.filter((item) => {
      const matched = normalizePartnerName(item.accountId) === partner.partnerName;
      return matched && toTimestamp(item.occurredAt) >= NOW_TS - 90 * DAY_MS;
    });
    const overdueFollowUps = recentActivities.filter(
      (item) => item.nextActionAt && toTimestamp(item.nextActionAt) < NOW_TS && item.status !== "done"
    ).length;
    const activeOpportunities = partner.relatedOpportunities.filter(
      (item) => normalizeStage(item.stage) !== "won" && normalizeStage(item.stage) !== "lost"
    );
    const stuckCount = activeOpportunities.filter(
      (item) => toTimestamp(item.createdAt) <= NOW_TS - 25 * DAY_MS
    ).length;
    const issueCount = partnerIssues.filter(
      (item) => !["resolved", "cancelled"].includes(item.status)
    ).length;
    const actual = Number(currentMonthRow?.periodRevenue || 0);
    const forecast = Number(currentMonthRow?.estimatedRevenue || 0);
    const wonCount = Number(currentMonthRow?.wonCount || 0);
    const avgDeal = wonCount > 0 ? actual / wonCount : 0;
    const target = Math.max(forecast, actual * 1.15, 1);
    const attainment = Math.round((actual / target) * 100);
    const grossProfit = Math.round(actual * 0.26);

    return {
      ...partner,
      currentMonthRow,
      actual,
      forecast,
      target,
      attainment,
      wonCount,
      avgDeal,
      grossProfit,
      issueCount,
      overdueFollowUps,
      stuckCount,
      recentActivities,
    };
  })
);

const kpis = computed(() => {
  const totalActual = partnerRows.value.reduce((sum, item) => sum + item.actual, 0);
  const totalWon = partnerRows.value.reduce((sum, item) => sum + item.wonCount, 0);
  const totalTarget = partnerRows.value.reduce((sum, item) => sum + item.target, 0);
  const totalGrossProfit = partnerRows.value.reduce((sum, item) => sum + item.grossProfit, 0);

  return [
    { label: "成交金額", value: formatCurrency(totalActual), helper: "本期累計成交" },
    { label: "成交單數", value: `${totalWon} 筆`, helper: "本期成功案件" },
    {
      label: "達成率",
      value: `${Math.round((totalActual / Math.max(totalTarget, 1)) * 100)}%`,
      helper: "實績 / 目標",
    },
    {
      label: "平均客單價",
      value: formatCurrency(totalWon > 0 ? totalActual / totalWon : 0),
      helper: "平均每筆成交",
    },
    { label: "預估毛利", value: formatCurrency(totalGrossProfit), helper: "以 26% 毛利率估算" },
  ];
});

const rankingSeries = computed(() =>
  partnerRows.value
    .slice()
    .sort((a, b) => b.actual - a.actual)
    .map((item) => ({
      name: item.partnerName,
      value: item.actual,
      level: partnerLevelMap[item.partnerLevel]?.label || item.partnerLevel,
    }))
);

const rankingAverage = computed(() => {
  const total = rankingSeries.value.reduce((sum, item) => sum + item.value, 0);
  return rankingSeries.value.length > 0 ? total / rankingSeries.value.length : 0;
});

const conversionCompareSeries = computed(() =>
  channelPerformanceRecords.map((partner) => {
    const rows = partner.monthlyPerformance.filter((item) =>
      isWithinRange(toTimestamp(item.month), conversionRange.value)
    );
    const created = rows.reduce((sum, item) => sum + Number(item.newCount || 0), 0);
    const won = rows.reduce((sum, item) => sum + Number(item.wonCount || 0), 0);
    const lost = rows.reduce((sum, item) => sum + Number(item.lostCount || 0), 0);
    const quoting = Math.max(Math.round(created * 0.58), won);
    const negotiating = Math.max(Math.round(created * 0.33), won);

    return {
      name: partner.partnerName,
      newCount: created,
      talking: Math.max(Math.round(created * 0.8), won),
      quoting,
      negotiating,
      won,
      lost,
    };
  })
);

const stageDistributionSeries = computed(() =>
  channelPerformanceRecords.map((partner) => {
    const counts = Object.fromEntries(stageOrder.map((item) => [item, 0]));
    partner.relatedOpportunities.forEach((item) => {
      const key = normalizeStage(item.stage);
      if (counts[key] !== undefined) {
        counts[key] += 1;
      }
    });
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0) || 1;

    return {
      name: partner.partnerName,
      counts,
      ratios: Object.fromEntries(
        stageOrder.map((key) => [key, Number(((counts[key] / total) * 100).toFixed(1))])
      ),
    };
  })
);

const scatterSeries = computed(() =>
  partnerRows.value.map((item) => ({
    name: item.partnerName,
    value: [item.recentActivities.length, item.actual, item.attainment],
    typeLabel: partnerTypeMap[item.partnerType]?.label || item.partnerType,
  }))
);

const forecastVsActualSeries = computed(() =>
  partnerRows.value.map((item) => ({
    name: item.partnerName,
    forecast: item.forecast,
    actual: item.actual,
  }))
);

const attentionRows = computed(() =>
  partnerRows.value
    .map((item) => {
      const riskLevel =
        item.attainment < 45 || item.issueCount >= 2 || item.overdueFollowUps >= 2
          ? "high"
          : item.attainment < 70 || item.stuckCount >= 1
          ? "medium"
          : "low";

      return {
        id: item.partnerId,
        partnerName: item.partnerName,
        ownerName: item.ownerName,
        attainment: item.attainment,
        stuckCount: item.stuckCount,
        issueCount: item.issueCount,
        overdueFollowUps: item.overdueFollowUps,
        riskLevel,
        riskLabel: riskLevel === "high" ? "高" : riskLevel === "medium" ? "中" : "低",
      };
    })
    .filter(
      (item) =>
        item.attainment < 80 || item.stuckCount > 0 || item.issueCount > 0 || item.overdueFollowUps > 0
    )
    .sort((a, b) => {
      const rank = { high: 3, medium: 2, low: 1 };
      return rank[b.riskLevel] - rank[a.riskLevel] || a.attainment - b.attainment;
    })
);

const rankingOption = computed(() => ({
  color: ["#2563eb"],
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "shadow" },
    formatter: (params) => {
      const item = rankingSeries.value[params?.[0]?.dataIndex || 0];
      return `${item?.name || ""}<br/>成交金額：${formatCurrency(item?.value || 0)}<br/>等級：${
        item?.level || "-"
      }`;
    },
  },
  grid: { top: 18, left: 110, right: 16, bottom: 20 },
  xAxis: {
    type: "value",
    axisLine: { show: false },
    splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
    axisLabel: {
      color: "#64748b",
      formatter: (value) => `${Math.round(value / 10000)}萬`,
    },
  },
  yAxis: {
    type: "category",
    data: rankingSeries.value.map((item) => item.name),
    axisTick: { show: false },
    axisLine: { show: false },
    axisLabel: { color: "#334155" },
  },
  series: [
    {
      type: "bar",
      data: rankingSeries.value.map((item) => item.value),
      barWidth: 18,
      itemStyle: { borderRadius: [0, 6, 6, 0] },
      markLine: {
        symbol: "none",
        label: {
          formatter: `平均 ${formatCurrency(rankingAverage.value)}`,
          color: "#475569",
        },
        lineStyle: { color: "#f97316", type: "dashed" },
        data: [{ xAxis: rankingAverage.value }],
      },
    },
  ],
}));

const conversionOption = computed(() => ({
  color: ["#cbd5e1", "#93c5fd", "#60a5fa", "#2563eb", "#16a34a", "#ef4444"],
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "shadow" },
  },
  legend: {
    top: 0,
    textStyle: { color: "#475569", fontSize: 12 },
  },
  grid: { top: 28, left: 36, right: 12, bottom: 28, containLabel: true },
  xAxis: {
    type: "category",
    data: conversionCompareSeries.value.map((item) => item.name),
    axisTick: { show: false },
    axisLabel: { color: "#475569", interval: 0, rotate: 18 },
  },
  yAxis: {
    type: "value",
    axisLine: { show: false },
    splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
    axisLabel: { color: "#64748b" },
  },
  series: [
    { name: "新建", type: "bar", stack: "conversion", data: conversionCompareSeries.value.map((item) => item.newCount) },
    { name: "洽談", type: "bar", stack: "conversion", data: conversionCompareSeries.value.map((item) => item.talking) },
    { name: "報價", type: "bar", stack: "conversion", data: conversionCompareSeries.value.map((item) => item.quoting) },
    { name: "議價", type: "bar", stack: "conversion", data: conversionCompareSeries.value.map((item) => item.negotiating) },
    { name: "成交", type: "bar", stack: "conversion", data: conversionCompareSeries.value.map((item) => item.won) },
    { name: "流失", type: "bar", stack: "conversion", data: conversionCompareSeries.value.map((item) => item.lost) },
  ],
}));

const stageDistributionOption = computed(() => ({
  color: ["#94a3b8", "#7dd3fc", "#60a5fa", "#3b82f6", "#22c55e", "#ef4444"],
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "shadow" },
    formatter: (params) =>
      `${params?.[0]?.name || ""}<br/>` +
      params.map((item) => `${item.marker}${item.seriesName}：${item.value}%`).join("<br/>"),
  },
  legend: {
    top: 0,
    textStyle: { color: "#475569", fontSize: 12 },
  },
  grid: { top: 28, left: 36, right: 12, bottom: 28, containLabel: true },
  xAxis: {
    type: "category",
    data: stageDistributionSeries.value.map((item) => item.name),
    axisTick: { show: false },
    axisLabel: { color: "#475569", interval: 0, rotate: 18 },
  },
  yAxis: {
    type: "value",
    max: 100,
    axisLine: { show: false },
    splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
    axisLabel: { color: "#64748b", formatter: "{value}%" },
  },
  series: stageOrder.map((stage) => ({
    name: stageAliasMap[stage],
    type: "bar",
    stack: "distribution",
    data: stageDistributionSeries.value.map((item) => item.ratios[stage]),
  })),
}));

const scatterOption = computed(() => ({
  color: ["#2563eb"],
  tooltip: {
    formatter: (params) =>
      `${params.name}<br/>跟進次數：${params.value[0]}<br/>成交金額：${formatCurrency(
        params.value[1]
      )}<br/>達成率：${params.value[2]}%`,
  },
  grid: { top: 16, left: 48, right: 18, bottom: 36 },
  xAxis: {
    type: "value",
    name: "跟進次數",
    nameTextStyle: { color: "#64748b" },
    axisLine: { show: false },
    splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
    axisLabel: { color: "#64748b" },
  },
  yAxis: {
    type: "value",
    name: "成交金額",
    nameTextStyle: { color: "#64748b" },
    axisLine: { show: false },
    splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
    axisLabel: {
      color: "#64748b",
      formatter: (value) => `${Math.round(value / 10000)}萬`,
    },
  },
  series: [
    {
      type: "scatter",
      symbolSize: (value) => 12 + Math.min((value[2] || 0) / 4, 18),
      data: scatterSeries.value.map((item) => ({
        name: item.name,
        value: item.value,
      })),
      itemStyle: { opacity: 0.85 },
    },
  ],
}));

const forecastOption = computed(() => ({
  color: ["#94a3b8", "#16a34a"],
  tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
  legend: {
    top: 0,
    textStyle: { color: "#475569", fontSize: 12 },
  },
  grid: { top: 28, left: 36, right: 12, bottom: 28, containLabel: true },
  xAxis: {
    type: "category",
    data: forecastVsActualSeries.value.map((item) => item.name),
    axisTick: { show: false },
    axisLabel: { color: "#475569", interval: 0, rotate: 18 },
  },
  yAxis: {
    type: "value",
    axisLine: { show: false },
    splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
    axisLabel: {
      color: "#64748b",
      formatter: (value) => `${Math.round(value / 10000)}萬`,
    },
  },
  series: [
    { name: "預測", type: "bar", data: forecastVsActualSeries.value.map((item) => item.forecast), barWidth: 16 },
    { name: "實際", type: "bar", data: forecastVsActualSeries.value.map((item) => item.actual), barWidth: 16 },
  ],
}));

onMounted(() => {
  window.setTimeout(() => {
    loading.value = false;
  }, 260);
});

function normalizeStage(stage) {
  const key = String(stage || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_");
  return stageNormalizeMap[key] || "prospecting";
}

function normalizePartnerName(accountId) {
  const map = {
    "acc-001": "beanfun! Digital Commerce",
    "acc-002": "Tokyo Influencer Guild",
    "acc-003": "SEA Gamer Network",
    "acc-004": "高橋翔太",
    "acc-005": "Mia Sanchez",
    "acc-006": "Cloud Integrate Labs",
    "acc-007": "Arcade Channel Union",
    "acc-008": "Euro Play Media",
    "acc-009": "晴天整合顧問",
    "acc-010": "beanfun! Digital Commerce",
    "acc-011": "Arcade Channel Union",
    "acc-012": "陳彥廷",
  };
  return map[accountId] || "";
}

function buildPeriodRange(mode, endTs) {
  if (mode === "quarter") {
    return { start: startOfQuarterTs(endTs), end: endTs };
  }
  if (mode === "year") {
    return { start: startOfYearTs(endTs), end: endTs };
  }
  return { start: startOfMonthTs(endTs), end: endTs };
}

function startOfMonthTs(ts) {
  const date = new Date(ts);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function startOfQuarterTs(ts) {
  const date = new Date(ts);
  const month = Math.floor(date.getMonth() / 3) * 3;
  date.setMonth(month, 1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function startOfYearTs(ts) {
  const date = new Date(ts);
  date.setMonth(0, 1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function toTimestamp(value) {
  if (!value) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function isWithinRange(time, range) {
  return time >= range.start && time <= range.end;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function refreshPage() {
  loading.value = true;
  window.setTimeout(() => {
    loading.value = false;
    ElNotification({
      title: "已更新",
      message: "夥伴績效資料已重新整理",
      type: "success",
      position: "top-right",
    });
  }, 220);
}

function goToPartner(partnerId) {
  router.push({ name: "partners-channel-performance-detail", params: { partnerId } });
}
</script>

<template>
  <div class="min-h-full bg-slate-100 p-5">
    <section class="grid gap-4">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div class="grid gap-1">
          <h1 class="text-xl font-bold text-slate-900">夥伴績效</h1>
          <p class="text-sm text-slate-500">成交、轉換、預測與風險診斷</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElSelect v-model="period" class="!w-[110px]">
            <ElOption v-for="item in periodOptions" :key="item.value" :label="item.label" :value="item.value" />
          </ElSelect>
          <ElButton @click="goToPartner(partnerRows[0]?.partnerId || 'partner-001')">查看明細</ElButton>
          <ElButton circle :icon="Refresh" @click="refreshPage" />
        </div>
      </header>

      <ElSkeleton :loading="loading" animated>
        <template #template>
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div v-for="idx in 5" :key="idx" class="h-28 rounded-xl bg-white" />
          </div>
        </template>
        <template #default>
          <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <article
              v-for="item in kpis"
              :key="item.label"
              class="rounded-xl border border-slate-200 bg-white px-4 py-4"
            >
              <p class="text-sm text-slate-500">{{ item.label }}</p>
              <p class="mt-1 text-xl font-bold text-slate-900">{{ item.value }}</p>
              <p class="mt-2 text-sm text-slate-500">{{ item.helper }}</p>
            </article>
          </section>

          <section class="grid grid-cols-1 gap-3 xl:grid-cols-12">
            <article class="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-6">
              <div class="mb-3 flex items-center justify-between gap-2">
                <h2 class="text-lg font-semibold text-slate-900">夥伴業績排行</h2>
                <span class="text-sm text-slate-500">{{ periodOptions.find((item) => item.value === period)?.label }}</span>
              </div>
              <div class="h-[320px]">
                <VChart :option="rankingOption" autoresize class="h-full w-full" />
              </div>
            </article>

            <article class="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-6">
              <div class="mb-3 flex items-center justify-between gap-2">
                <h2 class="text-lg font-semibold text-slate-900">商機轉換率比較</h2>
                <ElSelect v-model="conversionWindow" class="!w-[110px]">
                  <ElOption v-for="item in periodOptions" :key="item.value" :label="item.label" :value="item.value" />
                </ElSelect>
              </div>
              <div class="h-[320px]">
                <VChart :option="conversionOption" autoresize class="h-full w-full" />
              </div>
            </article>

            <article class="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-4">
              <div class="mb-3 flex items-center justify-between gap-2">
                <h2 class="text-lg font-semibold text-slate-900">夥伴商機階段分布</h2>
                <span class="text-sm text-slate-500">100% 堆疊</span>
              </div>
              <div class="h-[320px]">
                <VChart :option="stageDistributionOption" autoresize class="h-full w-full" />
              </div>
            </article>

            <article class="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-4">
              <div class="mb-3 flex items-center justify-between gap-2">
                <h2 class="text-lg font-semibold text-slate-900">跟進次數 vs 成交金額</h2>
                <span class="text-sm text-slate-500">投入與產出</span>
              </div>
              <div class="h-[320px]">
                <VChart :option="scatterOption" autoresize class="h-full w-full" />
              </div>
            </article>

            <article class="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-4">
              <div class="mb-3 flex items-center justify-between gap-2">
                <h2 class="text-lg font-semibold text-slate-900">Forecast vs Actual</h2>
                <span class="text-sm text-slate-500">預測與實績落差</span>
              </div>
              <div class="h-[320px]">
                <VChart :option="forecastOption" autoresize class="h-full w-full" />
              </div>
            </article>
          </section>

          <section class="rounded-xl border border-slate-200 bg-white p-4">
            <div class="mb-3 flex items-center justify-between gap-2">
              <h2 class="text-lg font-semibold text-slate-900">待關注名單</h2>
              <span class="text-sm text-slate-500">達成率、卡關、客訴與逾期跟進</span>
            </div>

            <div class="overflow-x-auto">
              <table class="min-w-[980px] w-full border-collapse">
                <thead>
                  <tr>
                    <th class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600">夥伴</th>
                    <th class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600">負責人</th>
                    <th class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600">達成率</th>
                    <th class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600">卡關案件</th>
                    <th class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600">Issue</th>
                    <th class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600">逾期未跟進</th>
                    <th class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600">風險等級</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in attentionRows"
                    :key="row.id"
                    class="cursor-pointer hover:bg-slate-50"
                    @click="goToPartner(row.id)"
                  >
                    <td class="border border-slate-200 px-3 py-2 text-base text-slate-900">{{ row.partnerName }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-base text-slate-700">{{ row.ownerName }}</td>
                    <td class="border border-slate-200 px-3 py-2 text-base text-slate-700">
                      <div class="flex items-center gap-3">
                        <ElProgress :percentage="Math.min(row.attainment, 100)" :stroke-width="10" class="!w-[140px]" />
                        <span>{{ row.attainment }}%</span>
                      </div>
                    </td>
                    <td class="border border-slate-200 px-3 py-2 text-base text-slate-700">{{ row.stuckCount }} 筆</td>
                    <td class="border border-slate-200 px-3 py-2 text-base text-slate-700">{{ row.issueCount }} 件</td>
                    <td class="border border-slate-200 px-3 py-2 text-base text-slate-700">{{ row.overdueFollowUps }} 筆</td>
                    <td class="border border-slate-200 px-3 py-2 text-base text-slate-700">
                      <ElTag
                        :type="
                          row.riskLevel === 'high'
                            ? 'danger'
                            : row.riskLevel === 'medium'
                            ? 'warning'
                            : 'success'
                        "
                      >
                        {{ row.riskLabel }}
                      </ElTag>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>
      </ElSkeleton>
    </section>
  </div>
</template>
