<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElDivider,
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
  ElTable,
  ElTableColumn,
  ElTag,
  ElTimeline,
  ElTimelineItem,
} from "element-plus";
import { ArrowLeft, Bell, Download, Edit, MoreFilled } from "@element-plus/icons-vue";
import { useAppShell } from "../../composables/useAppShell";
import {
  contractDetailsById,
  contractStatusMap,
  reviewStatusMap,
  signatureStatusMap,
} from "../../data/contracts";

const route = useRoute();
const router = useRouter();
const { updateVisitedTag } = useAppShell();

const contractId = computed(() => String(route.params.contractId ?? ""));
const contract = ref(null);
const editDrawerOpen = ref(false);
const contractEditForm = reactive(createEmptyEditForm());

const reviewNodes = [
  { key: "not_submitted", label: "未送審" },
  { key: "pending", label: "審核中" },
  { key: "approved", label: "已核准" },
  { key: "rejected", label: "已退回" },
];

const signatureNodes = [
  { key: "not_sent", label: "未送簽" },
  { key: "signing", label: "簽署中" },
  { key: "customer_signed", label: "客戶已簽" },
  { key: "internal_signed", label: "我方已簽" },
  { key: "fully_signed", label: "雙方完成" },
];

const reviewStepIndexMap = {
  not_submitted: 0,
  pending: 1,
  approved: 2,
  rejected: 2,
};

const signatureStepIndexMap = {
  not_sent: 0,
  signing: 1,
  customer_signed: 2,
  internal_signed: 3,
  fully_signed: 4,
};

const pageTitle = computed(() => {
  if (!contract.value) {
    return "合約管理 / 詳情";
  }

  return `合約管理 / ${contract.value.contractName}`;
});

const daysUntilEnd = computed(() => {
  if (!contract.value?.endDate) {
    return Number.POSITIVE_INFINITY;
  }

  const now = startOfDayTimestamp(new Date());
  const end = startOfDayTimestamp(contract.value.endDate);
  return Math.floor((end - now) / (1000 * 60 * 60 * 24));
});

const durationLabel = computed(() => {
  if (!contract.value?.effectiveDate || !contract.value?.endDate) {
    return "-";
  }

  const start = startOfDayTimestamp(contract.value.effectiveDate);
  const end = startOfDayTimestamp(contract.value.endDate);
  const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  return `${Math.round(days / 30)} 個月`;
});

const reviewCurrentStep = computed(() => {
  return reviewStepIndexMap[contract.value?.reviewStatus ?? "not_submitted"] ?? 0;
});

const signatureCurrentStep = computed(() => {
  return signatureStepIndexMap[contract.value?.signatureStatus ?? "not_sent"] ?? 0;
});

const riskTags = computed(() => {
  const tags = [];
  if (!contract.value) {
    return tags;
  }

  if (contract.value.hasMissingFiles) {
    tags.push({ label: "缺件", type: "danger" });
  }

  if (contract.value.isOverdueToSign) {
    tags.push({ label: "簽署逾期", type: "danger" });
  }

  if (contract.value.reviewStatus === "rejected") {
    tags.push({ label: "審核退回", type: "warning" });
  }

  if (daysUntilEnd.value <= 30 && daysUntilEnd.value >= 0) {
    tags.push({ label: "30 天內到期", type: "warning" });
  }

  if (daysUntilEnd.value < 0) {
    tags.push({ label: "已到期未續", type: "danger" });
  }

  return tags;
});

const contractSummaryCards = computed(() => {
  if (!contract.value) {
    return [];
  }

  return [
    {
      label: "合約金額",
      value: formatCurrency(contract.value.amount, contract.value.currency),
    },
    {
      label: "生效日",
      value: formatDate(contract.value.effectiveDate),
    },
    {
      label: "到期日",
      value: formatDate(contract.value.endDate),
    },
    {
      label: "距到期天數",
      value: getDaysText(daysUntilEnd.value),
      type: getDaysTagType(daysUntilEnd.value),
      tag: true,
    },
  ];
});

const canSubmitReview = computed(() => {
  return contract.value
    ? ["draft", "pending_review"].includes(contract.value.contractStatus)
    : false;
});

const canFollowSignature = computed(() => {
  return contract.value ? contract.value.contractStatus === "pending_signature" : false;
});

const canRenew = computed(() => {
  return contract.value
    ? ["active", "in_execution", "expiring_soon", "completed"].includes(
        contract.value.contractStatus
      )
    : false;
});

watch(
  contractId,
  (id) => {
    const record = contractDetailsById[id];
    contract.value = record ? cloneRecord(record) : null;
  },
  { immediate: true }
);

watch(
  [() => route.fullPath, pageTitle],
  () => {
    updateVisitedTag(route.fullPath, { title: pageTitle.value });
  },
  { immediate: true }
);

function cloneRecord(record) {
  if (typeof structuredClone === "function") {
    return structuredClone(record);
  }

  return JSON.parse(JSON.stringify(record));
}

function createEmptyEditForm() {
  return {
    contractName: "",
    paymentTerms: "",
    amount: 0,
    effectiveDate: "",
    endDate: "",
    autoRenew: false,
    renewalReminderDays: 30,
    notes: "",
    mainFileName: "",
  };
}

function startOfDayTimestamp(value) {
  if (!value) {
    return 0;
  }

  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
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

function formatCurrency(value, currency = "TWD") {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatFileSize(bytes) {
  if (!bytes) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDaysTagType(days) {
  if (!Number.isFinite(days) || days > 60) {
    return "info";
  }

  if (days >= 31 && days <= 60) {
    return "warning";
  }

  return "danger";
}

function getDaysText(days) {
  if (!Number.isFinite(days)) {
    return "-";
  }

  if (days < 0) {
    return `已到期 ${Math.abs(days)} 天`;
  }

  return `剩 ${days} 天`;
}

function notify(title, message, type = "info") {
  ElNotification({
    title,
    message,
    type,
    position: "top-right",
  });
}

function addActivity(type, title, content) {
  if (!contract.value) {
    return;
  }

  contract.value.activities.unshift({
    id: `act-${Date.now()}`,
    type,
    title,
    content,
    operatorName: "目前登入者",
    createdAt: new Date().toISOString(),
  });
}

function markUpdatedBySystem() {
  if (!contract.value) {
    return;
  }

  contract.value.lastUpdatedAt = new Date().toISOString();
  contract.value.lastUpdatedBy = "目前登入者";
}

function openEditDrawer() {
  if (!contract.value) {
    return;
  }

  Object.assign(contractEditForm, {
    contractName: contract.value.contractName,
    paymentTerms: contract.value.paymentTerms,
    amount: Number(contract.value.amount ?? 0),
    effectiveDate: contract.value.effectiveDate ?? "",
    endDate: contract.value.endDate ?? "",
    autoRenew: contract.value.autoRenew,
    renewalReminderDays: Number(contract.value.renewalReminderDays ?? 30),
    notes: contract.value.notes ?? "",
    mainFileName: contract.value.mainFileName ?? "",
  });
  editDrawerOpen.value = true;
}

function saveEdit() {
  if (!contract.value) {
    return;
  }

  if (!contractEditForm.contractName.trim()) {
    notify("缺少資訊", "請輸入合約名稱。", "warning");
    return;
  }

  if (Number(contractEditForm.amount) <= 0) {
    notify("缺少資訊", "請輸入合約金額。", "warning");
    return;
  }

  if (
    contractEditForm.effectiveDate &&
    contractEditForm.endDate &&
    startOfDayTimestamp(contractEditForm.endDate) <
      startOfDayTimestamp(contractEditForm.effectiveDate)
  ) {
    notify("日期不正確", "到期日不可早於生效日。", "warning");
    return;
  }

  contract.value.contractName = contractEditForm.contractName.trim();
  contract.value.paymentTerms = contractEditForm.paymentTerms.trim();
  contract.value.amount = Number(contractEditForm.amount ?? 0);
  contract.value.effectiveDate = contractEditForm.effectiveDate || null;
  contract.value.endDate = contractEditForm.endDate || null;
  contract.value.autoRenew = contractEditForm.autoRenew;
  contract.value.renewalReminderDays = Number(contractEditForm.renewalReminderDays ?? 30);
  contract.value.notes = contractEditForm.notes.trim();
  contract.value.mainFileName = contractEditForm.mainFileName.trim() || null;
  contract.value.hasMissingFiles = !contractEditForm.mainFileName.trim();

  if (contract.value.mainFileName && contract.value.attachments.length > 0) {
    contract.value.attachments[0].name = contract.value.mainFileName;
  }

  markUpdatedBySystem();
  addActivity("update", "編輯合約", "已更新合約基本資訊。");
  notify("已更新", "合約資料已更新。", "success");
  editDrawerOpen.value = false;
}

function handleSubmitReview() {
  if (!contract.value) {
    return;
  }

  if (!canSubmitReview.value) {
    notify("無法送審", "目前狀態不可送審。", "warning");
    return;
  }

  contract.value.contractStatus = "under_review";
  contract.value.reviewStatus = "pending";
  contract.value.reviewSubmittedAt = new Date().toISOString();
  markUpdatedBySystem();
  addActivity("review", "送審合約", "已送出法務審核。");
  notify("已送審", `${contract.value.contractNo} 已送審。`, "success");
}

function handleDownloadMain() {
  if (!contract.value) {
    return;
  }

  const content = [
    `Contract No: ${contract.value.contractNo}`,
    `Contract Name: ${contract.value.contractName}`,
    `Customer: ${contract.value.customerName}`,
    `Amount: ${formatCurrency(contract.value.amount, contract.value.currency)}`,
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${contract.value.contractNo}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  addActivity("download", "下載合約", "已下載主合約檔。");
}

function handleRemindSign() {
  if (!contract.value) {
    return;
  }

  if (!canFollowSignature.value) {
    notify("目前不可催簽", "合約尚未進入待簽署狀態。", "warning");
    return;
  }

  contract.value.isOverdueToSign = false;
  markUpdatedBySystem();
  addActivity("signature", "催簽", "已發送催簽提醒。");
  notify("已催簽", "已完成催簽通知。", "success");
}

function handleRenew() {
  if (!contract.value || !canRenew.value) {
    notify("目前不可續約", "合約尚未進入可續約狀態。", "warning");
    return;
  }

  addActivity("renew", "建立續約草稿", "已從本合約建立續約草稿。");
  notify("已建立續約草稿", "續約資料已帶入新草稿。", "success");
}

function handleVoid() {
  if (!contract.value) {
    return;
  }

  contract.value.contractStatus = "voided";
  markUpdatedBySystem();
  addActivity("void", "作廢合約", "此合約已作廢。");
  notify("已作廢", `${contract.value.contractNo} 已作廢。`, "warning");
}

function handleTerminate() {
  if (!contract.value) {
    return;
  }

  contract.value.contractStatus = "terminated";
  markUpdatedBySystem();
  addActivity("terminate", "終止合約", "此合約已終止。");
  notify("已終止", `${contract.value.contractNo} 已終止。`, "warning");
}

function handleAttachmentPreview(row) {
  const content = `Preview: ${row.name}\nType: ${row.type}\nSize: ${formatFileSize(row.size)}`;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function handleAttachmentDownload(row) {
  const content = `Attachment: ${row.name}\nUploaded By: ${row.uploadedBy}\nUploaded At: ${row.uploadedAt}`;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = row.name.replace(/\s+/g, "-");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function handleMoreCommand(command) {
  if (command === "void") {
    handleVoid();
    return;
  }

  if (command === "terminate") {
    handleTerminate();
    return;
  }

  if (command === "history") {
    const section = document.getElementById("contract-history-section");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function jumpToAccount() {
  if (!contract.value) {
    return;
  }

  router.push({
    name: "account-detail",
    params: { accountId: contract.value.customerId },
  });
}

function jumpToOpportunity() {
  if (!contract.value) {
    return;
  }

  router.push({
    name: "opportunity-detail",
    params: { opportunityId: contract.value.opportunityId },
  });
}

function backToList() {
  router.push({ name: "opportunities-contracts" });
}
</script>

<template>
  <div class="min-h-full bg-slate-50 p-8">
    <template v-if="contract">
      <section class="grid gap-6">
        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="grid gap-3">
              <ElButton text :icon="ArrowLeft" class="w-fit !pl-0" @click="backToList">
                返回合約管理
              </ElButton>
              <div class="grid gap-2">
                <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">
                  {{ contract.contractName }}
                </h1>
                <p class="text-sm text-slate-500">
                  {{ contract.contractNo }} · {{ contract.customerName }} · {{ contract.opportunityName }}
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <ElTag round effect="light" :type="contractStatusMap[contract.contractStatus]?.type ?? 'info'">
                  {{ contractStatusMap[contract.contractStatus]?.label ?? contract.contractStatus }}
                </ElTag>
                <ElTag round effect="light" :type="signatureStatusMap[contract.signatureStatus]?.type ?? 'info'">
                  {{ signatureStatusMap[contract.signatureStatus]?.label ?? contract.signatureStatus }}
                </ElTag>
                <ElTag round effect="light" :type="reviewStatusMap[contract.reviewStatus]?.type ?? 'info'">
                  {{ reviewStatusMap[contract.reviewStatus]?.label ?? contract.reviewStatus }}
                </ElTag>
                <ElTag
                  v-for="risk in riskTags"
                  :key="risk.label"
                  round
                  effect="light"
                  :type="risk.type"
                >
                  {{ risk.label }}
                </ElTag>
              </div>
            </div>

            <div class="flex flex-wrap justify-end gap-2">
              <ElButton :icon="Edit" @click="openEditDrawer">編輯</ElButton>
              <ElButton :disabled="!canSubmitReview" type="warning" @click="handleSubmitReview">
                送審
              </ElButton>
              <ElButton :icon="Download" @click="handleDownloadMain">下載</ElButton>
              <ElButton :icon="Bell" :disabled="!canFollowSignature" @click="handleRemindSign">
                催簽
              </ElButton>
              <ElButton type="primary" :disabled="!canRenew" @click="handleRenew">續約</ElButton>
              <ElDropdown trigger="click" @command="handleMoreCommand">
                <ElButton :icon="MoreFilled">更多</ElButton>
                <template #dropdown>
                  <ElDropdownMenu>
                    <ElDropdownItem command="void">作廢</ElDropdownItem>
                    <ElDropdownItem command="terminate">終止</ElDropdownItem>
                    <ElDropdownItem command="history">查看歷程</ElDropdownItem>
                  </ElDropdownMenu>
                </template>
              </ElDropdown>
            </div>
          </div>

          <div class="mt-6 grid gap-3 md:grid-cols-4">
            <section
              v-for="item in contractSummaryCards"
              :key="item.label"
              class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <p class="text-xs text-slate-500">{{ item.label }}</p>
              <ElTag v-if="item.tag" round effect="light" :type="item.type" class="mt-2">
                {{ item.value }}
              </ElTag>
              <p v-else class="mt-2 text-base font-semibold text-slate-900">{{ item.value }}</p>
            </section>
          </div>
        </section>

        <section class="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <section class="grid gap-6">
            <ElCard shadow="never" class="rounded-2xl !border-slate-200">
              <template #header>
                <h2 class="text-base font-semibold text-slate-900">基本資訊</h2>
              </template>

              <ElDescriptions :column="2" border>
                <ElDescriptionsItem label="合約名稱">{{ contract.contractName }}</ElDescriptionsItem>
                <ElDescriptionsItem label="合約編號">{{ contract.contractNo }}</ElDescriptionsItem>
                <ElDescriptionsItem label="客戶名稱">
                  <button type="button" class="text-[#409eff] hover:text-[#337ecc]" @click="jumpToAccount">
                    {{ contract.customerName }}
                  </button>
                </ElDescriptionsItem>
                <ElDescriptionsItem label="關聯商機">
                  <button type="button" class="text-[#409eff] hover:text-[#337ecc]" @click="jumpToOpportunity">
                    {{ contract.opportunityName }}
                  </button>
                </ElDescriptionsItem>
                <ElDescriptionsItem label="聯絡窗口">
                  <div class="grid gap-1">
                    <span>{{ contract.contactName }}</span>
                    <span class="text-xs text-slate-400">{{ contract.contactEmail }}</span>
                  </div>
                </ElDescriptionsItem>
                <ElDescriptionsItem label="聯絡電話">{{ contract.contactPhone }}</ElDescriptionsItem>
                <ElDescriptionsItem label="負責業務">{{ contract.ownerName }}</ElDescriptionsItem>
                <ElDescriptionsItem label="所屬部門">{{ contract.departmentName }}</ElDescriptionsItem>
                <ElDescriptionsItem label="建立時間">{{ formatDate(contract.createdAt, true) }}</ElDescriptionsItem>
                <ElDescriptionsItem label="建立人">{{ contract.createdBy }}</ElDescriptionsItem>
                <ElDescriptionsItem label="最後更新時間">{{ formatDate(contract.lastUpdatedAt, true) }}</ElDescriptionsItem>
                <ElDescriptionsItem label="最後更新人">{{ contract.lastUpdatedBy }}</ElDescriptionsItem>
              </ElDescriptions>
            </ElCard>

            <ElCard shadow="never" class="rounded-2xl !border-slate-200">
              <template #header>
                <h2 class="text-base font-semibold text-slate-900">商務與期間資訊</h2>
              </template>

              <div class="grid gap-5">
                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs text-slate-500">合約總金額</p>
                  <p class="mt-1 text-xl font-semibold text-slate-900">
                    {{ formatCurrency(contract.amount, contract.currency) }}
                  </p>
                </div>

                <ElDescriptions :column="2" border>
                  <ElDescriptionsItem label="幣別">{{ contract.currency }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="計價方式">{{ contract.pricingModel }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="付款條件">{{ contract.paymentTerms }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="稅別">{{ contract.taxType }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="折扣說明">{{ contract.discountNote }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="特殊條款">
                    <div class="flex flex-wrap gap-1">
                      <ElTag v-for="term in contract.specialTerms" :key="term" round effect="plain">
                        {{ term }}
                      </ElTag>
                    </div>
                  </ElDescriptionsItem>
                  <ElDescriptionsItem label="簽署日期">{{ formatDate(contract.signedDate) }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="生效日">{{ formatDate(contract.effectiveDate) }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="到期日">{{ formatDate(contract.endDate) }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="合約期限">{{ durationLabel }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="是否自動續約">
                    <ElTag round effect="plain" :type="contract.autoRenew ? 'success' : 'info'">
                      {{ contract.autoRenew ? "是" : "否" }}
                    </ElTag>
                  </ElDescriptionsItem>
                  <ElDescriptionsItem label="續約提醒天數">
                    到期前 {{ contract.renewalReminderDays }} 天
                  </ElDescriptionsItem>
                  <ElDescriptionsItem label="剩餘天數">
                    <ElTag round effect="light" :type="getDaysTagType(daysUntilEnd)">
                      {{ getDaysText(daysUntilEnd) }}
                    </ElTag>
                  </ElDescriptionsItem>
                </ElDescriptions>
              </div>
            </ElCard>

            <ElCard shadow="never" class="rounded-2xl !border-slate-200">
              <template #header>
                <h2 class="text-base font-semibold text-slate-900">流程進度</h2>
              </template>

              <section class="grid gap-4">
                <div class="rounded-2xl border border-slate-200 p-4">
                  <h3 class="mb-3 text-sm font-semibold text-slate-900">審核流程</h3>
                  <div class="flex flex-wrap gap-2">
                    <ElTag
                      v-for="(item, index) in reviewNodes"
                      :key="item.key"
                      round
                      :effect="index <= reviewCurrentStep ? 'dark' : 'plain'"
                      :type="item.key === 'rejected' ? 'danger' : index <= reviewCurrentStep ? 'primary' : 'info'"
                    >
                      {{ item.label }}
                    </ElTag>
                  </div>
                  <div class="mt-3 grid gap-1 text-sm text-slate-600">
                    <p>送審時間：{{ formatDate(contract.reviewSubmittedAt, true) }}</p>
                    <p>審核人：{{ contract.reviewAssignee || "-" }}</p>
                    <p>處理時間：{{ formatDate(contract.reviewCompletedAt, true) }}</p>
                    <p>退回原因：{{ contract.reviewComment || "-" }}</p>
                  </div>
                </div>

                <div class="rounded-2xl border border-slate-200 p-4">
                  <h3 class="mb-3 text-sm font-semibold text-slate-900">簽署流程</h3>
                  <div class="flex flex-wrap gap-2">
                    <ElTag
                      v-for="(item, index) in signatureNodes"
                      :key="item.key"
                      round
                      :effect="index <= signatureCurrentStep ? 'dark' : 'plain'"
                      :type="index <= signatureCurrentStep ? 'success' : 'info'"
                    >
                      {{ item.label }}
                    </ElTag>
                  </div>
                  <div class="mt-3 grid gap-1 text-sm text-slate-600">
                    <p>發送簽署時間：{{ formatDate(contract.signatureSentAt, true) }}</p>
                    <p>客戶簽署時間：{{ formatDate(contract.customerSignedAt, true) }}</p>
                    <p>我方簽署時間：{{ formatDate(contract.internalSignedAt, true) }}</p>
                    <p>雙方完成時間：{{ formatDate(contract.fullySignedAt, true) }}</p>
                  </div>
                </div>
              </section>
            </ElCard>

            <ElCard shadow="never" class="rounded-2xl !border-slate-200">
              <template #header>
                <h2 class="text-base font-semibold text-slate-900">文件與版本</h2>
              </template>

              <section class="grid gap-4">
                <div class="grid gap-2">
                  <h3 class="text-sm font-semibold text-slate-900">文件附件</h3>
                  <ElTable :data="contract.attachments" size="large">
                    <ElTableColumn label="檔案名稱" min-width="220" prop="name" />
                    <ElTableColumn label="類型" min-width="90" prop="type" />
                    <ElTableColumn label="檔案大小" min-width="100">
                      <template #default="{ row }">{{ formatFileSize(row.size) }}</template>
                    </ElTableColumn>
                    <ElTableColumn label="上傳時間" min-width="160">
                      <template #default="{ row }">{{ formatDate(row.uploadedAt, true) }}</template>
                    </ElTableColumn>
                    <ElTableColumn label="上傳人" min-width="120" prop="uploadedBy" />
                    <ElTableColumn label="主檔" min-width="100">
                      <template #default="{ row }">
                        <ElTag round effect="light" :type="row.isMainFile ? 'success' : 'info'">
                          {{ row.isMainFile ? "主檔" : "附件" }}
                        </ElTag>
                      </template>
                    </ElTableColumn>
                    <ElTableColumn label="操作" min-width="140">
                      <template #default="{ row }">
                        <div class="flex items-center gap-1">
                          <ElButton text @click="handleAttachmentPreview(row)">預覽</ElButton>
                          <ElButton text @click="handleAttachmentDownload(row)">下載</ElButton>
                        </div>
                      </template>
                    </ElTableColumn>
                  </ElTable>
                </div>

                <ElDivider class="!my-1" />

                <div class="grid gap-2">
                  <h3 class="text-sm font-semibold text-slate-900">版本資訊</h3>
                  <ElTable :data="contract.versions" size="large">
                    <ElTableColumn label="版本" min-width="80" prop="version" />
                    <ElTableColumn label="建立時間" min-width="160">
                      <template #default="{ row }">{{ formatDate(row.createdAt, true) }}</template>
                    </ElTableColumn>
                    <ElTableColumn label="建立人" min-width="120" prop="createdBy" />
                    <ElTableColumn label="說明" min-width="220" prop="note" />
                    <ElTableColumn label="狀態" min-width="120" prop="status" />
                    <ElTableColumn label="操作" min-width="170">
                      <template #default="{ row }">
                        <div class="flex items-center gap-1">
                          <ElButton text @click="notify('版本資訊', `${row.version} 已開啟。`)">查看版本</ElButton>
                          <ElButton text @click="handleRenew">複製新版本</ElButton>
                        </div>
                      </template>
                    </ElTableColumn>
                  </ElTable>
                </div>
              </section>
            </ElCard>

            <ElCard id="contract-history-section" shadow="never" class="rounded-2xl !border-slate-200">
              <template #header>
                <h2 class="text-base font-semibold text-slate-900">歷程與備註</h2>
              </template>

              <section class="grid gap-4">
                <ElTimeline>
                  <ElTimelineItem
                    v-for="item in contract.activities"
                    :key="item.id"
                    :timestamp="formatDate(item.createdAt, true)"
                  >
                    <div class="grid gap-1">
                      <p class="text-sm font-semibold text-slate-900">{{ item.title }}</p>
                      <p class="text-sm text-slate-600">{{ item.content }}</p>
                      <p class="text-xs text-slate-400">{{ item.operatorName }} · {{ item.type }}</p>
                    </div>
                  </ElTimelineItem>
                </ElTimeline>

                <section class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs text-slate-500">備註</p>
                  <p class="mt-1 text-sm text-slate-700">{{ contract.notes || "-" }}</p>
                </section>
              </section>
            </ElCard>
          </section>

          <aside class="grid content-start gap-6">
            <ElCard shadow="never" class="rounded-2xl !border-slate-200">
              <template #header>
                <h3 class="text-sm font-semibold text-slate-900">狀態摘要</h3>
              </template>
              <div class="grid gap-2 text-sm">
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">合約狀態</span>
                  <ElTag round effect="light" :type="contractStatusMap[contract.contractStatus]?.type ?? 'info'">
                    {{ contractStatusMap[contract.contractStatus]?.label ?? contract.contractStatus }}
                  </ElTag>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">審核狀態</span>
                  <ElTag round effect="light" :type="reviewStatusMap[contract.reviewStatus]?.type ?? 'info'">
                    {{ reviewStatusMap[contract.reviewStatus]?.label ?? contract.reviewStatus }}
                  </ElTag>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">簽署狀態</span>
                  <ElTag round effect="light" :type="signatureStatusMap[contract.signatureStatus]?.type ?? 'info'">
                    {{ signatureStatusMap[contract.signatureStatus]?.label ?? contract.signatureStatus }}
                  </ElTag>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">距到期天數</span>
                  <ElTag round effect="light" :type="getDaysTagType(daysUntilEnd)">
                    {{ getDaysText(daysUntilEnd) }}
                  </ElTag>
                </div>
              </div>
            </ElCard>

            <ElCard shadow="never" class="rounded-2xl !border-slate-200">
              <template #header>
                <h3 class="text-sm font-semibold text-slate-900">風險提醒</h3>
              </template>
              <div class="flex flex-wrap gap-2">
                <ElTag
                  v-for="risk in riskTags"
                  :key="risk.label"
                  round
                  effect="light"
                  :type="risk.type"
                >
                  {{ risk.label }}
                </ElTag>
                <span v-if="riskTags.length === 0" class="text-sm text-slate-500">目前沒有風險</span>
              </div>
            </ElCard>

            <ElCard shadow="never" class="rounded-2xl !border-slate-200">
              <template #header>
                <h3 class="text-sm font-semibold text-slate-900">關聯資訊</h3>
              </template>
              <div class="grid gap-2 text-sm text-slate-600">
                <div class="flex items-start justify-between gap-3">
                  <span>客戶</span>
                  <button type="button" class="text-right text-[#409eff] hover:text-[#337ecc]" @click="jumpToAccount">
                    {{ contract.customerName }}
                  </button>
                </div>
                <div class="flex items-start justify-between gap-3">
                  <span>關聯商機</span>
                  <button type="button" class="text-right text-[#409eff] hover:text-[#337ecc]" @click="jumpToOpportunity">
                    {{ contract.opportunityName }}
                  </button>
                </div>
                <div class="flex items-start justify-between gap-3">
                  <span>負責業務</span>
                  <span>{{ contract.ownerName }}</span>
                </div>
                <div class="flex items-start justify-between gap-3">
                  <span>最近報價</span>
                  <span>{{ contract.latestQuoteCode || "-" }}</span>
                </div>
              </div>
            </ElCard>

            <ElCard shadow="never" class="rounded-2xl !border-slate-200">
              <template #header>
                <h3 class="text-sm font-semibold text-slate-900">快捷操作</h3>
              </template>
              <div class="grid gap-2">
                <ElButton @click="openEditDrawer">編輯</ElButton>
                <ElButton type="warning" :disabled="!canSubmitReview" @click="handleSubmitReview">
                  送審
                </ElButton>
                <ElButton :disabled="!canFollowSignature" @click="handleRemindSign">催簽</ElButton>
                <ElButton :disabled="!canRenew" @click="handleRenew">建立續約</ElButton>
                <ElButton type="primary" @click="handleDownloadMain">下載主檔</ElButton>
              </div>
            </ElCard>
          </aside>
        </section>
      </section>
    </template>

    <ElEmpty
      v-else
      description="找不到合約資料"
      class="rounded-2xl border border-slate-200 bg-white py-20"
    >
      <p class="mb-3 text-sm text-slate-500">合約可能不存在，或目前沒有存取權限。</p>
      <ElButton type="primary" @click="backToList">返回合約管理</ElButton>
    </ElEmpty>

    <ElDrawer v-model="editDrawerOpen" size="40%" :with-header="false">
      <div class="flex h-full flex-col">
        <div class="border-b border-slate-200 px-6 py-5">
          <div class="flex items-start justify-between gap-4">
            <div class="grid gap-2">
              <h3 class="text-xl font-semibold tracking-[-0.03em] text-slate-900">編輯合約</h3>
              <p class="text-sm text-slate-500">更新合約主資訊後，系統會同步更新歷程。</p>
            </div>
            <ElButton @click="editDrawerOpen = false">關閉</ElButton>
          </div>
        </div>

        <div class="overflow-y-auto px-6 py-5">
          <ElForm label-position="top" class="grid gap-4">
            <ElFormItem label="合約名稱" required>
              <ElInput v-model="contractEditForm.contractName" />
            </ElFormItem>

            <ElFormItem label="付款條件">
              <ElInput v-model="contractEditForm.paymentTerms" />
            </ElFormItem>

            <div class="grid gap-4 sm:grid-cols-2">
              <ElFormItem label="合約金額" required>
                <ElInputNumber
                  v-model="contractEditForm.amount"
                  :min="0"
                  :step="100000"
                  controls-position="right"
                  class="!w-full"
                />
              </ElFormItem>
              <ElFormItem label="續約提醒天數">
                <ElInputNumber
                  v-model="contractEditForm.renewalReminderDays"
                  :min="1"
                  :max="365"
                  class="!w-full"
                />
              </ElFormItem>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <ElFormItem label="生效日">
                <ElInput v-model="contractEditForm.effectiveDate" placeholder="YYYY-MM-DD" />
              </ElFormItem>
              <ElFormItem label="到期日">
                <ElInput v-model="contractEditForm.endDate" placeholder="YYYY-MM-DD" />
              </ElFormItem>
            </div>

            <ElFormItem label="主檔名稱">
              <ElInput v-model="contractEditForm.mainFileName" />
            </ElFormItem>

            <ElFormItem label="自動續約">
              <ElButton size="small" @click="contractEditForm.autoRenew = !contractEditForm.autoRenew">
                {{ contractEditForm.autoRenew ? "目前：是（點擊改為否）" : "目前：否（點擊改為是）" }}
              </ElButton>
            </ElFormItem>

            <ElFormItem label="備註">
              <ElInput v-model="contractEditForm.notes" type="textarea" :rows="4" />
            </ElFormItem>
          </ElForm>
        </div>

        <div class="border-t border-slate-200 px-6 py-4">
          <div class="flex items-center justify-end gap-3">
            <ElButton @click="editDrawerOpen = false">取消</ElButton>
            <ElButton type="primary" @click="saveEdit">儲存變更</ElButton>
          </div>
        </div>
      </div>
    </ElDrawer>
  </div>
</template>
