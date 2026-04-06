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
  meetingFormatMap,
  meetingStatusMap,
  meetingTypeMap,
} from "../../data/meetings";
import { useMeetingsStore } from "../../composables/useMeetingsStore";

const route = useRoute();
const router = useRouter();
const { archiveMeeting, duplicateMeeting, getMeetingById } = useMeetingsStore();

const meetingId = computed(() => String(route.params.meetingId ?? ""));
const meeting = computed(() => getMeetingById(meetingId.value));

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
  router.push({ name: "engagement-meetings" });
}

function editMeeting() {
  if (!meeting.value) {
    return;
  }

  router.push({
    name: "engagement-meeting-edit",
    params: { meetingId: meeting.value.id },
  });
}

function cloneMeeting() {
  if (!meeting.value) {
    return;
  }

  const created = duplicateMeeting(meeting.value.id, "林美雅");
  if (!created) {
    notify("複製失敗", "錯誤", "error");
    return;
  }

  notify(`已建立複製會議：${created.title}`);
  router.push({
    name: "engagement-meeting-detail",
    params: { meetingId: created.id },
  });
}

function archiveCurrent() {
  if (!meeting.value) {
    return;
  }

  archiveMeeting(meeting.value.id, "詳情頁封存", "林美雅");
  notify(`${meeting.value.title} 已封存`);
}

function openAccount() {
  if (!meeting.value?.customerId) {
    return;
  }

  router.push({
    name: "account-detail",
    params: { accountId: meeting.value.customerId },
  });
}

function openOpportunity() {
  if (!meeting.value?.opportunityId) {
    return;
  }

  router.push({
    name: "opportunity-detail",
    params: { opportunityId: meeting.value.opportunityId },
  });
}

function openProject() {
  if (!meeting.value?.projectId) {
    return;
  }

  router.push({
    name: "project-detail",
    params: { projectId: meeting.value.projectId },
  });
}

function openPartner() {
  if (!meeting.value?.partnerId) {
    return;
  }

  router.push({
    name: "partners-list",
    query: { partnerId: meeting.value.partnerId },
  });
}
</script>

<template>
  <div class="min-h-full p-8">
    <section v-if="meeting" class="grid gap-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-3">
          <ElButton text :icon="ArrowLeft" class="!justify-start !px-0" @click="goBack">
            返回會議紀錄列表
          </ElButton>

          <div class="grid gap-1">
            <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">
              {{ meeting.title }}
            </h1>
            <p class="text-xs text-slate-500">{{ meeting.meetingNo }}</p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <ElTag :type="meetingTypeMap[meeting.meetingType]?.type" effect="light" round>
              {{ meetingTypeMap[meeting.meetingType]?.label || meeting.meetingType }}
            </ElTag>
            <ElTag :type="meetingStatusMap[meeting.status]?.type" effect="light" round>
              {{ meetingStatusMap[meeting.status]?.label || meeting.status }}
            </ElTag>
            <ElTag v-if="meeting.isImportant" type="danger" effect="light" round
              >重要</ElTag
            >
            <ElTag v-if="meeting.isRecurring" effect="light" round>週期性會議</ElTag>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton @click="editMeeting">編輯</ElButton>
          <ElButton @click="cloneMeeting">複製為新會議</ElButton>
          <ElButton type="warning" plain @click="archiveCurrent">封存</ElButton>
        </div>
      </header>

      <section class="grid gap-4 md:grid-cols-5">
        <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p class="text-xs text-slate-500">會議日期</p>
          <p class="mt-2 text-base font-semibold text-slate-900">
            {{ formatDate(meeting.meetingDate) }}
          </p>
        </article>
        <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p class="text-xs text-slate-500">主持人</p>
          <p class="mt-2 text-base font-semibold text-slate-900">
            {{ meeting.hostName }}
          </p>
        </article>
        <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p class="text-xs text-slate-500">記錄人</p>
          <p class="mt-2 text-base font-semibold text-slate-900">
            {{ meeting.recorderName }}
          </p>
        </article>
        <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p class="text-xs text-slate-500">參與者</p>
          <p class="mt-2 text-base font-semibold text-slate-900">
            {{ meeting.participantCount }} 人
          </p>
        </article>
        <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p class="text-xs text-slate-500">待辦</p>
          <p class="mt-2 text-base font-semibold text-amber-600">
            {{ meeting.openActionItemCount }} / {{ meeting.actionItemCount }}
          </p>
        </article>
      </section>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">基本資訊</span>
        </template>

        <ElDescriptions :column="2" border class="uniform-descriptions">
          <ElDescriptionsItem label="主題">{{ meeting.title }}</ElDescriptionsItem>
          <ElDescriptionsItem label="編號">{{ meeting.meetingNo }}</ElDescriptionsItem>
          <ElDescriptionsItem label="會議類型">{{
            meetingTypeMap[meeting.meetingType]?.label || meeting.meetingType
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="會議狀態">{{
            meetingStatusMap[meeting.status]?.label || meeting.status
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="會議日期">{{
            formatDate(meeting.meetingDate)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="時間"
            >{{ meeting.startTime }} - {{ meeting.endTime }}</ElDescriptionsItem
          >
          <ElDescriptionsItem label="會議形式">{{
            meetingFormatMap[meeting.format]?.label || meeting.format
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="地點">{{
            meeting.location || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="會議連結">{{
            meeting.meetingLink || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="最後更新"
            >{{ formatDateTime(meeting.updatedAt) }} ・
            {{ meeting.updatedBy }}</ElDescriptionsItem
          >
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">參與者</span>
        </template>

        <ElDescriptions :column="2" border class="uniform-descriptions">
          <ElDescriptionsItem label="主持人">{{ meeting.hostName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="記錄人">{{
            meeting.recorderName
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="內部與會者">{{
            meeting.internalParticipantNames.join("、") || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="外部與會者">{{
            meeting.externalParticipants.join("、") || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="關聯聯絡人">{{
            meeting.contacts.join("、") || "-"
          }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-sm font-semibold text-slate-800">關聯資料</span>
            <div class="flex flex-wrap gap-2">
              <ElButton size="small" @click="openAccount" :disabled="!meeting.customerId"
                >客戶</ElButton
              >
              <ElButton
                size="small"
                @click="openOpportunity"
                :disabled="!meeting.opportunityId"
                >商機</ElButton
              >
              <ElButton size="small" @click="openProject" :disabled="!meeting.projectId"
                >專案</ElButton
              >
              <ElButton size="small" @click="openPartner" :disabled="!meeting.partnerId"
                >夥伴</ElButton
              >
            </div>
          </div>
        </template>

        <ElDescriptions :column="2" border class="uniform-descriptions">
          <ElDescriptionsItem label="客戶">{{
            meeting.customerName || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="商機">{{
            meeting.opportunityName || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="專案">{{
            meeting.projectName || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="活動">{{
            meeting.activityName || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="夥伴">{{
            meeting.partnerName || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="支援案件">{{
            meeting.supportTicketTitle || "-"
          }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">內容與決議</span>
        </template>

        <div class="grid gap-4">
          <div>
            <h3 class="text-sm font-semibold text-slate-700">會議目的</h3>
            <p class="mt-1 text-sm text-slate-600">{{ meeting.objective || "-" }}</p>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-slate-700">議程摘要</h3>
            <p class="mt-1 text-sm text-slate-600">{{ meeting.agendaSummary || "-" }}</p>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-slate-700">會議內容</h3>
            <div
              class="meeting-rich-content mt-1 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-7 text-slate-700"
              v-html="richContentHtml(meeting.richContent)"
            />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-slate-700">風險 / 問題點</h3>
            <p class="mt-1 text-sm text-slate-600">{{ meeting.risks || "-" }}</p>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-slate-700">決議事項</h3>
            <ul class="mt-2 grid gap-2">
              <li
                v-for="item in meeting.decisions"
                :key="item.id"
                class="rounded-lg border border-slate-200 p-3"
              >
                <p class="text-sm font-semibold text-slate-800">
                  {{ item.title || "未命名決議" }}
                </p>
                <p class="mt-1 text-sm text-slate-600">{{ item.description || "-" }}</p>
              </li>
              <li v-if="meeting.decisions.length === 0" class="text-sm text-slate-400">
                尚無決議事項
              </li>
            </ul>
          </div>
        </div>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">待辦事項</span>
        </template>

        <ElTable :data="meeting.actionItems" size="small">
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
          <ElDescriptionsItem label="標籤">{{
            meeting.tags.join("、") || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="附件">{{
            meeting.attachments.join("、") || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="備註">{{ meeting.notes || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="建立資訊"
            >{{ formatDateTime(meeting.createdAt) }} ・
            {{ meeting.createdBy }}</ElDescriptionsItem
          >
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">歷程</span>
        </template>

        <ElTimeline>
          <ElTimelineItem
            v-for="event in meeting.activities"
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

    <ElEmpty v-else description="找不到會議紀錄" :image-size="120">
      <ElButton type="primary" @click="goBack">返回會議紀錄列表</ElButton>
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

:deep(.meeting-rich-content h2),
:deep(.meeting-rich-content h3) {
  margin: 10px 0 8px;
  color: #1e293b;
  font-weight: 600;
}

:deep(.meeting-rich-content h2) {
  font-size: 20px;
}

:deep(.meeting-rich-content h3) {
  font-size: 16px;
}

:deep(.meeting-rich-content ul),
:deep(.meeting-rich-content ol) {
  margin: 8px 0;
  padding-left: 22px;
}

:deep(.meeting-rich-content ul) {
  list-style: disc;
}

:deep(.meeting-rich-content ol) {
  list-style: decimal;
}

:deep(.meeting-rich-content blockquote) {
  margin: 10px 0;
  padding: 8px 12px;
  border-left: 3px solid #94a3b8;
  color: #475569;
  background: #f8fafc;
}

:deep(.meeting-rich-content table) {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0;
}

:deep(.meeting-rich-content td),
:deep(.meeting-rich-content th) {
  border: 1px solid #d1d5db;
  padding: 6px 8px;
  vertical-align: top;
}
</style>
