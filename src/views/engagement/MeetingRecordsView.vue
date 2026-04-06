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
  ElTabs,
  ElTabPane,
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
  meetingStatusMap,
  meetingTypeMap,
  opportunityOptions,
  partnerDirectory,
  projectOptions,
  supportTicketOptions,
  userList,
} from "../../data/meetings";
import { useMeetingsStore } from "../../composables/useMeetingsStore";

const router = useRouter();
const { archiveMeeting, meetings, setMeetingStatus, toTimestamp } = useMeetingsStore();

const loading = ref(false);
const filterPanelOpen = ref(false);
const currentView = ref("list");
const quickFilter = ref("recent_7_days");
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
  meetingType: "all",
  status: "all",
  hostId: "all",
  recorderId: "all",
  customerId: "all",
  opportunityId: "all",
  projectId: "all",
  activityId: "all",
  partnerId: "all",
  supportTicketId: "all",
  meetingDateRange: [],
  hasActionItems: "all",
  hasAttachments: "all",
  isImportant: "all",
  isRecurring: "all",
});

const quickFilterOptions = [
  { value: "recent_7_days", label: "最近 7 天" },
  { value: "hosted_by_me", label: "我主持的" },
  { value: "joined_by_me", label: "我參與的" },
  { value: "follow_up", label: "有待跟進" },
  { value: "customer_meeting", label: "客戶會議" },
  { value: "project_meeting", label: "專案會議" },
  { value: "weekly", label: "週會" },
];

const yesNoOptions = [
  { value: "all", label: "全部" },
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
];

const meetingTypeOptions = [
  { value: "all", label: "全部會議類型" },
  ...Object.entries(meetingTypeMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const statusOptions = [
  { value: "all", label: "全部會議狀態" },
  ...Object.entries(meetingStatusMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const userOptions = [
  { value: "all", label: "全部" },
  ...userList
    .filter((item) => item.status === "active")
    .map((item) => ({
      value: item.id,
      label: item.name,
    })),
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

const activityFilterOptions = computed(() => {
  const names = new Map(
    meetings.value.map((item) => [item.activityId, item.activityName])
  );
  const options = [{ value: "all", label: "全部活動" }];

  names.forEach((name, id) => {
    if (id) {
      options.push({ value: id, label: name || id });
    }
  });

  return options;
});

const partnerFilterOptions = [
  { value: "all", label: "全部夥伴" },
  ...partnerDirectory.map((item) => ({ value: item.id, label: item.name })),
];

const supportTicketFilterOptions = [
  { value: "all", label: "全部支援案件" },
  ...supportTicketOptions.map((item) => ({ value: item.id, label: item.title })),
];

function notify(message, title = "已更新", type = "success") {
  ElNotification({
    title,
    message,
    type,
    position: "top-right",
  });
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
  const total = meetings.value.length;
  const now = new Date();

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - (now.getDay() || 7) + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const thisWeek = meetings.value.filter((item) => {
    const time = toTimestamp(item.meetingDate);
    return time >= startOfWeek.getTime() && time <= endOfWeek.getTime();
  }).length;

  const thisMonth = meetings.value.filter((item) => {
    const date = parseDate(item.meetingDate);
    return (
      date &&
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }).length;

  const followUp = meetings.value.filter((item) => item.openActionItemCount > 0).length;

  const monthNewActionItems = meetings.value
    .filter((item) => {
      const date = parseDate(item.createdAt);
      return (
        date &&
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    })
    .reduce((sum, item) => sum + item.actionItemCount, 0);

  const unfinishedActionItems = meetings.value.reduce(
    (sum, item) => sum + item.openActionItemCount,
    0
  );

  return [
    { label: "會議總數", value: total },
    { label: "本週會議數", value: thisWeek },
    { label: "本月會議數", value: thisMonth },
    { label: "待跟進會議數", value: followUp },
    { label: "本月新增待辦數", value: monthNewActionItems },
    { label: "尚未完成待辦數", value: unfinishedActionItems },
  ];
});

const filteredMeetings = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return meetings.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.title.toLowerCase().includes(keyword) ||
      item.meetingNo.toLowerCase().includes(keyword) ||
      item.agendaSummary.toLowerCase().includes(keyword) ||
      item.decisionSummary.toLowerCase().includes(keyword);

    const matchesType =
      filters.meetingType === "all" || item.meetingType === filters.meetingType;
    const matchesStatus = filters.status === "all" || item.status === filters.status;
    const matchesHost = filters.hostId === "all" || item.hostId === filters.hostId;
    const matchesRecorder =
      filters.recorderId === "all" || item.recorderId === filters.recorderId;
    const matchesCustomer =
      filters.customerId === "all" || item.customerId === filters.customerId;
    const matchesOpportunity =
      filters.opportunityId === "all" || item.opportunityId === filters.opportunityId;
    const matchesProject =
      filters.projectId === "all" || item.projectId === filters.projectId;
    const matchesActivity =
      filters.activityId === "all" || item.activityId === filters.activityId;
    const matchesPartner =
      filters.partnerId === "all" || item.partnerId === filters.partnerId;
    const matchesSupportTicket =
      filters.supportTicketId === "all" ||
      item.supportTicketId === filters.supportTicketId;
    const matchesDate = isDateWithinRange(item.meetingDate, filters.meetingDateRange);

    const matchesActionItems =
      filters.hasActionItems === "all" ||
      (filters.hasActionItems === "yes" ? item.hasActionItems : !item.hasActionItems);

    const matchesAttachments =
      filters.hasAttachments === "all" ||
      (filters.hasAttachments === "yes" ? item.hasAttachments : !item.hasAttachments);

    const matchesImportant =
      filters.isImportant === "all" ||
      (filters.isImportant === "yes" ? item.isImportant : !item.isImportant);

    const matchesRecurring =
      filters.isRecurring === "all" ||
      (filters.isRecurring === "yes" ? item.isRecurring : !item.isRecurring);

    const matchesQuickFilter =
      (quickFilter.value === "recent_7_days" && isWithinDays(item.meetingDate, 7)) ||
      (quickFilter.value === "hosted_by_me" && item.hostId === "u-001") ||
      (quickFilter.value === "joined_by_me" &&
        item.internalParticipants.includes("u-001")) ||
      (quickFilter.value === "follow_up" && item.openActionItemCount > 0) ||
      (quickFilter.value === "customer_meeting" &&
        item.meetingType === "customer_meeting") ||
      (quickFilter.value === "project_meeting" &&
        item.meetingType === "project_meeting") ||
      (quickFilter.value === "weekly" && item.isRecurring);

    return (
      matchesKeyword &&
      matchesType &&
      matchesStatus &&
      matchesHost &&
      matchesRecorder &&
      matchesCustomer &&
      matchesOpportunity &&
      matchesProject &&
      matchesActivity &&
      matchesPartner &&
      matchesSupportTicket &&
      matchesDate &&
      matchesActionItems &&
      matchesAttachments &&
      matchesImportant &&
      matchesRecurring &&
      matchesQuickFilter
    );
  });
});

const sortedMeetings = computed(() => {
  const records = [...filteredMeetings.value];
  const direction = sortState.order === "ascending" ? 1 : -1;

  return records.sort((left, right) => {
    if (["meetingDate", "updatedAt"].includes(sortState.prop)) {
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

const pagedMeetings = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedMeetings.value.slice(start, start + pageSize.value);
});

const meetingsByDate = computed(() => {
  const map = new Map();

  meetings.value.forEach((item) => {
    const key = toDateKey(item.meetingDate);
    if (!key) {
      return;
    }

    const current = map.get(key) || [];
    current.push(item);
    map.set(key, current);
  });

  return map;
});

const selectedDateMeetings = computed(() => {
  const key = toDateKey(calendarDate.value);
  return meetingsByDate.value.get(key) || [];
});

function calendarSummary(date) {
  const items = meetingsByDate.value.get(toDateKey(date)) || [];
  return {
    count: items.length,
    important: items.filter((item) => item.isImportant).length,
    openActions: items.reduce((sum, item) => sum + item.openActionItemCount, 0),
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
  filters.meetingType = "all";
  filters.status = "all";
  filters.hostId = "all";
  filters.recorderId = "all";
  filters.customerId = "all";
  filters.opportunityId = "all";
  filters.projectId = "all";
  filters.activityId = "all";
  filters.partnerId = "all";
  filters.supportTicketId = "all";
  filters.meetingDateRange = [];
  filters.hasActionItems = "all";
  filters.hasAttachments = "all";
  filters.isImportant = "all";
  filters.isRecurring = "all";
  quickFilter.value = "recent_7_days";
  currentPage.value = 1;
}

function openCreatePage() {
  router.push({ name: "engagement-meeting-create" });
}

function openDetail(record) {
  router.push({
    name: "engagement-meeting-detail",
    params: { meetingId: record.id },
  });
}

function openEdit(record) {
  router.push({
    name: "engagement-meeting-edit",
    params: { meetingId: record.id },
  });
}

async function archive(record) {
  try {
    await ElMessageBox.confirm(`確認封存「${record.title}」？`, "封存會議", {
      confirmButtonText: "封存",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    return;
  }

  archiveMeeting(record.id, "列表快速封存", "林美雅");
  notify(`${record.title} 已封存`);
}

function markCompleted(record) {
  setMeetingStatus(record.id, "completed", {
    reason: "列表快速操作",
    actorName: "林美雅",
  });
  notify(`${record.title} 已標記為已完成`);
}

function exportCsv() {
  const header = [
    "會議編號",
    "會議主題",
    "會議類型",
    "狀態",
    "會議日期",
    "主持人",
    "待辦未完成數",
  ];
  const rows = sortedMeetings.value.map((item) => [
    item.meetingNo,
    item.title,
    meetingTypeMap[item.meetingType]?.label || item.meetingType,
    meetingStatusMap[item.status]?.label || item.status,
    item.meetingDate,
    item.hostName,
    String(item.openActionItemCount),
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
  anchor.download = `meeting-records-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function openMeetingFromCalendar(record) {
  currentView.value = "list";
  openDetail(record);
}

watch(
  () => [
    filteredMeetings.value.length,
    pageSize.value,
    quickFilter.value,
    filters.keyword,
    filters.meetingType,
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
            會議紀錄
          </h1>
          <p class="text-sm text-slate-500">
            集中管理會議內容、決議事項、待辦追蹤與關聯業務脈絡
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton :icon="Download" @click="exportCsv">匯出</ElButton>
          <ElButton type="primary" :icon="CirclePlus" @click="openCreatePage"
            >新增會議紀錄</ElButton
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
              placeholder="搜尋主題 / 編號 / 決議摘要"
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
                ><ElSelect v-model="filters.meetingType"
                  ><ElOption
                    v-for="item in meetingTypeOptions"
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
                ><ElSelect v-model="filters.hostId"
                  ><ElOption
                    v-for="item in userOptions"
                    :key="`host-${item.value}`"
                    :label="item.label"
                    :value="item.value" /></ElSelect
              ></ElFormItem>
              <ElFormItem
                ><ElSelect v-model="filters.recorderId"
                  ><ElOption
                    v-for="item in userOptions"
                    :key="`record-${item.value}`"
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
                ><ElSelect v-model="filters.activityId"
                  ><ElOption
                    v-for="item in activityFilterOptions"
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
                ><ElDatePicker
                  v-model="filters.meetingDateRange"
                  type="daterange"
                  value-format="YYYY-MM-DD"
                  start-placeholder="會議開始日期"
                  end-placeholder="會議結束日期"
                  class="!w-full"
              /></ElFormItem>
              <ElFormItem
                ><ElSelect v-model="filters.hasActionItems"
                  ><ElOption
                    v-for="item in yesNoOptions"
                    :key="`todo-${item.value}`"
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
          :data="pagedMeetings"
          @selection-change="handleSelectionChange"
          @sort-change="handleSortChange"
        >
          <ElTableColumn type="selection" width="46" />

          <ElTableColumn label="會議" min-width="260" sortable="custom" prop="title">
            <template #default="{ row }">
              <button type="button" class="grid gap-1 text-left" @click="openDetail(row)">
                <span class="font-semibold text-[#303133] hover:text-[#409eff]">{{
                  row.title
                }}</span>
                <span class="text-xs text-slate-500">{{ row.meetingNo }}</span>
                <div class="flex flex-wrap gap-1">
                  <ElTag v-if="row.isImportant" size="small" type="danger" effect="light"
                    >重要</ElTag
                  >
                  <ElTag v-if="row.isRecurring" size="small" effect="light">週會</ElTag>
                </div>
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="會議類型" min-width="120">
            <template #default="{ row }">
              <ElTag
                size="small"
                :type="meetingTypeMap[row.meetingType]?.type"
                effect="light"
              >
                {{ meetingTypeMap[row.meetingType]?.label || row.meetingType }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn
            label="會議日期"
            min-width="170"
            sortable="custom"
            prop="meetingDate"
          >
            <template #default="{ row }">
              <div class="text-sm text-slate-700">{{ row.meetingDate }}</div>
              <div class="text-xs text-slate-500">
                {{ row.startTime }} - {{ row.endTime }}
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="參與者" min-width="170">
            <template #default="{ row }">
              <div class="text-sm text-slate-700">主持：{{ row.hostName }}</div>
              <div class="text-xs text-slate-500">共 {{ row.participantCount }} 人</div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="關聯主體" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ row.relatedSummary }}</template>
          </ElTableColumn>

          <ElTableColumn label="決議摘要" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ row.decisionSummary }}</template>
          </ElTableColumn>

          <ElTableColumn label="待辦數" min-width="120">
            <template #default="{ row }">
              <div class="text-sm text-slate-700">{{ row.actionItemCount }}</div>
              <div class="text-xs text-rose-500">
                未完成 {{ row.openActionItemCount }}
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="記錄人" min-width="120">
            <template #default="{ row }">{{ row.recorderName }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="最後更新"
            min-width="150"
            sortable="custom"
            prop="updatedAt"
          >
            <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
          </ElTableColumn>

          <ElTableColumn label="操作" width="160" fixed="right">
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
            :total="sortedMeetings.length"
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
            <span class="text-sm font-semibold text-slate-800">會議日曆</span>
          </template>

          <ElCalendar v-model="calendarDate">
            <template #date-cell="{ data }">
              <div class="calendar-cell">
                <span class="calendar-day">{{
                  data.day.split("-").slice(1).join("/")
                }}</span>
                <div class="calendar-meta">
                  <span v-if="calendarSummary(data.date).count > 0"
                    >{{ calendarSummary(data.date).count }} 場</span
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
                </div>
              </div>
            </template>
          </ElCalendar>
        </ElCard>

        <ElCard shadow="never">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-slate-800">當日會議</span>
              <span class="text-xs text-slate-500">{{ formatDate(calendarDate) }}</span>
            </div>
          </template>

          <div v-if="selectedDateMeetings.length" class="grid gap-3">
            <article
              v-for="meeting in selectedDateMeetings"
              :key="meeting.id"
              class="rounded-xl border border-slate-200 p-3"
            >
              <div class="flex items-start justify-between gap-2">
                <button
                  type="button"
                  class="text-left text-sm font-semibold text-[#303133] hover:text-[#409eff]"
                  @click="openMeetingFromCalendar(meeting)"
                >
                  {{ meeting.title }}
                </button>
                <ElTag
                  size="small"
                  :type="meetingTypeMap[meeting.meetingType]?.type"
                  effect="light"
                >
                  {{ meetingTypeMap[meeting.meetingType]?.label || meeting.meetingType }}
                </ElTag>
              </div>

              <p class="mt-2 text-xs text-slate-500">
                {{ meeting.startTime }} - {{ meeting.endTime }}
              </p>
              <p class="mt-1 text-xs text-slate-500">主持：{{ meeting.hostName }}</p>
              <p class="mt-1 text-xs text-amber-600">
                未完成待辦：{{ meeting.openActionItemCount }}
              </p>
            </article>
          </div>

          <ElEmpty v-else description="當日無會議紀錄" :image-size="96" />
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
  color: #64748b;
}
</style>
