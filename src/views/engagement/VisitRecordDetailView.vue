<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElEmpty,
  ElNotification,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTimeline,
  ElTimelineItem,
} from "element-plus";
import { ArrowLeft } from "@element-plus/icons-vue";
import {
  actionItemStatusMap,
  visitFormatMap,
  visitStatusMap,
  visitTypeMap,
} from "../../data/visits";
import { useVisitsStore } from "../../composables/useVisitsStore";

const route = useRoute();
const router = useRouter();
const { archiveVisit, duplicateVisit, getVisitById } = useVisitsStore();

const visitId = computed(() => String(route.params.visitId ?? ""));
const visit = computed(() => getVisitById(visitId.value));

function notify(message, title = "已更新", type = "success") {
  ElNotification({
    title,
    message,
    type,
    position: "top-right",
  });
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
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

function richContentHtml(value) {
  const content = String(value || "").trim();
  if (!content) {
    return "<p class='text-slate-400'>尚未填寫內容</p>";
  }

  if (/<\/?[a-z][\s\S]*>/i.test(content)) {
    return content;
  }

  return content
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\n", "<br>");
}

function goBack() {
  router.push({ name: "engagement-visits" });
}

function editVisit() {
  if (!visit.value) {
    return;
  }

  router.push({
    name: "engagement-visit-edit",
    params: { visitId: visit.value.id },
  });
}

function cloneVisit() {
  if (!visit.value) {
    return;
  }

  const created = duplicateVisit(visit.value.id, "林美雅");
  if (!created) {
    notify("複製失敗", "錯誤", "error");
    return;
  }

  notify(`已建立複製拜訪：${created.title}`);
  router.push({
    name: "engagement-visit-detail",
    params: { visitId: created.id },
  });
}

function archiveCurrent() {
  if (!visit.value) {
    return;
  }

  archiveVisit(visit.value.id, "詳情頁封存", "林美雅");
  notify(`${visit.value.title} 已封存`);
}

function openAccount() {
  if (!visit.value?.customerId) {
    return;
  }

  router.push({
    name: "account-detail",
    params: { accountId: visit.value.customerId },
  });
}

function openOpportunity() {
  if (!visit.value?.opportunityId) {
    return;
  }

  router.push({
    name: "opportunity-detail",
    params: { opportunityId: visit.value.opportunityId },
  });
}

function openProject() {
  if (!visit.value?.projectId) {
    return;
  }

  router.push({
    name: "project-detail",
    params: { projectId: visit.value.projectId },
  });
}

function openPartner() {
  if (!visit.value?.partnerId) {
    return;
  }

  router.push({
    name: "partners-list",
    query: { partnerId: visit.value.partnerId },
  });
}

function openSupportTicket() {
  if (!visit.value?.supportTicketId) {
    return;
  }

  router.push({
    name: "engagement-issues",
    query: { ticketId: visit.value.supportTicketId },
  });
}

function openMeetingRecord() {
  if (!visit.value?.relatedMeetingId) {
    return;
  }

  router.push({
    name: "engagement-meeting-detail",
    params: { meetingId: visit.value.relatedMeetingId },
  });
}
</script>

<template>
  <div class="min-h-full p-8">
    <section v-if="visit" class="grid gap-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-3">
          <ElButton text :icon="ArrowLeft" class="!justify-start !px-0" @click="goBack">
            返回拜訪紀錄列表
          </ElButton>

          <div class="grid gap-1">
            <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">
              {{ visit.title }}
            </h1>
            <p class="text-xs text-slate-500">{{ visit.visitNo }}</p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <ElTag :type="visitTypeMap[visit.visitType]?.type" effect="light" round>
              {{ visitTypeMap[visit.visitType]?.label || visit.visitType }}
            </ElTag>
            <ElTag :type="visitStatusMap[visit.status]?.type" effect="light" round>
              {{ visitStatusMap[visit.status]?.label || visit.status }}
            </ElTag>
            <ElTag v-if="visit.isImportant" type="danger" effect="light" round
              >重要</ElTag
            >
            <ElTag v-if="visit.isFirstVisit" effect="light" round>初訪</ElTag>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton @click="editVisit">編輯</ElButton>
          <ElButton @click="cloneVisit">複製為新拜訪</ElButton>
          <ElButton type="warning" plain @click="archiveCurrent">封存</ElButton>
        </div>
      </header>

      <section class="grid gap-4 md:grid-cols-5">
        <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p class="text-xs text-slate-500">拜訪日期</p>
          <p class="mt-2 text-base font-semibold text-slate-900">
            {{ formatDate(visit.visitDate) }}
          </p>
        </article>
        <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p class="text-xs text-slate-500">主責人</p>
          <p class="mt-2 text-base font-semibold text-slate-900">
            {{ visit.ownerName }}
          </p>
        </article>
        <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p class="text-xs text-slate-500">受訪對象</p>
          <p class="mt-2 text-base font-semibold text-slate-900">
            {{ visit.visitTarget || "-" }}
          </p>
        </article>
        <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p class="text-xs text-slate-500">參與者</p>
          <p class="mt-2 text-base font-semibold text-slate-900">
            {{ visit.participantCount }} 人
          </p>
        </article>
        <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p class="text-xs text-slate-500">待辦</p>
          <p class="mt-2 text-base font-semibold text-amber-600">
            {{ visit.openActionItemCount }} / {{ visit.actionItemCount }}
          </p>
        </article>
      </section>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">基本資訊</span>
        </template>

        <ElDescriptions :column="2" border class="uniform-descriptions">
          <ElDescriptionsItem label="主題">{{ visit.title }}</ElDescriptionsItem>
          <ElDescriptionsItem label="編號">{{ visit.visitNo }}</ElDescriptionsItem>
          <ElDescriptionsItem label="拜訪類型">{{
            visitTypeMap[visit.visitType]?.label || visit.visitType
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="拜訪狀態">{{
            visitStatusMap[visit.status]?.label || visit.status
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="拜訪日期">{{
            formatDate(visit.visitDate)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="時間"
            >{{ visit.startTime }} - {{ visit.endTime }}</ElDescriptionsItem
          >
          <ElDescriptionsItem label="拜訪形式">{{
            visitFormatMap[visit.format]?.label || visit.format
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="拜訪地點">{{ visit.location || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="地址">{{ visit.address || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="最後更新"
            >{{ formatDateTime(visit.updatedAt) }} ・ {{ visit.updatedBy }}</ElDescriptionsItem
          >
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">參與者</span>
        </template>

        <ElDescriptions :column="2" border class="uniform-descriptions">
          <ElDescriptionsItem label="拜訪主責人">{{ visit.ownerName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="協同拜訪人員">{{
            visit.collaboratorNames.join("、") || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="受訪對象">{{ visit.visitTarget || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="客戶端參與者">{{
            visit.customerParticipants.join("、") || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="夥伴端參與者">{{
            visit.partnerParticipants.join("、") || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="關聯聯絡人">{{
            visit.contacts.join("、") || "-"
          }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-sm font-semibold text-slate-800">關聯資料</span>
            <div class="flex flex-wrap gap-2">
              <ElButton size="small" @click="openAccount" :disabled="!visit.customerId"
                >客戶</ElButton
              >
              <ElButton
                size="small"
                @click="openOpportunity"
                :disabled="!visit.opportunityId"
                >商機</ElButton
              >
              <ElButton size="small" @click="openProject" :disabled="!visit.projectId"
                >專案</ElButton
              >
              <ElButton size="small" @click="openPartner" :disabled="!visit.partnerId"
                >夥伴</ElButton
              >
              <ElButton
                size="small"
                @click="openSupportTicket"
                :disabled="!visit.supportTicketId"
                >支援案件</ElButton
              >
              <ElButton
                size="small"
                @click="openMeetingRecord"
                :disabled="!visit.relatedMeetingId"
                >關聯會議</ElButton
              >
            </div>
          </div>
        </template>

        <ElDescriptions :column="2" border class="uniform-descriptions">
          <ElDescriptionsItem label="客戶">{{ visit.customerName || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="商機">{{
            visit.opportunityName || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="專案">{{ visit.projectName || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="活動">{{ visit.activityName || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="夥伴">{{ visit.partnerName || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="支援案件">{{
            visit.supportTicketTitle || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="關聯會議紀錄">{{
            visit.relatedMeetingId || "-"
          }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">內容與觀察</span>
        </template>

        <div class="grid gap-4">
          <div>
            <h3 class="text-sm font-semibold text-slate-700">拜訪目的</h3>
            <p class="mt-1 text-sm text-slate-600">{{ visit.objective || "-" }}</p>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-slate-700">拜訪摘要</h3>
            <p class="mt-1 text-sm text-slate-600">{{ visit.summary || "-" }}</p>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-slate-700">討論內容</h3>
            <div
              class="visit-rich-content mt-1 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-7 text-slate-700"
              v-html="richContentHtml(visit.richContent)"
            />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-slate-700">現場觀察</h3>
            <p class="mt-1 text-sm text-slate-600">{{ visit.observations || "-" }}</p>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-slate-700">問題 / 風險</h3>
            <p class="mt-1 text-sm text-slate-600">{{ visit.risks || "-" }}</p>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-slate-700">結論 / 判斷</h3>
            <p class="mt-1 text-sm text-slate-600">{{ visit.conclusion || "-" }}</p>
          </div>
        </div>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">待辦事項</span>
        </template>

        <ElTable :data="visit.actionItems" size="small">
          <ElTableColumn label="內容" min-width="220" prop="content" />
          <ElTableColumn label="負責人" min-width="120" prop="ownerName" />
          <ElTableColumn label="截止日" min-width="120" prop="dueDate" />
          <ElTableColumn label="狀態" min-width="120">
            <template #default="{ row }">
              <ElTag
                size="small"
                :type="actionItemStatusMap[row.status]?.type"
                effect="light"
              >
                {{ actionItemStatusMap[row.status]?.label || row.status }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="轉任務" min-width="150">
            <template #default="{ row }">
              <span v-if="row.taskNo" class="text-[#409eff]">{{ row.taskNo }}</span>
              <span v-else class="text-slate-400">-</span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="備註" min-width="200" prop="note" />
        </ElTable>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">附件與備註</span>
        </template>

        <ElDescriptions :column="2" border class="uniform-descriptions">
          <ElDescriptionsItem label="下次拜訪建議">{{
            visit.nextVisitSuggestedAt || "待安排"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="標籤">{{ visit.tags.join("、") || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="附件">{{
            visit.attachments.join("、") || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="備註">{{ visit.notes || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="建立資訊"
            >{{ formatDateTime(visit.createdAt) }} ・ {{ visit.createdBy }}</ElDescriptionsItem
          >
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">歷程</span>
        </template>

        <ElTimeline>
          <ElTimelineItem
            v-for="event in visit.activities"
            :key="event.id"
            :timestamp="formatDateTime(event.occurredAt)"
          >
            <div class="grid gap-1">
              <p class="text-sm font-semibold text-slate-800">{{ event.title }}</p>
              <p class="text-xs text-slate-500">{{ event.description || "-" }}</p>
              <p class="text-xs text-slate-400">{{ event.actorName }}</p>
            </div>
          </ElTimelineItem>
        </ElTimeline>
      </ElCard>
    </section>

    <ElEmpty v-else description="找不到拜訪紀錄" :image-size="120">
      <ElButton type="primary" @click="goBack">返回拜訪紀錄列表</ElButton>
    </ElEmpty>
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

:deep(.visit-rich-content h2),
:deep(.visit-rich-content h3) {
  margin: 10px 0 8px;
  color: #1e293b;
  font-weight: 600;
}

:deep(.visit-rich-content h2) {
  font-size: 20px;
}

:deep(.visit-rich-content h3) {
  font-size: 16px;
}

:deep(.visit-rich-content ul),
:deep(.visit-rich-content ol) {
  margin: 8px 0;
  padding-left: 22px;
}

:deep(.visit-rich-content ul) {
  list-style: disc;
}

:deep(.visit-rich-content ol) {
  list-style: decimal;
}

:deep(.visit-rich-content blockquote) {
  margin: 10px 0;
  padding: 8px 12px;
  border-left: 3px solid #94a3b8;
  color: #475569;
  background: #f8fafc;
}

:deep(.visit-rich-content table) {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0;
}

:deep(.visit-rich-content td),
:deep(.visit-rich-content th) {
  border: 1px solid #d1d5db;
  padding: 6px 8px;
  vertical-align: top;
}
</style>
