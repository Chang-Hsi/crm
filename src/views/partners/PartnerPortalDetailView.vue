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
  dataScopeOptions,
  fileScopeOptions,
  homepageSectionOptions,
  inviteStatusMap,
  moduleOptions,
  portalStatusMap,
  portalTypeMap,
  resourceCategoryOptions,
} from "../../data/partnerPortals";
import { usePartnerPortalStore } from "../../composables/usePartnerPortalStore";

const route = useRoute();
const router = useRouter();
const {
  activatePortal,
  getPortalById,
  resendInvite,
  resetPortal,
  suspendPortal,
} = usePartnerPortalStore();

const portalId = computed(() => String(route.params.portalId ?? ""));
const portal = computed(() => getPortalById(portalId.value));

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

function resolveLabel(options, value) {
  return options.find((item) => item.value === value)?.label || value;
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
  router.push({ name: "partners-portal" });
}

function goPartner() {
  if (!portal.value) {
    return;
  }

  router.push({
    name: "partners-list",
    query: { partnerId: portal.value.partnerId },
  });
}

function editPortal() {
  if (!portal.value) {
    return;
  }

  router.push({
    name: "partners-portal",
    query: { edit: portal.value.id },
  });
}

function activateCurrentPortal() {
  if (!portal.value) {
    return;
  }

  const updated = activatePortal(portal.value.id);

  if (updated) {
    notify(`${updated.portalName} 已啟用`);
  }
}

async function suspendCurrentPortal() {
  if (!portal.value) {
    return;
  }

  let reason = "";

  try {
    const result = await ElMessageBox.prompt("請輸入停用原因", "停用夥伴入口", {
      confirmButtonText: "停用",
      cancelButtonText: "取消",
      inputPlaceholder: "例如：合作暫停、帳號盤點",
    });

    reason = result.value.trim();
  } catch {
    return;
  }

  const updated = suspendPortal(portal.value.id, reason);

  if (updated) {
    notify(`${updated.portalName} 已停用`);
  }
}

function resendCurrentInvite() {
  if (!portal.value) {
    return;
  }

  const updated = resendInvite(portal.value.id);

  if (updated) {
    notify(`${updated.portalName} 已重寄邀請`);
  }
}

function resetCurrentPortal() {
  if (!portal.value) {
    return;
  }

  const updated = resetPortal(portal.value.id);

  if (updated) {
    notify(`${updated.portalName} 已重設入口`, "已重設", "warning");
  }
}
</script>

<template>
  <div class="min-h-full p-8">
    <section v-if="portal" class="grid gap-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-3">
          <ElButton text :icon="ArrowLeft" class="!justify-start !px-0" @click="goBack">
            返回夥伴入口列表
          </ElButton>

          <div class="grid gap-1">
            <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">
              {{ portal.portalName }}
            </h1>
            <p class="text-xs text-slate-500">
              {{ portal.portalNo }} ・ {{ portal.partnerName }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <ElTag round :type="portalStatusMap[portal.status]?.type">
              {{ portalStatusMap[portal.status]?.label }}
            </ElTag>
            <ElTag
              round
              :type="inviteStatusMap[portal.inviteStatus]?.type"
              effect="light"
            >
              {{ inviteStatusMap[portal.inviteStatus]?.label }}
            </ElTag>
            <ElTag round effect="plain"
              >最近登入：{{ formatDateTime(portal.lastLoginAt) }}</ElTag
            >
          </div>
        </div>

        <div class="flex flex-wrap items-center">
          <ElButton @click="editPortal">編輯</ElButton>
          <ElButton type="success" @click="activateCurrentPortal">啟用</ElButton>
          <ElButton type="warning" plain @click="suspendCurrentPortal">停用</ElButton>
          <ElButton @click="resendCurrentInvite">重寄邀請</ElButton>
          <ElButton type="danger" plain @click="resetCurrentPortal">重設入口</ElButton>
        </div>
      </header>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">基本資料</span>
        </template>

        <ElDescriptions :column="2" border class="uniform-descriptions">
          <ElDescriptionsItem label="入口名稱">{{
            portal.portalName
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="關聯夥伴">
            <button
              type="button"
              class="text-left text-sm font-medium text-[#409eff] hover:text-[#337ecc]"
              @click="goPartner"
            >
              {{ portal.partnerName }}
            </button>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="入口編號">{{ portal.portalNo }}</ElDescriptionsItem>
          <ElDescriptionsItem label="入口類型">
            {{ portalTypeMap[portal.portalType]?.label || portal.portalType }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="建立時間">{{
            formatDateTime(portal.createdAt)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="建立人">{{
            portal.createdBy || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="最後更新">{{
            formatDateTime(portal.updatedAt)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="最後更新人">{{
            portal.updatedBy || "-"
          }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">聯絡與帳號</span>
        </template>

        <ElDescriptions :column="2" border class="uniform-descriptions">
          <ElDescriptionsItem label="主要聯絡人">{{
            portal.contactName || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="職稱">{{
            portal.contactTitle || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="Email">{{ portal.email || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="登入帳號">{{
            portal.loginAccount || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="手機 / 電話">{{
            portal.phone || "-"
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="可登入人數">{{
            portal.maxUserCount
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="邀請寄送時間">{{
            formatDateTime(portal.invitedAt)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="啟用完成時間">{{
            formatDateTime(portal.activatedAt)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="最近登入時間">{{
            formatDateTime(portal.lastLoginAt)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="最後操作時間">{{
            formatDateTime(portal.lastActionAt)
          }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">權限設定</span>
        </template>

        <div class="grid gap-4">
          <div class="flex flex-wrap gap-2">
            <ElTag
              v-for="module in portal.visibleModules"
              :key="module"
              round
              effect="plain"
            >
              {{ resolveLabel(moduleOptions, module) }}
            </ElTag>
            <ElTag
              v-if="portal.visibleModules.length === 0"
              round
              effect="plain"
              type="info"
            >
              尚未設定可見模組
            </ElTag>
          </div>

          <ElDescriptions :column="2" border class="uniform-descriptions">
            <ElDescriptionsItem label="可查看績效">{{
              portal.canViewPerformance ? "是" : "否"
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="可查看分潤">{{
              portal.canViewSettlement ? "是" : "否"
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="可查看合作條件">{{
              portal.canViewConditions ? "是" : "否"
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="可查看案件 / 商機">{{
              portal.canViewOpportunities ? "是" : "否"
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="可下載文件">{{
              portal.canDownloadFiles ? "是" : "否"
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="可上傳附件">{{
              portal.canUploadFiles ? "是" : "否"
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="可提交請款">{{
              portal.canSubmitClaims ? "是" : "否"
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="可查看公告 / 通知">{{
              portal.canViewNotifications ? "是" : "否"
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="可下載內容" :span="2">
              {{
                portal.downloadScopes
                  .map((item) => resolveLabel(resourceCategoryOptions, item))
                  .join("、") || "-"
              }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="可提交內容" :span="2">
              {{
                portal.submissionScopes.length > 0
                  ? portal.submissionScopes.join("、")
                  : "-"
              }}
            </ElDescriptionsItem>
          </ElDescriptions>
        </div>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">顯示內容</span>
        </template>

        <ElDescriptions
          :column="4"
          border
          class="uniform-descriptions uniform-descriptions-4"
        >
          <ElDescriptionsItem label="首頁摘要內容" :span="4">
            {{
              portal.homepageSections
                .map((item) => resolveLabel(homepageSectionOptions, item))
                .join("、") || "-"
            }}
          </ElDescriptionsItem>

          <ElDescriptionsItem label="可見文件類型" :span="4">
            {{
              portal.resourceCategories
                .map((item) => resolveLabel(resourceCategoryOptions, item))
                .join("、") || "-"
            }}
          </ElDescriptionsItem>

          <ElDescriptionsItem label="文件範圍" :span="4">
            {{
              portal.fileScopes
                .map((item) => resolveLabel(fileScopeOptions, item))
                .join("、") || "-"
            }}
          </ElDescriptionsItem>

          <ElDescriptionsItem label="資料範圍" :span="4">
            {{
              portal.dataScopes
                .map((item) => resolveLabel(dataScopeOptions, item))
                .join("、") || "-"
            }}
          </ElDescriptionsItem>

          <ElDescriptionsItem label="有效期間" :span="2">
            {{ formatDate(portal.startDate) }} 至
            {{ portal.endDate ? formatDate(portal.endDate) : "長期" }}
          </ElDescriptionsItem>

          <ElDescriptionsItem label="停用原因" :span="2">
            {{ portal.disableReason || "-" }}
          </ElDescriptionsItem>

          <ElDescriptionsItem label="備註" :span="4">
            {{ portal.notes || "-" }}
          </ElDescriptionsItem>

          <ElDescriptionsItem label="內部說明" :span="4">
            {{ portal.internalNotes || "-" }}
          </ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span class="text-sm font-semibold text-slate-800">歷程</span>
        </template>

        <ElTimeline>
          <ElTimelineItem
            v-for="item in portal.activities"
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
      <ElEmpty description="找不到夥伴入口資料">
        <p class="mb-4 text-sm text-slate-500">此入口不存在或已移除。</p>
        <ElButton type="primary" @click="goBack">返回夥伴入口列表</ElButton>
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
