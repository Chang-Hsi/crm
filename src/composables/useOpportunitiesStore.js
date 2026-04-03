import { computed, reactive } from "vue";
import { opportunityList, stageProbabilityMap } from "../data/opportunities";
import { useAccountsStore } from "./useAccountsStore";
import { useUsersStore } from "./useUsersStore";

function cloneRecords(records) {
  if (typeof structuredClone === "function") {
    return structuredClone(records);
  }

  return JSON.parse(JSON.stringify(records));
}

function getCurrentTimestamp() {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function buildStageHistoryEntry({
  nextStage,
  previousStage = "",
  note = "",
  lostReason = "",
  changedByName = "系統",
  timestamp = getCurrentTimestamp(),
  isInitial = false,
}) {
  return {
    id: `osh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    stage: nextStage,
    previousStage,
    timestamp,
    changedByName,
    note,
    lostReason,
    title: isInitial
      ? "建立商機"
      : `階段調整為 ${nextStage}`,
    description: isInitial
      ? `商機建立時的初始階段為 ${nextStage}`
      : previousStage
      ? `由 ${previousStage} 調整為 ${nextStage}`
      : `調整為 ${nextStage}`,
  };
}

function resolveOpportunityStatus(stageValue) {
  if (stageValue === "won") {
    return "won";
  }

  if (stageValue === "lost") {
    return "lost";
  }

  return "active";
}

function resolveAccountMeta(accountId) {
  const account = getAccountById(accountId);

  return {
    accountName: account?.companyName ?? "-",
    region: account?.region ?? "",
    ownerUserId: account?.ownerUserId ?? "",
  };
}

const state = reactive({
  records: cloneRecords(opportunityList),
});

const { getUserName } = useUsersStore();
const { getAccountById } = useAccountsStore();

function buildAccountOpportunityRecord(record) {
  return {
    id: record.id,
    name: record.name,
    stage: record.stage,
    amount: record.expectedRevenue,
    expectedCloseDate: record.expectedCloseDate,
    ownerUserId: record.ownerUserId,
  };
}

function syncOpportunityToAccount(record) {
  const account = getAccountById(record.accountId);

  if (!account) {
    return;
  }

  const nextOpportunity = buildAccountOpportunityRecord(record);
  const targetIndex = (account.opportunities ?? []).findIndex((item) => item.id === record.id);

  if (targetIndex >= 0) {
    account.opportunities.splice(targetIndex, 1, nextOpportunity);
  } else {
    account.opportunities.unshift(nextOpportunity);
  }

  account.opportunityCount = account.opportunities.length;
  account.updatedAt = record.updatedAt;
}

function enrichOpportunity(record) {
  if (!record.createdAt) {
    record.createdAt = record.updatedAt;
  }

  if (!Array.isArray(record.stageHistory)) {
    record.stageHistory = [];
  }

  if (record.stageHistory.length === 0) {
    record.stageHistory = [
      buildStageHistoryEntry({
        nextStage: record.stage,
        timestamp: record.createdAt,
        isInitial: true,
      }),
    ];
  }

  Object.assign(record, resolveAccountMeta(record.accountId), {
    ownerName: getUserName(record.ownerUserId),
  });

  return record;
}

state.records.forEach((record) => {
  enrichOpportunity(record);
});

function listOpportunities() {
  return state.records;
}

function getOpportunityById(opportunityId) {
  return state.records.find((record) => record.id === opportunityId) ?? null;
}

function getOpportunitiesByAccountId(accountId) {
  return state.records.filter((record) => record.accountId === accountId);
}

function getNextOpportunityCode() {
  const maxNumber = state.records.reduce((currentMax, record) => {
    const numericPart = Number(record.opportunityCode.replace("OPP-", ""));
    return Number.isNaN(numericPart) ? currentMax : Math.max(currentMax, numericPart);
  }, 0);

  return `OPP-${String(maxNumber + 1).padStart(3, "0")}`;
}

function createOpportunity(payload) {
  const accountMeta = resolveAccountMeta(payload.accountId);
  const nextRecord = {
    id: `opp-${Date.now()}`,
    opportunityCode: getNextOpportunityCode(),
    accountId: payload.accountId,
    accountName: accountMeta.accountName,
    primaryContactId: payload.primaryContactId ?? "",
    productId: "",
    region: accountMeta.region,
    name: payload.name.trim(),
    opportunityType: payload.opportunityType,
    stage: payload.stage,
    probability: payload.probability ?? stageProbabilityMap[payload.stage] ?? 0,
    expectedRevenue: Number(payload.expectedRevenue ?? 0),
    expectedCloseDate: payload.expectedCloseDate,
    source: payload.source ?? "manual",
    ownerUserId: payload.ownerUserId || accountMeta.ownerUserId,
    status: resolveOpportunityStatus(payload.stage),
    lostReason: payload.stage === "lost" ? payload.lostReason?.trim() ?? "" : "",
    description: payload.description?.trim() ?? "",
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    stageHistory: [
      buildStageHistoryEntry({
        nextStage: payload.stage,
        isInitial: true,
      }),
    ],
  };

  const createdRecord = enrichOpportunity(nextRecord);
  state.records.unshift(createdRecord);
  syncOpportunityToAccount(createdRecord);
  return createdRecord;
}

function updateOpportunity(opportunityId, payload) {
  const targetRecord = getOpportunityById(opportunityId);

  if (!targetRecord) {
    return null;
  }

  const nextStage = payload.stage ?? targetRecord.stage;
  const previousStage = targetRecord.stage;
  Object.assign(targetRecord, {
    primaryContactId: payload.primaryContactId ?? targetRecord.primaryContactId,
    name: payload.name?.trim() ?? targetRecord.name,
    opportunityType: payload.opportunityType ?? targetRecord.opportunityType,
    source: payload.source ?? targetRecord.source,
    stage: nextStage,
    probability: Number(payload.probability ?? stageProbabilityMap[nextStage] ?? targetRecord.probability),
    expectedRevenue: Number(payload.expectedRevenue ?? targetRecord.expectedRevenue),
    expectedCloseDate: payload.expectedCloseDate ?? targetRecord.expectedCloseDate,
    ownerUserId: payload.ownerUserId ?? targetRecord.ownerUserId,
    status: resolveOpportunityStatus(nextStage),
    lostReason: nextStage === "lost" ? payload.lostReason?.trim() ?? targetRecord.lostReason : "",
    description: payload.description?.trim() ?? targetRecord.description,
    updatedAt: getCurrentTimestamp(),
  });

  if (nextStage !== previousStage) {
    targetRecord.stageHistory = [
      buildStageHistoryEntry({
        nextStage,
        previousStage,
        note: payload.description?.trim() ?? "",
        lostReason:
          nextStage === "lost"
            ? payload.lostReason?.trim() ?? targetRecord.lostReason
            : "",
      }),
      ...(targetRecord.stageHistory ?? []),
    ];
  }

  enrichOpportunity(targetRecord);
  syncOpportunityToAccount(targetRecord);

  return targetRecord;
}

function updateOpportunityStage(opportunityId, nextStage, lostReason = "", note = "") {
  const targetRecord = getOpportunityById(opportunityId);

  if (!targetRecord) {
    return null;
  }

  const previousStage = targetRecord.stage;
  targetRecord.stage = nextStage;
  targetRecord.status = resolveOpportunityStatus(nextStage);
  targetRecord.probability = stageProbabilityMap[nextStage] ?? targetRecord.probability;
  targetRecord.lostReason = nextStage === "lost" ? lostReason.trim() : "";
  targetRecord.updatedAt = getCurrentTimestamp();

  if (previousStage !== nextStage) {
    targetRecord.stageHistory = [
      buildStageHistoryEntry({
        nextStage,
        previousStage,
        note,
        lostReason: nextStage === "lost" ? lostReason.trim() : "",
      }),
      ...(targetRecord.stageHistory ?? []),
    ];
  }

  syncOpportunityToAccount(targetRecord);

  return targetRecord;
}

function updateOpportunityOwner(opportunityId, ownerUserId) {
  const targetRecord = getOpportunityById(opportunityId);

  if (!targetRecord) {
    return null;
  }

  targetRecord.ownerUserId = ownerUserId;
  targetRecord.updatedAt = getCurrentTimestamp();
  enrichOpportunity(targetRecord);
  syncOpportunityToAccount(targetRecord);

  return targetRecord;
}

function updateOpportunityOwners(opportunityIds, ownerUserId) {
  return opportunityIds
    .map((opportunityId) => updateOpportunityOwner(opportunityId, ownerUserId))
    .filter(Boolean);
}

function useOpportunitiesStore() {
  return {
    opportunities: computed(() => listOpportunities()),
    getOpportunityById,
    getOpportunitiesByAccountId,
    createOpportunity,
    updateOpportunity,
    updateOpportunityStage,
    updateOpportunityOwner,
    updateOpportunityOwners,
  };
}

export { useOpportunitiesStore };
