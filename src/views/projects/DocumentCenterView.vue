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
  SetUp,
} from "@element-plus/icons-vue";
import {
  activityOptions,
  customerOptions,
  documentCategoryMap,
  documentTypeMap,
  extensionTypeMap,
  milestoneOptions,
  partnerDirectory,
  projectOptions,
  taskOptions,
  userList,
  visibilityScopeMap,
} from "../../data/documents";
import { useDocumentsStore } from "../../composables/useDocumentsStore";

const route = useRoute();
const router = useRouter();
const {
  archiveDocument,
  batchArchive,
  batchSetCategory,
  createDocument,
  documents,
  getDocumentById,
  getNextFileNo,
  setTemplate,
  unarchiveDocument,
  updateDocument,
  uploadNewVersion,
} = useDocumentsStore();

const loading = ref(false);
const filterPanelOpen = ref(false);
const currentPage = ref(1);
const pageSize = ref(10);
const selectedRows = ref([]);
const viewMode = ref("table");
const quickFilter = ref("all");

const formDrawerOpen = ref(false);
const formMode = ref("create");
const editingDocumentId = ref("");
const filePickerRef = ref(null);
const selectedUploadFile = ref(null);

const batchCategory = ref("proposal");
const sortState = reactive({
  prop: "updatedAt",
  order: "descending",
});

const filters = reactive({
  keyword: "",
  fileCategory: "all",
  extension: "all",
  fileType: "all",
  projectId: "all",
  activityId: "all",
  taskId: "all",
  milestoneId: "all",
  uploaderId: "all",
  uploadedRange: [],
  isLatest: "all",
  isTemplate: "all",
  isArchived: "all",
});

function createEmptyForm() {
  return {
    fileNo: getNextFileNo(),
    fileName: "",
    fileCategory: "proposal",
    fileType: "planning",
    extension: "pdf",
    size: 0,
    projectId: "",
    activityId: "",
    taskId: "",
    milestoneId: "",
    customerId: "",
    partnerId: "",
    tagsInput: "",
    version: "v1",
    isLatest: true,
    replaceOldVersion: false,
    versionNote: "",
    isTemplate: false,
    isArchived: false,
    isUncategorized: false,
    uploaderId: "u-001",
    visibilityScope: "team",
    description: "",
    notes: "",
  };
}

const form = reactive(createEmptyForm());

const categoryOptions = [
  { value: "all", label: "全部分類" },
  ...Object.entries(documentCategoryMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const typeOptions = [
  { value: "all", label: "全部文件類型" },
  ...Object.entries(documentTypeMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const extensionOptions = [
  { value: "all", label: "全部格式" },
  ...Object.entries(extensionTypeMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const yesNoOptions = [
  { value: "all", label: "全部" },
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
];

const uploaderOptions = computed(() => [
  { value: "all", label: "全部上傳人" },
  ...userList
    .filter((item) => item.status === "active")
    .map((item) => ({ value: item.id, label: item.name })),
]);

const quickFilterOptions = [
  { value: "all", label: "全部" },
  { value: "recent", label: "最近更新" },
  { value: "my_upload", label: "我的上傳" },
  { value: "project_docs", label: "專案文件" },
  { value: "activity_assets", label: "活動素材" },
  { value: "latest", label: "最新版本" },
  { value: "template", label: "範本文件" },
];

const kpiCards = computed(() => {
  const total = documents.value.length;
  const monthNew = documents.value.filter((item) => isThisMonth(item.uploadedAt)).length;
  const projectCount = documents.value.filter((item) => Boolean(item.projectId)).length;
  const activityCount = documents.value.filter((item) => Boolean(item.activityId)).length;
  const templateCount = documents.value.filter((item) => item.isTemplate).length;
  const uncategorizedCount = documents.value.filter((item) => item.isUncategorized)
    .length;

  return [
    { label: "文件總數", value: total },
    { label: "本月新增文件數", value: monthNew },
    { label: "專案文件數", value: projectCount },
    { label: "活動文件數", value: activityCount },
    { label: "範本文件數", value: templateCount },
    { label: "待整理 / 未分類", value: uncategorizedCount },
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

function isThisMonth(value) {
  const date = parseDate(value);
  if (!date) {
    return false;
  }

  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
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

function toPlainArray(input) {
  return String(input || "")
    .split(/[、,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function notify(message, title = "已更新", type = "success") {
  ElNotification({
    title,
    message,
    type,
    position: "top-right",
  });
}

const filteredDocuments = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return documents.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.fileName.toLowerCase().includes(keyword) ||
      item.fileNo.toLowerCase().includes(keyword) ||
      item.description.toLowerCase().includes(keyword) ||
      item.tags.some((tag) => String(tag).toLowerCase().includes(keyword));

    const matchesCategory =
      filters.fileCategory === "all" || item.fileCategory === filters.fileCategory;
    const matchesExtension =
      filters.extension === "all" || item.extension === filters.extension;
    const matchesType = filters.fileType === "all" || item.fileType === filters.fileType;
    const matchesProject =
      filters.projectId === "all" || item.projectId === filters.projectId;
    const matchesActivity =
      filters.activityId === "all" || item.activityId === filters.activityId;
    const matchesTask = filters.taskId === "all" || item.taskId === filters.taskId;
    const matchesMilestone =
      filters.milestoneId === "all" || item.milestoneId === filters.milestoneId;
    const matchesUploader =
      filters.uploaderId === "all" || item.uploaderId === filters.uploaderId;
    const matchesUploadedDate = isDateWithinRange(item.uploadedAt, filters.uploadedRange);
    const matchesLatest =
      filters.isLatest === "all" ||
      (filters.isLatest === "yes" ? item.isLatest : !item.isLatest);
    const matchesTemplate =
      filters.isTemplate === "all" ||
      (filters.isTemplate === "yes" ? item.isTemplate : !item.isTemplate);
    const matchesArchived =
      filters.isArchived === "all" ||
      (filters.isArchived === "yes" ? item.isArchived : !item.isArchived);

    const matchesQuickFilter =
      quickFilter.value === "all" ||
      (quickFilter.value === "recent" &&
        isThisMonth(item.updatedAt || item.uploadedAt)) ||
      (quickFilter.value === "my_upload" && item.uploaderId === "u-001") ||
      (quickFilter.value === "project_docs" && Boolean(item.projectId)) ||
      (quickFilter.value === "activity_assets" &&
        item.fileCategory === "activity_asset") ||
      (quickFilter.value === "latest" && item.isLatest) ||
      (quickFilter.value === "template" && item.isTemplate);

    return (
      matchesKeyword &&
      matchesCategory &&
      matchesExtension &&
      matchesType &&
      matchesProject &&
      matchesActivity &&
      matchesTask &&
      matchesMilestone &&
      matchesUploader &&
      matchesUploadedDate &&
      matchesLatest &&
      matchesTemplate &&
      matchesArchived &&
      matchesQuickFilter
    );
  });
});

const sortedDocuments = computed(() => {
  const records = [...filteredDocuments.value];
  const direction = sortState.order === "ascending" ? 1 : -1;
  const prop = sortState.prop || "updatedAt";

  return records.sort((left, right) => {
    if (["uploadedAt", "updatedAt"].includes(prop)) {
      return (toTimestamp(left[prop]) - toTimestamp(right[prop])) * direction;
    }

    if (prop === "size") {
      return ((left.size || 0) - (right.size || 0)) * direction;
    }

    return (
      String(left[prop] || "").localeCompare(String(right[prop] || ""), "zh-Hant") *
      direction
    );
  });
});

const pagedDocuments = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedDocuments.value.slice(start, start + pageSize.value);
});

const emptyState = computed(() => {
  if (documents.value.length === 0) {
    return {
      title: "目前尚無文件資料",
      description: "可先上傳第一份文件，開始建立專案與活動文件管理",
      actionLabel: "上傳文件",
      action: openCreateDrawer,
    };
  }

  return {
    title: "沒有符合條件的文件",
    description: "請調整搜尋條件或清除篩選",
    actionLabel: "清除篩選",
    action: resetFilters,
  };
});

function resetFilters() {
  filters.keyword = "";
  filters.fileCategory = "all";
  filters.extension = "all";
  filters.fileType = "all";
  filters.projectId = "all";
  filters.activityId = "all";
  filters.taskId = "all";
  filters.milestoneId = "all";
  filters.uploaderId = "all";
  filters.uploadedRange = [];
  filters.isLatest = "all";
  filters.isTemplate = "all";
  filters.isArchived = "all";
  quickFilter.value = "all";
}

function handleSortChange({ prop, order }) {
  sortState.prop = prop || "updatedAt";
  sortState.order = order || "descending";
}

function handleSelectionChange(rows) {
  selectedRows.value = rows;
}

function openCreateDrawer(prefill = {}) {
  formMode.value = "create";
  editingDocumentId.value = "";
  selectedUploadFile.value = null;
  Object.assign(form, { ...createEmptyForm(), ...prefill });
  formDrawerOpen.value = true;
}

function openEditDrawer(record) {
  const target = getDocumentById(record.id);
  if (!target) {
    return;
  }

  formMode.value = "edit";
  editingDocumentId.value = target.id;
  selectedUploadFile.value = null;
  Object.assign(form, {
    ...createEmptyForm(),
    ...target,
    tagsInput: (target.tags || []).join("、"),
  });
  formDrawerOpen.value = true;
}

function openVersionDrawer(record) {
  const target = getDocumentById(record.id);
  if (!target) {
    return;
  }

  formMode.value = "version";
  editingDocumentId.value = target.id;
  selectedUploadFile.value = null;
  Object.assign(form, {
    ...createEmptyForm(),
    ...target,
    version: target.version,
    versionNote: "",
    tagsInput: (target.tags || []).join("、"),
  });
  formDrawerOpen.value = true;
}

function openDetail(record) {
  router.push({
    name: "projects-document-detail",
    params: { documentId: record.id },
  });
}

function triggerFileSelect() {
  filePickerRef.value?.click();
}

function onFilePicked(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  selectedUploadFile.value = file;
  const extension = String(file.name.split(".").pop() || "").toLowerCase();
  if (file.name) {
    form.fileName = file.name.replace(/\.[^.]+$/, "");
  }
  if (extensionTypeMap[extension]) {
    form.extension = extension;
  }
  form.size = file.size || 0;

  event.target.value = "";
}

function submitForm() {
  if (!form.fileName.trim()) {
    notify("請輸入文件名稱", "缺少資訊", "warning");
    return;
  }

  if (!form.uploaderId) {
    notify("請選擇上傳人", "缺少資訊", "warning");
    return;
  }

  const payload = {
    fileNo: form.fileNo,
    fileName: form.fileName.trim(),
    fileCategory: form.fileCategory,
    fileType: form.fileType,
    extension: form.extension,
    size: Number(form.size || 0),
    projectId: form.projectId,
    activityId: form.activityId,
    taskId: form.taskId,
    milestoneId: form.milestoneId,
    customerId: form.customerId,
    partnerId: form.partnerId,
    tags: toPlainArray(form.tagsInput),
    version: form.version,
    isLatest: form.isLatest,
    isTemplate: form.isTemplate,
    isArchived: form.isArchived,
    isUncategorized: form.isUncategorized,
    uploaderId: form.uploaderId,
    visibilityScope: form.visibilityScope,
    description: form.description.trim(),
    notes: form.notes.trim(),
    versionNote: form.versionNote.trim(),
    file: selectedUploadFile.value,
  };

  if (formMode.value === "edit") {
    const updated = updateDocument(editingDocumentId.value, payload, "林美雅");
    if (updated) {
      notify(`${updated.fileName} 已更新`);
    }
  } else if (formMode.value === "version") {
    const updated = uploadNewVersion(editingDocumentId.value, payload, "林美雅");
    if (updated) {
      notify(`${updated.fileName} 已上傳新版本`);
    }
  } else {
    const created = createDocument(payload, "林美雅");
    notify(`${created.fileName} 已上傳`);
  }

  formDrawerOpen.value = false;
  selectedUploadFile.value = null;
}

function batchArchiveSelected() {
  if (selectedRows.value.length === 0) {
    notify("請先勾選文件", "尚未選擇資料", "warning");
    return;
  }

  const updated = batchArchive(
    selectedRows.value.map((item) => item.id),
    "批次封存",
    "林美雅"
  );
  notify(`已批次封存 ${updated.length} 份文件`);
}

function batchChangeCategory() {
  if (selectedRows.value.length === 0) {
    notify("請先勾選文件", "尚未選擇資料", "warning");
    return;
  }

  const updated = batchSetCategory(
    selectedRows.value.map((item) => item.id),
    batchCategory.value,
    "林美雅"
  );
  notify(`已批次更新 ${updated.length} 份文件分類`);
}

function exportList() {
  notify("已加入匯出佇列，完成後將提供下載連結", "匯出中");
}

async function refreshData() {
  loading.value = true;
  await new Promise((resolve) => setTimeout(resolve, 300));
  loading.value = false;
  notify("文件中心資料已同步最新狀態");
}

async function toggleArchive(record) {
  if (record.isArchived) {
    const updated = unarchiveDocument(record.id, "林美雅");
    if (updated) {
      notify(`${updated.fileName} 已解除封存`);
    }
    return;
  }

  let reason = "";
  try {
    const result = await ElMessageBox.prompt("請輸入封存原因", "封存文件", {
      confirmButtonText: "封存",
      cancelButtonText: "取消",
      inputPlaceholder: "例如：已有新版替代",
    });
    reason = result.value.trim();
  } catch {
    return;
  }

  const updated = archiveDocument(record.id, reason, "林美雅");
  if (updated) {
    notify(`${updated.fileName} 已封存`, "已更新", "warning");
  }
}

function toggleTemplate(record) {
  const updated = setTemplate(record.id, !record.isTemplate, "林美雅");
  if (updated) {
    notify(`${updated.fileName} ${updated.isTemplate ? "已設為範本" : "已取消範本"}`);
  }
}

function downloadDocument(record) {
  const target = getDocumentById(record.id);
  const url = target?.downloadUrl;
  if (!url) {
    notify("目前無可下載檔案", "下載失敗", "warning");
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = target.fileFullName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
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

function goTask(record) {
  if (!record.taskId) {
    return;
  }

  router.push({
    name: "projects-tasks",
    query: record.milestoneId
      ? { milestoneId: record.milestoneId }
      : record.activityId
      ? { activityId: record.activityId }
      : record.projectId
      ? { projectId: record.projectId }
      : {},
  });
}

function goMilestone(record) {
  if (!record.milestoneId) {
    return;
  }

  router.push({
    name: "projects-milestones",
    query: { milestoneId: record.milestoneId },
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
  if (command === "version") {
    openVersionDrawer(row);
    return;
  }
  if (command === "download") {
    downloadDocument(row);
    return;
  }
  if (command === "template") {
    toggleTemplate(row);
    return;
  }
  if (command === "archive") {
    toggleArchive(row);
  }
}

function normalizeQueryValue(value) {
  if (Array.isArray(value)) {
    return String(value[0] || "").trim();
  }

  return String(value || "").trim();
}

async function applyRouteIntent() {
  if (route.name !== "projects-documents") {
    return;
  }

  const create = normalizeQueryValue(route.query.create);
  const edit = normalizeQueryValue(route.query.edit);
  const version = normalizeQueryValue(route.query.version);

  if (create === "1") {
    openCreateDrawer({
      projectId: normalizeQueryValue(route.query.projectId),
      activityId: normalizeQueryValue(route.query.activityId),
      taskId: normalizeQueryValue(route.query.taskId),
      milestoneId: normalizeQueryValue(route.query.milestoneId),
    });
    await router.replace({ name: "projects-documents" });
    return;
  }

  if (edit) {
    const target = getDocumentById(edit);
    if (target) {
      openEditDrawer(target);
    }
    await router.replace({ name: "projects-documents" });
    return;
  }

  if (version) {
    const target = getDocumentById(version);
    if (target) {
      openVersionDrawer(target);
    }
    await router.replace({ name: "projects-documents" });
  }
}

watch(
  () => [
    quickFilter.value,
    filters.keyword,
    filters.fileCategory,
    filters.extension,
    filters.fileType,
    filters.projectId,
    filters.activityId,
    filters.taskId,
    filters.milestoneId,
    filters.uploaderId,
    filters.uploadedRange,
    filters.isLatest,
    filters.isTemplate,
    filters.isArchived,
    pageSize.value,
  ],
  () => {
    currentPage.value = 1;
  },
  { deep: true }
);

watch(
  () => [sortedDocuments.value.length, pageSize.value],
  () => {
    const maxPage = Math.max(1, Math.ceil(sortedDocuments.value.length / pageSize.value));
    if (currentPage.value > maxPage) {
      currentPage.value = maxPage;
    }
  },
  { immediate: true }
);

watch(
  () => [route.name, route.query.create, route.query.edit, route.query.version],
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
            文件中心
          </h1>
          <p class="text-sm text-slate-500">
            集中管理專案與活動中的提案、素材、附件、交付與成果文件
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton type="primary" :icon="CirclePlus" @click="openCreateDrawer"
            >上傳文件</ElButton
          >
          <ElButton :icon="Download" @click="exportList">匯出清單</ElButton>
          <ElSelect v-model="batchCategory" class="!w-[160px]">
            <ElOption
              v-for="item in categoryOptions.filter((option) => option.value !== 'all')"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
          <ElButton :icon="SetUp" @click="batchChangeCategory">批次分類</ElButton>
          <ElButton @click="batchArchiveSelected">批次封存</ElButton>
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
              placeholder="搜尋文件名稱 / 編號 / 說明 / 標籤"
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

          <div class="flex items-center gap-2">
            <ElTag round effect="plain">共 {{ sortedDocuments.length }} 份</ElTag>
            <ElButton
              size="small"
              :type="viewMode === 'table' ? 'primary' : 'default'"
              @click="viewMode = 'table'"
            >
              列表
            </ElButton>
            <ElButton
              size="small"
              :type="viewMode === 'grid' ? 'primary' : 'default'"
              @click="viewMode = 'grid'"
            >
              卡片
            </ElButton>
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
            <ElSelect v-model="filters.fileCategory">
              <ElOption
                v-for="item in categoryOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
            <ElSelect v-model="filters.fileType">
              <ElOption
                v-for="item in typeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
            <ElSelect v-model="filters.extension">
              <ElOption
                v-for="item in extensionOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
            <ElSelect v-model="filters.uploaderId">
              <ElOption
                v-for="item in uploaderOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
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
            <ElSelect v-model="filters.activityId" filterable>
              <ElOption label="全部活動" value="all" />
              <ElOption
                v-for="item in activityOptions"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </ElSelect>
            <ElSelect v-model="filters.taskId" filterable>
              <ElOption label="全部任務" value="all" />
              <ElOption
                v-for="item in taskOptions"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </ElSelect>
            <ElSelect v-model="filters.milestoneId" filterable>
              <ElOption label="全部里程碑" value="all" />
              <ElOption
                v-for="item in milestoneOptions"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </ElSelect>
            <ElDatePicker
              v-model="filters.uploadedRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              start-placeholder="上傳日期起"
              end-placeholder="上傳日期迄"
              class="!w-full"
            />
            <ElSelect v-model="filters.isLatest">
              <ElOption
                v-for="item in yesNoOptions"
                :key="item.value"
                :label="`最新版本：${item.label}`"
                :value="item.value"
              />
            </ElSelect>
            <ElSelect v-model="filters.isTemplate">
              <ElOption
                v-for="item in yesNoOptions"
                :key="item.value"
                :label="`範本文件：${item.label}`"
                :value="item.value"
              />
            </ElSelect>
            <ElSelect v-model="filters.isArchived">
              <ElOption
                v-for="item in yesNoOptions"
                :key="item.value"
                :label="`封存：${item.label}`"
                :value="item.value"
              />
            </ElSelect>
          </div>
        </transition>

        <div
          class="flex flex-wrap items-center gap-2 border-y border-slate-200 bg-white px-6 py-3"
        >
          <ElTag
            v-for="item in quickFilterOptions"
            :key="item.value"
            round
            class="cursor-pointer"
            :effect="quickFilter === item.value ? 'dark' : 'plain'"
            :type="quickFilter === item.value ? 'primary' : 'info'"
            @click="quickFilter = item.value"
          >
            {{ item.label }}
          </ElTag>
        </div>

        <ElEmpty
          v-if="sortedDocuments.length === 0"
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
            v-if="viewMode === 'table'"
            v-loading="loading"
            :data="pagedDocuments"
            size="large"
            table-layout="auto"
            @selection-change="handleSelectionChange"
            @sort-change="handleSortChange"
          >
            <ElTableColumn type="selection" width="48" />

            <ElTableColumn label="文件" min-width="260">
              <template #default="{ row }">
                <div class="grid gap-1">
                  <button
                    type="button"
                    class="text-left text-sm font-semibold text-slate-900 hover:text-[#409eff]"
                    @click="openDetail(row)"
                  >
                    {{ row.fileName }}
                  </button>
                  <div class="flex flex-wrap items-center gap-1">
                    <span class="text-xs text-slate-400">{{ row.fileNo }}</span>
                    <ElTag round size="small" effect="plain">{{
                      row.extensionLabel
                    }}</ElTag>
                  </div>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="分類" min-width="120">
              <template #default="{ row }">
                <ElTag
                  round
                  effect="light"
                  :type="documentCategoryMap[row.fileCategory]?.type"
                >
                  {{ documentCategoryMap[row.fileCategory]?.label || row.fileCategory }}
                </ElTag>
              </template>
            </ElTableColumn>

            <ElTableColumn label="關聯主體" min-width="220">
              <template #default="{ row }">
                <div class="grid gap-0.5">
                  <button
                    type="button"
                    class="text-left text-sm text-slate-700 hover:text-[#409eff]"
                    @click="goProject(row)"
                  >
                    {{ row.projectName || row.activityName || row.taskName || "-" }}
                  </button>
                  <span class="text-xs text-slate-400">
                    {{
                      row.relationCount > 1 ? `另有 ${row.relationCount - 1} 項關聯` : "-"
                    }}
                  </span>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="文件類型 / 格式" min-width="160">
              <template #default="{ row }">
                <div class="grid gap-0.5">
                  <span class="text-sm text-slate-700">{{
                    documentTypeMap[row.fileType]?.label || row.fileType
                  }}</span>
                  <span class="text-xs text-slate-400">{{ row.extensionLabel }}</span>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="版本" prop="version" sortable="custom" min-width="110">
              <template #default="{ row }">
                <div class="flex items-center gap-1">
                  <span class="text-sm text-slate-700">{{ row.version }}</span>
                  <ElTag v-if="row.isLatest" size="small" round type="success"
                    >最新</ElTag
                  >
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="檔案大小" prop="size" sortable="custom" min-width="120">
              <template #default="{ row }">{{ row.sizeLabel }}</template>
            </ElTableColumn>

            <ElTableColumn label="上傳人" min-width="120">
              <template #default="{ row }">{{ row.uploaderName }}</template>
            </ElTableColumn>

            <ElTableColumn
              label="最後更新時間"
              prop="updatedAt"
              sortable="custom"
              min-width="160"
            >
              <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
            </ElTableColumn>

            <ElTableColumn label="標籤" min-width="180">
              <template #default="{ row }">
                <div class="flex flex-wrap gap-1">
                  <ElTag
                    v-for="tag in row.tags.slice(0, 3)"
                    :key="tag"
                    size="small"
                    round
                    effect="plain"
                  >
                    {{ tag }}
                  </ElTag>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="狀態" min-width="170">
              <template #default="{ row }">
                <div class="flex flex-wrap gap-1">
                  <ElTag v-if="row.isArchived" size="small" type="info" round
                    >已封存</ElTag
                  >
                  <ElTag v-if="row.isTemplate" size="small" type="warning" round
                    >範本</ElTag
                  >
                  <ElTag v-if="row.isUncategorized" size="small" type="danger" round
                    >待整理</ElTag
                  >
                  <ElTag
                    v-if="!row.isArchived && !row.isTemplate && !row.isUncategorized"
                    size="small"
                    type="success"
                    round
                    >正常</ElTag
                  >
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="操作" fixed="right" min-width="190">
              <template #default="{ row }">
                <div class="flex items-center gap-1">
                  <ElButton text size="small" @click="openDetail(row)">查看</ElButton>
                  <ElButton text size="small" @click="downloadDocument(row)"
                    >下載</ElButton
                  >
                  <ElDropdown @command="(command) => handleCommand(command, row)">
                    <ElButton size="small" :icon="MoreFilled" />
                    <template #dropdown>
                      <ElDropdownMenu>
                        <ElDropdownItem command="edit">編輯資訊</ElDropdownItem>
                        <ElDropdownItem command="version">上傳新版本</ElDropdownItem>
                        <ElDropdownItem command="template">{{
                          row.isTemplate ? "取消範本" : "設為範本"
                        }}</ElDropdownItem>
                        <ElDropdownItem command="archive" divided>{{
                          row.isArchived ? "解除封存" : "封存"
                        }}</ElDropdownItem>
                      </ElDropdownMenu>
                    </template>
                  </ElDropdown>
                </div>
              </template>
            </ElTableColumn>
          </ElTable>

          <div v-else class="grid gap-3 p-6 md:grid-cols-2 xl:grid-cols-3">
            <article
              v-for="row in pagedDocuments"
              :key="row.id"
              class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <button
                  type="button"
                  class="text-left text-sm font-semibold text-slate-900 hover:text-[#409eff]"
                  @click="openDetail(row)"
                >
                  {{ row.fileName }}
                </button>
                <ElTag size="small" round>{{ row.extensionLabel }}</ElTag>
              </div>
              <p class="text-xs text-slate-400">{{ row.fileNo }}</p>
              <p class="text-xs text-slate-500">{{ row.description || "無摘要" }}</p>
              <div class="flex flex-wrap gap-1">
                <ElTag
                  size="small"
                  round
                  :type="documentCategoryMap[row.fileCategory]?.type"
                >
                  {{ documentCategoryMap[row.fileCategory]?.label || row.fileCategory }}
                </ElTag>
                <ElTag v-if="row.isTemplate" size="small" type="warning" round
                  >範本</ElTag
                >
                <ElTag v-if="row.isArchived" size="small" type="info" round>封存</ElTag>
              </div>
              <div class="text-xs text-slate-500">
                <p>版本：{{ row.version }}{{ row.isLatest ? "（最新）" : "" }}</p>
                <p>大小：{{ row.sizeLabel }}</p>
                <p>更新：{{ formatDateTime(row.updatedAt) }}</p>
              </div>
              <div class="flex items-center gap-2">
                <ElButton size="small" @click="openDetail(row)">查看</ElButton>
                <ElButton size="small" @click="openEditDrawer(row)">編輯</ElButton>
              </div>
            </article>
          </div>

          <div
            class="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-5"
          >
            <ElPagination
              v-model:current-page="currentPage"
              :page-size="pageSize"
              layout="total, prev, pager, next"
              :total="sortedDocuments.length"
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
      :title="
        formMode === 'edit'
          ? '編輯文件'
          : formMode === 'version'
          ? '上傳新版本'
          : '上傳文件'
      "
      size="760px"
      destroy-on-close
    >
      <div class="grid gap-5 pb-4">
        <section
          class="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
        >
          <h3 class="text-sm font-semibold text-slate-800">檔案上傳區</h3>
          <input ref="filePickerRef" type="file" class="hidden" @change="onFilePicked" />
          <div
            class="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm text-slate-500">
                可從本機選擇檔案並上傳到頁面（前端模擬上傳）
              </p>
              <ElButton size="small" @click="triggerFileSelect">選擇檔案</ElButton>
            </div>
            <p class="mt-2 text-xs text-slate-400">
              {{
                selectedUploadFile
                  ? `已選擇：${selectedUploadFile.name}（${selectedUploadFile.size} bytes）`
                  : "尚未選擇檔案"
              }}
            </p>
          </div>
          <ElForm label-width="108px" class="grid gap-3 md:grid-cols-2">
            <ElFormItem label="文件名稱" required class="md:col-span-2">
              <ElInput v-model="form.fileName" />
            </ElFormItem>
            <ElFormItem label="文件編號"><ElInput v-model="form.fileNo" /></ElFormItem>
            <ElFormItem label="檔案格式">
              <ElSelect v-model="form.extension">
                <ElOption
                  v-for="item in extensionOptions.filter(
                    (option) => option.value !== 'all'
                  )"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="檔案大小(Byte)">
              <ElInputNumber v-model="form.size" :min="0" class="!w-full" />
            </ElFormItem>
            <ElFormItem label="上傳人" required>
              <ElSelect v-model="form.uploaderId">
                <ElOption
                  v-for="item in uploaderOptions.filter(
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

        <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-800">基本資訊</h3>
          <ElForm label-width="108px" class="grid gap-3 md:grid-cols-2">
            <ElFormItem label="分類">
              <ElSelect v-model="form.fileCategory">
                <ElOption
                  v-for="item in categoryOptions.filter(
                    (option) => option.value !== 'all'
                  )"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="文件類型">
              <ElSelect v-model="form.fileType">
                <ElOption
                  v-for="item in typeOptions.filter((option) => option.value !== 'all')"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="標籤" class="md:col-span-2">
              <ElInput v-model="form.tagsInput" placeholder="以 、 或 , 分隔" />
            </ElFormItem>
            <ElFormItem label="文件說明" class="md:col-span-2">
              <ElInput v-model="form.description" type="textarea" :rows="2" />
            </ElFormItem>
          </ElForm>
        </section>

        <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-800">關聯設定</h3>
          <ElForm label-width="108px" class="grid gap-3 md:grid-cols-2">
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
            <ElFormItem label="關聯活動">
              <ElSelect v-model="form.activityId" filterable>
                <ElOption label="無" value="" />
                <ElOption
                  v-for="item in activityOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="關聯任務">
              <ElSelect v-model="form.taskId" filterable>
                <ElOption label="無" value="" />
                <ElOption
                  v-for="item in taskOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="關聯里程碑">
              <ElSelect v-model="form.milestoneId" filterable>
                <ElOption label="無" value="" />
                <ElOption
                  v-for="item in milestoneOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="關聯客戶">
              <ElSelect v-model="form.customerId" filterable>
                <ElOption label="無" value="" />
                <ElOption
                  v-for="item in customerOptions"
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
          </ElForm>
        </section>

        <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-800">版本資訊與其他設定</h3>
          <ElForm label-width="108px" class="grid gap-3 md:grid-cols-2">
            <ElFormItem label="版本號"><ElInput v-model="form.version" /></ElFormItem>
            <ElFormItem label="可見範圍">
              <ElSelect v-model="form.visibilityScope">
                <ElOption
                  v-for="(meta, value) in visibilityScopeMap"
                  :key="value"
                  :label="meta.label"
                  :value="value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="版本說明" class="md:col-span-2">
              <ElInput v-model="form.versionNote" type="textarea" :rows="2" />
            </ElFormItem>
            <ElFormItem label="設為範本"
              ><ElSwitch v-model="form.isTemplate"
            /></ElFormItem>
            <ElFormItem label="封存文件"
              ><ElSwitch v-model="form.isArchived"
            /></ElFormItem>
            <ElFormItem label="待整理"
              ><ElSwitch v-model="form.isUncategorized"
            /></ElFormItem>
            <ElFormItem label="備註" class="md:col-span-2">
              <ElInput v-model="form.notes" type="textarea" :rows="2" />
            </ElFormItem>
          </ElForm>
        </section>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="formDrawerOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitForm">
            {{
              formMode === "edit"
                ? "儲存變更"
                : formMode === "version"
                ? "上傳版本"
                : "上傳文件"
            }}
          </ElButton>
        </div>
      </template>
    </ElDrawer>
  </div>
</template>

<style scoped>
:deep(.el-drawer__body) {
  padding-top: 12px;
}
</style>
