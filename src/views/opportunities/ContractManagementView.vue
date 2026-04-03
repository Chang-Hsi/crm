<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
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
  ElInputNumber,
  ElNotification,
  ElOption,
  ElPagination,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
} from "element-plus";
import {
  Bell,
  CirclePlus,
  Download,
  Filter,
  MoreFilled,
  Refresh,
  Search,
} from "@element-plus/icons-vue";
import { useAccountsStore } from "../../composables/useAccountsStore";
import { useOpportunitiesStore } from "../../composables/useOpportunitiesStore";
import { useUsersStore } from "../../composables/useUsersStore";
import {
  autoRenewOptions,
  contractList,
  contractStatusMap,
  contractStatusOptions,
  currencyOptions,
  reviewStatusMap,
  reviewStatusOptions,
  signatureStatusMap,
  signatureStatusOptions,
  yesNoOptions,
} from "../../data/contracts";

const router = useRouter();
const { accounts } = useAccountsStore();
const { opportunities } = useOpportunitiesStore();
const { users } = useUsersStore();

const records = ref(cloneRecords(contractList));
const filterPanelOpen = ref(false);
const activeQuickFilter = ref("all");
const currentPage = ref(1);
const pageSize = ref(10);
const viewingContract = ref(null);
const contractDrawerOpen = ref(false);
const contractFormDrawerOpen = ref(false);
const contractFormMode = ref("create");
const editingContractId = ref("");
const sortState = reactive({
  prop: "",
  order: "",
});

const filters = reactive({
  keyword: "",
  contractStatus: "all",
  signatureStatus: "all",
  reviewStatus: "all",
  ownerId: "all",
  customerId: "all",
  effectiveDateRange: [],
  endDateRange: [],
  expiringOnly: "all",
  autoRenew: "all",
  missingFiles: "all",
});

const contractForm = reactive(createEmptyContractForm());

const ownerOptions = computed(() => [
  { label: "全部負責業務", value: "all" },
  ...users.value
    .filter((user) => user.status === "active")
    .map((user) => ({ label: user.name, value: user.id })),
]);

const customerOptions = computed(() => [
  { label: "全部客戶", value: "all" },
  ...accounts.value.map((item) => ({ label: item.companyName, value: item.id })),
]);

const opportunityOptions = computed(() => [
  { label: "全部商機", value: "all" },
  ...opportunities.value.map((item) => ({
    label: `${item.opportunityCode} · ${item.name}`,
    value: item.id,
  })),
]);

const quickFilterOptions = [
  { value: "all", label: "全部" },
  { value: "todo", label: "待我處理" },
  { value: "month_expiring", label: "本月到期" },
  { value: "under_review", label: "審核中" },
  { value: "active", label: "已生效" },
  { value: "terminated", label: "已終止" },
];

const filteredContracts = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();
  const [effectiveStart, effectiveEnd] = filters.effectiveDateRange ?? [];
  const [endStart, endEnd] = filters.endDateRange ?? [];
  const effectiveStartTime = effectiveStart ? startOfDayTimestamp(effectiveStart) : null;
  const effectiveEndTime = effectiveEnd ? endOfDayTimestamp(effectiveEnd) : null;
  const endStartTime = endStart ? startOfDayTimestamp(endStart) : null;
  const endEndTime = endEnd ? endOfDayTimestamp(endEnd) : null;

  return records.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.contractName.toLowerCase().includes(keyword) ||
      item.contractNo.toLowerCase().includes(keyword) ||
      item.customerName.toLowerCase().includes(keyword) ||
      item.opportunityName.toLowerCase().includes(keyword);
    const matchesContractStatus =
      filters.contractStatus === "all" || item.contractStatus === filters.contractStatus;
    const matchesSignatureStatus =
      filters.signatureStatus === "all" ||
      item.signatureStatus === filters.signatureStatus;
    const matchesReviewStatus =
      filters.reviewStatus === "all" || item.reviewStatus === filters.reviewStatus;
    const matchesOwner = filters.ownerId === "all" || item.ownerId === filters.ownerId;
    const matchesCustomer =
      filters.customerId === "all" || item.customerId === filters.customerId;
    const matchesExpiring =
      filters.expiringOnly === "all" ||
      (filters.expiringOnly === "yes" && isExpiringWithin(item, 30)) ||
      (filters.expiringOnly === "no" && !isExpiringWithin(item, 30));
    const matchesAutoRenew =
      filters.autoRenew === "all" ||
      (filters.autoRenew === "yes" && item.autoRenew) ||
      (filters.autoRenew === "no" && !item.autoRenew);
    const matchesMissingFiles =
      filters.missingFiles === "all" ||
      (filters.missingFiles === "yes" && item.hasMissingFiles) ||
      (filters.missingFiles === "no" && !item.hasMissingFiles);
    const effectiveTime = item.effectiveDate
      ? startOfDayTimestamp(item.effectiveDate)
      : null;
    const endTime = item.endDate ? startOfDayTimestamp(item.endDate) : null;
    const matchesEffectiveDate =
      !effectiveStartTime ||
      !effectiveEndTime ||
      (effectiveTime !== null &&
        effectiveTime >= effectiveStartTime &&
        effectiveTime <= effectiveEndTime);
    const matchesEndDate =
      !endStartTime ||
      !endEndTime ||
      (endTime !== null && endTime >= endStartTime && endTime <= endEndTime);

    return (
      matchesKeyword &&
      matchesContractStatus &&
      matchesSignatureStatus &&
      matchesReviewStatus &&
      matchesOwner &&
      matchesCustomer &&
      matchesExpiring &&
      matchesAutoRenew &&
      matchesMissingFiles &&
      matchesEffectiveDate &&
      matchesEndDate
    );
  });
});

const quickFilteredContracts = computed(() => {
  const now = new Date();
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59
  ).getTime();

  return filteredContracts.value.filter((item) => {
    if (activeQuickFilter.value === "todo") {
      return (
        ["pending_review", "under_review", "pending_signature"].includes(
          item.contractStatus
        ) ||
        item.hasMissingFiles ||
        item.isOverdueToSign
      );
    }

    if (activeQuickFilter.value === "month_expiring") {
      const endTime = item.endDate ? endOfDayTimestamp(item.endDate) : null;
      return endTime !== null && endTime >= Date.now() && endTime <= monthEnd;
    }

    if (activeQuickFilter.value === "under_review") {
      return item.contractStatus === "under_review";
    }

    if (activeQuickFilter.value === "active") {
      return ["active", "in_execution", "renewed"].includes(item.contractStatus);
    }

    if (activeQuickFilter.value === "terminated") {
      return ["terminated", "voided"].includes(item.contractStatus);
    }

    return true;
  });
});

const sortedContracts = computed(() => {
  const items = [...quickFilteredContracts.value];

  if (!sortState.prop || !sortState.order) {
    return items.sort(
      (left, right) =>
        endOfDayTimestamp(right.lastUpdatedAt) - endOfDayTimestamp(left.lastUpdatedAt)
    );
  }

  const direction = sortState.order === "ascending" ? 1 : -1;

  return items.sort((left, right) => {
    if (sortState.prop === "amount") {
      return (left.amount - right.amount) * direction;
    }

    if (sortState.prop === "endDate") {
      return (
        (startOfDayTimestamp(left.endDate) - startOfDayTimestamp(right.endDate)) *
        direction
      );
    }

    if (sortState.prop === "daysLeft") {
      return (getDaysUntilEnd(left) - getDaysUntilEnd(right)) * direction;
    }

    if (sortState.prop === "lastUpdatedAt") {
      return (
        (endOfDayTimestamp(left.lastUpdatedAt) - endOfDayTimestamp(right.lastUpdatedAt)) *
        direction
      );
    }

    return 0;
  });
});

const pagedContracts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedContracts.value.slice(start, start + pageSize.value);
});

const summaryCards = computed(() => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  return [
    { label: "合約總數", value: records.value.length },
    {
      label: "待審核合約數",
      value: records.value.filter((item) =>
        ["pending_review", "under_review"].includes(item.contractStatus)
      ).length,
    },
    {
      label: "待簽署合約數",
      value: records.value.filter((item) => item.contractStatus === "pending_signature")
        .length,
    },
    {
      label: "已生效合約數",
      value: records.value.filter((item) =>
        ["active", "in_execution", "renewed"].includes(item.contractStatus)
      ).length,
    },
    {
      label: "30 天內到期合約數",
      value: records.value.filter((item) => isExpiringWithin(item, 30)).length,
    },
    {
      label: "本月新簽金額",
      value: records.value
        .filter((item) => {
          if (!item.effectiveDate) {
            return false;
          }

          const date = new Date(item.effectiveDate);
          return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
        })
        .reduce((total, item) => total + (item.amount ?? 0), 0),
      currency: true,
    },
  ];
});

const currentEmptyState = computed(() => {
  if (records.value.length === 0) {
    return {
      title: "目前尚無合約資料",
      description: "可從成交商機建立第一份合約。",
      action: "新增合約",
    };
  }

  return {
    title: "沒有符合條件的合約",
    description: "請調整搜尋條件或清除篩選。",
    action: "清除篩選",
  };
});

watch(
  () => [
    filters.keyword,
    filters.contractStatus,
    filters.signatureStatus,
    filters.reviewStatus,
    filters.ownerId,
    filters.customerId,
    filters.effectiveDateRange,
    filters.endDateRange,
    filters.expiringOnly,
    filters.autoRenew,
    filters.missingFiles,
    activeQuickFilter.value,
    pageSize.value,
  ],
  () => {
    currentPage.value = 1;
  }
);

watch(
  () => contractForm.opportunityId,
  (nextOpportunityId) => {
    const opportunity = opportunities.value.find((item) => item.id === nextOpportunityId);
    if (opportunity) {
      contractForm.customerId = opportunity.accountId;
    }
  }
);

function cloneRecords(recordsToClone) {
  if (typeof structuredClone === "function") {
    return structuredClone(recordsToClone);
  }

  return JSON.parse(JSON.stringify(recordsToClone));
}

function startOfDayTimestamp(value) {
  if (!value) {
    return 0;
  }

  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function endOfDayTimestamp(value) {
  if (!value) {
    return 0;
  }

  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

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

function formatDateInput(value = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatCurrency(value, currency = "TWD") {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function isExpiringWithin(item, days) {
  if (!item.endDate) {
    return false;
  }

  const diffDays = getDaysUntilEnd(item);
  return diffDays >= 0 && diffDays <= days;
}

function getDaysUntilEnd(item) {
  if (!item.endDate) {
    return Number.POSITIVE_INFINITY;
  }

  const now = startOfDayTimestamp(new Date());
  const end = startOfDayTimestamp(item.endDate);
  return Math.floor((end - now) / (1000 * 60 * 60 * 24));
}

function getDaysTagType(item) {
  const days = getDaysUntilEnd(item);
  if (days < 0 || days <= 30) {
    return "danger";
  }

  if (days <= 60) {
    return "warning";
  }

  return "info";
}

function getDaysText(item) {
  const days = getDaysUntilEnd(item);

  if (!Number.isFinite(days)) {
    return "-";
  }

  if (days < 0) {
    return `已到期 ${Math.abs(days)} 天`;
  }

  return `剩 ${days} 天`;
}

function getRiskTags(item) {
  const risks = [];

  if (item.hasMissingFiles) {
    risks.push({ label: "缺件", type: "danger" });
  }

  if (item.isOverdueToSign) {
    risks.push({ label: "簽署逾期", type: "danger" });
  }

  if (item.reviewStatus === "rejected") {
    risks.push({ label: "審核退回", type: "warning" });
  }

  if (isExpiringWithin(item, 30)) {
    risks.push({ label: "30 天內到期", type: "warning" });
  }

  return risks;
}

function notify(title, message, type = "info") {
  ElNotification({
    title,
    message,
    type,
    position: "top-right",
  });
}

function getNextContractNo() {
  const maxNumber = records.value.reduce((maxValue, item) => {
    const parts = String(item.contractNo).split("-");
    const numeric = Number(parts[2] ?? 0);
    return Number.isNaN(numeric) ? maxValue : Math.max(maxValue, numeric);
  }, 0);

  return `CT-${new Date().getFullYear()}-${String(maxNumber + 1).padStart(3, "0")}`;
}

function createEmptyContractForm() {
  const firstOpportunity = opportunities.value[0];
  const firstOwner = users.value.find((item) => item.status === "active");

  return {
    contractName: "",
    customerId: firstOpportunity?.accountId ?? "",
    opportunityId: firstOpportunity?.id ?? "",
    ownerId: firstOwner?.id ?? "",
    amount: 0,
    currency: "TWD",
    paymentTerms: "",
    effectiveDate: "",
    endDate: "",
    autoRenew: false,
    renewalReminderDays: 30,
    notes: "",
    mainFileName: "",
  };
}

function resetFilters() {
  filters.keyword = "";
  filters.contractStatus = "all";
  filters.signatureStatus = "all";
  filters.reviewStatus = "all";
  filters.ownerId = "all";
  filters.customerId = "all";
  filters.effectiveDateRange = [];
  filters.endDateRange = [];
  filters.expiringOnly = "all";
  filters.autoRenew = "all";
  filters.missingFiles = "all";
  activeQuickFilter.value = "all";
}

function toggleFilterPanel() {
  filterPanelOpen.value = !filterPanelOpen.value;
}

function handleSortChange({ prop, order }) {
  sortState.prop = prop ?? "";
  sortState.order = order ?? "";
}

function openContractDrawer(item) {
  viewingContract.value = item;
  contractDrawerOpen.value = true;
}

function openContractDetail(item) {
  router.push({
    name: "contract-detail",
    params: { contractId: item.id },
  });
}

function jumpToAccount(item) {
  router.push({
    name: "account-detail",
    params: { accountId: item.customerId },
  });
}

function jumpToOpportunity(item) {
  router.push({
    name: "opportunity-detail",
    params: { opportunityId: item.opportunityId },
  });
}

function openCreateDrawer() {
  contractFormMode.value = "create";
  editingContractId.value = "";
  Object.assign(contractForm, createEmptyContractForm());
  contractFormDrawerOpen.value = true;
}

function openEditDrawer(item) {
  contractFormMode.value = "edit";
  editingContractId.value = item.id;
  Object.assign(contractForm, {
    contractName: item.contractName,
    customerId: item.customerId,
    opportunityId: item.opportunityId,
    ownerId: item.ownerId,
    amount: Number(item.amount ?? 0),
    currency: item.currency,
    paymentTerms: item.paymentTerms,
    effectiveDate: item.effectiveDate ?? "",
    endDate: item.endDate ?? "",
    autoRenew: item.autoRenew,
    renewalReminderDays: Number(item.renewalReminderDays ?? 30),
    notes: item.notes ?? "",
    mainFileName: item.mainFileName ?? "",
  });
  contractFormDrawerOpen.value = true;
}

function resolveContractStatusByDate(endDate) {
  if (!endDate) {
    return "draft";
  }

  const days = Math.floor(
    (startOfDayTimestamp(endDate) - startOfDayTimestamp(new Date())) /
      (1000 * 60 * 60 * 24)
  );
  if (days >= 0 && days <= 30) {
    return "expiring_soon";
  }

  return "pending_review";
}

function saveContractForm() {
  if (!contractForm.contractName.trim()) {
    notify("缺少資訊", "請輸入合約名稱。", "warning");
    return;
  }

  if (!contractForm.customerId || !contractForm.opportunityId || !contractForm.ownerId) {
    notify("缺少資訊", "請選擇客戶、商機與負責業務。", "warning");
    return;
  }

  if (Number(contractForm.amount) <= 0) {
    notify("缺少資訊", "請輸入大於 0 的合約金額。", "warning");
    return;
  }

  if (!contractForm.effectiveDate || !contractForm.endDate) {
    notify("缺少資訊", "請填寫生效日與到期日。", "warning");
    return;
  }

  if (
    startOfDayTimestamp(contractForm.endDate) <
    startOfDayTimestamp(contractForm.effectiveDate)
  ) {
    notify("日期不正確", "到期日不可早於生效日。", "warning");
    return;
  }

  const customer = accounts.value.find((item) => item.id === contractForm.customerId);
  const opportunity = opportunities.value.find(
    (item) => item.id === contractForm.opportunityId
  );
  const owner = users.value.find((item) => item.id === contractForm.ownerId);

  if (contractFormMode.value === "edit" && editingContractId.value) {
    const target = records.value.find((item) => item.id === editingContractId.value);
    if (!target) {
      return;
    }

    Object.assign(target, {
      contractName: contractForm.contractName.trim(),
      customerId: contractForm.customerId,
      customerName: customer?.companyName ?? "-",
      opportunityId: contractForm.opportunityId,
      opportunityName: opportunity?.name ?? "-",
      ownerId: contractForm.ownerId,
      ownerName: owner?.name ?? "未指派",
      amount: Number(contractForm.amount ?? 0),
      currency: contractForm.currency,
      paymentTerms: contractForm.paymentTerms.trim(),
      effectiveDate: contractForm.effectiveDate,
      endDate: contractForm.endDate,
      autoRenew: contractForm.autoRenew,
      renewalReminderDays: Number(contractForm.renewalReminderDays ?? 30),
      notes: contractForm.notes.trim(),
      mainFileName: contractForm.mainFileName.trim() || null,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: owner?.name ?? target.lastUpdatedBy,
      hasMissingFiles: !contractForm.mainFileName.trim(),
      contractStatus: ["terminated", "voided", "completed"].includes(
        target.contractStatus
      )
        ? target.contractStatus
        : resolveContractStatusByDate(contractForm.endDate),
    });

    notify("已更新", `${target.contractNo} 已更新。`, "success");
  } else {
    const contractNo = getNextContractNo();
    const ownerName = owner?.name ?? "未指派";
    records.value.unshift({
      id: `ctm-${Date.now()}`,
      contractNo,
      contractName: contractForm.contractName.trim(),
      customerId: contractForm.customerId,
      customerName: customer?.companyName ?? "-",
      opportunityId: contractForm.opportunityId,
      opportunityName: opportunity?.name ?? "-",
      ownerId: contractForm.ownerId,
      ownerName,
      amount: Number(contractForm.amount ?? 0),
      currency: contractForm.currency,
      paymentTerms: contractForm.paymentTerms.trim(),
      startDate: contractForm.effectiveDate,
      effectiveDate: contractForm.effectiveDate,
      endDate: contractForm.endDate,
      autoRenew: contractForm.autoRenew,
      renewalReminderDays: Number(contractForm.renewalReminderDays ?? 30),
      contractStatus: "draft",
      signatureStatus: "not_sent",
      reviewStatus: "not_submitted",
      version: "v1.0",
      attachmentCount: contractForm.mainFileName.trim() ? 1 : 0,
      mainFileName: contractForm.mainFileName.trim() || null,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: ownerName,
      hasMissingFiles: !contractForm.mainFileName.trim(),
      isOverdueToSign: false,
      notes: contractForm.notes.trim(),
    });

    notify("已建立", `${contractNo} 已新增為草稿。`, "success");
  }

  contractFormDrawerOpen.value = false;
}

function downloadContract(item) {
  const content = [
    `Contract No: ${item.contractNo}`,
    `Contract Name: ${item.contractName}`,
    `Customer: ${item.customerName}`,
    `Opportunity: ${item.opportunityName}`,
    `Amount: ${formatCurrency(item.amount, item.currency)}`,
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${item.contractNo}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function handleSubmitReview(item) {
  if (!["draft", "pending_review"].includes(item.contractStatus)) {
    notify("無法送審", "目前狀態不可送審。", "warning");
    return;
  }

  item.contractStatus = "under_review";
  item.reviewStatus = "pending";
  item.lastUpdatedAt = new Date().toISOString();
  item.lastUpdatedBy = item.ownerName;
  notify("已送審", `${item.contractNo} 已送審。`, "success");
}

function handleRemindSign(item) {
  item.isOverdueToSign = false;
  item.lastUpdatedAt = new Date().toISOString();
  notify("已催簽", `${item.contractNo} 已送出催簽通知。`, "success");
}

function handleRenew(item) {
  const baseNo = getNextContractNo();
  const nextVersionNo = `${item.version}-R`;
  const nextStart = item.endDate
    ? formatDateInput(new Date(startOfDayTimestamp(item.endDate) + 24 * 60 * 60 * 1000))
    : formatDateInput(new Date());
  const nextEnd = item.endDate
    ? formatDateInput(
        new Date(startOfDayTimestamp(item.endDate) + 365 * 24 * 60 * 60 * 1000)
      )
    : formatDateInput(new Date());

  records.value.unshift({
    ...cloneRecords(item),
    id: `ctm-${Date.now()}`,
    contractNo: baseNo,
    contractName: `${item.contractName}（續約）`,
    startDate: nextStart,
    effectiveDate: nextStart,
    endDate: nextEnd,
    contractStatus: "draft",
    signatureStatus: "not_sent",
    reviewStatus: "not_submitted",
    isOverdueToSign: false,
    version: nextVersionNo,
    lastUpdatedAt: new Date().toISOString(),
    lastUpdatedBy: item.ownerName,
    notes: `${item.notes ?? ""}\n由 ${item.contractNo} 建立續約草稿`.trim(),
  });

  notify("已建立續約草稿", `${baseNo} 已建立。`, "success");
}

function handleActionCommand(command, item) {
  if (command === "submit-review") {
    handleSubmitReview(item);
    return;
  }

  if (command === "download") {
    downloadContract(item);
    return;
  }

  if (command === "remind-sign") {
    handleRemindSign(item);
    return;
  }

  if (command === "renew") {
    handleRenew(item);
    return;
  }

  if (command === "void") {
    item.contractStatus = "voided";
    item.lastUpdatedAt = new Date().toISOString();
    item.lastUpdatedBy = "系統";
    notify("已作廢", `${item.contractNo} 已標記為作廢。`, "warning");
    return;
  }

  if (command === "terminate") {
    item.contractStatus = "terminated";
    item.lastUpdatedAt = new Date().toISOString();
    item.lastUpdatedBy = "系統";
    notify("已終止", `${item.contractNo} 已標記為終止。`, "warning");
    return;
  }

  if (command === "history") {
    openContractDetail(item);
    return;
  }
}
</script>

<template>
  <div class="min-h-full bg-slate-50 p-8">
    <section class="grid gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-2">
          <h1 class="text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-900">
            合約管理
          </h1>
          <p class="text-sm text-slate-500">
            集中管理商機相關合約、審核、簽署與到期追蹤。
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton type="primary" :icon="CirclePlus" @click="openCreateDrawer"
            >新增合約</ElButton
          >
          <ElButton
            :icon="Download"
            @click="notify('即將開放', '匯出功能將於下一階段開放。')"
            >匯出</ElButton
          >
          <ElButton :icon="Bell" @click="notify('即將開放', '批次提醒將於下一階段開放。')"
            >批次提醒</ElButton
          >
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-6">
        <section
          v-for="card in summaryCards"
          :key="card.label"
          class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div class="grid gap-1">
            <p class="text-xs font-medium text-slate-500">{{ card.label }}</p>
            <p class="text-xl font-semibold text-slate-900">
              {{ card.currency ? formatCurrency(card.value) : card.value }}
            </p>
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
              依合約狀態、簽署進度、客戶與到期日快速聚焦。
            </p>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-3">
            <ElInput
              v-model="filters.keyword"
              placeholder="搜尋合約名稱 / 合約編號 / 商機名稱 / 客戶名稱"
              :prefix-icon="Search"
              clearable
              class="!w-[380px] max-[760px]:!w-full"
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
            <div class="grid gap-4 xl:grid-cols-5">
              <ElSelect v-model="filters.contractStatus">
                <ElOption
                  v-for="item in contractStatusOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.signatureStatus">
                <ElOption
                  v-for="item in signatureStatusOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.reviewStatus">
                <ElOption
                  v-for="item in reviewStatusOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.ownerId" filterable>
                <ElOption
                  v-for="item in ownerOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.customerId" filterable>
                <ElOption
                  v-for="item in customerOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElDatePicker
                v-model="filters.effectiveDateRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                start-placeholder="生效日開始"
                end-placeholder="生效日結束"
                range-separator="至"
                class="!w-full"
              />

              <ElDatePicker
                v-model="filters.endDateRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                start-placeholder="到期日開始"
                end-placeholder="到期日結束"
                range-separator="至"
                class="!w-full"
              />

              <ElSelect v-model="filters.expiringOnly">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="item.value"
                  :label="`即將到期：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.autoRenew">
                <ElOption
                  v-for="item in autoRenewOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <div class="flex items-center gap-2">
                <ElSelect v-model="filters.missingFiles">
                  <ElOption
                    v-for="item in yesNoOptions"
                    :key="item.value"
                    :label="`缺件：${item.label}`"
                    :value="item.value"
                  />
                </ElSelect>
                <ElButton :icon="Refresh" @click="resetFilters">清除篩選</ElButton>
              </div>
            </div>
          </div>
        </transition>
      </section>

      <ElEmpty
        v-if="records.length === 0"
        :description="currentEmptyState.title"
        class="rounded-2xl border border-slate-200 bg-white py-20"
      >
        <p class="mb-3 text-sm text-slate-500">{{ currentEmptyState.description }}</p>
        <ElButton type="primary" @click="openCreateDrawer">{{
          currentEmptyState.action
        }}</ElButton>
      </ElEmpty>

      <section
        v-else
        class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div class="px-6 pt-3">
          <ElTabs v-model="activeQuickFilter">
            <ElTabPane
              v-for="item in quickFilterOptions"
              :key="item.value"
              :name="item.value"
              :label="item.label"
            />
          </ElTabs>
        </div>

        <div
          class="flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 px-6 py-4"
        >
          <div class="grid gap-1">
            <h2 class="text-base font-semibold text-slate-900">Contract Table</h2>
            <p class="text-sm text-slate-500">管理草稿、審核、簽署、生效與到期風險。</p>
          </div>
          <ElTag round effect="plain">共 {{ sortedContracts.length }} 筆</ElTag>
        </div>

        <ElEmpty
          v-if="sortedContracts.length === 0"
          :description="currentEmptyState.title"
          class="py-20"
        >
          <p class="mb-3 text-sm text-slate-500">{{ currentEmptyState.description }}</p>
          <ElButton type="primary" @click="resetFilters">{{
            currentEmptyState.action
          }}</ElButton>
        </ElEmpty>

        <template v-else>
          <ElTable
            :data="pagedContracts"
            size="large"
            table-layout="auto"
            @sort-change="handleSortChange"
          >
            <ElTableColumn label="合約名稱" min-width="250">
              <template #default="{ row }">
                <div class="grid gap-1">
                  <button
                    type="button"
                    class="text-left text-sm font-semibold text-slate-900 hover:text-[#409eff]"
                    @click="openContractDrawer(row)"
                  >
                    {{ row.contractName }}
                  </button>
                  <span class="text-xs text-slate-400">{{ row.contractNo }}</span>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="客戶名稱" min-width="190">
              <template #default="{ row }">
                <button
                  type="button"
                  class="text-left text-sm font-medium text-[#409eff] hover:text-[#337ecc]"
                  @click="jumpToAccount(row)"
                >
                  {{ row.customerName }}
                </button>
              </template>
            </ElTableColumn>

            <ElTableColumn label="關聯商機" min-width="220">
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

            <ElTableColumn label="負責業務" min-width="110" prop="ownerName" />

            <ElTableColumn
              label="合約金額"
              min-width="160"
              prop="amount"
              sortable="custom"
            >
              <template #default="{ row }">{{
                formatCurrency(row.amount, row.currency)
              }}</template>
            </ElTableColumn>

            <ElTableColumn label="簽署狀態" min-width="120">
              <template #default="{ row }">
                <ElTag
                  round
                  effect="light"
                  :type="signatureStatusMap[row.signatureStatus]?.type ?? 'info'"
                >
                  {{
                    signatureStatusMap[row.signatureStatus]?.label ??
                    row.signatureStatus
                  }}
                </ElTag>
              </template>
            </ElTableColumn>

            <ElTableColumn label="合約狀態" min-width="120">
              <template #default="{ row }">
                <ElTag
                  round
                  effect="light"
                  :type="contractStatusMap[row.contractStatus]?.type ?? 'info'"
                >
                  {{ contractStatusMap[row.contractStatus]?.label ?? row.contractStatus }}
                </ElTag>
              </template>
            </ElTableColumn>

            <ElTableColumn label="生效日" min-width="120">
              <template #default="{ row }">{{ formatDate(row.effectiveDate) }}</template>
            </ElTableColumn>

            <ElTableColumn
              label="到期日"
              min-width="120"
              prop="endDate"
              sortable="custom"
            >
              <template #default="{ row }">{{ formatDate(row.endDate) }}</template>
            </ElTableColumn>

            <ElTableColumn
              label="距到期天數"
              min-width="130"
              prop="daysLeft"
              sortable="custom"
            >
              <template #default="{ row }">
                <ElTag round effect="light" :type="getDaysTagType(row)">
                  {{ getDaysText(row) }}
                </ElTag>
              </template>
            </ElTableColumn>

            <ElTableColumn label="版本" min-width="80" prop="version" />

            <ElTableColumn
              label="最後更新時間"
              min-width="140"
              prop="lastUpdatedAt"
              sortable="custom"
            >
              <template #default="{ row }">{{
                formatDate(row.lastUpdatedAt, true)
              }}</template>
            </ElTableColumn>

            <ElTableColumn label="操作" width="190" fixed="right">
              <template #default="{ row }">
                <div class="flex items-center justify-end gap-1">
                  <ElButton text type="primary" @click="openContractDrawer(row)"
                    >查看</ElButton
                  >
                  <ElButton text @click="openEditDrawer(row)">編輯</ElButton>
                  <ElDropdown
                    trigger="click"
                    @command="(command) => handleActionCommand(command, row)"
                  >
                    <button
                      type="button"
                      class="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <MoreFilled class="h-4 w-4" />
                    </button>
                    <template #dropdown>
                      <ElDropdownMenu>
                        <ElDropdownItem command="submit-review">送審</ElDropdownItem>
                        <ElDropdownItem command="download">下載</ElDropdownItem>
                        <ElDropdownItem command="remind-sign">催簽</ElDropdownItem>
                        <ElDropdownItem command="renew">續約</ElDropdownItem>
                        <ElDropdownItem command="void">作廢</ElDropdownItem>
                        <ElDropdownItem command="terminate">終止</ElDropdownItem>
                        <ElDropdownItem command="history">查看歷程</ElDropdownItem>
                      </ElDropdownMenu>
                    </template>
                  </ElDropdown>
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
              :total="sortedContracts.length"
              background
            />

            <ElSelect v-model="pageSize" class="!w-[96px]" @change="currentPage = 1">
              <ElOption :value="10" label="10 Item" />
              <ElOption :value="20" label="20 Item" />
              <ElOption :value="50" label="50 Item" />
            </ElSelect>
          </div>
        </template>
      </section>
    </section>

    <ElDrawer v-model="contractDrawerOpen" size="48%" :with-header="false">
      <template v-if="viewingContract">
        <div class="flex h-full flex-col">
          <div class="border-b border-slate-200 px-6 py-5">
            <div class="grid gap-2">
              <h3 class="text-xl font-semibold tracking-[-0.03em] text-slate-900">
                {{ viewingContract.contractName }}
              </h3>
              <p class="text-sm text-slate-500">{{ viewingContract.contractNo }}</p>
              <div class="flex flex-wrap items-center gap-2">
                <ElTag
                  round
                  effect="light"
                  :type="
                    contractStatusMap[viewingContract.contractStatus]?.type ?? 'info'
                  "
                >
                  {{
                    contractStatusMap[viewingContract.contractStatus]?.label ??
                    viewingContract.contractStatus
                  }}
                </ElTag>
                <ElTag
                  round
                  effect="light"
                  :type="
                    signatureStatusMap[viewingContract.signatureStatus]?.type ?? 'info'
                  "
                >
                  {{
                    signatureStatusMap[viewingContract.signatureStatus]?.label ??
                    viewingContract.signatureStatus
                  }}
                </ElTag>
                <ElTag
                  round
                  effect="light"
                  :type="reviewStatusMap[viewingContract.reviewStatus]?.type ?? 'info'"
                >
                  {{
                    reviewStatusMap[viewingContract.reviewStatus]?.label ??
                    viewingContract.reviewStatus
                  }}
                </ElTag>
              </div>
            </div>
          </div>

          <div class="grid gap-4 overflow-y-auto px-6 py-5">
            <section class="grid gap-3 rounded-2xl border border-slate-200 p-4">
              <h4 class="text-sm font-semibold text-slate-900">基本資訊</h4>
              <div class="grid gap-3 sm:grid-cols-2">
                <div class="grid gap-1">
                  <span class="text-xs text-slate-400">客戶</span>
                  <button
                    type="button"
                    class="w-fit text-sm text-[#409eff]"
                    @click="jumpToAccount(viewingContract)"
                  >
                    {{ viewingContract.customerName }}
                  </button>
                </div>
                <div class="grid gap-1">
                  <span class="text-xs text-slate-400">關聯商機</span>
                  <button
                    type="button"
                    class="w-fit text-sm text-[#409eff]"
                    @click="jumpToOpportunity(viewingContract)"
                  >
                    {{ viewingContract.opportunityName }}
                  </button>
                </div>
                <div class="grid gap-1">
                  <span class="text-xs text-slate-400">合約金額</span>
                  <span class="text-sm font-semibold text-slate-900">
                    {{ formatCurrency(viewingContract.amount, viewingContract.currency) }}
                  </span>
                </div>
                <div class="grid gap-1">
                  <span class="text-xs text-slate-400">距到期天數</span>
                  <ElTag round effect="light" :type="getDaysTagType(viewingContract)">
                    {{ getDaysText(viewingContract) }}
                  </ElTag>
                </div>
              </div>
            </section>

            <section class="grid gap-2 rounded-2xl border border-slate-200 p-4">
              <h4 class="text-sm font-semibold text-slate-900">風險提示</h4>
              <div class="flex flex-wrap gap-2">
                <ElTag
                  v-for="risk in getRiskTags(viewingContract)"
                  :key="risk.label"
                  round
                  effect="light"
                  :type="risk.type"
                >
                  {{ risk.label }}
                </ElTag>
                <span
                  v-if="getRiskTags(viewingContract).length === 0"
                  class="text-sm text-slate-500"
                >
                  目前無風險標記
                </span>
              </div>
            </section>
          </div>

          <div class="border-t border-slate-200 px-6 py-4">
            <div class="flex flex-wrap items-center justify-end gap-3">
              <ElButton @click="openContractDetail(viewingContract)"
                >查看完整詳情</ElButton
              >
              <ElButton @click="openEditDrawer(viewingContract)">編輯</ElButton>
              <ElButton type="primary" @click="handleSubmitReview(viewingContract)"
                >送審</ElButton
              >
            </div>
          </div>
        </div>
      </template>
    </ElDrawer>

    <ElDrawer v-model="contractFormDrawerOpen" size="42%" :with-header="false">
      <div class="flex h-full flex-col">
        <div class="border-b border-slate-200 px-6 py-5">
          <div class="flex items-start justify-between gap-4">
            <div class="grid gap-2">
              <h3 class="text-xl font-semibold tracking-[-0.03em] text-slate-900">
                {{ contractFormMode === "edit" ? "編輯合約" : "新增合約" }}
              </h3>
              <p class="text-sm text-slate-500">
                先完成主檔、金額與期間，後續可再補附件與流程資訊。
              </p>
            </div>
            <ElButton @click="contractFormDrawerOpen = false">關閉</ElButton>
          </div>
        </div>

        <div class="overflow-y-auto px-6 py-5">
          <ElForm label-position="top" class="grid gap-4">
            <ElFormItem label="合約名稱" required>
              <ElInput v-model="contractForm.contractName" placeholder="請輸入合約名稱" />
            </ElFormItem>

            <div class="grid gap-4 sm:grid-cols-2">
              <ElFormItem label="關聯商機" required>
                <ElSelect v-model="contractForm.opportunityId" filterable class="!w-full">
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

              <ElFormItem label="客戶" required>
                <ElSelect v-model="contractForm.customerId" filterable class="!w-full">
                  <ElOption
                    v-for="item in customerOptions.filter(
                      (option) => option.value !== 'all'
                    )"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <ElFormItem label="負責業務" required>
                <ElSelect v-model="contractForm.ownerId" class="!w-full">
                  <ElOption
                    v-for="item in ownerOptions.filter(
                      (option) => option.value !== 'all'
                    )"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>

              <ElFormItem label="幣別" required>
                <ElSelect v-model="contractForm.currency" class="!w-full">
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
              <ElFormItem label="合約金額" required>
                <ElInputNumber
                  v-model="contractForm.amount"
                  :min="0"
                  :step="100000"
                  controls-position="right"
                  class="!w-full"
                />
              </ElFormItem>

              <ElFormItem label="續約提醒天數">
                <ElInputNumber
                  v-model="contractForm.renewalReminderDays"
                  :min="1"
                  :max="365"
                  class="!w-full"
                />
              </ElFormItem>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <ElFormItem label="生效日" required>
                <ElDatePicker
                  v-model="contractForm.effectiveDate"
                  value-format="YYYY-MM-DD"
                  class="!w-full"
                />
              </ElFormItem>
              <ElFormItem label="到期日" required>
                <ElDatePicker
                  v-model="contractForm.endDate"
                  value-format="YYYY-MM-DD"
                  class="!w-full"
                />
              </ElFormItem>
            </div>

            <ElFormItem label="付款條件">
              <ElInput
                v-model="contractForm.paymentTerms"
                placeholder="例如：30% 預付款 / 70% 驗收後 30 天"
              />
            </ElFormItem>

            <ElFormItem label="主檔名稱">
              <ElInput
                v-model="contractForm.mainFileName"
                placeholder="例如：contract-v1.0.pdf"
              />
            </ElFormItem>

            <ElFormItem label="自動續約">
              <ElSwitch v-model="contractForm.autoRenew" />
            </ElFormItem>

            <ElFormItem label="備註">
              <ElInput
                v-model="contractForm.notes"
                type="textarea"
                :rows="4"
                placeholder="可輸入合作背景、特殊條件或流程注意事項"
              />
            </ElFormItem>
          </ElForm>
        </div>

        <div class="border-t border-slate-200 px-6 py-4">
          <div class="flex items-center justify-end gap-3">
            <ElButton @click="contractFormDrawerOpen = false">取消</ElButton>
            <ElButton type="primary" @click="saveContractForm">
              {{ contractFormMode === "edit" ? "儲存變更" : "建立合約" }}
            </ElButton>
          </div>
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

<style scoped>
:deep(.el-tabs__header) {
  margin: 0 !important;
}
</style>
