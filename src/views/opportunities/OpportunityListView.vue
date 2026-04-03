<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  ElButton,
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
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";
import { CirclePlus, Filter, MoreFilled, Refresh, Search } from "@element-plus/icons-vue";
import { useOpportunitiesStore } from "../../composables/useOpportunitiesStore";
import { useAccountsStore } from "../../composables/useAccountsStore";
import { opportunityStageMap } from "../../constants/accountMaps";
import {
  opportunityStageOptions,
  opportunityStatusOptions,
  opportunityTypeOptions,
  regionOptions,
} from "../../data/opportunities";
import { useUsersStore } from "../../composables/useUsersStore";
import OpportunityFormDrawer from "../../components/opportunities/OpportunityFormDrawer.vue";

const router = useRouter();
const {
  createOpportunity,
  opportunities,
  updateOpportunity,
  updateOpportunityOwner,
  updateOpportunityOwners,
  updateOpportunityStage,
} = useOpportunitiesStore();
const { accounts } = useAccountsStore();
const { getAssignableOwners } = useUsersStore();

const pageSize = ref(10);
const currentPage = ref(1);
const selectedRows = ref([]);
const filterPanelOpen = ref(false);
const stageDialogOpen = ref(false);
const stageTargetId = ref(null);
const ownerDialogOpen = ref(false);
const ownerDialogMode = ref("single");
const ownerTargetId = ref(null);
const formDrawerOpen = ref(false);
const formMode = ref("create");
const editingOpportunity = ref(null);
const sortState = reactive({
  prop: "",
  order: "",
});

const filters = reactive({
  keyword: "",
  stage: "all",
  opportunityType: "all",
  accountId: "all",
  owner: "all",
  region: "all",
  expectedCloseDateRange: [],
  status: "all",
});

const stageForm = reactive({
  nextStage: "proposal",
  lostReason: "",
  note: "",
});
const ownerForm = reactive({
  ownerUserId: "",
});
const ownerOptions = computed(() => [
  { label: "全部負責業務", value: "all" },
  ...getAssignableOwners("opportunity").map((user) => ({
    label: user.name,
    value: user.id,
  })),
]);

const opportunityTypeMap = {
  agency: { label: "代理合作", type: "warning" },
  license: { label: "授權合作", type: "primary" },
  co_branding: { label: "聯名合作", type: "success" },
  channel: { label: "通路合作", type: "info" },
};

const opportunityStatusMap = {
  active: { label: "進行中", type: "warning" },
  won: { label: "已成交", type: "success" },
  lost: { label: "已失敗", type: "danger" },
};

const emptyStateCopy = {
  empty: {
    title: "尚無商機資料",
    description: "建立第一筆商機，開始追蹤客戶合作進度。",
    action: "新增商機",
  },
  noStage: {
    title: "目前沒有此階段的商機",
    description: "可切換其他階段，或建立新的商機。",
    action: "查看全部商機",
  },
  noResult: {
    title: "找不到符合條件的商機",
    description: "請調整搜尋條件或重設篩選。",
    action: "重設篩選",
  },
};

const accountOptions = computed(() => [
  { label: "全部客戶", value: "all" },
  ...accounts.value.map((account) => ({
    label: account.companyName,
    value: account.id,
  })),
]);

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

  const activeRecords = opportunities.value.filter(
    (item) => !["won", "lost"].includes(item.stage)
  );

  const monthlyRecords = opportunities.value.filter((item) => {
    const closeTime = new Date(item.expectedCloseDate).getTime();
    return closeTime >= monthStart && closeTime <= monthEnd;
  });

  return [
    { label: "全部商機數", value: opportunities.value.length },
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
      label: "本月預計成交數",
      value: monthlyRecords.length,
    },
  ];
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

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function resetFilters() {
  filters.keyword = "";
  filters.stage = "all";
  filters.opportunityType = "all";
  filters.accountId = "all";
  filters.owner = "all";
  filters.region = "all";
  filters.expectedCloseDateRange = [];
  filters.status = "all";
}

function toggleFilterPanel() {
  filterPanelOpen.value = !filterPanelOpen.value;
}

function handleSelectionChange(selection) {
  selectedRows.value = selection;
}

function handleSortChange({ prop, order }) {
  sortState.prop = prop ?? "";
  sortState.order = order ?? "";
}

function jumpToAccount(opportunity) {
  router.push({
    name: "account-detail",
    params: { accountId: opportunity.accountId },
  });
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

function openStageDialog(opportunity) {
  stageTargetId.value = opportunity.id;
  stageForm.nextStage = opportunity.stage;
  stageForm.lostReason = opportunity.lostReason ?? "";
  stageForm.note = "";
  stageDialogOpen.value = true;
}

function openAssignOwnerDialog(opportunity = null) {
  ownerDialogMode.value = opportunity ? "single" : "batch";
  ownerTargetId.value = opportunity?.id ?? null;
  ownerForm.ownerUserId =
    opportunity?.ownerUserId ??
    ownerOptions.value.find((item) => item.value !== "all")?.value ??
    "";
  ownerDialogOpen.value = true;
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

function submitOwnerUpdate() {
  if (!ownerForm.ownerUserId) {
    ElNotification({
      title: "缺少資訊",
      message: "請選擇要指派的負責人。",
      type: "warning",
      position: "top-right",
    });
    return;
  }

  if (ownerDialogMode.value === "single" && ownerTargetId.value) {
    const updatedOpportunity = updateOpportunityOwner(
      ownerTargetId.value,
      ownerForm.ownerUserId
    );

    if (!updatedOpportunity) {
      return;
    }

    ElNotification({
      title: "已更新",
      message: `${updatedOpportunity.name} 已指派給 ${updatedOpportunity.ownerName}。`,
      type: "success",
      position: "top-right",
    });

    ownerDialogOpen.value = false;
    return;
  }

  const opportunityIds = selectedRows.value.map((item) => item.id);

  if (opportunityIds.length === 0) {
    return;
  }

  const updatedRecords = updateOpportunityOwners(opportunityIds, ownerForm.ownerUserId);

  ElNotification({
    title: "已批次更新",
    message: `已更新 ${updatedRecords.length} 筆商機的負責人。`,
    type: "success",
    position: "top-right",
  });

  ownerDialogOpen.value = false;
}

function notifyPlaceholder(message = "此功能將於下一階段開放。") {
  ElNotification({
    title: "即將開放",
    message,
    type: "info",
    position: "top-right",
  });
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
      message: `${nextOpportunity.name} 已新增至商機列表。`,
      type: "success",
      position: "top-right",
    });
  }

  formDrawerOpen.value = false;
}

const filteredOpportunities = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();
  const [startDate, endDate] = filters.expectedCloseDateRange ?? [];
  const endDateTime = endDate ? new Date(`${endDate}T23:59:59`).getTime() : null;

  return opportunities.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.name.toLowerCase().includes(keyword) ||
      item.opportunityCode.toLowerCase().includes(keyword) ||
      item.accountName.toLowerCase().includes(keyword);

    const matchesStage = filters.stage === "all" || item.stage === filters.stage;
    const matchesType =
      filters.opportunityType === "all" ||
      item.opportunityType === filters.opportunityType;
    const matchesAccount =
      filters.accountId === "all" || item.accountId === filters.accountId;
    const matchesOwner = filters.owner === "all" || item.ownerUserId === filters.owner;
    const matchesRegion = filters.region === "all" || item.region === filters.region;
    const matchesStatus = filters.status === "all" || item.status === filters.status;
    const closeTime = new Date(item.expectedCloseDate).getTime();
    const matchesDateRange =
      !startDate ||
      !endDate ||
      (closeTime >= new Date(startDate).getTime() && closeTime <= endDateTime);

    return (
      matchesKeyword &&
      matchesStage &&
      matchesType &&
      matchesAccount &&
      matchesOwner &&
      matchesRegion &&
      matchesStatus &&
      matchesDateRange
    );
  });
});

const sortedOpportunities = computed(() => {
  const records = [...filteredOpportunities.value];

  if (!sortState.prop || !sortState.order) {
    return records;
  }

  const direction = sortState.order === "ascending" ? 1 : -1;

  return records.sort((left, right) => {
    if (sortState.prop === "probability") {
      return ((left.probability ?? 0) - (right.probability ?? 0)) * direction;
    }

    if (sortState.prop === "expectedRevenue") {
      return ((left.expectedRevenue ?? 0) - (right.expectedRevenue ?? 0)) * direction;
    }

    if (sortState.prop === "expectedCloseDate") {
      return (
        (new Date(left.expectedCloseDate).getTime() -
          new Date(right.expectedCloseDate).getTime()) *
        direction
      );
    }

    return 0;
  });
});

const pagedOpportunities = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedOpportunities.value.slice(start, start + pageSize.value);
});

const currentEmptyState = computed(() => {
  if (opportunities.value.length === 0) {
    return emptyStateCopy.empty;
  }

  if (filters.stage !== "all" && filteredOpportunities.value.length === 0) {
    return emptyStateCopy.noStage;
  }

  return emptyStateCopy.noResult;
});

watch(
  () => [
    filters.keyword,
    filters.stage,
    filters.opportunityType,
    filters.accountId,
    filters.owner,
    filters.region,
    filters.expectedCloseDateRange,
    filters.status,
    pageSize.value,
  ],
  () => {
    currentPage.value = 1;
  }
);
</script>

<template>
  <div class="min-h-full p-8">
    <section class="grid gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-2">
          <h1 class="text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-900">
            商機列表
          </h1>
          <p class="text-sm text-slate-500">
            以 Opportunity 為中心管理 pipeline，快速搜尋、篩選並推進成交。
          </p>
        </div>

        <ElButton type="primary" :icon="CirclePlus" @click="openCreateDrawer">
          新增商機
        </ElButton>
      </div>

      <div class="grid gap-4 xl:grid-cols-4">
        <section
          v-for="card in summaryCards"
          :key="card.label"
          class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div class="grid gap-2">
            <p class="text-sm font-medium text-slate-500">{{ card.label }}</p>
            <p class="text-[2rem] font-semibold tracking-[-0.04em] text-slate-900">
              {{ card.currency ? formatCurrency(card.value) : card.value }}
            </p>
          </div>
        </section>
      </div>

      <section
        class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
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
              class="grid gap-4 xl:grid-cols-[repeat(6,minmax(120px,1fr))_minmax(240px,1.35fr)_auto]"
            >
              <ElSelect v-model="filters.stage">
                <ElOption
                  v-for="item in opportunityStageOptions"
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

              <ElSelect v-model="filters.owner">
                <ElOption
                  v-for="item in ownerOptions"
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

              <ElSelect v-model="filters.status">
                <ElOption
                  v-for="item in opportunityStatusOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <div class="flex items-center gap-2">
                <ElInput
                  v-model="filters.expectedCloseDateRange[0]"
                  placeholder="開始日 YYYY-MM-DD"
                />
                <ElInput
                  v-model="filters.expectedCloseDateRange[1]"
                  placeholder="結束日 YYYY-MM-DD"
                />
              </div>

              <ElButton :icon="Refresh" @click="resetFilters">重設</ElButton>
            </div>
          </div>
        </transition>

        <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div class="flex flex-wrap items-center gap-2">
            <ElTag round effect="plain">共 {{ filteredOpportunities.length }} 筆</ElTag>
            <ElTag v-if="selectedRows.length > 0" round type="primary" effect="light">
              已勾選 {{ selectedRows.length }} 筆
            </ElTag>
          </div>

          <div v-if="selectedRows.length > 0" class="flex flex-wrap items-center gap-2">
            <ElButton @click="openAssignOwnerDialog()">批次調整負責人</ElButton>
          </div>
        </div>

        <ElTable
          v-if="pagedOpportunities.length > 0"
          :data="pagedOpportunities"
          size="large"
          table-layout="auto"
          @sort-change="handleSortChange"
          @selection-change="handleSelectionChange"
        >
          <ElTableColumn type="selection" width="52" />

          <ElTableColumn label="商機名稱" min-width="240">
            <template #default="{ row }">
              <div class="grid gap-1">
                <button
                  type="button"
                  class="text-left text-sm font-semibold text-slate-900 hover:text-[#409eff]"
                  @click="jumpToOpportunity(row)"
                >
                  {{ row.name }}
                </button>
                <span class="text-xs text-slate-400">{{ row.opportunityCode }}</span>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="客戶" min-width="220">
            <template #default="{ row }">
              <button
                type="button"
                class="text-left text-sm font-medium text-[#409eff] hover:text-[#337ecc]"
                @click="jumpToAccount(row)"
              >
                {{ row.accountName }}
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="商機類型" min-width="120">
            <template #default="{ row }">
              <ElTag
                round
                effect="light"
                :type="opportunityTypeMap[row.opportunityType]?.type"
              >
                {{
                  opportunityTypeMap[row.opportunityType]?.label ?? row.opportunityType
                }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="階段" min-width="120">
            <template #default="{ row }">
              <ElTag
                round
                effect="light"
                :type="opportunityStageMap[row.stage]?.type ?? 'info'"
              >
                {{ opportunityStageMap[row.stage]?.label ?? row.stage }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="機率" min-width="90" prop="probability" sortable="custom">
            <template #default="{ row }">{{ row.probability }}%</template>
          </ElTableColumn>

          <ElTableColumn
            label="預估金額"
            min-width="140"
            prop="expectedRevenue"
            sortable="custom"
          >
            <template #default="{ row }">
              {{ formatCurrency(row.expectedRevenue) }}
            </template>
          </ElTableColumn>

          <ElTableColumn
            label="預計成交日"
            min-width="120"
            prop="expectedCloseDate"
            sortable="custom"
          >
            <template #default="{ row }">
              {{ formatDate(row.expectedCloseDate) }}
            </template>
          </ElTableColumn>

          <ElTableColumn label="負責人" min-width="110">
            <template #default="{ row }">
              {{ row.ownerName }}
            </template>
          </ElTableColumn>

          <ElTableColumn label="最近更新" min-width="120">
            <template #default="{ row }">
              {{ formatDate(row.updatedAt) }}
            </template>
          </ElTableColumn>

          <ElTableColumn label="操作" width="250" fixed="right">
            <template #default="{ row }">
              <div class="flex items-center justify-end gap-1">
                <ElButton text type="primary" @click="jumpToOpportunity(row)"
                  >查看詳情</ElButton
                >
                <ElButton text @click="openEditDrawer(row)">編輯</ElButton>
                <ElButton text @click="openStageDialog(row)">調整階段</ElButton>
                <ElDropdown trigger="click">
                  <button
                    type="button"
                    class="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <MoreFilled class="h-4 w-4" />
                  </button>

                  <template #dropdown>
                    <ElDropdownMenu>
                      <ElDropdownItem @click="updateOpportunityStage(row.id, 'won')">
                        標記成交
                      </ElDropdownItem>
                      <ElDropdownItem @click="openStageDialog({ ...row, stage: 'lost' })">
                        標記失敗
                      </ElDropdownItem>
                      <ElDropdownItem @click="openAssignOwnerDialog(row)">
                        指派負責人
                      </ElDropdownItem>
                    </ElDropdownMenu>
                  </template>
                </ElDropdown>
              </div>
            </template>
          </ElTableColumn>
        </ElTable>

        <div v-else class="px-6 py-16">
          <ElEmpty :description="currentEmptyState.title">
            <p class="mb-3 text-sm text-slate-500">{{ currentEmptyState.description }}</p>
            <ElButton
              type="primary"
              @click="
                currentEmptyState.action === '新增商機'
                  ? notifyPlaceholder()
                  : currentEmptyState.action === '查看全部商機'
                  ? (filters.stage = 'all')
                  : resetFilters()
              "
            >
              {{ currentEmptyState.action }}
            </ElButton>
          </ElEmpty>
        </div>

        <div
          class="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-5"
        >
          <ElPagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            layout="total, prev, pager, next"
            :total="filteredOpportunities.length"
            background
          />

          <ElSelect v-model="pageSize" class="!w-[96px]">
            <ElOption :value="10" label="10 Item" />
            <ElOption :value="20" label="20 Item" />
            <ElOption :value="50" label="50 Item" />
          </ElSelect>
        </div>
      </section>
    </section>

    <ElDialog v-model="stageDialogOpen" title="調整商機階段" width="560px">
      <ElForm label-position="top" class="grid gap-4">
        <ElFormItem label="商機名稱">
          <div
            class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
          >
            {{ opportunities.find((item) => item.id === stageTargetId)?.name ?? "-" }}
          </div>
        </ElFormItem>

        <ElFormItem label="目前階段">
          <div
            class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
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
              v-for="item in opportunityStageOptions.filter(
                (item) => item.value !== 'all'
              )"
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

    <OpportunityFormDrawer
      v-model="formDrawerOpen"
      :mode="formMode"
      :opportunity="editingOpportunity"
      @submit="handleSubmitOpportunity"
    />

    <ElDialog
      v-model="ownerDialogOpen"
      :title="ownerDialogMode === 'single' ? '指派負責人' : '批次調整負責人'"
      width="520px"
    >
      <ElForm label-position="top" class="grid gap-4">
        <ElFormItem :label="ownerDialogMode === 'single' ? '商機名稱' : '已選商機數'">
          <div
            class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
          >
            {{
              ownerDialogMode === "single"
                ? opportunities.find((item) => item.id === ownerTargetId)?.name ?? "-"
                : `${selectedRows.length} 筆`
            }}
          </div>
        </ElFormItem>

        <ElFormItem label="負責人" required>
          <ElSelect v-model="ownerForm.ownerUserId" class="!w-full">
            <ElOption
              v-for="item in ownerOptions.filter((item) => item.value !== 'all')"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="flex items-center justify-end gap-3">
          <ElButton @click="ownerDialogOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitOwnerUpdate">確認</ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>
