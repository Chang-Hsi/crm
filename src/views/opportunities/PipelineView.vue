<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  ElButton,
  ElDatePicker,
  ElDialog,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElNotification,
  ElOption,
  ElSelect,
  ElTag,
} from "element-plus";
import {
  ArrowLeft,
  CirclePlus,
  Filter,
  MoreFilled,
  Refresh,
  Search,
} from "@element-plus/icons-vue";
import OpportunityFormDrawer from "../../components/opportunities/OpportunityFormDrawer.vue";
import { useAccountsStore } from "../../composables/useAccountsStore";
import { useOpportunitiesStore } from "../../composables/useOpportunitiesStore";
import { useUsersStore } from "../../composables/useUsersStore";
import {
  opportunityStageMap,
  opportunityStageOptions,
} from "../../constants/accountMaps";
import { opportunityTypeOptions, regionOptions } from "../../data/opportunities";

const router = useRouter();
const { accounts } = useAccountsStore();
const {
  createOpportunity,
  opportunities,
  updateOpportunity,
  updateOpportunityStage,
} = useOpportunitiesStore();
const { getAssignableOwners } = useUsersStore();

const pageTitle = "Pipeline";
const pipelineStages = [
  "potential",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

const filters = reactive({
  keyword: "",
  ownerUserId: "all",
  opportunityType: "all",
  accountId: "all",
  region: "all",
  expectedCloseDateRange: [],
});

const formDrawerOpen = ref(false);
const formMode = ref("create");
const editingOpportunity = ref(null);
const stageDialogOpen = ref(false);
const stageTargetId = ref(null);
const filterPanelOpen = ref(false);

const stageForm = reactive({
  nextStage: "proposal",
  lostReason: "",
  note: "",
});

const ownerOptions = computed(() => [
  { label: "全部負責業務", value: "all" },
  ...getAssignableOwners("opportunity").map((user) => ({
    label: user.name,
    value: user.id,
  })),
]);

const accountOptions = computed(() => [
  { label: "全部客戶", value: "all" },
  ...accounts.value.map((account) => ({
    label: account.companyName,
    value: account.id,
  })),
]);

const opportunityTypeMap = {
  agency: { label: "代理合作", type: "warning" },
  license: { label: "授權合作", type: "primary" },
  co_branding: { label: "聯名合作", type: "success" },
  channel: { label: "通路合作", type: "info" },
};

const filteredOpportunities = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();
  const [startDate, endDate] = filters.expectedCloseDateRange ?? [];
  const startTime = startDate ? new Date(startDate).getTime() : null;
  const endTime = endDate ? new Date(endDate).getTime() : null;

  return opportunities.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.name.toLowerCase().includes(keyword) ||
      item.opportunityCode.toLowerCase().includes(keyword) ||
      item.accountName.toLowerCase().includes(keyword);

    const matchesOwner =
      filters.ownerUserId === "all" || item.ownerUserId === filters.ownerUserId;
    const matchesType =
      filters.opportunityType === "all" ||
      item.opportunityType === filters.opportunityType;
    const matchesAccount =
      filters.accountId === "all" || item.accountId === filters.accountId;
    const matchesRegion = filters.region === "all" || item.region === filters.region;

    const closeTime = new Date(item.expectedCloseDate).getTime();
    const matchesDate =
      !startTime || !endTime || (closeTime >= startTime && closeTime <= endTime);

    return (
      matchesKeyword &&
      matchesOwner &&
      matchesType &&
      matchesAccount &&
      matchesRegion &&
      matchesDate
    );
  });
});

const summaryCards = computed(() => {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  const monthEnd = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
    23,
    59,
    59
  ).getTime();

  const activeRecords = filteredOpportunities.value.filter(
    (item) => !["won", "lost"].includes(item.stage)
  );
  const monthlyRecords = activeRecords.filter((item) => {
    const closeTime = new Date(item.expectedCloseDate).getTime();
    return closeTime >= monthStart && closeTime <= monthEnd;
  });

  return [
    { label: "全部商機數", value: filteredOpportunities.value.length },
    { label: "進行中商機數", value: activeRecords.length },
    {
      label: "總 Pipeline 金額",
      value: activeRecords.reduce(
        (total, item) => total + (item.expectedRevenue ?? 0),
        0
      ),
      currency: true,
    },
    {
      label: "本月預計成交",
      value: monthlyRecords.reduce(
        (total, item) => total + (item.expectedRevenue ?? 0),
        0
      ),
      currency: true,
      helper: `${monthlyRecords.length} 筆`,
    },
  ];
});

const pipelineColumns = computed(() =>
  pipelineStages.map((stage) => {
    const items = filteredOpportunities.value
      .filter((item) => item.stage === stage)
      .sort(
        (left, right) =>
          new Date(left.expectedCloseDate).getTime() -
          new Date(right.expectedCloseDate).getTime()
      );

    return {
      stage,
      label: opportunityStageMap[stage]?.label ?? stage,
      type: opportunityStageMap[stage]?.type ?? "info",
      items,
      count: items.length,
      totalRevenue: items.reduce((total, item) => total + (item.expectedRevenue ?? 0), 0),
      isTerminal: ["won", "lost"].includes(stage),
    };
  })
);

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

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function getDueState(opportunity) {
  if (["won", "lost"].includes(opportunity.stage)) {
    return null;
  }

  const closeTime = new Date(opportunity.expectedCloseDate).getTime();
  const now = Date.now();
  const diffDays = Math.floor((closeTime - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: "已逾期", type: "danger" };
  }

  if (diffDays <= 7) {
    return { label: "即將到期", type: "warning" };
  }

  return null;
}

function resetFilters() {
  filters.keyword = "";
  filters.ownerUserId = "all";
  filters.opportunityType = "all";
  filters.accountId = "all";
  filters.region = "all";
  filters.expectedCloseDateRange = [];
}

function toggleFilterPanel() {
  filterPanelOpen.value = !filterPanelOpen.value;
}

function jumpToOpportunity(opportunity) {
  router.push({
    name: "opportunity-detail",
    params: { opportunityId: opportunity.id },
  });
}

function openCreateDrawer() {
  formMode.value = "create";
  editingOpportunity.value = null;
  formDrawerOpen.value = true;
}

function openEditDrawer(opportunity) {
  formMode.value = "edit";
  editingOpportunity.value = opportunity;
  formDrawerOpen.value = true;
}

function handleSubmitOpportunity(payload) {
  if (formMode.value === "edit" && editingOpportunity.value) {
    const updatedOpportunity = updateOpportunity(editingOpportunity.value.id, payload);

    if (!updatedOpportunity) {
      return;
    }

    ElNotification({
      title: "已更新",
      message: `${updatedOpportunity.name} 已更新完成。`,
      type: "success",
      position: "top-right",
    });
  } else {
    const nextOpportunity = createOpportunity(payload);

    ElNotification({
      title: "已建立",
      message: `${nextOpportunity.name} 已新增至 Pipeline。`,
      type: "success",
      position: "top-right",
    });
  }

  formDrawerOpen.value = false;
}

function openStageDialog(opportunity) {
  stageTargetId.value = opportunity.id;
  stageForm.nextStage = opportunity.stage;
  stageForm.lostReason = opportunity.lostReason ?? "";
  stageForm.note = "";
  stageDialogOpen.value = true;
}

function submitStageUpdate() {
  if (!stageTargetId.value) {
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
    stageTargetId.value,
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

function markStage(opportunity, nextStage) {
  if (nextStage === "lost") {
    openStageDialog({ ...opportunity, stage: "lost" });
    stageForm.nextStage = "lost";
    return;
  }

  const updatedOpportunity = updateOpportunityStage(opportunity.id, nextStage);

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
}

watch(
  () => [
    filters.keyword,
    filters.ownerUserId,
    filters.opportunityType,
    filters.accountId,
    filters.region,
    filters.expectedCloseDateRange,
  ],
  () => {
    if (stageDialogOpen.value) {
      stageDialogOpen.value = false;
    }
  }
);
</script>

<template>
  <div class="min-h-full p-8">
    <section class="grid gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-2">
          <h1 class="text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-900">
            {{ pageTitle }}
          </h1>
          <p class="text-sm text-slate-500">以商機階段管理成交進度與推進節奏。</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton type="primary" :icon="CirclePlus" @click="openCreateDrawer">
            新增商機
          </ElButton>
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-4">
        <section
          v-for="card in summaryCards"
          :key="card.label"
          class="rounded-2xl border border-slate-200 bg-white px-6 pt-6 pb-3 shadow-sm"
        >
          <div class="grid gap-2">
            <p class="text-sm font-medium text-slate-500">{{ card.label }}</p>
            <p class="text-[2rem] font-semibold tracking-[-0.04em] text-slate-900">
              {{ card.currency ? formatCurrency(card.value) : card.value }}
            </p>
            <p v-if="card.helper" class="text-sm text-slate-500">{{ card.helper }}</p>
          </div>
        </section>
      </div>

      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div
          class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5"
        >
          <div class="flex flex-1 flex-wrap items-center justify-end gap-3">
            <ElInput
              v-model="filters.keyword"
              placeholder="搜尋商機名稱 / 商機代碼 / 客戶名稱"
              :prefix-icon="Search"
              clearable
              class="!w-[340px] max-[760px]:!w-full"
            />

            <ElButton
              :icon="Filter"
              :type="filterPanelOpen ? 'primary' : 'default'"
              @click="toggleFilterPanel"
            >
              Filter
            </ElButton>
          </div>
        </div>

        <transition
          enter-active-class="transition-all duration-300 ease-out"
          leave-active-class="transition-all duration-200 ease-in"
          enter-from-class="max-h-0 opacity-0"
          enter-to-class="max-h-80 opacity-100"
          leave-from-class="max-h-80 opacity-100"
          leave-to-class="max-h-0 opacity-0"
        >
          <div
            v-if="filterPanelOpen"
            class="overflow-hidden border-b border-slate-200 bg-white px-6 py-4"
          >
            <div
              class="grid gap-4 xl:grid-cols-[repeat(5,minmax(140px,1fr))_minmax(240px,1.2fr)_auto]"
            >
              <ElSelect v-model="filters.ownerUserId">
                <ElOption
                  v-for="item in ownerOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.opportunityType">
                <ElOption
                  v-for="item in opportunityTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.accountId" filterable>
                <ElOption
                  v-for="item in accountOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.region">
                <ElOption
                  v-for="item in regionOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElDatePicker
                v-model="filters.expectedCloseDateRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                range-separator="至"
                start-placeholder="預計成交開始日"
                end-placeholder="預計成交結束日"
                class="!w-full"
              />

              <ElButton :icon="Refresh" @click="resetFilters">重設</ElButton>
            </div>
          </div>
        </transition>
      </section>

      <ElEmpty
        v-if="opportunities.length === 0"
        description="尚無商機資料"
        class="rounded-sm border border-slate-200 bg-white py-20"
      >
        <p class="mb-3 text-sm text-slate-500">
          建立第一筆商機，開始以 Pipeline 管理合作進度。
        </p>
        <ElButton type="primary" @click="openCreateDrawer">新增商機</ElButton>
      </ElEmpty>

      <ElEmpty
        v-else-if="filteredOpportunities.length === 0"
        description="找不到符合條件的商機"
        class="rounded-sm border border-slate-200 bg-white py-20"
      >
        <p class="mb-3 text-sm text-slate-500">請調整篩選條件或重設。</p>
        <ElButton type="primary" @click="resetFilters">重設篩選</ElButton>
      </ElEmpty>

      <div v-else class="overflow-x-auto pb-2">
        <div class="grid min-w-[2040px] grid-cols-7 gap-4">
          <section
            v-for="column in pipelineColumns"
            :key="column.stage"
            class="flex min-h-[640px] flex-col rounded-sm border bg-white shadow-sm"
            :class="
              column.isTerminal
                ? column.stage === 'won'
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : 'border-rose-200 bg-rose-50/40'
                : 'border-slate-200'
            "
          >
            <header class="border-b border-slate-200 px-4 py-4">
              <div class="grid gap-2">
                <div class="flex items-center justify-between gap-2">
                  <h2 class="text-sm font-semibold text-slate-900">
                    {{ column.label }}
                  </h2>
                  <ElTag round effect="light" :type="column.type"
                    >{{ column.count }} 筆</ElTag
                  >
                </div>
                <p class="text-sm text-slate-500">
                  {{ formatCurrency(column.totalRevenue) }}
                </p>
              </div>
            </header>

            <div class="grid flex-1 content-start gap-3 p-3">
              <div
                v-if="column.items.length === 0"
                class="rounded-sm border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400"
              >
                目前沒有商機
              </div>

              <article
                v-for="item in column.items"
                :key="item.id"
                class="cursor-pointer rounded-sm border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                @click="jumpToOpportunity(item)"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="grid gap-1">
                    <h3 class="text-sm font-semibold text-slate-900">{{ item.name }}</h3>
                    <p class="text-xs text-slate-400">{{ item.opportunityCode }}</p>
                  </div>

                  <ElDropdown trigger="click" @command="() => {}">
                    <button
                      type="button"
                      class="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      @click.stop
                    >
                      <MoreFilled class="h-4 w-4" />
                    </button>

                    <template #dropdown>
                      <ElDropdownMenu>
                        <ElDropdownItem @click="openEditDrawer(item)"
                          >編輯</ElDropdownItem
                        >
                        <ElDropdownItem @click="openStageDialog(item)"
                          >調整階段</ElDropdownItem
                        >
                        <ElDropdownItem @click="markStage(item, 'won')"
                          >標記成交</ElDropdownItem
                        >
                        <ElDropdownItem @click="markStage(item, 'lost')"
                          >標記失敗</ElDropdownItem
                        >
                      </ElDropdownMenu>
                    </template>
                  </ElDropdown>
                </div>

                <p class="mt-3 text-sm text-slate-600">{{ item.accountName }}</p>

                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <ElTag
                    round
                    effect="light"
                    size="small"
                    :type="opportunityTypeMap[item.opportunityType]?.type"
                  >
                    {{
                      opportunityTypeMap[item.opportunityType]?.label ??
                      item.opportunityType
                    }}
                  </ElTag>
                  <ElTag round effect="plain" size="small">{{ item.probability }}%</ElTag>
                  <ElTag
                    v-if="getDueState(item)"
                    round
                    effect="light"
                    size="small"
                    :type="getDueState(item)?.type"
                  >
                    {{ getDueState(item)?.label }}
                  </ElTag>
                </div>

                <div class="mt-4 grid gap-2 text-sm text-slate-600">
                  <p>預估金額：{{ formatCurrency(item.expectedRevenue) }}</p>
                  <p>預計成交日：{{ formatDate(item.expectedCloseDate) }}</p>
                  <p>負責人：{{ item.ownerName }}</p>
                  <p v-if="item.stage === 'lost'" class="text-rose-600">
                    失敗原因：{{ item.lostReason || "-" }}
                  </p>
                </div>
              </article>
            </div>
          </section>
        </div>
      </div>
    </section>

    <OpportunityFormDrawer
      v-model="formDrawerOpen"
      :mode="formMode"
      :opportunity="editingOpportunity"
      @submit="handleSubmitOpportunity"
    />

    <ElDialog v-model="stageDialogOpen" title="調整商機階段" width="560px">
      <ElForm label-position="top" class="grid gap-4">
        <ElFormItem label="商機名稱">
          <div
            class="rounded-sm border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
          >
            {{ opportunities.find((item) => item.id === stageTargetId)?.name ?? "-" }}
          </div>
        </ElFormItem>

        <ElFormItem label="目前階段">
          <div
            class="rounded-sm border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
          >
            {{
              opportunityStageMap[
                opportunities.find((item) => item.id === stageTargetId)?.stage
              ]?.label ?? "-"
            }}
          </div>
        </ElFormItem>

        <ElFormItem label="新階段">
          <ElSelect v-model="stageForm.nextStage" class="!w-full">
            <ElOption
              v-for="item in opportunityStageOptions"
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
  </div>
</template>
