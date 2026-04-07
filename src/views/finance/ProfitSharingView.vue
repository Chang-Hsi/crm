<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElDescriptions,
  ElDescriptionsItem,
  ElDrawer,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElNotification,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
} from "element-plus";
import { CirclePlus, Download, Filter, Refresh, Search } from "@element-plus/icons-vue";
import { accountList } from "../../data/accounts";
import { opportunityList } from "../../data/opportunities";
import { projectList } from "../../data/projects";
import { partnerSettlementList, sourceTypeMap } from "../../data/partnerSettlements";
import { userList } from "../../data/users";

const router = useRouter();

const shareStatusMap = {
  draft: { label: "草稿", type: "info" },
  pending_confirmation: { label: "待確認", type: "warning" },
  pending_settlement: { label: "待結算", type: "primary" },
  settled: { label: "已結算", type: "success" },
  cancelled: { label: "已作廢", type: "info" },
};

const payoutStatusMap = {
  not_paid: { label: "未發放", type: "warning" },
  pending_payout: { label: "待發放", type: "primary" },
  paid: { label: "已發放", type: "success" },
  payout_exception: { label: "發放異常", type: "danger" },
};

const sourceTypeOptions = [
  { value: "all", label: "全部來源" },
  ...Object.entries(sourceTypeMap).map(([value, meta]) => ({ value, label: meta.label })),
];

const quickTabs = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待處理" },
  { value: "pending_confirmation", label: "待確認" },
  { value: "pending_settlement", label: "待結算" },
  { value: "settled", label: "已結算" },
  { value: "exception", label: "異常" },
];

const yesNoOptions = [
  { value: "all", label: "全部" },
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
];

const detailPreviewColors = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];

const accountNameMap = new Map(accountList.map((item) => [item.id, item.companyName]));
const opportunityById = new Map(opportunityList.map((item) => [item.id, item]));
const projectByOpportunityId = new Map(
  projectList
    .filter((item) => item.opportunityId)
    .map((item) => [item.opportunityId, item])
);
const userNameMap = new Map(userList.map((item) => [item.id, item.name]));

const accountOptions = [
  { value: "all", label: "全部客戶" },
  ...accountList.map((item) => ({ value: item.id, label: item.companyName })),
];

const opportunityOptions = [
  { value: "all", label: "全部商機" },
  ...opportunityList.map((item) => ({ value: item.id, label: item.name })),
];

const projectOptions = [
  { value: "all", label: "全部專案" },
  ...projectList.map((item) => ({ value: item.id, label: item.projectName })),
];

const ownerOptions = [
  { value: "all", label: "全部負責人" },
  ...userList
    .filter((item) => item.status === "active")
    .map((item) => ({ value: item.id, label: item.name })),
];

const shareStatusOptions = [
  { value: "all", label: "全部分潤狀態" },
  ...Object.entries(shareStatusMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const payoutStatusOptions = [
  { value: "all", label: "全部發放狀態" },
  ...Object.entries(payoutStatusMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

function deepClone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toTimestamp(value) {
  const date = parseDate(value);
  return date ? date.getTime() : 0;
}

function formatDateTime(value) {
  const date = parseDate(value);
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCurrency(value, currencyCode = "TWD") {
  const safeValue = Number(value || 0);

  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: ["JPY", "TWD"].includes(currencyCode) ? 0 : 2,
  }).format(safeValue);
}

function nowText() {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace("T", " ");
}

function mapShareStatus(status) {
  if (status === "settled") {
    return "settled";
  }

  if (status === "cancelled") {
    return "cancelled";
  }

  if (status === "pending_confirmation") {
    return "pending_confirmation";
  }

  return "pending_settlement";
}

function mapPayoutStatus(invoiceStatus, status, isException) {
  if (isException || status === "exception") {
    return "payout_exception";
  }

  if (invoiceStatus === "paid") {
    return "paid";
  }

  if (["submitted", "approved"].includes(invoiceStatus)) {
    return "pending_payout";
  }

  return "not_paid";
}

function createDetailLine(payload = {}) {
  return {
    id: payload.id || `detail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    targetName: payload.targetName || "",
    role: payload.role || "",
    method: payload.method || "ratio",
    ratio: Number(payload.ratio || 0),
    amount: Number(payload.amount || 0),
    note: payload.note || "",
  };
}

function generateInitialDetails(item, shareableAmount) {
  const shareable = Number(shareableAmount || 0);

  if (shareable <= 0) {
    return [
      createDetailLine({
        targetName: item.partnerName,
        role: "合作夥伴",
        method: "fixed",
        amount: 0,
      }),
    ];
  }

  if (item.status === "settled" || item.status === "pending_settlement") {
    return [
      createDetailLine({
        targetName: item.partnerName,
        role: "合作夥伴",
        method: "ratio",
        ratio: 100,
        amount: shareable,
      }),
    ];
  }

  const partnerRatio = 80;
  const partnerAmount = Math.round((shareable * partnerRatio) / 100);

  return [
    createDetailLine({
      targetName: item.partnerName,
      role: "合作夥伴",
      method: "ratio",
      ratio: partnerRatio,
      amount: partnerAmount,
    }),
    createDetailLine({
      targetName: item.ownerName,
      role: "內部業務",
      method: "ratio",
      ratio: 20,
      amount: shareable - partnerAmount,
    }),
  ];
}

function toRecord(raw) {
  const opportunity = opportunityById.get(raw.opportunityId);
  const accountId = raw.accountId || opportunity?.accountId || "";
  const accountName = accountNameMap.get(accountId) || "-";
  const projectId =
    raw.projectId || projectByOpportunityId.get(raw.opportunityId)?.id || "";
  const projectName =
    (projectId && projectList.find((item) => item.id === projectId)?.projectName) || "-";

  const details = (raw.details || []).map((line) => createDetailLine(line));
  const shareableAmount = Number(raw.shareableAmount || 0);
  const allocatedAmount = details.reduce(
    (sum, line) => sum + Number(line.amount || 0),
    0
  );
  const remainingAmount = shareableAmount - allocatedAmount;
  const allocatedRatio =
    shareableAmount > 0 ? (allocatedAmount / shareableAmount) * 100 : 0;

  const isOverAllocated = allocatedAmount > shareableAmount;
  const hasException =
    Boolean(raw.isException) ||
    raw.shareStatus === "cancelled" ||
    raw.payoutStatus === "payout_exception" ||
    isOverAllocated;
  const isPending = ["draft", "pending_confirmation", "pending_settlement"].includes(
    raw.shareStatus
  );

  return {
    ...raw,
    accountId,
    accountName,
    opportunityName: opportunity?.name || raw.opportunityName || "-",
    projectId,
    projectName,
    ownerName: userNameMap.get(raw.ownerId) || raw.ownerName || "未指派",
    details,
    shareableAmount,
    allocatedAmount,
    remainingAmount,
    allocatedRatio,
    shareCount: details.length,
    hasException,
    isPending,
    isOverAllocated,
  };
}

function createSeedRecords() {
  return partnerSettlementList.map((item) => {
    const details = generateInitialDetails(item, item.commissionValue);

    return toRecord({
      id: `ps-${item.id}`,
      shareNo: item.commissionNo,
      accountId: "",
      opportunityId: item.opportunityId,
      projectId: "",
      sourceType: item.sourceType,
      sourceLabel: sourceTypeMap[item.sourceType]?.label || item.sourceType,
      sourceSummary: item.sourceName,
      sourceAmount: Number(item.baseAmount || 0),
      shareableAmount: Number(item.commissionValue || 0),
      details,
      shareStatus: mapShareStatus(item.status),
      payoutStatus: mapPayoutStatus(item.invoiceStatus, item.status, item.isException),
      payoutExpectedAt: item.dueSettlementAt || "",
      payoutAt: item.settledAt || "",
      ownerId: item.ownerId,
      ownerName: item.ownerName,
      exceptionReason: item.exceptionReason || "",
      notes: item.notes || "",
      createdAt: item.createdAt,
      createdBy: item.createdBy,
      updatedAt: item.updatedAt,
      updatedBy: item.updatedBy,
      relatedRefNo: [item.commissionNo, item.contractId, item.sourceId]
        .filter(Boolean)
        .join(" / "),
      rawPartnerName: item.partnerName,
    });
  });
}

const records = ref(createSeedRecords());

const loading = ref(false);
const filterPanelOpen = ref(false);
const quickTab = ref("all");
const currentPage = ref(1);
const pageSize = ref(10);

const detailDrawerOpen = ref(false);
const createDrawerOpen = ref(false);
const activeRecordId = ref("");

const sortState = reactive({
  prop: "updatedAt",
  order: "descending",
});

const filters = reactive({
  keyword: "",
  dateRange: [],
  accountId: "all",
  opportunityId: "all",
  projectId: "all",
  sourceType: "all",
  targetKeyword: "",
  ownerId: "all",
  shareStatus: "all",
  payoutStatus: "all",
  onlyPending: "all",
  onlyException: "all",
});

function createEmptyEditor() {
  return {
    id: "",
    shareNo: "",
    accountId: "",
    opportunityId: "",
    projectId: "",
    sourceType: "opportunity_won",
    sourceSummary: "",
    sourceAmount: 0,
    shareableAmount: 0,
    details: [
      createDetailLine({ targetName: "", role: "", method: "ratio", ratio: 100 }),
    ],
    shareStatus: "draft",
    payoutStatus: "not_paid",
    payoutExpectedAt: "",
    payoutAt: "",
    ownerId: "u-005",
    exceptionReason: "",
    notes: "",
    rawPartnerName: "",
  };
}

const editor = reactive(createEmptyEditor());
const creator = reactive(createEmptyEditor());

const activeRecord = computed(() =>
  records.value.find((item) => item.id === activeRecordId.value)
);

const targetOptions = computed(() => {
  const map = new Map();

  records.value.forEach((record) => {
    (record.details || []).forEach((line) => {
      if (line.targetName) {
        map.set(line.targetName, line.targetName);
      }
    });
  });

  return [...map.values()];
});

function notify(message, title = "已更新", type = "success") {
  ElNotification({ title, message, type, position: "top-right" });
}

function isDateWithinRange(value, range) {
  const [start, end] = range || [];
  if (!start || !end) {
    return true;
  }

  const ts = toTimestamp(value);
  return ts >= toTimestamp(start) && ts <= toTimestamp(end) + 24 * 60 * 60 * 1000 - 1;
}

function includesTargetKeyword(record, keyword) {
  if (!keyword) {
    return true;
  }

  return (record.details || []).some((line) =>
    String(line.targetName || "")
      .toLowerCase()
      .includes(keyword)
  );
}

const tabCounts = computed(() => {
  const all = records.value;

  return {
    all: all.length,
    pending: all.filter((item) => item.isPending).length,
    pending_confirmation: all.filter(
      (item) => item.shareStatus === "pending_confirmation"
    ).length,
    pending_settlement: all.filter((item) => item.shareStatus === "pending_settlement")
      .length,
    settled: all.filter((item) => item.shareStatus === "settled").length,
    exception: all.filter((item) => item.hasException).length,
  };
});

const filteredRecords = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();
  const targetKeyword = filters.targetKeyword.trim().toLowerCase();

  return records.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.shareNo.toLowerCase().includes(keyword) ||
      item.accountName.toLowerCase().includes(keyword) ||
      item.opportunityName.toLowerCase().includes(keyword) ||
      item.projectName.toLowerCase().includes(keyword) ||
      String(item.sourceSummary || "")
        .toLowerCase()
        .includes(keyword) ||
      String(item.relatedRefNo || "")
        .toLowerCase()
        .includes(keyword);

    const matchesDate = isDateWithinRange(item.updatedAt, filters.dateRange);
    const matchesAccount =
      filters.accountId === "all" || item.accountId === filters.accountId;
    const matchesOpportunity =
      filters.opportunityId === "all" || item.opportunityId === filters.opportunityId;
    const matchesProject =
      filters.projectId === "all" || item.projectId === filters.projectId;
    const matchesSourceType =
      filters.sourceType === "all" || item.sourceType === filters.sourceType;
    const matchesTarget = includesTargetKeyword(item, targetKeyword);
    const matchesOwner = filters.ownerId === "all" || item.ownerId === filters.ownerId;
    const matchesShareStatus =
      filters.shareStatus === "all" || item.shareStatus === filters.shareStatus;
    const matchesPayoutStatus =
      filters.payoutStatus === "all" || item.payoutStatus === filters.payoutStatus;

    const matchesOnlyPending =
      filters.onlyPending === "all" ||
      (filters.onlyPending === "yes" ? item.isPending : !item.isPending);
    const matchesOnlyException =
      filters.onlyException === "all" ||
      (filters.onlyException === "yes" ? item.hasException : !item.hasException);

    const matchesTab =
      quickTab.value === "all" ||
      (quickTab.value === "pending" && item.isPending) ||
      (quickTab.value === "exception" && item.hasException) ||
      item.shareStatus === quickTab.value;

    return (
      matchesKeyword &&
      matchesDate &&
      matchesAccount &&
      matchesOpportunity &&
      matchesProject &&
      matchesSourceType &&
      matchesTarget &&
      matchesOwner &&
      matchesShareStatus &&
      matchesPayoutStatus &&
      matchesOnlyPending &&
      matchesOnlyException &&
      matchesTab
    );
  });
});

const sortedRecords = computed(() => {
  const result = [...filteredRecords.value];
  const direction = sortState.order === "ascending" ? 1 : -1;

  return result.sort((a, b) => {
    if (
      [
        "updatedAt",
        "sourceAmount",
        "shareableAmount",
        "allocatedAmount",
        "remainingAmount",
      ].includes(sortState.prop)
    ) {
      if (sortState.prop === "updatedAt") {
        return (toTimestamp(a.updatedAt) - toTimestamp(b.updatedAt)) * direction;
      }

      return (
        (Number(a[sortState.prop] || 0) - Number(b[sortState.prop] || 0)) * direction
      );
    }

    return (
      String(a[sortState.prop] || "").localeCompare(
        String(b[sortState.prop] || ""),
        "zh-Hant"
      ) * direction
    );
  });
});

const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedRecords.value.slice(start, start + pageSize.value);
});

const kpiCards = computed(() => {
  const list = filteredRecords.value;

  const pendingConfirmation = list.filter(
    (item) => item.shareStatus === "pending_confirmation"
  ).length;
  const pendingSettlement = list.filter(
    (item) => item.shareStatus === "pending_settlement"
  ).length;
  const waitingPayoutAmount = list
    .filter((item) => item.payoutStatus !== "paid")
    .reduce((sum, item) => sum + Number(item.allocatedAmount || 0), 0);
  const paidAmount = list
    .filter((item) => item.payoutStatus === "paid")
    .reduce((sum, item) => sum + Number(item.allocatedAmount || 0), 0);
  const exceptionCount = list.filter((item) => item.hasException).length;
  const periodTotal = list.reduce(
    (sum, item) => sum + Number(item.shareableAmount || 0),
    0
  );

  return [
    { label: "待確認分潤筆數", value: pendingConfirmation },
    { label: "待結算分潤筆數", value: pendingSettlement },
    { label: "待發放金額", value: formatCurrency(waitingPayoutAmount) },
    { label: "已發放金額", value: formatCurrency(paidAmount) },
    { label: "異常筆數", value: exceptionCount },
    { label: "本期分潤總額", value: formatCurrency(periodTotal) },
  ];
});

const editorAllocation = computed(() => {
  const shareable = Number(editor.shareableAmount || 0);
  const allocated = (editor.details || []).reduce(
    (sum, line) => sum + Number(line.amount || 0),
    0
  );

  const allocatedRatio = shareable > 0 ? (allocated / shareable) * 100 : 0;
  const remainingAmount = shareable - allocated;
  const remainingRatio = 100 - allocatedRatio;

  return {
    shareable,
    allocated,
    allocatedRatio,
    remainingAmount,
    remainingRatio,
    isOverflow: allocatedRatio > 100.0001,
  };
});

const editorPreviewSegments = computed(() => {
  const shareable = Number(editor.shareableAmount || 0);

  return (editor.details || []).map((line, index) => {
    const amount = Number(line.amount || 0);
    const ratio = shareable > 0 ? (amount / shareable) * 100 : 0;

    return {
      id: line.id,
      targetName: line.targetName || `對象 ${index + 1}`,
      ratio,
      amount,
      color: detailPreviewColors[index % detailPreviewColors.length],
    };
  });
});

function normalizeDetailLineAmount(line, shareable) {
  const safeShareable = Math.max(Number(shareable || 0), 0);
  const safeAmount = Math.max(Number(line.amount || 0), 0);
  line.amount = safeAmount;
  line.ratio = safeShareable > 0 ? (safeAmount / safeShareable) * 100 : 0;
}

function normalizeDetailLineRatio(line, shareable) {
  const safeShareable = Math.max(Number(shareable || 0), 0);
  const safeRatio = Math.max(Number(line.ratio || 0), 0);
  line.ratio = safeRatio;
  line.amount = (safeShareable * safeRatio) / 100;
}

function onEditorDetailMethodChange(line) {
  if (line.method === "ratio") {
    normalizeDetailLineRatio(line, editor.shareableAmount);
    return;
  }

  normalizeDetailLineAmount(line, editor.shareableAmount);
}

function onEditorDetailRatioChange(line) {
  normalizeDetailLineRatio(line, editor.shareableAmount);
}

function onEditorDetailAmountChange(line) {
  normalizeDetailLineAmount(line, editor.shareableAmount);
}

function onEditorShareableAmountChange() {
  editor.details.forEach((line) => {
    if (line.method === "ratio") {
      normalizeDetailLineRatio(line, editor.shareableAmount);
      return;
    }

    normalizeDetailLineAmount(line, editor.shareableAmount);
  });
}

function addEditorDetailLine() {
  editor.details.push(createDetailLine());
}

function removeEditorDetailLine(index) {
  if (editor.details.length <= 1) {
    notify("至少需要一筆分潤明細", "提醒", "warning");
    return;
  }

  editor.details.splice(index, 1);
}

function onCreateDetailMethodChange(line) {
  if (line.method === "ratio") {
    normalizeDetailLineRatio(line, creator.shareableAmount);
    return;
  }

  normalizeDetailLineAmount(line, creator.shareableAmount);
}

function onCreateDetailRatioChange(line) {
  normalizeDetailLineRatio(line, creator.shareableAmount);
}

function onCreateDetailAmountChange(line) {
  normalizeDetailLineAmount(line, creator.shareableAmount);
}

function onCreateShareableAmountChange() {
  creator.details.forEach((line) => {
    if (line.method === "ratio") {
      normalizeDetailLineRatio(line, creator.shareableAmount);
      return;
    }

    normalizeDetailLineAmount(line, creator.shareableAmount);
  });
}

function addCreateDetailLine() {
  creator.details.push(createDetailLine());
}

function removeCreateDetailLine(index) {
  if (creator.details.length <= 1) {
    notify("至少需要一筆分潤明細", "提醒", "warning");
    return;
  }

  creator.details.splice(index, 1);
}

function handleSortChange({ prop, order }) {
  sortState.prop = prop || "updatedAt";
  sortState.order = order || "descending";
}

function resetFilters() {
  filters.keyword = "";
  filters.dateRange = [];
  filters.accountId = "all";
  filters.opportunityId = "all";
  filters.projectId = "all";
  filters.sourceType = "all";
  filters.targetKeyword = "";
  filters.ownerId = "all";
  filters.shareStatus = "all";
  filters.payoutStatus = "all";
  filters.onlyPending = "all";
  filters.onlyException = "all";
  quickTab.value = "all";
  currentPage.value = 1;
}

function updateRecordById(recordId, patch) {
  const index = records.value.findIndex((item) => item.id === recordId);
  if (index < 0) {
    return null;
  }

  const merged = {
    ...records.value[index],
    ...deepClone(patch),
    updatedAt: nowText(),
    updatedBy: "王冠勳",
  };

  const next = toRecord(merged);
  records.value.splice(index, 1, next);
  return next;
}

function openDetail(record) {
  activeRecordId.value = record.id;
  detailDrawerOpen.value = true;
}

function syncEditor(record) {
  Object.assign(editor, createEmptyEditor());

  if (!record) {
    return;
  }

  Object.assign(
    editor,
    deepClone({
      ...record,
      details: (record.details || []).map((line) => createDetailLine(line)),
    })
  );
}

function openCreateDrawer() {
  Object.assign(creator, createEmptyEditor());
  creator.shareNo = getNextShareNo();
  creator.ownerId = "u-005";
  creator.shareStatus = "draft";
  creator.payoutStatus = "not_paid";
  creator.details = [createDetailLine({ method: "ratio", ratio: 100 })];
  createDrawerOpen.value = true;
}

function getNextShareNo() {
  const maxNo = records.value.reduce((max, item) => {
    const matched = String(item.shareNo || "").match(/(\d+)$/);
    if (!matched) {
      return max;
    }

    return Math.max(max, Number(matched[1]));
  }, 0);

  return `PS-${String(maxNo + 1).padStart(4, "0")}`;
}

function createRecordFromCreator() {
  const details = creator.details.map((line) => createDetailLine(line));
  const opportunity = opportunityById.get(creator.opportunityId);

  return toRecord({
    id: `ps-manual-${Date.now()}`,
    shareNo: creator.shareNo || getNextShareNo(),
    accountId: creator.accountId || opportunity?.accountId || "",
    opportunityId: creator.opportunityId,
    projectId: creator.projectId,
    sourceType: creator.sourceType,
    sourceLabel: sourceTypeMap[creator.sourceType]?.label || creator.sourceType,
    sourceSummary: creator.sourceSummary,
    sourceAmount: Number(creator.sourceAmount || 0),
    shareableAmount: Number(creator.shareableAmount || 0),
    details,
    shareStatus: creator.shareStatus,
    payoutStatus: creator.payoutStatus,
    payoutExpectedAt: creator.payoutExpectedAt,
    payoutAt: creator.payoutAt,
    ownerId: creator.ownerId,
    ownerName: userNameMap.get(creator.ownerId) || "未指派",
    exceptionReason: creator.exceptionReason,
    notes: creator.notes,
    createdAt: nowText(),
    createdBy: "王冠勳",
    updatedAt: nowText(),
    updatedBy: "王冠勳",
    relatedRefNo: creator.sourceSummary || "手動建立",
    rawPartnerName: creator.details[0]?.targetName || "",
  });
}

function submitCreate() {
  if (!creator.sourceSummary.trim()) {
    notify("請輸入分潤來源摘要", "缺少資訊", "warning");
    return;
  }

  if (Number(creator.shareableAmount || 0) <= 0) {
    notify("可分潤金額需大於 0", "缺少資訊", "warning");
    return;
  }

  if (creator.details.some((line) => !String(line.targetName || "").trim())) {
    notify("請補齊分潤對象名稱", "缺少資訊", "warning");
    return;
  }

  const record = createRecordFromCreator();
  records.value = [record, ...records.value];
  createDrawerOpen.value = false;
  notify(`${record.shareNo} 已建立`);
}

function saveEditor() {
  const record = activeRecord.value;
  if (!record) {
    return;
  }

  if (!editor.sourceSummary.trim()) {
    notify("請輸入分潤來源摘要", "缺少資訊", "warning");
    return;
  }

  if (editor.details.some((line) => !String(line.targetName || "").trim())) {
    notify("請補齊分潤對象名稱", "缺少資訊", "warning");
    return;
  }

  const patch = {
    accountId: editor.accountId,
    opportunityId: editor.opportunityId,
    projectId: editor.projectId,
    sourceType: editor.sourceType,
    sourceLabel: sourceTypeMap[editor.sourceType]?.label || editor.sourceType,
    sourceSummary: editor.sourceSummary.trim(),
    sourceAmount: Number(editor.sourceAmount || 0),
    shareableAmount: Number(editor.shareableAmount || 0),
    details: editor.details.map((line) =>
      createDetailLine({
        ...line,
        targetName: line.targetName.trim(),
        role: line.role.trim(),
        ratio: Number(line.ratio || 0),
        amount: Number(line.amount || 0),
        note: line.note.trim(),
      })
    ),
    shareStatus: editor.shareStatus,
    payoutStatus: editor.payoutStatus,
    payoutExpectedAt: editor.payoutExpectedAt,
    payoutAt: editor.payoutAt,
    ownerId: editor.ownerId,
    ownerName: userNameMap.get(editor.ownerId) || "未指派",
    exceptionReason: editor.exceptionReason.trim(),
    notes: editor.notes.trim(),
  };

  const updated = updateRecordById(record.id, patch);

  if (!updated) {
    notify("儲存失敗", "錯誤", "error");
    return;
  }

  syncEditor(updated);

  if (updated.isOverAllocated) {
    notify("已儲存，但目前分配比例超過 100%", "分配異常", "warning");
    return;
  }

  notify(`${updated.shareNo} 已更新`);
}

function setRowStatus(record, shareStatus) {
  const patch = { shareStatus };

  if (shareStatus === "settled" && record.payoutStatus !== "paid") {
    patch.payoutStatus = "paid";
    if (!record.payoutAt) {
      patch.payoutAt = new Date().toISOString().slice(0, 10);
    }
  }

  const updated = updateRecordById(record.id, patch);
  if (!updated) {
    notify("狀態更新失敗", "錯誤", "error");
    return;
  }

  notify(`${updated.shareNo} 已更新狀態`);
}

function exportCsv() {
  const header = [
    "分潤編號",
    "客戶名稱",
    "關聯商機 / 專案",
    "分潤來源",
    "可分潤金額",
    "分潤總額",
    "分潤對象數",
    "分潤狀態",
    "發放狀態",
    "更新時間",
  ];

  const rows = sortedRecords.value.map((item) => [
    item.shareNo,
    item.accountName,
    [item.opportunityName, item.projectName]
      .filter((text) => text && text !== "-")
      .join(" / ") || "-",
    item.sourceSummary,
    item.shareableAmount,
    item.allocatedAmount,
    item.shareCount,
    shareStatusMap[item.shareStatus]?.label || item.shareStatus,
    payoutStatusMap[item.payoutStatus]?.label || item.payoutStatus,
    item.updatedAt,
  ]);

  const csv = [header, ...rows]
    .map((line) =>
      line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `profit-sharing-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function goToRelated(routeName, params) {
  router.push({ name: routeName, params });
}

watch(
  () => activeRecord.value,
  (record) => {
    syncEditor(record);
  },
  { immediate: true }
);

watch(
  () => [
    filteredRecords.value.length,
    pageSize.value,
    quickTab.value,
    filters.keyword,
    filters.accountId,
    filters.opportunityId,
    filters.projectId,
    filters.sourceType,
    filters.targetKeyword,
    filters.ownerId,
    filters.shareStatus,
    filters.payoutStatus,
    filters.onlyPending,
    filters.onlyException,
  ],
  () => {
    currentPage.value = 1;
  }
);
</script>

<template>
  <div class="min-h-full p-8">
    <section class="grid gap-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-2">
          <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">
            分潤管理
          </h1>
          <p class="text-sm text-slate-500">集中管理分潤對象、比例金額、狀態與發放進度</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton :icon="Download" @click="exportCsv">匯出</ElButton>

          <ElButton type="primary" :icon="CirclePlus" @click="openCreateDrawer"
            >新增分潤</ElButton
          >
        </div>
      </header>

      <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <article
          v-for="card in kpiCards"
          :key="card.label"
          class="rounded-2xl border border-slate-200 bg-white px-4 py-4"
        >
          <p class="text-xs text-slate-500">{{ card.label }}</p>
          <p class="mt-2 text-lg font-semibold text-slate-900">{{ card.value }}</p>
        </article>
      </section>

      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div class="flex flex-wrap items-center gap-2">
            <ElInput
              v-model="filters.keyword"
              placeholder="搜尋分潤編號 / 客戶 / 來源 / 關聯資料"
              clearable
              class="!w-80"
            >
              <template #prefix><Search class="h-4 w-4 text-slate-400" /></template>
            </ElInput>
            <ElButton
              :icon="Filter"
              :type="filterPanelOpen ? 'primary' : 'default'"
              @click="filterPanelOpen = !filterPanelOpen"
            >
              Filter
            </ElButton>
            <ElButton :icon="Refresh" @click="resetFilters">重設</ElButton>
          </div>
          <ElTag round effect="plain">共 {{ sortedRecords.length }} 筆</ElTag>
        </div>

        <transition
          enter-active-class="transition-all duration-300 ease-out overflow-hidden"
          leave-active-class="transition-all duration-200 ease-in overflow-hidden"
          enter-from-class="max-h-0 opacity-0"
          enter-to-class="max-h-[1000px] opacity-100"
          leave-from-class="max-h-[1000px] opacity-100"
          leave-to-class="max-h-0 opacity-0"
        >
          <ElForm
            v-if="filterPanelOpen"
            class="grid gap-3 border-t border-slate-200 bg-white px-6 py-4 md:grid-cols-2 xl:grid-cols-4"
            label-position="top"
          >
            <ElFormItem>
              <ElDatePicker
                v-model="filters.dateRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                start-placeholder="更新起日"
                end-placeholder="更新迄日"
                class="!w-full"
              />
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.accountId">
                <ElOption
                  v-for="item in accountOptions"
                  :key="`acc-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.opportunityId">
                <ElOption
                  v-for="item in opportunityOptions"
                  :key="`opp-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.projectId">
                <ElOption
                  v-for="item in projectOptions"
                  :key="`proj-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.sourceType">
                <ElOption
                  v-for="item in sourceTypeOptions"
                  :key="`source-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElInput v-model="filters.targetKeyword" placeholder="分潤對象" clearable />
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.ownerId">
                <ElOption
                  v-for="item in ownerOptions"
                  :key="`owner-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.shareStatus">
                <ElOption
                  v-for="item in shareStatusOptions"
                  :key="`share-status-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.payoutStatus">
                <ElOption
                  v-for="item in payoutStatusOptions"
                  :key="`payout-status-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.onlyPending">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`pending-${item.value}`"
                  :label="`只看待處理：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.onlyException">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`exception-${item.value}`"
                  :label="`只看異常：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </transition>

        <div class="border-t border-slate-200 px-6 pt-3">
          <ElTabs v-model="quickTab" class="profit-tabs">
            <ElTabPane
              v-for="tab in quickTabs"
              :key="tab.value"
              :name="tab.value"
              :label="`${tab.label} (${tabCounts[tab.value] || 0})`"
            />
          </ElTabs>
        </div>

        <ElTable
          v-loading="loading"
          table-layout="auto"
          :data="pagedRecords"
          @sort-change="handleSortChange"
        >
          <ElTableColumn
            label="分潤編號"
            min-width="160"
            sortable="custom"
            prop="shareNo"
          >
            <template #default="{ row }">
              <button type="button" class="grid gap-1 text-left" @click="openDetail(row)">
                <span class="font-semibold text-[#303133] hover:text-[#409eff]">{{
                  row.shareNo
                }}</span>
                <span class="text-xs text-slate-500">{{ row.relatedRefNo }}</span>
                <div class="flex flex-wrap gap-1">
                  <ElTag v-if="row.hasException" size="small" type="danger" effect="light"
                    >異常</ElTag
                  >
                  <ElTag
                    v-if="row.isOverAllocated"
                    size="small"
                    type="danger"
                    effect="light"
                    >超額分配</ElTag
                  >
                </div>
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="客戶名稱" min-width="190" show-overflow-tooltip>
            <template #default="{ row }">{{ row.accountName }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="關聯案件 / 商機 / 專案"
            min-width="260"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{
                [row.opportunityName, row.projectName]
                  .filter((text) => text && text !== "-")
                  .join(" / ") || "-"
              }}
            </template>
          </ElTableColumn>

          <ElTableColumn label="分潤來源" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ row.sourceSummary }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="可分潤金額"
            min-width="140"
            prop="shareableAmount"
            sortable="custom"
            align="right"
          >
            <template #default="{ row }">{{
              formatCurrency(row.shareableAmount)
            }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="分潤總額"
            min-width="140"
            prop="allocatedAmount"
            sortable="custom"
            align="right"
          >
            <template #default="{ row }">{{
              formatCurrency(row.allocatedAmount)
            }}</template>
          </ElTableColumn>

          <ElTableColumn label="分潤對象數" min-width="110" align="center">
            <template #default="{ row }">{{ row.shareCount }}</template>
          </ElTableColumn>

          <ElTableColumn label="分潤狀態" min-width="120">
            <template #default="{ row }">
              <ElTag
                :type="shareStatusMap[row.shareStatus]?.type"
                size="small"
                effect="light"
              >
                {{ shareStatusMap[row.shareStatus]?.label || row.shareStatus }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="發放狀態" min-width="120">
            <template #default="{ row }">
              <ElTag
                :type="payoutStatusMap[row.payoutStatus]?.type"
                size="small"
                effect="light"
              >
                {{ payoutStatusMap[row.payoutStatus]?.label || row.payoutStatus }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn
            label="更新時間"
            min-width="150"
            prop="updatedAt"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
          </ElTableColumn>

          <ElTableColumn label="操作" width="190" fixed="right">
            <template #default="{ row }">
              <div class="flex items-center justify-end gap-1">
                <ElButton text type="primary" @click="openDetail(row)"
                  >查看 / 編輯</ElButton
                >
                <ElButton text @click="setRowStatus(row, 'pending_confirmation')"
                  >待確認</ElButton
                >
                <ElButton text @click="setRowStatus(row, 'settled')">已結算</ElButton>
              </div>
            </template>
          </ElTableColumn>
        </ElTable>

        <div
          class="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-5"
        >
          <ElPagination
            v-model:current-page="currentPage"
            background
            :page-size="pageSize"
            layout="total, prev, pager, next"
            :total="sortedRecords.length"
          />
          <ElSelect v-model="pageSize" class="!w-[100px]" @change="currentPage = 1">
            <ElOption :value="10" label="10 筆" />
            <ElOption :value="20" label="20 筆" />
            <ElOption :value="50" label="50 筆" />
          </ElSelect>
        </div>
      </section>
    </section>

    <ElDrawer
      v-model="detailDrawerOpen"
      size="56%"
      title="分潤詳情 / 編輯"
      :destroy-on-close="false"
    >
      <template v-if="activeRecord">
        <section class="grid gap-4">
          <header class="grid gap-2">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="grid gap-2">
                <h2 class="text-xl font-semibold text-slate-900">{{ editor.shareNo }}</h2>
                <p class="text-sm text-slate-600">{{ editor.sourceSummary || "-" }}</p>
                <div class="flex flex-wrap items-center gap-2">
                  <ElTag :type="shareStatusMap[editor.shareStatus]?.type" effect="light">
                    {{ shareStatusMap[editor.shareStatus]?.label }}
                  </ElTag>
                  <ElTag
                    :type="payoutStatusMap[editor.payoutStatus]?.type"
                    effect="light"
                  >
                    {{ payoutStatusMap[editor.payoutStatus]?.label }}
                  </ElTag>
                  <ElTag v-if="editorAllocation.isOverflow" type="danger" effect="light"
                    >超額分配</ElTag
                  >
                </div>
              </div>

              <div class="text-right">
                <p class="text-xs text-slate-500">可分潤金額</p>
                <p class="text-xl font-semibold text-slate-900">
                  {{ formatCurrency(editor.shareableAmount) }}
                </p>
              </div>
            </div>
          </header>

          <ElCard shadow="never">
            <template #header
              ><span class="text-sm font-semibold text-slate-800"
                >基本資訊</span
              ></template
            >
            <ElDescriptions :column="2" border>
              <ElDescriptionsItem label="分潤編號">{{
                editor.shareNo
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="分潤來源">{{
                editor.sourceSummary || "-"
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="客戶名稱">{{
                activeRecord.accountName
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="負責人">{{
                userNameMap.get(editor.ownerId) || "-"
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="建立時間">{{
                formatDateTime(activeRecord.createdAt)
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="最後更新">{{
                formatDateTime(activeRecord.updatedAt)
              }}</ElDescriptionsItem>
            </ElDescriptions>

            <div class="mt-3 flex flex-wrap gap-2">
              <ElButton
                v-if="activeRecord.accountId"
                @click="
                  goToRelated('account-detail', { accountId: activeRecord.accountId })
                "
              >
                前往客戶
              </ElButton>
              <ElButton
                v-if="activeRecord.opportunityId"
                @click="
                  goToRelated('opportunity-detail', {
                    opportunityId: activeRecord.opportunityId,
                  })
                "
              >
                前往商機
              </ElButton>
              <ElButton
                v-if="activeRecord.projectId"
                @click="
                  goToRelated('project-detail', { projectId: activeRecord.projectId })
                "
              >
                前往專案
              </ElButton>
              <ElButton @click="goToRelated('finance-revenue-records', {})"
                >前往營收資料</ElButton
              >
            </div>
          </ElCard>

          <ElCard shadow="never">
            <template #header
              ><span class="text-sm font-semibold text-slate-800"
                >金額資訊</span
              ></template
            >
            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <ElFormItem label="來源金額">
                <ElInputNumber v-model="editor.sourceAmount" :min="0" class="!w-full" />
              </ElFormItem>
              <ElFormItem label="可分潤金額">
                <ElInputNumber
                  v-model="editor.shareableAmount"
                  :min="0"
                  class="!w-full"
                  @change="onEditorShareableAmountChange"
                />
              </ElFormItem>
              <ElFormItem label="已分配總額">
                <ElInput
                  :model-value="formatCurrency(editorAllocation.allocated)"
                  readonly
                />
              </ElFormItem>
              <ElFormItem label="剩餘未分配金額">
                <ElInput
                  :model-value="formatCurrency(editorAllocation.remainingAmount)"
                  readonly
                />
              </ElFormItem>
            </div>

            <div class="mt-2 grid gap-2">
              <div class="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div class="flex h-full w-full">
                  <div
                    v-for="segment in editorPreviewSegments"
                    :key="segment.id"
                    class="h-full"
                    :style="{
                      width: `${Math.max(Math.min(segment.ratio, 100), 0)}%`,
                      backgroundColor: segment.color,
                    }"
                  />
                </div>
              </div>
              <p class="text-xs text-slate-600">
                已分配 {{ editorAllocation.allocatedRatio.toFixed(1) }}% / 剩餘
                {{ editorAllocation.remainingRatio.toFixed(1) }}%
              </p>
              <p
                v-if="editorAllocation.isOverflow"
                class="text-xs font-medium text-rose-600"
              >
                分配比例已超過 100%，請調整分潤明細。
              </p>
            </div>
          </ElCard>

          <ElCard shadow="never">
            <template #header>
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-slate-800">分潤明細</span>
                <ElButton size="small" type="primary" plain @click="addEditorDetailLine"
                  >新增對象</ElButton
                >
              </div>
            </template>
            <div class="grid gap-3">
              <article
                v-for="(line, index) in editor.details"
                :key="line.id"
                class="rounded-xl border border-slate-200 p-3"
              >
                <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <ElFormItem label="分潤對象">
                    <ElInput v-model="line.targetName" placeholder="姓名 / 夥伴名稱" />
                  </ElFormItem>
                  <ElFormItem label="角色">
                    <ElInput v-model="line.role" placeholder="例如：合作夥伴、業務" />
                  </ElFormItem>
                  <ElFormItem label="方式">
                    <ElSelect
                      v-model="line.method"
                      @change="onEditorDetailMethodChange(line)"
                    >
                      <ElOption label="比例" value="ratio" />
                      <ElOption label="固定金額" value="fixed" />
                    </ElSelect>
                  </ElFormItem>
                  <ElFormItem label="比例 (%)">
                    <ElInputNumber
                      v-model="line.ratio"
                      :min="0"
                      :max="999"
                      :step="0.1"
                      class="!w-full"
                      @change="onEditorDetailRatioChange(line)"
                    />
                  </ElFormItem>
                  <ElFormItem label="金額">
                    <ElInputNumber
                      v-model="line.amount"
                      :min="0"
                      class="!w-full"
                      @change="onEditorDetailAmountChange(line)"
                    />
                  </ElFormItem>
                  <ElFormItem label="備註">
                    <ElInput v-model="line.note" placeholder="說明" />
                  </ElFormItem>
                </div>
                <div class="flex justify-end">
                  <ElButton text type="danger" @click="removeEditorDetailLine(index)"
                    >刪除</ElButton
                  >
                </div>
              </article>
            </div>
          </ElCard>

          <ElCard shadow="never">
            <template #header
              ><span class="text-sm font-semibold text-slate-800"
                >狀態資訊</span
              ></template
            >
            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <ElFormItem label="分潤狀態">
                <ElSelect v-model="editor.shareStatus">
                  <ElOption
                    v-for="(meta, key) in shareStatusMap"
                    :key="`editor-share-${key}`"
                    :label="meta.label"
                    :value="key"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem label="發放狀態">
                <ElSelect v-model="editor.payoutStatus">
                  <ElOption
                    v-for="(meta, key) in payoutStatusMap"
                    :key="`editor-payout-${key}`"
                    :label="meta.label"
                    :value="key"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem label="負責人">
                <ElSelect v-model="editor.ownerId">
                  <ElOption
                    v-for="item in ownerOptions.filter(
                      (option) => option.value !== 'all'
                    )"
                    :key="`editor-owner-${item.value}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem label="預計發放日">
                <ElDatePicker
                  v-model="editor.payoutExpectedAt"
                  type="date"
                  value-format="YYYY-MM-DD"
                  class="!w-full"
                />
              </ElFormItem>
              <ElFormItem label="實際發放日">
                <ElDatePicker
                  v-model="editor.payoutAt"
                  type="date"
                  value-format="YYYY-MM-DD"
                  class="!w-full"
                />
              </ElFormItem>
            </div>
          </ElCard>

          <ElCard shadow="never">
            <template #header
              ><span class="text-sm font-semibold text-slate-800"
                >備註與異常</span
              ></template
            >
            <ElForm label-position="top" class="grid gap-2">
              <ElFormItem label="異常原因">
                <ElInput v-model="editor.exceptionReason" type="textarea" :rows="2" />
              </ElFormItem>
              <ElFormItem label="備註">
                <ElInput v-model="editor.notes" type="textarea" :rows="3" />
              </ElFormItem>
            </ElForm>

            <div class="flex justify-end border-t border-slate-200 pt-3">
              <ElButton type="primary" @click="saveEditor">儲存更新</ElButton>
            </div>
          </ElCard>
        </section>
      </template>
    </ElDrawer>

    <ElDrawer
      v-model="createDrawerOpen"
      size="48%"
      title="新增分潤"
      :destroy-on-close="false"
    >
      <ElForm label-position="top" class="grid gap-3">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <ElFormItem label="分潤編號">
            <ElInput v-model="creator.shareNo" />
          </ElFormItem>
          <ElFormItem label="客戶">
            <ElSelect v-model="creator.accountId" clearable>
              <ElOption
                v-for="item in accountOptions.filter((option) => option.value !== 'all')"
                :key="`create-account-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="商機">
            <ElSelect v-model="creator.opportunityId" clearable>
              <ElOption
                v-for="item in opportunityOptions.filter(
                  (option) => option.value !== 'all'
                )"
                :key="`create-opportunity-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="專案">
            <ElSelect v-model="creator.projectId" clearable>
              <ElOption
                v-for="item in projectOptions.filter((option) => option.value !== 'all')"
                :key="`create-project-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="分潤來源類型">
            <ElSelect v-model="creator.sourceType">
              <ElOption
                v-for="item in sourceTypeOptions.filter(
                  (option) => option.value !== 'all'
                )"
                :key="`create-source-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="負責人">
            <ElSelect v-model="creator.ownerId">
              <ElOption
                v-for="item in ownerOptions.filter((option) => option.value !== 'all')"
                :key="`create-owner-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="來源金額">
            <ElInputNumber v-model="creator.sourceAmount" :min="0" class="!w-full" />
          </ElFormItem>
          <ElFormItem label="可分潤金額">
            <ElInputNumber
              v-model="creator.shareableAmount"
              :min="0"
              class="!w-full"
              @change="onCreateShareableAmountChange"
            />
          </ElFormItem>
          <ElFormItem label="預計發放日">
            <ElDatePicker
              v-model="creator.payoutExpectedAt"
              type="date"
              value-format="YYYY-MM-DD"
              class="!w-full"
            />
          </ElFormItem>
        </div>

        <ElFormItem label="分潤來源摘要">
          <ElInput v-model="creator.sourceSummary" placeholder="例如：Q2 儲值檔期分潤" />
        </ElFormItem>

        <ElCard shadow="never">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-slate-800">分潤明細</span>
              <ElButton size="small" type="primary" plain @click="addCreateDetailLine"
                >新增對象</ElButton
              >
            </div>
          </template>
          <div class="grid gap-3">
            <article
              v-for="(line, index) in creator.details"
              :key="line.id"
              class="rounded-xl border border-slate-200 p-3"
            >
              <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <ElFormItem label="對象">
                  <ElInput
                    v-model="line.targetName"
                    placeholder="姓名 / 夥伴名稱"
                    list="target-suggestions"
                  />
                  <datalist id="target-suggestions">
                    <option
                      v-for="name in targetOptions"
                      :key="`target-${name}`"
                      :value="name"
                    />
                  </datalist>
                </ElFormItem>
                <ElFormItem label="角色">
                  <ElInput v-model="line.role" placeholder="角色" />
                </ElFormItem>
                <ElFormItem label="方式">
                  <ElSelect
                    v-model="line.method"
                    @change="onCreateDetailMethodChange(line)"
                  >
                    <ElOption label="比例" value="ratio" />
                    <ElOption label="固定金額" value="fixed" />
                  </ElSelect>
                </ElFormItem>
                <ElFormItem label="比例 (%)">
                  <ElInputNumber
                    v-model="line.ratio"
                    :min="0"
                    :max="999"
                    :step="0.1"
                    class="!w-full"
                    @change="onCreateDetailRatioChange(line)"
                  />
                </ElFormItem>
                <ElFormItem label="金額">
                  <ElInputNumber
                    v-model="line.amount"
                    :min="0"
                    class="!w-full"
                    @change="onCreateDetailAmountChange(line)"
                  />
                </ElFormItem>
              </div>
              <div class="flex justify-end">
                <ElButton text type="danger" @click="removeCreateDetailLine(index)"
                  >刪除</ElButton
                >
              </div>
            </article>
          </div>
        </ElCard>

        <ElFormItem label="備註">
          <ElInput v-model="creator.notes" type="textarea" :rows="2" />
        </ElFormItem>

        <div class="flex justify-end gap-2 border-t border-slate-200 pt-3">
          <ElButton @click="createDrawerOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitCreate">建立</ElButton>
        </div>
      </ElForm>
    </ElDrawer>
  </div>
</template>

<style scoped>
:deep(.el-form-item) {
  margin-bottom: 12px;
}

.profit-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}
</style>
