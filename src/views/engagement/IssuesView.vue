<script setup>
import { computed, reactive, ref, watch } from "vue";
import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElDescriptions,
  ElDescriptionsItem,
  ElDrawer,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessageBox,
  ElNotification,
  ElOption,
  ElPagination,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
} from "element-plus";
import {
  CirclePlus,
  Download,
  Filter,
  MoreFilled,
  Refresh,
  Search,
} from "@element-plus/icons-vue";
import {
  accountOptions,
  activityDirectory,
  issuePriorityMap,
  issueSeverityMap,
  issueStatusMap,
  issueTypeMap,
  opportunityOptions,
  partnerDirectory,
  projectOptions,
  supportTicketOptions,
  userList,
} from "../../data/issues";
import { useIssuesStore } from "../../composables/useIssuesStore";

const {
  batchSetStatus,
  createIssue,
  duplicateIssue,
  getById,
  getNextNo,
  issues,
  setIssueStatus,
  updateIssue,
  toTimestamp,
} = useIssuesStore();

const loading = ref(false);
const filterPanelOpen = ref(false);
const quickTab = ref("all");
const currentPage = ref(1);
const pageSize = ref(10);
const selectedRows = ref([]);

const detailDrawerOpen = ref(false);
const createDrawerOpen = ref(false);
const activeId = ref("");
const responseMap = reactive({});

const sortState = reactive({
  prop: "updatedAt",
  order: "descending",
});

const filters = reactive({
  keyword: "",
  issueType: "all",
  status: "all",
  ownerId: "all",
  priority: "all",
  severity: "all",
  customerId: "all",
  opportunityId: "all",
  projectId: "all",
  partnerId: "all",
  activityId: "all",
  createdAtRange: [],
  isImportant: "all",
});

function createQuickCreateForm() {
  return {
    issueNo: getNextNo(),
    title: "",
    issueType: "complaint",
    status: "open",
    priority: "medium",
    severity: "medium",
    ownerId: "u-001",
    customerId: "",
    opportunityId: "",
    projectId: "",
    activityId: "",
    partnerId: "",
    supportTicketId: "",
    dueAt: "",
    summary: "",
    description: "",
    isImportant: false,
  };
}

function createDetailForm() {
  return {
    issueNo: "",
    title: "",
    issueType: "complaint",
    status: "open",
    priority: "medium",
    severity: "medium",
    ownerId: "",
    teamName: "",
    customerId: "",
    opportunityId: "",
    projectId: "",
    activityId: "",
    partnerId: "",
    supportTicketId: "",
    reportedAt: "",
    expectedReplyAt: "",
    dueAt: "",
    actualCompletedAt: "",
    summary: "",
    description: "",
    impactScope: "",
    temporaryAction: "",
    resolutionNote: "",
    followUpNote: "",
    closingNote: "",
    tagsInput: "",
    attachmentsInput: "",
    notes: "",
    isImportant: false,
  };
}

const quickCreateForm = reactive(createQuickCreateForm());
const detailForm = reactive(createDetailForm());

const quickTabs = [
  { value: "all", label: "全部" },
  { value: "open", label: "待處理" },
  { value: "in_progress", label: "處理中" },
  { value: "pending_reply", label: "待回覆" },
  { value: "pending_confirmation", label: "待對方確認" },
  { value: "resolved", label: "已結案" },
  { value: "overdue", label: "已逾期" },
  { value: "high_severity", label: "高嚴重度" },
];

const responseTypeMap = {
  external_reply: { label: "對外回應", type: "primary" },
  internal_note: { label: "內部備註", type: "info" },
};

function createResponseForm() {
  return {
    type: "external_reply",
    content: "",
    followUpRequired: false,
    followUpAt: "",
  };
}

const responseForm = reactive(createResponseForm());

const yesNoOptions = [
  { value: "all", label: "全部" },
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
];

const issueTypeOptions = [
  { value: "all", label: "全部類型" },
  ...Object.entries(issueTypeMap).map(([value, meta]) => ({ value, label: meta.label })),
];

const issueStatusOptions = [
  { value: "all", label: "全部狀態" },
  ...Object.entries(issueStatusMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const priorityOptions = [
  { value: "all", label: "全部優先級" },
  ...Object.entries(issuePriorityMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const severityOptions = [
  { value: "all", label: "全部嚴重度" },
  ...Object.entries(issueSeverityMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const ownerOptions = [
  { value: "all", label: "全部負責人" },
  ...userList
    .filter((item) => item.status === "active")
    .map((item) => ({ value: item.id, label: item.name })),
];

const ownerSelectOptions = userList
  .filter((item) => item.status === "active")
  .map((item) => ({ value: item.id, label: item.name }));

const customerFilterOptions = [
  { value: "all", label: "全部客戶" },
  ...accountOptions.map((item) => ({ value: item.id, label: item.name })),
];

const opportunityFilterOptions = [
  { value: "all", label: "全部商機" },
  ...opportunityOptions.map((item) => ({ value: item.id, label: item.name })),
];

const projectFilterOptions = [
  { value: "all", label: "全部專案" },
  ...projectOptions.map((item) => ({ value: item.id, label: item.name })),
];

const partnerFilterOptions = [
  { value: "all", label: "全部夥伴" },
  ...partnerDirectory.map((item) => ({ value: item.id, label: item.name })),
];

const activityFilterOptions = [
  { value: "all", label: "全部活動" },
  ...activityDirectory.map((item) => ({ value: item.id, label: item.name })),
];

const detailIssue = computed(() => getById(activeId.value));

function notify(message, title = "已更新", type = "success") {
  ElNotification({ title, message, type, position: "top-right" });
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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

function toPlainArray(input) {
  return String(input || "")
    .split(/[、,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isDateWithinRange(value, range) {
  const [start, end] = range ?? [];
  if (!start || !end) {
    return true;
  }

  const time = toTimestamp(value);
  if (!time) {
    return false;
  }

  return time >= toTimestamp(start) && time <= toTimestamp(end) + 24 * 60 * 60 * 1000 - 1;
}

function isWithinDays(value, days) {
  const time = toTimestamp(value);
  if (!time) {
    return false;
  }

  const now = Date.now();
  const diff = Math.floor((now - time) / (24 * 60 * 60 * 1000));
  return diff >= 0 && diff <= days;
}

function ensureIssueResponses(issueId) {
  if (!issueId) {
    return [];
  }

  if (!Array.isArray(responseMap[issueId])) {
    const fallbackResponses = getById(issueId)?.responses;
    responseMap[issueId] = Array.isArray(fallbackResponses) ? [...fallbackResponses] : [];
  }

  return responseMap[issueId];
}

function getIssueResponses(issueId) {
  return ensureIssueResponses(issueId);
}

function getLatestResponse(issueId) {
  return getIssueResponses(issueId)[0] || null;
}

const activeIssueResponses = computed(() => getIssueResponses(activeId.value));

const tabCounts = computed(() => {
  const all = issues.value;

  return {
    all: all.length,
    open: all.filter((item) => item.status === "open").length,
    in_progress: all.filter((item) => item.status === "in_progress").length,
    pending_reply: all.filter((item) => item.status === "pending_reply").length,
    pending_confirmation: all.filter((item) => item.status === "pending_confirmation").length,
    resolved: all.filter((item) => item.status === "resolved").length,
    overdue: all.filter((item) => item.isOverdue).length,
    high_severity: all.filter((item) => ["high", "critical"].includes(item.severity))
      .length,
  };
});

const kpiCards = computed(() => {
  const total = issues.value.length;
  const openCount = issues.value.filter((item) => item.status === "open").length;
  const inProgress = issues.value.filter((item) => item.status === "in_progress").length;
  const overdue = issues.value.filter((item) => item.isOverdue).length;
  const thisWeekNew = issues.value.filter((item) => isWithinDays(item.createdAt, 7))
    .length;

  return [
    { label: "Issue 總數", value: total },
    { label: "待處理", value: openCount },
    { label: "處理中", value: inProgress },
    { label: "已逾期", value: overdue },
    { label: "本週新增", value: thisWeekNew },
  ];
});

const filteredIssues = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return issues.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.title.toLowerCase().includes(keyword) ||
      item.issueNo.toLowerCase().includes(keyword) ||
      String(item.summary || "")
        .toLowerCase()
        .includes(keyword) ||
      String(item.description || "")
        .toLowerCase()
        .includes(keyword) ||
      String(item.customerName || "")
        .toLowerCase()
        .includes(keyword);

    const matchesType =
      filters.issueType === "all" || item.issueType === filters.issueType;
    const matchesStatus = filters.status === "all" || item.status === filters.status;
    const matchesOwner = filters.ownerId === "all" || item.ownerId === filters.ownerId;
    const matchesPriority =
      filters.priority === "all" || item.priority === filters.priority;
    const matchesSeverity =
      filters.severity === "all" || item.severity === filters.severity;
    const matchesCustomer =
      filters.customerId === "all" || item.customerId === filters.customerId;
    const matchesOpportunity =
      filters.opportunityId === "all" || item.opportunityId === filters.opportunityId;
    const matchesProject =
      filters.projectId === "all" || item.projectId === filters.projectId;
    const matchesPartner =
      filters.partnerId === "all" || item.partnerId === filters.partnerId;
    const matchesActivity =
      filters.activityId === "all" || item.activityId === filters.activityId;
    const matchesCreatedAt = isDateWithinRange(item.createdAt, filters.createdAtRange);

    const matchesImportant =
      filters.isImportant === "all" ||
      (filters.isImportant === "yes" ? item.isImportant : !item.isImportant);

    const matchesTab =
      quickTab.value === "all" ||
      (quickTab.value === "open" && item.status === "open") ||
      (quickTab.value === "in_progress" && item.status === "in_progress") ||
      (quickTab.value === "pending_reply" && item.status === "pending_reply") ||
      (quickTab.value === "pending_confirmation" &&
        item.status === "pending_confirmation") ||
      (quickTab.value === "resolved" && item.status === "resolved") ||
      (quickTab.value === "overdue" && item.isOverdue) ||
      (quickTab.value === "high_severity" &&
        ["high", "critical"].includes(item.severity));

    return (
      matchesKeyword &&
      matchesType &&
      matchesStatus &&
      matchesOwner &&
      matchesPriority &&
      matchesSeverity &&
      matchesCustomer &&
      matchesOpportunity &&
      matchesProject &&
      matchesPartner &&
      matchesActivity &&
      matchesCreatedAt &&
      matchesImportant &&
      matchesTab
    );
  });
});

const sortedIssues = computed(() => {
  const result = [...filteredIssues.value];
  const direction = sortState.order === "ascending" ? 1 : -1;

  return result.sort((a, b) => {
    if (["createdAt", "updatedAt", "dueAt"].includes(sortState.prop)) {
      return (
        (toTimestamp(a[sortState.prop]) - toTimestamp(b[sortState.prop])) * direction
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

const pagedIssues = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedIssues.value.slice(start, start + pageSize.value);
});

function handleSortChange({ prop, order }) {
  sortState.prop = prop || "updatedAt";
  sortState.order = order || "descending";
}

function handleSelectionChange(rows) {
  selectedRows.value = rows;
}

function resetFilters() {
  filters.keyword = "";
  filters.issueType = "all";
  filters.status = "all";
  filters.ownerId = "all";
  filters.priority = "all";
  filters.severity = "all";
  filters.customerId = "all";
  filters.opportunityId = "all";
  filters.projectId = "all";
  filters.partnerId = "all";
  filters.activityId = "all";
  filters.createdAtRange = [];
  filters.isImportant = "all";
  quickTab.value = "all";
  currentPage.value = 1;
}

function hydrateDetailForm(record) {
  Object.assign(detailForm, createDetailForm());

  if (!record) {
    return;
  }

  Object.assign(detailForm, {
    issueNo: record.issueNo,
    title: record.title,
    issueType: record.issueType,
    status: record.status,
    priority: record.priority,
    severity: record.severity,
    ownerId: record.ownerId,
    teamName: record.teamName || "",
    customerId: record.customerId,
    opportunityId: record.opportunityId,
    projectId: record.projectId,
    activityId: record.activityId,
    partnerId: record.partnerId,
    supportTicketId: record.supportTicketId,
    reportedAt: record.reportedAt,
    expectedReplyAt: record.expectedReplyAt,
    dueAt: record.dueAt,
    actualCompletedAt: record.actualCompletedAt,
    summary: record.summary,
    description: record.description,
    impactScope: record.impactScope,
    temporaryAction: record.temporaryAction,
    resolutionNote: record.resolutionNote,
    followUpNote: record.followUpNote,
    closingNote: record.closingNote,
    tagsInput: (record.tags || []).join("、"),
    attachmentsInput: (record.attachments || []).join("、"),
    notes: record.notes || "",
    isImportant: Boolean(record.isImportant),
  });
}

function openDetail(record) {
  activeId.value = record.id;
  ensureIssueResponses(record.id);
  Object.assign(responseForm, createResponseForm());
  hydrateDetailForm(record);
  detailDrawerOpen.value = true;
}

function addResponse() {
  if (!activeId.value) {
    return;
  }

  if (!responseForm.content.trim()) {
    notify("請輸入回應內容", "缺少資訊", "warning");
    return;
  }

  if (responseForm.followUpRequired && !responseForm.followUpAt) {
    notify("請選擇 follow-up 日期", "缺少資訊", "warning");
    return;
  }

  const responses = ensureIssueResponses(activeId.value);
  responses.unshift({
    id: `rsp-${Date.now()}`,
    type: responseForm.type,
    content: responseForm.content.trim(),
    actorName: "林美雅",
    createdAt: new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date()),
    followUpRequired: responseForm.followUpRequired,
    followUpAt: responseForm.followUpRequired ? responseForm.followUpAt : "",
  });

  Object.assign(responseForm, createResponseForm());
  notify("回應紀錄已新增");
}

function saveDetail() {
  if (!activeId.value) {
    return;
  }

  if (!detailForm.title.trim()) {
    notify("請輸入 Issue 標題", "缺少資訊", "warning");
    return;
  }

  const updated = updateIssue(
    activeId.value,
    {
      issueNo: detailForm.issueNo.trim(),
      title: detailForm.title.trim(),
      issueType: detailForm.issueType,
      status: detailForm.status,
      priority: detailForm.priority,
      severity: detailForm.severity,
      ownerId: detailForm.ownerId,
      teamName: detailForm.teamName.trim(),
      customerId: detailForm.customerId,
      opportunityId: detailForm.opportunityId,
      projectId: detailForm.projectId,
      activityId: detailForm.activityId,
      partnerId: detailForm.partnerId,
      supportTicketId: detailForm.supportTicketId,
      reportedAt: detailForm.reportedAt,
      expectedReplyAt: detailForm.expectedReplyAt,
      dueAt: detailForm.dueAt,
      actualCompletedAt: detailForm.actualCompletedAt,
      summary: detailForm.summary.trim(),
      description: detailForm.description.trim(),
      impactScope: detailForm.impactScope.trim(),
      temporaryAction: detailForm.temporaryAction.trim(),
      resolutionNote: detailForm.resolutionNote.trim(),
      followUpNote: detailForm.followUpNote.trim(),
      closingNote: detailForm.closingNote.trim(),
      tags: toPlainArray(detailForm.tagsInput),
      attachments: toPlainArray(detailForm.attachmentsInput),
      notes: detailForm.notes.trim(),
      isImportant: detailForm.isImportant,
    },
    "林美雅"
  );

  if (!updated) {
    notify("儲存失敗，找不到 Issue", "錯誤", "error");
    return;
  }

  hydrateDetailForm(updated);
  notify(`${updated.title} 已更新`);
}

function openCreateDrawer() {
  Object.assign(quickCreateForm, createQuickCreateForm());
  createDrawerOpen.value = true;
}

function submitQuickCreate() {
  if (!quickCreateForm.title.trim()) {
    notify("請輸入 Issue 標題", "缺少資訊", "warning");
    return;
  }

  if (!quickCreateForm.ownerId) {
    notify("請選擇負責人", "缺少資訊", "warning");
    return;
  }

  const created = createIssue(
    {
      issueNo: quickCreateForm.issueNo,
      title: quickCreateForm.title.trim(),
      issueType: quickCreateForm.issueType,
      status: quickCreateForm.status,
      priority: quickCreateForm.priority,
      severity: quickCreateForm.severity,
      ownerId: quickCreateForm.ownerId,
      customerId: quickCreateForm.customerId,
      opportunityId: quickCreateForm.opportunityId,
      projectId: quickCreateForm.projectId,
      activityId: quickCreateForm.activityId,
      partnerId: quickCreateForm.partnerId,
      supportTicketId: quickCreateForm.supportTicketId,
      dueAt: quickCreateForm.dueAt,
      summary: quickCreateForm.summary.trim(),
      description: quickCreateForm.description.trim(),
      isImportant: quickCreateForm.isImportant,
    },
    "林美雅"
  );

  createDrawerOpen.value = false;
  notify(`${created.title} 已建立`);
}

function setStatusFromList(record, status) {
  const updated = setIssueStatus(record.id, status, "林美雅");
  if (!updated) {
    notify("更新狀態失敗", "錯誤", "error");
    return;
  }

  notify(`${record.title} 已更新為 ${issueStatusMap[status]?.label || status}`);
}

function toggleImportant(record) {
  updateIssue(record.id, { isImportant: !record.isImportant }, "林美雅");
  notify(record.isImportant ? "已取消重要標記" : "已標記為重要");
}

function duplicateFromList(record) {
  const created = duplicateIssue(record.id, "林美雅");
  if (!created) {
    notify("複製失敗", "錯誤", "error");
    return;
  }

  notify(`已建立複製 Issue：${created.title}`);
}

async function cancelIssue(record) {
  try {
    await ElMessageBox.confirm(`確認取消「${record.title}」？`, "取消 Issue", {
      confirmButtonText: "取消 Issue",
      cancelButtonText: "返回",
      type: "warning",
    });
  } catch {
    return;
  }

  setStatusFromList(record, "cancelled");
}

function batchResolve() {
  if (selectedRows.value.length === 0) {
    notify("請先勾選要操作的 Issue", "提醒", "warning");
    return;
  }

  batchSetStatus(
    selectedRows.value.map((item) => item.id),
    "resolved",
    "林美雅"
  );
  notify(`已批次結案 ${selectedRows.value.length} 筆 Issue`);
}

function batchPendingReply() {
  if (selectedRows.value.length === 0) {
    notify("請先勾選要操作的 Issue", "提醒", "warning");
    return;
  }

  batchSetStatus(
    selectedRows.value.map((item) => item.id),
    "pending_reply",
    "林美雅"
  );
  notify(`已批次調整 ${selectedRows.value.length} 筆為待回覆`);
}

function batchPendingConfirmation() {
  if (selectedRows.value.length === 0) {
    notify("請先勾選要操作的 Issue", "提醒", "warning");
    return;
  }

  batchSetStatus(
    selectedRows.value.map((item) => item.id),
    "pending_confirmation",
    "林美雅"
  );
  notify(`已批次調整 ${selectedRows.value.length} 筆為待對方確認`);
}

function convertToTask(record) {
  notify(`已建立轉任務入口：${record.title}`, "功能預留", "info");
}

function exportCsv() {
  const header = [
    "Issue 編號",
    "標題",
    "類型",
    "狀態",
    "優先級",
    "嚴重度",
    "關聯主體",
    "負責人",
    "建立時間",
    "預計完成日",
    "最後更新",
  ];

  const rows = sortedIssues.value.map((item) => [
    item.issueNo,
    item.title,
    issueTypeMap[item.issueType]?.label || item.issueType,
    issueStatusMap[item.status]?.label || item.status,
    issuePriorityMap[item.priority]?.label || item.priority,
    issueSeverityMap[item.severity]?.label || item.severity,
    item.relatedSummary,
    item.ownerName,
    item.createdAt,
    item.dueAt,
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
  anchor.download = `issues-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

watch(
  () => [
    filteredIssues.value.length,
    pageSize.value,
    quickTab.value,
    filters.keyword,
    filters.issueType,
    filters.status,
    filters.ownerId,
    filters.priority,
    filters.severity,
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
            客訴 / Issue
          </h1>
          <p class="text-sm text-slate-500">集中管理問題回報、客訴處理與後續追蹤</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElDropdown trigger="click">
            <ElButton :disabled="selectedRows.length === 0">批次操作</ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem @click="batchPendingReply">批次設為待回覆</ElDropdownItem>
                <ElDropdownItem @click="batchPendingConfirmation"
                  >批次設為待對方確認</ElDropdownItem
                >
                <ElDropdownItem @click="batchResolve">批次結案</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
          <ElButton :icon="Download" @click="exportCsv">匯出</ElButton>
          <ElButton type="primary" :icon="CirclePlus" @click="openCreateDrawer"
            >新增 Issue</ElButton
          >
        </div>
      </header>

      <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <article
          v-for="card in kpiCards"
          :key="card.label"
          class="rounded-2xl border border-slate-200 bg-white px-4 py-4"
        >
          <p class="text-xs text-slate-500">{{ card.label }}</p>
          <p class="mt-2 text-xl font-semibold text-slate-900">{{ card.value }}</p>
        </article>
      </section>

      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <ElTag round effect="plain">共 {{ sortedIssues.length }} 筆</ElTag>
          <div class="flex flex-wrap items-center gap-2">
            <ElInput
              v-model="filters.keyword"
              placeholder="搜尋標題 / 編號 / 描述 / 客戶"
              clearable
              class="!w-64"
            >
              <template #prefix><Search class="h-4 w-4 text-slate-400" /></template>
            </ElInput>
            <ElButton :icon="Filter" @click="filterPanelOpen = !filterPanelOpen"
              >篩選</ElButton
            >
            <ElButton :icon="Refresh" @click="resetFilters">重設</ElButton>
          </div>
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
              <ElSelect v-model="filters.issueType">
                <ElOption
                  v-for="item in issueTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.status">
                <ElOption
                  v-for="item in issueStatusOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.ownerId">
                <ElOption
                  v-for="item in ownerOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.priority">
                <ElOption
                  v-for="item in priorityOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.severity">
                <ElOption
                  v-for="item in severityOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.customerId">
                <ElOption
                  v-for="item in customerFilterOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.opportunityId">
                <ElOption
                  v-for="item in opportunityFilterOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.projectId">
                <ElOption
                  v-for="item in projectFilterOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.partnerId">
                <ElOption
                  v-for="item in partnerFilterOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.activityId">
                <ElOption
                  v-for="item in activityFilterOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElDatePicker
                v-model="filters.createdAtRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                start-placeholder="建立起日"
                end-placeholder="建立迄日"
                class="!w-full"
              />
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.isImportant">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`important-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </transition>

        <div class="border-t border-slate-200 px-6 pt-3">
          <ElTabs v-model="quickTab" class="issue-tabs">
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
          :data="pagedIssues"
          @selection-change="handleSelectionChange"
          @sort-change="handleSortChange"
        >
          <ElTableColumn type="selection" width="46" />

          <ElTableColumn label="Issue" min-width="260" sortable="custom" prop="title">
            <template #default="{ row }">
              <button type="button" class="grid gap-1 text-left" @click="openDetail(row)">
                <span class="font-semibold text-[#303133] hover:text-[#409eff]">{{
                  row.title
                }}</span>
                <span class="text-xs text-slate-500">{{ row.issueNo }}</span>
                <div class="flex flex-wrap gap-1">
                  <ElTag v-if="row.isImportant" size="small" type="danger" effect="light"
                    >重要</ElTag
                  >
                  <ElTag v-if="row.isOverdue" size="small" type="danger" effect="light"
                    >逾期</ElTag
                  >
                </div>
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="類型" min-width="120">
            <template #default="{ row }">
              <ElTag
                :type="issueTypeMap[row.issueType]?.type"
                size="small"
                effect="light"
              >
                {{ issueTypeMap[row.issueType]?.label || row.issueType }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="關聯主體" min-width="240" show-overflow-tooltip>
            <template #default="{ row }">{{ row.relatedSummary }}</template>
          </ElTableColumn>

          <ElTableColumn label="狀態" min-width="120">
            <template #default="{ row }">
              <ElTag :type="issueStatusMap[row.status]?.type" size="small" effect="light">
                {{ issueStatusMap[row.status]?.label || row.status }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="優先級 / 嚴重度" min-width="170">
            <template #default="{ row }">
              <div class="flex flex-wrap gap-1">
                <ElTag
                  :type="issuePriorityMap[row.priority]?.type"
                  size="small"
                  effect="light"
                >
                  {{ issuePriorityMap[row.priority]?.label || row.priority }}
                </ElTag>
                <ElTag
                  :type="issueSeverityMap[row.severity]?.type"
                  size="small"
                  effect="light"
                >
                  {{ issueSeverityMap[row.severity]?.label || row.severity }}
                </ElTag>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="負責人" min-width="120">
            <template #default="{ row }">{{ row.ownerName }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="建立時間"
            min-width="150"
            sortable="custom"
            prop="createdAt"
          >
            <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="預計完成日"
            min-width="140"
            sortable="custom"
            prop="dueAt"
          >
            <template #default="{ row }">
              <span :class="row.isOverdue ? 'text-rose-500 font-medium' : ''">{{
                formatDate(row.dueAt)
              }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn
            label="最後更新"
            min-width="150"
            sortable="custom"
            prop="updatedAt"
          >
            <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
          </ElTableColumn>

          <ElTableColumn label="最近回應" min-width="180">
            <template #default="{ row }">
              <template v-if="getLatestResponse(row.id)">
                <div class="grid gap-1">
                  <ElTag
                    size="small"
                    effect="light"
                    :type="responseTypeMap[getLatestResponse(row.id).type]?.type"
                  >
                    {{ responseTypeMap[getLatestResponse(row.id).type]?.label }}
                  </ElTag>
                  <span class="text-xs text-slate-500">
                    {{ formatDateTime(getLatestResponse(row.id).createdAt) }}
                  </span>
                </div>
              </template>
              <template v-else>-</template>
            </template>
          </ElTableColumn>

          <ElTableColumn label="操作" width="130" fixed="right">
            <template #default="{ row }">
              <div class="flex items-center justify-end gap-1">
                <ElButton text type="primary" @click="openDetail(row)">查看詳情</ElButton>
                <ElDropdown trigger="click">
                  <ElButton link :icon="MoreFilled" />
                  <template #dropdown>
                    <ElDropdownMenu>
                      <ElDropdownItem @click="setStatusFromList(row, 'open')"
                        >標記待處理</ElDropdownItem
                      >
                      <ElDropdownItem @click="setStatusFromList(row, 'in_progress')"
                        >標記處理中</ElDropdownItem
                      >
                      <ElDropdownItem @click="setStatusFromList(row, 'pending_reply')"
                        >標記待回覆</ElDropdownItem
                      >
                      <ElDropdownItem
                        @click="setStatusFromList(row, 'pending_confirmation')"
                        >標記待對方確認</ElDropdownItem
                      >
                      <ElDropdownItem @click="setStatusFromList(row, 'resolved')"
                        >標記已結案</ElDropdownItem
                      >
                      <ElDropdownItem @click="toggleImportant(row)">
                        {{ row.isImportant ? "取消重要" : "標記重要" }}
                      </ElDropdownItem>
                      <ElDropdownItem @click="convertToTask(row)">轉任務</ElDropdownItem>
                      <ElDropdownItem @click="duplicateFromList(row)"
                        >複製 Issue</ElDropdownItem
                      >
                      <ElDropdownItem @click="cancelIssue(row)"
                        >取消 Issue</ElDropdownItem
                      >
                    </ElDropdownMenu>
                  </template>
                </ElDropdown>
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
            :total="sortedIssues.length"
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
      size="52%"
      :destroy-on-close="false"
      title="Issue 詳情"
    >
      <template v-if="detailIssue">
        <section class="grid gap-4">
          <header class="grid gap-2">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="grid gap-2">
                <h2 class="text-xl font-semibold text-slate-900">
                  {{ detailIssue.title }}
                </h2>
                <p class="text-xs text-slate-500">{{ detailIssue.issueNo }}</p>
                <div class="flex flex-wrap items-center gap-2">
                  <ElTag :type="issueStatusMap[detailIssue.status]?.type" effect="light">
                    {{ issueStatusMap[detailIssue.status]?.label }}
                  </ElTag>
                  <ElTag
                    :type="issuePriorityMap[detailIssue.priority]?.type"
                    effect="light"
                  >
                    優先級：{{ issuePriorityMap[detailIssue.priority]?.label }}
                  </ElTag>
                  <ElTag
                    :type="issueSeverityMap[detailIssue.severity]?.type"
                    effect="light"
                  >
                    嚴重度：{{ issueSeverityMap[detailIssue.severity]?.label }}
                  </ElTag>
                  <ElTag v-if="detailIssue.isImportant" type="danger" effect="light"
                    >重要</ElTag
                  >
                </div>
              </div>

              <div class="flex items-center gap-2">
                <ElButton @click="convertToTask(detailIssue)">轉任務</ElButton>
                <ElButton type="primary" @click="saveDetail">儲存更新</ElButton>
              </div>
            </div>
          </header>

          <ElDescriptions :column="2" border class="uniform-descriptions">
            <ElDescriptionsItem label="建立人">{{
              detailIssue.createdBy || "-"
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="最後更新人">{{
              detailIssue.updatedBy || "-"
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="建立時間">{{
              formatDateTime(detailIssue.createdAt)
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="最後更新時間">{{
              formatDateTime(detailIssue.updatedAt)
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="關聯摘要" :span="2">{{
              detailIssue.relatedSummary
            }}</ElDescriptionsItem>
          </ElDescriptions>

          <ElCard shadow="never">
            <template #header
              ><span class="text-sm font-semibold text-slate-800"
                >基本資訊</span
              ></template
            >
            <ElForm label-position="top" class="grid gap-3">
              <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <ElFormItem label="Issue 標題"
                  ><ElInput v-model="detailForm.title"
                /></ElFormItem>
                <ElFormItem label="Issue 編號"
                  ><ElInput v-model="detailForm.issueNo"
                /></ElFormItem>
                <ElFormItem label="負責人">
                  <ElSelect v-model="detailForm.ownerId">
                    <ElOption
                      v-for="item in ownerSelectOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </ElSelect>
                </ElFormItem>
                <ElFormItem label="Issue 類型">
                  <ElSelect v-model="detailForm.issueType">
                    <ElOption
                      v-for="(meta, key) in issueTypeMap"
                      :key="key"
                      :label="meta.label"
                      :value="key"
                    />
                  </ElSelect>
                </ElFormItem>
                <ElFormItem label="狀態">
                  <ElSelect v-model="detailForm.status">
                    <ElOption
                      v-for="(meta, key) in issueStatusMap"
                      :key="key"
                      :label="meta.label"
                      :value="key"
                    />
                  </ElSelect>
                </ElFormItem>
                <ElFormItem label="團隊 / 部門"
                  ><ElInput v-model="detailForm.teamName"
                /></ElFormItem>
                <ElFormItem label="優先級">
                  <ElSelect v-model="detailForm.priority">
                    <ElOption
                      v-for="(meta, key) in issuePriorityMap"
                      :key="key"
                      :label="meta.label"
                      :value="key"
                    />
                  </ElSelect>
                </ElFormItem>
                <ElFormItem label="嚴重度">
                  <ElSelect v-model="detailForm.severity">
                    <ElOption
                      v-for="(meta, key) in issueSeverityMap"
                      :key="key"
                      :label="meta.label"
                      :value="key"
                    />
                  </ElSelect>
                </ElFormItem>
                <ElFormItem label="重要 Issue"
                  ><ElSwitch v-model="detailForm.isImportant"
                /></ElFormItem>
              </div>

              <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <ElFormItem label="回報日期">
                  <ElDatePicker
                    v-model="detailForm.reportedAt"
                    type="date"
                    value-format="YYYY-MM-DD"
                    class="!w-full"
                  />
                </ElFormItem>
                <ElFormItem label="預計回覆日">
                  <ElDatePicker
                    v-model="detailForm.expectedReplyAt"
                    type="date"
                    value-format="YYYY-MM-DD"
                    class="!w-full"
                  />
                </ElFormItem>
                <ElFormItem label="預計完成日">
                  <ElDatePicker
                    v-model="detailForm.dueAt"
                    type="date"
                    value-format="YYYY-MM-DD"
                    class="!w-full"
                  />
                </ElFormItem>
                <ElFormItem label="實際完成日">
                  <ElDatePicker
                    v-model="detailForm.actualCompletedAt"
                    type="date"
                    value-format="YYYY-MM-DD"
                    class="!w-full"
                  />
                </ElFormItem>
              </div>
            </ElForm>
          </ElCard>

          <ElCard shadow="never">
            <template #header
              ><span class="text-sm font-semibold text-slate-800"
                >關聯資料</span
              ></template
            >
            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <ElFormItem label="客戶"
                ><ElSelect v-model="detailForm.customerId" clearable
                  ><ElOption
                    v-for="item in accountOptions"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id" /></ElSelect
              ></ElFormItem>
              <ElFormItem label="商機"
                ><ElSelect v-model="detailForm.opportunityId" clearable
                  ><ElOption
                    v-for="item in opportunityOptions"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id" /></ElSelect
              ></ElFormItem>
              <ElFormItem label="專案"
                ><ElSelect v-model="detailForm.projectId" clearable
                  ><ElOption
                    v-for="item in projectOptions"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id" /></ElSelect
              ></ElFormItem>
              <ElFormItem label="活動"
                ><ElSelect v-model="detailForm.activityId" clearable
                  ><ElOption
                    v-for="item in activityDirectory"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id" /></ElSelect
              ></ElFormItem>
              <ElFormItem label="夥伴"
                ><ElSelect v-model="detailForm.partnerId" clearable
                  ><ElOption
                    v-for="item in partnerDirectory"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id" /></ElSelect
              ></ElFormItem>
              <ElFormItem label="支援案件"
                ><ElSelect v-model="detailForm.supportTicketId" clearable
                  ><ElOption
                    v-for="item in supportTicketOptions"
                    :key="item.id"
                    :label="item.title"
                    :value="item.id" /></ElSelect
              ></ElFormItem>
            </div>
          </ElCard>

          <ElCard shadow="never">
            <template #header
              ><span class="text-sm font-semibold text-slate-800">內容</span></template
            >
            <div class="grid gap-3">
              <ElFormItem label="問題摘要"
                ><ElInput v-model="detailForm.summary" type="textarea" :rows="2"
              /></ElFormItem>
              <ElFormItem label="問題描述"
                ><ElInput v-model="detailForm.description" type="textarea" :rows="3"
              /></ElFormItem>
              <ElFormItem label="影響範圍"
                ><ElInput v-model="detailForm.impactScope" type="textarea" :rows="2"
              /></ElFormItem>
              <ElFormItem label="臨時處置"
                ><ElInput v-model="detailForm.temporaryAction" type="textarea" :rows="2"
              /></ElFormItem>
              <ElFormItem label="處理說明"
                ><ElInput v-model="detailForm.resolutionNote" type="textarea" :rows="2"
              /></ElFormItem>
              <ElFormItem label="後續追蹤"
                ><ElInput v-model="detailForm.followUpNote" type="textarea" :rows="2"
              /></ElFormItem>
              <ElFormItem label="結案說明"
                ><ElInput v-model="detailForm.closingNote" type="textarea" :rows="2"
              /></ElFormItem>
            </div>
          </ElCard>

          <ElCard shadow="never">
            <template #header
              ><span class="text-sm font-semibold text-slate-800">回應紀錄</span></template
            >
            <div class="grid gap-4">
              <section class="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div class="grid gap-3 md:grid-cols-2">
                  <ElFormItem label="回應類型">
                    <ElSelect v-model="responseForm.type">
                      <ElOption
                        v-for="(meta, key) in responseTypeMap"
                        :key="key"
                        :label="meta.label"
                        :value="key"
                      />
                    </ElSelect>
                  </ElFormItem>
                  <ElFormItem label="需要 follow-up">
                    <ElSwitch v-model="responseForm.followUpRequired" />
                  </ElFormItem>
                  <ElFormItem
                    v-if="responseForm.followUpRequired"
                    label="follow-up 日期"
                    class="md:col-span-2"
                  >
                    <ElDatePicker
                      v-model="responseForm.followUpAt"
                      type="date"
                      value-format="YYYY-MM-DD"
                      class="!w-full"
                    />
                  </ElFormItem>
                  <ElFormItem label="回應內容" class="md:col-span-2">
                    <ElInput v-model="responseForm.content" type="textarea" :rows="3" />
                  </ElFormItem>
                </div>
                <div class="flex justify-end">
                  <ElButton type="primary" @click="addResponse">新增回應</ElButton>
                </div>
              </section>

              <section class="grid gap-3">
                <article
                  v-for="reply in activeIssueResponses"
                  :key="reply.id"
                  class="rounded-xl border border-slate-100 px-3 py-2"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <ElTag :type="responseTypeMap[reply.type]?.type" size="small" effect="light">
                        {{ responseTypeMap[reply.type]?.label || reply.type }}
                      </ElTag>
                      <span class="text-xs text-slate-500">回覆人：{{ reply.actorName }}</span>
                    </div>
                    <span class="text-xs text-slate-500">{{ formatDateTime(reply.createdAt) }}</span>
                  </div>
                  <p class="mt-2 text-sm text-slate-700 whitespace-pre-line">{{ reply.content }}</p>
                  <p class="mt-1 text-xs" :class="reply.followUpRequired ? 'text-amber-600' : 'text-slate-500'">
                    follow-up：{{ reply.followUpRequired ? reply.followUpAt || "待安排" : "不需要" }}
                  </p>
                </article>
                <p v-if="activeIssueResponses.length === 0" class="text-sm text-slate-500">-</p>
              </section>
            </div>
          </ElCard>

          <ElCard shadow="never">
            <template #header
              ><span class="text-sm font-semibold text-slate-800"
                >附件與備註</span
              ></template
            >
            <div class="grid gap-3">
              <ElFormItem label="標籤"
                ><ElInput v-model="detailForm.tagsInput" placeholder="以頓號或逗號分隔"
              /></ElFormItem>
              <ElFormItem label="附件"
                ><ElInput
                  v-model="detailForm.attachmentsInput"
                  placeholder="以頓號或逗號分隔"
              /></ElFormItem>
              <ElFormItem label="備註"
                ><ElInput v-model="detailForm.notes" type="textarea" :rows="2"
              /></ElFormItem>
            </div>
          </ElCard>

          <ElCard shadow="never">
            <template #header
              ><span class="text-sm font-semibold text-slate-800">歷程</span></template
            >
            <div class="grid gap-3">
              <article
                v-for="line in detailIssue.timeline"
                :key="line.id"
                class="rounded-xl border border-slate-100 px-3 py-2"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p class="text-sm font-medium text-slate-800">{{ line.title }}</p>
                  <p class="text-xs text-slate-500">
                    {{ formatDateTime(line.occurredAt) }}
                  </p>
                </div>
                <p class="mt-1 text-xs text-slate-600">{{ line.description || "-" }}</p>
                <p class="mt-1 text-xs text-slate-500">
                  操作人：{{ line.actorName || "-" }}
                </p>
              </article>
            </div>
          </ElCard>
        </section>
      </template>
    </ElDrawer>

    <ElDrawer
      v-model="createDrawerOpen"
      size="42%"
      :destroy-on-close="false"
      title="快速建立 Issue"
    >
      <ElForm label-position="top" class="grid gap-3">
        <div class="grid gap-3 md:grid-cols-2">
          <ElFormItem label="Issue 標題"
            ><ElInput v-model="quickCreateForm.title"
          /></ElFormItem>
          <ElFormItem label="Issue 編號"
            ><ElInput v-model="quickCreateForm.issueNo"
          /></ElFormItem>
          <ElFormItem label="Issue 類型">
            <ElSelect v-model="quickCreateForm.issueType">
              <ElOption
                v-for="(meta, key) in issueTypeMap"
                :key="key"
                :label="meta.label"
                :value="key"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="負責人">
            <ElSelect v-model="quickCreateForm.ownerId">
              <ElOption
                v-for="item in ownerSelectOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="優先級">
            <ElSelect v-model="quickCreateForm.priority">
              <ElOption
                v-for="(meta, key) in issuePriorityMap"
                :key="key"
                :label="meta.label"
                :value="key"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="嚴重度">
            <ElSelect v-model="quickCreateForm.severity">
              <ElOption
                v-for="(meta, key) in issueSeverityMap"
                :key="key"
                :label="meta.label"
                :value="key"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="客戶"
            ><ElSelect v-model="quickCreateForm.customerId" clearable
              ><ElOption
                v-for="item in accountOptions"
                :key="item.id"
                :label="item.name"
                :value="item.id" /></ElSelect
          ></ElFormItem>
          <ElFormItem label="商機"
            ><ElSelect v-model="quickCreateForm.opportunityId" clearable
              ><ElOption
                v-for="item in opportunityOptions"
                :key="item.id"
                :label="item.name"
                :value="item.id" /></ElSelect
          ></ElFormItem>
          <ElFormItem label="專案"
            ><ElSelect v-model="quickCreateForm.projectId" clearable
              ><ElOption
                v-for="item in projectOptions"
                :key="item.id"
                :label="item.name"
                :value="item.id" /></ElSelect
          ></ElFormItem>
          <ElFormItem label="活動"
            ><ElSelect v-model="quickCreateForm.activityId" clearable
              ><ElOption
                v-for="item in activityDirectory"
                :key="item.id"
                :label="item.name"
                :value="item.id" /></ElSelect
          ></ElFormItem>
          <ElFormItem label="夥伴"
            ><ElSelect v-model="quickCreateForm.partnerId" clearable
              ><ElOption
                v-for="item in partnerDirectory"
                :key="item.id"
                :label="item.name"
                :value="item.id" /></ElSelect
          ></ElFormItem>
          <ElFormItem label="支援案件"
            ><ElSelect v-model="quickCreateForm.supportTicketId" clearable
              ><ElOption
                v-for="item in supportTicketOptions"
                :key="item.id"
                :label="item.title"
                :value="item.id" /></ElSelect
          ></ElFormItem>
          <ElFormItem label="預計完成日"
            ><ElDatePicker
              v-model="quickCreateForm.dueAt"
              type="date"
              value-format="YYYY-MM-DD"
              class="!w-full"
          /></ElFormItem>
          <ElFormItem label="重要 Issue"
            ><ElSwitch v-model="quickCreateForm.isImportant"
          /></ElFormItem>
        </div>

        <ElFormItem label="問題摘要"
          ><ElInput v-model="quickCreateForm.summary" type="textarea" :rows="2"
        /></ElFormItem>
        <ElFormItem label="問題描述"
          ><ElInput v-model="quickCreateForm.description" type="textarea" :rows="3"
        /></ElFormItem>

        <div class="flex justify-end gap-2 border-t border-slate-200 pt-3">
          <ElButton @click="createDrawerOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitQuickCreate">建立</ElButton>
        </div>
      </ElForm>
    </ElDrawer>
  </div>
</template>

<style scoped>
:deep(.el-form-item) {
  margin-bottom: 12px;
}

:deep(.uniform-descriptions .el-descriptions__body table) {
  width: 100%;
  table-layout: fixed;
}

.issue-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}
</style>
