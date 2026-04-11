<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { ElButton, ElNotification, ElOption, ElSelect, ElTag } from "element-plus";
import { Refresh } from "@element-plus/icons-vue";
import VChart from "vue-echarts";
import { ensureDashboardCharts } from "../../components/dashboard/echartsSetup";
import {
  opportunityList,
  opportunitySourceOptions,
  opportunityStageOptions,
} from "../../data/opportunities";

ensureDashboardCharts();

const router = useRouter();
const DAY_MS = 24 * 60 * 60 * 1000;
const NOW_TS = new Date("2026-04-10T12:00:00+08:00").getTime();

const period = ref("180d");
const periodOptions = [
  { value: "30d", label: "近 30 天" },
  { value: "90d", label: "近 90 天" },
  { value: "180d", label: "近 180 天" },
];

const stageOrder = opportunityStageOptions
  .filter((item) => item.value !== "all")
  .map((item) => item.value);

const stageLabelMap = Object.fromEntries(
  opportunityStageOptions
    .filter((item) => item.value !== "all")
    .map((item) => [item.value, item.label])
);

const sourceOrder = opportunitySourceOptions.map((item) => item.value);

const sourceLabelMap = Object.fromEntries(
  opportunitySourceOptions.map((item) => [item.value, item.label])
);

function toTimestamp(value) {
  if (!value) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const normalized = String(value).includes("T")
    ? String(value)
    : String(value).replace(" ", "T");

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatDate(value) {
  const ts = toTimestamp(value);
  if (!ts) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getPriorityTagType(priority) {
  if (priority === "high") {
    return "danger";
  }
  if (priority === "medium") {
    return "warning";
  }
  return "info";
}

function getPriorityLabel(priority) {
  if (priority === "high") {
    return "高";
  }
  if (priority === "medium") {
    return "中";
  }
  return "低";
}

/**
 * 重點修正：
 * 1. 期間篩選不要再用 expectedCloseDate 當主判斷
 * 2. expectedCloseDate 是未來日期，會把進行中的商機全部排掉
 * 3. 改用 updatedAt / createdAt 做「近幾天有活動的商機」
 */
const periodFilteredOpportunities = computed(() => {
  const days = Number(period.value.replace("d", "")) || 180;
  const startTs = NOW_TS - days * DAY_MS;

  const list = opportunityList.filter((item) => {
    const activityTs = toTimestamp(
      item.updatedAt ||
        item.createdAt ||
        item.stageChangedAt ||
        item.nextActionDate ||
        item.expectedCloseDate
    );

    return activityTs >= startTs;
  });

  return list.length > 0 ? list : opportunityList;
});

const recentRows = computed(() =>
  periodFilteredOpportunities.value
    .slice()
    .sort((a, b) => {
      const aTs = toTimestamp(
        a.updatedAt || a.createdAt || a.stageChangedAt || a.expectedCloseDate
      );
      const bTs = toTimestamp(
        b.updatedAt || b.createdAt || b.stageChangedAt || b.expectedCloseDate
      );
      return bTs - aTs;
    })
    .slice(0, 8)
);

const sourceDistribution = computed(() => {
  const map = new Map(sourceOrder.map((key) => [key, 0]));

  periodFilteredOpportunities.value.forEach((item) => {
    const key = item.source;
    map.set(key, (map.get(key) || 0) + 1);
  });

  return sourceOrder
    .map((key) => ({
      key,
      name: sourceLabelMap[key] || key,
      value: map.get(key) || 0,
    }))
    .filter((item) => item.value > 0);
});

const stageCountSeries = computed(() => {
  const map = new Map(stageOrder.map((key) => [key, 0]));

  periodFilteredOpportunities.value.forEach((item) => {
    const key = item.stage;
    map.set(key, (map.get(key) || 0) + 1);
  });

  return stageOrder.map((key) => ({
    key,
    name: stageLabelMap[key] || key,
    value: map.get(key) || 0,
  }));
});

const stageAmountSeries = computed(() => {
  const map = new Map(stageOrder.map((key) => [key, 0]));

  periodFilteredOpportunities.value.forEach((item) => {
    const key = item.stage;
    map.set(key, (map.get(key) || 0) + Number(item.expectedRevenue || 0));
  });

  return stageOrder.map((key) => ({
    key,
    name: stageLabelMap[key] || key,
    value: map.get(key) || 0,
  }));
});

const summaryCards = computed(() => {
  const list = periodFilteredOpportunities.value;

  const totalCount = list.length;
  const activeCount = list.filter((item) => item.stage !== "won" && item.stage !== "lost")
    .length;
  const wonCount = list.filter((item) => item.stage === "won").length;
  const lostCount = list.filter((item) => item.stage === "lost").length;

  const totalAmount = list.reduce(
    (sum, item) => sum + Number(item.expectedRevenue || 0),
    0
  );

  const activeAmount = list
    .filter((item) => item.stage !== "won" && item.stage !== "lost")
    .reduce((sum, item) => sum + Number(item.expectedRevenue || 0), 0);

  return [
    {
      title: "商機總數",
      value: `${totalCount} 筆`,
      subtext: periodOptions.find((item) => item.value === period.value)?.label || "",
    },
    {
      title: "進行中商機",
      value: `${activeCount} 筆`,
      subtext: `Pipeline 金額 ${formatCurrency(activeAmount)}`,
    },
    {
      title: "已成交",
      value: `${wonCount} 筆`,
      subtext: `已失敗 ${lostCount} 筆`,
    },
    {
      title: "商機總金額",
      value: formatCurrency(totalAmount),
      subtext: "依目前篩選區間統計",
    },
  ];
});

const donutOption = computed(() => ({
  color: ["#4f46e5", "#f59e0b", "#0ea5e9", "#ef4444", "#22c55e", "#64748b"],
  tooltip: {
    trigger: "item",
    formatter: "{b}<br/>商機 {c} 筆 ({d}%)",
  },
  legend: {
    bottom: 0,
    left: "center",
    icon: "circle",
    textStyle: { color: "#475569", fontSize: 12 },
  },
  series: [
    {
      type: "pie",
      radius: ["48%", "70%"],
      center: ["50%", "42%"],
      avoidLabelOverlap: true,
      label: { show: false },
      labelLine: { show: false },
      data: sourceDistribution.value,
    },
  ],
}));

const funnelOption = computed(() => ({
  color: ["#4f46e5", "#06b6d4", "#f59e0b", "#10b981", "#84cc16", "#22c55e", "#ef4444"],
  tooltip: {
    trigger: "item",
    formatter: "{b}<br/>商機 {c} 筆",
  },
  series: [
    {
      type: "funnel",
      left: "3%",
      top: 12,
      bottom: 12,
      width: "94%",
      min: 0,
      max: Math.max(...stageCountSeries.value.map((item) => item.value), 1),
      minSize: "18%",
      maxSize: "100%",
      sort: "descending",
      gap: 3,
      label: {
        show: true,
        position: "inside",
        color: "#ffffff",
        fontSize: 12,
        formatter: (params) => `${params.name}：${params.value}`,
      },
      itemStyle: {
        borderColor: "#ffffff",
        borderWidth: 1,
      },
      data: stageCountSeries.value,
    },
  ],
}));

const stageCountBarOption = computed(() => ({
  color: ["#ef4444"],
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "shadow" },
    formatter: (params) =>
      `${params?.[0]?.name || ""}<br/>商機數：${params?.[0]?.value || 0} 筆`,
  },
  grid: { top: 12, left: 86, right: 12, bottom: 12, containLabel: false },
  xAxis: {
    type: "value",
    axisLine: { show: false },
    splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
    axisLabel: { color: "#64748b", fontSize: 12 },
  },
  yAxis: {
    type: "category",
    data: stageCountSeries.value.map((item) => item.name),
    axisTick: { show: false },
    axisLine: { show: false },
    axisLabel: { color: "#475569", fontSize: 12 },
  },
  series: [
    {
      type: "bar",
      data: stageCountSeries.value.map((item) => item.value),
      barWidth: 16,
      itemStyle: { borderRadius: [0, 6, 6, 0] },
    },
  ],
}));

const stageAmountBarOption = computed(() => ({
  color: ["#22c55e"],
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "shadow" },
    formatter: (params) =>
      `${params?.[0]?.name || ""}<br/>金額：${formatCurrency(params?.[0]?.value || 0)}`,
  },
  grid: { top: 12, left: 86, right: 12, bottom: 12, containLabel: false },
  xAxis: {
    type: "value",
    axisLine: { show: false },
    splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
    axisLabel: {
      color: "#64748b",
      fontSize: 12,
      formatter: (value) => `${Math.round(value / 10000)}萬`,
    },
  },
  yAxis: {
    type: "category",
    data: stageAmountSeries.value.map((item) => item.name),
    axisTick: { show: false },
    axisLine: { show: false },
    axisLabel: { color: "#475569", fontSize: 12 },
  },
  series: [
    {
      type: "bar",
      data: stageAmountSeries.value.map((item) => item.value),
      barWidth: 16,
      itemStyle: { borderRadius: [0, 6, 6, 0] },
    },
  ],
}));

function refreshView() {
  ElNotification({
    title: "已更新",
    message: "商機概況已重新整理",
    type: "success",
    position: "top-right",
  });
}

function goTo(routeName, params = {}) {
  router.push({ name: routeName, params });
}
</script>

<template>
  <div class="min-h-full bg-slate-100 p-5">
    <section class="mx-auto grid gap-3">
      <header class="flex flex-wrap items-center justify-between gap-2">
        <div class="grid gap-1">
          <h1 class="text-xl font-bold text-slate-900">商機概況</h1>
          <p class="text-sm text-slate-500">商機分布、階段與金額總覽</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElSelect v-model="period" class="!w-[126px]">
            <ElOption
              v-for="item in periodOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
          <ElButton @click="goTo('opportunities-pipeline')">前往 Pipeline</ElButton>
          <ElButton circle :icon="Refresh" @click="refreshView" />
        </div>
      </header>

      <section class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="card in summaryCards"
          :key="card.title"
          class="rounded-xl border border-slate-200 bg-white p-4"
        >
          <div class="text-sm text-slate-500">{{ card.title }}</div>
          <div class="mt-2 text-2xl font-bold text-slate-900">{{ card.value }}</div>
          <div class="mt-1 text-sm text-slate-500">{{ card.subtext }}</div>
        </article>
      </section>

      <section class="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <article class="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-7">
          <div class="mb-3 flex items-center justify-between gap-2">
            <h2 class="text-lg font-semibold text-slate-900">近期商機</h2>
            <span class="text-sm text-slate-500">
              {{ periodOptions.find((item) => item.value === period)?.label }}
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full min-w-[1240px] border-collapse">
              <thead>
                <tr>
                  <th
                    class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600"
                  >
                    商機名稱
                  </th>
                  <th
                    class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600"
                  >
                    客戶
                  </th>

                  <th
                    class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600"
                  >
                    來源
                  </th>
                  <th
                    class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600"
                  >
                    階段
                  </th>
                  <th
                    class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600"
                  >
                    預計金額
                  </th>
                  <th
                    class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600"
                  >
                    預計結案日
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in recentRows"
                  :key="row.id"
                  class="cursor-pointer hover:bg-slate-50"
                  @click="goTo('opportunity-detail', { opportunityId: row.id })"
                >
                  <td class="border border-slate-200 px-3 py-2 text-base text-slate-900">
                    {{ row.name }}
                  </td>
                  <td class="border border-slate-200 px-3 py-2 text-base text-slate-700">
                    {{ row.accountName }}
                  </td>

                  <td class="border border-slate-200 px-3 py-2 text-base text-slate-700">
                    <ElTag size="small" effect="plain">
                      {{ sourceLabelMap[row.source] || row.source }}
                    </ElTag>
                  </td>
                  <td class="border border-slate-200 px-3 py-2 text-base text-slate-700">
                    {{ stageLabelMap[row.stage] || row.stage }}
                  </td>
                  <td class="border border-slate-200 px-3 py-2 text-base text-slate-700">
                    {{ formatCurrency(row.expectedRevenue) }}
                  </td>
                  <td class="border border-slate-200 px-3 py-2 text-base text-slate-700">
                    {{ formatDate(row.expectedCloseDate) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-5">
          <div class="mb-2 flex items-center justify-between gap-2">
            <h2 class="text-lg font-semibold text-slate-900">商機來源分布</h2>
            <span class="text-sm text-slate-500">
              {{ periodOptions.find((item) => item.value === period)?.label }}
            </span>
          </div>
          <div class="h-[320px]">
            <VChart :option="donutOption" autoresize class="h-full w-full" />
          </div>
        </article>

        <article class="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-7">
          <div class="mb-2 flex items-center justify-between gap-2">
            <h2 class="text-lg font-semibold text-slate-900">商機階段漏斗</h2>
            <span class="text-sm text-slate-500">
              {{ periodOptions.find((item) => item.value === period)?.label }}
            </span>
          </div>
          <div class="h-[340px]">
            <VChart :option="funnelOption" autoresize class="h-full w-full" />
          </div>
        </article>

        <div class="grid gap-3 xl:col-span-5">
          <article class="rounded-xl border border-slate-200 bg-white p-4">
            <div class="mb-2 flex items-center justify-between gap-2">
              <h2 class="text-lg font-semibold text-slate-900">各階段商機數量</h2>
              <span class="text-sm text-slate-500">
                {{ periodOptions.find((item) => item.value === period)?.label }}
              </span>
            </div>
            <div class="h-[220px]">
              <VChart :option="stageCountBarOption" autoresize class="h-full w-full" />
            </div>
          </article>

          <article class="rounded-xl border border-slate-200 bg-white p-4">
            <div class="mb-2 flex items-center justify-between gap-2">
              <h2 class="text-lg font-semibold text-slate-900">各階段商機金額</h2>
              <span class="text-sm text-slate-500">
                {{ periodOptions.find((item) => item.value === period)?.label }}
              </span>
            </div>
            <div class="h-[220px]">
              <VChart :option="stageAmountBarOption" autoresize class="h-full w-full" />
            </div>
          </article>
        </div>
      </section>
    </section>
  </div>
</template>
