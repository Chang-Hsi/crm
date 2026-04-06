import { computed, reactive } from "vue";
import {
  accountOptions,
  activityDirectory,
  issueList,
  issuePriorityMap,
  issueSeverityMap,
  issueStatusMap,
  issueTypeMap,
  opportunityOptions,
  partnerDirectory,
  projectOptions,
  supportTicketOptions,
  userList,
} from "../data/issues";

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
const activityById = new Map(activityDirectory.map((item) => [item.id, item]));
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

  if (record.activityName) {
    parts.push(`活動：${record.activityName}`);
  }

  if (record.partnerName) {
    parts.push(`夥伴：${record.partnerName}`);
  }

  if (record.supportTicketTitle) {
    parts.push(`支援：${record.supportTicketTitle}`);
  }

  return parts.slice(0, 3).join(" / ") || "-";
}

function normalizeTimelineEntry(item) {
  return {
    id: item.id || `issue-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    occurredAt: item.occurredAt || nowTimestamp(),
    title: item.title || "更新",
    description: item.description || "",
    actorName: item.actorName || "系統管理員",
  };
}

function isClosedStatus(status) {
  return ["resolved", "cancelled"].includes(status);
}

function normalizeRecord(record) {
  const next = {
    tags: [],
    attachments: [],
    timeline: [],
    ...record,
  };

  next.ownerName = resolveUserName(next.ownerId, next.ownerName || "未指派");

  next.customerName = accountById.get(next.customerId)?.name || next.customerName || "";
  next.opportunityName =
    opportunityById.get(next.opportunityId)?.name || next.opportunityName || "";
  next.projectName = projectById.get(next.projectId)?.name || next.projectName || "";
  next.activityName = activityById.get(next.activityId)?.name || next.activityName || "";
  next.partnerName = partnerById.get(next.partnerId)?.name || next.partnerName || "";
  next.supportTicketTitle =
    supportTicketById.get(next.supportTicketId)?.title || next.supportTicketTitle || "";

  next.relatedSummary = resolveRelatedSummary(next);
  next.isImportant = Boolean(next.isImportant);
  next.isOverdue =
    !isClosedStatus(next.status) &&
    Boolean(next.dueAt) &&
    toTimestamp(next.dueAt) < toTimestamp(todayDate());

  next.timeline = (next.timeline || []).map((item) => normalizeTimelineEntry(item));

  return next;
}

function appendTimeline(record, title, description = "", actorName = "系統管理員") {
  const line = normalizeTimelineEntry({ title, description, actorName, occurredAt: nowTimestamp() });
  record.timeline = [line, ...(record.timeline || [])];
}

const state = reactive({
  records: cloneRecords(issueList).map((item) => normalizeRecord(item)),
});

function listIssues() {
  return state.records.map((item) => normalizeRecord(item));
}

function getById(id) {
  const record = state.records.find((item) => item.id === id);
  return record ? normalizeRecord(record) : null;
}

function getNextNo() {
  const maxValue = state.records.reduce((result, item) => {
    const numeric = Number(String(item.issueNo || "").replace("ISS-2026-", ""));
    return Number.isNaN(numeric) ? result : Math.max(result, numeric);
  }, 0);

  return `ISS-2026-${String(maxValue + 1).padStart(3, "0")}`;
}

function createIssue(payload, actorName = "系統管理員") {
  const now = nowTimestamp();
  const record = normalizeRecord({
    id: `issue-${Date.now()}`,
    issueNo: payload.issueNo || getNextNo(),
    title: payload.title || "未命名 Issue",
    issueType: payload.issueType || "other",
    status: payload.status || "open",
    priority: payload.priority || "medium",
    severity: payload.severity || "medium",
    customerId: payload.customerId || "",
    opportunityId: payload.opportunityId || "",
    projectId: payload.projectId || "",
    activityId: payload.activityId || "",
    partnerId: payload.partnerId || "",
    supportTicketId: payload.supportTicketId || "",
    ownerId: payload.ownerId || "u-001",
    teamName: payload.teamName || "",
    reportedAt: payload.reportedAt || todayDate(),
    expectedReplyAt: payload.expectedReplyAt || "",
    dueAt: payload.dueAt || "",
    actualCompletedAt: payload.actualCompletedAt || "",
    summary: payload.summary || "",
    description: payload.description || "",
    impactScope: payload.impactScope || "",
    temporaryAction: payload.temporaryAction || "",
    resolutionNote: payload.resolutionNote || "",
    followUpNote: payload.followUpNote || "",
    closingNote: payload.closingNote || "",
    tags: payload.tags || [],
    attachments: payload.attachments || [],
    notes: payload.notes || "",
    isImportant: Boolean(payload.isImportant),
    createdAt: now,
    createdBy: actorName,
    updatedAt: now,
    updatedBy: actorName,
    timeline: [
      {
        id: `issue-log-${Date.now()}-create`,
        occurredAt: now,
        title: "建立 Issue",
        description: "由列表快捷建立",
        actorName,
      },
    ],
  });

  state.records.unshift(record);
  return record;
}

function updateIssue(id, payload, actorName = "系統管理員") {
  const target = state.records.find((item) => item.id === id);

  if (!target) {
    return null;
  }

  const previousStatus = target.status;
  const previousOwnerId = target.ownerId;

  Object.assign(target, normalizeRecord({ ...target, ...payload }));

  if (target.status === "resolved" && !target.actualCompletedAt) {
    target.actualCompletedAt = todayDate();
  }

  if (target.status !== "resolved" && previousStatus === "resolved") {
    target.actualCompletedAt = "";
  }

  target.updatedAt = nowTimestamp();
  target.updatedBy = actorName;

  const updates = [];

  if (previousStatus !== target.status) {
    updates.push(
      `狀態 ${issueStatusMap[previousStatus]?.label || previousStatus} -> ${issueStatusMap[target.status]?.label || target.status}`
    );
  }

  if (previousOwnerId !== target.ownerId) {
    updates.push(
      `負責人 ${resolveUserName(previousOwnerId, "未指派")} -> ${resolveUserName(target.ownerId, "未指派")}`
    );
  }

  appendTimeline(target, "更新 Issue", updates.join("；") || "更新內容與處理說明", actorName);

  return normalizeRecord(target);
}

function setIssueStatus(id, status, actorName = "系統管理員", reason = "") {
  const target = state.records.find((item) => item.id === id);

  if (!target || !issueStatusMap[status]) {
    return null;
  }

  target.status = status;

  if (status === "resolved") {
    target.actualCompletedAt = target.actualCompletedAt || todayDate();
  }

  target.updatedAt = nowTimestamp();
  target.updatedBy = actorName;

  appendTimeline(
    target,
    `狀態更新：${issueStatusMap[status].label}`,
    String(reason || "").trim(),
    actorName
  );

  return normalizeRecord(target);
}

function duplicateIssue(id, actorName = "系統管理員") {
  const source = getById(id);

  if (!source) {
    return null;
  }

  return createIssue(
    {
      ...source,
      issueNo: getNextNo(),
      title: `${source.title}（複製）`,
      status: "open",
      reportedAt: todayDate(),
      dueAt: "",
      expectedReplyAt: "",
      actualCompletedAt: "",
      closingNote: "",
      timeline: [],
    },
    actorName
  );
}

function batchSetStatus(ids, status, actorName = "系統管理員") {
  return ids.map((id) => setIssueStatus(id, status, actorName)).filter(Boolean);
}

function useIssuesStore() {
  return {
    issues: computed(() => listIssues()),
    getById,
    getNextNo,
    createIssue,
    updateIssue,
    setIssueStatus,
    duplicateIssue,
    batchSetStatus,
    issueStatusMap,
    issueTypeMap,
    issuePriorityMap,
    issueSeverityMap,
    toTimestamp,
  };
}

export { useIssuesStore };
