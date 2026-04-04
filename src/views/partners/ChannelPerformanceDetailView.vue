<script setup>
import { computed, reactive, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import VChart from "vue-echarts";
import { use } from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  TitleComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import {
  ElButton,
  ElDatePicker,
  ElEmpty,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";
import { ArrowLeft } from "@element-plus/icons-vue";
import {
  activityLevelMap,
  cooperationModeMap,
  cooperationStatusMap,
  partnerLevelMap,
  partnerTypeMap,
  periodPresetOptions,
  trendStatusMap,
} from "../../data/channelPerformance";
import { useChannelPerformanceStore } from "../../composables/useChannelPerformanceStore";

use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  TitleComponent,
  CanvasRenderer,
]);

const route = useRoute();
const router = useRouter();
const { getPartnerDetail, resolveDateRangeByPreset } = useChannelPerformanceStore();

const presetValues = new Set(periodPresetOptions.map((item) => item.value));
const initialPreset =
  typeof route.query.preset === "string" && presetValues.has(route.query.preset)
    ? route.query.preset
    : "this_quarter";

const initialStart = typeof route.query.start === "string" ? route.query.start : "";
const initialEnd = typeof route.query.end === "string" ? route.query.end : "";

const filters = reactive({
  timePreset: initialPreset,
  customDateRange:
    initialPreset === "custom" && initialStart && initialEnd
      ? [initialStart, initialEnd]
      : [],
});

const partnerId = computed(() => String(route.params.partnerId ?? ""));

const range = computed(() =>
  resolveDateRangeByPreset(filters.timePreset, filters.customDateRange)
);

const detail = computed(() => getPartnerDetail(partnerId.value, range.value));

const rangeLabel = computed(() => {
  const [startDate, endDate] = range.value;
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
});

const summaryCards = computed(() => {
  if (!detail.value) {
    return [];
  }

  return [
    { label: "關聯商機數", value: detail.value.relatedOpportunityCount },
    { label: "成交商機數", value: detail.value.wonOpportunityCount },
    { label: "轉換率", value: detail.value.conversionRate, type: "percent" },
    { label: "本期成交金額", value: detail.value.periodRevenue, type: "currency" },
    { label: "累計成交金額", value: detail.value.totalRevenue, type: "currency" },
    { label: "平均客單價", value: detail.value.averageDealSize, type: "currency" },
    { label: "最近互動日期", value: formatDate(detail.value.lastInteractionAt) },
    { label: "活躍度等級", value: activityLevelMap[detail.value.activityLevel]?.label ?? "-" },
  ];
});

const opportunityTrendOption = computed(() => {
  if (!detail.value || detail.value.monthlySeries.length === 0) {
    return null;
  }

  return {
    tooltip: { trigger: "axis" },
    legend: {
      top: 2,
      data: ["關聯商機", "新增商機", "成交商機"],
    },
    grid: { left: 12, right: 12, top: 42, bottom: 12, containLabel: true },
    xAxis: {
      type: "category",
      data: detail.value.monthlySeries.map((item) => item.label),
    },
    yAxis: [{ type: "value", name: "件數" }],
    series: [
      {
        name: "關聯商機",
        type: "line",
        smooth: true,
        data: detail.value.monthlySeries.map((item) => item.relatedCount),
        itemStyle: { color: "#2563eb" },
      },
      {
        name: "新增商機",
        type: "line",
        smooth: true,
        data: detail.value.monthlySeries.map((item) => item.newCount),
        itemStyle: { color: "#10b981" },
      },
      {
        name: "成交商機",
        type: "line",
        smooth: true,
        data: detail.value.monthlySeries.map((item) => item.wonCount),
        itemStyle: { color: "#f59e0b" },
      },
    ],
  };
});

const revenueTrendOption = computed(() => {
  if (!detail.value || detail.value.monthlySeries.length === 0) {
    return null;
  }

  return {
    tooltip: { trigger: "axis" },
    legend: {
      top: 2,
      data: ["成交金額", "預估金額", "轉換率"],
    },
    grid: { left: 12, right: 12, top: 42, bottom: 12, containLabel: true },
    xAxis: {
      type: "category",
      data: detail.value.monthlySeries.map((item) => item.label),
    },
    yAxis: [
      { type: "value", name: "金額" },
      { type: "value", name: "轉換率", max: 100 },
    ],
    series: [
      {
        name: "成交金額",
        type: "bar",
        data: detail.value.monthlySeries.map((item) => item.periodRevenue),
        itemStyle: { color: "#2563eb" },
        barMaxWidth: 22,
      },
      {
        name: "預估金額",
        type: "bar",
        data: detail.value.monthlySeries.map((item) => item.estimatedRevenue),
        itemStyle: { color: "#94a3b8" },
        barMaxWidth: 22,
      },
      {
        name: "轉換率",
        type: "line",
        yAxisIndex: 1,
        smooth: true,
        data: detail.value.monthlySeries.map((item) => Number(item.conversionRate.toFixed(2))),
        itemStyle: { color: "#ef4444" },
      },
    ],
  };
});

const productBreakdownOption = computed(() => {
  if (!detail.value || detail.value.productBreakdown.length === 0) {
    return null;
  }

  return {
    tooltip: {
      trigger: "item",
      formatter: (item) => `${item.name}<br/>${formatCurrency(item.value)} (${item.percent}%)`,
    },
    legend: {
      bottom: 0,
      type: "scroll",
    },
    series: [
      {
        type: "pie",
        radius: ["34%", "68%"],
        center: ["50%", "44%"],
        data: detail.value.productBreakdown.map((item) => ({
          name: item.label,
          value: item.value,
        })),
      },
    ],
  };
});

const marketBreakdownOption = computed(() => {
  if (!detail.value || detail.value.marketBreakdown.length === 0) {
    return null;
  }

  return {
    tooltip: {
      trigger: "item",
      formatter: (item) => `${item.name}<br/>${formatCurrency(item.value)} (${item.percent}%)`,
    },
    legend: {
      bottom: 0,
      type: "scroll",
    },
    series: [
      {
        type: "pie",
        radius: ["34%", "68%"],
        center: ["50%", "44%"],
        data: detail.value.marketBreakdown.map((item) => ({
          name: item.label,
          value: item.value,
        })),
      },
    ],
  };
});

const statusBreakdownOption = computed(() => {
  if (!detail.value || detail.value.statusBreakdown.length === 0) {
    return null;
  }

  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
    },
    grid: { left: 12, right: 12, top: 18, bottom: 12, containLabel: true },
    xAxis: {
      type: "category",
      data: detail.value.statusBreakdown.map((item) => opportunityStatusMap[item.label]?.label ?? item.label),
    },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        data: detail.value.statusBreakdown.map((item) => item.value),
        itemStyle: { color: "#334155" },
        barWidth: 28,
      },
    ],
  };
});

const isEmptyInRange = computed(() => {
  if (!detail.value) {
    return false;
  }

  return detail.value.relatedOpportunityCount === 0 && detail.value.periodRevenue === 0;
});

const opportunityStatusMap = {
  active: { label: "進行中", type: "warning" },
  won: { label: "已成交", type: "success" },
  lost: { label: "已失敗", type: "danger" },
};

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatPercent(value) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

function goBack() {
  const [startDate, endDate] = range.value;

  router.push({
    name: "partners-channel-performance",
    query: {
      preset: filters.timePreset,
      start: startDate.toISOString().slice(0, 10),
      end: endDate.toISOString().slice(0, 10),
    },
  });
}

function goPartner() {
  if (!detail.value) {
    return;
  }

  router.push({
    name: "partners-list",
    query: { partnerId: detail.value.partnerId },
  });
}

function goOpportunities() {
  if (!detail.value) {
    return;
  }

  router.push({
    name: "opportunities-list",
    query: { partnerId: detail.value.partnerId },
  });
}

function goTerms() {
  if (!detail.value) {
    return;
  }

  router.push({
    name: "partners-terms",
    query: { partnerId: detail.value.partnerId },
  });
}

function goSettlement() {
  if (!detail.value) {
    return;
  }

  router.push({
    name: "partners-settlement",
    query: { partnerId: detail.value.partnerId },
  });
}

watch(
  () => filters.timePreset,
  (value) => {
    if (value !== "custom") {
      filters.customDateRange = [];
    }
  }
);
</script>

<template>
  <div class="min-h-full p-8">
    <section v-if="detail" class="grid gap-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-3">
          <ElButton text :icon="ArrowLeft" class="!justify-start !px-0" @click="goBack">
            返回通路績效總覽
          </ElButton>

          <div class="grid gap-1">
            <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">
              {{ detail.partnerName }}
            </h1>
            <p class="text-xs text-slate-500">
              {{ detail.partnerCode }} ・ {{ detail.ownerName }} ・ 分析期間：{{ rangeLabel }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <ElTag round :type="partnerTypeMap[detail.partnerType]?.type">
              {{ partnerTypeMap[detail.partnerType]?.label }}
            </ElTag>
            <ElTag round :type="cooperationStatusMap[detail.cooperationStatus]?.type">
              {{ cooperationStatusMap[detail.cooperationStatus]?.label }}
            </ElTag>
            <ElTag round :type="partnerLevelMap[detail.partnerLevel]?.type || 'info'">
              {{ partnerLevelMap[detail.partnerLevel]?.label }}
            </ElTag>
            <ElTag round :type="cooperationModeMap[detail.cooperationMode]?.type || 'info'" effect="plain">
              {{ cooperationModeMap[detail.cooperationMode]?.label }}
            </ElTag>
            <ElTag round :type="activityLevelMap[detail.activityLevel]?.type">
              活躍度：{{ activityLevelMap[detail.activityLevel]?.label }}
            </ElTag>
            <ElTag round :type="trendStatusMap[detail.trendStatus]?.type">
              趨勢：{{ trendStatusMap[detail.trendStatus]?.label }}
            </ElTag>
          </div>
        </div>

        <div class="grid gap-2">
          <div class="flex flex-wrap items-center justify-end gap-2">
            <ElSelect v-model="filters.timePreset" class="!w-[150px]">
              <ElOption
                v-for="option in periodPresetOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </ElSelect>

            <ElDatePicker
              v-if="filters.timePreset === 'custom'"
              v-model="filters.customDateRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              range-separator="至"
              start-placeholder="起"
              end-placeholder="迄"
              class="!w-[240px]"
            />
          </div>

          <div class="flex flex-wrap items-center justify-end gap-2">
            <ElButton @click="goPartner">查看夥伴詳情</ElButton>
            <ElButton @click="goOpportunities">查看商機</ElButton>
            <ElButton @click="goTerms">查看合作條件</ElButton>
            <ElButton @click="goSettlement">查看分潤管理</ElButton>
          </div>
        </div>
      </header>

      <section v-if="isEmptyInRange" class="rounded-2xl border border-slate-200 bg-white px-6 py-10">
        <ElEmpty description="此夥伴於所選期間內尚無可分析資料">
          <p class="mb-4 text-sm text-slate-500">可切換時間區間或查看歷史績效資料。</p>
        </ElEmpty>
      </section>

      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="card in summaryCards"
          :key="card.label"
          class="rounded-2xl border border-slate-200 bg-white px-4 py-4"
        >
          <p class="text-xs text-slate-500">{{ card.label }}</p>
          <p class="mt-2 text-lg font-semibold text-slate-900">
            <span v-if="card.type === 'currency'">{{ formatCurrency(card.value) }}</span>
            <span v-else-if="card.type === 'percent'">{{ formatPercent(card.value) }}</span>
            <span v-else>{{ card.value }}</span>
          </p>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <article class="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-900">商機趨勢</h3>
          <VChart
            v-if="opportunityTrendOption"
            :option="opportunityTrendOption"
            class="mt-2 w-full"
            style="height: 320px"
          />
          <ElEmpty v-else description="尚無趨勢資料" class="!py-12" />
        </article>

        <article class="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-900">成交與轉換趨勢</h3>
          <VChart
            v-if="revenueTrendOption"
            :option="revenueTrendOption"
            class="mt-2 w-full"
            style="height: 320px"
          />
          <ElEmpty v-else description="尚無趨勢資料" class="!py-12" />
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-3">
        <article class="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-900">成果結構：產品 / 方案</h3>
          <VChart
            v-if="productBreakdownOption"
            :option="productBreakdownOption"
            class="mt-2 w-full"
            style="height: 300px"
          />
          <ElEmpty v-else description="尚無分布資料" class="!py-10" />
        </article>

        <article class="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-900">成果結構：地區 / 市場</h3>
          <VChart
            v-if="marketBreakdownOption"
            :option="marketBreakdownOption"
            class="mt-2 w-full"
            style="height: 300px"
          />
          <ElEmpty v-else description="尚無分布資料" class="!py-10" />
        </article>

        <article class="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-900">案件狀態分布</h3>
          <VChart
            v-if="statusBreakdownOption"
            :option="statusBreakdownOption"
            class="mt-2 w-full"
            style="height: 300px"
          />
          <ElEmpty v-else description="尚無分布資料" class="!py-10" />
        </article>
      </section>

      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div class="px-6 py-4">
          <h3 class="text-sm font-semibold text-slate-900">關聯商機</h3>
        </div>

        <ElTable :data="detail.relatedOpportunities" table-layout="auto" size="large">
          <ElTableColumn label="商機" min-width="260">
            <template #default="{ row }">
              <div class="grid gap-0.5">
                <span class="text-sm font-medium text-slate-900">{{ row.name }}</span>
                <span class="text-xs text-slate-400">{{ row.code }}</span>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="階段" min-width="120">
            <template #default="{ row }">{{ row.stage }}</template>
          </ElTableColumn>

          <ElTableColumn label="狀態" min-width="96">
            <template #default="{ row }">
              <ElTag round :type="opportunityStatusMap[row.status]?.type || 'info'" effect="light">
                {{ opportunityStatusMap[row.status]?.label || row.status }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="金額" min-width="120">
            <template #default="{ row }">{{ formatCurrency(row.amount) }}</template>
          </ElTableColumn>

          <ElTableColumn label="預計成交" min-width="120">
            <template #default="{ row }">{{ formatDate(row.expectedCloseDate) }}</template>
          </ElTableColumn>

          <ElTableColumn label="產品 / 方案" min-width="130" prop="product" />
          <ElTableColumn label="市場" min-width="100" prop="market" />
          <ElTableColumn label="負責人" min-width="100" prop="ownerName" />
        </ElTable>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <article class="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-900">經營判斷</h3>

          <div v-if="detail.insights.length > 0" class="mt-3 flex flex-wrap gap-2">
            <ElTag
              v-for="item in detail.insights"
              :key="item"
              round
              type="success"
              effect="light"
            >
              {{ item }}
            </ElTag>
          </div>

          <p v-else class="mt-3 text-sm text-slate-500">目前尚無系統判斷標記。</p>
        </article>

        <article class="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-900">風險與待關注</h3>

          <div v-if="detail.warnings.length > 0" class="mt-3 flex flex-wrap gap-2">
            <ElTag
              v-for="item in detail.warnings"
              :key="item"
              round
              type="warning"
              effect="light"
            >
              {{ item }}
            </ElTag>
          </div>

          <p v-else class="mt-3 text-sm text-slate-500">目前無需特別關注的風險訊號。</p>
        </article>
      </section>
    </section>

    <section v-else class="rounded-2xl border border-slate-200 bg-white px-6 py-16">
      <ElEmpty description="找不到夥伴績效資料">
        <p class="mb-4 text-sm text-slate-500">此夥伴不存在或目前無法取得績效資料。</p>
        <ElButton type="primary" @click="goBack">返回通路績效總覽</ElButton>
      </ElEmpty>
    </section>
  </div>
</template>
