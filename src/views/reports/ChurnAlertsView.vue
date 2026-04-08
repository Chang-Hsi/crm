<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import VChart from "vue-echarts";
import { use } from "echarts/core";
import { BarChart, LineChart, PieChart, ScatterChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import {
  ElButton,
  ElDatePicker,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
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
import { contractList } from "../../data/contracts";
import { opportunityList } from "../../data/opportunities";
import { projectList } from "../../data/projects";
import { userList } from "../../data/users";
import { useBillingPaymentsStore } from "../../composables/useBillingPaymentsStore";
import { useCommunicationLogsStore } from "../../composables/useCommunicationLogsStore";
import { useIssuesStore } from "../../composables/useIssuesStore";

use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);

const router = useRouter();
const { records: billingRecords } = useBillingPaymentsStore();
const { records: communicationRecords } = useCommunicationLogsStore();
const { issues } = useIssuesStore();

const loading = ref(false);
const filterPanelOpen = ref(false);
const detailTab = ref("high_risk");
const currentPage = ref(1);
const pageSize = ref(10);

const nowTs = Date.now();
const dayMs = 24 * 60 * 60 * 1000;

const yesNoOptions = [
  { value: "all", label: "全部" },
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
];

const riskLevelOptions = [
  { value: "all", label: "全部風險" },
  { value: "high", label: "高風險" },
  { value: "medium", label: "中風險" },
  { value: "low", label: "低風險" },
];

const stageProbabilityMap = {
  potential: 20,
  contacted: 35,
  qualified: 50,
  proposal: 70,
  negotiation: 85,
  won: 100,
  lost: 0,
};

const riskLevelTagType = {
  high: "danger",
  medium: "warning",
  low: "success",
};

const retentionStatusTagType = {
  churned: "danger",
  pending_recovery: "warning",
  monitoring: "info",
};

const accountTypeLabelMap = Object.fromEntries(
  accountTypeOptions
    .filter((item) => item.value !== "all")
    .map((item) => [item.value, item.label])
);

const lifecycleLabelMap = Object.fromEntries(
  lifecycleOptions
    .filter((item) => item.value !== "all")
    .map((item) => [item.value, item.label])
);

const tierLabelMap = Object.fromEntries(
  accountTierOptions
    .filter((item) => item.value !== "all")
    .map((item) => [item.value, item.label])
);

const userDirectory = new Map(userList.map((item) => [item.id, item]));

const ownerOptions = [
  { value: "all", label: "全部 Owner" },
  ...userList
    .filter((item) => item.status === "active")
    .map((item) => ({ value: item.id, label: item.name })),
];

const departmentOptions = [
  { value: "all", label: "全部部門" },
  ...[...new Set(userList.map((item) => item.department))]
    .sort((a, b) => a.localeCompare(b, "zh-Hant"))
    .map((item) => ({ value: item, label: item })),
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
  department: "all",
  hasOpportunity: "all",
  hasContract: "all",
  hasRevenue: "all",
  riskLevel: "all",
  isHighValue: "all",
  isChurn: "all",
  isPendingRecovery: "all",
});

const drillState = reactive({
  riskSignal: "",
});

function parseDate(value) {
  if (!value) {
    return null;
  }

  const text = String(value).replace(" ", "T");
  const date = new Date(text);
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

function quantile(values, ratio) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const position = Math.floor((sorted.length - 1) * ratio);
  return sorted[position];
}

function normalizeArray(values = []) {
  return values.filter((item) => item !== null && item !== undefined);
}

function isDateWithinRange(value, range) {
  const [start, end] = range || [];
  if (!start || !end) {
    return true;
  }

  const ts = toTimestamp(value);
  return ts >= toTimestamp(start) && ts <= toTimestamp(end) + dayMs - 1;
}

function monthStartTs(year, month) {
  return new Date(year, month, 1).getTime();
}

function monthEndTs(year, month) {
  return new Date(year, month + 1, 1).getTime() - 1;
}

function getRecentMonths(length = 6, endTs = nowTs) {
  const now = new Date(endTs);
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

function matchesYesNo(condition, selectedValue) {
  if (selectedValue === "all") {
    return true;
  }

  return selectedValue === "yes" ? condition : !condition;
}

function getLatestTextByTimestamp(rows = []) {
  const latest = rows
    .filter((item) => item.ts > 0)
    .sort((a, b) => b.ts - a.ts)[0];

  return latest?.text || "";
}

function getLastTsBeforeRef(tsList = [], refTs = nowTs) {
  return tsList.reduce((max, ts) => (ts <= refTs && ts > max ? ts : max), 0);
}

function sumRevenueInRange(events = [], start, end) {
  return events
    .filter((item) => item.ts >= start && item.ts <= end)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

const opportunitiesByAccountId = computed(() =>
  opportunityList.reduce((map, item) => {
    if (!map.has(item.accountId)) {
      map.set(item.accountId, []);
    }

    map.get(item.accountId).push(item);
    return map;
  }, new Map())
);

const contractsByAccountId = computed(() =>
  contractList.reduce((map, item) => {
    if (!map.has(item.customerId)) {
      map.set(item.customerId, []);
    }

    map.get(item.customerId).push(item);
    return map;
  }, new Map())
);

const projectsByAccountId = computed(() =>
  projectList.reduce((map, item) => {
    if (!map.has(item.customerId)) {
      map.set(item.customerId, []);
    }

    map.get(item.customerId).push(item);
    return map;
  }, new Map())
);

const billingByAccountId = computed(() =>
  billingRecords.value.reduce((map, item) => {
    if (!item.accountId) {
      return map;
    }

    if (!map.has(item.accountId)) {
      map.set(item.accountId, []);
    }

    map.get(item.accountId).push(item);
    return map;
  }, new Map())
);

const communicationByAccountId = computed(() =>
  communicationRecords.value.reduce((map, item) => {
    if (!item.customerId) {
      return map;
    }

    if (!map.has(item.customerId)) {
      map.set(item.customerId, []);
    }

    map.get(item.customerId).push(item);
    return map;
  }, new Map())
);

const issuesByAccountId = computed(() =>
  issues.value.reduce((map, item) => {
    if (!item.customerId) {
      return map;
    }

    if (!map.has(item.customerId)) {
      map.set(item.customerId, []);
    }

    map.get(item.customerId).push(item);
    return map;
  }, new Map())
);

const baseRecords = computed(() =>
  accountList.map((account) => {
    const owner = userDirectory.get(account.ownerUserId);

    const opportunities = opportunitiesByAccountId.value.get(account.id) || [];
    const contracts = contractsByAccountId.value.get(account.id) || [];
    const projects = projectsByAccountId.value.get(account.id) || [];
    const billings = billingByAccountId.value.get(account.id) || [];
    const communications = communicationByAccountId.value.get(account.id) || [];
    const accountIssues = issuesByAccountId.value.get(account.id) || [];

    const interactionRows = [
      { text: account.updatedAt, ts: toTimestamp(account.updatedAt) },
      ...(account.activities || []).map((item) => ({
        text: item.occurredAt,
        ts: toTimestamp(item.occurredAt),
      })),
      ...(communications || []).map((item) => ({
        text: item.interactedAt,
        ts: toTimestamp(item.interactedAt),
      })),
    ];

    const opportunityRows = opportunities
      .map((item) => [
        { text: item.expectedCloseDate, ts: toTimestamp(item.expectedCloseDate) },
        { text: item.updatedAt, ts: toTimestamp(item.updatedAt) },
      ])
      .flat();

    const revenueEvents = billings
      .filter((item) => {
        const hasRevenueLike =
          Number(item.expectedReceiveAmount || 0) > 0 || Number(item.invoiceAmount || 0) > 0;

        return item.documentType !== "payable" && hasRevenueLike;
      })
      .map((item) => {
        const dateText =
          item.receivedAt || item.invoiceDate || item.dueReceiveAt || item.updatedAt || "";
        const amount =
          Number(item.receivedAmount || 0) ||
          Number(item.expectedReceiveAmount || 0) ||
          Number(item.untaxedAmount || 0) ||
          Number(item.invoiceAmount || 0);

        return {
          ts: toTimestamp(dateText),
          amount: Math.max(amount, 0),
          text: dateText,
        };
      })
      .filter((item) => item.ts > 0);

    const contractEvents = contracts
      .map((item) => ({
        endText: item.endDate,
        endTs: toTimestamp(item.endDate),
        status: item.contractStatus,
      }))
      .filter((item) => item.endTs > 0);

    const issueEvents = accountIssues.map((item) => ({
      status: item.status,
      updatedAt: item.updatedAt,
      updatedTs: toTimestamp(item.updatedAt),
    }));

    const projectValue = projects.reduce((sum, item) => sum + Number(item.value || 0), 0);
    const delayedProjectCount = projects.filter((item) =>
      ["delayed", "paused"].includes(item.status)
    ).length;

    const wonAmount = opportunities
      .filter((item) => item.stage === "won")
      .reduce((sum, item) => sum + Number(item.expectedRevenue || 0), 0);

    const weightedAmount = opportunities.reduce((sum, item) => {
      const probability =
        typeof item.probability === "number"
          ? item.probability
          : stageProbabilityMap[item.stage] || 0;

      return sum + Number(item.expectedRevenue || 0) * (probability / 100);
    }, 0);

    const totalRevenue = revenueEvents.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const customerValue = Math.round(
      totalRevenue * 0.55 + wonAmount * 0.2 + weightedAmount * 0.15 + projectValue * 0.1
    );

    const lastInteractionAt = getLatestTextByTimestamp(interactionRows) || account.updatedAt;
    const lastOpportunityAt = getLatestTextByTimestamp(opportunityRows);
    const lastRevenueAt = getLatestTextByTimestamp(
      revenueEvents.map((item) => ({ text: item.text, ts: item.ts }))
    );

    const nearestContractEnd = contractEvents
      .map((item) => item.endTs)
      .filter((item) => item >= nowTs)
      .sort((a, b) => a - b)[0];

    const primaryOpportunity = opportunities
      .slice()
      .sort((a, b) => toTimestamp(b.updatedAt || b.expectedCloseDate) - toTimestamp(a.updatedAt || a.expectedCloseDate))[0];

    const primaryContract = contracts
      .slice()
      .sort((a, b) => toTimestamp(b.lastUpdatedAt || b.endDate) - toTimestamp(a.lastUpdatedAt || a.endDate))[0];

    return {
      id: account.id,
      accountCode: account.accountCode,
      companyName: account.companyName,
      companyType: account.companyType,
      tier: account.tier,
      lifecycleStage: account.lifecycleStage,
      region: account.region,
      industry: account.industry,
      ownerUserId: account.ownerUserId,
      ownerName: owner?.name || "未指派",
      department: owner?.department || "未分類",
      status: account.status,
      createdAt: (account.timeline || []).find((line) => line.type === "create")?.timestamp || account.updatedAt,
      updatedAt: account.updatedAt,
      lastInteractionAt,
      lastOpportunityAt,
      lastRevenueAt,
      nearestContractEndAt: nearestContractEnd ? new Date(nearestContractEnd).toISOString().slice(0, 10) : "",
      opportunityCount: opportunities.length,
      openOpportunityCount: opportunities.filter((item) => item.status === "active").length,
      contractCount: contracts.length,
      activeContractCount: contracts.filter((item) =>
        ["active", "in_execution", "expiring_soon", "pending_signature", "under_review"].includes(item.contractStatus)
      ).length,
      projectCount: projects.length,
      delayedProjectCount,
      issueCount: accountIssues.length,
      openIssueCount: issueEvents.filter((item) => !["resolved", "cancelled"].includes(item.status)).length,
      totalRevenue,
      customerValue,
      hasOpportunity: opportunities.length > 0,
      hasContract: contracts.length > 0,
      hasRevenue: totalRevenue > 0,
      isChurn: account.lifecycleStage === "churn" || account.status === "churned",
      interactionTsList: normalizeArray(interactionRows.map((item) => item.ts).filter((ts) => ts > 0)),
      opportunityTsList: normalizeArray(opportunityRows.map((item) => item.ts).filter((ts) => ts > 0)),
      revenueEvents,
      contractEvents,
      issueEvents,
      primaryOpportunityId: primaryOpportunity?.id || "",
      primaryContractId: primaryContract?.id || "",
    };
  })
);

const nonDateFilteredBaseRecords = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return baseRecords.value.filter((record) => {
    const matchesKeyword =
      keyword.length === 0 ||
      record.companyName.toLowerCase().includes(keyword) ||
      record.accountCode.toLowerCase().includes(keyword) ||
      record.ownerName.toLowerCase().includes(keyword);

    const matchesType = filters.companyType === "all" || record.companyType === filters.companyType;
    const matchesLifecycle =
      filters.lifecycleStage === "all" || record.lifecycleStage === filters.lifecycleStage;
    const matchesTier = filters.tier === "all" || record.tier === filters.tier;
    const matchesRegion = filters.region === "all" || record.region === filters.region;
    const matchesIndustry = filters.industry === "all" || record.industry === filters.industry;
    const matchesOwner =
      filters.ownerUserId === "all" || record.ownerUserId === filters.ownerUserId;
    const matchesDepartment =
      filters.department === "all" || record.department === filters.department;
    const matchesOpportunity = matchesYesNo(record.hasOpportunity, filters.hasOpportunity);
    const matchesContract = matchesYesNo(record.hasContract, filters.hasContract);
    const matchesRevenue = matchesYesNo(record.hasRevenue, filters.hasRevenue);

    return (
      matchesKeyword &&
      matchesType &&
      matchesLifecycle &&
      matchesTier &&
      matchesRegion &&
      matchesIndustry &&
      matchesOwner &&
      matchesDepartment &&
      matchesOpportunity &&
      matchesContract &&
      matchesRevenue
    );
  });
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

function buildSnapshot(record, refTs = nowTs) {
  const lastInteractionTs = getLastTsBeforeRef(record.interactionTsList, refTs);
  const lastOpportunityTs = getLastTsBeforeRef(record.opportunityTsList, refTs);

  const daysSinceInteraction =
    lastInteractionTs > 0 ? Math.max(Math.floor((refTs - lastInteractionTs) / dayMs), 0) : 999;

  const daysSinceOpportunity =
    lastOpportunityTs > 0 ? Math.max(Math.floor((refTs - lastOpportunityTs) / dayMs), 0) : 999;

  const current30Revenue = sumRevenueInRange(record.revenueEvents, refTs - 29 * dayMs, refTs);
  const previous30Revenue = sumRevenueInRange(
    record.revenueEvents,
    refTs - 59 * dayMs,
    refTs - 30 * dayMs
  );

  const revenueDecline =
    previous30Revenue > 0 && current30Revenue < previous30Revenue * 0.7;

  const contractExpiringSoon = record.contractEvents.some((item) => {
    const activeStatus = !["terminated", "voided", "completed"].includes(item.status);
    return activeStatus && item.endTs >= refTs && item.endTs <= refTs + 45 * dayMs;
  });

  const upcomingContractTs = record.contractEvents
    .filter((item) => item.endTs >= refTs)
    .sort((a, b) => a.endTs - b.endTs)[0]?.endTs;

  const issueRecent30Count = record.issueEvents.filter(
    (item) => item.updatedTs >= refTs - 30 * dayMs && item.updatedTs <= refTs
  ).length;

  const staleInteraction30 = daysSinceInteraction > 30;
  const staleInteraction60 = daysSinceInteraction > 60;
  const noOpportunityLong = record.opportunityCount === 0 || daysSinceOpportunity > 120;
  const issueIncreased = record.openIssueCount >= 2 || issueRecent30Count >= 2;

  const riskSignals = [];

  if (record.isChurn) {
    riskSignals.push("已流失");
  } else {
    if (staleInteraction30) {
      riskSignals.push("長期無互動");
    }

    if (noOpportunityLong) {
      riskSignals.push("長期無新商機");
    }

    if (contractExpiringSoon) {
      riskSignals.push("合約即將到期");
    }

    if (revenueDecline) {
      riskSignals.push("營收下滑");
    }

    if (record.delayedProjectCount > 0) {
      riskSignals.push("專案延期 / 停滯");
    }

    if (issueIncreased) {
      riskSignals.push("客訴 / Issue 增加");
    }
  }

  let riskScore = 0;

  if (record.isChurn) {
    riskScore = 10;
  } else {
    riskScore += staleInteraction30 ? 1 : 0;
    riskScore += staleInteraction60 ? 1 : 0;
    riskScore += noOpportunityLong ? 2 : 0;
    riskScore += contractExpiringSoon ? 2 : 0;
    riskScore += revenueDecline ? 2 : 0;
    riskScore += record.delayedProjectCount > 0 ? 1 : 0;
    riskScore += issueIncreased ? 1 : 0;
    riskScore += !record.hasRevenue ? 1 : 0;
  }

  const riskLevel =
    record.isChurn || riskScore >= 5 ? "high" : riskScore >= 3 ? "medium" : "low";

  return {
    lastInteractionTs,
    daysSinceInteraction,
    daysSinceOpportunity,
    current30Revenue,
    previous30Revenue,
    revenueDecline,
    contractExpiringSoon,
    upcomingContractAt: upcomingContractTs
      ? new Date(upcomingContractTs).toISOString().slice(0, 10)
      : "",
    staleInteraction30,
    noOpportunityLong,
    issueRecent30Count,
    riskSignals,
    riskScore,
    riskLevel,
    riskStatusLabel: riskLevel === "high" ? "高風險" : riskLevel === "medium" ? "中風險" : "低風險",
  };
}

function buildSnapshotRows(records, refTs = nowTs) {
  const rows = records.map((record) => ({
    ...record,
    ...buildSnapshot(record, refTs),
  }));

  const highValueThreshold = quantile(
    rows.map((item) => item.customerValue).filter((item) => item > 0),
    0.75
  );

  return rows.map((row) => {
    const isHighValue = highValueThreshold > 0 && row.customerValue >= highValueThreshold;
    const pendingRetention =
      !row.isChurn && (row.riskLevel === "high" || (row.riskLevel === "medium" && isHighValue));

    return {
      ...row,
      isHighValue,
      pendingRetention,
      retentionStatus: row.isChurn
        ? "churned"
        : pendingRetention
          ? "pending_recovery"
          : "monitoring",
      retentionStatusLabel: row.isChurn
        ? "已流失"
        : pendingRetention
          ? "待挽回"
          : "追蹤中",
    };
  });
}

function applySnapshotFilters(rows, options = { applyDate: true }) {
  return rows.filter((row) => {
    const matchesDate =
      !options.applyDate || isDateWithinRange(row.updatedAt, filters.dateRange);

    const matchesRisk =
      filters.riskLevel === "all" || row.riskLevel === filters.riskLevel;

    const matchesHighValue = matchesYesNo(row.isHighValue, filters.isHighValue);
    const matchesChurn = matchesYesNo(row.isChurn, filters.isChurn);
    const matchesPending = matchesYesNo(row.pendingRetention, filters.isPendingRecovery);

    const matchesSignal =
      drillState.riskSignal.length === 0 || row.riskSignals.includes(drillState.riskSignal);

    return (
      matchesDate &&
      matchesRisk &&
      matchesHighValue &&
      matchesChurn &&
      matchesPending &&
      matchesSignal
    );
  });
}

const currentSnapshotRows = computed(() =>
  buildSnapshotRows(nonDateFilteredBaseRecords.value, currentPeriodRange.value.end)
);

const previousSnapshotRows = computed(() =>
  buildSnapshotRows(nonDateFilteredBaseRecords.value, previousPeriodRange.value.end)
);

const filteredRecords = computed(() =>
  applySnapshotFilters(currentSnapshotRows.value, { applyDate: true })
);

const previousFilteredRecords = computed(() =>
  applySnapshotFilters(previousSnapshotRows.value, { applyDate: false })
);

function buildKpiMetrics(rows = []) {
  const total = rows.length;
  const highRiskCount = rows.filter((item) => !item.isChurn && item.riskLevel === "high").length;
  const churnCount = rows.filter((item) => item.isChurn).length;
  const churnRate = total === 0 ? 0 : (churnCount / total) * 100;
  const highValueRiskCount = rows.filter(
    (item) => !item.isChurn && item.isHighValue && item.riskLevel === "high"
  ).length;
  const noInteraction30Count = rows.filter(
    (item) => !item.isChurn && item.staleInteraction30
  ).length;
  const noNewOpportunityCount = rows.filter(
    (item) => !item.isChurn && item.noOpportunityLong
  ).length;
  const expiringContractCount = rows.filter(
    (item) => !item.isChurn && item.contractExpiringSoon
  ).length;
  const pendingRecoveryCount = rows.filter((item) => item.pendingRetention).length;

  return {
    total,
    highRiskCount,
    churnCount,
    churnRate,
    highValueRiskCount,
    noInteraction30Count,
    noNewOpportunityCount,
    expiringContractCount,
    pendingRecoveryCount,
  };
}

const currentMetrics = computed(() => buildKpiMetrics(filteredRecords.value));
const previousMetrics = computed(() => buildKpiMetrics(previousFilteredRecords.value));

function focusHighRisk() {
  filters.riskLevel = "high";
  filters.isChurn = "no";
  detailTab.value = "high_risk";
}

function focusChurned() {
  filters.isChurn = "yes";
  detailTab.value = "churned";
}

function focusHighValueRisk() {
  filters.riskLevel = "high";
  filters.isHighValue = "yes";
  filters.isChurn = "no";
  detailTab.value = "high_value_risk";
}

function focusNoInteraction() {
  detailTab.value = "no_interaction";
}

function focusNoOpportunity() {
  detailTab.value = "revenue_decline";
}

function focusContractExpiry() {
  detailTab.value = "contract_expiry";
}

function focusPendingRecovery() {
  filters.isPendingRecovery = "yes";
  filters.isChurn = "no";
  detailTab.value = "pending_recovery";
}

const kpiCards = computed(() => [
  {
    label: "高風險客戶數",
    value: `${currentMetrics.value.highRiskCount} 位`,
    delta: formatDelta(currentMetrics.value.highRiskCount, previousMetrics.value.highRiskCount),
    action: focusHighRisk,
  },
  {
    label: "已流失客戶數",
    value: `${currentMetrics.value.churnCount} 位`,
    delta: formatDelta(currentMetrics.value.churnCount, previousMetrics.value.churnCount),
    action: focusChurned,
  },
  {
    label: "客戶流失率",
    value: formatPercent(currentMetrics.value.churnRate),
    delta: formatDelta(currentMetrics.value.churnRate, previousMetrics.value.churnRate, true),
  },
  {
    label: "高價值風險客戶數",
    value: `${currentMetrics.value.highValueRiskCount} 位`,
    delta: formatDelta(
      currentMetrics.value.highValueRiskCount,
      previousMetrics.value.highValueRiskCount
    ),
    action: focusHighValueRisk,
  },
  {
    label: "近 30 天無互動客戶數",
    value: `${currentMetrics.value.noInteraction30Count} 位`,
    delta: formatDelta(
      currentMetrics.value.noInteraction30Count,
      previousMetrics.value.noInteraction30Count
    ),
    action: focusNoInteraction,
  },
  {
    label: "長期無新商機客戶數",
    value: `${currentMetrics.value.noNewOpportunityCount} 位`,
    delta: formatDelta(
      currentMetrics.value.noNewOpportunityCount,
      previousMetrics.value.noNewOpportunityCount
    ),
    action: focusNoOpportunity,
  },
  {
    label: "即將到期合約客戶數",
    value: `${currentMetrics.value.expiringContractCount} 位`,
    delta: formatDelta(
      currentMetrics.value.expiringContractCount,
      previousMetrics.value.expiringContractCount
    ),
    action: focusContractExpiry,
  },
  {
    label: "待挽回客戶數",
    value: `${currentMetrics.value.pendingRecoveryCount} 位`,
    delta: formatDelta(
      currentMetrics.value.pendingRecoveryCount,
      previousMetrics.value.pendingRecoveryCount
    ),
    action: focusPendingRecovery,
  },
]);

const trendMonths = computed(() => getRecentMonths(6, currentPeriodRange.value.end));

const monthlySnapshots = computed(() =>
  trendMonths.value.map((month) => {
    const snapshotRows = buildSnapshotRows(nonDateFilteredBaseRecords.value, month.end);
    const rows = applySnapshotFilters(snapshotRows, { applyDate: false });

    const churnCount = rows.filter((item) => item.isChurn).length;
    const highRiskCount = rows.filter(
      (item) => !item.isChurn && item.riskLevel === "high"
    ).length;
    const pendingRecoveryCount = rows.filter((item) => item.pendingRetention).length;

    return {
      key: month.key,
      label: month.label,
      total: rows.length,
      churnCount,
      highRiskCount,
      pendingRecoveryCount,
      churnRate: rows.length === 0 ? 0 : (churnCount / rows.length) * 100,
      noInteractionCount: rows.filter((item) => !item.isChurn && item.staleInteraction30).length,
      noOpportunityCount: rows.filter((item) => !item.isChurn && item.noOpportunityLong).length,
    };
  })
);

const churnRateTrendOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 40, right: 20, top: 24, bottom: 24 },
  xAxis: { type: "category", data: monthlySnapshots.value.map((item) => item.label) },
  yAxis: { type: "value", axisLabel: { formatter: "{value}%" } },
  series: [
    {
      type: "line",
      smooth: true,
      data: monthlySnapshots.value.map((item) => Number(item.churnRate.toFixed(1))),
      itemStyle: { color: "#f97316" },
      areaStyle: { color: "rgba(249, 115, 22, 0.14)" },
    },
  ],
}));

const churnCountTrendOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 40, right: 20, top: 24, bottom: 24 },
  xAxis: { type: "category", data: monthlySnapshots.value.map((item) => item.label) },
  yAxis: { type: "value" },
  series: [
    {
      type: "bar",
      barMaxWidth: 24,
      data: monthlySnapshots.value.map((item) => item.churnCount),
      itemStyle: { color: "#ef4444" },
    },
  ],
}));

const highRiskTrendOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 40, right: 20, top: 24, bottom: 24 },
  xAxis: { type: "category", data: monthlySnapshots.value.map((item) => item.label) },
  yAxis: { type: "value" },
  series: [
    {
      type: "line",
      smooth: true,
      data: monthlySnapshots.value.map((item) => item.highRiskCount),
      itemStyle: { color: "#dc2626" },
      areaStyle: { color: "rgba(220, 38, 38, 0.12)" },
    },
  ],
}));

const riskStructureTrendOption = computed(() => ({
  tooltip: { trigger: "axis" },
  legend: { top: 0 },
  grid: { left: 36, right: 16, top: 36, bottom: 24 },
  xAxis: { type: "category", data: monthlySnapshots.value.map((item) => item.label) },
  yAxis: { type: "value" },
  series: [
    {
      name: "高風險",
      type: "bar",
      stack: "risk",
      barMaxWidth: 18,
      data: monthlySnapshots.value.map((item) => item.highRiskCount),
      itemStyle: { color: "#f97316" },
    },
    {
      name: "已流失",
      type: "bar",
      stack: "risk",
      barMaxWidth: 18,
      data: monthlySnapshots.value.map((item) => item.churnCount),
      itemStyle: { color: "#ef4444" },
    },
    {
      name: "待挽回",
      type: "bar",
      stack: "risk",
      barMaxWidth: 18,
      data: monthlySnapshots.value.map((item) => item.pendingRecoveryCount),
      itemStyle: { color: "#f59e0b" },
    },
  ],
}));

const riskLevelDistributionOption = computed(() => {
  const map = { high: 0, medium: 0, low: 0 };

  filteredRecords.value.forEach((item) => {
    map[item.riskLevel] = (map[item.riskLevel] || 0) + 1;
  });

  return {
    tooltip: { trigger: "item" },
    legend: { bottom: 0, icon: "circle" },
    series: [
      {
        type: "pie",
        radius: ["45%", "72%"],
        data: [
          { name: "高風險", value: map.high, key: "high" },
          { name: "中風險", value: map.medium, key: "medium" },
          { name: "低風險", value: map.low, key: "low" },
        ],
      },
    ],
  };
});

const regionRiskRows = computed(() => {
  const map = {};

  filteredRecords.value.forEach((item) => {
    map[item.region] = map[item.region] || { region: item.region, high: 0, medium: 0 };

    if (!item.isChurn && item.riskLevel === "high") {
      map[item.region].high += 1;
    }

    if (!item.isChurn && item.riskLevel === "medium") {
      map[item.region].medium += 1;
    }
  });

  return Object.values(map).sort((a, b) => b.high + b.medium - (a.high + a.medium));
});

const regionRiskDistributionOption = computed(() => ({
  tooltip: { trigger: "axis" },
  legend: { top: 0 },
  grid: { left: 56, right: 16, top: 34, bottom: 24 },
  xAxis: { type: "value" },
  yAxis: {
    type: "category",
    data: regionRiskRows.value.map((item) => item.region),
  },
  series: [
    {
      name: "高風險",
      type: "bar",
      stack: "risk-level",
      barMaxWidth: 14,
      data: regionRiskRows.value.map((item) => ({ value: item.high, key: item.region })),
      itemStyle: { color: "#ef4444" },
    },
    {
      name: "中風險",
      type: "bar",
      stack: "risk-level",
      barMaxWidth: 14,
      data: regionRiskRows.value.map((item) => ({ value: item.medium, key: item.region })),
      itemStyle: { color: "#f59e0b" },
    },
  ],
}));

const typeRiskDistributionOption = computed(() => {
  const map = {};

  filteredRecords.value.forEach((item) => {
    map[item.companyType] = map[item.companyType] || { label: item.companyType, high: 0 };

    if (!item.isChurn && item.riskLevel === "high") {
      map[item.companyType].high += 1;
    }
  });

  const rows = Object.entries(map).map(([key, value]) => ({
    key,
    label: accountTypeLabelMap[key] || key,
    value: value.high,
  }));

  return {
    tooltip: { trigger: "item" },
    legend: { bottom: 0, icon: "circle" },
    series: [
      {
        type: "pie",
        radius: ["45%", "72%"],
        data: rows.map((item) => ({ name: item.label, value: item.value, key: item.key })),
      },
    ],
  };
});

const ownerRiskRows = computed(() => {
  const map = new Map();

  filteredRecords.value.forEach((item) => {
    const row = map.get(item.ownerUserId) || {
      ownerId: item.ownerUserId,
      ownerName: item.ownerName,
      high: 0,
      medium: 0,
      churn: 0,
    };

    if (item.isChurn) {
      row.churn += 1;
    } else if (item.riskLevel === "high") {
      row.high += 1;
    } else if (item.riskLevel === "medium") {
      row.medium += 1;
    }

    map.set(item.ownerUserId, row);
  });

  return [...map.values()].sort(
    (a, b) => b.high + b.medium + b.churn - (a.high + a.medium + a.churn)
  );
});

const ownerRiskDistributionOption = computed(() => ({
  tooltip: { trigger: "axis" },
  legend: { top: 0 },
  grid: { left: 36, right: 16, top: 34, bottom: 24 },
  xAxis: {
    type: "category",
    data: ownerRiskRows.value.map((item) => item.ownerName),
    axisLabel: { rotate: 18 },
  },
  yAxis: { type: "value" },
  series: [
    {
      name: "高風險",
      type: "bar",
      stack: "owner-risk",
      barMaxWidth: 18,
      data: ownerRiskRows.value.map((item) => ({ value: item.high, key: item.ownerId })),
      itemStyle: { color: "#ef4444" },
    },
    {
      name: "中風險",
      type: "bar",
      stack: "owner-risk",
      barMaxWidth: 18,
      data: ownerRiskRows.value.map((item) => ({ value: item.medium, key: item.ownerId })),
      itemStyle: { color: "#f59e0b" },
    },
    {
      name: "已流失",
      type: "bar",
      stack: "owner-risk",
      barMaxWidth: 18,
      data: ownerRiskRows.value.map((item) => ({ value: item.churn, key: item.ownerId })),
      itemStyle: { color: "#9f1239" },
    },
  ],
}));

const highValueRiskRegionOption = computed(() => {
  const map = new Map();

  filteredRecords.value.forEach((item) => {
    if (!item.isHighValue) {
      return;
    }

    const row = map.get(item.region) || {
      region: item.region,
      highRisk: 0,
      normal: 0,
    };

    if (!item.isChurn && item.riskLevel === "high") {
      row.highRisk += 1;
    } else {
      row.normal += 1;
    }

    map.set(item.region, row);
  });

  const rows = [...map.values()].sort((a, b) => b.highRisk + b.normal - (a.highRisk + a.normal));

  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 36, right: 16, top: 34, bottom: 24 },
    xAxis: { type: "category", data: rows.map((item) => item.region) },
    yAxis: { type: "value" },
    series: [
      {
        name: "高價值高風險",
        type: "bar",
        stack: "hv-risk",
        barMaxWidth: 18,
        data: rows.map((item) => ({ value: item.highRisk, key: item.region })),
        itemStyle: { color: "#dc2626" },
      },
      {
        name: "高價值其他",
        type: "bar",
        stack: "hv-risk",
        barMaxWidth: 18,
        data: rows.map((item) => ({ value: item.normal, key: item.region })),
        itemStyle: { color: "#94a3b8" },
      },
    ],
  };
});

const riskSignalRows = computed(() => {
  const map = {};

  filteredRecords.value
    .filter((item) => !item.isChurn)
    .forEach((item) => {
      item.riskSignals.forEach((signal) => {
        map[signal] = (map[signal] || 0) + 1;
      });
    });

  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
});

const riskSignalDistributionOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 150, right: 20, top: 22, bottom: 24 },
  xAxis: { type: "value" },
  yAxis: { type: "category", data: riskSignalRows.value.map((item) => item.name) },
  series: [
    {
      type: "bar",
      barMaxWidth: 16,
      data: riskSignalRows.value.map((item) => ({ value: item.value, key: item.name })),
      itemStyle: { color: "#f43f5e" },
    },
  ],
}));

const interactionDeclineTrendOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 36, right: 20, top: 24, bottom: 24 },
  xAxis: { type: "category", data: monthlySnapshots.value.map((item) => item.label) },
  yAxis: { type: "value" },
  series: [
    {
      type: "line",
      smooth: true,
      data: monthlySnapshots.value.map((item) => item.noInteractionCount),
      itemStyle: { color: "#fb7185" },
      areaStyle: { color: "rgba(251, 113, 133, 0.12)" },
    },
  ],
}));

const noOpportunityTrendOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 36, right: 20, top: 24, bottom: 24 },
  xAxis: { type: "category", data: monthlySnapshots.value.map((item) => item.label) },
  yAxis: { type: "value" },
  series: [
    {
      type: "bar",
      barMaxWidth: 24,
      data: monthlySnapshots.value.map((item) => item.noOpportunityCount),
      itemStyle: { color: "#f97316" },
    },
  ],
}));

const contractExpiryRiskRows = computed(() =>
  [...filteredRecords.value]
    .filter((item) => !item.isChurn && item.contractExpiringSoon)
    .map((item) => ({
      ...item,
      contractDaysLeft:
        item.upcomingContractAt
          ? Math.max(Math.floor((toTimestamp(item.upcomingContractAt) - currentPeriodRange.value.end) / dayMs), 0)
          : 0,
    }))
    .sort((a, b) => a.contractDaysLeft - b.contractDaysLeft)
    .slice(0, 10)
);

const contractExpiryRiskOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 180, right: 20, top: 22, bottom: 24 },
  xAxis: { type: "value" },
  yAxis: {
    type: "category",
    data: contractExpiryRiskRows.value.map((item) => item.companyName),
  },
  series: [
    {
      type: "bar",
      barMaxWidth: 14,
      data: contractExpiryRiskRows.value.map((item) => ({ value: item.contractDaysLeft, key: item.id })),
      itemStyle: { color: "#ef4444" },
    },
  ],
}));

const revenueDeclineRows = computed(() =>
  [...filteredRecords.value]
    .filter((item) => !item.isChurn && item.revenueDecline)
    .map((item) => ({
      ...item,
      declineAmount: Math.max(item.previous30Revenue - item.current30Revenue, 0),
    }))
    .sort((a, b) => b.declineAmount - a.declineAmount)
    .slice(0, 10)
);

const revenueDeclineOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 180, right: 20, top: 22, bottom: 24 },
  xAxis: { type: "value" },
  yAxis: { type: "category", data: revenueDeclineRows.value.map((item) => item.companyName) },
  series: [
    {
      type: "bar",
      barMaxWidth: 14,
      data: revenueDeclineRows.value.map((item) => ({ value: item.declineAmount, key: item.id })),
      itemStyle: { color: "#ea580c" },
    },
  ],
}));

const highValueHighRiskRows = computed(() =>
  [...filteredRecords.value]
    .filter((item) => !item.isChurn && item.isHighValue && item.riskLevel === "high")
    .sort((a, b) => b.customerValue - a.customerValue)
    .slice(0, 12)
);

const highValueHighRiskRankingOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 180, right: 20, top: 22, bottom: 24 },
  xAxis: { type: "value" },
  yAxis: {
    type: "category",
    data: highValueHighRiskRows.value.slice(0, 8).map((item) => item.companyName),
  },
  series: [
    {
      type: "bar",
      barMaxWidth: 14,
      data: highValueHighRiskRows.value.slice(0, 8).map((item) => ({ value: item.customerValue, key: item.id })),
      itemStyle: { color: "#dc2626" },
    },
  ],
}));

const riskValueMatrixOption = computed(() => {
  const values = filteredRecords.value.map((item) => item.customerValue).filter((item) => item > 0);
  const valueThreshold = quantile(values, 0.75);

  return {
    tooltip: {
      trigger: "item",
      formatter: (params) => {
        const row = params.data?.meta;
        if (!row) {
          return "-";
        }

        return `${row.companyName}<br/>價值：${formatCurrency(row.customerValue)}<br/>風險分數：${row.riskScore}`;
      },
    },
    grid: { left: 56, right: 28, top: 26, bottom: 36 },
    xAxis: {
      type: "value",
      name: "客戶價值",
      splitLine: { lineStyle: { type: "dashed" } },
    },
    yAxis: {
      type: "value",
      name: "風險分數",
      splitLine: { lineStyle: { type: "dashed" } },
      min: 0,
      max: 10,
    },
    series: [
      {
        type: "scatter",
        symbolSize: (value) => {
          const risk = Number(value[1] || 0);
          return 10 + Math.min(risk * 2, 16);
        },
        data: filteredRecords.value.map((item) => {
          const quadrant =
            item.customerValue >= valueThreshold
              ? item.riskScore >= 5
                ? "高價值高風險"
                : "高價值低風險"
              : item.riskScore >= 5
                ? "低價值高風險"
                : "低價值低風險";

          return {
            value: [item.customerValue, item.riskScore],
            key: item.id,
            quadrant,
            itemStyle: {
              color:
                quadrant === "高價值高風險"
                  ? "#dc2626"
                  : quadrant === "高價值低風險"
                    ? "#22c55e"
                    : quadrant === "低價值高風險"
                      ? "#f97316"
                      : "#94a3b8",
            },
            meta: item,
          };
        }),
      },
    ],
  };
});

const pendingRecoverySourceRows = computed(() => {
  const map = new Map();

  filteredRecords.value
    .filter((item) => item.pendingRetention)
    .forEach((item) => {
      const key = item.ownerUserId || "unassigned";
      const row = map.get(key) || {
        ownerId: key,
        ownerName: item.ownerName || "未指派",
        high: 0,
        medium: 0,
      };

      if (item.riskLevel === "high") {
        row.high += 1;
      } else {
        row.medium += 1;
      }

      map.set(key, row);
    });

  return [...map.values()].sort((a, b) => b.high + b.medium - (a.high + a.medium));
});

const pendingRecoverySourceOption = computed(() => ({
  tooltip: { trigger: "axis" },
  legend: { top: 0 },
  grid: { left: 40, right: 16, top: 34, bottom: 24 },
  xAxis: {
    type: "category",
    data: pendingRecoverySourceRows.value.map((item) => item.ownerName),
    axisLabel: { rotate: 16 },
  },
  yAxis: { type: "value" },
  series: [
    {
      name: "高風險待挽回",
      type: "bar",
      stack: "pending",
      barMaxWidth: 18,
      data: pendingRecoverySourceRows.value.map((item) => ({ value: item.high, key: item.ownerId })),
      itemStyle: { color: "#dc2626" },
    },
    {
      name: "中風險待挽回",
      type: "bar",
      stack: "pending",
      barMaxWidth: 18,
      data: pendingRecoverySourceRows.value.map((item) => ({ value: item.medium, key: item.ownerId })),
      itemStyle: { color: "#f59e0b" },
    },
  ],
}));

function handleRiskLevelClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.riskLevel = value;
    detailTab.value = value === "high" ? "high_risk" : detailTab.value;
  }
}

function handleRegionClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.region = value;
  }
}

function handleTypeClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.companyType = value;
  }
}

function handleOwnerClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.ownerUserId = value;
  }
}

function handleRiskSignalClick(params) {
  const value = params?.data?.key;
  if (value) {
    drillState.riskSignal = value;
    detailTab.value = "high_risk";
  }
}

function handleCustomerChartClick(params) {
  const value = params?.data?.key;
  if (!value) {
    return;
  }

  router.push({ name: "account-detail", params: { accountId: value } });
}

function handleMatrixClick(params) {
  const row = params?.data?.meta;
  if (!row) {
    return;
  }

  if (row.isHighValue && row.riskLevel === "high") {
    detailTab.value = "high_value_risk";
    filters.isHighValue = "yes";
    filters.riskLevel = "high";
    filters.isChurn = "no";
    return;
  }

  router.push({ name: "account-detail", params: { accountId: row.id } });
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
  filters.department = "all";
  filters.hasOpportunity = "all";
  filters.hasContract = "all";
  filters.hasRevenue = "all";
  filters.riskLevel = "all";
  filters.isHighValue = "all";
  filters.isChurn = "all";
  filters.isPendingRecovery = "all";
  drillState.riskSignal = "";
  detailTab.value = "high_risk";
  currentPage.value = 1;
}

const detailRowsByTab = computed(() => ({
  high_risk: filteredRecords.value.filter(
    (item) => !item.isChurn && item.riskLevel === "high"
  ),
  high_value_risk: filteredRecords.value.filter(
    (item) => !item.isChurn && item.isHighValue && item.riskLevel === "high"
  ),
  churned: filteredRecords.value.filter((item) => item.isChurn),
  pending_recovery: filteredRecords.value.filter(
    (item) => !item.isChurn && item.pendingRetention
  ),
  no_interaction: filteredRecords.value.filter(
    (item) => !item.isChurn && item.staleInteraction30
  ),
  contract_expiry: filteredRecords.value.filter(
    (item) => !item.isChurn && item.contractExpiringSoon
  ),
  revenue_decline: filteredRecords.value.filter(
    (item) => !item.isChurn && item.revenueDecline
  ),
}));

const detailTabs = computed(() => [
  {
    value: "high_risk",
    label: "高風險客戶",
    count: detailRowsByTab.value.high_risk.length,
  },
  {
    value: "high_value_risk",
    label: "高價值高風險客戶",
    count: detailRowsByTab.value.high_value_risk.length,
  },
  {
    value: "churned",
    label: "已流失客戶",
    count: detailRowsByTab.value.churned.length,
  },
  {
    value: "pending_recovery",
    label: "待挽回客戶",
    count: detailRowsByTab.value.pending_recovery.length,
  },
  {
    value: "no_interaction",
    label: "長期無互動客戶",
    count: detailRowsByTab.value.no_interaction.length,
  },
  {
    value: "contract_expiry",
    label: "合約到期風險客戶",
    count: detailRowsByTab.value.contract_expiry.length,
  },
  {
    value: "revenue_decline",
    label: "營收下滑客戶",
    count: detailRowsByTab.value.revenue_decline.length,
  },
]);

const sortedDetailRows = computed(() => {
  const rows = [...(detailRowsByTab.value[detailTab.value] || [])];

  if (detailTab.value === "no_interaction") {
    return rows.sort((a, b) => b.daysSinceInteraction - a.daysSinceInteraction);
  }

  if (detailTab.value === "contract_expiry") {
    return rows.sort((a, b) => toTimestamp(a.upcomingContractAt) - toTimestamp(b.upcomingContractAt));
  }

  if (detailTab.value === "revenue_decline") {
    return rows.sort(
      (a, b) => b.previous30Revenue - b.current30Revenue - (a.previous30Revenue - a.current30Revenue)
    );
  }

  return rows.sort((a, b) => b.customerValue - a.customerValue);
});

const pagedDetailRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedDetailRows.value.slice(start, start + pageSize.value);
});

function riskSignalSummary(row) {
  if (!row.riskSignals?.length) {
    return "-";
  }

  return row.riskSignals.slice(0, 2).join("、");
}

function lastRevenueSummary(row) {
  if (!row.lastRevenueAt) {
    return "-";
  }

  return `${formatDate(row.lastRevenueAt)} / ${formatCurrency(row.current30Revenue || 0)}`;
}

function openAccountDetail(row) {
  router.push({ name: "account-detail", params: { accountId: row.id } });
}

function openOpportunityDetail(row) {
  if (!row.primaryOpportunityId) {
    return;
  }

  router.push({ name: "opportunity-detail", params: { opportunityId: row.primaryOpportunityId } });
}

function openContractDetail(row) {
  if (!row.primaryContractId) {
    return;
  }

  router.push({ name: "contract-detail", params: { contractId: row.primaryContractId } });
}

function openIssuesView(row) {
  router.push({ name: "engagement-issues", query: { accountId: row.id } });
}

function openTimelineView(row) {
  router.push({ name: "engagement-timeline", query: { accountId: row.id } });
}

function exportDetailCsv() {
  const header = [
    "客戶名稱",
    "客戶編號",
    "客戶類型",
    "地區",
    "Owner",
    "生命週期",
    "客戶分級",
    "風險等級",
    "主要風險訊號",
    "最近互動時間",
    "最近商機時間",
    "最近營收時間",
    "合約到期日",
    "是否高價值",
    "挽回狀態",
  ];

  const rows = sortedDetailRows.value.map((item) => [
    item.companyName,
    item.accountCode,
    accountTypeLabelMap[item.companyType] || item.companyType,
    item.region,
    item.ownerName,
    lifecycleLabelMap[item.lifecycleStage] || item.lifecycleStage,
    tierLabelMap[item.tier] || item.tier,
    item.riskStatusLabel,
    item.riskSignals.join("、") || "-",
    formatDate(item.lastInteractionAt),
    formatDate(item.lastOpportunityAt),
    formatDate(item.lastRevenueAt),
    formatDate(item.upcomingContractAt || item.nearestContractEndAt),
    item.isHighValue ? "是" : "否",
    item.retentionStatusLabel,
  ]);

  const csv = [header, ...rows]
    .map((line) => line.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `churn-alerts-${new Date().toISOString().slice(0, 10)}.csv`;
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
    filters.department,
    filters.hasOpportunity,
    filters.hasContract,
    filters.hasRevenue,
    filters.riskLevel,
    filters.isHighValue,
    filters.isChurn,
    filters.isPendingRecovery,
    drillState.riskSignal,
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
            流失預警
          </h1>
          <p class="text-sm text-slate-500">提前辨識流失風險、追蹤訊號來源與排定挽回優先順序</p>
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
              placeholder="搜尋客戶名稱 / 編號 / Owner"
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
            <ElTag round effect="plain">分析樣本 {{ filteredRecords.length }} 位</ElTag>
            <ElTag
              v-if="drillState.riskSignal"
              type="danger"
              effect="light"
              closable
              @close="drillState.riskSignal = ''"
            >
              風險訊號：{{ drillState.riskSignal }}
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
                start-placeholder="分析起日"
                end-placeholder="分析迄日"
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
                  :key="`lifecycle-${item.value}`"
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
                  v-for="item in riskLevelOptions"
                  :key="`risk-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.isHighValue">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`high-value-${item.value}`"
                  :label="`高價值：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.isChurn">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`is-churn-${item.value}`"
                  :label="`已流失：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.isPendingRecovery">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`is-pending-${item.value}`"
                  :label="`待挽回：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </transition>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">流失趨勢分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>流失率趨勢</h3>
              <p>近 6 期流失率變化</p>
            </header>
            <VChart :option="churnRateTrendOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>已流失客戶數趨勢</h3>
              <p>本期實際流失數量</p>
            </header>
            <VChart :option="churnCountTrendOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>高風險客戶數趨勢</h3>
              <p>風險池規模變化</p>
            </header>
            <VChart :option="highRiskTrendOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>高風險 / 已流失 / 待挽回結構</h3>
              <p>問題客戶結構趨勢</p>
            </header>
            <VChart :option="riskStructureTrendOption" autoresize class="chart-body" />
          </article>
        </div>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">風險結構分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>風險等級分布</h3>
              <p>高 / 中 / 低風險結構</p>
            </header>
            <VChart
              :option="riskLevelDistributionOption"
              autoresize
              class="chart-body"
              @click="handleRiskLevelClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>地區風險分布</h3>
              <p>可點擊下鑽地區</p>
            </header>
            <VChart
              :option="regionRiskDistributionOption"
              autoresize
              class="chart-body"
              @click="handleRegionClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>客戶類型風險分布</h3>
              <p>可點擊下鑽類型</p>
            </header>
            <VChart
              :option="typeRiskDistributionOption"
              autoresize
              class="chart-body"
              @click="handleTypeClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>Owner 風險客戶分布</h3>
              <p>可點擊下鑽 Owner</p>
            </header>
            <VChart
              :option="ownerRiskDistributionOption"
              autoresize
              class="chart-body"
              @click="handleOwnerClick"
            />
          </article>
          <article class="chart-card xl:col-span-2">
            <header class="chart-header">
              <h3>高價值風險客戶分布</h3>
              <p>高價值客戶中的風險分布</p>
            </header>
            <VChart
              :option="highValueRiskRegionOption"
              autoresize
              class="chart-body chart-body-wide"
              @click="handleRegionClick"
            />
          </article>
        </div>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">流失訊號分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>風險訊號分布</h3>
              <p>可點擊下鑽訊號</p>
            </header>
            <VChart
              :option="riskSignalDistributionOption"
              autoresize
              class="chart-body"
              @click="handleRiskSignalClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>最近互動衰退趨勢</h3>
              <p>近 6 期無互動客戶變化</p>
            </header>
            <VChart :option="interactionDeclineTrendOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>長期無新商機客戶趨勢</h3>
              <p>經營停滯問題變化</p>
            </header>
            <VChart :option="noOpportunityTrendOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>合約到期風險分布</h3>
              <p>距離到期天數（越小越急）</p>
            </header>
            <VChart
              :option="contractExpiryRiskOption"
              autoresize
              class="chart-body"
              @click="handleCustomerChartClick"
            />
          </article>
          <article class="chart-card xl:col-span-2">
            <header class="chart-header">
              <h3>營收下滑客戶分布</h3>
              <p>近 30 天相較前 30 天下滑幅度</p>
            </header>
            <VChart
              :option="revenueDeclineOption"
              autoresize
              class="chart-body chart-body-wide"
              @click="handleCustomerChartClick"
            />
          </article>
        </div>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">挽回優先級分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>高價值高風險客戶排行</h3>
              <p>可點擊直接查看客戶</p>
            </header>
            <VChart
              :option="highValueHighRiskRankingOption"
              autoresize
              class="chart-body"
              @click="handleCustomerChartClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>風險 × 客戶價值矩陣</h3>
              <p>點高價值高風險點位可快速聚焦</p>
            </header>
            <VChart
              :option="riskValueMatrixOption"
              autoresize
              class="chart-body"
              @click="handleMatrixClick"
            />
          </article>
          <article class="chart-card xl:col-span-2">
            <header class="chart-header">
              <h3>待挽回客戶來源分布</h3>
              <p>依 Owner 觀察挽回壓力</p>
            </header>
            <VChart
              :option="pendingRecoverySourceOption"
              autoresize
              class="chart-body chart-body-wide"
              @click="handleOwnerClick"
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
          <ElTableColumn label="客戶" min-width="220">
            <template #default="{ row }">
              <button type="button" class="grid gap-1 text-left" @click="openAccountDetail(row)">
                <span class="font-semibold text-[#303133] hover:text-[#409eff]">{{ row.companyName }}</span>
                <span class="text-xs text-slate-500">{{ row.accountCode }}</span>
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="類型 / 分級" min-width="180">
            <template #default="{ row }">
              <div class="flex flex-wrap gap-1">
                <ElTag size="small" effect="light">
                  {{ accountTypeLabelMap[row.companyType] || row.companyType }}
                </ElTag>
                <ElTag size="small" effect="plain">
                  {{ tierLabelMap[row.tier] || row.tier }}
                </ElTag>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="地區 / Owner" min-width="150">
            <template #default="{ row }">
              <div class="grid gap-0.5">
                <span>{{ row.region }}</span>
                <span class="text-xs text-slate-500">{{ row.ownerName }}</span>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="生命週期" min-width="120">
            <template #default="{ row }">
              <ElTag :type="row.isChurn ? 'danger' : 'info'" size="small" effect="light">
                {{ lifecycleLabelMap[row.lifecycleStage] || row.lifecycleStage }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="風險等級" min-width="110">
            <template #default="{ row }">
              <ElTag :type="riskLevelTagType[row.riskLevel]" size="small" effect="light">
                {{ row.riskStatusLabel }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="主要風險訊號" min-width="210" show-overflow-tooltip>
            <template #default="{ row }">
              <span :class="row.riskSignals.length ? 'text-rose-600 font-medium' : 'text-slate-500'">
                {{ riskSignalSummary(row) }}
              </span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="最近互動" min-width="130">
            <template #default="{ row }">{{ formatDate(row.lastInteractionAt) }}</template>
          </ElTableColumn>

          <ElTableColumn label="最近商機" min-width="130">
            <template #default="{ row }">{{ formatDate(row.lastOpportunityAt) }}</template>
          </ElTableColumn>

          <ElTableColumn label="最近營收" min-width="170">
            <template #default="{ row }">{{ lastRevenueSummary(row) }}</template>
          </ElTableColumn>

          <ElTableColumn label="合約到期日" min-width="130">
            <template #default="{ row }">{{ formatDate(row.upcomingContractAt || row.nearestContractEndAt) }}</template>
          </ElTableColumn>

          <ElTableColumn label="高價值" min-width="90">
            <template #default="{ row }">
              <ElTag :type="row.isHighValue ? 'warning' : 'info'" size="small" effect="light">
                {{ row.isHighValue ? "是" : "否" }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="挽回狀態" min-width="120">
            <template #default="{ row }">
              <ElTag
                :type="retentionStatusTagType[row.retentionStatus] || 'info'"
                size="small"
                effect="light"
              >
                {{ row.retentionStatusLabel }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <ElDropdown trigger="click">
                <ElButton text type="primary">查看來源</ElButton>
                <template #dropdown>
                  <ElDropdownMenu>
                    <ElDropdownItem @click="openAccountDetail(row)">查看客戶</ElDropdownItem>
                    <ElDropdownItem
                      :disabled="!row.primaryOpportunityId"
                      @click="openOpportunityDetail(row)"
                    >
                      查看商機
                    </ElDropdownItem>
                    <ElDropdownItem
                      :disabled="!row.primaryContractId"
                      @click="openContractDetail(row)"
                    >
                      查看合約
                    </ElDropdownItem>
                    <ElDropdownItem @click="openIssuesView(row)">查看 Issue</ElDropdownItem>
                    <ElDropdownItem @click="openTimelineView(row)">查看 Timeline</ElDropdownItem>
                  </ElDropdownMenu>
                </template>
              </ElDropdown>
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
