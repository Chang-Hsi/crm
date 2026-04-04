<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
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
import { CirclePlus, Filter, MoreFilled, Refresh, Search } from "@element-plus/icons-vue";
import {
  commissionTypeMap,
  cooperationModeMap,
  marketOptions,
  partnerOptions,
  partnershipStatusMap,
  productOptions,
  settlementCycleMap,
  settlementCycleOptions,
} from "../../data/partnershipTerms";
import { usePartnershipTermsStore } from "../../composables/usePartnershipTermsStore";

const route = useRoute();
const router = useRouter();
const {
  terms,
  createTerm,
  updateTerm,
  setTermActive,
  deactivateTerm,
  copyTermAsNewVersion,
  getNextConditionNo,
} = usePartnershipTermsStore();

const loading = ref(false);
const pageSize = ref(10);
const currentPage = ref(1);
const filterPanelOpen = ref(false);
const selectedRows = ref([]);
const sortState = reactive({
  prop: "updatedAt",
  order: "descending",
});

const formDialogOpen = ref(false);
const formMode = ref("create");
const editingTermId = ref("");
const historyDialogOpen = ref(false);
const historyDialogTargetId = ref("");

const statusOptions = [
  { label: "全部狀態", value: "all" },
  ...Object.entries(partnershipStatusMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const cooperationModeOptions = [
  { label: "全部合作模式", value: "all" },
  ...Object.entries(cooperationModeMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const commissionTypeOptions = Object.entries(commissionTypeMap).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

const partnerFilterOptions = computed(() => [
  { label: "全部夥伴", value: "all" },
  ...partnerOptions.map((item) => ({
    label: item.name,
    value: item.id,
  })),
]);

const settlementCycleFilterOptions = [
  { label: "全部結算週期", value: "all" },
  ...settlementCycleOptions,
];

const filters = reactive({
  keyword: "",
  partnerId: "all",
  cooperationMode: "all",
  status: "all",
  isCurrentEffective: "all",
  product: "all",
  market: "all",
  settlementCycle: "all",
  effectiveDateRange: [],
  expiryDateRange: [],
  createdDateRange: [],
});

function createEmptyForm() {
  return {
    conditionNo: getNextConditionNo(),
    conditionName: "",
    partnerId: "",
    version: 1,
    status: "draft",
    isCurrentEffective: false,
    cooperationMode: "referral",
    cooperationRole: "",
    applicableProducts: [],
    applicableChannels: "",
    applicableCustomers: "",
    applicableMarkets: [],
    pricingPolicy: "",
    discountType: "none",
    discountValue: 0,
    commissionType: "percentage",
    commissionValue: 0,
    minPerformanceTarget: "",
    guaranteeRule: "",
    incentiveRule: "",
    currency: "TWD",
    settlementMethod: "",
    settlementCycle: "monthly",
    reconciliationRule: "",
    paymentTerms: "",
    taxRule: "",
    effectiveDate: new Date().toISOString().slice(0, 10),
    expiryDate: "",
    isLongTerm: false,
    isRenewable: true,
    isExclusive: false,
    restrictions: "",
    notes: "",
    attachmentsInput: "",
  };
}

const form = reactive(createEmptyForm());

const historyTarget = computed(
  () => terms.value.find((item) => item.id === historyDialogTargetId.value) ?? null
);

const summaryCards = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  const monthEnd = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
    23,
    59,
    59
  ).getTime();

  const total = terms.value.length;
  const active = terms.value.filter((item) => item.status === "active").length;
  const pending = terms.value.filter((item) => item.status === "pending_effective")
    .length;
  const expiringSoon = terms.value.filter((item) => {
    if (item.status !== "active" || item.isLongTerm || !item.expiryDate) {
      return false;
    }

    const expiryTime = new Date(item.expiryDate).getTime();
    const diffDays = Math.floor((expiryTime - today.getTime()) / (1000 * 60 * 60 * 24));

    return diffDays >= 0 && diffDays <= 30;
  }).length;
  const expired = terms.value.filter((item) => item.status === "expired").length;
  const monthlyNew = terms.value.filter((item) => {
    const createdTime = new Date(item.createdAt).getTime();
    return createdTime >= monthStart && createdTime <= monthEnd;
  }).length;

  return [
    { label: "合作條件總數", value: total },
    { label: "生效中條件數", value: active },
    { label: "待生效條件數", value: pending },
    { label: "即將到期條件數", value: expiringSoon },
    { label: "已失效條件數", value: expired },
    { label: "本月新增條件數", value: monthlyNew },
  ];
});

function toDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = toDate(value);

  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatCurrency(value, currency = "TWD") {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatVersion(version) {
  return `v${version}`;
}

function getPartnerNameById(partnerId) {
  return partnerOptions.find((item) => item.id === partnerId)?.name ?? "";
}

function getRevenueDiscountSummary(item) {
  const parts = [];

  if (item.commissionType && item.commissionType !== "none") {
    if (item.commissionType === "percentage") {
      parts.push(`分潤 ${item.commissionValue ?? 0}%`);
    } else if (item.commissionType === "fixed") {
      parts.push(`固定佣金 ${formatCurrency(item.commissionValue, item.currency)}`);
    } else {
      parts.push(
        `${commissionTypeMap[item.commissionType]?.label ?? item.commissionType}`
      );
    }
  }

  if (item.discountType && item.discountType !== "none") {
    if (item.discountType === "percentage") {
      parts.push(`折扣 ${item.discountValue ?? 0}%`);
    } else if (item.discountType === "fixed") {
      parts.push(`折扣 ${formatCurrency(item.discountValue, item.currency)}`);
    } else if (item.discountType === "tiered") {
      parts.push("階梯折扣");
    }
  }

  return parts.length > 0 ? parts.join(" / ") : "無";
}

function inDateRange(dateValue, range) {
  const [start, end] = range ?? [];

  if (!start || !end) {
    return true;
  }

  const target = toDate(dateValue);

  if (!target) {
    return false;
  }

  const startTime = new Date(`${start}T00:00:00`).getTime();
  const endTime = new Date(`${end}T23:59:59`).getTime();

  return target.getTime() >= startTime && target.getTime() <= endTime;
}

const filteredTerms = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return terms.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.conditionName.toLowerCase().includes(keyword) ||
      item.conditionNo.toLowerCase().includes(keyword) ||
      item.partnerName.toLowerCase().includes(keyword);

    const matchesPartner =
      filters.partnerId === "all" || item.partnerId === filters.partnerId;
    const matchesMode =
      filters.cooperationMode === "all" ||
      item.cooperationMode === filters.cooperationMode;
    const matchesStatus = filters.status === "all" || item.status === filters.status;

    const matchesCurrentEffective =
      filters.isCurrentEffective === "all" ||
      (filters.isCurrentEffective === "yes"
        ? item.isCurrentEffective
        : !item.isCurrentEffective);

    const matchesProduct =
      filters.product === "all" ||
      (item.applicableProducts ?? []).some((product) => product === filters.product);

    const matchesMarket =
      filters.market === "all" ||
      (item.applicableMarkets ?? []).some((market) => market === filters.market);

    const matchesSettlement =
      filters.settlementCycle === "all" ||
      item.settlementCycle === filters.settlementCycle;

    const matchesEffectiveDate = inDateRange(
      item.effectiveDate,
      filters.effectiveDateRange
    );
    const matchesExpiryDate = inDateRange(item.expiryDate, filters.expiryDateRange);
    const matchesCreatedDate = inDateRange(item.createdAt, filters.createdDateRange);

    return (
      matchesKeyword &&
      matchesPartner &&
      matchesMode &&
      matchesStatus &&
      matchesCurrentEffective &&
      matchesProduct &&
      matchesMarket &&
      matchesSettlement &&
      matchesEffectiveDate &&
      matchesExpiryDate &&
      matchesCreatedDate
    );
  });
});

const sortedTerms = computed(() => {
  const records = [...filteredTerms.value];

  if (!sortState.prop || !sortState.order) {
    return records;
  }

  const direction = sortState.order === "ascending" ? 1 : -1;

  return records.sort((left, right) => {
    if (["version"].includes(sortState.prop)) {
      return ((left[sortState.prop] ?? 0) - (right[sortState.prop] ?? 0)) * direction;
    }

    if (["updatedAt", "effectiveDate", "expiryDate"].includes(sortState.prop)) {
      return (
        (new Date(left[sortState.prop]).getTime() -
          new Date(right[sortState.prop]).getTime()) *
        direction
      );
    }

    return (
      String(left[sortState.prop] ?? "").localeCompare(
        String(right[sortState.prop] ?? "")
      ) * direction
    );
  });
});

const pagedTerms = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedTerms.value.slice(start, start + pageSize.value);
});

const emptyState = computed(() => {
  if (terms.value.length === 0) {
    return {
      title: "目前尚無合作條件資料",
      description: "可先新增第一筆合作條件，建立夥伴合作規則。",
      actionLabel: "新增合作條件",
      action: openCreateForm,
    };
  }

  return {
    title: "沒有符合條件的合作條件",
    description: "請調整搜尋條件或清除篩選。",
    actionLabel: "清除篩選",
    action: resetFilters,
  };
});

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
  filters.cooperationMode = "all";
  filters.status = "all";
  filters.isCurrentEffective = "all";
  filters.product = "all";
  filters.market = "all";
  filters.settlementCycle = "all";
  filters.effectiveDateRange = [];
  filters.expiryDateRange = [];
  filters.createdDateRange = [];
}

function handleSortChange({ prop, order }) {
  sortState.prop = prop ?? "updatedAt";
  sortState.order = order ?? "descending";
}

function handleSelectionChange(selection) {
  selectedRows.value = selection;
}

function toggleFilterPanel() {
  filterPanelOpen.value = !filterPanelOpen.value;
}

function openCreateForm() {
  formMode.value = "create";
  editingTermId.value = "";
  Object.assign(form, createEmptyForm());
  formDialogOpen.value = true;
}

function openEditForm(row) {
  formMode.value = "edit";
  editingTermId.value = row.id;

  Object.assign(form, {
    conditionNo: row.conditionNo,
    conditionName: row.conditionName,
    partnerId: row.partnerId,
    version: row.version,
    status: row.status,
    isCurrentEffective: row.isCurrentEffective,
    cooperationMode: row.cooperationMode,
    cooperationRole: row.cooperationRole,
    applicableProducts: [...(row.applicableProducts ?? [])],
    applicableChannels: (row.applicableChannels ?? []).join("、"),
    applicableCustomers: row.applicableCustomers,
    applicableMarkets: [...(row.applicableMarkets ?? [])],
    pricingPolicy: row.pricingPolicy,
    discountType: row.discountType,
    discountValue: row.discountValue,
    commissionType: row.commissionType,
    commissionValue: row.commissionValue,
    minPerformanceTarget: row.minPerformanceTarget,
    guaranteeRule: row.guaranteeRule,
    incentiveRule: row.incentiveRule,
    currency: row.currency,
    settlementMethod: row.settlementMethod,
    settlementCycle: row.settlementCycle,
    reconciliationRule: row.reconciliationRule,
    paymentTerms: row.paymentTerms,
    taxRule: row.taxRule,
    effectiveDate: row.effectiveDate,
    expiryDate: row.expiryDate,
    isLongTerm: row.isLongTerm,
    isRenewable: row.isRenewable,
    isExclusive: row.isExclusive,
    restrictions: row.restrictions,
    notes: row.notes,
    attachmentsInput: (row.attachments ?? []).join(", "),
  });

  formDialogOpen.value = true;
}

function buildSubmitPayload(nextStatus = null) {
  const partnerName = getPartnerNameById(form.partnerId);

  return {
    conditionNo: form.conditionNo,
    conditionName: form.conditionName.trim(),
    partnerId: form.partnerId,
    partnerName,
    version: Number(form.version || 1),
    status: nextStatus ?? form.status,
    isCurrentEffective: form.isCurrentEffective,
    cooperationMode: form.cooperationMode,
    cooperationRole: form.cooperationRole.trim(),
    applicableProducts: [...form.applicableProducts],
    applicableChannels: form.applicableChannels
      .split(/[、,]/)
      .map((item) => item.trim())
      .filter(Boolean),
    applicableCustomers: form.applicableCustomers.trim(),
    applicableMarkets: [...form.applicableMarkets],
    pricingPolicy: form.pricingPolicy.trim(),
    discountType: form.discountType,
    discountValue: Number(form.discountValue || 0),
    commissionType: form.commissionType,
    commissionValue: Number(form.commissionValue || 0),
    minPerformanceTarget: form.minPerformanceTarget.trim(),
    guaranteeRule: form.guaranteeRule.trim(),
    incentiveRule: form.incentiveRule.trim(),
    currency: form.currency,
    settlementMethod: form.settlementMethod.trim(),
    settlementCycle: form.settlementCycle,
    reconciliationRule: form.reconciliationRule.trim(),
    paymentTerms: form.paymentTerms.trim(),
    taxRule: form.taxRule.trim(),
    effectiveDate: form.effectiveDate,
    expiryDate: form.isLongTerm ? "" : form.expiryDate,
    isLongTerm: form.isLongTerm,
    isRenewable: form.isRenewable,
    isExclusive: form.isExclusive,
    restrictions: form.restrictions.trim(),
    notes: form.notes.trim(),
    attachments: form.attachmentsInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

function validateForm() {
  if (!form.conditionName.trim()) {
    notify("請輸入合作條件名稱。", "缺少資訊", "warning");
    return false;
  }

  if (!form.partnerId) {
    notify("請選擇關聯夥伴。", "缺少資訊", "warning");
    return false;
  }

  if (!form.effectiveDate) {
    notify("請設定生效日。", "缺少資訊", "warning");
    return false;
  }

  if (!form.isLongTerm && form.expiryDate) {
    const start = new Date(form.effectiveDate).getTime();
    const end = new Date(form.expiryDate).getTime();

    if (end < start) {
      notify("到期日不可早於生效日。", "日期錯誤", "warning");
      return false;
    }
  }

  return true;
}

function submitForm(nextStatus = null) {
  if (!validateForm()) {
    return;
  }

  const payload = buildSubmitPayload(nextStatus);

  if (formMode.value === "edit" && editingTermId.value) {
    const updated = updateTerm(editingTermId.value, payload);

    if (!updated) {
      return;
    }

    notify(`已更新 ${updated.conditionName}`);
  } else {
    const created = createTerm(payload);

    notify(`已新增 ${created.conditionName}`);
  }

  formDialogOpen.value = false;
}

function saveAsDraft() {
  submitForm("draft");
}

function openDetail(row) {
  router.push({
    name: "partners-term-detail",
    params: { termId: row.id },
  });
}

function goPartner(row) {
  router.push({
    name: "partners-list",
    query: { keyword: row.partnerName },
  });
}

function openHistory(row) {
  historyDialogTargetId.value = row.id;
  historyDialogOpen.value = true;
}

function duplicateAsNewVersion(row) {
  const created = copyTermAsNewVersion(row.id);

  if (!created) {
    return;
  }

  notify(`已複製為新版本 ${created.conditionNo}`);
  openEditForm(created);
}

function activateTerm(row) {
  const activated = setTermActive(row.id);

  if (!activated) {
    return;
  }

  notify(`${activated.conditionName} 已設為生效中`);
}

async function disableTerm(row) {
  let reason = "";

  try {
    const result = await ElMessageBox.prompt("請輸入停用原因", "停用合作條件", {
      confirmButtonText: "停用",
      cancelButtonText: "取消",
      inputPlaceholder: "例如：合約改版、業務策略調整",
    });

    reason = result.value.trim();
  } catch {
    return;
  }

  const updated = deactivateTerm(row.id, reason);

  if (!updated) {
    return;
  }

  notify(`${updated.conditionName} 已停用`);
}

function handleRowCommand(command, row) {
  if (command === "view") {
    openDetail(row);
    return;
  }

  if (command === "edit") {
    openEditForm(row);
    return;
  }

  if (command === "copy") {
    duplicateAsNewVersion(row);
    return;
  }

  if (command === "active") {
    activateTerm(row);
    return;
  }

  if (command === "inactive") {
    disableTerm(row);
    return;
  }

  if (command === "history") {
    openHistory(row);
  }
}

function csvEscape(value) {
  const text = String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function exportTerms(targetRows = filteredTerms.value) {
  const rows = [...targetRows];

  const headers = [
    "條件編號",
    "條件名稱",
    "夥伴",
    "版本",
    "合作模式",
    "產品/方案",
    "地區/市場",
    "分潤折扣摘要",
    "結算週期",
    "生效日",
    "到期日",
    "狀態",
    "是否目前生效",
    "更新時間",
  ];

  const csvLines = [headers.join(",")];

  rows.forEach((item) => {
    csvLines.push(
      [
        item.conditionNo,
        item.conditionName,
        item.partnerName,
        formatVersion(item.version),
        cooperationModeMap[item.cooperationMode]?.label,
        (item.applicableProducts ?? []).join("/") || "-",
        (item.applicableMarkets ?? []).join("/") || "-",
        getRevenueDiscountSummary(item),
        settlementCycleMap[item.settlementCycle]?.label,
        item.effectiveDate,
        item.expiryDate || "長期",
        partnershipStatusMap[item.status]?.label,
        item.isCurrentEffective ? "是" : "否",
        item.updatedAt,
      ]
        .map((value) => csvEscape(value))
        .join(",")
    );
  });

  const blob = new Blob([`\ufeff${csvLines.join("\n")}`], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `partnership-terms-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  notify(`已匯出 ${rows.length} 筆合作條件`, "匯出完成");
}

function handleBatchCommand(command) {
  if (selectedRows.value.length === 0) {
    notify("請先勾選至少一筆資料。", "無可操作資料", "warning");
    return;
  }

  if (command === "export") {
    exportTerms(selectedRows.value);
    return;
  }

  if (command === "active") {
    selectedRows.value.forEach((item) => {
      setTermActive(item.id);
    });

    notify(`已更新 ${selectedRows.value.length} 筆生效狀態`);
    return;
  }

  if (command === "inactive") {
    selectedRows.value.forEach((item) => {
      deactivateTerm(item.id, "批次停用");
    });

    notify(`已停用 ${selectedRows.value.length} 筆條件`);
  }
}

watch(
  () => [
    filters.keyword,
    filters.partnerId,
    filters.cooperationMode,
    filters.status,
    filters.isCurrentEffective,
    filters.product,
    filters.market,
    filters.settlementCycle,
    filters.effectiveDateRange,
    filters.expiryDateRange,
    filters.createdDateRange,
    pageSize.value,
  ],
  () => {
    currentPage.value = 1;
  },
  { deep: true }
);

watch(
  () => route.query.edit,
  (editId) => {
    if (!editId) {
      return;
    }

    const target = terms.value.find((item) => item.id === String(editId));

    if (!target) {
      return;
    }

    openEditForm(target);
    router.replace({ name: "partners-terms", query: {} });
  },
  { immediate: true }
);
</script>

<template>
  <div class="min-h-full p-8">
    <section class="grid gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-2">
          <h1 class="text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-900">
            合作條件
          </h1>
          <p class="text-sm text-slate-500">
            集中管理夥伴合作模式、分潤規則、結算方式與生效條件。
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton type="primary" :icon="CirclePlus" @click="openCreateForm">
            新增合作條件
          </ElButton>
          <ElButton @click="exportTerms()">匯出</ElButton>

          <ElDropdown trigger="click" @command="handleBatchCommand">
            <ElButton>批次操作</ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem command="active">批次設為生效</ElDropdownItem>
                <ElDropdownItem command="inactive">批次停用</ElDropdownItem>
                <ElDropdownItem command="export">批次匯出</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-6 sm:grid-cols-2">
        <section
          v-for="card in summaryCards"
          :key="card.label"
          class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p class="text-sm font-medium text-slate-500">{{ card.label }}</p>
          <p class="mt-2 text-[1.85rem] font-semibold tracking-[-0.03em] text-slate-900">
            {{ card.value }}
          </p>
        </section>
      </div>

      <section
        class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div
          class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5"
        >
          <div class="flex flex-1 flex-wrap justify-end items-center gap-3">
            <ElInput
              v-model="filters.keyword"
              placeholder="搜尋條件名稱 / 編號 / 夥伴名稱"
              :prefix-icon="Search"
              clearable
              class="!w-[360px] max-[760px]:!w-full"
            />

            <ElButton
              :icon="Filter"
              :type="filterPanelOpen ? 'primary' : 'default'"
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
          enter-to-class="max-h-[460px] opacity-100"
          leave-from-class="max-h-[460px] opacity-100"
          leave-to-class="max-h-0 opacity-0"
        >
          <div
            v-if="filterPanelOpen"
            class="overflow-hidden border-b border-slate-200 bg-white px-6 py-4"
          >
            <div class="grid gap-4 xl:grid-cols-[repeat(6,minmax(120px,1fr))]">
              <ElSelect v-model="filters.partnerId" placeholder="關聯夥伴">
                <ElOption
                  v-for="item in partnerFilterOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.cooperationMode" placeholder="合作模式">
                <ElOption
                  v-for="item in cooperationModeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.status" placeholder="條件狀態">
                <ElOption
                  v-for="item in statusOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.isCurrentEffective" placeholder="是否目前生效">
                <ElOption label="全部" value="all" />
                <ElOption label="是" value="yes" />
                <ElOption label="否" value="no" />
              </ElSelect>

              <ElSelect v-model="filters.product" placeholder="適用產品 / 方案">
                <ElOption label="全部產品" value="all" />
                <ElOption
                  v-for="item in productOptions"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </ElSelect>

              <ElSelect v-model="filters.market" placeholder="適用區域 / 市場">
                <ElOption label="全部市場" value="all" />
                <ElOption
                  v-for="item in marketOptions"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </ElSelect>

              <ElSelect v-model="filters.settlementCycle" placeholder="結算週期">
                <ElOption
                  v-for="item in settlementCycleFilterOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElDatePicker
                v-model="filters.effectiveDateRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                range-separator="至"
                start-placeholder="生效日起"
                end-placeholder="生效日迄"
                class="!w-full"
              />

              <ElDatePicker
                v-model="filters.expiryDateRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                range-separator="至"
                start-placeholder="到期日起"
                end-placeholder="到期日迄"
                class="!w-full"
              />

              <ElDatePicker
                v-model="filters.createdDateRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                range-separator="至"
                start-placeholder="建立日起"
                end-placeholder="建立日迄"
                class="!w-full"
              />

              <ElButton :icon="Refresh" @click="resetFilters">重設</ElButton>
            </div>
          </div>
        </transition>

        <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div class="flex flex-wrap items-center gap-2">
            <ElTag round effect="plain">共 {{ filteredTerms.length }} 筆</ElTag>
            <ElTag v-if="selectedRows.length > 0" round type="primary" effect="light">
              已勾選 {{ selectedRows.length }} 筆
            </ElTag>
          </div>
        </div>

        <ElTable
          :data="pagedTerms"
          size="large"
          table-layout="auto"
          :loading="loading"
          @selection-change="handleSelectionChange"
          @sort-change="handleSortChange"
        >
          <ElTableColumn type="selection" width="52" />

          <ElTableColumn label="合作條件" min-width="260">
            <template #default="{ row }">
              <div class="grid gap-1">
                <button
                  type="button"
                  class="text-left text-sm font-semibold text-slate-900 hover:text-[#409eff]"
                  @click="openDetail(row)"
                >
                  {{ row.conditionName }}
                </button>
                <span class="text-xs text-slate-400">{{ row.conditionNo }}</span>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="關聯夥伴" min-width="180">
            <template #default="{ row }">
              <button
                type="button"
                class="text-left text-sm font-medium text-[#409eff] hover:text-[#337ecc]"
                @click="goPartner(row)"
              >
                {{ row.partnerName }}
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="版本" min-width="88" prop="version" sortable="custom">
            <template #default="{ row }">{{ formatVersion(row.version) }}</template>
          </ElTableColumn>

          <ElTableColumn label="合作模式" min-width="128">
            <template #default="{ row }">
              <ElTag
                round
                effect="light"
                :type="cooperationModeMap[row.cooperationMode]?.type"
              >
                {{
                  cooperationModeMap[row.cooperationMode]?.label || row.cooperationMode
                }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="適用產品 / 方案" min-width="170">
            <template #default="{ row }">
              <span class="text-xs text-slate-700">{{
                row.applicableProducts.join("、") || "-"
              }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="適用地區 / 市場" min-width="156">
            <template #default="{ row }">
              <span class="text-xs text-slate-700">{{
                row.applicableMarkets.join("、") || "-"
              }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="分潤 / 折扣摘要" min-width="190">
            <template #default="{ row }">
              <span class="text-xs text-slate-700">{{
                getRevenueDiscountSummary(row)
              }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="結算週期" min-width="116">
            <template #default="{ row }">
              {{ settlementCycleMap[row.settlementCycle]?.label || row.settlementCycle }}
            </template>
          </ElTableColumn>

          <ElTableColumn
            label="生效日"
            min-width="110"
            prop="effectiveDate"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatDate(row.effectiveDate) }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="到期日"
            min-width="110"
            prop="expiryDate"
            sortable="custom"
          >
            <template #default="{ row }">{{
              row.isLongTerm ? "長期" : formatDate(row.expiryDate)
            }}</template>
          </ElTableColumn>

          <ElTableColumn label="狀態" min-width="126">
            <template #default="{ row }">
              <ElTag round effect="light" :type="partnershipStatusMap[row.status]?.type">
                {{ partnershipStatusMap[row.status]?.label || row.status }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="目前生效" min-width="106">
            <template #default="{ row }">
              <ElTag
                round
                effect="light"
                :type="row.isCurrentEffective ? 'success' : 'info'"
              >
                {{ row.isCurrentEffective ? "是" : "否" }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn
            label="最後更新時間"
            min-width="130"
            prop="updatedAt"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
          </ElTableColumn>

          <ElTableColumn label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <div class="flex items-center justify-end gap-1">
                <ElButton text type="primary" @click="openDetail(row)">查看詳情</ElButton>
                <ElButton text @click="openEditForm(row)">編輯</ElButton>
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
                      <ElDropdownItem command="copy">複製為新版本</ElDropdownItem>
                      <ElDropdownItem command="active">設為生效</ElDropdownItem>
                      <ElDropdownItem command="inactive">停用</ElDropdownItem>
                      <ElDropdownItem command="history">查看歷程</ElDropdownItem>
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
            :total="sortedTerms.length"
            background
          />

          <ElSelect v-model="pageSize" class="!w-[100px]" @change="currentPage = 1">
            <ElOption :value="10" label="10 Item" />
            <ElOption :value="20" label="20 Item" />
            <ElOption :value="50" label="50 Item" />
          </ElSelect>
        </div>
      </section>
    </section>

    <ElDrawer
      v-model="formDialogOpen"
      :title="formMode === 'create' ? '新增合作條件' : '編輯合作條件'"
      size="980px"
      destroy-on-close
    >
      <ElForm label-width="116px" class="grid gap-4">
        <section class="grid gap-3 rounded-xl border border-slate-200 p-4">
          <p class="text-sm font-semibold text-slate-800">A. 基本資料</p>

          <div class="grid gap-3 md:grid-cols-3">
            <ElFormItem label="條件名稱" required class="md:col-span-2">
              <ElInput v-model="form.conditionName" />
            </ElFormItem>

            <ElFormItem label="條件編號">
              <ElInput v-model="form.conditionNo" disabled />
            </ElFormItem>

            <ElFormItem label="關聯夥伴" required>
              <ElSelect v-model="form.partnerId" filterable>
                <ElOption
                  v-for="item in partnerOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="版本">
              <ElInputNumber
                v-model="form.version"
                :min="1"
                :step="1"
                controls-position="right"
              />
            </ElFormItem>

            <ElFormItem label="條件狀態">
              <ElSelect v-model="form.status">
                <ElOption
                  v-for="item in statusOptions.filter((option) => option.value !== 'all')"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
          </div>

          <ElFormItem label="目前生效">
            <ElSwitch v-model="form.isCurrentEffective" active-text="設為主要生效條件" />
          </ElFormItem>
        </section>

        <section class="grid gap-3 rounded-xl border border-slate-200 p-4">
          <p class="text-sm font-semibold text-slate-800">B. 合作模式</p>

          <div class="grid gap-3 md:grid-cols-3">
            <ElFormItem label="合作模式">
              <ElSelect v-model="form.cooperationMode">
                <ElOption
                  v-for="item in cooperationModeOptions.filter(
                    (option) => option.value !== 'all'
                  )"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="合作角色">
              <ElInput v-model="form.cooperationRole" />
            </ElFormItem>

            <ElFormItem label="適用客群">
              <ElInput v-model="form.applicableCustomers" />
            </ElFormItem>

            <ElFormItem label="適用產品" class="md:col-span-2">
              <ElSelect v-model="form.applicableProducts" multiple filterable>
                <ElOption
                  v-for="item in productOptions"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="適用地區">
              <ElSelect v-model="form.applicableMarkets" multiple>
                <ElOption
                  v-for="item in marketOptions"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="適用渠道" class="md:col-span-3">
              <ElInput
                v-model="form.applicableChannels"
                placeholder="可用 、 或 , 分隔多個渠道"
              />
            </ElFormItem>
          </div>

          <div
            v-if="form.cooperationMode === 'referral'"
            class="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-700"
          >
            推薦分潤模式：建議補齊分潤比例、佣金發放時點與可計佣產品。
          </div>

          <div
            v-if="['reseller', 'distributor'].includes(form.cooperationMode)"
            class="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-700"
          >
            經銷 / 代理模式：建議補齊折扣體系、可銷售區域與排他設定。
          </div>

          <div
            v-if="form.cooperationMode === 'technical'"
            class="rounded-lg border border-sky-200 bg-sky-50/70 px-3 py-2 text-xs text-sky-700"
          >
            技術合作模式：建議補齊技術支援邊界與專案分工說明。
          </div>
        </section>

        <section class="grid gap-3 rounded-xl border border-slate-200 p-4">
          <p class="text-sm font-semibold text-slate-800">C. 商務條件</p>

          <div class="grid gap-3 md:grid-cols-3">
            <ElFormItem label="價格機制" class="md:col-span-3">
              <ElInput v-model="form.pricingPolicy" />
            </ElFormItem>

            <ElFormItem label="折扣類型">
              <ElSelect v-model="form.discountType">
                <ElOption label="無折扣" value="none" />
                <ElOption label="比例折扣" value="percentage" />
                <ElOption label="固定折扣" value="fixed" />
                <ElOption label="階梯折扣" value="tiered" />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="折扣值">
              <ElInputNumber
                v-model="form.discountValue"
                :min="0"
                controls-position="right"
              />
            </ElFormItem>

            <ElFormItem label="分潤方式">
              <ElSelect v-model="form.commissionType">
                <ElOption
                  v-for="item in commissionTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="分潤值">
              <ElInputNumber
                v-model="form.commissionValue"
                :min="0"
                controls-position="right"
              />
            </ElFormItem>

            <ElFormItem label="最低門檻">
              <ElInput v-model="form.minPerformanceTarget" />
            </ElFormItem>

            <ElFormItem label="保底條件">
              <ElInput v-model="form.guaranteeRule" />
            </ElFormItem>

            <ElFormItem label="獎勵規則" class="md:col-span-3">
              <ElInput v-model="form.incentiveRule" type="textarea" :rows="2" />
            </ElFormItem>
          </div>
        </section>

        <section class="grid gap-3 rounded-xl border border-slate-200 p-4">
          <p class="text-sm font-semibold text-slate-800">D. 結算與付款</p>

          <div class="grid gap-3 md:grid-cols-3">
            <ElFormItem label="幣別">
              <ElSelect v-model="form.currency">
                <ElOption label="TWD" value="TWD" />
                <ElOption label="USD" value="USD" />
                <ElOption label="JPY" value="JPY" />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="結算方式">
              <ElInput v-model="form.settlementMethod" />
            </ElFormItem>

            <ElFormItem label="結算週期">
              <ElSelect v-model="form.settlementCycle">
                <ElOption
                  v-for="item in settlementCycleOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="對帳規則" class="md:col-span-3">
              <ElInput v-model="form.reconciliationRule" />
            </ElFormItem>

            <ElFormItem label="付款條件" class="md:col-span-2">
              <ElInput v-model="form.paymentTerms" />
            </ElFormItem>

            <ElFormItem label="稅務規則">
              <ElInput v-model="form.taxRule" />
            </ElFormItem>
          </div>
        </section>

        <section class="grid gap-3 rounded-xl border border-slate-200 p-4">
          <p class="text-sm font-semibold text-slate-800">E. 生效與限制</p>

          <div class="grid gap-3 md:grid-cols-3">
            <ElFormItem label="生效日" required>
              <ElDatePicker v-model="form.effectiveDate" value-format="YYYY-MM-DD" />
            </ElFormItem>

            <ElFormItem label="到期日">
              <ElDatePicker
                v-model="form.expiryDate"
                value-format="YYYY-MM-DD"
                :disabled="form.isLongTerm"
              />
            </ElFormItem>

            <ElFormItem label="長期有效">
              <ElSwitch v-model="form.isLongTerm" />
            </ElFormItem>

            <ElFormItem label="允許續用">
              <ElSwitch v-model="form.isRenewable" />
            </ElFormItem>

            <ElFormItem label="排他條件">
              <ElSwitch v-model="form.isExclusive" />
            </ElFormItem>

            <ElFormItem label="限制條件" class="md:col-span-3">
              <ElInput v-model="form.restrictions" type="textarea" :rows="2" />
            </ElFormItem>

            <ElFormItem label="備註" class="md:col-span-3">
              <ElInput v-model="form.notes" type="textarea" :rows="2" />
            </ElFormItem>

            <ElFormItem label="附件" class="md:col-span-3">
              <ElInput
                v-model="form.attachmentsInput"
                placeholder="可用 , 分隔多個附件檔名"
              />
            </ElFormItem>
          </div>
        </section>
      </ElForm>

      <template #footer>
        <div
          class="flex justify-between gap-2 max-[760px]:flex-col max-[760px]:items-stretch"
        >
          <ElButton @click="saveAsDraft">儲存草稿</ElButton>

          <div class="flex justify-end gap-2">
            <ElButton @click="formDialogOpen = false">取消</ElButton>
            <ElButton type="primary" @click="submitForm()">
              {{ formMode === "create" ? "建立條件" : "儲存修改" }}
            </ElButton>
          </div>
        </div>
      </template>
    </ElDrawer>

    <ElDialog v-model="historyDialogOpen" title="條件歷程" width="760">
      <div v-if="historyTarget" class="grid max-h-[420px] gap-3 overflow-y-auto">
        <section
          v-for="item in historyTarget.history"
          :key="item.id"
          class="rounded-lg border border-slate-200 px-4 py-3"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm font-semibold text-slate-800">{{ item.title }}</p>
            <span class="text-xs text-slate-400">{{ formatDate(item.occurredAt) }}</span>
          </div>
          <p class="mt-1 text-sm text-slate-500">{{ item.description || "-" }}</p>
          <p class="mt-1 text-xs text-slate-400">{{ item.actorName }}</p>
        </section>
      </div>

      <template v-else>
        <ElEmpty description="目前尚無歷程紀錄" />
      </template>
    </ElDialog>
  </div>
</template>
