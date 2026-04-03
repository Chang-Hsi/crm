<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import VChart from "vue-echarts";
import { use } from "echarts/core";
import { BarChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import {
  ElButton,
  ElDatePicker,
  ElEmpty,
  ElInput,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";
import { ArrowLeft, DataAnalysis, Filter, Refresh, Search } from "@element-plus/icons-vue";
import OpportunityFormDrawer from "../../components/opportunities/OpportunityFormDrawer.vue";
import { useAccountsStore } from "../../composables/useAccountsStore";
import { useOpportunitiesStore } from "../../composables/useOpportunitiesStore";
import { useUsersStore } from "../../composables/useUsersStore";
import { opportunityStageMap } from "../../constants/accountMaps";
import {
  opportunityStageOptions,
  opportunityTypeOptions,
  regionOptions,
} from "../../data/opportunities";

use([
  BarChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
]);

const router = useRouter();
const { accounts } = useAccountsStore();
const { opportunities, updateOpportunity } = useOpportunitiesStore();
const { getAssignableOwners } = useUsersStore();

const formDrawerOpen = ref(false);
const editingOpportunity = ref(null);
const filterPanelOpen = ref(false);

const filters = reactive({
  keyword: "",
  timePreset: "current_month",
  customDateRange: [],
  ownerUserId: "all",
  opportunityType: "all",
  region: "all",
  accountId: "all",
  stage: "all",
});

const timePresetOptions = [
  { label: "本月", value: "current_month" },
  { label: "下月", value: "next_month" },
  { label: "本季", value: "current_quarter" },
  { label: "自訂", value: "custom" },
];

const ownerOptions = computed(() => [
  { label: "全部負責業務", value: "all" },
  ...getAssignableOwners("opportunity").map((user) => ({
    label: user.name,
    value: user.id,
  })),
]);

const accountOptions = computed(() => [
  { label: "全部客戶", value: "all" },
  ...accounts.value.map((account) => ({
    label: account.companyName,
    value: account.id,
  })),
]);

const activeOpportunities = computed(() =>
  opportunities.value.filter((item) => item.status === "active")
);

const filteredForecastOpportunities = computed(() => {
  const [startDate, endDate] = resolveDateRange(
    filters.timePreset,
    filters.customDateRange
  );
  const startTime = startDate ? new Date(startDate).getTime() : null;
  const endTime = endDate ? new Date(endDate).getTime() : null;
  const keyword = filters.keyword.trim().toLowerCase();

  return activeOpportunities.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.name.toLowerCase().includes(keyword) ||
      item.opportunityCode.toLowerCase().includes(keyword) ||
      item.accountName.toLowerCase().includes(keyword);
    const closeTime = new Date(item.expectedCloseDate).getTime();
    const matchesDate =
      !startTime || !endTime || (closeTime >= startTime && closeTime <= endTime);
    const matchesOwner =
      filters.ownerUserId === "all" || item.ownerUserId === filters.ownerUserId;
    const matchesType =
      filters.opportunityType === "all" ||
      item.opportunityType === filters.opportunityType;
    const matchesRegion = filters.region === "all" || item.region === filters.region;
    const matchesAccount =
      filters.accountId === "all" || item.accountId === filters.accountId;
    const matchesStage = filters.stage === "all" || item.stage === filters.stage;

    return (
      matchesKeyword &&
      matchesDate &&
      matchesOwner &&
      matchesType &&
      matchesRegion &&
      matchesAccount &&
      matchesStage
    );
  });
});

const summaryCards = computed(() => {
  const currentMonthRange = resolveDateRange("current_month");
  const currentMonthStart = currentMonthRange[0]
    ? new Date(currentMonthRange[0]).getTime()
    : null;
  const currentMonthEnd = currentMonthRange[1]
    ? new Date(currentMonthRange[1]).getTime()
    : null;

  const monthlyRecords = filteredForecastOpportunities.value.filter((item) => {
    const closeTime = new Date(item.expectedCloseDate).getTime();
    return (
      currentMonthStart !== null &&
      currentMonthEnd !== null &&
      closeTime >= currentMonthStart &&
      closeTime <= currentMonthEnd
    );
  });

  return [
    { label: "全部進行中商機數", value: filteredForecastOpportunities.value.length },
    {
      label: "總 Pipeline 金額",
      value: filteredForecastOpportunities.value.reduce(
        (total, item) => total + (item.expectedRevenue ?? 0),
        0
      ),
      currency: true,
    },
    {
      label: "加權 Forecast 金額",
      value: filteredForecastOpportunities.value.reduce(
        (total, item) => total + getWeightedRevenue(item),
        0
      ),
      currency: true,
    },
    {
      label: "本月預計成交金額",
      value: monthlyRecords.reduce(
        (total, item) => total + (item.expectedRevenue ?? 0),
        0
      ),
      currency: true,
    },
  ];
});

const monthlyBreakdown = computed(() => {
  const monthMap = new Map();

  filteredForecastOpportunities.value.forEach((item) => {
    const date = new Date(item.expectedCloseDate);
    const key = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}`;
    const current = monthMap.get(key) ?? {
      key,
      count: 0,
      pipelineAmount: 0,
      weightedAmount: 0,
    };

    current.count += 1;
    current.pipelineAmount += item.expectedRevenue ?? 0;
    current.weightedAmount += getWeightedRevenue(item);
    monthMap.set(key, current);
  });

  return [...monthMap.values()].sort((left, right) => left.key.localeCompare(right.key));
});

const ownerBreakdown = computed(() => {
  const ownerMap = new Map();

  filteredForecastOpportunities.value.forEach((item) => {
    const key = item.ownerUserId;
    const current = ownerMap.get(key) ?? {
      key,
      label: item.ownerName,
      count: 0,
      pipelineAmount: 0,
      weightedAmount: 0,
    };

    current.count += 1;
    current.pipelineAmount += item.expectedRevenue ?? 0;
    current.weightedAmount += getWeightedRevenue(item);
    ownerMap.set(key, current);
  });

  return [...ownerMap.values()].sort(
    (left, right) => right.weightedAmount - left.weightedAmount
  );
});

const monthlyChartOption = computed(() => {
  if (monthlyBreakdown.value.length === 0) {
    return null;
  }

  return {
    title: {
      text: "依月份 Forecast",
      left: 0,
      top: 0,
      textStyle: {
        fontSize: 14,
        fontWeight: 600,
        color: "#0f172a",
      },
    },
    legend: {
      top: 26,
      left: 0,
      data: ["原始金額", "加權金額"],
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter(params) {
        const point = Array.isArray(params) ? params[0] : params;
        const item = monthlyBreakdown.value[point.dataIndex];

        return [
          `<div style="font-weight:600;margin-bottom:6px;">${item.key}</div>`,
          `<div>商機數：${item.count} 筆</div>`,
          `<div>原始金額：${formatCurrency(item.pipelineAmount)}</div>`,
          `<div>加權金額：${formatCurrency(item.weightedAmount)}</div>`,
        ].join("");
      },
    },
    grid: {
      left: 20,
      right: 16,
      top: 72,
      bottom: 12,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: monthlyBreakdown.value.map((item) => item.key),
      axisTick: { alignWithLabel: true },
    },
    yAxis: {
      type: "value",
    },
    series: [
      {
        name: "原始金額",
        type: "bar",
        data: monthlyBreakdown.value.map((item) => item.pipelineAmount),
        itemStyle: { color: "#60a5fa" },
        barMaxWidth: 32,
      },
      {
        name: "加權金額",
        type: "bar",
        data: monthlyBreakdown.value.map((item) => item.weightedAmount),
        itemStyle: { color: "#2563eb" },
        barMaxWidth: 32,
      },
    ],
  };
});

const ownerChartOption = computed(() => {
  if (ownerBreakdown.value.length === 0) {
    return null;
  }

  const sorted = [...ownerBreakdown.value].reverse();

  return {
    title: {
      text: "依負責業務 Forecast",
      left: 0,
      top: 0,
      textStyle: {
        fontSize: 14,
        fontWeight: 600,
        color: "#0f172a",
      },
    },
    legend: {
      top: 26,
      left: 0,
      data: ["原始金額", "加權金額"],
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter(params) {
        const point = Array.isArray(params) ? params[0] : params;
        const item = sorted[point.dataIndex];

        return [
          `<div style="font-weight:600;margin-bottom:6px;">${item.label}</div>`,
          `<div>商機數：${item.count} 筆</div>`,
          `<div>原始金額：${formatCurrency(item.pipelineAmount)}</div>`,
          `<div>加權金額：${formatCurrency(item.weightedAmount)}</div>`,
        ].join("");
      },
    },
    grid: {
      left: 24,
      right: 16,
      top: 72,
      bottom: 12,
      containLabel: true,
    },
    xAxis: {
      type: "value",
    },
    yAxis: {
      type: "category",
      data: sorted.map((item) => item.label),
    },
    series: [
      {
        name: "原始金額",
        type: "bar",
        data: sorted.map((item) => item.pipelineAmount),
        itemStyle: { color: "#93c5fd" },
        barMaxWidth: 24,
      },
      {
        name: "加權金額",
        type: "bar",
        data: sorted.map((item) => item.weightedAmount),
        itemStyle: { color: "#1d4ed8" },
        barMaxWidth: 24,
      },
    ],
  };
});

function resolveDateRange(timePreset, customRange = []) {
  const now = new Date();
  const startOfDay = (date) => {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next.getTime();
  };
  const endOfDay = (date) => {
    const next = new Date(date);
    next.setHours(23, 59, 59, 999);
    return next.getTime();
  };

  if (timePreset === "custom") {
    const [start, end] = customRange ?? [];
    return [start ? startOfDay(start) : null, end ? endOfDay(end) : null];
  }

  if (timePreset === "next_month") {
    const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return [startOfDay(start), endOfDay(end)];
  }

  if (timePreset === "current_quarter") {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), quarterStartMonth, 1);
    const end = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
    return [startOfDay(start), endOfDay(end)];
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return [startOfDay(start), endOfDay(end)];
}

function getWeightedRevenue(opportunity) {
  return Math.round(
    (opportunity.expectedRevenue ?? 0) * ((opportunity.probability ?? 0) / 100)
  );
}

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

function getRiskState(opportunity) {
  const closeTime = new Date(opportunity.expectedCloseDate).getTime();
  const now = Date.now();
  const diffDays = Math.floor((closeTime - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: "已逾期", type: "danger" };
  }

  if (
    diffDays <= 7 &&
    ["potential", "contacted", "qualified"].includes(opportunity.stage)
  ) {
    return { label: "進度風險", type: "warning" };
  }

  if (opportunity.expectedRevenue >= 3000000 && opportunity.probability <= 35) {
    return { label: "高額低機率", type: "danger" };
  }

  return null;
}

function resetFilters() {
  filters.keyword = "";
  filters.timePreset = "current_month";
  filters.customDateRange = [];
  filters.ownerUserId = "all";
  filters.opportunityType = "all";
  filters.region = "all";
  filters.accountId = "all";
  filters.stage = "all";
}

function toggleFilterPanel() {
  filterPanelOpen.value = !filterPanelOpen.value;
}

function jumpToOpportunity(opportunity) {
  router.push({
    name: "opportunity-detail",
    params: { opportunityId: opportunity.id },
  });
}

function jumpToAccount(opportunity) {
  router.push({
    name: "account-detail",
    params: { accountId: opportunity.accountId },
  });
}

function openEditDrawer(opportunity) {
  editingOpportunity.value = opportunity;
  formDrawerOpen.value = true;
}

function handleSubmitOpportunity(payload) {
  if (!editingOpportunity.value) {
    return;
  }

  const updatedOpportunity = updateOpportunity(editingOpportunity.value.id, payload);

  if (!updatedOpportunity) {
    return;
  }

  formDrawerOpen.value = false;
}

watch(
  () => filters.timePreset,
  (nextPreset) => {
    if (nextPreset !== "custom") {
      filters.customDateRange = [];
    }
  }
);
</script>

<template>
  <div class="min-h-full p-8">
    <section class="grid gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-2">
          <h1 class="text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-900">
            Forecast
          </h1>
          <p class="text-sm text-slate-500">依機率與預計成交日查看商機預估結果。</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton
            :icon="DataAnalysis"
            @click="router.push({ name: 'opportunities-pipeline' })"
          >
            前往 Pipeline
          </ElButton>
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-4">
        <section
          v-for="card in summaryCards"
          :key="card.label"
          class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div class="grid gap-2">
            <p class="text-sm font-medium text-slate-500">{{ card.label }}</p>
            <p class="text-[2rem] font-semibold tracking-[-0.04em] text-slate-900">
              {{ card.currency ? formatCurrency(card.value) : card.value }}
            </p>
          </div>
        </section>
      </div>

      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div
          class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5"
        >
          <div class="flex flex-1 flex-wrap items-center justify-end gap-3">
            <ElInput
              v-model="filters.keyword"
              placeholder="搜尋商機名稱 / 商機代碼 / 客戶名稱"
              :prefix-icon="Search"
              clearable
              class="!w-[340px] max-[760px]:!w-full"
            />

            <ElButton
              :icon="Filter"
              :type="filterPanelOpen ? 'primary' : 'default'"
              @click="toggleFilterPanel"
            >
              Filter
            </ElButton>
          </div>
        </div>

        <transition
          enter-active-class="transition-all duration-300 ease-out"
          leave-active-class="transition-all duration-200 ease-in"
          enter-from-class="max-h-0 opacity-0"
          enter-to-class="max-h-80 opacity-100"
          leave-from-class="max-h-80 opacity-100"
          leave-to-class="max-h-0 opacity-0"
        >
          <div
            v-if="filterPanelOpen"
            class="overflow-hidden border-b border-slate-200 bg-white px-6 py-4"
          >
            <div
              class="grid gap-4 xl:grid-cols-[160px_minmax(220px,1.2fr)_repeat(5,minmax(140px,1fr))_auto]"
            >
              <ElSelect v-model="filters.timePreset">
                <ElOption
                  v-for="item in timePresetOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElDatePicker
                v-if="filters.timePreset === 'custom'"
                v-model="filters.customDateRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                range-separator="至"
                start-placeholder="開始日期"
                end-placeholder="結束日期"
                class="!w-full"
              />
              <div
                v-else
                class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500"
              >
                依預計成交日計算
              </div>

              <ElSelect v-model="filters.ownerUserId">
                <ElOption
                  v-for="item in ownerOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.opportunityType">
                <ElOption
                  v-for="item in opportunityTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.region">
                <ElOption
                  v-for="item in regionOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.accountId" filterable>
                <ElOption
                  v-for="item in accountOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.stage">
                <ElOption label="全部階段" value="all" />
                <ElOption
                  v-for="item in opportunityStageOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElButton :icon="Refresh" @click="resetFilters">重設</ElButton>
            </div>
          </div>
        </transition>
      </section>

      <ElEmpty
        v-if="activeOpportunities.length === 0"
        description="尚無 Forecast 資料"
        class="rounded-2xl border border-slate-200 bg-white py-20"
      >
        <p class="mb-3 text-sm text-slate-500">
          建立商機後，系統即可依預計成交日與機率顯示預測結果。
        </p>
        <ElButton type="primary" @click="router.push({ name: 'opportunities-list' })">
          前往商機列表
        </ElButton>
      </ElEmpty>

      <ElEmpty
        v-else-if="filteredForecastOpportunities.length === 0"
        description="找不到符合條件的預測商機"
        class="rounded-2xl border border-slate-200 bg-white py-20"
      >
        <p class="mb-3 text-sm text-slate-500">請調整篩選條件或重設。</p>
        <ElButton type="primary" @click="resetFilters">重設篩選</ElButton>
      </ElEmpty>

      <template v-else>
        <section class="grid gap-4 xl:grid-cols-2">
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="mb-4">
              <h2 class="text-base font-semibold text-slate-900">依月份 Forecast</h2>
              <p class="mt-1 text-sm text-slate-500">
                依預計成交月份查看原始金額與加權金額分布。
              </p>
            </div>

            <ElEmpty
              v-if="!monthlyChartOption"
              description="目前沒有可顯示的 Forecast 圖表資料"
              class="h-[340px] rounded-2xl border border-dashed border-slate-200 bg-slate-50"
            />
            <div v-else class="h-[340px]">
              <VChart :option="monthlyChartOption" autoresize class="h-full w-full" />
            </div>
          </section>

          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="mb-4">
              <h2 class="text-base font-semibold text-slate-900">依負責業務 Forecast</h2>
              <p class="mt-1 text-sm text-slate-500">
                依負責業務查看商機數、原始金額與加權金額分布。
              </p>
            </div>

            <ElEmpty
              v-if="!ownerChartOption"
              description="目前沒有可顯示的 Forecast 圖表資料"
              class="h-[340px] rounded-2xl border border-dashed border-slate-200 bg-slate-50"
            />
            <div v-else class="h-[340px]">
              <VChart :option="ownerChartOption" autoresize class="h-full w-full" />
            </div>
          </section>
        </section>

        <section
          class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div
            class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4"
          >
            <div class="grid gap-1">
              <h2 class="text-base font-semibold text-slate-900">
                Forecast Opportunity Table
              </h2>
              <p class="text-sm text-slate-500">
                保留追溯到單筆商機的能力，方便驗證預測結果。
              </p>
            </div>

            <ElTag round effect="plain"
              >共 {{ filteredForecastOpportunities.length }} 筆</ElTag
            >
          </div>

          <ElTable :data="filteredForecastOpportunities" size="large" table-layout="auto">
            <ElTableColumn label="商機名稱" min-width="220">
              <template #default="{ row }">
                <button
                  type="button"
                  class="text-left text-sm font-semibold text-slate-900 hover:text-[#409eff]"
                  @click="jumpToOpportunity(row)"
                >
                  {{ row.name }}
                </button>
              </template>
            </ElTableColumn>

            <ElTableColumn label="客戶" min-width="180">
              <template #default="{ row }">
                <button
                  type="button"
                  class="text-left text-sm font-medium text-[#409eff] hover:text-[#337ecc]"
                  @click="jumpToAccount(row)"
                >
                  {{ row.accountName }}
                </button>
              </template>
            </ElTableColumn>

            <ElTableColumn label="階段" min-width="120">
              <template #default="{ row }">
                <ElTag
                  round
                  effect="light"
                  :type="opportunityStageMap[row.stage]?.type ?? 'info'"
                >
                  {{ opportunityStageMap[row.stage]?.label ?? row.stage }}
                </ElTag>
              </template>
            </ElTableColumn>

            <ElTableColumn label="機率" min-width="90">
              <template #default="{ row }">{{ row.probability }}%</template>
            </ElTableColumn>

            <ElTableColumn label="原始金額" min-width="140">
              <template #default="{ row }">
                {{ formatCurrency(row.expectedRevenue) }}
              </template>
            </ElTableColumn>

            <ElTableColumn label="加權金額" min-width="140">
              <template #default="{ row }">
                {{ formatCurrency(getWeightedRevenue(row)) }}
              </template>
            </ElTableColumn>

            <ElTableColumn label="預計成交日" min-width="140">
              <template #default="{ row }">
                {{ formatDate(row.expectedCloseDate) }}
              </template>
            </ElTableColumn>

            <ElTableColumn label="負責人" min-width="120" prop="ownerName" />

            <ElTableColumn label="風險" min-width="120">
              <template #default="{ row }">
                <ElTag
                  v-if="getRiskState(row)"
                  round
                  effect="light"
                  :type="getRiskState(row)?.type"
                >
                  {{ getRiskState(row)?.label }}
                </ElTag>
                <span v-else class="text-sm text-slate-400">-</span>
              </template>
            </ElTableColumn>

            <ElTableColumn label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <div class="flex items-center justify-end gap-1">
                  <ElButton text type="primary" @click="jumpToOpportunity(row)"
                    >查看詳情</ElButton
                  >
                  <ElButton text @click="openEditDrawer(row)">編輯</ElButton>
                </div>
              </template>
            </ElTableColumn>
          </ElTable>
        </section>
      </template>
    </section>

    <OpportunityFormDrawer
      v-model="formDrawerOpen"
      mode="edit"
      :opportunity="editingOpportunity"
      @submit="handleSubmitOpportunity"
    />
  </div>
</template>
