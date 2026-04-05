<script setup>
import { computed, onActivated, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ElButton,
  ElDatePicker,
  ElDrawer,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessageBox,
  ElNotification,
  ElOption,
  ElPagination,
  ElProgress,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";
import {
  CirclePlus,
  Download,
  Filter,
  MoreFilled,
  Refresh,
  Search,
  Setting,
} from "@element-plus/icons-vue";
import { useUsersStore } from "../../composables/useUsersStore";
import { useProjectsStore } from "../../composables/useProjectsStore";
import {
  accountList,
  activityOptions,
  contractList,
  currencyOptions,
  opportunityList,
  partnerOptions,
  projectPriorityMap,
  projectStatusMap,
  projectTypeMap,
  riskLevelMap,
} from "../../data/projects";

const route = useRoute();
const router = useRouter();
const { users, getAssignableOwners } = useUsersStore();
const {
  archiveProject,
  batchAssignOwner,
  batchSetStatus,
  cancelProject,
  closeProject,
  createProject,
  getNextProjectNo,
  getProjectById,
  projects,
  setProjectStatus,
  updateProject,
} = useProjectsStore();

const loading = ref(false);
const filterPanelOpen = ref(false);
const selectedRows = ref([]);
const pageSize = ref(10);
const currentPage = ref(1);
const quickFilter = ref("all");
const sortState = reactive({
  prop: "updatedAt",
  order: "descending",
});

const formDrawerOpen = ref(false);
const formMode = ref("create");
const editingProjectId = ref("");
const hydratingForm = ref(false);

const ownerDrawerOpen = ref(false);
const ownerForm = reactive({
  ownerId: "",
});

const filters = reactive({
  keyword: "",
  status: "all",
  projectType: "all",
  priority: "all",
  ownerId: "all",
  memberId: "all",
  customerId: "all",
  opportunityId: "all",
  partnerId: "all",
  startDateRange: [],
  dueDateRange: [],
  isDelayed: "all",
  riskLevel: "all",
  createdDateRange: [],
});

const quickFilterOptions = [
  { value: "in_progress", label: "進行中" },
  { value: "due_this_month", label: "本月到期" },
  { value: "delayed", label: "已延遲" },
  { value: "high_priority", label: "高優先級" },
  { value: "owned_by_me", label: "我負責的專案" },
];

const statusOptions = [
  { label: "全部狀態", value: "all" },
  ...Object.entries(projectStatusMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const projectTypeOptions = [
  { label: "全部類型", value: "all" },
  ...Object.entries(projectTypeMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const priorityOptions = [
  { label: "全部優先級", value: "all" },
  ...Object.entries(projectPriorityMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const riskOptions = [
  { label: "全部風險", value: "all" },
  ...Object.entries(riskLevelMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const yesNoOptions = [
  { label: "全部", value: "all" },
  { label: "是", value: "yes" },
  { label: "否", value: "no" },
];

const ownerOptions = computed(() => [
  { label: "全部負責人", value: "all" },
  ...getAssignableOwners("project").map((item) => ({
    label: item.name,
    value: item.id,
  })),
]);

const memberOptions = computed(() => [
  { label: "全部參與人", value: "all" },
  ...users.value
    .filter((item) => item.status === "active")
    .map((item) => ({ label: item.name, value: item.id })),
]);

const customerOptions = [
  { label: "全部客戶", value: "all" },
  ...accountList.map((item) => ({
    label: item.companyName,
    value: item.id,
  })),
];

const opportunityOptions = [
  { label: "全部商機", value: "all" },
  ...opportunityList.map((item) => ({
    label: item.name,
    value: item.id,
  })),
];

const partnerFilterOptions = [
  { label: "全部夥伴", value: "all" },
  ...partnerOptions.map((item) => ({
    label: item.name,
    value: item.id,
  })),
];

function createEmptyForm() {
  return {
    projectNo: getNextProjectNo(),
    projectName: "",
    projectType: "delivery",
    status: "not_started",
    priority: "medium",
    customerId: "",
    opportunityId: "",
    partnerId: "",
    activityId: "",
    activityName: "",
    contractId: "",
    ownerId: "",
    members: [],
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    actualEndDate: "",
    progress: 0,
    milestoneTotal: 0,
    milestoneCompleted: 0,
    riskLevel: "low",
    budget: 0,
    estimatedCost: 0,
    value: 0,
    currency: "TWD",
    tagsInput: "",
    objective: "",
    description: "",
    notes: "",
    attachmentsInput: "",
  };
}

const form = reactive(createEmptyForm());

const summaryCards = computed(() => {
  const total = projects.value.length;
  const inProgress = projects.value.filter(
    (item) => item.status === "in_progress" || item.status === "delayed"
  ).length;
  const dueSoon = projects.value.filter((item) => isDueSoon(item.dueDate)).length;
  const delayed = projects.value.filter((item) => isDelayed(item)).length;
  const monthNew = projects.value.filter((item) => isThisMonth(item.createdAt)).length;
  const monthClosed = projects.value.filter(
    (item) =>
      item.status === "closed" &&
      (isThisMonth(item.updatedAt) || isThisMonth(item.actualEndDate))
  ).length;

  return [
    { label: "專案總數", value: total },
    { label: "進行中專案數", value: inProgress },
    { label: "即將到期專案數", value: dueSoon },
    { label: "延遲專案數", value: delayed },
    { label: "本月新增專案數", value: monthNew },
    { label: "本月結案專案數", value: monthClosed },
  ];
});

function toTimestamp(value) {
  if (!value) {
    return 0;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
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

  const startTime = toTimestamp(start);
  const endTime = toTimestamp(end) + 24 * 60 * 60 * 1000 - 1;
  return time >= startTime && time <= endTime;
}

function isThisMonth(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function isDueSoon(value) {
  const dueDate = toTimestamp(value);

  if (!dueDate) {
    return false;
  }

  const now = Date.now();
  const diffDays = Math.floor((dueDate - now) / (24 * 60 * 60 * 1000));
  return diffDays >= 0 && diffDays <= 14;
}

function isDelayed(item) {
  if (item.status === "delayed") {
    return true;
  }

  if (!item.dueDate) {
    return false;
  }

  if (["closed", "cancelled", "completed"].includes(item.status)) {
    return false;
  }

  return toTimestamp(item.dueDate) < Date.now();
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCurrency(value, currency = "TWD") {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function notify(message, title = "已更新", type = "success") {
  ElNotification({
    title,
    message,
    type,
    position: "top-right",
  });
}

const filteredProjects = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return projects.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.projectName.toLowerCase().includes(keyword) ||
      item.projectNo.toLowerCase().includes(keyword) ||
      item.customerName.toLowerCase().includes(keyword) ||
      item.opportunityName.toLowerCase().includes(keyword);

    const matchesStatus = filters.status === "all" || item.status === filters.status;
    const matchesType =
      filters.projectType === "all" || item.projectType === filters.projectType;
    const matchesPriority =
      filters.priority === "all" || item.priority === filters.priority;
    const matchesOwner = filters.ownerId === "all" || item.ownerId === filters.ownerId;
    const matchesMember =
      filters.memberId === "all" || (item.members ?? []).includes(filters.memberId);
    const matchesCustomer =
      filters.customerId === "all" || item.customerId === filters.customerId;
    const matchesOpportunity =
      filters.opportunityId === "all" || item.opportunityId === filters.opportunityId;
    const matchesPartner =
      filters.partnerId === "all" || item.partnerId === filters.partnerId;
    const matchesStartDate = isDateWithinRange(item.startDate, filters.startDateRange);
    const matchesDueDate = isDateWithinRange(item.dueDate, filters.dueDateRange);
    const matchesRisk =
      filters.riskLevel === "all" || item.riskLevel === filters.riskLevel;
    const matchesCreatedDate = isDateWithinRange(
      item.createdAt,
      filters.createdDateRange
    );
    const delayed = isDelayed(item);
    const matchesDelayed =
      filters.isDelayed === "all" || (filters.isDelayed === "yes" ? delayed : !delayed);

    const matchesQuickFilter =
      quickFilter.value === "all" ||
      (quickFilter.value === "in_progress" &&
        ["in_progress", "delayed"].includes(item.status)) ||
      (quickFilter.value === "due_this_month" && isThisMonth(item.dueDate)) ||
      (quickFilter.value === "delayed" && delayed) ||
      (quickFilter.value === "high_priority" &&
        ["high", "urgent"].includes(item.priority)) ||
      (quickFilter.value === "owned_by_me" && item.ownerId === "u-001");

    return (
      matchesKeyword &&
      matchesStatus &&
      matchesType &&
      matchesPriority &&
      matchesOwner &&
      matchesMember &&
      matchesCustomer &&
      matchesOpportunity &&
      matchesPartner &&
      matchesStartDate &&
      matchesDueDate &&
      matchesDelayed &&
      matchesRisk &&
      matchesCreatedDate &&
      matchesQuickFilter
    );
  });
});

const sortedProjects = computed(() => {
  const list = [...filteredProjects.value];

  if (!sortState.prop || !sortState.order) {
    return list.sort(
      (left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt)
    );
  }

  const direction = sortState.order === "ascending" ? 1 : -1;

  return list.sort((left, right) => {
    if (
      ["progress", "milestoneTotal", "milestoneCompleted", "budget", "value"].includes(
        sortState.prop
      )
    ) {
      return ((left[sortState.prop] ?? 0) - (right[sortState.prop] ?? 0)) * direction;
    }

    if (["startDate", "dueDate", "updatedAt", "createdAt"].includes(sortState.prop)) {
      return (
        (toTimestamp(left[sortState.prop]) - toTimestamp(right[sortState.prop])) *
        direction
      );
    }

    return (
      String(left[sortState.prop] ?? "").localeCompare(
        String(right[sortState.prop] ?? ""),
        "zh-Hant"
      ) * direction
    );
  });
});

const pagedProjects = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedProjects.value.slice(start, start + pageSize.value);
});

const emptyState = computed(() => {
  if (projects.value.length === 0) {
    return {
      title: "目前尚無專案資料",
      description: "可先新增第一個專案，開始建立專案管理流程",
      actionLabel: "新增專案",
      action: openCreateDrawer,
    };
  }

  return {
    title: "沒有符合條件的專案",
    description: "請調整搜尋條件或清除篩選",
    actionLabel: "清除篩選",
    action: resetFilters,
  };
});

function handleSortChange({ prop, order }) {
  sortState.prop = prop ?? "updatedAt";
  sortState.order = order ?? "descending";
}

function handleSelectionChange(rows) {
  selectedRows.value = rows;
}

function resetFilters() {
  filters.keyword = "";
  filters.status = "all";
  filters.projectType = "all";
  filters.priority = "all";
  filters.ownerId = "all";
  filters.memberId = "all";
  filters.customerId = "all";
  filters.opportunityId = "all";
  filters.partnerId = "all";
  filters.startDateRange = [];
  filters.dueDateRange = [];
  filters.isDelayed = "all";
  filters.riskLevel = "all";
  filters.createdDateRange = [];
  quickFilter.value = "all";
  currentPage.value = 1;
}

function openDetail(row) {
  router.push({
    name: "project-detail",
    params: { projectId: row.id },
  });
}

function goAccount(row) {
  if (!row.customerId) {
    return;
  }

  router.push({
    name: "account-detail",
    params: { accountId: row.customerId },
  });
}

function goOpportunity(row) {
  if (!row.opportunityId) {
    return;
  }

  router.push({
    name: "opportunity-detail",
    params: { opportunityId: row.opportunityId },
  });
}

async function closeRow(row) {
  let reason = "";

  try {
    const result = await ElMessageBox.prompt("請輸入結案說明", "結案專案", {
      confirmButtonText: "結案",
      cancelButtonText: "取消",
      inputPlaceholder: "例如：已完成驗收與交付",
    });
    reason = result.value.trim();
  } catch {
    return;
  }

  const updated = closeProject(row.id, reason);
  if (updated) {
    notify(`${updated.projectName} 已結案`);
  }
}

async function cancelRow(row) {
  let reason = "";

  try {
    const result = await ElMessageBox.prompt("請輸入取消原因", "取消專案", {
      confirmButtonText: "取消專案",
      cancelButtonText: "關閉",
      inputPlaceholder: "例如：需求變更、預算取消",
    });
    reason = result.value.trim();
  } catch {
    return;
  }

  const updated = cancelProject(row.id, reason);
  if (updated) {
    notify(`${updated.projectName} 已取消`, "已更新", "warning");
  }
}

function archiveRow(row) {
  const updated = archiveProject(row.id, "由列表手動封存");
  if (updated) {
    notify(`${updated.projectName} 已封存`);
  }
}

function openEditDrawer(row) {
  const target = getProjectById(row.id);

  if (!target) {
    return;
  }

  formMode.value = "edit";
  editingProjectId.value = target.id;
  hydratingForm.value = true;
  Object.assign(form, {
    ...createEmptyForm(),
    ...target,
    tagsInput: (target.tags ?? []).join("、"),
    attachmentsInput: (target.attachments ?? []).join("、"),
  });
  hydratingForm.value = false;
  formDrawerOpen.value = true;
}

function openCreateDrawer() {
  formMode.value = "create";
  editingProjectId.value = "";
  hydratingForm.value = true;
  Object.assign(form, createEmptyForm());
  hydratingForm.value = false;
  formDrawerOpen.value = true;
}

function handleRowCommand(command, row) {
  if (command === "view") {
    openDetail(row);
    return;
  }

  if (command === "edit") {
    openEditDrawer(row);
    return;
  }

  if (command === "close") {
    closeRow(row);
    return;
  }

  if (command === "archive") {
    archiveRow(row);
    return;
  }

  if (command === "cancel") {
    cancelRow(row);
    return;
  }

  if (command === "account") {
    goAccount(row);
    return;
  }

  if (command === "opportunity") {
    goOpportunity(row);
  }
}

function parseSplitValues(input) {
  return String(input ?? "")
    .split(/[、,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function submitForm() {
  if (!form.projectName.trim()) {
    notify("請輸入專案名稱", "缺少資訊", "warning");
    return;
  }

  if (!form.ownerId) {
    notify("請選擇專案負責人", "缺少資訊", "warning");
    return;
  }

  if (form.dueDate && toTimestamp(form.dueDate) < toTimestamp(form.startDate)) {
    notify("預計結束日不可早於開始日", "日期不正確", "warning");
    return;
  }

  if (Number(form.milestoneCompleted) > Number(form.milestoneTotal)) {
    notify("已完成里程碑不可大於總里程碑數", "數值不正確", "warning");
    return;
  }

  const ownerName =
    users.value.find((user) => user.id === form.ownerId)?.name ?? "未指派";
  const payload = {
    projectNo: form.projectNo,
    projectName: form.projectName.trim(),
    projectType: form.projectType,
    status: form.status,
    priority: form.priority,
    customerId: form.customerId,
    customerName:
      accountList.find((item) => item.id === form.customerId)?.companyName ?? "",
    opportunityId: form.opportunityId,
    opportunityName:
      opportunityList.find((item) => item.id === form.opportunityId)?.name ?? "",
    partnerId: form.partnerId,
    partnerName: partnerOptions.find((item) => item.id === form.partnerId)?.name ?? "",
    activityId: form.activityId,
    activityName:
      activityOptions.find((item) => item.id === form.activityId)?.name ??
      form.activityName,
    contractId: form.contractId,
    contractName:
      contractList.find((item) => item.id === form.contractId)?.contractName ?? "",
    ownerId: form.ownerId,
    ownerName,
    members: [...form.members],
    startDate: form.startDate,
    dueDate: form.dueDate,
    actualEndDate: form.actualEndDate,
    progress: Number(form.progress ?? 0),
    milestoneTotal: Number(form.milestoneTotal ?? 0),
    milestoneCompleted: Number(form.milestoneCompleted ?? 0),
    riskLevel: form.riskLevel,
    budget: Number(form.budget ?? 0),
    estimatedCost: Number(form.estimatedCost ?? 0),
    value: Number(form.value ?? 0),
    currency: form.currency,
    tags: parseSplitValues(form.tagsInput),
    objective: form.objective.trim(),
    description: form.description.trim(),
    notes: form.notes.trim(),
    attachments: parseSplitValues(form.attachmentsInput),
  };

  if (formMode.value === "edit") {
    const target = getProjectById(editingProjectId.value);

    if (target?.status === "closed") {
      notify("此專案已結案，修改前請確認權限", "結案提醒", "warning");
    }

    const updated = updateProject(editingProjectId.value, payload);
    if (!updated) {
      return;
    }
    notify(`${updated.projectName} 已更新`);
  } else {
    const created = createProject(payload);
    notify(`${created.projectName} 已建立`);
  }

  formDrawerOpen.value = false;
}

function exportProjects() {
  notify("已加入匯出佇列，完成後將提供下載連結", "匯出中");
}

function notifyPlaceholder() {
  notify("此功能將於下一階段開放", "即將開放", "info");
}

async function refreshData() {
  loading.value = true;

  await new Promise((resolve) => {
    setTimeout(resolve, 260);
  });

  loading.value = false;
  notify("專案資料已同步最新狀態");
}

function openOwnerDrawer() {
  if (selectedRows.value.length === 0) {
    notify("請先勾選專案", "尚未選擇資料", "warning");
    return;
  }

  ownerForm.ownerId = "";
  ownerDrawerOpen.value = true;
}

function submitOwnerBatch() {
  if (!ownerForm.ownerId) {
    notify("請先選擇負責人", "缺少資訊", "warning");
    return;
  }

  const updated = batchAssignOwner(
    selectedRows.value.map((item) => item.id),
    ownerForm.ownerId
  );

  ownerDrawerOpen.value = false;
  notify(`已批次調整 ${updated.length} 筆專案負責人`);
}

function batchClose() {
  if (selectedRows.value.length === 0) {
    notify("請先勾選專案", "尚未選擇資料", "warning");
    return;
  }

  const updated = batchSetStatus(
    selectedRows.value.map((item) => item.id),
    "closed",
    { reason: "批次結案" }
  );

  notify(`已批次結案 ${updated.length} 筆專案`);
}

function batchArchive() {
  if (selectedRows.value.length === 0) {
    notify("請先勾選專案", "尚未選擇資料", "warning");
    return;
  }

  selectedRows.value.forEach((item) => {
    archiveProject(item.id, "批次封存");
  });

  notify(`已批次封存 ${selectedRows.value.length} 筆專案`);
}

async function applyRouteIntent() {
  if (route.name !== "projects-list") {
    return;
  }

  if (route.query.create === "1") {
    openCreateDrawer();
    await router.replace({ name: "projects-list" });
    return;
  }

  if (typeof route.query.edit === "string" && route.query.edit) {
    const record = getProjectById(route.query.edit);

    if (record) {
      openEditDrawer(record);
    }

    await router.replace({ name: "projects-list" });
  }
}

watch(
  () => form.status,
  (status) => {
    if (hydratingForm.value) {
      return;
    }

    if (["closed", "completed"].includes(status)) {
      form.progress = 100;
      if (!form.actualEndDate) {
        form.actualEndDate = new Date().toISOString().slice(0, 10);
      }
    }
  }
);

watch(
  () => [
    filters.keyword,
    filters.status,
    filters.projectType,
    filters.priority,
    filters.ownerId,
    filters.memberId,
    filters.customerId,
    filters.opportunityId,
    filters.partnerId,
    filters.startDateRange,
    filters.dueDateRange,
    filters.isDelayed,
    filters.riskLevel,
    filters.createdDateRange,
    pageSize.value,
    quickFilter.value,
  ],
  () => {
    currentPage.value = 1;
  },
  { deep: true }
);

watch(
  () => [sortedProjects.value.length, pageSize.value],
  () => {
    const maxPage = Math.max(1, Math.ceil(sortedProjects.value.length / pageSize.value));

    if (currentPage.value > maxPage) {
      currentPage.value = maxPage;
    }
  },
  { immediate: true }
);

watch(
  () => [route.name, route.query.create, route.query.edit],
  () => {
    applyRouteIntent();
  }
);

onActivated(() => {
  applyRouteIntent();
});
</script>

<template>
  <div class="min-h-full p-8">
    <section class="grid gap-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-1">
          <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">
            專案列表
          </h1>
          <p class="text-sm text-slate-500">
            集中管理專案進度、時程、負責人與關聯業務資訊
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton type="primary" :icon="CirclePlus" @click="openCreateDrawer"
            >新增專案</ElButton
          >
          <ElButton :icon="Download" @click="exportProjects">匯出</ElButton>
          <ElButton :icon="Setting" @click="openOwnerDrawer">批次指派負責人</ElButton>
          <ElButton @click="batchClose">批次結案</ElButton>
          <ElButton @click="batchArchive">批次封存</ElButton>
          <ElButton @click="notifyPlaceholder">自訂欄位</ElButton>
          <ElButton @click="notifyPlaceholder">表格設定</ElButton>
        </div>
      </header>

      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <article
          v-for="card in summaryCards"
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
              :prefix-icon="Search"
              placeholder="搜尋專案名稱 / 編號 / 客戶 / 商機"
              clearable
              class="!w-[320px]"
            />
            <ElButton
              :icon="Filter"
              :type="filterPanelOpen ? 'primary' : 'default'"
              @click="filterPanelOpen = !filterPanelOpen"
            >
              Filter
            </ElButton>
            <ElButton :icon="Refresh" @click="resetFilters">重設</ElButton>
            <ElButton :icon="Refresh" @click="refreshData">重新整理</ElButton>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="item in quickFilterOptions"
              :key="item.value"
              type="button"
              class="rounded-full border px-3 py-1.5 text-xs font-medium transition"
              :class="
                quickFilter === item.value
                  ? 'border-[#409eff] bg-[#ecf5ff] text-[#337ecc]'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
              "
              @click="quickFilter = quickFilter === item.value ? 'all' : item.value"
            >
              {{ item.label }}
            </button>
          </div>
        </div>

        <transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="-translate-y-2 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="-translate-y-2 opacity-0"
        >
          <div
            v-if="filterPanelOpen"
            class="grid gap-3 border-t border-slate-200 bg-white px-6 py-4 md:grid-cols-4"
          >
            <ElSelect v-model="filters.status">
              <ElOption
                v-for="item in statusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.projectType">
              <ElOption
                v-for="item in projectTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.priority">
              <ElOption
                v-for="item in priorityOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.ownerId">
              <ElOption
                v-for="item in ownerOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.memberId">
              <ElOption
                v-for="item in memberOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.customerId">
              <ElOption
                v-for="item in customerOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.opportunityId">
              <ElOption
                v-for="item in opportunityOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.partnerId">
              <ElOption
                v-for="item in partnerFilterOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElDatePicker
              v-model="filters.startDateRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              start-placeholder="開始日(起)"
              end-placeholder="開始日(迄)"
            />

            <ElDatePicker
              v-model="filters.dueDateRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              start-placeholder="結束日(起)"
              end-placeholder="結束日(迄)"
            />

            <ElSelect v-model="filters.isDelayed">
              <ElOption
                v-for="item in yesNoOptions"
                :key="item.value"
                :label="`是否延遲：${item.label}`"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.riskLevel">
              <ElOption
                v-for="item in riskOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElDatePicker
              v-model="filters.createdDateRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              start-placeholder="建立日(起)"
              end-placeholder="建立日(迄)"
            />
          </div>
        </transition>
      </section>

      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div
          class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4"
        >
          <div class="flex flex-wrap items-center gap-2">
            <ElTag round effect="plain">共 {{ sortedProjects.length }} 筆</ElTag>
            <ElTag v-if="selectedRows.length > 0" round type="primary" effect="light">
              已勾選 {{ selectedRows.length }} 筆
            </ElTag>
          </div>
        </div>

        <ElTable
          :data="pagedProjects"
          size="large"
          table-layout="auto"
          :loading="loading"
          @selection-change="handleSelectionChange"
          @sort-change="handleSortChange"
        >
          <ElTableColumn type="selection" width="52" />

          <ElTableColumn label="專案" min-width="240">
            <template #default="{ row }">
              <div class="grid gap-0.5">
                <button
                  type="button"
                  class="text-left text-sm font-semibold text-slate-900 hover:text-[#409eff]"
                  @click="openDetail(row)"
                >
                  {{ row.projectName }}
                </button>
                <span class="text-xs text-slate-400">{{ row.projectNo }}</span>
                <div class="flex flex-wrap gap-1">
                  <ElTag
                    v-for="tag in (row.tags ?? []).slice(0, 2)"
                    :key="tag"
                    round
                    effect="plain"
                    size="small"
                  >
                    {{ tag }}
                  </ElTag>
                </div>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="專案類型" min-width="120">
            <template #default="{ row }">
              <ElTag round effect="light" :type="projectTypeMap[row.projectType]?.type">
                {{ projectTypeMap[row.projectType]?.label || row.projectType }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="專案狀態" min-width="112">
            <template #default="{ row }">
              <ElTag round effect="light" :type="projectStatusMap[row.status]?.type">
                {{ projectStatusMap[row.status]?.label || row.status }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="關聯客戶 / 商機" min-width="230">
            <template #default="{ row }">
              <div class="grid gap-0.5">
                <button
                  type="button"
                  class="text-left text-sm font-medium text-[#409eff] hover:text-[#337ecc]"
                  @click="goAccount(row)"
                >
                  {{ row.customerName || "-" }}
                </button>
                <button
                  type="button"
                  class="text-left text-xs text-[#409eff]/90 hover:text-[#337ecc]"
                  @click="goOpportunity(row)"
                >
                  {{ row.opportunityName || "-" }}
                </button>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="專案負責人" min-width="118">
            <template #default="{ row }">{{ row.ownerName || "-" }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="專案進度"
            min-width="180"
            prop="progress"
            sortable="custom"
          >
            <template #default="{ row }">
              <div class="grid gap-1">
                <span class="text-xs text-slate-500">{{ row.progress }}%</span>
                <ElProgress
                  :percentage="row.progress"
                  :stroke-width="8"
                  :show-text="false"
                />
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn
            label="開始日期"
            min-width="112"
            prop="startDate"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatDate(row.startDate) }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="預計結束日"
            min-width="122"
            prop="dueDate"
            sortable="custom"
          >
            <template #default="{ row }">
              <span
                :class="
                  isDelayed(row)
                    ? 'text-rose-600'
                    : isDueSoon(row.dueDate)
                    ? 'text-amber-600'
                    : ''
                "
              >
                {{ formatDate(row.dueDate) }}
              </span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="里程碑進度" min-width="120">
            <template #default="{ row }"
              >{{ row.milestoneCompleted }} / {{ row.milestoneTotal }}</template
            >
          </ElTableColumn>

          <ElTableColumn label="風險等級" min-width="104">
            <template #default="{ row }">
              <ElTag round effect="light" :type="riskLevelMap[row.riskLevel]?.type">
                {{ riskLevelMap[row.riskLevel]?.label || row.riskLevel }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn
            label="最近更新時間"
            min-width="152"
            prop="updatedAt"
            sortable="custom"
          >
            <template #default="{ row }">
              <div class="grid gap-0.5">
                <span class="text-sm text-slate-700">{{
                  formatDateTime(row.updatedAt)
                }}</span>
                <span class="text-xs text-slate-400">{{ row.updatedBy || "-" }}</span>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="操作" fixed="right" width="146">
            <template #default="{ row }">
              <div class="flex items-center justify-end gap-1">
                <ElButton text type="primary" @click="openDetail(row)">查看詳情</ElButton>
                <ElDropdown
                  trigger="click"
                  @command="(command) => handleRowCommand(command, row)"
                >
                  <button
                    type="button"
                    class="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <MoreFilled class="h-4 w-4" />
                  </button>

                  <template #dropdown>
                    <ElDropdownMenu>
                      <ElDropdownItem command="edit">編輯</ElDropdownItem>
                      <ElDropdownItem command="close">結案</ElDropdownItem>
                      <ElDropdownItem command="archive">封存</ElDropdownItem>
                      <ElDropdownItem command="cancel">取消專案</ElDropdownItem>
                      <ElDropdownItem command="account" divided>查看客戶</ElDropdownItem>
                      <ElDropdownItem command="opportunity">查看商機</ElDropdownItem>
                    </ElDropdownMenu>
                  </template>
                </ElDropdown>
              </div>
            </template>
          </ElTableColumn>

          <template #empty>
            <div class="px-6 py-16">
              <ElEmpty :description="emptyState.title">
                <p class="mb-4 text-sm text-slate-500">{{ emptyState.description }}</p>
                <ElButton type="primary" @click="emptyState.action()">
                  {{ emptyState.actionLabel }}
                </ElButton>
              </ElEmpty>
            </div>
          </template>
        </ElTable>

        <div
          class="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-5"
        >
          <ElPagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            layout="total, prev, pager, next"
            :total="sortedProjects.length"
            background
          />

          <ElSelect v-model="pageSize" class="!w-[110px]" @change="currentPage = 1">
            <ElOption :value="10" label="10 Item" />
            <ElOption :value="20" label="20 Item" />
            <ElOption :value="50" label="50 Item" />
          </ElSelect>
        </div>
      </section>
    </section>

    <ElDrawer
      v-model="formDrawerOpen"
      :title="formMode === 'edit' ? '編輯專案' : '新增專案'"
      size="760px"
      destroy-on-close
    >
      <div class="grid gap-6 pb-4">
        <section
          class="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
        >
          <div class="grid gap-1">
            <h3 class="text-sm font-semibold text-slate-800">基本資料</h3>
            <p class="text-xs text-slate-500">建立專案主檔、狀態與優先級設定。</p>
          </div>

          <ElForm label-width="108px" class="grid gap-3 md:grid-cols-2">
            <ElFormItem label="專案名稱" required class="md:col-span-2">
              <ElInput v-model="form.projectName" />
            </ElFormItem>

            <ElFormItem label="專案編號">
              <ElInput v-model="form.projectNo" />
            </ElFormItem>

            <ElFormItem label="專案類型">
              <ElSelect v-model="form.projectType">
                <ElOption
                  v-for="item in projectTypeOptions.filter(
                    (option) => option.value !== 'all'
                  )"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="專案狀態">
              <ElSelect v-model="form.status">
                <ElOption
                  v-for="item in statusOptions.filter((option) => option.value !== 'all')"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="優先級">
              <ElSelect v-model="form.priority">
                <ElOption
                  v-for="item in priorityOptions.filter(
                    (option) => option.value !== 'all'
                  )"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </section>

        <section class="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div class="grid gap-1">
            <h3 class="text-sm font-semibold text-slate-800">關聯資料</h3>
          </div>

          <ElForm label-width="108px" class="grid gap-3 md:grid-cols-2">
            <ElFormItem label="關聯客戶">
              <ElSelect v-model="form.customerId" filterable>
                <ElOption
                  v-for="item in accountList"
                  :key="item.id"
                  :label="item.companyName"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="關聯商機">
              <ElSelect v-model="form.opportunityId" filterable>
                <ElOption
                  v-for="item in opportunityList"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="關聯夥伴">
              <ElSelect v-model="form.partnerId" filterable>
                <ElOption
                  v-for="item in partnerOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="關聯活動">
              <ElSelect v-model="form.activityId" filterable>
                <ElOption
                  v-for="item in activityOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="關聯合約" class="md:col-span-2">
              <ElSelect v-model="form.contractId" filterable>
                <ElOption
                  v-for="item in contractList"
                  :key="item.id"
                  :label="item.contractName"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </section>

        <section class="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div class="grid gap-1">
            <h3 class="text-sm font-semibold text-slate-800">執行資料</h3>
          </div>

          <ElForm label-width="108px" class="grid gap-3 md:grid-cols-2">
            <ElFormItem label="專案負責人" required>
              <ElSelect v-model="form.ownerId">
                <ElOption
                  v-for="item in getAssignableOwners('project')"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="參與成員">
              <ElSelect v-model="form.members" multiple collapse-tags>
                <ElOption
                  v-for="item in users.filter((user) => user.status === 'active')"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="開始日期">
              <ElDatePicker
                v-model="form.startDate"
                value-format="YYYY-MM-DD"
                class="!w-full"
              />
            </ElFormItem>

            <ElFormItem label="預計結束日">
              <ElDatePicker
                v-model="form.dueDate"
                value-format="YYYY-MM-DD"
                class="!w-full"
              />
            </ElFormItem>

            <ElFormItem label="實際結束日">
              <ElDatePicker
                v-model="form.actualEndDate"
                value-format="YYYY-MM-DD"
                class="!w-full"
              />
            </ElFormItem>

            <ElFormItem label="風險等級">
              <ElSelect v-model="form.riskLevel">
                <ElOption
                  v-for="item in riskOptions.filter((option) => option.value !== 'all')"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="專案進度">
              <ElInputNumber
                v-model="form.progress"
                :min="0"
                :max="100"
                class="!w-full"
              />
            </ElFormItem>

            <ElFormItem label="里程碑總數">
              <ElInputNumber v-model="form.milestoneTotal" :min="0" class="!w-full" />
            </ElFormItem>

            <ElFormItem label="已完成里程碑">
              <ElInputNumber v-model="form.milestoneCompleted" :min="0" class="!w-full" />
            </ElFormItem>

            <ElFormItem label="標籤">
              <ElInput v-model="form.tagsInput" placeholder="以 、 或 , 分隔" />
            </ElFormItem>
          </ElForm>
        </section>

        <section class="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div class="grid gap-1">
            <h3 class="text-sm font-semibold text-slate-800">商務資訊與備註</h3>
          </div>

          <ElForm label-width="108px" class="grid gap-3 md:grid-cols-2">
            <ElFormItem label="幣別">
              <ElSelect v-model="form.currency">
                <ElOption
                  v-for="item in currencyOptions"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="專案預算">
              <ElInputNumber v-model="form.budget" :min="0" class="!w-full" />
            </ElFormItem>

            <ElFormItem label="預估成本">
              <ElInputNumber v-model="form.estimatedCost" :min="0" class="!w-full" />
            </ElFormItem>

            <ElFormItem label="專案價值">
              <ElInputNumber v-model="form.value" :min="0" class="!w-full" />
            </ElFormItem>

            <ElFormItem label="專案目標" class="md:col-span-2">
              <ElInput v-model="form.objective" type="textarea" :rows="2" />
            </ElFormItem>

            <ElFormItem label="執行說明" class="md:col-span-2">
              <ElInput v-model="form.description" type="textarea" :rows="3" />
            </ElFormItem>

            <ElFormItem label="補充備註" class="md:col-span-2">
              <ElInput v-model="form.notes" type="textarea" :rows="3" />
            </ElFormItem>

            <ElFormItem label="附件" class="md:col-span-2">
              <ElInput
                v-model="form.attachmentsInput"
                placeholder="以 、 或 , 分隔檔名"
              />
            </ElFormItem>
          </ElForm>
        </section>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="formDrawerOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitForm">
            {{ formMode === "edit" ? "儲存變更" : "建立專案" }}
          </ElButton>
        </div>
      </template>
    </ElDrawer>

    <ElDrawer
      v-model="ownerDrawerOpen"
      title="批次指派負責人"
      size="420px"
      destroy-on-close
    >
      <ElForm label-width="96px">
        <ElFormItem label="負責人" required>
          <ElSelect v-model="ownerForm.ownerId">
            <ElOption
              v-for="item in getAssignableOwners('project')"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </ElSelect>
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="ownerDrawerOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitOwnerBatch">套用</ElButton>
        </div>
      </template>
    </ElDrawer>
  </div>
</template>
