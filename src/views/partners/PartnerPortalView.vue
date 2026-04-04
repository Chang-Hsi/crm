<script setup>
import { computed, onActivated, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ElButton,
  ElCheckbox,
  ElCheckboxGroup,
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
  ElSwitch,
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
} from "@element-plus/icons-vue";
import {
  dataScopeOptions,
  fileScopeOptions,
  homepageSectionOptions,
  inviteStatusMap,
  moduleOptions,
  partnerDirectory,
  permissionTemplateOptions,
  portalStatusMap,
  portalTypeMap,
  resourceCategoryOptions,
} from "../../data/partnerPortals";
import { usePartnerPortalStore } from "../../composables/usePartnerPortalStore";

const route = useRoute();
const router = useRouter();
const {
  activatePortal,
  batchResendInvites,
  batchUpdateStatus,
  createPortal,
  getNextPortalNo,
  getPortalById,
  portals,
  resendInvite,
  resetPortal,
  suspendPortal,
  updatePortal,
} = usePartnerPortalStore();

const loading = ref(false);
const pageSize = ref(10);
const currentPage = ref(1);
const filterPanelOpen = ref(false);
const selectedRows = ref([]);
const sortState = reactive({
  prop: "updatedAt",
  order: "descending",
});

const formDrawerOpen = ref(false);
const formMode = ref("create");
const editingPortalId = ref("");
const hydratingForm = ref(false);

const partnerOptions = computed(() => [
  { label: "全部夥伴", value: "all" },
  ...partnerDirectory.map((item) => ({
    label: item.name,
    value: item.id,
  })),
]);

const portalStatusOptions = [
  { label: "全部狀態", value: "all" },
  ...Object.entries(portalStatusMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const portalTypeOptions = [
  { label: "全部類型", value: "all" },
  ...Object.entries(portalTypeMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const yesNoOptions = [
  { label: "全部", value: "all" },
  { label: "是", value: "yes" },
  { label: "否", value: "no" },
];

const filters = reactive({
  keyword: "",
  partnerId: "all",
  status: "all",
  portalType: "all",
  isEnabled: "all",
  hasRecentLogin: "all",
  lastLoginRange: [],
  invitedRange: [],
  createdRange: [],
  visibleModule: "all",
});

function createEmptyForm() {
  return {
    portalNo: getNextPortalNo(),
    partnerId: "",
    partnerName: "",
    portalName: "",
    portalType: "basic_portal",
    status: "pending_activation",
    inviteStatus: "not_sent",
    contactName: "",
    contactTitle: "",
    email: "",
    phone: "",
    loginAccount: "",
    maxUserCount: 1,
    invitationEnabled: false,
    sendInvite: false,
    permissionTemplate: "basic",
    visibleModules: [],
    downloadScopes: [],
    submissionScopes: [],
    canViewPerformance: false,
    canViewSettlement: false,
    canViewConditions: false,
    canViewOpportunities: false,
    canDownloadFiles: true,
    canUploadFiles: false,
    canSubmitClaims: false,
    canViewNotifications: true,
    homepageSections: [],
    resourceCategories: [],
    fileScopes: [],
    dataScopes: [],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    notes: "",
    internalNotes: "",
  };
}

const form = reactive(createEmptyForm());

const summaryCards = computed(() => {
  const opened = portals.value.filter((item) => item.status !== "not_created").length;
  const active = portals.value.filter((item) => item.status === "active").length;
  const pending = portals.value.filter((item) => item.status === "pending_activation")
    .length;
  const suspended = portals.value.filter((item) => item.status === "suspended").length;
  const recentActive = portals.value.filter((item) => isRecentLogin(item.lastLoginAt))
    .length;
  const stale = portals.value.filter((item) => isLongInactive(item.lastLoginAt)).length;

  return [
    { label: "已開通入口數", value: opened },
    { label: "啟用中入口數", value: active },
    { label: "待啟用入口數", value: pending },
    { label: "停用入口數", value: suspended },
    { label: "近 30 天有登入入口數", value: recentActive },
    { label: "長時間未使用入口數", value: stale },
  ];
});

function toTimestamp(value) {
  if (!value) {
    return 0;
  }

  const next = new Date(value);
  return Number.isNaN(next.getTime()) ? 0 : next.getTime();
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

function notify(message, title = "已更新", type = "success") {
  ElNotification({
    title,
    message,
    type,
    position: "top-right",
  });
}

function isRecentLogin(lastLoginAt) {
  const time = toTimestamp(lastLoginAt);

  if (!time) {
    return false;
  }

  return Date.now() - time <= 30 * 24 * 60 * 60 * 1000;
}

function isLongInactive(lastLoginAt) {
  const time = toTimestamp(lastLoginAt);

  if (!time) {
    return false;
  }

  return Date.now() - time > 60 * 24 * 60 * 60 * 1000;
}

function getLoginHint(record) {
  if (!record.lastLoginAt) {
    return "尚未登入";
  }

  if (isLongInactive(record.lastLoginAt)) {
    return "超過 60 天未登入";
  }

  if (isRecentLogin(record.lastLoginAt)) {
    return "近 30 天有登入";
  }

  return "近期未登入";
}

function getPartnerById(partnerId) {
  return partnerDirectory.find((item) => item.id === partnerId) ?? null;
}

function applyPermissionTemplate(template) {
  if (template === "performance") {
    form.visibleModules = ["announcements", "performance", "opportunities", "documents"];
    form.downloadScopes = ["contract_docs", "guidelines"];
    form.submissionScopes = [];
    form.canViewPerformance = true;
    form.canViewSettlement = false;
    form.canViewConditions = false;
    form.canViewOpportunities = true;
    form.canDownloadFiles = true;
    form.canUploadFiles = false;
    form.canSubmitClaims = false;
    form.canViewNotifications = true;
    form.homepageSections = ["announcements", "performance", "opportunities"];
    form.resourceCategories = ["contract_docs", "guidelines"];
    form.fileScopes = ["project_docs"];
    form.dataScopes = ["own_performance", "own_opportunities", "announcements"];
    return;
  }

  if (template === "settlement") {
    form.visibleModules = ["announcements", "settlement", "documents", "claims"];
    form.downloadScopes = ["claim_forms", "contract_docs"];
    form.submissionScopes = ["claims", "documents"];
    form.canViewPerformance = false;
    form.canViewSettlement = true;
    form.canViewConditions = false;
    form.canViewOpportunities = false;
    form.canDownloadFiles = true;
    form.canUploadFiles = true;
    form.canSubmitClaims = true;
    form.canViewNotifications = true;
    form.homepageSections = ["announcements", "settlement", "downloads"];
    form.resourceCategories = ["claim_forms", "contract_docs"];
    form.fileScopes = ["own_only"];
    form.dataScopes = ["own_settlement", "announcements"];
    return;
  }

  if (template === "full") {
    form.visibleModules = [
      "announcements",
      "conditions",
      "performance",
      "settlement",
      "opportunities",
      "documents",
      "claims",
    ];
    form.downloadScopes = [
      "contract_docs",
      "guidelines",
      "campaign_assets",
      "claim_forms",
    ];
    form.submissionScopes = ["claims", "documents"];
    form.canViewPerformance = true;
    form.canViewSettlement = true;
    form.canViewConditions = true;
    form.canViewOpportunities = true;
    form.canDownloadFiles = true;
    form.canUploadFiles = true;
    form.canSubmitClaims = true;
    form.canViewNotifications = true;
    form.homepageSections = [
      "announcements",
      "todo",
      "cooperation_summary",
      "performance",
      "settlement",
      "downloads",
    ];
    form.resourceCategories = [
      "contract_docs",
      "guidelines",
      "campaign_assets",
      "claim_forms",
    ];
    form.fileScopes = ["own_only", "project_docs", "shared_library"];
    form.dataScopes = [
      "own_settlement",
      "own_performance",
      "own_opportunities",
      "active_terms",
      "announcements",
    ];
    return;
  }

  form.visibleModules = ["announcements", "conditions", "documents"];
  form.downloadScopes = ["contract_docs", "guidelines"];
  form.submissionScopes = [];
  form.canViewPerformance = false;
  form.canViewSettlement = false;
  form.canViewConditions = true;
  form.canViewOpportunities = false;
  form.canDownloadFiles = true;
  form.canUploadFiles = false;
  form.canSubmitClaims = false;
  form.canViewNotifications = true;
  form.homepageSections = ["announcements", "conditions", "downloads"];
  form.resourceCategories = ["contract_docs", "guidelines"];
  form.fileScopes = ["own_only"];
  form.dataScopes = ["active_terms", "announcements"];
}

function syncPartnerContact(partnerId) {
  const partner = getPartnerById(partnerId);

  if (!partner) {
    return;
  }

  form.partnerName = partner.name;
  form.contactName = partner.contactName;
  form.contactTitle = partner.contactTitle;
  form.email = partner.email;
  form.phone = partner.phone;
  form.loginAccount = partner.loginAccount;

  if (!form.portalName.trim()) {
    form.portalName = `${partner.name} 夥伴入口`;
  }
}

const filteredRecords = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return portals.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.portalName.toLowerCase().includes(keyword) ||
      item.portalNo.toLowerCase().includes(keyword) ||
      item.partnerName.toLowerCase().includes(keyword) ||
      item.contactName.toLowerCase().includes(keyword) ||
      item.email.toLowerCase().includes(keyword);

    const matchesPartner =
      filters.partnerId === "all" || item.partnerId === filters.partnerId;
    const matchesStatus = filters.status === "all" || item.status === filters.status;
    const matchesType =
      filters.portalType === "all" || item.portalType === filters.portalType;
    const matchesEnabled =
      filters.isEnabled === "all" ||
      (filters.isEnabled === "yes" ? item.status === "active" : item.status !== "active");
    const matchesRecentLogin =
      filters.hasRecentLogin === "all" ||
      (filters.hasRecentLogin === "yes" ? Boolean(item.lastLoginAt) : !item.lastLoginAt);
    const matchesModule =
      filters.visibleModule === "all" ||
      item.visibleModules.includes(filters.visibleModule);
    const matchesLastLogin = isDateWithinRange(item.lastLoginAt, filters.lastLoginRange);
    const matchesInvited = isDateWithinRange(item.invitedAt, filters.invitedRange);
    const matchesCreated = isDateWithinRange(item.createdAt, filters.createdRange);

    return (
      matchesKeyword &&
      matchesPartner &&
      matchesStatus &&
      matchesType &&
      matchesEnabled &&
      matchesRecentLogin &&
      matchesModule &&
      matchesLastLogin &&
      matchesInvited &&
      matchesCreated
    );
  });
});

const sortedRecords = computed(() => {
  const records = [...filteredRecords.value];

  if (!sortState.prop || !sortState.order) {
    return records.sort(
      (left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt)
    );
  }

  const direction = sortState.order === "ascending" ? 1 : -1;

  return records.sort((left, right) => {
    if (["createdAt", "updatedAt", "lastLoginAt", "invitedAt"].includes(sortState.prop)) {
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

const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedRecords.value.slice(start, start + pageSize.value);
});

const emptyState = computed(() => {
  if (portals.value.length === 0) {
    return {
      title: "目前尚無夥伴入口資料",
      description: "可先建立第一個夥伴入口，開始啟用外部協作。",
      actionLabel: "新增入口",
      action: openCreateDrawer,
    };
  }

  return {
    title: "沒有符合條件的夥伴入口",
    description: "請調整搜尋條件或清除篩選。",
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
  filters.partnerId = "all";
  filters.status = "all";
  filters.portalType = "all";
  filters.isEnabled = "all";
  filters.hasRecentLogin = "all";
  filters.lastLoginRange = [];
  filters.invitedRange = [];
  filters.createdRange = [];
  filters.visibleModule = "all";
  currentPage.value = 1;
}

function exportPortals() {
  notify("已加入匯出佇列，完成後將提供下載連結", "匯出中");
}

async function refreshData() {
  loading.value = true;
  await new Promise((resolve) => {
    setTimeout(resolve, 250);
  });
  loading.value = false;
  notify("夥伴入口資料已同步最新狀態");
}

function openCreateDrawer() {
  formMode.value = "create";
  editingPortalId.value = "";
  hydratingForm.value = true;
  Object.assign(form, createEmptyForm());
  applyPermissionTemplate(form.permissionTemplate);
  hydratingForm.value = false;
  formDrawerOpen.value = true;
}

function openEditDrawerById(portalId) {
  const target = getPortalById(portalId);

  if (!target) {
    notify("找不到要編輯的夥伴入口", "資料不存在", "warning");
    return;
  }

  formMode.value = "edit";
  editingPortalId.value = target.id;
  hydratingForm.value = true;
  Object.assign(form, {
    ...createEmptyForm(),
    ...target,
    sendInvite: false,
    permissionTemplate: "basic",
  });
  hydratingForm.value = false;
  formDrawerOpen.value = true;
}

function openEditDrawer(row) {
  openEditDrawerById(row.id);
}

function openDetail(row) {
  router.push({
    name: "partners-portal-detail",
    params: { portalId: row.id },
  });
}

function goPartner(row) {
  router.push({
    name: "partners-list",
    query: { partnerId: row.partnerId },
  });
}

async function suspendRow(row) {
  let reason = "";

  try {
    const result = await ElMessageBox.prompt("請輸入停用原因", "停用夥伴入口", {
      confirmButtonText: "停用",
      cancelButtonText: "取消",
      inputPlaceholder: "例如：合作暫停、異常登入、權限調整",
    });

    reason = result.value.trim();
  } catch {
    return;
  }

  const updated = suspendPortal(row.id, reason);

  if (updated) {
    notify(`${updated.portalName} 已停用`);
  }
}

function activateRow(row) {
  const updated = activatePortal(row.id);

  if (updated) {
    notify(`${updated.portalName} 已啟用`);
  }
}

function resendInviteRow(row) {
  const updated = resendInvite(row.id);

  if (updated) {
    notify(`${updated.portalName} 已重寄邀請`);
  }
}

function resetRow(row) {
  const updated = resetPortal(row.id);

  if (updated) {
    notify(`${updated.portalName} 已重設入口`, "已重設", "warning");
  }
}

function handleRowCommand(command, row) {
  if (command === "detail") {
    openDetail(row);
    return;
  }

  if (command === "edit") {
    openEditDrawer(row);
    return;
  }

  if (command === "partner") {
    goPartner(row);
    return;
  }

  if (command === "invite") {
    resendInviteRow(row);
    return;
  }

  if (command === "activate") {
    activateRow(row);
    return;
  }

  if (command === "suspend") {
    suspendRow(row);
    return;
  }

  if (command === "reset") {
    resetRow(row);
  }
}

function submitForm() {
  const partner = getPartnerById(form.partnerId);

  if (!partner) {
    notify("請先選擇關聯夥伴", "缺少資訊", "warning");
    return;
  }

  if (!form.portalName.trim()) {
    notify("請輸入入口名稱", "缺少資訊", "warning");
    return;
  }

  if (!form.email.trim() || !form.loginAccount.trim()) {
    notify("請填寫登入帳號與聯絡 Email", "缺少資訊", "warning");
    return;
  }

  const payload = {
    portalNo: form.portalNo,
    partnerId: partner.id,
    partnerName: partner.name,
    portalName: form.portalName.trim(),
    portalType: form.portalType,
    status: form.status,
    inviteStatus: form.inviteStatus,
    contactName: form.contactName.trim(),
    contactTitle: form.contactTitle.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    loginAccount: form.loginAccount.trim(),
    maxUserCount: Number(form.maxUserCount ?? 1),
    invitationEnabled: form.invitationEnabled,
    visibleModules: [...form.visibleModules],
    downloadScopes: [...form.downloadScopes],
    submissionScopes: [...form.submissionScopes],
    canViewPerformance: form.canViewPerformance,
    canViewSettlement: form.canViewSettlement,
    canViewConditions: form.canViewConditions,
    canViewOpportunities: form.canViewOpportunities,
    canDownloadFiles: form.canDownloadFiles,
    canUploadFiles: form.canUploadFiles,
    canSubmitClaims: form.canSubmitClaims,
    canViewNotifications: form.canViewNotifications,
    homepageSections: [...form.homepageSections],
    resourceCategories: [...form.resourceCategories],
    fileScopes: [...form.fileScopes],
    dataScopes: [...form.dataScopes],
    startDate: form.startDate,
    endDate: form.endDate,
    notes: form.notes.trim(),
    internalNotes: form.internalNotes.trim(),
    sendInvite: form.sendInvite,
  };

  if (formMode.value === "edit") {
    const target = getPortalById(editingPortalId.value);
    const previousModules = [...(target?.visibleModules ?? [])];
    const updated = updatePortal(editingPortalId.value, payload);

    if (!updated) {
      return;
    }

    const permissionsReduced = previousModules.some(
      (module) => !payload.visibleModules.includes(module)
    );

    notify(
      permissionsReduced && updated.status === "active"
        ? `${updated.portalName} 已更新，縮減權限會立即影響夥伴可見內容`
        : `${updated.portalName} 已更新`
    );
  } else {
    const created = createPortal(payload);
    notify(
      payload.sendInvite
        ? `${created.portalName} 已建立並寄送邀請`
        : `${created.portalName} 已建立`
    );
  }

  formDrawerOpen.value = false;
}

function batchActivate() {
  if (selectedRows.value.length === 0) {
    notify("請先勾選要啟用的入口", "尚未選擇資料", "warning");
    return;
  }

  const updated = batchUpdateStatus(
    selectedRows.value.map((item) => item.id),
    "active"
  );
  notify(`已批次啟用 ${updated.length} 筆入口`);
}

async function batchSuspend() {
  if (selectedRows.value.length === 0) {
    notify("請先勾選要停用的入口", "尚未選擇資料", "warning");
    return;
  }

  let reason = "";

  try {
    const result = await ElMessageBox.prompt("請輸入批次停用原因", "批次停用入口", {
      confirmButtonText: "停用",
      cancelButtonText: "取消",
      inputPlaceholder: "例如：合作策略調整、帳號盤點",
    });

    reason = result.value.trim();
  } catch {
    return;
  }

  const updated = batchUpdateStatus(
    selectedRows.value.map((item) => item.id),
    "suspended",
    { reason }
  );
  notify(`已批次停用 ${updated.length} 筆入口`);
}

function batchResend() {
  if (selectedRows.value.length === 0) {
    notify("請先勾選要重寄邀請的入口", "尚未選擇資料", "warning");
    return;
  }

  const updated = batchResendInvites(selectedRows.value.map((item) => item.id));
  notify(`已批次重寄 ${updated.length} 筆邀請`);
}

async function applyRouteIntent() {
  if (route.name !== "partners-portal") {
    return;
  }

  if (route.query.create === "1") {
    openCreateDrawer();
    await router.replace({ name: "partners-portal" });
    return;
  }

  if (typeof route.query.edit === "string" && route.query.edit) {
    openEditDrawerById(route.query.edit);
    await router.replace({ name: "partners-portal" });
  }
}

watch(
  () => form.partnerId,
  (partnerId) => {
    if (!partnerId) {
      return;
    }

    syncPartnerContact(partnerId);
  }
);

watch(
  () => form.permissionTemplate,
  (template) => {
    if (!template || hydratingForm.value) {
      return;
    }

    applyPermissionTemplate(template);
  }
);

watch(
  () => [
    filters.keyword,
    filters.partnerId,
    filters.status,
    filters.portalType,
    filters.isEnabled,
    filters.hasRecentLogin,
    filters.lastLoginRange,
    filters.invitedRange,
    filters.createdRange,
    filters.visibleModule,
    pageSize.value,
  ],
  () => {
    currentPage.value = 1;
  },
  { deep: true }
);

watch(
  () => [sortedRecords.value.length, pageSize.value],
  () => {
    const maxPage = Math.max(1, Math.ceil(sortedRecords.value.length / pageSize.value));

    if (currentPage.value > maxPage) {
      currentPage.value = maxPage;
    }
  },
  { immediate: true }
);

watch(
  () => [route.name, route.query.edit, route.query.create],
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
            夥伴入口
          </h1>
          <p class="text-sm text-slate-500">
            集中管理夥伴登入入口、可見功能、帳號狀態與協作權限
          </p>
        </div>

        <div class="flex flex-wrap items-center">
          <ElButton type="primary" :icon="CirclePlus" @click="openCreateDrawer"
            >新增入口</ElButton
          >
          <ElButton :icon="Download" @click="exportPortals">匯出</ElButton>
          <ElButton @click="batchActivate">批次啟用</ElButton>
          <ElButton @click="batchSuspend">批次停用</ElButton>
          <ElButton @click="batchResend">批次重寄邀請</ElButton>
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
        <div
          class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5"
        >
          <div class="flex flex-wrap items-center gap-2">
            <ElInput
              v-model="filters.keyword"
              :prefix-icon="Search"
              placeholder="搜尋夥伴 / 入口編號 / 聯絡人 / Email"
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
            <ElTag round effect="plain">共 {{ sortedRecords.length }} 筆</ElTag>
            <ElTag v-if="selectedRows.length > 0" round type="primary" effect="light">
              已勾選 {{ selectedRows.length }} 筆
            </ElTag>
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
            class="grid gap-3 border-b border-slate-200 bg-white px-6 py-4 md:grid-cols-4"
          >
            <ElSelect v-model="filters.partnerId">
              <ElOption
                v-for="item in partnerOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.status">
              <ElOption
                v-for="item in portalStatusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.portalType">
              <ElOption
                v-for="item in portalTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.visibleModule">
              <ElOption label="全部可見模組" value="all" />
              <ElOption
                v-for="item in moduleOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.isEnabled">
              <ElOption
                v-for="item in yesNoOptions"
                :key="item.value"
                :label="`是否啟用：${item.label}`"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.hasRecentLogin">
              <ElOption
                v-for="item in yesNoOptions"
                :key="item.value"
                :label="`是否有登入：${item.label}`"
                :value="item.value"
              />
            </ElSelect>

            <ElDatePicker
              v-model="filters.lastLoginRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              start-placeholder="最近登入起"
              end-placeholder="最近登入迄"
            />

            <ElDatePicker
              v-model="filters.invitedRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              start-placeholder="邀請寄送起"
              end-placeholder="邀請寄送迄"
            />

            <ElDatePicker
              v-model="filters.createdRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              start-placeholder="建立日期起"
              end-placeholder="建立日期迄"
            />
          </div>
        </transition>

        <ElTable
          :data="pagedRecords"
          size="large"
          table-layout="auto"
          :loading="loading"
          @selection-change="handleSelectionChange"
          @sort-change="handleSortChange"
        >
          <ElTableColumn type="selection" width="52" />

          <ElTableColumn label="入口" min-width="220">
            <template #default="{ row }">
              <div class="grid gap-0.5">
                <button
                  type="button"
                  class="text-left text-sm font-semibold text-slate-900 hover:text-[#409eff]"
                  @click="openDetail(row)"
                >
                  {{ row.portalName }}
                </button>
                <span class="text-xs text-slate-400">{{ row.portalNo }}</span>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="關聯夥伴" min-width="200">
            <template #default="{ row }">
              <button
                type="button"
                class="text-left text-sm font-medium text-[#409eff] hover:text-[#337ecc]"
                @click="goPartner(row)"
              >
                {{ row.partnerName }}
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="主要聯絡人" min-width="160">
            <template #default="{ row }">
              <div class="grid gap-0.5">
                <span class="text-sm text-slate-800">{{ row.contactName }}</span>
                <span class="text-xs text-slate-400">{{ row.contactTitle || "-" }}</span>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="登入帳號 / Email" min-width="220">
            <template #default="{ row }">
              <div class="grid gap-0.5">
                <span class="text-sm text-slate-800">{{ row.loginAccount }}</span>
                <span class="text-xs text-slate-400">{{ row.email }}</span>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="入口狀態" min-width="110">
            <template #default="{ row }">
              <ElTag round effect="light" :type="portalStatusMap[row.status]?.type">
                {{ portalStatusMap[row.status]?.label || row.status }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="可見功能" min-width="320">
            <template #default="{ row }">
              <div class="flex flex-wrap gap-1">
                <ElTag
                  v-for="module in row.visibleModules.slice(0, 3)"
                  :key="module"
                  round
                  effect="plain"
                >
                  {{
                    moduleOptions.find((item) => item.value === module)?.label || module
                  }}
                </ElTag>
                <ElTag
                  v-if="row.visibleModules.length > 3"
                  round
                  effect="plain"
                  type="info"
                >
                  +{{ row.visibleModules.length - 3 }}
                </ElTag>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn
            label="最近登入"
            min-width="160"
            prop="lastLoginAt"
            sortable="custom"
          >
            <template #default="{ row }">
              <div class="grid gap-0.5">
                <span class="text-sm text-slate-800">{{
                  formatDateTime(row.lastLoginAt)
                }}</span>
                <span
                  class="text-xs"
                  :class="
                    isLongInactive(row.lastLoginAt) ? 'text-amber-600' : 'text-slate-400'
                  "
                >
                  {{ getLoginHint(row) }}
                </span>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="邀請狀態" min-width="126">
            <template #default="{ row }">
              <div class="grid gap-0.5">
                <ElTag
                  round
                  effect="light"
                  :type="inviteStatusMap[row.inviteStatus]?.type"
                >
                  {{ inviteStatusMap[row.inviteStatus]?.label || row.inviteStatus }}
                </ElTag>
                <span class="text-xs text-slate-400">{{
                  formatDateTime(row.invitedAt)
                }}</span>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn
            label="建立時間"
            min-width="126"
            prop="createdAt"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="最後更新"
            min-width="126"
            prop="updatedAt"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
          </ElTableColumn>

          <ElTableColumn label="操作" fixed="right" width="156">
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
                      <ElDropdownItem command="invite">重寄邀請</ElDropdownItem>
                      <ElDropdownItem command="activate">啟用</ElDropdownItem>
                      <ElDropdownItem command="suspend">停用</ElDropdownItem>
                      <ElDropdownItem command="reset">重設入口</ElDropdownItem>
                      <ElDropdownItem command="partner" divided>查看夥伴</ElDropdownItem>
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
            :total="sortedRecords.length"
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
      :title="formMode === 'edit' ? '編輯夥伴入口' : '新增夥伴入口'"
      size="720px"
      destroy-on-close
    >
      <div class="grid gap-6 pb-4">
        <section
          class="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
        >
          <div class="grid gap-1">
            <h3 class="text-sm font-semibold text-slate-800">基本資料</h3>
            <p class="text-xs text-slate-500">設定關聯夥伴、入口名稱、類型與狀態。</p>
          </div>

          <ElForm label-width="108px" class="grid gap-3 md:grid-cols-2">
            <ElFormItem label="關聯夥伴" required>
              <ElSelect v-model="form.partnerId" filterable>
                <ElOption
                  v-for="item in partnerOptions.filter(
                    (option) => option.value !== 'all'
                  )"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="入口編號">
              <ElInput v-model="form.portalNo" />
            </ElFormItem>

            <ElFormItem label="入口名稱" required class="md:col-span-2">
              <ElInput
                v-model="form.portalName"
                placeholder="例如：beanfun 夥伴協作入口"
              />
            </ElFormItem>

            <ElFormItem label="入口類型">
              <ElSelect v-model="form.portalType">
                <ElOption
                  v-for="item in portalTypeOptions.filter(
                    (option) => option.value !== 'all'
                  )"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="入口狀態">
              <ElSelect v-model="form.status">
                <ElOption
                  v-for="item in portalStatusOptions.filter(
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
            <h3 class="text-sm font-semibold text-slate-800">聯絡與帳號</h3>
            <p class="text-xs text-slate-500">帶出夥伴主要聯絡人後，可再微調帳號資訊。</p>
          </div>

          <ElForm label-width="108px" class="grid gap-3 md:grid-cols-2">
            <ElFormItem label="聯絡人姓名">
              <ElInput v-model="form.contactName" />
            </ElFormItem>
            <ElFormItem label="職稱">
              <ElInput v-model="form.contactTitle" />
            </ElFormItem>
            <ElFormItem label="Email" required>
              <ElInput v-model="form.email" />
            </ElFormItem>
            <ElFormItem label="手機 / 電話">
              <ElInput v-model="form.phone" />
            </ElFormItem>
            <ElFormItem label="登入帳號" required>
              <ElInput v-model="form.loginAccount" />
            </ElFormItem>
            <ElFormItem label="可登入人數">
              <ElInputNumber
                v-model="form.maxUserCount"
                :min="1"
                :max="20"
                class="!w-full"
              />
            </ElFormItem>
            <ElFormItem label="啟用邀請">
              <div class="flex items-center gap-3">
                <ElSwitch v-model="form.invitationEnabled" />
                <span class="text-xs text-slate-500">允許此入口寄送啟用邀請</span>
              </div>
            </ElFormItem>
            <ElFormItem label="建立後寄送">
              <div class="flex items-center gap-3">
                <ElSwitch v-model="form.sendInvite" />
                <span class="text-xs text-slate-500"
                  >建立 / 更新後立即寄送或重寄邀請</span
                >
              </div>
            </ElFormItem>
          </ElForm>
        </section>

        <section class="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div class="grid gap-1">
            <h3 class="text-sm font-semibold text-slate-800">權限設定</h3>
            <p class="text-xs text-slate-500">
              先套用模板，再視需要微調可見模組與操作權限。
            </p>
          </div>

          <ElForm label-width="108px" class="grid gap-3">
            <ElFormItem label="權限模板">
              <ElSelect v-model="form.permissionTemplate" class="!w-full">
                <ElOption
                  v-for="item in permissionTemplateOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="可見模組">
              <ElCheckboxGroup
                v-model="form.visibleModules"
                class="grid gap-2 md:grid-cols-3"
              >
                <ElCheckbox
                  v-for="item in moduleOptions"
                  :key="item.value"
                  :label="item.value"
                >
                  {{ item.label }}
                </ElCheckbox>
              </ElCheckboxGroup>
            </ElFormItem>

            <ElFormItem label="功能權限">
              <div class="grid gap-2 md:grid-cols-2">
                <ElCheckbox v-model="form.canViewPerformance">可查看績效</ElCheckbox>
                <ElCheckbox v-model="form.canViewSettlement">可查看分潤</ElCheckbox>
                <ElCheckbox v-model="form.canViewConditions">可查看合作條件</ElCheckbox>
                <ElCheckbox v-model="form.canViewOpportunities"
                  >可查看案件 / 商機</ElCheckbox
                >
                <ElCheckbox v-model="form.canDownloadFiles">可下載文件</ElCheckbox>
                <ElCheckbox v-model="form.canUploadFiles">可上傳附件</ElCheckbox>
                <ElCheckbox v-model="form.canSubmitClaims">可提交請款</ElCheckbox>
                <ElCheckbox v-model="form.canViewNotifications"
                  >可查看公告 / 通知</ElCheckbox
                >
              </div>
            </ElFormItem>

            <ElFormItem label="可下載資料">
              <ElSelect
                v-model="form.downloadScopes"
                multiple
                collapse-tags
                class="!w-full"
              >
                <ElOption
                  v-for="item in resourceCategoryOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="可提交資料">
              <ElSelect
                v-model="form.submissionScopes"
                multiple
                collapse-tags
                class="!w-full"
              >
                <ElOption label="文件補件" value="documents" />
                <ElOption label="請款資料" value="claims" />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </section>

        <section class="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div class="grid gap-1">
            <h3 class="text-sm font-semibold text-slate-800">顯示內容與補充設定</h3>
            <p class="text-xs text-slate-500">定義首頁摘要、可見文件範圍與有效期間。</p>
          </div>

          <ElForm label-width="108px" class="grid gap-3">
            <ElFormItem label="首頁摘要">
              <ElSelect
                v-model="form.homepageSections"
                multiple
                collapse-tags
                class="!w-full"
              >
                <ElOption
                  v-for="item in homepageSectionOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="資源分類">
              <ElSelect
                v-model="form.resourceCategories"
                multiple
                collapse-tags
                class="!w-full"
              >
                <ElOption
                  v-for="item in resourceCategoryOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="文件範圍">
              <ElSelect v-model="form.fileScopes" multiple collapse-tags class="!w-full">
                <ElOption
                  v-for="item in fileScopeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="資料範圍">
              <ElSelect v-model="form.dataScopes" multiple collapse-tags class="!w-full">
                <ElOption
                  v-for="item in dataScopeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <div class="grid gap-3 md:grid-cols-2">
              <ElFormItem label="有效起日">
                <ElDatePicker
                  v-model="form.startDate"
                  value-format="YYYY-MM-DD"
                  class="!w-full"
                />
              </ElFormItem>
              <ElFormItem label="有效迄日">
                <ElDatePicker
                  v-model="form.endDate"
                  value-format="YYYY-MM-DD"
                  class="!w-full"
                />
              </ElFormItem>
            </div>

            <ElFormItem label="備註">
              <ElInput v-model="form.notes" type="textarea" :rows="3" />
            </ElFormItem>

            <ElFormItem label="內部說明">
              <ElInput v-model="form.internalNotes" type="textarea" :rows="3" />
            </ElFormItem>
          </ElForm>
        </section>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="formDrawerOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitForm">
            {{ formMode === "edit" ? "儲存變更" : "建立入口" }}
          </ElButton>
        </div>
      </template>
    </ElDrawer>
  </div>
</template>
