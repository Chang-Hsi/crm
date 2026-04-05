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
  campaignPriorityMap,
  campaignResultMap,
  campaignStatusMap,
  campaignTypeMap,
} from "../../data/campaigns";
import { useCampaignsStore } from "../../composables/useCampaignsStore";
import { useTasksStore } from "../../composables/useTasksStore";
import { useMilestonesStore } from "../../composables/useMilestonesStore";

const route = useRoute();
const router = useRouter();

const {
  cancelCampaign,
  closeCampaign,
  duplicateCampaign,
  getCampaignById,
} = useCampaignsStore();

const { tasks } = useTasksStore();
const { milestones } = useMilestonesStore();

const campaignId = computed(() => String(route.params.campaignId ?? ""));
const campaign = computed(() => getCampaignById(campaignId.value));

const relatedTasks = computed(() => {
  if (!campaign.value?.activityId) {
    return [];
  }

  return tasks.value.filter((item) => item.activityId === campaign.value.activityId);
});

const relatedMilestones = computed(() => {
  if (!campaign.value?.activityId) {
    return [];
  }

  return milestones.value.filter((item) => item.activityId === campaign.value.activityId);
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

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
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
  router.push({ name: "projects-campaigns" });
}

function editCampaign() {
  if (!campaign.value) {
    return;
  }

  router.push({
    name: "projects-campaigns",
    query: { edit: campaign.value.id },
  });
}

function goProject() {
  if (!campaign.value?.projectId) {
    return;
  }

  router.push({
    name: "project-detail",
    params: { projectId: campaign.value.projectId },
  });
}

function goPartner() {
  if (!campaign.value?.partnerId) {
    return;
  }

  router.push({
    name: "partners-list",
    query: { partnerId: campaign.value.partnerId },
  });
}

function openOpportunityList() {
  if (!campaign.value) {
    return;
  }

  router.push({
    name: "opportunities-list",
    query: {
      source: "campaign",
      campaignId: campaign.value.id,
      activityNo: campaign.value.activityNo,
    },
  });
}

function openTaskTracking() {
  router.push({
    name: "projects-tasks",
    query: campaign.value?.activityId ? { activityId: campaign.value.activityId } : {},
  });
}

function openMilestones() {
  router.push({
    name: "projects-milestones",
    query: campaign.value?.activityId ? { activityId: campaign.value.activityId } : {},
  });
}

async function closeCurrentCampaign() {
  if (!campaign.value) {
    return;
  }

  let reason = "";

  try {
    const result = await ElMessageBox.prompt("請輸入結案說明", "結案活動", {
      confirmButtonText: "結案",
      cancelButtonText: "取消",
      inputPlaceholder: "例如：活動成效追蹤完成",
    });

    reason = result.value.trim();
  } catch {
    return;
  }

  const updated = closeCampaign(campaign.value.id, reason, "林美雅");

  if (updated) {
    notify(`${updated.activityName} 已結案`);
  }
}

async function cancelCurrentCampaign() {
  if (!campaign.value) {
    return;
  }

  let reason = "";

  try {
    const result = await ElMessageBox.prompt("請輸入取消原因", "取消活動", {
      confirmButtonText: "取消活動",
      cancelButtonText: "返回",
      inputPlaceholder: "例如：策略調整或資源變更",
    });

    reason = result.value.trim();
  } catch {
    return;
  }

  const updated = cancelCampaign(campaign.value.id, reason, "林美雅");

  if (updated) {
    notify(`${updated.activityName} 已取消`, "已更新", "warning");
  }
}

function duplicateCurrentCampaign() {
  if (!campaign.value) {
    return;
  }

  const created = duplicateCampaign(campaign.value.id, "林美雅");

  if (created) {
    notify(`已建立複製活動：${created.activityName}`);
    router.push({
      name: "projects-campaign-detail",
      params: { campaignId: created.id },
    });
  }
}
</script>

<template>
  <div class="min-h-full p-8">
    <section v-if="campaign" class="grid gap-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-3">
          <ElButton text :icon="ArrowLeft" class="!justify-start !px-0" @click="goBack">
            返回行銷活動列表
          </ElButton>

          <div class="grid gap-1">
            <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">
              {{ campaign.activityName }}
            </h1>
            <p class="text-xs text-slate-500">
              {{ campaign.activityNo }} ・
              {{ campaignTypeMap[campaign.activityType]?.label || campaign.activityType }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <ElTag round :type="campaignStatusMap[campaign.status]?.type">
              {{ campaignStatusMap[campaign.status]?.label || campaign.status }}
            </ElTag>
            <ElTag
              round
              :type="campaignPriorityMap[campaign.priority]?.type"
              effect="light"
            >
              優先級：{{
                campaignPriorityMap[campaign.priority]?.label || campaign.priority
              }}
            </ElTag>
            <ElTag
              round
              :type="campaignResultMap[campaign.resultStatus]?.type"
              effect="light"
            >
              {{
                campaignResultMap[campaign.resultStatus]?.label || campaign.resultStatus
              }}
            </ElTag>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton @click="editCampaign">編輯</ElButton>
          <ElButton type="success" @click="closeCurrentCampaign">結案</ElButton>
          <ElButton @click="duplicateCurrentCampaign">複製活動</ElButton>
          <ElButton type="warning" plain @click="cancelCurrentCampaign"
            >取消活動</ElButton
          >
        </div>
      </header>

      <section class="grid gap-4 md:grid-cols-5">
        <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p class="text-xs text-slate-500">活動負責人</p>
          <p class="mt-2 text-base font-semibold text-slate-900">
            {{ campaign.ownerName || "-" }}
          </p>
        </article>
        <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p class="text-xs text-slate-500">活動日期</p>
          <p class="mt-2 text-base font-semibold text-slate-900">
            {{ formatDate(campaign.startDate) }}
          </p>
        </article>
        <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p class="text-xs text-slate-500">預算</p>
          <p class="mt-2 text-base font-semibold text-slate-900">
            {{ formatCurrency(campaign.budget) }}
          </p>
        </article>
        <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p class="text-xs text-slate-500">名單數</p>
          <p class="mt-2 text-base font-semibold text-slate-900">
            {{ campaign.leadCount }}
          </p>
        </article>
        <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p class="text-xs text-slate-500">關聯商機</p>
          <button
            type="button"
            class="mt-2 text-base font-semibold text-[#409eff] hover:text-[#337ecc]"
            @click="openOpportunityList"
          >
            {{ campaign.opportunityCount }} 筆
          </button>
        </article>
      </section>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">基本資訊</span>
        </template>
        <ElDescriptions :column="2" border class="uniform-descriptions">
          <ElDescriptionsItem label="活動名稱">{{
            campaign.activityName
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="活動編號">{{
            campaign.activityNo
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="活動類型">
            {{ campaignTypeMap[campaign.activityType]?.label || campaign.activityType }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="活動狀態">
            {{ campaignStatusMap[campaign.status]?.label || campaign.status }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="活動主題">{{
            campaign.topic || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="活動目標">{{
            campaign.objective || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="活動形式">{{
            campaign.format || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="目標受眾">{{
            campaign.audience || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="建立資訊">
            {{ formatDateTime(campaign.createdAt) }} ・ {{ campaign.createdBy || "-" }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="更新資訊">
            {{ formatDateTime(campaign.updatedAt) }} ・ {{ campaign.updatedBy || "-" }}
          </ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">時程資訊</span>
        </template>
        <ElDescriptions :column="2" border class="uniform-descriptions">
          <ElDescriptionsItem label="開始日期">{{
            formatDate(campaign.startDate)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="結束日期">{{
            formatDate(campaign.endDate)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="報名開始日期">{{
            formatDate(campaign.registrationStartDate)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="報名截止日期">{{
            formatDate(campaign.registrationEndDate)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="實際執行日期">{{
            formatDate(campaign.actualEventDate)
          }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-sm font-semibold text-slate-800">關聯資料</span>
            <div class="flex gap-2">
              <ElButton size="small" @click="goProject" :disabled="!campaign.projectId"
                >查看專案</ElButton
              >
              <ElButton size="small" @click="goPartner" :disabled="!campaign.partnerId"
                >查看夥伴</ElButton
              >
            </div>
          </div>
        </template>
        <ElDescriptions :column="2" border class="uniform-descriptions">
          <ElDescriptionsItem label="關聯專案">{{
            campaign.projectName || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="關聯夥伴">{{
            campaign.partnerName || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="關聯客戶">{{
            campaign.customerNames.join("、") || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="關聯商機">{{
            campaign.opportunityNames.join("、") || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="關聯產品 / 方案">{{
            campaign.productNames.join("、") || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="渠道 / 市場"
            >{{ campaign.channel || "-" }} /
            {{ campaign.region || "-" }}</ElDescriptionsItem
          >
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">預算與成果</span>
        </template>
        <ElDescriptions :column="2" border class="uniform-descriptions">
          <ElDescriptionsItem label="活動預算">{{
            formatCurrency(campaign.budget)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="實際成本">{{
            formatCurrency(campaign.actualCost)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="報名 / 出席">
            {{ campaign.signupCount }} / {{ campaign.attendanceCount }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="名單 / 有效名單">
            {{ campaign.leadCount }} / {{ campaign.qualifiedLeadCount }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="關聯商機數"
            >{{ campaign.opportunityCount }} 筆</ElDescriptionsItem
          >
          <ElDescriptionsItem label="預估產值 / 實際成交">
            {{ formatCurrency(campaign.estimatedValue) }} /
            {{ formatCurrency(campaign.actualRevenue) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="ROI">{{ campaign.roiRate }}%</ElDescriptionsItem>
          <ElDescriptionsItem label="成效摘要">{{
            campaign.resultSummary || "-"
          }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-sm font-semibold text-slate-800">任務與里程碑</span>
            <div class="flex gap-2">
              <ElButton size="small" @click="openTaskTracking">查看任務</ElButton>
              <ElButton size="small" @click="openMilestones">查看里程碑</ElButton>
            </div>
          </div>
        </template>
        <section class="grid gap-4 md:grid-cols-2">
          <article class="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p class="text-xs text-slate-500">關聯任務</p>
            <p class="mt-2 text-base font-semibold text-slate-900">
              {{ relatedTasks.length }} 筆
            </p>
            <p class="mt-1 text-xs text-slate-500">
              已完成
              {{ relatedTasks.filter((item) => item.status === "completed").length }} 筆
            </p>
          </article>
          <article class="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p class="text-xs text-slate-500">關聯里程碑</p>
            <p class="mt-2 text-base font-semibold text-slate-900">
              {{ relatedMilestones.length }} 筆
            </p>
            <p class="mt-1 text-xs text-slate-500">
              已完成
              {{
                relatedMilestones.filter((item) => item.status === "completed").length
              }}
              筆
            </p>
          </article>
        </section>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">說明與附件</span>
        </template>
        <div class="grid gap-2 text-sm text-slate-700">
          <p>{{ campaign.description || "-" }}</p>
          <p class="text-xs text-slate-500">備註：{{ campaign.notes || "-" }}</p>
          <p class="text-xs text-slate-500">
            附件：{{ campaign.attachments.join("、") || "-" }}
          </p>
        </div>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">歷程</span>
        </template>
        <ElTimeline>
          <ElTimelineItem
            v-for="item in campaign.activities"
            :key="item.id"
            :timestamp="formatDateTime(item.occurredAt)"
            placement="top"
          >
            <div class="grid gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p class="text-sm font-medium text-slate-800">{{ item.title }}</p>
              <p class="text-sm text-slate-700">{{ item.description || "-" }}</p>
              <p class="text-xs text-slate-500">{{ item.actorName || "-" }}</p>
            </div>
          </ElTimelineItem>
        </ElTimeline>

        <ElEmpty v-if="campaign.activities.length === 0" description="目前無歷程" />
      </ElCard>
    </section>

    <section v-else class="grid min-h-[60vh] place-items-center">
      <ElEmpty description="找不到行銷活動資料，可能已被移除" class="py-20">
        <ElButton type="primary" @click="goBack">返回行銷活動列表</ElButton>
      </ElEmpty>
    </section>
  </div>
</template>

<style scoped>
:deep(.uniform-descriptions .el-descriptions__body table) {
  width: 100%;
  table-layout: fixed;
}

:deep(.uniform-descriptions .el-descriptions__cell) {
  box-sizing: border-box;
}

:deep(.uniform-descriptions
    .el-descriptions__label.el-descriptions__cell.is-bordered-label) {
  width: 160px;
  min-width: 160px;
}

:deep(.uniform-descriptions .el-descriptions__row > td:nth-child(1)),
:deep(.uniform-descriptions .el-descriptions__row > td:nth-child(3)) {
  width: 160px;
  min-width: 160px;
}
</style>
