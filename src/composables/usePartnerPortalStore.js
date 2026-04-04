import { computed, reactive } from "vue";
import {
  inviteStatusMap,
  partnerDirectory,
  partnerPortalList,
  portalStatusMap,
} from "../data/partnerPortals";

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

function createActivity(title, description = "", actorName = "系統管理員") {
  return {
    id: `portal-activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
  record.lastActionAt = record.updatedAt;
}

function ensurePartnerMeta(record) {
  const partner = partnerDirectory.find((item) => item.id === record.partnerId);

  if (!partner) {
    return record;
  }

  record.partnerName = partner.name;
  record.contactName = record.contactName || partner.contactName;
  record.contactTitle = record.contactTitle || partner.contactTitle;
  record.email = record.email || partner.email;
  record.phone = record.phone || partner.phone;
  record.loginAccount = record.loginAccount || partner.loginAccount;

  return record;
}

function normalizeRecord(record) {
  return ensurePartnerMeta({
    maxUserCount: 1,
    invitationEnabled: false,
    visibleModules: [],
    downloadScopes: [],
    submissionScopes: [],
    homepageSections: [],
    resourceCategories: [],
    fileScopes: [],
    dataScopes: [],
    activities: [],
    shouldResendInvite: false,
    disableReason: "",
    notes: "",
    internalNotes: "",
    invitedAt: "",
    activatedAt: "",
    enabledAt: "",
    disabledAt: "",
    lastLoginAt: "",
    lastActionAt: "",
    ...record,
  });
}

const state = reactive({
  records: cloneRecords(partnerPortalList).map((item) => normalizeRecord(item)),
});

function listPortals() {
  return state.records;
}

function getPortalById(portalId) {
  return state.records.find((item) => item.id === portalId) ?? null;
}

function getNextPortalNo() {
  const maxValue = state.records.reduce((result, item) => {
    const numeric = Number(String(item.portalNo ?? "").replace("PRT-", ""));
    return Number.isNaN(numeric) ? result : Math.max(result, numeric);
  }, 0);

  return `PRT-${String(maxValue + 1).padStart(3, "0")}`;
}

function createPortal(payload, actorName = "系統管理員") {
  const nextRecord = normalizeRecord({
    id: `portal-${Date.now()}`,
    portalNo: payload.portalNo || getNextPortalNo(),
    createdAt: nowTimestamp(),
    createdBy: actorName,
    updatedAt: nowTimestamp(),
    updatedBy: actorName,
    lastActionAt: nowTimestamp(),
    ...payload,
  });

  if (payload.sendInvite && inviteStatusMap[nextRecord.inviteStatus]) {
    nextRecord.inviteStatus = "sent";
    nextRecord.invitedAt = nowTimestamp();
    nextRecord.invitationEnabled = true;
  }

  if (nextRecord.status === "active") {
    nextRecord.enabledAt = nextRecord.enabledAt || nowTimestamp();
    nextRecord.activatedAt = nextRecord.activatedAt || nowTimestamp();
    nextRecord.inviteStatus = "activated";
  }

  appendActivity(
    nextRecord,
    "建立入口",
    payload.sendInvite ? "建立完成並寄送邀請" : "建立入口設定完成",
    actorName
  );

  state.records.unshift(nextRecord);
  return nextRecord;
}

function updatePortal(portalId, payload, actorName = "系統管理員") {
  const target = getPortalById(portalId);

  if (!target) {
    return null;
  }

  const previousVisibleModules = [...(target.visibleModules ?? [])];
  const previousStatus = target.status;

  Object.assign(target, normalizeRecord({ ...target, ...payload }));

  if (payload.sendInvite) {
    target.inviteStatus = "sent";
    target.invitedAt = nowTimestamp();
    target.invitationEnabled = true;
  }

  if (target.status === "active" && !target.enabledAt) {
    target.enabledAt = nowTimestamp();
  }

  if (target.status === "active" && !target.activatedAt) {
    target.activatedAt = nowTimestamp();
    target.inviteStatus = "activated";
  }

  touchRecord(target, actorName);

  const reducedPermissions = previousVisibleModules.some(
    (module) => !(target.visibleModules ?? []).includes(module)
  );
  const descriptionParts = [];

  if (previousStatus !== target.status) {
    descriptionParts.push(`狀態由 ${previousStatus} 調整為 ${target.status}`);
  }

  if (reducedPermissions) {
    descriptionParts.push("已縮減可見模組權限");
  }

  appendActivity(
    target,
    "更新入口設定",
    descriptionParts.join("；"),
    actorName
  );

  return target;
}

function setPortalStatus(portalId, status, options = {}) {
  const target = getPortalById(portalId);

  if (!target || !portalStatusMap[status]) {
    return null;
  }

  const actorName = options.actorName || "系統管理員";
  const reason = String(options.reason || "").trim();

  target.status = status;

  if (status === "active") {
    target.enabledAt = nowTimestamp();
    target.disabledAt = "";
    target.disableReason = "";
    target.invitationEnabled = true;

    if (!target.activatedAt) {
      target.activatedAt = nowTimestamp();
    }

    target.inviteStatus = "activated";
  }

  if (status === "suspended") {
    target.disabledAt = nowTimestamp();
    target.disableReason = reason || target.disableReason || "手動停用";
  }

  if (status === "locked") {
    target.disableReason = reason || target.disableReason || "入口鎖定";
  }

  if (status === "expired") {
    target.disabledAt = nowTimestamp();
    target.inviteStatus = "expired";
    target.disableReason = reason || target.disableReason || "入口已過期";
  }

  touchRecord(target, actorName);
  appendActivity(
    target,
    `狀態更新：${portalStatusMap[status].label}`,
    reason,
    actorName
  );

  return target;
}

function activatePortal(portalId, actorName = "系統管理員") {
  return setPortalStatus(portalId, "active", { actorName });
}

function suspendPortal(portalId, reason = "", actorName = "系統管理員") {
  return setPortalStatus(portalId, "suspended", { actorName, reason });
}

function resendInvite(portalId, actorName = "系統管理員") {
  const target = getPortalById(portalId);

  if (!target) {
    return null;
  }

  target.inviteStatus = "sent";
  target.invitedAt = nowTimestamp();
  target.shouldResendInvite = false;
  target.invitationEnabled = true;
  touchRecord(target, actorName);
  appendActivity(target, "重寄邀請", "已重新寄送入口啟用邀請", actorName);
  return target;
}

function resetPortal(portalId, actorName = "系統管理員") {
  const target = getPortalById(portalId);

  if (!target) {
    return null;
  }

  target.status = "pending_activation";
  target.inviteStatus = "resend_required";
  target.invitedAt = "";
  target.activatedAt = "";
  target.enabledAt = "";
  target.disabledAt = "";
  target.disableReason = "";
  target.shouldResendInvite = true;
  touchRecord(target, actorName);
  appendActivity(target, "重設入口", "已清除啟用狀態，等待重新邀請", actorName);
  return target;
}

function batchUpdateStatus(portalIds, status, options = {}) {
  return portalIds
    .map((portalId) => setPortalStatus(portalId, status, options))
    .filter(Boolean);
}

function batchResendInvites(portalIds, actorName = "系統管理員") {
  return portalIds.map((portalId) => resendInvite(portalId, actorName)).filter(Boolean);
}

function usePartnerPortalStore() {
  return {
    portals: computed(() => listPortals()),
    getPortalById,
    getNextPortalNo,
    createPortal,
    updatePortal,
    activatePortal,
    suspendPortal,
    resendInvite,
    resetPortal,
    batchUpdateStatus,
    batchResendInvites,
  };
}

export { usePartnerPortalStore };
