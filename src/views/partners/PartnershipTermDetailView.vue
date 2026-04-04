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
  ElTag,
  ElTimeline,
  ElTimelineItem,
} from "element-plus";
import { ArrowLeft } from "@element-plus/icons-vue";
import {
  commissionTypeMap,
  cooperationModeMap,
  partnershipStatusMap,
  settlementCycleMap,
} from "../../data/partnershipTerms";
import { usePartnershipTermsStore } from "../../composables/usePartnershipTermsStore";

const route = useRoute();
const router = useRouter();
const { getTermById, copyTermAsNewVersion, deactivateTerm, setTermActive } =
  usePartnershipTermsStore();

const termId = computed(() => String(route.params.termId ?? ""));
const term = computed(() => getTermById(termId.value));

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
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatCommission(termRecord) {
  if (termRecord.commissionType === "none") {
    return "無";
  }

  if (termRecord.commissionType === "percentage") {
    return `${termRecord.commissionValue ?? 0}%`;
  }

  if (termRecord.commissionType === "fixed") {
    return formatCurrency(termRecord.commissionValue, termRecord.currency);
  }

  return commissionTypeMap[termRecord.commissionType]?.label ?? termRecord.commissionType;
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
  router.push({ name: "partners-terms" });
}

function editTerm() {
  if (!term.value) {
    return;
  }

  router.push({
    name: "partners-terms",
    query: { edit: term.value.id },
  });
}

function copyAsNewVersion() {
  if (!term.value) {
    return;
  }

  const nextRecord = copyTermAsNewVersion(term.value.id);

  if (!nextRecord) {
    return;
  }

  notify(`已複製新版本 ${nextRecord.conditionNo}`);

  router.push({
    name: "partners-terms",
    query: { edit: nextRecord.id },
  });
}

function activateTerm() {
  if (!term.value) {
    return;
  }

  const activated = setTermActive(term.value.id);

  if (!activated) {
    return;
  }

  notify(`${activated.conditionName} 已設為生效中`);
}

async function deactivateCurrentTerm() {
  if (!term.value) {
    return;
  }

  let reason = "";

  try {
    const result = await ElMessageBox.prompt("請輸入停用原因", "停用合作條件", {
      confirmButtonText: "停用",
      cancelButtonText: "取消",
      inputPlaceholder: "例如：條件改版、策略調整",
    });

    reason = result.value.trim();
  } catch {
    return;
  }

  const updated = deactivateTerm(term.value.id, reason);

  if (!updated) {
    return;
  }

  notify(`${updated.conditionName} 已停用`);
}
</script>

<template>
  <div class="min-h-full p-8">
    <section v-if="term" class="grid gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-3">
          <ElButton text :icon="ArrowLeft" class="!justify-start !px-0" @click="goBack">
            返回合作條件列表
          </ElButton>

          <div class="grid gap-1">
            <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">
              {{ term.conditionName }}
            </h1>
            <p class="text-xs text-slate-500">
              {{ term.conditionNo }} ・ {{ term.partnerName }} ・ v{{ term.version }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <ElTag round :type="partnershipStatusMap[term.status]?.type">
              {{ partnershipStatusMap[term.status]?.label }}
            </ElTag>
            <ElTag round :type="term.isCurrentEffective ? 'success' : 'info'">
              {{ term.isCurrentEffective ? "目前生效" : "非生效版本" }}
            </ElTag>
            <ElTag round effect="plain">生效：{{ formatDate(term.effectiveDate) }}</ElTag>
            <ElTag round effect="plain">到期：{{ term.isLongTerm ? "長期" : formatDate(term.expiryDate) }}</ElTag>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton @click="editTerm">編輯</ElButton>
          <ElButton @click="copyAsNewVersion">複製為新版本</ElButton>
          <ElButton type="success" @click="activateTerm">設為生效</ElButton>
          <ElButton type="danger" plain @click="deactivateCurrentTerm">停用</ElButton>
        </div>
      </div>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">合作模式</span>
        </template>

        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="合作模式">
            <ElTag round effect="light" :type="cooperationModeMap[term.cooperationMode]?.type">
              {{ cooperationModeMap[term.cooperationMode]?.label }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="合作角色">{{ term.cooperationRole || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="適用產品 / 方案">
            {{ term.applicableProducts.join("、") || "-" }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="適用渠道">
            {{ term.applicableChannels.join("、") || "-" }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="適用客群">{{ term.applicableCustomers || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="適用地區 / 市場">
            {{ term.applicableMarkets.join("、") || "-" }}
          </ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">商務條件</span>
        </template>

        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="價格機制">{{ term.pricingPolicy || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="折扣機制">
            {{ term.discountType === "none" ? "無" : `${term.discountType} / ${term.discountValue}` }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="分潤類型">
            {{ commissionTypeMap[term.commissionType]?.label || term.commissionType }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="分潤比例 / 金額">{{ formatCommission(term) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="最低門檻">{{ term.minPerformanceTarget || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="保底 / 保量">{{ term.guaranteeRule || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="獎勵規則" :span="2">{{ term.incentiveRule || "-" }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">結算規則</span>
        </template>

        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="幣別">{{ term.currency }}</ElDescriptionsItem>
          <ElDescriptionsItem label="結算方式">{{ term.settlementMethod || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="結算週期">
            {{ settlementCycleMap[term.settlementCycle]?.label || term.settlementCycle }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="對帳方式">{{ term.reconciliationRule || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="付款條件">{{ term.paymentTerms || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="稅務處理">{{ term.taxRule || "-" }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">生效與限制</span>
        </template>

        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="生效日">{{ formatDate(term.effectiveDate) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="到期日">
            {{ term.isLongTerm ? "長期" : formatDate(term.expiryDate) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="允許續用">{{ term.isRenewable ? "是" : "否" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="排他">{{ term.isExclusive ? "是" : "否" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="限制條件" :span="2">{{ term.restrictions || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="備註" :span="2">{{ term.notes || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="附件" :span="2">
            {{ term.attachments.length > 0 ? term.attachments.join("、") : "-" }}
          </ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">歷程</span>
        </template>

        <ElTimeline v-if="term.history.length > 0">
          <ElTimelineItem
            v-for="item in term.history"
            :key="item.id"
            :timestamp="formatDate(item.occurredAt)"
            placement="top"
          >
            <div class="grid gap-1">
              <p class="text-sm font-semibold text-slate-900">{{ item.title }}</p>
              <p class="text-sm text-slate-500">{{ item.description || "-" }}</p>
              <p class="text-xs text-slate-400">{{ item.actorName }}</p>
            </div>
          </ElTimelineItem>
        </ElTimeline>

        <ElEmpty v-else description="目前尚無歷程紀錄" />
      </ElCard>
    </section>

    <section v-else class="grid place-items-center py-20">
      <ElEmpty description="資料不存在或已移除">
        <ElButton type="primary" @click="goBack">返回列表</ElButton>
      </ElEmpty>
    </section>
  </div>
</template>
