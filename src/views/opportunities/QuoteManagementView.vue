<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  ElButton,
  ElDatePicker,
  ElDialog,
  ElDrawer,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElNotification,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";
import { CirclePlus, Filter, MoreFilled, Refresh, Search } from "@element-plus/icons-vue";
import { useAccountsStore } from "../../composables/useAccountsStore";
import { useOpportunitiesStore } from "../../composables/useOpportunitiesStore";
import { useUsersStore } from "../../composables/useUsersStore";
import {
  currencyOptions,
  pricingModelMap,
  pricingModelOptions,
  quoteList,
  quoteStatusMap,
  quoteStatusOptions,
} from "../../data/quotes";

const router = useRouter();
const { accounts, getAccountById } = useAccountsStore();
const { opportunities, getOpportunityById } = useOpportunitiesStore();
const { users, getUserName } = useUsersStore();

const quoteRecords = ref(cloneRecords(quoteList));
const filterPanelOpen = ref(true);
const viewingQuote = ref(null);
const quoteDrawerOpen = ref(false);
const quoteFormDrawerOpen = ref(false);
const quoteFormMode = ref("create");
const editingQuoteId = ref("");
const statusDialogOpen = ref(false);
const statusTargetId = ref("");
const currentPage = ref(1);
const pageSize = ref(10);

const filters = reactive({
  keyword: "",
  status: "all",
  pricingModel: "all",
  accountId: "all",
  opportunityId: "all",
  preparedByUserId: "all",
  quoteDateRange: [],
  validUntilRange: [],
});

const statusForm = reactive({
  nextStatus: "submitted",
});

const quoteStatusFilterOptions = quoteStatusOptions;

const accountOptions = computed(() => [
  { label: "全部客戶", value: "all" },
  ...accounts.value.map((account) => ({
    label: account.companyName,
    value: account.id,
  })),
]);

const opportunityOptions = computed(() => [
  { label: "全部商機", value: "all" },
  ...opportunities.value.map((opportunity) => ({
    label: `${opportunity.opportunityCode} · ${opportunity.name}`,
    value: opportunity.id,
  })),
]);

const preparedByOptions = computed(() => [
  { label: "全部人員", value: "all" },
  ...users.value
    .filter((user) => user.status === "active")
    .map((user) => ({
      label: user.name,
      value: user.id,
    })),
]);

const quoteForm = reactive(createEmptyQuoteForm());

const filteredQuotes = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();
  const [quoteStart, quoteEnd] = filters.quoteDateRange ?? [];
  const [validStart, validEnd] = filters.validUntilRange ?? [];
  const quoteStartTime = quoteStart ? startOfDayTimestamp(quoteStart) : null;
  const quoteEndTime = quoteEnd ? endOfDayTimestamp(quoteEnd) : null;
  const validStartTime = validStart ? startOfDayTimestamp(validStart) : null;
  const validEndTime = validEnd ? endOfDayTimestamp(validEnd) : null;

  return quoteRecords.value.filter((record) => {
    const resolvedStatus = getDisplayStatus(record);
    const matchesKeyword =
      keyword.length === 0 ||
      record.quoteCode.toLowerCase().includes(keyword) ||
      record.opportunityName.toLowerCase().includes(keyword) ||
      record.accountName.toLowerCase().includes(keyword);
    const matchesStatus = filters.status === "all" || resolvedStatus === filters.status;
    const matchesPricingModel =
      filters.pricingModel === "all" || record.pricingModel === filters.pricingModel;
    const matchesAccount =
      filters.accountId === "all" || record.accountId === filters.accountId;
    const matchesOpportunity =
      filters.opportunityId === "all" || record.opportunityId === filters.opportunityId;
    const matchesPreparedBy =
      filters.preparedByUserId === "all" ||
      record.preparedByUserId === filters.preparedByUserId;
    const quoteDateTime = startOfDayTimestamp(record.quoteDate);
    const validUntilTime = startOfDayTimestamp(record.validUntil);
    const matchesQuoteDateRange =
      !quoteStartTime ||
      !quoteEndTime ||
      (quoteDateTime >= quoteStartTime && quoteDateTime <= quoteEndTime);
    const matchesValidUntilRange =
      !validStartTime ||
      !validEndTime ||
      (validUntilTime >= validStartTime && validUntilTime <= validEndTime);

    return (
      matchesKeyword &&
      matchesStatus &&
      matchesPricingModel &&
      matchesAccount &&
      matchesOpportunity &&
      matchesPreparedBy &&
      matchesQuoteDateRange &&
      matchesValidUntilRange
    );
  });
});

const sortedQuotes = computed(() => {
  return [...filteredQuotes.value].sort((left, right) => {
    const leftQuoteTime = startOfDayTimestamp(left.quoteDate);
    const rightQuoteTime = startOfDayTimestamp(right.quoteDate);

    if (leftQuoteTime !== rightQuoteTime) {
      return rightQuoteTime - leftQuoteTime;
    }

    if (left.quoteCode !== right.quoteCode) {
      return left.quoteCode.localeCompare(right.quoteCode);
    }

    return (right.version ?? 0) - (left.version ?? 0);
  });
});

const pagedQuotes = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedQuotes.value.slice(start, start + pageSize.value);
});

const summaryCards = computed(() => {
  const records = quoteRecords.value;

  return [
    {
      label: "全部報價數",
      value: records.length,
      note: "包含所有版本",
    },
    {
      label: "草稿報價數",
      value: records.filter((record) => record.status === "draft").length,
      note: "可直接編輯",
    },
    {
      label: "已送出報價數",
      value: records.filter((record) => getDisplayStatus(record) === "submitted").length,
      note: "等待客戶回覆",
    },
    {
      label: "即將到期報價數",
      value: records.filter((record) => isQuoteExpiringSoon(record)).length,
      note: "7 天內需追蹤",
    },
  ];
});

const sameQuoteVersions = computed(() => {
  if (!viewingQuote.value) {
    return [];
  }

  return quoteRecords.value
    .filter((record) => record.quoteCode === viewingQuote.value.quoteCode)
    .sort((left, right) => (left.version ?? 0) - (right.version ?? 0));
});

const currentEmptyState = computed(() => {
  if (quoteRecords.value.length === 0) {
    return {
      title: "尚無報價資料",
      description: "先建立第一筆報價，開始管理版本、狀態與有效期限。",
      action: "新增報價",
    };
  }

  if (hasActiveFilters.value) {
    return {
      title: "找不到符合條件的報價",
      description: "請調整搜尋或篩選條件，或重設後重新檢視。",
      action: "重設篩選",
    };
  }

  return {
    title: "目前沒有可顯示的報價",
    description: "系統會在這裡呈現報價版本、狀態與有效期限資訊。",
    action: "新增報價",
  };
});

const hasActiveFilters = computed(() => {
  return (
    filters.keyword.trim().length > 0 ||
    filters.status !== "all" ||
    filters.pricingModel !== "all" ||
    filters.accountId !== "all" ||
    filters.opportunityId !== "all" ||
    filters.preparedByUserId !== "all" ||
    (filters.quoteDateRange?.length ?? 0) > 0 ||
    (filters.validUntilRange?.length ?? 0) > 0
  );
});

watch(
  () => quoteForm.opportunityId,
  (nextOpportunityId) => {
    const opportunity = getOpportunityById(nextOpportunityId);
    quoteForm.accountId = opportunity?.accountId ?? "";
  },
  { immediate: true }
);

watch(
  () => [
    filters.keyword,
    filters.status,
    filters.pricingModel,
    filters.accountId,
    filters.opportunityId,
    filters.preparedByUserId,
    filters.quoteDateRange,
    filters.validUntilRange,
    pageSize.value,
  ],
  () => {
    currentPage.value = 1;
  }
);

watch(
  () => sortedQuotes.value.length,
  (length) => {
    const maxPage = Math.max(1, Math.ceil(length / pageSize.value));
    if (currentPage.value > maxPage) {
      currentPage.value = maxPage;
    }
  }
);

function cloneRecords(records) {
  if (typeof structuredClone === "function") {
    return structuredClone(records);
  }

  return JSON.parse(JSON.stringify(records));
}

function getCurrentTimestamp() {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function formatDateInput(value = new Date()) {
  const nextValue = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(nextValue);
}

function addDays(value, days) {
  const nextValue = new Date(value);
  nextValue.setDate(nextValue.getDate() + days);
  return nextValue;
}

function startOfDayTimestamp(value) {
  if (!value) {
    return 0;
  }

  const nextValue = new Date(value);
  nextValue.setHours(0, 0, 0, 0);
  return nextValue.getTime();
}

function endOfDayTimestamp(value) {
  if (!value) {
    return 0;
  }

  const nextValue = new Date(value);
  nextValue.setHours(23, 59, 59, 999);
  return nextValue.getTime();
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

function formatCurrency(value, currencyCode = "TWD") {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function getDisplayStatus(record) {
  if (record.status === "submitted" && isQuoteExpired(record)) {
    return "expired";
  }

  return record.status;
}

function getDisplayStatusMeta(record) {
  return quoteStatusMap[getDisplayStatus(record)] ?? quoteStatusMap.draft;
}

function isQuoteExpired(record) {
  if (record.status !== "submitted") {
    return record.status === "expired";
  }

  return endOfDayTimestamp(record.validUntil) < Date.now();
}

function isQuoteExpiringSoon(record) {
  if (record.status !== "submitted") {
    return false;
  }

  const today = startOfDayTimestamp(new Date());
  const validUntil = startOfDayTimestamp(record.validUntil);
  const diffDays = Math.floor((validUntil - today) / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= 7;
}

function getNextQuoteCode() {
  const maxNumber = quoteRecords.value.reduce((currentMax, record) => {
    const numericMatch = String(record.quoteCode ?? "").match(/-(\d+)$/);
    const numericPart = numericMatch ? Number(numericMatch[1]) : Number.NaN;
    return Number.isNaN(numericPart) ? currentMax : Math.max(currentMax, numericPart);
  }, 0);

  return `Q-${new Date().getFullYear()}-${String(maxNumber + 1).padStart(3, "0")}`;
}

function getNextQuoteVersion(quoteCode) {
  return (
    quoteRecords.value
      .filter((record) => record.quoteCode === quoteCode)
      .reduce(
        (maxVersion, record) => Math.max(maxVersion, Number(record.version ?? 0)),
        0
      ) + 1
  );
}

function getQuoteRecordPayload(formData) {
  const opportunity = getOpportunityById(formData.opportunityId);
  const account = getAccountById(opportunity?.accountId ?? formData.accountId);
  const preparedByName = getUserName(formData.preparedByUserId);

  return {
    opportunityId: formData.opportunityId,
    opportunityName: opportunity?.name ?? "-",
    accountId: opportunity?.accountId ?? formData.accountId,
    accountName: account?.companyName ?? "-",
    version: Number(formData.version ?? 1),
    quoteDate: formData.quoteDate,
    validUntil: formData.validUntil,
    totalAmount: Number(formData.totalAmount ?? 0),
    currencyCode: formData.currencyCode,
    pricingModel: formData.pricingModel,
    preparedByUserId: formData.preparedByUserId,
    preparedByName,
    description: formData.description?.trim() ?? "",
  };
}

function resetFilters() {
  filters.keyword = "";
  filters.status = "all";
  filters.pricingModel = "all";
  filters.accountId = "all";
  filters.opportunityId = "all";
  filters.preparedByUserId = "all";
  filters.quoteDateRange = [];
  filters.validUntilRange = [];
}

function toggleFilterPanel() {
  filterPanelOpen.value = !filterPanelOpen.value;
}

function notifyPlaceholder(message = "此功能將於下一階段開放。") {
  ElNotification({
    title: "即將開放",
    message,
    type: "info",
    position: "top-right",
  });
}

function openCreateDrawer() {
  quoteFormMode.value = "create";
  editingQuoteId.value = "";
  Object.assign(quoteForm, createEmptyQuoteForm());
  quoteFormDrawerOpen.value = true;
}

function openCloneDrawer(record) {
  quoteFormMode.value = "clone";
  editingQuoteId.value = "";
  Object.assign(quoteForm, buildFormFromQuote(record, true));
  quoteFormDrawerOpen.value = true;
}

function openEditDrawer(record) {
  if (getDisplayStatus(record) !== "draft") {
    notifyPlaceholder("已送出的報價請改用「複製建立新版本」處理。");
    return;
  }

  quoteFormMode.value = "edit";
  editingQuoteId.value = record.id;
  Object.assign(quoteForm, buildFormFromQuote(record, false));
  quoteFormDrawerOpen.value = true;
}

function openViewDrawer(record) {
  viewingQuote.value = record;
  quoteDrawerOpen.value = true;
}

function openStatusDialog(record) {
  statusTargetId.value = record.id;
  statusForm.nextStatus = getDisplayStatus(record);
  statusDialogOpen.value = true;
}

function buildFormFromQuote(record, isClone = false) {
  const nextQuoteDate = formatDateInput(new Date());
  const preservedValidUntil =
    record.validUntil || formatDateInput(addDays(new Date(), 30));

  return {
    quoteCode: record.quoteCode,
    opportunityId: record.opportunityId,
    accountId: record.accountId,
    version: isClone
      ? getNextQuoteVersion(record.quoteCode)
      : Number(record.version ?? 1),
    quoteDate: isClone ? nextQuoteDate : record.quoteDate,
    validUntil: isClone ? preservedValidUntil : record.validUntil,
    totalAmount: Number(record.totalAmount ?? 0),
    currencyCode: record.currencyCode,
    pricingModel: record.pricingModel,
    preparedByUserId: record.preparedByUserId,
    description: record.description ?? "",
  };
}

function createEmptyQuoteForm() {
  const firstOpportunity = opportunities.value[0];
  const firstUser = users.value.find((user) => user.status === "active");

  return {
    quoteCode: getNextQuoteCode(),
    opportunityId: firstOpportunity?.id ?? "",
    accountId: firstOpportunity?.accountId ?? "",
    version: 1,
    quoteDate: formatDateInput(new Date()),
    validUntil: formatDateInput(addDays(new Date(), 30)),
    totalAmount: 0,
    currencyCode: "TWD",
    pricingModel: "fixed",
    preparedByUserId: firstUser?.id ?? "",
    description: "",
  };
}

function saveQuoteForm() {
  if (!quoteForm.opportunityId) {
    ElNotification({
      title: "缺少資訊",
      message: "請先選擇關聯商機。",
      type: "warning",
      position: "top-right",
    });
    return;
  }

  if (!quoteForm.quoteDate || !quoteForm.validUntil) {
    ElNotification({
      title: "缺少資訊",
      message: "請補上報價日期與有效期限。",
      type: "warning",
      position: "top-right",
    });
    return;
  }

  if (
    startOfDayTimestamp(quoteForm.validUntil) < startOfDayTimestamp(quoteForm.quoteDate)
  ) {
    ElNotification({
      title: "日期不正確",
      message: "有效期限不可早於報價日期。",
      type: "warning",
      position: "top-right",
    });
    return;
  }

  if (!quoteForm.preparedByUserId) {
    ElNotification({
      title: "缺少資訊",
      message: "請選擇 Prepared By。",
      type: "warning",
      position: "top-right",
    });
    return;
  }

  if (Number(quoteForm.totalAmount) <= 0) {
    ElNotification({
      title: "缺少資訊",
      message: "請輸入大於 0 的總金額。",
      type: "warning",
      position: "top-right",
    });
    return;
  }

  if (quoteFormMode.value === "edit" && editingQuoteId.value) {
    const targetRecord = quoteRecords.value.find(
      (record) => record.id === editingQuoteId.value
    );

    if (!targetRecord) {
      return;
    }

    Object.assign(targetRecord, getQuoteRecordPayload(quoteForm), {
      quoteCode: quoteForm.quoteCode,
      createdAt: targetRecord.createdAt,
      updatedAt: getCurrentTimestamp(),
      status: targetRecord.status,
    });

    ElNotification({
      title: "已更新",
      message: `${targetRecord.quoteCode} v${targetRecord.version} 已完成更新。`,
      type: "success",
      position: "top-right",
    });
  } else {
    const nextRecord = {
      id: `q-${Date.now()}`,
      quoteCode: quoteForm.quoteCode || getNextQuoteCode(),
      status: "draft",
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      ...getQuoteRecordPayload(quoteForm),
    };

    quoteRecords.value.unshift(nextRecord);

    ElNotification({
      title: "已建立",
      message: `${nextRecord.quoteCode} v${nextRecord.version} 已新增為草稿。`,
      type: "success",
      position: "top-right",
    });
  }

  quoteFormDrawerOpen.value = false;
}

function submitStatusUpdate() {
  if (!statusTargetId.value) {
    return;
  }

  const targetRecord = quoteRecords.value.find(
    (record) => record.id === statusTargetId.value
  );

  if (!targetRecord) {
    return;
  }

  targetRecord.status = statusForm.nextStatus;
  targetRecord.updatedAt = getCurrentTimestamp();

  ElNotification({
    title: "已更新",
    message: `${targetRecord.quoteCode} 狀態已調整為 ${
      quoteStatusMap[getDisplayStatus(targetRecord)]?.label ?? targetRecord.status
    }。`,
    type: "success",
    position: "top-right",
  });

  statusDialogOpen.value = false;
}

function handleRowCommand(command, record) {
  if (command === "copy-version") {
    openCloneDrawer(record);
    return;
  }

  if (command === "update-status") {
    openStatusDialog(record);
    return;
  }

  if (command === "create-contract") {
    notifyPlaceholder("建立合約流程將於下一階段開放。");
    return;
  }

  notifyPlaceholder();
}

function jumpToOpportunity(record) {
  router.push({
    name: "opportunity-detail",
    params: { opportunityId: record.opportunityId },
  });
}

function jumpToAccount(record) {
  router.push({
    name: "account-detail",
    params: { accountId: record.accountId },
  });
}
</script>

<template>
  <div class="min-h-full bg-slate-50 p-8">
    <section class="grid gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-2">
          <h1 class="text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-900">
            報價管理
          </h1>
          <p class="max-w-3xl text-sm text-slate-500">
            管理商機報價、版本、狀態與有效期限，從提案到合約前保持清楚的報價脈絡。
          </p>
        </div>

        <ElButton type="primary" :icon="CirclePlus" @click="openCreateDrawer">
          新增報價
        </ElButton>
      </div>

      <div class="grid gap-4 xl:grid-cols-4">
        <section
          v-for="card in summaryCards"
          :key="card.label"
          class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div class="grid gap-2">
            <p class="text-sm font-medium text-slate-500">{{ card.label }}</p>
            <p class="text-[2rem] font-semibold tracking-[-0.04em] text-slate-900">
              {{ card.value }}
            </p>
            <p class="text-xs text-slate-400">{{ card.note }}</p>
          </div>
        </section>
      </div>

      <section
        class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div
          class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5"
        >
          <div class="grid gap-1">
            <h2 class="text-base font-semibold text-slate-900">搜尋與篩選</h2>
            <p class="text-sm text-slate-500">
              從報價單號、商機、客戶與版本狀態快速縮小範圍。
            </p>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-3">
            <ElInput
              v-model="filters.keyword"
              placeholder="搜尋報價單號 / 商機名稱 / 客戶名稱"
              :prefix-icon="Search"
              clearable
              class="!w-[340px] max-[760px]:!w-full"
            />

            <ElButton
              :icon="Filter"
              :type="!filterPanelOpen ? 'primary' : 'default'"
              @click="toggleFilterPanel"
            >
              Filter
            </ElButton>
          </div>
        </div>

        <transition
          enter-active-class="transition-all duration-300 ease-out"
          leave-active-class="transition-all duration-200 ease-in"
          enter-from-class="max-h-0 opacity-0"
          enter-to-class="max-h-80 opacity-100"
          leave-from-class="max-h-80 opacity-100"
          leave-to-class="max-h-0 opacity-0"
        >
          <div
            v-if="!filterPanelOpen"
            class="overflow-hidden border-b border-slate-200 bg-white px-6 py-4"
          >
            <div class="grid gap-4 xl:grid-cols-[repeat(8,minmax(0,1fr))]">
              <ElSelect v-model="filters.status">
                <ElOption
                  v-for="item in quoteStatusFilterOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.pricingModel">
                <ElOption
                  v-for="item in pricingModelOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
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

              <ElSelect v-model="filters.opportunityId" filterable>
                <ElOption
                  v-for="item in opportunityOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.preparedByUserId" filterable>
                <ElOption
                  v-for="item in preparedByOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElDatePicker
                v-model="filters.quoteDateRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                range-separator="至"
                start-placeholder="報價開始"
                end-placeholder="報價結束"
                class="!w-full"
              />

              <ElDatePicker
                v-model="filters.validUntilRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                range-separator="至"
                start-placeholder="有效開始"
                end-placeholder="有效結束"
                class="!w-full"
              />

              <ElButton :icon="Refresh" @click="resetFilters">重設</ElButton>
            </div>
          </div>
        </transition>
      </section>

      <ElEmpty
        v-if="quoteRecords.length === 0"
        description="尚無報價資料"
        class="rounded-2xl border border-slate-200 bg-white py-20"
      >
        <p class="mb-3 text-sm text-slate-500">
          建立第一筆報價，開始管理版本、有效期限與後續合約銜接。
        </p>
        <ElButton type="primary" @click="openCreateDrawer">新增報價</ElButton>
      </ElEmpty>

      <ElEmpty
        v-else-if="sortedQuotes.length === 0"
        :description="currentEmptyState.title"
        class="rounded-2xl border border-slate-200 bg-white py-20"
      >
        <p class="mb-3 text-sm text-slate-500">{{ currentEmptyState.description }}</p>
        <ElButton v-if="hasActiveFilters" type="primary" @click="resetFilters">
          {{ currentEmptyState.action }}
        </ElButton>
        <ElButton v-else type="primary" @click="openCreateDrawer">
          {{ currentEmptyState.action }}
        </ElButton>
      </ElEmpty>

      <section
        v-else
        class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div
          class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4"
        >
          <div class="grid gap-1">
            <h2 class="text-base font-semibold text-slate-900">Quote Table</h2>
            <p class="text-sm text-slate-500">
              保留版本、狀態與有效期限，方便從報價一路追到合約。
            </p>
          </div>

          <ElTag round effect="plain">共 {{ sortedQuotes.length }} 筆</ElTag>
        </div>

        <ElTable :data="pagedQuotes" size="large" table-layout="auto">
          <ElTableColumn label="報價單號" min-width="180">
            <template #default="{ row }">
              <button
                type="button"
                class="text-left text-sm font-semibold text-slate-900 hover:text-[#409eff]"
                @click="openViewDrawer(row)"
              >
                {{ row.quoteCode }}
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="商機" min-width="240">
            <template #default="{ row }">
              <button
                type="button"
                class="text-left text-sm font-medium text-[#409eff] hover:text-[#337ecc]"
                @click="jumpToOpportunity(row)"
              >
                {{ row.opportunityName }}
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="客戶" min-width="220">
            <template #default="{ row }">
              <button
                type="button"
                class="text-left text-sm font-medium text-[#409eff] hover:text-[#337ecc]"
                @click="jumpToAccount(row)"
              >
                {{ row.accountName }}
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="版本" min-width="90">
            <template #default="{ row }"> v{{ row.version }} </template>
          </ElTableColumn>

          <ElTableColumn label="定價模式" min-width="120">
            <template #default="{ row }">
              <ElTag
                round
                effect="light"
                :type="pricingModelMap[row.pricingModel]?.type ?? 'info'"
              >
                {{ pricingModelMap[row.pricingModel]?.label ?? row.pricingModel }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="總金額" min-width="150">
            <template #default="{ row }">
              {{ formatCurrency(row.totalAmount, row.currencyCode) }}
            </template>
          </ElTableColumn>

          <ElTableColumn label="報價日期" min-width="130">
            <template #default="{ row }">{{ formatDate(row.quoteDate) }}</template>
          </ElTableColumn>

          <ElTableColumn label="有效期限" min-width="160">
            <template #default="{ row }">
              <div class="grid gap-1">
                <span>{{ formatDate(row.validUntil) }}</span>
                <ElTag
                  v-if="isQuoteExpiringSoon(row)"
                  round
                  effect="light"
                  type="warning"
                  class="w-fit"
                >
                  即將到期
                </ElTag>
                <ElTag
                  v-else-if="isQuoteExpired(row)"
                  round
                  effect="light"
                  type="danger"
                  class="w-fit"
                >
                  已過期
                </ElTag>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="狀態" min-width="120">
            <template #default="{ row }">
              <ElTag
                round
                effect="light"
                :type="getDisplayStatusMeta(row)?.type ?? 'info'"
              >
                {{ getDisplayStatusMeta(row)?.label ?? row.status }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="Prepared By" min-width="140" prop="preparedByName" />

          <ElTableColumn label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <div class="flex items-center justify-end gap-1">
                <ElButton text type="primary" @click="openViewDrawer(row)">查看</ElButton>
                <ElButton text @click="openEditDrawer(row)">編輯</ElButton>
                <ElDropdown
                  trigger="click"
                  @command="(command) => handleRowCommand(command, row)"
                >
                  <ElButton text :icon="MoreFilled"></ElButton>
                  <template #dropdown>
                    <ElDropdownMenu>
                      <ElDropdownItem command="copy-version">
                        複製建立新版本
                      </ElDropdownItem>
                      <ElDropdownItem command="update-status">更新狀態</ElDropdownItem>
                      <ElDropdownItem command="create-contract">建立合約</ElDropdownItem>
                      <ElDropdownItem command="more">更多</ElDropdownItem>
                    </ElDropdownMenu>
                  </template>
                </ElDropdown>
              </div>
            </template>
          </ElTableColumn>
        </ElTable>

        <div
          class="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-5 max-[760px]:px-4"
        >
          <ElPagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            layout="total, prev, pager, next"
            :total="sortedQuotes.length"
            background
          />

          <ElSelect v-model="pageSize" class="!w-[96px]" @change="currentPage = 1">
            <ElOption :value="10" label="10 Item" />
            <ElOption :value="20" label="20 Item" />
            <ElOption :value="50" label="50 Item" />
          </ElSelect>
        </div>
      </section>
    </section>

    <ElDrawer v-model="quoteDrawerOpen" size="48%" :with-header="false">
      <template v-if="viewingQuote">
        <div class="flex h-full flex-col">
          <div class="border-b border-slate-200 px-6 py-5">
            <div class="flex items-start justify-between gap-4">
              <div class="grid gap-2">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-xl font-semibold tracking-[-0.03em] text-slate-900">
                    {{ viewingQuote.quoteCode }} v{{ viewingQuote.version }}
                  </h3>
                  <ElTag
                    round
                    effect="light"
                    :type="getDisplayStatusMeta(viewingQuote).type"
                  >
                    {{ getDisplayStatusMeta(viewingQuote).label }}
                  </ElTag>
                </div>
                <p class="text-sm text-slate-500">
                  {{ viewingQuote.opportunityName }} · {{ viewingQuote.accountName }}
                </p>
              </div>

              <ElButton @click="quoteDrawerOpen = false">關閉</ElButton>
            </div>
          </div>

          <div class="grid gap-5 overflow-y-auto px-6 py-5">
            <section
              class="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div class="grid gap-1">
                <p class="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  Summary
                </p>
                <p class="text-sm text-slate-600">
                  {{ viewingQuote.description || "-" }}
                </p>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div class="rounded-2xl bg-white p-4">
                  <p class="text-xs text-slate-400">總金額</p>
                  <p class="mt-1 text-lg font-semibold text-slate-900">
                    {{
                      formatCurrency(viewingQuote.totalAmount, viewingQuote.currencyCode)
                    }}
                  </p>
                </div>
                <div class="rounded-2xl bg-white p-4">
                  <p class="text-xs text-slate-400">Prepared By</p>
                  <p class="mt-1 text-lg font-semibold text-slate-900">
                    {{ viewingQuote.preparedByName }}
                  </p>
                </div>
              </div>
            </section>

            <section class="grid gap-4 rounded-2xl border border-slate-200 p-4">
              <h4 class="text-sm font-semibold text-slate-900">報價資訊</h4>
              <div class="grid gap-3 sm:grid-cols-2">
                <div class="grid gap-1">
                  <span class="text-xs text-slate-400">報價日期</span>
                  <span class="text-sm text-slate-700">{{
                    formatDate(viewingQuote.quoteDate)
                  }}</span>
                </div>
                <div class="grid gap-1">
                  <span class="text-xs text-slate-400">有效期限</span>
                  <span class="text-sm text-slate-700">
                    {{ formatDate(viewingQuote.validUntil) }}
                  </span>
                </div>
                <div class="grid gap-1">
                  <span class="text-xs text-slate-400">定價模式</span>
                  <span class="text-sm text-slate-700">
                    {{
                      pricingModelMap[viewingQuote.pricingModel]?.label ??
                      viewingQuote.pricingModel
                    }}
                  </span>
                </div>
                <div class="grid gap-1">
                  <span class="text-xs text-slate-400">版本</span>
                  <span class="text-sm text-slate-700">v{{ viewingQuote.version }}</span>
                </div>
              </div>
            </section>

            <section class="grid gap-4 rounded-2xl border border-slate-200 p-4">
              <h4 class="text-sm font-semibold text-slate-900">版本紀錄</h4>
              <div class="grid gap-2">
                <div
                  v-for="item in sameQuoteVersions"
                  :key="item.id"
                  class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                >
                  <div class="grid gap-1">
                    <span class="text-sm font-medium text-slate-900"
                      >v{{ item.version }}</span
                    >
                    <span class="text-xs text-slate-400">
                      {{ formatDate(item.quoteDate) }} · {{ formatDate(item.validUntil) }}
                    </span>
                  </div>
                  <ElTag round effect="light" :type="getDisplayStatusMeta(item).type">
                    {{ getDisplayStatusMeta(item).label }}
                  </ElTag>
                </div>
              </div>
            </section>
          </div>

          <div class="border-t border-slate-200 px-6 py-4">
            <div class="flex flex-wrap items-center justify-end gap-3">
              <ElButton @click="notifyPlaceholder('報價建立合約功能將於下一階段開放。')">
                建立合約
              </ElButton>
              <ElButton @click="openCloneDrawer(viewingQuote)">複製建立新版本</ElButton>
              <ElButton
                v-if="getDisplayStatus(viewingQuote) === 'draft'"
                type="primary"
                @click="openEditDrawer(viewingQuote)"
              >
                編輯
              </ElButton>
              <ElButton v-else type="primary" @click="openStatusDialog(viewingQuote)">
                更新狀態
              </ElButton>
            </div>
          </div>
        </div>
      </template>
    </ElDrawer>

    <ElDrawer v-model="quoteFormDrawerOpen" size="44%" :with-header="false">
      <div class="flex h-full flex-col">
        <div class="border-b border-slate-200 px-6 py-5">
          <div class="flex items-start justify-between gap-4">
            <div class="grid gap-2">
              <h3 class="text-xl font-semibold tracking-[-0.03em] text-slate-900">
                {{
                  quoteFormMode === "edit"
                    ? "編輯報價"
                    : quoteFormMode === "clone"
                    ? "建立新版本"
                    : "新增報價"
                }}
              </h3>
              <p class="text-sm text-slate-500">
                草稿可直接編輯；送出後請透過「複製建立新版本」延續提案。
              </p>
            </div>

            <ElButton @click="quoteFormDrawerOpen = false">關閉</ElButton>
          </div>
        </div>

        <div class="overflow-y-auto px-6 py-5">
          <ElForm label-position="top" class="grid gap-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <ElFormItem label="報價單號">
                <ElInput v-model="quoteForm.quoteCode" disabled />
              </ElFormItem>

              <ElFormItem label="版本">
                <ElInput :model-value="`v${quoteForm.version}`" disabled />
              </ElFormItem>
            </div>

            <ElFormItem label="關聯商機" required>
              <ElSelect v-model="quoteForm.opportunityId" filterable class="!w-full">
                <ElOption
                  v-for="item in opportunityOptions.filter(
                    (option) => option.value !== 'all'
                  )"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="關聯客戶">
              <ElInput
                :model-value="
                  getOpportunityById(quoteForm.opportunityId)?.accountName ||
                  getAccountById(quoteForm.accountId)?.companyName ||
                  '-'
                "
                disabled
              />
            </ElFormItem>

            <div class="grid gap-4 sm:grid-cols-2">
              <ElFormItem label="報價日期" required>
                <ElDatePicker
                  v-model="quoteForm.quoteDate"
                  value-format="YYYY-MM-DD"
                  class="!w-full"
                />
              </ElFormItem>

              <ElFormItem label="有效期限" required>
                <ElDatePicker
                  v-model="quoteForm.validUntil"
                  value-format="YYYY-MM-DD"
                  class="!w-full"
                />
              </ElFormItem>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <ElFormItem label="總金額" required>
                <ElInputNumber
                  v-model="quoteForm.totalAmount"
                  :min="0"
                  :step="100000"
                  controls-position="right"
                  class="!w-full"
                />
              </ElFormItem>

              <ElFormItem label="幣別" required>
                <ElSelect v-model="quoteForm.currencyCode" class="!w-full">
                  <ElOption
                    v-for="item in currencyOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <ElFormItem label="定價模式" required>
                <ElSelect v-model="quoteForm.pricingModel" class="!w-full">
                  <ElOption
                    v-for="item in pricingModelOptions.filter(
                      (option) => option.value !== 'all'
                    )"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>

              <ElFormItem label="Prepared By" required>
                <ElSelect v-model="quoteForm.preparedByUserId" filterable class="!w-full">
                  <ElOption
                    v-for="item in preparedByOptions.filter(
                      (option) => option.value !== 'all'
                    )"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
            </div>

            <ElFormItem label="狀態">
              <div
                class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
              >
                草稿由此頁建立，送出 / 接受 / 拒絕 / 過期請使用右側更新狀態操作。
              </div>
            </ElFormItem>

            <ElFormItem label="說明">
              <ElInput
                v-model="quoteForm.description"
                type="textarea"
                :rows="4"
                placeholder="可輸入報價摘要、協商重點或補充說明"
              />
            </ElFormItem>
          </ElForm>
        </div>

        <div class="border-t border-slate-200 px-6 py-4">
          <div class="flex items-center justify-end gap-3">
            <ElButton @click="quoteFormDrawerOpen = false">取消</ElButton>
            <ElButton type="primary" @click="saveQuoteForm">
              {{ quoteFormMode === "edit" ? "儲存變更" : "建立報價" }}
            </ElButton>
          </div>
        </div>
      </div>
    </ElDrawer>

    <ElDialog v-model="statusDialogOpen" title="更新報價狀態" width="520px">
      <ElForm label-position="top" class="grid gap-4">
        <ElFormItem label="狀態">
          <ElSelect v-model="statusForm.nextStatus" class="!w-full">
            <ElOption
              v-for="item in quoteStatusFilterOptions.filter(
                (option) => option.value !== 'all'
              )"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="flex items-center justify-end gap-3">
          <ElButton @click="statusDialogOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitStatusUpdate">確認</ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>
