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
} from "element-plus";
import { ArrowLeft } from "@element-plus/icons-vue";
import {
  documentCategoryMap,
  documentTypeMap,
  visibilityScopeMap,
} from "../../data/documents";
import { useDocumentsStore } from "../../composables/useDocumentsStore";

const route = useRoute();
const router = useRouter();
const { getDocumentById } = useDocumentsStore();

const documentId = computed(() => String(route.params.documentId ?? ""));
const documentDetail = computed(() => getDocumentById(documentId.value));

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

function notify(message, title = "提醒", type = "warning") {
  ElNotification({
    title,
    message,
    type,
    position: "top-right",
  });
}

function goBack() {
  router.push({ name: "projects-documents" });
}

function editDocument() {
  if (!documentDetail.value) {
    return;
  }

  router.push({
    name: "projects-documents",
    query: { edit: documentDetail.value.id },
  });
}

function openNewVersion() {
  if (!documentDetail.value) {
    return;
  }

  router.push({
    name: "projects-documents",
    query: { version: documentDetail.value.id },
  });
}

function downloadDocument() {
  if (!documentDetail.value?.downloadUrl) {
    notify("目前無可下載檔案");
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = documentDetail.value.downloadUrl;
  anchor.download = documentDetail.value.fileFullName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

const canPreview = computed(() => {
  const extension = String(documentDetail.value?.extensionLabel || "")
    .toLowerCase()
    .replace(".", "");

  return ["pdf", "txt", "png", "jpg", "jpeg", "gif", "webp"].includes(extension);
});

function previewInNewTab() {
  if (!documentDetail.value?.downloadUrl) {
    notify("目前無可預覽檔案");
    return;
  }

  const previewableExtensions = ["pdf", "txt", "png", "jpg", "jpeg", "gif", "webp"];
  const extension = String(documentDetail.value.extensionLabel || "")
    .toLowerCase()
    .replace(".", "");

  if (!previewableExtensions.includes(extension)) {
    notify("此格式可能無法預覽，瀏覽器可能會直接下載", "提醒", "info");
  }

  window.open(documentDetail.value.downloadUrl, "_blank", "noopener,noreferrer");
}

function goProject() {
  if (!documentDetail.value?.projectId) {
    return;
  }

  router.push({
    name: "project-detail",
    params: { projectId: documentDetail.value.projectId },
  });
}

function goMilestone() {
  if (!documentDetail.value?.milestoneId) {
    return;
  }

  router.push({
    name: "projects-milestones",
    query: { milestoneId: documentDetail.value.milestoneId },
  });
}

function goTask() {
  if (!documentDetail.value?.taskId) {
    return;
  }

  router.push({
    name: "projects-tasks",
    query: documentDetail.value.milestoneId
      ? { milestoneId: documentDetail.value.milestoneId }
      : documentDetail.value.activityId
      ? { activityId: documentDetail.value.activityId }
      : documentDetail.value.projectId
      ? { projectId: documentDetail.value.projectId }
      : {},
  });
}
</script>

<template>
  <div class="min-h-full p-8">
    <section v-if="documentDetail" class="grid gap-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-3">
          <ElButton text :icon="ArrowLeft" class="!justify-start !px-0" @click="goBack">
            返回文件中心
          </ElButton>

          <div class="grid gap-1">
            <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">
              {{ documentDetail.fileName }}
            </h1>
            <p class="text-xs text-slate-500">
              {{ documentDetail.fileNo }} ・ {{ documentDetail.extensionLabel }} ・
              {{ documentDetail.version }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <ElTag round :type="documentCategoryMap[documentDetail.fileCategory]?.type">
              {{
                documentCategoryMap[documentDetail.fileCategory]?.label ||
                documentDetail.fileCategory
              }}
            </ElTag>
            <ElTag v-if="documentDetail.isLatest" round type="success">最新版本</ElTag>
            <ElTag v-if="documentDetail.isTemplate" round type="warning">範本</ElTag>
            <ElTag v-if="documentDetail.isArchived" round type="info">已封存</ElTag>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton @click="downloadDocument">下載</ElButton>
          <ElButton @click="editDocument">編輯</ElButton>
          <ElButton @click="openNewVersion">上傳新版本</ElButton>
        </div>
      </header>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">基本資訊</span>
        </template>
        <ElDescriptions :column="2" border class="uniform-descriptions">
          <ElDescriptionsItem label="文件名稱">{{
            documentDetail.fileName
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="文件編號">{{
            documentDetail.fileNo
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="分類">{{
            documentCategoryMap[documentDetail.fileCategory]?.label ||
            documentDetail.fileCategory
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="文件類型">{{
            documentTypeMap[documentDetail.fileType]?.label || documentDetail.fileType
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="檔案格式">{{
            documentDetail.extensionLabel
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="檔案大小">{{
            documentDetail.sizeLabel
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="標籤">{{
            documentDetail.tags.join("、") || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="摘要">{{
            documentDetail.description || "-"
          }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-sm font-semibold text-slate-800">關聯資料</span>
            <div class="flex gap-2">
              <ElButton
                size="small"
                @click="goProject"
                :disabled="!documentDetail.projectId"
                >專案</ElButton
              >
              <ElButton size="small" @click="goTask" :disabled="!documentDetail.taskId"
                >任務</ElButton
              >
              <ElButton
                size="small"
                @click="goMilestone"
                :disabled="!documentDetail.milestoneId"
                >里程碑</ElButton
              >
            </div>
          </div>
        </template>
        <ElDescriptions :column="2" border class="uniform-descriptions">
          <ElDescriptionsItem label="專案">{{
            documentDetail.projectName || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="活動">{{
            documentDetail.activityName || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="任務">{{
            documentDetail.taskName || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="里程碑">{{
            documentDetail.milestoneName || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="客戶">{{
            documentDetail.customerName || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="夥伴">{{
            documentDetail.partnerName || "-"
          }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">版本資訊</span>
        </template>
        <ElTable :data="documentDetail.versionHistory" size="small">
          <ElTableColumn label="版本" min-width="110">
            <template #default="{ row }">
              <span>{{ row.version }}{{ row.isLatest ? "（最新）" : "" }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="上傳人" prop="uploadedBy" min-width="120" />
          <ElTableColumn label="上傳時間" min-width="160">
            <template #default="{ row }">{{ formatDateTime(row.uploadedAt) }}</template>
          </ElTableColumn>
          <ElTableColumn label="版本說明" prop="note" min-width="180" />
        </ElTable>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">管理資訊與預覽</span>
        </template>
        <ElDescriptions :column="2" border class="uniform-descriptions">
          <ElDescriptionsItem label="上傳人">{{
            documentDetail.uploaderName
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="上傳時間">{{
            formatDateTime(documentDetail.uploadedAt)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="最後更新人">{{
            documentDetail.updatedBy
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="最後更新時間">{{
            formatDateTime(documentDetail.updatedAt)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="可見範圍">{{
            visibilityScopeMap[documentDetail.visibilityScope]?.label ||
            documentDetail.visibilityScope
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="備註">{{
            documentDetail.notes || "-"
          }}</ElDescriptionsItem>
        </ElDescriptions>

        <div
          class="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4"
        >
          <template v-if="canPreview">
            <p class="text-sm text-slate-600">
              預覽使用瀏覽器內建能力，點擊「新分頁預覽」開啟檔案。
            </p>
            <ElButton @click="previewInNewTab" class="!my-2"> 新分頁預覽 </ElButton>
            <p class="mt-1 text-xs text-slate-400">
              可直接預覽格式：PDF / TXT / 圖片；其他格式依瀏覽器行為可能直接下載。
            </p>
          </template>

          <template v-else>
            <p class="text-sm text-slate-600">
              此檔案格式目前不支援瀏覽器直接預覽，請直接下載檔案查看。
            </p>
          </template>
        </div>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">歷程</span>
        </template>
        <ElTable :data="documentDetail.activities" size="small">
          <ElTableColumn label="時間" min-width="160">
            <template #default="{ row }">{{ formatDateTime(row.occurredAt) }}</template>
          </ElTableColumn>
          <ElTableColumn label="動作" prop="title" min-width="140" />
          <ElTableColumn label="說明" prop="description" min-width="200" />
          <ElTableColumn label="操作者" prop="actorName" min-width="120" />
        </ElTable>
      </ElCard>
    </section>

    <section v-else class="grid min-h-[60vh] place-items-center">
      <ElEmpty description="找不到文件資料，可能已被移除" class="py-20">
        <ElButton type="primary" @click="goBack">返回文件中心</ElButton>
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
