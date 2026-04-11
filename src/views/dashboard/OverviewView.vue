<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  ElAvatar,
  ElButton,
  ElNotification,
  ElOption,
  ElSelect,
  ElTag,
} from "element-plus";
import { ArrowRight, Download, Plus, Refresh } from "@element-plus/icons-vue";
import VChart from "vue-echarts";
import { ensureDashboardCharts } from "../../components/dashboard/echartsSetup";
import { accountList } from "../../data/accounts";
import { activityList } from "../../data/activities";
import {
  channelPerformanceRecords,
  partnerLevelMap,
  trendStatusMap,
} from "../../data/channelPerformance";
import { issueList, issueSeverityMap, issueStatusMap } from "../../data/issues";
import {
  opportunityList,
  opportunityStageOptions,
  opportunityTypeOptions,
} from "../../data/opportunities";
import { projectList, projectStatusMap, riskLevelMap } from "../../data/projects";
import { taskList, taskPriorityMap, taskStatusMap } from "../../data/tasks";
import { userList } from "../../data/users";
import { useAuthSession } from "../../utils/auth";

const router = useRouter();
const { authSession } = useAuthSession();
ensureDashboardCharts();

const DASHBOARD_NOW_TS = new Date("2026-04-10T12:00:00+08:00").getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

const periodOptions = [
  { value: "week", label: "本週" },
  { value: "month", label: "本月" },
  { value: "quarter", label: "本季" },
];

const currentPeriod = ref("month");
const currentScope = ref("mine");
const lastRefreshedAt = ref(new Date(DASHBOARD_NOW_TS).toISOString());
const topDealsRange = ref("30d");
const pipelineGranularity = ref("weekly");
const profitYear = ref("2026");

const revenueRecords = [
  {
    id: "rev-001",
    accountId: "acc-001",
    ownerId: "u-001",
    revenueDate: "2026-04-02",
    grossAmount: 3200000,
    netAmount: 3150000,
    region: "台灣",
    product: "會員導流方案",
  },
  {
    id: "rev-002",
    accountId: "acc-002",
    ownerId: "u-002",
    revenueDate: "2026-04-01",
    grossAmount: 4200000,
    netAmount: 4080000,
    region: "日本",
    product: "品牌推廣專案",
  },
  {
    id: "rev-003",
    accountId: "acc-003",
    ownerId: "u-003",
    revenueDate: "2026-03-30",
    grossAmount: 1680000,
    netAmount: 1650000,
    region: "東南亞",
    product: "支付串接方案",
  },
  {
    id: "rev-004",
    accountId: "acc-004",
    ownerId: "u-001",
    revenueDate: "2026-03-29",
    grossAmount: 2600000,
    netAmount: 2530000,
    region: "台灣",
    product: "通路拓展方案",
  },
  {
    id: "rev-005",
    accountId: "acc-005",
    ownerId: "u-004",
    revenueDate: "2026-03-27",
    grossAmount: 1450000,
    netAmount: 1390000,
    region: "北美",
    product: "會員導流方案",
  },
  {
    id: "rev-006",
    accountId: "acc-001",
    ownerId: "u-001",
    revenueDate: "2026-03-25",
    grossAmount: 980000,
    netAmount: 960000,
    region: "台灣",
    product: "儲值聯名方案",
  },
  {
    id: "rev-007",
    accountId: "acc-010",
    ownerId: "u-002",
    revenueDate: "2026-03-24",
    grossAmount: 1230000,
    netAmount: 1180000,
    region: "台灣",
    product: "品牌推廣專案",
  },
  {
    id: "rev-008",
    accountId: "acc-012",
    ownerId: "u-002",
    revenueDate: "2026-03-22",
    grossAmount: 1860000,
    netAmount: 1790000,
    region: "東南亞",
    product: "內容導流合作",
  },
  {
    id: "rev-009",
    accountId: "acc-008",
    ownerId: "u-003",
    revenueDate: "2026-04-03",
    grossAmount: 2140000,
    netAmount: 2080000,
    region: "北美",
    product: "代理聯運方案",
  },
  {
    id: "rev-010",
    accountId: "acc-006",
    ownerId: "u-002",
    revenueDate: "2026-04-04",
    grossAmount: 760000,
    netAmount: 730000,
    region: "台灣",
    product: "點數包重啟方案",
  },
  {
    id: "rev-011",
    accountId: "acc-011",
    ownerId: "u-004",
    revenueDate: "2026-04-05",
    grossAmount: 1180000,
    netAmount: 1130000,
    region: "東南亞",
    product: "電商上架合作",
  },
  {
    id: "rev-012",
    accountId: "acc-007",
    ownerId: "u-001",
    revenueDate: "2026-04-06",
    grossAmount: 560000,
    netAmount: 540000,
    region: "東南亞",
    product: "活動技術合作",
  },
  {
    id: "rev-013",
    accountId: "acc-010",
    ownerId: "u-001",
    revenueDate: "2026-04-07",
    grossAmount: 1720000,
    netAmount: 1650000,
    region: "台灣",
    product: "品牌聯名活動",
  },
  {
    id: "rev-014",
    accountId: "acc-005",
    ownerId: "u-004",
    revenueDate: "2026-04-08",
    grossAmount: 980000,
    netAmount: 950000,
    region: "北美",
    product: "會員導流方案",
  },
  {
    id: "rev-015",
    accountId: "acc-002",
    ownerId: "u-002",
    revenueDate: "2026-04-09",
    grossAmount: 1380000,
    netAmount: 1330000,
    region: "日本",
    product: "授權合作擴充",
  },
  {
    id: "rev-016",
    accountId: "acc-012",
    ownerId: "u-002",
    revenueDate: "2026-04-10",
    grossAmount: 840000,
    netAmount: 810000,
    region: "台灣",
    product: "內容導流合作",
  },
];

const kpiTrendColorMap = {
  month_revenue: "#0f766e",
  new_pipeline: "#0369a1",
  active_opportunity: "#2563eb",
  won_amount: "#16a34a",
  active_customer: "#7c3aed",
  risk_cases: "#dc2626",
};

const piePalette = ["#0ea5e9", "#14b8a6", "#6366f1", "#f59e0b", "#ef4444", "#64748b"];

const userById = new Map(userList.map((item) => [item.id, item]));
const stageMeta = opportunityStageOptions.filter(
  (item) => !["all", "won", "lost"].includes(item.value)
);

const currentUser = computed(() => {
  const targetId = authSession.value?.employeeId || "u-001";
  return userById.get(targetId) || userById.get("u-001") || userList[0];
});

const currentRoleLabel = computed(
  () => authSession.value?.primaryRoleLabel || "BD / Sales"
);

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

const periodRange = computed(() =>
  buildPeriodRange(currentPeriod.value, DASHBOARD_NOW_TS)
);

const scopedAccounts = computed(() =>
  accountList.filter((item) => matchesScope(item.ownerUserId, currentScope.value))
);

const scopedOpportunities = computed(() =>
  opportunityList.filter((item) => matchesScope(item.ownerUserId, currentScope.value))
);

const scopedTasks = computed(() =>
  taskList.filter((item) => matchesScope(item.ownerId, currentScope.value))
);

const scopedIssues = computed(() =>
  issueList.filter((item) => matchesScope(item.ownerId, currentScope.value))
);

const scopedActivities = computed(() =>
  activityList.filter((item) => matchesScope(item.ownerUserId, currentScope.value))
);

const scopedProjects = computed(() =>
  projectList.filter((item) => matchesScope(item.ownerId, currentScope.value))
);

const scopedRevenue = computed(() =>
  revenueRecords.filter((item) => matchesScope(item.ownerId, currentScope.value))
);

const scopedPartners = computed(() =>
  channelPerformanceRecords.filter((item) =>
    matchesScope(item.ownerId, currentScope.value)
  )
);

const currentRevenueRecords = computed(() =>
  scopedRevenue.value.filter((item) =>
    isWithinRange(toTimestamp(item.revenueDate), periodRange.value.current)
  )
);

const previousRevenueRecords = computed(() =>
  scopedRevenue.value.filter((item) =>
    isWithinRange(toTimestamp(item.revenueDate), periodRange.value.previous)
  )
);

const kpiCards = computed(() => {
  const currentRevenue = sumBy(currentRevenueRecords.value, "grossAmount");
  const previousRevenue = sumBy(previousRevenueRecords.value, "grossAmount");

  const currentNewOppAmount = sumBy(
    scopedOpportunities.value.filter((item) =>
      isWithinRange(toTimestamp(item.createdAt), periodRange.value.current)
    ),
    "expectedRevenue"
  );
  const previousNewOppAmount = sumBy(
    scopedOpportunities.value.filter((item) =>
      isWithinRange(toTimestamp(item.createdAt), periodRange.value.previous)
    ),
    "expectedRevenue"
  );

  const activeOpportunityCount = scopedOpportunities.value.filter(
    (item) => item.status === "active"
  ).length;
  const previousActiveOpportunityCount = scopedOpportunities.value.filter(
    (item) =>
      item.status === "active" &&
      toTimestamp(item.createdAt) <= periodRange.value.previous.end
  ).length;

  const currentWonAmount = sumBy(
    scopedOpportunities.value.filter(
      (item) =>
        item.stage === "won" &&
        isWithinRange(toTimestamp(item.expectedCloseDate), periodRange.value.current)
    ),
    "expectedRevenue"
  );
  const previousWonAmount = sumBy(
    scopedOpportunities.value.filter(
      (item) =>
        item.stage === "won" &&
        isWithinRange(toTimestamp(item.expectedCloseDate), periodRange.value.previous)
    ),
    "expectedRevenue"
  );

  const activeCustomerCount = scopedAccounts.value.filter(
    (item) =>
      item.status === "active" &&
      hasRecentActivity(item.id, periodRange.value.current.start)
  ).length;

  const previousActiveCustomerCount = scopedAccounts.value.filter(
    (item) =>
      item.status === "active" &&
      hasRecentActivity(item.id, periodRange.value.previous.start)
  ).length;

  const highRiskNow = countHighRisk(
    scopedTasks.value,
    scopedIssues.value,
    scopedProjects.value,
    scopedAccounts.value
  );
  const highRiskPrevious = countHighRisk(
    scopedTasks.value.filter(
      (item) => toTimestamp(item.updatedAt) <= periodRange.value.previous.end
    ),
    scopedIssues.value.filter(
      (item) => toTimestamp(item.updatedAt) <= periodRange.value.previous.end
    ),
    scopedProjects.value.filter(
      (item) => toTimestamp(item.updatedAt) <= periodRange.value.previous.end
    ),
    scopedAccounts.value
  );

  return [
    createMetricCard({
      key: "month_revenue",
      label: "本月營收",
      currentRaw: currentRevenue,
      previousRaw: previousRevenue,
      value: formatCurrency(currentRevenue),
      routeName: "finance-revenue-records",
      helper: "本期 gross revenue",
    }),
    createMetricCard({
      key: "new_pipeline",
      label: "本月新增商機金額",
      currentRaw: currentNewOppAmount,
      previousRaw: previousNewOppAmount,
      value: formatCurrency(currentNewOppAmount),
      routeName: "opportunities-pipeline",
      helper: "本期新增商機",
    }),
    createMetricCard({
      key: "active_opportunity",
      label: "進行中商機數",
      currentRaw: activeOpportunityCount,
      previousRaw: previousActiveOpportunityCount,
      value: `${activeOpportunityCount} 筆`,
      routeName: "opportunities-pipeline",
      helper: "目前 active pipeline",
    }),
    createMetricCard({
      key: "won_amount",
      label: "本月成交金額",
      currentRaw: currentWonAmount,
      previousRaw: previousWonAmount,
      value: formatCurrency(currentWonAmount),
      routeName: "opportunities-pipeline",
      helper: "成交商機總額",
    }),
    createMetricCard({
      key: "active_customer",
      label: "活躍客戶數",
      currentRaw: activeCustomerCount,
      previousRaw: previousActiveCustomerCount,
      value: `${activeCustomerCount} 家`,
      routeName: "accounts-list",
      helper: "近期待跟進客戶",
    }),
    createMetricCard({
      key: "risk_cases",
      label: "高風險案件數",
      currentRaw: highRiskNow,
      previousRaw: highRiskPrevious,
      value: `${highRiskNow} 件`,
      routeName: "dashboard-risk-alerts",
      helper: "Issue / Task / 專案 / 客戶風險",
    }),
  ];
});

const pipelineSummary = computed(() => {
  const rows = stageMeta.map((stage) => {
    const items = scopedOpportunities.value.filter((item) => item.stage === stage.value);
    const totalAmount = sumBy(items, "expectedRevenue");
    const avgProbability =
      items.length === 0
        ? 0
        : Math.round(
            items.reduce((sum, item) => sum + Number(item.probability || 0), 0) /
              items.length
          );

    return {
      value: stage.value,
      label: stage.label,
      count: items.length,
      totalAmount,
      avgProbability,
    };
  });

  const activeList = scopedOpportunities.value.filter((item) => item.status === "active");
  const wonCount = scopedOpportunities.value.filter((item) => item.stage === "won")
    .length;
  const lostCount = scopedOpportunities.value.filter((item) => item.stage === "lost")
    .length;
  const closingSoonCount = activeList.filter((item) => {
    const closeTs = toTimestamp(item.expectedCloseDate);
    return closeTs >= DASHBOARD_NOW_TS && closeTs <= DASHBOARD_NOW_TS + 14 * DAY_MS;
  }).length;
  const forecastAmount = activeList.reduce(
    (sum, item) =>
      sum + (Number(item.expectedRevenue || 0) * Number(item.probability || 0)) / 100,
    0
  );
  const closedBase = wonCount + lostCount;

  return {
    rows,
    closeRate: closedBase === 0 ? 0 : Math.round((wonCount / closedBase) * 100),
    lossRate: closedBase === 0 ? 0 : Math.round((lostCount / closedBase) * 100),
    closingSoonCount,
    forecastAmount,
    wonCount,
    lostCount,
  };
});

const personalTodoItems = computed(() => {
  const ownerId = currentUser.value?.id;
  const dueThreshold = DASHBOARD_NOW_TS + 7 * DAY_MS;

  const tasks = taskList
    .filter(
      (item) =>
        item.ownerId === ownerId &&
        !["completed", "cancelled"].includes(item.status) &&
        toTimestamp(item.dueDate) <= dueThreshold
    )
    .map((item) => ({
      id: item.id,
      type: "task",
      label: "Task",
      title: item.taskName,
      subtitle: `${item.projectName} / ${
        taskStatusMap[item.status]?.label || item.status
      }`,
      dueAt: item.dueDate,
      routeName: "projects-tasks",
    }));

  const activities = activityList
    .filter(
      (item) =>
        item.ownerUserId === ownerId &&
        item.status !== "done" &&
        item.nextActionAt &&
        toTimestamp(item.nextActionAt) <= dueThreshold
    )
    .map((item) => ({
      id: item.id,
      type: "activity",
      label: "Follow-up",
      title: item.nextAction || item.title,
      subtitle: item.title,
      dueAt: item.nextActionAt,
      routeName: "engagement-timeline",
    }));

  const issues = issueList
    .filter(
      (item) =>
        item.ownerId === ownerId &&
        !["resolved", "cancelled"].includes(item.status) &&
        (["high", "critical"].includes(item.severity) ||
          ["high", "urgent"].includes(item.priority))
    )
    .map((item) => ({
      id: item.id,
      type: "issue",
      label: "Issue",
      title: item.title,
      subtitle: issueStatusMap[item.status]?.label || item.status,
      dueAt: item.dueAt,
      routeName: "engagement-issues",
    }));

  const opportunities = opportunityList
    .filter(
      (item) =>
        item.ownerUserId === ownerId &&
        item.status === "active" &&
        toTimestamp(item.expectedCloseDate) <= DASHBOARD_NOW_TS + 14 * DAY_MS
    )
    .map((item) => ({
      id: item.id,
      type: "opportunity",
      label: "商機",
      title: item.name,
      subtitle: `${item.accountName} / 預計 ${formatDate(item.expectedCloseDate)} close`,
      dueAt: item.expectedCloseDate,
      routeName: "opportunity-detail",
      routeParams: { opportunityId: item.id },
    }));

  return [...tasks, ...activities, ...issues, ...opportunities]
    .sort((a, b) => toTimestamp(a.dueAt) - toTimestamp(b.dueAt))
    .slice(0, 6);
});

const riskAlerts = computed(() => {
  const list = [];

  scopedTasks.value.forEach((item) => {
    if (
      item.status === "delayed" ||
      (!["completed", "cancelled"].includes(item.status) &&
        toTimestamp(item.dueDate) < DASHBOARD_NOW_TS)
    ) {
      list.push({
        id: `task-${item.id}`,
        source: "任務",
        title: item.taskName,
        summary: `${item.projectName} / ${
          taskPriorityMap[item.priority]?.label || item.priority
        }`,
        routeName: "projects-tasks",
      });
    }
  });

  scopedIssues.value.forEach((item) => {
    if (
      !["resolved", "cancelled"].includes(item.status) &&
      (["high", "critical"].includes(item.severity) ||
        ["high", "urgent"].includes(item.priority))
    ) {
      list.push({
        id: `issue-${item.id}`,
        source: "Issue",
        title: item.title,
        summary: `${issueSeverityMap[item.severity]?.label || item.severity} / ${
          issueStatusMap[item.status]?.label || item.status
        }`,
        routeName: "engagement-issues",
      });
    }
  });

  scopedProjects.value.forEach((item) => {
    if (item.status === "delayed" || item.riskLevel === "high") {
      list.push({
        id: `project-${item.id}`,
        source: "專案",
        title: item.projectName,
        summary: `${projectStatusMap[item.status]?.label || item.status} / ${
          riskLevelMap[item.riskLevel]?.label || item.riskLevel
        }`,
        routeName: "project-detail",
        routeParams: { projectId: item.id },
      });
    }
  });

  scopedAccounts.value.forEach((item) => {
    if (item.lifecycleStage === "churn" || item.status === "churned") {
      list.push({
        id: `account-${item.id}`,
        source: "客戶",
        title: item.companyName,
        summary: "流失風險 / 需重新啟動經營節奏",
        routeName: "account-detail",
        routeParams: { accountId: item.id },
      });
    }
  });

  scopedPartners.value.forEach((item) => {
    if (item.warnings?.length) {
      list.push({
        id: `partner-${item.partnerId}`,
        source: "夥伴",
        title: item.partnerName,
        summary: item.warnings[0],
        routeName: "partners-channel-performance-detail",
        routeParams: { partnerId: item.partnerId },
      });
    }
  });

  return list.slice(0, 6);
});

const revenueSummary = computed(() => {
  const gross = sumBy(currentRevenueRecords.value, "grossAmount");
  const net = sumBy(currentRevenueRecords.value, "netAmount");
  const previousNet = sumBy(previousRevenueRecords.value, "netAmount");

  const regionMap = new Map();
  const productMap = new Map();

  currentRevenueRecords.value.forEach((item) => {
    regionMap.set(
      item.region,
      (regionMap.get(item.region) || 0) + Number(item.netAmount || 0)
    );
    productMap.set(
      item.product,
      (productMap.get(item.product) || 0) + Number(item.netAmount || 0)
    );
  });

  const total = Math.max(net, 1);
  const regions = [...regionMap.entries()]
    .map(([name, amount]) => ({
      name,
      amount,
      ratio: Math.round((amount / total) * 100),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const topProducts = [...productMap.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  return {
    gross,
    net,
    outstanding: Math.max(gross - net, 0),
    delta: computeDelta(net, previousNet),
    regions,
    topProducts,
  };
});

const customerDynamics = computed(() =>
  scopedAccounts.value
    .slice()
    .sort((a, b) => toTimestamp(b.updatedAt) - toTimestamp(a.updatedAt))
    .slice(0, 6)
    .map((item) => {
      const activityCount = scopedActivities.value.filter(
        (activity) =>
          activity.accountId === item.id &&
          toTimestamp(activity.occurredAt) >= DASHBOARD_NOW_TS - 30 * DAY_MS
      ).length;

      return {
        id: item.id,
        name: item.companyName,
        ownerName: userById.get(item.ownerUserId)?.name || "未指派",
        nextAction: item.nextAction?.title || "待安排下一步",
        updatedAt: item.updatedAt,
        activityCount,
      };
    })
);

const projectSummary = computed(() => {
  const inProgressCount = scopedProjects.value.filter((item) =>
    ["in_progress", "not_started", "paused"].includes(item.status)
  ).length;
  const delayedCount = scopedProjects.value.filter((item) => item.status === "delayed")
    .length;

  const upcomingMilestones = scopedProjects.value
    .flatMap((project) =>
      (project.milestones || []).map((milestone) => ({
        ...milestone,
        projectId: project.id,
        projectName: project.projectName,
      }))
    )
    .filter(
      (item) =>
        !item.completedAt &&
        toTimestamp(item.dueDate) >= DASHBOARD_NOW_TS &&
        toTimestamp(item.dueDate) <= DASHBOARD_NOW_TS + 10 * DAY_MS
    )
    .sort((a, b) => toTimestamp(a.dueDate) - toTimestamp(b.dueDate))
    .slice(0, 5);

  return {
    inProgressCount,
    delayedCount,
    upcomingMilestones,
  };
});

const partnerSummary = computed(() =>
  scopedPartners.value
    .map((item) => {
      const thisMonth = item.monthlyPerformance.find(
        (entry) => entry.month === "2026-04-01"
      );
      const lastMonth = item.monthlyPerformance.find(
        (entry) => entry.month === "2026-03-01"
      );
      const currentRevenue = Number(thisMonth?.periodRevenue || 0);
      const previousRevenue = Number(lastMonth?.periodRevenue || 0);
      const trendValue =
        currentRevenue > previousRevenue
          ? "growing"
          : currentRevenue < previousRevenue
          ? "declining"
          : "flat";

      return {
        id: item.partnerId,
        name: item.partnerName,
        revenue: currentRevenue,
        warnings: item.warnings || [],
        level: partnerLevelMap[item.partnerLevel]?.label || item.partnerLevel,
        trendValue,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
);

const timelinePool = computed(() => {
  const items = [];

  scopedActivities.value.forEach((item) => {
    items.push({
      id: `activity-${item.id}`,
      kind: "互動",
      title: item.title,
      summary: item.summary,
      occurredAt: item.occurredAt,
      routeName: "engagement-timeline",
    });
  });

  scopedIssues.value.forEach((item) => {
    items.push({
      id: `issue-${item.id}`,
      kind: "Issue",
      title: item.title,
      summary: issueStatusMap[item.status]?.label || item.status,
      occurredAt: item.updatedAt,
      routeName: "engagement-issues",
    });

    (item.timeline || []).forEach((line) => {
      items.push({
        id: `issue-line-${line.id}`,
        kind: "Issue",
        title: line.title,
        summary: `${item.title} / ${line.description || "-"}`,
        occurredAt: line.occurredAt,
        routeName: "engagement-issues",
      });
    });
  });

  scopedProjects.value.forEach((item) => {
    (item.activities || []).forEach((line) => {
      items.push({
        id: `project-${line.id}`,
        kind: "專案",
        title: line.title,
        summary: `${item.projectName} / ${line.description || "-"}`,
        occurredAt: line.occurredAt,
        routeName: "project-detail",
        routeParams: { projectId: item.id },
      });
    });
  });

  scopedTasks.value.forEach((item) => {
    (item.activities || []).forEach((line) => {
      items.push({
        id: `task-${line.id}`,
        kind: "Task",
        title: line.title,
        summary: `${item.taskName} / ${line.description || "-"}`,
        occurredAt: line.occurredAt,
        routeName: "projects-tasks",
      });
    });
  });

  return items.sort((a, b) => toTimestamp(b.occurredAt) - toTimestamp(a.occurredAt));
});

const timelineItems = computed(() =>
  timelinePool.value.slice(0, 10).map((item) => ({
    ...item,
    occurredText: formatDateTime(item.occurredAt),
  }))
);

const pageSubtitle = computed(() => {
  const scopeLabel =
    availableScopeOptions.value.find((item) => item.value === currentScope.value)
      ?.label || "我的";
  const periodLabel =
    periodOptions.find((item) => item.value === currentPeriod.value)?.label || "本月";

  return `${currentRoleLabel.value} 視角 / ${scopeLabel}資料 / ${periodLabel}`;
});

const kpiTrendSeries = computed(() =>
  Object.fromEntries(
    kpiCards.value.map((card) => [
      card.key,
      buildMiniTrend(card.previousRaw, card.currentRaw, card.key),
    ])
  )
);

const pipelineChartSeries = computed(() =>
  pipelineSummary.value.rows.map((item) => ({
    name: item.label,
    value: Math.round(item.totalAmount),
    count: item.count,
    probability: item.avgProbability,
  }))
);

const todoTypeSeries = computed(() => {
  const counter = { task: 0, activity: 0, issue: 0, opportunity: 0 };

  personalTodoItems.value.forEach((item) => {
    if (counter[item.type] !== undefined) {
      counter[item.type] += 1;
    }
  });

  return [
    { name: "Task", value: counter.task },
    { name: "Activity", value: counter.activity },
    { name: "Issue", value: counter.issue },
    { name: "Opportunity", value: counter.opportunity },
  ];
});

const riskLevelSeries = computed(() => {
  const map = new Map();

  riskAlerts.value.forEach((item) => {
    map.set(item.source, (map.get(item.source) || 0) + 1);
  });

  return [...map.entries()].map(([name, value]) => ({ name, value }));
});

const revenueTrendSeries = computed(() => {
  const months = createRecentMonthKeys(6, DASHBOARD_NOW_TS);

  return months.map((monthKey) => {
    const monthlyRows = scopedRevenue.value.filter(
      (item) => String(item.revenueDate).slice(0, 7) === monthKey
    );
    const gross = sumBy(monthlyRows, "grossAmount");
    const net = sumBy(monthlyRows, "netAmount");

    return {
      month: monthKey,
      shortMonth: monthKey.slice(5),
      gross,
      net,
      outstanding: Math.max(gross - net, 0),
    };
  });
});

const revenueRegionSeries = computed(() =>
  revenueSummary.value.regions.map((item) => ({
    name: item.name,
    value: item.amount,
    ratio: item.ratio,
  }))
);

const projectStatusSeries = computed(() => {
  const map = new Map();

  scopedProjects.value.forEach((item) => {
    const label = projectStatusMap[item.status]?.label || item.status;
    map.set(label, (map.get(label) || 0) + 1);
  });

  return [...map.entries()].map(([name, value]) => ({ name, value }));
});

const partnerRevenueSeries = computed(() =>
  partnerSummary.value.map((item) => ({
    name: item.name,
    value: item.revenue,
    trendLabel: trendStatusMap[item.trendValue]?.label || item.trendValue,
  }))
);

const activityTrendSeries = computed(() => {
  const days = 14;
  const points = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const dayStart = startOfDayTs(DASHBOARD_NOW_TS - index * DAY_MS);
    const dayEnd = dayStart + DAY_MS - 1;
    const count = timelinePool.value.filter((item) => {
      const ts = toTimestamp(item.occurredAt);
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

const kpiWidgets = computed(() =>
  kpiCards.value.map((card) => ({
    ...card,
    trendData: kpiTrendSeries.value[card.key] || [],
    trendColor: kpiTrendColorMap[card.key] || "#0f766e",
  }))
);

const pipelineStats = computed(() => [
  {
    label: "成交率",
    value: `${pipelineSummary.value.closeRate}%`,
    helper: `已成交 ${pipelineSummary.value.wonCount} / 已失敗 ${pipelineSummary.value.lostCount}`,
  },
  {
    label: "失敗率",
    value: `${pipelineSummary.value.lossRate}%`,
    helper: "觀察提案與談判流失點",
  },
  {
    label: "即將 Close 商機",
    value: `${pipelineSummary.value.closingSoonCount} 筆`,
    helper: "未來 14 天需優先跟進",
  },
  {
    label: "本期預估成交",
    value: formatCurrency(pipelineSummary.value.forecastAmount),
    helper: "依各階段機率加權推估",
  },
]);

const pipelineChartOption = computed(() => ({
  color: ["#0ea5e9", "#22c55e", "#6366f1", "#14b8a6", "#f59e0b", "#ef4444"],
  tooltip: {
    trigger: "item",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderWidth: 0,
    textStyle: { color: "#fff" },
    formatter: (params) => {
      const target = pipelineChartSeries.value.find((item) => item.name === params.name);
      if (!target) {
        return params.name;
      }

      return [
        `${target.name}`,
        `金額：${formatCurrency(target.value)}`,
        `商機數：${target.count} 筆`,
        `平均機率：${target.probability}%`,
      ].join("<br/>");
    },
  },
  series: [
    {
      type: "funnel",
      left: "10%",
      top: 20,
      bottom: 20,
      width: "80%",
      minSize: "18%",
      maxSize: "100%",
      sort: "descending",
      gap: 4,
      label: {
        show: true,
        position: "inside",
        color: "#fff",
        formatter: (params) => `${params.name}\n${formatCurrency(params.value)}`,
      },
      emphasis: {
        label: {
          fontWeight: "bold",
        },
      },
      data: pipelineChartSeries.value,
    },
  ],
}));

const todoTypeOption = computed(() =>
  createDonutOption(todoTypeSeries.value, {
    color: ["#0ea5e9", "#22c55e", "#f97316", "#6366f1"],
    centerText: `${personalTodoItems.value.length}`,
    centerSubtext: "待辦",
  })
);

const riskLevelOption = computed(() =>
  createDonutOption(riskLevelSeries.value, {
    color: ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#14b8a6"],
    centerText: `${riskAlerts.value.length}`,
    centerSubtext: "風險",
  })
);

const revenueTrendOption = computed(() => ({
  color: ["#0ea5e9", "#14b8a6", "#f59e0b"],
  tooltip: {
    trigger: "axis",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderWidth: 0,
    textStyle: { color: "#fff" },
  },
  legend: {
    top: 4,
    right: 0,
    textStyle: { color: "#475569", fontSize: 11 },
  },
  grid: { top: 34, left: 8, right: 8, bottom: 8, containLabel: true },
  xAxis: {
    type: "category",
    data: revenueTrendSeries.value.map((item) => item.shortMonth),
    axisTick: { show: false },
    axisLine: { lineStyle: { color: "#d1d5db" } },
    axisLabel: { color: "#64748b", fontSize: 11 },
  },
  yAxis: {
    type: "value",
    axisLine: { show: false },
    splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
    axisLabel: {
      color: "#64748b",
      fontSize: 11,
      formatter: (value) => `${Math.round(value / 10000)}萬`,
    },
  },
  series: [
    {
      name: "Gross",
      type: "bar",
      barMaxWidth: 18,
      data: revenueTrendSeries.value.map((item) => item.gross),
      itemStyle: { borderRadius: [6, 6, 0, 0] },
    },
    {
      name: "Net",
      type: "line",
      smooth: true,
      symbolSize: 6,
      data: revenueTrendSeries.value.map((item) => item.net),
      lineStyle: { width: 2.5 },
    },
    {
      name: "Outstanding",
      type: "line",
      smooth: true,
      symbol: "none",
      data: revenueTrendSeries.value.map((item) => item.outstanding),
      lineStyle: { width: 2, type: "dashed" },
    },
  ],
}));

const revenueRegionOption = computed(() =>
  createDonutOption(revenueRegionSeries.value, {
    color: piePalette,
    centerText: `${revenueRegionSeries.value.length}`,
    centerSubtext: "地區",
  })
);

const projectStatusOption = computed(() =>
  createDonutOption(projectStatusSeries.value, {
    color: ["#0ea5e9", "#f59e0b", "#ef4444", "#22c55e", "#6366f1", "#94a3b8"],
    centerText: `${scopedProjects.value.length}`,
    centerSubtext: "專案",
  })
);

const partnerRevenueOption = computed(() => ({
  color: ["#2563eb"],
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "shadow" },
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderWidth: 0,
    textStyle: { color: "#fff" },
    formatter: (params) => {
      const target = params?.[0];
      if (!target) {
        return "";
      }
      const partner = partnerRevenueSeries.value[target.dataIndex];
      return `${target.name}<br/>營收：${formatCurrency(target.value)}<br/>趨勢：${
        partner?.trendLabel || "-"
      }`;
    },
  },
  grid: { top: 8, left: 8, right: 8, bottom: 8, containLabel: true },
  xAxis: {
    type: "value",
    axisLine: { show: false },
    splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
    axisLabel: {
      color: "#64748b",
      fontSize: 11,
      formatter: (value) => `${Math.round(value / 10000)}萬`,
    },
  },
  yAxis: {
    type: "category",
    data: partnerRevenueSeries.value.map((item) => item.name),
    axisTick: { show: false },
    axisLine: { show: false },
    axisLabel: { color: "#334155", fontSize: 11 },
  },
  series: [
    {
      type: "bar",
      data: partnerRevenueSeries.value.map((item) => item.value),
      barMaxWidth: 14,
      itemStyle: {
        borderRadius: [0, 6, 6, 0],
      },
    },
  ],
}));

const activityTrendOption = computed(() => ({
  color: ["#0ea5e9"],
  tooltip: {
    trigger: "axis",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderWidth: 0,
    textStyle: { color: "#fff" },
  },
  grid: { top: 12, left: 8, right: 8, bottom: 8, containLabel: true },
  xAxis: {
    type: "category",
    data: activityTrendSeries.value.map((item) => item.label),
    axisTick: { show: false },
    axisLine: { lineStyle: { color: "#d1d5db" } },
    axisLabel: { color: "#64748b", fontSize: 11 },
  },
  yAxis: {
    type: "value",
    minInterval: 1,
    axisLine: { show: false },
    splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
    axisLabel: { color: "#64748b", fontSize: 11 },
  },
  series: [
    {
      name: "事件量",
      type: "bar",
      barMaxWidth: 14,
      data: activityTrendSeries.value.map((item) => item.value),
      itemStyle: { borderRadius: [6, 6, 0, 0] },
    },
  ],
}));

const customerDynamicsOption = computed(() => ({
  color: ["#6366f1"],
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "shadow" },
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderWidth: 0,
    textStyle: { color: "#fff" },
  },
  grid: { top: 8, left: 8, right: 8, bottom: 8, containLabel: true },
  xAxis: {
    type: "value",
    minInterval: 1,
    axisLine: { show: false },
    splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
    axisLabel: { color: "#64748b", fontSize: 11 },
  },
  yAxis: {
    type: "category",
    data: customerDynamics.value.map((item) => item.name),
    axisTick: { show: false },
    axisLine: { show: false },
    axisLabel: { color: "#334155", fontSize: 11 },
  },
  series: [
    {
      type: "bar",
      data: customerDynamics.value.map((item) => item.activityCount),
      barMaxWidth: 14,
      itemStyle: { borderRadius: [0, 6, 6, 0] },
    },
  ],
}));

const todoLegendItems = computed(() =>
  todoTypeSeries.value.map((item, index) => ({
    label: item.name,
    value: `${item.value}`,
    color: ["#0ea5e9", "#22c55e", "#f97316", "#6366f1"][index],
  }))
);

const riskLegendItems = computed(() =>
  riskLevelSeries.value.map((item, index) => ({
    label: item.name,
    value: `${item.value}`,
    color: ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#14b8a6"][index],
  }))
);

const revenueRegionLegends = computed(() =>
  revenueRegionSeries.value.map((item, index) => ({
    label: item.name,
    value: `${item.ratio}%`,
    color: piePalette[index % piePalette.length],
  }))
);

const projectStatusLegends = computed(() =>
  projectStatusSeries.value.map((item, index) => ({
    label: item.name,
    value: `${item.value}`,
    color: ["#0ea5e9", "#f59e0b", "#ef4444", "#22c55e", "#6366f1", "#94a3b8"][index],
  }))
);

const revenueStats = computed(() => [
  { label: "Gross Revenue", value: formatCurrency(revenueSummary.value.gross) },
  {
    label: "Net Revenue",
    value: formatCurrency(revenueSummary.value.net),
    helper: formatDelta(revenueSummary.value.delta),
  },
  { label: "Outstanding", value: formatCurrency(revenueSummary.value.outstanding) },
]);

const projectStats = computed(() => [
  { label: "進行中", value: `${projectSummary.value.inProgressCount} 個` },
  { label: "延遲", value: `${projectSummary.value.delayedCount} 個` },
  {
    label: "10 天內里程碑",
    value: `${projectSummary.value.upcomingMilestones.length} 項`,
  },
]);

const partnerStats = computed(() => [
  { label: "Top 5 夥伴", value: `${partnerRevenueSeries.value.length} 家` },
  {
    label: "最高單月營收",
    value: formatCurrency(
      Math.max(...partnerRevenueSeries.value.map((item) => item.value), 0)
    ),
  },
  {
    label: "異常訊號",
    value: `${partnerSummary.value.filter((item) => item.warnings.length > 0).length} 家`,
  },
]);

const stageLabelMap = computed(() =>
  Object.fromEntries(
    opportunityStageOptions
      .filter((item) => item.value !== "all")
      .map((item) => [item.value, item.label])
  )
);

const opportunityTypeLabelMap = computed(() =>
  Object.fromEntries(
    opportunityTypeOptions
      .filter((item) => item.value !== "all")
      .map((item) => [item.value, item.label])
  )
);

const totalContacts = computed(() =>
  scopedAccounts.value.reduce((sum, item) => sum + (item.contacts?.length || 0), 0)
);

const previousContacts = computed(() =>
  scopedAccounts.value
    .filter((item) => toTimestamp(item.updatedAt) <= periodRange.value.previous.end)
    .reduce((sum, item) => sum + (item.contacts?.length || 0), 0)
);

const previousCloseRate = computed(() => {
  const scoped = scopedOpportunities.value.filter(
    (item) => toTimestamp(item.expectedCloseDate) <= periodRange.value.previous.end
  );
  const won = scoped.filter((item) => item.stage === "won").length;
  const lost = scoped.filter((item) => item.stage === "lost").length;
  const base = won + lost;
  return base === 0 ? 0 : (won / base) * 100;
});

const kpiStyleMap = {
  month_revenue: {
    icon: "NT$",
    iconClass: "bg-[#f15a3d]",
  },
  active_opportunity: {
    icon: "商",
    iconClass: "bg-[#4f46e5]",
  },
  conversion_rate: {
    icon: "%",
    iconClass: "bg-[#d946ef]",
  },
  total_contacts: {
    icon: "客",
    iconClass: "bg-green-600 text-slate-700",
  },
};

const dashboardKpiCards = computed(() => {
  const revenueCard = kpiCards.value.find((item) => item.key === "month_revenue");
  const activeCard = kpiCards.value.find((item) => item.key === "active_opportunity");
  const conversionDelta = computeDelta(
    pipelineSummary.value.closeRate,
    previousCloseRate.value
  );
  const contactsDelta = computeDelta(totalContacts.value, previousContacts.value);

  const conversionCard = {
    key: "conversion_rate",
    label: "成交轉換率",
    value: `${pipelineSummary.value.closeRate.toFixed(1)}%`,
    helper: "相較前一期",
    deltaText: formatDelta(conversionDelta),
    deltaTone: deltaToneClass(conversionDelta),
    routeName: "opportunities-pipeline",
    trendData: buildMiniTrend(
      previousCloseRate.value,
      pipelineSummary.value.closeRate,
      "conversion_rate"
    ),
  };

  const contactCard = {
    key: "total_contacts",
    label: "聯絡人總數",
    value: `${totalContacts.value}`,
    helper: "相較前一期",
    deltaText: formatDelta(contactsDelta),
    deltaTone: deltaToneClass(contactsDelta),
    routeName: "accounts-contacts",
    trendData: buildMiniTrend(
      previousContacts.value,
      totalContacts.value,
      "total_contacts"
    ),
  };

  return [revenueCard, activeCard, conversionCard, contactCard]
    .filter(Boolean)
    .map((card) => ({
      ...card,
      style: kpiStyleMap[card.key] || {
        icon: "指",
        iconClass: "bg-slate-500",
      },
      trendColor: kpiTrendColorMap[card.key] || "#0f766e",
      trendData:
        card.trendData ||
        kpiTrendSeries.value[card.key] ||
        buildMiniTrend(card.previousRaw, card.currentRaw, card.key),
    }));
});

const accountById = new Map(accountList.map((item) => [item.id, item]));

const topDeals = computed(() =>
  scopedOpportunities.value
    .slice()
    .sort((a, b) => Number(b.expectedRevenue || 0) - Number(a.expectedRevenue || 0))
    .slice(0, 5)
    .map((item, index) => ({
      id: item.id,
      name: item.accountName || item.name,
      subtext: accountById.get(item.accountId)?.region || "台灣",
      amount: Number(item.expectedRevenue || 0),
      routeParams: { opportunityId: item.id },
      logoClass: [
        "bg-[#0f2c4f] text-[#ffd166]",
        "bg-[#4b8a63] text-white",
        "bg-[#e2ecff] text-[#315efb]",
        "bg-[#f97316] text-white",
        "bg-[#111827] text-white",
      ][index % 5],
    }))
);

const pipelineCompactRows = computed(() => {
  const mapping = [
    { key: "potential", label: "線索" },
    { key: "proposal", label: "提案" },
    { key: "negotiation", label: "談判" },
    { key: "won", label: "成交" },
  ];

  return mapping.map((entry) => {
    const items = scopedOpportunities.value.filter((item) => item.stage === entry.key);
    return {
      key: entry.key,
      label: entry.label,
      amount: sumBy(items, "expectedRevenue"),
      count: items.length,
    };
  });
});

const pipelineCompactOption = computed(() => ({
  color: ["#da563f", "#ecb04f", "#8f3d9d", "#6cb17a"],
  grid: { top: 8, left: 0, right: 0, bottom: 0, containLabel: true },
  xAxis: {
    type: "category",
    data: pipelineCompactRows.value.map((item) => item.label),
    axisTick: { show: false },
    axisLine: { show: false },
    axisLabel: { show: false },
  },
  yAxis: {
    type: "value",
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: { show: false },
  },
  tooltip: {
    trigger: "item",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderWidth: 0,
    textStyle: { color: "#fff" },
    formatter: (params) =>
      `${params.name}<br/>金額：${formatCurrency(params.value)}<br/>案件數：${
        pipelineCompactRows.value[params.dataIndex]?.count || 0
      }`,
  },
  series: [
    {
      type: "bar",
      barWidth: "84%",
      data: pipelineCompactRows.value.map((item) => item.amount),
      itemStyle: { borderRadius: [2, 2, 0, 0] },
    },
  ],
}));

const profitTrendValues = computed(() =>
  activityTrendSeries.value.slice(-12).map((item) => Number(item.value || 0))
);

const profitEarned = computed(() => revenueSummary.value.net * 0.12);

const profitSparkOption = computed(() => {
  const values = profitTrendValues.value;
  const max = Math.max(...values, 1);

  return {
    color: ["#ebedf0", "#e6503a"],
    grid: { top: 0, left: 0, right: 0, bottom: 0, containLabel: false },
    xAxis: {
      type: "category",
      data: values.map((_, index) => String(index + 1)),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { show: false },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.9)",
      borderWidth: 0,
      textStyle: { color: "#fff" },
      formatter: (params) => `量能：${params?.[1]?.value || 0}`,
    },
    series: [
      {
        type: "bar",
        barWidth: 10,
        data: values.map(() => max),
        silent: true,
        itemStyle: { color: "#eceef2", borderRadius: [8, 8, 8, 8] },
      },
      {
        type: "bar",
        barWidth: 10,
        data: values,
        itemStyle: { color: "#e6503a", borderRadius: [8, 8, 8, 8] },
      },
    ],
  };
});

const wonCountCurrent = computed(
  () =>
    scopedOpportunities.value.filter(
      (item) =>
        item.stage === "won" &&
        isWithinRange(toTimestamp(item.expectedCloseDate), periodRange.value.current)
    ).length
);

const wonCountPrevious = computed(
  () =>
    scopedOpportunities.value.filter(
      (item) =>
        item.stage === "won" &&
        isWithinRange(toTimestamp(item.expectedCloseDate), periodRange.value.previous)
    ).length
);

const dealsOverview = computed(() => {
  const successful = scopedOpportunities.value.filter((item) => item.stage === "won")
    .length;
  const rejected = scopedOpportunities.value.filter((item) => item.stage === "lost")
    .length;
  const upcoming = scopedOpportunities.value.filter((item) => {
    if (item.stage === "won" || item.stage === "lost") {
      return false;
    }
    const closeTs = toTimestamp(item.expectedCloseDate);
    return closeTs >= DASHBOARD_NOW_TS && closeTs <= DASHBOARD_NOW_TS + 14 * DAY_MS;
  }).length;
  const pending = Math.max(scopedOpportunities.value.length - successful - rejected, 0);
  const total = successful + rejected + pending;
  const wonOwners = scopedOpportunities.value
    .filter((item) => item.stage === "won")
    .slice(0, 5)
    .map((item) => userById.get(item.ownerUserId)?.name || "未指派");

  return {
    total,
    delta: computeDelta(wonCountCurrent.value, wonCountPrevious.value),
    successful,
    pending,
    rejected,
    upcoming,
    wonCount: successful,
    wonOwners,
  };
});

const dealsOverviewSegments = computed(() => {
  const total = Math.max(dealsOverview.value.total, 1);
  return [
    {
      key: "successful",
      color: "#52b74c",
      width: `${(dealsOverview.value.successful / total) * 100}%`,
    },
    {
      key: "pending",
      color: "#eba434",
      width: `${(dealsOverview.value.pending / total) * 100}%`,
    },
    {
      key: "rejected",
      color: "#8c2aa5",
      width: `${(dealsOverview.value.rejected / total) * 100}%`,
    },
    {
      key: "upcoming",
      color: "#e64537",
      width: `${(dealsOverview.value.upcoming / total) * 100}%`,
    },
  ];
});

const recentDeals = computed(() =>
  scopedOpportunities.value
    .slice()
    .sort((a, b) => toTimestamp(b.updatedAt) - toTimestamp(a.updatedAt))
    .slice(0, 5)
    .map((item) => {
      const ownerName = userById.get(item.ownerUserId)?.name || "未指派";
      const status =
        item.stage === "won" ? "won" : item.stage === "lost" ? "lost" : "open";
      const statusMeta =
        status === "won"
          ? { label: "已成交", className: "status-won" }
          : status === "lost"
          ? { label: "已失敗", className: "status-lost" }
          : { label: "進行中", className: "status-open" };

      return {
        id: item.id,
        name: item.name,
        stageLabel: stageLabelMap.value[item.stage] || item.stage,
        dealValue: formatCurrency(item.expectedRevenue),
        tag: opportunityTypeLabelMap.value[item.opportunityType] || "一般",
        ownerName,
        probability: `${Math.round(Number(item.probability || 0))}%`,
        status,
        statusLabel: statusMeta.label,
        statusClassName: statusMeta.className,
      };
    })
);

const topDealRangeOptions = [
  { value: "30d", label: "近 30 天" },
  { value: "90d", label: "近 90 天" },
];

const pipelineGranularityOptions = [
  { value: "weekly", label: "每週" },
  { value: "monthly", label: "每月" },
];

const profitYearOptions = [
  { value: "2026", label: "2026" },
  { value: "2025", label: "2025" },
];

function createMetricCard({
  key,
  label,
  currentRaw,
  previousRaw,
  value,
  routeName,
  helper,
}) {
  const delta = computeDelta(currentRaw, previousRaw);

  return {
    key,
    label,
    value,
    routeName,
    helper,
    currentRaw,
    previousRaw,
    deltaText: formatDelta(delta),
    deltaTone: deltaToneClass(delta),
  };
}

function createDonutOption(series, config = {}) {
  return {
    color: config.color || piePalette,
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.9)",
      borderWidth: 0,
      textStyle: { color: "#fff" },
      formatter: "{b}<br/>{c} ({d}%)",
    },
    series: [
      {
        type: "pie",
        radius: ["62%", "86%"],
        center: ["50%", "50%"],
        data: series,
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
      },
    ],
    graphic: [
      {
        type: "text",
        left: "center",
        top: "43%",
        style: {
          text: config.centerText || "",
          fontSize: 17,
          fontWeight: 600,
          fill: "#0f172a",
          textAlign: "center",
        },
      },
      {
        type: "text",
        left: "center",
        top: "58%",
        style: {
          text: config.centerSubtext || "",
          fontSize: 11,
          fill: "#64748b",
          textAlign: "center",
        },
      },
    ],
  };
}

function buildMiniTrend(previous, current, key) {
  const points = 8;
  const safeCurrent = Math.max(Number(current || 0), 0);
  const safePrevious =
    previous === 0 ? safeCurrent * 0.72 : Math.max(Number(previous || 0), 0);
  const seed = [...key].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const wobble = (seed % 5) + 2;
  const step = (safeCurrent - safePrevious) / (points - 1);
  const base = Array.from({ length: points }, (_, index) => safePrevious + step * index);

  return base.map((value, index) => {
    if (index === 0 || index === points - 1) {
      return Math.max(0, Math.round(value));
    }

    const direction = index % 2 === 0 ? -1 : 1;
    return Math.max(0, Math.round(value + direction * wobble * (index / points)));
  });
}

function buildPeriodRange(periodKey, nowTs) {
  const currentEnd = nowTs;
  let currentStart = startOfMonthTs(nowTs);

  if (periodKey === "week") {
    currentStart = startOfWeekTs(nowTs);
  } else if (periodKey === "quarter") {
    currentStart = startOfQuarterTs(nowTs);
  }

  const span = currentEnd - currentStart;
  const previousEnd = currentStart - 1;
  const previousStart = previousEnd - span;

  return {
    current: { start: currentStart, end: currentEnd },
    previous: { start: previousStart, end: previousEnd },
  };
}

function matchesScope(ownerId, scope) {
  if (!ownerId) {
    return scope === "all";
  }

  if (scope === "all") {
    return true;
  }

  if (scope === "mine") {
    return ownerId === currentUser.value?.id;
  }

  const ownerDepartment = userById.get(ownerId)?.department;
  return ownerDepartment && ownerDepartment === currentUser.value?.department;
}

function countHighRisk(tasks, issues, projects, accounts) {
  const taskCount = tasks.filter(
    (item) =>
      item.status === "delayed" ||
      (item.priority === "urgent" && !["completed", "cancelled"].includes(item.status))
  ).length;

  const issueCount = issues.filter(
    (item) =>
      !["resolved", "cancelled"].includes(item.status) &&
      (["high", "critical"].includes(item.severity) ||
        ["high", "urgent"].includes(item.priority))
  ).length;

  const projectCount = projects.filter(
    (item) => item.status === "delayed" || item.riskLevel === "high"
  ).length;

  const accountCount = accounts.filter(
    (item) => item.lifecycleStage === "churn" || item.status === "churned"
  ).length;

  return taskCount + issueCount + projectCount + accountCount;
}

function hasRecentActivity(accountId, thresholdTs) {
  const latestTs = activityList
    .filter((item) => item.accountId === accountId)
    .reduce((max, item) => Math.max(max, toTimestamp(item.occurredAt)), 0);

  return latestTs >= thresholdTs;
}

function computeDelta(current, previous) {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);

  if (previousValue === 0) {
    return currentValue > 0 ? 100 : 0;
  }

  return ((currentValue - previousValue) / previousValue) * 100;
}

function deltaToneClass(delta) {
  if (delta > 0.5) {
    return "text-emerald-600";
  }

  if (delta < -0.5) {
    return "text-rose-600";
  }

  return "text-slate-500";
}

function formatDelta(delta) {
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.5) {
    return "與上期持平";
  }

  const prefix = delta > 0 ? "+" : "";
  return `${prefix}${delta.toFixed(1)}%`;
}

function sumBy(list, field) {
  return list.reduce((sum, item) => sum + Number(item[field] || 0), 0);
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

  const normalized = String(value).includes("T")
    ? String(value)
    : String(value).replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function isWithinRange(time, range) {
  return time >= range.start && time <= range.end;
}

function startOfWeekTs(ts) {
  const date = new Date(ts);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
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

function startOfDayTs(ts) {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function createRecentMonthKeys(size, baseTs) {
  const result = [];
  const base = new Date(baseTs);
  base.setDate(1);

  for (let index = size - 1; index >= 0; index -= 1) {
    const date = new Date(base);
    date.setMonth(base.getMonth() - index);
    result.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }

  return result;
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

  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts));
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

function buildKpiLineOption(data, color) {
  return {
    animationDuration: 300,
    grid: { top: 2, left: 0, right: 0, bottom: 0, containLabel: false },
    xAxis: {
      type: "category",
      data: data.map((_, index) => index + 1),
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.9)",
      borderWidth: 0,
      textStyle: { color: "#fff", fontSize: 11 },
    },
    series: [
      {
        type: "line",
        smooth: true,
        symbol: "none",
        data,
        lineStyle: { width: 2.5, color },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${color}66` },
              { offset: 1, color: `${color}08` },
            ],
          },
        },
      },
    ],
  };
}

function buildContactBarsOption(data) {
  return {
    animationDuration: 300,
    grid: { top: 2, left: 0, right: 0, bottom: 0, containLabel: false },
    xAxis: {
      type: "category",
      data: data.map((_, index) => index + 1),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { show: false },
    },
    yAxis: {
      type: "value",
      axisTick: { show: false },
      axisLine: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.9)",
      borderWidth: 0,
      textStyle: { color: "#fff", fontSize: 11 },
    },
    series: [
      {
        type: "bar",
        barWidth: 8,
        data,
        itemStyle: {
          color: "#edd5cf",
          borderRadius: [5, 5, 0, 0],
        },
      },
    ],
  };
}

function ownerInitial(name) {
  const plain = String(name || "").trim();
  if (!plain) {
    return "?";
  }
  return plain.slice(0, 1).toUpperCase();
}

function refreshDashboard() {
  lastRefreshedAt.value = new Date().toISOString();
  ElNotification({
    title: "已更新",
    message: "總覽資料已重新整理",
    type: "success",
    position: "top-right",
  });
}

function goTo(routeName, params = {}) {
  router.push({ name: routeName, params });
}
</script>

<template>
  <div class="min-h-full bg-slate-100 p-5 md:p-4">
    <section class="grid gap-4">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold text-slate-900">總覽</h1>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElSelect v-model="currentPeriod" class="!w-[110px]">
            <ElOption
              v-for="item in periodOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
          <ElSelect v-model="currentScope" class="!w-[110px]">
            <ElOption
              v-for="item in availableScopeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>

          <ElButton circle :icon="Download" @click="goTo('reports-revenue')" />
          <ElButton circle :icon="Refresh" @click="refreshDashboard" />
        </div>
      </header>

      <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <button
          v-for="card in dashboardKpiCards"
          :key="card.key"
          type="button"
          class="relative min-h-[150px] rounded-xl border border-slate-200 bg-white px-4 py-4 text-left"
          @click="goTo(card.routeName)"
        >
          <span
            class="absolute -top-3 right-3 inline-flex h-12 w-12 items-center justify-center rounded-full border-4 border-slate-100 text-base font-bold text-white"
            :class="card.style.iconClass"
            >{{ card.style.icon }}</span
          >
          <p class="text-sm font-semibold text-slate-500">{{ card.label }}</p>
          <p class="mt-1 text-xl font-bold leading-tight text-slate-900">
            {{ card.value }}
          </p>

          <div class="mt-2 flex items-center gap-2">
            <span
              class="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-sm font-semibold"
              :class="card.deltaTone"
              >{{ card.deltaText }}</span
            >
            <span class="text-sm text-slate-600">相較上期</span>
          </div>

          <div class="mt-2 h-10">
            <VChart
              :option="
                card.key === 'total_contacts'
                  ? buildContactBarsOption(card.trendData)
                  : buildKpiLineOption(card.trendData, card.trendColor)
              "
              autoresize
              class="h-full w-full"
            />
          </div>
        </button>
      </section>

      <section class="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <article class="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-4">
          <div class="mb-2 flex items-center justify-between gap-2">
            <h2
              class="relative pl-3 text-lg font-bold text-slate-900 before:absolute before:left-0 before:top-0.5 before:h-5 before:w-1 before:rounded before:bg-[#f15a3d]"
            >
              重點商機
            </h2>
            <ElSelect v-model="topDealsRange" class="!w-[136px]">
              <ElOption
                v-for="item in topDealRangeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </div>

          <div class="grid gap-2">
            <button
              v-for="item in topDeals"
              :key="item.id"
              type="button"
              class="grid w-full grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-100 py-1.5 text-left last:border-b-0"
              @click="goTo('opportunity-detail', item.routeParams)"
            >
              <span
                class="inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                :class="item.logoClass"
                >{{ ownerInitial(item.name) }}</span
              >
              <div class="min-w-0">
                <p class="truncate text-base font-semibold text-slate-800">
                  {{ item.name }}
                </p>
                <p class="text-sm text-slate-500">{{ item.subtext }}</p>
              </div>
              <p class="text-base font-semibold text-slate-800">
                {{ formatCurrency(item.amount) }}
              </p>
            </button>
          </div>

          <ElButton
            text
            class="mt-3 !flex !w-full !justify-center !rounded-lg !bg-slate-100 !text-base !font-semibold !text-slate-700"
            @click="goTo('opportunities-pipeline')"
          >
            查看全部 <ArrowRight class="ml-1 h-3.5 w-3.5" />
          </ElButton>
        </article>

        <div class="grid gap-3 xl:col-span-4">
          <article class="rounded-xl border border-slate-200 bg-white p-4">
            <div class="mb-2 flex items-center justify-between gap-2">
              <h2
                class="relative pl-3 text-lg font-bold text-slate-900 before:absolute before:left-0 before:top-0.5 before:h-5 before:w-1 before:rounded before:bg-[#f15a3d]"
              >
                商機漏斗
              </h2>
              <ElSelect v-model="pipelineGranularity" class="!w-[126px]">
                <ElOption
                  v-for="item in pipelineGranularityOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </div>

            <div class="grid grid-cols-2 gap-2 md:grid-cols-4">
              <article
                v-for="item in pipelineCompactRows"
                :key="item.key"
                class="min-w-0"
              >
                <p class="text-sm font-semibold text-slate-500">{{ item.label }}</p>
                <p class="mt-0.5 text-base font-semibold text-slate-900">
                  {{ formatCurrency(item.amount) }}
                </p>
                <p class="text-sm text-slate-500">{{ item.count }} 筆</p>
              </article>
            </div>

            <div class="mt-2 h-[84px]">
              <VChart :option="pipelineCompactOption" autoresize class="h-full w-full" />
            </div>
          </article>

          <article class="rounded-xl border border-slate-200 bg-white p-4">
            <div class="mb-2 flex items-center justify-between gap-2">
              <div class="flex items-baseline gap-2">
                <p class="text-base font-semibold text-slate-900">預估利潤</p>
                <p class="text-xl font-bold leading-none text-slate-900">
                  {{ formatCurrency(profitEarned) }}
                </p>
              </div>
              <ElSelect v-model="profitYear" class="!w-[96px]">
                <ElOption
                  v-for="item in profitYearOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </div>

            <div class="h-[86px]">
              <VChart :option="profitSparkOption" autoresize class="h-full w-full" />
            </div>
          </article>
        </div>

        <article class="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-4">
          <div class="mb-2 flex items-center justify-between gap-2">
            <h2
              class="relative pl-3 text-lg font-bold text-slate-900 before:absolute before:left-0 before:top-0.5 before:h-5 before:w-1 before:rounded before:bg-[#f15a3d]"
            >
              商機總覽
            </h2>
            <ElButton circle :icon="ArrowRight" @click="goTo('opportunities-list')" />
          </div>

          <div class="mt-1 grid grid-cols-4 gap-1">
            <span
              v-for="segment in dealsOverviewSegments"
              :key="segment.key"
              class="h-2 rounded-full"
              :style="{ width: segment.width, backgroundColor: segment.color }"
            />
          </div>

          <div class="mt-3 flex items-center gap-2">
            <p class="text-xl font-bold leading-none text-slate-900">
              {{ dealsOverview.total }}
            </p>
            <span
              class="rounded-full bg-emerald-100 px-2 py-0.5 text-sm font-semibold text-emerald-600"
              >{{ formatDelta(dealsOverview.delta) }}</span
            >
            <span class="text-sm text-slate-500">相較上期</span>
          </div>

          <div class="mt-2 grid">
            <article
              class="flex items-center justify-between gap-2 border-t border-slate-200 py-2 text-base font-semibold text-slate-700"
            >
              <p><span class="dot dot-success" />成功商機</p>
              <p>{{ dealsOverview.successful }} 筆</p>
            </article>
            <article
              class="flex items-center justify-between gap-2 border-t border-slate-200 py-2 text-base font-semibold text-slate-700"
            >
              <p><span class="dot dot-pending" />待推進商機</p>
              <p>{{ dealsOverview.pending }} 筆</p>
            </article>
            <article
              class="flex items-center justify-between gap-2 border-t border-slate-200 py-2 text-base font-semibold text-slate-700"
            >
              <p><span class="dot dot-rejected" />失敗商機</p>
              <p>{{ dealsOverview.rejected }} 筆</p>
            </article>
            <article
              class="flex items-center justify-between gap-2 border-t border-slate-200 py-2 text-base font-semibold text-slate-700"
            >
              <p><span class="dot dot-upcoming" />即將結案</p>
              <p>{{ dealsOverview.upcoming }} 筆</p>
            </article>
          </div>

          <div
            class="mt-2 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <div>
              <p class="text-sm text-slate-500">已成交商機</p>
              <p class="text-xl font-bold leading-none text-slate-900">
                {{ dealsOverview.wonCount }}
              </p>
            </div>
            <div class="flex items-center">
              <ElAvatar
                v-for="name in dealsOverview.wonOwners"
                :key="`won-${name}`"
                :size="34"
                class="-ml-2 border-2 border-white bg-orange-100 font-semibold text-orange-900 first:ml-0"
              >
                {{ ownerInitial(name) }}
              </ElAvatar>
            </div>
          </div>
        </article>
      </section>

      <section class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-3 flex items-center justify-between gap-2">
          <h2
            class="relative pl-3 text-lg font-bold text-slate-900 before:absolute before:left-0 before:top-0.5 before:h-5 before:w-1 before:rounded before:bg-[#f15a3d]"
          >
            最新商機
          </h2>
          <ElButton
            text
            class="!rounded-lg !bg-slate-100 !px-3 !py-2 !text-base !font-semibold !text-slate-700"
            @click="goTo('opportunities-list')"
          >
            查看全部 <ArrowRight class="ml-1 h-3.5 w-3.5" />
          </ElButton>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-[880px] w-full border-collapse">
            <thead>
              <tr>
                <th
                  class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-bold text-slate-600"
                >
                  商機名稱
                </th>
                <th
                  class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-bold text-slate-600"
                >
                  階段
                </th>
                <th
                  class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-bold text-slate-600"
                >
                  金額
                </th>
                <th
                  class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-bold text-slate-600"
                >
                  類型
                </th>
                <th
                  class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-bold text-slate-600"
                >
                  負責人
                </th>
                <th
                  class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-bold text-slate-600"
                >
                  成交機率
                </th>
                <th
                  class="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-bold text-slate-600"
                >
                  狀態
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in recentDeals" :key="row.id">
                <td class="border border-slate-200 px-3 py-2 text-base text-slate-800">
                  {{ row.name }}
                </td>
                <td class="border border-slate-200 px-3 py-2 text-base text-slate-800">
                  {{ row.stageLabel }}
                </td>
                <td class="border border-slate-200 px-3 py-2 text-base text-slate-800">
                  {{ row.dealValue }}
                </td>
                <td class="border border-slate-200 px-3 py-2 text-base text-slate-800">
                  <ElTag effect="plain" round>{{ row.tag }}</ElTag>
                </td>
                <td class="border border-slate-200 px-3 py-2 text-base text-slate-800">
                  <div class="inline-flex items-center gap-2">
                    <ElAvatar :size="34">{{ ownerInitial(row.ownerName) }}</ElAvatar>
                    <span>{{ row.ownerName }}</span>
                  </div>
                </td>
                <td class="border border-slate-200 px-3 py-2 text-base text-slate-800">
                  {{ row.probability }}
                </td>
                <td class="border border-slate-200 px-3 py-2 text-base text-slate-800">
                  <span
                    class="inline-flex rounded-lg px-2.5 py-1 text-base font-semibold text-white"
                    :class="{
                      'bg-green-500': row.statusClassName === 'status-won',
                      'bg-red-500': row.statusClassName === 'status-lost',
                      'bg-indigo-600': row.statusClassName === 'status-open',
                    }"
                    >{{ row.statusLabel }}</span
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  </div>
</template>
