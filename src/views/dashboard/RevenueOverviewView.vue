<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElButton, ElNotification, ElOption, ElSelect } from "element-plus";
import { ArrowRight, Refresh, Share } from "@element-plus/icons-vue";
import VChart from "vue-echarts";
import { ensureDashboardCharts } from "../../components/dashboard/echartsSetup";
import { accountList } from "../../data/accounts";
import { opportunityList } from "../../data/opportunities";
import { userList } from "../../data/users";
import { useAuthSession } from "../../utils/auth";

ensureDashboardCharts();

const router = useRouter();
const { authSession } = useAuthSession();

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW_TS = new Date("2026-04-10T12:00:00+08:00").getTime();

const currentPeriod = ref("month");
const currentScope = ref("mine");
const currentDimension = ref("region");
const auditTab = ref("all");

const periodButtons = [
  { value: "month", label: "月" },
  { value: "quarter", label: "季" },
  { value: "year", label: "年" },
];

const dimensionOptions = [
  { value: "region", label: "地區" },
  { value: "product", label: "產品" },
  { value: "owner", label: "負責人" },
];

const revenueRecords = [
  {
    id: "rev-001",
    recognizedAt: "2025-10-08",
    accountId: "acc-001",
    ownerId: "u-001",
    region: "台灣",
    product: "會員導流方案",
    grossAmount: 1460000,
    netAmount: 1400000,
    outstandingAmount: 180000,
    adjustmentAmount: 30000,
  },
  {
    id: "rev-002",
    recognizedAt: "2025-10-22",
    accountId: "acc-002",
    ownerId: "u-002",
    region: "日本",
    product: "品牌推廣專案",
    grossAmount: 1820000,
    netAmount: 1750000,
    outstandingAmount: 260000,
    adjustmentAmount: 0,
  },
  {
    id: "rev-003",
    recognizedAt: "2025-11-03",
    accountId: "acc-003",
    ownerId: "u-003",
    region: "東南亞",
    product: "支付串接方案",
    grossAmount: 1180000,
    netAmount: 1120000,
    outstandingAmount: 120000,
    adjustmentAmount: 20000,
  },
  {
    id: "rev-004",
    recognizedAt: "2025-11-18",
    accountId: "acc-004",
    ownerId: "u-001",
    region: "台灣",
    product: "通路拓展方案",
    grossAmount: 1640000,
    netAmount: 1580000,
    outstandingAmount: 210000,
    adjustmentAmount: 0,
  },
  {
    id: "rev-005",
    recognizedAt: "2025-11-27",
    accountId: "acc-005",
    ownerId: "u-004",
    region: "北美",
    product: "會員導流方案",
    grossAmount: 940000,
    netAmount: 900000,
    outstandingAmount: 120000,
    adjustmentAmount: 0,
  },
  {
    id: "rev-006",
    recognizedAt: "2025-12-06",
    accountId: "acc-006",
    ownerId: "u-002",
    region: "台灣",
    product: "儲值聯名方案",
    grossAmount: 1360000,
    netAmount: 1290000,
    outstandingAmount: 180000,
    adjustmentAmount: 15000,
  },
  {
    id: "rev-007",
    recognizedAt: "2025-12-14",
    accountId: "acc-007",
    ownerId: "u-003",
    region: "日本",
    product: "內容導流合作",
    grossAmount: 1720000,
    netAmount: 1650000,
    outstandingAmount: 300000,
    adjustmentAmount: 0,
  },
  {
    id: "rev-008",
    recognizedAt: "2025-12-28",
    accountId: "acc-008",
    ownerId: "u-001",
    region: "東南亞",
    product: "品牌推廣專案",
    grossAmount: 1280000,
    netAmount: 1200000,
    outstandingAmount: 200000,
    adjustmentAmount: 25000,
  },
  {
    id: "rev-009",
    recognizedAt: "2026-01-05",
    accountId: "acc-009",
    ownerId: "u-004",
    region: "台灣",
    product: "通路拓展方案",
    grossAmount: 1960000,
    netAmount: 1890000,
    outstandingAmount: 350000,
    adjustmentAmount: 0,
  },
  {
    id: "rev-010",
    recognizedAt: "2026-01-17",
    accountId: "acc-010",
    ownerId: "u-002",
    region: "台灣",
    product: "品牌推廣專案",
    grossAmount: 1240000,
    netAmount: 1180000,
    outstandingAmount: 160000,
    adjustmentAmount: 0,
  },
  {
    id: "rev-011",
    recognizedAt: "2026-01-30",
    accountId: "acc-011",
    ownerId: "u-003",
    region: "日本",
    product: "支付串接方案",
    grossAmount: 1540000,
    netAmount: 1460000,
    outstandingAmount: 240000,
    adjustmentAmount: 18000,
  },
  {
    id: "rev-012",
    recognizedAt: "2026-02-07",
    accountId: "acc-012",
    ownerId: "u-001",
    region: "東南亞",
    product: "內容導流合作",
    grossAmount: 1640000,
    netAmount: 1570000,
    outstandingAmount: 230000,
    adjustmentAmount: 0,
  },
  {
    id: "rev-013",
    recognizedAt: "2026-02-15",
    accountId: "acc-001",
    ownerId: "u-001",
    region: "台灣",
    product: "會員導流方案",
    grossAmount: 2120000,
    netAmount: 2030000,
    outstandingAmount: 410000,
    adjustmentAmount: 0,
  },
  {
    id: "rev-014",
    recognizedAt: "2026-02-24",
    accountId: "acc-003",
    ownerId: "u-003",
    region: "東南亞",
    product: "通路拓展方案",
    grossAmount: 1060000,
    netAmount: 980000,
    outstandingAmount: 220000,
    adjustmentAmount: 35000,
  },
  {
    id: "rev-015",
    recognizedAt: "2026-03-03",
    accountId: "acc-004",
    ownerId: "u-004",
    region: "台灣",
    product: "品牌推廣專案",
    grossAmount: 1780000,
    netAmount: 1700000,
    outstandingAmount: 320000,
    adjustmentAmount: 0,
  },
  {
    id: "rev-016",
    recognizedAt: "2026-03-11",
    accountId: "acc-006",
    ownerId: "u-002",
    region: "日本",
    product: "儲值聯名方案",
    grossAmount: 990000,
    netAmount: 930000,
    outstandingAmount: 160000,
    adjustmentAmount: 42000,
  },
  {
    id: "rev-017",
    recognizedAt: "2026-03-19",
    accountId: "acc-008",
    ownerId: "u-003",
    region: "北美",
    product: "內容導流合作",
    grossAmount: 880000,
    netAmount: 840000,
    outstandingAmount: 120000,
    adjustmentAmount: 0,
  },
  {
    id: "rev-018",
    recognizedAt: "2026-03-28",
    accountId: "acc-002",
    ownerId: "u-002",
    region: "日本",
    product: "支付串接方案",
    grossAmount: 1320000,
    netAmount: 1260000,
    outstandingAmount: 210000,
    adjustmentAmount: 0,
  },
  {
    id: "rev-019",
    recognizedAt: "2026-04-01",
    accountId: "acc-001",
    ownerId: "u-001",
    region: "台灣",
    product: "會員導流方案",
    grossAmount: 3200000,
    netAmount: 3150000,
    outstandingAmount: 920000,
    adjustmentAmount: 0,
  },
  {
    id: "rev-020",
    recognizedAt: "2026-04-02",
    accountId: "acc-002",
    ownerId: "u-002",
    region: "日本",
    product: "品牌推廣專案",
    grossAmount: 4200000,
    netAmount: 4080000,
    outstandingAmount: 1680000,
    adjustmentAmount: 100000,
  },
  {
    id: "rev-021",
    recognizedAt: "2026-04-03",
    accountId: "acc-003",
    ownerId: "u-003",
    region: "東南亞",
    product: "支付串接方案",
    grossAmount: 1680000,
    netAmount: 1650000,
    outstandingAmount: 0,
    adjustmentAmount: 0,
  },
  {
    id: "rev-022",
    recognizedAt: "2026-04-04",
    accountId: "acc-004",
    ownerId: "u-001",
    region: "台灣",
    product: "通路拓展方案",
    grossAmount: 2600000,
    netAmount: 2530000,
    outstandingAmount: 1430000,
    adjustmentAmount: 0,
  },
  {
    id: "rev-023",
    recognizedAt: "2026-04-06",
    accountId: "acc-005",
    ownerId: "u-004",
    region: "北美",
    product: "會員導流方案",
    grossAmount: 1450000,
    netAmount: 1390000,
    outstandingAmount: 1390000,
    adjustmentAmount: 0,
  },
  {
    id: "rev-024",
    recognizedAt: "2026-04-08",
    accountId: "acc-010",
    ownerId: "u-002",
    region: "台灣",
    product: "內容導流合作",
    grossAmount: 1230000,
    netAmount: 1180000,
    outstandingAmount: 320000,
    adjustmentAmount: 25000,
  },
  {
    id: "rev-025",
    recognizedAt: "2026-04-09",
    accountId: "acc-012",
    ownerId: "u-002",
    region: "東南亞",
    product: "內容導流合作",
    grossAmount: 1860000,
    netAmount: 1790000,
    outstandingAmount: 0,
    adjustmentAmount: 0,
  },
  {
    id: "rev-026",
    recognizedAt: "2026-04-10",
    accountId: "acc-009",
    ownerId: "u-004",
    region: "台灣",
    product: "儲值聯名方案",
    grossAmount: 980000,
    netAmount: 960000,
    outstandingAmount: 210000,
    adjustmentAmount: 20000,
  },
  {
    id: "rev-027",
    recognizedAt: "2026-04-02",
    accountId: "acc-008",
    ownerId: "u-003",
    region: "北美",
    product: "代理聯運方案",
    grossAmount: 2140000,
    netAmount: 2080000,
    outstandingAmount: 680000,
    adjustmentAmount: 0,
  },
  {
    id: "rev-028",
    recognizedAt: "2026-04-03",
    accountId: "acc-006",
    ownerId: "u-002",
    region: "台灣",
    product: "點數包重啟方案",
    grossAmount: 760000,
    netAmount: 730000,
    outstandingAmount: 160000,
    adjustmentAmount: 10000,
  },
  {
    id: "rev-029",
    recognizedAt: "2026-04-05",
    accountId: "acc-011",
    ownerId: "u-004",
    region: "東南亞",
    product: "電商上架合作",
    grossAmount: 1180000,
    netAmount: 1130000,
    outstandingAmount: 450000,
    adjustmentAmount: 0,
  },
  {
    id: "rev-030",
    recognizedAt: "2026-04-06",
    accountId: "acc-007",
    ownerId: "u-001",
    region: "東南亞",
    product: "活動技術合作",
    grossAmount: 560000,
    netAmount: 540000,
    outstandingAmount: 120000,
    adjustmentAmount: 0,
  },
  {
    id: "rev-031",
    recognizedAt: "2026-04-07",
    accountId: "acc-010",
    ownerId: "u-001",
    region: "台灣",
    product: "品牌聯名活動",
    grossAmount: 1720000,
    netAmount: 1650000,
    outstandingAmount: 240000,
    adjustmentAmount: 30000,
  },
  {
    id: "rev-032",
    recognizedAt: "2026-04-08",
    accountId: "acc-005",
    ownerId: "u-004",
    region: "北美",
    product: "會員導流方案",
    grossAmount: 980000,
    netAmount: 950000,
    outstandingAmount: 420000,
    adjustmentAmount: 0,
  },
  {
    id: "rev-033",
    recognizedAt: "2026-04-09",
    accountId: "acc-002",
    ownerId: "u-002",
    region: "日本",
    product: "授權合作擴充",
    grossAmount: 1380000,
    netAmount: 1330000,
    outstandingAmount: 500000,
    adjustmentAmount: 20000,
  },
  {
    id: "rev-034",
    recognizedAt: "2026-04-10",
    accountId: "acc-012",
    ownerId: "u-002",
    region: "台灣",
    product: "內容導流合作",
    grossAmount: 840000,
    netAmount: 810000,
    outstandingAmount: 0,
    adjustmentAmount: 0,
  },
];

const accountNameMap = new Map(accountList.map((item) => [item.id, item.companyName]));
const userById = new Map(userList.map((item) => [item.id, item]));

const currentUser = computed(() => {
  const targetId = authSession.value?.employeeId || "u-001";
  return userById.get(targetId) || userList[0];
});

const availableScopeOptions = computed(() => {
  const roleId = authSession.value?.primaryRoleId || "bd_sales";

  if (["admin", "manager_executive", "finance"].includes(roleId)) {
    return [
      { value: "mine", label: "我的" },
      { value: "department", label: "部門" },
      { value: "all", label: "全部" },
    ];
  }

  return [
    { value: "mine", label: "我的" },
    { value: "department", label: "部門" },
  ];
});

watch(
  () => availableScopeOptions.value.map((item) => item.value),
  (values) => {
    if (!values.includes(currentScope.value)) {
      currentScope.value = values[0] || "mine";
    }
  },
  { immediate: true }
);

const periodRange = computed(() => buildPeriodRange(currentPeriod.value, NOW_TS));

const scopedRevenueRecords = computed(() =>
  revenueRecords.filter((item) => matchesScope(item.ownerId, currentScope.value))
);

const scopedOpportunities = computed(() =>
  opportunityList.filter((item) => matchesScope(item.ownerUserId, currentScope.value))
);

const currentRevenueRecords = computed(() =>
  scopedRevenueRecords.value.filter((item) =>
    isWithinRange(toTimestamp(item.recognizedAt), periodRange.value.current)
  )
);

const previousRevenueRecords = computed(() =>
  scopedRevenueRecords.value.filter((item) =>
    isWithinRange(toTimestamp(item.recognizedAt), periodRange.value.previous)
  )
);

const totals = computed(() => {
  const gross = sumBy(currentRevenueRecords.value, "grossAmount");
  const net = sumBy(currentRevenueRecords.value, "netAmount");
  const outstanding = sumBy(currentRevenueRecords.value, "outstandingAmount");
  const adjustment = sumBy(currentRevenueRecords.value, "adjustmentAmount");

  const prevGross = sumBy(previousRevenueRecords.value, "grossAmount");
  const prevNet = sumBy(previousRevenueRecords.value, "netAmount");
  const prevOutstanding = sumBy(previousRevenueRecords.value, "outstandingAmount");
  const prevAdjustment = sumBy(previousRevenueRecords.value, "adjustmentAmount");

  return {
    gross,
    net,
    outstanding,
    adjustment,
    prevGross,
    prevNet,
    prevOutstanding,
    prevAdjustment,
  };
});

const summaryCards = computed(() => {
  const netRatio = percentage(totals.value.net, totals.value.gross);
  const prevNetRatio = percentage(totals.value.prevNet, totals.value.prevGross);
  const outstandingRatio = percentage(totals.value.outstanding, totals.value.net);
  const prevOutstandingRatio = percentage(
    totals.value.prevOutstanding,
    totals.value.prevNet
  );
  const adjustmentRatio = percentage(totals.value.adjustment, totals.value.net);
  const prevAdjustmentRatio = percentage(
    totals.value.prevAdjustment,
    totals.value.prevNet
  );

  return [
    {
      key: "net",
      title: "已認列淨營收",
      value: `${Math.round(netRatio)}%`,
      helper: `${formatCurrency(totals.value.net)} of ${formatCurrency(
        totals.value.gross
      )}`,
      progress: netRatio,
      delta: computeDelta(netRatio, prevNetRatio),
      tone: "text-emerald-600",
    },
    {
      key: "outstanding",
      title: "未收款占比",
      value: `${Math.round(outstandingRatio)}%`,
      helper: `${formatCurrency(totals.value.outstanding)} 待收`,
      progress: outstandingRatio,
      delta: computeDelta(outstandingRatio, prevOutstandingRatio),
      tone:
        outstandingRatio > prevOutstandingRatio ? "text-rose-600" : "text-emerald-600",
    },
    {
      key: "adjustment",
      title: "調整金額占比",
      value: `${Math.round(adjustmentRatio)}%`,
      helper: `${formatCurrency(totals.value.adjustment)} 已調整`,
      progress: adjustmentRatio,
      delta: computeDelta(adjustmentRatio, prevAdjustmentRatio),
      tone: adjustmentRatio > prevAdjustmentRatio ? "text-rose-600" : "text-emerald-600",
    },
  ];
});

const chartBuckets = computed(() =>
  createChartBuckets(currentPeriod.value === "year" ? "month" : "week", NOW_TS)
);

const assignedSplitSeries = computed(() => ({
  labels: chartBuckets.value.map((item) => item.label),
  recognized: aggregateBuckets(currentRevenueRecords.value, chartBuckets.value, (item) =>
    Math.max(Number(item.netAmount || 0) - Number(item.outstandingAmount || 0), 0)
  ),
  outstanding: aggregateBuckets(currentRevenueRecords.value, chartBuckets.value, (item) =>
    Number(item.outstandingAmount || 0)
  ),
}));

const assignedSplitOption = computed(() => ({
  color: ["#2f6fde", "#8ab0ff"],
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "shadow" },
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderWidth: 0,
    textStyle: { color: "#fff" },
  },
  legend: {
    top: 0,
    right: 0,
    textStyle: { color: "#475569", fontSize: 12 },
  },
  grid: { top: 28, left: 8, right: 8, bottom: 8, containLabel: true },
  xAxis: {
    type: "category",
    data: assignedSplitSeries.value.labels,
    axisTick: { show: false },
    axisLine: { lineStyle: { color: "#dbe4f0" } },
    axisLabel: { color: "#64748b", fontSize: 12 },
  },
  yAxis: {
    type: "value",
    axisLine: { show: false },
    splitLine: { lineStyle: { color: "#edf2f7" } },
    axisLabel: {
      color: "#94a3b8",
      fontSize: 12,
      formatter: (value) => `${Math.round(value / 10000)}萬`,
    },
  },
  series: [
    {
      name: "已認列",
      type: "bar",
      stack: "total",
      barMaxWidth: 24,
      itemStyle: { borderRadius: [4, 4, 0, 0] },
      data: assignedSplitSeries.value.recognized,
    },
    {
      name: "待收款",
      type: "bar",
      stack: "total",
      barMaxWidth: 24,
      itemStyle: { borderRadius: [4, 4, 0, 0] },
      data: assignedSplitSeries.value.outstanding,
    },
  ],
}));

const progressSeries = computed(() => ({
  labels: chartBuckets.value.map((item) => item.label),
  data: aggregateBuckets(currentRevenueRecords.value, chartBuckets.value, (item) =>
    percentage(Number(item.netAmount || 0), Number(item.grossAmount || 0))
  ),
}));

const progressOption = computed(() => ({
  color: ["#2f6fde"],
  tooltip: {
    trigger: "axis",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderWidth: 0,
    textStyle: { color: "#fff" },
  },
  grid: { top: 20, left: 8, right: 8, bottom: 8, containLabel: true },
  xAxis: {
    type: "category",
    data: progressSeries.value.labels,
    axisTick: { show: false },
    axisLine: { lineStyle: { color: "#dbe4f0" } },
    axisLabel: { color: "#64748b", fontSize: 12 },
  },
  yAxis: {
    type: "value",
    min: 0,
    max: 100,
    axisLine: { show: false },
    splitLine: { lineStyle: { color: "#edf2f7" } },
    axisLabel: {
      color: "#94a3b8",
      fontSize: 12,
      formatter: (value) => `${value}%`,
    },
  },
  series: [
    {
      type: "line",
      smooth: false,
      symbolSize: 6,
      areaStyle: { color: "rgba(47, 111, 222, 0.12)" },
      lineStyle: { width: 2 },
      data: progressSeries.value.data,
    },
  ],
}));

const riskHeatmapData = computed(() => {
  const buckets = chartBuckets.value;
  const rows = 6;
  const cellMap = new Map();

  currentRevenueRecords.value.forEach((item) => {
    const xIndex = buckets.findIndex((bucket) => {
      const ts = toTimestamp(item.recognizedAt);
      return ts >= bucket.start && ts <= bucket.end;
    });

    if (xIndex < 0) {
      return;
    }

    const score = percentage(
      item.outstandingAmount + item.adjustmentAmount,
      item.netAmount
    );
    const level = score >= 45 ? 3 : score >= 20 ? 2 : 1;
    const rowIndex = Math.min(rows - 1, Math.floor((score / 100) * rows));
    cellMap.set(`${xIndex}-${rowIndex}`, level);
  });

  return Array.from({ length: rows }, (_, y) =>
    buckets.map((_, x) => [x, y, cellMap.get(`${x}-${y}`) || 0])
  ).flat();
});

const riskOption = computed(() => ({
  tooltip: {
    position: "top",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderWidth: 0,
    textStyle: { color: "#fff" },
    formatter: (params) => {
      const level = params.value?.[2] || 0;
      const label = level === 3 ? "高" : level === 2 ? "中" : level === 1 ? "低" : "無";
      return `${chartBuckets.value[params.value[0]]?.label || ""}<br/>${label}`;
    },
  },
  visualMap: {
    min: 0,
    max: 3,
    show: false,
    inRange: {
      color: ["#f8fafc", "#c7d7ff", "#7ea7ff", "#2f6fde"],
    },
  },
  grid: { top: 12, left: 0, right: 0, bottom: 0, containLabel: false },
  xAxis: {
    type: "category",
    data: chartBuckets.value.map((item) => item.label),
    splitArea: { show: true, areaStyle: { color: ["#ffffff"] } },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: false },
  },
  yAxis: {
    type: "category",
    data: ["1", "2", "3", "4", "5", "6"],
    splitArea: { show: true, areaStyle: { color: ["#ffffff"] } },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: false },
  },
  series: [
    {
      type: "heatmap",
      data: riskHeatmapData.value,
      itemStyle: {
        borderRadius: 4,
        borderColor: "#ffffff",
        borderWidth: 2,
      },
      emphasis: { disabled: true },
    },
  ],
}));

const auditCounts = computed(() => {
  const list = currentRevenueRecords.value;
  return {
    all: list.length,
    upcoming: list.filter((item) => toTimestamp(item.recognizedAt) >= NOW_TS - 7 * DAY_MS)
      .length,
    in_audit: list.filter((item) => item.adjustmentAmount > 0).length,
    awaiting_report: list.filter((item) => item.outstandingAmount > 0).length,
    completed: list.filter((item) => item.outstandingAmount === 0).length,
  };
});

const auditRows = computed(() => {
  let list = currentRevenueRecords.value.slice();

  if (auditTab.value === "upcoming") {
    list = list.filter((item) => toTimestamp(item.recognizedAt) >= NOW_TS - 7 * DAY_MS);
  } else if (auditTab.value === "in_audit") {
    list = list.filter((item) => item.adjustmentAmount > 0);
  } else if (auditTab.value === "awaiting_report") {
    list = list.filter((item) => item.outstandingAmount > 0);
  } else if (auditTab.value === "completed") {
    list = list.filter((item) => item.outstandingAmount === 0);
  }

  return list
    .sort((a, b) => Number(b.netAmount || 0) - Number(a.netAmount || 0))
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      name: accountNameMap.get(item.accountId) || item.accountId,
      subtitle:
        item.outstandingAmount > 0
          ? "待補資料"
          : item.adjustmentAmount > 0
          ? "對帳中"
          : "已完成",
      period: `${formatDate(item.recognizedAt)} - ${formatDate(
        toTimestamp(item.recognizedAt) + 30 * DAY_MS
      )}`,
      routeName:
        item.outstandingAmount > 0 ? "finance-reconciliation" : "finance-revenue-records",
    }));
});

const auditTabs = computed(() => [
  { value: "all", label: "全部", count: auditCounts.value.all },
  { value: "upcoming", label: "近期", count: auditCounts.value.upcoming },
  { value: "in_audit", label: "對帳中", count: auditCounts.value.in_audit },
  {
    value: "awaiting_report",
    label: "待補資料",
    count: auditCounts.value.awaiting_report,
  },
  { value: "completed", label: "已完成", count: auditCounts.value.completed },
]);

function createChartBuckets(mode, endTs) {
  if (mode === "month") {
    return Array.from({ length: 8 }, (_, idx) => {
      const end = startOfDayTs(endTs) - (7 - idx) * 3 * DAY_MS + 3 * DAY_MS - 1;
      const start = end - 3 * DAY_MS + 1;
      return {
        start,
        end,
        label: formatDate(end),
      };
    });
  }

  if (mode === "quarter") {
    return Array.from({ length: 8 }, (_, idx) => {
      const end = startOfDayTs(endTs) - (7 - idx) * 7 * DAY_MS + 7 * DAY_MS - 1;
      const start = end - 7 * DAY_MS + 1;
      return {
        start,
        end,
        label: formatDate(end),
      };
    });
  }

  return Array.from({ length: 8 }, (_, idx) => {
    const date = new Date(endTs);
    date.setDate(1);
    date.setMonth(date.getMonth() - (7 - idx));
    const start = startOfDayTs(date.getTime());
    const end = new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    ).getTime();
    return {
      start,
      end,
      label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date),
    };
  });
}

function aggregateBuckets(list, buckets, valueResolver) {
  return buckets.map((bucket) =>
    list
      .filter((item) => {
        const ts = toTimestamp(item.recognizedAt);
        return ts >= bucket.start && ts <= bucket.end;
      })
      .reduce((sum, item) => sum + Number(valueResolver(item) || 0), 0)
  );
}

function percentage(value, base) {
  if (!base) {
    return 0;
  }
  return (Number(value || 0) / Number(base || 0)) * 100;
}

function sumBy(list, field) {
  return list.reduce((sum, item) => sum + Number(item[field] || 0), 0);
}

function buildPeriodRange(periodKey, nowTs) {
  const currentEnd = nowTs;
  let currentStart = startOfMonthTs(nowTs);

  if (periodKey === "quarter") {
    currentStart = startOfQuarterTs(nowTs);
  } else if (periodKey === "year") {
    currentStart = startOfYearTs(nowTs);
  }

  const span = currentEnd - currentStart;
  return {
    current: { start: currentStart, end: currentEnd },
    previous: { start: currentStart - span - 1, end: currentStart - 1 },
  };
}

function matchesScope(ownerId, scope) {
  if (scope === "all") {
    return true;
  }

  if (scope === "mine") {
    return ownerId === currentUser.value?.id;
  }

  const ownerDepartment = userById.get(ownerId)?.department;
  return ownerDepartment && ownerDepartment === currentUser.value?.department;
}

function computeDelta(current, previous) {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);

  if (previousValue === 0) {
    return currentValue > 0 ? 100 : 0;
  }

  return ((currentValue - previousValue) / previousValue) * 100;
}

function deltaText(delta) {
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.5) {
    return "0%";
  }
  return `${delta > 0 ? "+" : ""}${Math.round(delta)}%`;
}

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

  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function isWithinRange(time, range) {
  return time >= range.start && time <= range.end;
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

function startOfDayTs(ts) {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  const ts = toTimestamp(value);
  if (!ts) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(new Date(ts));
}

function refreshDashboard() {
  ElNotification({
    title: "已更新",
    message: "營收概況資料已重新整理",
    type: "success",
    position: "top-right",
  });
}

function goTo(routeName, params = {}) {
  router.push({ name: routeName, params });
}
</script>

<template>
  <div class="min-h-full bg-[#f7f9fc] p-5">
    <section class="mx-auto grid gap-4">
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div class="grid gap-1">
          <h1 class="text-xl font-bold text-slate-950">營收概況</h1>
        </div>

        <div class="flex items-center gap-2">
          <ElButton type="primary" @click="goTo('reports-revenue')">查看報表</ElButton>
          <ElButton circle :icon="Refresh" @click="refreshDashboard" />
        </div>
      </header>

      <div class="flex flex-wrap items-center gap-2">
        <div
          class="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
        >
          <button
            v-for="item in periodButtons"
            :key="item.value"
            type="button"
            class="rounded-md px-5 py-1.5 text-sm"
            :class="
              currentPeriod === item.value
                ? 'bg-slate-50 text-slate-900 shadow-sm'
                : 'text-slate-500'
            "
            @click="currentPeriod = item.value"
          >
            {{ item.label }}
          </button>
        </div>

        <ElSelect v-model="currentDimension" class="!w-[132px]">
          <ElOption
            v-for="item in dimensionOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </ElSelect>

        <ElSelect v-model="currentScope" class="!w-[118px]">
          <ElOption
            v-for="item in availableScopeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </ElSelect>
      </div>

      <section class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div class="rounded-xl border border-slate-200 px-3 py-2">
          <p class="text-base text-slate-900">所選期間內的營收認列健康度</p>
        </div>

        <div class="mt-3 grid gap-3 xl:grid-cols-3">
          <article
            v-for="card in summaryCards"
            :key="card.key"
            class="rounded-xl border border-slate-200 px-4 py-3"
          >
            <p class="text-sm text-slate-400">{{ card.title }}</p>
            <div class="mt-1 flex items-end gap-2">
              <p class="text-xl font-semibold text-slate-950">{{ card.value }}</p>
              <p class="text-sm text-slate-400">{{ card.helper }}</p>
            </div>
            <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                class="h-full rounded-full bg-[#19c04f]"
                :style="{ width: `${Math.min(card.progress, 100)}%` }"
              />
            </div>
            <div class="mt-2 flex items-center gap-2">
              <span
                class="rounded-full px-2 py-0.5 text-sm"
                :class="
                  card.tone === 'text-rose-600'
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-emerald-100 text-emerald-600'
                "
              >
                {{ deltaText(card.delta) }}
              </span>
              <span class="text-sm text-slate-400">相較前一期</span>
            </div>
          </article>
        </div>

        <div class="mt-3 grid gap-3 xl:grid-cols-2">
          <article class="rounded-xl border border-slate-200 p-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-lg font-semibold text-slate-950">營收組成</p>
            </div>
            <div class="mt-2 h-[220px]">
              <VChart :option="assignedSplitOption" autoresize class="h-full w-full" />
            </div>
          </article>

          <article class="rounded-xl border border-slate-200 p-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-lg font-semibold text-slate-950">認列進度</p>
            </div>
            <div class="mt-2 h-[220px]">
              <VChart :option="progressOption" autoresize class="h-full w-full" />
            </div>
          </article>
        </div>

        <div class="mt-3 grid gap-3 xl:grid-cols-2">
          <article class="rounded-xl border border-slate-200 p-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-lg font-semibold text-slate-950">內在風險</p>
              <div class="flex items-center gap-3 text-sm text-slate-500">
                <span class="inline-flex items-center gap-1">
                  <span class="h-2 w-2 rounded-full bg-[#2f6fde]" />
                  高
                </span>
                <span class="inline-flex items-center gap-1">
                  <span class="h-2 w-2 rounded-full bg-[#7ea7ff]" />
                  中
                </span>
                <span class="inline-flex items-center gap-1">
                  <span class="h-2 w-2 rounded-full bg-[#c7d7ff]" />
                  低
                </span>
              </div>
            </div>
            <div class="mt-2 h-[220px]">
              <VChart :option="riskOption" autoresize class="h-full w-full" />
            </div>
          </article>

          <article class="rounded-xl border border-slate-200 p-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-lg font-semibold text-slate-950">今日對帳狀態</p>
            </div>

            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="tab in auditTabs"
                :key="tab.value"
                type="button"
                class="rounded-full border px-3 py-1 text-sm"
                :class="
                  auditTab === tab.value
                    ? 'border-slate-300 bg-slate-50 text-slate-900'
                    : 'border-transparent bg-white text-slate-500'
                "
                @click="auditTab = tab.value"
              >
                {{ tab.label }}
                <span class="ml-1 text-slate-400">{{ tab.count }}</span>
              </button>
            </div>

            <div class="mt-3 grid gap-2">
              <button
                v-for="row in auditRows"
                :key="row.id"
                type="button"
                class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 text-left"
                @click="goTo(row.routeName)"
              >
                <div class="flex min-w-0 items-center gap-3">
                  <span
                    class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#eef4ff] text-base font-semibold text-[#2f6fde]"
                  >
                    {{ row.name.slice(0, 1) }}
                  </span>
                  <div class="min-w-0">
                    <p class="truncate text-base text-slate-900">{{ row.name }}</p>
                    <p class="text-sm text-slate-500">
                      {{ row.subtitle }} | {{ row.period }}
                    </p>
                  </div>
                </div>
                <span
                  class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400"
                >
                  <ArrowRight class="h-4 w-4" />
                </span>
              </button>
            </div>
          </article>
        </div>
      </section>
    </section>
  </div>
</template>
