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
  DataZoomComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import {
  ElButton,
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
} from "element-plus";
import { Download, Filter, Refresh, Search } from "@element-plus/icons-vue";
import {
  opportunityList,
  opportunityStageOptions,
  opportunityTypeOptions,
  regionOptions,
} from "../../data/opportunities";
import { userList } from "../../data/users";
import { useOpportunitiesStore } from "../../composables/useOpportunitiesStore";

use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

const router = useRouter();
const { opportunities } = useOpportunitiesStore();

const loading = ref(false);
const filterPanelOpen = ref(false);
const detailTab = ref("high_amount");
const currentPage = ref(1);
const pageSize = ref(10);

const nowTs = Date.now();
const dayMs = 24 * 60 * 60 * 1000;

const stageOrder = [
  "potential",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

const activeStageOrder = [
  "potential",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
];

const stageTagTypeMap = {
  potential: "info",
  contacted: "warning",
  qualified: "warning",
  proposal: "primary",
  negotiation: "primary",
  won: "success",
  lost: "danger",
};

const typeTagMap = {
  agency: "warning",
  license: "primary",
  co_branding: "success",
  channel: "info",
};

const probabilityTagType = {
  high: "success",
  medium: "warning",
  low: "info",
};

const yesNoOptions = [
  { value: "all", label: "全部" },
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
];

const amountBucketOptions = [
  { value: "all", label: "全部金額" },
  { value: "small", label: "50 萬以下" },
  { value: "medium", label: "50 萬 - 200 萬" },
  { value: "large", label: "200 萬 - 500 萬" },
  { value: "xlarge", label: "500 萬以上" },
];

const ownerDirectory = new Map(userList.map((user) => [user.id, user]));

const ownerOptions = [
  { value: "all", label: "全部負責人" },
  ...userList
    .filter(
      (item) => item.status === "active" && item.department === "Business Development"
    )
    .map((item) => ({ value: item.id, label: item.name })),
];

const departmentOptions = [
  { value: "all", label: "全部部門" },
  ...[
    ...new Set(
      userList.filter((item) => item.status === "active").map((item) => item.department)
    ),
  ]
    .sort((a, b) => a.localeCompare(b, "zh-Hant"))
    .map((item) => ({ value: item, label: item })),
];

const filters = reactive({
  keyword: "",
  dateRange: [],
  stage: "all",
  opportunityType: "all",
  product: "all",
  region: "all",
  ownerUserId: "all",
  department: "all",
  amountBucket: "all",
  expectedCloseRange: [],
  isHighRisk: "all",
  isStalled: "all",
  isClosingSoon: "all",
});

const drillState = reactive({
  lostReason: "",
});

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toTimestamp(value) {
  const date = parseDate(value);
  return date ? date.getTime() : 0;
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDelta(current, previous, asPercent = false) {
  if (previous === null || previous === undefined) {
    return "-";
  }

  const currentNumber = Number(current || 0);
  const previousNumber = Number(previous || 0);
  const diff = currentNumber - previousNumber;

  if (asPercent) {
    return `較前期 ${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
  }

  if (previousNumber === 0) {
    return `較前期 ${diff >= 0 ? "+" : ""}${diff}`;
  }

  const ratio = (diff / Math.abs(previousNumber)) * 100;
  return `較前期 ${diff >= 0 ? "+" : ""}${diff} (${ratio >= 0 ? "+" : ""}${ratio.toFixed(
    1
  )}%)`;
}

function toCountMap(records, key) {
  return records.reduce((map, item) => {
    const value = item[key] || "unknown";
    map[value] = (map[value] || 0) + 1;
    return map;
  }, {});
}

function quantile(values, ratio) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const pos = Math.floor((sorted.length - 1) * ratio);
  return sorted[pos];
}

function monthStartTs(year, month) {
  return new Date(year, month, 1).getTime();
}

function monthEndTs(year, month) {
  return new Date(year, month + 1, 1).getTime() - 1;
}

function getRecentMonths(length = 6) {
  const now = new Date(nowTs);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const rows = [];

  for (let i = length - 1; i >= 0; i -= 1) {
    const date = new Date(currentYear, currentMonth - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth();

    rows.push({
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: `${year}/${String(month + 1).padStart(2, "0")}`,
      start: monthStartTs(year, month),
      end: monthEndTs(year, month),
    });
  }

  return rows;
}

function getFutureMonths(length = 6) {
  const now = new Date(nowTs);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const rows = [];

  for (let i = 0; i < length; i += 1) {
    const date = new Date(currentYear, currentMonth + i, 1);
    const year = date.getFullYear();
    const month = date.getMonth();

    rows.push({
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: `${year}/${String(month + 1).padStart(2, "0")}`,
      start: monthStartTs(year, month),
      end: monthEndTs(year, month),
    });
  }

  return rows;
}

function getStageLabel(stage) {
  return opportunityStageOptions.find((item) => item.value === stage)?.label || stage;
}

function getTypeLabel(type) {
  return opportunityTypeOptions.find((item) => item.value === type)?.label || type;
}

function getAmountBucket(value) {
  const amount = Number(value || 0);

  if (amount < 500000) {
    return "small";
  }

  if (amount < 2000000) {
    return "medium";
  }

  if (amount < 5000000) {
    return "large";
  }

  return "xlarge";
}

function inferProductName(name) {
  const text = String(name || "");

  if (text.includes("授權") || text.includes("發行")) {
    return "授權發行方案";
  }

  if (text.includes("支付") || text.includes("儲值")) {
    return "支付整合方案";
  }

  if (text.includes("導流") || text.includes("會員")) {
    return "會員導流方案";
  }

  if (text.includes("品牌") || text.includes("聯名")) {
    return "品牌聯名方案";
  }

  if (text.includes("展會") || text.includes("參展")) {
    return "展會合作方案";
  }

  return "通路合作方案";
}

function inferLostReason(record) {
  if (record.stage !== "lost") {
    return "";
  }

  if (record.lostReason) {
    return record.lostReason;
  }

  if (record.opportunityType === "license") {
    return "授權條件未達共識";
  }

  if (record.opportunityType === "agency") {
    return "競品方案更有優勢";
  }

  if (record.opportunityType === "co_branding") {
    return "品牌檔期未能匹配";
  }

  return "客戶決定暫停合作";
}

function getStageEnteredAt(record) {
  const history = Array.isArray(record.stageHistory) ? record.stageHistory : [];
  const hit = history.find((line) => line.stage === record.stage);
  return hit?.timestamp || record.updatedAt || record.createdAt || "";
}

function buildRiskSignals(record) {
  const signs = [];

  if (record.status !== "active") {
    return signs;
  }

  if (record.isOverdueClose) {
    signs.push("預計成交日已逾期");
  }

  if (record.isStalled) {
    signs.push("超過 21 天未更新");
  }

  if (["proposal", "negotiation"].includes(record.stage) && record.daysInStage > 30) {
    signs.push("後段階段停留過久");
  }

  if (
    record.expectedRevenue >= 3000000 &&
    ["potential", "contacted"].includes(record.stage)
  ) {
    signs.push("高金額仍在前段");
  }

  if (record.isClosingSoon && record.probability >= 70 && record.daysSinceUpdate > 7) {
    signs.push("即將成交但近期未推進");
  }

  return signs;
}

const productOptionList = computed(() => {
  const pool = opportunities.value.length > 0 ? opportunities.value : opportunityList;
  const names = [
    ...new Set(pool.map((item) => inferProductName(item.name)).filter(Boolean)),
  ];

  return [
    { value: "all", label: "全部產品/遊戲" },
    ...names
      .sort((a, b) => a.localeCompare(b, "zh-Hant"))
      .map((name) => ({
        value: name,
        label: name,
      })),
  ];
});

const opportunityRecords = computed(() => {
  const source = opportunities.value.length > 0 ? opportunities.value : opportunityList;

  return source.map((item) => {
    const owner = ownerDirectory.get(item.ownerUserId);
    const ownerName = owner?.name || "-";
    const department = owner?.department || "未設定";

    const createdAt = item.createdAt || item.updatedAt || "";
    const updatedAt = item.updatedAt || createdAt;
    const stageEnteredAt = getStageEnteredAt(item);

    const stageEnteredTs = toTimestamp(stageEnteredAt) || toTimestamp(updatedAt) || nowTs;
    const updatedTs = toTimestamp(updatedAt) || stageEnteredTs;
    const expectedCloseTs = toTimestamp(item.expectedCloseDate);

    const baseTs = item.status === "active" ? nowTs : updatedTs;
    const daysInStage = Math.max(Math.floor((baseTs - stageEnteredTs) / dayMs), 0);
    const daysSinceUpdate = Math.max(Math.floor((nowTs - updatedTs) / dayMs), 0);
    const daysToClose = expectedCloseTs
      ? Math.ceil((expectedCloseTs - nowTs) / dayMs)
      : null;

    const isOverdueClose =
      item.status === "active" && expectedCloseTs > 0 && Number(daysToClose) < 0;
    const isStalled = item.status === "active" && daysSinceUpdate > 21;
    const isClosingSoon =
      item.status === "active" &&
      Number.isFinite(daysToClose) &&
      Number(daysToClose) >= 0 &&
      Number(daysToClose) <= 30;

    const expectedRevenue = Number(item.expectedRevenue || 0);
    const probability = Number(item.probability || 0);
    const weightedRevenue = Math.round(expectedRevenue * (probability / 100));

    const record = {
      id: item.id,
      opportunityCode: item.opportunityCode,
      accountId: item.accountId,
      accountName: item.accountName,
      name: item.name,
      opportunityType: item.opportunityType,
      productName: inferProductName(item.name),
      region: item.region,
      ownerUserId: item.ownerUserId,
      ownerName,
      department,
      stage: item.stage,
      status: item.status,
      probability,
      expectedRevenue,
      weightedRevenue,
      expectedCloseDate: item.expectedCloseDate,
      createdAt,
      updatedAt,
      daysInStage,
      daysSinceUpdate,
      daysToClose,
      isOverdueClose,
      isStalled,
      isClosingSoon,
      lostReason: inferLostReason(item),
      riskSignals: [],
      isHighRisk: false,
      isHighPotential: false,
    };

    record.riskSignals = buildRiskSignals(record);
    record.isHighRisk = record.riskSignals.length > 0;
    record.isHighPotential =
      record.status === "active" && record.probability >= 70 && !record.isHighRisk;

    return record;
  });
});

function matchesBucket(record) {
  if (filters.amountBucket === "all") {
    return true;
  }

  return getAmountBucket(record.expectedRevenue) === filters.amountBucket;
}

function matchesYesNo(condition, filterValue) {
  if (filterValue === "all") {
    return true;
  }

  return filterValue === "yes" ? condition : !condition;
}

function isDateWithinRange(value, range) {
  const [start, end] = range || [];
  if (!start || !end) {
    return true;
  }

  const ts = toTimestamp(value);
  return ts >= toTimestamp(start) && ts <= toTimestamp(end) + dayMs - 1;
}

function matchesNonDateFilters(record) {
  const keyword = filters.keyword.trim().toLowerCase();

  const matchesKeyword =
    keyword.length === 0 ||
    record.name.toLowerCase().includes(keyword) ||
    record.opportunityCode.toLowerCase().includes(keyword) ||
    record.accountName.toLowerCase().includes(keyword) ||
    record.ownerName.toLowerCase().includes(keyword);

  const matchesStage = filters.stage === "all" || record.stage === filters.stage;
  const matchesType =
    filters.opportunityType === "all" ||
    record.opportunityType === filters.opportunityType;
  const matchesProduct =
    filters.product === "all" || record.productName === filters.product;
  const matchesRegion = filters.region === "all" || record.region === filters.region;
  const matchesOwner =
    filters.ownerUserId === "all" || record.ownerUserId === filters.ownerUserId;
  const matchesDepartment =
    filters.department === "all" || record.department === filters.department;
  const matchesAmountBucket = matchesBucket(record);

  const matchesExpectedClose = isDateWithinRange(
    record.expectedCloseDate,
    filters.expectedCloseRange
  );

  const matchesRisk = matchesYesNo(record.isHighRisk, filters.isHighRisk);
  const matchesStalled = matchesYesNo(record.isStalled, filters.isStalled);
  const matchesClosingSoon = matchesYesNo(record.isClosingSoon, filters.isClosingSoon);

  const matchesDrillLostReason =
    drillState.lostReason.length === 0 || record.lostReason === drillState.lostReason;

  return (
    matchesKeyword &&
    matchesStage &&
    matchesType &&
    matchesProduct &&
    matchesRegion &&
    matchesOwner &&
    matchesDepartment &&
    matchesAmountBucket &&
    matchesExpectedClose &&
    matchesRisk &&
    matchesStalled &&
    matchesClosingSoon &&
    matchesDrillLostReason
  );
}

const nonDateFilteredRecords = computed(() =>
  opportunityRecords.value.filter((record) => matchesNonDateFilters(record))
);

const filteredRecords = computed(() =>
  nonDateFilteredRecords.value.filter((record) =>
    isDateWithinRange(record.updatedAt, filters.dateRange)
  )
);

const amountThresholds = computed(() => {
  const values = filteredRecords.value
    .map((item) => Number(item.expectedRevenue || 0))
    .filter((value) => value > 0);

  if (values.length === 0) {
    return { high: 0, medium: 0 };
  }

  return {
    high: quantile(values, 0.75),
    medium: quantile(values, 0.4),
  };
});

function getPeriodRange() {
  if (filters.dateRange?.[0] && filters.dateRange?.[1]) {
    return {
      start: toTimestamp(filters.dateRange[0]),
      end: toTimestamp(filters.dateRange[1]) + dayMs - 1,
    };
  }

  const now = new Date(nowTs);
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
    end: nowTs,
  };
}

const currentPeriodRange = computed(() => getPeriodRange());

const previousPeriodRange = computed(() => {
  const span = currentPeriodRange.value.end - currentPeriodRange.value.start + 1;
  return {
    start: currentPeriodRange.value.start - span,
    end: currentPeriodRange.value.start - 1,
  };
});

function buildPeriodMetrics(records, range) {
  const periodRows = records.filter((record) => {
    const ts = toTimestamp(record.updatedAt);
    return ts >= range.start && ts <= range.end;
  });

  const newRows = records.filter((record) => {
    const ts = toTimestamp(record.createdAt);
    return ts >= range.start && ts <= range.end;
  });

  const totalCount = periodRows.length;
  const totalAmount = periodRows.reduce((sum, record) => sum + record.expectedRevenue, 0);
  const newCount = newRows.length;
  const newAmount = newRows.reduce((sum, record) => sum + record.expectedRevenue, 0);

  const wonCount = periodRows.filter((record) => record.stage === "won").length;
  const lostCount = periodRows.filter((record) => record.stage === "lost").length;
  const conversionRate =
    wonCount + lostCount === 0 ? 0 : (wonCount / (wonCount + lostCount)) * 100;

  const averageAmount = totalCount === 0 ? 0 : totalAmount / totalCount;

  const forecastAmount = periodRows
    .filter(
      (record) =>
        record.status === "active" &&
        Number.isFinite(record.daysToClose) &&
        record.daysToClose >= 0 &&
        record.daysToClose <= 90
    )
    .reduce((sum, record) => sum + record.weightedRevenue, 0);

  const highRiskCount = periodRows.filter((record) => record.isHighRisk).length;

  return {
    totalCount,
    totalAmount,
    newCount,
    newAmount,
    conversionRate,
    averageAmount,
    forecastAmount,
    highRiskCount,
  };
}

const currentMetrics = computed(() =>
  buildPeriodMetrics(nonDateFilteredRecords.value, currentPeriodRange.value)
);

const previousMetrics = computed(() =>
  buildPeriodMetrics(nonDateFilteredRecords.value, previousPeriodRange.value)
);

function focusHighRisk() {
  filters.isHighRisk = "yes";
  detailTab.value = "high_risk";
}

function focusForecast() {
  filters.isClosingSoon = "yes";
  detailTab.value = "closing_soon";
}

const kpiCards = computed(() => [
  {
    label: "商機總數",
    value: `${currentMetrics.value.totalCount} 筆`,
    delta: formatDelta(currentMetrics.value.totalCount, previousMetrics.value.totalCount),
  },
  {
    label: "商機總金額",
    value: formatCurrency(currentMetrics.value.totalAmount),
    delta: formatDelta(
      currentMetrics.value.totalAmount,
      previousMetrics.value.totalAmount
    ),
  },
  {
    label: "本期新增商機數",
    value: `${currentMetrics.value.newCount} 筆`,
    delta: formatDelta(currentMetrics.value.newCount, previousMetrics.value.newCount),
  },
  {
    label: "本期新增商機金額",
    value: formatCurrency(currentMetrics.value.newAmount),
    delta: formatDelta(currentMetrics.value.newAmount, previousMetrics.value.newAmount),
  },
  {
    label: "商機轉換率",
    value: `${currentMetrics.value.conversionRate.toFixed(1)}%`,
    delta: formatDelta(
      currentMetrics.value.conversionRate,
      previousMetrics.value.conversionRate,
      true
    ),
  },
  {
    label: "平均商機金額",
    value: formatCurrency(currentMetrics.value.averageAmount),
    delta: formatDelta(
      Math.round(currentMetrics.value.averageAmount),
      Math.round(previousMetrics.value.averageAmount)
    ),
  },
  {
    label: "預計成交金額",
    value: formatCurrency(currentMetrics.value.forecastAmount),
    delta: formatDelta(
      currentMetrics.value.forecastAmount,
      previousMetrics.value.forecastAmount
    ),
    action: focusForecast,
  },
  {
    label: "高風險商機數",
    value: `${currentMetrics.value.highRiskCount} 筆`,
    delta: formatDelta(
      currentMetrics.value.highRiskCount,
      previousMetrics.value.highRiskCount
    ),
    action: focusHighRisk,
  },
]);

const stageCountOption = computed(() => {
  const counts = toCountMap(filteredRecords.value, "stage");
  const rows = stageOrder.map((stage) => ({
    key: stage,
    label: getStageLabel(stage),
    value: counts[stage] || 0,
  }));

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 28, right: 12, top: 28, bottom: 24 },
    xAxis: {
      type: "category",
      data: rows.map((item) => item.label),
      axisLabel: { rotate: 12 },
    },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        barMaxWidth: 30,
        data: rows.map((item) => ({ value: item.value, key: item.key })),
        itemStyle: { color: "#2563eb" },
      },
    ],
  };
});

const stageAmountOption = computed(() => {
  const map = filteredRecords.value.reduce((acc, record) => {
    acc[record.stage] = (acc[record.stage] || 0) + Number(record.expectedRevenue || 0);
    return acc;
  }, {});

  const rows = stageOrder.map((stage) => ({
    key: stage,
    label: getStageLabel(stage),
    value: map[stage] || 0,
  }));

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 36, right: 16, top: 24, bottom: 24 },
    xAxis: {
      type: "category",
      data: rows.map((item) => item.label),
      axisLabel: { rotate: 12 },
    },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        barMaxWidth: 30,
        data: rows.map((item) => ({ value: item.value, key: item.key })),
        itemStyle: { color: "#0ea5e9" },
      },
    ],
  };
});

const typeDistributionOption = computed(() => {
  const counts = toCountMap(filteredRecords.value, "opportunityType");
  const rows = opportunityTypeOptions
    .filter((item) => item.value !== "all")
    .map((item) => ({
      name: item.label,
      value: counts[item.value] || 0,
      key: item.value,
    }));

  return {
    tooltip: { trigger: "item" },
    legend: { bottom: 0, icon: "circle" },
    series: [
      {
        type: "pie",
        radius: ["45%", "72%"],
        data: rows,
      },
    ],
  };
});

const regionDistributionOption = computed(() => {
  const counts = toCountMap(filteredRecords.value, "region");
  const rows = regionOptions
    .filter((item) => item.value !== "all")
    .map((item) => ({
      key: item.value,
      label: item.label,
      value: counts[item.value] || 0,
    }));

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 56, right: 12, top: 20, bottom: 24 },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: rows.map((item) => item.label) },
    series: [
      {
        type: "bar",
        barMaxWidth: 18,
        data: rows.map((item) => ({ value: item.value, key: item.key })),
        itemStyle: { color: "#14b8a6" },
      },
    ],
  };
});

const amountBucketOption = computed(() => {
  const groups = {
    small: 0,
    medium: 0,
    large: 0,
    xlarge: 0,
  };

  filteredRecords.value.forEach((record) => {
    groups[getAmountBucket(record.expectedRevenue)] += 1;
  });

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 30, right: 12, top: 24, bottom: 24 },
    xAxis: {
      type: "category",
      data: ["50萬以下", "50萬-200萬", "200萬-500萬", "500萬以上"],
    },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        barMaxWidth: 30,
        data: [groups.small, groups.medium, groups.large, groups.xlarge],
        itemStyle: { color: "#f59e0b" },
      },
    ],
  };
});

const topOpportunityOption = computed(() => {
  const rows = [...filteredRecords.value]
    .sort((a, b) => b.expectedRevenue - a.expectedRevenue)
    .slice(0, 8)
    .reverse();

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 152, right: 20, top: 18, bottom: 24 },
    xAxis: { type: "value" },
    yAxis: {
      type: "category",
      data: rows.map((item) => item.name),
    },
    series: [
      {
        type: "bar",
        barMaxWidth: 14,
        data: rows.map((item) => item.expectedRevenue),
        itemStyle: { color: "#6366f1" },
      },
    ],
  };
});

const futureMonths = computed(() => getFutureMonths(6));

const forecastTrendOption = computed(() => {
  const values = futureMonths.value.map((month) =>
    filteredRecords.value
      .filter((record) => {
        if (record.status !== "active") {
          return false;
        }
        const ts = toTimestamp(record.expectedCloseDate);
        return ts >= month.start && ts <= month.end;
      })
      .reduce((sum, record) => sum + record.weightedRevenue, 0)
  );

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 36, right: 16, top: 22, bottom: 22 },
    xAxis: { type: "category", data: futureMonths.value.map((item) => item.label) },
    yAxis: { type: "value" },
    series: [
      {
        type: "line",
        smooth: true,
        data: values,
        itemStyle: { color: "#2563eb" },
        areaStyle: { color: "rgba(37, 99, 235, 0.12)" },
      },
    ],
  };
});

const concentrationOption = computed(() => {
  const rows = [...filteredRecords.value]
    .filter((record) => record.status === "active")
    .sort((a, b) => b.expectedRevenue - a.expectedRevenue)
    .slice(0, 10);

  const total = rows.reduce((sum, row) => sum + row.expectedRevenue, 0);
  let cumulative = 0;

  const cumulativeRate = rows.map((row) => {
    cumulative += row.expectedRevenue;
    return total === 0 ? 0 : Number(((cumulative / total) * 100).toFixed(1));
  });

  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 42, right: 42, top: 32, bottom: 52 },
    dataZoom: [{ type: "inside", start: 0, end: 100 }],
    xAxis: {
      type: "category",
      data: rows.map((item) => item.opportunityCode),
    },
    yAxis: [{ type: "value" }, { type: "value", max: 100 }],
    series: [
      {
        name: "商機金額",
        type: "bar",
        barMaxWidth: 16,
        data: rows.map((item) => item.expectedRevenue),
        itemStyle: { color: "#8b5cf6" },
      },
      {
        name: "累積占比",
        type: "line",
        yAxisIndex: 1,
        smooth: true,
        data: cumulativeRate,
        itemStyle: { color: "#ef4444" },
      },
    ],
  };
});

const recentMonths = computed(() => getRecentMonths(6));

const conversionTrendOption = computed(() => {
  const rows = recentMonths.value.map((month) => {
    const wonCount = filteredRecords.value.filter((record) => {
      const ts = toTimestamp(record.updatedAt);
      return record.stage === "won" && ts >= month.start && ts <= month.end;
    }).length;

    const lostCount = filteredRecords.value.filter((record) => {
      const ts = toTimestamp(record.updatedAt);
      return record.stage === "lost" && ts >= month.start && ts <= month.end;
    }).length;

    const rate =
      wonCount + lostCount === 0 ? 0 : (wonCount / (wonCount + lostCount)) * 100;

    return { wonCount, lostCount, rate };
  });

  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 36, right: 24, top: 34, bottom: 24 },
    xAxis: { type: "category", data: recentMonths.value.map((item) => item.label) },
    yAxis: [{ type: "value" }, { type: "value", max: 100 }],
    series: [
      {
        name: "成交",
        type: "bar",
        barMaxWidth: 16,
        data: rows.map((item) => item.wonCount),
        itemStyle: { color: "#22c55e" },
      },
      {
        name: "失敗",
        type: "bar",
        barMaxWidth: 16,
        data: rows.map((item) => item.lostCount),
        itemStyle: { color: "#fb7185" },
      },
      {
        name: "轉換率",
        type: "line",
        yAxisIndex: 1,
        smooth: true,
        data: rows.map((item) => Number(item.rate.toFixed(1))),
        itemStyle: { color: "#3b82f6" },
      },
    ],
  };
});

const stageConversionOption = computed(() => {
  const counts = toCountMap(filteredRecords.value, "stage");

  const rows = activeStageOrder
    .map((stage, index) => {
      if (index === activeStageOrder.length - 1) {
        return null;
      }

      const nextStage = activeStageOrder[index + 1];
      const currentCount = counts[stage] || 0;
      const nextCount = counts[nextStage] || 0;
      const rate = currentCount === 0 ? 0 : (nextCount / currentCount) * 100;

      return {
        key: `${stage}->${nextStage}`,
        label: `${getStageLabel(stage)}→${getStageLabel(nextStage)}`,
        value: Number(Math.min(rate, 100).toFixed(1)),
      };
    })
    .filter(Boolean);

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 52, right: 16, top: 24, bottom: 24 },
    xAxis: { type: "value", max: 100 },
    yAxis: { type: "category", data: rows.map((item) => item.label) },
    series: [
      {
        type: "bar",
        barMaxWidth: 16,
        data: rows.map((item) => item.value),
        itemStyle: { color: "#38bdf8" },
      },
    ],
  };
});

const stageStayOption = computed(() => {
  const rows = activeStageOrder.map((stage) => {
    const matched = filteredRecords.value.filter((record) => record.stage === stage);
    const average =
      matched.length === 0
        ? 0
        : matched.reduce((sum, record) => sum + record.daysInStage, 0) / matched.length;

    return {
      key: stage,
      label: getStageLabel(stage),
      value: Number(average.toFixed(1)),
    };
  });

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 48, right: 16, top: 22, bottom: 24 },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: rows.map((item) => item.label) },
    series: [
      {
        type: "bar",
        barMaxWidth: 16,
        data: rows.map((item) => item.value),
        itemStyle: { color: "#f97316" },
      },
    ],
  };
});

const ownerConversionOption = computed(() => {
  const ownerMap = filteredRecords.value.reduce((map, record) => {
    const row = map.get(record.ownerUserId) || {
      ownerId: record.ownerUserId,
      ownerName: record.ownerName,
      won: 0,
      lost: 0,
      activeAmount: 0,
    };

    if (record.stage === "won") {
      row.won += 1;
    }

    if (record.stage === "lost") {
      row.lost += 1;
    }

    if (record.status === "active") {
      row.activeAmount += record.expectedRevenue;
    }

    map.set(record.ownerUserId, row);
    return map;
  }, new Map());

  const rows = [...ownerMap.values()]
    .map((item) => ({
      ...item,
      conversionRate:
        item.won + item.lost === 0
          ? 0
          : Number(((item.won / (item.won + item.lost)) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.activeAmount - a.activeAmount)
    .slice(0, 8);

  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 36, right: 20, top: 34, bottom: 24 },
    xAxis: {
      type: "category",
      data: rows.map((item) => item.ownerName),
      axisLabel: { rotate: 16 },
    },
    yAxis: [{ type: "value", max: 100 }, { type: "value" }],
    series: [
      {
        name: "轉換率",
        type: "bar",
        barMaxWidth: 16,
        data: rows.map((item) => ({ value: item.conversionRate, ownerId: item.ownerId })),
        itemStyle: { color: "#22c55e" },
      },
      {
        name: "在手 Pipeline 金額",
        type: "line",
        yAxisIndex: 1,
        smooth: true,
        data: rows.map((item) => ({ value: item.activeAmount, ownerId: item.ownerId })),
        itemStyle: { color: "#6366f1" },
      },
    ],
  };
});

const ownerPipelineOption = computed(() => {
  const ownerMap = filteredRecords.value
    .filter((record) => record.status === "active")
    .reduce((map, record) => {
      const row = map.get(record.ownerUserId) || {
        ownerId: record.ownerUserId,
        ownerName: record.ownerName,
        amount: 0,
      };

      row.amount += record.expectedRevenue;
      map.set(record.ownerUserId, row);
      return map;
    }, new Map());

  const rows = [...ownerMap.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)
    .reverse();

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 86, right: 20, top: 22, bottom: 24 },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: rows.map((item) => item.ownerName) },
    series: [
      {
        type: "bar",
        barMaxWidth: 14,
        data: rows.map((item) => ({ value: item.amount, ownerId: item.ownerId })),
        itemStyle: { color: "#0ea5e9" },
      },
    ],
  };
});

const lostTrendOption = computed(() => {
  const values = recentMonths.value.map(
    (month) =>
      filteredRecords.value.filter((record) => {
        const ts = toTimestamp(record.updatedAt);
        return record.stage === "lost" && ts >= month.start && ts <= month.end;
      }).length
  );

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 34, right: 16, top: 24, bottom: 24 },
    xAxis: {
      type: "category",
      data: recentMonths.value.map((item) => item.label),
    },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        barMaxWidth: 24,
        data: values,
        itemStyle: { color: "#fb7185" },
      },
    ],
  };
});

const lostReasonOption = computed(() => {
  const map = filteredRecords.value
    .filter((record) => record.stage === "lost")
    .reduce((acc, record) => {
      const reason = record.lostReason || "未填寫";
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {});

  const rows = Object.entries(map)
    .map(([name, value]) => ({ key: name, name, value }))
    .sort((a, b) => b.value - a.value);

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 126, right: 20, top: 24, bottom: 24 },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: rows.map((item) => item.name) },
    series: [
      {
        type: "bar",
        barMaxWidth: 16,
        data: rows.map((item) => ({ value: item.value, key: item.key })),
        itemStyle: { color: "#ef4444" },
      },
    ],
  };
});

const highRiskSourceOption = computed(() => {
  const typeRows = opportunityTypeOptions.filter((item) => item.value !== "all");
  const ownerMap = filteredRecords.value
    .filter((record) => record.isHighRisk)
    .reduce((map, record) => {
      const row = map.get(record.ownerUserId) || {
        ownerId: record.ownerUserId,
        ownerName: record.ownerName,
        counts: {
          agency: 0,
          license: 0,
          co_branding: 0,
          channel: 0,
        },
      };

      row.counts[record.opportunityType] += 1;
      map.set(record.ownerUserId, row);
      return map;
    }, new Map());

  const rows = [...ownerMap.values()].sort((a, b) => {
    const totalA = Object.values(a.counts).reduce((sum, value) => sum + value, 0);
    const totalB = Object.values(b.counts).reduce((sum, value) => sum + value, 0);
    return totalB - totalA;
  });

  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 34, right: 12, top: 34, bottom: 24 },
    xAxis: {
      type: "category",
      data: rows.map((item) => item.ownerName),
      axisLabel: { rotate: 16 },
    },
    yAxis: { type: "value" },
    series: typeRows.map((type) => ({
      name: type.label,
      type: "bar",
      stack: "risk",
      barMaxWidth: 20,
      data: rows.map((item) => ({
        value: item.counts[type.value],
        ownerId: item.ownerId,
      })),
    })),
  };
});

const riskSignalOption = computed(() => {
  const map = filteredRecords.value
    .filter((record) => record.isHighRisk)
    .reduce((acc, record) => {
      record.riskSignals.forEach((signal) => {
        acc[signal] = (acc[signal] || 0) + 1;
      });
      return acc;
    }, {});

  const rows = Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 150, right: 20, top: 22, bottom: 24 },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: rows.map((item) => item.name) },
    series: [
      {
        type: "bar",
        barMaxWidth: 16,
        data: rows.map((item) => item.value),
        itemStyle: { color: "#f43f5e" },
      },
    ],
  };
});

function handleStageChartClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.stage = value;
  }
}

function handleTypeChartClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.opportunityType = value;
  }
}

function handleRegionChartClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.region = value;
  }
}

function handleOwnerChartClick(params) {
  const ownerId = params?.data?.ownerId;
  if (ownerId) {
    filters.ownerUserId = ownerId;
  }
}

function handleLostReasonChartClick(params) {
  const reason = params?.data?.key;
  if (reason) {
    drillState.lostReason = reason;
    detailTab.value = "lost";
  }
}

function resetFilters() {
  filters.keyword = "";
  filters.dateRange = [];
  filters.stage = "all";
  filters.opportunityType = "all";
  filters.product = "all";
  filters.region = "all";
  filters.ownerUserId = "all";
  filters.department = "all";
  filters.amountBucket = "all";
  filters.expectedCloseRange = [];
  filters.isHighRisk = "all";
  filters.isStalled = "all";
  filters.isClosingSoon = "all";
  drillState.lostReason = "";
  detailTab.value = "high_amount";
  currentPage.value = 1;
}

const detailTabRows = computed(() => {
  const highAmountThreshold = amountThresholds.value.high;
  const rows = filteredRecords.value;

  return {
    high_amount: rows.filter((item) => item.expectedRevenue >= highAmountThreshold),
    closing_soon: rows.filter((item) => item.isClosingSoon),
    stalled_overdue: rows.filter(
      (item) => item.status === "active" && (item.isStalled || item.isOverdueClose)
    ),
    high_risk: rows.filter((item) => item.isHighRisk),
    lost: rows.filter((item) => item.stage === "lost"),
    high_potential: rows.filter((item) => item.isHighPotential),
  };
});

const detailTabs = computed(() => [
  {
    value: "high_amount",
    label: "高金額商機",
    count: detailTabRows.value.high_amount.length,
  },
  {
    value: "closing_soon",
    label: "即將成交商機",
    count: detailTabRows.value.closing_soon.length,
  },
  {
    value: "stalled_overdue",
    label: "逾期未推進商機",
    count: detailTabRows.value.stalled_overdue.length,
  },
  {
    value: "high_risk",
    label: "高風險商機",
    count: detailTabRows.value.high_risk.length,
  },
  { value: "lost", label: "Lost 商機", count: detailTabRows.value.lost.length },
  {
    value: "high_potential",
    label: "高潛力商機",
    count: detailTabRows.value.high_potential.length,
  },
]);

const sortedDetailRows = computed(() => {
  const rows = [...(detailTabRows.value[detailTab.value] || [])];

  if (detailTab.value === "closing_soon") {
    return rows.sort((a, b) => {
      if (a.daysToClose === b.daysToClose) {
        return b.expectedRevenue - a.expectedRevenue;
      }
      return Number(a.daysToClose || 9999) - Number(b.daysToClose || 9999);
    });
  }

  if (detailTab.value === "stalled_overdue") {
    return rows.sort((a, b) => {
      if (a.isOverdueClose !== b.isOverdueClose) {
        return Number(b.isOverdueClose) - Number(a.isOverdueClose);
      }
      return b.daysSinceUpdate - a.daysSinceUpdate;
    });
  }

  if (detailTab.value === "lost") {
    return rows.sort((a, b) => toTimestamp(b.updatedAt) - toTimestamp(a.updatedAt));
  }

  return rows.sort((a, b) => b.expectedRevenue - a.expectedRevenue);
});

const pagedDetailRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedDetailRows.value.slice(start, start + pageSize.value);
});

function formatProbability(probability) {
  return `${Number(probability || 0)}%`;
}

function getProbabilityLevel(probability) {
  const value = Number(probability || 0);
  if (value >= 70) {
    return "high";
  }

  if (value >= 40) {
    return "medium";
  }

  return "low";
}

function riskSummary(record) {
  if (!record.isHighRisk) {
    return "正常";
  }

  return record.riskSignals.join("、");
}

function openOpportunityDetail(row) {
  router.push({
    name: "opportunity-detail",
    params: { opportunityId: row.id },
  });
}

function exportDetailCsv() {
  const header = [
    "商機名稱",
    "商機編號",
    "客戶名稱",
    "商機類型",
    "產品/遊戲",
    "地區",
    "負責人",
    "當前階段",
    "預估金額",
    "成交機率",
    "預計成交日",
    "最近更新",
    "風險狀態",
    "Lost 原因",
  ];

  const rows = sortedDetailRows.value.map((item) => [
    item.name,
    item.opportunityCode,
    item.accountName,
    getTypeLabel(item.opportunityType),
    item.productName,
    item.region,
    item.ownerName,
    getStageLabel(item.stage),
    item.expectedRevenue,
    `${item.probability}%`,
    item.expectedCloseDate,
    item.updatedAt,
    riskSummary(item),
    item.stage === "lost" ? item.lostReason : "-",
  ]);

  const csv = [header, ...rows]
    .map((line) =>
      line.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `opportunity-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

watch(
  () => [
    detailTab.value,
    filters.keyword,
    filters.dateRange?.[0],
    filters.dateRange?.[1],
    filters.stage,
    filters.opportunityType,
    filters.product,
    filters.region,
    filters.ownerUserId,
    filters.department,
    filters.amountBucket,
    filters.expectedCloseRange?.[0],
    filters.expectedCloseRange?.[1],
    filters.isHighRisk,
    filters.isStalled,
    filters.isClosingSoon,
    drillState.lostReason,
    pageSize.value,
  ],
  () => {
    currentPage.value = 1;
  }
);
</script>

<template>
  <div class="min-h-full p-8">
    <section class="grid gap-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-2">
          <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">
            商機分析
          </h1>
          <p class="text-sm text-slate-500">
            檢視 Pipeline 結構、轉換效率、Forecast 與風險商機分布
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton :icon="Download" @click="exportDetailCsv">匯出明細</ElButton>
        </div>
      </header>

      <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="card in kpiCards"
          :key="card.label"
          class="rounded-2xl border border-slate-200 bg-white px-4 py-4"
        >
          <button
            type="button"
            class="kpi-card"
            :class="card.action ? 'kpi-card--clickable' : ''"
            @click="card.action && card.action()"
          >
            <p class="text-xs text-slate-500">{{ card.label }}</p>
            <p class="mt-2 text-lg font-semibold text-slate-900">{{ card.value }}</p>
            <p class="mt-1 text-xs text-slate-500">{{ card.delta }}</p>
          </button>
        </article>
      </section>

      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div class="flex flex-wrap items-center gap-2">
            <ElInput
              v-model="filters.keyword"
              placeholder="搜尋商機名稱 / 編號 / 客戶 / 負責人"
              clearable
              class="!w-80"
            >
              <template #prefix><Search class="h-4 w-4 text-slate-400" /></template>
            </ElInput>
            <ElButton
              :icon="Filter"
              :type="filterPanelOpen ? 'primary' : 'default'"
              @click="filterPanelOpen = !filterPanelOpen"
            >
              Filter
            </ElButton>
            <ElButton :icon="Refresh" @click="resetFilters">重設</ElButton>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <ElTag round effect="plain">分析樣本 {{ filteredRecords.length }} 筆</ElTag>
            <ElTag
              v-if="drillState.lostReason"
              type="danger"
              effect="light"
              closable
              @close="drillState.lostReason = ''"
            >
              Lost 原因：{{ drillState.lostReason }}
            </ElTag>
          </div>
        </div>

        <transition
          enter-active-class="transition-all duration-300 ease-out overflow-hidden"
          leave-active-class="transition-all duration-200 ease-in overflow-hidden"
          enter-from-class="max-h-0 opacity-0"
          enter-to-class="max-h-[1200px] opacity-100"
          leave-from-class="max-h-[1200px] opacity-100"
          leave-to-class="max-h-0 opacity-0"
        >
          <ElForm
            v-if="filterPanelOpen"
            class="grid gap-3 border-t border-slate-200 bg-white px-6 py-4 md:grid-cols-2 xl:grid-cols-4"
            label-position="top"
          >
            <ElFormItem>
              <ElDatePicker
                v-model="filters.dateRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                start-placeholder="更新起日"
                end-placeholder="更新迄日"
                class="!w-full"
              />
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.stage">
                <ElOption
                  v-for="item in opportunityStageOptions"
                  :key="`stage-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.opportunityType">
                <ElOption
                  v-for="item in opportunityTypeOptions"
                  :key="`type-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.product">
                <ElOption
                  v-for="item in productOptionList"
                  :key="`product-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.region">
                <ElOption
                  v-for="item in regionOptions"
                  :key="`region-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.ownerUserId">
                <ElOption
                  v-for="item in ownerOptions"
                  :key="`owner-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.department">
                <ElOption
                  v-for="item in departmentOptions"
                  :key="`department-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.amountBucket">
                <ElOption
                  v-for="item in amountBucketOptions"
                  :key="`amount-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElDatePicker
                v-model="filters.expectedCloseRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                start-placeholder="預計成交起日"
                end-placeholder="預計成交迄日"
                class="!w-full"
              />
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.isHighRisk">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`high-risk-${item.value}`"
                  :label="`高風險：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.isStalled">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`stalled-${item.value}`"
                  :label="`逾期未推進：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.isClosingSoon">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`closing-${item.value}`"
                  :label="`即將成交：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </transition>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">商機結構分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>Pipeline 階段分布（數量）</h3>
              <p>可點擊下鑽階段</p>
            </header>
            <VChart
              :option="stageCountOption"
              autoresize
              class="chart-body"
              @click="handleStageChartClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>Pipeline 階段分布（金額）</h3>
              <p>各階段商機金額結構</p>
            </header>
            <VChart
              :option="stageAmountOption"
              autoresize
              class="chart-body"
              @click="handleStageChartClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>商機類型分布</h3>
              <p>Agency / License / Co-branding / Channel</p>
            </header>
            <VChart
              :option="typeDistributionOption"
              autoresize
              class="chart-body"
              @click="handleTypeChartClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>地區分布</h3>
              <p>可點擊下鑽地區</p>
            </header>
            <VChart
              :option="regionDistributionOption"
              autoresize
              class="chart-body"
              @click="handleRegionChartClick"
            />
          </article>
        </div>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">商機價值與 Forecast 分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>商機金額區間分布</h3>
              <p>小型 / 中型 / 大型 / 超大型</p>
            </header>
            <VChart :option="amountBucketOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>Top 商機排行</h3>
              <p>依預估金額排序</p>
            </header>
            <VChart :option="topOpportunityOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>預計成交金額趨勢</h3>
              <p>未來 6 個月加權 Forecast</p>
            </header>
            <VChart :option="forecastTrendOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>商機金額集中度</h3>
              <p>Top 10 商機金額與累積占比</p>
            </header>
            <VChart :option="concentrationOption" autoresize class="chart-body" />
          </article>
        </div>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">轉換與推進效率分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>商機轉換率趨勢</h3>
              <p>近 6 個月成交 / 失敗與轉換率</p>
            </header>
            <VChart :option="conversionTrendOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>各階段轉換率</h3>
              <p>分段轉換效率</p>
            </header>
            <VChart :option="stageConversionOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>各階段平均停留天數</h3>
              <p>辨識卡關階段</p>
            </header>
            <VChart :option="stageStayOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>Owner 轉換率與在手 Pipeline</h3>
              <p>可點擊套用 owner 篩選</p>
            </header>
            <VChart
              :option="ownerConversionOption"
              autoresize
              class="chart-body"
              @click="handleOwnerChartClick"
            />
          </article>
          <article class="chart-card xl:col-span-2">
            <header class="chart-header">
              <h3>Owner Pipeline 金額比較</h3>
              <p>可點擊套用 owner 篩選</p>
            </header>
            <VChart
              :option="ownerPipelineOption"
              autoresize
              class="chart-body chart-body-wide"
              @click="handleOwnerChartClick"
            />
          </article>
        </div>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">風險與流失分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>Lost 商機趨勢</h3>
              <p>近 6 個月 lost 數量</p>
            </header>
            <VChart :option="lostTrendOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>Lost 原因分布</h3>
              <p>可點擊下鑽 Lost 明細</p>
            </header>
            <VChart
              :option="lostReasonOption"
              autoresize
              class="chart-body"
              @click="handleLostReasonChartClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>高風險商機來源（Owner x 類型）</h3>
              <p>觀察風險集中來源</p>
            </header>
            <VChart
              :option="highRiskSourceOption"
              autoresize
              class="chart-body"
              @click="handleOwnerChartClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>高風險徵兆分布</h3>
              <p>逾期、久未更新、後段卡關等訊號</p>
            </header>
            <VChart :option="riskSignalOption" autoresize class="chart-body" />
          </article>
        </div>
      </section>

      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div class="border-b border-slate-200 px-6 pt-3">
          <ElTabs v-model="detailTab" class="detail-tabs">
            <ElTabPane
              v-for="tab in detailTabs"
              :key="tab.value"
              :name="tab.value"
              :label="`${tab.label} (${tab.count})`"
            />
          </ElTabs>
        </div>

        <ElTable v-loading="loading" table-layout="auto" :data="pagedDetailRows">
          <ElTableColumn label="商機" min-width="250">
            <template #default="{ row }">
              <button
                type="button"
                class="grid gap-1 text-left"
                @click="openOpportunityDetail(row)"
              >
                <span class="font-semibold text-[#303133] hover:text-[#409eff]">{{
                  row.name
                }}</span>
                <span class="text-xs text-slate-500"
                  >{{ row.opportunityCode }} · {{ row.accountName }}</span
                >
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="類型 / 產品" min-width="180">
            <template #default="{ row }">
              <div class="flex flex-wrap gap-1">
                <ElTag
                  :type="typeTagMap[row.opportunityType]"
                  size="small"
                  effect="light"
                >
                  {{ getTypeLabel(row.opportunityType) }}
                </ElTag>
                <ElTag size="small" effect="plain">{{ row.productName }}</ElTag>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="地區 / 負責人" min-width="150">
            <template #default="{ row }">
              <div class="grid gap-0.5">
                <span>{{ row.region }}</span>
                <span class="text-xs text-slate-500">{{ row.ownerName }}</span>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="當前階段" min-width="120">
            <template #default="{ row }">
              <ElTag
                :type="stageTagTypeMap[row.stage] || 'info'"
                size="small"
                effect="light"
              >
                {{ getStageLabel(row.stage) }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="預估金額" min-width="130" align="right">
            <template #default="{ row }">{{
              formatCurrency(row.expectedRevenue)
            }}</template>
          </ElTableColumn>

          <ElTableColumn label="成交機率" min-width="100">
            <template #default="{ row }">
              <ElTag
                :type="probabilityTagType[getProbabilityLevel(row.probability)]"
                size="small"
                effect="light"
              >
                {{ formatProbability(row.probability) }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="預計成交日" min-width="130">
            <template #default="{ row }">
              <span :class="row.isOverdueClose ? 'font-medium text-rose-600' : ''">
                {{ formatDate(row.expectedCloseDate) }}
              </span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="最近更新" min-width="130">
            <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
          </ElTableColumn>

          <ElTableColumn label="風險狀態" min-width="240" show-overflow-tooltip>
            <template #default="{ row }">
              <span
                :class="row.isHighRisk ? 'font-medium text-rose-600' : 'text-slate-500'"
              >
                {{ riskSummary(row) }}
              </span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="Lost 原因" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              <span>{{ row.stage === "lost" ? row.lostReason || "-" : "-" }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="操作" width="110" fixed="right">
            <template #default="{ row }">
              <ElButton text type="primary" @click="openOpportunityDetail(row)"
                >查看商機</ElButton
              >
            </template>
          </ElTableColumn>
        </ElTable>

        <div
          class="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-5"
        >
          <ElPagination
            v-model:current-page="currentPage"
            background
            :page-size="pageSize"
            layout="total, prev, pager, next"
            :total="sortedDetailRows.length"
          />
          <ElSelect v-model="pageSize" class="!w-[100px]" @change="currentPage = 1">
            <ElOption :value="10" label="10 筆" />
            <ElOption :value="20" label="20 筆" />
            <ElOption :value="50" label="50 筆" />
          </ElSelect>
        </div>
      </section>
    </section>
  </div>
</template>

<style scoped>
:deep(.el-form-item) {
  margin-bottom: 12px;
}

.kpi-card {
  width: 100%;
  text-align: left;
}

.kpi-card--clickable {
  cursor: pointer;
}

.kpi-card--clickable:hover p:nth-child(2) {
  color: #2563eb;
}

.chart-card {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: white;
  padding: 14px;
}

.chart-header h3 {
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
}

.chart-header p {
  margin-top: 2px;
  font-size: 0.75rem;
  color: #64748b;
}

.chart-body {
  margin-top: 8px;
  height: 250px;
  width: 100%;
}

.chart-body-wide {
  height: 280px;
}

.detail-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}
</style>
