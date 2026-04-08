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
import {
  accountList,
  accountTierOptions,
  accountTypeOptions,
  industryOptions,
  lifecycleOptions,
  regionOptions,
} from "../../data/accounts";
import { projectList } from "../../data/projects";
import { userList } from "../../data/users";

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

const loading = ref(false);
const filterPanelOpen = ref(false);
const detailTab = ref("high_value");
const currentPage = ref(1);
const pageSize = ref(10);

const nowTs = Date.now();
const dayMs = 24 * 60 * 60 * 1000;

const stageProbabilityMap = {
  potential: 20,
  contacted: 35,
  qualified: 50,
  proposal: 70,
  negotiation: 85,
  won: 100,
  lost: 0,
};

const activityLevelMap = {
  high: { label: "高互動", type: "success" },
  medium: { label: "中互動", type: "warning" },
  low: { label: "低互動", type: "danger" },
};

const lifecycleTypeMap = {
  lead: "info",
  deal: "primary",
  retention: "success",
  churn: "danger",
};

const yesNoOptions = [
  { value: "all", label: "全部" },
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
];

const riskOptions = [
  { value: "all", label: "全部風險" },
  { value: "high", label: "高風險" },
  { value: "normal", label: "一般" },
];

const projectSummaryByAccountId = projectList.reduce((map, item) => {
  const current = map.get(item.customerId) || { count: 0, totalValue: 0 };
  current.count += 1;
  current.totalValue += Number(item.value || 0);
  map.set(item.customerId, current);
  return map;
}, new Map());

const ownerOptions = [
  { value: "all", label: "全部負責人" },
  ...userList
    .filter(
      (item) => item.status === "active" && item.department === "Business Development"
    )
    .map((item) => ({ value: item.id, label: item.name })),
];

const filters = reactive({
  keyword: "",
  dateRange: [],
  companyType: "all",
  lifecycleStage: "all",
  tier: "all",
  region: "all",
  industry: "all",
  ownerUserId: "all",
  hasOpportunity: "all",
  hasContract: "all",
  hasRevenue: "all",
  riskLevel: "all",
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

function formatDateTime(value) {
  const date = parseDate(value);
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
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
    const text = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
    return `較前期 ${text}`;
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

function getCreatedAt(account) {
  const createEvent = (account.timeline || []).find((line) => line.type === "create");
  return createEvent?.timestamp || account.updatedAt || "";
}

function getLastActivityAt(account) {
  const candidates = [account.updatedAt];

  (account.activities || []).forEach((line) => {
    if (line.occurredAt) {
      candidates.push(line.occurredAt);
    }
  });

  return candidates
    .map((text) => ({ text, ts: toTimestamp(text) }))
    .sort((a, b) => b.ts - a.ts)[0]?.text;
}

function getLastOpportunityAt(account) {
  const values = (account.opportunities || [])
    .map((line) => line.expectedCloseDate)
    .filter(Boolean)
    .map((text) => ({ text, ts: toTimestamp(text) }))
    .sort((a, b) => b.ts - a.ts);

  return values[0]?.text || "";
}

function buildRiskReasons(record) {
  const reasons = [];

  if (record.isChurn) {
    reasons.push("已流失");
    return reasons;
  }

  if (record.daysSinceInteraction > 60) {
    reasons.push("長期無互動");
  }

  if (record.openOpportunityCount === 0) {
    reasons.push("無新商機");
  }

  if (record.hasContract && record.activeContractCount === 0) {
    reasons.push("合約待續約");
  }

  if (!record.hasRevenue && record.daysSinceInteraction > 35) {
    reasons.push("尚未形成營收");
  }

  return reasons;
}

const customerRecords = computed(() =>
  accountList.map((account) => {
    const opportunities = account.opportunities || [];
    const contracts = account.contracts || [];
    const projectSummary = projectSummaryByAccountId.get(account.id) || {
      count: 0,
      totalValue: 0,
    };

    const opportunityCount = opportunities.length;
    const openOpportunityCount = opportunities.filter(
      (item) => !["won", "lost"].includes(item.stage)
    ).length;
    const wonAmount = opportunities
      .filter((item) => item.stage === "won")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const weightedAmount = opportunities.reduce(
      (sum, item) =>
        sum + Number(item.amount || 0) * (stageProbabilityMap[item.stage] || 0) * 0.01,
      0
    );

    const contractCount = contracts.length;
    const activeContractCount = contracts.filter((item) =>
      ["執行中", "審核中"].includes(item.status)
    ).length;

    const createdAt = getCreatedAt(account);
    const updatedAt = account.updatedAt || createdAt;
    const lastInteractionAt = getLastActivityAt(account) || updatedAt;
    const lastOpportunityAt = getLastOpportunityAt(account);

    const daysSinceInteraction = Math.max(
      Math.floor((nowTs - toTimestamp(lastInteractionAt)) / dayMs),
      0
    );

    const activityLevel =
      daysSinceInteraction <= 30 ? "high" : daysSinceInteraction <= 60 ? "medium" : "low";

    const customerValue = Math.round(
      wonAmount +
        weightedAmount * 0.45 +
        Number(projectSummary.totalValue || 0) * 0.18 +
        contractCount * 120000
    );

    const hasOpportunity = opportunityCount > 0;
    const hasContract = contractCount > 0;
    const hasRevenue = wonAmount > 0 || Number(projectSummary.totalValue || 0) > 0;
    const isChurn = account.lifecycleStage === "churn" || account.status === "churned";

    const growthScore =
      openOpportunityCount +
      (daysSinceInteraction <= 30 ? 1 : 0) +
      (projectSummary.count > 0 ? 1 : 0);

    const record = {
      id: account.id,
      accountCode: account.accountCode,
      companyName: account.companyName,
      companyType: account.companyType,
      tier: account.tier,
      lifecycleStage: account.lifecycleStage,
      region: account.region,
      industry: account.industry,
      ownerUserId: account.ownerUserId,
      ownerName: userList.find((user) => user.id === account.ownerUserId)?.name || "-",
      status: account.status,
      createdAt,
      updatedAt,
      lastInteractionAt,
      lastOpportunityAt,
      daysSinceInteraction,
      opportunityCount,
      openOpportunityCount,
      wonAmount,
      weightedAmount,
      contractCount,
      activeContractCount,
      projectCount: Number(projectSummary.count || 0),
      projectValue: Number(projectSummary.totalValue || 0),
      customerValue,
      hasOpportunity,
      hasContract,
      hasRevenue,
      activityLevel,
      isChurn,
      growthScore,
      riskReasons: [],
      isHighRisk: false,
    };

    record.riskReasons = buildRiskReasons(record);
    record.isHighRisk = record.riskReasons.length > 0;

    return record;
  })
);

function matchesNonDateFilters(record) {
  const keyword = filters.keyword.trim().toLowerCase();

  const matchesKeyword =
    keyword.length === 0 ||
    record.companyName.toLowerCase().includes(keyword) ||
    record.accountCode.toLowerCase().includes(keyword) ||
    record.ownerName.toLowerCase().includes(keyword);

  const matchesType =
    filters.companyType === "all" || record.companyType === filters.companyType;
  const matchesLifecycle =
    filters.lifecycleStage === "all" || record.lifecycleStage === filters.lifecycleStage;
  const matchesTier = filters.tier === "all" || record.tier === filters.tier;
  const matchesRegion = filters.region === "all" || record.region === filters.region;
  const matchesIndustry =
    filters.industry === "all" || record.industry === filters.industry;
  const matchesOwner =
    filters.ownerUserId === "all" || record.ownerUserId === filters.ownerUserId;

  const matchesOpportunity =
    filters.hasOpportunity === "all" ||
    (filters.hasOpportunity === "yes" ? record.hasOpportunity : !record.hasOpportunity);
  const matchesContract =
    filters.hasContract === "all" ||
    (filters.hasContract === "yes" ? record.hasContract : !record.hasContract);
  const matchesRevenue =
    filters.hasRevenue === "all" ||
    (filters.hasRevenue === "yes" ? record.hasRevenue : !record.hasRevenue);
  const matchesRisk =
    filters.riskLevel === "all" ||
    (filters.riskLevel === "high" ? record.isHighRisk : !record.isHighRisk);

  return (
    matchesKeyword &&
    matchesType &&
    matchesLifecycle &&
    matchesTier &&
    matchesRegion &&
    matchesIndustry &&
    matchesOwner &&
    matchesOpportunity &&
    matchesContract &&
    matchesRevenue &&
    matchesRisk
  );
}

function isDateWithinRange(value, range) {
  const [start, end] = range || [];
  if (!start || !end) {
    return true;
  }

  const ts = toTimestamp(value);
  return ts >= toTimestamp(start) && ts <= toTimestamp(end) + dayMs - 1;
}

const nonDateFilteredRecords = computed(() =>
  customerRecords.value.filter((record) => matchesNonDateFilters(record))
);

const filteredRecords = computed(() =>
  nonDateFilteredRecords.value.filter((record) =>
    isDateWithinRange(record.updatedAt, filters.dateRange)
  )
);

const valueThresholds = computed(() => {
  const values = filteredRecords.value
    .map((item) => item.customerValue)
    .filter((value) => value > 0);
  if (values.length === 0) {
    return { high: 0, medium: 0 };
  }

  return {
    high: quantile(values, 0.7),
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
  const periodRecords = records.filter((record) => {
    const ts = toTimestamp(record.updatedAt);
    return ts >= range.start && ts <= range.end;
  });

  const newCustomers = records.filter((record) => {
    const ts = toTimestamp(record.createdAt);
    return ts >= range.start && ts <= range.end;
  }).length;

  const total = periodRecords.length;
  const churnCount = periodRecords.filter((record) => record.isChurn).length;
  const activeCount = periodRecords.filter((record) =>
    ["high", "medium"].includes(record.activityLevel)
  ).length;
  const averageValue =
    total === 0
      ? 0
      : periodRecords.reduce(
          (sum, record) => sum + Number(record.customerValue || 0),
          0
        ) / total;
  const periodThreshold = quantile(
    periodRecords.map((record) => Number(record.customerValue || 0)),
    0.7
  );
  const highValueCount = periodRecords.filter(
    (record) => Number(record.customerValue || 0) >= periodThreshold
  ).length;
  const withOpportunityRate =
    total === 0
      ? 0
      : (periodRecords.filter((record) => record.hasOpportunity).length / total) * 100;

  return {
    total,
    newCustomers,
    activeCount,
    churnCount,
    churnRate: total === 0 ? 0 : (churnCount / total) * 100,
    averageValue,
    highValueCount,
    withOpportunityRate,
  };
}

const currentMetrics = computed(() =>
  buildPeriodMetrics(nonDateFilteredRecords.value, currentPeriodRange.value)
);

const previousMetrics = computed(() =>
  buildPeriodMetrics(nonDateFilteredRecords.value, previousPeriodRange.value)
);

const kpiCards = computed(() => [
  {
    label: "客戶總數",
    value: `${currentMetrics.value.total} 位`,
    delta: formatDelta(currentMetrics.value.total, previousMetrics.value.total),
  },
  {
    label: "本期新增客戶",
    value: `${currentMetrics.value.newCustomers} 位`,
    delta: formatDelta(
      currentMetrics.value.newCustomers,
      previousMetrics.value.newCustomers
    ),
  },
  {
    label: "活躍客戶數",
    value: `${currentMetrics.value.activeCount} 位`,
    delta: formatDelta(
      currentMetrics.value.activeCount,
      previousMetrics.value.activeCount
    ),
  },
  {
    label: "流失客戶數",
    value: `${currentMetrics.value.churnCount} 位`,
    delta: formatDelta(currentMetrics.value.churnCount, previousMetrics.value.churnCount),
  },
  {
    label: "客戶流失率",
    value: `${currentMetrics.value.churnRate.toFixed(1)}%`,
    delta: formatDelta(
      currentMetrics.value.churnRate,
      previousMetrics.value.churnRate,
      true
    ),
  },
  {
    label: "平均客戶價值",
    value: formatCurrency(currentMetrics.value.averageValue),
    delta: formatDelta(
      Math.round(currentMetrics.value.averageValue),
      Math.round(previousMetrics.value.averageValue)
    ),
  },
  {
    label: "高價值客戶數",
    value: `${currentMetrics.value.highValueCount} 位`,
    delta: formatDelta(
      currentMetrics.value.highValueCount,
      previousMetrics.value.highValueCount
    ),
  },
  {
    label: "有商機客戶占比",
    value: `${currentMetrics.value.withOpportunityRate.toFixed(1)}%`,
    delta: formatDelta(
      currentMetrics.value.withOpportunityRate,
      previousMetrics.value.withOpportunityRate,
      true
    ),
  },
]);

const typeDistributionOption = computed(() => {
  const counts = toCountMap(filteredRecords.value, "companyType");
  const data = accountTypeOptions
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
        data,
      },
    ],
  };
});

const regionDistributionOption = computed(() => {
  const counts = toCountMap(filteredRecords.value, "region");
  const rows = regionOptions
    .filter((item) => item.value !== "all")
    .map((item) => ({
      label: item.label,
      value: counts[item.value] || 0,
      key: item.value,
    }));

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 48, right: 20, top: 20, bottom: 24 },
    xAxis: { type: "value" },
    yAxis: {
      type: "category",
      data: rows.map((item) => item.label),
    },
    series: [
      {
        type: "bar",
        data: rows.map((item) => ({ value: item.value, key: item.key })),
        barMaxWidth: 20,
        itemStyle: { color: "#3b82f6" },
      },
    ],
  };
});

const lifecycleDistributionOption = computed(() => {
  const counts = toCountMap(filteredRecords.value, "lifecycleStage");
  const rows = lifecycleOptions
    .filter((item) => item.value !== "all")
    .map((item) => ({
      label: item.label,
      value: counts[item.value] || 0,
      key: item.value,
    }));

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 30, right: 12, top: 24, bottom: 30 },
    xAxis: {
      type: "category",
      data: rows.map((item) => item.label),
      axisLabel: { rotate: 14 },
    },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        data: rows.map((item) => ({ value: item.value, key: item.key })),
        barMaxWidth: 32,
        itemStyle: { color: "#14b8a6" },
      },
    ],
  };
});

const valueBucketOption = computed(() => {
  const highThreshold = valueThresholds.value.high;
  const mediumThreshold = valueThresholds.value.medium;

  const groups = {
    high: filteredRecords.value.filter((item) => item.customerValue >= highThreshold)
      .length,
    medium: filteredRecords.value.filter(
      (item) =>
        item.customerValue < highThreshold && item.customerValue >= mediumThreshold
    ).length,
    low: filteredRecords.value.filter((item) => item.customerValue < mediumThreshold)
      .length,
  };

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 30, right: 16, top: 24, bottom: 24 },
    xAxis: { type: "category", data: ["高價值", "中價值", "低價值"] },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        barMaxWidth: 36,
        data: [groups.high, groups.medium, groups.low],
        itemStyle: { color: "#f59e0b" },
      },
    ],
  };
});

const topCustomerOption = computed(() => {
  const rows = [...filteredRecords.value]
    .sort((a, b) => b.customerValue - a.customerValue)
    .slice(0, 8)
    .reverse();

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 125, right: 16, top: 18, bottom: 24 },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: rows.map((item) => item.companyName) },
    series: [
      {
        type: "bar",
        data: rows.map((item) => item.customerValue),
        barMaxWidth: 16,
        itemStyle: { color: "#6366f1" },
      },
    ],
  };
});

const recentMonths = computed(() => getRecentMonths(6));

const averageValueTrendOption = computed(() => {
  const points = recentMonths.value.map((month) => {
    const rows = filteredRecords.value.filter((item) => {
      const ts = toTimestamp(item.updatedAt);
      return ts >= month.start && ts <= month.end;
    });

    const avg =
      rows.length === 0
        ? 0
        : rows.reduce((sum, item) => sum + Number(item.customerValue || 0), 0) /
          rows.length;
    return Math.round(avg);
  });

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
        type: "line",
        smooth: true,
        data: points,
        itemStyle: { color: "#0ea5e9" },
        areaStyle: { color: "rgba(14, 165, 233, 0.12)" },
      },
    ],
  };
});

const activityDistributionOption = computed(() => {
  const counts = toCountMap(filteredRecords.value, "activityLevel");

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 24, right: 12, top: 24, bottom: 24 },
    xAxis: { type: "category", data: ["高互動", "中互動", "低互動"] },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        barMaxWidth: 32,
        data: [counts.high || 0, counts.medium || 0, counts.low || 0],
        itemStyle: { color: "#22c55e" },
      },
    ],
  };
});

const opportunityCoverageOption = computed(() => {
  const withOpportunity = filteredRecords.value.filter((item) => item.hasOpportunity)
    .length;
  const withoutOpportunity = filteredRecords.value.length - withOpportunity;

  return {
    tooltip: { trigger: "item" },
    legend: { bottom: 0, icon: "circle" },
    series: [
      {
        type: "pie",
        radius: ["45%", "72%"],
        data: [
          { name: "有商機", value: withOpportunity },
          { name: "無商機", value: withoutOpportunity },
        ],
      },
    ],
  };
});

const contractCoverageOption = computed(() => {
  const withContract = filteredRecords.value.filter((item) => item.hasContract).length;
  const withoutContract = filteredRecords.value.length - withContract;

  return {
    tooltip: { trigger: "item" },
    legend: { bottom: 0, icon: "circle" },
    series: [
      {
        type: "pie",
        radius: ["45%", "72%"],
        data: [
          { name: "有合約", value: withContract },
          { name: "無合約", value: withoutContract },
        ],
      },
    ],
  };
});

const ownerActivityOption = computed(() => {
  const ownerMap = filteredRecords.value.reduce((map, item) => {
    const row = map.get(item.ownerName) || { active: 0, risk: 0 };
    if (["high", "medium"].includes(item.activityLevel)) {
      row.active += 1;
    }
    if (item.isHighRisk) {
      row.risk += 1;
    }
    map.set(item.ownerName, row);
    return map;
  }, new Map());

  const rows = [...ownerMap.entries()]
    .map(([name, values]) => ({ name, ...values }))
    .sort((a, b) => b.active - a.active)
    .slice(0, 8);

  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 36, right: 16, top: 30, bottom: 26 },
    xAxis: {
      type: "category",
      data: rows.map((item) => item.name),
      axisLabel: { rotate: 18 },
    },
    yAxis: { type: "value" },
    series: [
      {
        name: "活躍客戶",
        type: "bar",
        data: rows.map((item) => item.active),
        barMaxWidth: 18,
        itemStyle: { color: "#4ade80" },
      },
      {
        name: "高風險客戶",
        type: "bar",
        data: rows.map((item) => item.risk),
        barMaxWidth: 18,
        itemStyle: { color: "#f87171" },
      },
    ],
  };
});

const churnTrendOption = computed(() => {
  const values = recentMonths.value.map(
    (month) =>
      filteredRecords.value.filter((item) => {
        const ts = toTimestamp(item.updatedAt);
        return item.isChurn && ts >= month.start && ts <= month.end;
      }).length
  );

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 36, right: 16, top: 24, bottom: 24 },
    xAxis: { type: "category", data: recentMonths.value.map((item) => item.label) },
    yAxis: { type: "value" },
    series: [
      {
        type: "line",
        smooth: true,
        data: values,
        itemStyle: { color: "#ef4444" },
        areaStyle: { color: "rgba(239, 68, 68, 0.12)" },
      },
    ],
  };
});

const riskReasonOption = computed(() => {
  const map = {};

  filteredRecords.value
    .filter((item) => item.isHighRisk)
    .forEach((item) => {
      item.riskReasons.forEach((reason) => {
        map[reason] = (map[reason] || 0) + 1;
      });
    });

  const rows = Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 120, right: 20, top: 22, bottom: 24 },
    xAxis: { type: "value" },
    yAxis: {
      type: "category",
      data: rows.map((item) => item.name),
    },
    series: [
      {
        type: "bar",
        data: rows.map((item) => item.value),
        barMaxWidth: 18,
        itemStyle: { color: "#fb7185" },
      },
    ],
  };
});

function handleTypeChartClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.companyType = value;
  }
}

function handleRegionChartClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.region = value;
  }
}

function handleLifecycleChartClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.lifecycleStage = value;
  }
}

function resetFilters() {
  filters.keyword = "";
  filters.dateRange = [];
  filters.companyType = "all";
  filters.lifecycleStage = "all";
  filters.tier = "all";
  filters.region = "all";
  filters.industry = "all";
  filters.ownerUserId = "all";
  filters.hasOpportunity = "all";
  filters.hasContract = "all";
  filters.hasRevenue = "all";
  filters.riskLevel = "all";
}

const detailTabRows = computed(() => {
  const highThreshold = valueThresholds.value.high;
  const rows = filteredRecords.value;

  return {
    high_value: rows.filter((item) => item.customerValue >= highThreshold),
    growth: rows.filter((item) => !item.isChurn && item.growthScore >= 2),
    low_activity: rows.filter((item) => !item.isChurn && item.daysSinceInteraction > 60),
    churn: rows.filter((item) => item.isChurn),
    high_risk: rows.filter((item) => item.isHighRisk),
  };
});

const detailTabs = computed(() => [
  {
    value: "high_value",
    label: "高價值客戶",
    count: detailTabRows.value.high_value.length,
  },
  { value: "growth", label: "成長客戶", count: detailTabRows.value.growth.length },
  {
    value: "low_activity",
    label: "低活躍客戶",
    count: detailTabRows.value.low_activity.length,
  },
  { value: "churn", label: "流失客戶", count: detailTabRows.value.churn.length },
  {
    value: "high_risk",
    label: "高風險客戶",
    count: detailTabRows.value.high_risk.length,
  },
]);

const sortedDetailRows = computed(() =>
  [...(detailTabRows.value[detailTab.value] || [])].sort(
    (a, b) => b.customerValue - a.customerValue
  )
);

const pagedDetailRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedDetailRows.value.slice(start, start + pageSize.value);
});

function riskSummary(record) {
  if (!record.isHighRisk) {
    return "正常";
  }

  return record.riskReasons.join("、");
}

function openAccountDetail(row) {
  router.push({ name: "account-detail", params: { accountId: row.id } });
}

function exportDetailCsv() {
  const header = [
    "客戶名稱",
    "客戶編號",
    "類型",
    "地區",
    "負責人",
    "生命週期",
    "分級",
    "最近互動",
    "最近商機",
    "客戶價值",
    "風險狀態",
  ];

  const rows = sortedDetailRows.value.map((item) => [
    item.companyName,
    item.accountCode,
    accountTypeOptions.find((line) => line.value === item.companyType)?.label ||
      item.companyType,
    item.region,
    item.ownerName,
    lifecycleOptions.find((line) => line.value === item.lifecycleStage)?.label ||
      item.lifecycleStage,
    accountTierOptions.find((line) => line.value === item.tier)?.label || item.tier,
    item.lastInteractionAt,
    item.lastOpportunityAt || "-",
    item.customerValue,
    riskSummary(item),
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
  anchor.download = `customer-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
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
    filters.companyType,
    filters.lifecycleStage,
    filters.tier,
    filters.region,
    filters.industry,
    filters.ownerUserId,
    filters.hasOpportunity,
    filters.hasContract,
    filters.hasRevenue,
    filters.riskLevel,
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
            客戶分析
          </h1>
          <p class="text-sm text-slate-500">檢視客戶結構、價值分布、活躍度與流失風險</p>
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
          <p class="text-xs text-slate-500">{{ card.label }}</p>
          <p class="mt-2 text-lg font-semibold text-slate-900">{{ card.value }}</p>
          <p class="mt-1 text-xs text-slate-500">{{ card.delta }}</p>
        </article>
      </section>

      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div class="flex flex-wrap items-center gap-2">
            <ElInput
              v-model="filters.keyword"
              placeholder="搜尋客戶名稱 / 編號 / 負責人"
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
          <ElTag round effect="plain">分析樣本 {{ filteredRecords.length }} 位</ElTag>
        </div>

        <transition
          enter-active-class="transition-all duration-300 ease-out overflow-hidden"
          leave-active-class="transition-all duration-200 ease-in overflow-hidden"
          enter-from-class="max-h-0 opacity-0"
          enter-to-class="max-h-[1100px] opacity-100"
          leave-from-class="max-h-[1100px] opacity-100"
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
              <ElSelect v-model="filters.companyType">
                <ElOption
                  v-for="item in accountTypeOptions"
                  :key="`type-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.lifecycleStage">
                <ElOption
                  v-for="item in lifecycleOptions"
                  :key="`life-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.tier">
                <ElOption
                  v-for="item in accountTierOptions"
                  :key="`tier-${item.value}`"
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
              <ElSelect v-model="filters.industry">
                <ElOption :key="'industry-all'" label="全部產業" value="all" />
                <ElOption
                  v-for="item in industryOptions"
                  :key="`industry-${item.value}`"
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
              <ElSelect v-model="filters.hasOpportunity">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`opportunity-${item.value}`"
                  :label="`有商機：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.hasContract">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`contract-${item.value}`"
                  :label="`有合約：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.hasRevenue">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`revenue-${item.value}`"
                  :label="`有營收：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.riskLevel">
                <ElOption
                  v-for="item in riskOptions"
                  :key="`risk-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </transition>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">客戶結構分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>客戶類型分布</h3>
              <p>可點擊下鑽篩選</p>
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
              <p>可點擊下鑽篩選</p>
            </header>
            <VChart
              :option="regionDistributionOption"
              autoresize
              class="chart-body"
              @click="handleRegionChartClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>生命週期分布</h3>
              <p>Lead / Deal / Retention / Churn</p>
            </header>
            <VChart
              :option="lifecycleDistributionOption"
              autoresize
              class="chart-body"
              @click="handleLifecycleChartClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>客戶價值分布</h3>
              <p>高、中、低價值分群</p>
            </header>
            <VChart :option="valueBucketOption" autoresize class="chart-body" />
          </article>
        </div>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">價值與活躍分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>Top 客戶價值排行</h3>
              <p>依客戶價值高到低</p>
            </header>
            <VChart :option="topCustomerOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>平均客戶價值趨勢</h3>
              <p>近 6 個月趨勢</p>
            </header>
            <VChart :option="averageValueTrendOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>活躍度分布</h3>
              <p>依最近互動時間分層</p>
            </header>
            <VChart :option="activityDistributionOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>Owner 經營比較</h3>
              <p>活躍客戶 vs 高風險客戶</p>
            </header>
            <VChart :option="ownerActivityOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>商機覆蓋率</h3>
              <p>有商機 / 無商機占比</p>
            </header>
            <VChart :option="opportunityCoverageOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>合約覆蓋率</h3>
              <p>有合約 / 無合約占比</p>
            </header>
            <VChart :option="contractCoverageOption" autoresize class="chart-body" />
          </article>
        </div>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">流失與風險分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>流失客戶趨勢</h3>
              <p>近 6 個月 churn 數量</p>
            </header>
            <VChart :option="churnTrendOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>風險原因分布</h3>
              <p>高風險客戶的主要訊號</p>
            </header>
            <VChart :option="riskReasonOption" autoresize class="chart-body" />
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
          <ElTableColumn label="客戶" min-width="220">
            <template #default="{ row }">
              <button
                type="button"
                class="grid gap-1 text-left"
                @click="openAccountDetail(row)"
              >
                <span class="font-semibold text-[#303133] hover:text-[#409eff]">{{
                  row.companyName
                }}</span>
                <span class="text-xs text-slate-500">{{ row.accountCode }}</span>
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="類型 / 分級" min-width="180">
            <template #default="{ row }">
              <div class="flex flex-wrap gap-1">
                <ElTag size="small" effect="light">
                  {{
                    accountTypeOptions.find((item) => item.value === row.companyType)
                      ?.label || row.companyType
                  }}
                </ElTag>
                <ElTag size="small" effect="plain">
                  {{
                    accountTierOptions.find((item) => item.value === row.tier)?.label ||
                    row.tier
                  }}
                </ElTag>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="地區 / 負責人" min-width="160">
            <template #default="{ row }">
              <div class="grid gap-0.5">
                <span>{{ row.region }}</span>
                <span class="text-xs text-slate-500">{{ row.ownerName }}</span>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="生命週期" min-width="120">
            <template #default="{ row }">
              <ElTag
                :type="lifecycleTypeMap[row.lifecycleStage] || 'info'"
                size="small"
                effect="light"
              >
                {{
                  lifecycleOptions.find((item) => item.value === row.lifecycleStage)
                    ?.label || row.lifecycleStage
                }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="最近互動" min-width="130">
            <template #default="{ row }">{{
              formatDate(row.lastInteractionAt)
            }}</template>
          </ElTableColumn>

          <ElTableColumn label="最近商機" min-width="130">
            <template #default="{ row }">{{
              formatDate(row.lastOpportunityAt)
            }}</template>
          </ElTableColumn>

          <ElTableColumn label="客戶價值" min-width="140" align="right">
            <template #default="{ row }">{{
              formatCurrency(row.customerValue)
            }}</template>
          </ElTableColumn>

          <ElTableColumn label="活躍度" min-width="100">
            <template #default="{ row }">
              <ElTag
                :type="activityLevelMap[row.activityLevel]?.type"
                size="small"
                effect="light"
              >
                {{ activityLevelMap[row.activityLevel]?.label || row.activityLevel }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="風險狀態" min-width="210" show-overflow-tooltip>
            <template #default="{ row }">
              <span
                :class="row.isHighRisk ? 'font-medium text-rose-600' : 'text-slate-500'"
              >
                {{ riskSummary(row) }}
              </span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="操作" width="110" fixed="right">
            <template #default="{ row }">
              <ElButton text type="primary" @click="openAccountDetail(row)"
                >查看客戶</ElButton
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

.detail-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}
</style>
