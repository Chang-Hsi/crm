import { computed, reactive } from "vue";
import {
  accountOptions,
  activityDirectory,
  meetingList,
  meetingStatusMap,
  meetingTypeMap,
  opportunityOptions,
  partnerDirectory,
  projectOptions,
  supportTicketOptions,
  userList,
} from "../data/meetings";

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

function buildMeetingDateTime(record) {
  if (!record.meetingDate) {
    return "-";
  }

  const start = record.startTime || "--:--";
  const end = record.endTime || "--:--";
  return `${record.meetingDate} ${start} - ${end}`;
}

function resolveRelatedSummary(record) {
  const parts = [];

  if (record.customerName) {
    parts.push(`客戶：${record.customerName}`);
  }

  if (record.projectName) {
    parts.push(`專案：${record.projectName}`);
  }

  if (record.opportunityName) {
    parts.push(`商機：${record.opportunityName}`);
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
    internalParticipants: [],
    externalParticipants: [],
    contacts: [],
    decisions: [],
    actionItems: [],
    tags: [],
    attachments: [],
    activities: [],
    ...record,
  };

  next.hostName = resolveUserName(next.hostId, next.hostName || "未指定");
  next.recorderName = resolveUserName(next.recorderId, next.recorderName || "未指定");

  next.internalParticipantNames = next.internalParticipants.map((id) =>
    resolveUserName(id, id)
  );
  next.participantCount =
    next.internalParticipants.length + next.externalParticipants.length;

  next.customerName = accountById.get(next.customerId)?.name || next.customerName || "";
  next.opportunityName =
    opportunityById.get(next.opportunityId)?.name || next.opportunityName || "";
  next.projectName = projectById.get(next.projectId)?.name || next.projectName || "";
  next.activityName = activityById.get(next.activityId)?.name || next.activityName || "";
  next.partnerName = partnerById.get(next.partnerId)?.name || next.partnerName || "";
  next.supportTicketTitle =
    supportTicketById.get(next.supportTicketId)?.title || next.supportTicketTitle || "";

  next.meetingDateTime = buildMeetingDateTime(next);
  next.relatedSummary = resolveRelatedSummary(next);

  next.decisionSummary = next.decisions[0]?.title || next.agendaSummary || "-";
  next.actionItems = next.actionItems.map((item) => normalizeActionItem(item));
  next.actionItemCount = next.actionItems.length;
  next.openActionItemCount = next.actionItems.filter((item) => item.isOpen).length;

  next.hasAttachments = next.attachments.length > 0;
  next.hasActionItems = next.actionItemCount > 0;

  return next;
}

function appendActivity(record, title, description = "", actorName = "系統管理員") {
  record.activities = [
    {
      id: `mtr-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      occurredAt: nowTimestamp(),
      title,
      description,
      actorName,
    },
    ...(record.activities || []),
  ];
}

const state = reactive({
  records: cloneRecords(meetingList).map((item) => normalizeRecord(item)),
});

function listMeetings() {
  return state.records.map((item) => normalizeRecord(item));
}

function getMeetingById(meetingId) {
  const record = state.records.find((item) => item.id === meetingId);
  return record ? normalizeRecord(record) : null;
}

function getNextMeetingNo() {
  const maxValue = state.records.reduce((result, item) => {
    const numeric = Number(String(item.meetingNo || "").replace("MTR-2026-", ""));
    return Number.isNaN(numeric) ? result : Math.max(result, numeric);
  }, 0);

  return `MTR-2026-${String(maxValue + 1).padStart(3, "0")}`;
}

function createMeeting(payload, actorName = "系統管理員") {
  const now = nowTimestamp();
  const record = normalizeRecord({
    id: `mtr-${Date.now()}`,
    meetingNo: payload.meetingNo || getNextMeetingNo(),
    title: payload.title || "未命名會議",
    meetingType: payload.meetingType || "internal_sync",
    status: payload.status || "draft",
    meetingDate: payload.meetingDate || todayDate(),
    startTime: payload.startTime || "09:00",
    endTime: payload.endTime || "10:00",
    format: payload.format || "online",
    location: payload.location || "",
    meetingLink: payload.meetingLink || "",
    hostId: payload.hostId || "u-001",
    recorderId: payload.recorderId || "u-001",
    internalParticipants: payload.internalParticipants || [],
    externalParticipants: payload.externalParticipants || [],
    contacts: payload.contacts || [],
    customerId: payload.customerId || "",
    opportunityId: payload.opportunityId || "",
    projectId: payload.projectId || "",
    activityId: payload.activityId || "",
    partnerId: payload.partnerId || "",
    supportTicketId: payload.supportTicketId || "",
    objective: payload.objective || "",
    agendaSummary: payload.agendaSummary || "",
    richContent: payload.richContent || "",
    decisions: payload.decisions || [],
    risks: payload.risks || "",
    actionItems: payload.actionItems || [],
    tags: payload.tags || [],
    attachments: payload.attachments || [],
    notes: payload.notes || "",
    isImportant: Boolean(payload.isImportant),
    isRecurring: Boolean(payload.isRecurring),
    createdAt: now,
    createdBy: actorName,
    updatedAt: now,
    updatedBy: actorName,
    activities: [
      {
        id: `mtr-log-${Date.now()}-create`,
        occurredAt: now,
        title: "建立會議紀錄",
        description: "新增會議紀錄主檔",
        actorName,
      },
    ],
  });

  state.records.unshift(record);
  return record;
}

function updateMeeting(meetingId, payload, actorName = "系統管理員") {
  const target = state.records.find((item) => item.id === meetingId);

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
      `狀態 ${meetingStatusMap[previousStatus]?.label || previousStatus} -> ${meetingStatusMap[target.status]?.label || target.status}`
    );
  }

  appendActivity(target, "更新會議紀錄", updates.join("；") || "更新基本資訊", actorName);
  return normalizeRecord(target);
}

function setMeetingStatus(meetingId, status, options = {}) {
  const target = state.records.find((item) => item.id === meetingId);

  if (!target || !meetingStatusMap[status]) {
    return null;
  }

  const actorName = options.actorName || "系統管理員";
  target.status = status;
  target.updatedAt = nowTimestamp();
  target.updatedBy = actorName;

  appendActivity(
    target,
    `狀態更新：${meetingStatusMap[status].label}`,
    String(options.reason || "").trim(),
    actorName
  );

  return normalizeRecord(target);
}

function archiveMeeting(meetingId, reason = "", actorName = "系統管理員") {
  return setMeetingStatus(meetingId, "archived", { reason, actorName });
}

function duplicateMeeting(meetingId, actorName = "系統管理員") {
  const source = getMeetingById(meetingId);

  if (!source) {
    return null;
  }

  return createMeeting(
    {
      ...source,
      meetingNo: getNextMeetingNo(),
      title: `${source.title}（複製）`,
      status: "draft",
      meetingDate: todayDate(),
      decisions: source.decisions.map((item, index) => ({
        id: `d-copy-${Date.now()}-${index + 1}`,
        title: item.title,
        description: item.description,
      })),
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

function removeMeeting(meetingId) {
  const index = state.records.findIndex((item) => item.id === meetingId);

  if (index < 0) {
    return false;
  }

  state.records.splice(index, 1);
  return true;
}

function batchSetStatus(meetingIds, status, options = {}) {
  return meetingIds
    .map((meetingId) => setMeetingStatus(meetingId, status, options))
    .filter(Boolean);
}

function useMeetingsStore() {
  return {
    meetings: computed(() => listMeetings()),
    getMeetingById,
    getNextMeetingNo,
    createMeeting,
    updateMeeting,
    setMeetingStatus,
    archiveMeeting,
    duplicateMeeting,
    removeMeeting,
    batchSetStatus,
    meetingTypeMap,
    toTimestamp,
  };
}

export { useMeetingsStore };
