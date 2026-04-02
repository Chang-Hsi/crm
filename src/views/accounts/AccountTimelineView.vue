<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElDrawer,
  ElEmpty,
  ElInput,
  ElNotification,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";
import { CirclePlus, Search } from "@element-plus/icons-vue";
import ActivityFormDrawer from "../../components/accounts/ActivityFormDrawer.vue";
import { useAccountsStore } from "../../composables/useAccountsStore";
import { useActivitiesStore } from "../../composables/useActivitiesStore";
import { useContactsStore } from "../../composables/useContactsStore";

const router = useRouter();
const { accounts } = useAccountsStore();
const { contacts } = useContactsStore();
const { activities, createActivity, updateActivity, markActivityDone } = useActivitiesStore();

const pageSize = ref(10);
const currentPage = ref(1);
const sortState = reactive({
  prop: "occurredAt",
  order: "descending",
});
const viewingActivity = ref(null);
const viewDrawerOpen = ref(false);
const formDrawerOpen = ref(false);
const formMode = ref("create");
const editingActivity = ref(null);

const filters = reactive({
  keyword: "",
  type: "all",
  accountId: "all",
  contactId: "all",
  owner: "all",
  status: "all",
  dateRange: [],
});

const EMPTY_STATE_COPY = {
  empty: {
    title: "尚無客戶聯絡紀錄",
    description: "建立第一筆互動資料，開始追蹤客戶跟進狀態。",
    action: "新增互動紀錄",
  },
  noResult: {
    title: "找不到符合條件的互動紀錄",
    description: "請調整搜尋條件或重設篩選。",
    action: "重設篩選",
  },
};

const activityTypeMap = {
  meeting: { label: "會議", type: "primary" },
  call: { label: "通話", type: "warning" },
  email: { label: "Email", type: "success" },
  visit: { label: "拜訪", type: "" },
  note: { label: "備註", type: "info" },
};

const activityStatusMap = {
  done: { label: "已完成", type: "success" },
  pending: { label: "待跟進", type: "warning" },
  overdue: { label: "已逾期", type: "danger" },
};

const accountOptions = computed(() => [
  { label: "全部客戶", value: "all" },
  ...accounts.value.map((account) => ({
    label: account.companyName,
    value: account.id,
  })),
]);

const contactOptions = computed(() => {
  const source =
    filters.accountId === "all"
      ? contacts.value
      : contacts.value.filter((contact) => contact.accountId === filters.accountId);

  return [
    { label: "全部聯絡人", value: "all" },
    ...source.map((contact) => ({
      label: `${contact.name} / ${contact.accountName}`,
      value: contact.id,
    })),
  ];
});

function formatDate(value, includeTime = false) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  }).format(new Date(value));
}

function getEffectiveStatus(activity) {
  if (!activity) {
    return "done";
  }

  if (activity.status === "done") {
    return "done";
  }

  if (activity.nextActionAt && new Date(activity.nextActionAt).getTime() < Date.now()) {
    return "overdue";
  }

  return "pending";
}

function openViewDrawer(activity) {
  viewingActivity.value = activity;
  viewDrawerOpen.value = true;
}

function openCreateDrawer() {
  formMode.value = "create";
  editingActivity.value = null;
  formDrawerOpen.value = true;
}

function openEditDrawer(activity) {
  formMode.value = "edit";
  editingActivity.value = activity;
  formDrawerOpen.value = true;
}

function jumpToAccount(activity) {
  router.push({
    name: "account-detail",
    params: { accountId: activity.accountId },
  });
}

function handleSubmitActivity(payload) {
  if (formMode.value === "edit" && editingActivity.value) {
    const updatedActivity = updateActivity(editingActivity.value.id, payload);

    if (!updatedActivity) {
      return;
    }

    if (viewingActivity.value?.id === updatedActivity.id) {
      viewingActivity.value = updatedActivity;
    }

    ElNotification({
      title: "已更新",
      message: `${updatedActivity.title} 已更新完成。`,
      type: "success",
      position: "top-right",
    });
  } else {
    const nextActivity = createActivity(payload);

    ElNotification({
      title: "已建立",
      message: `${nextActivity.title} 已新增為互動紀錄。`,
      type: "success",
      position: "top-right",
    });
  }

  formDrawerOpen.value = false;
}

function handleMarkDone(activity) {
  if (!activity || getEffectiveStatus(activity) === "done") {
    return;
  }

  const updatedActivity = markActivityDone(activity.id);

  if (!updatedActivity) {
    return;
  }

  if (viewingActivity.value?.id === updatedActivity.id) {
    viewingActivity.value = updatedActivity;
  }

  ElNotification({
    title: "已完成",
    message: `${updatedActivity.title} 已標記為完成。`,
    type: "success",
    position: "top-right",
  });
}

function handleSortChange({ prop, order }) {
  sortState.prop = prop || "occurredAt";
  sortState.order = order || "descending";
}

function resetFilters() {
  filters.keyword = "";
  filters.type = "all";
  filters.accountId = "all";
  filters.contactId = "all";
  filters.owner = "all";
  filters.status = "all";
  filters.dateRange = [];
}

const filteredActivities = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();
  const [startDate, endDate] = filters.dateRange ?? [];

  return activities.value.filter((activity) => {
      const effectiveStatus = getEffectiveStatus(activity);
      const occurredAtTime = new Date(activity.occurredAt).getTime();
      const endDateTime = endDate
        ? new Date(`${endDate}T23:59:59`).getTime()
        : null;

      const matchesKeyword =
        keyword.length === 0 ||
        activity.accountName.toLowerCase().includes(keyword) ||
        activity.contactName.toLowerCase().includes(keyword) ||
        activity.title.toLowerCase().includes(keyword) ||
        activity.summary.toLowerCase().includes(keyword);

      const matchesType = filters.type === "all" || activity.type === filters.type;
      const matchesAccount =
        filters.accountId === "all" || activity.accountId === filters.accountId;
      const matchesContact =
        filters.contactId === "all" || activity.contactId === filters.contactId;
      const matchesOwner = filters.owner === "all" || activity.owner === filters.owner;
      const matchesStatus =
        filters.status === "all" || effectiveStatus === filters.status;
      const matchesDateRange =
        !startDate ||
        !endDate ||
        (occurredAtTime >= new Date(startDate).getTime() &&
          occurredAtTime <= endDateTime);

      return (
        matchesKeyword &&
        matchesType &&
        matchesAccount &&
        matchesContact &&
        matchesOwner &&
        matchesStatus &&
        matchesDateRange
      );
    });
});

const sortedActivities = computed(() => {
  const records = [...filteredActivities.value];

  if (sortState.prop !== "occurredAt") {
    return records;
  }

  const direction = sortState.order === "ascending" ? 1 : -1;

  return records.sort((left, right) => {
    return (
      (new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime()) *
      direction
    );
  });
});

const pagedActivities = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedActivities.value.slice(start, start + pageSize.value);
});

const summaryCards = computed(() => {
  const now = Date.now();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recentRecords = activities.value.filter(
    (activity) => new Date(activity.occurredAt).getTime() >= sevenDaysAgo
  );

  return [
    {
      label: "今日待跟進",
      value: activities.value.filter((activity) => {
        if (!activity.nextActionAt || getEffectiveStatus(activity) === "done") {
          return false;
        }
        const dueTime = new Date(activity.nextActionAt).getTime();
        return dueTime >= startOfToday.getTime() && dueTime <= endOfToday.getTime();
      }).length,
    },
    {
      label: "逾期未跟進",
      value: activities.value.filter(
        (activity) => getEffectiveStatus(activity) === "overdue"
      ).length,
    },
    {
      label: "本週互動數",
      value: recentRecords.length,
    },
    {
      label: "最近 7 天聯絡客戶數",
      value: new Set(recentRecords.map((activity) => activity.accountId)).size,
    },
  ];
});

watch(
  () => [
    filters.keyword,
    filters.type,
    filters.accountId,
    filters.contactId,
    filters.owner,
    filters.status,
    filters.dateRange,
    pageSize.value,
  ],
  () => {
    currentPage.value = 1;
  }
);

watch(
  () => filters.accountId,
  () => {
    filters.contactId = "all";
  }
);
</script>

<template>
  <div class="min-h-full p-8">
    <section class="grid gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-2">
          <h1 class="text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-900">
            客戶聯絡
          </h1>
          <p class="text-sm text-slate-500">
            以 Account 為中心管理互動紀錄、下一步行動與逾期跟進事項。
          </p>
        </div>

        <ElButton type="primary" :icon="CirclePlus" @click="openCreateDrawer">
          新增互動紀錄
        </ElButton>
      </div>

      <div class="grid gap-4 xl:grid-cols-4">
        <ElCard
          v-for="card in summaryCards"
          :key="card.label"
          shadow="never"
          class="rounded-[28px] !border-slate-200"
        >
          <div class="grid gap-2">
            <p class="text-sm font-medium text-slate-500">{{ card.label }}</p>
            <p class="text-[2rem] font-semibold tracking-[-0.04em] text-slate-900">
              {{ card.value }}
            </p>
          </div>
        </ElCard>
      </div>

      <section class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div class="grid gap-4 border-b border-slate-200 px-6 py-5 xl:grid-cols-[minmax(0,1.35fr)_repeat(5,minmax(120px,1fr))_minmax(220px,1.2fr)_auto]">
          <ElInput
            v-model="filters.keyword"
            placeholder="搜尋客戶 / 聯絡人 / 互動主題"
            :prefix-icon="Search"
            clearable
          />

          <ElSelect v-model="filters.type">
            <ElOption label="全部類型" value="all" />
            <ElOption
              v-for="(item, key) in activityTypeMap"
              :key="key"
              :label="item.label"
              :value="key"
            />
          </ElSelect>

          <ElSelect v-model="filters.accountId" filterable>
            <ElOption
              v-for="item in accountOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>

          <ElSelect v-model="filters.contactId" filterable>
            <ElOption
              v-for="item in contactOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>

          <ElSelect v-model="filters.owner">
            <ElOption
              v-for="item in [
                { label: '全部負責業務', value: 'all' },
                ...accounts
                  .map((account) => account.owner)
                  .filter((owner, index, owners) => owners.indexOf(owner) === index)
                  .map((owner) => ({ label: owner, value: owner })),
              ]"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>

          <ElSelect v-model="filters.status">
            <ElOption label="全部狀態" value="all" />
            <ElOption
              v-for="(item, key) in activityStatusMap"
              :key="key"
              :label="item.label"
              :value="key"
            />
          </ElSelect>

          <ElDatePicker
            v-model="filters.dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="開始日期"
            end-placeholder="結束日期"
            class="!w-full"
          />

          <ElButton @click="resetFilters">重設</ElButton>
        </div>

        <div class="flex items-center justify-between gap-3 px-6 py-4">
          <ElTag round effect="plain">共 {{ filteredActivities.length }} 筆</ElTag>
        </div>

        <ElTable
          v-if="pagedActivities.length > 0"
          :data="pagedActivities"
          size="large"
          table-layout="auto"
          :default-sort="{ prop: 'occurredAt', order: 'descending' }"
          @sort-change="handleSortChange"
        >
          <ElTableColumn label="互動時間" min-width="160" prop="occurredAt" sortable="custom">
            <template #default="{ row }">
              {{ formatDate(row.occurredAt, true) }}
            </template>
          </ElTableColumn>

          <ElTableColumn label="客戶" min-width="220">
            <template #default="{ row }">
              <button
                type="button"
                class="text-left text-sm font-semibold text-[#409eff] hover:text-[#337ecc]"
                @click="jumpToAccount(row)"
              >
                {{ row.accountName }}
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="聯絡人" min-width="150">
            <template #default="{ row }">
              {{ row.contactName || "-" }}
            </template>
          </ElTableColumn>

          <ElTableColumn label="類型" min-width="100">
            <template #default="{ row }">
              <ElTag round effect="light" :type="activityTypeMap[row.type]?.type">
                {{ activityTypeMap[row.type]?.label ?? row.type }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="主題" min-width="240">
            <template #default="{ row }">
              <button
                type="button"
                class="text-left text-sm font-medium text-slate-900 hover:text-[#409eff]"
                @click="openViewDrawer(row)"
              >
                {{ row.title }}
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="負責人" min-width="120" prop="owner" />

          <ElTableColumn label="下次行動" min-width="220">
            <template #default="{ row }">
              {{ row.nextAction || "-" }}
            </template>
          </ElTableColumn>

          <ElTableColumn label="下次行動時間" min-width="170">
            <template #default="{ row }">
              {{ formatDate(row.nextActionAt, true) }}
            </template>
          </ElTableColumn>

          <ElTableColumn label="狀態" min-width="110">
            <template #default="{ row }">
              <ElTag round effect="light" :type="activityStatusMap[getEffectiveStatus(row)]?.type">
                {{ activityStatusMap[getEffectiveStatus(row)]?.label }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="操作" width="250" fixed="right">
            <template #default="{ row }">
              <div class="flex items-center justify-end gap-1">
                <ElButton text type="primary" @click="openViewDrawer(row)">查看</ElButton>
                <ElButton text @click="openEditDrawer(row)">編輯</ElButton>
                <ElButton text @click="jumpToAccount(row)">跳到客戶</ElButton>
                <ElButton
                  text
                  :disabled="getEffectiveStatus(row) === 'done'"
                  @click="handleMarkDone(row)"
                >
                  標記完成
                </ElButton>
              </div>
            </template>
          </ElTableColumn>
        </ElTable>

        <div v-else class="px-6 py-16">
          <ElEmpty
            :description="
              activities.length === 0 ? EMPTY_STATE_COPY.empty.title : EMPTY_STATE_COPY.noResult.title
            "
          >
            <p class="mb-3 text-sm text-slate-500">
              {{
                activities.length === 0
                  ? EMPTY_STATE_COPY.empty.description
                  : EMPTY_STATE_COPY.noResult.description
              }}
            </p>
            <ElButton
              type="primary"
              @click="activities.length === 0 ? openCreateDrawer() : resetFilters()"
            >
              {{
                activities.length === 0
                  ? EMPTY_STATE_COPY.empty.action
                  : EMPTY_STATE_COPY.noResult.action
              }}
            </ElButton>
          </ElEmpty>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-5">
          <ElPagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            layout="total, prev, pager, next"
            :total="filteredActivities.length"
            background
          />

          <ElSelect v-model="pageSize" class="!w-[96px]">
            <ElOption :value="10" label="10 Item" />
            <ElOption :value="20" label="20 Item" />
            <ElOption :value="50" label="50 Item" />
          </ElSelect>
        </div>
      </section>
    </section>

    <ElDrawer
      v-model="viewDrawerOpen"
      title="互動詳情"
      direction="rtl"
      size="540px"
      destroy-on-close
    >
      <template v-if="viewingActivity">
        <div class="grid gap-5">
          <section class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
            <div class="grid gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <ElTag round effect="light" :type="activityTypeMap[viewingActivity.type]?.type">
                  {{ activityTypeMap[viewingActivity.type]?.label ?? viewingActivity.type }}
                </ElTag>
                <ElTag
                  round
                  effect="light"
                  :type="activityStatusMap[getEffectiveStatus(viewingActivity)]?.type"
                >
                  {{ activityStatusMap[getEffectiveStatus(viewingActivity)]?.label }}
                </ElTag>
              </div>
              <h3 class="text-xl font-semibold text-slate-900">{{ viewingActivity.title }}</h3>
              <p class="text-sm text-slate-500">
                {{ formatDate(viewingActivity.occurredAt, true) }}
              </p>
            </div>
          </section>

          <section class="rounded-3xl border border-slate-200 bg-white p-5">
            <div class="grid gap-3 text-sm text-slate-600">
              <p>客戶：{{ viewingActivity.accountName }}</p>
              <p>聯絡人：{{ viewingActivity.contactName || "-" }}</p>
              <p>負責人：{{ viewingActivity.owner }}</p>
              <p class="leading-7">摘要：{{ viewingActivity.summary || "目前尚無摘要。" }}</p>
              <p>下次行動：{{ viewingActivity.nextAction || "-" }}</p>
              <p>下次行動時間：{{ formatDate(viewingActivity.nextActionAt, true) }}</p>
            </div>
          </section>
        </div>
      </template>

      <template #footer>
        <div class="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          <ElButton @click="viewDrawerOpen = false">關閉</ElButton>
          <ElButton
            @click="
              viewDrawerOpen = false;
              openEditDrawer(viewingActivity);
            "
          >
            編輯
          </ElButton>
          <ElButton @click="jumpToAccount(viewingActivity)">跳到客戶</ElButton>
          <ElButton
            type="primary"
            :disabled="getEffectiveStatus(viewingActivity) === 'done'"
            @click="handleMarkDone(viewingActivity)"
          >
            標記完成
          </ElButton>
        </div>
      </template>
    </ElDrawer>

    <ActivityFormDrawer
      v-model="formDrawerOpen"
      :mode="formMode"
      :activity="editingActivity"
      @submit="handleSubmitActivity"
    />
  </div>
</template>
