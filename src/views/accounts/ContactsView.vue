<script setup>
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ElButton,
  ElDrawer,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElEmpty,
  ElInput,
  ElNotification,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";
import {
  CirclePlus,
  Filter,
  MoreFilled,
  Refresh,
  Search,
} from "@element-plus/icons-vue";
import { accountList, ownerOptions, regionOptions } from "../../data/accounts";
import {
  contactRoleOptions,
  contactStatusOptions,
  primaryContactOptions,
} from "../../data/contacts";
import ContactFormDrawer from "../../components/accounts/ContactFormDrawer.vue";
import { useContactsStore } from "../../composables/useContactsStore";

const router = useRouter();
const { contacts, createContact, setPrimaryContact, toggleContactStatus, updateContact } =
  useContactsStore();

const pageSize = ref(10);
const currentPage = ref(1);
const selectedRows = ref([]);
const viewingContact = ref(null);
const contactDrawerOpen = ref(false);
const filterPanelOpen = ref(false);
const contactFormOpen = ref(false);
const contactFormMode = ref("create");
const editingContact = ref(null);

const filters = reactive({
  keyword: "",
  role: "all",
  isPrimary: "all",
  region: "all",
  status: "all",
  owner: "all",
  accountId: "all",
});

const EMPTY_STATE_COPY = {
  empty: {
    title: "尚無聯絡人",
    description: "建立第一位聯絡人，方便後續商機推進與互動記錄。",
    action: "新增聯絡人",
  },
  noResult: {
    title: "找不到符合條件的聯絡人",
    description: "請調整搜尋條件或重設篩選。",
    action: "重設篩選",
  },
};

const placeholderMessage = "此功能將於下一階段開放。";

const accountOptions = computed(() => [
  { label: "全部客戶", value: "all" },
  ...accountList.map((account) => ({
    label: account.companyName,
    value: account.id,
  })),
]);

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

function notifyPlaceholder() {
  ElNotification({
    title: "即將開放",
    message: placeholderMessage,
    type: "info",
    position: "top-right",
  });
}

function notifySuccess(title, message) {
  ElNotification({
    title,
    message,
    type: "success",
    position: "top-right",
  });
}

function resetFilters() {
  filters.keyword = "";
  filters.role = "all";
  filters.isPrimary = "all";
  filters.region = "all";
  filters.status = "all";
  filters.owner = "all";
  filters.accountId = "all";
  currentPage.value = 1;
}

function toggleFilterPanel() {
  filterPanelOpen.value = !filterPanelOpen.value;
}

function handleSelectionChange(selection) {
  selectedRows.value = selection;
}

function openContactDrawer(contact) {
  viewingContact.value = contact;
  contactDrawerOpen.value = true;
}

function openCreateContactDrawer() {
  contactFormMode.value = "create";
  editingContact.value = null;
  contactFormOpen.value = true;
}

function openEditContactDrawer(contact) {
  contactFormMode.value = "edit";
  editingContact.value = contact;
  contactFormOpen.value = true;
}

function jumpToAccount(contact) {
  router.push({
    name: "account-detail",
    params: { accountId: contact.accountId },
  });
}

function handleSetPrimary(contact) {
  if (!contact || contact.isPrimary) {
    return;
  }

  const updatedContact = setPrimaryContact(contact.id);

  if (!updatedContact) {
    return;
  }

  notifySuccess("已更新", `${contact.name} 已設為主要聯絡人。`);
}

function handleToggleStatus(contact) {
  if (!contact) {
    return;
  }

  const updatedContact = toggleContactStatus(contact.id);

  if (!updatedContact) {
    return;
  }

  notifySuccess(
    updatedContact.status === "active" ? "已啟用" : "已停用",
    `${updatedContact.name} ${
      updatedContact.status === "active" ? "已啟用" : "已停用"
    }。`
  );
}

function handleSubmitContact(payload) {
  if (contactFormMode.value === "edit" && editingContact.value) {
    const updatedContact = updateContact(editingContact.value.id, payload);

    if (!updatedContact) {
      return;
    }

    viewingContact.value =
      viewingContact.value?.id === updatedContact.id ? updatedContact : viewingContact.value;

    notifySuccess("已更新", `${updatedContact.name} 已更新完成。`);
  } else {
    const nextContact = createContact(payload);

    notifySuccess("已建立", `${nextContact.name} 已新增至聯絡人列表。`);
  }

  contactFormOpen.value = false;
}

const filteredContacts = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return contacts.value.filter((contact) => {
    const matchesKeyword =
      keyword.length === 0 ||
      contact.name.toLowerCase().includes(keyword) ||
      contact.email.toLowerCase().includes(keyword) ||
      contact.phone.toLowerCase().includes(keyword) ||
      contact.accountName.toLowerCase().includes(keyword);

    const matchesRole = filters.role === "all" || contact.role === filters.role;
    const matchesPrimary =
      filters.isPrimary === "all" ||
      (filters.isPrimary === "yes" && contact.isPrimary) ||
      (filters.isPrimary === "no" && !contact.isPrimary);
    const matchesRegion = filters.region === "all" || contact.region === filters.region;
    const matchesStatus = filters.status === "all" || contact.status === filters.status;
    const matchesOwner = filters.owner === "all" || contact.owner === filters.owner;
    const matchesAccount =
      filters.accountId === "all" || contact.accountId === filters.accountId;

    return (
      matchesKeyword &&
      matchesRole &&
      matchesPrimary &&
      matchesRegion &&
      matchesStatus &&
      matchesOwner &&
      matchesAccount
    );
  });
});

const pagedContacts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;

  return filteredContacts.value.slice(start, end);
});
</script>

<template>
  <div class="min-h-full">
    <section
      class="overflow-hidden rounded-[28px] border border-slate-200 bg-white px-6 py-2 shadow-sm"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5 max-[760px]:px-4"
      >
        <div class="grid gap-1">
          <h2 class="text-[1.75rem] font-semibold tracking-[-0.03em] text-slate-900">
            聯絡人
          </h2>
          <p class="text-sm text-slate-500">共 {{ filteredContacts.length }} 位聯絡人</p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <ElInput
            v-model="filters.keyword"
            placeholder="搜尋姓名 / Email / 電話 / 客戶名稱"
            :prefix-icon="Search"
            clearable
            class="!w-[320px] max-[760px]:!w-full"
          />

          <ElButton
            :icon="Filter"
            :type="filterPanelOpen ? 'primary' : 'default'"
            @click="toggleFilterPanel"
          >
            Filter
          </ElButton>

          <ElButton type="primary" :icon="CirclePlus" @click="openCreateContactDrawer">
            新增聯絡人
          </ElButton>
        </div>
      </div>

      <transition
        enter-active-class="transition-all duration-300 ease-out"
        leave-active-class="transition-all duration-200 ease-in"
        enter-from-class="max-h-0 opacity-0"
        enter-to-class="max-h-60 opacity-100"
        leave-from-class="max-h-60 opacity-100"
        leave-to-class="max-h-0 opacity-0"
      >
        <div
          v-if="filterPanelOpen"
          class="overflow-hidden border-b border-slate-200 bg-white px-6 py-4 max-[760px]:px-4"
        >
          <div class="flex flex-wrap items-center gap-3">
            <ElSelect v-model="filters.role" class="!w-[160px]">
              <ElOption
                v-for="item in contactRoleOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.isPrimary" class="!w-[160px]">
              <ElOption
                v-for="item in primaryContactOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.region" class="!w-[140px]">
              <ElOption
                v-for="item in regionOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.status" class="!w-[140px]">
              <ElOption
                v-for="item in contactStatusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.owner" class="!w-[160px]">
              <ElOption
                v-for="item in ownerOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>

            <ElSelect v-model="filters.accountId" class="!w-[200px]">
              <ElOption
                v-for="item in accountOptions"
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
          <ElTag round effect="plain">共 {{ filteredContacts.length }} 位</ElTag>
          <ElTag v-if="selectedRows.length > 0" round type="primary" effect="light">
            已勾選 {{ selectedRows.length }} 位
          </ElTag>
        </div>
      </div>

      <ElTable
        v-if="pagedContacts.length > 0"
        :data="pagedContacts"
        size="large"
        table-layout="auto"
        @selection-change="handleSelectionChange"
      >
        <ElTableColumn type="selection" width="52" />

        <ElTableColumn label="姓名" min-width="150">
          <template #default="{ row }">
            <button
              type="button"
              class="text-left text-sm font-semibold text-slate-900 hover:text-[#409eff]"
              @click="openContactDrawer(row)"
            >
              {{ row.name }}
            </button>
          </template>
        </ElTableColumn>

        <ElTableColumn label="角色 / 職稱" min-width="170">
          <template #default="{ row }">
            <div class="grid gap-1">
              <span class="text-sm text-slate-900">{{ row.roleLabel }}</span>
              <span class="text-xs text-slate-400">{{ row.title }}</span>
            </div>
          </template>
        </ElTableColumn>

        <ElTableColumn label="所屬客戶" min-width="220">
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

        <ElTableColumn label="Email" min-width="240" prop="email" />
        <ElTableColumn label="電話" min-width="160" prop="phone" />
        <ElTableColumn label="地區" min-width="100" prop="region" />
        <ElTableColumn label="負責業務" min-width="120" prop="owner" />

        <ElTableColumn label="主要聯絡人" min-width="120">
          <template #default="{ row }">
            <ElTag :type="row.isPrimary ? 'primary' : 'info'" round effect="light">
              {{ row.isPrimary ? "主要" : "一般" }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn label="狀態" min-width="100">
          <template #default="{ row }">
            <ElTag :type="row.status === 'active' ? 'success' : 'info'" round effect="light">
              {{ row.status === "active" ? "啟用中" : "未啟用" }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <div class="flex items-center justify-end gap-1">
                    <ElButton text type="primary" @click="openContactDrawer(row)">查看</ElButton>
                    <ElButton text @click="openEditContactDrawer(row)">編輯</ElButton>
                    <ElButton text @click="jumpToAccount(row)">跳到客戶</ElButton>
              <ElDropdown trigger="click">
                <button
                  type="button"
                  class="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <MoreFilled class="h-4 w-4" />
                </button>

                <template #dropdown>
                  <ElDropdownMenu>
                    <ElDropdownItem :disabled="row.isPrimary" @click="handleSetPrimary(row)">
                      設為主要
                    </ElDropdownItem>
                    <ElDropdownItem @click="handleToggleStatus(row)">
                      {{ row.status === "active" ? "停用" : "啟用" }}
                    </ElDropdownItem>
                  </ElDropdownMenu>
                </template>
              </ElDropdown>
            </div>
          </template>
        </ElTableColumn>
      </ElTable>

      <div v-else class="px-6 py-14 max-[760px]:px-4">
        <ElEmpty
          :description="
            contacts.length === 0 ? EMPTY_STATE_COPY.empty.title : EMPTY_STATE_COPY.noResult.title
          "
        >
          <p class="mb-3 text-sm text-slate-500">
            {{
              contacts.length === 0
                ? EMPTY_STATE_COPY.empty.description
                : EMPTY_STATE_COPY.noResult.description
            }}
          </p>
          <ElButton type="primary" @click="contacts.length === 0 ? openCreateContactDrawer() : resetFilters()">
            {{
              contacts.length === 0
                ? EMPTY_STATE_COPY.empty.action
                : EMPTY_STATE_COPY.noResult.action
            }}
          </ElButton>
        </ElEmpty>
      </div>

      <div
        class="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-5 max-[760px]:px-4"
      >
        <ElPagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          layout="total, prev, pager, next"
          :total="filteredContacts.length"
          background
        />

        <ElSelect v-model="pageSize" class="!w-[96px]" @change="currentPage = 1">
          <ElOption :value="10" label="10 Item" />
          <ElOption :value="20" label="20 Item" />
          <ElOption :value="50" label="50 Item" />
        </ElSelect>
      </div>
    </section>

    <ElDrawer
      v-model="contactDrawerOpen"
      title="聯絡人資料"
      direction="rtl"
      size="520px"
      destroy-on-close
    >
      <template v-if="viewingContact">
        <div class="grid gap-5">
          <section class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
            <div class="grid gap-2">
              <h3 class="text-xl font-semibold text-slate-900">{{ viewingContact.name }}</h3>
              <p class="text-sm text-slate-500">
                {{ viewingContact.roleLabel }} / {{ viewingContact.title }}
              </p>
            </div>

            <div class="mt-4 flex flex-wrap items-center gap-2">
              <ElTag :type="viewingContact.isPrimary ? 'primary' : 'info'" round effect="light">
                {{ viewingContact.isPrimary ? "主要聯絡人" : "一般聯絡人" }}
              </ElTag>
              <ElTag
                :type="viewingContact.status === 'active' ? 'success' : 'info'"
                round
                effect="light"
              >
                {{ viewingContact.status === "active" ? "啟用中" : "未啟用" }}
              </ElTag>
            </div>
          </section>

          <section class="rounded-3xl border border-slate-200 bg-white p-5">
            <div class="grid gap-3 text-sm text-slate-600">
              <p>部門：{{ viewingContact.department || "-" }}</p>
              <p>Email：{{ viewingContact.email || "-" }}</p>
              <p>電話 / 手機：{{ viewingContact.mobile || viewingContact.phone || "-" }}</p>
              <p>所屬客戶：{{ viewingContact.accountName }}</p>
              <p>地區：{{ viewingContact.region }}</p>
              <p>負責業務：{{ viewingContact.owner }}</p>
              <p>最近聯繫時間：{{ formatDate(viewingContact.lastContactAt, true) }}</p>
              <p class="leading-7">備註：{{ viewingContact.notes || "目前尚無備註。" }}</p>
            </div>
          </section>
        </div>
      </template>

      <template #footer>
        <div class="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          <ElButton @click="contactDrawerOpen = false">關閉</ElButton>
          <ElButton
            @click="
              contactDrawerOpen = false;
              openEditContactDrawer(viewingContact);
            "
          >
            編輯
          </ElButton>
          <ElButton :disabled="viewingContact?.isPrimary" @click="handleSetPrimary(viewingContact)">
            設為主要
          </ElButton>
          <ElButton @click="handleToggleStatus(viewingContact)">
            {{ viewingContact?.status === "active" ? "停用" : "啟用" }}
          </ElButton>
          <ElButton type="primary" @click="jumpToAccount(viewingContact)">
            跳到客戶詳情
          </ElButton>
        </div>
      </template>
    </ElDrawer>

    <ContactFormDrawer
      v-model="contactFormOpen"
      :mode="contactFormMode"
      :contact="editingContact"
      @submit="handleSubmitContact"
    />
  </div>
</template>
