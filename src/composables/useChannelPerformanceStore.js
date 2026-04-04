import { computed, reactive } from "vue";
import { channelPerformanceRecords } from "../data/channelPerformance";

function cloneRecords(records) {
  if (typeof structuredClone === "function") {
    return structuredClone(records);
  }

  return JSON.parse(JSON.stringify(records));
}

function toDateValue(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateString(date) {
  if (!(date instanceof Date)) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function getMonthKey(value) {
  const date = toDateValue(value);

  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getStartOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getEndOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function getStartOfQuarter(date) {
  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3;
  return new Date(date.getFullYear(), quarterStartMonth, 1);
}

function getEndOfQuarter(date) {
  const start = getStartOfQuarter(date);
  return new Date(start.getFullYear(), start.getMonth() + 3, 0, 23, 59, 59, 999);
}

function getStartOfYear(date) {
  return new Date(date.getFullYear(), 0, 1);
}

function getEndOfYear(date) {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}

function resolveDateRangeByPreset(preset = "this_quarter", customRange = [], baseDate = new Date()) {
  const today = new Date(baseDate);
  today.setHours(0, 0, 0, 0);

  const [customStart, customEnd] = customRange;

  if (preset === "custom" && customStart && customEnd) {
    const start = toDateValue(customStart);
    const end = toDateValue(customEnd);

    if (start && end) {
      end.setHours(23, 59, 59, 999);
      return [start, end];
    }
  }

  if (preset === "this_month") {
    return [getStartOfMonth(today), getEndOfMonth(today)];
  }

  if (preset === "last_month") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return [start, getEndOfMonth(start)];
  }

  if (preset === "this_quarter") {
    return [getStartOfQuarter(today), getEndOfQuarter(today)];
  }

  if (preset === "last_quarter") {
    const start = getStartOfQuarter(today);
    start.setMonth(start.getMonth() - 3);
    return [start, getEndOfQuarter(start)];
  }

  if (preset === "last_30_days") {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return [start, new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)];
  }

  if (preset === "last_90_days") {
    const start = new Date(today);
    start.setDate(start.getDate() - 89);
    return [start, new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)];
  }

  if (preset === "this_year") {
    return [getStartOfYear(today), getEndOfYear(today)];
  }

  return [getStartOfQuarter(today), getEndOfQuarter(today)];
}

function getPreviousPeriodRange(startDate, endDate) {
  const duration = endDate.getTime() - startDate.getTime();
  const prevEnd = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
  const prevStart = new Date(prevEnd.getTime() - duration);
  prevEnd.setHours(23, 59, 59, 999);
  return [prevStart, prevEnd];
}

function getMonthCursor(startDate, endDate) {
  const result = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endCursor = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (cursor.getTime() <= endCursor.getTime()) {
    result.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return result;
}

function aggregateMonthlyPerformance(monthlyPerformance, startDate, endDate) {
  const startMonthTime = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    1
  ).getTime();
  const endMonthTime = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    1
  ).getTime();

  const validRecords = (monthlyPerformance ?? []).filter((item) => {
    const monthDate = toDateValue(item.month);

    if (!monthDate) {
      return false;
    }

    const monthTime = monthDate.getTime();
    return monthTime >= startMonthTime && monthTime <= endMonthTime;
  });

  return validRecords.reduce(
    (summary, item) => {
      summary.relatedCount += item.relatedCount ?? 0;
      summary.newCount += item.newCount ?? 0;
      summary.wonCount += item.wonCount ?? 0;
      summary.lostCount += item.lostCount ?? 0;
      summary.periodRevenue += item.periodRevenue ?? 0;
      summary.estimatedRevenue += item.estimatedRevenue ?? 0;
      summary.interactions += item.interactions ?? 0;
      return summary;
    },
    {
      relatedCount: 0,
      newCount: 0,
      wonCount: 0,
      lostCount: 0,
      periodRevenue: 0,
      estimatedRevenue: 0,
      interactions: 0,
    }
  );
}

function getRecentNewCount(record, endDate, dayWindow = 30) {
  const monthOffset = Math.max(1, Math.ceil(dayWindow / 30));
  const start = new Date(endDate.getFullYear(), endDate.getMonth() - (monthOffset - 1), 1);

  return (record.monthlyPerformance ?? [])
    .filter((item) => {
      const monthDate = toDateValue(item.month);
      return monthDate && monthDate.getTime() >= start.getTime() && monthDate.getTime() <= endDate.getTime();
    })
    .reduce((total, item) => total + (item.newCount ?? 0), 0);
}

function getDaysSinceDate(value, endDate = new Date()) {
  const date = toDateValue(value);

  if (!date) {
    return 999;
  }

  const target = new Date(endDate);
  target.setHours(0, 0, 0, 0);

  return Math.floor((target.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
}

function deriveActivityLevel(record, currentAggregate, endDate) {
  const daysSinceLastInteraction = getDaysSinceDate(record.lastInteractionAt, endDate);
  const recent30New = getRecentNewCount(record, endDate, 30);
  const recent60New = getRecentNewCount(record, endDate, 60);

  if (daysSinceLastInteraction <= 30 && recent30New > 0) {
    return "high";
  }

  if (daysSinceLastInteraction <= 60 || recent60New > 0 || currentAggregate.wonCount > 0) {
    return "medium";
  }

  if (daysSinceLastInteraction <= 90) {
    return "low";
  }

  return "dormant";
}

function deriveTrendStatus(currentAggregate, previousAggregate) {
  if (
    currentAggregate.relatedCount >= 6 &&
    currentAggregate.wonCount === 0 &&
    currentAggregate.interactions >= 4
  ) {
    return "abnormal";
  }

  if (previousAggregate.periodRevenue <= 0 && currentAggregate.periodRevenue > 0) {
    return "growing";
  }

  if (
    previousAggregate.periodRevenue > 0 &&
    currentAggregate.interactions >= previousAggregate.interactions * 1.3 &&
    currentAggregate.periodRevenue <= previousAggregate.periodRevenue * 0.4
  ) {
    return "abnormal";
  }

  const denominator = previousAggregate.periodRevenue <= 0 ? 1 : previousAggregate.periodRevenue;
  const changeRatio = (currentAggregate.periodRevenue - previousAggregate.periodRevenue) / denominator;

  if (Math.abs(changeRatio) <= 0.08) {
    return "flat";
  }

  if (changeRatio > 0.08) {
    return "growing";
  }

  return "declining";
}

function toPercent(numerator, denominator) {
  if (!denominator) {
    return 0;
  }

  return (numerator / denominator) * 100;
}

function normalizeOpportunity(opportunity) {
  return {
    ...opportunity,
    amount: opportunity.amount ?? 0,
  };
}

const state = reactive({
  records: cloneRecords(channelPerformanceRecords).map((item) => ({
    ...item,
    relatedOpportunities: (item.relatedOpportunities ?? []).map((opp) =>
      normalizeOpportunity(opp)
    ),
  })),
});

function getAllRecords() {
  return state.records;
}

function getPartnerById(partnerId) {
  return state.records.find((item) => item.partnerId === partnerId) ?? null;
}

function buildOverviewRecord(record, startDate, endDate) {
  const currentAggregate = aggregateMonthlyPerformance(
    record.monthlyPerformance,
    startDate,
    endDate
  );

  const [prevStart, prevEnd] = getPreviousPeriodRange(startDate, endDate);
  const previousAggregate = aggregateMonthlyPerformance(
    record.monthlyPerformance,
    prevStart,
    prevEnd
  );

  const conversionRate = toPercent(
    currentAggregate.wonCount,
    currentAggregate.relatedCount
  );
  const averageDealSize = currentAggregate.wonCount
    ? currentAggregate.periodRevenue / currentAggregate.wonCount
    : 0;

  const activityLevel = deriveActivityLevel(record, currentAggregate, endDate);
  const trendStatus = deriveTrendStatus(currentAggregate, previousAggregate);

  return {
    ...record,
    relatedOpportunityCount: currentAggregate.relatedCount,
    newOpportunityCount: currentAggregate.newCount,
    wonOpportunityCount: currentAggregate.wonCount,
    lostOpportunityCount: currentAggregate.lostCount,
    conversionRate,
    periodRevenue: currentAggregate.periodRevenue,
    estimatedRevenue: currentAggregate.estimatedRevenue,
    totalRevenue: (record.baselineTotalRevenue ?? 0) + currentAggregate.periodRevenue,
    averageDealSize,
    interactionCount: currentAggregate.interactions,
    activityLevel,
    trendStatus,
    currentAggregate,
    previousAggregate,
  };
}

function listOverviewRecords(range) {
  const [startDate, endDate] = range;
  return state.records.map((record) => buildOverviewRecord(record, startDate, endDate));
}

function getMonthlySeries(record, startDate, endDate) {
  const monthCursor = getMonthCursor(startDate, endDate);
  const monthlyMap = new Map((record.monthlyPerformance ?? []).map((item) => [getMonthKey(item.month), item]));

  return monthCursor.map((monthDate) => {
    const key = getMonthKey(monthDate);
    const monthlyData = monthlyMap.get(key) ?? {
      relatedCount: 0,
      newCount: 0,
      wonCount: 0,
      lostCount: 0,
      periodRevenue: 0,
      estimatedRevenue: 0,
      interactions: 0,
    };

    const conversionRate = toPercent(monthlyData.wonCount ?? 0, monthlyData.relatedCount ?? 0);

    return {
      month: key,
      label: `${monthDate.getFullYear()}/${String(monthDate.getMonth() + 1).padStart(2, "0")}`,
      relatedCount: monthlyData.relatedCount ?? 0,
      newCount: monthlyData.newCount ?? 0,
      wonCount: monthlyData.wonCount ?? 0,
      lostCount: monthlyData.lostCount ?? 0,
      periodRevenue: monthlyData.periodRevenue ?? 0,
      estimatedRevenue: monthlyData.estimatedRevenue ?? 0,
      interactions: monthlyData.interactions ?? 0,
      conversionRate,
    };
  });
}

function isDateWithinRange(value, startDate, endDate) {
  const date = toDateValue(value);

  if (!date) {
    return false;
  }

  return date.getTime() >= startDate.getTime() && date.getTime() <= endDate.getTime();
}

function aggregateBy(list, keyField, valueField = "amount") {
  const summary = new Map();

  list.forEach((item) => {
    const key = item[keyField] || "未分類";
    const nextValue = valueField === "count" ? 1 : item[valueField] ?? 0;
    summary.set(key, (summary.get(key) ?? 0) + nextValue);
  });

  return [...summary.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value);
}

function buildDynamicInsights(record, overview) {
  const insightSet = new Set(record.insights ?? []);

  if (record.isKeyPartner) {
    insightSet.add("高價值夥伴");
  }

  if (overview.trendStatus === "growing") {
    insightSet.add("成長中夥伴");
  }

  if (overview.conversionRate >= 35) {
    insightSet.add("高轉換夥伴");
  }

  if (overview.activityLevel === "high" && overview.conversionRate < 18) {
    insightSet.add("高活躍低轉換");
  }

  return [...insightSet];
}

function buildDynamicWarnings(record, overview) {
  const warningSet = new Set(record.warnings ?? []);

  if (overview.activityLevel === "dormant") {
    warningSet.add("沉睡夥伴");
  }

  if (overview.trendStatus === "declining") {
    warningSet.add("績效下滑，建議檢視合作策略");
  }

  if (overview.conversionRate < 12 && overview.relatedOpportunityCount >= 6) {
    warningSet.add("待輔導夥伴");
  }

  if (overview.trendStatus === "abnormal") {
    warningSet.add("高風險夥伴");
  }

  return [...warningSet];
}

function getPartnerDetail(partnerId, range) {
  const target = getPartnerById(partnerId);

  if (!target) {
    return null;
  }

  const [startDate, endDate] = range;
  const overview = buildOverviewRecord(target, startDate, endDate);
  const monthlySeries = getMonthlySeries(target, startDate, endDate);

  const opportunitiesInRange = target.relatedOpportunities.filter(
    (item) =>
      isDateWithinRange(item.createdAt, startDate, endDate) ||
      isDateWithinRange(item.expectedCloseDate, startDate, endDate)
  );

  const opportunities = opportunitiesInRange.length > 0 ? opportunitiesInRange : target.relatedOpportunities;

  const productBreakdown = aggregateBy(opportunities, "product");
  const marketBreakdown = aggregateBy(opportunities, "market");
  const statusBreakdown = aggregateBy(opportunities, "status", "count");

  return {
    ...overview,
    analysisPeriod: {
      startDate: toDateString(startDate),
      endDate: toDateString(endDate),
    },
    monthlySeries,
    productBreakdown,
    marketBreakdown,
    statusBreakdown,
    relatedOpportunities: opportunities,
    insights: buildDynamicInsights(target, overview),
    warnings: buildDynamicWarnings(target, overview),
  };
}

function listPartnerOptions() {
  return state.records.map((item) => ({
    label: item.partnerName,
    value: item.partnerId,
  }));
}

function useChannelPerformanceStore() {
  return {
    records: computed(() => getAllRecords()),
    getPartnerById,
    listPartnerOptions,
    listOverviewRecords,
    getPartnerDetail,
    resolveDateRangeByPreset,
  };
}

export { useChannelPerformanceStore };
