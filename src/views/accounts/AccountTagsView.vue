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
  regionOptions,
} from "../../data/accounts";
import { useUsersStore } from "../../composables/useUsersStore";
import { lifecycleMap, statusMap, tierMap, typeMap } from "../../constants/accountMaps";

const router = useRouter();
const { getAssignableOwners } = useUsersStore();
const {
  accounts,
  getAccountById,
  updateAccount,
  updateAccountTags,
  updateAccountsTags,
} = useAccountsStore();

const pageSize = ref(10);
const currentPage = ref(1);
const selectedRows = ref([]);
const tableRef = ref();
const activeTag = ref("");
const editDialogOpen = ref(false);
const editingAccountId = ref(null);
const singleTagDialogOpen = ref(false);
const batchTagDialogOpen = ref(false);
const singleTagTargetId = ref(null);

const filters = reactive({
  keyword: "",
  tag: "all",
  companyType: "all",
  lifecycleStage: "all",
  region: "all",
  owner: "all",
  status: "all",
});

const singleTagForm = reactive({
  tags: [],
  reason: "",
});

const batchTagForm = reactive({
  addTags: [],
  removeTags: [],
  reason: "",
});
const ownerOptions = computed(() => [
  { label: "全部負責業務", value: "all" },
  ...getAssignableOwners("account").map((user) => ({
    label: user.name,
    value: user.id,
  })),
]);

const emptyStateCopy = {
  noData: {
    title: "目前尚無客戶標籤資料",
    description: "可先在客戶資料中建立標籤，之後再於本頁集中管理。",
    action: "前往客戶列表",
  },
  noResult: {
    title: "找不到符合條件的客戶",
    description: "請調整搜尋條件或重設篩選。",
    action: "重設篩選",
  },
  noTagGroup: {
    title: "目前沒有客戶使用此標籤",
    description: "可調整篩選，或為客戶新增此標籤。",
    action: "查看全部客戶",
  },
};

function normalizeTags(tags = []) {
  const tagMap = new Map();

  tags.forEach((tag) => {
    const normalizedTag = String(tag ?? "").trim();

    if (!normalizedTag) {
      return;
    }

    const key = normalizedTag.toLocaleLowerCase();

    if (!tagMap.has(key)) {
      tagMap.set(key, normalizedTag);
    }
  });

  return [...tagMap.values()];
}

const allTags = computed(() => {
  return normalizeTags(accounts.value.flatMap((account) => account.tags ?? []));
});

const tagOptions = computed(() => [
  { label: "全部標籤", value: "all" },
  ...allTags.value.map((tag) => ({ label: tag, value: tag })),
]);

const popularTags = computed(() => {
  const tagCountMap = new Map();

  accounts.value.forEach((account) => {
    normalizeTags(account.tags).forEach((tag) => {
      tagCountMap.set(tag, (tagCountMap.get(tag) ?? 0) + 1);
    });
  });

  return [...tagCountMap.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.tag.localeCompare(right.tag, "zh-Hant");
    });
});

const summaryCards = computed(() => {
  const taggedCount = accounts.value.filter(
    (account) => normalizeTags(account.tags).length > 0
  ).length;

  return [
    { label: "總客戶數", value: accounts.value.length },
    { label: "標籤總數", value: allTags.value.length },
    { label: "已標籤客戶數", value: taggedCount },
    { label: "未標籤客戶數", value: accounts.value.length - taggedCount },
  ];
});

const editingAccount = computed(() =>
  editingAccountId.value ? getAccountById(editingAccountId.value) : null
);

const hasSecondaryFilters = computed(() => {
  return (
    filters.keyword.trim().length > 0 ||
    filters.tag !== "all" ||
    filters.companyType !== "all" ||
    filters.lifecycleStage !== "all" ||
    filters.region !== "all" ||
    filters.owner !== "all" ||
    filters.status !== "all"
  );
});

const filteredAccounts = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();
  const selectedTag = activeTag.value || (filters.tag !== "all" ? filters.tag : "");

  return accounts.value.filter((account) => {
    const accountTags = normalizeTags(account.tags);
    const matchesKeyword =
      keyword.length === 0 ||
      account.companyName.toLowerCase().includes(keyword) ||
      account.accountCode.toLowerCase().includes(keyword) ||
      accountTags.some((tag) => tag.toLowerCase().includes(keyword));

    const matchesTag =
      !selectedTag ||
      accountTags.some(
        (tag) => tag.toLocaleLowerCase() === selectedTag.toLocaleLowerCase()
      );
    const matchesType =
      filters.companyType === "all" || account.companyType === filters.companyType;
    const matchesLifecycle =
      filters.lifecycleStage === "all" ||
      account.lifecycleStage === filters.lifecycleStage;
    const matchesRegion = filters.region === "all" || account.region === filters.region;
    const matchesOwner =
      filters.owner === "all" || account.ownerUserId === filters.owner;
    const matchesStatus = filters.status === "all" || account.status === filters.status;

    return (
      matchesKeyword &&
      matchesTag &&
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

const currentEmptyState = computed(() => {
  if (accounts.value.length === 0) {
    return emptyStateCopy.noData;
  }

  const selectedTag = activeTag.value || (filters.tag !== "all" ? filters.tag : "");

  if (selectedTag && filteredAccounts.value.length === 0 && !filters.keyword.trim()) {
    return emptyStateCopy.noTagGroup;
  }

  return emptyStateCopy.noResult;
});

watch(
  () => [
    filters.keyword,
    filters.tag,
    filters.companyType,
    filters.lifecycleStage,
    filters.region,
    filters.owner,
    filters.status,
    activeTag.value,
    pageSize.value,
  ],
  () => {
    currentPage.value = 1;
  }
);

watch(
  () => filters.tag,
  (nextTag) => {
    activeTag.value = nextTag === "all" ? "" : nextTag;
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

function resetFilters() {
  filters.keyword = "";
  filters.tag = "all";
  filters.companyType = "all";
  filters.lifecycleStage = "all";
  filters.region = "all";
  filters.owner = "all";
  filters.status = "all";
  activeTag.value = "";
}

function togglePopularTag(tag) {
  const nextTag = activeTag.value === tag ? "" : tag;
  activeTag.value = nextTag;
  filters.tag = nextTag || "all";
}

function handleSelectionChange(selection) {
  selectedRows.value = selection;
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

function openSingleTagDialog(account) {
  singleTagTargetId.value = account.id;
  singleTagForm.tags = [...normalizeTags(account.tags)];
  singleTagForm.reason = "";
  singleTagDialogOpen.value = true;
}

function submitSingleTagUpdate() {
  const targetAccount = getAccountById(singleTagTargetId.value || "");

  if (!targetAccount) {
    return;
  }

  const updatedAccount = updateAccountTags(
    targetAccount.id,
    singleTagForm.tags,
    singleTagForm.reason.trim()
  );

  if (!updatedAccount) {
    return;
  }

  ElNotification({
    title: "已更新",
    message: `${updatedAccount.companyName} 的標籤已更新。`,
    type: "success",
    position: "top-right",
  });

  singleTagDialogOpen.value = false;
}

function openBatchTagDialog() {
  if (selectedRows.value.length === 0) {
    return;
  }

  batchTagForm.addTags = [];
  batchTagForm.removeTags = [];
  batchTagForm.reason = "";
  batchTagDialogOpen.value = true;
}

function submitBatchTagUpdate() {
  const accountIds = selectedRows.value.map((account) => account.id);

  if (accountIds.length === 0) {
    return;
  }

  const updatedAccounts = updateAccountsTags(accountIds, {
    addTags: batchTagForm.addTags,
    removeTags: batchTagForm.removeTags,
    reason: batchTagForm.reason.trim(),
  });

  ElNotification({
    title: "已批次更新",
    message: `已更新 ${updatedAccounts.length} 筆客戶標籤。`,
    type: "success",
    position: "top-right",
  });

  batchTagDialogOpen.value = false;
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
            客戶標籤
          </h1>
          <p class="text-sm text-slate-500">
            從標籤視角管理客戶分群，快速查看熱門標籤與批次編輯客戶標記。
          </p>
        </div>

        <ElButton
          type="primary"
          :icon="EditPen"
          :disabled="selectedRows.length === 0"
          @click="openBatchTagDialog"
        >
          批次編輯標籤
        </ElButton>
      </div>

      <div class="grid gap-4 xl:grid-cols-4">
        <section
          v-for="card in summaryCards"
          :key="card.label"
          class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div class="grid gap-2">
            <p class="text-sm font-medium text-slate-500">{{ card.label }}</p>
            <p class="text-[2rem] font-semibold tracking-[-0.04em] text-slate-900">
              {{ card.value }}
            </p>
          </div>
        </section>
      </div>

      <section class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div class="grid gap-1">
            <h2 class="text-base font-semibold text-slate-900">熱門標籤區</h2>
            <p class="text-sm text-slate-500">點擊標籤可直接切換對應客戶分群。</p>
          </div>
          <ElTag round effect="plain">共 {{ allTags.length }} 個標籤</ElTag>
        </div>

        <div class="flex flex-wrap gap-3">
          <button
            v-for="item in popularTags"
            :key="item.tag"
            type="button"
            class="rounded-full border px-4 py-2 text-sm font-medium transition"
            :class="
              activeTag === item.tag
                ? 'border-[#409eff] bg-[#409eff] text-white'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
            "
            @click="togglePopularTag(item.tag)"
          >
            {{ item.tag }} {{ item.count }}
          </button>
        </div>
      </section>

      <section
        class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
      >
        <div
          class="grid gap-4 border-b border-slate-200 px-6 py-5 xl:grid-cols-[minmax(0,1.4fr)_repeat(6,minmax(120px,1fr))_auto]"
        >
          <ElInput
            v-model="filters.keyword"
            placeholder="搜尋客戶名稱 / 客戶代碼 / 標籤"
            :prefix-icon="Search"
            clearable
          />

          <ElSelect v-model="filters.tag" filterable allow-create default-first-option>
            <ElOption
              v-for="item in tagOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>

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
            <ElOption label="全部狀態" value="all" />
            <ElOption label="啟用中" value="active" />
            <ElOption label="未啟用" value="inactive" />
            <ElOption label="已流失" value="churned" />
          </ElSelect>

          <ElButton :icon="Refresh" @click="resetFilters">重設</ElButton>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div class="flex flex-wrap items-center gap-2">
            <ElTag round effect="plain">共 {{ filteredAccounts.length }} 筆</ElTag>
            <ElTag v-if="selectedRows.length > 0" round type="primary" effect="light">
              已勾選 {{ selectedRows.length }} 筆
            </ElTag>
          </div>

          <div v-if="activeTag" class="flex items-center gap-2">
            <span class="text-sm text-slate-500">目前標籤：</span>
            <ElTag round effect="light" type="primary">{{ activeTag }}</ElTag>
          </div>
        </div>

        <ElTable
          v-if="pagedAccounts.length > 0"
          ref="tableRef"
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

          <ElTableColumn label="標籤" min-width="260">
            <template #default="{ row }">
              <div class="flex flex-wrap gap-2">
                <ElTag
                  v-for="tag in normalizeTags(row.tags).slice(0, 3)"
                  :key="tag"
                  round
                  effect="plain"
                  class="!border-slate-200 !text-slate-600"
                >
                  {{ tag }}
                </ElTag>
                <ElTag
                  v-if="normalizeTags(row.tags).length > 3"
                  round
                  effect="plain"
                  class="!border-slate-200 !text-slate-500"
                >
                  +{{ normalizeTags(row.tags).length - 3 }}
                </ElTag>
                <span
                  v-if="normalizeTags(row.tags).length === 0"
                  class="text-sm text-slate-400"
                >
                  -
                </span>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="分級" min-width="110">
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
          <ElTableColumn label="負責業務" min-width="110">
            <template #default="{ row }">
              {{ row.ownerName }}
            </template>
          </ElTableColumn>

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
                <ElButton text @click="openSingleTagDialog(row)">編輯標籤</ElButton>
                <ElButton text @click="openEditAccountDialog(row)">編輯客戶</ElButton>
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
                accounts.length === 0
                  ? router.push({ name: 'accounts-list' })
                  : currentEmptyState.action === '重設篩選'
                  ? resetFilters()
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

    <ElDialog v-model="singleTagDialogOpen" title="編輯客戶標籤" width="560px">
      <ElForm label-position="top" class="grid gap-4">
        <ElFormItem label="客戶名稱">
          <div
            class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
          >
            {{ getAccountById(singleTagTargetId || "")?.companyName ?? "-" }}
          </div>
        </ElFormItem>

        <ElFormItem label="現有標籤">
          <ElSelect
            v-model="singleTagForm.tags"
            multiple
            filterable
            allow-create
            default-first-option
            class="!w-full"
            placeholder="可新增或移除標籤"
          >
            <ElOption v-for="tag in allTags" :key="tag" :label="tag" :value="tag" />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="調整原因">
          <ElInput
            v-model="singleTagForm.reason"
            type="textarea"
            :rows="3"
            placeholder="可選填本次調整原因"
          />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="flex items-center justify-end gap-3">
          <ElButton @click="singleTagDialogOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitSingleTagUpdate">儲存</ElButton>
        </div>
      </template>
    </ElDialog>

    <ElDialog v-model="batchTagDialogOpen" title="批次編輯標籤" width="600px">
      <ElForm label-position="top" class="grid gap-4">
        <ElFormItem label="已選客戶數">
          <div
            class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
          >
            {{ selectedRows.length }} 筆
          </div>
        </ElFormItem>

        <ElFormItem label="新增標籤">
          <ElSelect
            v-model="batchTagForm.addTags"
            multiple
            filterable
            allow-create
            default-first-option
            class="!w-full"
            placeholder="可輸入新標籤或選擇既有標籤"
          >
            <ElOption v-for="tag in allTags" :key="tag" :label="tag" :value="tag" />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="移除標籤">
          <ElSelect
            v-model="batchTagForm.removeTags"
            multiple
            filterable
            class="!w-full"
            placeholder="選擇要從已選客戶中移除的標籤"
          >
            <ElOption v-for="tag in allTags" :key="tag" :label="tag" :value="tag" />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="調整原因">
          <ElInput
            v-model="batchTagForm.reason"
            type="textarea"
            :rows="3"
            placeholder="可選填本次批次調整原因"
          />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="flex items-center justify-end gap-3">
          <ElButton @click="batchTagDialogOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitBatchTagUpdate">確認</ElButton>
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
