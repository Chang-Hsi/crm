import { computed, reactive } from "vue";
import {
  activityOptions,
  completionModeMap,
  milestoneList,
  milestoneStatusMap,
  milestoneTemplateList,
  milestoneTypeMap,
  projectOptions,
  riskLevelMap,
  userList,
} from "../data/milestones";
import { useTasksStore } from "./useTasksStore";

function cloneRecords(records) {
  if (typeof structuredClone === "function") {
    return structuredClone(records);
  }

  return JSON.parse(JSON.stringify(records));
}

function todayDate() {
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

function addDays(dateValue, offsetDays) {
  const base = new Date(dateValue || todayDate());
  base.setDate(base.getDate() + Number(offsetDays || 0));
  return base.toISOString().slice(0, 10);
}

function toTimestamp(value) {
  if (!value) {
    return 0;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

const userById = new Map(userList.map((item) => [item.id, item]));
const projectById = new Map(projectOptions.map((item) => [item.id, item]));
const activityById = new Map(activityOptions.map((item) => [item.id, item]));
const templateById = new Map(milestoneTemplateList.map((item) => [item.id, item]));

function resolveUserName(userId, fallback = "未指派") {
  return userById.get(userId)?.name ?? fallback;
}

function resolveRiskLevel(record) {
  if (record.status === "delayed") {
    return "high";
  }

  if (record.isOverdue) {
    return record.progress < 60 ? "high" : "medium";
  }

  if (record.completionMode === "task_driven" && record.linkedTaskCount > 0) {
    const ratio = record.completedTaskCount / record.linkedTaskCount;

    if (ratio < 0.4 && ["in_progress", "pending_acceptance"].includes(record.status)) {
      return "high";
    }

    if (ratio < 0.7 && ["in_progress", "pending_acceptance"].includes(record.status)) {
      return "medium";
    }
  }

  return record.riskLevel || "low";
}

function createActivity(title, description = "", actorName = "系統管理員") {
  return {
    id: `ms-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    occurredAt: nowTimestamp(),
    title,
    description,
    actorName,
  };
}

const { tasks } = useTasksStore();

function getLinkedTasks(record) {
  const taskIds = record.linkedTaskIds ?? [];

  if (taskIds.length > 0) {
    return tasks.value.filter((task) => taskIds.includes(task.id));
  }

  return tasks.value.filter((task) => task.milestoneId === record.id);
}

function normalizeRecord(record) {
  const next = {
    participantIds: [],
    linkedTaskIds: [],
    attachments: [],
    tags: [],
    activities: [],
    ...record,
  };

  next.projectName = projectById.get(next.projectId)?.name || next.projectName || "";
  next.activityName = activityById.get(next.activityId)?.name || next.activityName || "";
  next.ownerName = resolveUserName(next.ownerId, next.ownerName || "未指派");
  next.participantNames = next.participantIds.map((item) => resolveUserName(item, item));

  const linkedTasks = getLinkedTasks(next);
  const completedTasks = linkedTasks.filter((item) => item.status === "completed");
  next.linkedTaskCount = linkedTasks.length;
  next.completedTaskCount = completedTasks.length;

  if (linkedTasks.length > 0) {
    next.progress = Math.round((completedTasks.length / linkedTasks.length) * 100);
  } else {
    next.progress = Math.min(100, Math.max(0, Number(next.progress ?? 0)));
  }

  next.isOverdue =
    !["completed", "cancelled"].includes(next.status) &&
    toTimestamp(next.plannedEndDate) > 0 &&
    toTimestamp(next.plannedEndDate) < Date.now();

  next.delayDays =
    next.isOverdue && toTimestamp(next.plannedEndDate) > 0
      ? Math.ceil((Date.now() - toTimestamp(next.plannedEndDate)) / (24 * 60 * 60 * 1000))
      : 0;

  next.canAutoComplete =
    next.completionMode === "task_driven" &&
    next.linkedTaskCount > 0 &&
    next.completedTaskCount === next.linkedTaskCount &&
    !["completed", "cancelled"].includes(next.status);

  next.riskLevel = resolveRiskLevel(next);
  return next;
}

const state = reactive({
  records: cloneRecords(milestoneList).map((item) => normalizeRecord(item)),
  templates: cloneRecords(milestoneTemplateList),
});

function listMilestones() {
  return state.records.map((item) => normalizeRecord(item));
}

function getMilestoneById(milestoneId) {
  const target = state.records.find((item) => item.id === milestoneId);
  return target ? normalizeRecord(target) : null;
}

function getNextMilestoneNo() {
  const maxValue = state.records.reduce((result, item) => {
    const numeric = Number(String(item.milestoneNo || "").replace("MS-2026-", ""));
    return Number.isNaN(numeric) ? result : Math.max(result, numeric);
  }, 0);

  return `MS-2026-${String(maxValue + 1).padStart(4, "0")}`;
}

function createMilestone(payload, actorName = "系統管理員") {
  const record = normalizeRecord({
    id: `ms-${Date.now()}`,
    milestoneNo: payload.milestoneNo || getNextMilestoneNo(),
    milestoneName: payload.milestoneName,
    milestoneType: payload.milestoneType || "execution",
    status: payload.status || "not_started",
    order: Number(payload.order ?? 1),
    projectId: payload.projectId || "",
    activityId: payload.activityId || "",
    parentMilestoneId: payload.parentMilestoneId || "",
    ownerId: payload.ownerId || "u-001",
    participantIds: payload.participantIds || [],
    plannedStartDate: payload.plannedStartDate || todayDate(),
    plannedEndDate: payload.plannedEndDate || todayDate(),
    actualCompletedAt: payload.actualCompletedAt || "",
    completionMode: payload.completionMode || "manual",
    completionCriteria: payload.completionCriteria || "",
    acceptanceCriteria: payload.acceptanceCriteria || "",
    autoRuleSummary: payload.autoRuleSummary || "",
    linkedTaskIds: payload.linkedTaskIds || [],
    notes: payload.notes || "",
    attachments: payload.attachments || [],
    tags: payload.tags || [],
    delayReason: "",
    completionNote: "",
    createdAt: nowTimestamp(),
    createdBy: actorName,
    updatedAt: nowTimestamp(),
    updatedBy: actorName,
    activities: [createActivity("建立里程碑", "新增里程碑完成", actorName)],
  });

  state.records.unshift(record);
  return record;
}

function updateMilestone(milestoneId, payload, actorName = "系統管理員") {
  const target = state.records.find((item) => item.id === milestoneId);

  if (!target) {
    return null;
  }

  const previousStatus = target.status;
  const previousDate = target.plannedEndDate;

  Object.assign(target, normalizeRecord({ ...target, ...payload }));
  target.updatedAt = nowTimestamp();
  target.updatedBy = actorName;

  const updates = [];

  if (previousStatus !== target.status) {
    updates.push(`狀態 ${milestoneStatusMap[previousStatus]?.label || previousStatus} -> ${milestoneStatusMap[target.status]?.label || target.status}`);
  }

  if (previousDate !== target.plannedEndDate) {
    updates.push(`截止日 ${previousDate || "-"} -> ${target.plannedEndDate || "-"}`);
  }

  target.activities = [
    createActivity("更新里程碑", updates.join("；") || "更新資料", actorName),
    ...(target.activities || []),
  ];

  return normalizeRecord(target);
}

function setMilestoneStatus(milestoneId, status, options = {}) {
  const target = state.records.find((item) => item.id === milestoneId);

  if (!target || !milestoneStatusMap[status]) {
    return null;
  }

  const actorName = options.actorName || "系統管理員";
  const reason = String(options.reason || "").trim();

  target.status = status;

  if (status === "completed") {
    target.actualCompletedAt = target.actualCompletedAt || todayDate();
    target.progress = 100;
    target.completionNote = reason || target.completionNote;
  }

  if (status === "delayed") {
    target.delayReason = reason || target.delayReason || "時程延後";
  }

  if (status === "cancelled") {
    target.actualCompletedAt = "";
  }

  target.updatedAt = nowTimestamp();
  target.updatedBy = actorName;
  target.activities = [
    createActivity(`狀態更新：${milestoneStatusMap[status].label}`, reason, actorName),
    ...(target.activities || []),
  ];

  return normalizeRecord(target);
}

function delayMilestone(milestoneId, nextDate, reason = "", actorName = "系統管理員") {
  const target = state.records.find((item) => item.id === milestoneId);

  if (!target || !nextDate) {
    return null;
  }

  const previousDate = target.plannedEndDate;
  target.plannedEndDate = nextDate;
  target.status = "delayed";
  target.delayReason = reason || target.delayReason || "時程延後";
  target.updatedAt = nowTimestamp();
  target.updatedBy = actorName;
  target.activities = [
    createActivity("調整截止日", `${previousDate || "-"} -> ${nextDate}；${target.delayReason}`, actorName),
    ...(target.activities || []),
  ];

  return normalizeRecord(target);
}

function completeMilestone(milestoneId, note = "", actorName = "系統管理員") {
  return setMilestoneStatus(milestoneId, "completed", {
    actorName,
    reason: note || "里程碑已完成",
  });
}

function applyMilestoneTemplate(templateId, payload = {}, actorName = "系統管理員") {
  const template = templateById.get(templateId);

  if (!template) {
    return [];
  }

  const startDate = payload.plannedStartDate || todayDate();

  return template.items.map((item, index) =>
    createMilestone(
      {
        milestoneName: item.name,
        milestoneType: item.type,
        status: "not_started",
        order: Number(payload.baseOrder ?? 1) + index,
        projectId: payload.projectId || "",
        activityId: payload.activityId || "",
        ownerId: payload.ownerId || "u-001",
        participantIds: payload.participantIds || [],
        plannedStartDate: addDays(startDate, index),
        plannedEndDate: addDays(startDate, item.dueOffsetDays || 0),
        completionMode: item.completionMode || "manual",
        completionCriteria: `由模板「${template.name}」建立`,
        acceptanceCriteria: payload.acceptanceCriteria || "",
        autoRuleSummary: item.completionMode === "task_driven" ? "關聯任務完成後可自動完成" : "",
      },
      actorName
    )
  );
}

const projectMilestoneSummary = computed(() => {
  return projectOptions.map((project) => {
    const related = listMilestones().filter((item) => item.projectId === project.id);
    const completed = related.filter((item) => item.status === "completed").length;
    const delayed = related.filter((item) => item.status === "delayed").length;

    return {
      projectId: project.id,
      projectName: project.name,
      total: related.length,
      completed,
      delayed,
      progress: related.length === 0 ? 0 : Math.round((completed / related.length) * 100),
    };
  });
});

function useMilestonesStore() {
  return {
    milestones: computed(() => listMilestones()),
    templates: computed(() => state.templates),
    projectMilestoneSummary,
    getMilestoneById,
    getNextMilestoneNo,
    createMilestone,
    updateMilestone,
    setMilestoneStatus,
    delayMilestone,
    completeMilestone,
    applyMilestoneTemplate,
  };
}

export {
  useMilestonesStore,
  milestoneStatusMap,
  milestoneTypeMap,
  completionModeMap,
  riskLevelMap,
};
