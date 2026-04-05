<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElDrawer,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElNotification,
  ElOption,
  ElPagination,
  ElProgress,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
} from "element-plus";
import {
  Calendar,
  CirclePlus,
  Download,
  Filter,
  Plus,
  Refresh,
  Search,
  Setting,
} from "@element-plus/icons-vue";
import {
  activityOptions,
  milestoneDirectory,
  projectOptions,
  reminderRuleList,
  slaStatusMap,
  taskPriorityMap,
  taskStatusMap,
  taskTemplateList,
  taskTypeMap,
  taskViewModeOptions,
  userList,
} from "../../data/tasks";
import { useTasksStore } from "../../composables/useTasksStore";

const {
  addSubtask,
  addTaskComment,
  applyTaskTemplate,
  createTask,
  getNextTaskNo,
  getTaskById,
  milestoneTaskSummary,
  reminderRules,
  setTaskStatus,
  tasks,
  templates,
  toggleSubtaskStatus,
  updateReminderRule,
  updateTask,
} = useTasksStore();
const route = useRoute();

const loading = ref(false);
const currentView = ref("list");
const selectedRows = ref([]);
const filterPanelOpen = ref(false);
const currentPage = ref(1);
const pageSize = ref(10);
const sortState = reactive({
  prop: "updatedAt",
  order: "descending",
});

const formDrawerOpen = ref(false);
const formMode = ref("create");
const editingTaskId = ref("");
const hydratingForm = ref(false);

const detailDrawerOpen = ref(false);
const detailTaskId = ref("");

const templateDrawerOpen = ref(false);
const slaDrawerOpen = ref(false);

const calendarMode = ref("month");
const calendarAnchorDate = ref(new Date().toISOString().slice(0, 10));

const filters = reactive({
  keyword: "",
  status: "all",
  taskType: "all",
  priority: "all",
  ownerId: "all",
  collaboratorId: "all",
  projectId: "all",
  activityId: "all",
  milestoneId: "all",
  dueDateRange: [],
  isDelayed: "all",
  isMine: "all",
  hasSubtasks: "all",
  hasUnreadComments: "all",
});

function normalizeQueryValue(value) {
  if (Array.isArray(value)) {
    return String(value[0] ?? "").trim();
  }

  return String(value ?? "").trim();
}

function applyRouteFilterQuery(query) {
  const projectId = normalizeQueryValue(query.projectId);
  const activityId = normalizeQueryValue(query.activityId);
  const milestoneId = normalizeQueryValue(query.milestoneId);

  filters.projectId = projectId || "all";
  filters.activityId = activityId || "all";
  filters.milestoneId = milestoneId || "all";
}

applyRouteFilterQuery(route.query);

const quickFilterOptions = [
  { value: "all", label: "全部" },
  { value: "today_due", label: "今日到期" },
  { value: "delayed", label: "已延遲" },
  { value: "high_priority", label: "高優先級" },
  { value: "mine", label: "我負責" },
];
const quickFilter = ref("all");

function createEmptyForm() {
  return {
    taskNo: getNextTaskNo(),
    taskName: "",
    taskType: "execution",
    status: "not_started",
    priority: "medium",
    projectId: "",
    activityId: "",
    milestoneId: "",
    parentTaskId: "",
    ownerId: "u-001",
    collaboratorIds: [],
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    progress: 0,
    estimatedHours: 0,
    actualHours: 0,
    description: "",
    acceptanceCriteria: "",
    tagsInput: "",
    attachmentsInput: "",
    notes: "",
    templateId: "",
    autoSubtasksInput: "",
  };
}

const form = reactive(createEmptyForm());
const commentDraft = ref("");
const subtaskForm = reactive({
  title: "",
  ownerId: "u-001",
  dueDate: new Date().toISOString().slice(0, 10),
});

const statusOptions = [
  { label: "全部狀態", value: "all" },
  ...Object.entries(taskStatusMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const taskTypeOptions = [
  { label: "全部類型", value: "all" },
  ...Object.entries(taskTypeMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const priorityOptions = [
  { label: "全部優先級", value: "all" },
  ...Object.entries(taskPriorityMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const ownerOptions = [
  { label: "全部負責人", value: "all" },
  ...userList
    .filter((item) => item.status === "active")
    .map((item) => ({ label: item.name, value: item.id })),
];

const collaboratorOptions = [
  { label: "全部協作人", value: "all" },
  ...ownerOptions.filter((item) => item.value !== "all"),
];

const yesNoOptions = [
  { label: "全部", value: "all" },
  { label: "是", value: "yes" },
  { label: "否", value: "no" },
];

const taskDetail = computed(() => getTaskById(detailTaskId.value));

const kpiCards = computed(() => {
  const total = tasks.value.length;
  const pending = tasks.value.filter((item) => item.status === "not_started").length;
  const inProgress = tasks.value.filter((item) => item.status === "in_progress").length;
  const todayDue = tasks.value.filter((item) => isToday(item.dueDate)).length;
  const delayed = tasks.value.filter((item) => isTaskDelayed(item)).length;
  const thisWeekDone = tasks.value.filter(
    (item) =>
      item.status === "completed" && isThisWeek(item.completedDate || item.updatedAt)
  ).length;

  return [
    { label: "任務總數", value: total },
    { label: "待處理任務數", value: pending },
    { label: "進行中任務數", value: inProgress },
    { label: "今日到期任務數", value: todayDue },
    { label: "已延遲任務數", value: delayed },
    { label: "本週完成任務數", value: thisWeekDone },
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

function notify(message, title = "已更新", type = "success") {
  ElNotification({
    title,
    message,
    type,
    position: "top-right",
  });
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

function isToday(value) {
  const date = parseDate(value);

  if (!date) {
    return false;
  }

  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isThisWeek(value) {
  const date = parseDate(value);

  if (!date) {
    return false;
  }

  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return date.getTime() >= monday.getTime() && date.getTime() <= sunday.getTime();
}

function isTaskDelayed(task) {
  if (task.status === "delayed") {
    return true;
  }

  if (!task.dueDate || ["completed", "cancelled"].includes(task.status)) {
    return false;
  }

  return toTimestamp(task.dueDate) < Date.now();
}

function toPlainArray(input) {
  return String(input || "")
    .split(/[、,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const filteredTasks = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return tasks.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.taskName.toLowerCase().includes(keyword) ||
      item.taskNo.toLowerCase().includes(keyword) ||
      item.projectName.toLowerCase().includes(keyword) ||
      item.activityName.toLowerCase().includes(keyword);

    const matchesStatus = filters.status === "all" || item.status === filters.status;
    const matchesType = filters.taskType === "all" || item.taskType === filters.taskType;
    const matchesPriority =
      filters.priority === "all" || item.priority === filters.priority;
    const matchesOwner = filters.ownerId === "all" || item.ownerId === filters.ownerId;
    const matchesCollaborator =
      filters.collaboratorId === "all" ||
      item.collaboratorIds.includes(filters.collaboratorId);
    const matchesProject =
      filters.projectId === "all" || item.projectId === filters.projectId;
    const matchesActivity =
      filters.activityId === "all" || item.activityId === filters.activityId;
    const matchesMilestone =
      filters.milestoneId === "all" || item.milestoneId === filters.milestoneId;
    const matchesDueRange = isDateWithinRange(item.dueDate, filters.dueDateRange);
    const delayed = isTaskDelayed(item);
    const matchesDelayed =
      filters.isDelayed === "all" || (filters.isDelayed === "yes" ? delayed : !delayed);
    const matchesMine =
      filters.isMine === "all" ||
      (filters.isMine === "yes" ? item.ownerId === "u-001" : item.ownerId !== "u-001");
    const hasSubtasks = item.subtaskCount > 0;
    const matchesSubtasks =
      filters.hasSubtasks === "all" ||
      (filters.hasSubtasks === "yes" ? hasSubtasks : !hasSubtasks);
    const hasUnread = Number(item.unreadCommentCount ?? 0) > 0;
    const matchesUnread =
      filters.hasUnreadComments === "all" ||
      (filters.hasUnreadComments === "yes" ? hasUnread : !hasUnread);

    const quickMatched =
      quickFilter.value === "all" ||
      (quickFilter.value === "today_due" && isToday(item.dueDate)) ||
      (quickFilter.value === "delayed" && delayed) ||
      (quickFilter.value === "high_priority" &&
        ["high", "urgent"].includes(item.priority)) ||
      (quickFilter.value === "mine" && item.ownerId === "u-001");

    return (
      matchesKeyword &&
      matchesStatus &&
      matchesType &&
      matchesPriority &&
      matchesOwner &&
      matchesCollaborator &&
      matchesProject &&
      matchesActivity &&
      matchesMilestone &&
      matchesDueRange &&
      matchesDelayed &&
      matchesMine &&
      matchesSubtasks &&
      matchesUnread &&
      quickMatched
    );
  });
});

const sortedTasks = computed(() => {
  const records = [...filteredTasks.value];
  const direction = sortState.order === "ascending" ? 1 : -1;

  return records.sort((left, right) => {
    if (!sortState.prop) {
      return toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt);
    }

    if (
      ["dueDate", "updatedAt", "latestCommentAt", "startDate"].includes(sortState.prop)
    ) {
      return (
        (toTimestamp(left[sortState.prop]) - toTimestamp(right[sortState.prop])) *
        direction
      );
    }

    if (
      ["progress", "subtaskCompleted", "subtaskCount", "unreadCommentCount"].includes(
        sortState.prop
      )
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

const pagedTasks = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedTasks.value.slice(start, start + pageSize.value);
});

const boardColumns = computed(() => {
  const groups = ["not_started", "in_progress", "pending_review", "completed", "delayed"];
  return groups.map((status) => ({
    status,
    label: taskStatusMap[status].label,
    tasks: sortedTasks.value.filter((item) => item.status === status),
  }));
});

const myTodoSections = computed(() => {
  const myTasks = sortedTasks.value.filter(
    (item) => item.ownerId === "u-001" || item.collaboratorIds.includes("u-001")
  );
  return [
    {
      key: "today",
      label: "今天要處理",
      tasks: myTasks.filter(
        (item) =>
          isToday(item.dueDate) && !["completed", "cancelled"].includes(item.status)
      ),
    },
    {
      key: "upcoming",
      label: "即將到期",
      tasks: myTasks.filter(
        (item) =>
          !isToday(item.dueDate) &&
          toTimestamp(item.dueDate) >= Date.now() &&
          toTimestamp(item.dueDate) <= Date.now() + 3 * 24 * 60 * 60 * 1000 &&
          !["completed", "cancelled"].includes(item.status)
      ),
    },
    {
      key: "in_progress",
      label: "進行中",
      tasks: myTasks.filter((item) => item.status === "in_progress"),
    },
    {
      key: "pending_review",
      label: "等待確認",
      tasks: myTasks.filter((item) => item.status === "pending_review"),
    },
    {
      key: "delayed",
      label: "已延遲",
      tasks: myTasks.filter((item) => isTaskDelayed(item)),
    },
  ];
});

function getMonthGrid(anchorDate) {
  const anchor = parseDate(anchorDate) || new Date();
  const firstDay = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(firstDay);
  const weekDay = start.getDay();
  start.setDate(firstDay.getDate() - (weekDay === 0 ? 6 : weekDay - 1));
  const days = [];

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateValue = date.toISOString().slice(0, 10);
    days.push({
      dateValue,
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === anchor.getMonth(),
      isToday: isToday(dateValue),
      tasks: sortedTasks.value.filter((item) => item.dueDate === dateValue),
    });
  }

  return days;
}

function getWeekGrid(anchorDate) {
  const anchor = parseDate(anchorDate) || new Date();
  const weekDay = anchor.getDay();
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - (weekDay === 0 ? 6 : weekDay - 1));
  const days = [];

  for (let index = 0; index < 7; index += 1) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dateValue = date.toISOString().slice(0, 10);
    days.push({
      dateValue,
      day: date.getDate(),
      weekday: ["一", "二", "三", "四", "五", "六", "日"][index],
      isToday: isToday(dateValue),
      tasks: sortedTasks.value.filter((item) => item.dueDate === dateValue),
    });
  }

  return days;
}

const calendarDays = computed(() =>
  calendarMode.value === "month"
    ? getMonthGrid(calendarAnchorDate.value)
    : getWeekGrid(calendarAnchorDate.value)
);

const milestoneImpactForDetail = computed(() => {
  if (!taskDetail.value?.milestoneId) {
    return null;
  }

  return (
    milestoneTaskSummary.value.find(
      (item) => item.milestoneId === taskDetail.value.milestoneId
    ) || null
  );
});

const emptyState = computed(() => {
  if (tasks.value.length === 0) {
    return {
      title: "目前尚無任務資料",
      description: "可先建立第一筆任務，開始管理專案與活動執行。",
      actionLabel: "新增任務",
      action: openCreateDrawer,
    };
  }

  return {
    title: "沒有符合條件的任務",
    description: "請調整搜尋條件或清除篩選。",
    actionLabel: "清除篩選",
    action: resetFilters,
  };
});

function resetFilters() {
  filters.keyword = "";
  filters.status = "all";
  filters.taskType = "all";
  filters.priority = "all";
  filters.ownerId = "all";
  filters.collaboratorId = "all";
  filters.projectId = "all";
  filters.activityId = "all";
  filters.milestoneId = "all";
  filters.dueDateRange = [];
  filters.isDelayed = "all";
  filters.isMine = "all";
  filters.hasSubtasks = "all";
  filters.hasUnreadComments = "all";
  quickFilter.value = "all";
}

function handleSortChange({ prop, order }) {
  sortState.prop = prop || "updatedAt";
  sortState.order = order || "descending";
}

function handleSelectionChange(rows) {
  selectedRows.value = rows;
}

function openDetail(task) {
  detailTaskId.value = task.id;
  detailDrawerOpen.value = true;
}

function openCreateDrawer(prefill = {}) {
  formMode.value = "create";
  editingTaskId.value = "";
  hydratingForm.value = true;
  Object.assign(form, {
    ...createEmptyForm(),
    ...prefill,
  });
  hydratingForm.value = false;
  formDrawerOpen.value = true;
}

function openEditDrawer(task) {
  const target = getTaskById(task.id);

  if (!target) {
    return;
  }

  formMode.value = "edit";
  editingTaskId.value = target.id;
  hydratingForm.value = true;
  Object.assign(form, {
    ...createEmptyForm(),
    ...target,
    tagsInput: (target.tags ?? []).join("、"),
    attachmentsInput: (target.attachments ?? []).join("、"),
    templateId: target.templateId || "",
  });
  hydratingForm.value = false;
  formDrawerOpen.value = true;
}

function submitTaskForm() {
  if (!form.taskName.trim()) {
    notify("請輸入任務名稱", "缺少資訊", "warning");
    return;
  }

  if (!form.ownerId) {
    notify("請選擇負責人", "缺少資訊", "warning");
    return;
  }

  if (toTimestamp(form.dueDate) < toTimestamp(form.startDate)) {
    notify("截止日期不可早於開始日期", "日期不正確", "warning");
    return;
  }

  const payload = {
    taskNo: form.taskNo,
    taskName: form.taskName.trim(),
    taskType: form.taskType,
    status: form.status,
    priority: form.priority,
    projectId: form.projectId,
    activityId: form.activityId,
    milestoneId: form.milestoneId,
    parentTaskId: form.parentTaskId,
    ownerId: form.ownerId,
    collaboratorIds: [...form.collaboratorIds],
    startDate: form.startDate,
    dueDate: form.dueDate,
    progress: Number(form.progress ?? 0),
    estimatedHours: Number(form.estimatedHours ?? 0),
    actualHours: Number(form.actualHours ?? 0),
    description: form.description.trim(),
    acceptanceCriteria: form.acceptanceCriteria.trim(),
    tags: toPlainArray(form.tagsInput),
    attachments: toPlainArray(form.attachmentsInput),
    notes: form.notes.trim(),
    templateId: form.templateId || "",
    templateName:
      templates.value.find((item) => item.id === form.templateId)?.templateName || "",
    reminderRuleSummary: reminderRules.value
      .filter((item) => item.enabled)
      .map((item) => item.name)
      .join("、"),
  };

  if (formMode.value === "edit") {
    const updated = updateTask(editingTaskId.value, payload);

    if (!updated) {
      return;
    }

    notify(`${updated.taskName} 已更新`);
  } else {
    const created = createTask(payload);
    if (form.autoSubtasksInput.trim()) {
      const subtasks = toPlainArray(form.autoSubtasksInput);
      subtasks.forEach((title) => {
        addSubtask(created.id, {
          title,
          ownerId: created.ownerId,
          dueDate: created.dueDate,
        });
      });
    }
    notify(`${created.taskName} 已建立`);
  }

  formDrawerOpen.value = false;
}

function applyTemplateFromDrawer(template) {
  const resolvedProjectId =
    form.projectId || (filters.projectId === "all" ? "" : filters.projectId);
  const resolvedActivityId =
    form.activityId || (filters.activityId === "all" ? "" : filters.activityId);

  const created = applyTaskTemplate(template.id, {
    projectId: resolvedProjectId,
    activityId: resolvedActivityId,
    ownerId: form.ownerId || "u-001",
    dueDate: form.dueDate || new Date().toISOString().slice(0, 10),
    startDate: form.startDate || new Date().toISOString().slice(0, 10),
  });

  if (created.length > 0) {
    notify(`已套用模板「${template.templateName}」，建立 ${created.length} 筆任務`);
  }

  templateDrawerOpen.value = false;
}

function batchSetStatus(status) {
  if (selectedRows.value.length === 0) {
    notify("請先勾選任務", "尚未選擇資料", "warning");
    return;
  }

  selectedRows.value.forEach((task) => {
    setTaskStatus(task.id, status, { reason: "批次更新狀態" });
  });
  notify(`已批次更新 ${selectedRows.value.length} 筆任務狀態`);
}

function submitComment() {
  if (!taskDetail.value) {
    return;
  }

  const mention = commentDraft.value.includes("@");
  const updated = addTaskComment(taskDetail.value.id, commentDraft.value, {
    hasMention: mention,
    authorId: "u-001",
  });

  if (updated) {
    commentDraft.value = "";
    notify("已新增留言");
  }
}

function submitSubtask() {
  if (!taskDetail.value) {
    return;
  }

  const updated = addSubtask(taskDetail.value.id, {
    title: subtaskForm.title,
    ownerId: subtaskForm.ownerId,
    dueDate: subtaskForm.dueDate,
  });

  if (updated) {
    subtaskForm.title = "";
    notify("已新增子任務");
  }
}

function toggleDetailSubtask(subtaskId) {
  if (!taskDetail.value) {
    return;
  }

  toggleSubtaskStatus(taskDetail.value.id, subtaskId);
}

function onCalendarDateClick(day) {
  openCreateDrawer({
    dueDate: day.dateValue,
    startDate: day.dateValue,
    ownerId: "u-001",
  });
}

function exportTasks() {
  notify("已加入匯出佇列，完成後將提供下載連結", "匯出中");
}

async function refreshData() {
  loading.value = true;
  await new Promise((resolve) => setTimeout(resolve, 300));
  loading.value = false;
  notify("任務資料已同步最新狀態");
}

function updateRule(rule) {
  updateReminderRule(rule.id, { enabled: rule.enabled });
}

watch(
  () => route.query,
  (query) => {
    applyRouteFilterQuery(query);
  }
);

watch(
  () => [
    filters.keyword,
    filters.status,
    filters.taskType,
    filters.priority,
    filters.ownerId,
    filters.collaboratorId,
    filters.projectId,
    filters.activityId,
    filters.milestoneId,
    filters.dueDateRange,
    filters.isDelayed,
    filters.isMine,
    filters.hasSubtasks,
    filters.hasUnreadComments,
    quickFilter.value,
    currentView.value,
    pageSize.value,
  ],
  () => {
    currentPage.value = 1;
  },
  { deep: true }
);

watch(
  () => [sortedTasks.value.length, pageSize.value],
  () => {
    const maxPage = Math.max(1, Math.ceil(sortedTasks.value.length / pageSize.value));
    if (currentPage.value > maxPage) {
      currentPage.value = maxPage;
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="min-h-full p-8">
    <section class="grid gap-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-1">
          <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">
            任務追蹤
          </h1>
          <p class="text-sm text-slate-500">
            集中管理專案與活動中的任務、進度、截止時間、討論與執行狀態
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton type="primary" :icon="CirclePlus" @click="openCreateDrawer"
            >新增任務</ElButton
          >
          <ElButton @click="templateDrawerOpen = true">套用模板建立</ElButton>
          <ElButton :icon="Download" @click="exportTasks">匯出</ElButton>
          <ElButton @click="batchSetStatus('in_progress')">批次更新狀態</ElButton>
          <ElButton :icon="Setting" @click="slaDrawerOpen = true"
            >SLA / 提醒規則</ElButton
          >
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
              placeholder="搜尋任務名稱 / 任務編號 / 專案 / 活動"
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
            <ElTag
              v-for="view in taskViewModeOptions"
              :key="view.value"
              round
              class="cursor-pointer"
              :effect="currentView === view.value ? 'dark' : 'plain'"
              :type="currentView === view.value ? 'primary' : 'info'"
              @click="currentView = view.value"
            >
              {{ view.label }}
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
            <ElSelect v-model="filters.status">
              <ElOption
                v-for="item in statusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
            <ElSelect v-model="filters.taskType">
              <ElOption
                v-for="item in taskTypeOptions"
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
            <ElSelect v-model="filters.collaboratorId">
              <ElOption
                v-for="item in collaboratorOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
            <ElSelect v-model="filters.projectId">
              <ElOption label="全部專案" value="all" />
              <ElOption
                v-for="item in projectOptions"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </ElSelect>
            <ElSelect v-model="filters.activityId">
              <ElOption label="全部活動" value="all" />
              <ElOption
                v-for="item in activityOptions"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </ElSelect>
            <ElSelect v-model="filters.milestoneId">
              <ElOption label="全部里程碑" value="all" />
              <ElOption
                v-for="item in milestoneDirectory"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </ElSelect>
            <ElDatePicker
              v-model="filters.dueDateRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              start-placeholder="截止(起)"
              end-placeholder="截止(迄)"
            />
            <ElSelect v-model="filters.isDelayed">
              <ElOption
                v-for="item in yesNoOptions"
                :key="item.value"
                :label="`是否延遲：${item.label}`"
                :value="item.value"
              />
            </ElSelect>
            <ElSelect v-model="filters.isMine">
              <ElOption
                v-for="item in yesNoOptions"
                :key="item.value"
                :label="`是否我負責：${item.label}`"
                :value="item.value"
              />
            </ElSelect>
            <ElSelect v-model="filters.hasSubtasks">
              <ElOption
                v-for="item in yesNoOptions"
                :key="item.value"
                :label="`是否含子任務：${item.label}`"
                :value="item.value"
              />
            </ElSelect>
            <ElSelect v-model="filters.hasUnreadComments">
              <ElOption
                v-for="item in yesNoOptions"
                :key="item.value"
                :label="`是否有未讀留言：${item.label}`"
                :value="item.value"
              />
            </ElSelect>
          </div>
        </transition>

        <div class="border-y border-slate-200 px-6 pt-3">
          <ElTabs v-model="quickFilter">
            <ElTabPane
              v-for="item in quickFilterOptions"
              :key="item.value"
              :name="item.value"
              :label="item.label"
            />
          </ElTabs>
        </div>

        <div v-if="currentView === 'list'" class="grid gap-0">
          <ElTable
            :data="pagedTasks"
            size="large"
            table-layout="auto"
            :loading="loading"
            @sort-change="handleSortChange"
            @selection-change="handleSelectionChange"
          >
            <ElTableColumn type="selection" width="52" />
            <ElTableColumn label="任務" min-width="230">
              <template #default="{ row }">
                <div class="grid gap-0.5">
                  <button
                    type="button"
                    class="text-left text-sm font-semibold text-slate-900 hover:text-[#409eff]"
                    @click="openDetail(row)"
                  >
                    {{ row.taskName }}
                  </button>
                  <span class="text-xs text-slate-400">{{ row.taskNo }}</span>
                  <div class="flex flex-wrap gap-1">
                    <ElTag v-if="row.subtaskCount > 0" round effect="plain" size="small">
                      子任務 {{ row.subtaskCompleted }}/{{ row.subtaskCount }}
                    </ElTag>
                    <ElTag v-if="row.commentCount > 0" round effect="plain" size="small">
                      留言 {{ row.commentCount }}
                    </ElTag>
                    <ElTag
                      v-if="row.attachmentCount > 0"
                      round
                      effect="plain"
                      size="small"
                    >
                      附件 {{ row.attachmentCount }}
                    </ElTag>
                  </div>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="關聯專案 / 活動" min-width="220">
              <template #default="{ row }">
                <div class="grid gap-0.5">
                  <span class="text-sm text-slate-700">{{ row.projectName || "-" }}</span>
                  <span class="text-xs text-slate-400">{{
                    row.activityName || "-"
                  }}</span>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="負責人" min-width="112">
              <template #default="{ row }">{{ row.ownerName || "-" }}</template>
            </ElTableColumn>

            <ElTableColumn label="任務狀態" min-width="110">
              <template #default="{ row }">
                <ElTag round :type="taskStatusMap[row.status]?.type" effect="light">
                  {{ taskStatusMap[row.status]?.label || row.status }}
                </ElTag>
              </template>
            </ElTableColumn>

            <ElTableColumn label="優先級" min-width="90">
              <template #default="{ row }">
                <ElTag round :type="taskPriorityMap[row.priority]?.type" effect="light">
                  {{ taskPriorityMap[row.priority]?.label || row.priority }}
                </ElTag>
              </template>
            </ElTableColumn>

            <ElTableColumn label="進度" min-width="160" prop="progress" sortable="custom">
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

            <ElTableColumn label="子任務進度" min-width="100">
              <template #default="{ row }"
                >{{ row.subtaskCompleted }} / {{ row.subtaskCount }}</template
              >
            </ElTableColumn>

            <ElTableColumn
              label="截止日期"
              min-width="114"
              prop="dueDate"
              sortable="custom"
            >
              <template #default="{ row }">
                <span
                  :class="
                    isTaskDelayed(row)
                      ? 'text-rose-600'
                      : isToday(row.dueDate)
                      ? 'text-amber-600'
                      : ''
                  "
                >
                  {{ formatDate(row.dueDate) }}
                </span>
              </template>
            </ElTableColumn>

            <ElTableColumn label="SLA 狀態" min-width="120">
              <template #default="{ row }">
                <ElTag round :type="slaStatusMap[row.slaStatus]?.type" effect="light">
                  {{ slaStatusMap[row.slaStatus]?.label || row.slaStatus }}
                </ElTag>
              </template>
            </ElTableColumn>

            <ElTableColumn
              label="最新留言"
              min-width="220"
              prop="latestCommentAt"
              sortable="custom"
            >
              <template #default="{ row }">
                <div class="grid gap-0.5">
                  <span class="text-sm text-slate-700">{{
                    row.comments[0]?.content || "-"
                  }}</span>
                  <span class="text-xs text-slate-400">{{
                    formatDateTime(row.latestCommentAt)
                  }}</span>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn
              label="最近更新時間"
              min-width="130"
              prop="updatedAt"
              sortable="custom"
            >
              <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
            </ElTableColumn>

            <ElTableColumn label="操作" fixed="right" width="180">
              <template #default="{ row }">
                <div class="flex items-center justify-end gap-1">
                  <ElButton text type="primary" @click="openDetail(row)">查看</ElButton>
                  <ElButton text @click="openEditDrawer(row)">編輯</ElButton>
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
              :total="sortedTasks.length"
              background
            />
            <ElSelect v-model="pageSize" class="!w-[110px]" @change="currentPage = 1">
              <ElOption :value="10" label="10 Item" />
              <ElOption :value="20" label="20 Item" />
              <ElOption :value="50" label="50 Item" />
            </ElSelect>
          </div>
        </div>

        <div
          v-else-if="currentView === 'board'"
          class="grid gap-4 overflow-x-auto px-6 py-6"
        >
          <div class="grid min-w-[1040px] grid-cols-5 gap-4">
            <section
              v-for="column in boardColumns"
              :key="column.status"
              class="rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
            >
              <header class="mb-3 flex items-center justify-between">
                <ElTag round :type="taskStatusMap[column.status]?.type">
                  {{ column.label }}
                </ElTag>
                <span class="text-xs text-slate-500">{{ column.tasks.length }}</span>
              </header>

              <div class="grid gap-2">
                <article
                  v-for="task in column.tasks"
                  :key="task.id"
                  class="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:border-slate-300"
                  @click="openDetail(task)"
                >
                  <p class="text-sm font-semibold text-slate-900">{{ task.taskName }}</p>
                  <p class="mt-1 text-xs text-slate-500">{{ task.projectName || "-" }}</p>
                  <div class="mt-2 flex flex-wrap gap-1">
                    <ElTag round effect="plain" size="small">
                      {{ task.ownerName || "-" }}
                    </ElTag>
                    <ElTag
                      round
                      effect="plain"
                      size="small"
                      :type="taskPriorityMap[task.priority]?.type"
                    >
                      {{ taskPriorityMap[task.priority]?.label || task.priority }}
                    </ElTag>
                  </div>
                  <p class="mt-2 text-xs text-slate-500">
                    截止：{{ formatDate(task.dueDate) }}
                  </p>
                  <div
                    class="mt-1 flex items-center justify-between text-xs text-slate-500"
                  >
                    <span
                      >子任務 {{ task.subtaskCompleted }}/{{ task.subtaskCount }}</span
                    >
                    <span>留言 {{ task.commentCount }}</span>
                  </div>
                  <ElProgress
                    class="mt-2"
                    :percentage="task.progress"
                    :show-text="false"
                    :stroke-width="6"
                  />
                </article>
              </div>
            </section>
          </div>
        </div>

        <div v-else-if="currentView === 'mine'" class="grid gap-4 px-6 py-6">
          <section
            v-for="section in myTodoSections"
            :key="section.key"
            class="rounded-2xl border border-slate-200 bg-white"
          >
            <header
              class="flex items-center justify-between border-b border-slate-200 px-4 py-3"
            >
              <h3 class="text-sm font-semibold text-slate-800">{{ section.label }}</h3>
              <ElTag round effect="plain">{{ section.tasks.length }}</ElTag>
            </header>

            <div v-if="section.tasks.length > 0" class="grid gap-2 px-4 py-4">
              <article
                v-for="task in section.tasks"
                :key="task.id"
                class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
              >
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div class="grid gap-0.5">
                    <button
                      type="button"
                      class="text-left text-sm font-semibold text-slate-900 hover:text-[#409eff]"
                      @click="openDetail(task)"
                    >
                      {{ task.taskName }}
                    </button>
                    <span class="text-xs text-slate-500">{{
                      task.projectName || "-"
                    }}</span>
                  </div>
                  <div class="flex gap-1">
                    <ElTag
                      round
                      effect="plain"
                      :type="taskPriorityMap[task.priority]?.type"
                    >
                      {{ taskPriorityMap[task.priority]?.label }}
                    </ElTag>
                    <ElTag
                      round
                      effect="plain"
                      :type="slaStatusMap[task.slaStatus]?.type"
                    >
                      {{ slaStatusMap[task.slaStatus]?.label }}
                    </ElTag>
                  </div>
                </div>
                <div class="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>截止：{{ formatDate(task.dueDate) }}</span>
                  <span>子任務 {{ task.subtaskCompleted }}/{{ task.subtaskCount }}</span>
                  <span v-if="task.unreadCommentCount > 0"
                    >未讀留言 {{ task.unreadCommentCount }}</span
                  >
                </div>
              </article>
            </div>

            <div v-else class="px-4 py-8">
              <ElEmpty description="目前此區塊無任務" />
            </div>
          </section>
        </div>

        <div v-else class="grid gap-4 px-6 py-6">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <ElTag round effect="plain">日曆視圖</ElTag>
              <ElTag
                round
                :effect="calendarMode === 'month' ? 'dark' : 'plain'"
                :type="calendarMode === 'month' ? 'primary' : 'info'"
                class="cursor-pointer"
                @click="calendarMode = 'month'"
                >月</ElTag
              >
              <ElTag
                round
                :effect="calendarMode === 'week' ? 'dark' : 'plain'"
                :type="calendarMode === 'week' ? 'primary' : 'info'"
                class="cursor-pointer"
                @click="calendarMode = 'week'"
                >週</ElTag
              >
            </div>
            <ElDatePicker
              v-model="calendarAnchorDate"
              type="date"
              value-format="YYYY-MM-DD"
              :prefix-icon="Calendar"
              class="!w-[180px]"
            />
          </div>

          <div
            :class="
              calendarMode === 'month'
                ? 'grid grid-cols-7 gap-2'
                : 'grid grid-cols-7 gap-2'
            "
          >
            <article
              v-for="day in calendarDays"
              :key="day.dateValue"
              class="min-h-[118px] rounded-xl border border-slate-200 bg-white p-2"
              :class="day.isToday ? '!border-[#409eff]' : ''"
            >
              <div class="mb-2 flex items-center justify-between">
                <span
                  class="text-xs font-semibold"
                  :class="
                    day.isCurrentMonth === false
                      ? 'text-slate-300'
                      : day.isToday
                      ? 'text-[#409eff]'
                      : 'text-slate-700'
                  "
                >
                  {{ day.day }}
                  <template v-if="day.weekday">（{{ day.weekday }}）</template>
                </span>
                <button
                  type="button"
                  class="grid h-5 w-5 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  @click="onCalendarDateClick(day)"
                >
                  <Plus class="h-3 w-3" />
                </button>
              </div>
              <div class="grid gap-1">
                <button
                  v-for="task in day.tasks.slice(0, calendarMode === 'month' ? 2 : 4)"
                  :key="task.id"
                  type="button"
                  class="truncate rounded-md px-2 py-1 text-left text-[11px]"
                  :class="
                    task.status === 'delayed'
                      ? 'bg-rose-50 text-rose-700'
                      : task.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-700'
                  "
                  @click="openDetail(task)"
                >
                  {{ task.taskName }}
                </button>
                <span v-if="day.tasks.length === 0" class="text-[11px] text-slate-300"
                  >無任務</span
                >
              </div>
            </article>
          </div>
        </div>
      </section>
    </section>

    <ElDrawer
      v-model="formDrawerOpen"
      :title="formMode === 'edit' ? '編輯任務' : '新增任務'"
      size="680px"
      destroy-on-close
    >
      <div class="grid gap-5 pb-4">
        <section
          class="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
        >
          <h3 class="text-sm font-semibold text-slate-800">基本資訊</h3>
          <ElForm label-width="108px" class="grid gap-3 md:grid-cols-2">
            <ElFormItem label="任務名稱" required class="md:col-span-2">
              <ElInput v-model="form.taskName" />
            </ElFormItem>
            <ElFormItem label="任務編號">
              <ElInput v-model="form.taskNo" />
            </ElFormItem>
            <ElFormItem label="任務類型">
              <ElSelect v-model="form.taskType">
                <ElOption
                  v-for="item in taskTypeOptions.filter(
                    (option) => option.value !== 'all'
                  )"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="狀態">
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

        <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-800">關聯與人員</h3>
          <ElForm label-width="108px" class="grid gap-3 md:grid-cols-2">
            <ElFormItem label="關聯專案">
              <ElSelect v-model="form.projectId" filterable>
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
                <ElOption
                  v-for="item in activityOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="關聯里程碑">
              <ElSelect v-model="form.milestoneId" filterable>
                <ElOption
                  v-for="item in milestoneDirectory"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="父任務">
              <ElSelect v-model="form.parentTaskId" filterable>
                <ElOption label="無" value="" />
                <ElOption
                  v-for="item in tasks"
                  :key="item.id"
                  :label="item.taskName"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="負責人" required>
              <ElSelect v-model="form.ownerId">
                <ElOption
                  v-for="item in ownerOptions.filter((option) => option.value !== 'all')"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="協作人">
              <ElSelect v-model="form.collaboratorIds" multiple collapse-tags>
                <ElOption
                  v-for="item in collaboratorOptions.filter(
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
          <h3 class="text-sm font-semibold text-slate-800">時程與執行</h3>
          <ElForm label-width="108px" class="grid gap-3 md:grid-cols-2">
            <ElFormItem label="開始日期">
              <ElDatePicker
                v-model="form.startDate"
                value-format="YYYY-MM-DD"
                class="!w-full"
              />
            </ElFormItem>
            <ElFormItem label="截止日期">
              <ElDatePicker
                v-model="form.dueDate"
                value-format="YYYY-MM-DD"
                class="!w-full"
              />
            </ElFormItem>
            <ElFormItem label="進度">
              <ElInputNumber
                v-model="form.progress"
                :min="0"
                :max="100"
                class="!w-full"
              />
            </ElFormItem>
            <ElFormItem label="預估工時">
              <ElInputNumber v-model="form.estimatedHours" :min="0" class="!w-full" />
            </ElFormItem>
            <ElFormItem label="實際工時">
              <ElInputNumber v-model="form.actualHours" :min="0" class="!w-full" />
            </ElFormItem>
            <ElFormItem label="模板來源">
              <ElSelect v-model="form.templateId">
                <ElOption label="無" value="" />
                <ElOption
                  v-for="item in templates"
                  :key="item.id"
                  :label="item.templateName"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="自動子任務" class="md:col-span-2">
              <ElInput
                v-model="form.autoSubtasksInput"
                placeholder="建立任務時可一次加入子任務，使用 、 或 , 分隔"
              />
            </ElFormItem>
          </ElForm>
        </section>

        <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-800">描述與補充</h3>
          <ElForm label-width="108px" class="grid gap-3">
            <ElFormItem label="任務描述">
              <ElInput v-model="form.description" type="textarea" :rows="3" />
            </ElFormItem>
            <ElFormItem label="驗收標準">
              <ElInput v-model="form.acceptanceCriteria" type="textarea" :rows="2" />
            </ElFormItem>
            <ElFormItem label="標籤">
              <ElInput v-model="form.tagsInput" placeholder="以 、 或 , 分隔" />
            </ElFormItem>
            <ElFormItem label="附件">
              <ElInput v-model="form.attachmentsInput" placeholder="以 、 或 , 分隔" />
            </ElFormItem>
            <ElFormItem label="備註">
              <ElInput v-model="form.notes" type="textarea" :rows="2" />
            </ElFormItem>
          </ElForm>
        </section>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="formDrawerOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitTaskForm">
            {{ formMode === "edit" ? "儲存變更" : "建立任務" }}
          </ElButton>
        </div>
      </template>
    </ElDrawer>

    <ElDrawer v-model="detailDrawerOpen" title="任務詳情" size="760px" destroy-on-close>
      <div v-if="taskDetail" class="grid gap-5 pb-4">
        <section class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="grid gap-1">
              <h3 class="text-lg font-semibold text-slate-900">
                {{ taskDetail.taskName }}
              </h3>
              <p class="text-xs text-slate-500">
                {{ taskDetail.taskNo }} ・ {{ taskDetail.projectName || "-" }}
              </p>
            </div>
            <div class="flex flex-wrap gap-1">
              <ElTag round :type="taskStatusMap[taskDetail.status]?.type">{{
                taskStatusMap[taskDetail.status]?.label
              }}</ElTag>
              <ElTag
                round
                :type="taskPriorityMap[taskDetail.priority]?.type"
                effect="light"
                >{{ taskPriorityMap[taskDetail.priority]?.label }}</ElTag
              >
              <ElTag
                round
                :type="slaStatusMap[taskDetail.slaStatus]?.type"
                effect="light"
                >{{ slaStatusMap[taskDetail.slaStatus]?.label }}</ElTag
              >
            </div>
          </div>
          <div class="mt-3 grid gap-2 md:grid-cols-3">
            <div class="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p class="text-xs text-slate-500">負責人</p>
              <p class="text-sm font-medium text-slate-800">
                {{ taskDetail.ownerName || "-" }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p class="text-xs text-slate-500">截止日期</p>
              <p class="text-sm font-medium text-slate-800">
                {{ formatDate(taskDetail.dueDate) }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p class="text-xs text-slate-500">進度</p>
              <p class="text-sm font-medium text-slate-800">{{ taskDetail.progress }}%</p>
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 class="text-sm font-semibold text-slate-800">子任務</h4>
          <div class="mt-3 grid gap-2">
            <article
              v-for="subtask in taskDetail.subtasks"
              :key="subtask.id"
              class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2"
            >
              <div class="grid gap-0.5">
                <p class="text-sm text-slate-800">{{ subtask.title }}</p>
                <p class="text-xs text-slate-400">
                  截止：{{ formatDate(subtask.dueDate) }}
                </p>
              </div>
              <ElTag
                round
                class="cursor-pointer"
                :type="subtask.status === 'completed' ? 'success' : 'info'"
                @click="toggleDetailSubtask(subtask.id)"
              >
                {{ subtask.status === "completed" ? "已完成" : "進行中" }}
              </ElTag>
            </article>
            <ElEmpty v-if="taskDetail.subtasks.length === 0" description="目前無子任務" />
          </div>

          <ElForm label-width="84px" class="mt-4 grid gap-2 md:grid-cols-3">
            <ElFormItem label="子任務">
              <ElInput v-model="subtaskForm.title" placeholder="輸入子任務名稱" />
            </ElFormItem>
            <ElFormItem label="負責人">
              <ElSelect v-model="subtaskForm.ownerId">
                <ElOption
                  v-for="item in ownerOptions.filter((option) => option.value !== 'all')"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="截止日">
              <ElDatePicker
                v-model="subtaskForm.dueDate"
                value-format="YYYY-MM-DD"
                class="!w-full"
              />
            </ElFormItem>
          </ElForm>
          <div class="mt-2 flex justify-end">
            <ElButton @click="submitSubtask">新增子任務</ElButton>
          </div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 class="text-sm font-semibold text-slate-800">留言 / 討論</h4>
          <div class="mt-3 grid gap-2">
            <article
              v-for="comment in taskDetail.comments"
              :key="comment.id"
              class="rounded-xl border border-slate-200 px-3 py-2"
            >
              <div class="flex items-center justify-between text-xs text-slate-400">
                <span>{{
                  userList.find((user) => user.id === comment.authorId)?.name || "系統"
                }}</span>
                <span>{{ formatDateTime(comment.createdAt) }}</span>
              </div>
              <p class="mt-1 text-sm text-slate-700">{{ comment.content }}</p>
            </article>
            <ElEmpty v-if="taskDetail.comments.length === 0" description="目前無留言" />
          </div>
          <ElInput
            v-model="commentDraft"
            class="mt-3"
            type="textarea"
            :rows="3"
            placeholder="輸入留言，支援 @ 提及示意"
          />
          <div class="mt-2 flex justify-end">
            <ElButton type="primary" @click="submitComment">送出留言</ElButton>
          </div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 class="text-sm font-semibold text-slate-800">SLA / 模板 / 里程碑連動</h4>
          <div class="mt-3 grid gap-2 md:grid-cols-2">
            <div class="rounded-xl border border-slate-200 px-3 py-2">
              <p class="text-xs text-slate-500">SLA 狀態</p>
              <ElTag class="mt-1" round :type="slaStatusMap[taskDetail.slaStatus]?.type">
                {{ slaStatusMap[taskDetail.slaStatus]?.label }}
              </ElTag>
              <p class="mt-1 text-xs text-slate-400">
                {{ taskDetail.reminderRuleSummary || "未設定提醒規則" }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 px-3 py-2">
              <p class="text-xs text-slate-500">模板來源</p>
              <p class="mt-1 text-sm text-slate-700">
                {{ taskDetail.templateName || "非模板任務" }}
              </p>
            </div>
          </div>

          <div class="mt-3 rounded-xl border border-slate-200 px-3 py-2">
            <p class="text-xs text-slate-500">里程碑影響</p>
            <template v-if="milestoneImpactForDetail">
              <p class="mt-1 text-sm text-slate-700">
                {{ milestoneImpactForDetail.milestoneName }}
              </p>
              <p class="text-xs text-slate-400">
                關聯任務 {{ milestoneImpactForDetail.taskCompleted }} /
                {{ milestoneImpactForDetail.taskTotal }}， 里程碑進度
                {{ milestoneImpactForDetail.progress }}%
              </p>
              <ElProgress
                class="mt-2"
                :percentage="milestoneImpactForDetail.progress"
                :show-text="false"
              />
            </template>
            <p v-else class="mt-1 text-sm text-slate-400">此任務未關聯里程碑</p>
          </div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 class="text-sm font-semibold text-slate-800">歷程</h4>
          <div class="mt-3 grid gap-2">
            <article
              v-for="activity in taskDetail.activities"
              :key="activity.id"
              class="rounded-xl border border-slate-200 px-3 py-2"
            >
              <div class="flex items-center justify-between text-xs text-slate-400">
                <span>{{ activity.title }}</span>
                <span>{{ formatDateTime(activity.occurredAt) }}</span>
              </div>
              <p class="mt-1 text-sm text-slate-700">{{ activity.description || "-" }}</p>
            </article>
            <ElEmpty v-if="taskDetail.activities.length === 0" description="目前無歷程" />
          </div>
        </section>
      </div>
    </ElDrawer>

    <ElDrawer v-model="templateDrawerOpen" title="任務模板" size="560px" destroy-on-close>
      <div class="grid gap-3">
        <article
          v-for="template in templates"
          :key="template.id"
          class="rounded-2xl border border-slate-200 bg-white px-4 py-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="grid gap-0.5">
              <p class="text-sm font-semibold text-slate-900">
                {{ template.templateName }}
              </p>
              <p class="text-xs text-slate-500">
                {{ template.scenario }} ・ {{ template.summary }}
              </p>
            </div>
            <ElButton
              size="small"
              type="primary"
              @click="applyTemplateFromDrawer(template)"
            >
              套用模板
            </ElButton>
          </div>
          <ul class="mt-2 list-disc pl-5 text-xs text-slate-500">
            <li v-for="item in template.tasks" :key="item.title">
              {{ item.title }}（{{ item.dueOffsetDays }} 天）
            </li>
          </ul>
        </article>
      </div>
    </ElDrawer>

    <ElDrawer
      v-model="slaDrawerOpen"
      title="SLA / 提醒規則"
      size="520px"
      destroy-on-close
    >
      <div class="grid gap-3">
        <article
          v-for="rule in reminderRules"
          :key="rule.id"
          class="rounded-2xl border border-slate-200 bg-white px-4 py-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="grid gap-0.5">
              <p class="text-sm font-semibold text-slate-900">{{ rule.name }}</p>
              <p class="text-xs text-slate-500">{{ rule.summary }}</p>
              <ElTag
                class="mt-1"
                round
                effect="plain"
                :type="slaStatusMap[rule.level]?.type"
              >
                {{ slaStatusMap[rule.level]?.label || rule.level }}
              </ElTag>
            </div>
            <ElSwitch v-model="rule.enabled" @change="updateRule(rule)" />
          </div>
        </article>
      </div>
    </ElDrawer>
  </div>
</template>

<style scoped>
:deep(.el-tabs__header) {
  margin: 0 !important;
}
</style>
