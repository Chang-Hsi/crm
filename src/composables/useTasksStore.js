import { computed, reactive } from "vue";
import {
  activityOptions,
  milestoneDirectory,
  projectOptions,
  reminderRuleList,
  slaStatusMap,
  taskList,
  taskPriorityMap,
  taskStatusMap,
  taskTemplateList,
  userList,
  getRelativeDueDate,
} from "../data/tasks";

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
const projectById = new Map(projectOptions.map((item) => [item.id, item]));
const activityById = new Map(activityOptions.map((item) => [item.id, item]));
const milestoneById = new Map(milestoneDirectory.map((item) => [item.id, item]));
const templateById = new Map(taskTemplateList.map((item) => [item.id, item]));

function resolveUserName(userId, fallback = "未指派") {
  return userById.get(userId)?.name ?? fallback;
}

function resolveProjectName(projectId, fallback = "") {
  return projectById.get(projectId)?.name ?? fallback;
}

function resolveActivityName(activityId, fallback = "") {
  return activityById.get(activityId)?.name ?? fallback;
}

function resolveMilestoneName(milestoneId, fallback = "") {
  return milestoneById.get(milestoneId)?.name ?? fallback;
}

function resolveSlaStatus(record) {
  if (record.status === "completed") {
    return "normal";
  }

  if (record.status === "delayed") {
    if (["high", "urgent"].includes(record.priority)) {
      return "attention_required";
    }

    return "overdue";
  }

  const dueDateTime = new Date(record.dueDate).getTime();
  const now = Date.now();

  if (!Number.isFinite(dueDateTime)) {
    return "normal";
  }

  if (dueDateTime < now && !["completed", "cancelled"].includes(record.status)) {
    return ["high", "urgent"].includes(record.priority) ? "attention_required" : "overdue";
  }

  const diffDays = Math.floor((dueDateTime - now) / (24 * 60 * 60 * 1000));

  if (diffDays <= 1 && !["completed", "cancelled"].includes(record.status)) {
    return "upcoming_due";
  }

  return "normal";
}

function createSystemActivity(title, description = "", actorId = "u-001") {
  return {
    id: `task-activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    occurredAt: nowTimestamp(),
    title,
    description,
    actorId,
  };
}

function appendActivity(record, title, description = "", actorId = "u-001") {
  record.activities = [
    createSystemActivity(title, description, actorId),
    ...(record.activities ?? []),
  ];
}

function normalizeRecord(record) {
  const next = {
    collaboratorIds: [],
    subtasks: [],
    comments: [],
    activities: [],
    attachments: [],
    tags: [],
    ...record,
  };

  next.projectName = resolveProjectName(next.projectId, next.projectName);
  next.activityName = resolveActivityName(next.activityId, next.activityName);
  next.milestoneName = resolveMilestoneName(next.milestoneId, next.milestoneName);
  next.ownerName = resolveUserName(next.ownerId);
  next.collaboratorNames = next.collaboratorIds.map((userId) => resolveUserName(userId, userId));
  next.creatorName = resolveUserName(next.creatorId, "系統");
  next.updatedByName = resolveUserName(next.updatedById, "系統");
  next.subtaskCount = next.subtasks.length;
  next.subtaskCompleted = next.subtasks.filter((item) => item.status === "completed").length;

  if (next.subtaskCount > 0) {
    const derivedProgress = Math.round((next.subtaskCompleted / next.subtaskCount) * 100);
    if (!Number.isFinite(next.progress) || next.progress < derivedProgress) {
      next.progress = derivedProgress;
    }
  }

  next.commentCount = next.comments.length;
  next.latestCommentAt = next.comments[0]?.createdAt || next.latestCommentAt || "";
  next.attachmentCount = next.attachments.length;
  next.slaStatus = resolveSlaStatus(next);
  return next;
}

const state = reactive({
  tasks: cloneRecords(taskList).map((item) => normalizeRecord(item)),
  templates: cloneRecords(taskTemplateList),
  reminderRules: cloneRecords(reminderRuleList),
});

function listTasks() {
  return state.tasks;
}

function listTemplates() {
  return state.templates;
}

function listReminderRules() {
  return state.reminderRules;
}

function getTaskById(taskId) {
  return state.tasks.find((item) => item.id === taskId) ?? null;
}

function getNextTaskNo() {
  const maxValue = state.tasks.reduce((result, item) => {
    const numeric = Number(String(item.taskNo ?? "").replace("TSK-2026-", ""));
    return Number.isNaN(numeric) ? result : Math.max(result, numeric);
  }, 0);

  return `TSK-2026-${String(maxValue + 1).padStart(4, "0")}`;
}

function createTask(payload, actorId = "u-001") {
  const nextTask = normalizeRecord({
    id: `task-${Date.now()}`,
    taskNo: payload.taskNo || getNextTaskNo(),
    taskName: payload.taskName,
    taskType: payload.taskType || "execution",
    status: payload.status || "not_started",
    priority: payload.priority || "medium",
    projectId: payload.projectId || "",
    projectName: payload.projectName || "",
    activityId: payload.activityId || "",
    activityName: payload.activityName || "",
    milestoneId: payload.milestoneId || "",
    milestoneName: payload.milestoneName || "",
    parentTaskId: payload.parentTaskId || "",
    parentTaskName: payload.parentTaskName || "",
    ownerId: payload.ownerId || "",
    collaboratorIds: payload.collaboratorIds || [],
    creatorId: actorId,
    startDate: payload.startDate || todayDate(),
    dueDate: payload.dueDate || todayDate(),
    completedDate: "",
    progress: Number(payload.progress ?? 0),
    estimatedHours: Number(payload.estimatedHours ?? 0),
    actualHours: Number(payload.actualHours ?? 0),
    description: payload.description || "",
    acceptanceCriteria: payload.acceptanceCriteria || "",
    subtasks: payload.subtasks || [],
    comments: payload.comments || [],
    attachments: payload.attachments || [],
    tags: payload.tags || [],
    notes: payload.notes || "",
    delayReason: "",
    completionNote: "",
    reminderRuleSummary: payload.reminderRuleSummary || "",
    templateId: payload.templateId || "",
    templateName: payload.templateName || "",
    unreadCommentCount: 0,
    isMyMentioned: false,
    createdAt: nowTimestamp(),
    updatedAt: nowTimestamp(),
    updatedById: actorId,
    activities: [
      createSystemActivity("建立任務", "任務已建立", actorId),
    ],
  });

  state.tasks.unshift(nextTask);
  return nextTask;
}

function updateTask(taskId, payload, actorId = "u-001") {
  const target = getTaskById(taskId);

  if (!target) {
    return null;
  }

  const previousStatus = target.status;
  const previousProgress = target.progress;

  Object.assign(target, normalizeRecord({ ...target, ...payload }));
  target.updatedAt = nowTimestamp();
  target.updatedById = actorId;

  const updates = [];
  if (previousStatus !== target.status) {
    updates.push(`狀態 ${taskStatusMap[previousStatus]?.label || previousStatus} -> ${taskStatusMap[target.status]?.label || target.status}`);
  }
  if (previousProgress !== target.progress) {
    updates.push(`進度 ${previousProgress}% -> ${target.progress}%`);
  }

  appendActivity(target, "更新任務", updates.join("；"), actorId);
  return normalizeRecord(target);
}

function setTaskStatus(taskId, status, options = {}) {
  const target = getTaskById(taskId);

  if (!target || !taskStatusMap[status]) {
    return null;
  }

  const actorId = options.actorId || "u-001";
  const reason = options.reason || "";
  target.status = status;

  if (status === "completed") {
    target.progress = 100;
    target.completedDate = target.completedDate || todayDate();
    target.completionNote = reason || target.completionNote;
  }

  if (status === "delayed") {
    target.delayReason = reason || target.delayReason || "進度落後";
  }

  if (status === "cancelled") {
    target.completedDate = "";
  }

  target.updatedAt = nowTimestamp();
  target.updatedById = actorId;
  target.slaStatus = resolveSlaStatus(target);
  appendActivity(
    target,
    `狀態更新：${taskStatusMap[status].label}`,
    reason,
    actorId
  );
  return normalizeRecord(target);
}

function addTaskComment(taskId, content, options = {}) {
  const target = getTaskById(taskId);

  if (!target) {
    return null;
  }

  const authorId = options.authorId || "u-001";
  const mention = Boolean(options.hasMention);
  const newComment = {
    id: `cm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    authorId,
    content: String(content || "").trim(),
    createdAt: nowTimestamp(),
    type: "manual",
    hasMention: mention,
  };

  if (!newComment.content) {
    return null;
  }

  target.comments = [newComment, ...(target.comments ?? [])];
  target.latestCommentAt = newComment.createdAt;
  target.commentCount = target.comments.length;
  target.unreadCommentCount = Number(target.unreadCommentCount ?? 0) + 1;
  target.isMyMentioned = target.isMyMentioned || mention;
  target.updatedAt = nowTimestamp();
  target.updatedById = authorId;
  appendActivity(target, "新增留言", newComment.content.slice(0, 40), authorId);
  return normalizeRecord(target);
}

function addSubtask(taskId, payload, actorId = "u-001") {
  const target = getTaskById(taskId);

  if (!target) {
    return null;
  }

  const newSubtask = {
    id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: String(payload.title || "").trim(),
    status: payload.status || "not_started",
    ownerId: payload.ownerId || target.ownerId,
    dueDate: payload.dueDate || target.dueDate,
  };

  if (!newSubtask.title) {
    return null;
  }

  target.subtasks = [...(target.subtasks ?? []), newSubtask];
  target.updatedAt = nowTimestamp();
  target.updatedById = actorId;
  appendActivity(target, "新增子任務", newSubtask.title, actorId);
  return normalizeRecord(target);
}

function toggleSubtaskStatus(taskId, subtaskId, actorId = "u-001") {
  const target = getTaskById(taskId);

  if (!target) {
    return null;
  }

  const subtask = (target.subtasks ?? []).find((item) => item.id === subtaskId);

  if (!subtask) {
    return null;
  }

  subtask.status = subtask.status === "completed" ? "in_progress" : "completed";
  target.updatedAt = nowTimestamp();
  target.updatedById = actorId;
  appendActivity(
    target,
    "子任務更新",
    `${subtask.title} -> ${subtask.status === "completed" ? "已完成" : "進行中"}`,
    actorId
  );
  return normalizeRecord(target);
}

function applyTaskTemplate(templateId, basePayload = {}, actorId = "u-001") {
  const template = templateById.get(templateId);

  if (!template) {
    return [];
  }

  const baseStart = basePayload.startDate || todayDate();
  const baseDue = basePayload.dueDate || todayDate();

  return template.tasks.map((item, index) =>
    createTask(
      {
        taskName: item.title,
        taskType: item.type,
        priority: item.priority || template.defaultPriority,
        status: "not_started",
        projectId: basePayload.projectId || "",
        activityId: basePayload.activityId || "",
        milestoneId: basePayload.milestoneId || "",
        ownerId: basePayload.ownerId || "",
        collaboratorIds: basePayload.collaboratorIds || [],
        startDate: getRelativeDueDate(baseStart, index),
        dueDate: getRelativeDueDate(baseDue, item.dueOffsetDays || 0),
        estimatedHours: Number(basePayload.estimatedHours ?? 4),
        description: `由模板「${template.templateName}」建立`,
        templateId: template.id,
        templateName: template.templateName,
        reminderRuleSummary: reminderRuleList
          .filter((rule) => rule.enabled)
          .map((rule) => rule.name)
          .join("、"),
      },
      actorId
    )
  );
}

function updateReminderRule(ruleId, payload) {
  const target = state.reminderRules.find((item) => item.id === ruleId);

  if (!target) {
    return null;
  }

  Object.assign(target, payload);
  return target;
}

const milestoneTaskSummary = computed(() => {
  return milestoneDirectory.map((milestone) => {
    const relatedTasks = state.tasks.filter((task) => task.milestoneId === milestone.id);
    const completed = relatedTasks.filter((task) => task.status === "completed").length;
    const progress = relatedTasks.length === 0 ? 0 : Math.round((completed / relatedTasks.length) * 100);

    return {
      milestoneId: milestone.id,
      milestoneName: milestone.name,
      projectId: milestone.projectId,
      taskTotal: relatedTasks.length,
      taskCompleted: completed,
      progress,
      done: relatedTasks.length > 0 && completed === relatedTasks.length,
    };
  });
});

function useTasksStore() {
  return {
    tasks: computed(() => listTasks()),
    templates: computed(() => listTemplates()),
    reminderRules: computed(() => listReminderRules()),
    milestoneTaskSummary,
    getTaskById,
    getNextTaskNo,
    createTask,
    updateTask,
    setTaskStatus,
    addTaskComment,
    addSubtask,
    toggleSubtaskStatus,
    applyTaskTemplate,
    updateReminderRule,
  };
}

export { useTasksStore, resolveSlaStatus, resolveUserName, slaStatusMap, taskPriorityMap, taskStatusMap };
