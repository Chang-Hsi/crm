<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  ElButton,
  ElDialog,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElNotification,
  ElOption,
  ElPagination,
  ElRadioButton,
  ElRadioGroup,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";
import { EditPen, Refresh, Search } from "@element-plus/icons-vue";
import AccountFormDialog from "../../components/accounts/AccountFormDialog.vue";
import { useAccountsStore } from "../../composables/useAccountsStore";
import {
  accountTypeOptions,
  lifecycleOptions,
  ownerOptions,
  regionOptions,
} from "../../data/accounts";
import { lifecycleMap, statusMap, tierMap, typeMap } from "../../constants/accountMaps";

const router = useRouter();
const {
  accounts,
  getAccountById,
  updateAccount,
  updateAccountTier,
  updateAccountTiers,
} = useAccountsStore();

const pageSize = ref(10);
const currentPage = ref(1);
const activeTier = ref("all");
const selectedRows = ref([]);
const tableRef = ref();
const editDialogOpen = ref(false);
const editingAccountId = ref(null);
const singleTierDialogOpen = ref(false);
const batchTierDialogOpen = ref(false);
const singleTierTargetId = ref(null);

const filters = reactive({
  keyword: "",
  companyType: "all",
  lifecycleStage: "all",
  region: "all",
  owner: "all",
  status: "all",
});

const singleTierForm = reactive({
  nextTier: "strategic",
  reason: "",
});

const batchTierForm = reactive({
  nextTier: "strategic",
  reason: "",
});

const tierTabs = [
  { label: "全部", value: "all" },
  { label: "戰略級", value: "strategic" },
  { label: "一般級", value: "normal" },
  { label: "潛力級", value: "potential" },
];

const statusFilterOptions = [
  { label: "全部狀態", value: "all" },
  { label: "啟用中", value: "active" },
  { label: "未啟用", value: "inactive" },
  { label: "已流失", value: "churned" },
];

const tierAdjustOptions = [
  { label: "戰略級", value: "strategic" },
  { label: "一般級", value: "normal" },
  { label: "潛力級", value: "potential" },
];

const emptyStateCopy = {
  noData: {
    title: "尚無客戶分級資料",
    description: "建立第一筆客戶資料後，系統即可依分級進行管理。",
    action: "前往客戶列表",
  },
  noResult: {
    title: "找不到符合條件的客戶",
    description: "請調整搜尋條件或重設篩選。",
    action: "重設篩選",
  },
};

const editingAccount = computed(() =>
  editingAccountId.value ? getAccountById(editingAccountId.value) : null
);

const summaryCards = computed(() =>
  tierAdjustOptions.map((item) => {
    const records = accounts.value.filter((account) => account.tier === item.value);

    return {
      value: item.value,
      label: item.label,
      total: records.length,
      activeCount: records.filter((account) => account.status === "active").length,
      opportunityTotal: records.reduce(
        (total, account) => total + (account.opportunityCount ?? 0),
        0
      ),
    };
  })
);

const tierFilteredAccounts = computed(() => {
  if (activeTier.value === "all") {
    return accounts.value;
  }

  return accounts.value.filter((account) => account.tier === activeTier.value);
});

const hasSecondaryFilters = computed(() => {
  return (
    filters.keyword.trim().length > 0 ||
    filters.companyType !== "all" ||
    filters.lifecycleStage !== "all" ||
    filters.region !== "all" ||
    filters.owner !== "all" ||
    filters.status !== "all"
  );
});

const filteredAccounts = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return tierFilteredAccounts.value.filter((account) => {
    const matchesKeyword =
      keyword.length === 0 ||
      account.companyName.toLowerCase().includes(keyword) ||
      account.accountCode.toLowerCase().includes(keyword);

    const matchesType =
      filters.companyType === "all" || account.companyType === filters.companyType;
    const matchesLifecycle =
      filters.lifecycleStage === "all" ||
      account.lifecycleStage === filters.lifecycleStage;
    const matchesRegion = filters.region === "all" || account.region === filters.region;
    const matchesOwner = filters.owner === "all" || account.owner === filters.owner;
    const matchesStatus = filters.status === "all" || account.status === filters.status;

    return (
      matchesKeyword &&
      matchesType &&
      matchesLifecycle &&
      matchesRegion &&
      matchesOwner &&
      matchesStatus
    );
  });
});

const pagedAccounts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredAccounts.value.slice(start, start + pageSize.value);
});

const selectionCount = computed(() => selectedRows.value.length);

const currentTierEmptyState = computed(() => {
  if (accounts.value.length === 0) {
    return emptyStateCopy.noData;
  }

  if (
    activeTier.value !== "all" &&
    tierFilteredAccounts.value.length === 0 &&
    !hasSecondaryFilters.value
  ) {
    return {
      title: `目前尚無${tierMap[activeTier.value]?.label ?? ""}客戶`,
      description: "可從客戶列表建立資料，或將現有客戶調整為該分級。",
      action: "查看全部客戶",
    };
  }

  return emptyStateCopy.noResult;
});

watch(
  () => [
    activeTier.value,
    filters.keyword,
    filters.companyType,
    filters.lifecycleStage,
    filters.region,
    filters.owner,
    filters.status,
    pageSize.value,
  ],
  () => {
    currentPage.value = 1;
  }
);

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

function handleSelectionChange(selection) {
  selectedRows.value = selection;
}

function selectTier(tierValue) {
  activeTier.value = tierValue;
}

function resetFilters() {
  filters.keyword = "";
  filters.companyType = "all";
  filters.lifecycleStage = "all";
  filters.region = "all";
  filters.owner = "all";
  filters.status = "all";
  activeTier.value = "all";
}

function jumpToAccount(account) {
  router.push({
    name: "account-detail",
    params: { accountId: account.id },
  });
}

function openEditAccountDialog(account) {
  editingAccountId.value = account.id;
  editDialogOpen.value = true;
}

function handleUpdateAccount({ payload }) {
  if (!editingAccountId.value) {
    return;
  }

  const updatedAccount = updateAccount(editingAccountId.value, payload);

  if (!updatedAccount) {
    return;
  }

  ElNotification({
    title: "已更新",
    message: `客戶 ${updatedAccount.companyName} 已更新完成。`,
    type: "success",
    position: "top-right",
  });

  editDialogOpen.value = false;
}

function openSingleTierDialog(account) {
  singleTierTargetId.value = account.id;
  singleTierForm.nextTier = account.tier;
  singleTierForm.reason = "";
  singleTierDialogOpen.value = true;
}

function submitSingleTierUpdate() {
  if (!singleTierTargetId.value) {
    return;
  }

  const target = getAccountById(singleTierTargetId.value);

  if (!target) {
    return;
  }

  updateAccountTier(target.id, singleTierForm.nextTier, singleTierForm.reason.trim());

  ElNotification({
    title: "已更新",
    message: `${target.companyName} 已調整為 ${tierMap[singleTierForm.nextTier].label}。`,
    type: "success",
    position: "top-right",
  });

  singleTierDialogOpen.value = false;
}

function openBatchTierDialog() {
  if (selectionCount.value === 0) {
    return;
  }

  batchTierForm.nextTier = activeTier.value !== "all" ? activeTier.value : "strategic";
  batchTierForm.reason = "";
  batchTierDialogOpen.value = true;
}

function submitBatchTierUpdate() {
  const accountIds = selectedRows.value.map((account) => account.id);

  if (accountIds.length === 0) {
    return;
  }

  const updatedAccounts = updateAccountTiers(
    accountIds,
    batchTierForm.nextTier,
    batchTierForm.reason.trim()
  );

  ElNotification({
    title: "已批次更新",
    message: `已更新 ${updatedAccounts.length} 筆客戶分級為 ${
      tierMap[batchTierForm.nextTier].label
    }。`,
    type: "success",
    position: "top-right",
  });

  batchTierDialogOpen.value = false;
  selectedRows.value = [];
  tableRef.value?.clearSelection();
}
</script>

<template>
  <div class="min-h-full p-8">
    <section class="grid gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-2">
          <h1 class="text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-900">
            客戶分級
          </h1>
          <p class="text-sm text-slate-500">
            從 tier 維度檢視客戶組合，快速完成升級、降級與批次調整。
          </p>
        </div>

        <ElButton
          type="primary"
          :icon="EditPen"
          :disabled="selectionCount === 0"
          @click="openBatchTierDialog"
        >
          批次調整分級
        </ElButton>
      </div>

      <div class="grid gap-4 xl:grid-cols-3">
        <button
          v-for="card in summaryCards"
          :key="card.value"
          type="button"
          class="rounded-[28px] border bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          :class="
            activeTier === card.value
              ? 'border-[#409eff] ring-2 ring-[#409eff]/10'
              : 'border-slate-200'
          "
          @click="selectTier(card.value)"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="grid gap-2">
              <p class="text-sm font-medium text-slate-500">
                <ElTag round effect="light" :type="tierMap[card.value].type">
                  {{ tierMap[card.value].label }}
                </ElTag>
              </p>
              <p
                class="text-[2.5rem] font-semibold tracking-[-0.04em] text-slate-900 pl-4"
              >
                {{ card.total }}
              </p>
            </div>

            <div class="mt-6 grid gap-2 text-sm text-slate-600">
              <p>啟用中客戶：{{ card.activeCount }}</p>
              <p>總商機數：{{ card.opportunityTotal }}</p>
            </div>
          </div>
        </button>
      </div>

      <section
        class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
      >
        <div
          class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5"
        >
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="item in tierTabs"
              :key="item.value"
              type="button"
              class="rounded-full border px-4 py-2 text-sm font-medium transition"
              :class="
                activeTier === item.value
                  ? 'border-[#409eff] bg-[#409eff] text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              "
              @click="selectTier(item.value)"
            >
              {{ item.label }}
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <ElTag round effect="plain">共 {{ filteredAccounts.length }} 筆</ElTag>
            <ElTag v-if="selectionCount > 0" round type="primary" effect="light">
              已勾選 {{ selectionCount }} 筆
            </ElTag>
          </div>
        </div>

        <div
          class="grid gap-4 border-b border-slate-200 px-6 py-4 xl:grid-cols-[minmax(0,1.2fr)_repeat(5,minmax(120px,1fr))_auto]"
        >
          <ElInput
            v-model="filters.keyword"
            placeholder="搜尋客戶名稱 / 客戶代碼"
            :prefix-icon="Search"
            clearable
          />

          <ElSelect v-model="filters.companyType">
            <ElOption
              v-for="item in accountTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>

          <ElSelect v-model="filters.lifecycleStage">
            <ElOption
              v-for="item in lifecycleOptions"
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

          <ElSelect v-model="filters.owner">
            <ElOption
              v-for="item in ownerOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>

          <ElSelect v-model="filters.status">
            <ElOption
              v-for="item in statusFilterOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>

          <ElButton :icon="Refresh" @click="resetFilters">重設</ElButton>
        </div>

        <ElTable
          ref="tableRef"
          v-if="pagedAccounts.length > 0"
          :data="pagedAccounts"
          size="large"
          table-layout="auto"
          @selection-change="handleSelectionChange"
        >
          <ElTableColumn type="selection" width="52" />

          <ElTableColumn label="客戶名稱" min-width="220">
            <template #default="{ row }">
              <div class="grid gap-1">
                <button
                  type="button"
                  class="text-left text-sm font-semibold text-slate-900 hover:text-[#409eff]"
                  @click="jumpToAccount(row)"
                >
                  {{ row.companyName }}
                </button>
                <span class="text-xs text-slate-400">{{ row.accountCode }}</span>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="客戶類型" min-width="120">
            <template #default="{ row }">
              {{ typeMap[row.companyType].label }}
            </template>
          </ElTableColumn>

          <ElTableColumn label="分級" min-width="120">
            <template #default="{ row }">
              <ElTag round effect="light" :type="tierMap[row.tier].type">
                {{ tierMap[row.tier].label }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="生命周期" min-width="120">
            <template #default="{ row }">
              {{ lifecycleMap[row.lifecycleStage].label }}
            </template>
          </ElTableColumn>

          <ElTableColumn label="地區" min-width="96" prop="region" />
          <ElTableColumn label="負責業務" min-width="110" prop="owner" />
          <ElTableColumn label="商機數" min-width="90" prop="opportunityCount" />

          <ElTableColumn label="狀態" min-width="100">
            <template #default="{ row }">
              <ElTag round effect="light" :type="statusMap[row.status].type">
                {{ statusMap[row.status].label }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="最近更新" min-width="120">
            <template #default="{ row }">
              {{ formatDate(row.updatedAt) }}
            </template>
          </ElTableColumn>

          <ElTableColumn label="操作" width="230" fixed="right">
            <template #default="{ row }">
              <div class="flex items-center justify-end gap-1">
                <ElButton text type="primary" @click="jumpToAccount(row)"
                  >查看詳情</ElButton
                >
                <ElButton text @click="openSingleTierDialog(row)">調整分級</ElButton>
                <ElButton text @click="openEditAccountDialog(row)">編輯客戶</ElButton>
              </div>
            </template>
          </ElTableColumn>
        </ElTable>

        <div v-else class="px-6 py-16">
          <ElEmpty :description="currentTierEmptyState.title">
            <p class="mb-3 text-sm text-slate-500">
              {{ currentTierEmptyState.description }}
            </p>
            <ElButton
              type="primary"
              @click="
                accounts.length === 0
                  ? router.push({ name: 'accounts-list' })
                  : currentTierEmptyState.action === '重設篩選'
                  ? resetFilters()
                  : selectTier('all')
              "
            >
              {{ currentTierEmptyState.action }}
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
            :total="filteredAccounts.length"
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

    <ElDialog v-model="singleTierDialogOpen" title="調整客戶分級" width="520px">
      <ElForm label-position="top" class="grid gap-4">
        <ElFormItem label="客戶名稱">
          <div
            class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
          >
            {{ getAccountById(singleTierTargetId || "")?.companyName ?? "-" }}
          </div>
        </ElFormItem>

        <ElFormItem label="目前分級">
          <div
            class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
          >
            {{ tierMap[getAccountById(singleTierTargetId || "")?.tier]?.label ?? "-" }}
          </div>
        </ElFormItem>

        <ElFormItem label="新分級">
          <ElRadioGroup v-model="singleTierForm.nextTier">
            <ElRadioButton
              v-for="item in tierAdjustOptions"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>

        <ElFormItem label="調整原因">
          <ElInput
            v-model="singleTierForm.reason"
            type="textarea"
            :rows="3"
            placeholder="可選填本次調整原因"
          />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="flex items-center justify-end gap-3">
          <ElButton @click="singleTierDialogOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitSingleTierUpdate">確認</ElButton>
        </div>
      </template>
    </ElDialog>

    <ElDialog v-model="batchTierDialogOpen" title="批次調整客戶分級" width="520px">
      <ElForm label-position="top" class="grid gap-4">
        <ElFormItem label="已選客戶數">
          <div
            class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
          >
            {{ selectionCount }} 筆
          </div>
        </ElFormItem>

        <ElFormItem label="新分級">
          <ElRadioGroup v-model="batchTierForm.nextTier">
            <ElRadioButton
              v-for="item in tierAdjustOptions"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>

        <ElFormItem label="調整原因">
          <ElInput
            v-model="batchTierForm.reason"
            type="textarea"
            :rows="3"
            placeholder="可選填本次批次調整原因"
          />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="flex items-center justify-end gap-3">
          <ElButton @click="batchTierDialogOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitBatchTierUpdate">確認</ElButton>
        </div>
      </template>
    </ElDialog>

    <AccountFormDialog
      v-model="editDialogOpen"
      mode="edit"
      :account="editingAccount"
      @submit="handleUpdateAccount"
    />
  </div>
</template>
