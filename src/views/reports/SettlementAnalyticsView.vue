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
import { accountList, regionOptions } from "../../data/accounts";
import { contractList } from "../../data/contracts";
import { opportunityList } from "../../data/opportunities";
import { projectList } from "../../data/projects";
import {
  cooperationModeMap,
  currencyOptions as settlementCurrencyOptions,
  settlementStatusMap,
} from "../../data/partnerSettlements";
import { usePartnerSettlementStore } from "../../composables/usePartnerSettlementStore";

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
const { settlements } = usePartnerSettlementStore();

const loading = ref(false);
const filterPanelOpen = ref(false);
const detailTab = ref("high_settlement");
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
  { value: "commission", label: "分潤總額視角" },
  { value: "actual_payable", label: "應付淨額視角" },
];

const fxRateToTwd = {
  TWD: 1,
  USD: 31.5,
  JPY: 0.22,
  EUR: 34.2,
};

const accountById = new Map(accountList.map((item) => [item.id, item]));
const opportunityById = new Map(opportunityList.map((item) => [item.id, item]));
const contractById = new Map(contractList.map((item) => [item.id, item]));

const projectByOpportunityId = projectList.reduce((map, item) => {
  if (item.opportunityId && !map.has(item.opportunityId)) {
    map.set(item.opportunityId, item);
  }

  return map;
}, new Map());

const cooperationLabelMap = Object.fromEntries(
  Object.entries(cooperationModeMap).map(([value, meta]) => [value, meta.label])
);

const statusFilterOptions = [
  { value: "all", label: "全部分潤狀態" },
  ...Object.entries(settlementStatusMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const cooperationFilterOptions = [
  { value: "all", label: "全部合作模式" },
  ...Object.entries(cooperationModeMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

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
    return `較前期 ${diff >= 0 ? "+" : ""}${Math.round(diff).toLocaleString("zh-TW")}`;
  }

  const ratio = (diff / Math.abs(previousNumber)) * 100;
  return `較前期 ${diff >= 0 ? "+" : ""}${Math.round(diff).toLocaleString("zh-TW")} (${ratio >= 0 ? "+" : ""}${ratio.toFixed(1)}%)`;
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

function quantile(values, ratio) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const pos = Math.floor((sorted.length - 1) * ratio);
  return sorted[pos];
}

function getMetricValue(item, metricView = "commission") {
  if (metricView === "actual_payable") {
    return Number(item.actualPayableAmountTwd || 0);
  }

  return Number(item.commissionAmountTwd || 0);
}

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

const settlementRecords = computed(() =>
  settlements.value
    .filter((item) => Number(item.commissionValue || 0) >= 0)
    .map((raw) => {
      const opportunity = opportunityById.get(raw.opportunityId);
      const account = accountById.get(opportunity?.accountId || "");
      const project = projectByOpportunityId.get(raw.opportunityId);
      const contract = contractById.get(raw.contractId || "");

      const currencyCode = raw.currency || project?.currency || "TWD";
      const fx = fxRateToTwd[currencyCode] || 1;

      const recognizedAt = raw.recognizedAt || String(raw.createdAt || "").slice(0, 10);
      const dueSettlementAt = raw.dueSettlementAt || "";

      const commissionValue = Number(raw.commissionValue || 0);
      const actualPayableAmount = Number(raw.actualPayableAmount || commissionValue);
      const settledAmount = Number(raw.settledAmount || 0);
      const unpaidAmount = Math.max(
        Number(raw.unpaidAmount ?? commissionValue - settledAmount),
        0
      );
      const settlementBaseAmount = Number(raw.commissionBaseAmount || raw.baseAmount || 0);

      const commissionAmountTwd = commissionValue * fx;
      const actualPayableAmountTwd = actualPayableAmount * fx;
      const settledAmountTwd = settledAmount * fx;
      const unpaidAmountTwd = unpaidAmount * fx;
      const settlementBaseAmountTwd = settlementBaseAmount * fx;

      const settlementRatio =
        settlementBaseAmount > 0 ? (commissionValue / settlementBaseAmount) * 100 : 0;

      const isPaid = raw.status === "settled" || raw.invoiceStatus === "paid" || unpaidAmount <= 0;
      const isPendingPayout =
        unpaidAmount > 0 && !["cancelled", "settled"].includes(raw.status);
      const isConfirmed =
        ["pending_invoice", "pending_settlement", "settled"].includes(raw.status) &&
        raw.reconciliationStatus === "completed";

      const dueTs = toTimestamp(dueSettlementAt);
      const isOverduePayout = isPendingPayout && dueTs > 0 && dueTs < nowTs;
      const isDisputed =
        raw.isException ||
        raw.status === "exception" ||
        raw.reconciliationStatus === "disputed" ||
        raw.invoiceStatus === "rejected";
      const isPendingConfirmationTooLong =
        raw.status === "pending_confirmation" &&
        nowTs - toTimestamp(recognizedAt) > 14 * dayMs;

      const anomalyReasons = [
        raw.exceptionReason || "",
        raw.reconciliationStatus === "disputed" ? "對帳爭議" : "",
        raw.invoiceStatus === "rejected" ? "請款退回" : "",
        isOverduePayout ? "逾期未發放" : "",
        isPendingConfirmationTooLong ? "待確認逾時" : "",
        Math.abs(Number(raw.adjustmentAmount || 0)) > commissionValue * 0.3
          ? "調整幅度偏高"
          : "",
      ]
        .map((item) => String(item || "").trim())
        .filter(Boolean);

      const riskSignals = [
        settlementRatio >= 25 ? "分潤占比偏高" : "",
        isOverduePayout ? "發放逾期" : "",
        isDisputed ? "對帳 / 請款異常" : "",
        isPendingConfirmationTooLong ? "待確認過久" : "",
      ]
        .map((item) => String(item || "").trim())
        .filter(Boolean);

      return {
        id: raw.id,
        settlementNo: raw.commissionNo,
        partnerId: raw.partnerId,
        partnerName: raw.partnerName,
        partnerType: raw.partnerType,
        sourceType: raw.sourceType,
        sourceName: raw.sourceName,
        opportunityId: raw.opportunityId,
        opportunityName: raw.opportunityName || opportunity?.name || "-",
        accountId: opportunity?.accountId || "",
        accountName: account?.companyName || "-",
        region: account?.region || opportunity?.region || "未分類",
        contractId: raw.contractId || "",
        contractName: raw.contractName || contract?.contractName || "未綁定合約",
        projectId: project?.id || "",
        projectName: project?.projectName || "未分類產品",
        cooperationMode: raw.cooperationMode,
        cooperationModeLabel: cooperationLabelMap[raw.cooperationMode] || raw.cooperationMode,
        status: raw.status,
        statusLabel: settlementStatusMap[raw.status]?.label || raw.status,
        statusType: settlementStatusMap[raw.status]?.type || "info",
        reconciliationStatus: raw.reconciliationStatus,
        invoiceStatus: raw.invoiceStatus,
        ownerName: raw.ownerName || "-",
        recognizedAt,
        dueSettlementAt,
        settledAt: raw.settledAt || "",
        currencyCode,
        fx,
        commissionValue,
        commissionAmountTwd,
        actualPayableAmount,
        actualPayableAmountTwd,
        settledAmount,
        settledAmountTwd,
        unpaidAmount,
        unpaidAmountTwd,
        settlementBaseAmount,
        settlementBaseAmountTwd,
        settlementRatio,
        isConfirmed,
        isPaid,
        isPendingPayout,
        isOverduePayout,
        isDisputed,
        anomalyReasons: [...new Set(anomalyReasons)],
        riskSignals: [...new Set(riskSignals)],
        isHighRisk: [...new Set(riskSignals)].length > 0,
        notes: raw.notes || "",
        updatedAt: raw.updatedAt,
      };
    })
);

const partnerFilterOptions = computed(() => [
  { value: "all", label: "全部夥伴" },
  ...[...new Map(settlementRecords.value.map((item) => [item.partnerId, item.partnerName])).entries()]
    .sort((a, b) => String(a[1]).localeCompare(String(b[1]), "zh-Hant"))
    .map(([value, label]) => ({ value, label })),
]);

const customerFilterOptions = computed(() => [
  { value: "all", label: "全部客戶" },
  ...[...new Map(settlementRecords.value.filter((item) => item.accountId).map((item) => [item.accountId, item.accountName])).entries()]
    .sort((a, b) => String(a[1]).localeCompare(String(b[1]), "zh-Hant"))
    .map(([value, label]) => ({ value, label })),
]);

const productFilterOptions = computed(() => [
  { value: "all", label: "全部產品 / 專案" },
  ...[...new Map(settlementRecords.value.map((item) => [item.projectId || item.projectName, item.projectName])).entries()]
    .sort((a, b) => String(a[1]).localeCompare(String(b[1]), "zh-Hant"))
    .map(([value, label]) => ({ value, label })),
]);

const contractFilterOptions = computed(() => [
  { value: "all", label: "全部合約" },
  ...[...new Map(settlementRecords.value.filter((item) => item.contractId).map((item) => [item.contractId, item.contractName])).entries()]
    .sort((a, b) => String(a[1]).localeCompare(String(b[1]), "zh-Hant"))
    .map(([value, label]) => ({ value, label })),
]);

const currencyOptions = computed(() => {
  const available = new Set(
    settlementRecords.value.map((item) => item.currencyCode).filter(Boolean)
  );

  return settlementCurrencyOptions.filter(
    (item) => item.value === "all" || available.has(item.value)
  );
});

const filters = reactive({
  keyword: "",
  dateRange: [],
  partnerId: "all",
  customerId: "all",
  cooperationMode: "all",
  productKey: "all",
  region: "all",
  contractId: "all",
  status: "all",
  currencyCode: "all",
  metricView: "commission",
  isPendingPayout: "all",
  hasException: "all",
  isHighSettlement: "all",
  isHighGrowth: "all",
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

    const value = getMetricValue(item, filters.metricView);
    const dateTs = toTimestamp(item.recognizedAt);

    if (dateTs >= currentPeriodRange.value.start && dateTs <= currentPeriodRange.value.end) {
      row.current += value;
      row.recent += value;
    }

    if (dateTs >= previousPeriodRange.value.start && dateTs <= previousPeriodRange.value.end) {
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

function matchesBaseFilters(item) {
  const keyword = filters.keyword.trim().toLowerCase();

  const matchesKeyword =
    keyword.length === 0 ||
    item.partnerName.toLowerCase().includes(keyword) ||
    item.settlementNo.toLowerCase().includes(keyword) ||
    item.sourceName.toLowerCase().includes(keyword) ||
    item.contractName.toLowerCase().includes(keyword) ||
    item.projectName.toLowerCase().includes(keyword);

  const matchesPartner = filters.partnerId === "all" || item.partnerId === filters.partnerId;
  const matchesCustomer = filters.customerId === "all" || item.accountId === filters.customerId;
  const matchesCooperation =
    filters.cooperationMode === "all" || item.cooperationMode === filters.cooperationMode;
  const matchesProduct =
    filters.productKey === "all" ||
    item.projectId === filters.productKey ||
    item.projectName === filters.productKey;
  const matchesRegion = filters.region === "all" || item.region === filters.region;
  const matchesContract = filters.contractId === "all" || item.contractId === filters.contractId;
  const matchesStatus = filters.status === "all" || item.status === filters.status;
  const matchesCurrency =
    filters.currencyCode === "all" || item.currencyCode === filters.currencyCode;
  const matchesPending = matchesYesNo(item.isPendingPayout, filters.isPendingPayout);
  const matchesException = matchesYesNo(item.isDisputed, filters.hasException);
  const matchesDrill =
    drillState.anomalyReason.length === 0 ||
    item.anomalyReasons.includes(drillState.anomalyReason);

  return (
    matchesKeyword &&
    matchesPartner &&
    matchesCustomer &&
    matchesCooperation &&
    matchesProduct &&
    matchesRegion &&
    matchesContract &&
    matchesStatus &&
    matchesCurrency &&
    matchesPending &&
    matchesException &&
    matchesDrill
  );
}

const baseFilteredRecords = computed(() =>
  settlementRecords.value.filter((item) => matchesBaseFilters(item))
);

const partnerStatsMap = computed(() =>
  buildDimensionStats(baseFilteredRecords.value, (item) => item.partnerId)
);

const contractStatsMap = computed(() =>
  buildDimensionStats(baseFilteredRecords.value, (item) => item.contractId || item.contractName)
);

const productStatsMap = computed(() =>
  buildDimensionStats(baseFilteredRecords.value, (item) => item.projectId || item.projectName)
);

const partnerHighSettlementThreshold = computed(() => {
  const values = [...partnerStatsMap.value.values()]
    .map((item) => Number(item.current || 0))
    .filter((value) => value > 0);

  return quantile(values, 0.75);
});

const enrichedRecords = computed(() =>
  baseFilteredRecords.value.map((item) => {
    const partnerStats = partnerStatsMap.value.get(item.partnerId) || {
      growthRate: 0,
      current: 0,
    };

    const isHighGrowth = partnerStats.growthRate >= 25 && partnerStats.current > 0;
    const isHighSettlement =
      partnerStats.current >= partnerHighSettlementThreshold.value &&
      partnerStats.current > 0;

    return {
      ...item,
      sourceGrowthRate: partnerStats.growthRate,
      isHighGrowth,
      isHighSettlement,
    };
  })
);

const filteredRecords = computed(() =>
  enrichedRecords.value.filter((item) => {
    const matchesDate = isDateWithinRange(item.recognizedAt, filters.dateRange);
    const matchesHighSettlement = matchesYesNo(
      item.isHighSettlement,
      filters.isHighSettlement
    );
    const matchesHighGrowth = matchesYesNo(item.isHighGrowth, filters.isHighGrowth);

    return matchesDate && matchesHighSettlement && matchesHighGrowth;
  })
);

function buildPeriodMetrics(recordsList, range) {
  const periodRows = recordsList.filter((item) => {
    const ts = toTimestamp(item.recognizedAt);
    return ts >= range.start && ts <= range.end;
  });

  const commissionTotal = periodRows.reduce(
    (sum, item) => sum + Number(item.commissionAmountTwd || 0),
    0
  );
  const revenueTotal = periodRows.reduce(
    (sum, item) => sum + Number(item.settlementBaseAmountTwd || 0),
    0
  );

  const ratio = revenueTotal === 0 ? 0 : (commissionTotal / revenueTotal) * 100;
  const averagePerCase = periodRows.length === 0 ? 0 : commissionTotal / periodRows.length;

  const highSettlementTargets = new Set(
    periodRows
      .filter((item) => item.isHighSettlement)
      .map((item) => item.partnerId)
      .filter(Boolean)
  );

  const highGrowthSources = new Set(
    periodRows
      .filter((item) => item.isHighGrowth)
      .map((item) => item.partnerId)
      .filter(Boolean)
  );

  const pendingPayoutTotal = periodRows
    .filter((item) => item.isPendingPayout)
    .reduce((sum, item) => sum + Number(item.unpaidAmountTwd || 0), 0);

  const exceptionCount = periodRows.filter((item) => item.isDisputed).length;

  return {
    commissionTotal,
    ratio,
    newCaseCount: periodRows.length,
    averagePerCase,
    highSettlementTargetCount: highSettlementTargets.size,
    highGrowthSourceCount: highGrowthSources.size,
    pendingPayoutTotal,
    exceptionCount,
  };
}

const currentMetrics = computed(() =>
  buildPeriodMetrics(baseFilteredRecords.value, currentPeriodRange.value)
);

const previousMetrics = computed(() =>
  buildPeriodMetrics(baseFilteredRecords.value, previousPeriodRange.value)
);

function focusPendingPayout() {
  filters.isPendingPayout = "yes";
  detailTab.value = "pending_payout";
}

function focusException() {
  filters.hasException = "yes";
  detailTab.value = "exception_cases";
}

function focusHighGrowth() {
  filters.isHighGrowth = "yes";
  detailTab.value = "high_growth";
}

function focusHighRatio() {
  detailTab.value = "high_ratio";
}

const kpiCards = computed(() => [
  {
    label: "分潤總額",
    value: formatCurrency(currentMetrics.value.commissionTotal),
    delta: formatDelta(currentMetrics.value.commissionTotal, previousMetrics.value.commissionTotal),
  },
  {
    label: "分潤占營收比",
    value: formatPercent(currentMetrics.value.ratio),
    delta: formatDelta(currentMetrics.value.ratio, previousMetrics.value.ratio, true),
    action: focusHighRatio,
  },
  {
    label: "本期新增分潤案件數",
    value: `${currentMetrics.value.newCaseCount} 筆`,
    delta: formatDelta(currentMetrics.value.newCaseCount, previousMetrics.value.newCaseCount),
  },
  {
    label: "平均單筆分潤金額",
    value: formatCurrency(currentMetrics.value.averagePerCase),
    delta: formatDelta(
      Math.round(currentMetrics.value.averagePerCase),
      Math.round(previousMetrics.value.averagePerCase)
    ),
  },
  {
    label: "高分潤對象數",
    value: `${currentMetrics.value.highSettlementTargetCount} 個`,
    delta: formatDelta(
      currentMetrics.value.highSettlementTargetCount,
      previousMetrics.value.highSettlementTargetCount
    ),
  },
  {
    label: "高成長分潤來源數",
    value: `${currentMetrics.value.highGrowthSourceCount} 個`,
    delta: formatDelta(
      currentMetrics.value.highGrowthSourceCount,
      previousMetrics.value.highGrowthSourceCount
    ),
    action: focusHighGrowth,
  },
  {
    label: "待發放分潤總額",
    value: formatCurrency(currentMetrics.value.pendingPayoutTotal),
    delta: formatDelta(
      currentMetrics.value.pendingPayoutTotal,
      previousMetrics.value.pendingPayoutTotal
    ),
    action: focusPendingPayout,
  },
  {
    label: "異常 / 爭議分潤案件數",
    value: `${currentMetrics.value.exceptionCount} 筆`,
    delta: formatDelta(currentMetrics.value.exceptionCount, previousMetrics.value.exceptionCount),
    action: focusException,
  },
]);

const recentMonths = computed(() => getRecentMonths(6));

function monthRecords(month) {
  return filteredRecords.value.filter((item) => {
    const ts = toTimestamp(item.recognizedAt);
    return ts >= month.start && ts <= month.end;
  });
}

const settlementTrendOption = computed(() => {
  const points = recentMonths.value.map((month) =>
    monthRecords(month).reduce((sum, item) => sum + Number(item.commissionAmountTwd || 0), 0)
  );

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 36, right: 20, top: 24, bottom: 24 },
    xAxis: { type: "category", data: recentMonths.value.map((item) => item.label) },
    yAxis: { type: "value" },
    series: [
      {
        type: "line",
        smooth: true,
        data: points,
        itemStyle: { color: "#2563eb" },
        areaStyle: { color: "rgba(37, 99, 235, 0.14)" },
      },
    ],
  };
});

const settlementRatioTrendOption = computed(() => {
  const ratioPoints = recentMonths.value.map((month) => {
    const rows = monthRecords(month);
    const totalSettlement = rows.reduce(
      (sum, item) => sum + Number(item.commissionAmountTwd || 0),
      0
    );
    const totalRevenue = rows.reduce(
      (sum, item) => sum + Number(item.settlementBaseAmountTwd || 0),
      0
    );

    if (totalRevenue === 0) {
      return 0;
    }

    return Number(((totalSettlement / totalRevenue) * 100).toFixed(1));
  });

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 42, right: 20, top: 24, bottom: 24 },
    xAxis: { type: "category", data: recentMonths.value.map((item) => item.label) },
    yAxis: { type: "value" },
    series: [
      {
        type: "line",
        smooth: true,
        data: ratioPoints,
        itemStyle: { color: "#f59e0b" },
        areaStyle: { color: "rgba(245, 158, 11, 0.16)" },
      },
    ],
  };
});

const periodDistributionOption = computed(() => {
  const points = recentMonths.value.map((month) =>
    monthRecords(month).reduce(
      (sum, item) => sum + getMetricValue(item, filters.metricView),
      0
    )
  );

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 36, right: 20, top: 24, bottom: 24 },
    xAxis: {
      type: "category",
      data: recentMonths.value.map((item) => item.label),
    },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        barMaxWidth: 24,
        data: points,
        itemStyle: {
          color: filters.metricView === "commission" ? "#3b82f6" : "#22c55e",
        },
      },
    ],
  };
});

const statusTrendOption = computed(() => {
  const confirmedSeries = recentMonths.value.map((month) =>
    monthRecords(month)
      .filter((item) => item.isConfirmed)
      .reduce((sum, item) => sum + Number(item.commissionAmountTwd || 0), 0)
  );

  const paidSeries = recentMonths.value.map((month) =>
    monthRecords(month).reduce((sum, item) => sum + Number(item.settledAmountTwd || 0), 0)
  );

  const pendingSeries = recentMonths.value.map((month) =>
    monthRecords(month)
      .filter((item) => item.isPendingPayout)
      .reduce((sum, item) => sum + Number(item.unpaidAmountTwd || 0), 0)
  );

  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 40, right: 18, top: 34, bottom: 24 },
    xAxis: { type: "category", data: recentMonths.value.map((item) => item.label) },
    yAxis: { type: "value" },
    series: [
      {
        name: "已確認",
        type: "bar",
        stack: "status",
        barMaxWidth: 20,
        data: confirmedSeries,
        itemStyle: { color: "#60a5fa" },
      },
      {
        name: "已發放",
        type: "bar",
        stack: "status",
        barMaxWidth: 20,
        data: paidSeries,
        itemStyle: { color: "#22c55e" },
      },
      {
        name: "待發放",
        type: "bar",
        stack: "status",
        barMaxWidth: 20,
        data: pendingSeries,
        itemStyle: { color: "#f59e0b" },
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
      settlementAmountTwd: 0,
      actualPayableAmountTwd: 0,
      revenueAmountTwd: 0,
      unpaidAmountTwd: 0,
      records: [],
    };

    row.settlementAmountTwd += Number(item.commissionAmountTwd || 0);
    row.actualPayableAmountTwd += Number(item.actualPayableAmountTwd || 0);
    row.revenueAmountTwd += Number(item.settlementBaseAmountTwd || 0);
    row.unpaidAmountTwd += Number(item.unpaidAmountTwd || 0);
    row.records.push(item);

    map.set(key, row);
  });

  return [...map.values()];
}

const partnerRows = computed(() =>
  aggregateRowsBy(filteredRecords.value, (item) => item.partnerId, (item) => item.partnerName)
    .map((row) => ({
      ...row,
      partnerId: row.key,
      growthRate: Number(partnerStatsMap.value.get(row.key)?.growthRate || 0),
      ratio:
        row.revenueAmountTwd > 0
          ? (row.settlementAmountTwd / row.revenueAmountTwd) * 100
          : 0,
    }))
    .sort(
      (a, b) =>
        getMetricValue(
          {
            commissionAmountTwd: b.settlementAmountTwd,
            actualPayableAmountTwd: b.actualPayableAmountTwd,
          },
          filters.metricView
        ) -
        getMetricValue(
          {
            commissionAmountTwd: a.settlementAmountTwd,
            actualPayableAmountTwd: a.actualPayableAmountTwd,
          },
          filters.metricView
        )
    )
);

const productRows = computed(() =>
  aggregateRowsBy(
    filteredRecords.value,
    (item) => item.projectId || item.projectName,
    (item) => item.projectName
  )
    .map((row) => ({
      ...row,
      projectId: row.records.find((item) => item.projectId)?.projectId || "",
      growthRate:
        Number(
          productStatsMap.value.get(row.key)?.growthRate ||
            productStatsMap.value.get(row.label)?.growthRate ||
            0
        ) || 0,
      ratio:
        row.revenueAmountTwd > 0
          ? (row.settlementAmountTwd / row.revenueAmountTwd) * 100
          : 0,
    }))
    .sort(
      (a, b) =>
        getMetricValue(
          {
            commissionAmountTwd: b.settlementAmountTwd,
            actualPayableAmountTwd: b.actualPayableAmountTwd,
          },
          filters.metricView
        ) -
        getMetricValue(
          {
            commissionAmountTwd: a.settlementAmountTwd,
            actualPayableAmountTwd: a.actualPayableAmountTwd,
          },
          filters.metricView
        )
    )
);

const regionRows = computed(() =>
  aggregateRowsBy(filteredRecords.value, (item) => item.region, (item) => item.region)
    .map((row) => ({
      ...row,
      ratio:
        row.revenueAmountTwd > 0
          ? (row.settlementAmountTwd / row.revenueAmountTwd) * 100
          : 0,
    }))
    .sort(
      (a, b) =>
        getMetricValue(
          {
            commissionAmountTwd: b.settlementAmountTwd,
            actualPayableAmountTwd: b.actualPayableAmountTwd,
          },
          filters.metricView
        ) -
        getMetricValue(
          {
            commissionAmountTwd: a.settlementAmountTwd,
            actualPayableAmountTwd: a.actualPayableAmountTwd,
          },
          filters.metricView
        )
    )
);

const cooperationRows = computed(() =>
  aggregateRowsBy(
    filteredRecords.value,
    (item) => item.cooperationMode,
    (item) => item.cooperationModeLabel
  )
    .map((row) => ({
      ...row,
      mode: row.key,
      ratio:
        row.revenueAmountTwd > 0
          ? (row.settlementAmountTwd / row.revenueAmountTwd) * 100
          : 0,
    }))
    .sort(
      (a, b) =>
        getMetricValue(
          {
            commissionAmountTwd: b.settlementAmountTwd,
            actualPayableAmountTwd: b.actualPayableAmountTwd,
          },
          filters.metricView
        ) -
        getMetricValue(
          {
            commissionAmountTwd: a.settlementAmountTwd,
            actualPayableAmountTwd: a.actualPayableAmountTwd,
          },
          filters.metricView
        )
    )
);

const contractRows = computed(() =>
  aggregateRowsBy(
    filteredRecords.value,
    (item) => item.contractId || item.contractName,
    (item) => item.contractName
  )
    .map((row) => ({
      ...row,
      contractId: row.records.find((item) => item.contractId)?.contractId || "",
      growthRate:
        Number(
          contractStatsMap.value.get(row.key)?.growthRate ||
            contractStatsMap.value.get(row.label)?.growthRate ||
            0
        ) || 0,
      ratio:
        row.revenueAmountTwd > 0
          ? (row.settlementAmountTwd / row.revenueAmountTwd) * 100
          : 0,
    }))
    .sort(
      (a, b) =>
        getMetricValue(
          {
            commissionAmountTwd: b.settlementAmountTwd,
            actualPayableAmountTwd: b.actualPayableAmountTwd,
          },
          filters.metricView
        ) -
        getMetricValue(
          {
            commissionAmountTwd: a.settlementAmountTwd,
            actualPayableAmountTwd: a.actualPayableAmountTwd,
          },
          filters.metricView
        )
    )
);

const regionDistributionOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 76, right: 20, top: 22, bottom: 24 },
  xAxis: { type: "value" },
  yAxis: { type: "category", data: regionRows.value.map((item) => item.label) },
  series: [
    {
      type: "bar",
      barMaxWidth: 16,
      data: regionRows.value.map((item) => ({
        value: getMetricValue(
          {
            commissionAmountTwd: item.settlementAmountTwd,
            actualPayableAmountTwd: item.actualPayableAmountTwd,
          },
          filters.metricView
        ),
        key: item.key,
      })),
      itemStyle: { color: "#0284c7" },
    },
  ],
}));

const productDistributionOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 180, right: 20, top: 22, bottom: 24 },
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
        value: getMetricValue(
          {
            commissionAmountTwd: item.settlementAmountTwd,
            actualPayableAmountTwd: item.actualPayableAmountTwd,
          },
          filters.metricView
        ),
        key: item.projectId || item.key,
      })),
      itemStyle: { color: "#6366f1" },
    },
  ],
}));

const partnerDistributionOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 170, right: 20, top: 20, bottom: 24 },
  xAxis: { type: "value" },
  yAxis: {
    type: "category",
    data: partnerRows.value.slice(0, 8).map((item) => item.label),
  },
  series: [
    {
      type: "bar",
      barMaxWidth: 14,
      data: partnerRows.value.slice(0, 8).map((item) => ({
        value: getMetricValue(
          {
            commissionAmountTwd: item.settlementAmountTwd,
            actualPayableAmountTwd: item.actualPayableAmountTwd,
          },
          filters.metricView
        ),
        key: item.partnerId,
      })),
      itemStyle: { color: "#14b8a6" },
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
        value: getMetricValue(
          {
            commissionAmountTwd: item.settlementAmountTwd,
            actualPayableAmountTwd: item.actualPayableAmountTwd,
          },
          filters.metricView
        ),
        key: item.mode,
      })),
    },
  ],
}));

const concentrationOption = computed(() => {
  const rows = partnerRows.value.slice(0, 10);
  const total = partnerRows.value.reduce(
    (sum, item) =>
      sum +
      getMetricValue(
        {
          commissionAmountTwd: item.settlementAmountTwd,
          actualPayableAmountTwd: item.actualPayableAmountTwd,
        },
        filters.metricView
      ),
    0
  );

  const topTotal = rows.reduce(
    (sum, item) =>
      sum +
      getMetricValue(
        {
          commissionAmountTwd: item.settlementAmountTwd,
          actualPayableAmountTwd: item.actualPayableAmountTwd,
        },
        filters.metricView
      ),
    0
  );

  const chartRows = rows.map((item) => ({
    label: item.label,
    value: getMetricValue(
      {
        commissionAmountTwd: item.settlementAmountTwd,
        actualPayableAmountTwd: item.actualPayableAmountTwd,
      },
      filters.metricView
    ),
    key: item.partnerId,
  }));

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
        data: chartRows
          .map((item) => ({ value: item.value, key: item.key }))
          .reverse(),
        itemStyle: { color: "#a855f7" },
      },
    ],
  };
});

const topContractOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 180, right: 20, top: 20, bottom: 24 },
  xAxis: { type: "value" },
  yAxis: {
    type: "category",
    data: contractRows.value.slice(0, 8).map((item) => item.label),
  },
  series: [
    {
      type: "bar",
      barMaxWidth: 14,
      data: contractRows.value.slice(0, 8).map((item) => ({
        value: getMetricValue(
          {
            commissionAmountTwd: item.settlementAmountTwd,
            actualPayableAmountTwd: item.actualPayableAmountTwd,
          },
          filters.metricView
        ),
        key: item.contractId || item.key,
      })),
      itemStyle: { color: "#f97316" },
    },
  ],
}));

const highGrowthRows = computed(() =>
  partnerRows.value
    .filter((item) => item.growthRate >= 25)
    .sort((a, b) => b.growthRate - a.growthRate)
);

const highGrowthOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 170, right: 20, top: 20, bottom: 24 },
  xAxis: { type: "value" },
  yAxis: {
    type: "category",
    data: highGrowthRows.value.slice(0, 8).map((item) => item.label),
  },
  series: [
    {
      type: "bar",
      barMaxWidth: 14,
      data: highGrowthRows.value
        .slice(0, 8)
        .map((item) => ({ value: Number(item.growthRate || 0), key: item.partnerId })),
      itemStyle: { color: "#22c55e" },
    },
  ],
}));

const averageUnitSettlementTrendOption = computed(() => {
  const points = recentMonths.value.map((month) => {
    const rows = monthRecords(month);
    if (rows.length === 0) {
      return 0;
    }

    const total = rows.reduce(
      (sum, item) => sum + Number(item.commissionAmountTwd || 0),
      0
    );

    return Math.round(total / rows.length);
  });

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 40, right: 20, top: 24, bottom: 24 },
    xAxis: { type: "category", data: recentMonths.value.map((item) => item.label) },
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

const highRatioRows = computed(() =>
  contractRows.value
    .filter((item) => item.ratio >= 20)
    .sort((a, b) => b.ratio - a.ratio)
);

const highRatioRankingOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 190, right: 20, top: 20, bottom: 24 },
  xAxis: { type: "value" },
  yAxis: {
    type: "category",
    data: highRatioRows.value.slice(0, 8).map((item) => item.label),
  },
  series: [
    {
      type: "bar",
      barMaxWidth: 14,
      data: highRatioRows.value
        .slice(0, 8)
        .map((item) => ({ value: Number(item.ratio || 0), key: item.contractId || item.key })),
      itemStyle: { color: "#ef4444" },
    },
  ],
}));

const pendingPayoutTrendOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 36, right: 20, top: 24, bottom: 24 },
  xAxis: { type: "category", data: recentMonths.value.map((item) => item.label) },
  yAxis: { type: "value" },
  series: [
    {
      type: "bar",
      barMaxWidth: 24,
      data: recentMonths.value.map((month) =>
        monthRecords(month)
          .filter((item) => item.isPendingPayout)
          .reduce((sum, item) => sum + Number(item.unpaidAmountTwd || 0), 0)
      ),
      itemStyle: { color: "#f59e0b" },
    },
  ],
}));

const anomalyTrendOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 40, right: 20, top: 24, bottom: 24 },
  xAxis: { type: "category", data: recentMonths.value.map((item) => item.label) },
  yAxis: { type: "value" },
  series: [
    {
      type: "line",
      smooth: true,
      data: recentMonths.value.map((month) =>
        monthRecords(month).filter((item) => item.isDisputed).length
      ),
      itemStyle: { color: "#e11d48" },
      areaStyle: { color: "rgba(225, 29, 72, 0.12)" },
    },
  ],
}));

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
  yAxis: {
    type: "category",
    data: anomalyReasonRows.value.map((item) => item.name),
  },
  series: [
    {
      type: "bar",
      barMaxWidth: 14,
      data: anomalyReasonRows.value.map((item) => ({ value: item.value, key: item.name })),
      itemStyle: { color: "#fb7185" },
    },
  ],
}));

const highRiskSourceDistributionOption = computed(() => {
  const map = new Map();

  filteredRecords.value.forEach((item) => {
    if (!item.isHighRisk) {
      return;
    }

    const key = item.cooperationMode;
    const row = map.get(key) || {
      key,
      label: item.cooperationModeLabel,
      ratioRisk: 0,
      overdueRisk: 0,
      disputeRisk: 0,
    };

    if (item.settlementRatio >= 25) {
      row.ratioRisk += 1;
    }

    if (item.isOverduePayout) {
      row.overdueRisk += 1;
    }

    if (item.isDisputed) {
      row.disputeRisk += 1;
    }

    map.set(key, row);
  });

  const rows = [...map.values()].sort(
    (a, b) =>
      b.ratioRisk + b.overdueRisk + b.disputeRisk - (a.ratioRisk + a.overdueRisk + a.disputeRisk)
  );

  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 40, right: 16, top: 34, bottom: 24 },
    xAxis: { type: "category", data: rows.map((item) => item.label) },
    yAxis: { type: "value" },
    series: [
      {
        name: "高占比",
        type: "bar",
        stack: "risk",
        barMaxWidth: 18,
        data: rows.map((item) => item.ratioRisk),
      },
      {
        name: "逾期未發放",
        type: "bar",
        stack: "risk",
        barMaxWidth: 18,
        data: rows.map((item) => item.overdueRisk),
      },
      {
        name: "爭議 / 異常",
        type: "bar",
        stack: "risk",
        barMaxWidth: 18,
        data: rows.map((item) => item.disputeRisk),
      },
    ],
  };
});

const issueStatusStructureOption = computed(() => ({
  tooltip: { trigger: "axis" },
  legend: { top: 0 },
  grid: { left: 40, right: 16, top: 34, bottom: 24 },
  xAxis: { type: "category", data: recentMonths.value.map((item) => item.label) },
  yAxis: { type: "value" },
  series: [
    {
      name: "待確認",
      type: "bar",
      stack: "issue",
      barMaxWidth: 18,
      data: recentMonths.value.map((month) =>
        monthRecords(month).filter((item) => item.status === "pending_confirmation").length
      ),
    },
    {
      name: "待發放",
      type: "bar",
      stack: "issue",
      barMaxWidth: 18,
      data: recentMonths.value.map((month) =>
        monthRecords(month).filter((item) => item.isPendingPayout).length
      ),
    },
    {
      name: "爭議案件",
      type: "bar",
      stack: "issue",
      barMaxWidth: 18,
      data: recentMonths.value.map((month) =>
        monthRecords(month).filter((item) => item.isDisputed).length
      ),
    },
  ],
}));

function handlePartnerClick(params) {
  const value = params?.data?.key;
  if (value && value !== "others") {
    filters.partnerId = value;
  }
}

function handleProductClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.productKey = value;
  }
}

function handleRegionClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.region = value;
  }
}

function handleCooperationClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.cooperationMode = value;
  }
}

function handleContractClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.contractId = value;
  }
}

function handleAnomalyReasonClick(params) {
  const value = params?.data?.key;
  if (value) {
    drillState.anomalyReason = value;
    detailTab.value = "exception_cases";
  }
}

function resetFilters() {
  filters.keyword = "";
  filters.dateRange = [];
  filters.partnerId = "all";
  filters.customerId = "all";
  filters.cooperationMode = "all";
  filters.productKey = "all";
  filters.region = "all";
  filters.contractId = "all";
  filters.status = "all";
  filters.currencyCode = "all";
  filters.metricView = "commission";
  filters.isPendingPayout = "all";
  filters.hasException = "all";
  filters.isHighSettlement = "all";
  filters.isHighGrowth = "all";
  drillState.anomalyReason = "";
  detailTab.value = "high_settlement";
  currentPage.value = 1;
}

function dominantValue(values, fallback = "-") {
  if (!values.length) {
    return fallback;
  }

  const map = values.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});

  const top = Object.entries(map).sort((a, b) => b[1] - a[1]);
  return top[0]?.[0] || fallback;
}

function buildAggregatedDetailRows(rows, options = {}) {
  const { sourceType = "來源", keyGetter, labelGetter, statsMap } = options;
  const map = new Map();

  rows.forEach((item) => {
    const key = keyGetter(item);
    const row = map.get(key) || {
      key,
      sourceName: labelGetter(item),
      sourceType,
      region: item.region || "-",
      cooperationMode: item.cooperationMode,
      cooperationModeLabel: item.cooperationModeLabel || "-",
      settlementAmount: 0,
      actualPayableAmount: 0,
      revenueAmount: 0,
      unpaidAmount: 0,
      anomalyReasons: [],
      riskCount: 0,
      statusPool: [],
      invoiceStatusPool: [],
      latestPeriodDate: 0,
      latestPeriod: "-",
      jumpType: "finance",
      jumpId: "",
    };

    row.settlementAmount += Number(item.commissionAmountTwd || 0);
    row.actualPayableAmount += Number(item.actualPayableAmountTwd || 0);
    row.revenueAmount += Number(item.settlementBaseAmountTwd || 0);
    row.unpaidAmount += Number(item.unpaidAmountTwd || 0);
    row.anomalyReasons.push(...(item.anomalyReasons || []));

    if (item.isHighRisk) {
      row.riskCount += 1;
    }

    row.statusPool.push(item.status);
    row.invoiceStatusPool.push(item.invoiceStatus);

    const ts = toTimestamp(item.recognizedAt);
    if (ts > row.latestPeriodDate) {
      row.latestPeriodDate = ts;
      row.latestPeriod = formatDate(item.recognizedAt);
    }

    if (item.projectId && sourceType === "產品") {
      row.jumpType = "project";
      row.jumpId = item.projectId;
    }

    if (item.contractId && sourceType === "合約") {
      row.jumpType = "contract";
      row.jumpId = item.contractId;
    }

    if (item.partnerId && sourceType === "夥伴") {
      row.jumpType = "partner";
      row.jumpId = item.partnerId;
    }

    map.set(key, row);
  });

  const result = [...map.values()].map((row) => {
    const stats = statsMap?.get(row.key) || statsMap?.get(row.sourceName) || {
      growthRate: 0,
      recent: 0,
    };

    const status = dominantValue(row.statusPool, "-");
    const statusLabel = settlementStatusMap[status]?.label || (row.statusPool.length > 1 ? "多狀態" : "-");

    let payoutStatus = "待請款";
    if (row.unpaidAmount <= 0) {
      payoutStatus = "已發放";
    } else if (
      row.statusPool.includes("exception") ||
      row.invoiceStatusPool.includes("rejected")
    ) {
      payoutStatus = "發放異常";
    } else if (
      row.invoiceStatusPool.includes("submitted") ||
      row.invoiceStatusPool.includes("approved") ||
      row.statusPool.includes("pending_settlement")
    ) {
      payoutStatus = "待發放";
    }

    return {
      ...row,
      growthRate: Number(stats.growthRate || 0),
      recentAmount: Number(stats.recent || 0),
      ratioRate: row.revenueAmount > 0 ? (row.settlementAmount / row.revenueAmount) * 100 : 0,
      isException: row.anomalyReasons.length > 0,
      anomalyReasons: [...new Set(row.anomalyReasons)].filter(Boolean),
      statusLabel,
      payoutStatus,
    };
  });

  const total = result.reduce(
    (sum, row) =>
      sum +
      getMetricValue(
        {
          commissionAmountTwd: row.settlementAmount,
          actualPayableAmountTwd: row.actualPayableAmount,
        },
        filters.metricView
      ),
    0
  );

  return result.map((row) => ({
    ...row,
    shareRate:
      total === 0
        ? 0
        : (getMetricValue(
            {
              commissionAmountTwd: row.settlementAmount,
              actualPayableAmountTwd: row.actualPayableAmount,
            },
            filters.metricView
          ) /
            total) *
          100,
  }));
}

const partnerDetailRows = computed(() =>
  buildAggregatedDetailRows(filteredRecords.value, {
    sourceType: "夥伴",
    keyGetter: (item) => item.partnerId,
    labelGetter: (item) => item.partnerName,
    statsMap: partnerStatsMap.value,
  }).sort(
    (a, b) =>
      getMetricValue(
        {
          commissionAmountTwd: b.settlementAmount,
          actualPayableAmountTwd: b.actualPayableAmount,
        },
        filters.metricView
      ) -
      getMetricValue(
        {
          commissionAmountTwd: a.settlementAmount,
          actualPayableAmountTwd: a.actualPayableAmount,
        },
        filters.metricView
      )
  )
);

const contractDetailRows = computed(() =>
  buildAggregatedDetailRows(filteredRecords.value, {
    sourceType: "合約",
    keyGetter: (item) => item.contractId || item.contractName,
    labelGetter: (item) => item.contractName,
    statsMap: contractStatsMap.value,
  }).sort(
    (a, b) =>
      getMetricValue(
        {
          commissionAmountTwd: b.settlementAmount,
          actualPayableAmountTwd: b.actualPayableAmount,
        },
        filters.metricView
      ) -
      getMetricValue(
        {
          commissionAmountTwd: a.settlementAmount,
          actualPayableAmountTwd: a.actualPayableAmount,
        },
        filters.metricView
      )
  )
);

const productDetailRows = computed(() =>
  buildAggregatedDetailRows(filteredRecords.value, {
    sourceType: "產品",
    keyGetter: (item) => item.projectId || item.projectName,
    labelGetter: (item) => item.projectName,
    statsMap: productStatsMap.value,
  }).sort(
    (a, b) =>
      getMetricValue(
        {
          commissionAmountTwd: b.settlementAmount,
          actualPayableAmountTwd: b.actualPayableAmount,
        },
        filters.metricView
      ) -
      getMetricValue(
        {
          commissionAmountTwd: a.settlementAmount,
          actualPayableAmountTwd: a.actualPayableAmount,
        },
        filters.metricView
      )
  )
);

const settlementCaseRows = computed(() => {
  const total = filteredRecords.value.reduce(
    (sum, item) => sum + getMetricValue(item, filters.metricView),
    0
  );

  return filteredRecords.value.map((item) => ({
    id: item.id,
    sourceName: item.partnerName,
    sourceType: "分潤案件",
    region: item.region,
    cooperationMode: item.cooperationMode,
    cooperationModeLabel: item.cooperationModeLabel,
    settlementAmount: Number(item.commissionAmountTwd || 0),
    actualPayableAmount: Number(item.actualPayableAmountTwd || 0),
    revenueAmount: Number(item.settlementBaseAmountTwd || 0),
    unpaidAmount: Number(item.unpaidAmountTwd || 0),
    ratioRate: Number(item.settlementRatio || 0),
    growthRate: Number(item.sourceGrowthRate || 0),
    recentAmount: Number(item.commissionAmountTwd || 0),
    shareRate: total === 0 ? 0 : (getMetricValue(item, filters.metricView) / total) * 100,
    statusLabel: item.statusLabel,
    payoutStatus: item.isPendingPayout ? "待發放" : "已發放",
    latestPeriod: formatDate(item.recognizedAt),
    isException: item.isDisputed,
    anomalyReasons: item.anomalyReasons,
    settlementNo: item.settlementNo,
    jumpType: "settlement",
    jumpId: item.id,
  }));
});

const detailRowsByTab = computed(() => ({
  high_settlement: partnerDetailRows.value.filter(
    (row) =>
      getMetricValue(
        {
          commissionAmountTwd: row.settlementAmount,
          actualPayableAmountTwd: row.actualPayableAmount,
        },
        filters.metricView
      ) >= partnerHighSettlementThreshold.value
  ),
  high_growth: partnerDetailRows.value.filter((row) => row.growthRate >= 25),
  high_ratio: contractDetailRows.value.filter((row) => row.ratioRate >= 20),
  pending_payout: settlementCaseRows.value.filter((row) => row.unpaidAmount > 0),
  exception_cases: settlementCaseRows.value.filter((row) => row.isException),
  contract_detail: contractDetailRows.value,
  product_detail: productDetailRows.value,
}));

const detailTabs = computed(() => [
  {
    value: "high_settlement",
    label: "高分潤對象",
    count: detailRowsByTab.value.high_settlement.length,
  },
  {
    value: "high_growth",
    label: "高成長分潤來源",
    count: detailRowsByTab.value.high_growth.length,
  },
  {
    value: "high_ratio",
    label: "高分潤占比來源",
    count: detailRowsByTab.value.high_ratio.length,
  },
  {
    value: "pending_payout",
    label: "待發放分潤",
    count: detailRowsByTab.value.pending_payout.length,
  },
  {
    value: "exception_cases",
    label: "異常 / 爭議案件",
    count: detailRowsByTab.value.exception_cases.length,
  },
  {
    value: "contract_detail",
    label: "合約明細",
    count: detailRowsByTab.value.contract_detail.length,
  },
  {
    value: "product_detail",
    label: "產品明細",
    count: detailRowsByTab.value.product_detail.length,
  },
]);

const sortedDetailRows = computed(() => {
  const rows = [...(detailRowsByTab.value[detailTab.value] || [])];

  if (detailTab.value === "high_growth") {
    return rows.sort((a, b) => b.growthRate - a.growthRate);
  }

  if (detailTab.value === "high_ratio") {
    return rows.sort((a, b) => b.ratioRate - a.ratioRate);
  }

  if (detailTab.value === "pending_payout") {
    return rows.sort((a, b) => b.unpaidAmount - a.unpaidAmount);
  }

  return rows.sort(
    (a, b) =>
      getMetricValue(
        {
          commissionAmountTwd: b.settlementAmount,
          actualPayableAmountTwd: b.actualPayableAmount,
        },
        filters.metricView
      ) -
      getMetricValue(
        {
          commissionAmountTwd: a.settlementAmount,
          actualPayableAmountTwd: a.actualPayableAmount,
        },
        filters.metricView
      )
  );
});

const pagedDetailRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedDetailRows.value.slice(start, start + pageSize.value);
});

function anomalySummary(row) {
  if (!row.anomalyReasons?.length) {
    return "-";
  }

  return row.anomalyReasons.slice(0, 2).join("、");
}

function openDetail(row) {
  if (row.jumpType === "settlement" && row.jumpId) {
    router.push({
      name: "partners-settlement-detail",
      params: { settlementId: row.jumpId },
    });
    return;
  }

  if (row.jumpType === "contract" && row.jumpId) {
    router.push({
      name: "contract-detail",
      params: { contractId: row.jumpId },
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

  if (row.jumpType === "partner" && row.jumpId) {
    router.push({
      name: "partners-list",
      query: { partnerId: row.jumpId },
    });
    return;
  }

  router.push({ name: "finance-profit-sharing" });
}

function exportDetailCsv() {
  const header = [
    "來源名稱",
    "對象類型",
    "地區",
    "合作模式",
    "分潤總額(TWD)",
    "對應營收(TWD)",
    "分潤占營收比",
    "分潤狀態",
    "發放狀態",
    "最近結算期間",
    "異常狀態",
  ];

  const rows = sortedDetailRows.value.map((item) => [
    item.sourceName,
    item.sourceType,
    item.region,
    item.cooperationModeLabel,
    Math.round(item.settlementAmount),
    Math.round(item.revenueAmount),
    `${Number(item.ratioRate || 0).toFixed(1)}%`,
    item.statusLabel,
    item.payoutStatus,
    item.latestPeriod,
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
  anchor.download = `settlement-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
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
    filters.partnerId,
    filters.customerId,
    filters.cooperationMode,
    filters.productKey,
    filters.region,
    filters.contractId,
    filters.status,
    filters.currencyCode,
    filters.metricView,
    filters.isPendingPayout,
    filters.hasException,
    filters.isHighSettlement,
    filters.isHighGrowth,
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
            分潤分析
          </h1>
          <p class="text-sm text-slate-500">檢視分潤支出趨勢、成本壓力、結構分布與異常風險</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton :icon="Download" @click="exportDetailCsv">匯出明細</ElButton>
          <ElButton :icon="Refresh" @click="resetFilters">重設篩選</ElButton>
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
              placeholder="搜尋分潤編號 / 夥伴 / 來源 / 合約"
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
              篩選
            </ElButton>
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
                start-placeholder="分潤起日"
                end-placeholder="分潤迄日"
                class="!w-full"
              />
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.partnerId">
                <ElOption
                  v-for="item in partnerFilterOptions"
                  :key="`partner-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.customerId">
                <ElOption
                  v-for="item in customerFilterOptions"
                  :key="`customer-${item.value}`"
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
              <ElSelect v-model="filters.productKey">
                <ElOption
                  v-for="item in productFilterOptions"
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
              <ElSelect v-model="filters.contractId">
                <ElOption
                  v-for="item in contractFilterOptions"
                  :key="`contract-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.status">
                <ElOption
                  v-for="item in statusFilterOptions"
                  :key="`status-${item.value}`"
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
              <ElSelect v-model="filters.isPendingPayout">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`pending-${item.value}`"
                  :label="`待發放：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.hasException">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`exception-${item.value}`"
                  :label="`異常 / 爭議：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.isHighSettlement">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`high-settlement-${item.value}`"
                  :label="`高分潤：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.isHighGrowth">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`high-growth-${item.value}`"
                  :label="`高成長：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </transition>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">分潤趨勢分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>分潤總額趨勢</h3>
              <p>近 6 個月分潤支出變化</p>
            </header>
            <VChart :option="settlementTrendOption" autoresize class="chart-body" />
          </article>

          <article class="chart-card">
            <header class="chart-header">
              <h3>分潤占營收比趨勢</h3>
              <p>觀察分潤成本壓力變化</p>
            </header>
            <VChart :option="settlementRatioTrendOption" autoresize class="chart-body" />
          </article>

          <article class="chart-card">
            <header class="chart-header">
              <h3>期間分潤分布</h3>
              <p>{{ filters.metricView === "commission" ? "分潤總額" : "應付淨額" }}比較</p>
            </header>
            <VChart :option="periodDistributionOption" autoresize class="chart-body" />
          </article>

          <article class="chart-card">
            <header class="chart-header">
              <h3>已確認 / 已發放 / 待發放趨勢</h3>
              <p>同時檢視流程狀態與規模</p>
            </header>
            <VChart :option="statusTrendOption" autoresize class="chart-body" />
          </article>
        </div>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">分潤結構分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>夥伴分潤分布</h3>
              <p>可點擊下鑽夥伴</p>
            </header>
            <VChart
              :option="partnerDistributionOption"
              autoresize
              class="chart-body"
              @click="handlePartnerClick"
            />
          </article>

          <article class="chart-card">
            <header class="chart-header">
              <h3>產品 / 專案分潤分布</h3>
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
              <h3>地區分潤分布</h3>
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
              <h3>合作模式分潤分布</h3>
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
              <h3>分潤集中度</h3>
              <p>Top 夥伴與其他來源結構</p>
            </header>
            <VChart
              :option="concentrationOption"
              autoresize
              class="chart-body chart-body-wide"
              @click="handlePartnerClick"
            />
          </article>
        </div>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">分潤價值與貢獻分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>Top 夥伴分潤排行</h3>
              <p>可點擊下鑽夥伴</p>
            </header>
            <VChart
              :option="partnerDistributionOption"
              autoresize
              class="chart-body"
              @click="handlePartnerClick"
            />
          </article>

          <article class="chart-card">
            <header class="chart-header">
              <h3>Top 合約分潤排行</h3>
              <p>可點擊下鑽合約</p>
            </header>
            <VChart
              :option="topContractOption"
              autoresize
              class="chart-body"
              @click="handleContractClick"
            />
          </article>

          <article class="chart-card">
            <header class="chart-header">
              <h3>Top 產品分潤排行</h3>
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
              <h3>高成長分潤來源排行</h3>
              <p>可點擊聚焦高成長來源</p>
            </header>
            <VChart :option="highGrowthOption" autoresize class="chart-body" @click="focusHighGrowth" />
          </article>

          <article class="chart-card">
            <header class="chart-header">
              <h3>平均單位分潤趨勢</h3>
              <p>每月平均單筆分潤成本</p>
            </header>
            <VChart :option="averageUnitSettlementTrendOption" autoresize class="chart-body" />
          </article>

          <article class="chart-card">
            <header class="chart-header">
              <h3>分潤占營收比排行</h3>
              <p>高占比來源風險</p>
            </header>
            <VChart
              :option="highRatioRankingOption"
              autoresize
              class="chart-body"
              @click="handleContractClick"
            />
          </article>
        </div>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">異常與風險分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>待發放分潤趨勢</h3>
              <p>未付款分潤是否持續累積</p>
            </header>
            <VChart :option="pendingPayoutTrendOption" autoresize class="chart-body" />
          </article>

          <article class="chart-card">
            <header class="chart-header">
              <h3>異常 / 爭議案件趨勢</h3>
              <p>觀察異常案件數是否增加</p>
            </header>
            <VChart :option="anomalyTrendOption" autoresize class="chart-body" />
          </article>

          <article class="chart-card">
            <header class="chart-header">
              <h3>異常原因分布</h3>
              <p>可點擊下鑽異常來源</p>
            </header>
            <VChart
              :option="anomalyReasonOption"
              autoresize
              class="chart-body"
              @click="handleAnomalyReasonClick"
            />
          </article>

          <article class="chart-card">
            <header class="chart-header">
              <h3>高風險分潤來源分布</h3>
              <p>依合作模式拆解風險類型</p>
            </header>
            <VChart
              :option="highRiskSourceDistributionOption"
              autoresize
              class="chart-body"
              @click="handleCooperationClick"
            />
          </article>

          <article class="chart-card xl:col-span-2">
            <header class="chart-header">
              <h3>待確認 / 待發放 / 爭議案件結構</h3>
              <p>問題案件狀態組成趨勢</p>
            </header>
            <VChart
              :option="issueStatusStructureOption"
              autoresize
              class="chart-body chart-body-wide"
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
          <ElTableColumn label="分潤對象" min-width="260">
            <template #default="{ row }">
              <button type="button" class="grid gap-1 text-left" @click="openDetail(row)">
                <span class="font-semibold text-[#303133] hover:text-[#409eff]">{{ row.sourceName }}</span>
                <span class="text-xs text-slate-500">{{ row.sourceType }}</span>
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="地區" min-width="110">
            <template #default="{ row }">{{ row.region }}</template>
          </ElTableColumn>

          <ElTableColumn label="合作模式" min-width="120">
            <template #default="{ row }">{{ row.cooperationModeLabel || "-" }}</template>
          </ElTableColumn>

          <ElTableColumn label="分潤總額" min-width="130" align="right">
            <template #default="{ row }">{{ formatCurrency(row.settlementAmount) }}</template>
          </ElTableColumn>

          <ElTableColumn label="對應營收" min-width="130" align="right">
            <template #default="{ row }">{{ formatCurrency(row.revenueAmount) }}</template>
          </ElTableColumn>

          <ElTableColumn label="分潤占營收比" min-width="130" align="right">
            <template #default="{ row }">
              <span :class="row.ratioRate >= 20 ? 'text-rose-600 font-medium' : ''">{{
                formatPercent(row.ratioRate)
              }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="分潤狀態" min-width="120">
            <template #default="{ row }">
              <ElTag size="small" effect="light">{{ row.statusLabel || "-" }}</ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="發放狀態" min-width="120">
            <template #default="{ row }">
              <ElTag
                size="small"
                effect="light"
                :type="
                  row.payoutStatus === '已發放'
                    ? 'success'
                    : row.payoutStatus === '發放異常'
                      ? 'danger'
                      : 'warning'
                "
              >
                {{ row.payoutStatus || "-" }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="最近結算期間" min-width="130">
            <template #default="{ row }">{{ row.latestPeriod || "-" }}</template>
          </ElTableColumn>

          <ElTableColumn label="異常狀態" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
              <span :class="row.isException ? 'text-rose-600 font-medium' : 'text-slate-500'">
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

        <div class="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-5">
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
