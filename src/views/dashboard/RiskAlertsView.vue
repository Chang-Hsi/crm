<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ElButton,
  ElNotification,
  ElOption,
  ElSelect,
  ElSkeleton,
  ElTag,
} from "element-plus";
import { Refresh } from "@element-plus/icons-vue";
import VChart from "vue-echarts";
import { ensureDashboardCharts } from "../../components/dashboard/echartsSetup";
import { accountList } from "../../data/accounts";
import { activityList } from "../../data/activities";
import { channelPerformanceRecords } from "../../data/channelPerformance";
import { issueList } from "../../data/issues";
import { opportunityList, opportunityStageOptions } from "../../data/opportunities";
import { taskList } from "../../data/tasks";
import { userList } from "../../data/users";

ensureDashboardCharts();

const router = useRouter();
const NOW_TS = new Date("2026-04-11T12:00:00+08:00").getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

const loading = ref(true);
const period = ref("month");
const riskTypeFilter = ref("all");
const riskLevelFilter = ref("all");

const periodOptions = [
  { value: "month", label: "本月" },
  { value: "quarter", label: "本季" },
  { value: "year", label: "本年" },
];

const riskTypeOptions = [
  { value: "all", label: "全部類型" },
  { value: "overdue_followup", label: "逾期未跟進" },
  { value: "stagnant_opportunity", label: "商機停滯" },
  { value: "expiring_opportunity", label: "即將失效商機" },
  { value: "issue", label: "客訴 / Issue" },
  { value: "forecast_gap", label: "預測異常" },
];

const riskLevelOptions = [
  { value: "all", label: "全部等級" },
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
];

const riskLevelMeta = {
  high: {
    shortLabel: "高風險",
    fullLabel: "高風險：需立即處理",
    color: "#ef4444",
  },
  medium: {
    shortLabel: "中風險",
    fullLabel: "中風險：需本週追蹤",
    color: "#f59e0b",
  },
  low: {
    shortLabel: "低風險",
    fullLabel: "低風險：持續觀察",
    color: "#22c55e",
  },
};

const userById = new Map(userList.map((item) => [item.id, item]));
const accountById = new Map(accountList.map((item) => [item.id, item]));
const stageLabelMap = Object.fromEntries(
  opportunityStageOptions
    .filter((item) => item.value !== "all")
    .map((item) => [item.value, item.label])
);

const activeRange = computed(() => buildPeriodRange(period.value, NOW_TS));

const stagnantOpportunityRisks = computed(() =>
  opportunityList
    .filter((item) => !["won", "lost"].includes(item.stage))
    .filter((item) => toTimestamp(item.createdAt) <= activeRange.value.end)
    .filter(
      (item) =>
        NOW_TS -
          toTimestamp(item.stageChangedAt || item.updatedAt || item.createdAt) >=
        18 * DAY_MS
    )
    .map((item) => {
      const referenceTs = toTimestamp(item.stageChangedAt || item.updatedAt || item.createdAt);
      const idleDays = Math.floor((NOW_TS - referenceTs) / DAY_MS);
      return createRiskItem({
        id: `opp-stagnant-${item.id}`,
        name: item.name,
        customerName: item.accountName,
        ownerId: item.ownerUserId,
        type: "stagnant_opportunity",
        typeLabel: "商機停滯",
        level: idleDays >= 35 ? "high" : idleDays >= 24 ? "medium" : "low",
        days: idleDays,
        lastFollowUpAt: item.updatedAt,
        detailRoute: { name: "opportunity-detail", params: { opportunityId: item.id } },
        stage: item.stage,
      });
    })
);

const expiringOpportunityRisks = computed(() =>
  opportunityList
    .filter((item) => !["won", "lost"].includes(item.stage))
    .filter((item) => {
      const closeTs = toTimestamp(item.expectedCloseDate);
      return closeTs >= NOW_TS && closeTs <= NOW_TS + 10 * DAY_MS;
    })
    .map((item) => {
      const daysToClose = Math.max(
        0,
        Math.ceil((toTimestamp(item.expectedCloseDate) - NOW_TS) / DAY_MS)
      );
      return createRiskItem({
        id: `opp-expiring-${item.id}`,
        name: item.name,
        customerName: item.accountName,
        ownerId: item.ownerUserId,
        type: "expiring_opportunity",
        typeLabel: "即將失效商機",
        level: daysToClose <= 3 ? "high" : daysToClose <= 6 ? "medium" : "low",
        days: daysToClose,
        lastFollowUpAt: item.updatedAt,
        detailRoute: { name: "opportunity-detail", params: { opportunityId: item.id } },
        stage: item.stage,
      });
    })
);

const overdueTaskRisks = computed(() =>
  taskList
    .filter(
      (item) =>
        ["delayed"].includes(item.status) ||
        (!["completed", "cancelled"].includes(item.status) &&
          toTimestamp(item.dueDate) < NOW_TS)
    )
    .map((item) => {
      const overdueDays = Math.max(
        1,
        Math.floor((NOW_TS - toTimestamp(item.dueDate)) / DAY_MS)
      );
      return createRiskItem({
        id: `task-overdue-${item.id}`,
        name: item.taskName,
        customerName: item.projectName,
        ownerId: item.ownerId,
        type: "overdue_followup",
        typeLabel: "逾期未跟進",
        level:
          overdueDays >= 8 || item.priority === "urgent"
            ? "high"
            : overdueDays >= 4
            ? "medium"
            : "low",
        days: overdueDays,
        lastFollowUpAt: item.updatedAt,
        detailRoute: { name: "projects-tasks" },
        stage: "",
      });
    })
);

const overdueActivityRisks = computed(() =>
  activityList
    .filter(
      (item) =>
        item.nextActionAt &&
        item.status !== "done" &&
        toTimestamp(item.nextActionAt) < NOW_TS
    )
    .map((item) => {
      const overdueDays = Math.max(
        1,
        Math.floor((NOW_TS - toTimestamp(item.nextActionAt)) / DAY_MS)
      );
      return createRiskItem({
        id: `activity-overdue-${item.id}`,
        name: item.title,
        customerName: accountById.get(item.accountId)?.companyName || "-",
        ownerId: item.ownerUserId,
        type: "overdue_followup",
        typeLabel: "逾期未跟進",
        level: overdueDays >= 8 ? "high" : overdueDays >= 4 ? "medium" : "low",
        days: overdueDays,
        lastFollowUpAt: item.occurredAt,
        detailRoute: { name: "engagement-timeline" },
        stage: "",
      });
    })
);

const unresolvedIssueRisks = computed(() =>
  issueList
    .filter((item) => !["resolved", "cancelled"].includes(item.status))
    .map((item) => {
      const pendingDays = Math.max(
        1,
        Math.floor((NOW_TS - toTimestamp(item.reportedAt)) / DAY_MS)
      );
      return createRiskItem({
        id: `issue-risk-${item.id}`,
        name: item.title,
        customerName:
          item.customerName || accountById.get(item.customerId)?.companyName || "-",
        ownerId: item.ownerId,
        type: "issue",
        typeLabel: "客訴 / Issue",
        level:
          item.severity === "critical" || item.priority === "urgent"
            ? "high"
            : item.severity === "high" || item.priority === "high"
            ? "medium"
            : "low",
        days: pendingDays,
        lastFollowUpAt: item.updatedAt,
        detailRoute: { name: "engagement-issues" },
        stage: "",
      });
    })
);

const forecastGapRisks = computed(() =>
  channelPerformanceRecords
    .map((item) => {
      const scoped = item.monthlyPerformance.filter((entry) =>
        isWithinRange(toTimestamp(entry.month), activeRange.value)
      );
      const forecast = scoped.reduce(
        (sum, entry) => sum + Number(entry.estimatedRevenue || 0),
        0
      );
      const actual = scoped.reduce(
        (sum, entry) => sum + Number(entry.periodRevenue || 0),
        0
      );
      const gapRatio = forecast > 0 ? Math.abs(forecast - actual) / forecast : 0;
      return { item, forecast, actual, gapRatio };
    })
    .filter((item) => item.gapRatio >= 0.25)
    .map(({ item, forecast, actual, gapRatio }) =>
      createRiskItem({
        id: `forecast-gap-${item.partnerId}`,
        name: item.partnerName,
        customerName: item.market || "-",
        ownerId: item.ownerId,
        type: "forecast_gap",
        typeLabel: "預測異常",
        level: gapRatio >= 0.45 ? "high" : gapRatio >= 0.32 ? "medium" : "low",
        days: Math.round(gapRatio * 100),
        lastFollowUpAt: item.lastInteractionAt,
        detailRoute: {
          name: "partners-channel-performance-detail",
          params: { partnerId: item.partnerId },
        },
        stage: "",
      })
    )
);

const allRisks = computed(() => [
  ...stagnantOpportunityRisks.value,
  ...expiringOpportunityRisks.value,
  ...overdueTaskRisks.value,
  ...overdueActivityRisks.value,
  ...unresolvedIssueRisks.value,
  ...forecastGapRisks.value,
]);

const filteredRiskRows = computed(() =>
  allRisks.value.filter((item) => {
    const matchesType =
      riskTypeFilter.value === "all" || item.type === riskTypeFilter.value;
    const matchesLevel =
      riskLevelFilter.value === "all" || item.level === riskLevelFilter.value;
    return matchesType && matchesLevel;
  })
);

const displayedRiskRows = computed(() => filteredRiskRows.value.slice(0, 10));

const kpis = computed(() => [
  {
    label: "高風險商機數",
    value: `${
      stagnantOpportunityRisks.value.filter((item) => item.level === "high").length
    } 筆`,
  },
  {
    label: "逾期未跟進案件數",
    value: `${overdueTaskRisks.value.length + overdueActivityRisks.value.length} 筆`,
  },
  { label: "即將失效商機數", value: `${expiringOpportunityRisks.value.length} 筆` },
  { label: "客訴 / Issue 未結案數", value: `${unresolvedIssueRisks.value.length} 件` },
  { label: "預測落差案件數", value: `${forecastGapRisks.value.length} 筆` },
]);

const riskTypeDistribution = computed(() => {
  const map = new Map();
  allRisks.value.forEach((item) => {
    map.set(item.typeLabel, (map.get(item.typeLabel) || 0) + 1);
  });
  return [...map.entries()].map(([name, value]) => ({ name, value }));
});

const totalRiskCount = computed(() => allRisks.value.length);

const riskLevelDistribution = computed(() => {
  const map = { high: 0, medium: 0, low: 0 };
  allRisks.value.forEach((item) => {
    map[item.level] += 1;
  });
  return Object.entries(map).map(([level, value]) => ({
    level,
    name: riskLevelMeta[level].fullLabel,
    shortLabel: riskLevelMeta[level].shortLabel,
    value,
    ratio:
      totalRiskCount.value === 0 ? 0 : Math.round((value / totalRiskCount.value) * 100),
    color: riskLevelMeta[level].color,
  }));
});

const ownerRiskDistribution = computed(() => {
  const owners = new Map();
  allRisks.value.forEach((item) => {
    const ownerName = userById.get(item.ownerId)?.name || "未指派";
    if (!owners.has(ownerName)) {
      owners.set(ownerName, { high: 0, medium: 0, low: 0 });
    }
    owners.get(ownerName)[item.level] += 1;
  });
  return [...owners.entries()]
    .map(([name, levels]) => ({
      name,
      ...levels,
      total: levels.high + levels.medium + levels.low,
    }))
    .sort((a, b) => b.high - a.high || b.total - a.total || b.medium - a.medium);
});

const stagnantStageDistribution = computed(() => {
  const map = new Map();
  stagnantOpportunityRisks.value.forEach((item) => {
    const label = stageLabelMap[item.stage] || item.stage || "未分類";
    map.set(label, (map.get(label) || 0) + 1);
  });
  return [...map.entries()].map(([name, value]) => ({ name, value }));
});

const overdueBucketDistribution = computed(() => {
  const buckets = {
    "1-3 天": 0,
    "4-7 天": 0,
    "8 天以上": 0,
  };
  [...overdueTaskRisks.value, ...overdueActivityRisks.value].forEach((item) => {
    if (item.days <= 3) {
      buckets["1-3 天"] += 1;
    } else if (item.days <= 7) {
      buckets["4-7 天"] += 1;
    } else {
      buckets["8 天以上"] += 1;
    }
  });
  return Object.entries(buckets).map(([name, value]) => ({ name, value }));
});

const issueTrendSeries = computed(() => {
  const points = [];
  for (let index = 13; index >= 0; index -= 1) {
    const dayStart = startOfDayTs(NOW_TS - index * DAY_MS);
    const dayEnd = dayStart + DAY_MS - 1;
    const count = issueList.filter((item) => {
      const ts = toTimestamp(item.createdAt);
      return ts >= dayStart && ts <= dayEnd;
    }).length;
    points.push({
      label: new Intl.DateTimeFormat("zh-TW", {
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(dayStart)),
      value: count,
    });
  }
  return points;
});

const riskTypeOption = computed(() =>
  createPieOption(riskTypeDistribution.value, {
    color: ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#14b8a6"],
  })
);

const riskLevelOption = computed(() => ({
  color: riskLevelDistribution.value.map((item) => item.color),
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "shadow" },
    formatter: (params) => {
      const target = params?.[0];
      if (!target) {
        return "";
      }
      const row = riskLevelDistribution.value[target.dataIndex];
      return `${row.shortLabel}<br/>${row.value} 件（${row.ratio}%）`;
    },
  },
  grid: { top: 12, left: 140, right: 24, bottom: 12 },
  xAxis: {
    type: "value",
    minInterval: 1,
    axisLine: { show: false },
    splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
    axisLabel: { color: "#64748b" },
  },
  yAxis: {
    type: "category",
    data: riskLevelDistribution.value.map((item) => item.name),
    axisTick: { show: false },
    axisLine: { show: false },
    axisLabel: { color: "#475569" },
  },
  series: [
    {
      type: "bar",
      barWidth: 18,
      data: riskLevelDistribution.value.map((item) => item.value),
      itemStyle: { borderRadius: [0, 6, 6, 0] },
      label: {
        show: true,
        position: "right",
        color: "#334155",
        formatter: ({ dataIndex, value }) => {
          const row = riskLevelDistribution.value[dataIndex];
          return `${value} 件（${row?.ratio || 0}%）`;
        },
      },
    },
  ],
}));

const ownerRiskOption = computed(() => ({
  color: ["#ef4444", "#f59e0b", "#22c55e"],
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "shadow" },
    formatter: (params) => {
      const dataIndex = params?.[0]?.dataIndex ?? -1;
      const row = ownerRiskDistribution.value[dataIndex];
      if (!row) {
        return "";
      }

      return [
        row.name,
        `高風險（立即處理）：${row.high} 件`,
        `中風險（本週追蹤）：${row.medium} 件`,
        `低風險（持續觀察）：${row.low} 件`,
        `總風險件數：${row.total} 件`,
      ].join("<br/>");
    },
  },
  legend: {
    top: 0,
    textStyle: { color: "#475569", fontSize: 12 },
  },
  grid: { top: 28, left: 30, right: 12, bottom: 28, containLabel: true },
  xAxis: {
    type: "category",
    data: ownerRiskDistribution.value.map((item) => item.name),
    axisTick: { show: false },
    axisLabel: { color: "#475569", interval: 0, rotate: 18 },
  },
  yAxis: {
    type: "value",
    minInterval: 1,
    axisLine: { show: false },
    splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
    axisLabel: { color: "#64748b" },
  },
  series: [
    {
      name: "高風險（立即處理）",
      type: "bar",
      stack: "owner-risk",
      data: ownerRiskDistribution.value.map((item) => item.high),
    },
    {
      name: "中風險（本週追蹤）",
      type: "bar",
      stack: "owner-risk",
      data: ownerRiskDistribution.value.map((item) => item.medium),
    },
    {
      name: "低風險（持續觀察）",
      type: "bar",
      stack: "owner-risk",
      data: ownerRiskDistribution.value.map((item) => item.low),
    },
    {
      name: "總計",
      type: "bar",
      stack: "owner-risk",
      silent: true,
      itemStyle: {
        color: "transparent",
      },
      emphasis: {
        disabled: true,
      },
      tooltip: {
        show: false,
      },
      data: ownerRiskDistribution.value.map(() => 0.001),
      label: {
        show: true,
        position: "top",
        color: "#334155",
        formatter: ({ dataIndex }) =>
          `${ownerRiskDistribution.value[dataIndex]?.total || 0}`,
      },
    },
  ],
}));

const stagnantStageOption = computed(() => {
  if (stagnantStageDistribution.value.length === 0) {
    return {
      xAxis: { show: false },
      yAxis: { show: false },
      series: [],
      graphic: [
        {
          type: "text",
          left: "center",
          top: "middle",
          style: {
            text: "目前無商機停滯資料",
            fill: "#94a3b8",
            fontSize: 14,
            fontWeight: 500,
            textAlign: "center",
          },
        },
      ],
    };
  }

  return {
    color: ["#2563eb"],
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params) => {
        const target = params?.[0];
        if (!target) {
          return "";
        }
        return `${target.name}<br/>停滯案件數：${target.value} 件`;
      },
    },
    grid: { top: 12, left: 88, right: 24, bottom: 12 },
    xAxis: {
      type: "value",
      minInterval: 1,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
      axisLabel: { color: "#64748b" },
    },
    yAxis: {
      type: "category",
      data: stagnantStageDistribution.value.map((item) => item.name),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: "#475569" },
    },
    series: [
      {
        type: "bar",
        barWidth: 18,
        data: stagnantStageDistribution.value.map((item) => item.value),
        itemStyle: { borderRadius: [0, 6, 6, 0] },
        label: {
          show: true,
          position: "right",
          color: "#334155",
          formatter: "{c}",
        },
      },
    ],
  };
});

const overdueDistributionOption = computed(() => ({
  color: ["#f97316"],
  tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
  grid: { top: 12, left: 30, right: 12, bottom: 24, containLabel: true },
  xAxis: {
    type: "category",
    data: overdueBucketDistribution.value.map((item) => item.name),
    axisTick: { show: false },
    axisLabel: { color: "#475569" },
  },
  yAxis: {
    type: "value",
    axisLine: { show: false },
    splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
    axisLabel: { color: "#64748b" },
  },
  series: [
    {
      type: "bar",
      barWidth: 22,
      data: overdueBucketDistribution.value.map((item) => item.value),
      itemStyle: { borderRadius: [6, 6, 0, 0] },
    },
  ],
}));

const issueTrendOption = computed(() => ({
  color: ["#8b5cf6"],
  tooltip: {
    trigger: "axis",
    formatter: (params) => {
      const target = params?.[0];
      if (!target) {
        return "";
      }
      return `${target.axisValue}<br/>新增 Issue：${target.value} 件`;
    },
  },
  grid: { top: 12, left: 30, right: 12, bottom: 24, containLabel: true },
  xAxis: {
    type: "category",
    boundaryGap: false,
    data: issueTrendSeries.value.map((item) => item.label),
    axisTick: { show: false },
    axisLabel: { color: "#475569" },
  },
  yAxis: {
    type: "value",
    minInterval: 1,
    max:
      Math.max(...issueTrendSeries.value.map((item) => item.value), 0) <= 3
        ? Math.max(...issueTrendSeries.value.map((item) => item.value), 0) + 1
        : undefined,
    interval:
      Math.max(...issueTrendSeries.value.map((item) => item.value), 0) <= 3
        ? 1
        : undefined,
    axisLine: { show: false },
    splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
    axisLabel: { color: "#64748b" },
  },
  series: [
    {
      type: "line",
      smooth: true,
      symbolSize: 6,
      areaStyle: { color: "rgba(139, 92, 246, 0.14)" },
      lineStyle: { width: 2.5 },
      data: issueTrendSeries.value.map((item) => item.value),
    },
  ],
}));

onMounted(() => {
  window.setTimeout(() => {
    loading.value = false;
  }, 220);
});

function createRiskItem({
  id,
  name,
  customerName,
  ownerId,
  type,
  typeLabel,
  level,
  days,
  lastFollowUpAt,
  detailRoute,
  stage,
}) {
  return {
    id,
    name,
    customerName,
    ownerId,
    ownerName: userById.get(ownerId)?.name || "未指派",
    type,
    typeLabel,
    level,
    levelLabel: riskLevelMeta[level]?.shortLabel || "低風險",
    days,
    lastFollowUpAt,
    lastFollowUpText: formatDateTime(lastFollowUpAt),
    detailRoute,
    stage,
  };
}

function createPieOption(series, config = {}) {
  return {
    color: config.color || ["#2563eb", "#f59e0b", "#ef4444", "#8b5cf6"],
    tooltip: {
      trigger: "item",
      formatter: "{b}<br/>{c} 件（{d}%）",
    },
    series: [
      {
        type: "pie",
        radius: ["0%", "72%"],
        center: ["50%", "48%"],
        padAngle: 2,
        data: series,
        label: {
          show: true,
          position: "outside",
          color: "#334155",
          formatter: ({ name, value, percent }) => `${name}\n${value} 件（${percent}%）`,
        },
        labelLine: {
          show: true,
          length: 14,
          length2: 10,
          lineStyle: {
            color: "#94a3b8",
          },
        },
      },
    ],
  };
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

function startOfDayTs(ts) {
  const date = new Date(ts);
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
  const normalized = String(value).includes("T")
    ? String(value)
    : String(value).replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function isWithinRange(time, range) {
  return time >= range.start && time <= range.end;
}

function formatDateTime(value) {
  const ts = toTimestamp(value);
  if (!ts) {
    return "-";
  }
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

function refreshPage() {
  loading.value = true;
  window.setTimeout(() => {
    loading.value = false;
    ElNotification({
      title: "已更新",
      message: "風險預警資料已重新整理",
      type: "success",
      position: "top-right",
    });
  }, 220);
}

function goToDetail(row) {
  if (!row?.detailRoute) {
    return;
  }
  router.push(row.detailRoute);
}

function goToChurnAlerts() {
  router.push({ path: "/reports/churn-alerts" });
}
</script>

<template>
  <div class="min-h-full bg-slate-100 p-5">
    <section class="grid gap-4">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div class="grid gap-1">
          <h1 class="text-xl font-bold text-slate-900">風險預警</h1>
          <p class="text-sm text-slate-500">風險分布、診斷分析與待處理清單</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElSelect v-model="period" class="!w-[110px]">
            <ElOption
              v-for="item in periodOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
          <ElButton @click="goToChurnAlerts">查看風險</ElButton>
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
            </article>
          </section>

          <section class="grid grid-cols-1 gap-3 xl:grid-cols-12">
            <article
              class="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-4"
            >
              <div class="mb-3 flex items-center justify-between gap-2">
                <h2 class="text-lg font-semibold text-slate-900">風險類型分布</h2>
                <span class="text-sm text-slate-500">{{ allRisks.length }} 件</span>
              </div>
              <div class="h-[280px]">
                <VChart :option="riskTypeOption" autoresize class="h-full w-full" />
              </div>
            </article>

            <article
              class="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-3"
            >
              <div class="mb-3 flex items-center justify-between gap-2">
                <h2 class="text-lg font-semibold text-slate-900">目前風險案件等級分布</h2>
              </div>
              <div class="h-[280px]">
                <VChart :option="riskLevelOption" autoresize class="h-full w-full" />
              </div>
            </article>

            <article
              class="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-5"
            >
              <div class="mb-3 flex items-center justify-between gap-2">
                <h2 class="text-lg font-semibold text-slate-900">負責人風險比較</h2>
              </div>
              <div class="h-[280px]">
                <VChart :option="ownerRiskOption" autoresize class="h-full w-full" />
              </div>
            </article>

            <article
              class="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-4"
            >
              <div class="mb-3 flex items-center justify-between gap-2">
                <h2 class="text-lg font-semibold text-slate-900">商機停滯階段分析</h2>
              </div>
              <div class="h-[280px]">
                <VChart :option="stagnantStageOption" autoresize class="h-full w-full" />
              </div>
            </article>

            <article
              class="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-4"
            >
              <div class="mb-3 flex items-center justify-between gap-2">
                <h2 class="text-lg font-semibold text-slate-900">逾期天數分布</h2>
              </div>
              <div class="h-[280px]">
                <VChart
                  :option="overdueDistributionOption"
                  autoresize
                  class="h-full w-full"
                />
              </div>
            </article>

            <article
              class="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-4"
            >
              <div class="mb-3 flex items-center justify-between gap-2">
                <h2 class="text-lg font-semibold text-slate-900">客訴 / Issue 趨勢</h2>
              </div>
              <div class="h-[280px]">
                <VChart :option="issueTrendOption" autoresize class="h-full w-full" />
              </div>
            </article>
          </section>

          <section class="rounded-xl border border-slate-200 bg-white p-4">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-lg font-semibold text-slate-900">待處理風險清單</h2>
              <div class="flex flex-wrap items-center gap-2">
                <ElSelect v-model="riskTypeFilter" class="!w-[140px]">
                  <ElOption
                    v-for="item in riskTypeOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
                <ElSelect v-model="riskLevelFilter" class="!w-[120px]">
                  <ElOption
                    v-for="item in riskLevelOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="min-w-[1120px] w-full border-collapse">
                <thead>
                  <tr>
                    <th
                      class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600"
                    >
                      案件名稱
                    </th>
                    <th
                      class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600"
                    >
                      客戶 / 專案
                    </th>
                    <th
                      class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600"
                    >
                      負責人
                    </th>
                    <th
                      class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600"
                    >
                      風險類型
                    </th>
                    <th
                      class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600"
                    >
                      風險等級
                    </th>
                    <th
                      class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600"
                    >
                      停滯 / 逾期天數
                    </th>
                    <th
                      class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600"
                    >
                      最後跟進時間
                    </th>
                    <th
                      class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600"
                    >
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in displayedRiskRows"
                    :key="row.id"
                    class="hover:bg-slate-50"
                  >
                    <td
                      class="border border-slate-200 px-3 py-2 text-base text-slate-900"
                    >
                      {{ row.name }}
                    </td>
                    <td
                      class="border border-slate-200 px-3 py-2 text-base text-slate-700"
                    >
                      {{ row.customerName }}
                    </td>
                    <td
                      class="border border-slate-200 px-3 py-2 text-base text-slate-700"
                    >
                      {{ row.ownerName }}
                    </td>
                    <td
                      class="border border-slate-200 px-3 py-2 text-base text-slate-700"
                    >
                      <ElTag effect="plain" round>{{ row.typeLabel }}</ElTag>
                    </td>
                    <td
                      class="border border-slate-200 px-3 py-2 text-base text-slate-700"
                    >
                      <ElTag
                        :type="
                          row.level === 'high'
                            ? 'danger'
                            : row.level === 'medium'
                            ? 'warning'
                            : 'info'
                        "
                      >
                        {{ row.levelLabel }}
                      </ElTag>
                    </td>
                    <td
                      class="border border-slate-200 px-3 py-2 text-base text-slate-700"
                    >
                      {{ row.days }} 天
                    </td>
                    <td
                      class="border border-slate-200 px-3 py-2 text-base text-slate-700"
                    >
                      {{ row.lastFollowUpText }}
                    </td>
                    <td
                      class="border border-slate-200 px-3 py-2 text-base text-slate-700"
                    >
                      <ElButton text type="primary" @click="goToDetail(row)"
                        >查看詳情</ElButton
                      >
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
