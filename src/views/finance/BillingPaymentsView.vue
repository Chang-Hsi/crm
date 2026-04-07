<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  ElButton,
  ElDatePicker,
  ElDrawer,
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
  ElTabPane,
  ElTabs,
  ElTag,
} from "element-plus";
import { CirclePlus, Download, Filter, Refresh, Search } from "@element-plus/icons-vue";
import { accountList } from "../../data/accounts";
import { opportunityList } from "../../data/opportunities";
import { projectList } from "../../data/projects";
import { userList } from "../../data/users";
import {
  documentTypeMap,
  invoiceStatusMap,
  invoiceTypeMap,
  payableStatusMap,
  receivableStatusMap,
  useBillingPaymentsStore,
} from "../../composables/useBillingPaymentsStore";

const router = useRouter();
const { createRecord, getNextDocumentNo, records } = useBillingPaymentsStore();

const loading = ref(false);
const filterPanelOpen = ref(false);
const activeTab = ref("invoice");
const currentPage = ref(1);
const pageSize = ref(10);

const createDrawerOpen = ref(false);

const sortState = reactive({
  prop: "updatedAt",
  order: "descending",
});

const filters = reactive({
  keyword: "",
  dateRange: [],
  accountId: "all",
  opportunityId: "all",
  projectId: "all",
  ownerId: "all",
  invoiceStatus: "all",
  receivableStatus: "all",
  payableStatus: "all",
  onlyOverdue: "all",
  onlyException: "all",
});

function createCreateForm() {
  return {
    documentNo: getNextDocumentNo(),
    documentType: "invoice",
    accountId: "",
    opportunityId: "",
    projectId: "",
    ownerId: "u-005",
    invoiceType: "electronic",
    invoiceNo: "",
    invoiceDate: "",
    invoiceAmount: 0,
    taxAmount: 0,
    expectedReceiveAmount: 0,
    dueReceiveAt: "",
    expectedPayAmount: 0,
    duePayAt: "",
    notes: "",
  };
}

const createForm = reactive(createCreateForm());

const tabOptions = [
  { value: "invoice", label: "發票" },
  { value: "receivable", label: "收款" },
  { value: "payable", label: "付款" },
];

const yesNoOptions = [
  { value: "all", label: "全部" },
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
];

const accountOptions = [
  { value: "all", label: "全部客戶" },
  ...accountList.map((item) => ({ value: item.id, label: item.companyName })),
];

const opportunityOptions = [
  { value: "all", label: "全部商機" },
  ...opportunityList.map((item) => ({ value: item.id, label: item.name })),
];

const projectOptions = [
  { value: "all", label: "全部專案" },
  ...projectList.map((item) => ({ value: item.id, label: item.projectName })),
];

const ownerOptions = [
  { value: "all", label: "全部負責人" },
  ...userList
    .filter((item) => item.status === "active")
    .map((item) => ({ value: item.id, label: item.name })),
];

const invoiceStatusOptions = [
  { value: "all", label: "全部發票狀態" },
  ...Object.entries(invoiceStatusMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const receivableStatusOptions = [
  { value: "all", label: "全部收款狀態" },
  ...Object.entries(receivableStatusMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const payableStatusOptions = [
  { value: "all", label: "全部付款狀態" },
  ...Object.entries(payableStatusMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(String(value).replace(" ", "T"));
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

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function notify(message, title = "已更新", type = "success") {
  ElNotification({ title, message, type, position: "top-right" });
}

function isDateWithinRange(value, range) {
  const [start, end] = range || [];
  if (!start || !end) {
    return true;
  }

  const ts = toTimestamp(value);
  return ts >= toTimestamp(start) && ts <= toTimestamp(end) + 24 * 60 * 60 * 1000 - 1;
}

function matchesCurrentTab(item) {
  if (activeTab.value === "invoice") {
    return true;
  }

  if (activeTab.value === "receivable") {
    return Number(item.expectedReceiveAmount || 0) > 0;
  }

  return Number(item.expectedPayAmount || 0) > 0;
}

const filteredRecords = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return records.value.filter((item) => {
    if (!matchesCurrentTab(item)) {
      return false;
    }

    const matchesKeyword =
      keyword.length === 0 ||
      item.documentNo.toLowerCase().includes(keyword) ||
      String(item.invoiceNo || "")
        .toLowerCase()
        .includes(keyword) ||
      String(item.accountName || "")
        .toLowerCase()
        .includes(keyword) ||
      String(item.opportunityName || "")
        .toLowerCase()
        .includes(keyword) ||
      String(item.projectName || "")
        .toLowerCase()
        .includes(keyword) ||
      String(item.revenueNo || "")
        .toLowerCase()
        .includes(keyword) ||
      String(item.reconciliationNo || "")
        .toLowerCase()
        .includes(keyword);

    const matchesDate = isDateWithinRange(item.updatedAt, filters.dateRange);
    const matchesAccount =
      filters.accountId === "all" || item.accountId === filters.accountId;
    const matchesOpportunity =
      filters.opportunityId === "all" || item.opportunityId === filters.opportunityId;
    const matchesProject =
      filters.projectId === "all" || item.projectId === filters.projectId;
    const matchesOwner = filters.ownerId === "all" || item.ownerId === filters.ownerId;

    const matchesInvoiceStatus =
      filters.invoiceStatus === "all" || item.invoiceStatus === filters.invoiceStatus;
    const matchesReceivableStatus =
      filters.receivableStatus === "all" ||
      item.receivableStatus === filters.receivableStatus;
    const matchesPayableStatus =
      filters.payableStatus === "all" || item.payableStatus === filters.payableStatus;

    const matchesOverdue =
      filters.onlyOverdue === "all" ||
      (filters.onlyOverdue === "yes"
        ? item.isReceiveOverdue || item.isPayOverdue
        : !item.isReceiveOverdue && !item.isPayOverdue);

    const matchesException =
      filters.onlyException === "all" ||
      (filters.onlyException === "yes" ? item.isException : !item.isException);

    return (
      matchesKeyword &&
      matchesDate &&
      matchesAccount &&
      matchesOpportunity &&
      matchesProject &&
      matchesOwner &&
      matchesInvoiceStatus &&
      matchesReceivableStatus &&
      matchesPayableStatus &&
      matchesOverdue &&
      matchesException
    );
  });
});

const sortedRecords = computed(() => {
  const result = [...filteredRecords.value];
  const direction = sortState.order === "ascending" ? 1 : -1;

  return result.sort((a, b) => {
    if (
      ["updatedAt", "invoiceDate", "dueReceiveAt", "duePayAt"].includes(sortState.prop)
    ) {
      return (
        (toTimestamp(a[sortState.prop]) - toTimestamp(b[sortState.prop])) * direction
      );
    }

    if (
      [
        "invoiceAmount",
        "untaxedAmount",
        "taxAmount",
        "expectedReceiveAmount",
        "receivedAmount",
        "outstandingReceiveAmount",
        "expectedPayAmount",
        "paidAmount",
        "outstandingPayAmount",
      ].includes(sortState.prop)
    ) {
      return (
        (Number(a[sortState.prop] || 0) - Number(b[sortState.prop] || 0)) * direction
      );
    }

    return (
      String(a[sortState.prop] || "").localeCompare(
        String(b[sortState.prop] || ""),
        "zh-Hant"
      ) * direction
    );
  });
});

const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedRecords.value.slice(start, start + pageSize.value);
});

const tabCounts = computed(() => {
  const all = records.value;

  return {
    invoice: all.length,
    receivable: all.filter((item) => Number(item.expectedReceiveAmount || 0) > 0).length,
    payable: all.filter((item) => Number(item.expectedPayAmount || 0) > 0).length,
  };
});

const kpiCards = computed(() => {
  const all = records.value;
  const pendingInvoice = all.filter((item) => item.invoiceStatus === "pending_issue");
  const pendingReceivable = all.filter((item) => item.outstandingReceiveAmount > 0);
  const pendingPayable = all.filter((item) => item.outstandingPayAmount > 0);
  const overdueReceivable = all.filter((item) => item.isReceiveOverdue);
  const overduePayable = all.filter((item) => item.isPayOverdue);
  const changingInvoice = all.filter((item) =>
    ["voided", "crediting", "credited", "pending_reissue"].includes(item.invoiceStatus)
  );

  const receivedTotal = all.reduce(
    (sum, item) => sum + Number(item.receivedAmount || 0),
    0
  );
  const paidTotal = all.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);

  return [
    {
      label: "待開票筆數 / 金額",
      value: `${pendingInvoice.length} / ${formatCurrency(
        pendingInvoice.reduce((sum, item) => sum + Number(item.invoiceAmount || 0), 0)
      )}`,
    },
    {
      label: "待收款筆數 / 金額",
      value: `${pendingReceivable.length} / ${formatCurrency(
        pendingReceivable.reduce(
          (sum, item) => sum + Number(item.outstandingReceiveAmount || 0),
          0
        )
      )}`,
    },
    {
      label: "待付款筆數 / 金額",
      value: `${pendingPayable.length} / ${formatCurrency(
        pendingPayable.reduce(
          (sum, item) => sum + Number(item.outstandingPayAmount || 0),
          0
        )
      )}`,
    },
    {
      label: "逾期未收筆數 / 金額",
      value: `${overdueReceivable.length} / ${formatCurrency(
        overdueReceivable.reduce(
          (sum, item) => sum + Number(item.outstandingReceiveAmount || 0),
          0
        )
      )}`,
    },
    {
      label: "逾期未付筆數 / 金額",
      value: `${overduePayable.length} / ${formatCurrency(
        overduePayable.reduce(
          (sum, item) => sum + Number(item.outstandingPayAmount || 0),
          0
        )
      )}`,
    },
    {
      label: "作廢 / 折讓處理中",
      value: `${changingInvoice.length} 筆`,
    },
    {
      label: "本期已收金額",
      value: formatCurrency(receivedTotal),
    },
    {
      label: "本期已付金額",
      value: formatCurrency(paidTotal),
    },
  ];
});

function handleSortChange({ prop, order }) {
  sortState.prop = prop || "updatedAt";
  sortState.order = order || "descending";
}

function resetFilters() {
  filters.keyword = "";
  filters.dateRange = [];
  filters.accountId = "all";
  filters.opportunityId = "all";
  filters.projectId = "all";
  filters.ownerId = "all";
  filters.invoiceStatus = "all";
  filters.receivableStatus = "all";
  filters.payableStatus = "all";
  filters.onlyOverdue = "all";
  filters.onlyException = "all";
  currentPage.value = 1;
}

function openCreateDrawer() {
  Object.assign(createForm, createCreateForm());
  createDrawerOpen.value = true;
}

function submitCreate() {
  if (!createForm.accountId) {
    notify("請選擇客戶", "缺少資訊", "warning");
    return;
  }

  if (Number(createForm.invoiceAmount || 0) <= 0) {
    notify("發票金額需大於 0", "缺少資訊", "warning");
    return;
  }

  const created = createRecord(
    {
      documentNo: createForm.documentNo,
      documentType: createForm.documentType,
      accountId: createForm.accountId,
      opportunityId: createForm.opportunityId,
      projectId: createForm.projectId,
      ownerId: createForm.ownerId,
      invoiceType: createForm.invoiceType,
      invoiceNo: createForm.invoiceNo,
      invoiceDate: createForm.invoiceDate,
      invoiceAmount: createForm.invoiceAmount,
      taxAmount: createForm.taxAmount,
      expectedReceiveAmount: createForm.expectedReceiveAmount,
      dueReceiveAt: createForm.dueReceiveAt,
      expectedPayAmount: createForm.expectedPayAmount,
      duePayAt: createForm.duePayAt,
      notes: createForm.notes.trim(),
    },
    "王冠勳"
  );

  createDrawerOpen.value = false;
  notify(`${created.documentNo} 已建立`);
}

function goDetail(row) {
  router.push({
    name: "finance-billing-payments-detail",
    params: { billingId: row.id },
  });
}

function exportCsv() {
  const header =
    activeTab.value === "invoice"
      ? [
          "單據編號",
          "發票編號",
          "客戶",
          "關聯商機 / 專案",
          "發票日期",
          "發票金額",
          "未稅金額",
          "稅額",
          "發票狀態",
          "收款狀態",
          "更新時間",
        ]
      : activeTab.value === "receivable"
      ? [
          "單據編號",
          "客戶",
          "關聯發票 / 營收",
          "應收金額",
          "已收金額",
          "未收金額",
          "收款狀態",
          "到期日",
          "最後收款日",
          "是否逾期",
          "更新時間",
        ]
      : [
          "單據編號",
          "收款對象 / 客戶",
          "關聯資料",
          "應付款金額",
          "已付款金額",
          "未付款金額",
          "付款狀態",
          "到期日",
          "最後付款日",
          "是否逾期",
          "更新時間",
        ];

  const rows = sortedRecords.value.map((item) => {
    if (activeTab.value === "invoice") {
      return [
        item.documentNo,
        item.invoiceNo || "-",
        item.accountName,
        [item.opportunityName, item.projectName]
          .filter((text) => text && text !== "-")
          .join(" / ") || "-",
        item.invoiceDate || "-",
        item.invoiceAmount,
        item.untaxedAmount,
        item.taxAmount,
        invoiceStatusMap[item.invoiceStatus]?.label || item.invoiceStatus,
        receivableStatusMap[item.receivableStatus]?.label || item.receivableStatus,
        item.updatedAt,
      ];
    }

    if (activeTab.value === "receivable") {
      return [
        item.documentNo,
        item.accountName,
        [item.invoiceNo || "-", item.revenueNo || "-"].join(" / "),
        item.expectedReceiveAmount,
        item.receivedAmount,
        item.outstandingReceiveAmount,
        receivableStatusMap[item.receivableStatus]?.label || item.receivableStatus,
        item.dueReceiveAt || "-",
        item.lastReceivedAt || "-",
        item.isReceiveOverdue ? "是" : "否",
        item.updatedAt,
      ];
    }

    return [
      item.documentNo,
      item.accountName,
      [item.invoiceNo || "-", item.revenueNo || "-"].join(" / "),
      item.expectedPayAmount,
      item.paidAmount,
      item.outstandingPayAmount,
      payableStatusMap[item.payableStatus]?.label || item.payableStatus,
      item.duePayAt || "-",
      item.lastPaidAt || "-",
      item.isPayOverdue ? "是" : "否",
      item.updatedAt,
    ];
  });

  const csv = [header, ...rows]
    .map((line) =>
      line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `billing-payments-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

watch(
  () => [
    activeTab.value,
    filteredRecords.value.length,
    pageSize.value,
    filters.keyword,
    filters.accountId,
    filters.opportunityId,
    filters.projectId,
    filters.ownerId,
    filters.invoiceStatus,
    filters.receivableStatus,
    filters.payableStatus,
    filters.onlyOverdue,
    filters.onlyException,
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
            發票 / 收付款
          </h1>
          <p class="text-sm text-slate-500">管理發票狀態、收付款進度與異動追蹤</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton :icon="Download" @click="exportCsv">匯出</ElButton>
        </div>
      </header>

      <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="card in kpiCards"
          :key="card.label"
          class="rounded-2xl border border-slate-200 bg-white px-4 py-4"
        >
          <p class="text-xs text-slate-500">{{ card.label }}</p>
          <p class="mt-2 text-base font-semibold text-slate-900">{{ card.value }}</p>
        </article>
      </section>

      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div class="flex flex-wrap items-center gap-2">
            <ElInput
              v-model="filters.keyword"
              placeholder="搜尋單據 / 發票 / 客戶 / 關聯編號"
              clearable
              class="!w-80"
            >
              <template #prefix><Search class="h-4 w-4 text-slate-400" /></template>
            </ElInput>
            <ElButton
              :icon="Filter"
              :type="filterPanelOpen ? 'primary' : 'default'"
              @click="filterPanelOpen = !filterPanelOpen"
            >
              Filter
            </ElButton>
            <ElButton :icon="Refresh" @click="resetFilters">重設</ElButton>
          </div>
          <ElTag round effect="plain">共 {{ sortedRecords.length }} 筆</ElTag>
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
            class="grid gap-3 border-t border-slate-200 bg-white px-6 py-4 md:grid-cols-2 xl:grid-cols-4"
            label-position="top"
          >
            <ElFormItem>
              <ElDatePicker
                v-model="filters.dateRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                start-placeholder="更新起日"
                end-placeholder="更新迄日"
                class="!w-full"
              />
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.accountId">
                <ElOption
                  v-for="item in accountOptions"
                  :key="`acc-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.opportunityId">
                <ElOption
                  v-for="item in opportunityOptions"
                  :key="`opp-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.projectId">
                <ElOption
                  v-for="item in projectOptions"
                  :key="`proj-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.ownerId">
                <ElOption
                  v-for="item in ownerOptions"
                  :key="`owner-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.invoiceStatus">
                <ElOption
                  v-for="item in invoiceStatusOptions"
                  :key="`invoice-status-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.receivableStatus">
                <ElOption
                  v-for="item in receivableStatusOptions"
                  :key="`receive-status-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.payableStatus">
                <ElOption
                  v-for="item in payableStatusOptions"
                  :key="`pay-status-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.onlyOverdue">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`overdue-${item.value}`"
                  :label="`只看逾期：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.onlyException">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`exception-${item.value}`"
                  :label="`只看異常：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </transition>

        <div class="border-t border-slate-200 px-6 pt-3">
          <ElTabs v-model="activeTab" class="billing-tabs">
            <ElTabPane
              v-for="tab in tabOptions"
              :key="tab.value"
              :name="tab.value"
              :label="`${tab.label} (${tabCounts[tab.value] || 0})`"
            />
          </ElTabs>
        </div>

        <ElTable
          v-loading="loading"
          table-layout="auto"
          :data="pagedRecords"
          @sort-change="handleSortChange"
        >
          <ElTableColumn
            label="單據編號"
            min-width="170"
            sortable="custom"
            prop="documentNo"
          >
            <template #default="{ row }">
              <button type="button" class="grid gap-1 text-left" @click="goDetail(row)">
                <span class="font-semibold text-[#303133] hover:text-[#409eff]">{{
                  row.documentNo
                }}</span>
                <span class="text-xs text-slate-500">{{
                  row.invoiceNo || "未開立"
                }}</span>
                <div class="flex flex-wrap gap-1">
                  <ElTag
                    size="small"
                    :type="documentTypeMap[row.documentType]?.type"
                    effect="light"
                  >
                    {{ documentTypeMap[row.documentType]?.label || row.documentType }}
                  </ElTag>
                  <ElTag v-if="row.isException" size="small" type="danger" effect="light"
                    >異常</ElTag
                  >
                </div>
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="客戶" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ row.accountName }}</template>
          </ElTableColumn>

          <ElTableColumn label="關聯商機 / 專案" min-width="240" show-overflow-tooltip>
            <template #default="{ row }">
              {{
                [row.opportunityName, row.projectName]
                  .filter((text) => text && text !== "-")
                  .join(" / ") || "-"
              }}
            </template>
          </ElTableColumn>

          <template v-if="activeTab === 'invoice'">
            <ElTableColumn
              label="發票日期"
              min-width="130"
              sortable="custom"
              prop="invoiceDate"
            >
              <template #default="{ row }">{{ formatDate(row.invoiceDate) }}</template>
            </ElTableColumn>
            <ElTableColumn
              label="發票金額"
              min-width="130"
              align="right"
              sortable="custom"
              prop="invoiceAmount"
            >
              <template #default="{ row }">{{
                formatCurrency(row.invoiceAmount)
              }}</template>
            </ElTableColumn>
            <ElTableColumn label="未稅 / 稅額" min-width="170" align="right">
              <template #default="{ row }">
                <div class="grid gap-0.5 text-right text-xs text-slate-600">
                  <span>未稅：{{ formatCurrency(row.untaxedAmount) }}</span>
                  <span>稅額：{{ formatCurrency(row.taxAmount) }}</span>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="發票狀態" min-width="120">
              <template #default="{ row }">
                <ElTag
                  :type="invoiceStatusMap[row.invoiceStatus]?.type"
                  size="small"
                  effect="light"
                >
                  {{ invoiceStatusMap[row.invoiceStatus]?.label || row.invoiceStatus }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="收款狀態" min-width="120">
              <template #default="{ row }">
                <ElTag
                  :type="receivableStatusMap[row.receivableStatus]?.type"
                  size="small"
                  effect="light"
                >
                  {{
                    receivableStatusMap[row.receivableStatus]?.label ||
                    row.receivableStatus
                  }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="關聯收款" min-width="130" align="right">
              <template #default="{ row }">{{
                formatCurrency(row.receivedAmount)
              }}</template>
            </ElTableColumn>
          </template>

          <template v-if="activeTab === 'receivable'">
            <ElTableColumn label="關聯發票 / 營收" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">{{
                [row.invoiceNo || "無發票", row.revenueNo || "無營收"].join(" / ")
              }}</template>
            </ElTableColumn>
            <ElTableColumn
              label="應收金額"
              min-width="130"
              align="right"
              sortable="custom"
              prop="expectedReceiveAmount"
            >
              <template #default="{ row }">{{
                formatCurrency(row.expectedReceiveAmount)
              }}</template>
            </ElTableColumn>
            <ElTableColumn
              label="已收金額"
              min-width="130"
              align="right"
              sortable="custom"
              prop="receivedAmount"
            >
              <template #default="{ row }">{{
                formatCurrency(row.receivedAmount)
              }}</template>
            </ElTableColumn>
            <ElTableColumn
              label="未收金額"
              min-width="130"
              align="right"
              sortable="custom"
              prop="outstandingReceiveAmount"
            >
              <template #default="{ row }">{{
                formatCurrency(row.outstandingReceiveAmount)
              }}</template>
            </ElTableColumn>
            <ElTableColumn label="收款狀態" min-width="120">
              <template #default="{ row }">
                <ElTag
                  :type="receivableStatusMap[row.receivableStatus]?.type"
                  size="small"
                  effect="light"
                >
                  {{
                    receivableStatusMap[row.receivableStatus]?.label ||
                    row.receivableStatus
                  }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn
              label="到期日"
              min-width="120"
              sortable="custom"
              prop="dueReceiveAt"
            >
              <template #default="{ row }">
                <span :class="row.isReceiveOverdue ? 'font-medium text-rose-600' : ''">
                  {{ formatDate(row.dueReceiveAt) }}
                </span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="最後收款日" min-width="130">
              <template #default="{ row }">{{ formatDate(row.lastReceivedAt) }}</template>
            </ElTableColumn>
          </template>

          <template v-if="activeTab === 'payable'">
            <ElTableColumn label="關聯資料" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">{{
                [row.invoiceNo || "無發票", row.revenueNo || "無營收"].join(" / ")
              }}</template>
            </ElTableColumn>
            <ElTableColumn
              label="應付款金額"
              min-width="130"
              align="right"
              sortable="custom"
              prop="expectedPayAmount"
            >
              <template #default="{ row }">{{
                formatCurrency(row.expectedPayAmount)
              }}</template>
            </ElTableColumn>
            <ElTableColumn
              label="已付款金額"
              min-width="130"
              align="right"
              sortable="custom"
              prop="paidAmount"
            >
              <template #default="{ row }">{{ formatCurrency(row.paidAmount) }}</template>
            </ElTableColumn>
            <ElTableColumn
              label="未付款金額"
              min-width="130"
              align="right"
              sortable="custom"
              prop="outstandingPayAmount"
            >
              <template #default="{ row }">{{
                formatCurrency(row.outstandingPayAmount)
              }}</template>
            </ElTableColumn>
            <ElTableColumn label="付款狀態" min-width="120">
              <template #default="{ row }">
                <ElTag
                  :type="payableStatusMap[row.payableStatus]?.type"
                  size="small"
                  effect="light"
                >
                  {{ payableStatusMap[row.payableStatus]?.label || row.payableStatus }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn
              label="到期日"
              min-width="120"
              sortable="custom"
              prop="duePayAt"
            >
              <template #default="{ row }">
                <span :class="row.isPayOverdue ? 'font-medium text-rose-600' : ''">
                  {{ formatDate(row.duePayAt) }}
                </span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="最後付款日" min-width="130">
              <template #default="{ row }">{{ formatDate(row.lastPaidAt) }}</template>
            </ElTableColumn>
          </template>

          <ElTableColumn
            label="更新時間"
            min-width="150"
            sortable="custom"
            prop="updatedAt"
          >
            <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
          </ElTableColumn>

          <ElTableColumn label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <ElButton text type="primary" @click="goDetail(row)">查看詳情</ElButton>
            </template>
          </ElTableColumn>
        </ElTable>

        <div
          class="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-5"
        >
          <ElPagination
            v-model:current-page="currentPage"
            background
            :page-size="pageSize"
            layout="total, prev, pager, next"
            :total="sortedRecords.length"
          />
          <ElSelect v-model="pageSize" class="!w-[100px]" @change="currentPage = 1">
            <ElOption :value="10" label="10 筆" />
            <ElOption :value="20" label="20 筆" />
            <ElOption :value="50" label="50 筆" />
          </ElSelect>
        </div>
      </section>
    </section>

    <ElDrawer
      v-model="createDrawerOpen"
      size="48%"
      title="新增發票 / 收付款"
      :destroy-on-close="false"
    >
      <ElForm label-position="top" class="grid gap-3">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <ElFormItem label="單據編號">
            <ElInput v-model="createForm.documentNo" />
          </ElFormItem>
          <ElFormItem label="單據類型">
            <ElSelect v-model="createForm.documentType">
              <ElOption
                v-for="(meta, key) in documentTypeMap"
                :key="`create-type-${key}`"
                :label="meta.label"
                :value="key"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="客戶">
            <ElSelect v-model="createForm.accountId" clearable>
              <ElOption
                v-for="item in accountOptions.filter((option) => option.value !== 'all')"
                :key="`create-account-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="商機">
            <ElSelect v-model="createForm.opportunityId" clearable>
              <ElOption
                v-for="item in opportunityOptions.filter(
                  (option) => option.value !== 'all'
                )"
                :key="`create-opportunity-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="專案">
            <ElSelect v-model="createForm.projectId" clearable>
              <ElOption
                v-for="item in projectOptions.filter((option) => option.value !== 'all')"
                :key="`create-project-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="負責人">
            <ElSelect v-model="createForm.ownerId">
              <ElOption
                v-for="item in ownerOptions.filter((option) => option.value !== 'all')"
                :key="`create-owner-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="發票類型">
            <ElSelect v-model="createForm.invoiceType">
              <ElOption
                v-for="(meta, key) in invoiceTypeMap"
                :key="`create-invoice-type-${key}`"
                :label="meta.label"
                :value="key"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="發票編號">
            <ElInput v-model="createForm.invoiceNo" />
          </ElFormItem>
          <ElFormItem label="發票日期">
            <ElDatePicker
              v-model="createForm.invoiceDate"
              type="date"
              value-format="YYYY-MM-DD"
              class="!w-full"
            />
          </ElFormItem>
          <ElFormItem label="發票金額">
            <ElInputNumber v-model="createForm.invoiceAmount" :min="0" class="!w-full" />
          </ElFormItem>
          <ElFormItem label="稅額">
            <ElInputNumber v-model="createForm.taxAmount" :min="0" class="!w-full" />
          </ElFormItem>
          <ElFormItem label="應收金額">
            <ElInputNumber
              v-model="createForm.expectedReceiveAmount"
              :min="0"
              class="!w-full"
            />
          </ElFormItem>
          <ElFormItem label="應收到期日">
            <ElDatePicker
              v-model="createForm.dueReceiveAt"
              type="date"
              value-format="YYYY-MM-DD"
              class="!w-full"
            />
          </ElFormItem>
          <ElFormItem label="應付款金額">
            <ElInputNumber
              v-model="createForm.expectedPayAmount"
              :min="0"
              class="!w-full"
            />
          </ElFormItem>
          <ElFormItem label="應付到期日">
            <ElDatePicker
              v-model="createForm.duePayAt"
              type="date"
              value-format="YYYY-MM-DD"
              class="!w-full"
            />
          </ElFormItem>
        </div>

        <ElFormItem label="備註">
          <ElInput v-model="createForm.notes" type="textarea" :rows="3" />
        </ElFormItem>

        <div class="flex justify-end gap-2 border-t border-slate-200 pt-3">
          <ElButton @click="createDrawerOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitCreate">建立</ElButton>
        </div>
      </ElForm>
    </ElDrawer>
  </div>
</template>

<style scoped>
:deep(.el-form-item) {
  margin-bottom: 12px;
}

.billing-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}
</style>
