import { computed, reactive } from "vue";
import {
  avatarByUserId,
  campaignList,
  campaignResultMap,
  campaignStatusMap,
  customerOptions,
  opportunityOptions,
  partnerDirectory,
  productOptions,
  projectOptions,
  userList,
} from "../data/campaigns";

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
const projectById = new Map(projectOptions.map((item) => [item.id, item]));
const partnerById = new Map(partnerDirectory.map((item) => [item.id, item]));
const customerById = new Map(customerOptions.map((item) => [item.id, item]));
const opportunityById = new Map(opportunityOptions.map((item) => [item.id, item]));
const productById = new Map(productOptions.map((item) => [item.id, item]));

function resolveUserName(userId, fallback = "未指派") {
  return userById.get(userId)?.name ?? fallback;
}

function resolveUserAvatar(userId) {
  return avatarByUserId[userId] || "https://i.pravatar.cc/64?img=52";
}

function appendActivity(record, title, description = "", actorName = "系統管理員") {
  record.activities = [
    {
      id: `cmp-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      occurredAt: nowTimestamp(),
      title,
      description,
      actorName,
    },
    ...(record.activities || []),
  ];
}

function resolveResultStatus(record) {
  if (record.resultStatus && campaignResultMap[record.resultStatus]) {
    return record.resultStatus;
  }

  if (record.actualRevenue > 0 && record.actualCost > 0) {
    const roi = ((record.actualRevenue - record.actualCost) / record.actualCost) * 100;

    if (roi >= 30) {
      return "achieved";
    }

    if (roi >= 10) {
      return "near_target";
    }

    return "below_target";
  }

  return "monitoring";
}

function normalizeRecord(record) {
  const next = {
    collaboratorIds: [],
    customerIds: [],
    opportunityIds: [],
    productIds: [],
    attachments: [],
    tags: [],
    activities: [],
    ...record,
  };

  next.ownerName = resolveUserName(next.ownerId, next.ownerName || "未指派");
  next.ownerAvatar = resolveUserAvatar(next.ownerId);
  next.collaboratorNames = next.collaboratorIds.map((item) => resolveUserName(item, item));

  next.projectName = projectById.get(next.projectId)?.name || next.projectName || "";
  next.partnerName = partnerById.get(next.partnerId)?.name || next.partnerName || "";

  next.customerNames = next.customerIds.map((item) => customerById.get(item)?.name || item);
  next.opportunityNames = next.opportunityIds.map((item) => opportunityById.get(item)?.name || item);
  next.productNames = next.productIds.map((item) => productById.get(item)?.name || item);

  next.budget = Number(next.budget ?? 0);
  next.actualCost = Number(next.actualCost ?? 0);
  next.estimatedValue = Number(next.estimatedValue ?? 0);
  next.actualRevenue = Number(next.actualRevenue ?? 0);
  next.signupCount = Number(next.signupCount ?? 0);
  next.attendanceCount = Number(next.attendanceCount ?? 0);
  next.leadCount = Number(next.leadCount ?? 0);
  next.qualifiedLeadCount = Number(next.qualifiedLeadCount ?? 0);
  next.opportunityCount = Number(next.opportunityCount ?? 0);

  next.isOverBudget = next.actualCost > next.budget && next.budget > 0;
  next.isDelayed =
    next.status === "delayed" ||
    (!["completed", "closed", "cancelled"].includes(next.status) &&
      toTimestamp(next.endDate) > 0 &&
      toTimestamp(next.endDate) < Date.now());
  next.hasOpportunityResult = next.opportunityCount > 0;

  next.roiRate =
    next.actualCost > 0
      ? Number((((next.actualRevenue - next.actualCost) / next.actualCost) * 100).toFixed(1))
      : 0;

  next.resultStatus = resolveResultStatus(next);

  return next;
}

const state = reactive({
  records: cloneRecords(campaignList).map((item) => normalizeRecord(item)),
});

function listCampaigns() {
  return state.records.map((item) => normalizeRecord(item));
}

function getCampaignById(campaignId) {
  const target = state.records.find((item) => item.id === campaignId);
  return target ? normalizeRecord(target) : null;
}

function getNextCampaignNo() {
  const maxValue = state.records.reduce((result, item) => {
    const numeric = Number(String(item.activityNo || "").replace("MKT-2026-", ""));
    return Number.isNaN(numeric) ? result : Math.max(result, numeric);
  }, 0);

  return `MKT-2026-${String(maxValue + 1).padStart(3, "0")}`;
}

function createCampaign(payload, actorName = "系統管理員") {
  const record = normalizeRecord({
    id: `cmp-${Date.now()}`,
    activityId: payload.activityId || `evt-${Date.now()}`,
    activityNo: payload.activityNo || getNextCampaignNo(),
    activityName: payload.activityName,
    activityType: payload.activityType || "campaign",
    status: payload.status || "draft",
    priority: payload.priority || "medium",
    topic: payload.topic || "",
    objective: payload.objective || "",
    format: payload.format || "",
    audience: payload.audience || "",
    channel: payload.channel || "",
    region: payload.region || "台灣",
    startDate: payload.startDate || todayDate(),
    endDate: payload.endDate || todayDate(),
    registrationStartDate: payload.registrationStartDate || "",
    registrationEndDate: payload.registrationEndDate || "",
    actualEventDate: payload.actualEventDate || "",
    ownerId: payload.ownerId || "u-001",
    collaboratorIds: payload.collaboratorIds || [],
    projectId: payload.projectId || "",
    partnerId: payload.partnerId || "",
    customerIds: payload.customerIds || [],
    opportunityIds: payload.opportunityIds || [],
    productIds: payload.productIds || [],
    budget: payload.budget || 0,
    actualCost: payload.actualCost || 0,
    signupCount: payload.signupCount || 0,
    attendanceCount: payload.attendanceCount || 0,
    leadCount: payload.leadCount || 0,
    qualifiedLeadCount: payload.qualifiedLeadCount || 0,
    opportunityCount: payload.opportunityCount || 0,
    estimatedValue: payload.estimatedValue || 0,
    actualRevenue: payload.actualRevenue || 0,
    resultStatus: payload.resultStatus || "monitoring",
    resultSummary: payload.resultSummary || "",
    description: payload.description || "",
    notes: payload.notes || "",
    tags: payload.tags || [],
    attachments: payload.attachments || [],
    cancellationReason: "",
    closeReason: "",
    createdAt: nowTimestamp(),
    createdBy: actorName,
    updatedAt: nowTimestamp(),
    updatedBy: actorName,
    activities: [
      {
        id: `cmp-log-${Date.now()}-create`,
        occurredAt: nowTimestamp(),
        title: "建立活動",
        description: "新增活動主檔",
        actorName,
      },
    ],
  });

  state.records.unshift(record);
  return record;
}

function updateCampaign(campaignId, payload, actorName = "系統管理員") {
  const target = state.records.find((item) => item.id === campaignId);

  if (!target) {
    return null;
  }

  const previousStatus = target.status;
  const previousEndDate = target.endDate;

  Object.assign(target, normalizeRecord({ ...target, ...payload }));
  target.updatedAt = nowTimestamp();
  target.updatedBy = actorName;

  const updates = [];

  if (previousStatus !== target.status) {
    updates.push(`狀態 ${campaignStatusMap[previousStatus]?.label || previousStatus} -> ${campaignStatusMap[target.status]?.label || target.status}`);
  }

  if (previousEndDate !== target.endDate) {
    updates.push(`結束日 ${previousEndDate || "-"} -> ${target.endDate || "-"}`);
  }

  appendActivity(target, "更新活動", updates.join("；") || "更新活動資料", actorName);
  return normalizeRecord(target);
}

function setCampaignStatus(campaignId, status, options = {}) {
  const target = state.records.find((item) => item.id === campaignId);

  if (!target || !campaignStatusMap[status]) {
    return null;
  }

  const actorName = options.actorName || "系統管理員";
  const reason = String(options.reason || "").trim();

  target.status = status;

  if (status === "closed") {
    target.closeReason = reason || target.closeReason;
  }

  if (status === "cancelled") {
    target.cancellationReason = reason || target.cancellationReason;
  }

  target.updatedAt = nowTimestamp();
  target.updatedBy = actorName;
  appendActivity(target, `狀態更新：${campaignStatusMap[status].label}`, reason, actorName);

  return normalizeRecord(target);
}

function closeCampaign(campaignId, reason = "", actorName = "系統管理員") {
  return setCampaignStatus(campaignId, "closed", { reason, actorName });
}

function cancelCampaign(campaignId, reason = "", actorName = "系統管理員") {
  return setCampaignStatus(campaignId, "cancelled", { reason, actorName });
}

function duplicateCampaign(campaignId, actorName = "系統管理員") {
  const source = getCampaignById(campaignId);

  if (!source) {
    return null;
  }

  return createCampaign(
    {
      ...source,
      activityId: `evt-${Date.now()}`,
      activityNo: getNextCampaignNo(),
      activityName: `${source.activityName}（複製）`,
      status: "draft",
      startDate: todayDate(),
      endDate: todayDate(),
      actualEventDate: "",
      actualRevenue: 0,
      resultSummary: "",
      cancellationReason: "",
      closeReason: "",
      activities: [],
    },
    actorName
  );
}

function batchSetStatus(campaignIds, status, options = {}) {
  return campaignIds
    .map((campaignId) => setCampaignStatus(campaignId, status, options))
    .filter(Boolean);
}

function useCampaignsStore() {
  return {
    campaigns: computed(() => listCampaigns()),
    getCampaignById,
    getNextCampaignNo,
    createCampaign,
    updateCampaign,
    setCampaignStatus,
    closeCampaign,
    cancelCampaign,
    duplicateCampaign,
    batchSetStatus,
  };
}

export {
  useCampaignsStore,
  campaignStatusMap,
  campaignResultMap,
};
