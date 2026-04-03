<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ElButton,
  ElCard,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElEmpty,
  ElNotification,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTabs,
  ElTabPane,
  ElTimeline,
  ElTimelineItem,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElSelect,
} from "element-plus";
import { ArrowLeft, MoreFilled } from "@element-plus/icons-vue";
import OpportunityFormDrawer from "../../components/opportunities/OpportunityFormDrawer.vue";
import { useActivitiesStore } from "../../composables/useActivitiesStore";
import { useAppShell } from "../../composables/useAppShell";
import { useAccountsStore } from "../../composables/useAccountsStore";
import { useOpportunitiesStore } from "../../composables/useOpportunitiesStore";
import { opportunityStageMap } from "../../constants/accountMaps";
import { opportunityStageOptions } from "../../data/opportunities";

const route = useRoute();
const router = useRouter();
const { getAccountById } = useAccountsStore();
const { activities } = useActivitiesStore();
const { updateVisitedTag } = useAppShell();
const { getOpportunityById, updateOpportunity, updateOpportunityStage } =
  useOpportunitiesStore();

const activeTab = ref("overview");
const formDrawerOpen = ref(false);
const stageDialogOpen = ref(false);

const stageForm = reactive({
  nextStage: "proposal",
  lostReason: "",
  note: "",
});

const opportunityTypeMap = {
  agency: { label: "代理合作", type: "warning" },
  license: { label: "授權合作", type: "primary" },
  co_branding: { label: "聯名合作", type: "success" },
  channel: { label: "通路合作", type: "info" },
};

const opportunity = computed(() => getOpportunityById(String(route.params.opportunityId)));
const relatedAccount = computed(() =>
  opportunity.value ? getAccountById(opportunity.value.accountId) : null
);
const relatedActivities = computed(() =>
  opportunity.value
    ? activities.value
        .filter((item) => item.accountId === opportunity.value.accountId)
        .sort(
          (left, right) =>
            new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
        )
    : []
);

const detailTabTitle = computed(() =>
  opportunity.value ? `商機列表 / ${opportunity.value.name}` : "商機列表 / 詳情"
);

watch(
  detailTabTitle,
  (title) => {
    route.meta.title = title;
    updateVisitedTag(route.fullPath, { title });
  },
  { immediate: true }
);

const statusMeta = computed(() => {
  if (opportunity.value?.status === "won") {
    return { label: "已成交", type: "success" };
  }

  if (opportunity.value?.status === "lost") {
    return { label: "已失敗", type: "danger" };
  }

  return { label: "進行中", type: "warning" };
});

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

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function notifyPlaceholder(message = "此功能將於下一階段開放。") {
  ElNotification({
    title: "即將開放",
    message,
    type: "info",
    position: "top-right",
  });
}

function openEditDrawer() {
  formDrawerOpen.value = true;
}

function openStageDialog() {
  if (!opportunity.value) {
    return;
  }

  stageForm.nextStage = opportunity.value.stage;
  stageForm.lostReason = opportunity.value.lostReason ?? "";
  stageForm.note = "";
  stageDialogOpen.value = true;
}

function handleSubmitOpportunity(payload) {
  if (!opportunity.value) {
    return;
  }

  const updatedOpportunity = updateOpportunity(opportunity.value.id, payload);

  if (!updatedOpportunity) {
    return;
  }

  ElNotification({
    title: "已更新",
    message: `${updatedOpportunity.name} 已更新完成。`,
    type: "success",
    position: "top-right",
  });

  formDrawerOpen.value = false;
  route.meta.title = `商機列表 / ${updatedOpportunity.name}`;
  updateVisitedTag(route.fullPath, { title: route.meta.title });
}

function submitStageUpdate() {
  if (!opportunity.value) {
    return;
  }

  if (stageForm.nextStage === "lost" && !stageForm.lostReason.trim()) {
    ElNotification({
      title: "缺少資訊",
      message: "標記失敗時需填寫失敗原因。",
      type: "warning",
      position: "top-right",
    });
    return;
  }

  const updatedOpportunity = updateOpportunityStage(
    opportunity.value.id,
    stageForm.nextStage,
    stageForm.lostReason,
    stageForm.note
  );

  if (!updatedOpportunity) {
    return;
  }

  ElNotification({
    title: "已更新",
    message: `${updatedOpportunity.name} 已調整為 ${
      opportunityStageMap[updatedOpportunity.stage]?.label ?? updatedOpportunity.stage
    }。`,
    type: "success",
    position: "top-right",
  });

  stageDialogOpen.value = false;
}
</script>

<template>
  <div class="grid gap-6 p-8">
    <ElEmpty
      v-if="!opportunity"
      description="找不到對應的商機資料"
      class="rounded-[28px] border border-slate-200 bg-white py-20"
    >
      <ElButton type="primary" @click="router.push({ name: 'opportunities-list' })">
        返回商機列表
      </ElButton>
    </ElEmpty>

    <template v-else>
      <section class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="grid gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <ElButton :icon="ArrowLeft" @click="router.push({ name: 'opportunities-list' })">
                返回列表
              </ElButton>
              <ElButton
                type="primary"
                @click="
                  router.push({
                    name: 'account-detail',
                    params: { accountId: opportunity.accountId },
                  })
                "
              >
                前往客戶
              </ElButton>
            </div>

            <div class="grid gap-2">
              <h1 class="text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-900">
                {{ opportunity.name }}
              </h1>
              <p class="text-sm text-slate-500">{{ opportunity.opportunityCode }}</p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <ElTag
                round
                effect="light"
                :type="opportunityStageMap[opportunity.stage]?.type ?? 'info'"
              >
                {{ opportunityStageMap[opportunity.stage]?.label ?? opportunity.stage }}
              </ElTag>
              <ElTag round effect="light" :type="statusMeta.type">
                {{ statusMeta.label }}
              </ElTag>
            </div>

            <div class="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
              <p>所屬客戶：{{ opportunity.accountName }}</p>
              <p>負責人：{{ opportunity.ownerName }}</p>
              <p>商機類型：{{ opportunityTypeMap[opportunity.opportunityType]?.label }}</p>
              <p>地區：{{ opportunity.region }}</p>
              <p>機率：{{ opportunity.probability }}%</p>
              <p>預估金額：{{ formatCurrency(opportunity.expectedRevenue) }}</p>
              <p>預計成交日：{{ formatDate(opportunity.expectedCloseDate) }}</p>
              <p>最近更新：{{ formatDate(opportunity.updatedAt) }}</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <ElButton type="primary" @click="openEditDrawer">編輯商機</ElButton>
            <ElButton @click="openStageDialog">調整階段</ElButton>
            <ElDropdown trigger="click">
              <ElButton :icon="MoreFilled">更多操作</ElButton>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem @click="notifyPlaceholder('建立報價功能將於下一階段開放。')">
                    建立報價
                  </ElDropdownItem>
                  <ElDropdownItem @click="notifyPlaceholder('匯出商機資料功能將於下一階段開放。')">
                    匯出資料
                  </ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
          </div>
        </div>
      </section>

      <ElTabs v-model="activeTab">
        <ElTabPane label="概覽" name="overview">
          <div class="grid gap-4 xl:grid-cols-2">
            <ElCard shadow="never" class="rounded-[28px] !border-slate-200">
              <template #header>
                <span class="text-base font-semibold text-slate-900">基本資料卡</span>
              </template>

              <div class="grid gap-3 text-sm text-slate-600">
                <p>商機名稱：{{ opportunity.name }}</p>
                <p>商機代碼：{{ opportunity.opportunityCode }}</p>
                <p>商機類型：{{ opportunityTypeMap[opportunity.opportunityType]?.label }}</p>
                <p>負責人：{{ opportunity.ownerName }}</p>
                <p>地區：{{ opportunity.region }}</p>
                <p>來源：{{ opportunity.source || "-" }}</p>
                <p>主要聯絡人：{{ opportunity.primaryContactId || "-" }}</p>
              </div>
            </ElCard>

            <ElCard shadow="never" class="rounded-[28px] !border-slate-200">
              <template #header>
                <span class="text-base font-semibold text-slate-900">Pipeline 摘要卡</span>
              </template>

              <div class="grid gap-3 text-sm text-slate-600">
                <p>目前階段：{{ opportunityStageMap[opportunity.stage]?.label ?? opportunity.stage }}</p>
                <p>目前狀態：{{ statusMeta.label }}</p>
                <p>機率：{{ opportunity.probability }}%</p>
                <p>預估金額：{{ formatCurrency(opportunity.expectedRevenue) }}</p>
                <p>預計成交日：{{ formatDate(opportunity.expectedCloseDate) }}</p>
                <p>最近更新：{{ formatDate(opportunity.updatedAt, true) }}</p>
                <p v-if="opportunity.status === 'lost'">
                  失敗原因：{{ opportunity.lostReason || "-" }}
                </p>
              </div>
            </ElCard>

            <ElCard shadow="never" class="rounded-[28px] !border-slate-200">
              <template #header>
                <div class="flex items-center justify-between">
                  <span class="text-base font-semibold text-slate-900">所屬客戶卡</span>
                  <ElButton
                    text
                    type="primary"
                    @click="
                      router.push({
                        name: 'account-detail',
                        params: { accountId: opportunity.accountId },
                      })
                    "
                  >
                    查看客戶
                  </ElButton>
                </div>
              </template>

              <div class="grid gap-3 text-sm text-slate-600">
                <p>客戶名稱：{{ opportunity.accountName }}</p>
                <p>客戶代碼：{{ relatedAccount?.accountCode ?? "-" }}</p>
                <p>客戶地區：{{ relatedAccount?.region ?? opportunity.region }}</p>
                <p>客戶負責人：{{ relatedAccount?.ownerName ?? "-" }}</p>
              </div>
            </ElCard>

            <ElCard shadow="never" class="rounded-[28px] !border-slate-200">
              <template #header>
                <span class="text-base font-semibold text-slate-900">說明卡</span>
              </template>

              <div class="grid gap-3 text-sm text-slate-600">
                <p class="leading-7">
                  {{ opportunity.description || "目前尚未補充商機背景與合作方向。" }}
                </p>
                <div
                  v-if="opportunity.status === 'lost' && opportunity.lostReason"
                  class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700"
                >
                  <p class="font-medium">失敗原因</p>
                  <p class="mt-1 leading-7">{{ opportunity.lostReason }}</p>
                </div>
              </div>
            </ElCard>
          </div>
        </ElTabPane>

        <ElTabPane label="階段歷史" name="stage-history">
          <ElCard shadow="never" class="rounded-[28px] !border-slate-200">
            <ElEmpty
              v-if="(opportunity.stageHistory ?? []).length === 0"
              description="目前尚無階段歷史"
            />

            <ElTimeline v-else>
              <ElTimelineItem
                v-for="item in opportunity.stageHistory"
                :key="item.id"
                :timestamp="formatDate(item.timestamp, true)"
                placement="top"
              >
                <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div class="flex flex-wrap items-center gap-2">
                    <h4 class="font-medium text-slate-900">{{ item.title }}</h4>
                    <ElTag
                      round
                      effect="light"
                      :type="opportunityStageMap[item.stage]?.type ?? 'info'"
                    >
                      {{ opportunityStageMap[item.stage]?.label ?? item.stage }}
                    </ElTag>
                  </div>
                  <p class="mt-2 text-sm text-slate-600">{{ item.description }}</p>
                  <p class="mt-2 text-xs text-slate-500">更新者：{{ item.changedByName }}</p>
                  <p v-if="item.note" class="mt-1 text-xs text-slate-500">備註：{{ item.note }}</p>
                  <p v-if="item.lostReason" class="mt-1 text-xs text-rose-600">
                    失敗原因：{{ item.lostReason }}
                  </p>
                </div>
              </ElTimelineItem>
            </ElTimeline>
          </ElCard>
        </ElTabPane>

        <ElTabPane label="互動紀錄" name="activities">
          <ElCard shadow="never" class="rounded-[28px] !border-slate-200">
            <div class="mb-4 flex items-center justify-between gap-3">
              <p class="text-sm text-slate-500">
                第一版先顯示同客戶底下的互動紀錄作為參考，後續再補商機專屬關聯。
              </p>
              <ElButton @click="notifyPlaceholder('商機互動建立功能將於下一階段開放。')">
                新增互動
              </ElButton>
            </div>

            <ElEmpty
              v-if="relatedActivities.length === 0"
              description="目前尚無互動紀錄"
            >
              <p class="mb-3 text-sm text-slate-500">
                後續可建立與此商機相關的會議、通話與跟進紀錄。
              </p>
              <ElButton
                type="primary"
                @click="notifyPlaceholder('商機互動建立功能將於下一階段開放。')"
              >
                新增互動
              </ElButton>
            </ElEmpty>

            <ElTable v-else :data="relatedActivities" size="large">
              <ElTableColumn label="互動時間" min-width="160">
                <template #default="{ row }">
                  {{ formatDate(row.occurredAt, true) }}
                </template>
              </ElTableColumn>
              <ElTableColumn label="類型" min-width="120" prop="type" />
              <ElTableColumn label="主題" min-width="260" prop="title" />
              <ElTableColumn label="負責人" min-width="120" prop="ownerName" />
              <ElTableColumn label="摘要" min-width="280">
                <template #default="{ row }">
                  {{ row.summary || "-" }}
                </template>
              </ElTableColumn>
            </ElTable>
          </ElCard>
        </ElTabPane>

        <ElTabPane label="報價" name="quotes">
          <ElCard shadow="never" class="rounded-[28px] !border-slate-200">
            <ElEmpty description="報價模組即將開放">
              <p class="mb-3 text-sm text-slate-500">
                後續將在此管理與此商機相關的報價單、版本與狀態。
              </p>
              <ElButton
                type="primary"
                @click="notifyPlaceholder('報價模組將於下一階段開放。')"
              >
                Coming Soon
              </ElButton>
            </ElEmpty>
          </ElCard>
        </ElTabPane>
      </ElTabs>

      <OpportunityFormDrawer
        v-model="formDrawerOpen"
        mode="edit"
        :opportunity="opportunity"
        @submit="handleSubmitOpportunity"
      />

      <ElDialog v-model="stageDialogOpen" title="調整商機階段" width="560px">
        <ElForm label-position="top" class="grid gap-4">
          <ElFormItem label="商機名稱">
            <div
              class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              {{ opportunity.name }}
            </div>
          </ElFormItem>

          <ElFormItem label="目前階段">
            <div
              class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              {{ opportunityStageMap[opportunity.stage]?.label ?? opportunity.stage }}
            </div>
          </ElFormItem>

          <ElFormItem label="新階段">
            <ElSelect v-model="stageForm.nextStage" class="!w-full">
              <ElOption
                v-for="item in opportunityStageOptions.filter((item) => item.value !== 'all')"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>

          <ElFormItem v-if="stageForm.nextStage === 'lost'" label="失敗原因" required>
            <ElInput
              v-model="stageForm.lostReason"
              type="textarea"
              :rows="3"
              placeholder="請輸入失敗原因"
            />
          </ElFormItem>

          <ElFormItem label="備註">
            <ElInput
              v-model="stageForm.note"
              type="textarea"
              :rows="3"
              placeholder="可選填本次調整備註"
            />
          </ElFormItem>
        </ElForm>

        <template #footer>
          <div class="flex items-center justify-end gap-3">
            <ElButton @click="stageDialogOpen = false">取消</ElButton>
            <ElButton type="primary" @click="submitStageUpdate">確認</ElButton>
          </div>
        </template>
      </ElDialog>
    </template>
  </div>
</template>
