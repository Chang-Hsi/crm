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
import { opportunityList } from "../../data/opportunities";
import { partnerOptions, projectList } from "../../data/projects";
import { userList } from "../../data/users";
import { cooperationModeMap } from "../../data/partnerSettlements";
import { useBillingPaymentsStore } from "../../composables/useBillingPaymentsStore";
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
const { records } = useBillingPaymentsStore();
const { settlements } = usePartnerSettlementStore();

const loading = ref(false);
const filterPanelOpen = ref(false);
const detailTab = ref("high_value");
const currentPage = ref(1);
const pageSize = ref(10);

const nowTs = Date.now();
const dayMs = 24 * 60 * 60 * 1000;

const yesNoOptions = [
  { value: "all", label: "全部" },
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
];

const fxRateToTwd = {
  TWD: 1,
  USD: 31.5,
  JPY: 0.22,
  EUR: 34.2,
};

const partnerTypeLabelMap = {
  partner: "合作夥伴",
  strategic: "策略夥伴",
  distributor: "代理商",
  channel: "通路商",
  referral: "推薦夥伴",
  consulting: "顧問夥伴",
  promotion: "推廣夥伴",
  technical: "技術夥伴",
  agency: "代理夥伴",
};

const projectById = new Map(projectList.map((item) => [item.id, item]));
const opportunityById = new Map(opportunityList.map((item) => [item.id, item]));
const accountById = new Map(accountList.map((item) => [item.id, item]));
const userById = new Map(userList.map((item) => [item.id, item]));
const partnerNameById = new Map(partnerOptions.map((item) => [item.id, item.name]));

const cooperationLabelMap = Object.fromEntries(
  Object.entries(cooperationModeMap).map(([value, meta]) => [value, meta.label])
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

function dominantValue(values, fallback = "-") {
  if (!values.length) {
    return fallback;
  }

  const counter = values.reduce((map, item) => {
    map[item] = (map[item] || 0) + 1;
    return map;
  }, {});

  const top = Object.entries(counter).sort((a, b) => b[1] - a[1]);
  return top[0]?.[0] || fallback;
}

function listUnique(values = []) {
  return [...new Set(values.filter(Boolean))];
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

const settlementEvents = computed(() =>
  settlements.value.map((item) => {
    const currency = item.currency || "TWD";
    const fx = fxRateToTwd[currency] || 1;

    return {
      id: item.id,
      partnerId: item.partnerId,
      partnerName: item.partnerName,
      partnerType: item.partnerType || "partner",
      cooperationMode: item.cooperationMode || "",
      opportunityId: item.opportunityId || "",
      contractId: item.contractId || "",
      ownerId: item.ownerId || "",
      recognizedAt: item.recognizedAt || String(item.createdAt || "").slice(0, 10),
      updatedAt: item.updatedAt || item.createdAt || "",
      commissionAmountTwd: Number(item.commissionValue || 0) * fx,
      isException:
        item.status === "exception" ||
        Boolean(item.isException) ||
        item.reconciliationStatus === "disputed" ||
        item.invoiceStatus === "rejected",
      exceptionReason: String(item.exceptionReason || "").trim(),
    };
  })
);

const settlementByOpportunityId = computed(() => {
  const map = new Map();

  settlementEvents.value.forEach((item) => {
    if (!item.opportunityId || map.has(item.opportunityId)) {
      return;
    }

    map.set(item.opportunityId, item);
  });

  return map;
});

const revenueEvents = computed(() =>
  records.value
    .filter((item) => {
      const hasRevenue =
        Number(item.expectedReceiveAmount || 0) > 0 ||
        (item.documentType !== "payable" && Number(item.invoiceAmount || 0) > 0);

      return hasRevenue;
    })
    .map((item) => {
      const project = projectById.get(item.projectId || "");
      const settlementRef = settlementByOpportunityId.value.get(item.opportunityId || "");
      const opportunity = opportunityById.get(item.opportunityId || "");
      const account = accountById.get(item.accountId || "");

      const partnerId =
        project?.partnerId ||
        settlementRef?.partnerId ||
        (item.projectId ? `partner-unknown-${item.projectId}` : "");
      const partnerName =
        project?.partnerName ||
        settlementRef?.partnerName ||
        partnerNameById.get(partnerId) ||
        "未指派夥伴";

      const revenueDate = item.invoiceDate || String(item.createdAt || "").slice(0, 10);
      const grossRevenue = Number(item.invoiceAmount || item.expectedReceiveAmount || 0);
      const netRevenue =
        typeof item.untaxedAmount === "number"
          ? Number(item.untaxedAmount || 0)
          : Math.max(grossRevenue - Number(item.taxAmount || 0), 0);

      return {
        id: item.id,
        partnerId,
        partnerName,
        opportunityId: item.opportunityId || project?.opportunityId || "",
        projectName: project?.projectName || item.projectName || "未分類產品",
        region: account?.region || opportunity?.region || "未分類",
        ownerId: item.ownerId || project?.ownerId || "",
        cooperationMode:
          settlementRef?.cooperationMode ||
          (project?.projectType === "partner" ? "channel" : "") ||
          "",
        revenueDate,
        netRevenueTwd: Math.max(netRevenue, 0),
        systemAlerts: item.systemAlerts || [],
        updatedAt: item.updatedAt || item.createdAt || "",
      };
    })
    .filter((item) => item.partnerId)
);

const projectEvents = computed(() =>
  projectList
    .map((item) => {
      const opportunity = opportunityById.get(item.opportunityId || "");
      const account = accountById.get(item.customerId || "");

      return {
        id: item.id,
        partnerId: item.partnerId || `partner-unknown-${item.id}`,
        partnerName: item.partnerName || partnerNameById.get(item.partnerId) || "未指派夥伴",
        projectName: item.projectName,
        opportunityId: item.opportunityId || "",
        contractId: item.contractId || "",
        ownerId: item.ownerId || "",
        region: account?.region || opportunity?.region || "未分類",
        updatedAt: item.updatedAt || item.createdAt || "",
      };
    })
    .filter((item) => item.partnerId)
);

const partnerProfiles = computed(() => {
  const map = new Map();

  function ensurePartner(partnerId, partnerName = "未命名夥伴") {
    if (!map.has(partnerId)) {
      map.set(partnerId, {
        partnerId,
        partnerName,
        partnerTypeCandidates: [],
        regionCandidates: [],
        cooperationCandidates: [],
        ownerCandidates: [],
        products: new Set(),
        opportunityIds: new Set(),
        contractIds: new Set(),
        projectIds: new Set(),
        revenueEvents: [],
        settlementEvents: [],
        interactionTimes: [],
      });
    }

    const record = map.get(partnerId);
    if (!record.partnerName || record.partnerName === "未命名夥伴") {
      record.partnerName = partnerName || record.partnerName;
    }

    return record;
  }

  partnerOptions.forEach((item) => {
    ensurePartner(item.id, item.name);
  });

  projectEvents.value.forEach((event) => {
    const target = ensurePartner(event.partnerId, event.partnerName);
    target.regionCandidates.push(event.region);
    target.ownerCandidates.push(event.ownerId);
    target.products.add(event.projectName);
    target.projectIds.add(event.id);
    if (event.opportunityId) {
      target.opportunityIds.add(event.opportunityId);
    }
    if (event.contractId) {
      target.contractIds.add(event.contractId);
    }
    if (event.updatedAt) {
      target.interactionTimes.push(event.updatedAt);
    }
  });

  settlementEvents.value.forEach((event) => {
    const target = ensurePartner(event.partnerId, event.partnerName);
    target.partnerTypeCandidates.push(event.partnerType);
    target.cooperationCandidates.push(event.cooperationMode);
    target.ownerCandidates.push(event.ownerId);
    target.settlementEvents.push(event);
    if (event.opportunityId) {
      target.opportunityIds.add(event.opportunityId);
    }
    if (event.contractId) {
      target.contractIds.add(event.contractId);
    }
    if (event.updatedAt) {
      target.interactionTimes.push(event.updatedAt);
    }
  });

  revenueEvents.value.forEach((event) => {
    const target = ensurePartner(event.partnerId, event.partnerName);
    target.regionCandidates.push(event.region);
    target.cooperationCandidates.push(event.cooperationMode);
    target.ownerCandidates.push(event.ownerId);
    target.products.add(event.projectName);
    target.revenueEvents.push(event);
    if (event.opportunityId) {
      target.opportunityIds.add(event.opportunityId);
    }
    if (event.updatedAt) {
      target.interactionTimes.push(event.updatedAt);
    }
  });

  return [...map.values()].map((item) => {
    const partnerType = dominantValue(item.partnerTypeCandidates, "partner");
    const region = dominantValue(item.regionCandidates, "未分類");
    const cooperationMode = dominantValue(item.cooperationCandidates, "unspecified");
    const ownerId = dominantValue(item.ownerCandidates, "");
    const ownerName = ownerId ? userById.get(ownerId)?.name || "未指派" : "未指派";

    const lastInteractionTs = Math.max(
      ...item.interactionTimes.map((value) => toTimestamp(value)),
      0
    );

    return {
      partnerId: item.partnerId,
      partnerName: item.partnerName || partnerNameById.get(item.partnerId) || "未命名夥伴",
      partnerType,
      partnerTypeLabel: partnerTypeLabelMap[partnerType] || partnerType,
      region,
      cooperationMode,
      cooperationModeLabel:
        cooperationLabelMap[cooperationMode] ||
        (cooperationMode === "unspecified" ? "未分類模式" : cooperationMode),
      ownerId,
      ownerName,
      department: ownerId ? userById.get(ownerId)?.department || "未分類部門" : "未分類部門",
      products: [...item.products],
      opportunityIds: [...item.opportunityIds],
      contractIds: [...item.contractIds],
      projectIds: [...item.projectIds],
      opportunityCount: item.opportunityIds.size,
      contractCount: item.contractIds.size,
      projectCount: item.projectIds.size,
      revenueEvents: item.revenueEvents,
      settlementEvents: item.settlementEvents,
      lastInteractionAt: lastInteractionTs > 0 ? new Date(lastInteractionTs).toISOString() : "",
      lastInteractionTs,
    };
  });
});

const partnerTypeOptions = computed(() => [
  { value: "all", label: "全部夥伴類型" },
  ...listUnique(partnerProfiles.value.map((item) => item.partnerType)).map((value) => ({
    value,
    label: partnerTypeLabelMap[value] || value,
  })),
]);

const cooperationOptions = computed(() => [
  { value: "all", label: "全部合作模式" },
  ...listUnique(partnerProfiles.value.map((item) => item.cooperationMode)).map((value) => ({
    value,
    label:
      cooperationLabelMap[value] ||
      (value === "unspecified" ? "未分類模式" : value),
  })),
]);

const ownerOptions = computed(() => [
  { value: "all", label: "全部 Owner" },
  ...listUnique(partnerProfiles.value.map((item) => item.ownerId).filter(Boolean)).map(
    (value) => ({
      value,
      label: userById.get(value)?.name || value,
    })
  ),
]);

const departmentOptions = computed(() => [
  { value: "all", label: "全部部門" },
  ...listUnique(partnerProfiles.value.map((item) => item.department)).map((value) => ({
    value,
    label: value,
  })),
]);

const partnerSelectOptions = computed(() => [
  { value: "all", label: "全部夥伴" },
  ...partnerProfiles.value
    .map((item) => ({ value: item.partnerId, label: item.partnerName }))
    .sort((a, b) => a.label.localeCompare(b.label, "zh-Hant")),
]);

const productOptions = computed(() => [
  { value: "all", label: "全部產品 / 遊戲" },
  ...listUnique(partnerProfiles.value.flatMap((item) => item.products))
    .sort((a, b) => a.localeCompare(b, "zh-Hant"))
    .map((value) => ({ value, label: value })),
]);

const filters = reactive({
  keyword: "",
  dateRange: [],
  partnerId: "all",
  partnerType: "all",
  cooperationMode: "all",
  region: "all",
  product: "all",
  ownerId: "all",
  department: "all",
  hasOpportunity: "all",
  hasContract: "all",
  hasRevenue: "all",
  isHighGrowth: "all",
  isLowPerformance: "all",
  isHighRisk: "all",
});

const drillState = reactive({
  riskSignal: "",
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

const prePreviousPeriodRange = computed(() => {
  const span = previousPeriodRange.value.end - previousPeriodRange.value.start + 1;
  return {
    start: previousPeriodRange.value.start - span,
    end: previousPeriodRange.value.start - 1,
  };
});

function sumRevenueByRange(events, range) {
  return events
    .filter((item) => {
      const ts = toTimestamp(item.revenueDate);
      return ts >= range.start && ts <= range.end;
    })
    .reduce((sum, item) => sum + Number(item.netRevenueTwd || 0), 0);
}

function sumSettlementByRange(events, range) {
  return events
    .filter((item) => {
      const ts = toTimestamp(item.recognizedAt);
      return ts >= range.start && ts <= range.end;
    })
    .reduce((sum, item) => sum + Number(item.commissionAmountTwd || 0), 0);
}

function countSettlementExceptionByRange(events, range) {
  return events.filter((item) => {
    const ts = toTimestamp(item.recognizedAt);
    return ts >= range.start && ts <= range.end && item.isException;
  }).length;
}

function countBillingAlertsByRange(events, range) {
  return events
    .filter((item) => {
      const ts = toTimestamp(item.revenueDate);
      return ts >= range.start && ts <= range.end;
    })
    .reduce((sum, item) => sum + Number(item.systemAlerts?.length || 0), 0);
}

function sumRevenueByOptionalRange(events, rangeFilter) {
  if (!rangeFilter?.[0] || !rangeFilter?.[1]) {
    return events.reduce((sum, item) => sum + Number(item.netRevenueTwd || 0), 0);
  }

  return events
    .filter((item) => isDateWithinRange(item.revenueDate, rangeFilter))
    .reduce((sum, item) => sum + Number(item.netRevenueTwd || 0), 0);
}

function sumSettlementByOptionalRange(events, rangeFilter) {
  if (!rangeFilter?.[0] || !rangeFilter?.[1]) {
    return events.reduce((sum, item) => sum + Number(item.commissionAmountTwd || 0), 0);
  }

  return events
    .filter((item) => isDateWithinRange(item.recognizedAt, rangeFilter))
    .reduce((sum, item) => sum + Number(item.commissionAmountTwd || 0), 0);
}

function matchesKeyword(partner, keyword) {
  if (!keyword) {
    return true;
  }

  return (
    partner.partnerName.toLowerCase().includes(keyword) ||
    partner.partnerId.toLowerCase().includes(keyword) ||
    partner.products.join(" ").toLowerCase().includes(keyword) ||
    partner.ownerName.toLowerCase().includes(keyword)
  );
}

const baseFilteredPartners = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return partnerProfiles.value.filter((partner) => {
    const matchesPartner = filters.partnerId === "all" || partner.partnerId === filters.partnerId;
    const matchesType =
      filters.partnerType === "all" || partner.partnerType === filters.partnerType;
    const matchesMode =
      filters.cooperationMode === "all" ||
      partner.cooperationMode === filters.cooperationMode;
    const matchesRegion = filters.region === "all" || partner.region === filters.region;
    const matchesProduct =
      filters.product === "all" || partner.products.includes(filters.product);
    const matchesOwner = filters.ownerId === "all" || partner.ownerId === filters.ownerId;
    const matchesDepartment =
      filters.department === "all" || partner.department === filters.department;
    const matchesOpportunity = matchesYesNo(
      partner.opportunityCount > 0,
      filters.hasOpportunity
    );
    const matchesContract = matchesYesNo(partner.contractCount > 0, filters.hasContract);
    const matchesDrill =
      drillState.riskSignal.length === 0 ||
      partner.settlementEvents.some((item) =>
        String(item.exceptionReason || "").includes(drillState.riskSignal)
      );

    return (
      matchesKeyword(partner, keyword) &&
      matchesPartner &&
      matchesType &&
      matchesMode &&
      matchesRegion &&
      matchesProduct &&
      matchesOwner &&
      matchesDepartment &&
      matchesOpportunity &&
      matchesContract &&
      matchesDrill
    );
  });
});

const enrichedPartners = computed(() => {
  const rows = baseFilteredPartners.value.map((partner) => {
    const revenueCurrent = sumRevenueByRange(partner.revenueEvents, currentPeriodRange.value);
    const revenuePrevious = sumRevenueByRange(partner.revenueEvents, previousPeriodRange.value);
    const revenuePrePrevious = sumRevenueByRange(
      partner.revenueEvents,
      prePreviousPeriodRange.value
    );

    const settlementCurrent = sumSettlementByRange(
      partner.settlementEvents,
      currentPeriodRange.value
    );
    const settlementPrevious = sumSettlementByRange(
      partner.settlementEvents,
      previousPeriodRange.value
    );

    const revenueInRange = sumRevenueByOptionalRange(partner.revenueEvents, filters.dateRange);
    const settlementInRange = sumSettlementByOptionalRange(
      partner.settlementEvents,
      filters.dateRange
    );

    const growthRate =
      revenuePrevious === 0
        ? revenueCurrent > 0
          ? 100
          : 0
        : ((revenueCurrent - revenuePrevious) / Math.abs(revenuePrevious)) * 100;

    const previousGrowthRate =
      revenuePrePrevious === 0
        ? revenuePrevious > 0
          ? 100
          : 0
        : ((revenuePrevious - revenuePrePrevious) / Math.abs(revenuePrePrevious)) * 100;

    const settlementRatio =
      revenueInRange > 0 ? (settlementInRange / revenueInRange) * 100 : 0;
    const previousSettlementRatio =
      revenuePrevious > 0 ? (settlementPrevious / revenuePrevious) * 100 : 0;

    const exceptionCount = countSettlementExceptionByRange(
      partner.settlementEvents,
      currentPeriodRange.value
    );
    const billingAlertCount = countBillingAlertsByRange(
      partner.revenueEvents,
      currentPeriodRange.value
    );

    const daysSinceInteraction =
      partner.lastInteractionTs > 0
        ? Math.floor((nowTs - partner.lastInteractionTs) / dayMs)
        : 999;

    const riskSignals = [
      growthRate <= -15 && revenuePrevious > 0 ? "營收下滑" : "",
      settlementRatio >= 25 && settlementInRange > 0 ? "分潤占比偏高" : "",
      exceptionCount > 0 || billingAlertCount > 0 ? "異常 / 爭議訊號" : "",
      daysSinceInteraction > 45 ? "長期無互動" : "",
      revenueCurrent === 0 && partner.projectCount > 0 ? "有專案但無本期營收" : "",
    ]
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    const isLowPerformance =
      growthRate <= -15 || (revenueCurrent === 0 && partner.projectCount > 0);

    return {
      ...partner,
      revenueCurrent,
      revenuePrevious,
      revenuePrePrevious,
      revenueInRange,
      settlementCurrent,
      settlementPrevious,
      settlementInRange,
      growthRate,
      previousGrowthRate,
      settlementRatio,
      previousSettlementRatio,
      exceptionCount,
      billingAlertCount,
      daysSinceInteraction,
      riskSignals,
      isHighRisk: riskSignals.length > 0,
      isLowPerformance,
      hasRevenueInRange: revenueInRange > 0,
      activeInCurrentPeriod:
        revenueCurrent > 0 || settlementCurrent > 0 || partner.projectCount > 0,
      previousActiveInPeriod:
        revenuePrevious > 0 || settlementPrevious > 0 || partner.projectCount > 0,
      previousIsHighRisk:
        (previousGrowthRate <= -15 && revenuePrePrevious > 0) ||
        previousSettlementRatio >= 25 ||
        countSettlementExceptionByRange(partner.settlementEvents, previousPeriodRange.value) > 0,
      previousIsLowPerformance:
        previousGrowthRate <= -15 || (revenuePrevious === 0 && partner.projectCount > 0),
    };
  });

  const currentRevenueValues = rows
    .map((item) => item.revenueCurrent)
    .filter((item) => item > 0);
  const previousRevenueValues = rows
    .map((item) => item.revenuePrevious)
    .filter((item) => item > 0);

  const highValueThreshold = quantile(currentRevenueValues, 0.75);
  const previousHighValueThreshold = quantile(previousRevenueValues, 0.75);

  return rows.map((item) => ({
    ...item,
    isHighValue: highValueThreshold > 0 && item.revenueCurrent >= highValueThreshold,
    isHighGrowth: item.growthRate >= 20 && item.revenueCurrent > 0,
    previousIsHighValue:
      previousHighValueThreshold > 0 && item.revenuePrevious >= previousHighValueThreshold,
    previousIsHighGrowth: item.previousGrowthRate >= 20 && item.revenuePrevious > 0,
  }));
});

const filteredPartners = computed(() =>
  enrichedPartners.value.filter((partner) => {
    const matchesRevenue = matchesYesNo(partner.hasRevenueInRange, filters.hasRevenue);
    const matchesHighGrowth = matchesYesNo(partner.isHighGrowth, filters.isHighGrowth);
    const matchesLowPerformance = matchesYesNo(
      partner.isLowPerformance,
      filters.isLowPerformance
    );
    const matchesHighRisk = matchesYesNo(partner.isHighRisk, filters.isHighRisk);

    return matchesRevenue && matchesHighGrowth && matchesLowPerformance && matchesHighRisk;
  })
);

const activePartnerCount = computed(
  () => filteredPartners.value.filter((item) => item.activeInCurrentPeriod).length
);

const previousActivePartnerCount = computed(
  () => filteredPartners.value.filter((item) => item.previousActiveInPeriod).length
);

const totalRevenueContribution = computed(() =>
  filteredPartners.value.reduce((sum, item) => sum + Number(item.revenueCurrent || 0), 0)
);

const previousTotalRevenueContribution = computed(() =>
  filteredPartners.value.reduce((sum, item) => sum + Number(item.revenuePrevious || 0), 0)
);

const averageRevenuePerPartner = computed(() =>
  activePartnerCount.value === 0
    ? 0
    : totalRevenueContribution.value / activePartnerCount.value
);

const previousAverageRevenuePerPartner = computed(() =>
  previousActivePartnerCount.value === 0
    ? 0
    : previousTotalRevenueContribution.value / previousActivePartnerCount.value
);

const highValuePartnerCount = computed(
  () => filteredPartners.value.filter((item) => item.isHighValue).length
);

const previousHighValuePartnerCount = computed(
  () => filteredPartners.value.filter((item) => item.previousIsHighValue).length
);

const highGrowthPartnerCount = computed(
  () => filteredPartners.value.filter((item) => item.isHighGrowth).length
);

const previousHighGrowthPartnerCount = computed(
  () => filteredPartners.value.filter((item) => item.previousIsHighGrowth).length
);

const lowPerformancePartnerCount = computed(
  () => filteredPartners.value.filter((item) => item.isLowPerformance).length
);

const previousLowPerformancePartnerCount = computed(
  () => filteredPartners.value.filter((item) => item.previousIsLowPerformance).length
);

const highRiskPartnerCount = computed(
  () => filteredPartners.value.filter((item) => item.isHighRisk).length
);

const previousHighRiskPartnerCount = computed(
  () => filteredPartners.value.filter((item) => item.previousIsHighRisk).length
);

const averageSettlementRatio = computed(() => {
  const totalSettlement = filteredPartners.value.reduce(
    (sum, item) => sum + Number(item.settlementCurrent || 0),
    0
  );
  const totalRevenue = filteredPartners.value.reduce(
    (sum, item) => sum + Number(item.revenueCurrent || 0),
    0
  );

  return totalRevenue === 0 ? 0 : (totalSettlement / totalRevenue) * 100;
});

const previousAverageSettlementRatio = computed(() => {
  const totalSettlement = filteredPartners.value.reduce(
    (sum, item) => sum + Number(item.settlementPrevious || 0),
    0
  );
  const totalRevenue = filteredPartners.value.reduce(
    (sum, item) => sum + Number(item.revenuePrevious || 0),
    0
  );

  return totalRevenue === 0 ? 0 : (totalSettlement / totalRevenue) * 100;
});

function focusHighValue() {
  detailTab.value = "high_value";
}

function focusHighGrowth() {
  filters.isHighGrowth = "yes";
  detailTab.value = "high_growth";
}

function focusLowPerformance() {
  filters.isLowPerformance = "yes";
  detailTab.value = "low_performance";
}

function focusHighRisk() {
  filters.isHighRisk = "yes";
  detailTab.value = "high_risk";
}

const kpiCards = computed(() => [
  {
    label: "活躍夥伴數",
    value: `${activePartnerCount.value} 個`,
    delta: formatDelta(activePartnerCount.value, previousActivePartnerCount.value),
  },
  {
    label: "夥伴總營收貢獻",
    value: formatCurrency(totalRevenueContribution.value),
    delta: formatDelta(totalRevenueContribution.value, previousTotalRevenueContribution.value),
  },
  {
    label: "平均單夥伴營收",
    value: formatCurrency(averageRevenuePerPartner.value),
    delta: formatDelta(averageRevenuePerPartner.value, previousAverageRevenuePerPartner.value),
  },
  {
    label: "高價值夥伴數",
    value: `${highValuePartnerCount.value} 個`,
    delta: formatDelta(highValuePartnerCount.value, previousHighValuePartnerCount.value),
    action: focusHighValue,
  },
  {
    label: "高成長夥伴數",
    value: `${highGrowthPartnerCount.value} 個`,
    delta: formatDelta(highGrowthPartnerCount.value, previousHighGrowthPartnerCount.value),
    action: focusHighGrowth,
  },
  {
    label: "低績效 / 下滑夥伴數",
    value: `${lowPerformancePartnerCount.value} 個`,
    delta: formatDelta(lowPerformancePartnerCount.value, previousLowPerformancePartnerCount.value),
    action: focusLowPerformance,
  },
  {
    label: "高風險夥伴數",
    value: `${highRiskPartnerCount.value} 個`,
    delta: formatDelta(highRiskPartnerCount.value, previousHighRiskPartnerCount.value),
    action: focusHighRisk,
  },
  {
    label: "平均分潤占比",
    value: formatPercent(averageSettlementRatio.value),
    delta: formatDelta(averageSettlementRatio.value, previousAverageSettlementRatio.value, true),
  },
]);

const recentMonths = computed(() => getRecentMonths(6));

function revenueByMonth(partner, month) {
  return partner.revenueEvents
    .filter((item) => {
      const ts = toTimestamp(item.revenueDate);
      return ts >= month.start && ts <= month.end;
    })
    .reduce((sum, item) => sum + Number(item.netRevenueTwd || 0), 0);
}

const partnerTypeDistributionOption = computed(() => {
  const map = {};

  filteredPartners.value.forEach((item) => {
    map[item.partnerTypeLabel] = (map[item.partnerTypeLabel] || 0) + 1;
  });

  return {
    tooltip: { trigger: "item" },
    legend: { bottom: 0, icon: "circle" },
    series: [
      {
        type: "pie",
        radius: ["45%", "72%"],
        data: Object.entries(map).map(([name, value]) => ({ name, value })),
      },
    ],
  };
});

const regionPartnerDistributionOption = computed(() => {
  const map = {};

  filteredPartners.value.forEach((item) => {
    map[item.region] = (map[item.region] || 0) + 1;
  });

  const rows = Object.entries(map)
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count);

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 86, right: 20, top: 22, bottom: 24 },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: rows.map((item) => item.region) },
    series: [
      {
        type: "bar",
        barMaxWidth: 16,
        data: rows.map((item) => ({ value: item.count, key: item.region })),
        itemStyle: { color: "#0284c7" },
      },
    ],
  };
});

const cooperationDistributionOption = computed(() => {
  const map = {};

  filteredPartners.value.forEach((item) => {
    map[item.cooperationModeLabel] = (map[item.cooperationModeLabel] || 0) + 1;
  });

  return {
    tooltip: { trigger: "item" },
    legend: { bottom: 0, icon: "circle" },
    series: [
      {
        type: "pie",
        radius: ["45%", "72%"],
        data: Object.entries(map).map(([name, value]) => ({
          name,
          value,
          key: Object.entries(cooperationLabelMap).find(([, label]) => label === name)?.[0] ||
            "unspecified",
        })),
      },
    ],
  };
});

const productCoverageOption = computed(() => {
  const map = {};

  filteredPartners.value.forEach((item) => {
    item.products.forEach((product) => {
      map[product] = (map[product] || 0) + 1;
    });
  });

  const rows = Object.entries(map)
    .map(([product, count]) => ({ product, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 180, right: 20, top: 22, bottom: 24 },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: rows.map((item) => item.product) },
    series: [
      {
        type: "bar",
        barMaxWidth: 14,
        data: rows.map((item) => ({ value: item.count, key: item.product })),
        itemStyle: { color: "#6366f1" },
      },
    ],
  };
});

const topPartnerRevenueRows = computed(() =>
  [...filteredPartners.value]
    .sort((a, b) => b.revenueInRange - a.revenueInRange)
    .slice(0, 10)
);

const topPartnerRevenueOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 180, right: 20, top: 20, bottom: 24 },
  xAxis: { type: "value" },
  yAxis: {
    type: "category",
    data: topPartnerRevenueRows.value.slice(0, 8).map((item) => item.partnerName),
  },
  series: [
    {
      type: "bar",
      barMaxWidth: 14,
      data: topPartnerRevenueRows.value.slice(0, 8).map((item) => ({
        value: item.revenueInRange,
        key: item.partnerId,
      })),
      itemStyle: { color: "#0ea5e9" },
    },
  ],
}));

const revenueBucketOption = computed(() => {
  const buckets = {
    "0": 0,
    "1-50萬": 0,
    "50-150萬": 0,
    "150-300萬": 0,
    "300萬以上": 0,
  };

  filteredPartners.value.forEach((item) => {
    const value = item.revenueInRange;
    if (value <= 0) {
      buckets["0"] += 1;
      return;
    }

    if (value < 500000) {
      buckets["1-50萬"] += 1;
      return;
    }

    if (value < 1500000) {
      buckets["50-150萬"] += 1;
      return;
    }

    if (value < 3000000) {
      buckets["150-300萬"] += 1;
      return;
    }

    buckets["300萬以上"] += 1;
  });

  const labels = Object.keys(buckets);

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 42, right: 20, top: 24, bottom: 24 },
    xAxis: { type: "category", data: labels },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        barMaxWidth: 24,
        data: labels.map((label) => buckets[label]),
        itemStyle: { color: "#3b82f6" },
      },
    ],
  };
});

const revenueConcentrationOption = computed(() => {
  const rows = topPartnerRevenueRows.value;
  const total = filteredPartners.value.reduce((sum, item) => sum + item.revenueInRange, 0);
  const topTotal = rows.reduce((sum, item) => sum + item.revenueInRange, 0);

  const chartRows = rows.map((item) => ({
    label: item.partnerName,
    value: item.revenueInRange,
    key: item.partnerId,
  }));

  if (total > topTotal) {
    chartRows.push({
      label: "其他夥伴",
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
        itemStyle: { color: "#8b5cf6" },
      },
    ],
  };
});

const averageRevenueTrendOption = computed(() => {
  const points = recentMonths.value.map((month) => {
    const totals = filteredPartners.value
      .map((item) => revenueByMonth(item, month))
      .filter((item) => item > 0);

    if (totals.length === 0) {
      return 0;
    }

    return Math.round(totals.reduce((sum, value) => sum + value, 0) / totals.length);
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
        data: points,
        itemStyle: { color: "#14b8a6" },
        areaStyle: { color: "rgba(20, 184, 166, 0.14)" },
      },
    ],
  };
});

const highValueDistributionOption = computed(() => {
  const map = new Map();

  filteredPartners.value.forEach((item) => {
    const row = map.get(item.region) || {
      region: item.region,
      highValue: 0,
      normal: 0,
    };

    if (item.isHighValue) {
      row.highValue += 1;
    } else {
      row.normal += 1;
    }

    map.set(item.region, row);
  });

  const rows = [...map.values()].sort(
    (a, b) => b.highValue + b.normal - (a.highValue + a.normal)
  );

  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 40, right: 16, top: 34, bottom: 24 },
    xAxis: { type: "category", data: rows.map((item) => item.region) },
    yAxis: { type: "value" },
    series: [
      {
        name: "高價值",
        type: "bar",
        stack: "value",
        barMaxWidth: 18,
        data: rows.map((item) => item.highValue),
      },
      {
        name: "其他",
        type: "bar",
        stack: "value",
        barMaxWidth: 18,
        data: rows.map((item) => item.normal),
      },
    ],
  };
});

const highGrowthRows = computed(() =>
  [...filteredPartners.value]
    .filter((item) => item.isHighGrowth)
    .sort((a, b) => b.growthRate - a.growthRate)
);

const highGrowthRankingOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 180, right: 20, top: 20, bottom: 24 },
  xAxis: { type: "value" },
  yAxis: {
    type: "category",
    data: highGrowthRows.value.slice(0, 8).map((item) => item.partnerName),
  },
  series: [
    {
      type: "bar",
      barMaxWidth: 14,
      data: highGrowthRows.value.slice(0, 8).map((item) => ({
        value: item.growthRate,
        key: item.partnerId,
      })),
      itemStyle: { color: "#22c55e" },
    },
  ],
}));

const partnerGrowthTrendOption = computed(() => {
  const monthRevenue = recentMonths.value.map((month) =>
    filteredPartners.value.reduce((sum, item) => sum + revenueByMonth(item, month), 0)
  );

  const growthPoints = monthRevenue.map((value, index) => {
    if (index === 0) {
      return 0;
    }

    const previous = monthRevenue[index - 1];
    if (previous === 0) {
      return value > 0 ? 100 : 0;
    }

    return Number((((value - previous) / Math.abs(previous)) * 100).toFixed(1));
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
        data: growthPoints,
        itemStyle: { color: "#f59e0b" },
        areaStyle: { color: "rgba(245, 158, 11, 0.14)" },
      },
    ],
  };
});

const cooperationDepthOption = computed(() => {
  const totalPartners = filteredPartners.value.length;
  const withInteraction = filteredPartners.value.filter((item) => item.lastInteractionTs > 0).length;
  const withOpportunity = filteredPartners.value.filter((item) => item.opportunityCount > 0).length;
  const withContract = filteredPartners.value.filter((item) => item.contractCount > 0).length;
  const withProject = filteredPartners.value.filter((item) => item.projectCount > 0).length;
  const withRevenue = filteredPartners.value.filter((item) => item.hasRevenueInRange).length;

  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 40, right: 16, top: 34, bottom: 24 },
    xAxis: { type: "category", data: ["夥伴池"] },
    yAxis: { type: "value" },
    series: [
      { name: "總夥伴", type: "bar", stack: "depth", data: [totalPartners] },
      { name: "有互動", type: "bar", stack: "depth", data: [withInteraction] },
      { name: "有商機", type: "bar", stack: "depth", data: [withOpportunity] },
      { name: "有合約", type: "bar", stack: "depth", data: [withContract] },
      { name: "有專案", type: "bar", stack: "depth", data: [withProject] },
      { name: "有營收", type: "bar", stack: "depth", data: [withRevenue] },
    ],
  };
});

const modePerformanceOption = computed(() => {
  const map = new Map();

  filteredPartners.value.forEach((item) => {
    const key = item.cooperationMode;
    const row = map.get(key) || {
      key,
      label: item.cooperationModeLabel,
      revenue: 0,
      growth: 0,
      count: 0,
    };

    row.revenue += item.revenueInRange;
    row.growth += item.growthRate;
    row.count += 1;

    map.set(key, row);
  });

  const rows = [...map.values()].sort((a, b) => b.revenue - a.revenue);

  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 40, right: 38, top: 34, bottom: 24 },
    xAxis: { type: "category", data: rows.map((item) => item.label) },
    yAxis: [{ type: "value", name: "營收" }, { type: "value", name: "成長率" }],
    series: [
      {
        name: "平均營收",
        type: "bar",
        barMaxWidth: 18,
        data: rows.map((item) => (item.count === 0 ? 0 : Math.round(item.revenue / item.count))),
        itemStyle: { color: "#3b82f6" },
      },
      {
        name: "平均成長率",
        type: "line",
        yAxisIndex: 1,
        data: rows.map((item) => (item.count === 0 ? 0 : Number((item.growth / item.count).toFixed(1)))),
        itemStyle: { color: "#22c55e" },
      },
    ],
  };
});

const ownerPerformanceOption = computed(() => {
  const map = new Map();

  filteredPartners.value.forEach((item) => {
    const key = item.ownerId || "unassigned";
    const row = map.get(key) || {
      key,
      label: item.ownerName || "未指派",
      revenue: 0,
      partnerCount: 0,
    };

    row.revenue += item.revenueInRange;
    row.partnerCount += 1;

    map.set(key, row);
  });

  const rows = [...map.values()].sort((a, b) => b.revenue - a.revenue);

  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 40, right: 38, top: 34, bottom: 24 },
    xAxis: { type: "category", data: rows.map((item) => item.label) },
    yAxis: [{ type: "value", name: "營收" }, { type: "value", name: "夥伴數" }],
    series: [
      {
        name: "營收貢獻",
        type: "bar",
        barMaxWidth: 18,
        data: rows.map((item) => item.revenue),
        itemStyle: { color: "#0ea5e9" },
      },
      {
        name: "夥伴數",
        type: "line",
        yAxisIndex: 1,
        data: rows.map((item) => item.partnerCount),
        itemStyle: { color: "#f59e0b" },
      },
    ],
  };
});

const settlementRatioRankingOption = computed(() => {
  const rows = [...filteredPartners.value]
    .filter((item) => item.revenueInRange > 0)
    .sort((a, b) => b.settlementRatio - a.settlementRatio)
    .slice(0, 8);

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 180, right: 20, top: 20, bottom: 24 },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: rows.map((item) => item.partnerName) },
    series: [
      {
        type: "bar",
        barMaxWidth: 14,
        data: rows.map((item) => ({ value: item.settlementRatio, key: item.partnerId })),
        itemStyle: { color: "#ef4444" },
      },
    ],
  };
});

const lowPerformanceTrendOption = computed(() => {
  const counts = recentMonths.value.map((month, index) => {
    if (index === 0) {
      return 0;
    }

    const previousMonth = recentMonths.value[index - 1];

    return filteredPartners.value.reduce((sum, partner) => {
      const currentRevenue = revenueByMonth(partner, month);
      const previousRevenue = revenueByMonth(partner, previousMonth);

      if (previousRevenue > 0 && currentRevenue < previousRevenue * 0.8) {
        return sum + 1;
      }

      return sum;
    }, 0);
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
        data: counts,
        itemStyle: { color: "#f97316" },
      },
    ],
  };
});

const highRiskSourceDistributionOption = computed(() => {
  const map = new Map();

  filteredPartners.value.forEach((item) => {
    if (!item.isHighRisk) {
      return;
    }

    const key = item.region;
    const row = map.get(key) || {
      key,
      downtrend: 0,
      highRatio: 0,
      exception: 0,
      stale: 0,
    };

    if (item.riskSignals.includes("營收下滑")) {
      row.downtrend += 1;
    }

    if (item.riskSignals.includes("分潤占比偏高")) {
      row.highRatio += 1;
    }

    if (item.riskSignals.includes("異常 / 爭議訊號")) {
      row.exception += 1;
    }

    if (item.riskSignals.includes("長期無互動")) {
      row.stale += 1;
    }

    map.set(key, row);
  });

  const rows = [...map.values()].sort(
    (a, b) =>
      b.downtrend + b.highRatio + b.exception + b.stale -
      (a.downtrend + a.highRatio + a.exception + a.stale)
  );

  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 40, right: 16, top: 34, bottom: 24 },
    xAxis: { type: "category", data: rows.map((item) => item.key) },
    yAxis: { type: "value" },
    series: [
      { name: "營收下滑", type: "bar", stack: "risk", data: rows.map((item) => item.downtrend) },
      { name: "高分潤占比", type: "bar", stack: "risk", data: rows.map((item) => item.highRatio) },
      { name: "異常 / 爭議", type: "bar", stack: "risk", data: rows.map((item) => item.exception) },
      { name: "長期無互動", type: "bar", stack: "risk", data: rows.map((item) => item.stale) },
    ],
  };
});

const riskSignalRows = computed(() => {
  const map = {};

  filteredPartners.value.forEach((item) => {
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
      barMaxWidth: 14,
      data: riskSignalRows.value.map((item) => ({ value: item.value, key: item.name })),
      itemStyle: { color: "#fb7185" },
    },
  ],
}));

const anomalyRows = computed(() => {
  const map = {};

  filteredPartners.value.forEach((partner) => {
    partner.settlementEvents.forEach((item) => {
      if (!item.isException) {
        return;
      }

      const reason = item.exceptionReason || "其他異常";
      map[reason] = (map[reason] || 0) + 1;
    });
  });

  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
});

const anomalyDistributionOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 180, right: 20, top: 22, bottom: 24 },
  xAxis: { type: "value" },
  yAxis: { type: "category", data: anomalyRows.value.map((item) => item.name) },
  series: [
    {
      type: "bar",
      barMaxWidth: 14,
      data: anomalyRows.value.map((item) => ({ value: item.value, key: item.name })),
      itemStyle: { color: "#dc2626" },
    },
  ],
}));

function handleRegionClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.region = value;
  }
}

function handleModeClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.cooperationMode = value;
  }
}

function handleProductClick(params) {
  const value = params?.data?.key;
  if (value) {
    filters.product = value;
  }
}

function handlePartnerClick(params) {
  const value = params?.data?.key;
  if (value && value !== "others") {
    filters.partnerId = value;
  }
}

function handleRiskSignalClick(params) {
  const value = params?.data?.key;
  if (value) {
    drillState.riskSignal = value;
    detailTab.value = "high_risk";
  }
}

function resetFilters() {
  filters.keyword = "";
  filters.dateRange = [];
  filters.partnerId = "all";
  filters.partnerType = "all";
  filters.cooperationMode = "all";
  filters.region = "all";
  filters.product = "all";
  filters.ownerId = "all";
  filters.department = "all";
  filters.hasOpportunity = "all";
  filters.hasContract = "all";
  filters.hasRevenue = "all";
  filters.isHighGrowth = "all";
  filters.isLowPerformance = "all";
  filters.isHighRisk = "all";
  drillState.riskSignal = "";
  detailTab.value = "high_value";
  currentPage.value = 1;
}

const partnerDetailRows = computed(() =>
  filteredPartners.value
    .map((item) => ({
      rowType: "partner",
      partnerId: item.partnerId,
      partnerName: item.partnerName,
      partnerType: item.partnerTypeLabel,
      region: item.region,
      cooperationMode: item.cooperationModeLabel,
      ownerName: item.ownerName,
      opportunityCount: item.opportunityCount,
      contractCount: item.contractCount,
      projectCount: item.projectCount,
      revenueContribution: item.revenueInRange,
      growthRate: item.growthRate,
      settlementRatio: item.settlementRatio,
      riskSignals: item.riskSignals,
      riskStatus: item.isHighRisk ? "高風險" : "正常",
      lastInteractionAt: item.lastInteractionAt,
      isHighValue: item.isHighValue,
      isHighGrowth: item.isHighGrowth,
      isLowPerformance: item.isLowPerformance,
      isHighRisk: item.isHighRisk,
      isHighRatio: item.settlementRatio >= 25,
      primaryContractId: item.contractIds[0] || "",
      primaryProjectId: item.projectIds[0] || "",
    }))
    .sort((a, b) => b.revenueContribution - a.revenueContribution)
);

const regionDetailRows = computed(() => {
  const map = new Map();

  partnerDetailRows.value.forEach((item) => {
    const row = map.get(item.region) || {
      rowType: "region",
      partnerId: "",
      partnerName: `${item.region}（區域彙總）`,
      partnerType: "區域彙總",
      region: item.region,
      cooperationMode: "-",
      ownerName: "-",
      opportunityCount: 0,
      contractCount: 0,
      projectCount: 0,
      revenueContribution: 0,
      growthRatePool: [],
      settlementRatioPool: [],
      riskCount: 0,
      riskSignals: [],
      riskStatus: "-",
      lastInteractionAt: "",
      isHighValue: false,
      isHighGrowth: false,
      isLowPerformance: false,
      isHighRisk: false,
      isHighRatio: false,
      primaryContractId: "",
      primaryProjectId: "",
    };

    row.opportunityCount += item.opportunityCount;
    row.contractCount += item.contractCount;
    row.projectCount += item.projectCount;
    row.revenueContribution += item.revenueContribution;
    row.growthRatePool.push(item.growthRate);
    row.settlementRatioPool.push(item.settlementRatio);
    if (item.isHighRisk) {
      row.riskCount += 1;
    }
    row.riskSignals.push(...item.riskSignals);

    const ts = toTimestamp(item.lastInteractionAt);
    if (ts > toTimestamp(row.lastInteractionAt)) {
      row.lastInteractionAt = item.lastInteractionAt;
    }

    map.set(item.region, row);
  });

  return [...map.values()]
    .map((row) => ({
      ...row,
      growthRate:
        row.growthRatePool.length === 0
          ? 0
          : row.growthRatePool.reduce((sum, value) => sum + value, 0) /
            row.growthRatePool.length,
      settlementRatio:
        row.settlementRatioPool.length === 0
          ? 0
          : row.settlementRatioPool.reduce((sum, value) => sum + value, 0) /
            row.settlementRatioPool.length,
      riskStatus: row.riskCount > 0 ? `高風險 ${row.riskCount} 個` : "正常",
      riskSignals: listUnique(row.riskSignals),
    }))
    .sort((a, b) => b.revenueContribution - a.revenueContribution);
});

const cooperationDetailRows = computed(() => {
  const map = new Map();

  partnerDetailRows.value.forEach((item) => {
    const key = item.cooperationMode;
    const row = map.get(key) || {
      rowType: "cooperation",
      partnerId: "",
      partnerName: `${key}（模式彙總）`,
      partnerType: "模式彙總",
      region: "-",
      cooperationMode: key,
      ownerName: "-",
      opportunityCount: 0,
      contractCount: 0,
      projectCount: 0,
      revenueContribution: 0,
      growthRatePool: [],
      settlementRatioPool: [],
      riskCount: 0,
      riskSignals: [],
      riskStatus: "-",
      lastInteractionAt: "",
      isHighValue: false,
      isHighGrowth: false,
      isLowPerformance: false,
      isHighRisk: false,
      isHighRatio: false,
      primaryContractId: "",
      primaryProjectId: "",
    };

    row.opportunityCount += item.opportunityCount;
    row.contractCount += item.contractCount;
    row.projectCount += item.projectCount;
    row.revenueContribution += item.revenueContribution;
    row.growthRatePool.push(item.growthRate);
    row.settlementRatioPool.push(item.settlementRatio);
    if (item.isHighRisk) {
      row.riskCount += 1;
    }
    row.riskSignals.push(...item.riskSignals);

    const ts = toTimestamp(item.lastInteractionAt);
    if (ts > toTimestamp(row.lastInteractionAt)) {
      row.lastInteractionAt = item.lastInteractionAt;
    }

    map.set(key, row);
  });

  return [...map.values()]
    .map((row) => ({
      ...row,
      growthRate:
        row.growthRatePool.length === 0
          ? 0
          : row.growthRatePool.reduce((sum, value) => sum + value, 0) /
            row.growthRatePool.length,
      settlementRatio:
        row.settlementRatioPool.length === 0
          ? 0
          : row.settlementRatioPool.reduce((sum, value) => sum + value, 0) /
            row.settlementRatioPool.length,
      riskStatus: row.riskCount > 0 ? `高風險 ${row.riskCount} 個` : "正常",
      riskSignals: listUnique(row.riskSignals),
    }))
    .sort((a, b) => b.revenueContribution - a.revenueContribution);
});

const detailRowsByTab = computed(() => ({
  high_value: partnerDetailRows.value.filter((item) => item.isHighValue),
  high_growth: partnerDetailRows.value.filter((item) => item.isHighGrowth),
  low_performance: partnerDetailRows.value.filter((item) => item.isLowPerformance),
  high_risk: partnerDetailRows.value.filter((item) => item.isHighRisk),
  high_ratio: partnerDetailRows.value.filter((item) => item.isHighRatio),
  region_breakdown: regionDetailRows.value,
  cooperation_breakdown: cooperationDetailRows.value,
}));

const detailTabs = computed(() => [
  { value: "high_value", label: "高價值夥伴", count: detailRowsByTab.value.high_value.length },
  { value: "high_growth", label: "高成長夥伴", count: detailRowsByTab.value.high_growth.length },
  {
    value: "low_performance",
    label: "低績效夥伴",
    count: detailRowsByTab.value.low_performance.length,
  },
  { value: "high_risk", label: "高風險夥伴", count: detailRowsByTab.value.high_risk.length },
  { value: "high_ratio", label: "高分潤占比夥伴", count: detailRowsByTab.value.high_ratio.length },
  {
    value: "region_breakdown",
    label: "地區明細",
    count: detailRowsByTab.value.region_breakdown.length,
  },
  {
    value: "cooperation_breakdown",
    label: "合作模式明細",
    count: detailRowsByTab.value.cooperation_breakdown.length,
  },
]);

const sortedDetailRows = computed(() => {
  const rows = [...(detailRowsByTab.value[detailTab.value] || [])];

  if (detailTab.value === "high_growth") {
    return rows.sort((a, b) => b.growthRate - a.growthRate);
  }

  if (detailTab.value === "high_ratio") {
    return rows.sort((a, b) => b.settlementRatio - a.settlementRatio);
  }

  return rows.sort((a, b) => b.revenueContribution - a.revenueContribution);
});

const pagedDetailRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedDetailRows.value.slice(start, start + pageSize.value);
});

function riskSummary(row) {
  if (!row.riskSignals?.length) {
    return "-";
  }

  return row.riskSignals.slice(0, 2).join("、");
}

function openDetail(row) {
  if (row.rowType === "region") {
    filters.region = row.region;
    return;
  }

  if (row.rowType === "cooperation") {
    const modeKey = Object.entries(cooperationLabelMap).find(
      ([, label]) => label === row.cooperationMode
    )?.[0];
    filters.cooperationMode = modeKey || "all";
    return;
  }

  if (row.partnerId) {
    router.push({
      name: "partners-list",
      query: { partnerId: row.partnerId },
    });
    return;
  }

  if (row.primaryContractId) {
    router.push({
      name: "contract-detail",
      params: { contractId: row.primaryContractId },
    });
    return;
  }

  if (row.primaryProjectId) {
    router.push({
      name: "project-detail",
      params: { projectId: row.primaryProjectId },
    });
    return;
  }

  router.push({ name: "finance-profit-sharing" });
}

function exportDetailCsv() {
  const header = [
    "夥伴名稱",
    "夥伴類型",
    "地區",
    "合作模式",
    "Owner",
    "商機數",
    "合約數",
    "專案數",
    "營收貢獻",
    "成長率",
    "分潤占營收比",
    "風險狀態",
    "最近互動時間",
  ];

  const rows = sortedDetailRows.value.map((item) => [
    item.partnerName,
    item.partnerType,
    item.region,
    item.cooperationMode,
    item.ownerName,
    item.opportunityCount,
    item.contractCount,
    item.projectCount,
    Math.round(item.revenueContribution || 0),
    `${Number(item.growthRate || 0).toFixed(1)}%`,
    `${Number(item.settlementRatio || 0).toFixed(1)}%`,
    item.riskStatus,
    formatDateTime(item.lastInteractionAt),
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
  anchor.download = `partner-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
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
    filters.partnerType,
    filters.cooperationMode,
    filters.region,
    filters.product,
    filters.ownerId,
    filters.department,
    filters.hasOpportunity,
    filters.hasContract,
    filters.hasRevenue,
    filters.isHighGrowth,
    filters.isLowPerformance,
    filters.isHighRisk,
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
          <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">夥伴績效</h1>
          <p class="text-sm text-slate-500">檢視夥伴價值、成長趨勢、合作深度與分潤風險</p>
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
              placeholder="搜尋夥伴 / 代碼 / 產品 / Owner"
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
            <ElTag round effect="plain">分析樣本 {{ filteredPartners.length }} 個夥伴</ElTag>
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
              <ElSelect v-model="filters.partnerId">
                <ElOption
                  v-for="item in partnerSelectOptions"
                  :key="`partner-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.partnerType">
                <ElOption
                  v-for="item in partnerTypeOptions"
                  :key="`type-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.cooperationMode">
                <ElOption
                  v-for="item in cooperationOptions"
                  :key="`mode-${item.value}`"
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
              <ElSelect v-model="filters.product">
                <ElOption
                  v-for="item in productOptions"
                  :key="`product-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.ownerId">
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
              <ElSelect v-model="filters.isLowPerformance">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`low-${item.value}`"
                  :label="`低績效：${item.label}`"
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
          </ElForm>
        </transition>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">夥伴結構與分布分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>夥伴類型分布</h3>
              <p>不同夥伴類型占比</p>
            </header>
            <VChart :option="partnerTypeDistributionOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>地區夥伴分布</h3>
              <p>可點擊下鑽地區</p>
            </header>
            <VChart
              :option="regionPartnerDistributionOption"
              autoresize
              class="chart-body"
              @click="handleRegionClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>合作模式分布</h3>
              <p>可點擊下鑽合作模式</p>
            </header>
            <VChart
              :option="cooperationDistributionOption"
              autoresize
              class="chart-body"
              @click="handleModeClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>產品 / 遊戲對應夥伴分布</h3>
              <p>可點擊下鑽產品</p>
            </header>
            <VChart
              :option="productCoverageOption"
              autoresize
              class="chart-body"
              @click="handleProductClick"
            />
          </article>
        </div>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">營收與價值分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>Top 夥伴營收排行</h3>
              <p>可點擊下鑽夥伴</p>
            </header>
            <VChart
              :option="topPartnerRevenueOption"
              autoresize
              class="chart-body"
              @click="handlePartnerClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>夥伴營收分布</h3>
              <p>高 / 中 / 低營收夥伴結構</p>
            </header>
            <VChart :option="revenueBucketOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>夥伴營收集中度</h3>
              <p>Top 夥伴與其餘夥伴占比</p>
            </header>
            <VChart
              :option="revenueConcentrationOption"
              autoresize
              class="chart-body"
              @click="handlePartnerClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>平均單夥伴營收趨勢</h3>
              <p>近 6 期平均貢獻值</p>
            </header>
            <VChart :option="averageRevenueTrendOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card xl:col-span-2">
            <header class="chart-header">
              <h3>高價值夥伴分布</h3>
              <p>各地區高價值夥伴占比</p>
            </header>
            <VChart
              :option="highValueDistributionOption"
              autoresize
              class="chart-body chart-body-wide"
              @click="handleRegionClick"
            />
          </article>
        </div>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">成長與合作深度分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>高成長夥伴排行</h3>
              <p>可點擊聚焦高成長夥伴</p>
            </header>
            <VChart :option="highGrowthRankingOption" autoresize class="chart-body" @click="focusHighGrowth" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>夥伴成長率趨勢</h3>
              <p>整體夥伴營收 MoM 變化</p>
            </header>
            <VChart :option="partnerGrowthTrendOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>合作深度分布</h3>
              <p>互動、商機、合約、專案、營收層級</p>
            </header>
            <VChart :option="cooperationDepthOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>合作模式績效比較</h3>
              <p>平均營收與平均成長率</p>
            </header>
            <VChart
              :option="modePerformanceOption"
              autoresize
              class="chart-body"
              @click="handleModeClick"
            />
          </article>
          <article class="chart-card xl:col-span-2">
            <header class="chart-header">
              <h3>不同 Owner 夥伴績效比較</h3>
              <p>Owner 夥伴池與營收貢獻</p>
            </header>
            <VChart :option="ownerPerformanceOption" autoresize class="chart-body chart-body-wide" />
          </article>
        </div>
      </section>

      <section class="grid gap-4">
        <h2 class="text-sm font-semibold text-slate-700">分潤與風險分析</h2>
        <div class="grid gap-4 xl:grid-cols-2">
          <article class="chart-card">
            <header class="chart-header">
              <h3>夥伴分潤占營收比排行</h3>
              <p>可點擊下鑽高占比夥伴</p>
            </header>
            <VChart
              :option="settlementRatioRankingOption"
              autoresize
              class="chart-body"
              @click="handlePartnerClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>低績效 / 下滑夥伴趨勢</h3>
              <p>近 6 期下滑夥伴數</p>
            </header>
            <VChart :option="lowPerformanceTrendOption" autoresize class="chart-body" />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>高風險夥伴來源分布</h3>
              <p>依地區拆解風險類型</p>
            </header>
            <VChart
              :option="highRiskSourceDistributionOption"
              autoresize
              class="chart-body"
              @click="handleRegionClick"
            />
          </article>
          <article class="chart-card">
            <header class="chart-header">
              <h3>風險訊號分布</h3>
              <p>可點擊下鑽風險訊號</p>
            </header>
            <VChart
              :option="riskSignalDistributionOption"
              autoresize
              class="chart-body"
              @click="handleRiskSignalClick"
            />
          </article>
          <article class="chart-card xl:col-span-2">
            <header class="chart-header">
              <h3>夥伴異常分布</h3>
              <p>結算異常與爭議原因</p>
            </header>
            <VChart :option="anomalyDistributionOption" autoresize class="chart-body chart-body-wide" />
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
          <ElTableColumn label="夥伴" min-width="240">
            <template #default="{ row }">
              <button type="button" class="grid gap-1 text-left" @click="openDetail(row)">
                <span class="font-semibold text-[#303133] hover:text-[#409eff]">{{ row.partnerName }}</span>
                <span class="text-xs text-slate-500">{{ row.rowType === 'partner' ? row.partnerId : row.partnerType }}</span>
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="夥伴類型" min-width="120">
            <template #default="{ row }">{{ row.partnerType }}</template>
          </ElTableColumn>

          <ElTableColumn label="地區" min-width="100">
            <template #default="{ row }">{{ row.region }}</template>
          </ElTableColumn>

          <ElTableColumn label="合作模式" min-width="130">
            <template #default="{ row }">{{ row.cooperationMode }}</template>
          </ElTableColumn>

          <ElTableColumn label="Owner" min-width="120">
            <template #default="{ row }">{{ row.ownerName }}</template>
          </ElTableColumn>

          <ElTableColumn label="商機數" min-width="90" align="right">
            <template #default="{ row }">{{ row.opportunityCount }}</template>
          </ElTableColumn>

          <ElTableColumn label="合約數" min-width="90" align="right">
            <template #default="{ row }">{{ row.contractCount }}</template>
          </ElTableColumn>

          <ElTableColumn label="專案數" min-width="90" align="right">
            <template #default="{ row }">{{ row.projectCount }}</template>
          </ElTableColumn>

          <ElTableColumn label="營收貢獻" min-width="130" align="right">
            <template #default="{ row }">{{ formatCurrency(row.revenueContribution) }}</template>
          </ElTableColumn>

          <ElTableColumn label="成長率" min-width="100" align="right">
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

          <ElTableColumn label="分潤占營收比" min-width="130" align="right">
            <template #default="{ row }">
              <span :class="row.settlementRatio >= 25 ? 'text-rose-600 font-medium' : ''">{{
                formatPercent(row.settlementRatio)
              }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="風險狀態" min-width="120">
            <template #default="{ row }">
              <ElTag :type="row.isHighRisk ? 'danger' : 'success'" size="small" effect="light">
                {{ row.riskStatus }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="最近互動" min-width="140">
            <template #default="{ row }">{{ formatDateTime(row.lastInteractionAt) }}</template>
          </ElTableColumn>

          <ElTableColumn label="風險訊號" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
              <span :class="row.riskSignals?.length ? 'text-rose-600 font-medium' : 'text-slate-500'">
                {{ riskSummary(row) }}
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
