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
  ElMessageBox,
  ElNotification,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
} from "element-plus";
import {
  Download,
  Filter,
  MoreFilled,
  Refresh,
  Search,
  Setting,
} from "@element-plus/icons-vue";
import {
  commissionTypeMap,
  cooperationModeMap,
  currencyOptions,
  dateFieldOptions,
  settlementCycleMap,
  settlementStatusFlow,
  settlementStatusMap,
  sourceTypeMap,
} from "../../data/partnerSettlements";
import { usePartnerSettlementStore } from "../../composables/usePartnerSettlementStore";

const route = useRoute();
const router = useRouter();
const {
  settlements,
  batchSetSettlementStatus,
  cancelSettlement,
  markAsException,
  markAsSettled,
  markInvoiceDone,
  markReconciliationDone,
} = usePartnerSettlementStore();

const loading = ref(false);
const filterPanelOpen = ref(false);
const activeStatusTab = ref(
  typeof route.query.status === "string" && settlementStatusMap[route.query.status]
    ? route.query.status
    : "all"
);
const selectedRows = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const sortState = reactive({
  prop: "updatedAt",
  order: "descending",
});

const batchStatusDrawerOpen = ref(false);
const batchStatusForm = reactive({
  status: "pending_reconciliation",
  reason: "",
});

const filters = reactive({
  keyword: "",
  partnerId: typeof route.query.partnerId === "string" ? route.query.partnerId : "all",
  sourceType: "all",
  commissionType: "all",
  cooperationMode: "all",
  ownerId: "all",
  dateField: "recognizedAt",
  dateRange: [],
  settlementCycle: "all",
  hasException: "all",
  isInvoiced: "all",
  isSettled: "all",
  currency: "all",
});

function applyPartnerQueryFilter() {
  if (route.name !== "partners-settlement") {
    return;
  }

  if (typeof route.query.partnerId === "string" && route.query.partnerId) {
    filters.partnerId = route.query.partnerId;
  }
}

const yesNoOptions = [
  { label: "全部", value: "all" },
  { label: "是", value: "yes" },
  { label: "否", value: "no" },
];

const statusTabOptions = [
  { value: "all", label: "全部" },
  ...settlementStatusFlow.map((status) => ({
    value: status,
    label: settlementStatusMap[status]?.label ?? status,
  })),
  { value: "cancelled", label: settlementStatusMap.cancelled.label },
  { value: "exception", label: settlementStatusMap.exception.label },
];

const batchStatusOptions = computed(() =>
  statusTabOptions.filter((item) => item.value !== "all")
);

const partnerOptions = computed(() => {
  const unique = new Map();

  settlements.value.forEach((item) => {
    unique.set(item.partnerId, item.partnerName);
  });

  return [
    { label: "全部夥伴", value: "all" },
    ...[...unique.entries()].map(([value, label]) => ({ label, value })),
  ];
});

const ownerOptions = computed(() => {
  const unique = new Map();

  settlements.value.forEach((item) => {
    unique.set(item.ownerId, item.ownerName);
  });

  return [
    { label: "全部負責人", value: "all" },
    ...[...unique.entries()].map(([value, label]) => ({ label, value })),
  ];
});

const sourceTypeOptions = computed(() => [
  { label: "全部來源", value: "all" },
  ...Object.entries(sourceTypeMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
]);

const commissionTypeOptions = computed(() => [
  { label: "全部分潤類型", value: "all" },
  ...Object.entries(commissionTypeMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
]);

const cooperationModeOptions = computed(() => [
  { label: "全部合作模式", value: "all" },
  ...Object.entries(cooperationModeMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
]);

const settlementCycleOptions = computed(() => [
  { label: "全部結算週期", value: "all" },
  ...Object.entries(settlementCycleMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
]);

const baseFilteredRecords = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return settlements.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.commissionNo.toLowerCase().includes(keyword) ||
      item.partnerName.toLowerCase().includes(keyword) ||
      item.sourceName.toLowerCase().includes(keyword) ||
      (item.contractName ?? "").toLowerCase().includes(keyword) ||
      (item.opportunityName ?? "").toLowerCase().includes(keyword);

    const matchesPartner =
      filters.partnerId === "all" || item.partnerId === filters.partnerId;
    const matchesSourceType =
      filters.sourceType === "all" || item.sourceType === filters.sourceType;
    const matchesCommissionType =
      filters.commissionType === "all" || item.commissionType === filters.commissionType;
    const matchesCooperationMode =
      filters.cooperationMode === "all" ||
      item.cooperationMode === filters.cooperationMode;
    const matchesOwner = filters.ownerId === "all" || item.ownerId === filters.ownerId;
    const matchesSettlementCycle =
      filters.settlementCycle === "all" ||
      item.settlementCycle === filters.settlementCycle;

    const hasException = item.status === "exception" || item.isException;
    const matchesException =
      filters.hasException === "all" ||
      (filters.hasException === "yes" ? hasException : !hasException);

    const hasInvoice = !["not_submitted", "rejected"].includes(item.invoiceStatus);
    const matchesInvoice =
      filters.isInvoiced === "all" ||
      (filters.isInvoiced === "yes" ? hasInvoice : !hasInvoice);

    const isSettled = item.status === "settled";
    const matchesSettled =
      filters.isSettled === "all" ||
      (filters.isSettled === "yes" ? isSettled : !isSettled);

    const matchesCurrency =
      filters.currency === "all" ||
      (item.currency ?? "").toUpperCase() === filters.currency;

    const matchesDate = isDateWithinRange(item[filters.dateField], filters.dateRange);

    return (
      matchesKeyword &&
      matchesPartner &&
      matchesSourceType &&
      matchesCommissionType &&
      matchesCooperationMode &&
      matchesOwner &&
      matchesSettlementCycle &&
      matchesException &&
      matchesInvoice &&
      matchesSettled &&
      matchesCurrency &&
      matchesDate
    );
  });
});

const filteredRecords = computed(() => {
  if (activeStatusTab.value === "all") {
    return baseFilteredRecords.value;
  }

  return baseFilteredRecords.value.filter(
    (item) => item.status === activeStatusTab.value
  );
});

const sortedRecords = computed(() => {
  const list = [...filteredRecords.value];

  if (!sortState.prop || !sortState.order) {
    return list.sort(
      (left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt)
    );
  }

  const direction = sortState.order === "ascending" ? 1 : -1;

  return list.sort((left, right) => {
    if (
      ["baseAmount", "commissionValue", "settledAmount", "unpaidAmount"].includes(
        sortState.prop
      )
    ) {
      return ((left[sortState.prop] ?? 0) - (right[sortState.prop] ?? 0)) * direction;
    }

    if (
      ["recognizedAt", "dueSettlementAt", "settledAt", "updatedAt"].includes(
        sortState.prop
      )
    ) {
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

const summaryCards = computed(() => {
  const validRecords = filteredRecords.value.filter(
    (item) => item.status !== "cancelled"
  );
  const totalAmount = validRecords.reduce(
    (sum, item) => sum + Number(item.commissionValue ?? 0),
    0
  );

  const currentMonth = new Date();
  const monthStart = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getTime();
  const monthEnd = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
    23,
    59,
    59
  ).getTime();

  const periodNewAmount = filteredRecords.value
    .filter((item) => {
      const time = toTimestamp(item.recognizedAt);
      return time >= monthStart && time <= monthEnd;
    })
    .reduce((sum, item) => sum + Number(item.commissionValue ?? 0), 0);

  const pendingSettlementAmount = filteredRecords.value
    .filter((item) =>
      ["pending_reconciliation", "pending_invoice", "pending_settlement"].includes(
        item.status
      )
    )
    .reduce((sum, item) => sum + Number(item.unpaidAmount ?? 0), 0);

  const settledAmount = filteredRecords.value
    .filter((item) => item.status === "settled")
    .reduce((sum, item) => sum + Number(item.settledAmount ?? 0), 0);

  const exceptionCount = filteredRecords.value.filter(
    (item) => item.status === "exception" || item.isException
  ).length;

  const pendingCount = filteredRecords.value.filter(
    (item) => !["settled", "cancelled"].includes(item.status)
  ).length;

  return [
    { label: "分潤總金額", value: totalAmount, type: "currency" },
    { label: "本期新增分潤金額", value: periodNewAmount, type: "currency" },
    { label: "待結算金額", value: pendingSettlementAmount, type: "currency" },
    { label: "已結算金額", value: settledAmount, type: "currency" },
    { label: "異常分潤筆數", value: exceptionCount },
    { label: "待處理筆數", value: pendingCount },
  ];
});

const emptyState = computed(() => {
  if (settlements.value.length === 0) {
    return {
      title: "目前尚無分潤資料",
      description: "待夥伴合作與成交資料建立後，將於此顯示分潤紀錄。",
      actionLabel: "重新整理",
      action: refreshData,
    };
  }

  return {
    title: "沒有符合條件的分潤資料",
    description: "請調整篩選條件或切換時間區間。",
    actionLabel: "重設篩選",
    action: resetFilters,
  };
});

function toTimestamp(value) {
  if (!value) {
    return 0;
  }

  const next = new Date(value);
  return Number.isNaN(next.getTime()) ? 0 : next.getTime();
}

function isDateWithinRange(value, dateRange) {
  const [start, end] = dateRange ?? [];

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

function formatCurrency(value, currency = "TWD") {
  try {
    return new Intl.NumberFormat("zh-TW", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value ?? 0);
  } catch {
    return `${currency} ${Number(value ?? 0).toLocaleString("zh-TW")}`;
  }
}

function notify(message, title = "已更新", type = "success") {
  ElNotification({
    title,
    message,
    type,
    position: "top-right",
  });
}

function resetFilters() {
  filters.keyword = "";
  filters.partnerId = "all";
  filters.sourceType = "all";
  filters.commissionType = "all";
  filters.cooperationMode = "all";
  filters.ownerId = "all";
  filters.dateField = "recognizedAt";
  filters.dateRange = [];
  filters.settlementCycle = "all";
  filters.hasException = "all";
  filters.isInvoiced = "all";
  filters.isSettled = "all";
  filters.currency = "all";
  activeStatusTab.value = "all";
}

function handleSortChange({ prop, order }) {
  sortState.prop = prop ?? "updatedAt";
  sortState.order = order ?? "descending";
}

function handleSelectionChange(rows) {
  selectedRows.value = rows;
}

function openDetail(row) {
  router.push({
    name: "partners-settlement-detail",
    params: { settlementId: row.id },
  });
}

function goPartner(row) {
  router.push({
    name: "partners-list",
    query: { partnerId: row.partnerId },
  });
}

function goSource(row) {
  if (row.contractId) {
    router.push({
      name: "contract-detail",
      params: { contractId: row.contractId },
    });
    return;
  }

  router.push({
    name: "opportunity-detail",
    params: { opportunityId: row.opportunityId || row.sourceId },
  });
}

async function markException(row) {
  let reason = "";

  try {
    const result = await ElMessageBox.prompt("請輸入異常原因", "標記有異常", {
      confirmButtonText: "確認",
      cancelButtonText: "取消",
      inputPlaceholder: "例如：對帳差異、資格爭議",
    });

    reason = result.value.trim();
  } catch {
    return;
  }

  const updated = markAsException(row.id, reason);

  if (!updated) {
    return;
  }

  notify(`${updated.commissionNo} 已標記為有異常`);
}

async function cancelRow(row) {
  if (row.status === "settled") {
    notify("已結算資料不可直接取消", "無法取消", "warning");
    return;
  }

  let reason = "";

  try {
    const result = await ElMessageBox.prompt("請輸入取消原因", "取消分潤", {
      confirmButtonText: "取消分潤",
      cancelButtonText: "關閉",
      inputPlaceholder: "例如：資料重複、規則不適用",
    });

    reason = result.value.trim();
  } catch {
    return;
  }

  const updated = cancelSettlement(row.id, reason);

  if (!updated) {
    return;
  }

  notify(`${updated.commissionNo} 已取消`);
}

function settleRow(row) {
  if (row.status === "settled") {
    notify(`${row.commissionNo} 已是結算完成狀態`, "提示", "info");
    return;
  }

  const updated = markAsSettled(row.id);

  if (!updated) {
    return;
  }

  notify(`${updated.commissionNo} 已標記結算完成`);
}

function reconciliationRow(row) {
  if (["settled", "cancelled"].includes(row.status)) {
    notify("已結算或已取消資料不可再更新對帳狀態", "提示", "warning");
    return;
  }

  const updated = markReconciliationDone(row.id);

  if (!updated) {
    return;
  }

  notify(`${updated.commissionNo} 已標記對帳完成`);
}

function invoiceRow(row) {
  if (["settled", "cancelled"].includes(row.status)) {
    notify("已結算或已取消資料不可再更新請款狀態", "提示", "warning");
    return;
  }

  const updated = markInvoiceDone(row.id);

  if (!updated) {
    return;
  }

  notify(`${updated.commissionNo} 已標記請款完成`);
}

function handleRowCommand(command, row) {
  if (command === "detail") {
    openDetail(row);
    return;
  }

  if (command === "partner") {
    goPartner(row);
    return;
  }

  if (command === "source") {
    goSource(row);
    return;
  }

  if (command === "reconciliation") {
    reconciliationRow(row);
    return;
  }

  if (command === "invoice") {
    invoiceRow(row);
    return;
  }

  if (command === "settle") {
    settleRow(row);
    return;
  }

  if (command === "exception") {
    markException(row);
    return;
  }

  if (command === "cancel") {
    cancelRow(row);
  }
}

function openBatchStatusDrawer() {
  if (selectedRows.value.length === 0) {
    notify("請先勾選要批次更新的分潤資料", "尚未選擇資料", "warning");
    return;
  }

  batchStatusForm.status = "pending_reconciliation";
  batchStatusForm.reason = "";
  batchStatusDrawerOpen.value = true;
}

function submitBatchStatus() {
  if (!batchStatusForm.status) {
    notify("請先選擇狀態", "未完成設定", "warning");
    return;
  }

  const targetIds = selectedRows.value.map((item) => item.id);

  const updated = batchSetSettlementStatus(targetIds, batchStatusForm.status, {
    reason: batchStatusForm.reason,
  });

  notify(`已更新 ${updated.length} 筆分潤資料狀態`);
  batchStatusDrawerOpen.value = false;
}

function batchSettle() {
  if (selectedRows.value.length === 0) {
    notify("請先勾選要批次結算的資料", "尚未選擇資料", "warning");
    return;
  }

  const targetIds = selectedRows.value
    .filter((item) => !["settled", "cancelled"].includes(item.status))
    .map((item) => item.id);

  const updated = targetIds.map((id) => markAsSettled(id)).filter(Boolean);

  notify(`已批次結算 ${updated.length} 筆資料`);
}

function exportReport() {
  notify("已加入匯出佇列，完成後將提供下載連結", "匯出中", "success");
}

async function refreshData() {
  loading.value = true;

  await new Promise((resolve) => {
    setTimeout(resolve, 300);
  });

  loading.value = false;
  notify("分潤資料已同步最新狀態", "資料已更新");
}

onActivated(() => {
  applyPartnerQueryFilter();
});

watch(
  () => [filteredRecords.value.length, pageSize.value],
  () => {
    const maxPage = Math.max(1, Math.ceil(filteredRecords.value.length / pageSize.value));

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
            分潤管理
          </h1>
          <p class="text-sm text-slate-500">
            集中管理夥伴分潤明細、結算進度、對帳與請款狀況
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton :icon="Download" @click="exportReport">匯出</ElButton>
          <ElButton :icon="Setting" @click="openBatchStatusDrawer">批次標記狀態</ElButton>
          <ElButton type="primary" @click="batchSettle">批次結算</ElButton>
          <ElButton :icon="Refresh" @click="refreshData">重新整理</ElButton>
        </div>
      </header>

      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <article
          v-for="card in summaryCards"
          :key="card.label"
          class="rounded-2xl border border-slate-200 bg-white px-4 py-4"
        >
          <p class="text-xs text-slate-500">{{ card.label }}</p>
          <p class="mt-2 text-lg font-semibold text-slate-900">
            <span v-if="card.type === 'currency'">{{ formatCurrency(card.value) }}</span>
            <span v-else>{{ card.value }}</span>
          </p>
        </article>
      </section>

      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div class="flex flex-wrap items-center gap-2">
            <ElInput
              v-model="filters.keyword"
              :prefix-icon="Search"
              placeholder="搜尋分潤編號 / 夥伴 / 商機 / 合約"
              clearable
              class="!w-[320px]"
            />

            <ElSelect v-model="filters.dateField" class="!w-[130px]">
              <ElOption
                v-for="item in dateFieldOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElDatePicker
              v-model="filters.dateRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              range-separator="至"
              start-placeholder="開始日期"
              end-placeholder="結束日期"
              class="!w-[260px]"
            />
          </div>

          <div class="flex items-center gap-2">
            <ElButton
              :icon="Filter"
              :type="filterPanelOpen ? 'primary' : 'default'"
              @click="filterPanelOpen = !filterPanelOpen"
            >
              Filter
            </ElButton>
            <ElButton :icon="Refresh" @click="resetFilters">重設</ElButton>
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
            class="grid gap-3 border-t border-slate-200 bg-white px-6 py-4 md:grid-cols-4"
          >
            <ElSelect v-model="filters.partnerId">
              <ElOption
                v-for="item in partnerOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.sourceType">
              <ElOption
                v-for="item in sourceTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.commissionType">
              <ElOption
                v-for="item in commissionTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.cooperationMode">
              <ElOption
                v-for="item in cooperationModeOptions"
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

            <ElSelect v-model="filters.settlementCycle">
              <ElOption
                v-for="item in settlementCycleOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.currency">
              <ElOption
                v-for="item in currencyOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.hasException">
              <ElOption
                v-for="item in yesNoOptions"
                :key="item.value"
                :label="`是否異常：${item.label}`"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.isInvoiced">
              <ElOption
                v-for="item in yesNoOptions"
                :key="item.value"
                :label="`是否已請款：${item.label}`"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.isSettled">
              <ElOption
                v-for="item in yesNoOptions"
                :key="item.value"
                :label="`是否已結算：${item.label}`"
                :value="item.value"
              />
            </ElSelect>
          </div>
        </transition>
      </section>

      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div class="px-6 pt-3">
          <ElTabs v-model="activeStatusTab">
            <ElTabPane
              v-for="item in statusTabOptions"
              :key="item.value"
              :label="item.label"
              :name="item.value"
            />
          </ElTabs>
        </div>

        <div
          class="flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 px-6 py-4"
        >
          <div class="flex flex-wrap items-center gap-2">
            <ElTag round effect="plain">共 {{ sortedRecords.length }} 筆</ElTag>
            <ElTag v-if="selectedRows.length > 0" round type="primary" effect="light">
              已勾選 {{ selectedRows.length }} 筆
            </ElTag>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <ElButton
              :disabled="selectedRows.length === 0"
              @click="openBatchStatusDrawer"
            >
              批次標記狀態
            </ElButton>
            <ElButton
              type="primary"
              plain
              :disabled="selectedRows.length === 0"
              @click="batchSettle"
            >
              批次結算
            </ElButton>
          </div>
        </div>

        <ElTable
          :data="pagedRecords"
          size="large"
          table-layout="auto"
          :loading="loading"
          @selection-change="handleSelectionChange"
          @sort-change="handleSortChange"
        >
          <ElTableColumn type="selection" width="52" />

          <ElTableColumn label="分潤編號" min-width="160">
            <template #default="{ row }">
              <button
                type="button"
                class="text-left text-sm font-semibold text-slate-900 hover:text-[#409eff]"
                @click="openDetail(row)"
              >
                {{ row.commissionNo }}
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="夥伴" min-width="220">
            <template #default="{ row }">
              <div class="grid gap-0.5">
                <button
                  type="button"
                  class="text-left text-sm font-medium text-[#409eff] hover:text-[#337ecc]"
                  @click="goPartner(row)"
                >
                  {{ row.partnerName }}
                </button>
                <span class="text-xs text-slate-400">{{ row.partnerCode }}</span>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="分潤來源" min-width="120">
            <template #default="{ row }">{{
              sourceTypeMap[row.sourceType]?.label || row.sourceType
            }}</template>
          </ElTableColumn>

          <ElTableColumn label="關聯商機 / 合約" min-width="220">
            <template #default="{ row }">
              <button
                type="button"
                class="text-left text-sm font-medium text-[#409eff] hover:text-[#337ecc]"
                @click="goSource(row)"
              >
                {{ row.sourceName }}
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="分潤類型" min-width="126">
            <template #default="{ row }">
              <ElTag
                round
                effect="light"
                :type="commissionTypeMap[row.commissionType]?.type"
              >
                {{ commissionTypeMap[row.commissionType]?.label || row.commissionType }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn
            label="成交金額"
            min-width="126"
            prop="baseAmount"
            sortable="custom"
          >
            <template #default="{ row }">{{
              formatCurrency(row.baseAmount, row.currency)
            }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="應分潤金額"
            min-width="126"
            prop="commissionValue"
            sortable="custom"
          >
            <template #default="{ row }">{{
              formatCurrency(row.commissionValue, row.currency)
            }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="已結算金額"
            min-width="126"
            prop="settledAmount"
            sortable="custom"
          >
            <template #default="{ row }">{{
              formatCurrency(row.settledAmount, row.currency)
            }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="未結算金額"
            min-width="126"
            prop="unpaidAmount"
            sortable="custom"
          >
            <template #default="{ row }">{{
              formatCurrency(row.unpaidAmount, row.currency)
            }}</template>
          </ElTableColumn>

          <ElTableColumn label="分潤狀態" min-width="118">
            <template #default="{ row }">
              <ElTag round effect="light" :type="settlementStatusMap[row.status]?.type">
                {{ settlementStatusMap[row.status]?.label || row.status }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn
            label="分潤成立日"
            min-width="112"
            prop="recognizedAt"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatDate(row.recognizedAt) }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="應結算日"
            min-width="112"
            prop="dueSettlementAt"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatDate(row.dueSettlementAt) }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="實際結算日"
            min-width="112"
            prop="settledAt"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatDate(row.settledAt) }}</template>
          </ElTableColumn>

          <ElTableColumn label="規則來源" min-width="154">
            <template #default="{ row }">
              <span class="text-xs text-slate-700">{{ row.ruleSource || "-" }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="操作" fixed="right" width="144">
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
                      <ElDropdownItem command="reconciliation"
                        >標記對帳完成</ElDropdownItem
                      >
                      <ElDropdownItem command="invoice">標記請款完成</ElDropdownItem>
                      <ElDropdownItem command="settle">標記結算完成</ElDropdownItem>
                      <ElDropdownItem command="exception">標記有異常</ElDropdownItem>
                      <ElDropdownItem command="source">查看來源資料</ElDropdownItem>
                      <ElDropdownItem command="partner">查看夥伴</ElDropdownItem>
                      <ElDropdownItem command="cancel" divided>取消分潤</ElDropdownItem>
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
      v-model="batchStatusDrawerOpen"
      title="批次標記狀態"
      size="420px"
      destroy-on-close
    >
      <ElForm label-width="96px" class="grid gap-2">
        <ElFormItem label="目標狀態" required>
          <ElSelect v-model="batchStatusForm.status">
            <ElOption
              v-for="item in batchStatusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="說明">
          <ElInput
            v-model="batchStatusForm.reason"
            type="textarea"
            :rows="4"
            placeholder="可輸入批次更新說明"
          />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="batchStatusDrawerOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitBatchStatus">套用</ElButton>
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
