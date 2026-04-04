import { computed, reactive } from "vue";
import { partnershipTermList } from "../data/partnershipTerms";

function cloneRecords(records) {
  if (typeof structuredClone === "function") {
    return structuredClone(records);
  }

  return JSON.parse(JSON.stringify(records));
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function nowTimestamp() {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function toDateValue(dateString) {
  if (!dateString) {
    return null;
  }

  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isExpired(record) {
  if (record.isLongTerm || !record.expiryDate) {
    return false;
  }

  const expiryDate = toDateValue(record.expiryDate);

  if (!expiryDate) {
    return false;
  }

  return expiryDate.getTime() < toDateValue(getTodayDate()).getTime();
}

function isEffectiveDateReached(record) {
  const effectiveDate = toDateValue(record.effectiveDate);

  if (!effectiveDate) {
    return false;
  }

  return effectiveDate.getTime() <= toDateValue(getTodayDate()).getTime();
}

function normalizeRecord(record) {
  return {
    attachments: [],
    history: [],
    ...record,
  };
}

const state = reactive({
  records: cloneRecords(partnershipTermList).map((item) => normalizeRecord(item)),
});

function listTerms() {
  refreshTermsStatus();
  return state.records;
}

function getTermById(termId) {
  refreshTermsStatus();
  return state.records.find((item) => item.id === termId) ?? null;
}

function getNextConditionNo() {
  const next = state.records.reduce((maxValue, item) => {
    const numberValue = Number(String(item.conditionNo ?? "").replace("TMS-", ""));
    return Number.isNaN(numberValue) ? maxValue : Math.max(maxValue, numberValue);
  }, 0);

  return `TMS-${String(next + 1).padStart(3, "0")}`;
}

function appendHistory(record, { title, description = "", actorName = "系統管理員" }) {
  record.history = [
    {
      id: `th-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      occurredAt: getTodayDate(),
      title,
      description,
      actorName,
    },
    ...(record.history ?? []),
  ];
}

function touchRecord(record, actorName = "系統管理員") {
  record.updatedAt = nowTimestamp();
  record.updatedBy = actorName;
}

function findPartnerLatestVersion(partnerId) {
  return state.records
    .filter((item) => item.partnerId === partnerId)
    .reduce((maxValue, item) => Math.max(maxValue, Number(item.version ?? 0)), 0);
}

function createTerm(payload, actorName = "系統管理員") {
  const nowDate = getTodayDate();
  const nextRecord = normalizeRecord({
    id: `term-${Date.now()}`,
    conditionNo: payload.conditionNo || getNextConditionNo(),
    version:
      payload.version ?? Math.max(1, findPartnerLatestVersion(payload.partnerId) + 1),
    ...payload,
    status: payload.status ?? "draft",
    isCurrentEffective: Boolean(payload.isCurrentEffective),
    createdAt: nowDate,
    createdBy: actorName,
    updatedAt: nowTimestamp(),
    updatedBy: actorName,
  });

  appendHistory(nextRecord, {
    title: "建立條件",
    description: `${nextRecord.conditionName} 已建立`,
    actorName,
  });

  state.records.unshift(nextRecord);

  if (nextRecord.isCurrentEffective) {
    setTermActive(nextRecord.id, actorName);
  }

  refreshTermsStatus();

  return nextRecord;
}

function updateTerm(termId, payload, actorName = "系統管理員") {
  const target = state.records.find((item) => item.id === termId);

  if (!target) {
    return null;
  }

  Object.assign(target, payload);
  touchRecord(target, actorName);
  appendHistory(target, {
    title: "更新條件",
    description: `${target.conditionName} 內容已更新`,
    actorName,
  });

  if (target.isCurrentEffective) {
    setTermActive(target.id, actorName);
  } else {
    refreshTermsStatus();
  }

  return target;
}

function setTermActive(termId, actorName = "系統管理員") {
  const target = state.records.find((item) => item.id === termId);

  if (!target) {
    return null;
  }

  state.records.forEach((item) => {
    if (item.id === target.id) {
      return;
    }

    if (item.partnerId === target.partnerId && item.isCurrentEffective) {
      item.isCurrentEffective = false;

      if (item.status === "active") {
        item.status = "superseded";
      }

      touchRecord(item, actorName);
      appendHistory(item, {
        title: "被新版取代",
        description: `${item.conditionName} 已非生效條件`,
        actorName,
      });
    }
  });

  target.isCurrentEffective = true;
  target.status = "active";
  touchRecord(target, actorName);
  appendHistory(target, {
    title: "設為生效",
    description: `${target.conditionName} 已設為目前生效`,
    actorName,
  });

  refreshTermsStatus();

  return target;
}

function deactivateTerm(termId, reason = "", actorName = "系統管理員") {
  const target = state.records.find((item) => item.id === termId);

  if (!target) {
    return null;
  }

  target.status = "inactive";
  target.isCurrentEffective = false;
  touchRecord(target, actorName);
  appendHistory(target, {
    title: "停用條件",
    description: reason ? `停用原因：${reason}` : "條件已停用",
    actorName,
  });

  refreshTermsStatus();

  return target;
}

function copyTermAsNewVersion(termId, actorName = "系統管理員") {
  const source = state.records.find((item) => item.id === termId);

  if (!source) {
    return null;
  }

  const nextVersion = findPartnerLatestVersion(source.partnerId) + 1;
  const nowDate = getTodayDate();

  const newRecord = normalizeRecord({
    ...cloneRecords([source])[0],
    id: `term-${Date.now()}`,
    conditionNo: getNextConditionNo(),
    conditionName: `${source.conditionName.split(" v")[0]} v${nextVersion}`,
    version: nextVersion,
    status: "draft",
    isCurrentEffective: false,
    createdAt: nowDate,
    createdBy: actorName,
    updatedAt: nowTimestamp(),
    updatedBy: actorName,
    history: [],
  });

  appendHistory(newRecord, {
    title: "複製新版本",
    description: `由 ${source.conditionNo} 複製建立`,
    actorName,
  });

  state.records.unshift(newRecord);

  return newRecord;
}

function refreshTermsStatus() {
  state.records.forEach((item) => {
    if (item.status === "draft" || item.status === "inactive" || item.status === "superseded") {
      return;
    }

    if (isExpired(item)) {
      item.status = "expired";
      item.isCurrentEffective = false;
      return;
    }

    if (isEffectiveDateReached(item)) {
      if (item.status === "pending_effective") {
        item.status = "active";
      }
      return;
    }

    if (item.status === "active") {
      item.status = "pending_effective";
      item.isCurrentEffective = false;
    }
  });
}

function usePartnershipTermsStore() {
  return {
    terms: computed(() => listTerms()),
    getTermById,
    createTerm,
    updateTerm,
    setTermActive,
    deactivateTerm,
    copyTermAsNewVersion,
    getNextConditionNo,
  };
}

export { usePartnershipTermsStore };
