<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import VChart from "vue-echarts";
import { use } from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
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
import { accountList, accountTypeOptions, regionOptions } from "../../data/accounts";
import { opportunityList, opportunityTypeOptions } from "../../data/opportunities";
import { projectList } from "../../data/projects";
import { useBillingPaymentsStore } from "../../composables/useBillingPaymentsStore";

use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);

const router = useRouter();
const { records } = useBillingPaymentsStore();

const loading = ref(false);
const filterPanelOpen = ref(false);
const detailTab = ref("high_revenue");
const currentPage = ref(1);
const pageSize = ref(10);

const nowTs = Date.now();
const dayMs = 24 * 60 * 60 * 1000;

const yesNoOptions = [
  { value: "all", label: "全部" },
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
];

const metricViewOptions = [
  { value: "gross", label: "Gross 視角" },
  { value: "net", label: "Net 視角" },
];

const accountById = new Map(accountList.map((item) => [item.id, item]));
const opportunityById = new Map(opportunityList.map((item) => [item.id, item]));
const projectById = new Map(projectList.map((item) => [item.id, item]));

const accountTypeLabelMap = Object.fromEntries(
  accountTypeOptions
    .filter((item) => item.value !== "all")
    .map((item) => [item.value, item.label])
);

const cooperationLabelMap = Object.fromEntries(
  opportunityTypeOptions
    .filter((item) => item.value !== "all")
    .map((item) => [item.value, item.label])
);

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

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
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

function getValueByView(item, metricView = "net") {
  return metricView === "gross"
    ? Number(item.grossRevenue || 0)
    : Number(item.netRevenue || 0);
}

function inferProductName(raw) {
  const projectName =
    raw.projectName || projectById.get(raw.projectId)?.projectName || "";

  if (projectName) {
    return projectName;
  }

  const opportunityName =
    raw.opportunityName || opportunityById.get(raw.opportunityId)?.name || "";

  if (!opportunityName) {
    return "未分類產品";
  }

  if (opportunityName.includes("授權") || opportunityName.includes("發行")) {
    return "授權發行方案";
  }

  if (opportunityName.includes("支付") || opportunityName.includes("儲值")) {
    return "支付整合方案";
  }

  if (opportunityName.includes("導流") || opportunityName.includes("會員")) {
    return "會員導流方案";
  }

  if (opportunityName.includes("品牌") || opportunityName.includes("聯名")) {
    return "品牌聯名方案";
  }

  return "通路合作方案";
}

function buildAnomalyReasons(raw) {
  const reasons = [
    ...(raw.systemAlerts || []),
    raw.exceptionReason || "",
    raw.pendingReissueReason || "",
    raw.creditReason || "",
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return [...new Set(reasons)];
}

function buildRiskSignals(record) {
  const signals = [];

  if (record.isReceiveOverdue) {
    signals.push("逾期未收");
  }

  if (record.outstandingReceiveAmount > 0 && record.receivedAmount > 0) {
    signals.push("部分收款");
  }

  if (["pending_reissue", "credited", "voided"].includes(record.invoiceStatus)) {
    signals.push("發票狀態異常");
  }

  if (record.netGrossGapRate > 30) {
    signals.push("Gross/Net 差額偏高");
  }

  if (record.anomalyReasons.length > 0) {
    signals.push("存在系統異常提醒");
  }

  return [...new Set(signals)];
}

const revenueRecords = computed(() => {
  const source = records.value.filter(
    (item) => Number(item.expectedReceiveAmount || item.invoiceAmount || 0) > 0
  );

  return source.map((raw) => {
    const account = accountById.get(raw.accountId);
    const opportunity = opportunityById.get(raw.opportunityId);
    const project = projectById.get(raw.projectId);

    const revenueDate = raw.invoiceDate || String(raw.createdAt || "").slice(0, 10);
    const grossRevenue = Number(raw.invoiceAmount || raw.expectedReceiveAmount || 0);
    const netRevenue = Number(
      raw.untaxedAmount ?? grossRevenue - Number(raw.taxAmount || 0)
    );
    const recognizedRevenue = Number(raw.expectedReceiveAmount || grossRevenue);
    const outstandingReceiveAmount = Number(raw.outstandingReceiveAmount || 0);
    const receivedAmount = Number(raw.receivedAmount || 0);

    const accountType = account?.companyType || "enterprise";
    const accountTypeLabel = accountTypeLabelMap[accountType] || accountType;

    const cooperationMode = opportunity?.opportunityType || "channel";
    const cooperationModeLabel = cooperationLabelMap[cooperationMode] || cooperationMode;

    const partnerName =
      project?.partnerName || (accountType !== "enterprise" ? raw.accountName : "直客");
    const productName = inferProductName({
      ...raw,
      projectName: project?.projectName,
      opportunityName: opportunity?.name,
    });

    const currencyCode = project?.currency || "TWD";
    const anomalyReasons = buildAnomalyReasons(raw);

    const netGrossGap = Math.max(grossRevenue - netRevenue, 0);
    const netGrossGapRate = grossRevenue > 0 ? (netGrossGap / grossRevenue) * 100 : 0;

    const record = {
      id: raw.id,
      revenueNo: raw.revenueNo || "-",
      accountId: raw.accountId,
      accountName: raw.accountName || account?.companyName || "-",
      region: account?.region || opportunity?.region || "-",
      productName,
      partnerName,
      cooperationMode,
      cooperationModeLabel,
      accountType,
      accountTypeLabel,
      currencyCode,
      ownerName: raw.ownerName || "-",
      projectId: raw.projectId,
      projectName: project?.projectName || raw.projectName || "-",
      opportunityId: raw.opportunityId,
      opportunityName: opportunity?.name || raw.opportunityName || "-",
      revenueDate,
      grossRevenue,
      netRevenue,
      recognizedRevenue,
      receivedAmount,
      outstandingReceiveAmount,
      invoiceStatus: raw.invoiceStatus,
      receivableStatus: raw.receivableStatus,
      isReceiveOverdue: Boolean(raw.isReceiveOverdue),
      isConfirmedRevenue:
        ["issued", "reissued"].includes(raw.invoiceStatus) &&
        ["paid", "partial"].includes(raw.receivableStatus),
      anomalyReasons,
      netGrossGap,
      netGrossGapRate,
      riskSignals: [],
      isHighRisk: false,
      updatedAt: raw.updatedAt,
    };

    record.riskSignals = buildRiskSignals(record);
    record.isHighRisk = record.riskSignals.length > 0;

    return record;
  });
});

const accountFilterOptions = computed(() => [
  { value: "all", label: "全部客戶" },
  ...[...new Set(revenueRecords.value.map((item) => item.accountId))].map((id) => ({
    value: id,
    label: accountById.get(id)?.companyName || id,
  })),
]);

const partnerFilterOptions = computed(() => [
  { value: "all", label: "全部夥伴" },
  ...[...new Set(revenueRecords.value.map((item) => item.partnerName).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "zh-Hant"))
    .map((name) => ({ value: name, label: name })),
]);

const productFilterOptions = computed(() => [
  { value: "all", label: "全部產品/專案" },
  ...[...new Set(revenueRecords.value.map((item) => item.productName).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "zh-Hant"))
    .map((name) => ({ value: name, label: name })),
]);

const currencyOptions = computed(() => [
  { value: "all", label: "全部幣別" },
  ...[
    ...new Set(revenueRecords.value.map((item) => item.currencyCode).filter(Boolean)),
  ].map((item) => ({
    value: item,
    label: item,
  })),
]);

const cooperationFilterOptions = [
  { value: "all", label: "全部合作模式" },
  ...opportunityTypeOptions
    .filter((item) => item.value !== "all")
    .map((item) => ({ value: item.value, label: item.label })),
];

const filters = reactive({
  keyword: "",
  dateRange: [],
  region: "all",
  product: "all",
  accountId: "all",
  partnerName: "all",
  customerType: "all",
  cooperationMode: "all",
  currencyCode: "all",
  metricView: "net",
  isHighGrowth: "all",
  isHighRisk: "all",
  onlyConfirmed: "all",
});

const drillState = reactive({
  anomalyReason: "",
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

function isDateWithinRange(value, range) {
  const [start, end] = range || [];
  if (!start || !end) {
    return true;
  }

  const ts = toTimestamp(value);
  return ts >= toTimestamp(start) && ts <= toTimestamp(end) + dayMs - 1;
}

function matchesYesNo(condition, selectedValue) {
  if (selectedValue === "all") {
    return true;
  }

  return selectedValue === "yes" ? condition : !condition;
}

function matchesBaseFilters(item) {
  const keyword = filters.keyword.trim().toLowerCase();

  const matchesKeyword =
    keyword.length === 0 ||
    item.accountName.toLowerCase().includes(keyword) ||
    item.revenueNo.toLowerCase().includes(keyword) ||
    item.productName.toLowerCase().includes(keyword) ||
    item.partnerName.toLowerCase().includes(keyword);

  const matchesRegion = filters.region === "all" || item.region === filters.region;
  const matchesProduct =
    filters.product === "all" || item.productName === filters.product;
  const matchesAccount =
    filters.accountId === "all" || item.accountId === filters.accountId;
  const matchesPartner =
    filters.partnerName === "all" || item.partnerName === filters.partnerName;
  const matchesCustomerType =
    filters.customerType === "all" || item.accountType === filters.customerType;
  const matchesCooperation =
    filters.cooperationMode === "all" || item.cooperationMode === filters.cooperationMode;
  const matchesCurrency =
    filters.currencyCode === "all" || item.currencyCode === filters.currencyCode;
  const matchesConfirmed = matchesYesNo(item.isConfirmedRevenue, filters.onlyConfirmed);
  const matchesAnomalyDrill =
    drillState.anomalyReason.length === 0 ||
    item.anomalyReasons.includes(drillState.anomalyReason);

  return (
    matchesKeyword &&
    matchesRegion &&
    matchesProduct &&
    matchesAccount &&
    matchesPartner &&
    matchesCustomerType &&
    matchesCooperation &&
    matchesCurrency &&
    matchesConfirmed &&
    matchesAnomalyDrill
  );
}

const baseFilteredRecords = computed(() =>
  revenueRecords.value.filter((item) => matchesBaseFilters(item))
);

function buildDimensionStats(recordsList, keyResolver) {
  const map = new Map();

  recordsList.forEach((item) => {
    const key = keyResolver(item);
    const row = map.get(key) || {
      key,
      current: 0,
      previous: 0,
      recent: 0,
    };

    const value = getValueByView(item, filters.metricView);
    const dateTs = toTimestamp(item.revenueDate);

    if (
      dateTs >= currentPeriodRange.value.start &&
      dateTs <= currentPeriodRange.value.end
    ) {
      row.current += value;
      row.recent += value;
    }

    if (
      dateTs >= previousPeriodRange.value.start &&
      dateTs <= previousPeriodRange.value.end
    ) {
      row.previous += value;
    }

    map.set(key, row);
  });

  map.forEach((row) => {
    if (row.previous === 0) {
      row.growthRate = row.current > 0 ? 100 : 0;
      return;
    }

    row.growthRate = ((row.current - row.previous) / Math.abs(row.previous)) * 100;
  });

  return map;
}

const accountStatsMap = computed(() =>
  buildDimensionStats(baseFilteredRecords.value, (item) => item.accountId)
);

const regionStatsMap = computed(() =>
  buildDimensionStats(baseFilteredRecords.value, (item) => item.region)
);

const productStatsMap = computed(() =>
  buildDimensionStats(baseFilteredRecords.value, (item) => item.productName)
);

const partnerStatsMap = computed(() =>
  buildDimensionStats(baseFilteredRecords.value, (item) => item.partnerName)
);

const enrichedRecords = computed(() =>
  baseFilteredRecords.value.map((item) => {
    const accountStats = accountStatsMap.value.get(item.accountId) || {
      growthRate: 0,
      current: 0,
    };

    const isHighGrowth = accountStats.growthRate >= 20 && accountStats.current > 0;

    return {
      ...item,
      sourceGrowthRate: accountStats.growthRate,
      isHighGrowth,
    };
  })
);

const filteredRecords = computed(() =>
  enrichedRecords.value.filter((item) => {
    const matchesDate = isDateWithinRange(item.revenueDate, filters.dateRange);
    const matchesGrowth = matchesYesNo(item.isHighGrowth, filters.isHighGrowth);
    const matchesRisk = matchesYesNo(item.isHighRisk, filters.isHighRisk);

    return matchesDate && matchesGrowth && matchesRisk;
  })
);

function buildPeriodMetrics(recordsList, range) {
  const periodRows = recordsList.filter((item) => {
    const ts = toTimestamp(item.revenueDate);
    return ts >= range.start && ts <= range.end;
  });

  const grossRevenue = periodRows.reduce(
    (sum, item) => sum + Number(item.grossRevenue || 0),
    0
  );
  const netRevenue = periodRows.reduce(
    (sum, item) => sum + Number(item.netRevenue || 0),
    0
  );

  const uniqueSources = new Set(periodRows.map((item) => item.accountId));
  const averagePerRecord = periodRows.length === 0 ? 0 : netRevenue / periodRows.length;

  const highRiskSourceCount = new Set(
    periodRows.filter((item) => item.isHighRisk).map((item) => item.accountId)
  ).size;

  const highGrowthSourceCount = [...accountStatsMap.value.values()].filter(
    (item) => item.growthRate >= 20 && item.current > 0
  ).length;

  const topSourceTotal = [...uniqueSources]
    .map((accountId) => {
      const accountRows = periodRows.filter((item) => item.accountId === accountId);
      return accountRows.reduce((sum, item) => sum + Number(item.netRevenue || 0), 0);
    })
    .sort((a, b) => b - a)
    .slice(0, 10)
    .reduce((sum, value) => sum + value, 0);

  const concentrationRate = netRevenue === 0 ? 0 : (topSourceTotal / netRevenue) * 100;

  return {
    grossRevenue,
    netRevenue,
    averagePerRecord,
    sourceCount: uniqueSources.size,
    highGrowthSourceCount,
    highRiskSourceCount,
    concentrationRate,
  };
}

const currentMetrics = computed(() =>
  buildPeriodMetrics(baseFilteredRecords.value, currentPeriodRange.value)
);

const previousMetrics = computed(() =>
  buildPeriodMetrics(baseFilteredRecords.value, previousPeriodRange.value)
);

const revenueGrowthRate = computed(() => {
  if (previousMetrics.value.netRevenue === 0) {
    return currentMetrics.value.netRevenue > 0 ? 100 : 0;
  }

  return (
    ((currentMetrics.value.netRevenue - previousMetrics.value.netRevenue) /
      Math.abs(previousMetrics.value.netRevenue)) *
    100
  );
});

const newSourceCountInPeriod = computed(() => {
  const currentSet = new Set(
    baseFilteredRecords.value
      .filter((item) => {
        const ts = toTimestamp(item.revenueDate);
        return ts >= currentPeriodRange.value.start && ts <= currentPeriodRange.value.end;
      })
      .map((item) => item.accountId)
  );

  const previousSet = new Set(
    baseFilteredRecords.value
      .filter((item) => {
        const ts = toTimestamp(item.revenueDate);
        return (
          ts >= previousPeriodRange.value.start && ts <= previousPeriodRange.value.end
        );
      })
      .map((item) => item.accountId)
  );

  return [...currentSet].filter((id) => !previousSet.has(id)).length;
});

function focusRisk() {
  filters.isHighRisk = "yes";
  detailTab.value = "high_risk";
}

function focusGrowth() {
  filters.isHighGrowth = "yes";
  detailTab.value = "high_growth";
}

const kpiCards = computed(() => [
  {
    label: "總營收（Gross）",
    value: formatCurrency(currentMetrics.value.grossRevenue),
    delta: formatDelta(
      currentMetrics.value.grossRevenue,
      previousMetrics.value.grossRevenue
    ),
  },
  {
    label: "淨營收（Net）",
    value: formatCurrency(currentMetrics.value.netRevenue),
    delta: formatDelta(currentMetrics.value.netRevenue, previousMetrics.value.netRevenue),
  },
  {
    label: "營收成長率",
    value: formatPercent(revenueGrowthRate.value),
    delta: formatDelta(revenueGrowthRate.value, 0, true),
    action: focusGrowth,
  },
  {
    label: "本期新增營收來源數",
    value: `${newSourceCountInPeriod.value} 個`,
    delta: formatDelta(newSourceCountInPeriod.value, 0),
  },
  {
    label: "平均單筆營收",
    value: formatCurrency(currentMetrics.value.averagePerRecord),
    delta: formatDelta(
      Math.round(currentMetrics.value.averagePerRecord),
      Math.round(previousMetrics.value.averagePerRecord)
    ),
  },
  {
    label: "高成長來源數",
    value: `${currentMetrics.value.highGrowthSourceCount} 個`,
    delta: formatDelta(
      currentMetrics.value.highGrowthSourceCount,
      previousMetrics.value.highGrowthSourceCount
    ),
    action: focusGrowth,
  },
  {
    label: "高風險來源數",
    value: `${currentMetrics.value.highRiskSourceCount} 個`,
    delta: formatDelta(
      currentMetrics.value.highRiskSourceCount,
      previousMetrics.value.highRiskSourceCount
    ),
    action: focusRisk,
  },
  {
    label: "Top 來源營收集中度",
    value: formatPercent(currentMetrics.value.concentrationRate),
    delta: formatDelta(
      currentMetrics.value.concentrationRate,
      previousMetrics.value.concentrationRate,
      true
    ),
  },
]);

const recentMonths = computed(() => getRecentMonths(6));

const grossNetTrendOption = computed(() => {
  const grossPoints = recentMonths.value.map((month) =>
    filteredRecords.value
      .filter((item) => {
        const ts = toTimestamp(item.revenueDate);
        return ts >= month.start && ts <= month.end;
      })
      .reduce((sum, item) => sum + Number(item.grossRevenue || 0), 0)
  );

  const netPoints = recentMonths.value.map((month) =>
    filteredRecords.value
      .filter((item) => {
        const ts = toTimestamp(item.revenueDate);
        return ts >= month.start && ts <= month.end;
      })
      .reduce((sum, item) => sum + Number(item.netRevenue || 0), 0)
  );

  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 36, right: 24, top: 34, bottom: 24 },
    xAxis: {
      type: "category",
      data: recentMonths.value.map((item) => item.label),
    },
    yAxis: { type: "value" },
    series: [
      {
        name: "Gross",
        type: "line",
        smooth: true,
        data: grossPoints,
        itemStyle: { color: "#2563eb" },
      },
      {
        name: "Net",
        type: "line",
        smooth: true,
        data: netPoints,
        itemStyle: { color: "#16a34a" },
      },
    ],
  };
});

const growthTrendOption = computed(() => {
  const netPoints = recentMonths.value.map((month) =>
    filteredRecords.value
      .filter((item) => {
        const ts = toTimestamp(item.revenueDate);
        return ts >= month.start && ts <= month.end;
      })
      .reduce((sum, item) => sum + Number(item.netRevenue || 0), 0)
  );

  const growthPoints = netPoints.map((value, index) => {
    if (index === 0) {
      return 0;
    }

    const previous = netPoints[index - 1];
    if (previous === 0) {
      return value > 0 ? 100 : 0;
    }

    return Number((((value - previous) / Math.abs(previous)) * 100).toFixed(1));
  });

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 42, right: 20, top: 24, bottom: 24 },
    xAxis: {
      type: "category",
      data: recentMonths.value.map((item) => item.label),
    },
    yAxis: { type: "value" },
    series: [
      {
        type: "line",
        smooth: true,
        data: growthPoints,
        itemStyle: { color: "#f59e0b" },
        areaStyle: { color: "rgba(245, 158, 11, 0.14)" },
      },
    ],
  };
});

const periodDistributionOption = computed(() => {
  const points = recentMonths.value.map((month) =>
    filteredRecords.value
      .filter((item) => {
        const ts = toTimestamp(item.revenueDate);
        return ts >= month.start && ts <= month.end;
      })
      .reduce((sum, item) => sum + getValueByView(item, filters.metricView), 0)
  );

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 36, right: 16, top: 24, bottom: 24 },
    xAxis: {
      type: "category",
      data: recentMonths.value.map((item) => item.label),
    },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        barMaxWidth: 28,
        data: points,
        itemStyle: { color: filters.metricView === "gross" ? "#3b82f6" : "#22c55e" },
      },
    ],
  };
});

const grossNetGapOption = computed(() => {
  const grossPoints = recentMonths.value.map((month) =>
    filteredRecords.value
      .filter((item) => {
        const ts = toTimestamp(item.revenueDate);
        return ts >= month.start && ts <= month.end;
      })
      .reduce((sum, item) => sum + Number(item.grossRevenue || 0), 0)
  );

  const netPoints = recentMonths.value.map((month) =>
    filteredRecords.value
      .filter((item) => {
        const ts = toTimestamp(item.revenueDate);
        return ts >= month.start && ts <= month.end;
      })
      .reduce((sum, item) => sum + Number(item.netRevenue || 0), 0)
  );

  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 36, right: 16, top: 34, bottom: 24 },
    xAxis: {
      type: "category",
      data: recentMonths.value.map((item) => item.label),
    },
    yAxis: { type: "value" },
    series: [
      {
        name: "Gross",
        type: "bar",
        barMaxWidth: 18,
        data: grossPoints,
        itemStyle: { color: "#93c5fd" },
      },
      {
        name: "Net",
        type: "bar",
        barMaxWidth: 18,
        data: netPoints,
        itemStyle: { color: "#4ade80" },
      },
    ],
  };
});

function aggregateRowsBy(recordsList, keyGetter, labelGetter) {
  const map = new Map();

  recordsList.forEach((item) => {
    const key = keyGetter(item);
    const row = map.get(key) || {
      key,
      label: labelGetter(item),
      gross: 0,
      net: 0,
      records: [],
    };

    row.gross += Number(item.grossRevenue || 0);
    row.net += Number(item.netRevenue || 0);
    row.records.push(item);
    map.set(key, row);
  });

  return [...map.values()];
}

const regionRows = computed(() =>
  aggregateRowsBy(
    filteredRecords.value,
    (item) => item.region,
    (item) => item.region
  ).sort(
    (a, b) =>
      getValueByView({ grossRevenue: b.gross, netRevenue: b.net }, filters.metricView) -
      getValueByView({ grossRevenue: a.gross, netRevenue: a.net }, filters.metricView)
  )
);

const productRows = computed(() =>
  aggregateRowsBy(
    filteredRecords.value,
    (item) => item.productName,
    (item) => item.productName
  ).sort(
    (a, b) =>
      getValueByView({ grossRevenue: b.gross, netRevenue: b.net }, filters.metricView) -
      getValueByView({ grossRevenue: a.gross, netRevenue: a.net }, filters.metricView)
  )
);

const accountTypeRows = computed(() =>
  aggregateRowsBy(
    filteredRecords.value,
    (item) => item.accountType,
    (item) => item.accountTypeLabel
  ).sort(
    (a, b) =>
      getValueByView({ grossRevenue: b.gross, netRevenue: b.net }, filters.metricView) -
      getValueByView({ grossRevenue: a.gross, netRevenue: a.net }, filters.metricView)
  )
);

const cooperationRows = computed(() =>
  aggregateRowsBy(
    filteredRecords.value,
    (item) => item.cooperationMode,
    (item) => item.cooperationModeLabel
  ).sort(
    (a, b) =>
      getValueByView({ grossRevenue: b.gross, netRevenue: b.net }, filters.metricView) -
      getValueByView({ grossRevenue: a.gross, netRevenue: a.net }, filters.metricView)
  )
);

const partnerRows = computed(() =>
  aggregateRowsBy(
    filteredRecords.value,
    (item) => item.partnerName,
    (item) => item.partnerName
  ).sort(
    (a, b) =>
      getValueByView({ grossRevenue: b.gross, netRevenue: b.net }, filters.metricView) -
      getValueByView({ grossRevenue: a.gross, netRevenue: a.net }, filters.metricView)
  )
);

const customerRows = computed(() =>
  aggregateRowsBy(
    filteredRecords.value,
    (item) => item.accountId,
    (item) => item.accountName
  )
    .map((item) => ({
      ...item,
      accountId: item.key,
      region: item.records[0]?.region || "-",
      isHighRisk: item.records.some((line) => line.isHighRisk),
      anomalyReasons: [...new Set(item.records.flatMap((line) => line.anomalyReasons))],
      projectId: item.records.find((line) => line.projectId)?.projectId || "",
    }))
    .sort(
      (a, b) =>
        getValueByView({ grossRevenue: b.gross, netRevenue: b.net }, filters.metricView) -
        getValueByView({ grossRevenue: a.gross, netRevenue: a.net }, filters.metricView)
    )
);

const regionDistributionOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 72, right: 20, top: 22, bottom: 24 },
  xAxis: { type: "value" },
  yAxis: { type: "category", data: regionRows.value.map((item) => item.label) },
  series: [
    {
      type: "bar",
      barMaxWidth: 16,
      data: regionRows.value.map((item) => ({
        value: getValueByView(
          { grossRevenue: item.gross, netRevenue: item.net },
          filters.metricView
        ),
        key: item.key,
      })),
      itemStyle: { color: "#0ea5e9" },
    },
  ],
}));

const productDistributionOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 190, right: 20, top: 22, bottom: 24 },
  xAxis: { type: "value" },
  yAxis: {
    type: "category",
    data: productRows.value.slice(0, 8).map((item) => item.label),
  },
  series: [
    {
      type: "bar",
      barMaxWidth: 14,
      data: productRows.value.slice(0, 8).map((item) => ({
        value: getValueByView(
          { grossRevenue: item.gross, netRevenue: item.net },
          filters.metricView
        ),
        key: item.key,
      })),
      itemStyle: { color: "#6366f1" },
    },
  ],
}));

const accountTypeDistributionOption = computed(() => ({
  tooltip: { trigger: "item" },
  legend: { bottom: 0, icon: "circle" },
  series: [
    {
      type: "pie",
      radius: ["45%", "72%"],
      data: accountTypeRows.value.map((item) => ({
        name: item.label,
        value: getValueByView(
          { grossRevenue: item.gross, netRevenue: item.net },
          filters.metricView
        ),
        key: item.key,
      })),
    },
  ],
}));

const cooperationDistributionOption = computed(() => ({
  tooltip: { trigger: "item" },
  legend: { bottom: 0, icon: "circle" },
  series: [
    {
      type: "pie",
      radius: ["45%", "72%"],
      data: cooperationRows.value.map((item) => ({
        name: item.label,
        value: getValueByView(
          { grossRevenue: item.gross, netRevenue: item.net },
          filters.metricView
        ),
        key: item.key,
      })),
    },
  ],
}));

const concentrationOption = computed(() => {
  const rows = customerRows.value.slice(0, 10);
  const total = customerRows.value.reduce(
    (sum, item) =>
      sum +
      getValueByView(
        { grossRevenue: item.gross, netRevenue: item.net },
        filters.metricView
      ),
    0
  );

  const topTotal = rows.reduce(
    (sum, item) =>
      sum +
      getValueByView(
        { grossRevenue: item.gross, netRevenue: item.net },
        filters.metricView
      ),
    0
  );

  const chartRows = [
    ...rows.map((item) => ({
      label: item.label,
      value: getValueByView(
        { grossRevenue: item.gross, netRevenue: item.net },
        filters.metricView
      ),
      key: item.accountId,
    })),
  ];

  if (total > topTotal) {
    chartRows.push({
      label: "其他來源",
      value: total - topTotal,
      key: "others",
    });
  }

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 90, right: 20, top: 22, bottom: 24 },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: chartRows.map((item) => item.label).reverse() },
    series: [
      {
        type: "bar",
        barMaxWidth: 14,
        data: chartRows.map((item) => ({ value: item.value, key: item.key })).reverse(),
        itemStyle: { color: "#a855f7" },
      },
    ],
  };
});

const topCustomerOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 140, right: 20, top: 20, bottom: 24 },
  xAxis: { type: "value" },
  yAxis: {
    type: "category",
    data: customerRows.value
      .slice(0, 8)
      .map((item) => item.label)
      .reverse(),
  },
  series: [
    {
      type: "bar",
      barMaxWidth: 14,
      data: customerRows.value
        .slice(0, 8)
        .map((item) => ({
          value: getValueByView(
            { grossRevenue: item.gross, netRevenue: item.net },
            filters.metricView
          ),
          key: item.accountId,
        }))
        .reverse(),
      itemStyle: { color: "#3b82f6" },
    },
  ],
}));

const topPartnerOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 140, right: 20, top: 20, bottom: 24 },
  xAxis: { type: "value" },
  yAxis: {
    type: "category",
    data: partnerRows.value
      .slice(0, 8)
      .map((item) => item.label)
      .reverse(),
  },
  series: [
    {
      type: "bar",
      barMaxWidth: 14,
      data: partnerRows.value
        .slice(0, 8)
        .map((item) => ({
          value: getValueByView(
            { grossRevenue: item.gross, netRevenue: item.net },
            filters.metricView
          ),
          key: item.key,
        }))
        .reverse(),
      itemStyle: { color: "#14b8a6" },
    },
  ],
}));

const topProductOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 180, right: 20, top: 20, bottom: 24 },
  xAxis: { type: "value" },
  yAxis: {
    type: "category",
    data: productRows.value
      .slice(0, 8)
      .map((item) => item.label)
      .reverse(),
  },
  series: [
    {
      type: "bar",
      barMaxWidth: 14,
      data: productRows.value
        .slice(0, 8)
        .map((item) => ({
          value: getValueByView(
            { grossRevenue: item.gross, netRevenue: item.net },
            filters.metricView
          ),
          key: item.key,
        }))
        .reverse(),
      itemStyle: { color: "#8b5cf6" },
    },
  ],
}));

const highGrowthRows = computed(() =>
  customerRows.value
    .map((item) => {
      const stat = accountStatsMap.value.get(item.accountId) || {
        growthRate: 0,
        current: 0,
      };
      return {
        ...item,
        growthRate: Number(stat.growthRate || 0),
      };
    })
    .filter((item) => item.growthRate >= 20)
    .sort((a, b) => b.growthRate - a.growthRate)
);

const highGrowthOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 130, right: 20, top: 20, bottom: 24 },
  xAxis: { type: "value" },
  yAxis: {
    type: "category",
    data: highGrowthRows.value
      .slice(0, 8)
      .map((item) => item.label)
      .reverse(),
  },
  series: [
    {
      type: "bar",
      barMaxWidth: 14,
      data: highGrowthRows.value
        .slice(0, 8)
        .map((item) => ({ value: item.growthRate, key: item.accountId }))
        .reverse(),
      itemStyle: { color: "#22c55e" },
    },
  ],
}));

const averageSourceValueTrendOption = computed(() => {
  const points = recentMonths.value.map((month) => {
    const monthRows = filteredRecords.value.filter((item) => {
      const ts = toTimestamp(item.revenueDate);
      return ts >= month.start && ts <= month.end;
    });

    if (monthRows.length === 0) {
      return 0;
    }

    const sourceMap = new Map();
    monthRows.forEach((item) => {
      const current = sourceMap.get(item.accountId) || 0;
      sourceMap.set(item.accountId, current + getValueByView(item, filters.metricView));
    });

    const total = [...sourceMap.values()].reduce((sum, value) => sum + value, 0);
    return Math.round(total / sourceMap.size);
  });

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 42, right: 20, top: 24, bottom: 24 },
    xAxis: {
      type: "category",
      data: recentMonths.value.map((item) => item.label),
    },
    yAxis: { type: "value" },
    series: [
      {
        type: "line",
        smooth: true,
        data: points,
        itemStyle: { color: "#0ea5e9" },
        areaStyle: { color: "rgba(14, 165, 233, 0.14)" },
      },
    ],
  };
});

const downtrendSourceCountOption = computed(() => {
  const monthSourceMap = recentMonths.value.map((month) => {
    const map = new Map();

    filteredRecords.value.forEach((item) => {
      const ts = toTimestamp(item.revenueDate);
      if (ts < month.start || ts > month.end) {
        return;
      }

      const key = item.accountId;
      map.set(key, (map.get(key) || 0) + getValueByView(item, filters.metricView));
    });

    return map;
  });

  const points = monthSourceMap.map((map, index) => {
    if (index === 0) {
      return 0;
    }

    let count = 0;
    map.forEach((value, key) => {
      const previous = monthSourceMap[index - 1].get(key) || 0;
      if (previous > 0 && value < previous * 0.8) {
        count += 1;
      }
    });

    return count;
  });

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 36, right: 20, top: 24, bottom: 24 },
    xAxis: { type: "category", data: recentMonths.value.map((item) => item.label) },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        barMaxWidth: 24,
        data: points,
        itemStyle: { color: "#f97316" },
      },
    ],
  };
});

const anomalySourceRows = computed(() =>
  customerRows.value
    .map((item) => ({
      ...item,
      anomalyCount: item.records.reduce(
        (sum, line) => sum + line.anomalyReasons.length,
        0
      ),
    }))
    .filter((item) => item.anomalyCount > 0)
    .sort((a, b) => b.anomalyCount - a.anomalyCount)
);

const anomalySourceOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 130, right: 20, top: 22, bottom: 24 },
  xAxis: { type: "value" },
  yAxis: {
    type: "category",
    data: anomalySourceRows.value
      .slice(0, 8)
      .map((item) => item.label)
      .reverse(),
  },
  series: [
    {
      type: "bar",
      barMaxWidth: 14,
      data: anomalySourceRows.value
        .slice(0, 8)
        .map((item) => ({ value: item.anomalyCount, key: item.accountId }))
        .reverse(),
      itemStyle: { color: "#ef4444" },
    },
  ],
}));

const riskSourceDistributionOption = computed(() => {
  const map = new Map();

  filteredRecords.value.forEach((item) => {
    if (!item.isHighRisk) {
      return;
    }

    const key = item.region;
    const row = map.get(key) || {
      key,
      overdue: 0,
      invoice: 0,
      alert: 0,
    };

    if (item.isReceiveOverdue) {
      row.overdue += 1;
    }

    if (["pending_reissue", "credited", "voided"].includes(item.invoiceStatus)) {
      row.invoice += 1;
    }

    if (item.anomalyReasons.length > 0) {
      row.alert += 1;
    }

    map.set(key, row);
  });

  const rows = [...map.values()].sort(
    (a, b) => b.overdue + b.invoice + b.alert - (a.overdue + a.invoice + a.alert)
  );

  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 40, right: 16, top: 34, bottom: 24 },
    xAxis: { type: "category", data: rows.map((item) => item.key) },
    yAxis: { type: "value" },
    series: [
      {
        name: "逾期未收",
        type: "bar",
        stack: "risk",
        barMaxWidth: 18,
        data: rows.map((item) => item.overdue),
      },
      {
        name: "發票異常",
        type: "bar",
        stack: "risk",
        barMaxWidth: 18,
        data: rows.map((item) => item.invoice),
      },
      {
        name: "系統異常",
        type: "bar",
        stack: "risk",
        barMaxWidth: 18,
        data: rows.map((item) => item.alert),
      },
    ],
  };
});

const growthDeclineCompareOption = computed(() => {
  const map = new Map();

  customerRows.value.forEach((item) => {
    const mode = item.records[0]?.cooperationMode || "channel";
    const row = map.get(mode) || {
      mode,
      growth: 0,
      decline: 0,
    };

    const stat = accountStatsMap.value.get(item.accountId) || { growthRate: 0 };
    if (stat.growthRate >= 20) {
      row.growth += 1;
    }

    if (stat.growthRate <= -15) {
      row.decline += 1;
    }

    map.set(mode, row);
  });

  const rows = [...map.values()];

  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 40, right: 16, top: 34, bottom: 24 },
    xAxis: {
      type: "category",
      data: rows.map((item) => cooperationLabelMap[item.mode] || item.mode),
    },
    yAxis: { type: "value" },
    series: [
      {
        name: "高成長來源",
        type: "bar",
        barMaxWidth: 18,
        data: rows.map((item) => item.growth),
        itemStyle: { color: "#22c55e" },
      },
      {
        name: "下滑來源",
        type: "bar",
        barMaxWidth: 18,
        data: rows.map((item) => item.decline),
        itemStyle: { color: "#f97316" },
      },
    ],
  };
});

const anomalyReasonRows = computed(() => {
  const map = {};

  filteredRecords.value.forEach((item) => {
    item.anomalyReasons.forEach((reason) => {
      map[reason] = (map[reason] || 0) + 1;
    });
  });

  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
});

const anomalyReasonOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 150, right: 20, top: 22, bottom: 24 },
  xAxis: { type: "value" },
  yAxis: { type: "category", data: anomalyReasonRows.value.map((item) => item.name) },
  series: [
    {
      type: "bar",
      barMaxWidth: 14,
      data: anomalyReasonRows.value.map((item) => ({
        value: item.value,
        key: item.name,
      })),
      itemStyle: { color: "#fb7185" },
    },
  ],
}));

function handleRegionClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.region = value;
  }
}

function handleProductClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.product = value;
  }
}

function handleAccountTypeClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.customerType = value;
  }
}

function handleCooperationClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.cooperationMode = value;
  }
}

function handleCustomerClick(params) {
  const value = params?.data?.key;
  if (value && value !== "others") {
    filters.accountId = value;
  }
}

function handlePartnerClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.partnerName = value;
  }
}

function handleAnomalyReasonClick(params) {
  const value = params?.data?.key;
  if (value) {
    drillState.anomalyReason = value;
    detailTab.value = "high_risk";
  }
}

function resetFilters() {
  filters.keyword = "";
  filters.dateRange = [];
  filters.region = "all";
  filters.product = "all";
  filters.accountId = "all";
  filters.partnerName = "all";
  filters.customerType = "all";
  filters.cooperationMode = "all";
  filters.currencyCode = "all";
  filters.metricView = "net";
  filters.isHighGrowth = "all";
  filters.isHighRisk = "all";
  filters.onlyConfirmed = "all";
  drillState.anomalyReason = "";
  detailTab.value = "high_revenue";
  currentPage.value = 1;
}

function buildDetailRowsByDimension(
  recordsList,
  keyGetter,
  labelGetter,
  statsMap,
  typeLabel
) {
  const map = new Map();

  recordsList.forEach((item) => {
    const key = keyGetter(item);
    const row = map.get(key) || {
      key,
      sourceName: labelGetter(item),
      sourceType: typeLabel,
      region: item.region || "-",
      grossRevenue: 0,
      netRevenue: 0,
      latestRevenue: 0,
      riskCount: 0,
      anomalyReasons: [],
      jumpType: "finance",
      jumpId: "",
    };

    row.grossRevenue += Number(item.grossRevenue || 0);
    row.netRevenue += Number(item.netRevenue || 0);
    row.region = row.region === "-" ? item.region : row.region;

    if (item.isHighRisk) {
      row.riskCount += 1;
    }

    row.anomalyReasons.push(...item.anomalyReasons);

    if (item.accountId) {
      row.jumpType = "account";
      row.jumpId = item.accountId;
    }

    if (item.projectId && typeLabel === "產品") {
      row.jumpType = "project";
      row.jumpId = item.projectId;
    }

    map.set(key, row);
  });

  const rows = [...map.values()].map((row) => {
    const stats = statsMap.get(row.key) || { growthRate: 0, current: 0, recent: 0 };

    return {
      ...row,
      growthRate: Number(stats.growthRate || 0),
      latestRevenue: Number(stats.recent || 0),
      anomalyReasons: [...new Set(row.anomalyReasons)].filter(Boolean),
      isHighRisk: row.riskCount > 0,
    };
  });

  const total = rows.reduce(
    (sum, row) => sum + getValueByView(row, filters.metricView),
    0
  );

  return rows.map((row) => ({
    ...row,
    shareRate: total === 0 ? 0 : (getValueByView(row, filters.metricView) / total) * 100,
  }));
}

const customerDetailRows = computed(() =>
  buildDetailRowsByDimension(
    filteredRecords.value,
    (item) => item.accountId,
    (item) => item.accountName,
    accountStatsMap.value,
    "客戶"
  )
    .map((row) => ({
      ...row,
      sourceType: `${row.sourceType} / ${
        accountTypeLabelMap[accountById.get(row.jumpId)?.companyType] || "未分類"
      }`,
    }))
    .sort(
      (a, b) =>
        getValueByView(b, filters.metricView) - getValueByView(a, filters.metricView)
    )
);

const regionDetailRows = computed(() =>
  buildDetailRowsByDimension(
    filteredRecords.value,
    (item) => item.region,
    (item) => item.region,
    regionStatsMap.value,
    "地區"
  )
    .map((row) => ({ ...row, jumpType: "none" }))
    .sort(
      (a, b) =>
        getValueByView(b, filters.metricView) - getValueByView(a, filters.metricView)
    )
);

const productDetailRows = computed(() =>
  buildDetailRowsByDimension(
    filteredRecords.value,
    (item) => item.productName,
    (item) => item.productName,
    productStatsMap.value,
    "產品"
  ).sort(
    (a, b) =>
      getValueByView(b, filters.metricView) - getValueByView(a, filters.metricView)
  )
);

const partnerDetailRows = computed(() =>
  buildDetailRowsByDimension(
    filteredRecords.value,
    (item) => item.partnerName,
    (item) => item.partnerName,
    partnerStatsMap.value,
    "夥伴"
  )
    .map((row) => ({ ...row, jumpType: "partner", jumpId: row.key }))
    .sort(
      (a, b) =>
        getValueByView(b, filters.metricView) - getValueByView(a, filters.metricView)
    )
);

const detailRowsByTab = computed(() => ({
  high_revenue: [...customerDetailRows.value],
  high_growth: customerDetailRows.value.filter((row) => row.growthRate >= 20),
  declining: customerDetailRows.value.filter((row) => row.growthRate <= -15),
  high_risk: customerDetailRows.value.filter((row) => row.isHighRisk),
  region_breakdown: [...regionDetailRows.value],
  product_breakdown: [...productDetailRows.value],
  customer_partner: [...customerDetailRows.value, ...partnerDetailRows.value].sort(
    (a, b) =>
      getValueByView(b, filters.metricView) - getValueByView(a, filters.metricView)
  ),
}));

const detailTabs = computed(() => [
  {
    value: "high_revenue",
    label: "高營收來源",
    count: detailRowsByTab.value.high_revenue.length,
  },
  {
    value: "high_growth",
    label: "高成長來源",
    count: detailRowsByTab.value.high_growth.length,
  },
  {
    value: "declining",
    label: "下滑來源",
    count: detailRowsByTab.value.declining.length,
  },
  {
    value: "high_risk",
    label: "高風險來源",
    count: detailRowsByTab.value.high_risk.length,
  },
  {
    value: "region_breakdown",
    label: "地區明細",
    count: detailRowsByTab.value.region_breakdown.length,
  },
  {
    value: "product_breakdown",
    label: "產品明細",
    count: detailRowsByTab.value.product_breakdown.length,
  },
  {
    value: "customer_partner",
    label: "客戶 / 夥伴明細",
    count: detailRowsByTab.value.customer_partner.length,
  },
]);

const sortedDetailRows = computed(() => {
  const rows = [...(detailRowsByTab.value[detailTab.value] || [])];

  if (detailTab.value === "high_growth" || detailTab.value === "declining") {
    return rows.sort((a, b) => b.growthRate - a.growthRate);
  }

  return rows.sort(
    (a, b) =>
      getValueByView(b, filters.metricView) - getValueByView(a, filters.metricView)
  );
});

const pagedDetailRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedDetailRows.value.slice(start, start + pageSize.value);
});

function riskSummary(row) {
  if (!row.isHighRisk) {
    return "正常";
  }

  if (row.riskCount > 0) {
    return `高風險（${row.riskCount}）`;
  }

  return "高風險";
}

function anomalySummary(row) {
  if (!row.anomalyReasons?.length) {
    return "-";
  }

  return row.anomalyReasons.slice(0, 2).join("、");
}

function openDetail(row) {
  if (row.jumpType === "account" && row.jumpId) {
    router.push({
      name: "account-detail",
      params: { accountId: row.jumpId },
    });
    return;
  }

  if (row.jumpType === "project" && row.jumpId) {
    router.push({
      name: "project-detail",
      params: { projectId: row.jumpId },
    });
    return;
  }

  if (row.jumpType === "partner") {
    router.push({ name: "partners-list" });
    return;
  }

  router.push({ name: "finance-revenue-records" });
}

function exportDetailCsv() {
  const header = [
    "來源名稱",
    "類型",
    "地區",
    "Gross Revenue",
    "Net Revenue",
    "成長率",
    "占總營收比",
    "最近期間營收",
    "風險狀態",
    "異常狀態",
  ];

  const rows = sortedDetailRows.value.map((item) => [
    item.sourceName,
    item.sourceType,
    item.region,
    item.grossRevenue,
    item.netRevenue,
    `${item.growthRate.toFixed(1)}%`,
    `${item.shareRate.toFixed(1)}%`,
    item.latestRevenue,
    riskSummary(item),
    anomalySummary(item),
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
  anchor.download = `revenue-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
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
    filters.region,
    filters.product,
    filters.accountId,
    filters.partnerName,
    filters.customerType,
    filters.cooperationMode,
    filters.currencyCode,
    filters.metricView,
    filters.isHighGrowth,
    filters.isHighRisk,
    filters.onlyConfirmed,
    drillState.anomalyReason,
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
            營收分析
          </h1>
          <p class="text-sm text-slate-500">檢視營收趨勢、結構分布、來源貢獻與異常風險</p>
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
              placeholder="搜尋來源名稱 / 編號 / 產品 / 夥伴"
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
              v-if="drillState.anomalyReason"
              type="danger"
              effect="light"
              closable
              @close="drillState.anomalyReason = ''"
            >
              異常原因：{{ drillState.anomalyReason }}
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
                start-placeholder="營收起日"
                end-placeholder="營收迄日"
                class="!w-full"
              />
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
              <ElSelect v-model="filters.product">
                <ElOption
                  v-for="item in productFilterOptions"
                  :key="`product-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.accountId">
                <ElOption
                  v-for="item in accountFilterOptions"
                  :key="`account-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.partnerName">
                <ElOption
                  v-for="item in partnerFilterOptions"
                  :key="`partner-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.customerType">
                <ElOption
                  v-for="item in accountTypeOptions"
                  :key="`customer-type-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.cooperationMode">
                <ElOption
                  v-for="item in cooperationFilterOptions"
                  :key="`cooperation-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.currencyCode">
                <ElOption
                  v-for="item in currencyOptions"
                  :key="`currency-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.metricView">
                <ElOption
                  v-for="item in metricViewOptions"
                  :key="`view-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.isHighGrowth">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`growth-${item.value}`"
                  :label="`高成長：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.isHighRisk">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`risk-${item.value}`"
                  :label="`高風險：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.onlyConfirmed">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`confirmed-${item.value}`"
                  :label="`僅已確認營收：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </transition>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">營收趨勢分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>Gross / Net 營收趨勢</h3>
              <p>近 6 個月營收趨勢</p>
            </header>
            <VChart :option="grossNetTrendOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>營收成長率趨勢</h3>
              <p>月增率波動</p>
            </header>
            <VChart :option="growthTrendOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>期間營收分布</h3>
              <p>{{ filters.metricView === "gross" ? "Gross" : "Net" }} 視角比較</p>
            </header>
            <VChart :option="periodDistributionOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>Gross 與 Net 差額趨勢</h3>
              <p>觀察差額是否異常擴大</p>
            </header>
            <VChart :option="grossNetGapOption" autoresize class="chart-body" />
          </article>
        </div>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">營收結構分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>地區營收分布</h3>
              <p>可點擊下鑽地區</p>
            </header>
            <VChart
              :option="regionDistributionOption"
              autoresize
              class="chart-body"
              @click="handleRegionClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>產品 / 專案營收分布</h3>
              <p>可點擊下鑽產品</p>
            </header>
            <VChart
              :option="productDistributionOption"
              autoresize
              class="chart-body"
              @click="handleProductClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>客戶類型營收分布</h3>
              <p>可點擊下鑽客戶類型</p>
            </header>
            <VChart
              :option="accountTypeDistributionOption"
              autoresize
              class="chart-body"
              @click="handleAccountTypeClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>合作模式營收分布</h3>
              <p>可點擊下鑽合作模式</p>
            </header>
            <VChart
              :option="cooperationDistributionOption"
              autoresize
              class="chart-body"
              @click="handleCooperationClick"
            />
          </article>
          <article class="chart-card xl:col-span-2">
            <header class="chart-header">
              <h3>來源營收集中度</h3>
              <p>Top 客戶與其他來源分布</p>
            </header>
            <VChart
              :option="concentrationOption"
              autoresize
              class="chart-body chart-body-wide"
              @click="handleCustomerClick"
            />
          </article>
        </div>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">營收價值與貢獻分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>Top 客戶營收排行</h3>
              <p>可點擊下鑽客戶</p>
            </header>
            <VChart
              :option="topCustomerOption"
              autoresize
              class="chart-body"
              @click="handleCustomerClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>Top 夥伴營收排行</h3>
              <p>可點擊下鑽夥伴</p>
            </header>
            <VChart
              :option="topPartnerOption"
              autoresize
              class="chart-body"
              @click="handlePartnerClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>Top 產品營收排行</h3>
              <p>可點擊下鑽產品</p>
            </header>
            <VChart
              :option="topProductOption"
              autoresize
              class="chart-body"
              @click="handleProductClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>高成長來源排行</h3>
              <p>可點擊切換高成長來源</p>
            </header>
            <VChart
              :option="highGrowthOption"
              autoresize
              class="chart-body"
              @click="focusGrowth"
            />
          </article>
          <article class="chart-card xl:col-span-2">
            <header class="chart-header">
              <h3>平均來源價值趨勢</h3>
              <p>每月平均來源營收價值</p>
            </header>
            <VChart
              :option="averageSourceValueTrendOption"
              autoresize
              class="chart-body chart-body-wide"
            />
          </article>
        </div>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">異常與風險分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>下滑來源數趨勢</h3>
              <p>近 6 期下滑來源數</p>
            </header>
            <VChart :option="downtrendSourceCountOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>異常波動來源分布</h3>
              <p>異常來源次數排行</p>
            </header>
            <VChart
              :option="anomalySourceOption"
              autoresize
              class="chart-body"
              @click="handleCustomerClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>風險來源分布</h3>
              <p>依地區拆解風險訊號</p>
            </header>
            <VChart
              :option="riskSourceDistributionOption"
              autoresize
              class="chart-body"
              @click="handleRegionClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>成長 / 衰退來源對比</h3>
              <p>各合作模式來源健康度比較</p>
            </header>
            <VChart
              :option="growthDeclineCompareOption"
              autoresize
              class="chart-body"
              @click="handleCooperationClick"
            />
          </article>
          <article class="chart-card xl:col-span-2">
            <header class="chart-header">
              <h3>異常原因分布</h3>
              <p>可點擊下鑽異常來源</p>
            </header>
            <VChart
              :option="anomalyReasonOption"
              autoresize
              class="chart-body chart-body-wide"
              @click="handleAnomalyReasonClick"
            />
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
          <ElTableColumn label="來源" min-width="260">
            <template #default="{ row }">
              <button type="button" class="grid gap-1 text-left" @click="openDetail(row)">
                <span class="font-semibold text-[#303133] hover:text-[#409eff]">{{
                  row.sourceName
                }}</span>
                <span class="text-xs text-slate-500">{{ row.sourceType }}</span>
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="地區" min-width="120">
            <template #default="{ row }">{{ row.region }}</template>
          </ElTableColumn>

          <ElTableColumn label="Gross" min-width="130" align="right">
            <template #default="{ row }">{{ formatCurrency(row.grossRevenue) }}</template>
          </ElTableColumn>

          <ElTableColumn label="Net" min-width="130" align="right">
            <template #default="{ row }">{{ formatCurrency(row.netRevenue) }}</template>
          </ElTableColumn>

          <ElTableColumn label="成長率" min-width="110" align="right">
            <template #default="{ row }">
              <span
                :class="
                  row.growthRate >= 20
                    ? 'text-emerald-600 font-medium'
                    : row.growthRate <= -15
                    ? 'text-rose-600 font-medium'
                    : ''
                "
              >
                {{ formatPercent(row.growthRate) }}
              </span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="占總營收比" min-width="120" align="right">
            <template #default="{ row }">{{ formatPercent(row.shareRate) }}</template>
          </ElTableColumn>

          <ElTableColumn label="最近期間營收" min-width="140" align="right">
            <template #default="{ row }">{{
              formatCurrency(row.latestRevenue)
            }}</template>
          </ElTableColumn>

          <ElTableColumn label="風險狀態" min-width="130">
            <template #default="{ row }">
              <ElTag
                :type="row.isHighRisk ? 'danger' : 'success'"
                size="small"
                effect="light"
              >
                {{ riskSummary(row) }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="異常狀態" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
              <span
                :class="
                  row.anomalyReasons?.length
                    ? 'text-rose-600 font-medium'
                    : 'text-slate-500'
                "
              >
                {{ anomalySummary(row) }}
              </span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <ElButton text type="primary" @click="openDetail(row)">查看來源</ElButton>
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
