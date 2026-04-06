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
  ElTag,
  ElTimePicker,
} from "element-plus";
import { CirclePlus, Download, Filter, MoreFilled, Refresh, Search } from "@element-plus/icons-vue";
import {
  accountOptions,
  interactionStatusMap,
  interactionTypeMap,
  opportunityOptions,
  partnerDirectory,
  projectOptions,
  supportTicketOptions,
  userList,
} from "../../data/communications";
import { useCommunicationLogsStore } from "../../composables/useCommunicationLogsStore";

const {
  archiveRecord,
  batchSetStatus,
  createRecord,
  duplicateRecord,
  getById,
  getNextNo,
  records,
  setStatus,
  toTimestamp,
  updateRecord,
} = useCommunicationLogsStore();

const loading = ref(false);
const filterPanelOpen = ref(false);
const quickFilter = ref("all");
const currentPage = ref(1);
const pageSize = ref(10);
const selectedRows = ref([]);

const detailDrawerOpen = ref(false);
const formDrawerOpen = ref(false);
const formMode = ref("create");
const activeId = ref("");

const sortState = reactive({
  prop: "updatedAt",
  order: "descending",
});

const filters = reactive({
  keyword: "",
  interactionType: "all",
  status: "all",
  ownerId: "all",
  customerId: "all",
  opportunityId: "all",
  projectId: "all",
  partnerId: "all",
  supportTicketId: "all",
  dateRange: [],
  followUpRequired: "all",
  isImportant: "all",
});

function createEmptyForm() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return {
    interactionNo: getNextNo(),
    title: "",
    interactionType: "email",
    status: "logged",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    companyName: "",
    customerId: "",
    opportunityId: "",
    projectId: "",
    partnerId: "",
    supportTicketId: "",
    ownerId: "u-001",
    interactionDate: date,
    interactionTime: time,
    durationMinutes: 0,
    summary: "",
    result: "",
    followUpRequired: false,
    followUpAt: "",
    followUpNote: "",
    tagsInput: "",
    attachmentsInput: "",
    notes: "",
    isImportant: false,
  };
}

const form = reactive(createEmptyForm());

const quickFilterOptions = [
  { value: "all", label: "全部" },
  { value: "recent_7_days", label: "最近 7 天" },
  { value: "email_this_week", label: "本週 Email" },
  { value: "call_this_week", label: "本週通話" },
  { value: "follow_up", label: "待 follow-up" },
  { value: "important", label: "重要互動" },
  { value: "my_records", label: "我負責的" },
];

const yesNoOptions = [
  { value: "all", label: "全部" },
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
];

const interactionTypeOptions = [
  { value: "all", label: "全部類型" },
  ...Object.entries(interactionTypeMap).map(([value, meta]) => ({ value, label: meta.label })),
];

const statusOptions = [
  { value: "all", label: "全部狀態" },
  ...Object.entries(interactionStatusMap).map(([value, meta]) => ({ value, label: meta.label })),
];

const userOptions = [
  { value: "all", label: "全部" },
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

const supportTicketFilterOptions = [
  { value: "all", label: "全部支援案件" },
  ...supportTicketOptions.map((item) => ({ value: item.id, label: item.title })),
];

const detailRecord = computed(() => getById(activeId.value));
const isEditMode = computed(() => formMode.value === "edit");
const formTitle = computed(() => (isEditMode.value ? "編輯互動紀錄" : "新增互動紀錄"));

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

function isWithinDays(value, days) {
  const time = toTimestamp(value);
  if (!time) {
    return false;
  }

  const now = Date.now();
  const diff = Math.floor((now - time) / (24 * 60 * 60 * 1000));
  return diff >= 0 && diff <= days;
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

const kpiCards = computed(() => {
  const total = records.value.length;

  const emailThisWeek = records.value.filter(
    (item) => item.interactionType === "email" && isWithinDays(item.interactedAt, 7)
  ).length;

  const callThisWeek = records.value.filter(
    (item) => item.interactionType === "call" && isWithinDays(item.interactedAt, 7)
  ).length;

  const followUpPending = records.value.filter(
    (item) => item.followUpRequired && item.status !== "completed" && item.status !== "archived"
  ).length;

  return [
    { label: "互動總數", value: total },
    { label: "本週 Email 數", value: emailThisWeek },
    { label: "本週通話數", value: callThisWeek },
    { label: "待 follow-up 數", value: followUpPending },
  ];
});

const filteredRecords = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return records.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.title.toLowerCase().includes(keyword) ||
      item.interactionNo.toLowerCase().includes(keyword) ||
      String(item.summary || "").toLowerCase().includes(keyword) ||
      String(item.contactName || "").toLowerCase().includes(keyword);

    const matchesType =
      filters.interactionType === "all" || item.interactionType === filters.interactionType;
    const matchesStatus = filters.status === "all" || item.status === filters.status;
    const matchesOwner = filters.ownerId === "all" || item.ownerId === filters.ownerId;
    const matchesCustomer =
      filters.customerId === "all" || item.customerId === filters.customerId;
    const matchesOpportunity =
      filters.opportunityId === "all" || item.opportunityId === filters.opportunityId;
    const matchesProject =
      filters.projectId === "all" || item.projectId === filters.projectId;
    const matchesPartner =
      filters.partnerId === "all" || item.partnerId === filters.partnerId;
    const matchesSupportTicket =
      filters.supportTicketId === "all" || item.supportTicketId === filters.supportTicketId;
    const matchesDate = isDateWithinRange(item.interactedAt, filters.dateRange);

    const matchesFollowUp =
      filters.followUpRequired === "all" ||
      (filters.followUpRequired === "yes" ? item.followUpRequired : !item.followUpRequired);

    const matchesImportant =
      filters.isImportant === "all" ||
      (filters.isImportant === "yes" ? item.isImportant : !item.isImportant);

    const matchesQuickFilter =
      quickFilter.value === "all" ||
      (quickFilter.value === "recent_7_days" && isWithinDays(item.interactedAt, 7)) ||
      (quickFilter.value === "email_this_week" &&
        item.interactionType === "email" &&
        isWithinDays(item.interactedAt, 7)) ||
      (quickFilter.value === "call_this_week" &&
        item.interactionType === "call" &&
        isWithinDays(item.interactedAt, 7)) ||
      (quickFilter.value === "follow_up" &&
        item.followUpRequired &&
        item.status !== "completed" &&
        item.status !== "archived") ||
      (quickFilter.value === "important" && item.isImportant) ||
      (quickFilter.value === "my_records" && item.ownerId === "u-001");

    return (
      matchesKeyword &&
      matchesType &&
      matchesStatus &&
      matchesOwner &&
      matchesCustomer &&
      matchesOpportunity &&
      matchesProject &&
      matchesPartner &&
      matchesSupportTicket &&
      matchesDate &&
      matchesFollowUp &&
      matchesImportant &&
      matchesQuickFilter
    );
  });
});

const sortedRecords = computed(() => {
  const result = [...filteredRecords.value];
  const direction = sortState.order === "ascending" ? 1 : -1;

  return result.sort((a, b) => {
    if (["interactedAt", "updatedAt"].includes(sortState.prop)) {
      return (toTimestamp(a[sortState.prop]) - toTimestamp(b[sortState.prop])) * direction;
    }

    return (
      String(a[sortState.prop] || "").localeCompare(String(b[sortState.prop] || ""), "zh-Hant") *
      direction
    );
  });
});

const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedRecords.value.slice(start, start + pageSize.value);
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
  filters.interactionType = "all";
  filters.status = "all";
  filters.ownerId = "all";
  filters.customerId = "all";
  filters.opportunityId = "all";
  filters.projectId = "all";
  filters.partnerId = "all";
  filters.supportTicketId = "all";
  filters.dateRange = [];
  filters.followUpRequired = "all";
  filters.isImportant = "all";
  quickFilter.value = "all";
  currentPage.value = 1;
}

function openDetail(record) {
  activeId.value = record.id;
  detailDrawerOpen.value = true;
}

function hydrateForm(record) {
  Object.assign(form, createEmptyForm());

  if (!record) {
    return;
  }

  const [datePart, timePart] = String(record.interactedAt || " ").split(" ");

  Object.assign(form, {
    interactionNo: record.interactionNo,
    title: record.title,
    interactionType: record.interactionType,
    status: record.status,
    contactName: record.contactName,
    contactEmail: record.contactEmail,
    contactPhone: record.contactPhone,
    companyName: record.companyName,
    customerId: record.customerId,
    opportunityId: record.opportunityId,
    projectId: record.projectId,
    partnerId: record.partnerId,
    supportTicketId: record.supportTicketId,
    ownerId: record.ownerId,
    interactionDate: datePart || "",
    interactionTime: timePart || "09:00",
    durationMinutes: Number(record.durationMinutes || 0),
    summary: record.summary,
    result: record.result,
    followUpRequired: Boolean(record.followUpRequired),
    followUpAt: record.followUpAt || "",
    followUpNote: record.followUpNote || "",
    tagsInput: (record.tags || []).join("、"),
    attachmentsInput: (record.attachments || []).join("、"),
    notes: record.notes || "",
    isImportant: Boolean(record.isImportant),
  });
}

function openCreateDrawer() {
  formMode.value = "create";
  activeId.value = "";
  hydrateForm(null);
  formDrawerOpen.value = true;
}

function openEditDrawer(record) {
  formMode.value = "edit";
  activeId.value = record.id;
  hydrateForm(record);
  formDrawerOpen.value = true;
}

function buildPayload() {
  return {
    interactionNo: form.interactionNo,
    title: form.title.trim(),
    interactionType: form.interactionType,
    status: form.status,
    contactName: form.contactName.trim(),
    contactEmail: form.contactEmail.trim(),
    contactPhone: form.contactPhone.trim(),
    companyName: form.companyName.trim(),
    customerId: form.customerId,
    opportunityId: form.opportunityId,
    projectId: form.projectId,
    partnerId: form.partnerId,
    supportTicketId: form.supportTicketId,
    ownerId: form.ownerId,
    interactedAt: `${form.interactionDate} ${form.interactionTime}`,
    durationMinutes: Number(form.durationMinutes || 0),
    summary: form.summary.trim(),
    result: form.result.trim(),
    followUpRequired: form.followUpRequired,
    followUpAt: form.followUpRequired ? form.followUpAt : "",
    followUpNote: form.followUpRequired ? form.followUpNote.trim() : "",
    tags: toPlainArray(form.tagsInput),
    attachments: toPlainArray(form.attachmentsInput),
    notes: form.notes.trim(),
    isImportant: form.isImportant,
  };
}

function submitForm() {
  if (!form.title.trim()) {
    notify("請輸入互動主題", "缺少資訊", "warning");
    return;
  }

  if (!form.interactionDate || !form.interactionTime) {
    notify("請輸入互動日期與時間", "缺少資訊", "warning");
    return;
  }

  if (!form.ownerId) {
    notify("請選擇負責人", "缺少資訊", "warning");
    return;
  }

  const payload = buildPayload();

  if (isEditMode.value) {
    const updated = updateRecord(activeId.value, payload, "林美雅");
    if (!updated) {
      notify("更新失敗，找不到資料", "錯誤", "error");
      return;
    }

    notify(`${updated.title} 已更新`);
  } else {
    const created = createRecord(payload, "林美雅");
    notify(`${created.title} 已建立`);
  }

  formDrawerOpen.value = false;
}

function duplicateFromList(record) {
  const created = duplicateRecord(record.id, "林美雅");
  if (!created) {
    notify("複製失敗", "錯誤", "error");
    return;
  }

  notify(`已建立複製紀錄：${created.title}`);
}

function markCompleted(record) {
  setStatus(record.id, "completed", "林美雅");
  notify(`${record.title} 已標記為已完成`);
}

async function archive(record) {
  try {
    await ElMessageBox.confirm(`確認封存「${record.title}」？`, "封存互動紀錄", {
      confirmButtonText: "封存",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    return;
  }

  archiveRecord(record.id, "林美雅");
  notify(`${record.title} 已封存`);
}

function convertToTask(record) {
  notify(`已建立轉任務入口：${record.title}`, "功能預留", "info");
}

function batchMarkCompleted() {
  if (selectedRows.value.length === 0) {
    notify("請先勾選要操作的紀錄", "提醒", "warning");
    return;
  }

  batchSetStatus(
    selectedRows.value.map((item) => item.id),
    "completed",
    "林美雅"
  );
  notify(`已批次標記 ${selectedRows.value.length} 筆為完成`);
}

function batchArchive() {
  if (selectedRows.value.length === 0) {
    notify("請先勾選要操作的紀錄", "提醒", "warning");
    return;
  }

  batchSetStatus(
    selectedRows.value.map((item) => item.id),
    "archived",
    "林美雅"
  );
  notify(`已批次封存 ${selectedRows.value.length} 筆紀錄`);
}

function exportCsv() {
  const header = [
    "紀錄編號",
    "主題",
    "類型",
    "狀態",
    "對象",
    "關聯主體",
    "互動時間",
    "摘要",
    "負責人",
    "Follow-up",
    "更新時間",
  ];

  const rows = sortedRecords.value.map((item) => [
    item.interactionNo,
    item.title,
    interactionTypeMap[item.interactionType]?.label || item.interactionType,
    interactionStatusMap[item.status]?.label || item.status,
    `${item.contactName || "-"} / ${item.companyName || "-"}`,
    item.relatedSummary,
    item.interactedAt,
    item.summary,
    item.ownerName,
    item.followUpRequired ? item.followUpAt || "待排" : "無",
    item.updatedAt,
  ]);

  const csv = [header, ...rows]
    .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `communication-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

watch(
  () => [
    filteredRecords.value.length,
    pageSize.value,
    quickFilter.value,
    filters.keyword,
    filters.interactionType,
    filters.status,
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
            Email / 通話
          </h1>
          <p class="text-sm text-slate-500">
            集中管理日常互動紀錄、聯繫摘要與後續跟進
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElDropdown trigger="click">
            <ElButton :disabled="selectedRows.length === 0">批次操作</ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem @click="batchMarkCompleted">批次標記完成</ElDropdownItem>
                <ElDropdownItem @click="batchArchive">批次封存</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
          <ElButton :icon="Download" @click="exportCsv">匯出</ElButton>
          <ElButton type="primary" :icon="CirclePlus" @click="openCreateDrawer">
            新增紀錄
          </ElButton>
        </div>
      </header>

      <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="card in kpiCards"
          :key="card.label"
          class="rounded-2xl border border-slate-200 bg-white px-4 py-4"
        >
          <p class="text-xs text-slate-500">{{ card.label }}</p>
          <p class="mt-2 text-xl font-semibold text-slate-900">{{ card.value }}</p>
        </article>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="mt-1 flex flex-wrap gap-2">
            <ElButton
              v-for="item in quickFilterOptions"
              :key="item.value"
              size="small"
              round
              :type="quickFilter === item.value ? 'primary' : 'default'"
              @click="quickFilter = item.value"
            >
              {{ item.label }}
            </ElButton>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <ElInput
              v-model="filters.keyword"
              placeholder="搜尋主題 / 摘要 / 對象"
              clearable
              class="!w-64"
            >
              <template #prefix><Search class="h-4 w-4 text-slate-400" /></template>
            </ElInput>
            <ElButton :icon="Filter" @click="filterPanelOpen = !filterPanelOpen">Filter</ElButton>
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
            class="mt-4 rounded-xl border border-slate-100 bg-white p-4"
            label-position="top"
          >
            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <ElFormItem>
                <ElSelect v-model="filters.interactionType">
                  <ElOption
                    v-for="item in interactionTypeOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem>
                <ElSelect v-model="filters.status">
                  <ElOption
                    v-for="item in statusOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem>
                <ElSelect v-model="filters.ownerId">
                  <ElOption
                    v-for="item in userOptions"
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
                <ElSelect v-model="filters.supportTicketId">
                  <ElOption
                    v-for="item in supportTicketFilterOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem>
                <ElDatePicker
                  v-model="filters.dateRange"
                  type="daterange"
                  value-format="YYYY-MM-DD"
                  start-placeholder="開始日期"
                  end-placeholder="結束日期"
                  class="!w-full"
                />
              </ElFormItem>
              <ElFormItem>
                <ElSelect v-model="filters.followUpRequired">
                  <ElOption
                    v-for="item in yesNoOptions"
                    :key="`fu-${item.value}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem>
                <ElSelect v-model="filters.isImportant">
                  <ElOption
                    v-for="item in yesNoOptions"
                    :key="`imp-${item.value}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
            </div>
          </ElForm>
        </transition>
      </section>

      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
        <ElTable
          v-loading="loading"
          table-layout="auto"
          :data="pagedRecords"
          @selection-change="handleSelectionChange"
          @sort-change="handleSortChange"
        >
          <ElTableColumn type="selection" width="46" />

          <ElTableColumn label="互動" min-width="250" sortable="custom" prop="title">
            <template #default="{ row }">
              <button type="button" class="grid gap-1 text-left" @click="openDetail(row)">
                <span class="font-semibold text-[#303133] hover:text-[#409eff]">{{ row.title }}</span>
                <span class="text-xs text-slate-500">{{ row.interactionNo }}</span>
                <div class="flex flex-wrap gap-1">
                  <ElTag v-if="row.isImportant" size="small" type="danger" effect="light">重要</ElTag>
                  <ElTag size="small" effect="light">{{ row.interactionType === "email" ? "郵件" : "通話" }}</ElTag>
                </div>
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="類型" min-width="110">
            <template #default="{ row }">
              <ElTag :type="interactionTypeMap[row.interactionType]?.type" size="small" effect="light">
                {{ interactionTypeMap[row.interactionType]?.label || row.interactionType }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="對象" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
              <div class="text-sm text-slate-700">{{ row.contactName || "-" }} / {{ row.companyName || "-" }}</div>
              <div class="text-xs text-slate-500">{{ row.contactEmail || row.contactPhone || "-" }}</div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="關聯主體" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ row.relatedSummary }}</template>
          </ElTableColumn>

          <ElTableColumn label="互動時間" min-width="160" sortable="custom" prop="interactedAt">
            <template #default="{ row }">{{ formatDateTime(row.interactedAt) }}</template>
          </ElTableColumn>

          <ElTableColumn label="摘要" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ row.summary || "-" }}</template>
          </ElTableColumn>

          <ElTableColumn label="負責人" min-width="120">
            <template #default="{ row }">{{ row.ownerName }}</template>
          </ElTableColumn>

          <ElTableColumn label="follow-up" min-width="140">
            <template #default="{ row }">
              <div class="text-sm" :class="row.isOverdueFollowUp ? 'text-rose-500' : 'text-slate-700'">
                {{ row.followUpRequired ? "需跟進" : "無" }}
              </div>
              <div
                v-if="row.followUpRequired"
                class="text-xs"
                :class="row.isOverdueFollowUp ? 'text-rose-500' : 'text-slate-500'"
              >
                {{ row.followUpAt || "待安排" }}
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="最後更新" min-width="160" sortable="custom" prop="updatedAt">
            <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
          </ElTableColumn>

          <ElTableColumn label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <div class="flex items-center justify-end gap-1">
                <ElButton text type="primary" @click="openDetail(row)">查看</ElButton>
                <ElButton text @click="openEditDrawer(row)">編輯</ElButton>
                <ElDropdown trigger="click">
                  <ElButton link :icon="MoreFilled" />
                  <template #dropdown>
                    <ElDropdownMenu>
                      <ElDropdownItem @click="markCompleted(row)">標記完成</ElDropdownItem>
                      <ElDropdownItem @click="duplicateFromList(row)">複製為新紀錄</ElDropdownItem>
                      <ElDropdownItem @click="convertToTask(row)">轉成任務</ElDropdownItem>
                      <ElDropdownItem @click="archive(row)">封存</ElDropdownItem>
                    </ElDropdownMenu>
                  </template>
                </ElDropdown>
              </div>
            </template>
          </ElTableColumn>
        </ElTable>

        <div class="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-5">
          <ElPagination
            v-model:current-page="currentPage"
            background
            :page-size="pageSize"
            layout="total, prev, pager, next"
            :total="sortedRecords.length"
          />
          <ElSelect v-model="pageSize" class="!w-[100px]" @change="currentPage = 1">
            <ElOption :value="10" label="10 Item" />
            <ElOption :value="20" label="20 Item" />
            <ElOption :value="50" label="50 Item" />
          </ElSelect>
        </div>
      </section>
    </section>

    <ElDrawer v-model="detailDrawerOpen" size="44%" :destroy-on-close="false" title="互動詳情">
      <template v-if="detailRecord">
        <section class="grid gap-4">
          <header class="grid gap-2">
            <h2 class="text-xl font-semibold text-slate-900">{{ detailRecord.title }}</h2>
            <div class="flex flex-wrap items-center gap-2">
              <ElTag :type="interactionTypeMap[detailRecord.interactionType]?.type" effect="light">
                {{ interactionTypeMap[detailRecord.interactionType]?.label }}
              </ElTag>
              <ElTag :type="interactionStatusMap[detailRecord.status]?.type" effect="light">
                {{ interactionStatusMap[detailRecord.status]?.label }}
              </ElTag>
              <ElTag v-if="detailRecord.isImportant" type="danger" effect="light">重要</ElTag>
            </div>
          </header>

          <ElDescriptions :column="2" border class="uniform-descriptions">
            <ElDescriptionsItem label="互動編號">{{ detailRecord.interactionNo }}</ElDescriptionsItem>
            <ElDescriptionsItem label="互動時間">{{ formatDateTime(detailRecord.interactedAt) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="對方姓名">{{ detailRecord.contactName || "-" }}</ElDescriptionsItem>
            <ElDescriptionsItem label="公司 / 單位">{{ detailRecord.companyName || "-" }}</ElDescriptionsItem>
            <ElDescriptionsItem label="Email">{{ detailRecord.contactEmail || "-" }}</ElDescriptionsItem>
            <ElDescriptionsItem label="電話">{{ detailRecord.contactPhone || "-" }}</ElDescriptionsItem>
            <ElDescriptionsItem label="通話時長">
              {{ detailRecord.interactionType === "call" ? `${detailRecord.durationMinutes} 分鐘` : "-" }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="負責人">{{ detailRecord.ownerName }}</ElDescriptionsItem>
            <ElDescriptionsItem label="關聯主體" :span="2">{{ detailRecord.relatedSummary }}</ElDescriptionsItem>
          </ElDescriptions>

          <ElCard shadow="never">
            <template #header><span class="text-sm font-semibold text-slate-800">內容</span></template>
            <div class="grid gap-3 text-sm text-slate-700">
              <div><span class="font-semibold text-slate-800">摘要：</span>{{ detailRecord.summary || "-" }}</div>
              <div><span class="font-semibold text-slate-800">結果：</span>{{ detailRecord.result || "-" }}</div>
            </div>
          </ElCard>

          <ElCard shadow="never">
            <template #header><span class="text-sm font-semibold text-slate-800">Follow-up</span></template>
            <div class="grid gap-2 text-sm">
              <p :class="detailRecord.isOverdueFollowUp ? 'text-rose-500' : 'text-slate-700'">
                {{ detailRecord.followUpRequired ? "需要 follow-up" : "不需要 follow-up" }}
              </p>
              <p class="text-slate-600">日期：{{ detailRecord.followUpAt || "-" }}</p>
              <p class="text-slate-600">備註：{{ detailRecord.followUpNote || "-" }}</p>
            </div>
          </ElCard>

          <ElCard shadow="never">
            <template #header><span class="text-sm font-semibold text-slate-800">附件與備註</span></template>
            <div class="grid gap-2 text-sm text-slate-700">
              <p>附件：{{ detailRecord.attachments.join("、") || "-" }}</p>
              <p>標籤：{{ detailRecord.tags.join("、") || "-" }}</p>
              <p>備註：{{ detailRecord.notes || "-" }}</p>
            </div>
          </ElCard>
        </section>
      </template>
    </ElDrawer>

    <ElDrawer v-model="formDrawerOpen" size="50%" :destroy-on-close="false" :title="formTitle">
      <ElForm label-position="top" class="grid gap-4">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <ElFormItem label="互動主題"><ElInput v-model="form.title" /></ElFormItem>
          <ElFormItem label="紀錄編號"><ElInput v-model="form.interactionNo" /></ElFormItem>
          <ElFormItem label="互動類型">
            <ElSelect v-model="form.interactionType">
              <ElOption v-for="(meta, key) in interactionTypeMap" :key="key" :label="meta.label" :value="key" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="互動狀態">
            <ElSelect v-model="form.status">
              <ElOption v-for="(meta, key) in interactionStatusMap" :key="key" :label="meta.label" :value="key" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="是否重要"><ElSwitch v-model="form.isImportant" /></ElFormItem>
          <ElFormItem label="負責人">
            <ElSelect v-model="form.ownerId">
              <ElOption v-for="item in ownerSelectOptions" :key="item.value" :label="item.label" :value="item.value" />
            </ElSelect>
          </ElFormItem>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ElFormItem label="互動日期">
            <ElDatePicker v-model="form.interactionDate" type="date" value-format="YYYY-MM-DD" class="!w-full" />
          </ElFormItem>
          <ElFormItem label="互動時間">
            <ElTimePicker v-model="form.interactionTime" value-format="HH:mm" format="HH:mm" class="!w-full" />
          </ElFormItem>
          <ElFormItem v-if="form.interactionType === 'call'" label="通話時長(分鐘)">
            <ElInput v-model.number="form.durationMinutes" type="number" min="0" />
          </ElFormItem>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <ElFormItem label="對方姓名"><ElInput v-model="form.contactName" /></ElFormItem>
          <ElFormItem label="對方 Email"><ElInput v-model="form.contactEmail" /></ElFormItem>
          <ElFormItem label="對方電話"><ElInput v-model="form.contactPhone" /></ElFormItem>
          <ElFormItem label="公司 / 單位"><ElInput v-model="form.companyName" /></ElFormItem>
          <ElFormItem label="客戶"><ElSelect v-model="form.customerId" clearable><ElOption v-for="item in accountOptions" :key="item.id" :label="item.name" :value="item.id" /></ElSelect></ElFormItem>
          <ElFormItem label="商機"><ElSelect v-model="form.opportunityId" clearable><ElOption v-for="item in opportunityOptions" :key="item.id" :label="item.name" :value="item.id" /></ElSelect></ElFormItem>
          <ElFormItem label="專案"><ElSelect v-model="form.projectId" clearable><ElOption v-for="item in projectOptions" :key="item.id" :label="item.name" :value="item.id" /></ElSelect></ElFormItem>
          <ElFormItem label="夥伴"><ElSelect v-model="form.partnerId" clearable><ElOption v-for="item in partnerDirectory" :key="item.id" :label="item.name" :value="item.id" /></ElSelect></ElFormItem>
          <ElFormItem label="支援案件"><ElSelect v-model="form.supportTicketId" clearable><ElOption v-for="item in supportTicketOptions" :key="item.id" :label="item.title" :value="item.id" /></ElSelect></ElFormItem>
        </div>

        <ElFormItem label="摘要"><ElInput v-model="form.summary" type="textarea" :rows="3" /></ElFormItem>
        <ElFormItem :label="form.interactionType === 'email' ? 'Email 主旨 / 結果' : '通話摘要 / 結果'">
          <ElInput v-model="form.result" type="textarea" :rows="3" />
        </ElFormItem>

        <div class="grid gap-3 md:grid-cols-3">
          <ElFormItem label="需要 follow-up"><ElSwitch v-model="form.followUpRequired" /></ElFormItem>
          <ElFormItem v-if="form.followUpRequired" label="follow-up 日期">
            <ElDatePicker v-model="form.followUpAt" type="date" value-format="YYYY-MM-DD" class="!w-full" />
          </ElFormItem>
        </div>

        <ElFormItem v-if="form.followUpRequired" label="follow-up 備註"><ElInput v-model="form.followUpNote" /></ElFormItem>
        <ElFormItem label="標籤"><ElInput v-model="form.tagsInput" placeholder="以頓號或逗號分隔" /></ElFormItem>
        <ElFormItem label="附件"><ElInput v-model="form.attachmentsInput" placeholder="以頓號或逗號分隔" /></ElFormItem>
        <ElFormItem label="備註"><ElInput v-model="form.notes" type="textarea" :rows="3" /></ElFormItem>

        <div class="flex justify-end gap-2 border-t border-slate-200 pt-3">
          <ElButton @click="formDrawerOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitForm">儲存</ElButton>
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
</style>
