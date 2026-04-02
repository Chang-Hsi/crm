<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ElButton,
  ElCard,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElEmpty,
  ElInput,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTabs,
  ElTabPane,
  ElTimeline,
  ElTimelineItem,
  ElNotification,
} from "element-plus";
import { ArrowLeft, MoreFilled, Plus } from "@element-plus/icons-vue";
import AccountFormDialog from "../../components/accounts/AccountFormDialog.vue";
import ContactFormDrawer from "../../components/accounts/ContactFormDrawer.vue";
import { useAccountsStore } from "../../composables/useAccountsStore";
import { useAppShell } from "../../composables/useAppShell";
import { useContactsStore } from "../../composables/useContactsStore";
import {
  lifecycleMap,
  opportunityStageMap,
  statusMap,
  tierMap,
  typeMap,
} from "../../constants/accountMaps";

const route = useRoute();
const router = useRouter();
const { getAccountById, updateAccount } = useAccountsStore();
const { createContact, getContactsByAccountId, setPrimaryContact, updateContact } =
  useContactsStore();
const { updateVisitedTag } = useAppShell();

const activeTab = ref("overview");
const formDialogOpen = ref(false);
const contactFormOpen = ref(false);
const contactFormMode = ref("create");
const editingContact = ref(null);

const contactFilters = ref({
  keyword: "",
  primary: "all",
});

const opportunityKeyword = ref("");
const activityTypeFilter = ref("all");
const timelineFilter = ref("all");

const activityTypeOptions = [
  { label: "全部互動", value: "all" },
  { label: "會議", value: "會議" },
  { label: "拜訪", value: "拜訪" },
  { label: "Email", value: "Email" },
  { label: "通話", value: "通話" },
  { label: "備註", value: "備註" },
];

const timelineTypeOptions = [
  { label: "全部", value: "all" },
  { label: "只看商機", value: "opportunity" },
  { label: "只看互動", value: "activity" },
];

const EMPTY_STATE_COPY = {
  contacts: {
    title: "目前尚無聯絡人",
    description: "建立第一位聯絡人，方便後續商機推進與互動記錄。",
    action: "新增聯絡人",
  },
  opportunities: {
    title: "目前尚無商機",
    description: "建立第一筆商機，開始後續 pipeline 推進。",
    action: "新增商機",
  },
  activities: {
    title: "目前尚無互動紀錄",
    description: "建立第一筆互動資料，方便追蹤下一步合作進度。",
    action: "新增互動",
  },
  timeline: {
    title: "目前尚無 Timeline 事件",
    description: "建立第一筆互動或商機異動後，這裡會開始累積關鍵事件。",
    action: "新增互動",
  },
};

const PLACEHOLDER_MESSAGE = "此功能將於下一階段開放。";

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

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatRelativeFromNow(value) {
  if (!value) {
    return "-";
  }

  const targetTime = new Date(value).getTime();
  const now = Date.now();
  const diffMs = now - targetTime;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} 天前`;
  }

  if (diffHours > 0) {
    return `${diffHours} 小時前`;
  }

  return "今天";
}

function notifyPlaceholder() {
  ElNotification({
    title: "即將開放",
    message: PLACEHOLDER_MESSAGE,
    type: "info",
    position: "top-right",
  });
}

const account = computed(() => getAccountById(String(route.params.accountId)));
const accountContacts = computed(() =>
  getContactsByAccountId(String(route.params.accountId))
);

const detailTabTitle = computed(() =>
  account.value ? `客戶列表 / ${account.value.companyName}` : "客戶列表 / 詳情"
);

watch(
  detailTabTitle,
  (title) => {
    route.meta.title = title;
    updateVisitedTag(route.fullPath, { title });
  },
  { immediate: true }
);

const filteredContacts = computed(() => {
  const keyword = contactFilters.value.keyword.trim().toLowerCase();

  return accountContacts.value.filter((contact) => {
    const matchesKeyword =
      keyword.length === 0 ||
      contact.name.toLowerCase().includes(keyword) ||
      contact.email.toLowerCase().includes(keyword);

    const matchesPrimary =
      contactFilters.value.primary === "all" ||
      (contactFilters.value.primary === "yes" && contact.isPrimary) ||
      (contactFilters.value.primary === "no" && !contact.isPrimary);

    return matchesKeyword && matchesPrimary;
  });
});

const filteredOpportunities = computed(() => {
  const keyword = opportunityKeyword.value.trim().toLowerCase();

  return (account.value?.opportunities ?? []).filter((item) => {
    return keyword.length === 0 || item.name.toLowerCase().includes(keyword);
  });
});

const filteredActivities = computed(() => {
  return (account.value?.activities ?? []).filter((item) => {
    return activityTypeFilter.value === "all" || item.type === activityTypeFilter.value;
  });
});

const filteredTimeline = computed(() => {
  return (account.value?.timeline ?? []).filter((item) => {
    if (timelineFilter.value === "all") {
      return true;
    }

    if (timelineFilter.value === "activity") {
      return item.type === "activity";
    }

    if (timelineFilter.value === "opportunity") {
      return item.type === "opportunity";
    }

    return true;
  });
});

const latestActivity = computed(() => account.value?.activities?.[0] ?? null);
const primaryContact = computed(
  () =>
    accountContacts.value.find((contact) => contact.isPrimary) ??
    accountContacts.value[0] ??
    null
);
const contactCount = computed(() => accountContacts.value.length);
const latestOpportunity = computed(() => account.value?.opportunities?.[0] ?? null);
const activeOpportunityCount = computed(
  () =>
    (account.value?.opportunities ?? []).filter((item) => !["won", "lost"].includes(item.stage))
      .length
);
const pipelineAmount = computed(() =>
  (account.value?.opportunities ?? [])
    .filter((item) => !["won", "lost"].includes(item.stage))
    .reduce((total, item) => total + (item.amount ?? 0), 0)
);
const latestTimelineItems = computed(() => (account.value?.timeline ?? []).slice(0, 5));
const nextAction = computed(() => account.value?.nextAction ?? null);
const nextActionOverdue = computed(() => {
  if (!nextAction.value?.dueAt) {
    return false;
  }

  return new Date(nextAction.value.dueAt).getTime() < Date.now();
});
const lastFollowUpText = computed(() =>
  latestActivity.value ? formatRelativeFromNow(latestActivity.value.occurredAt) : "-"
);

function openEditDrawer() {
  formDialogOpen.value = true;
}

function openCreateContactDrawer() {
  contactFormMode.value = "create";
  editingContact.value = null;
  contactFormOpen.value = true;
}

function openEditContactDrawer(contact) {
  contactFormMode.value = "edit";
  editingContact.value = contact;
  contactFormOpen.value = true;
}

function handleUpdateAccount({ payload }) {
  const updatedAccount = updateAccount(String(route.params.accountId), payload);

  if (!updatedAccount) {
    return;
  }

  ElNotification({
    title: "已更新",
    message: `客戶 ${updatedAccount.companyName} 已更新完成。`,
    type: "success",
    position: "top-right",
  });

  formDialogOpen.value = false;
  route.meta.title = `客戶列表 / ${updatedAccount.companyName}`;
  updateVisitedTag(route.fullPath, { title: route.meta.title });
}

function handleSubmitContact(payload) {
  if (contactFormMode.value === "edit" && editingContact.value) {
    const updatedContact = updateContact(editingContact.value.id, payload);

    if (!updatedContact) {
      return;
    }

    ElNotification({
      title: "已更新",
      message: `${updatedContact.name} 已更新完成。`,
      type: "success",
      position: "top-right",
    });
  } else {
    const nextContact = createContact(payload);

    ElNotification({
      title: "已建立",
      message: `${nextContact.name} 已新增為聯絡人。`,
      type: "success",
      position: "top-right",
    });
  }

  contactFormOpen.value = false;
}

function handleSetPrimaryContact(contact) {
  if (!contact || contact.isPrimary) {
    return;
  }

  const updatedContact = setPrimaryContact(contact.id);

  if (!updatedContact) {
    return;
  }

  ElNotification({
    title: "已更新",
    message: `${updatedContact.name} 已設為主要聯絡人。`,
    type: "success",
    position: "top-right",
  });
}
</script>

<template>
  <div class="grid gap-6 p-8">
    <ElEmpty
      v-if="!account"
      description="找不到對應的客戶資料"
      class="rounded-[28px] border border-slate-200 bg-white py-20"
    >
      <ElButton type="primary" @click="router.push({ name: 'accounts-list' })">
        返回客戶列表
      </ElButton>
    </ElEmpty>

    <template v-else>
      <section class="p-6">
        <div class="flex flex-wrap items-start justify-between gap-5">
          <div class="flex items-start gap-4">
            <ElButton :icon="ArrowLeft" @click="router.push({ name: 'accounts-list' })">
              返回
            </ElButton>

            <div class="grid gap-3 pl-10">
              <div>
                <h1
                  class="text-[1.75rem] font-semibold tracking-[-0.03em] text-slate-900"
                >
                  {{ account.companyName }}
                </h1>
                <p class="mt-1 text-sm text-slate-500">{{ account.accountCode }}</p>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <ElTag round effect="light" :type="typeMap[account.companyType].type">
                  {{ typeMap[account.companyType].label }}
                </ElTag>
                <ElTag round effect="light" :type="tierMap[account.tier].type">
                  {{ tierMap[account.tier].label }}
                </ElTag>
                <ElTag
                  round
                  effect="light"
                  :type="lifecycleMap[account.lifecycleStage].type"
                >
                  {{ lifecycleMap[account.lifecycleStage].label }}
                </ElTag>
                <ElTag round effect="light" :type="statusMap[account.status].type">
                  {{ statusMap[account.status].label }}
                </ElTag>
              </div>

              <div
                class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500"
              >
                <span>負責業務：{{ account.owner }}</span>
                <span>地區：{{ account.region }}</span>
                <span>最近更新：{{ formatDate(account.updatedAt, true) }}</span>
              </div>

              <div v-if="account.tags.length > 0" class="flex flex-wrap items-center gap-2">
                <ElTag
                  v-for="tag in account.tags"
                  :key="tag"
                  round
                  effect="plain"
                  class="!border-slate-200 !text-slate-600"
                >
                  {{ tag }}
                </ElTag>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <ElButton type="primary" @click="openEditDrawer">編輯客戶</ElButton>
            <div class="flex items-center gap-2">
              <ElButton :icon="Plus" @click="openCreateContactDrawer">新增聯絡人</ElButton>
            </div>
            <div class="flex items-center gap-2">
              <ElButton :icon="Plus" @click="notifyPlaceholder()">新增商機</ElButton>
              <ElTag size="small" effect="plain" type="info">即將開放</ElTag>
            </div>
            <ElDropdown trigger="click">
              <ElButton :icon="MoreFilled">更多操作</ElButton>

              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem @click="notifyPlaceholder()">指派負責業務</ElDropdownItem>
                  <ElDropdownItem disabled>合併客戶</ElDropdownItem>
                  <ElDropdownItem @click="notifyPlaceholder()">
                    {{ account.status === "active" ? "停用客戶" : "啟用客戶" }}
                  </ElDropdownItem>
                  <ElDropdownItem @click="notifyPlaceholder()">匯出客戶資料</ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
          </div>
        </div>
      </section>

      <ElTabs v-model="activeTab">
        <ElTabPane label="概覽" name="overview">
          <div class="grid gap-4 xl:grid-cols-2">
            <ElCard shadow="never" class="rounded-[28px] !border-slate-200">
              <template #header>
                <span class="text-base font-semibold text-slate-900">基本資料卡</span>
              </template>

              <div class="grid gap-3 text-sm text-slate-600">
                <p>公司名稱：{{ account.companyName }}</p>
                <p>客戶類型：{{ typeMap[account.companyType].label }}</p>
                <p>分級：{{ tierMap[account.tier].label }}</p>
                <p>生命週期：{{ lifecycleMap[account.lifecycleStage].label }}</p>
                <p>狀態：{{ statusMap[account.status].label }}</p>
                <p>地區：{{ account.region }}</p>
                <p>網站：{{ account.website || "-" }}</p>
                <p>地址：{{ account.address || "-" }}</p>
                <p class="leading-7">
                  說明：{{ account.description || "目前尚未補充。" }}
                </p>
                <div class="flex flex-wrap gap-2 pt-2">
                  <ElTag
                    v-for="tag in account.tags"
                    :key="tag"
                    round
                    effect="plain"
                    class="!border-slate-200 !text-slate-600"
                  >
                    {{ tag }}
                  </ElTag>
                </div>
              </div>
            </ElCard>

            <ElCard shadow="never" class="rounded-[28px] !border-slate-200">
              <template #header>
                <div class="flex items-center justify-between">
                  <span class="text-base font-semibold text-slate-900">聯絡人摘要卡</span>
                  <ElButton text type="primary" @click="activeTab = 'contacts'">
                    查看全部聯絡人
                  </ElButton>
                </div>
              </template>

              <div v-if="primaryContact" class="grid gap-3 text-sm text-slate-600">
                <p>主要聯絡人：{{ primaryContact.name }}</p>
                <p>職稱：{{ primaryContact.role }}</p>
                <p>Email：{{ primaryContact.email }}</p>
                <p>Phone：{{ primaryContact.phone }}</p>
                <p>聯絡人總數：{{ contactCount }}</p>
              </div>
              <ElEmpty v-else :description="EMPTY_STATE_COPY.contacts.title" :image-size="72">
                <p class="mb-3 text-sm text-slate-500">
                  {{ EMPTY_STATE_COPY.contacts.description }}
                </p>
                <ElButton type="primary" @click="openCreateContactDrawer">
                  {{ EMPTY_STATE_COPY.contacts.action }}
                </ElButton>
              </ElEmpty>
            </ElCard>

            <ElCard shadow="never" class="rounded-[28px] !border-slate-200">
              <template #header>
                <div class="flex items-center justify-between">
                  <span class="text-base font-semibold text-slate-900">商機摘要卡</span>
                  <ElButton text type="primary" @click="activeTab = 'opportunities'">
                    查看全部商機
                  </ElButton>
                </div>
              </template>

              <div
                v-if="account.opportunityCount > 0"
                class="grid gap-3 text-sm text-slate-600"
              >
                <p>商機總數：{{ account.opportunityCount }}</p>
                <p>進行中商機數：{{ activeOpportunityCount }}</p>
                <p>總 Pipeline 金額：{{ formatCurrency(pipelineAmount) }}</p>
                <p>最近一筆商機：{{ latestOpportunity?.name ?? "-" }}</p>
              </div>
              <ElEmpty
                v-else
                :description="EMPTY_STATE_COPY.opportunities.title"
                :image-size="72"
              >
                <p class="mb-3 text-sm text-slate-500">
                  {{ EMPTY_STATE_COPY.opportunities.description }}
                </p>
                <ElButton type="primary" @click="notifyPlaceholder()">
                  {{ EMPTY_STATE_COPY.opportunities.action }}
                </ElButton>
              </ElEmpty>
            </ElCard>

            <ElCard shadow="never" class="rounded-[28px] !border-slate-200">
              <template #header>
                <span class="text-base font-semibold text-slate-900">待跟進 / Next Action</span>
              </template>

              <div v-if="nextAction" class="grid gap-3 text-sm text-slate-600">
                <div class="flex items-center gap-2">
                  <p>待辦摘要：{{ nextAction.title }}</p>
                  <ElTag :type="nextActionOverdue ? 'danger' : 'warning'" round effect="light">
                    {{ nextActionOverdue ? "已逾期" : "待跟進" }}
                  </ElTag>
                </div>
                <p>下次跟進時間：{{ formatDate(nextAction.dueAt, true) }}</p>
                <p>負責人：{{ nextAction.owner }}</p>
                <p>最近一次跟進距今：{{ lastFollowUpText }}</p>
              </div>
              <ElEmpty v-else description="目前尚無待跟進事項" :image-size="72" />
            </ElCard>

            <ElCard shadow="never" class="rounded-[28px] !border-slate-200">
              <template #header>
                <div class="flex items-center justify-between">
                  <span class="text-base font-semibold text-slate-900"
                    >最近互動摘要卡</span
                  >
                  <ElButton text type="primary" @click="activeTab = 'activities'">
                    查看全部互動
                  </ElButton>
                </div>
              </template>

              <div v-if="latestActivity" class="grid gap-3 text-sm text-slate-600">
                <p>最近互動：{{ latestActivity.title }}</p>
                <p>類型：{{ latestActivity.type }}</p>
                <p>記錄者：{{ latestActivity.owner }}</p>
                <p>時間：{{ latestActivity.occurredAt }}</p>
              </div>
              <ElEmpty v-else :description="EMPTY_STATE_COPY.activities.title" :image-size="72">
                <p class="mb-3 text-sm text-slate-500">
                  {{ EMPTY_STATE_COPY.activities.description }}
                </p>
                <ElButton type="primary" @click="notifyPlaceholder()">
                  {{ EMPTY_STATE_COPY.activities.action }}
                </ElButton>
              </ElEmpty>
            </ElCard>

            <ElCard shadow="never" class="rounded-[28px] !border-slate-200 xl:col-span-2">
              <template #header>
                <div class="flex items-center justify-between">
                  <span class="text-base font-semibold text-slate-900"
                    >Timeline 最近事件</span
                  >
                  <ElButton text type="primary" @click="activeTab = 'timeline'">
                    查看完整 Timeline
                  </ElButton>
                </div>
              </template>

              <ElTimeline>
                <ElTimelineItem
                  v-for="item in latestTimelineItems"
                  :key="item.id"
                  :timestamp="item.timestamp"
                >
                  <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <h4 class="font-medium text-slate-900">{{ item.title }}</h4>
                    <p class="mt-1 text-sm text-slate-600">{{ item.description }}</p>
                  </div>
                </ElTimelineItem>
              </ElTimeline>
            </ElCard>
          </div>
        </ElTabPane>

        <ElTabPane label="聯絡人" name="contacts">
          <ElCard shadow="never" class="rounded-[28px] !border-slate-200">
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div class="flex flex-wrap items-center gap-3">
                <ElInput
                  v-model="contactFilters.keyword"
                  placeholder="搜尋姓名 / Email"
                  class="!w-[260px]"
                />
                <ElSelect v-model="contactFilters.primary" class="!w-[180px]">
                  <ElOption label="全部聯絡人" value="all" />
                  <ElOption label="主要聯絡人" value="yes" />
                  <ElOption label="非主要聯絡人" value="no" />
                </ElSelect>
              </div>
              <ElButton type="primary" @click="openCreateContactDrawer">
                新增聯絡人
              </ElButton>
            </div>

            <ElEmpty v-if="filteredContacts.length === 0" :description="EMPTY_STATE_COPY.contacts.title">
              <p class="mb-3 text-sm text-slate-500">
                {{ EMPTY_STATE_COPY.contacts.description }}
              </p>
              <ElButton type="primary" @click="openCreateContactDrawer">
                {{ EMPTY_STATE_COPY.contacts.action }}
              </ElButton>
            </ElEmpty>

            <ElTable v-else :data="filteredContacts" size="large">
              <ElTableColumn label="姓名" min-width="140" prop="name" />
              <ElTableColumn label="職稱" min-width="140" prop="role" />
              <ElTableColumn label="Email" min-width="220" prop="email" />
              <ElTableColumn label="電話 / 手機" min-width="160" prop="phone" />
              <ElTableColumn label="是否主要聯絡人" min-width="140">
                <template #default="{ row }">
                  <ElTag :type="row.isPrimary ? 'primary' : 'info'" round effect="light">
                    {{ row.isPrimary ? "是" : "否" }}
                  </ElTag>
                </template>
              </ElTableColumn>
              <ElTableColumn label="操作" width="220">
                <template #default="{ row }">
                  <div class="flex items-center gap-2">
                    <ElButton text type="primary" @click="notifyPlaceholder()">查看</ElButton>
                    <ElButton text @click="openEditContactDrawer(row)">編輯</ElButton>
                    <ElButton text :disabled="row.isPrimary" @click="handleSetPrimaryContact(row)">
                      設為主要
                    </ElButton>
                  </div>
                </template>
              </ElTableColumn>
            </ElTable>
          </ElCard>
        </ElTabPane>

        <ElTabPane label="商機" name="opportunities">
          <ElCard shadow="never" class="rounded-[28px] !border-slate-200">
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <ElInput
                v-model="opportunityKeyword"
                placeholder="搜尋商機名稱"
                class="!w-[280px]"
              />
              <ElButton type="primary" @click="notifyPlaceholder()">新增商機</ElButton>
            </div>

            <ElEmpty
              v-if="filteredOpportunities.length === 0"
              :description="EMPTY_STATE_COPY.opportunities.title"
            >
              <p class="mb-3 text-sm text-slate-500">
                {{ EMPTY_STATE_COPY.opportunities.description }}
              </p>
              <ElButton type="primary" @click="notifyPlaceholder()">
                {{ EMPTY_STATE_COPY.opportunities.action }}
              </ElButton>
            </ElEmpty>

            <ElTable v-else :data="filteredOpportunities" size="large">
              <ElTableColumn label="商機名稱" min-width="220" prop="name" />
              <ElTableColumn label="階段" min-width="140">
                <template #default="{ row }">
                  <ElTag
                    round
                    effect="light"
                    :type="opportunityStageMap[row.stage]?.type ?? 'info'"
                  >
                    {{ opportunityStageMap[row.stage]?.label ?? row.stage }}
                  </ElTag>
                </template>
              </ElTableColumn>
              <ElTableColumn label="預估金額" min-width="140">
                <template #default="{ row }">
                  {{ formatCurrency(row.amount) }}
                </template>
              </ElTableColumn>
              <ElTableColumn
                label="預計成交日"
                min-width="140"
                prop="expectedCloseDate"
              />
              <ElTableColumn label="負責人" min-width="120" prop="owner" />
              <ElTableColumn label="操作" width="180">
                <template #default="{ row }">
                  <div class="flex items-center gap-2">
                    <ElButton text type="primary" @click="notifyPlaceholder()">查看詳情</ElButton>
                    <ElButton text @click="notifyPlaceholder()">編輯</ElButton>
                  </div>
                </template>
              </ElTableColumn>
            </ElTable>
          </ElCard>
        </ElTabPane>

        <ElTabPane label="互動紀錄" name="activities">
          <ElCard shadow="never" class="rounded-[28px] !border-slate-200">
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div class="flex flex-wrap items-center gap-3">
                <ElSelect v-model="activityTypeFilter" class="!w-[180px]">
                  <ElOption
                    v-for="item in activityTypeOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </div>
              <ElButton type="primary" @click="notifyPlaceholder()">新增互動</ElButton>
            </div>

            <ElEmpty v-if="filteredActivities.length === 0" :description="EMPTY_STATE_COPY.activities.title">
              <p class="mb-3 text-sm text-slate-500">
                {{ EMPTY_STATE_COPY.activities.description }}
              </p>
              <ElButton type="primary" @click="notifyPlaceholder()">
                {{ EMPTY_STATE_COPY.activities.action }}
              </ElButton>
            </ElEmpty>

            <ElTable v-else :data="filteredActivities" size="large">
              <ElTableColumn label="類型" min-width="120" prop="type" />
              <ElTableColumn label="主題" min-width="240" prop="title" />
              <ElTableColumn label="負責人" min-width="120" prop="owner" />
              <ElTableColumn label="時間" min-width="160" prop="occurredAt" />
            </ElTable>
          </ElCard>
        </ElTabPane>

        <ElTabPane label="Timeline" name="timeline">
          <ElCard shadow="never" class="rounded-[28px] !border-slate-200">
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <ElSelect v-model="timelineFilter" class="!w-[180px]">
                <ElOption
                  v-for="item in timelineTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </div>

            <ElEmpty v-if="filteredTimeline.length === 0" :description="EMPTY_STATE_COPY.timeline.title">
              <p class="mb-3 text-sm text-slate-500">
                {{ EMPTY_STATE_COPY.timeline.description }}
              </p>
              <ElButton type="primary" @click="notifyPlaceholder()">
                {{ EMPTY_STATE_COPY.timeline.action }}
              </ElButton>
            </ElEmpty>

            <ElTimeline v-else>
              <ElTimelineItem
                v-for="item in filteredTimeline"
                :key="item.id"
                :timestamp="item.timestamp"
                placement="top"
              >
                <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <h4 class="font-medium text-slate-900">{{ item.title }}</h4>
                  <p class="mt-1 text-sm text-slate-600">{{ item.description }}</p>
                </div>
              </ElTimelineItem>
            </ElTimeline>
          </ElCard>
        </ElTabPane>
      </ElTabs>

      <AccountFormDialog
        v-model="formDialogOpen"
        mode="edit"
        :account="account"
        @submit="handleUpdateAccount"
      />

      <ContactFormDrawer
        v-model="contactFormOpen"
        :mode="contactFormMode"
        :contact="editingContact"
        :account-id="account?.id ?? null"
        :account-name="account?.companyName ?? null"
        @submit="handleSubmitContact"
      />
    </template>
  </div>
</template>
