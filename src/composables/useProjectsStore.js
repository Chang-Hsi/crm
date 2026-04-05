import { computed, reactive } from "vue";
import {
  accountList,
  contractList,
  opportunityList,
  partnerOptions,
  projectList,
  projectStatusMap,
  userList,
} from "../data/projects";

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

const accountById = new Map(accountList.map((item) => [item.id, item]));
const opportunityById = new Map(opportunityList.map((item) => [item.id, item]));
const contractById = new Map(contractList.map((item) => [item.id, item]));
const partnerById = new Map(partnerOptions.map((item) => [item.id, item]));
const userById = new Map(userList.map((item) => [item.id, item]));

function resolveNameById(map, id, key, fallback = "") {
  return map.get(id)?.[key] ?? fallback;
}

function resolveUserName(userId, fallback = "未指派") {
  return userById.get(userId)?.name ?? fallback;
}

function resolveMemberNames(memberIds = []) {
  return memberIds.map((userId) => resolveUserName(userId, userId));
}

function createActivity(title, description = "", actorName = "系統管理員") {
  return {
    id: `project-activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    occurredAt: nowTimestamp(),
    title,
    description,
    actorName,
  };
}

function appendActivity(record, title, description = "", actorName = "系統管理員") {
  record.activities = [
    createActivity(title, description, actorName),
    ...(record.activities ?? []),
  ];
}

function touchRecord(record, actorName = "系統管理員") {
  record.updatedAt = nowTimestamp();
  record.updatedBy = actorName;
}

function normalizeRecord(record) {
  const next = {
    tags: [],
    attachments: [],
    milestones: [],
    activities: [],
    members: [],
    ...record,
  };

  next.customerName = resolveNameById(accountById, next.customerId, "companyName", next.customerName);
  next.opportunityName = resolveNameById(opportunityById, next.opportunityId, "name", next.opportunityName);
  next.contractName = resolveNameById(contractById, next.contractId, "contractName", next.contractName);
  next.partnerName = resolveNameById(partnerById, next.partnerId, "name", next.partnerName);
  next.ownerName = resolveUserName(next.ownerId, next.ownerName || "未指派");
  next.memberNames = resolveMemberNames(next.members);
  next.progress = Math.min(100, Math.max(0, Number(next.progress ?? 0)));
  next.milestoneTotal = Number(next.milestoneTotal ?? next.milestones.length ?? 0);
  next.milestoneCompleted = Number(next.milestoneCompleted ?? 0);

  if (next.milestoneCompleted > next.milestoneTotal) {
    next.milestoneCompleted = next.milestoneTotal;
  }

  return next;
}

const state = reactive({
  records: cloneRecords(projectList).map((item) => normalizeRecord(item)),
});

function listProjects() {
  return state.records;
}

function getProjectById(projectId) {
  return state.records.find((item) => item.id === projectId) ?? null;
}

function getNextProjectNo() {
  const maxValue = state.records.reduce((result, item) => {
    const numeric = Number(String(item.projectNo ?? "").replace("PRJ-", "").replace("2026-", ""));
    return Number.isNaN(numeric) ? result : Math.max(result, numeric);
  }, 0);

  return `PRJ-2026-${String(maxValue + 1).padStart(3, "0")}`;
}

function createProject(payload, actorName = "系統管理員") {
  const nextRecord = normalizeRecord({
    id: `proj-${Date.now()}`,
    projectNo: payload.projectNo || getNextProjectNo(),
    createdAt: nowTimestamp(),
    createdBy: actorName,
    updatedAt: nowTimestamp(),
    updatedBy: actorName,
    ...payload,
  });

  appendActivity(nextRecord, "建立專案", "新增專案主檔完成", actorName);
  state.records.unshift(nextRecord);
  return nextRecord;
}

function updateProject(projectId, payload, actorName = "系統管理員") {
  const target = getProjectById(projectId);

  if (!target) {
    return null;
  }

  const previousStatus = target.status;
  const previousProgress = target.progress;

  Object.assign(target, normalizeRecord({ ...target, ...payload }));
  touchRecord(target, actorName);

  const updates = [];

  if (previousStatus !== target.status) {
    updates.push(`狀態 ${previousStatus} -> ${target.status}`);
  }

  if (previousProgress !== target.progress) {
    updates.push(`進度 ${previousProgress}% -> ${target.progress}%`);
  }

  appendActivity(target, "更新專案", updates.join("；"), actorName);
  return target;
}

function setProjectStatus(projectId, status, options = {}) {
  const target = getProjectById(projectId);

  if (!target || !projectStatusMap[status]) {
    return null;
  }

  const actorName = options.actorName || "系統管理員";
  const reason = String(options.reason || "").trim();
  target.status = status;

  if (status === "completed" || status === "closed") {
    target.progress = 100;
    target.actualEndDate = target.actualEndDate || todayDate();
  }

  if (status === "cancelled") {
    target.actualEndDate = "";
  }

  touchRecord(target, actorName);
  appendActivity(
    target,
    `狀態更新：${projectStatusMap[status].label}`,
    reason,
    actorName
  );

  return target;
}

function closeProject(projectId, reason = "", actorName = "系統管理員") {
  return setProjectStatus(projectId, "closed", { reason, actorName });
}

function archiveProject(projectId, reason = "", actorName = "系統管理員") {
  const target = getProjectById(projectId);

  if (!target) {
    return null;
  }

  target.isArchived = true;
  target.archivedAt = nowTimestamp();
  touchRecord(target, actorName);
  appendActivity(target, "封存專案", reason || "專案已封存", actorName);
  return target;
}

function cancelProject(projectId, reason = "", actorName = "系統管理員") {
  return setProjectStatus(projectId, "cancelled", { reason, actorName });
}

function batchSetStatus(projectIds, status, options = {}) {
  return projectIds
    .map((projectId) => setProjectStatus(projectId, status, options))
    .filter(Boolean);
}

function batchAssignOwner(projectIds, ownerId, actorName = "系統管理員") {
  const ownerName = resolveUserName(ownerId);

  return projectIds
    .map((projectId) => {
      const target = getProjectById(projectId);

      if (!target) {
        return null;
      }

      target.ownerId = ownerId;
      target.ownerName = ownerName;
      touchRecord(target, actorName);
      appendActivity(target, "調整負責人", `改派為 ${ownerName}`, actorName);
      return target;
    })
    .filter(Boolean);
}

function useProjectsStore() {
  return {
    projects: computed(() => listProjects()),
    getProjectById,
    getNextProjectNo,
    createProject,
    updateProject,
    setProjectStatus,
    closeProject,
    archiveProject,
    cancelProject,
    batchSetStatus,
    batchAssignOwner,
  };
}

export { useProjectsStore };
