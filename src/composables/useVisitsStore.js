import { computed, reactive } from "vue";
import {
  accountOptions,
  activityDirectory,
  opportunityOptions,
  partnerDirectory,
  projectOptions,
  supportTicketOptions,
  userList,
  visitList,
  visitStatusMap,
  visitTypeMap,
} from "../data/visits";

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

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

const userById = new Map(userList.map((item) => [item.id, item]));
const accountById = new Map(accountOptions.map((item) => [item.id, item]));
const opportunityById = new Map(opportunityOptions.map((item) => [item.id, item]));
const projectById = new Map(projectOptions.map((item) => [item.id, item]));
const activityById = new Map(activityDirectory.map((item) => [item.id, item]));
const partnerById = new Map(partnerDirectory.map((item) => [item.id, item]));
const supportTicketById = new Map(supportTicketOptions.map((item) => [item.id, item]));

function resolveUserName(userId, fallback = "-") {
  return userById.get(userId)?.name || fallback;
}

function toTimestamp(value) {
  if (!value) {
    return 0;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function buildVisitDateTime(record) {
  if (!record.visitDate) {
    return "-";
  }

  const start = record.startTime || "--:--";
  const end = record.endTime || "--:--";
  return `${record.visitDate} ${start} - ${end}`;
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

function normalizeActionItem(item) {
  const next = { ...item };
  next.ownerName = resolveUserName(next.ownerId, next.ownerName || "未指派");
  next.isOpen = ["pending", "in_progress"].includes(next.status);
  next.isConvertedTask = Boolean(next.isConvertedTask || next.taskNo);
  return next;
}

function normalizeRecord(record) {
  const next = {
    collaboratorIds: [],
    customerParticipants: [],
    partnerParticipants: [],
    contacts: [],
    actionItems: [],
    tags: [],
    attachments: [],
    activities: [],
    ...record,
  };

  next.ownerName = resolveUserName(next.ownerId, next.ownerName || "未指定");
  next.collaboratorNames = next.collaboratorIds.map((id) => resolveUserName(id, id));

  const attendeeSet = new Set([
    ...next.customerParticipants,
    ...next.partnerParticipants,
    ...next.contacts,
  ]);
  if (next.visitTarget) {
    attendeeSet.add(next.visitTarget);
  }
  next.participantCount = attendeeSet.size;

  next.customerName = accountById.get(next.customerId)?.name || next.customerName || "";
  next.opportunityName =
    opportunityById.get(next.opportunityId)?.name || next.opportunityName || "";
  next.projectName = projectById.get(next.projectId)?.name || next.projectName || "";
  next.activityName = activityById.get(next.activityId)?.name || next.activityName || "";
  next.partnerName = partnerById.get(next.partnerId)?.name || next.partnerName || "";
  next.supportTicketTitle =
    supportTicketById.get(next.supportTicketId)?.title || next.supportTicketTitle || "";

  next.visitDateTime = buildVisitDateTime(next);
  next.relatedSummary = resolveRelatedSummary(next);

  next.actionItems = next.actionItems.map((item) => normalizeActionItem(item));
  next.actionItemCount = next.actionItems.length;
  next.openActionItemCount = next.actionItems.filter((item) => item.isOpen).length;

  next.hasActionItems = next.actionItemCount > 0;
  next.hasAttachments = next.attachments.length > 0;

  return next;
}

function appendActivity(record, title, description = "", actorName = "系統管理員") {
  record.activities = [
    {
      id: `vtr-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      occurredAt: nowTimestamp(),
      title,
      description,
      actorName,
    },
    ...(record.activities || []),
  ];
}

const state = reactive({
  records: cloneRecords(visitList).map((item) => normalizeRecord(item)),
});

function listVisits() {
  return state.records.map((item) => normalizeRecord(item));
}

function getVisitById(visitId) {
  const record = state.records.find((item) => item.id === visitId);
  return record ? normalizeRecord(record) : null;
}

function getNextVisitNo() {
  const maxValue = state.records.reduce((result, item) => {
    const numeric = Number(String(item.visitNo || "").replace("VST-2026-", ""));
    return Number.isNaN(numeric) ? result : Math.max(result, numeric);
  }, 0);

  return `VST-2026-${String(maxValue + 1).padStart(3, "0")}`;
}

function createVisit(payload, actorName = "系統管理員") {
  const now = nowTimestamp();
  const record = normalizeRecord({
    id: `vtr-${Date.now()}`,
    visitNo: payload.visitNo || getNextVisitNo(),
    title: payload.title || "未命名拜訪",
    visitType: payload.visitType || "customer_visit",
    status: payload.status || "draft",
    visitDate: payload.visitDate || todayDate(),
    startTime: payload.startTime || "09:00",
    endTime: payload.endTime || "10:00",
    format: payload.format || "onsite",
    location: payload.location || "",
    address: payload.address || "",
    ownerId: payload.ownerId || "u-001",
    collaboratorIds: payload.collaboratorIds || [],
    visitTarget: payload.visitTarget || "",
    customerParticipants: payload.customerParticipants || [],
    partnerParticipants: payload.partnerParticipants || [],
    contacts: payload.contacts || [],
    customerId: payload.customerId || "",
    opportunityId: payload.opportunityId || "",
    projectId: payload.projectId || "",
    activityId: payload.activityId || "",
    partnerId: payload.partnerId || "",
    supportTicketId: payload.supportTicketId || "",
    relatedMeetingId: payload.relatedMeetingId || "",
    objective: payload.objective || "",
    summary: payload.summary || "",
    richContent: payload.richContent || "",
    observations: payload.observations || "",
    risks: payload.risks || "",
    conclusion: payload.conclusion || "",
    actionItems: payload.actionItems || [],
    tags: payload.tags || [],
    attachments: payload.attachments || [],
    notes: payload.notes || "",
    isImportant: Boolean(payload.isImportant),
    isFirstVisit: Boolean(payload.isFirstVisit),
    nextVisitSuggestedAt: payload.nextVisitSuggestedAt || "",
    createdAt: now,
    createdBy: actorName,
    updatedAt: now,
    updatedBy: actorName,
    activities: [
      {
        id: `vtr-log-${Date.now()}-create`,
        occurredAt: now,
        title: "建立拜訪紀錄",
        description: "新增拜訪紀錄主檔",
        actorName,
      },
    ],
  });

  state.records.unshift(record);
  return record;
}

function updateVisit(visitId, payload, actorName = "系統管理員") {
  const target = state.records.find((item) => item.id === visitId);

  if (!target) {
    return null;
  }

  const previousStatus = target.status;

  Object.assign(target, normalizeRecord({ ...target, ...payload }));
  target.updatedAt = nowTimestamp();
  target.updatedBy = actorName;

  const updates = [];

  if (previousStatus !== target.status) {
    updates.push(
      `狀態 ${visitStatusMap[previousStatus]?.label || previousStatus} -> ${visitStatusMap[target.status]?.label || target.status}`
    );
  }

  appendActivity(target, "更新拜訪紀錄", updates.join("；") || "更新基本資訊", actorName);
  return normalizeRecord(target);
}

function setVisitStatus(visitId, status, options = {}) {
  const target = state.records.find((item) => item.id === visitId);

  if (!target || !visitStatusMap[status]) {
    return null;
  }

  const actorName = options.actorName || "系統管理員";
  target.status = status;
  target.updatedAt = nowTimestamp();
  target.updatedBy = actorName;

  appendActivity(
    target,
    `狀態更新：${visitStatusMap[status].label}`,
    String(options.reason || "").trim(),
    actorName
  );

  return normalizeRecord(target);
}

function archiveVisit(visitId, reason = "", actorName = "系統管理員") {
  return setVisitStatus(visitId, "archived", { reason, actorName });
}

function duplicateVisit(visitId, actorName = "系統管理員") {
  const source = getVisitById(visitId);

  if (!source) {
    return null;
  }

  return createVisit(
    {
      ...source,
      visitNo: getNextVisitNo(),
      title: `${source.title}（複製）`,
      status: "draft",
      visitDate: todayDate(),
      actionItems: source.actionItems.map((item, index) => ({
        id: `a-copy-${Date.now()}-${index + 1}`,
        content: item.content,
        ownerId: item.ownerId,
        dueDate: item.dueDate,
        status: "pending",
        note: item.note,
        isConvertedTask: false,
        taskNo: "",
      })),
      activities: [],
    },
    actorName
  );
}

function removeVisit(visitId) {
  const index = state.records.findIndex((item) => item.id === visitId);

  if (index < 0) {
    return false;
  }

  state.records.splice(index, 1);
  return true;
}

function batchSetStatus(visitIds, status, options = {}) {
  return visitIds
    .map((visitId) => setVisitStatus(visitId, status, options))
    .filter(Boolean);
}

function useVisitsStore() {
  return {
    visits: computed(() => listVisits()),
    getVisitById,
    getNextVisitNo,
    createVisit,
    updateVisit,
    setVisitStatus,
    archiveVisit,
    duplicateVisit,
    removeVisit,
    batchSetStatus,
    visitTypeMap,
    toTimestamp,
  };
}

export { useVisitsStore };
