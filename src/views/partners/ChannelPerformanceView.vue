<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
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
  ElCheckbox,
  ElDatePicker,
  ElDrawer,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElEmpty,
  ElInput,
  ElNotification,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";
import {
  Download,
  Filter,
  MoreFilled,
  Refresh,
  Search,
  Setting,
} from "@element-plus/icons-vue";
import {
  activityLevelMap,
  cooperationModeMap,
  cooperationStatusMap,
  entityTypeMap,
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

const router = useRouter();
const {
  records,
  listOverviewRecords,
  listPartnerOptions,
  resolveDateRangeByPreset,
} = useChannelPerformanceStore();

const loading = ref(false);
const filterPanelOpen = ref(false);
const columnDrawerOpen = ref(false);
const distributionDimension = ref("partnerType");
const currentPage = ref(1);
const pageSize = ref(10);
const sortState = reactive({
  prop: "periodRevenue",
  order: "descending",
});

const tableColumns = reactive({
  partnerType: true,
  cooperationStatus: true,
  owner: true,
  related: true,
  won: true,
  conversion: true,
  periodRevenue: true,
  totalRevenue: true,
  averageDeal: true,
  interaction: true,
  activityLevel: true,
  trend: true,
});

const filters = reactive({
  keyword: "",
  timePreset: "this_quarter",
  customDateRange: [],
  partnerId: "all",
  partnerType: "all",
  entityType: "all",
  cooperationMode: "all",
  region: "all",
  market: "all",
  ownerId: "all",
  product: "all",
  partnerLevel: "all",
  cooperationStatus: "all",
});

const range = computed(() =>
  resolveDateRangeByPreset(filters.timePreset, filters.customDateRange)
);

const rangeLabel = computed(() => {
  const [startDate, endDate] = range.value;
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
});

const overviewRecords = computed(() => listOverviewRecords(range.value));

const partnerOptions = computed(() => [
  { label: "全部夥伴", value: "all" },
  ...listPartnerOptions(),
]);

const partnerTypeOptions = computed(() => [
  { label: "全部夥伴類型", value: "all" },
  ...Object.entries(partnerTypeMap).map(([value, meta]) => ({
    label: meta.label,
    value,
  })),
]);

const entityTypeOptions = [
  { label: "全部主體類型", value: "all" },
  { label: "組織", value: "organization" },
  { label: "個人", value: "person" },
];

const cooperationModeOptions = computed(() => [
  { label: "全部合作模式", value: "all" },
  ...Object.entries(cooperationModeMap).map(([value, meta]) => ({
    label: meta.label,
    value,
  })),
]);

const ownerOptions = computed(() => {
  const ownerMap = new Map();

  records.value.forEach((item) => {
    ownerMap.set(item.ownerId, item.ownerName);
  });

  return [
    { label: "全部負責人", value: "all" },
    ...[...ownerMap.entries()].map(([value, label]) => ({ label, value })),
  ];
});

const regionOptions = computed(() => {
  const values = [...new Set(records.value.map((item) => item.region))].filter(Boolean);

  return [
    { label: "全部地區", value: "all" },
    ...values.map((value) => ({ label: value, value })),
  ];
});

const marketOptions = computed(() => {
  const values = [...new Set(records.value.map((item) => item.market))].filter(Boolean);

  return [
    { label: "全部市場", value: "all" },
    ...values.map((value) => ({ label: value, value })),
  ];
});

const productOptions = computed(() => {
  const values = new Set();

  records.value.forEach((item) => {
    (item.products ?? []).forEach((product) => values.add(product));
  });

  return [
    { label: "全部產品 / 方案", value: "all" },
    ...[...values].map((value) => ({ label: value, value })),
  ];
});

const partnerLevelOptions = computed(() => [
  { label: "全部夥伴等級", value: "all" },
  ...Object.entries(partnerLevelMap).map(([value, meta]) => ({
    label: meta.label,
    value,
  })),
]);

const cooperationStatusOptions = computed(() => [
  { label: "全部合作狀態", value: "all" },
  ...Object.entries(cooperationStatusMap).map(([value, meta]) => ({
    label: meta.label,
    value,
  })),
]);

const filteredRecords = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return overviewRecords.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.partnerName.toLowerCase().includes(keyword) ||
      item.partnerCode.toLowerCase().includes(keyword);

    const matchesPartner =
      filters.partnerId === "all" || item.partnerId === filters.partnerId;
    const matchesPartnerType =
      filters.partnerType === "all" || item.partnerType === filters.partnerType;
    const matchesEntity =
      filters.entityType === "all" || item.entityType === filters.entityType;
    const matchesCooperationMode =
      filters.cooperationMode === "all" ||
      item.cooperationMode === filters.cooperationMode;
    const matchesRegion = filters.region === "all" || item.region === filters.region;
    const matchesMarket = filters.market === "all" || item.market === filters.market;
    const matchesOwner = filters.ownerId === "all" || item.ownerId === filters.ownerId;
    const matchesProduct =
      filters.product === "all" || (item.products ?? []).includes(filters.product);
    const matchesLevel =
      filters.partnerLevel === "all" || item.partnerLevel === filters.partnerLevel;
    const matchesStatus =
      filters.cooperationStatus === "all" ||
      item.cooperationStatus === filters.cooperationStatus;

    return (
      matchesKeyword &&
      matchesPartner &&
      matchesPartnerType &&
      matchesEntity &&
      matchesCooperationMode &&
      matchesRegion &&
      matchesMarket &&
      matchesOwner &&
      matchesProduct &&
      matchesLevel &&
      matchesStatus
    );
  });
});

const sortedRecords = computed(() => {
  const list = [...filteredRecords.value];

  if (!sortState.prop || !sortState.order) {
    return list;
  }

  const direction = sortState.order === "ascending" ? 1 : -1;

  return list.sort((left, right) => {
    const leftValue = left[sortState.prop] ?? 0;
    const rightValue = right[sortState.prop] ?? 0;

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * direction;
    }

    return String(leftValue).localeCompare(String(rightValue), "zh-Hant") * direction;
  });
});

const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedRecords.value.slice(start, start + pageSize.value);
});

const summaryCards = computed(() => {
  const totalRelated = filteredRecords.value.reduce(
    (sum, item) => sum + item.relatedOpportunityCount,
    0
  );
  const totalWon = filteredRecords.value.reduce(
    (sum, item) => sum + item.wonOpportunityCount,
    0
  );

  const activePartners = filteredRecords.value.filter(
    (item) => item.interactionCount > 0 || item.relatedOpportunityCount > 0
  ).length;
  const newOpportunities = filteredRecords.value.reduce(
    (sum, item) => sum + item.newOpportunityCount,
    0
  );
  const wonOpportunities = totalWon;
  const periodRevenue = filteredRecords.value.reduce(
    (sum, item) => sum + item.periodRevenue,
    0
  );
  const averageConversionRate = totalRelated ? (totalWon / totalRelated) * 100 : 0;

  const attentionPartners = filteredRecords.value.filter(
    (item) =>
      ["low", "dormant"].includes(item.activityLevel) ||
      ["declining", "abnormal"].includes(item.trendStatus)
  ).length;

  return [
    { label: "活躍夥伴數", value: activePartners },
    { label: "本期新增商機數", value: newOpportunities },
    { label: "本期成交商機數", value: wonOpportunities },
    { label: "本期成交金額", value: periodRevenue, type: "currency" },
    { label: "平均轉換率", value: averageConversionRate, type: "percent" },
    { label: "待關注夥伴數", value: attentionPartners },
  ];
});

const aggregateTrendSeries = computed(() => {
  const [startDate, endDate] = range.value;
  const startMonthTime = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    1
  ).getTime();
  const endMonthTime = new Date(endDate.getFullYear(), endDate.getMonth(), 1).getTime();
  const monthMap = new Map();
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endCursor = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (cursor.getTime() <= endCursor.getTime()) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(
      2,
      "0"
    )}`;

    monthMap.set(key, {
      label: `${cursor.getFullYear()}/${String(cursor.getMonth() + 1).padStart(2, "0")}`,
      newCount: 0,
      wonCount: 0,
      relatedCount: 0,
      periodRevenue: 0,
      activePartnerCount: 0,
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  filteredRecords.value.forEach((record) => {
    (record.monthlyPerformance ?? []).forEach((monthRecord) => {
      const monthDate = new Date(monthRecord.month);

      if (
        Number.isNaN(monthDate.getTime()) ||
        monthDate.getTime() < startMonthTime ||
        monthDate.getTime() > endMonthTime
      ) {
        return;
      }

      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      const target = monthMap.get(key);

      if (!target) {
        return;
      }

      target.newCount += monthRecord.newCount ?? 0;
      target.wonCount += monthRecord.wonCount ?? 0;
      target.relatedCount += monthRecord.relatedCount ?? 0;
      target.periodRevenue += monthRecord.periodRevenue ?? 0;

      if ((monthRecord.relatedCount ?? 0) > 0 || (monthRecord.interactions ?? 0) > 0) {
        target.activePartnerCount += 1;
      }
    });
  });

  return [...monthMap.values()];
});

const revenueRankingOption = computed(() => {
  const topList = [...filteredRecords.value]
    .sort((left, right) => right.periodRevenue - left.periodRevenue)
    .slice(0, 10);

  if (topList.length === 0) {
    return null;
  }

  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter(params) {
        const target = Array.isArray(params) ? params[0] : params;
        return `${target.name}<br/>成交金額：${formatCurrency(target.value)}`;
      },
    },
    grid: { left: 12, right: 12, top: 18, bottom: 12, containLabel: true },
    xAxis: { type: "value" },
    yAxis: {
      type: "category",
      data: topList.map((item) => item.partnerName),
      inverse: true,
      axisLabel: {
        width: 120,
        overflow: "truncate",
      },
    },
    series: [
      {
        name: "成交金額",
        type: "bar",
        data: topList.map((item) => item.periodRevenue),
        itemStyle: { color: "#2563eb" },
        barWidth: 14,
      },
    ],
  };
});

const opportunityRankingOption = computed(() => {
  const topList = [...filteredRecords.value]
    .sort((left, right) => right.relatedOpportunityCount - left.relatedOpportunityCount)
    .slice(0, 10);

  if (topList.length === 0) {
    return null;
  }

  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
    },
    grid: { left: 12, right: 12, top: 18, bottom: 12, containLabel: true },
    xAxis: { type: "value" },
    yAxis: {
      type: "category",
      data: topList.map((item) => item.partnerName),
      inverse: true,
      axisLabel: {
        width: 120,
        overflow: "truncate",
      },
    },
    series: [
      {
        name: "商機數",
        type: "bar",
        data: topList.map((item) => item.relatedOpportunityCount),
        itemStyle: { color: "#10b981" },
        barWidth: 14,
      },
    ],
  };
});

const conversionRankingOption = computed(() => {
  const topList = [...filteredRecords.value]
    .filter((item) => item.relatedOpportunityCount > 0)
    .sort((left, right) => right.conversionRate - left.conversionRate)
    .slice(0, 10);

  if (topList.length === 0) {
    return null;
  }

  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter(params) {
        const target = Array.isArray(params) ? params[0] : params;
        return `${target.name}<br/>轉換率：${Number(target.value).toFixed(1)}%`;
      },
    },
    grid: { left: 12, right: 12, top: 18, bottom: 12, containLabel: true },
    xAxis: { type: "value", max: 100 },
    yAxis: {
      type: "category",
      data: topList.map((item) => item.partnerName),
      inverse: true,
      axisLabel: {
        width: 120,
        overflow: "truncate",
      },
    },
    series: [
      {
        name: "轉換率",
        type: "bar",
        data: topList.map((item) => Number(item.conversionRate.toFixed(2))),
        itemStyle: { color: "#f59e0b" },
        barWidth: 14,
      },
    ],
  };
});

const trendOption = computed(() => {
  if (aggregateTrendSeries.value.length === 0) {
    return null;
  }

  return {
    tooltip: { trigger: "axis" },
    legend: {
      top: 2,
      data: ["新增商機", "成交金額", "活躍夥伴數"],
    },
    grid: { left: 12, right: 12, top: 46, bottom: 12, containLabel: true },
    xAxis: {
      type: "category",
      data: aggregateTrendSeries.value.map((item) => item.label),
    },
    yAxis: [
      { type: "value", name: "商機 / 夥伴" },
      { type: "value", name: "成交金額" },
    ],
    series: [
      {
        name: "新增商機",
        type: "line",
        smooth: true,
        data: aggregateTrendSeries.value.map((item) => item.newCount),
        itemStyle: { color: "#2563eb" },
      },
      {
        name: "活躍夥伴數",
        type: "line",
        smooth: true,
        data: aggregateTrendSeries.value.map((item) => item.activePartnerCount),
        itemStyle: { color: "#10b981" },
      },
      {
        name: "成交金額",
        type: "bar",
        yAxisIndex: 1,
        data: aggregateTrendSeries.value.map((item) => item.periodRevenue),
        itemStyle: { color: "#f97316" },
        barMaxWidth: 24,
      },
    ],
  };
});

const distributionOption = computed(() => {
  if (filteredRecords.value.length === 0) {
    return null;
  }

  const dimensionMap = {
    partnerType: {
      field: "partnerType",
      label: "夥伴類型分布",
      formatter: (value) => partnerTypeMap[value]?.label ?? value,
    },
    region: {
      field: "region",
      label: "地區分布",
      formatter: (value) => value,
    },
    cooperationMode: {
      field: "cooperationMode",
      label: "合作模式分布",
      formatter: (value) => cooperationModeMap[value]?.label ?? value,
    },
  };

  const currentDimension = dimensionMap[distributionDimension.value];
  const summary = new Map();

  filteredRecords.value.forEach((item) => {
    const key = currentDimension.formatter(item[currentDimension.field]);
    summary.set(key, (summary.get(key) ?? 0) + item.periodRevenue);
  });

  const seriesData = [...summary.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value);

  return {
    tooltip: {
      trigger: "item",
      formatter: (item) =>
        `${item.name}<br/>${formatCurrency(item.value)} (${item.percent}%)`,
    },
    legend: {
      bottom: 0,
      type: "scroll",
    },
    series: [
      {
        type: "pie",
        radius: ["36%", "68%"],
        center: ["50%", "44%"],
        data: seriesData,
      },
    ],
  };
});

const emptyState = computed(() => {
  if (overviewRecords.value.length === 0) {
    return {
      title: "目前尚無通路績效資料",
      description: "待夥伴、商機與成交資料建立後，將於此顯示績效分析。",
    };
  }

  return {
    title: "沒有符合條件的績效資料",
    description: "請調整篩選條件或切換時間區間。",
  };
});

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

function getPartnerInitials(name) {
  if (!name) {
    return "?";
  }

  const cleaned = name.trim();
  if (cleaned.length <= 2) {
    return cleaned;
  }

  return cleaned.slice(0, 2);
}

function handleSortChange({ prop, order }) {
  sortState.prop = prop ?? "periodRevenue";
  sortState.order = order ?? "descending";
}

function resetFilters() {
  filters.keyword = "";
  filters.timePreset = "this_quarter";
  filters.customDateRange = [];
  filters.partnerId = "all";
  filters.partnerType = "all";
  filters.entityType = "all";
  filters.cooperationMode = "all";
  filters.region = "all";
  filters.market = "all";
  filters.ownerId = "all";
  filters.product = "all";
  filters.partnerLevel = "all";
  filters.cooperationStatus = "all";
  distributionDimension.value = "partnerType";
}

function openDetail(row) {
  const [startDate, endDate] = range.value;

  router.push({
    name: "partners-channel-performance-detail",
    params: { partnerId: row.partnerId },
    query: {
      preset: filters.timePreset,
      start: startDate.toISOString().slice(0, 10),
      end: endDate.toISOString().slice(0, 10),
    },
  });
}

function goPartner(row) {
  router.push({
    name: "partners-list",
    query: { partnerId: row.partnerId },
  });
}

function goOpportunities(row) {
  router.push({
    name: "opportunities-list",
    query: { partnerId: row.partnerId },
  });
}

function goTerms(row) {
  router.push({
    name: "partners-terms",
    query: { partnerId: row.partnerId },
  });
}

function goSettlement(row) {
  router.push({
    name: "partners-settlement",
    query: { partnerId: row.partnerId },
  });
}

function handleRowCommand(command, row) {
  if (command === "terms") {
    goTerms(row);
    return;
  }

  if (command === "settlement") {
    goSettlement(row);
  }
}

function exportReport() {
  ElNotification({
    title: "報表匯出",
    message: "已加入匯出佇列，完成後將提供下載。",
    type: "success",
    position: "top-right",
  });
}

async function refreshData() {
  loading.value = true;

  await new Promise((resolve) => {
    setTimeout(resolve, 300);
  });

  loading.value = false;

  ElNotification({
    title: "資料已更新",
    message: "通路績效已同步最新統計口徑。",
    type: "success",
    position: "top-right",
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

watch(
  () => [filteredRecords.value.length, pageSize.value],
  () => {
    const maxPage = Math.max(1, Math.ceil(filteredRecords.value.length / pageSize.value));

    if (currentPage.value > maxPage) {
      currentPage.value = maxPage;
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="min-h-full p-8">
    <section class="grid gap-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-1">
          <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">
            通路績效
          </h1>
          <p class="text-sm text-slate-500">集中查看夥伴商機、成交、活躍與合作成效表現</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton :icon="Download" @click="exportReport">匯出報表</ElButton>
          <ElButton :icon="Refresh" @click="refreshData">重新整理</ElButton>
          <ElButton :icon="Setting" @click="columnDrawerOpen = true">自訂欄位</ElButton>
        </div>
      </header>

      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div class="flex flex-wrap items-center gap-2">
            <ElInput
              v-model="filters.keyword"
              :prefix-icon="Search"
              placeholder="搜尋夥伴名稱 / 編號"
              clearable
              class="!w-[260px]"
            />

            <ElSelect v-model="filters.timePreset" class="!w-[160px]">
              <ElOption
                v-for="option in periodPresetOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </ElSelect>

            <ElInput
              v-if="filters.timePreset !== 'custom'"
              :model-value="rangeLabel"
              readonly
              class="!w-[220px]"
            />

            <ElDatePicker
              v-else
              v-model="filters.customDateRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              range-separator="至"
              start-placeholder="起"
              end-placeholder="迄"
              class="!w-[260px]"
            />
          </div>

          <div class="flex items-center gap-2">
            <ElButton
              :icon="Filter"
              :type="filterPanelOpen ? 'primary' : 'default'"
              @click="filterPanelOpen = !filterPanelOpen"
            >
              Filter
            </ElButton>

            <ElButton :icon="Refresh" @click="resetFilters">重設</ElButton>
          </div>
        </div>

        <transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="-translate-y-2 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="-translate-y-2 opacity-0"
        >
          <div
            v-if="filterPanelOpen"
            class="grid gap-3 border-t border-slate-200 bg-white px-6 py-4 md:grid-cols-4"
          >
            <ElSelect v-model="filters.partnerId" placeholder="夥伴">
              <ElOption
                v-for="item in partnerOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.partnerType" placeholder="夥伴類型">
              <ElOption
                v-for="item in partnerTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.entityType" placeholder="主體類型">
              <ElOption
                v-for="item in entityTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.cooperationMode" placeholder="合作模式">
              <ElOption
                v-for="item in cooperationModeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.region" placeholder="地區">
              <ElOption
                v-for="item in regionOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.market" placeholder="市場">
              <ElOption
                v-for="item in marketOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.ownerId" placeholder="負責人">
              <ElOption
                v-for="item in ownerOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.product" placeholder="產品 / 方案">
              <ElOption
                v-for="item in productOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.partnerLevel" placeholder="夥伴等級">
              <ElOption
                v-for="item in partnerLevelOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.cooperationStatus" placeholder="合作狀態">
              <ElOption
                v-for="item in cooperationStatusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </div>
        </transition>
      </section>

      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <article
          v-for="card in summaryCards"
          :key="card.label"
          class="rounded-2xl border border-slate-200 bg-white px-4 py-4"
        >
          <p class="text-xs text-slate-500">{{ card.label }}</p>
          <p class="mt-2 text-xl font-semibold text-slate-900">
            <span v-if="card.type === 'currency'">{{ formatCurrency(card.value) }}</span>
            <span v-else-if="card.type === 'percent'">{{
              formatPercent(card.value)
            }}</span>
            <span v-else>{{ card.value }}</span>
          </p>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <article class="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-900">夥伴成交金額排行（Top 10）</h3>
          <VChart
            v-if="revenueRankingOption"
            :option="revenueRankingOption"
            class="mt-2 w-full"
            style="height: 300px"
          />
          <ElEmpty v-else description="尚無可用資料" class="!py-10" />
        </article>

        <article class="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-900">夥伴商機數排行（Top 10）</h3>
          <VChart
            v-if="opportunityRankingOption"
            :option="opportunityRankingOption"
            class="mt-2 w-full"
            style="height: 300px"
          />
          <ElEmpty v-else description="尚無可用資料" class="!py-10" />
        </article>

        <article class="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-900">夥伴轉換率排行（Top 10）</h3>
          <VChart
            v-if="conversionRankingOption"
            :option="conversionRankingOption"
            class="mt-2 w-full"
            style="height: 300px"
          />
          <ElEmpty v-else description="尚無可用資料" class="!py-10" />
        </article>

        <article class="rounded-2xl border border-slate-200 bg-white p-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-sm font-semibold text-slate-900">分布視圖</h3>
            <ElSelect v-model="distributionDimension" class="!w-[180px]">
              <ElOption label="依夥伴類型" value="partnerType" />
              <ElOption label="依地區" value="region" />
              <ElOption label="依合作模式" value="cooperationMode" />
            </ElSelect>
          </div>
          <VChart
            v-if="distributionOption"
            :option="distributionOption"
            class="mt-2 w-full"
            style="height: 300px"
          />
          <ElEmpty v-else description="尚無可用資料" class="!py-10" />
        </article>

        <article class="rounded-2xl border border-slate-200 bg-white p-4 xl:col-span-2">
          <h3 class="text-sm font-semibold text-slate-900">
            趨勢分析（商機 / 成交 / 活躍）
          </h3>
          <VChart
            v-if="trendOption"
            :option="trendOption"
            class="mt-2 w-full"
            style="height: 320px"
          />
          <ElEmpty v-else description="尚無可用資料" class="!py-12" />
        </article>
      </section>

      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div class="flex flex-wrap items-center gap-2">
            <ElTag round effect="plain">分析期間：{{ rangeLabel }}</ElTag>
            <ElTag round effect="plain">共 {{ filteredRecords.length }} 筆</ElTag>
          </div>
        </div>

        <ElTable
          :data="pagedRecords"
          size="large"
          table-layout="auto"
          :loading="loading"
          @sort-change="handleSortChange"
        >
          <ElTableColumn label="夥伴" min-width="240">
            <template #default="{ row }">
              <div class="flex items-center gap-3">
                <div class="grid gap-0.5">
                  <button
                    type="button"
                    class="text-left text-sm font-semibold text-slate-900 hover:text-[#409eff]"
                    @click="openDetail(row)"
                  >
                    {{ row.partnerName }}
                  </button>
                  <span class="text-xs text-slate-400">
                    {{ row.partnerCode }} ・ {{ entityTypeMap[row.entityType]?.label }}
                  </span>
                </div>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn v-if="tableColumns.partnerType" label="夥伴類型" min-width="124">
            <template #default="{ row }">
              <ElTag round effect="light" :type="partnerTypeMap[row.partnerType]?.type">
                {{ partnerTypeMap[row.partnerType]?.label }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn
            v-if="tableColumns.cooperationStatus"
            label="合作狀態"
            min-width="116"
          >
            <template #default="{ row }">
              <ElTag
                round
                effect="light"
                :type="cooperationStatusMap[row.cooperationStatus]?.type"
              >
                {{ cooperationStatusMap[row.cooperationStatus]?.label }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn
            v-if="tableColumns.owner"
            label="負責人"
            min-width="98"
            prop="ownerName"
            sortable="custom"
          />

          <ElTableColumn
            v-if="tableColumns.related"
            label="關聯商機數"
            min-width="112"
            prop="relatedOpportunityCount"
            sortable="custom"
          />

          <ElTableColumn
            v-if="tableColumns.won"
            label="成交商機數"
            min-width="112"
            prop="wonOpportunityCount"
            sortable="custom"
          />

          <ElTableColumn
            v-if="tableColumns.conversion"
            label="轉換率"
            min-width="92"
            prop="conversionRate"
            sortable="custom"
          >
            <template #default="{ row }">
              <span
                class="text-xs font-medium"
                :class="
                  row.conversionRate >= 30
                    ? 'text-emerald-600'
                    : row.conversionRate >= 15
                    ? 'text-amber-600'
                    : 'text-rose-600'
                "
              >
                {{ formatPercent(row.conversionRate) }}
              </span>
            </template>
          </ElTableColumn>

          <ElTableColumn
            v-if="tableColumns.periodRevenue"
            label="本期成交金額"
            min-width="136"
            prop="periodRevenue"
            sortable="custom"
          >
            <template #default="{ row }">
              <span class="text-xs text-slate-700">{{
                formatCurrency(row.periodRevenue)
              }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn
            v-if="tableColumns.totalRevenue"
            label="累計成交金額"
            min-width="136"
            prop="totalRevenue"
            sortable="custom"
          >
            <template #default="{ row }">
              <span class="text-xs text-slate-700">{{
                formatCurrency(row.totalRevenue)
              }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn
            v-if="tableColumns.averageDeal"
            label="平均客單價"
            min-width="128"
            prop="averageDealSize"
            sortable="custom"
          >
            <template #default="{ row }">
              <span class="text-xs text-slate-700">{{
                formatCurrency(row.averageDealSize)
              }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn v-if="tableColumns.interaction" label="最近互動" min-width="170">
            <template #default="{ row }">
              <div class="grid gap-0.5">
                <span class="text-xs text-slate-700">{{
                  formatDate(row.lastInteractionAt)
                }}</span>
                <span class="text-xs text-slate-400">{{
                  row.lastInteractionSummary
                }}</span>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn v-if="tableColumns.activityLevel" label="活躍度" min-width="92">
            <template #default="{ row }">
              <ElTag
                round
                :type="activityLevelMap[row.activityLevel]?.type"
                effect="light"
              >
                {{ activityLevelMap[row.activityLevel]?.label }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn v-if="tableColumns.trend" label="趨勢狀態" min-width="108">
            <template #default="{ row }">
              <ElTag round :type="trendStatusMap[row.trendStatus]?.type" effect="light">
                {{ trendStatusMap[row.trendStatus]?.label }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="操作" fixed="right" width="254">
            <template #default="{ row }">
              <div class="flex items-center justify-end gap-1">
                <ElButton text type="primary" @click="openDetail(row)">查看詳情</ElButton>
                <ElButton text @click="goPartner(row)">查看夥伴</ElButton>
                <ElButton text @click="goOpportunities(row)">查看商機</ElButton>
                <ElDropdown
                  trigger="click"
                  @command="(command) => handleRowCommand(command, row)"
                >
                  <button
                    type="button"
                    class="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <MoreFilled class="h-4 w-4" />
                  </button>

                  <template #dropdown>
                    <ElDropdownMenu>
                      <ElDropdownItem command="terms">查看合作條件</ElDropdownItem>
                      <ElDropdownItem command="settlement">查看分潤管理</ElDropdownItem>
                    </ElDropdownMenu>
                  </template>
                </ElDropdown>
              </div>
            </template>
          </ElTableColumn>

          <template #empty>
            <div class="px-6 py-16">
              <ElEmpty :description="emptyState.title">
                <p class="mb-4 text-sm text-slate-500">{{ emptyState.description }}</p>
                <ElButton type="primary" @click="resetFilters">重設篩選條件</ElButton>
              </ElEmpty>
            </div>
          </template>
        </ElTable>

        <div
          class="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-5"
        >
          <ElPagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            layout="total, prev, pager, next"
            :total="sortedRecords.length"
            background
          />

          <ElSelect v-model="pageSize" class="!w-[110px]" @change="currentPage = 1">
            <ElOption :value="10" label="10 Item" />
            <ElOption :value="20" label="20 Item" />
            <ElOption :value="50" label="50 Item" />
          </ElSelect>
        </div>
      </section>
    </section>

    <ElDrawer v-model="columnDrawerOpen" title="自訂欄位" size="420px" destroy-on-close>
      <div class="grid gap-3">
        <label
          v-for="item in [
            { key: 'partnerType', label: '夥伴類型' },
            { key: 'cooperationStatus', label: '合作狀態' },
            { key: 'owner', label: '負責人' },
            { key: 'related', label: '關聯商機數' },
            { key: 'won', label: '成交商機數' },
            { key: 'conversion', label: '轉換率' },
            { key: 'periodRevenue', label: '本期成交金額' },
            { key: 'totalRevenue', label: '累計成交金額' },
            { key: 'averageDeal', label: '平均客單價' },
            { key: 'interaction', label: '最近互動' },
            { key: 'activityLevel', label: '活躍度' },
            { key: 'trend', label: '趨勢狀態' },
          ]"
          :key="item.key"
          class="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
        >
          <span class="text-sm text-slate-700">{{ item.label }}</span>
          <ElCheckbox v-model="tableColumns[item.key]" />
        </label>
      </div>
    </ElDrawer>
  </div>
</template>
