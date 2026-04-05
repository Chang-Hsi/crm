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
  ElProgress,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTimeline,
  ElTimelineItem,
} from "element-plus";
import { ArrowLeft } from "@element-plus/icons-vue";
import {
  projectPriorityMap,
  projectStatusMap,
  projectTypeMap,
  riskLevelMap,
} from "../../data/projects";
import { useProjectsStore } from "../../composables/useProjectsStore";

const route = useRoute();
const router = useRouter();
const {
  archiveProject,
  cancelProject,
  closeProject,
  getProjectById,
} = useProjectsStore();

const projectId = computed(() => String(route.params.projectId ?? ""));
const project = computed(() => getProjectById(projectId.value));

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

function formatCurrency(value, currency = "TWD") {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
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
  router.push({ name: "projects-list" });
}

function editProject() {
  if (!project.value) {
    return;
  }

  router.push({
    name: "projects-list",
    query: { edit: project.value.id },
  });
}

function goAccount() {
  if (!project.value?.customerId) {
    return;
  }

  router.push({
    name: "account-detail",
    params: { accountId: project.value.customerId },
  });
}

function goOpportunity() {
  if (!project.value?.opportunityId) {
    return;
  }

  router.push({
    name: "opportunity-detail",
    params: { opportunityId: project.value.opportunityId },
  });
}

function goMilestones() {
  if (!project.value) {
    return;
  }

  router.push({
    name: "projects-milestones",
    query: { projectId: project.value.id },
  });
}

async function closeCurrentProject() {
  if (!project.value) {
    return;
  }

  let reason = "";

  try {
    const result = await ElMessageBox.prompt("請輸入結案說明", "結案專案", {
      confirmButtonText: "結案",
      cancelButtonText: "取消",
      inputPlaceholder: "例如：驗收與交付已完成",
    });

    reason = result.value.trim();
  } catch {
    return;
  }

  const updated = closeProject(project.value.id, reason);

  if (updated) {
    notify(`${updated.projectName} 已結案`);
  }
}

function archiveCurrentProject() {
  if (!project.value) {
    return;
  }

  const updated = archiveProject(project.value.id, "由詳情頁封存");

  if (updated) {
    notify(`${updated.projectName} 已封存`);
  }
}

async function cancelCurrentProject() {
  if (!project.value) {
    return;
  }

  let reason = "";

  try {
    const result = await ElMessageBox.prompt("請輸入取消原因", "取消專案", {
      confirmButtonText: "取消專案",
      cancelButtonText: "關閉",
      inputPlaceholder: "例如：需求取消、合作終止",
    });

    reason = result.value.trim();
  } catch {
    return;
  }

  const updated = cancelProject(project.value.id, reason);

  if (updated) {
    notify(`${updated.projectName} 已取消`, "已更新", "warning");
  }
}
</script>

<template>
  <div class="min-h-full p-8">
    <section v-if="project" class="grid gap-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-3">
          <ElButton text :icon="ArrowLeft" class="!justify-start !px-0" @click="goBack">
            返回專案列表
          </ElButton>

          <div class="grid gap-1">
            <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">
              {{ project.projectName }}
            </h1>
            <p class="text-xs text-slate-500">
              {{ project.projectNo }} ・
              {{ projectTypeMap[project.projectType]?.label || project.projectType }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <ElTag round :type="projectStatusMap[project.status]?.type">
              {{ projectStatusMap[project.status]?.label }}
            </ElTag>
            <ElTag
              round
              :type="projectPriorityMap[project.priority]?.type"
              effect="light"
            >
              優先級：{{ projectPriorityMap[project.priority]?.label }}
            </ElTag>
            <ElTag round :type="riskLevelMap[project.riskLevel]?.type" effect="light">
              風險：{{ riskLevelMap[project.riskLevel]?.label }}
            </ElTag>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton @click="editProject">編輯</ElButton>
          <ElButton type="success" @click="closeCurrentProject">結案</ElButton>
          <ElButton @click="archiveCurrentProject">封存</ElButton>
          <ElButton type="danger" plain @click="cancelCurrentProject">取消</ElButton>
        </div>
      </header>

      <section class="grid gap-4 md:grid-cols-3">
        <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p class="text-xs text-slate-500">專案負責人</p>
          <p class="mt-2 text-base font-semibold text-slate-900">
            {{ project.ownerName || "-" }}
          </p>
        </article>
        <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p class="text-xs text-slate-500">專案進度</p>
          <div class="mt-2 grid gap-1">
            <p class="text-base font-semibold text-slate-900">{{ project.progress }}%</p>
            <ElProgress
              :percentage="project.progress"
              :stroke-width="8"
              :show-text="false"
            />
          </div>
        </article>
        <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p class="text-xs text-slate-500">里程碑進度</p>
          <p class="mt-2 text-base font-semibold text-slate-900">
            {{ project.milestoneCompleted }} / {{ project.milestoneTotal }}
          </p>
        </article>
      </section>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">基本資訊</span>
        </template>
        <ElDescriptions :column="2" border class="uniform-descriptions">
          <ElDescriptionsItem label="專案名稱">{{
            project.projectName
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="專案編號">{{
            project.projectNo
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="專案類型">
            {{ projectTypeMap[project.projectType]?.label || project.projectType }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="專案狀態">
            {{ projectStatusMap[project.status]?.label || project.status }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="優先級">
            {{ projectPriorityMap[project.priority]?.label || project.priority }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="建立時間">{{
            formatDateTime(project.createdAt)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="建立人">{{
            project.createdBy || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="最後更新">{{
            formatDateTime(project.updatedAt)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="最後更新人">{{
            project.updatedBy || "-"
          }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">關聯資料</span>
        </template>
        <ElDescriptions :column="2" border class="uniform-descriptions">
          <ElDescriptionsItem label="客戶">
            <button
              type="button"
              class="text-left text-sm font-medium text-[#409eff] hover:text-[#337ecc]"
              @click="goAccount"
            >
              {{ project.customerName || "-" }}
            </button>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="商機">
            <button
              type="button"
              class="text-left text-sm font-medium text-[#409eff] hover:text-[#337ecc]"
              @click="goOpportunity"
            >
              {{ project.opportunityName || "-" }}
            </button>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="夥伴">{{
            project.partnerName || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="活動">{{
            project.activityName || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="合約">{{
            project.contractName || "-"
          }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">執行資訊</span>
        </template>
        <ElDescriptions :column="2" border class="uniform-descriptions">
          <ElDescriptionsItem label="專案負責人">{{
            project.ownerName || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="參與成員">
            {{ (project.memberNames ?? []).join("、") || "-" }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="開始日期">{{
            formatDate(project.startDate)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="預計結束日">{{
            formatDate(project.dueDate)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="實際結束日">{{
            formatDate(project.actualEndDate)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="風險等級">
            {{ riskLevelMap[project.riskLevel]?.label || project.riskLevel }}
          </ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-semibold text-slate-800">里程碑</span>
            <ElButton text type="primary" @click="goMilestones">管理里程碑</ElButton>
          </div>
        </template>
        <ElTable
          v-if="project.milestones.length > 0"
          :data="project.milestones"
          size="large"
        >
          <ElTableColumn label="里程碑" prop="name" min-width="220" />
          <ElTableColumn label="狀態" min-width="120">
            <template #default="{ row }">
              <ElTag
                round
                effect="light"
                :type="
                  row.status === 'completed'
                    ? 'success'
                    : row.status === 'delayed'
                    ? 'danger'
                    : 'info'
                "
              >
                {{ row.status }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="預計日期" min-width="120">
            <template #default="{ row }">{{ formatDate(row.dueDate) }}</template>
          </ElTableColumn>
          <ElTableColumn label="實際完成日" min-width="120">
            <template #default="{ row }">{{ formatDate(row.completedAt) }}</template>
          </ElTableColumn>
        </ElTable>
        <ElEmpty v-else description="目前尚未建立里程碑" />
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">商務資訊與備註</span>
        </template>
        <ElDescriptions :column="2" border class="uniform-descriptions">
          <ElDescriptionsItem label="專案預算">
            {{ formatCurrency(project.budget, project.currency) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="預估成本">
            {{ formatCurrency(project.estimatedCost, project.currency) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="專案價值">
            {{ formatCurrency(project.value, project.currency) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="幣別">{{ project.currency }}</ElDescriptionsItem>
          <ElDescriptionsItem label="專案目標" :span="2">{{
            project.objective || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="執行說明" :span="2">{{
            project.description || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="備註" :span="2">{{
            project.notes || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="附件" :span="2">
            {{ (project.attachments ?? []).join("、") || "-" }}
          </ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">歷程</span>
        </template>
        <ElTimeline>
          <ElTimelineItem
            v-for="item in project.activities"
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
    </section>

    <section v-else class="rounded-2xl border border-slate-200 bg-white px-6 py-16">
      <ElEmpty description="找不到專案資料">
        <p class="mb-4 text-sm text-slate-500">此專案不存在或已移除。</p>
        <ElButton type="primary" @click="goBack">返回專案列表</ElButton>
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
