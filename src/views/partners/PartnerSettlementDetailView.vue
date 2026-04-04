<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElEmpty,
  ElMessageBox,
  ElNotification,
  ElStep,
  ElSteps,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTimeline,
  ElTimelineItem,
} from "element-plus";
import { ArrowLeft } from "@element-plus/icons-vue";
import {
  commissionTypeMap,
  cooperationModeMap,
  invoiceStatusMap,
  reconciliationStatusMap,
  settlementCycleMap,
  settlementStatusFlow,
  settlementStatusMap,
  sourceTypeMap,
} from "../../data/partnerSettlements";
import { usePartnerSettlementStore } from "../../composables/usePartnerSettlementStore";

const route = useRoute();
const router = useRouter();
const {
  cancelSettlement,
  getSettlementById,
  markAsException,
  markAsSettled,
  markInvoiceDone,
  markReconciliationDone,
} = usePartnerSettlementStore();

const settlementId = computed(() => String(route.params.settlementId ?? ""));
const settlement = computed(() => getSettlementById(settlementId.value));

const flowStepOptions = [
  { key: "created", label: "分潤成立" },
  ...settlementStatusFlow.map((status) => ({
    key: status,
    label: settlementStatusMap[status]?.label || status,
  })),
];

const flowActiveIndex = computed(() => {
  if (!settlement.value) {
    return 0;
  }

  if (settlement.value.status === "settled") {
    return flowStepOptions.length - 1;
  }

  const indexMap = {
    pending_confirmation: 2,
    pending_reconciliation: 3,
    pending_invoice: 4,
    pending_settlement: 5,
  };

  return indexMap[settlement.value.status] ?? 1;
});

const flowTerminalTag = computed(() => {
  if (!settlement.value) {
    return null;
  }

  if (settlement.value.status === "cancelled") {
    return { label: "流程已取消", type: "info" };
  }

  if (settlement.value.status === "exception") {
    return { label: "流程有異常，待處理", type: "danger" };
  }

  return null;
});

const canMarkReconciliation = computed(() => {
  if (!settlement.value) {
    return false;
  }

  return !["settled", "cancelled"].includes(settlement.value.status);
});

const canMarkInvoice = computed(() => {
  if (!settlement.value) {
    return false;
  }

  return !["settled", "cancelled"].includes(settlement.value.status);
});

const canMarkSettled = computed(() => {
  if (!settlement.value) {
    return false;
  }

  return !["settled", "cancelled"].includes(settlement.value.status);
});

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

function formatRate(value) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

function notify(message, title = "已更新", type = "success") {
  ElNotification({
    title,
    message,
    type,
    position: "top-right",
  });
}

function goBack() {
  router.push({ name: "partners-settlement" });
}

function goPartner() {
  if (!settlement.value) {
    return;
  }

  router.push({
    name: "partners-list",
    query: { partnerId: settlement.value.partnerId },
  });
}

function goSource() {
  if (!settlement.value) {
    return;
  }

  if (settlement.value.contractId) {
    router.push({
      name: "contract-detail",
      params: { contractId: settlement.value.contractId },
    });
    return;
  }

  router.push({
    name: "opportunity-detail",
    params: { opportunityId: settlement.value.opportunityId || settlement.value.sourceId },
  });
}

function goTerms() {
  if (!settlement.value) {
    return;
  }

  router.push({
    name: "partners-terms",
    query: { partnerId: settlement.value.partnerId },
  });
}

function reconciliationDone() {
  if (!settlement.value) {
    return;
  }

  const updated = markReconciliationDone(settlement.value.id);

  if (!updated) {
    return;
  }

  notify(`${updated.commissionNo} 已標記對帳完成`);
}

function invoiceDone() {
  if (!settlement.value) {
    return;
  }

  const updated = markInvoiceDone(settlement.value.id);

  if (!updated) {
    return;
  }

  notify(`${updated.commissionNo} 已標記請款完成`);
}

function settledDone() {
  if (!settlement.value) {
    return;
  }

  const updated = markAsSettled(settlement.value.id);

  if (!updated) {
    return;
  }

  notify(`${updated.commissionNo} 已標記結算完成`);
}

async function markException() {
  if (!settlement.value) {
    return;
  }

  let reason = "";

  try {
    const result = await ElMessageBox.prompt("請輸入異常原因", "標記有異常", {
      confirmButtonText: "確認",
      cancelButtonText: "取消",
      inputPlaceholder: "例如：對帳爭議、憑證缺漏",
    });

    reason = result.value.trim();
  } catch {
    return;
  }

  const updated = markAsException(settlement.value.id, reason);

  if (!updated) {
    return;
  }

  notify(`${updated.commissionNo} 已標記有異常`);
}

async function cancelCurrent() {
  if (!settlement.value) {
    return;
  }

  if (settlement.value.status === "settled") {
    notify("已結算資料不可取消", "無法取消", "warning");
    return;
  }

  let reason = "";

  try {
    const result = await ElMessageBox.prompt("請輸入取消原因", "取消分潤", {
      confirmButtonText: "取消分潤",
      cancelButtonText: "關閉",
      inputPlaceholder: "例如：資格不符、資料重複",
    });

    reason = result.value.trim();
  } catch {
    return;
  }

  const updated = cancelSettlement(settlement.value.id, reason);

  if (!updated) {
    return;
  }

  notify(`${updated.commissionNo} 已取消`);
}
</script>

<template>
  <div class="min-h-full p-8">
    <section v-if="settlement" class="grid gap-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-3">
          <ElButton text :icon="ArrowLeft" class="!justify-start !px-0" @click="goBack">
            返回分潤管理列表
          </ElButton>

          <div class="grid gap-1">
            <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">
              {{ settlement.commissionNo }}
            </h1>
            <p class="text-xs text-slate-500">
              {{ settlement.partnerName }} ・ {{ sourceTypeMap[settlement.sourceType]?.label }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <ElTag round :type="settlementStatusMap[settlement.status]?.type">
              {{ settlementStatusMap[settlement.status]?.label }}
            </ElTag>
            <ElTag round :type="commissionTypeMap[settlement.commissionType]?.type" effect="light">
              {{ commissionTypeMap[settlement.commissionType]?.label }}
            </ElTag>
            <ElTag round effect="plain">應分潤：{{ formatCurrency(settlement.commissionValue, settlement.currency) }}</ElTag>
            <ElTag round effect="plain">應結算：{{ formatDate(settlement.dueSettlementAt) }}</ElTag>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton :disabled="!canMarkReconciliation" @click="reconciliationDone">標記對帳完成</ElButton>
          <ElButton :disabled="!canMarkInvoice" @click="invoiceDone">標記請款完成</ElButton>
          <ElButton type="success" :disabled="!canMarkSettled" @click="settledDone">標記結算完成</ElButton>
          <ElButton type="warning" plain :disabled="!canMarkSettled" @click="markException">標記有異常</ElButton>
          <ElButton type="danger" plain :disabled="settlement.status === 'settled'" @click="cancelCurrent">取消分潤</ElButton>
          <ElButton @click="goSource">查看來源案件</ElButton>
        </div>
      </header>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">分潤基本資料</span>
        </template>

        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="分潤編號">{{ settlement.commissionNo }}</ElDescriptionsItem>
          <ElDescriptionsItem label="關聯夥伴">
            <button
              type="button"
              class="text-left text-sm font-medium text-[#409eff] hover:text-[#337ecc]"
              @click="goPartner"
            >
              {{ settlement.partnerName }}
            </button>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="分潤來源">{{ sourceTypeMap[settlement.sourceType]?.label }}</ElDescriptionsItem>
          <ElDescriptionsItem label="關聯商機">{{ settlement.opportunityName || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="關聯合約">{{ settlement.contractName || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="分潤類型">{{ commissionTypeMap[settlement.commissionType]?.label }}</ElDescriptionsItem>
          <ElDescriptionsItem label="合作模式">{{ cooperationModeMap[settlement.cooperationMode]?.label }}</ElDescriptionsItem>
          <ElDescriptionsItem label="規則來源">{{ settlement.ruleSource || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="建立時間">{{ settlement.createdAt || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="建立人">{{ settlement.createdBy || "-" }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">計算明細</span>
        </template>

        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="成交金額">
            {{ formatCurrency(settlement.baseAmount, settlement.currency) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="可計佣金額">
            {{ formatCurrency(settlement.commissionBaseAmount, settlement.currency) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="分潤比例">{{ formatRate(settlement.commissionRate) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="應分潤金額">
            {{ formatCurrency(settlement.commissionValue, settlement.currency) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="已結算金額">
            {{ formatCurrency(settlement.settledAmount, settlement.currency) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="未結算金額">
            {{ formatCurrency(settlement.unpaidAmount, settlement.currency) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="稅額 / 扣款">
            {{ formatCurrency(settlement.taxAmount, settlement.currency) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="調整金額">
            {{ formatCurrency(settlement.adjustmentAmount, settlement.currency) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="實際應付金額" :span="2">
            {{ formatCurrency(settlement.actualPayableAmount, settlement.currency) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="備註" :span="2">
            {{ settlement.notes || "-" }}
          </ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">狀態與流程</span>
        </template>

        <div class="grid gap-4">
          <ElSteps :active="flowActiveIndex" finish-status="success" align-center>
            <ElStep
              v-for="item in flowStepOptions"
              :key="item.key"
              :title="item.label"
            />
          </ElSteps>

          <div class="flex flex-wrap items-center gap-2">
            <ElTag round :type="reconciliationStatusMap[settlement.reconciliationStatus]?.type">
              對帳：{{ reconciliationStatusMap[settlement.reconciliationStatus]?.label }}
            </ElTag>
            <ElTag round :type="invoiceStatusMap[settlement.invoiceStatus]?.type">
              請款：{{ invoiceStatusMap[settlement.invoiceStatus]?.label }}
            </ElTag>
            <ElTag round effect="plain">成立：{{ formatDate(settlement.recognizedAt) }}</ElTag>
            <ElTag round effect="plain">應結算：{{ formatDate(settlement.dueSettlementAt) }}</ElTag>
            <ElTag round effect="plain">結算日：{{ formatDate(settlement.settledAt) }}</ElTag>
            <ElTag v-if="flowTerminalTag" round :type="flowTerminalTag.type">
              {{ flowTerminalTag.label }}
            </ElTag>
          </div>

          <div
            v-if="settlement.exceptionReason"
            class="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-700"
          >
            異常 / 取消原因：{{ settlement.exceptionReason }}
          </div>
        </div>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">對帳與附件</span>
        </template>

        <div class="grid gap-4">
          <ElDescriptions :column="2" border>
            <ElDescriptionsItem label="結算週期">
              {{ settlementCycleMap[settlement.settlementCycle]?.label || settlement.settlementCycle }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="對帳說明">
              {{ settlement.reconciliationNote || "-" }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="請款狀態">
              {{ invoiceStatusMap[settlement.invoiceStatus]?.label || settlement.invoiceStatus }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="最後更新">
              {{ settlement.updatedAt || "-" }} / {{ settlement.updatedBy || "-" }}
            </ElDescriptionsItem>
          </ElDescriptions>

          <ElTable v-if="settlement.attachments.length > 0" :data="settlement.attachments" size="large">
            <ElTableColumn label="附件名稱" min-width="280" prop="name" />
            <ElTableColumn label="附件類型" min-width="130" prop="category" />
            <ElTableColumn label="上傳時間" min-width="120">
              <template #default="{ row }">{{ formatDate(row.uploadedAt) }}</template>
            </ElTableColumn>
            <ElTableColumn label="上傳人" min-width="120" prop="uploaderName" />
          </ElTable>

          <ElEmpty v-else description="尚無請款或對帳附件" />
        </div>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">歷程</span>
        </template>

        <ElTimeline>
          <ElTimelineItem
            v-for="item in settlement.activities"
            :key="item.id"
            :timestamp="item.occurredAt"
            placement="top"
          >
            <div class="rounded-lg border border-slate-200 px-4 py-3">
              <p class="text-sm font-semibold text-slate-800">{{ item.title }}</p>
              <p class="mt-1 text-sm text-slate-500">{{ item.description || "-" }}</p>
              <p class="mt-1 text-xs text-slate-400">{{ item.actorName }}</p>
            </div>
          </ElTimelineItem>
        </ElTimeline>
      </ElCard>

      <div class="flex flex-wrap items-center justify-end gap-2">
        <ElButton @click="goTerms">查看合作條件</ElButton>
        <ElButton @click="goPartner">查看夥伴</ElButton>
      </div>
    </section>

    <section v-else class="rounded-2xl border border-slate-200 bg-white px-6 py-16">
      <ElEmpty description="找不到分潤資料">
        <p class="mb-4 text-sm text-slate-500">此分潤資料不存在或已移除。</p>
        <ElButton type="primary" @click="goBack">返回分潤管理列表</ElButton>
      </ElEmpty>
    </section>
  </div>
</template>
