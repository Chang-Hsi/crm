<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  ElButton,
  ElCalendar,
  ElCard,
  ElDatePicker,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessageBox,
  ElNotification,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";
import {
  Calendar,
  CirclePlus,
  Download,
  Filter,
  MoreFilled,
  Refresh,
  Search,
} from "@element-plus/icons-vue";
import {
  accountOptions,
  opportunityOptions,
  partnerDirectory,
  projectOptions,
  supportTicketOptions,
  userList,
  visitFormatMap,
  visitStatusMap,
  visitTypeMap,
} from "../../data/visits";
import { useVisitsStore } from "../../composables/useVisitsStore";

const router = useRouter();
const {
  archiveVisit,
  duplicateVisit,
  setVisitStatus,
  toTimestamp,
  visits,
} = useVisitsStore();

const loading = ref(false);
const filterPanelOpen = ref(false);
const currentView = ref("list");
const quickFilter = ref("all");
const currentPage = ref(1);
const pageSize = ref(10);
const selectedRows = ref([]);
const calendarDate = ref(new Date());

const sortState = reactive({
  prop: "updatedAt",
  order: "descending",
});

const filters = reactive({
  keyword: "",
  visitType: "all",
  status: "all",
  ownerId: "all",
  collaboratorId: "all",
  customerId: "all",
  opportunityId: "all",
  projectId: "all",
  partnerId: "all",
  supportTicketId: "all",
  format: "all",
  isImportant: "all",
  visitDateRange: [],
});

const quickFilterOptions = [
  { value: "all", label: "全部" },
  { value: "recent_7_days", label: "最近 7 天" },
  { value: "my_visits", label: "我拜訪的" },
  { value: "follow_up", label: "有待跟進" },
  { value: "customer_visit", label: "客戶拜訪" },
  { value: "opportunity_visit", label: "商機拜訪" },
  { value: "site_survey", label: "專案現勘" },
  { value: "support_visit", label: "支援現場處理" },
];

const yesNoOptions = [
  { value: "all", label: "全部" },
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
];

const visitTypeOptions = [
  { value: "all", label: "全部拜訪類型" },
  ...Object.entries(visitTypeMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const statusOptions = [
  { value: "all", label: "全部拜訪狀態" },
  ...Object.entries(visitStatusMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const userOptions = [
  { value: "all", label: "全部" },
  ...userList
    .filter((item) => item.status === "active")
    .map((item) => ({ value: item.id, label: item.name })),
];

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

const formatOptions = [
  { value: "all", label: "全部拜訪形式" },
  ...Object.entries(visitFormatMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

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

function toDateKey(value) {
  const date = parseDate(value);
  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

const kpiCards = computed(() => {
  const total = visits.value.length;
  const now = new Date();

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - (now.getDay() || 7) + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const thisWeek = visits.value.filter((item) => {
    const time = toTimestamp(item.visitDate);
    return time >= startOfWeek.getTime() && time <= endOfWeek.getTime();
  }).length;

  const thisMonth = visits.value.filter((item) => {
    const date = parseDate(item.visitDate);
    return (
      date &&
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }).length;

  const followUp = visits.value.filter((item) => item.openActionItemCount > 0).length;

  const monthNewActionItems = visits.value
    .filter((item) => {
      const date = parseDate(item.createdAt);
      return (
        date &&
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    })
    .reduce((sum, item) => sum + item.actionItemCount, 0);

  const nextVisits = visits.value.filter((item) => {
    const suggested = String(item.nextVisitSuggestedAt || "");
    if (!suggested || suggested === "無" || suggested === "待安排") {
      return false;
    }
    return toTimestamp(suggested) >= toTimestamp(now.toISOString().slice(0, 10));
  }).length;

  return [
    { label: "拜訪總數", value: total },
    { label: "本週拜訪數", value: thisWeek },
    { label: "本月拜訪數", value: thisMonth },
    { label: "待跟進拜訪數", value: followUp },
    { label: "本月新增待辦數", value: monthNewActionItems },
    { label: "下次待拜訪數", value: nextVisits },
  ];
});

const filteredVisits = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return visits.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.title.toLowerCase().includes(keyword) ||
      item.visitNo.toLowerCase().includes(keyword) ||
      String(item.summary || "")
        .toLowerCase()
        .includes(keyword) ||
      String(item.observations || "")
        .toLowerCase()
        .includes(keyword) ||
      String(item.conclusion || "")
        .toLowerCase()
        .includes(keyword);

    const matchesType =
      filters.visitType === "all" || item.visitType === filters.visitType;
    const matchesStatus = filters.status === "all" || item.status === filters.status;
    const matchesOwner = filters.ownerId === "all" || item.ownerId === filters.ownerId;
    const matchesCollaborator =
      filters.collaboratorId === "all" ||
      item.collaboratorIds.includes(filters.collaboratorId);
    const matchesCustomer =
      filters.customerId === "all" || item.customerId === filters.customerId;
    const matchesOpportunity =
      filters.opportunityId === "all" || item.opportunityId === filters.opportunityId;
    const matchesProject =
      filters.projectId === "all" || item.projectId === filters.projectId;
    const matchesPartner =
      filters.partnerId === "all" || item.partnerId === filters.partnerId;
    const matchesSupportTicket =
      filters.supportTicketId === "all" ||
      item.supportTicketId === filters.supportTicketId;
    const matchesFormat = filters.format === "all" || item.format === filters.format;
    const matchesDate = isDateWithinRange(item.visitDate, filters.visitDateRange);

    const matchesImportant =
      filters.isImportant === "all" ||
      (filters.isImportant === "yes" ? item.isImportant : !item.isImportant);

    const matchesQuickFilter =
      quickFilter.value === "all" ||
      (quickFilter.value === "recent_7_days" && isWithinDays(item.visitDate, 7)) ||
      (quickFilter.value === "my_visits" &&
        (item.ownerId === "u-001" || item.collaboratorIds.includes("u-001"))) ||
      (quickFilter.value === "follow_up" && item.openActionItemCount > 0) ||
      (quickFilter.value === "customer_visit" && item.visitType === "customer_visit") ||
      (quickFilter.value === "opportunity_visit" &&
        item.visitType === "opportunity_visit") ||
      (quickFilter.value === "site_survey" && item.visitType === "site_survey") ||
      (quickFilter.value === "support_visit" && item.visitType === "support_visit");

    return (
      matchesKeyword &&
      matchesType &&
      matchesStatus &&
      matchesOwner &&
      matchesCollaborator &&
      matchesCustomer &&
      matchesOpportunity &&
      matchesProject &&
      matchesPartner &&
      matchesSupportTicket &&
      matchesFormat &&
      matchesDate &&
      matchesImportant &&
      matchesQuickFilter
    );
  });
});

const sortedVisits = computed(() => {
  const records = [...filteredVisits.value];
  const direction = sortState.order === "ascending" ? 1 : -1;

  return records.sort((left, right) => {
    if (["visitDate", "updatedAt"].includes(sortState.prop)) {
      return (
        (toTimestamp(left[sortState.prop]) - toTimestamp(right[sortState.prop])) *
        direction
      );
    }

    return (
      String(left[sortState.prop] || "").localeCompare(
        String(right[sortState.prop] || ""),
        "zh-Hant"
      ) * direction
    );
  });
});

const pagedVisits = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedVisits.value.slice(start, start + pageSize.value);
});

const visitsByDate = computed(() => {
  const map = new Map();

  visits.value.forEach((item) => {
    const key = toDateKey(item.visitDate);
    if (!key) {
      return;
    }

    const current = map.get(key) || [];
    current.push(item);
    map.set(key, current);
  });

  return map;
});

const selectedDateVisits = computed(() => {
  const key = toDateKey(calendarDate.value);
  return visitsByDate.value.get(key) || [];
});

function calendarSummary(date) {
  const items = visitsByDate.value.get(toDateKey(date)) || [];
  const revisit = items.filter((item) => {
    const suggested = String(item.nextVisitSuggestedAt || "");
    return suggested && suggested !== "無" && suggested !== "待安排";
  }).length;

  return {
    count: items.length,
    important: items.filter((item) => item.isImportant).length,
    openActions: items.reduce((sum, item) => sum + item.openActionItemCount, 0),
    revisit,
  };
}

function handleSortChange({ prop, order }) {
  sortState.prop = prop || "updatedAt";
  sortState.order = order || "descending";
}

function handleSelectionChange(rows) {
  selectedRows.value = rows;
}

function resetFilters() {
  filters.keyword = "";
  filters.visitType = "all";
  filters.status = "all";
  filters.ownerId = "all";
  filters.collaboratorId = "all";
  filters.customerId = "all";
  filters.opportunityId = "all";
  filters.projectId = "all";
  filters.partnerId = "all";
  filters.supportTicketId = "all";
  filters.format = "all";
  filters.isImportant = "all";
  filters.visitDateRange = [];
  quickFilter.value = "all";
  currentPage.value = 1;
}

function openCreatePage() {
  router.push({ name: "engagement-visit-create" });
}

function openDetail(record) {
  router.push({
    name: "engagement-visit-detail",
    params: { visitId: record.id },
  });
}

function openEdit(record) {
  router.push({
    name: "engagement-visit-edit",
    params: { visitId: record.id },
  });
}

async function archive(record) {
  try {
    await ElMessageBox.confirm(`確認封存「${record.title}」？`, "封存拜訪", {
      confirmButtonText: "封存",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    return;
  }

  archiveVisit(record.id, "列表快速封存", "林美雅");
  notify(`${record.title} 已封存`);
}

function markCompleted(record) {
  setVisitStatus(record.id, "completed", {
    reason: "列表快速操作",
    actorName: "林美雅",
  });
  notify(`${record.title} 已標記為已完成`);
}

function duplicateFromList(record) {
  const created = duplicateVisit(record.id, "林美雅");
  if (!created) {
    notify("複製失敗", "錯誤", "error");
    return;
  }

  notify(`已建立複製拜訪：${created.title}`);
  openDetail(created);
}

function convertToTask(record) {
  notify(`已建立待辦轉任務入口：${record.title}`, "功能預留", "info");
}

function batchMarkCompleted() {
  if (selectedRows.value.length === 0) {
    notify("請先勾選要操作的拜訪紀錄", "提醒", "warning");
    return;
  }

  selectedRows.value.forEach((row) => {
    setVisitStatus(row.id, "completed", {
      reason: "列表批次操作",
      actorName: "林美雅",
    });
  });

  notify(`已批次標記 ${selectedRows.value.length} 筆拜訪為已完成`);
}

async function batchArchive() {
  if (selectedRows.value.length === 0) {
    notify("請先勾選要操作的拜訪紀錄", "提醒", "warning");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `確認封存已勾選的 ${selectedRows.value.length} 筆拜訪紀錄？`,
      "批次封存",
      {
        confirmButtonText: "封存",
        cancelButtonText: "取消",
        type: "warning",
      }
    );
  } catch {
    return;
  }

  selectedRows.value.forEach((row) => {
    archiveVisit(row.id, "列表批次封存", "林美雅");
  });

  notify(`已封存 ${selectedRows.value.length} 筆拜訪紀錄`);
}

function exportCsv() {
  const header = [
    "拜訪編號",
    "拜訪主題",
    "拜訪類型",
    "狀態",
    "拜訪日期",
    "主責人",
    "待辦未完成數",
    "下次建議拜訪",
  ];
  const rows = sortedVisits.value.map((item) => [
    item.visitNo,
    item.title,
    visitTypeMap[item.visitType]?.label || item.visitType,
    visitStatusMap[item.status]?.label || item.status,
    item.visitDate,
    item.ownerName,
    String(item.openActionItemCount),
    item.nextVisitSuggestedAt || "-",
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
  anchor.download = `visit-records-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function openVisitFromCalendar(record) {
  currentView.value = "list";
  openDetail(record);
}

watch(
  () => [
    filteredVisits.value.length,
    pageSize.value,
    quickFilter.value,
    filters.keyword,
    filters.visitType,
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
            拜訪紀錄
          </h1>
          <p class="text-sm text-slate-500">
            集中管理拜訪內容、現場觀察、後續追蹤與關聯業務脈絡
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
          <ElButton type="primary" :icon="CirclePlus" @click="openCreatePage"
            >新增拜訪紀錄</ElButton
          >
        </div>
      </header>

      <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
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
          <div class="flex flex-wrap gap-2">
            <ElButton
              :type="currentView === 'list' ? 'primary' : 'default'"
              @click="currentView = 'list'"
              >列表視圖</ElButton
            >
            <ElButton
              :type="currentView === 'calendar' ? 'primary' : 'default'"
              :icon="Calendar"
              @click="currentView = 'calendar'"
              >日曆視圖</ElButton
            >
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <ElInput
              v-model="filters.keyword"
              placeholder="搜尋主題 / 編號 / 摘要 / 現場觀察"
              clearable
              class="!w-64"
            >
              <template #prefix>
                <Search class="h-4 w-4 text-slate-400" />
              </template>
            </ElInput>
            <ElButton :icon="Filter" @click="filterPanelOpen = !filterPanelOpen"
              >Filter</ElButton
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
            class="mt-4 rounded-xl border border-slate-100 bg-white p-4"
            label-position="top"
          >
            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <ElFormItem
                ><ElSelect v-model="filters.visitType"
                  ><ElOption
                    v-for="item in visitTypeOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value" /></ElSelect
              ></ElFormItem>
              <ElFormItem
                ><ElSelect v-model="filters.status"
                  ><ElOption
                    v-for="item in statusOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value" /></ElSelect
              ></ElFormItem>
              <ElFormItem
                ><ElSelect v-model="filters.ownerId"
                  ><ElOption
                    v-for="item in userOptions"
                    :key="`owner-${item.value}`"
                    :label="item.label"
                    :value="item.value" /></ElSelect
              ></ElFormItem>
              <ElFormItem
                ><ElSelect v-model="filters.collaboratorId"
                  ><ElOption
                    v-for="item in userOptions"
                    :key="`collaborator-${item.value}`"
                    :label="item.label"
                    :value="item.value" /></ElSelect
              ></ElFormItem>
              <ElFormItem
                ><ElSelect v-model="filters.customerId"
                  ><ElOption
                    v-for="item in customerFilterOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value" /></ElSelect
              ></ElFormItem>
              <ElFormItem
                ><ElSelect v-model="filters.opportunityId"
                  ><ElOption
                    v-for="item in opportunityFilterOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value" /></ElSelect
              ></ElFormItem>
              <ElFormItem
                ><ElSelect v-model="filters.projectId"
                  ><ElOption
                    v-for="item in projectFilterOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value" /></ElSelect
              ></ElFormItem>
              <ElFormItem
                ><ElSelect v-model="filters.partnerId"
                  ><ElOption
                    v-for="item in partnerFilterOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value" /></ElSelect
              ></ElFormItem>
              <ElFormItem
                ><ElSelect v-model="filters.supportTicketId"
                  ><ElOption
                    v-for="item in supportTicketFilterOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value" /></ElSelect
              ></ElFormItem>
              <ElFormItem
                ><ElSelect v-model="filters.format"
                  ><ElOption
                    v-for="item in formatOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value" /></ElSelect
              ></ElFormItem>
              <ElFormItem
                ><ElDatePicker
                  v-model="filters.visitDateRange"
                  type="daterange"
                  value-format="YYYY-MM-DD"
                  start-placeholder="拜訪開始日期"
                  end-placeholder="拜訪結束日期"
                  class="!w-full"
              /></ElFormItem>
              <ElFormItem
                ><ElSelect v-model="filters.isImportant"
                  ><ElOption
                    v-for="item in yesNoOptions"
                    :key="`important-${item.value}`"
                    :label="item.label"
                    :value="item.value" /></ElSelect
              ></ElFormItem>
            </div>
          </ElForm>
        </transition>
      </section>

      <section
        v-if="currentView === 'list'"
        class="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4"
      >
        <ElTable
          v-loading="loading"
          table-layout="auto"
          :data="pagedVisits"
          @selection-change="handleSelectionChange"
          @sort-change="handleSortChange"
        >
          <ElTableColumn type="selection" width="46" />

          <ElTableColumn label="拜訪" min-width="260" sortable="custom" prop="title">
            <template #default="{ row }">
              <button type="button" class="grid gap-1 text-left" @click="openDetail(row)">
                <span class="font-semibold text-[#303133] hover:text-[#409eff]">{{
                  row.title
                }}</span>
                <span class="text-xs text-slate-500">{{ row.visitNo }}</span>
                <div class="flex flex-wrap gap-1">
                  <ElTag v-if="row.isImportant" size="small" type="danger" effect="light"
                    >重要</ElTag
                  >
                  <ElTag v-if="row.isFirstVisit" size="small" effect="light">初訪</ElTag>
                  <ElTag
                    v-if="row.visitType === 'site_survey'"
                    size="small"
                    type="success"
                    >現勘</ElTag
                  >
                  <ElTag
                    v-if="row.visitType === 'support_visit'"
                    size="small"
                    type="danger"
                    >支援現場</ElTag
                  >
                </div>
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="拜訪類型" min-width="120">
            <template #default="{ row }">
              <ElTag
                size="small"
                :type="visitTypeMap[row.visitType]?.type"
                effect="light"
              >
                {{ visitTypeMap[row.visitType]?.label || row.visitType }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn
            label="拜訪日期"
            min-width="170"
            sortable="custom"
            prop="visitDate"
          >
            <template #default="{ row }">
              <div class="text-sm text-slate-700">{{ row.visitDate }}</div>
              <div class="text-xs text-slate-500">
                {{ row.startTime }} - {{ row.endTime }}
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="主責人" min-width="160">
            <template #default="{ row }">
              <div class="text-sm text-slate-700">{{ row.ownerName }}</div>
              <div class="text-xs text-slate-500">
                協同 {{ row.collaboratorNames.length }} 人
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="對象 / 參與者" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
              <div class="text-sm text-slate-700">{{ row.visitTarget || "-" }}</div>
              <div class="text-xs text-slate-500">共 {{ row.participantCount }} 人</div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="關聯主體" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ row.relatedSummary }}</template>
          </ElTableColumn>

          <ElTableColumn label="拜訪摘要" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ row.summary || "-" }}</template>
          </ElTableColumn>

          <ElTableColumn label="待辦數" min-width="120">
            <template #default="{ row }">
              <div class="text-sm text-slate-700">{{ row.actionItemCount }}</div>
              <div class="text-xs text-rose-500">
                未完成 {{ row.openActionItemCount }}
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="下次建議" min-width="130">
            <template #default="{ row }">{{ row.nextVisitSuggestedAt || "無" }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="最後更新"
            min-width="150"
            sortable="custom"
            prop="updatedAt"
          >
            <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
          </ElTableColumn>

          <ElTableColumn label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <div class="flex items-center justify-end gap-1">
                <ElButton text type="primary" @click="openDetail(row)">查看</ElButton>
                <ElButton text @click="openEdit(row)">編輯</ElButton>

                <ElDropdown trigger="click">
                  <ElButton link :icon="MoreFilled" />
                  <template #dropdown>
                    <ElDropdownMenu>
                      <ElDropdownItem @click="markCompleted(row)"
                        >標記完成</ElDropdownItem
                      >
                      <ElDropdownItem @click="duplicateFromList(row)"
                        >複製為新拜訪</ElDropdownItem
                      >
                      <ElDropdownItem @click="convertToTask(row)"
                        >轉成任務</ElDropdownItem
                      >
                      <ElDropdownItem @click="archive(row)">封存</ElDropdownItem>
                    </ElDropdownMenu>
                  </template>
                </ElDropdown>
              </div>
            </template>
          </ElTableColumn>
        </ElTable>

        <div
          class="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-5"
        >
          <ElPagination
            v-model:current-page="currentPage"
            background
            :page-size="pageSize"
            layout="total, prev, pager, next"
            :total="sortedVisits.length"
          />
          <ElSelect v-model="pageSize" class="!w-[100px]" @change="currentPage = 1">
            <ElOption :value="10" label="10 Item" />
            <ElOption :value="20" label="20 Item" />
            <ElOption :value="50" label="50 Item" />
          </ElSelect>
        </div>
      </section>

      <section v-else class="grid gap-4 xl:grid-cols-[2.8fr_1fr]">
        <ElCard shadow="never">
          <template #header>
            <span class="text-sm font-semibold text-slate-800">拜訪日曆</span>
          </template>

          <ElCalendar v-model="calendarDate">
            <template #date-cell="{ data }">
              <div class="calendar-cell">
                <span class="calendar-day">{{
                  data.day.split("-").slice(1).join("/")
                }}</span>
                <div class="calendar-meta">
                  <span v-if="calendarSummary(data.date).count > 0"
                    >{{ calendarSummary(data.date).count }} 筆</span
                  >
                  <span
                    v-if="calendarSummary(data.date).important > 0"
                    class="text-rose-500"
                    >重點 {{ calendarSummary(data.date).important }}</span
                  >
                  <span
                    v-if="calendarSummary(data.date).openActions > 0"
                    class="text-amber-600"
                    >待辦 {{ calendarSummary(data.date).openActions }}</span
                  >
                  <span
                    v-if="calendarSummary(data.date).revisit > 0"
                    class="text-[#409eff]"
                    >建議回訪 {{ calendarSummary(data.date).revisit }}</span
                  >
                </div>
              </div>
            </template>
          </ElCalendar>
        </ElCard>

        <ElCard shadow="never">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-slate-800">當日拜訪</span>
              <span class="text-xs text-slate-500">{{ formatDate(calendarDate) }}</span>
            </div>
          </template>

          <div v-if="selectedDateVisits.length" class="grid gap-3">
            <article
              v-for="visit in selectedDateVisits"
              :key="visit.id"
              class="rounded-xl border border-slate-200 p-3"
            >
              <div class="flex items-start justify-between gap-2">
                <button
                  type="button"
                  class="text-left text-sm font-semibold text-[#303133] hover:text-[#409eff]"
                  @click="openVisitFromCalendar(visit)"
                >
                  {{ visit.title }}
                </button>
                <ElTag
                  size="small"
                  :type="visitTypeMap[visit.visitType]?.type"
                  effect="light"
                >
                  {{ visitTypeMap[visit.visitType]?.label || visit.visitType }}
                </ElTag>
              </div>

              <p class="mt-2 text-xs text-slate-500">
                {{ visit.startTime }} - {{ visit.endTime }}
              </p>
              <p class="mt-1 text-xs text-slate-500">主責：{{ visit.ownerName }}</p>
              <p class="mt-1 text-xs text-amber-600">
                未完成待辦：{{ visit.openActionItemCount }}
              </p>
            </article>
          </div>

          <ElEmpty v-else description="當日無拜訪紀錄" :image-size="96" />
        </ElCard>
      </section>
    </section>
  </div>
</template>

<style scoped>
:deep(.el-form-item) {
  margin-bottom: 12px;
}

.calendar-cell {
  display: grid;
  gap: 2px;
  min-height: 64px;
}

.calendar-day {
  font-size: 12px;
  color: #475569;
}

.calendar-meta {
  display: grid;
  gap: 2px;
  font-size: 11px;
}
</style>
