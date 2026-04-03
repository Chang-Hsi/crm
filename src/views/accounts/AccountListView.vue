<script setup>
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ElButton,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElEmpty,
  ElInput,
  ElNotification,
  ElPagination,
  ElSelect,
  ElOption,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";
import { CirclePlus, Filter, MoreFilled, Refresh, Search } from "@element-plus/icons-vue";
import {
  accountTierOptions,
  accountTypeOptions,
  lifecycleOptions,
  regionOptions,
} from "../../data/accounts";
import AccountFormDialog from "../../components/accounts/AccountFormDialog.vue";
import { useAccountsStore } from "../../composables/useAccountsStore";
import { useUsersStore } from "../../composables/useUsersStore";
import { lifecycleMap, statusMap, tierMap, typeMap } from "../../constants/accountMaps";

const router = useRouter();
const { accounts, createAccount, updateAccount } = useAccountsStore();
const { getAssignableOwners } = useUsersStore();
const loading = ref(false);
const pageSize = ref(10);
const currentPage = ref(1);
const filterPanelOpen = ref(false);
const formDialogOpen = ref(false);
const formDialogMode = ref("create");
const editingAccount = ref(null);
const sortState = reactive({
  prop: "updatedAt",
  order: "descending",
});
const selectedRows = ref([]);
const ownerOptions = computed(() => [
  { label: "全部負責業務", value: "all" },
  ...getAssignableOwners("account").map((user) => ({
    label: user.name,
    value: user.id,
  })),
]);

const filters = reactive({
  keyword: "",
  companyType: "all",
  region: "all",
  tier: "all",
  lifecycleStage: "all",
  owner: "all",
});

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function getInitials(name) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function resetFilters() {
  filters.keyword = "";
  filters.companyType = "all";
  filters.region = "all";
  filters.tier = "all";
  filters.lifecycleStage = "all";
  filters.owner = "all";
  currentPage.value = 1;
}

function handleSelectionChange(selection) {
  selectedRows.value = selection;
}

function handleSortChange({ prop, order }) {
  sortState.prop = prop ?? "updatedAt";
  sortState.order = order ?? "descending";
}

function handlePlaceholderAction(message) {
  ElNotification({
    title: "功能預留",
    message,
    type: "info",
    position: "top-right",
  });
}

function toggleFilterPanel() {
  filterPanelOpen.value = !filterPanelOpen.value;
}

function openCreateDialog() {
  formDialogMode.value = "create";
  editingAccount.value = null;
  formDialogOpen.value = true;
}

function openEditDialog(account) {
  formDialogMode.value = "edit";
  editingAccount.value = account;
  formDialogOpen.value = true;
}

function openDetailPage(account) {
  router.push({
    name: "account-detail",
    params: { accountId: account.id },
  });
}

function handleSubmitAccount({ action, payload }) {
  let targetAccount = null;

  if (formDialogMode.value === "edit" && editingAccount.value) {
    targetAccount = updateAccount(editingAccount.value.id, payload);

    ElNotification({
      title: "已更新",
      message: `客戶 ${payload.companyName} 已更新完成。`,
      type: "success",
      position: "top-right",
    });
  } else {
    targetAccount = createAccount(payload);

    ElNotification({
      title: "已建立",
      message: `客戶 ${payload.companyName} 已新增至列表。`,
      type: "success",
      position: "top-right",
    });
  }

  formDialogOpen.value = false;

  if (action === "save_and_view" && targetAccount) {
    openDetailPage(targetAccount);
  }
}

const filteredAccounts = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return accounts.value.filter((account) => {
    const matchesKeyword =
      keyword.length === 0 ||
      account.companyName.toLowerCase().includes(keyword) ||
      account.accountCode.toLowerCase().includes(keyword);

    const matchesType =
      filters.companyType === "all" || account.companyType === filters.companyType;

    const matchesRegion = filters.region === "all" || account.region === filters.region;
    const matchesTier = filters.tier === "all" || account.tier === filters.tier;

    const matchesLifecycle =
      filters.lifecycleStage === "all" ||
      account.lifecycleStage === filters.lifecycleStage;

    const matchesOwner =
      filters.owner === "all" || account.ownerUserId === filters.owner;

    return (
      matchesKeyword &&
      matchesType &&
      matchesRegion &&
      matchesTier &&
      matchesLifecycle &&
      matchesOwner
    );
  });
});

const sortedAccounts = computed(() => {
  const items = [...filteredAccounts.value];

  if (!sortState.prop || !sortState.order) {
    return items;
  }

  const direction = sortState.order === "ascending" ? 1 : -1;

  return items.sort((left, right) => {
    const leftValue = left[sortState.prop];
    const rightValue = right[sortState.prop];

    if (sortState.prop === "updatedAt") {
      return (new Date(leftValue) - new Date(rightValue)) * direction;
    }

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * direction;
    }

    return String(leftValue).localeCompare(String(rightValue)) * direction;
  });
});

const pagedAccounts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;

  return sortedAccounts.value.slice(start, end);
});
</script>

<template>
  <div class="min-h-full">
    <section
      class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm px-6 py-2"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5 max-[760px]:px-4"
      >
        <div>
          <h2 class="text-[1.75rem] font-semibold tracking-[-0.03em] text-slate-900">
            客戶列表
          </h2>
        </div>

        <div class="flex flex-wrap items-center">
          <ElInput
            v-model="filters.keyword"
            size="large"
            placeholder="搜尋客戶名稱 / 客戶代碼"
            :prefix-icon="Search"
            clearable
            class="!w-[320px] max-[760px]:!w-full !pr-3"
          />

          <ElButton
            size="large"
            :icon="Filter"
            :type="filterPanelOpen ? 'primary' : 'default'"
            @click="toggleFilterPanel"
          >
            Filter
          </ElButton>

          <ElButton
            type="primary"
            size="large"
            :icon="CirclePlus"
            @click="openCreateDialog"
          >
            新增客戶
          </ElButton>
        </div>
      </div>

      <transition
        enter-active-class="transition-all duration-300 ease-out"
        leave-active-class="transition-all duration-200 ease-in"
        enter-from-class="max-h-0 opacity-0"
        enter-to-class="max-h-44 opacity-100"
        leave-from-class="max-h-44 opacity-100"
        leave-to-class="max-h-0 opacity-0"
      >
        <div
          v-if="filterPanelOpen"
          class="overflow-hidden border-b border-slate-200 bg-white px-6 py-4 max-[760px]:px-4"
        >
          <div class="flex flex-wrap items-center gap-3">
            <ElSelect
              v-model="filters.companyType"
              class="!w-[168px]"
              placeholder="客戶類型"
            >
              <ElOption
                v-for="item in accountTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.region" class="!w-[148px]" placeholder="地區">
              <ElOption
                v-for="item in regionOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.tier" class="!w-[148px]" placeholder="分級">
              <ElOption
                v-for="item in accountTierOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect
              v-model="filters.lifecycleStage"
              class="!w-[168px]"
              placeholder="生命周期"
            >
              <ElOption
                v-for="item in lifecycleOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.owner" class="!w-[168px]" placeholder="負責業務">
              <ElOption
                v-for="item in ownerOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElButton :icon="Refresh" @click="resetFilters">重設</ElButton>
          </div>
        </div>
      </transition>

      <div
        class="flex flex-wrap items-center justify-between gap-3 px-6 py-4 max-[760px]:px-4"
      >
        <div class="flex flex-wrap items-center gap-2">
          <ElTag round effect="plain">共 {{ filteredAccounts.length }} 筆</ElTag>
          <ElTag v-if="selectedRows.length > 0" round type="primary" effect="light">
            已勾選 {{ selectedRows.length }} 筆
          </ElTag>
        </div>

        <div v-if="selectedRows.length > 0" class="flex flex-wrap items-center gap-2">
          <ElButton @click="handlePlaceholderAction('批次匯出功能先保留。')"
            >批次匯出</ElButton
          >
          <ElButton @click="handlePlaceholderAction('批次指派 Owner 功能先保留。')">
            批次指派 Owner
          </ElButton>
          <ElButton @click="handlePlaceholderAction('批次標記標籤功能先保留。')">
            批次標記標籤
          </ElButton>
        </div>
      </div>

      <ElTable
        :data="pagedAccounts"
        size="large"
        table-layout="auto"
        :border="false"
        :empty-text="'目前沒有符合條件的客戶資料'"
        :loading="loading"
        @selection-change="handleSelectionChange"
        @sort-change="handleSortChange"
      >
        <ElTableColumn type="selection" width="52" />

        <ElTableColumn label="客戶" min-width="250" sortable="custom" prop="companyName">
          <template #default="{ row }">
            <div class="flex items-center gap-3">
              <div>
                <button
                  type="button"
                  class="text-left text-sm font-semibold text-slate-900 hover:text-[#409eff]"
                  @click="openDetailPage(row)"
                >
                  {{ row.companyName }}
                </button>
                <p class="mt-1 text-xs text-slate-400">{{ row.accountCode }}</p>
              </div>
            </div>
          </template>
        </ElTableColumn>

        <ElTableColumn label="客戶類型" min-width="128">
          <template #default="{ row }">
            {{ typeMap[row.companyType].label }}
          </template>
        </ElTableColumn>

        <ElTableColumn label="分級" min-width="110">
          <template #default="{ row }">
            <ElTag round effect="light" :type="tierMap[row.tier].type">
              {{ tierMap[row.tier].label }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn label="生命周期" min-width="128">
          <template #default="{ row }">
            {{ lifecycleMap[row.lifecycleStage].label }}
          </template>
        </ElTableColumn>

        <ElTableColumn label="地區" min-width="120" prop="region" />
        <ElTableColumn label="負責業務" min-width="120">
          <template #default="{ row }">
            {{ row.ownerName }}
          </template>
        </ElTableColumn>
        <ElTableColumn
          label="商機數"
          min-width="96"
          prop="opportunityCount"
          sortable="custom"
        />

        <ElTableColumn label="狀態" min-width="100">
          <template #default="{ row }">
            <ElTag round effect="light" :type="statusMap[row.status].type">
              {{ statusMap[row.status].label }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn
          label="更新時間"
          min-width="140"
          prop="updatedAt"
          sortable="custom"
        >
          <template #default="{ row }">
            {{ formatDate(row.updatedAt) }}
          </template>
        </ElTableColumn>

        <ElTableColumn label="操作" width="168" fixed="right">
          <template #default="{ row }">
            <div class="flex items-center justify-end gap-1">
              <ElButton text type="primary" @click="openDetailPage(row)"> 詳情 </ElButton>
              <ElButton text @click="openEditDialog(row)"> 編輯 </ElButton>
              <ElDropdown trigger="click">
                <button
                  type="button"
                  class="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <MoreFilled class="h-4 w-4" />
                </button>

                <template #dropdown>
                  <ElDropdownMenu>
                    <ElDropdownItem
                      @click="
                        handlePlaceholderAction(`轉交 ${row.companyName} 功能暫未開放。`)
                      "
                    >
                      轉交
                    </ElDropdownItem>
                    <ElDropdownItem
                      @click="
                        handlePlaceholderAction(`合併 ${row.companyName} 功能暫未開放。`)
                      "
                    >
                      合併
                    </ElDropdownItem>
                    <ElDropdownItem
                      @click="
                        handlePlaceholderAction(`停用 ${row.companyName} 功能暫未開放。`)
                      "
                    >
                      停用
                    </ElDropdownItem>
                  </ElDropdownMenu>
                </template>
              </ElDropdown>
            </div>
          </template>
        </ElTableColumn>

        <template #empty>
          <ElEmpty description="目前沒有符合條件的客戶資料" />
        </template>
      </ElTable>

      <div
        class="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-5 max-[760px]:px-4"
      >
        <ElPagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          layout="total, prev, pager, next"
          :total="sortedAccounts.length"
          background
        />

        <ElSelect v-model="pageSize" class="!w-[96px]" @change="currentPage = 1">
          <ElOption :value="10" label="10 Item" />
          <ElOption :value="20" label="20 Item" />
          <ElOption :value="50" label="50 Item" />
        </ElSelect>
      </div>
    </section>

    <AccountFormDialog
      v-model="formDialogOpen"
      :mode="formDialogMode"
      :account="editingAccount"
      @submit="handleSubmitAccount"
    />
  </div>
</template>
