<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElDescriptions,
  ElDescriptionsItem,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessageBox,
  ElNotification,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
  ElTimeline,
  ElTimelineItem,
} from "element-plus";
import { ArrowLeft, Delete, Upload } from "@element-plus/icons-vue";
import { accountList } from "../../data/accounts";
import { opportunityList } from "../../data/opportunities";
import { projectList } from "../../data/projects";
import { userList } from "../../data/users";
import {
  attachmentCategoryOptions,
  documentTypeMap,
  invoiceStatusMap,
  invoiceTypeMap,
  payableStatusMap,
  receivableStatusMap,
  transactionMethodOptions,
  useBillingPaymentsStore,
} from "../../composables/useBillingPaymentsStore";

const route = useRoute();
const router = useRouter();

const {
  addAttachment,
  addPayRecord,
  addReceiveRecord,
  getById,
  removeAttachment,
  setInvoiceChange,
  updateRecord,
} = useBillingPaymentsStore();

const actorName = "王冠勳";

const billingId = computed(() => String(route.params.billingId || ""));
const record = computed(() => getById(billingId.value));

const activeSection = ref("basic");

const accountOptions = accountList.map((item) => ({
  value: item.id,
  label: item.companyName,
}));
const opportunityOptions = opportunityList.map((item) => ({
  value: item.id,
  label: item.name,
}));
const projectOptions = projectList.map((item) => ({
  value: item.id,
  label: item.projectName,
}));
const ownerOptions = userList
  .filter((item) => item.status === "active")
  .map((item) => ({ value: item.id, label: item.name }));

function createBasicForm() {
  return {
    documentType: "invoice",
    accountId: "",
    opportunityId: "",
    projectId: "",
    ownerId: "",
    revenueNo: "",
    reconciliationNo: "",
    orderNo: "",
    contractNo: "",
    quoteNo: "",
    dueReceiveAt: "",
    duePayAt: "",
    notes: "",
    exceptionReason: "",
  };
}

function createInvoiceForm() {
  return {
    invoiceNo: "",
    invoiceType: "electronic",
    invoiceDate: "",
    invoiceAmount: 0,
    taxAmount: 0,
    invoiceStatus: "pending_issue",
    voidReason: "",
    creditReason: "",
    pendingReissueReason: "",
    reissuedInvoiceNo: "",
  };
}

function createTransactionForm() {
  return {
    amount: 0,
    handledAt: new Date().toISOString().slice(0, 10),
    method: transactionMethodOptions[0],
    referenceNo: "",
    note: "",
  };
}

const basicForm = reactive(createBasicForm());
const invoiceForm = reactive(createInvoiceForm());
const receiveForm = reactive(createTransactionForm());
const payForm = reactive(createTransactionForm());
const attachmentForm = reactive({ category: "invoice" });

const outstandingReceive = computed(() =>
  Number(record.value?.outstandingReceiveAmount || 0)
);
const outstandingPay = computed(() => Number(record.value?.outstandingPayAmount || 0));

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
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

function formatFileSize(value) {
  const size = Number(value || 0);
  if (size <= 0) {
    return "-";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function notify(message, title = "已更新", type = "success") {
  ElNotification({ title, message, type, position: "top-right" });
}

function syncForms(source) {
  Object.assign(basicForm, createBasicForm());
  Object.assign(invoiceForm, createInvoiceForm());
  Object.assign(receiveForm, createTransactionForm());
  Object.assign(payForm, createTransactionForm());

  if (!source) {
    return;
  }

  Object.assign(basicForm, {
    documentType: source.documentType,
    accountId: source.accountId,
    opportunityId: source.opportunityId,
    projectId: source.projectId,
    ownerId: source.ownerId,
    revenueNo: source.revenueNo,
    reconciliationNo: source.reconciliationNo,
    orderNo: source.orderNo,
    contractNo: source.contractNo,
    quoteNo: source.quoteNo,
    dueReceiveAt: source.dueReceiveAt,
    duePayAt: source.duePayAt,
    notes: source.notes || "",
    exceptionReason: source.exceptionReason || "",
  });

  Object.assign(invoiceForm, {
    invoiceNo: source.invoiceNo,
    invoiceType: source.invoiceType,
    invoiceDate: source.invoiceDate,
    invoiceAmount: Number(source.invoiceAmount || 0),
    taxAmount: Number(source.taxAmount || 0),
    invoiceStatus: source.invoiceStatus,
    voidReason: source.voidReason || "",
    creditReason: source.creditReason || "",
    pendingReissueReason: source.pendingReissueReason || "",
    reissuedInvoiceNo: source.reissuedInvoiceNo || "",
  });
}

function goBack() {
  router.push({ name: "finance-billing-payments" });
}

function goToRelated(type) {
  if (!record.value) {
    return;
  }

  if (type === "account" && record.value.accountId) {
    router.push({
      name: "account-detail",
      params: { accountId: record.value.accountId },
    });
    return;
  }

  if (type === "opportunity" && record.value.opportunityId) {
    router.push({
      name: "opportunity-detail",
      params: { opportunityId: record.value.opportunityId },
    });
    return;
  }

  if (type === "project" && record.value.projectId) {
    router.push({
      name: "project-detail",
      params: { projectId: record.value.projectId },
    });
    return;
  }

  if (type === "revenue") {
    router.push({ name: "finance-revenue-records" });
    return;
  }

  if (type === "reconciliation") {
    router.push({ name: "finance-reconciliation" });
  }
}

function saveBasicInfo() {
  if (!record.value) {
    return;
  }

  if (!basicForm.accountId) {
    notify("請選擇客戶", "缺少資訊", "warning");
    return;
  }

  const updated = updateRecord(
    record.value.id,
    {
      documentType: basicForm.documentType,
      accountId: basicForm.accountId,
      opportunityId: basicForm.opportunityId,
      projectId: basicForm.projectId,
      ownerId: basicForm.ownerId,
      revenueNo: basicForm.revenueNo.trim(),
      reconciliationNo: basicForm.reconciliationNo.trim(),
      orderNo: basicForm.orderNo.trim(),
      contractNo: basicForm.contractNo.trim(),
      quoteNo: basicForm.quoteNo.trim(),
      dueReceiveAt: basicForm.dueReceiveAt,
      duePayAt: basicForm.duePayAt,
      notes: basicForm.notes.trim(),
      exceptionReason: basicForm.exceptionReason.trim(),
    },
    {
      actorName,
      activityTitle: "更新基本資訊",
      activityDescription: `${record.value.documentNo} 已更新`,
    }
  );

  if (!updated) {
    notify("儲存失敗", "錯誤", "error");
    return;
  }

  notify("基本資訊已更新");
}

function saveInvoiceInfo() {
  if (!record.value) {
    return;
  }

  if (Number(invoiceForm.invoiceAmount || 0) <= 0) {
    notify("發票金額需大於 0", "缺少資訊", "warning");
    return;
  }

  const updated = updateRecord(
    record.value.id,
    {
      invoiceNo: invoiceForm.invoiceNo.trim(),
      invoiceType: invoiceForm.invoiceType,
      invoiceDate: invoiceForm.invoiceDate,
      invoiceAmount: Number(invoiceForm.invoiceAmount || 0),
      taxAmount: Number(invoiceForm.taxAmount || 0),
      invoiceStatus: invoiceForm.invoiceStatus,
      voidReason: invoiceForm.voidReason.trim(),
      creditReason: invoiceForm.creditReason.trim(),
      pendingReissueReason: invoiceForm.pendingReissueReason.trim(),
      reissuedInvoiceNo: invoiceForm.reissuedInvoiceNo.trim(),
    },
    {
      actorName,
      activityTitle: "更新發票資訊",
      activityDescription: invoiceForm.invoiceNo || "未填寫發票編號",
    }
  );

  if (!updated) {
    notify("儲存失敗", "錯誤", "error");
    return;
  }

  notify("發票資訊已更新");
}

async function applyInvoiceChange(action) {
  if (!record.value) {
    return;
  }

  if (action === "reissued") {
    let nextInvoiceNo = "";

    try {
      const result = await ElMessageBox.prompt("請輸入新發票編號", "標記已重開", {
        confirmButtonText: "確認",
        cancelButtonText: "取消",
        inputPlaceholder: "例如：INV-2026-188",
      });
      nextInvoiceNo = result.value.trim();
    } catch {
      return;
    }

    if (!nextInvoiceNo) {
      notify("請輸入新發票編號", "缺少資訊", "warning");
      return;
    }

    const updated = setInvoiceChange(
      record.value.id,
      { action, nextInvoiceNo },
      actorName
    );
    if (!updated) {
      notify("狀態更新失敗", "錯誤", "error");
      return;
    }

    notify(
      `已更新為 ${
        invoiceStatusMap[updated.invoiceStatus]?.label || updated.invoiceStatus
      }`
    );
    return;
  }

  let reason = "";

  try {
    const result = await ElMessageBox.prompt("請輸入異動原因", "更新發票異動", {
      confirmButtonText: "確認",
      cancelButtonText: "取消",
      inputPlaceholder: "例如：統編錯誤、客訴折讓、重開流程",
    });
    reason = result.value.trim();
  } catch {
    return;
  }

  const updated = setInvoiceChange(record.value.id, { action, reason }, actorName);

  if (!updated) {
    notify("狀態更新失敗", "錯誤", "error");
    return;
  }

  notify(
    `已更新為 ${invoiceStatusMap[updated.invoiceStatus]?.label || updated.invoiceStatus}`
  );
}

function submitReceiveRecord() {
  if (!record.value) {
    return;
  }

  if (Number(receiveForm.amount || 0) <= 0) {
    notify("收款金額需大於 0", "缺少資訊", "warning");
    return;
  }

  const updated = addReceiveRecord(
    record.value.id,
    {
      amount: Number(receiveForm.amount || 0),
      handledAt: receiveForm.handledAt,
      method: receiveForm.method,
      referenceNo: receiveForm.referenceNo.trim(),
      note: receiveForm.note.trim(),
    },
    actorName
  );

  if (!updated) {
    notify("新增收款失敗", "錯誤", "error");
    return;
  }

  Object.assign(receiveForm, createTransactionForm());
  notify("收款紀錄已新增");
}

function submitPayRecord() {
  if (!record.value) {
    return;
  }

  if (Number(payForm.amount || 0) <= 0) {
    notify("付款金額需大於 0", "缺少資訊", "warning");
    return;
  }

  const updated = addPayRecord(
    record.value.id,
    {
      amount: Number(payForm.amount || 0),
      handledAt: payForm.handledAt,
      method: payForm.method,
      referenceNo: payForm.referenceNo.trim(),
      note: payForm.note.trim(),
    },
    actorName
  );

  if (!updated) {
    notify("新增付款失敗", "錯誤", "error");
    return;
  }

  Object.assign(payForm, createTransactionForm());
  notify("付款紀錄已新增");
}

function openAttachmentPreview(item) {
  if (!item?.previewUrl) {
    notify("附件無法預覽", "提醒", "warning");
    return;
  }

  window.open(item.previewUrl, "_blank", "noopener,noreferrer");
}

async function removeAttachmentItem(item) {
  if (!record.value) {
    return;
  }

  try {
    await ElMessageBox.confirm(`確認移除附件「${item.name}」？`, "移除附件", {
      confirmButtonText: "移除",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    return;
  }

  const updated = removeAttachment(record.value.id, item.id, actorName);
  if (!updated) {
    notify("移除失敗", "錯誤", "error");
    return;
  }

  notify("附件已移除");
}

function handleUploadFiles(event) {
  if (!record.value) {
    return;
  }

  const files = Array.from(event.target.files || []);

  if (files.length === 0) {
    return;
  }

  files.forEach((file) => {
    addAttachment(
      record.value.id,
      {
        name: file.name,
        category: attachmentForm.category,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        isImage: String(file.type || "").startsWith("image/"),
      },
      actorName
    );
  });

  event.target.value = "";
  notify(`已上傳 ${files.length} 個附件`);
}

watch(
  () => record.value,
  (next) => {
    syncForms(next);
  },
  { immediate: true }
);
</script>

<template>
  <div class="min-h-full p-8">
    <template v-if="record">
      <section class="grid gap-6">
        <header class="flex flex-wrap items-start justify-between gap-4">
          <div class="grid gap-2">
            <ElButton link :icon="ArrowLeft" class="!mr-auto" @click="goBack"
              >返回發票 / 收付款</ElButton
            >
            <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">
              {{ record.documentNo }}
            </h1>
            <p class="text-sm text-slate-500">
              {{ record.accountName }} / {{ record.invoiceNo || "未開立發票" }}
            </p>
            <div class="flex flex-wrap items-center gap-2">
              <ElTag :type="documentTypeMap[record.documentType]?.type" effect="light">
                {{ documentTypeMap[record.documentType]?.label || record.documentType }}
              </ElTag>
              <ElTag :type="invoiceStatusMap[record.invoiceStatus]?.type" effect="light">
                發票：{{
                  invoiceStatusMap[record.invoiceStatus]?.label || record.invoiceStatus
                }}
              </ElTag>
              <ElTag
                :type="receivableStatusMap[record.receivableStatus]?.type"
                effect="light"
              >
                收款：{{
                  receivableStatusMap[record.receivableStatus]?.label ||
                  record.receivableStatus
                }}
              </ElTag>
              <ElTag :type="payableStatusMap[record.payableStatus]?.type" effect="light">
                付款：{{
                  payableStatusMap[record.payableStatus]?.label || record.payableStatus
                }}
              </ElTag>
              <ElTag v-if="record.isException" type="danger" effect="light">異常</ElTag>
            </div>
          </div>

          <div class="grid gap-1 text-right">
            <p class="text-xs text-slate-500">應收未收</p>
            <p class="text-lg font-semibold text-slate-900">
              {{ formatCurrency(outstandingReceive) }}
            </p>
            <p class="text-xs text-slate-500">
              應付未付 {{ formatCurrency(outstandingPay) }}
            </p>
          </div>
        </header>

        <section class="rounded-2xl border border-slate-200 bg-white">
          <div class="px-6 pt-3">
            <ElTabs v-model="activeSection" class="detail-tabs">
              <ElTabPane label="基本資訊" name="basic" />
              <ElTabPane label="發票資訊" name="invoice" />
              <ElTabPane label="收款 / 付款紀錄" name="transactions" />
              <ElTabPane label="對帳 / 關聯資料" name="relations" />
              <ElTabPane label="異動紀錄" name="activities" />
              <ElTabPane label="附件與備註" name="attachments" />
            </ElTabs>
          </div>

          <div class="border-t border-slate-200 px-6 py-5">
            <template v-if="activeSection === 'basic'">
              <section class="grid gap-4">
                <ElCard shadow="never">
                  <template #header>
                    <span class="text-sm font-semibold text-slate-800">單據主資料</span>
                  </template>
                  <ElForm label-position="top" class="grid gap-3">
                    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <ElFormItem label="單據類型">
                        <ElSelect v-model="basicForm.documentType">
                          <ElOption
                            v-for="(meta, key) in documentTypeMap"
                            :key="`basic-doc-${key}`"
                            :label="meta.label"
                            :value="key"
                          />
                        </ElSelect>
                      </ElFormItem>
                      <ElFormItem label="客戶">
                        <ElSelect v-model="basicForm.accountId">
                          <ElOption
                            v-for="item in accountOptions"
                            :key="`basic-acc-${item.value}`"
                            :label="item.label"
                            :value="item.value"
                          />
                        </ElSelect>
                      </ElFormItem>
                      <ElFormItem label="商機">
                        <ElSelect v-model="basicForm.opportunityId" clearable>
                          <ElOption
                            v-for="item in opportunityOptions"
                            :key="`basic-opp-${item.value}`"
                            :label="item.label"
                            :value="item.value"
                          />
                        </ElSelect>
                      </ElFormItem>
                      <ElFormItem label="專案">
                        <ElSelect v-model="basicForm.projectId" clearable>
                          <ElOption
                            v-for="item in projectOptions"
                            :key="`basic-proj-${item.value}`"
                            :label="item.label"
                            :value="item.value"
                          />
                        </ElSelect>
                      </ElFormItem>
                      <ElFormItem label="負責人">
                        <ElSelect v-model="basicForm.ownerId" clearable>
                          <ElOption
                            v-for="item in ownerOptions"
                            :key="`basic-owner-${item.value}`"
                            :label="item.label"
                            :value="item.value"
                          />
                        </ElSelect>
                      </ElFormItem>
                      <ElFormItem label="關聯營收編號">
                        <ElInput v-model="basicForm.revenueNo" />
                      </ElFormItem>
                      <ElFormItem label="關聯對帳編號">
                        <ElInput v-model="basicForm.reconciliationNo" />
                      </ElFormItem>
                      <ElFormItem label="訂單編號">
                        <ElInput v-model="basicForm.orderNo" />
                      </ElFormItem>
                      <ElFormItem label="合約編號">
                        <ElInput v-model="basicForm.contractNo" />
                      </ElFormItem>
                      <ElFormItem label="報價編號">
                        <ElInput v-model="basicForm.quoteNo" />
                      </ElFormItem>
                      <ElFormItem label="應收到期日">
                        <ElDatePicker
                          v-model="basicForm.dueReceiveAt"
                          type="date"
                          value-format="YYYY-MM-DD"
                          class="!w-full"
                        />
                      </ElFormItem>
                      <ElFormItem label="應付到期日">
                        <ElDatePicker
                          v-model="basicForm.duePayAt"
                          type="date"
                          value-format="YYYY-MM-DD"
                          class="!w-full"
                        />
                      </ElFormItem>
                    </div>

                    <ElFormItem label="異常原因">
                      <ElInput
                        v-model="basicForm.exceptionReason"
                        type="textarea"
                        :rows="2"
                      />
                    </ElFormItem>
                    <ElFormItem label="備註">
                      <ElInput v-model="basicForm.notes" type="textarea" :rows="3" />
                    </ElFormItem>

                    <div class="flex justify-end border-t border-slate-200 pt-3">
                      <ElButton type="primary" @click="saveBasicInfo"
                        >儲存基本資訊</ElButton
                      >
                    </div>
                  </ElForm>
                </ElCard>

                <ElDescriptions :column="2" border>
                  <ElDescriptionsItem label="建立時間">{{
                    formatDateTime(record.createdAt)
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="最後更新">{{
                    formatDateTime(record.updatedAt)
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="建立人">{{
                    record.createdBy || "-"
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="最後更新人">{{
                    record.updatedBy || "-"
                  }}</ElDescriptionsItem>
                </ElDescriptions>
              </section>
            </template>

            <template v-else-if="activeSection === 'invoice'">
              <section class="grid gap-4">
                <ElCard shadow="never">
                  <template #header>
                    <span class="text-sm font-semibold text-slate-800"
                      >發票資料與異動</span
                    >
                  </template>

                  <ElForm label-position="top" class="grid gap-3">
                    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <ElFormItem label="發票編號">
                        <ElInput v-model="invoiceForm.invoiceNo" />
                      </ElFormItem>
                      <ElFormItem label="發票類型">
                        <ElSelect v-model="invoiceForm.invoiceType">
                          <ElOption
                            v-for="(meta, key) in invoiceTypeMap"
                            :key="`invoice-type-${key}`"
                            :label="meta.label"
                            :value="key"
                          />
                        </ElSelect>
                      </ElFormItem>
                      <ElFormItem label="開立日期">
                        <ElDatePicker
                          v-model="invoiceForm.invoiceDate"
                          type="date"
                          value-format="YYYY-MM-DD"
                          class="!w-full"
                        />
                      </ElFormItem>
                      <ElFormItem label="發票狀態">
                        <ElSelect v-model="invoiceForm.invoiceStatus">
                          <ElOption
                            v-for="(meta, key) in invoiceStatusMap"
                            :key="`invoice-status-${key}`"
                            :label="meta.label"
                            :value="key"
                          />
                        </ElSelect>
                      </ElFormItem>
                      <ElFormItem label="發票金額">
                        <ElInputNumber
                          v-model="invoiceForm.invoiceAmount"
                          :min="0"
                          class="!w-full"
                        />
                      </ElFormItem>
                      <ElFormItem label="稅額">
                        <ElInputNumber
                          v-model="invoiceForm.taxAmount"
                          :min="0"
                          class="!w-full"
                        />
                      </ElFormItem>
                    </div>

                    <div class="grid gap-3 md:grid-cols-2">
                      <ElFormItem label="作廢原因">
                        <ElInput
                          v-model="invoiceForm.voidReason"
                          type="textarea"
                          :rows="2"
                        />
                      </ElFormItem>
                      <ElFormItem label="折讓原因">
                        <ElInput
                          v-model="invoiceForm.creditReason"
                          type="textarea"
                          :rows="2"
                        />
                      </ElFormItem>
                      <ElFormItem label="待重開原因">
                        <ElInput
                          v-model="invoiceForm.pendingReissueReason"
                          type="textarea"
                          :rows="2"
                        />
                      </ElFormItem>
                      <ElFormItem label="重開後發票編號">
                        <ElInput v-model="invoiceForm.reissuedInvoiceNo" />
                      </ElFormItem>
                    </div>

                    <div
                      class="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3"
                    >
                      <ElButton @click="applyInvoiceChange('void')">標記作廢</ElButton>
                      <ElButton @click="applyInvoiceChange('crediting')"
                        >標記折讓中</ElButton
                      >
                      <ElButton @click="applyInvoiceChange('credited')"
                        >標記已折讓</ElButton
                      >
                      <ElButton @click="applyInvoiceChange('pending_reissue')"
                        >標記待重開</ElButton
                      >
                      <ElButton @click="applyInvoiceChange('reissued')"
                        >標記已重開</ElButton
                      >
                      <div class="ml-auto">
                        <ElButton type="primary" @click="saveInvoiceInfo"
                          >儲存發票資訊</ElButton
                        >
                      </div>
                    </div>
                  </ElForm>
                </ElCard>
              </section>
            </template>

            <template v-else-if="activeSection === 'transactions'">
              <section class="grid gap-4">
                <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <article class="rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <p class="text-xs text-slate-500">應收總額</p>
                    <p class="mt-1 text-lg font-semibold text-slate-900">
                      {{ formatCurrency(record.expectedReceiveAmount) }}
                    </p>
                  </article>
                  <article class="rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <p class="text-xs text-slate-500">已收金額</p>
                    <p class="mt-1 text-lg font-semibold text-slate-900">
                      {{ formatCurrency(record.receivedAmount) }}
                    </p>
                  </article>
                  <article class="rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <p class="text-xs text-slate-500">應付總額</p>
                    <p class="mt-1 text-lg font-semibold text-slate-900">
                      {{ formatCurrency(record.expectedPayAmount) }}
                    </p>
                  </article>
                  <article class="rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <p class="text-xs text-slate-500">已付金額</p>
                    <p class="mt-1 text-lg font-semibold text-slate-900">
                      {{ formatCurrency(record.paidAmount) }}
                    </p>
                  </article>
                </div>

                <ElCard shadow="never">
                  <template #header>
                    <span class="text-sm font-semibold text-slate-800">收款紀錄</span>
                  </template>
                  <ElTable :data="record.receiveRecords" table-layout="auto">
                    <ElTableColumn label="收款編號" min-width="140" prop="no" />
                    <ElTableColumn label="金額" min-width="120" align="right">
                      <template #default="{ row }">{{
                        formatCurrency(row.amount)
                      }}</template>
                    </ElTableColumn>
                    <ElTableColumn label="日期" min-width="120">
                      <template #default="{ row }">{{
                        formatDate(row.handledAt)
                      }}</template>
                    </ElTableColumn>
                    <ElTableColumn label="方式" min-width="120" prop="method" />
                    <ElTableColumn label="交易編號" min-width="140" prop="referenceNo" />
                    <ElTableColumn label="備註" min-width="200" show-overflow-tooltip>
                      <template #default="{ row }">{{ row.note || "-" }}</template>
                    </ElTableColumn>
                  </ElTable>

                  <ElForm label-position="top" class="mt-3 grid gap-3">
                    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <ElFormItem label="收款金額">
                        <ElInputNumber
                          v-model="receiveForm.amount"
                          :min="0"
                          class="!w-full"
                        />
                      </ElFormItem>
                      <ElFormItem label="收款日期">
                        <ElDatePicker
                          v-model="receiveForm.handledAt"
                          type="date"
                          value-format="YYYY-MM-DD"
                          class="!w-full"
                        />
                      </ElFormItem>
                      <ElFormItem label="方式">
                        <ElSelect v-model="receiveForm.method">
                          <ElOption
                            v-for="item in transactionMethodOptions"
                            :key="`receive-method-${item}`"
                            :label="item"
                            :value="item"
                          />
                        </ElSelect>
                      </ElFormItem>
                      <ElFormItem label="交易編號">
                        <ElInput v-model="receiveForm.referenceNo" />
                      </ElFormItem>
                      <ElFormItem label="備註">
                        <ElInput v-model="receiveForm.note" />
                      </ElFormItem>
                    </div>
                    <div class="flex justify-end">
                      <ElButton type="primary" @click="submitReceiveRecord"
                        >新增收款</ElButton
                      >
                    </div>
                  </ElForm>
                </ElCard>

                <ElCard shadow="never">
                  <template #header>
                    <span class="text-sm font-semibold text-slate-800">付款紀錄</span>
                  </template>
                  <ElTable :data="record.payRecords" table-layout="auto">
                    <ElTableColumn label="付款編號" min-width="140" prop="no" />
                    <ElTableColumn label="金額" min-width="120" align="right">
                      <template #default="{ row }">{{
                        formatCurrency(row.amount)
                      }}</template>
                    </ElTableColumn>
                    <ElTableColumn label="日期" min-width="120">
                      <template #default="{ row }">{{
                        formatDate(row.handledAt)
                      }}</template>
                    </ElTableColumn>
                    <ElTableColumn label="方式" min-width="120" prop="method" />
                    <ElTableColumn label="交易編號" min-width="140" prop="referenceNo" />
                    <ElTableColumn label="備註" min-width="200" show-overflow-tooltip>
                      <template #default="{ row }">{{ row.note || "-" }}</template>
                    </ElTableColumn>
                  </ElTable>

                  <ElForm label-position="top" class="mt-3 grid gap-3">
                    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <ElFormItem label="付款金額">
                        <ElInputNumber
                          v-model="payForm.amount"
                          :min="0"
                          class="!w-full"
                        />
                      </ElFormItem>
                      <ElFormItem label="付款日期">
                        <ElDatePicker
                          v-model="payForm.handledAt"
                          type="date"
                          value-format="YYYY-MM-DD"
                          class="!w-full"
                        />
                      </ElFormItem>
                      <ElFormItem label="方式">
                        <ElSelect v-model="payForm.method">
                          <ElOption
                            v-for="item in transactionMethodOptions"
                            :key="`pay-method-${item}`"
                            :label="item"
                            :value="item"
                          />
                        </ElSelect>
                      </ElFormItem>
                      <ElFormItem label="交易編號">
                        <ElInput v-model="payForm.referenceNo" />
                      </ElFormItem>
                      <ElFormItem label="備註">
                        <ElInput v-model="payForm.note" />
                      </ElFormItem>
                    </div>
                    <div class="flex justify-end">
                      <ElButton type="primary" @click="submitPayRecord"
                        >新增付款</ElButton
                      >
                    </div>
                  </ElForm>
                </ElCard>
              </section>
            </template>

            <template v-else-if="activeSection === 'relations'">
              <section class="grid gap-4">
                <ElDescriptions :column="2" border>
                  <ElDescriptionsItem label="客戶">{{
                    record.accountName
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="負責人">{{
                    record.ownerName
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="關聯營收">{{
                    record.revenueNo || "-"
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="關聯對帳">{{
                    record.reconciliationNo || "-"
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="關聯訂單">{{
                    record.orderNo || "-"
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="關聯合約">{{
                    record.contractNo || "-"
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="關聯報價">{{
                    record.quoteNo || "-"
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="關聯發票">{{
                    record.invoiceNo || "-"
                  }}</ElDescriptionsItem>
                </ElDescriptions>

                <div class="flex flex-wrap gap-2">
                  <ElButton @click="goToRelated('account')">前往客戶</ElButton>
                  <ElButton @click="goToRelated('opportunity')">前往商機</ElButton>
                  <ElButton @click="goToRelated('project')">前往專案</ElButton>
                  <ElButton @click="goToRelated('revenue')">前往營收資料</ElButton>
                  <ElButton @click="goToRelated('reconciliation')">前往對帳管理</ElButton>
                </div>

                <ElCard shadow="never">
                  <template #header>
                    <span class="text-sm font-semibold text-slate-800">異常提醒</span>
                  </template>
                  <div class="flex flex-wrap gap-2">
                    <ElTag
                      v-if="record.systemAlerts.length === 0"
                      type="success"
                      effect="light"
                      >無異常</ElTag
                    >
                    <ElTag
                      v-for="line in record.systemAlerts"
                      :key="line"
                      type="danger"
                      effect="light"
                    >
                      {{ line }}
                    </ElTag>
                  </div>
                </ElCard>
              </section>
            </template>

            <template v-else-if="activeSection === 'activities'">
              <ElTimeline>
                <ElTimelineItem
                  v-for="line in record.activities"
                  :key="line.id"
                  :timestamp="formatDateTime(line.occurredAt)"
                  placement="top"
                >
                  <div class="rounded-xl border border-slate-200 p-3">
                    <p class="text-sm font-semibold text-slate-800">{{ line.title }}</p>
                    <p class="mt-1 text-xs text-slate-600">
                      {{ line.description || "-" }}
                    </p>
                    <p class="mt-2 text-xs text-slate-500">
                      操作人：{{ line.actorName || "-" }}
                    </p>
                  </div>
                </ElTimelineItem>
              </ElTimeline>
            </template>

            <template v-else-if="activeSection === 'attachments'">
              <section class="grid gap-4">
                <ElCard shadow="never">
                  <template #header>
                    <span class="text-sm font-semibold text-slate-800">附件上傳</span>
                  </template>

                  <div class="grid gap-3 md:grid-cols-1 md:items-center">
                    <ElFormItem label="附件分類">
                      <ElSelect v-model="attachmentForm.category">
                        <ElOption
                          v-for="item in attachmentCategoryOptions"
                          :key="`attachment-cat-${item.value}`"
                          :label="item.label"
                          :value="item.value"
                        />
                      </ElSelect>
                    </ElFormItem>
                    <label
                      class="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Upload class="h-4 w-4" />
                      <span>選擇檔案上傳（可多選）</span>
                      <input
                        type="file"
                        class="hidden"
                        multiple
                        @change="handleUploadFiles"
                      />
                    </label>
                  </div>
                </ElCard>

                <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <article
                    v-for="item in record.attachments"
                    :key="item.id"
                    class="overflow-hidden rounded-xl border border-slate-200 bg-white"
                  >
                    <div
                      class="flex h-44 items-center justify-center overflow-hidden bg-slate-100"
                    >
                      <img
                        v-if="item.isImage"
                        :src="item.previewUrl"
                        :alt="item.name"
                        class="h-full w-full object-cover"
                      />
                      <div v-else class="grid gap-1 text-center text-slate-500">
                        <p class="text-sm font-medium">文件預覽</p>
                        <p class="text-xs">以空檔模擬預覽</p>
                      </div>
                    </div>
                    <div class="grid gap-2 p-3">
                      <p class="line-clamp-2 text-sm font-medium text-slate-800">
                        {{ item.name }}
                      </p>
                      <div class="flex flex-wrap items-center gap-2">
                        <ElTag size="small" effect="light">
                          {{
                            attachmentCategoryOptions.find(
                              (line) => line.value === item.category
                            )?.label || item.category
                          }}
                        </ElTag>
                        <span class="text-xs text-slate-500">{{
                          formatFileSize(item.size)
                        }}</span>
                      </div>
                      <p class="text-xs text-slate-500">
                        {{ formatDateTime(item.uploadedAt) }} /
                        {{ item.uploaderName || "-" }}
                      </p>
                      <div class="flex items-center justify-end gap-1">
                        <ElButton text type="primary" @click="openAttachmentPreview(item)"
                          >預覽</ElButton
                        >
                        <ElButton
                          text
                          type="danger"
                          :icon="Delete"
                          @click="removeAttachmentItem(item)"
                        >
                          移除
                        </ElButton>
                      </div>
                    </div>
                  </article>
                </section>

                <ElCard shadow="never">
                  <template #header>
                    <span class="text-sm font-semibold text-slate-800">內部備註</span>
                  </template>
                  <ElInput v-model="basicForm.notes" type="textarea" :rows="3" />
                  <div class="mt-3 flex justify-end">
                    <ElButton type="primary" @click="saveBasicInfo">儲存備註</ElButton>
                  </div>
                </ElCard>
              </section>
            </template>
          </div>
        </section>
      </section>
    </template>

    <template v-else>
      <div class="grid min-h-[60vh] place-items-center">
        <ElEmpty description="找不到單據資料">
          <ElButton type="primary" @click="goBack">返回列表</ElButton>
        </ElEmpty>
      </div>
    </template>
  </div>
</template>

<style scoped>
:deep(.el-form-item) {
  margin-bottom: 12px;
}

.detail-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}
</style>
