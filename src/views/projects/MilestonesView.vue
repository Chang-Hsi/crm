<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ElButton,
  ElDatePicker,
  ElDrawer,
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
  ElTabPane,
  ElTable,
  ElTableColumn,
  ElTabs,
  ElTag,
} from "element-plus";
import { CirclePlus, Download, Filter, Refresh, Search } from "@element-plus/icons-vue";
import {
  activityOptions,
  completionModeMap,
  milestoneStatusMap,
  milestoneTypeMap,
  projectOptions,
  riskLevelMap,
  userList,
} from "../../data/milestones";
import { useMilestonesStore } from "../../composables/useMilestonesStore";
import { useTasksStore } from "../../composables/useTasksStore";

const route = useRoute();
const router = useRouter();
const {
  applyMilestoneTemplate,
  completeMilestone,
  createMilestone,
  delayMilestone,
  getMilestoneById,
  getNextMilestoneNo,
  milestones,
  projectMilestoneSummary,
  templates,
  updateMilestone,
} = useMilestonesStore();
const { tasks } = useTasksStore();

const loading = ref(false);
const filterPanelOpen = ref(false);
const quickFilter = ref("all");
const currentPage = ref(1);
const pageSize = ref(10);
const sortState = reactive({
  prop: "updatedAt",
  order: "descending",
});

const formDrawerOpen = ref(false);
const formMode = ref("create");
const editingMilestoneId = ref("");

const detailDrawerOpen = ref(false);
const detailMilestoneId = ref("");

const delayDrawerOpen = ref(false);
const delayingMilestoneId = ref("");

const templateDrawerOpen = ref(false);

const filters = reactive({
  keyword: "",
  status: "all",
  milestoneType: "all",
  projectId: "all",
  activityId: "all",
  ownerId: "all",
  riskLevel: "all",
  completionMode: "all",
  isOverdue: "all",
  hasTasks: "all",
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

  filters.projectId = projectId || "all";
  filters.activityId = activityId || "all";
}

applyRouteFilterQuery(route.query);

const quickFilterOptions = [
  { value: "all", label: "全部" },
  { value: "delayed", label: "已延遲" },
  { value: "upcoming_due", label: "即將到期" },
  { value: "high_risk", label: "高風險" },
  { value: "completable", label: "可完成" },
];

function createEmptyForm() {
  return {
    milestoneNo: getNextMilestoneNo(),
    milestoneName: "",
    milestoneType: "execution",
    status: "not_started",
    order: 1,
    projectId: "",
    activityId: "",
    parentMilestoneId: "",
    ownerId: "u-001",
    participantIds: [],
    plannedStartDate: new Date().toISOString().slice(0, 10),
    plannedEndDate: new Date().toISOString().slice(0, 10),
    completionMode: "manual",
    completionCriteria: "",
    acceptanceCriteria: "",
    autoRuleSummary: "",
    linkedTaskIds: [],
    tagsInput: "",
    attachmentsInput: "",
    notes: "",
  };
}

const form = reactive(createEmptyForm());

const delayForm = reactive({
  plannedEndDate: new Date().toISOString().slice(0, 10),
  reason: "",
});

const templateForm = reactive({
  projectId: "",
  activityId: "",
  ownerId: "u-001",
  plannedStartDate: new Date().toISOString().slice(0, 10),
  baseOrder: 1,
});

const detailMilestone = computed(() => getMilestoneById(detailMilestoneId.value));

const detailLinkedTasks = computed(() => {
  if (!detailMilestone.value) {
    return [];
  }

  const ids = detailMilestone.value.linkedTaskIds ?? [];

  if (ids.length > 0) {
    return tasks.value.filter((task) => ids.includes(task.id));
  }

  return tasks.value.filter((task) => task.milestoneId === detailMilestone.value.id);
});

const availableTaskOptions = computed(() => {
  return tasks.value.map((item) => ({
    id: item.id,
    name: `${item.taskName}（${item.taskNo}）`,
  }));
});

const ownerOptions = computed(() =>
  userList
    .filter((item) => item.status === "active")
    .map((item) => ({ value: item.id, label: item.name }))
);

const kpiCards = computed(() => {
  const total = milestones.value.length;
  const notStarted = milestones.value.filter((item) => item.status === "not_started")
    .length;
  const inProgress = milestones.value.filter((item) => item.status === "in_progress")
    .length;
  const pendingAcceptance = milestones.value.filter(
    (item) => item.status === "pending_acceptance"
  ).length;
  const delayed = milestones.value.filter((item) => item.status === "delayed").length;
  const completed = milestones.value.filter((item) => item.status === "completed").length;

  return [
    { label: "里程碑總數", value: total },
    { label: "待開始", value: notStarted },
    { label: "進行中", value: inProgress },
    { label: "待驗收", value: pendingAcceptance },
    { label: "已延遲", value: delayed },
    { label: "已完成", value: completed },
  ];
});

const stageOverview = computed(() => {
  const sequence = [
    "not_started",
    "in_progress",
    "pending_acceptance",
    "completed",
    "delayed",
  ];

  return sequence.map((status) => {
    const count = milestones.value.filter((item) => item.status === status).length;

    return {
      status,
      label: milestoneStatusMap[status]?.label || status,
      count,
    };
  });
});

const projectOverview = computed(() => {
  return projectMilestoneSummary.value.filter((item) => item.total > 0).slice(0, 4);
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

function toPlainArray(input) {
  return String(input || "")
    .split(/[、,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isUpcomingDue(record) {
  if (["completed", "cancelled"].includes(record.status)) {
    return false;
  }

  const due = toTimestamp(record.plannedEndDate);

  return due > Date.now() && due <= Date.now() + 3 * 24 * 60 * 60 * 1000;
}

const filteredMilestones = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return milestones.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.milestoneName.toLowerCase().includes(keyword) ||
      item.milestoneNo.toLowerCase().includes(keyword) ||
      item.projectName.toLowerCase().includes(keyword) ||
      item.activityName.toLowerCase().includes(keyword);

    const matchesStatus = filters.status === "all" || item.status === filters.status;
    const matchesType =
      filters.milestoneType === "all" || item.milestoneType === filters.milestoneType;
    const matchesProject =
      filters.projectId === "all" || item.projectId === filters.projectId;
    const matchesActivity =
      filters.activityId === "all" || item.activityId === filters.activityId;
    const matchesOwner = filters.ownerId === "all" || item.ownerId === filters.ownerId;
    const matchesRisk =
      filters.riskLevel === "all" || item.riskLevel === filters.riskLevel;
    const matchesCompletionMode =
      filters.completionMode === "all" || item.completionMode === filters.completionMode;
    const matchesOverdue =
      filters.isOverdue === "all" ||
      (filters.isOverdue === "yes" ? item.isOverdue : !item.isOverdue);
    const matchesHasTasks =
      filters.hasTasks === "all" ||
      (filters.hasTasks === "yes"
        ? item.linkedTaskCount > 0
        : item.linkedTaskCount === 0);

    const matchesQuickFilter =
      quickFilter.value === "all" ||
      (quickFilter.value === "delayed" && item.status === "delayed") ||
      (quickFilter.value === "upcoming_due" && isUpcomingDue(item)) ||
      (quickFilter.value === "high_risk" && item.riskLevel === "high") ||
      (quickFilter.value === "completable" && item.canAutoComplete);

    return (
      matchesKeyword &&
      matchesStatus &&
      matchesType &&
      matchesProject &&
      matchesActivity &&
      matchesOwner &&
      matchesRisk &&
      matchesCompletionMode &&
      matchesOverdue &&
      matchesHasTasks &&
      matchesQuickFilter
    );
  });
});

const sortedMilestones = computed(() => {
  const records = [...filteredMilestones.value];
  const direction = sortState.order === "ascending" ? 1 : -1;

  return records.sort((left, right) => {
    if (
      ["plannedEndDate", "actualCompletedAt", "updatedAt", "createdAt"].includes(
        sortState.prop
      )
    ) {
      return (
        (toTimestamp(left[sortState.prop]) - toTimestamp(right[sortState.prop])) *
        direction
      );
    }

    if (
      ["progress", "linkedTaskCount", "completedTaskCount", "order"].includes(
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

const pagedMilestones = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedMilestones.value.slice(start, start + pageSize.value);
});

const emptyState = computed(() => {
  if (milestones.value.length === 0) {
    return {
      title: "目前尚無里程碑資料",
      description: "可先建立第一個里程碑，作為專案執行節點。",
      actionLabel: "新增里程碑",
      action: openCreateDrawer,
    };
  }

  return {
    title: "沒有符合條件的里程碑",
    description: "請調整篩選條件或重設搜尋。",
    actionLabel: "重設篩選",
    action: resetFilters,
  };
});

function resetFilters() {
  filters.keyword = "";
  filters.status = "all";
  filters.milestoneType = "all";
  filters.projectId = "all";
  filters.activityId = "all";
  filters.ownerId = "all";
  filters.riskLevel = "all";
  filters.completionMode = "all";
  filters.isOverdue = "all";
  filters.hasTasks = "all";
  quickFilter.value = "all";
}

function handleSortChange({ prop, order }) {
  sortState.prop = prop || "updatedAt";
  sortState.order = order || "descending";
}

function openCreateDrawer(prefill = {}) {
  formMode.value = "create";
  editingMilestoneId.value = "";
  Object.assign(form, {
    ...createEmptyForm(),
    ...prefill,
  });
  formDrawerOpen.value = true;
}

function openEditDrawer(record) {
  const target = getMilestoneById(record.id);

  if (!target) {
    return;
  }

  formMode.value = "edit";
  editingMilestoneId.value = target.id;
  Object.assign(form, {
    ...createEmptyForm(),
    ...target,
    tagsInput: (target.tags ?? []).join("、"),
    attachmentsInput: (target.attachments ?? []).join("、"),
  });
  formDrawerOpen.value = true;
}

function openDetail(record) {
  detailMilestoneId.value = record.id;
  detailDrawerOpen.value = true;
}

function submitForm() {
  if (!form.milestoneName.trim()) {
    notify("請輸入里程碑名稱", "缺少資訊", "warning");
    return;
  }

  if (!form.ownerId) {
    notify("請指定負責人", "缺少資訊", "warning");
    return;
  }

  if (!form.projectId && !form.activityId) {
    notify("需至少關聯專案或活動", "缺少資訊", "warning");
    return;
  }

  if (toTimestamp(form.plannedEndDate) < toTimestamp(form.plannedStartDate)) {
    notify("預計完成日不可早於預計開始日", "日期錯誤", "warning");
    return;
  }

  const payload = {
    milestoneNo: form.milestoneNo,
    milestoneName: form.milestoneName.trim(),
    milestoneType: form.milestoneType,
    status: form.status,
    order: Number(form.order ?? 1),
    projectId: form.projectId,
    activityId: form.activityId,
    parentMilestoneId: form.parentMilestoneId,
    ownerId: form.ownerId,
    participantIds: [...form.participantIds],
    plannedStartDate: form.plannedStartDate,
    plannedEndDate: form.plannedEndDate,
    completionMode: form.completionMode,
    completionCriteria: form.completionCriteria.trim(),
    acceptanceCriteria: form.acceptanceCriteria.trim(),
    autoRuleSummary: form.autoRuleSummary.trim(),
    linkedTaskIds: [...form.linkedTaskIds],
    tags: toPlainArray(form.tagsInput),
    attachments: toPlainArray(form.attachmentsInput),
    notes: form.notes.trim(),
  };

  if (formMode.value === "edit") {
    const updated = updateMilestone(editingMilestoneId.value, payload, "林美雅");

    if (updated) {
      notify(`${updated.milestoneName} 已更新`);
    }
  } else {
    const created = createMilestone(payload, "林美雅");
    notify(`${created.milestoneName} 已建立`);
  }

  formDrawerOpen.value = false;
}

function openDelayDrawer(record) {
  delayingMilestoneId.value = record.id;
  delayForm.plannedEndDate =
    record.plannedEndDate || new Date().toISOString().slice(0, 10);
  delayForm.reason = "";
  delayDrawerOpen.value = true;
}

function submitDelay() {
  if (!delayingMilestoneId.value) {
    return;
  }

  const updated = delayMilestone(
    delayingMilestoneId.value,
    delayForm.plannedEndDate,
    delayForm.reason,
    "林美雅"
  );

  if (updated) {
    notify(`${updated.milestoneName} 已延後至 ${updated.plannedEndDate}`);
  }

  delayDrawerOpen.value = false;
}

async function markCompleted(record) {
  let note = "";

  try {
    const result = await ElMessageBox.prompt("可輸入完成說明（選填）", "標記里程碑完成", {
      confirmButtonText: "完成",
      cancelButtonText: "取消",
      inputPlaceholder: "例如：驗收與交付已完成",
    });

    note = result.value.trim();
  } catch {
    return;
  }

  const updated = completeMilestone(record.id, note, "林美雅");

  if (updated) {
    notify(`${updated.milestoneName} 已標記完成`);
  }
}

function applyTemplate(template) {
  const created = applyMilestoneTemplate(
    template.id,
    {
      projectId: templateForm.projectId,
      activityId: templateForm.activityId,
      ownerId: templateForm.ownerId,
      plannedStartDate: templateForm.plannedStartDate,
      baseOrder: Number(templateForm.baseOrder ?? 1),
    },
    "林美雅"
  );

  if (created.length > 0) {
    notify(`已套用模板「${template.name}」，建立 ${created.length} 筆里程碑`);
  }

  templateDrawerOpen.value = false;
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

function openTasks(record) {
  router.push({
    name: "projects-tasks",
    query: record.id ? { milestoneId: record.id } : {},
  });
}

function exportMilestones() {
  notify("已加入匯出佇列，完成後可下載", "匯出中");
}

async function refreshData() {
  loading.value = true;
  await new Promise((resolve) => setTimeout(resolve, 300));
  loading.value = false;
  notify("里程碑資料已同步最新狀態");
}

watch(
  () => route.query,
  (query) => {
    applyRouteFilterQuery(query);
  }
);

watch(
  () => [
    quickFilter.value,
    filters.keyword,
    filters.status,
    filters.milestoneType,
    filters.projectId,
    filters.activityId,
    filters.ownerId,
    filters.riskLevel,
    filters.completionMode,
    filters.isOverdue,
    filters.hasTasks,
    pageSize.value,
  ],
  () => {
    currentPage.value = 1;
  },
  { deep: true }
);

watch(
  () => [sortedMilestones.value.length, pageSize.value],
  () => {
    const maxPage = Math.max(
      1,
      Math.ceil(sortedMilestones.value.length / pageSize.value)
    );

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
            里程碑
          </h1>
          <p class="text-sm text-slate-500">
            管理專案與活動的關鍵節點，串接任務進度與驗收狀態。
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton type="primary" :icon="CirclePlus" @click="openCreateDrawer"
            >新增里程碑</ElButton
          >
          <ElButton @click="templateDrawerOpen = true">套用模板</ElButton>
          <ElButton :icon="Download" @click="exportMilestones">匯出</ElButton>
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
              placeholder="搜尋里程碑名稱 / 編號 / 專案 / 活動"
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
          <ElTag round effect="plain">共 {{ sortedMilestones.length }} 筆</ElTag>
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
            class="grid gap-3 border-b border-slate-200 bg-white px-6 py-4 md:grid-cols-5"
          >
            <ElSelect v-model="filters.status">
              <ElOption label="全部狀態" value="all" />
              <ElOption
                v-for="(meta, value) in milestoneStatusMap"
                :key="value"
                :label="meta.label"
                :value="value"
              />
            </ElSelect>
            <ElSelect v-model="filters.milestoneType">
              <ElOption label="全部類型" value="all" />
              <ElOption
                v-for="(meta, value) in milestoneTypeMap"
                :key="value"
                :label="meta.label"
                :value="value"
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
            <ElSelect v-model="filters.ownerId">
              <ElOption label="全部負責人" value="all" />
              <ElOption
                v-for="item in ownerOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
            <ElSelect v-model="filters.riskLevel">
              <ElOption label="全部風險" value="all" />
              <ElOption
                v-for="(meta, value) in riskLevelMap"
                :key="value"
                :label="meta.label"
                :value="value"
              />
            </ElSelect>
            <ElSelect v-model="filters.completionMode">
              <ElOption label="全部完成方式" value="all" />
              <ElOption
                v-for="(meta, value) in completionModeMap"
                :key="value"
                :label="meta.label"
                :value="value"
              />
            </ElSelect>
            <ElSelect v-model="filters.isOverdue">
              <ElOption label="是否逾期：全部" value="all" />
              <ElOption label="是否逾期：是" value="yes" />
              <ElOption label="是否逾期：否" value="no" />
            </ElSelect>
            <ElSelect v-model="filters.hasTasks">
              <ElOption label="含關聯任務：全部" value="all" />
              <ElOption label="含關聯任務：是" value="yes" />
              <ElOption label="含關聯任務：否" value="no" />
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

        <ElEmpty
          v-if="sortedMilestones.length === 0"
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
            :data="pagedMilestones"
            size="large"
            table-layout="auto"
            @sort-change="handleSortChange"
          >
            <ElTableColumn label="里程碑" min-width="240">
              <template #default="{ row }">
                <div class="grid gap-0.5">
                  <button
                    type="button"
                    class="text-left text-sm font-semibold text-slate-900 hover:text-[#409eff]"
                    @click="openDetail(row)"
                  >
                    {{ row.milestoneName }}
                  </button>
                  <span class="text-xs text-slate-400">{{ row.milestoneNo }}</span>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="類型" min-width="100">
              <template #default="{ row }">
                {{ milestoneTypeMap[row.milestoneType]?.label || row.milestoneType }}
              </template>
            </ElTableColumn>

            <ElTableColumn label="狀態" min-width="110">
              <template #default="{ row }">
                <ElTag round :type="milestoneStatusMap[row.status]?.type" effect="light">
                  {{ milestoneStatusMap[row.status]?.label || row.status }}
                </ElTag>
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

            <ElTableColumn
              label="負責人"
              min-width="100"
              prop="ownerName"
              sortable="custom"
            />

            <ElTableColumn label="任務進度" min-width="150">
              <template #default="{ row }">
                <div class="grid gap-1">
                  <span class="text-xs text-slate-500">
                    {{ row.completedTaskCount }} / {{ row.linkedTaskCount }}
                  </span>
                  <ElProgress
                    :percentage="row.progress"
                    :show-text="false"
                    :stroke-width="6"
                  />
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn
              label="預計完成日"
              min-width="130"
              prop="plannedEndDate"
              sortable="custom"
            >
              <template #default="{ row }">
                <span :class="row.isOverdue ? 'text-rose-600 font-medium' : ''">
                  {{ formatDate(row.plannedEndDate) }}
                </span>
              </template>
            </ElTableColumn>

            <ElTableColumn
              label="實際完成日"
              min-width="130"
              prop="actualCompletedAt"
              sortable="custom"
            >
              <template #default="{ row }">{{
                formatDate(row.actualCompletedAt)
              }}</template>
            </ElTableColumn>

            <ElTableColumn label="風險" min-width="100">
              <template #default="{ row }">
                <ElTag round effect="light" :type="riskLevelMap[row.riskLevel]?.type">
                  {{ riskLevelMap[row.riskLevel]?.label || row.riskLevel }}
                </ElTag>
              </template>
            </ElTableColumn>

            <ElTableColumn
              label="最近更新"
              min-width="160"
              prop="updatedAt"
              sortable="custom"
            >
              <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
            </ElTableColumn>

            <ElTableColumn label="操作" fixed="right" min-width="220">
              <template #default="{ row }">
                <div class="flex flex-wrap gap-1">
                  <ElButton size="small" @click="openDetail(row)">查看</ElButton>
                  <ElButton size="small" @click="openEditDrawer(row)">編輯</ElButton>
                  <ElButton size="small" type="success" plain @click="markCompleted(row)">
                    完成
                  </ElButton>
                  <ElButton
                    size="small"
                    type="warning"
                    plain
                    @click="openDelayDrawer(row)"
                  >
                    延後
                  </ElButton>
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
              :total="sortedMilestones.length"
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
      :title="formMode === 'edit' ? '編輯里程碑' : '新增里程碑'"
      size="760px"
      destroy-on-close
    >
      <div class="grid gap-5 pb-4">
        <section
          class="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
        >
          <h3 class="text-sm font-semibold text-slate-800">基本資料</h3>
          <ElForm label-width="108px" class="grid gap-3 md:grid-cols-2">
            <ElFormItem label="里程碑名稱" required class="md:col-span-2">
              <ElInput v-model="form.milestoneName" />
            </ElFormItem>
            <ElFormItem label="里程碑編號">
              <ElInput v-model="form.milestoneNo" />
            </ElFormItem>
            <ElFormItem label="顯示順序">
              <ElInputNumber v-model="form.order" :min="1" class="!w-full" />
            </ElFormItem>
            <ElFormItem label="里程碑類型">
              <ElSelect v-model="form.milestoneType">
                <ElOption
                  v-for="(meta, value) in milestoneTypeMap"
                  :key="value"
                  :label="meta.label"
                  :value="value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="里程碑狀態">
              <ElSelect v-model="form.status">
                <ElOption
                  v-for="(meta, value) in milestoneStatusMap"
                  :key="value"
                  :label="meta.label"
                  :value="value"
                />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </section>

        <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-800">關聯資料</h3>
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
            <ElFormItem label="父階段">
              <ElSelect v-model="form.parentMilestoneId" filterable>
                <ElOption label="無" value="" />
                <ElOption
                  v-for="item in milestones"
                  :key="item.id"
                  :label="item.milestoneName"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="關聯任務">
              <ElSelect v-model="form.linkedTaskIds" filterable multiple collapse-tags>
                <ElOption
                  v-for="item in availableTaskOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </section>

        <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-800">時程與人員</h3>
          <ElForm label-width="108px" class="grid gap-3 md:grid-cols-2">
            <ElFormItem label="負責人" required>
              <ElSelect v-model="form.ownerId">
                <ElOption
                  v-for="item in ownerOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="參與人">
              <ElSelect v-model="form.participantIds" multiple collapse-tags>
                <ElOption
                  v-for="item in ownerOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="預計開始日">
              <ElDatePicker
                v-model="form.plannedStartDate"
                value-format="YYYY-MM-DD"
                class="!w-full"
              />
            </ElFormItem>
            <ElFormItem label="預計完成日">
              <ElDatePicker
                v-model="form.plannedEndDate"
                value-format="YYYY-MM-DD"
                class="!w-full"
              />
            </ElFormItem>
          </ElForm>
        </section>

        <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-semibold text-slate-800">完成條件與補充</h3>
          <ElForm label-width="108px" class="grid gap-3">
            <ElFormItem label="完成方式">
              <ElSelect v-model="form.completionMode">
                <ElOption
                  v-for="(meta, value) in completionModeMap"
                  :key="value"
                  :label="meta.label"
                  :value="value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="完成條件">
              <ElInput v-model="form.completionCriteria" type="textarea" :rows="2" />
            </ElFormItem>
            <ElFormItem label="驗收標準">
              <ElInput v-model="form.acceptanceCriteria" type="textarea" :rows="2" />
            </ElFormItem>
            <ElFormItem label="自動規則">
              <ElInput
                v-model="form.autoRuleSummary"
                placeholder="例如：任務 100% 完成後可自動完成"
              />
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
          <ElButton type="primary" @click="submitForm">
            {{ formMode === "edit" ? "儲存變更" : "建立里程碑" }}
          </ElButton>
        </div>
      </template>
    </ElDrawer>

    <ElDrawer v-model="detailDrawerOpen" title="里程碑詳情" size="760px" destroy-on-close>
      <div v-if="detailMilestone" class="grid gap-5 pb-4">
        <section class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="grid gap-1">
              <h3 class="text-lg font-semibold text-slate-900">
                {{ detailMilestone.milestoneName }}
              </h3>
              <p class="text-xs text-slate-500">
                {{ detailMilestone.milestoneNo }} ・
                {{
                  milestoneTypeMap[detailMilestone.milestoneType]?.label ||
                  detailMilestone.milestoneType
                }}
              </p>
            </div>
            <div class="flex flex-wrap gap-1">
              <ElTag
                round
                :type="milestoneStatusMap[detailMilestone.status]?.type"
                effect="light"
              >
                {{
                  milestoneStatusMap[detailMilestone.status]?.label ||
                  detailMilestone.status
                }}
              </ElTag>
              <ElTag
                round
                :type="riskLevelMap[detailMilestone.riskLevel]?.type"
                effect="light"
              >
                風險：{{
                  riskLevelMap[detailMilestone.riskLevel]?.label ||
                  detailMilestone.riskLevel
                }}
              </ElTag>
            </div>
          </div>

          <div class="mt-3 grid gap-2 md:grid-cols-3">
            <div class="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p class="text-xs text-slate-500">預計完成日</p>
              <p class="text-sm font-medium text-slate-800">
                {{ formatDate(detailMilestone.plannedEndDate) }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p class="text-xs text-slate-500">實際完成日</p>
              <p class="text-sm font-medium text-slate-800">
                {{ formatDate(detailMilestone.actualCompletedAt) }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p class="text-xs text-slate-500">任務進度</p>
              <p class="text-sm font-medium text-slate-800">
                {{ detailMilestone.completedTaskCount }} /
                {{ detailMilestone.linkedTaskCount }}
              </p>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <ElButton size="small" @click="openEditDrawer(detailMilestone)"
              >編輯</ElButton
            >
            <ElButton
              size="small"
              type="success"
              plain
              @click="markCompleted(detailMilestone)"
            >
              標記完成
            </ElButton>
            <ElButton
              size="small"
              type="warning"
              plain
              @click="openDelayDrawer(detailMilestone)"
            >
              延後
            </ElButton>
            <ElButton size="small" plain @click="goProject(detailMilestone)"
              >查看專案</ElButton
            >
            <ElButton size="small" plain @click="openTasks(detailMilestone)"
              >查看關聯任務</ElButton
            >
          </div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 class="text-sm font-semibold text-slate-800">基本資訊</h4>
          <div class="mt-3 grid gap-2 md:grid-cols-2">
            <div class="rounded-xl border border-slate-200 px-3 py-2">
              <p class="text-xs text-slate-500">顯示順序</p>
              <p class="text-sm text-slate-700">{{ detailMilestone.order }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 px-3 py-2">
              <p class="text-xs text-slate-500">完成方式</p>
              <p class="text-sm text-slate-700">
                {{
                  completionModeMap[detailMilestone.completionMode]?.label ||
                  detailMilestone.completionMode
                }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 px-3 py-2">
              <p class="text-xs text-slate-500">建立時間 / 建立人</p>
              <p class="text-sm text-slate-700">
                {{ formatDateTime(detailMilestone.createdAt) }} ・
                {{ detailMilestone.createdBy || "-" }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 px-3 py-2">
              <p class="text-xs text-slate-500">最後更新 / 更新人</p>
              <p class="text-sm text-slate-700">
                {{ formatDateTime(detailMilestone.updatedAt) }} ・
                {{ detailMilestone.updatedBy || "-" }}
              </p>
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 class="text-sm font-semibold text-slate-800">關聯資訊</h4>
          <div class="mt-3 grid gap-2 md:grid-cols-2">
            <div class="rounded-xl border border-slate-200 px-3 py-2">
              <p class="text-xs text-slate-500">專案 / 活動</p>
              <p class="text-sm text-slate-700">
                {{ detailMilestone.projectName || "-" }}
              </p>
              <p class="text-xs text-slate-400">
                {{ detailMilestone.activityName || "-" }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 px-3 py-2">
              <p class="text-xs text-slate-500">父階段</p>
              <p class="text-sm text-slate-700">
                {{ detailMilestone.parentMilestoneName || "無" }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 px-3 py-2">
              <p class="text-xs text-slate-500">負責人</p>
              <p class="text-sm text-slate-700">{{ detailMilestone.ownerName || "-" }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 px-3 py-2">
              <p class="text-xs text-slate-500">參與人</p>
              <p class="text-sm text-slate-700">
                {{ detailMilestone.participantNames?.join("、") || "-" }}
              </p>
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 class="text-sm font-semibold text-slate-800">時程與完成條件</h4>
          <div class="mt-3 grid gap-2 md:grid-cols-2">
            <div class="rounded-xl border border-slate-200 px-3 py-2">
              <p class="text-xs text-slate-500">預計開始 / 完成</p>
              <p class="text-sm text-slate-700">
                {{ formatDate(detailMilestone.plannedStartDate) }} ~
                {{ formatDate(detailMilestone.plannedEndDate) }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 px-3 py-2">
              <p class="text-xs text-slate-500">延遲資訊</p>
              <p class="text-sm text-slate-700">
                {{
                  detailMilestone.isOverdue
                    ? `逾期 ${detailMilestone.delayDays} 天`
                    : "目前無逾期"
                }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2">
              <p class="text-xs text-slate-500">完成條件</p>
              <p class="text-sm text-slate-700">
                {{ detailMilestone.completionCriteria || "-" }}
              </p>
              <p class="mt-1 text-xs text-slate-400">
                驗收：{{ detailMilestone.acceptanceCriteria || "-" }}
              </p>
              <p class="mt-1 text-xs text-slate-400">
                自動規則：{{ detailMilestone.autoRuleSummary || "未設定" }}
              </p>
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 class="text-sm font-semibold text-slate-800">關聯任務</h4>
          <div v-if="detailLinkedTasks.length > 0" class="mt-3 grid gap-2">
            <article
              v-for="task in detailLinkedTasks"
              :key="task.id"
              class="rounded-xl border border-slate-200 px-3 py-2"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="grid gap-0.5">
                  <p class="text-sm font-medium text-slate-800">{{ task.taskName }}</p>
                  <p class="text-xs text-slate-400">{{ task.taskNo }}</p>
                </div>
                <div class="flex gap-1">
                  <ElTag
                    round
                    effect="plain"
                    :type="task.status === 'completed' ? 'success' : 'info'"
                  >
                    {{ task.status }}
                  </ElTag>
                  <ElTag round effect="plain">{{ task.ownerName || "-" }}</ElTag>
                </div>
              </div>
              <p class="mt-1 text-xs text-slate-500">
                截止：{{ formatDate(task.dueDate) }}
              </p>
            </article>
          </div>
          <ElEmpty v-else class="py-8" description="目前無關聯任務" />
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 class="text-sm font-semibold text-slate-800">歷程</h4>
          <div class="mt-3 grid gap-2">
            <article
              v-for="item in detailMilestone.activities"
              :key="item.id"
              class="rounded-xl border border-slate-200 px-3 py-2"
            >
              <div class="flex items-center justify-between text-xs text-slate-400">
                <span>{{ item.title }}</span>
                <span>{{ formatDateTime(item.occurredAt) }}</span>
              </div>
              <p class="mt-1 text-sm text-slate-700">{{ item.description || "-" }}</p>
              <p class="mt-1 text-xs text-slate-400">{{ item.actorName || "-" }}</p>
            </article>
            <ElEmpty
              v-if="detailMilestone.activities.length === 0"
              description="目前無歷程"
            />
          </div>
        </section>
      </div>
    </ElDrawer>

    <ElDrawer
      v-model="templateDrawerOpen"
      title="里程碑模板"
      size="560px"
      destroy-on-close
    >
      <div class="grid gap-4 pb-4">
        <section class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <ElForm label-width="108px" class="grid gap-3">
            <ElFormItem label="關聯專案">
              <ElSelect v-model="templateForm.projectId" filterable>
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
              <ElSelect v-model="templateForm.activityId" filterable>
                <ElOption label="無" value="" />
                <ElOption
                  v-for="item in activityOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="負責人">
              <ElSelect v-model="templateForm.ownerId">
                <ElOption
                  v-for="item in ownerOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="起始日">
              <ElDatePicker
                v-model="templateForm.plannedStartDate"
                value-format="YYYY-MM-DD"
                class="!w-full"
              />
            </ElFormItem>
            <ElFormItem label="起始順序">
              <ElInputNumber v-model="templateForm.baseOrder" :min="1" class="!w-full" />
            </ElFormItem>
          </ElForm>
        </section>

        <article
          v-for="template in templates"
          :key="template.id"
          class="rounded-2xl border border-slate-200 bg-white px-4 py-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="grid gap-0.5">
              <p class="text-sm font-semibold text-slate-900">{{ template.name }}</p>
              <p class="text-xs text-slate-500">
                {{ template.scenario }} ・ {{ template.summary }}
              </p>
            </div>
            <ElButton size="small" type="primary" @click="applyTemplate(template)">
              套用模板
            </ElButton>
          </div>
          <ul class="mt-2 list-disc pl-5 text-xs text-slate-500">
            <li v-for="item in template.items" :key="item.name">
              {{ item.name }}（{{ milestoneTypeMap[item.type]?.label || item.type }} /
              {{ item.dueOffsetDays }} 天）
            </li>
          </ul>
        </article>
      </div>
    </ElDrawer>

    <ElDrawer v-model="delayDrawerOpen" title="延後里程碑" size="460px" destroy-on-close>
      <ElForm label-width="108px" class="grid gap-3 pb-4">
        <ElFormItem label="新的完成日" required>
          <ElDatePicker
            v-model="delayForm.plannedEndDate"
            value-format="YYYY-MM-DD"
            class="!w-full"
          />
        </ElFormItem>
        <ElFormItem label="延後原因" required>
          <ElInput
            v-model="delayForm.reason"
            type="textarea"
            :rows="3"
            placeholder="例如：外部審核延後"
          />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="delayDrawerOpen = false">取消</ElButton>
          <ElButton type="warning" @click="submitDelay">確認延後</ElButton>
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
