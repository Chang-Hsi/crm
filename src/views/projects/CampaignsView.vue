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
  ElSelect,
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
  Setting,
} from "@element-plus/icons-vue";
import {
  campaignPriorityMap,
  campaignResultMap,
  campaignStatusMap,
  campaignTypeMap,
  customerOptions,
  opportunityOptions,
  partnerDirectory,
  productOptions,
  projectOptions,
  userList,
} from "../../data/campaigns";
import { useCampaignsStore } from "../../composables/useCampaignsStore";

const route = useRoute();
const router = useRouter();

const {
  batchSetStatus,
  campaigns,
  cancelCampaign,
  closeCampaign,
  createCampaign,
  duplicateCampaign,
  getCampaignById,
  getNextCampaignNo,
  updateCampaign,
} = useCampaignsStore();

const loading = ref(false);
const filterPanelOpen = ref(false);
const selectedRows = ref([]);
const pageSize = ref(10);
const currentPage = ref(1);
const activeStatusTab = ref("all");
const quickFilter = ref("all");
const batchStatus = ref("ongoing");
const sortState = reactive({
  prop: "updatedAt",
  order: "descending",
});

const formDrawerOpen = ref(false);
const formMode = ref("create");
const editingCampaignId = ref("");

const filters = reactive({
  keyword: "",
  activityType: "all",
  ownerId: "all",
  partnerId: "all",
  projectId: "all",
  region: "all",
  productId: "all",
  startDateRange: [],
  endDateRange: [],
  hasOpportunityResult: "all",
  isOverBudget: "all",
  isDelayed: "all",
});

const initialProjectId = String(route.query.projectId ?? "");
const initialPartnerId = String(route.query.partnerId ?? "");

if (initialProjectId) {
  filters.projectId = initialProjectId;
}

if (initialPartnerId) {
  filters.partnerId = initialPartnerId;
}

const statusTabs = [
  { value: "all", label: "全部" },
  ...Object.entries(campaignStatusMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const quickFilterOptions = [
  { value: "ongoing", label: "進行中" },
  { value: "this_month", label: "本月活動" },
  { value: "upcoming", label: "即將開始" },
  { value: "completed", label: "已完成" },
  { value: "with_opportunity", label: "有商機成果" },
  { value: "over_budget", label: "超出預算" },
];

const regionOptions = [
  { value: "all", label: "全部市場" },
  { value: "台灣", label: "台灣" },
  { value: "日本", label: "日本" },
  { value: "東南亞", label: "東南亞" },
  { value: "北美", label: "北美" },
];

const yesNoOptions = [
  { value: "all", label: "全部" },
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
];

const statusUpdateOptions = [
  { value: "planning", label: "規劃中" },
  { value: "preparing", label: "籌備中" },
  { value: "ongoing", label: "進行中" },
  { value: "completed", label: "已完成" },
  { value: "closed", label: "已結案" },
  { value: "cancelled", label: "已取消" },
  { value: "delayed", label: "延遲中" },
];

const typeOptions = [
  { value: "all", label: "全部類型" },
  ...Object.entries(campaignTypeMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const priorityOptions = Object.entries(campaignPriorityMap).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

const resultOptions = Object.entries(campaignResultMap).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

const ownerOptions = computed(() => [
  { value: "all", label: "全部負責人" },
  ...userList
    .filter((item) => item.status === "active")
    .map((item) => ({ value: item.id, label: item.name })),
]);

function createEmptyForm() {
  return {
    activityNo: getNextCampaignNo(),
    activityName: "",
    activityType: "campaign",
    status: "draft",
    priority: "medium",
    topic: "",
    objective: "",
    format: "",
    audience: "",
    channel: "",
    region: "台灣",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    registrationStartDate: "",
    registrationEndDate: "",
    actualEventDate: "",
    ownerId: "u-001",
    collaboratorIds: [],
    projectId: "",
    partnerId: "",
    customerIds: [],
    opportunityIds: [],
    productIds: [],
    budget: 0,
    actualCost: 0,
    signupCount: 0,
    attendanceCount: 0,
    leadCount: 0,
    qualifiedLeadCount: 0,
    opportunityCount: 0,
    estimatedValue: 0,
    actualRevenue: 0,
    resultStatus: "monitoring",
    resultSummary: "",
    description: "",
    notes: "",
    tagsInput: "",
    attachmentsInput: "",
  };
}

const form = reactive(createEmptyForm());

const kpiCards = computed(() => {
  const total = campaigns.value.length;
  const ongoing = campaigns.value.filter((item) => item.status === "ongoing").length;
  const newThisMonth = campaigns.value.filter((item) => isThisMonth(item.createdAt))
    .length;
  const executionThisMonth = campaigns.value.filter(
    (item) => isThisMonth(item.actualEventDate) || isThisMonth(item.startDate)
  ).length;

  const monthLead = campaigns.value
    .filter((item) => isThisMonth(item.actualEventDate) || isThisMonth(item.startDate))
    .reduce((sum, item) => sum + Number(item.leadCount || 0), 0);

  const monthOpportunity = campaigns.value
    .filter((item) => isThisMonth(item.actualEventDate) || isThisMonth(item.startDate))
    .reduce((sum, item) => sum + Number(item.opportunityCount || 0), 0);

  return [
    { label: "活動總數", value: total },
    { label: "進行中活動數", value: ongoing },
    { label: "本月新增活動數", value: newThisMonth },
    { label: "本月執行活動數", value: executionThisMonth },
    { label: "本月取得名單數", value: monthLead },
    { label: "本月關聯商機數", value: monthOpportunity },
  ];
});

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toTimestamp(value) {
  const date = parseDate(value);
  return date ? date.getTime() : 0;
}

function isThisMonth(value) {
  const date = parseDate(value);

  if (!date) {
    return false;
  }

  const now = new Date();

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function isUpcomingStart(value) {
  const time = toTimestamp(value);

  if (!time) {
    return false;
  }

  return time >= Date.now() && time <= Date.now() + 7 * 24 * 60 * 60 * 1000;
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

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function notify(message, title = "已更新", type = "success") {
  ElNotification({
    title,
    message,
    type,
    position: "top-right",
  });
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

const filteredCampaigns = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return campaigns.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.activityName.toLowerCase().includes(keyword) ||
      item.activityNo.toLowerCase().includes(keyword) ||
      item.topic.toLowerCase().includes(keyword);

    const matchesStatus =
      activeStatusTab.value === "all" || item.status === activeStatusTab.value;
    const matchesType =
      filters.activityType === "all" || item.activityType === filters.activityType;
    const matchesOwner = filters.ownerId === "all" || item.ownerId === filters.ownerId;
    const matchesPartner =
      filters.partnerId === "all" || item.partnerId === filters.partnerId;
    const matchesProject =
      filters.projectId === "all" || item.projectId === filters.projectId;
    const matchesRegion = filters.region === "all" || item.region === filters.region;
    const matchesProduct =
      filters.productId === "all" || (item.productIds || []).includes(filters.productId);
    const matchesStartDate = isDateWithinRange(item.startDate, filters.startDateRange);
    const matchesEndDate = isDateWithinRange(item.endDate, filters.endDateRange);
    const matchesOpportunity =
      filters.hasOpportunityResult === "all" ||
      (filters.hasOpportunityResult === "yes"
        ? item.hasOpportunityResult
        : !item.hasOpportunityResult);
    const matchesOverBudget =
      filters.isOverBudget === "all" ||
      (filters.isOverBudget === "yes" ? item.isOverBudget : !item.isOverBudget);
    const matchesDelayed =
      filters.isDelayed === "all" ||
      (filters.isDelayed === "yes" ? item.isDelayed : !item.isDelayed);

    const matchesQuickFilter =
      quickFilter.value === "all" ||
      (quickFilter.value === "ongoing" && item.status === "ongoing") ||
      (quickFilter.value === "this_month" &&
        (isThisMonth(item.startDate) || isThisMonth(item.actualEventDate))) ||
      (quickFilter.value === "upcoming" && isUpcomingStart(item.startDate)) ||
      (quickFilter.value === "completed" &&
        ["completed", "closed"].includes(item.status)) ||
      (quickFilter.value === "with_opportunity" && item.hasOpportunityResult) ||
      (quickFilter.value === "over_budget" && item.isOverBudget);

    return (
      matchesKeyword &&
      matchesStatus &&
      matchesType &&
      matchesOwner &&
      matchesPartner &&
      matchesProject &&
      matchesRegion &&
      matchesProduct &&
      matchesStartDate &&
      matchesEndDate &&
      matchesOpportunity &&
      matchesOverBudget &&
      matchesDelayed &&
      matchesQuickFilter
    );
  });
});

const sortedCampaigns = computed(() => {
  const records = [...filteredCampaigns.value];
  const direction = sortState.order === "ascending" ? 1 : -1;

  return records.sort((left, right) => {
    if (["startDate", "endDate", "updatedAt", "createdAt"].includes(sortState.prop)) {
      return (
        (toTimestamp(left[sortState.prop]) - toTimestamp(right[sortState.prop])) *
        direction
      );
    }

    if (
      [
        "budget",
        "actualCost",
        "leadCount",
        "qualifiedLeadCount",
        "opportunityCount",
        "actualRevenue",
      ].includes(sortState.prop)
    ) {
      return ((left[sortState.prop] ?? 0) - (right[sortState.prop] ?? 0)) * direction;
    }

    return (
      String(left[sortState.prop] ?? "").localeCompare(
        String(right[sortState.prop] ?? ""),
        "zh-Hant"
      ) * direction
    );
  });
});

const pagedCampaigns = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedCampaigns.value.slice(start, start + pageSize.value);
});

const emptyState = computed(() => {
  if (campaigns.value.length === 0) {
    return {
      title: "目前尚無活動資料",
      description: "可先新增第一個行銷活動，建立完整活動管理流程。",
      actionLabel: "新增活動",
      action: openCreateDrawer,
    };
  }

  return {
    title: "沒有符合條件的活動",
    description: "請調整搜尋條件或清除篩選。",
    actionLabel: "清除篩選",
    action: resetFilters,
  };
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
  filters.activityType = "all";
  filters.ownerId = "all";
  filters.partnerId = "all";
  filters.projectId = "all";
  filters.region = "all";
  filters.productId = "all";
  filters.startDateRange = [];
  filters.endDateRange = [];
  filters.hasOpportunityResult = "all";
  filters.isOverBudget = "all";
  filters.isDelayed = "all";
  activeStatusTab.value = "all";
  quickFilter.value = "all";
}

function openCreateDrawer(prefill = {}) {
  formMode.value = "create";
  editingCampaignId.value = "";
  Object.assign(form, {
    ...createEmptyForm(),
    ...prefill,
  });
  formDrawerOpen.value = true;
}

function openEditDrawer(record) {
  const target = getCampaignById(record.id);

  if (!target) {
    return;
  }

  formMode.value = "edit";
  editingCampaignId.value = target.id;
  Object.assign(form, {
    ...createEmptyForm(),
    ...target,
    tagsInput: (target.tags || []).join("、"),
    attachmentsInput: (target.attachments || []).join("、"),
  });
  formDrawerOpen.value = true;
}

function openDetail(record) {
  router.push({
    name: "projects-campaign-detail",
    params: { campaignId: record.id },
  });
}

function submitForm() {
  if (!form.activityName.trim()) {
    notify("請輸入活動名稱", "缺少資訊", "warning");
    return;
  }

  if (!form.ownerId) {
    notify("請指定活動負責人", "缺少資訊", "warning");
    return;
  }

  if (toTimestamp(form.endDate) < toTimestamp(form.startDate)) {
    notify("結束日期不可早於開始日期", "日期錯誤", "warning");
    return;
  }

  const payload = {
    activityNo: form.activityNo,
    activityName: form.activityName.trim(),
    activityType: form.activityType,
    status: form.status,
    priority: form.priority,
    topic: form.topic.trim(),
    objective: form.objective.trim(),
    format: form.format.trim(),
    audience: form.audience.trim(),
    channel: form.channel.trim(),
    region: form.region,
    startDate: form.startDate,
    endDate: form.endDate,
    registrationStartDate: form.registrationStartDate,
    registrationEndDate: form.registrationEndDate,
    actualEventDate: form.actualEventDate,
    ownerId: form.ownerId,
    collaboratorIds: [...form.collaboratorIds],
    projectId: form.projectId,
    partnerId: form.partnerId,
    customerIds: [...form.customerIds],
    opportunityIds: [...form.opportunityIds],
    productIds: [...form.productIds],
    budget: Number(form.budget || 0),
    actualCost: Number(form.actualCost || 0),
    signupCount: Number(form.signupCount || 0),
    attendanceCount: Number(form.attendanceCount || 0),
    leadCount: Number(form.leadCount || 0),
    qualifiedLeadCount: Number(form.qualifiedLeadCount || 0),
    opportunityCount: Number(form.opportunityCount || 0),
    estimatedValue: Number(form.estimatedValue || 0),
    actualRevenue: Number(form.actualRevenue || 0),
    resultStatus: form.resultStatus,
    resultSummary: form.resultSummary.trim(),
    description: form.description.trim(),
    notes: form.notes.trim(),
    tags: toPlainArray(form.tagsInput),
    attachments: toPlainArray(form.attachmentsInput),
  };

  if (formMode.value === "edit") {
    const updated = updateCampaign(editingCampaignId.value, payload, "林美雅");

    if (updated) {
      notify(`${updated.activityName} 已更新`);
    }
  } else {
    const created = createCampaign(payload, "林美雅");
    notify(`${created.activityName} 已建立`);
  }

  formDrawerOpen.value = false;
}

async function closeCurrentCampaign(record) {
  let reason = "";

  try {
    const result = await ElMessageBox.prompt("請輸入結案說明", "結案活動", {
      confirmButtonText: "結案",
      cancelButtonText: "取消",
      inputPlaceholder: "例如：活動成效追蹤完成",
    });

    reason = result.value.trim();
  } catch {
    return;
  }

  const updated = closeCampaign(record.id, reason, "林美雅");

  if (updated) {
    notify(`${updated.activityName} 已結案`);
  }
}

async function cancelCurrentCampaign(record) {
  let reason = "";

  try {
    const result = await ElMessageBox.prompt("請輸入取消原因", "取消活動", {
      confirmButtonText: "取消活動",
      cancelButtonText: "返回",
      inputPlaceholder: "例如：策略調整或資源變更",
    });

    reason = result.value.trim();
  } catch {
    return;
  }

  const updated = cancelCampaign(record.id, reason, "林美雅");

  if (updated) {
    notify(`${updated.activityName} 已取消`, "已更新", "warning");
  }
}

function duplicateCurrentCampaign(record) {
  const created = duplicateCampaign(record.id, "林美雅");

  if (created) {
    notify(`已建立複製活動：${created.activityName}`);
  }
}

function batchUpdateStatus() {
  if (selectedRows.value.length === 0) {
    notify("請先勾選活動", "尚未選擇資料", "warning");
    return;
  }

  const updated = batchSetStatus(
    selectedRows.value.map((item) => item.id),
    batchStatus.value,
    { reason: "批次狀態調整", actorName: "林美雅" }
  );

  if (updated.length > 0) {
    notify(`已批次更新 ${updated.length} 筆活動狀態`);
  }
}

function exportCampaigns() {
  notify("已加入匯出佇列，完成後將提供下載連結", "匯出中");
}

async function refreshData() {
  loading.value = true;
  await new Promise((resolve) => setTimeout(resolve, 300));
  loading.value = false;
  notify("活動資料已同步最新狀態");
}

function goProject(record) {
  if (!record.projectId) {
    return;
  }

  router.push({
    name: "project-detail",
    params: { projectId: record.projectId },
  });
}

function goPartner(record) {
  if (!record.partnerId) {
    return;
  }

  router.push({
    name: "partners-list",
    query: { partnerId: record.partnerId },
  });
}

function openOpportunityList(record) {
  router.push({
    name: "opportunities-list",
    query: {
      source: "campaign",
      campaignId: record.id,
      activityNo: record.activityNo,
    },
  });
}

function openTaskTracking(record) {
  router.push({
    name: "projects-tasks",
    query: record.activityId ? { activityId: record.activityId } : {},
  });
}

function openMilestones(record) {
  router.push({
    name: "projects-milestones",
    query: record.activityId ? { activityId: record.activityId } : {},
  });
}

function handleCommand(command, row) {
  if (command === "view") {
    openDetail(row);
    return;
  }

  if (command === "edit") {
    openEditDrawer(row);
    return;
  }

  if (command === "close") {
    closeCurrentCampaign(row);
    return;
  }

  if (command === "duplicate") {
    duplicateCurrentCampaign(row);
    return;
  }

  if (command === "cancel") {
    cancelCurrentCampaign(row);
    return;
  }

  if (command === "tasks") {
    openTaskTracking(row);
    return;
  }

  if (command === "milestones") {
    openMilestones(row);
    return;
  }

  if (command === "opportunities") {
    openOpportunityList(row);
  }
}

async function applyRouteIntent() {
  if (route.name !== "projects-campaigns") {
    return;
  }

  if (route.query.create === "1") {
    openCreateDrawer();
    await router.replace({ name: "projects-campaigns" });
    return;
  }

  if (typeof route.query.edit === "string" && route.query.edit) {
    const target = getCampaignById(route.query.edit);

    if (target) {
      openEditDrawer(target);
    }

    await router.replace({ name: "projects-campaigns" });
  }
}

watch(
  () => [
    activeStatusTab.value,
    quickFilter.value,
    filters.keyword,
    filters.activityType,
    filters.ownerId,
    filters.partnerId,
    filters.projectId,
    filters.region,
    filters.productId,
    filters.startDateRange,
    filters.endDateRange,
    filters.hasOpportunityResult,
    filters.isOverBudget,
    filters.isDelayed,
    pageSize.value,
  ],
  () => {
    currentPage.value = 1;
  },
  { deep: true }
);

watch(
  () => [sortedCampaigns.value.length, pageSize.value],
  () => {
    const maxPage = Math.max(1, Math.ceil(sortedCampaigns.value.length / pageSize.value));

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
            行銷活動
          </h1>
          <p class="text-sm text-slate-500">集中管理活動規劃、執行進度、預算與成果追蹤</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton type="primary" :icon="CirclePlus" @click="openCreateDrawer"
            >新增活動</ElButton
          >
          <ElButton :icon="Download" @click="exportCampaigns">匯出</ElButton>
          <ElSelect v-model="batchStatus" class="!w-[150px]">
            <ElOption
              v-for="item in statusUpdateOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
          <ElButton :icon="Setting" @click="batchUpdateStatus">批次操作</ElButton>
        </div>
      </header>

      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
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
              :prefix-icon="Search"
              placeholder="搜尋活動名稱 / 編號 / 主題"
              clearable
              class="!w-[300px]"
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
          <ElTag round effect="plain">共 {{ sortedCampaigns.length }} 筆</ElTag>
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
            class="grid gap-3 border-b border-slate-200 bg-white px-6 py-4 md:grid-cols-4"
          >
            <ElSelect v-model="filters.activityType">
              <ElOption
                v-for="item in typeOptions"
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
            <ElSelect v-model="filters.partnerId" filterable>
              <ElOption label="全部夥伴" value="all" />
              <ElOption
                v-for="item in partnerDirectory"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </ElSelect>
            <ElSelect v-model="filters.projectId" filterable>
              <ElOption label="全部專案" value="all" />
              <ElOption
                v-for="item in projectOptions"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </ElSelect>
            <ElSelect v-model="filters.region">
              <ElOption
                v-for="item in regionOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
            <ElSelect v-model="filters.productId" filterable>
              <ElOption label="全部產品 / 方案" value="all" />
              <ElOption
                v-for="item in productOptions"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </ElSelect>
            <ElDatePicker
              v-model="filters.startDateRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              start-placeholder="開始日期起"
              end-placeholder="開始日期迄"
              class="!w-full"
            />
            <ElDatePicker
              v-model="filters.endDateRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              start-placeholder="結束日期起"
              end-placeholder="結束日期迄"
              class="!w-full"
            />
            <ElSelect v-model="filters.hasOpportunityResult">
              <ElOption
                v-for="item in yesNoOptions"
                :key="item.value"
                :label="`有商機成果：${item.label}`"
                :value="item.value"
              />
            </ElSelect>
            <ElSelect v-model="filters.isOverBudget">
              <ElOption
                v-for="item in yesNoOptions"
                :key="item.value"
                :label="`超出預算：${item.label}`"
                :value="item.value"
              />
            </ElSelect>
            <ElSelect v-model="filters.isDelayed">
              <ElOption
                v-for="item in yesNoOptions"
                :key="item.value"
                :label="`是否延遲：${item.label}`"
                :value="item.value"
              />
            </ElSelect>
          </div>
        </transition>

        <div class="border-y border-slate-200 px-6 pt-3">
          <ElTabs v-model="activeStatusTab">
            <ElTabPane
              v-for="item in statusTabs"
              :key="item.value"
              :name="item.value"
              :label="item.label"
            />
          </ElTabs>
        </div>

        <ElEmpty
          v-if="sortedCampaigns.length === 0"
          :description="emptyState.title"
          class="py-20"
        >
          <p class="mb-3 text-sm text-slate-500">{{ emptyState.description }}</p>
          <ElButton type="primary" @click="emptyState.action">{{
            emptyState.actionLabel
          }}</ElButton>
        </ElEmpty>

        <template v-else>
          <ElTable
            v-loading="loading"
            :data="pagedCampaigns"
            size="large"
            table-layout="auto"
            @selection-change="handleSelectionChange"
            @sort-change="handleSortChange"
          >
            <ElTableColumn type="selection" width="48" />

            <ElTableColumn label="活動" min-width="240">
              <template #default="{ row }">
                <div class="grid gap-1">
                  <button
                    type="button"
                    class="text-left text-sm font-semibold text-slate-900 hover:text-[#409eff]"
                    @click="openDetail(row)"
                  >
                    {{ row.activityName }}
                  </button>
                  <div class="flex flex-wrap items-center gap-1">
                    <span class="text-xs text-slate-400">{{ row.activityNo }}</span>
                    <ElTag
                      v-for="tag in row.tags.slice(0, 2)"
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

            <ElTableColumn label="活動類型" min-width="120">
              <template #default="{ row }">
                <ElTag
                  round
                  effect="light"
                  :type="campaignTypeMap[row.activityType]?.type"
                >
                  {{ campaignTypeMap[row.activityType]?.label || row.activityType }}
                </ElTag>
              </template>
            </ElTableColumn>

            <ElTableColumn label="活動狀態" min-width="110">
              <template #default="{ row }">
                <ElTag round effect="light" :type="campaignStatusMap[row.status]?.type">
                  {{ campaignStatusMap[row.status]?.label || row.status }}
                </ElTag>
              </template>
            </ElTableColumn>

            <ElTableColumn label="活動負責人" min-width="130">
              <template #default="{ row }">
                <div class="flex items-center gap-2">
                  <img
                    :src="row.ownerAvatar"
                    class="h-7 w-7 rounded-full object-cover"
                    alt="avatar"
                  />
                  <span class="text-sm text-slate-700">{{ row.ownerName || "-" }}</span>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="關聯專案 / 夥伴" min-width="220">
              <template #default="{ row }">
                <div class="grid gap-0.5">
                  <button
                    type="button"
                    class="text-left text-sm text-slate-700 hover:text-[#409eff]"
                    @click="goProject(row)"
                  >
                    {{ row.projectName || "-" }}
                  </button>
                  <button
                    type="button"
                    class="text-left text-xs text-slate-400 hover:text-[#409eff]"
                    @click="goPartner(row)"
                  >
                    {{ row.partnerName || "-" }}
                  </button>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn
              label="開始日期"
              min-width="120"
              prop="startDate"
              sortable="custom"
            >
              <template #default="{ row }">
                <span
                  :class="
                    isUpcomingStart(row.startDate) ? 'text-[#409eff] font-medium' : ''
                  "
                >
                  {{ formatDate(row.startDate) }}
                </span>
              </template>
            </ElTableColumn>

            <ElTableColumn
              label="結束日期"
              min-width="120"
              prop="endDate"
              sortable="custom"
            >
              <template #default="{ row }">
                <span :class="row.isDelayed ? 'text-rose-600 font-medium' : ''">{{
                  formatDate(row.endDate)
                }}</span>
              </template>
            </ElTableColumn>

            <ElTableColumn
              label="預算 / 成本"
              min-width="180"
              prop="budget"
              sortable="custom"
            >
              <template #default="{ row }">
                <div class="grid gap-0.5">
                  <span class="text-sm text-slate-700">{{
                    formatCurrency(row.budget)
                  }}</span>
                  <span
                    class="text-xs"
                    :class="row.isOverBudget ? 'text-rose-600' : 'text-slate-400'"
                  >
                    {{ formatCurrency(row.actualCost) }}
                  </span>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn
              label="名單成果"
              min-width="160"
              prop="leadCount"
              sortable="custom"
            >
              <template #default="{ row }">
                <div class="grid gap-0.5 text-xs text-slate-500">
                  <span
                    >報名 / 出席：{{ row.signupCount }} / {{ row.attendanceCount }}</span
                  >
                  <span
                    >名單 / 有效：{{ row.leadCount }} / {{ row.qualifiedLeadCount }}</span
                  >
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn
              label="關聯商機"
              min-width="110"
              prop="opportunityCount"
              sortable="custom"
            >
              <template #default="{ row }">
                <button
                  type="button"
                  class="text-sm text-[#409eff] hover:text-[#337ecc]"
                  @click="openOpportunityList(row)"
                >
                  {{ row.opportunityCount }} 筆
                </button>
              </template>
            </ElTableColumn>

            <ElTableColumn label="成效摘要" min-width="180">
              <template #default="{ row }">
                <div class="grid gap-1">
                  <span class="text-xs text-slate-500"
                    >成交 {{ formatCurrency(row.actualRevenue) }}</span
                  >
                  <div class="flex items-center gap-1">
                    <ElTag
                      round
                      effect="plain"
                      :type="campaignResultMap[row.resultStatus]?.type"
                    >
                      {{ campaignResultMap[row.resultStatus]?.label || row.resultStatus }}
                    </ElTag>
                    <span class="text-xs text-slate-400">ROI {{ row.roiRate }}%</span>
                  </div>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn
              label="最近更新時間"
              min-width="160"
              prop="updatedAt"
              sortable="custom"
            >
              <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
            </ElTableColumn>

            <ElTableColumn label="操作" fixed="right" min-width="170">
              <template #default="{ row }">
                <div class="flex items-center gap-1">
                  <ElButton text size="small" @click="openDetail(row)">查看</ElButton>
                  <ElButton text size="small" @click="openEditDrawer(row)">編輯</ElButton>
                  <ElDropdown @command="(command) => handleCommand(command, row)">
                    <ElButton text size="small" :icon="MoreFilled" />
                    <template #dropdown>
                      <ElDropdownMenu>
                        <ElDropdownItem command="close">結案</ElDropdownItem>
                        <ElDropdownItem command="duplicate">複製活動</ElDropdownItem>
                        <ElDropdownItem command="tasks">查看任務</ElDropdownItem>
                        <ElDropdownItem command="milestones">查看里程碑</ElDropdownItem>
                        <ElDropdownItem command="opportunities">查看商機</ElDropdownItem>
                        <ElDropdownItem command="cancel" divided>取消活動</ElDropdownItem>
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
              :page-size="pageSize"
              layout="total, prev, pager, next"
              :total="sortedCampaigns.length"
              background
            />

            <ElSelect v-model="pageSize" class="!w-[110px]" @change="currentPage = 1">
              <ElOption :value="10" label="10 Item" />
              <ElOption :value="20" label="20 Item" />
              <ElOption :value="50" label="50 Item" />
            </ElSelect>
          </div>
        </template>
      </section>
    </section>

    <ElDrawer
      v-model="formDrawerOpen"
      :title="formMode === 'edit' ? '編輯行銷活動' : '新增行銷活動'"
      size="760px"
      destroy-on-close
    >
      <div class="grid gap-5 pb-4">
        <section
          class="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
        >
          <h3 class="text-sm font-semibold text-slate-800">基本資料</h3>
          <ElForm label-width="108px" class="grid gap-3 md:grid-cols-2">
            <ElFormItem label="活動名稱" required class="md:col-span-2">
              <ElInput v-model="form.activityName" />
            </ElFormItem>
            <ElFormItem label="活動編號">
              <ElInput v-model="form.activityNo" />
            </ElFormItem>
            <ElFormItem label="活動類型">
              <ElSelect v-model="form.activityType">
                <ElOption
                  v-for="(meta, value) in campaignTypeMap"
                  :key="value"
                  :label="meta.label"
                  :value="value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="活動狀態">
              <ElSelect v-model="form.status">
                <ElOption
                  v-for="(meta, value) in campaignStatusMap"
                  :key="value"
                  :label="meta.label"
                  :value="value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="活動優先級">
              <ElSelect v-model="form.priority">
                <ElOption
                  v-for="item in priorityOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </section>

        <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-800">活動規劃</h3>
          <ElForm label-width="108px" class="grid gap-3">
            <ElFormItem label="活動主題"><ElInput v-model="form.topic" /></ElFormItem>
            <ElFormItem label="活動目標"
              ><ElInput v-model="form.objective" type="textarea" :rows="2"
            /></ElFormItem>
            <ElFormItem label="活動形式"><ElInput v-model="form.format" /></ElFormItem>
            <ElFormItem label="目標受眾"><ElInput v-model="form.audience" /></ElFormItem>
            <ElFormItem label="主要渠道"><ElInput v-model="form.channel" /></ElFormItem>
            <ElFormItem label="地區 / 市場">
              <ElSelect v-model="form.region">
                <ElOption
                  v-for="item in regionOptions.filter((option) => option.value !== 'all')"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </section>

        <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-800">時程</h3>
          <ElForm label-width="108px" class="grid gap-3 md:grid-cols-2">
            <ElFormItem label="開始日期"
              ><ElDatePicker
                v-model="form.startDate"
                value-format="YYYY-MM-DD"
                class="!w-full"
            /></ElFormItem>
            <ElFormItem label="結束日期"
              ><ElDatePicker
                v-model="form.endDate"
                value-format="YYYY-MM-DD"
                class="!w-full"
            /></ElFormItem>
            <ElFormItem label="報名開始"
              ><ElDatePicker
                v-model="form.registrationStartDate"
                value-format="YYYY-MM-DD"
                class="!w-full"
            /></ElFormItem>
            <ElFormItem label="報名截止"
              ><ElDatePicker
                v-model="form.registrationEndDate"
                value-format="YYYY-MM-DD"
                class="!w-full"
            /></ElFormItem>
            <ElFormItem label="實際執行日期" class="md:col-span-2">
              <ElDatePicker
                v-model="form.actualEventDate"
                value-format="YYYY-MM-DD"
                class="!w-full"
              />
            </ElFormItem>
          </ElForm>
        </section>

        <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-800">關聯資料</h3>
          <ElForm label-width="108px" class="grid gap-3 md:grid-cols-2">
            <ElFormItem label="活動負責人" required>
              <ElSelect v-model="form.ownerId">
                <ElOption
                  v-for="item in ownerOptions.filter((option) => option.value !== 'all')"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="協作人員">
              <ElSelect v-model="form.collaboratorIds" multiple collapse-tags>
                <ElOption
                  v-for="item in ownerOptions.filter((option) => option.value !== 'all')"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="關聯專案">
              <ElSelect v-model="form.projectId" filterable>
                <ElOption label="無" value="" />
                <ElOption
                  v-for="item in projectOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="關聯夥伴">
              <ElSelect v-model="form.partnerId" filterable>
                <ElOption label="無" value="" />
                <ElOption
                  v-for="item in partnerDirectory"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="關聯客戶" class="md:col-span-2">
              <ElSelect v-model="form.customerIds" multiple collapse-tags filterable>
                <ElOption
                  v-for="item in customerOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="關聯商機" class="md:col-span-2">
              <ElSelect v-model="form.opportunityIds" multiple collapse-tags filterable>
                <ElOption
                  v-for="item in opportunityOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="產品 / 方案" class="md:col-span-2">
              <ElSelect v-model="form.productIds" multiple collapse-tags filterable>
                <ElOption
                  v-for="item in productOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </section>

        <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-800">預算與成果</h3>
          <ElForm label-width="108px" class="grid gap-3 md:grid-cols-2">
            <ElFormItem label="活動預算"
              ><ElInputNumber v-model="form.budget" :min="0" class="!w-full"
            /></ElFormItem>
            <ElFormItem label="實際成本"
              ><ElInputNumber v-model="form.actualCost" :min="0" class="!w-full"
            /></ElFormItem>
            <ElFormItem label="報名人數"
              ><ElInputNumber v-model="form.signupCount" :min="0" class="!w-full"
            /></ElFormItem>
            <ElFormItem label="出席人數"
              ><ElInputNumber v-model="form.attendanceCount" :min="0" class="!w-full"
            /></ElFormItem>
            <ElFormItem label="名單數"
              ><ElInputNumber v-model="form.leadCount" :min="0" class="!w-full"
            /></ElFormItem>
            <ElFormItem label="有效名單"
              ><ElInputNumber v-model="form.qualifiedLeadCount" :min="0" class="!w-full"
            /></ElFormItem>
            <ElFormItem label="關聯商機數"
              ><ElInputNumber v-model="form.opportunityCount" :min="0" class="!w-full"
            /></ElFormItem>
            <ElFormItem label="預估產值"
              ><ElInputNumber v-model="form.estimatedValue" :min="0" class="!w-full"
            /></ElFormItem>
            <ElFormItem label="實際成交金額"
              ><ElInputNumber v-model="form.actualRevenue" :min="0" class="!w-full"
            /></ElFormItem>
            <ElFormItem label="成效標記">
              <ElSelect v-model="form.resultStatus">
                <ElOption
                  v-for="item in resultOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="成效摘要" class="md:col-span-2">
              <ElInput v-model="form.resultSummary" type="textarea" :rows="2" />
            </ElFormItem>
          </ElForm>
        </section>

        <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-800">說明與附件</h3>
          <ElForm label-width="108px" class="grid gap-3">
            <ElFormItem label="活動說明"
              ><ElInput v-model="form.description" type="textarea" :rows="3"
            /></ElFormItem>
            <ElFormItem label="備註"
              ><ElInput v-model="form.notes" type="textarea" :rows="2"
            /></ElFormItem>
            <ElFormItem label="標籤"
              ><ElInput v-model="form.tagsInput" placeholder="以 、 或 , 分隔"
            /></ElFormItem>
            <ElFormItem label="附件"
              ><ElInput v-model="form.attachmentsInput" placeholder="以 、 或 , 分隔"
            /></ElFormItem>
          </ElForm>
        </section>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="formDrawerOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitForm">
            {{ formMode === "edit" ? "儲存變更" : "建立活動" }}
          </ElButton>
        </div>
      </template>
    </ElDrawer>
  </div>
</template>

<style scoped>
:deep(.el-tabs__header) {
  margin: 0 !important;
}
</style>
