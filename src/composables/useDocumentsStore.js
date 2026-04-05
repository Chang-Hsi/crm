import { computed, reactive } from "vue";
import {
  activityOptions,
  customerOptions,
  documentCategoryMap,
  documentList,
  extensionTypeMap,
  milestoneOptions,
  partnerDirectory,
  projectOptions,
  taskOptions,
  userList,
} from "../data/documents";

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

const projectById = new Map(projectOptions.map((item) => [item.id, item.name]));
const activityById = new Map(activityOptions.map((item) => [item.id, item.name]));
const taskById = new Map(taskOptions.map((item) => [item.id, item.name]));
const milestoneById = new Map(milestoneOptions.map((item) => [item.id, item.name]));
const customerById = new Map(customerOptions.map((item) => [item.id, item.name]));
const partnerById = new Map(partnerDirectory.map((item) => [item.id, item.name]));
const userById = new Map(userList.map((item) => [item.id, item.name]));

function resolveName(map, id) {
  return map.get(id) || "";
}

function normalizeRecord(record) {
  const next = {
    tags: [],
    versionHistory: [],
    activities: [],
    ...record,
  };

  next.projectName = resolveName(projectById, next.projectId);
  next.activityName = resolveName(activityById, next.activityId);
  next.taskName = resolveName(taskById, next.taskId);
  next.milestoneName = resolveName(milestoneById, next.milestoneId);
  next.customerName = resolveName(customerById, next.customerId);
  next.partnerName = resolveName(partnerById, next.partnerId);
  next.uploaderName = resolveName(userById, next.uploaderId) || next.uploaderName || "未指定";
  next.updatedBy = next.updatedBy || next.uploaderName;
  next.primaryRelation = next.projectName || next.activityName || next.taskName || "-";
  next.relationCount = [
    next.projectId,
    next.activityId,
    next.taskId,
    next.milestoneId,
    next.customerId,
    next.partnerId,
  ].filter(Boolean).length;
  next.extensionLabel = extensionTypeMap[next.extension]?.label || String(next.extension || "").toUpperCase();
  next.categoryLabel = documentCategoryMap[next.fileCategory]?.label || next.fileCategory;
  next.size = Number(next.size || 0);
  next.sizeLabel = formatBytes(next.size);
  next.downloadUrl = next.objectUrl || next.fileUrl || "";
  next.mimeType = next.fileObject?.type || resolveMimeType(next.extension);
  next.previewable = isPreviewableExtension(next.extension);
  next.fileFullName = buildFileFullName(next.fileName, next.extension);

  return next;
}

function buildFileFullName(fileName, extension) {
  if (!fileName) {
    return `file.${extension || "dat"}`;
  }

  const normalizedExtension = String(extension || "").toLowerCase();
  if (!normalizedExtension) {
    return fileName;
  }

  if (String(fileName).toLowerCase().endsWith(`.${normalizedExtension}`)) {
    return fileName;
  }

  return `${fileName}.${normalizedExtension}`;
}

function resolveMimeType(extension) {
  const map = {
    pdf: "application/pdf",
    txt: "text/plain",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    zip: "application/zip",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    pd: "application/octet-stream",
  };

  return map[String(extension || "").toLowerCase()] || "application/octet-stream";
}

function isPreviewableExtension(extension) {
  return ["pdf", "txt", "png", "jpg", "jpeg", "webp", "gif", "svg"].includes(
    String(extension || "").toLowerCase()
  );
}

function formatBytes(value) {
  if (!value) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${size.toFixed(size >= 100 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function parseVersionNumber(version) {
  return Number(String(version || "").replace(/^v/i, "")) || 1;
}

function appendActivity(record, title, description = "", actorName = "系統管理員") {
  record.activities = [
    {
      id: `doc-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      occurredAt: nowTimestamp(),
      title,
      description,
      actorName,
    },
    ...(record.activities || []),
  ];
}

const state = reactive({
  records: cloneRecords(documentList).map((item) => normalizeRecord(item)),
});

function listDocuments() {
  return state.records.map((item) => normalizeRecord(item));
}

function getDocumentById(documentId) {
  const record = state.records.find((item) => item.id === documentId);
  return record ? normalizeRecord(record) : null;
}

function getNextFileNo() {
  const maxValue = state.records.reduce((result, item) => {
    const numeric = Number(String(item.fileNo || "").replace("DOC-2026-", ""));
    return Number.isNaN(numeric) ? result : Math.max(result, numeric);
  }, 0);

  return `DOC-2026-${String(maxValue + 1).padStart(3, "0")}`;
}

function createDocument(payload, actorName = "系統管理員") {
  const now = nowTimestamp();
  const version = payload.version || "v1";
  const fileObject = payload.file instanceof File ? payload.file : null;
  const objectUrl = fileObject ? URL.createObjectURL(fileObject) : "";
  const record = normalizeRecord({
    id: `doc-${Date.now()}`,
    fileNo: payload.fileNo || getNextFileNo(),
    fileName: payload.fileName || "未命名文件",
    fileCategory: payload.fileCategory || "internal",
    fileType: payload.fileType || "archive",
    extension: payload.extension || "pdf",
    size: Number(payload.size || 0),
    projectId: payload.projectId || "",
    activityId: payload.activityId || "",
    taskId: payload.taskId || "",
    milestoneId: payload.milestoneId || "",
    customerId: payload.customerId || "",
    partnerId: payload.partnerId || "",
    tags: payload.tags || [],
    version,
    isLatest: payload.isLatest !== false,
    isTemplate: Boolean(payload.isTemplate),
    isArchived: Boolean(payload.isArchived),
    isUncategorized: Boolean(payload.isUncategorized),
    uploaderId: payload.uploaderId || "u-001",
    uploadedAt: now,
    updatedAt: now,
    updatedBy: actorName,
    visibilityScope: payload.visibilityScope || "team",
    fileUrl: payload.fileUrl || "",
    fileObject,
    objectUrl,
    description: payload.description || "",
    notes: payload.notes || "",
    versionNote: payload.versionNote || "",
    versionHistory: [
      {
        version,
        uploadedBy: actorName,
        uploadedAt: now,
        note: payload.versionNote || "首次上傳",
        isLatest: true,
      },
    ],
    activities: [
      {
        id: `doc-log-${Date.now()}-create`,
        occurredAt: now,
        title: "上傳文件",
        description: `建立 ${version}`,
        actorName,
      },
    ],
  });

  state.records.unshift(record);
  return record;
}

function updateDocument(documentId, payload, actorName = "系統管理員") {
  const target = state.records.find((item) => item.id === documentId);
  if (!target) {
    return null;
  }

  Object.assign(target, normalizeRecord({ ...target, ...payload }));
  target.updatedAt = nowTimestamp();
  target.updatedBy = actorName;
  appendActivity(target, "編輯文件資訊", "更新文件基本資訊", actorName);
  return normalizeRecord(target);
}

function uploadNewVersion(documentId, payload, actorName = "系統管理員") {
  const target = state.records.find((item) => item.id === documentId);
  if (!target) {
    return null;
  }

  const nextVersionNumber = parseVersionNumber(target.version) + 1;
  const nextVersion = payload.version || `v${nextVersionNumber}`;
  const now = nowTimestamp();

  const fileObject = payload.file instanceof File ? payload.file : null;
  const objectUrl = fileObject ? URL.createObjectURL(fileObject) : "";

  if (fileObject) {
    if (target.objectUrl) {
      URL.revokeObjectURL(target.objectUrl);
    }
    target.fileObject = fileObject;
    target.objectUrl = objectUrl;
    target.fileUrl = "";
  }

  target.version = nextVersion;
  target.isLatest = true;
  target.updatedAt = now;
  target.updatedBy = actorName;
  target.versionNote = payload.versionNote || "";
  target.size = Number(payload.size || target.size || 0);
  target.extension = payload.extension || target.extension;

  target.versionHistory = [
    {
      version: nextVersion,
      uploadedBy: actorName,
      uploadedAt: now,
      note: payload.versionNote || "上傳新版本",
      isLatest: true,
    },
    ...(target.versionHistory || []).map((item) => ({ ...item, isLatest: false })),
  ];

  appendActivity(target, "上傳新版本", `版本更新為 ${nextVersion}`, actorName);
  return normalizeRecord(target);
}

function archiveDocument(documentId, reason = "", actorName = "系統管理員") {
  const target = state.records.find((item) => item.id === documentId);
  if (!target) {
    return null;
  }

  target.isArchived = true;
  target.updatedAt = nowTimestamp();
  target.updatedBy = actorName;
  appendActivity(target, "封存文件", reason || "手動封存", actorName);
  return normalizeRecord(target);
}

function unarchiveDocument(documentId, actorName = "系統管理員") {
  const target = state.records.find((item) => item.id === documentId);
  if (!target) {
    return null;
  }

  target.isArchived = false;
  target.updatedAt = nowTimestamp();
  target.updatedBy = actorName;
  appendActivity(target, "解除封存", "", actorName);
  return normalizeRecord(target);
}

function setTemplate(documentId, value, actorName = "系統管理員") {
  const target = state.records.find((item) => item.id === documentId);
  if (!target) {
    return null;
  }

  target.isTemplate = Boolean(value);
  target.updatedAt = nowTimestamp();
  target.updatedBy = actorName;
  appendActivity(target, value ? "設為範本" : "取消範本", "", actorName);
  return normalizeRecord(target);
}

function batchArchive(documentIds, reason = "", actorName = "系統管理員") {
  return documentIds
    .map((documentId) => archiveDocument(documentId, reason, actorName))
    .filter(Boolean);
}

function batchSetCategory(documentIds, fileCategory, actorName = "系統管理員") {
  return documentIds
    .map((documentId) => updateDocument(documentId, { fileCategory, isUncategorized: false }, actorName))
    .filter(Boolean);
}

function useDocumentsStore() {
  return {
    documents: computed(() => listDocuments()),
    getDocumentById,
    getNextFileNo,
    createDocument,
    updateDocument,
    uploadNewVersion,
    archiveDocument,
    unarchiveDocument,
    setTemplate,
    batchArchive,
    batchSetCategory,
    buildFileFullName,
  };
}

export { useDocumentsStore };
