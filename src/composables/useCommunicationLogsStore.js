import { computed, reactive } from "vue";
import {
  accountOptions,
  communicationList,
  interactionStatusMap,
  interactionTypeMap,
  opportunityOptions,
  partnerDirectory,
  projectOptions,
  supportTicketOptions,
  userList,
} from "../data/communications";

function cloneRecords(records) {
  if (typeof structuredClone === "function") {
    return structuredClone(records);
  }

  return JSON.parse(JSON.stringify(records));
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

function toTimestamp(value) {
  if (!value) {
    return 0;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

const userById = new Map(userList.map((item) => [item.id, item]));
const accountById = new Map(accountOptions.map((item) => [item.id, item]));
const opportunityById = new Map(opportunityOptions.map((item) => [item.id, item]));
const projectById = new Map(projectOptions.map((item) => [item.id, item]));
const partnerById = new Map(partnerDirectory.map((item) => [item.id, item]));
const supportTicketById = new Map(supportTicketOptions.map((item) => [item.id, item]));

function resolveUserName(userId, fallback = "-") {
  return userById.get(userId)?.name || fallback;
}

function resolveRelatedSummary(record) {
  const parts = [];

  if (record.customerName) {
    parts.push(`客戶：${record.customerName}`);
  }

  if (record.opportunityName) {
    parts.push(`商機：${record.opportunityName}`);
  }

  if (record.projectName) {
    parts.push(`專案：${record.projectName}`);
  }

  if (record.partnerName) {
    parts.push(`夥伴：${record.partnerName}`);
  }

  if (record.supportTicketTitle) {
    parts.push(`案件：${record.supportTicketTitle}`);
  }

  return parts.slice(0, 3).join(" / ") || "-";
}

function normalizeRecord(record) {
  const next = {
    tags: [],
    attachments: [],
    ...record,
  };

  next.ownerName = resolveUserName(next.ownerId, next.ownerName || "未指定");
  next.customerName = accountById.get(next.customerId)?.name || next.customerName || "";
  next.opportunityName =
    opportunityById.get(next.opportunityId)?.name || next.opportunityName || "";
  next.projectName = projectById.get(next.projectId)?.name || next.projectName || "";
  next.partnerName = partnerById.get(next.partnerId)?.name || next.partnerName || "";
  next.supportTicketTitle =
    supportTicketById.get(next.supportTicketId)?.title || next.supportTicketTitle || "";

  next.relatedSummary = resolveRelatedSummary(next);
  next.followUpRequired = Boolean(next.followUpRequired);
  next.isOverdueFollowUp =
    next.followUpRequired &&
    next.followUpAt &&
    toTimestamp(next.followUpAt) < toTimestamp(new Date().toISOString().slice(0, 10));

  return next;
}

const state = reactive({
  records: cloneRecords(communicationList).map((item) => normalizeRecord(item)),
});

function listRecords() {
  return state.records.map((item) => normalizeRecord(item));
}

function getById(id) {
  const record = state.records.find((item) => item.id === id);
  return record ? normalizeRecord(record) : null;
}

function getNextNo() {
  const maxValue = state.records.reduce((result, item) => {
    const numeric = Number(String(item.interactionNo || "").replace("COM-2026-", ""));
    return Number.isNaN(numeric) ? result : Math.max(result, numeric);
  }, 0);

  return `COM-2026-${String(maxValue + 1).padStart(3, "0")}`;
}

function createRecord(payload, actorName = "系統管理員") {
  const now = nowTimestamp();
  const record = normalizeRecord({
    id: `com-${Date.now()}`,
    interactionNo: payload.interactionNo || getNextNo(),
    title: payload.title || "未命名互動",
    interactionType: payload.interactionType || "email",
    status: payload.status || "logged",
    contactName: payload.contactName || "",
    contactEmail: payload.contactEmail || "",
    contactPhone: payload.contactPhone || "",
    companyName: payload.companyName || "",
    customerId: payload.customerId || "",
    opportunityId: payload.opportunityId || "",
    projectId: payload.projectId || "",
    partnerId: payload.partnerId || "",
    supportTicketId: payload.supportTicketId || "",
    ownerId: payload.ownerId || "u-001",
    interactedAt: payload.interactedAt || now,
    durationMinutes: Number(payload.durationMinutes || 0),
    summary: payload.summary || "",
    result: payload.result || "",
    followUpRequired: Boolean(payload.followUpRequired),
    followUpAt: payload.followUpAt || "",
    followUpNote: payload.followUpNote || "",
    tags: payload.tags || [],
    attachments: payload.attachments || [],
    notes: payload.notes || "",
    isImportant: Boolean(payload.isImportant),
    createdAt: now,
    createdBy: actorName,
    updatedAt: now,
    updatedBy: actorName,
  });

  state.records.unshift(record);
  return record;
}

function updateRecord(id, payload, actorName = "系統管理員") {
  const target = state.records.find((item) => item.id === id);
  if (!target) {
    return null;
  }

  Object.assign(target, normalizeRecord({ ...target, ...payload }));
  target.updatedAt = nowTimestamp();
  target.updatedBy = actorName;

  return normalizeRecord(target);
}

function setStatus(id, status, actorName = "系統管理員") {
  const target = state.records.find((item) => item.id === id);
  if (!target || !interactionStatusMap[status]) {
    return null;
  }

  target.status = status;
  target.updatedAt = nowTimestamp();
  target.updatedBy = actorName;
  return normalizeRecord(target);
}

function archiveRecord(id, actorName = "系統管理員") {
  return setStatus(id, "archived", actorName);
}

function duplicateRecord(id, actorName = "系統管理員") {
  const source = getById(id);
  if (!source) {
    return null;
  }

  return createRecord(
    {
      ...source,
      interactionNo: getNextNo(),
      title: `${source.title}（複製）`,
      status: source.followUpRequired ? "pending_follow_up" : "logged",
      interactedAt: nowTimestamp(),
    },
    actorName
  );
}

function batchSetStatus(ids, status, actorName = "系統管理員") {
  return ids.map((id) => setStatus(id, status, actorName)).filter(Boolean);
}

function useCommunicationLogsStore() {
  return {
    records: computed(() => listRecords()),
    getById,
    getNextNo,
    createRecord,
    updateRecord,
    setStatus,
    archiveRecord,
    duplicateRecord,
    batchSetStatus,
    interactionTypeMap,
    interactionStatusMap,
    toTimestamp,
  };
}

export { useCommunicationLogsStore };
