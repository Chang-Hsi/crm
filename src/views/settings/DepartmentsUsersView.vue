<script setup>
import { computed, reactive, ref, watch } from "vue";
import {
  ElAvatar,
  ElButton,
  ElDatePicker,
  ElDescriptions,
  ElDescriptionsItem,
  ElDrawer,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessageBox,
  ElNotification,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
} from "element-plus";
import { CirclePlus, Filter, Refresh, Search } from "@element-plus/icons-vue";
import {
  buildPermissionBundle,
  companyTenants,
  employeeAccounts,
  roleCatalog,
} from "../../data/auth";
import { accountList } from "../../data/accounts";

const tenantCode = ref(companyTenants[0]?.code || "");
const filterPanelOpen = ref(false);
const currentPage = ref(1);
const pageSize = ref(10);

const drawerOpen = ref(false);
const drawerMode = ref("view");
const activeTab = ref("basic");
const activeUserId = ref("");

const userOverrides = reactive({});
const customUsers = ref([]);

const userStatusMap = {
  active: { label: "啟用中", type: "success" },
  inactive: { label: "停用", type: "info" },
  pending: { label: "待啟用", type: "warning" },
};

const avatarByUserId = {
  "u-001": "https://i.pravatar.cc/64?img=12",
  "u-002": "https://i.pravatar.cc/64?img=15",
  "u-003": "https://i.pravatar.cc/64?img=22",
  "u-004": "https://i.pravatar.cc/64?img=32",
  "u-005": "https://i.pravatar.cc/64?img=40",
  "u-006": "https://i.pravatar.cc/64?img=48",
  "u-007": "https://i.pravatar.cc/64?img=52",
  "u-008": "https://i.pravatar.cc/64?img=56",
  "u-009": "https://i.pravatar.cc/64?img=58",
  "u-010": "https://i.pravatar.cc/64?img=60",
  "u-011": "https://i.pravatar.cc/64?img=62",
  "u-012": "https://i.pravatar.cc/64?img=65",
};

const userMetaMap = {
  "u-001": {
    employeeId: "E-1001",
    department: "Administration",
    title: "CRM Platform Admin",
    timezone: "Asia/Taipei",
    locale: "zh-TW",
    status: "active",
    updatedAt: "2026-04-10 11:20",
    lastLoginAt: "2026-04-10 10:38",
    scopeByTenant: {
      "GMN-TW": "all",
      "BFN-SEA": "department",
    },
  },
  "u-002": {
    employeeId: "E-2008",
    department: "Business Development",
    title: "Senior BD Manager",
    timezone: "Asia/Taipei",
    locale: "zh-TW",
    status: "active",
    updatedAt: "2026-04-09 18:05",
    lastLoginAt: "2026-04-10 09:12",
    scopeByTenant: {
      "GMN-TW": "assigned_accounts",
      "NXG-JP": "department",
    },
  },
  "u-005": {
    employeeId: "E-3016",
    department: "Finance",
    title: "Finance Controller",
    timezone: "Asia/Taipei",
    locale: "zh-TW",
    status: "active",
    updatedAt: "2026-04-08 15:42",
    lastLoginAt: "2026-04-10 08:26",
    scopeByTenant: {
      "GMN-TW": "department",
      "BFN-SEA": "all",
    },
  },
};

const filters = reactive({
  keyword: "",
  roleId: "all",
  status: "all",
  department: "all",
  hasAccounts: "all",
  isCrossTenant: "all",
  tenantCode: tenantCode.value,
  dataScope: "all",
  sortBy: "updated_desc",
});

const form = reactive(createEmptyForm());

const roleFilterOptions = [
  { value: "all", label: "角色：全部" },
  ...Object.values(roleCatalog).map((role) => ({
    value: role.id,
    label: `角色：${role.label}`,
  })),
];

const statusFilterOptions = [
  { value: "all", label: "狀態：全部" },
  { value: "active", label: "啟用中" },
  { value: "inactive", label: "停用" },
  { value: "pending", label: "待啟用" },
];

const yesNoFilterOptions = [
  { value: "all", label: "全部" },
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
];

const scopeFilterOptions = [
  { value: "all", label: "資料範圍：全部" },
  { value: "self", label: "self" },
  { value: "department", label: "department" },
  { value: "assigned_accounts", label: "assigned_accounts" },
  { value: "all_scope", label: "all" },
];

const sortOptions = [
  { value: "updated_desc", label: "排序：最近更新優先" },
  { value: "role", label: "排序：角色" },
  { value: "department", label: "排序：部門" },
  { value: "owned_accounts_desc", label: "排序：負責 Account 數" },
  { value: "tenant_count_desc", label: "排序：租戶數" },
];

const baseUsers = computed(() =>
  employeeAccounts.map((item) => {
    const meta = userMetaMap[item.id] || {};
    const override = userOverrides[item.id] || {};
    const mergedMemberships = (override.tenantMemberships || item.tenantMemberships || []).map(
      (membership) => normalizeMembership(membership)
    );

    return enrichUser({
      id: item.id,
      account: item.account,
      email: item.email,
      displayName: item.displayName,
      employeeId: meta.employeeId || item.id,
      department: meta.department || "未分配",
      title: meta.title || "-",
      timezone: meta.timezone || "Asia/Taipei",
      locale: meta.locale || "zh-TW",
      status: meta.status || "active",
      updatedAt: meta.updatedAt || "2026-04-10 10:00",
      lastLoginAt: meta.lastLoginAt || "",
      scopeByTenant: { ...(meta.scopeByTenant || {}), ...(override.scopeByTenant || {}) },
      tenantMemberships: mergedMemberships,
      source: "system",
      canEdit: true,
      canDisable: true,
      ...override,
    });
  })
);

const allUsers = computed(() => [...baseUsers.value, ...customUsers.value].map(enrichUser));

const departmentFilterOptions = computed(() => [
  { value: "all", label: "部門：全部" },
  ...[...new Set(allUsers.value.map((user) => user.department))].map((department) => ({
    value: department,
    label: `部門：${department}`,
  })),
]);

const tenantFilterOptions = computed(() => [
  { value: "all", label: "租戶：全部" },
  ...companyTenants.map((tenant) => ({
    value: tenant.code,
    label: `租戶：${tenant.shortName}`,
  })),
]);

const selectedTenant = computed(
  () => companyTenants.find((tenant) => tenant.code === tenantCode.value) || null
);

const filteredUsers = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  let rows = allUsers.value.filter((user) => {
    const matchesKeyword =
      keyword.length === 0 ||
      user.displayName.toLowerCase().includes(keyword) ||
      user.account.toLowerCase().includes(keyword) ||
      user.email.toLowerCase().includes(keyword);

    if (!matchesKeyword) {
      return false;
    }

    if (filters.tenantCode !== "all" && !user.tenantMemberships.some((m) => m.tenantCode === filters.tenantCode)) {
      return false;
    }

    const contextMembership = getMembershipInTenant(user, filters.tenantCode);

    if (filters.roleId !== "all") {
      const roleMatched =
        contextMembership?.roleIds.includes(filters.roleId) ||
        user.tenantMemberships.some((membership) => membership.roleIds.includes(filters.roleId));

      if (!roleMatched) {
        return false;
      }
    }

    if (filters.status !== "all" && user.status !== filters.status) {
      return false;
    }

    if (filters.department !== "all" && user.department !== filters.department) {
      return false;
    }

    if (filters.hasAccounts === "yes" && user.ownedAccountCount === 0) {
      return false;
    }

    if (filters.hasAccounts === "no" && user.ownedAccountCount > 0) {
      return false;
    }

    if (filters.isCrossTenant === "yes" && !user.isCrossTenant) {
      return false;
    }

    if (filters.isCrossTenant === "no" && user.isCrossTenant) {
      return false;
    }

    if (filters.dataScope !== "all") {
      const compareScope = filters.dataScope === "all_scope" ? "all" : filters.dataScope;
      const scopeMatched =
        (contextMembership ? user.scopeByTenant[contextMembership.tenantCode] : "self") ===
        compareScope;

      if (!scopeMatched) {
        return false;
      }
    }

    return true;
  });

  rows = rows.sort((a, b) => {
    if (filters.sortBy === "role") {
      return a.contextPrimaryRoleLabel.localeCompare(b.contextPrimaryRoleLabel, "zh-Hant");
    }

    if (filters.sortBy === "department") {
      return a.department.localeCompare(b.department, "zh-Hant");
    }

    if (filters.sortBy === "owned_accounts_desc") {
      return b.ownedAccountCount - a.ownedAccountCount;
    }

    if (filters.sortBy === "tenant_count_desc") {
      return b.tenantCount - a.tenantCount;
    }

    return toTimestamp(b.updatedAt) - toTimestamp(a.updatedAt);
  });

  return rows;
});

const pagedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredUsers.value.slice(start, start + pageSize.value);
});

const activeUser = computed(() => {
  if (!activeUserId.value) {
    return null;
  }

  return allUsers.value.find((user) => user.id === activeUserId.value) || null;
});

const drawerUser = computed(() => {
  if (!drawerOpen.value) {
    return null;
  }

  if (drawerMode.value === "view") {
    return activeUser.value;
  }

  return enrichUser({
    id: form.id.trim(),
    account: form.account.trim(),
    email: form.email.trim(),
    displayName: form.displayName.trim(),
    employeeId: form.employeeId.trim(),
    department: form.department.trim(),
    title: form.title.trim(),
    timezone: form.timezone.trim(),
    locale: form.locale.trim(),
    status: form.status,
    updatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
    lastLoginAt: form.lastLoginAt,
    scopeByTenant: { ...form.scopeByTenant },
    tenantMemberships: form.tenantMemberships.map((membership) => normalizeMembership(membership)),
    source: drawerMode.value === "create" ? "custom" : activeUser.value?.source || "system",
    canEdit: true,
    canDisable: true,
  });
});

const drawerContextTenantCode = computed(() => {
  if (drawerMode.value === "view") {
    return tenantCode.value;
  }

  return form.contextTenantCode || tenantCode.value;
});

const drawerMembership = computed(() => {
  if (!drawerUser.value) {
    return null;
  }

  return getMembershipInTenant(drawerUser.value, drawerContextTenantCode.value);
});

const drawerPermissionBundle = computed(() => {
  if (!drawerMembership.value) {
    return {
      visibleSections: [],
      permissions: [],
    };
  }

  return buildPermissionBundle(drawerMembership.value.roleIds || []);
});

const drawerOwnedAccounts = computed(() => drawerUser.value?.ownedAccounts || []);

const drawerTenantMembershipRows = computed(() => drawerUser.value?.tenantMemberships || []);

function createEmptyForm() {
  return {
    id: "",
    account: "",
    email: "",
    displayName: "",
    employeeId: "",
    department: "",
    title: "",
    timezone: "Asia/Taipei",
    locale: "zh-TW",
    status: "pending",
    lastLoginAt: "",
    contextTenantCode: tenantCode.value,
    tenantMemberships: [
      {
        tenantCode: tenantCode.value,
        primaryRoleId: "bd_sales",
        roleIds: ["bd_sales"],
        enabled: true,
        defaultDashboardRouteName:
          roleCatalog.bd_sales?.defaultDashboardRouteName || "dashboard-overview",
      },
    ],
    scopeByTenant: {
      [tenantCode.value]: "self",
    },
  };
}

function normalizeMembership(membership) {
  const roleIds = uniqueArray(membership.roleIds || [membership.primaryRoleId]).filter(Boolean);
  const primaryRoleId = membership.primaryRoleId || roleIds[0] || "bd_sales";

  if (!roleIds.includes(primaryRoleId)) {
    roleIds.unshift(primaryRoleId);
  }

  return {
    tenantCode: membership.tenantCode,
    primaryRoleId,
    roleIds,
    enabled: membership.enabled ?? true,
    defaultDashboardRouteName:
      membership.defaultDashboardRouteName ||
      roleCatalog[primaryRoleId]?.defaultDashboardRouteName ||
      "dashboard-overview",
  };
}

function uniqueArray(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function enrichUser(user) {
  const memberships = (user.tenantMemberships || []).map((membership) => normalizeMembership(membership));
  const ownedAccounts = accountList.filter((account) => account.ownerUserId === user.id);
  const contextMembership = getMembershipInTenant(
    { ...user, tenantMemberships: memberships },
    filters.tenantCode || tenantCode.value
  );

  return {
    ...user,
    avatarUrl: user.avatarUrl || avatarByUserId[user.id] || "",
    initials: getInitials(user.displayName || user.account || user.id),
    tenantMemberships: memberships,
    scopeByTenant: { ...(user.scopeByTenant || {}) },
    tenantCount: memberships.length,
    isCrossTenant: memberships.length > 1,
    contextMembership,
    contextPrimaryRoleId: contextMembership?.primaryRoleId || memberships[0]?.primaryRoleId || "",
    contextPrimaryRoleLabel: roleCatalog[contextMembership?.primaryRoleId || memberships[0]?.primaryRoleId]?.label || "-",
    additionalRoleCount: Math.max((contextMembership?.roleIds?.length || 0) - 1, 0),
    ownedAccounts,
    ownedAccountCount: ownedAccounts.length,
    ownedOpportunityCount: ownedAccounts.reduce((sum, account) => sum + (account.opportunityCount || 0), 0),
    ownedContractCount: ownedAccounts.reduce((sum, account) => sum + (account.contractCount || 0), 0),
    ownedProjectCount: ownedAccounts.reduce((sum, account) => sum + (account.projectCount || 0), 0),
    typeDistribution: summarizeDistribution(ownedAccounts, "companyType"),
    regionDistribution: summarizeDistribution(ownedAccounts, "region"),
    lifecycleDistribution: summarizeDistribution(ownedAccounts, "lifecycleStage"),
  };
}

function summarizeDistribution(rows, field) {
  const counts = rows.reduce((map, row) => {
    const key = row[field] || "未分類";
    map[key] = (map[key] || 0) + 1;
    return map;
  }, {});

  return Object.entries(counts)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);
}

function getMembershipInTenant(user, targetTenantCode) {
  if (!user?.tenantMemberships?.length) {
    return null;
  }

  if (!targetTenantCode || targetTenantCode === "all") {
    return user.tenantMemberships[0] || null;
  }

  return user.tenantMemberships.find((membership) => membership.tenantCode === targetTenantCode) || null;
}

function getStatusMeta(status) {
  return userStatusMap[status] || { label: status || "未知", type: "info" };
}

function scopeLabel(scope) {
  if (scope === "self") {
    return "self";
  }

  if (scope === "department") {
    return "department";
  }

  if (scope === "assigned_accounts") {
    return "assigned_accounts";
  }

  if (scope === "all") {
    return "all";
  }

  return scope || "self";
}

function roleLabel(roleId) {
  return roleCatalog[roleId]?.label || roleId || "-";
}

function toTimestamp(value) {
  if (!value) {
    return 0;
  }

  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) {
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

function getInitials(value) {
  return String(value || "U")
    .split(/[\s.-]+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function resetFilters() {
  filters.keyword = "";
  filters.roleId = "all";
  filters.status = "all";
  filters.department = "all";
  filters.hasAccounts = "all";
  filters.isCrossTenant = "all";
  filters.tenantCode = tenantCode.value;
  filters.dataScope = "all";
  filters.sortBy = "updated_desc";
  currentPage.value = 1;
}

function openUserDrawer(userId, mode = "view") {
  activeUserId.value = userId;
  drawerMode.value = mode;
  activeTab.value = "basic";

  if (mode === "view") {
    drawerOpen.value = true;
    return;
  }

  const user = allUsers.value.find((item) => item.id === userId);
  if (!user) {
    return;
  }

  hydrateForm(user);
  drawerOpen.value = true;
}

function openCreateDrawer() {
  drawerMode.value = "create";
  activeTab.value = "basic";
  activeUserId.value = "";

  Object.assign(form, createEmptyForm());
  drawerOpen.value = true;
}

function hydrateForm(user) {
  form.id = user.id;
  form.account = user.account;
  form.email = user.email;
  form.displayName = user.displayName;
  form.employeeId = user.employeeId || user.id;
  form.department = user.department || "";
  form.title = user.title || "";
  form.timezone = user.timezone || "Asia/Taipei";
  form.locale = user.locale || "zh-TW";
  form.status = user.status || "active";
  form.lastLoginAt = user.lastLoginAt || "";
  form.contextTenantCode = tenantCode.value;
  form.tenantMemberships = user.tenantMemberships.map((membership) => ({ ...membership }));
  form.scopeByTenant = { ...user.scopeByTenant };
}

function closeDrawer() {
  drawerOpen.value = false;
  drawerMode.value = "view";
}

function createMembershipRow() {
  const tenant = companyTenants.find(
    (item) => !form.tenantMemberships.some((membership) => membership.tenantCode === item.code)
  );

  const tenantCodeValue = tenant?.code || companyTenants[0]?.code || "";

  form.tenantMemberships.push({
    tenantCode: tenantCodeValue,
    primaryRoleId: "bd_sales",
    roleIds: ["bd_sales"],
    enabled: true,
    defaultDashboardRouteName:
      roleCatalog.bd_sales?.defaultDashboardRouteName || "dashboard-overview",
  });

  form.scopeByTenant[tenantCodeValue] = form.scopeByTenant[tenantCodeValue] || "self";
}

function removeMembershipRow(index) {
  const removed = form.tenantMemberships[index];
  form.tenantMemberships.splice(index, 1);

  if (removed?.tenantCode && !form.tenantMemberships.some((m) => m.tenantCode === removed.tenantCode)) {
    delete form.scopeByTenant[removed.tenantCode];
  }
}

function syncMembershipPrimaryRole(membership) {
  if (!membership.roleIds.includes(membership.primaryRoleId)) {
    membership.roleIds = uniqueArray([membership.primaryRoleId, ...membership.roleIds]);
  }

  membership.defaultDashboardRouteName =
    roleCatalog[membership.primaryRoleId]?.defaultDashboardRouteName || "dashboard-overview";
}

function syncMembershipRoleIds(membership) {
  membership.roleIds = uniqueArray(membership.roleIds);

  if (!membership.roleIds.includes(membership.primaryRoleId)) {
    membership.primaryRoleId = membership.roleIds[0] || "bd_sales";
  }

  membership.defaultDashboardRouteName =
    roleCatalog[membership.primaryRoleId]?.defaultDashboardRouteName || "dashboard-overview";
}

function validateForm() {
  if (!form.displayName.trim() || !form.account.trim() || !form.email.trim()) {
    notify("請填寫顯示名稱、account、email", "缺少資訊", "warning");
    return false;
  }

  if (form.tenantMemberships.length === 0) {
    notify("至少需要一筆租戶 membership", "缺少資訊", "warning");
    return false;
  }

  const hasDuplicateTenant =
    uniqueArray(form.tenantMemberships.map((membership) => membership.tenantCode)).length !==
    form.tenantMemberships.length;

  if (hasDuplicateTenant) {
    notify("同一使用者不可重複設定相同租戶 membership", "格式錯誤", "warning");
    return false;
  }

  if (
    drawerMode.value === "create" &&
    allUsers.value.some((user) => user.account.toLowerCase() === form.account.trim().toLowerCase())
  ) {
    notify("account 已存在，請改用其他帳號", "資料重複", "warning");
    return false;
  }

  return true;
}

function saveUser() {
  if (!validateForm()) {
    return;
  }

  const now = new Date().toISOString().replace("T", " ").slice(0, 16);
  const payload = {
    id: form.id || `emp-${form.account.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
    account: form.account.trim(),
    email: form.email.trim(),
    displayName: form.displayName.trim(),
    employeeId: form.employeeId.trim() || form.id,
    department: form.department.trim() || "未分配",
    title: form.title.trim() || "-",
    timezone: form.timezone.trim() || "Asia/Taipei",
    locale: form.locale.trim() || "zh-TW",
    status: form.status,
    updatedAt: now,
    lastLoginAt: form.lastLoginAt || "",
    scopeByTenant: { ...form.scopeByTenant },
    tenantMemberships: form.tenantMemberships.map((membership) => normalizeMembership(membership)),
    source: drawerMode.value === "create" ? "custom" : activeUser.value?.source || "system",
    canEdit: true,
    canDisable: true,
  };

  if (drawerMode.value === "create") {
    customUsers.value.unshift(enrichUser(payload));
    activeUserId.value = payload.id;
    drawerMode.value = "view";
    notify(`已建立使用者：${payload.displayName}`);
    return;
  }

  if (activeUser.value?.source === "system") {
    userOverrides[payload.id] = {
      ...(userOverrides[payload.id] || {}),
      ...payload,
    };
  } else {
    customUsers.value = customUsers.value.map((user) =>
      user.id === activeUser.value?.id ? enrichUser({ ...user, ...payload }) : user
    );
  }

  drawerMode.value = "view";
  notify(`已更新使用者：${payload.displayName}`);
}

async function toggleUserStatus(user) {
  const nextStatus = user.status === "inactive" ? "active" : "inactive";
  const actionText = nextStatus === "inactive" ? "停用" : "啟用";

  try {
    await ElMessageBox.confirm(
      nextStatus === "inactive" && user.ownedAccountCount > 0
        ? `此使用者目前仍負責 ${user.ownedAccountCount} 筆 account，確定要${actionText}？`
        : `確定要${actionText}使用者「${user.displayName}」？`,
      `${actionText}使用者`,
      {
        confirmButtonText: actionText,
        cancelButtonText: "取消",
        type: nextStatus === "inactive" ? "warning" : "info",
      }
    );
  } catch {
    return;
  }

  if (user.source === "system") {
    userOverrides[user.id] = {
      ...(userOverrides[user.id] || {}),
      status: nextStatus,
      updatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
    };
  } else {
    customUsers.value = customUsers.value.map((item) =>
      item.id === user.id
        ? {
            ...item,
            status: nextStatus,
            updatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
          }
        : item
    );
  }

  notify(`${user.displayName} 已${actionText}`);
}

function notify(message, title = "已更新", type = "success") {
  ElNotification({
    title,
    message,
    type,
    position: "top-right",
  });
}

watch(
  () => [
    filteredUsers.value.length,
    pageSize.value,
    filters.keyword,
    filters.roleId,
    filters.status,
    filters.department,
    filters.hasAccounts,
    filters.isCrossTenant,
    filters.tenantCode,
    filters.dataScope,
    filters.sortBy,
  ],
  () => {
    currentPage.value = 1;
  }
);

watch(
  () => tenantCode.value,
  (value) => {
    filters.tenantCode = value;
  }
);

watch(
  () => drawerOpen.value,
  (open) => {
    if (!open) {
      drawerMode.value = "view";
    }
  }
);
</script>

<template>
  <div class="min-h-full p-8">
    <section class="grid gap-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-2">
          <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">
            部門與使用者
          </h1>
          <p class="text-sm text-slate-500">
            租戶成員、角色指派、資料範圍與負責資料管理
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElSelect v-model="tenantCode" class="!w-[230px]">
            <ElOption
              v-for="tenant in companyTenants"
              :key="tenant.code"
              :label="`${tenant.shortName}（${tenant.code}）`"
              :value="tenant.code"
            />
          </ElSelect>
          <ElButton :icon="Refresh" @click="resetFilters">重新整理</ElButton>
          <ElButton type="primary" :icon="CirclePlus" @click="openCreateDrawer">
            新增使用者
          </ElButton>
        </div>
      </header>

      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white px-6 py-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <ElInput
              v-model="filters.keyword"
              placeholder="搜尋姓名 / account / email"
              clearable
              class="!w-80"
            >
              <template #prefix>
                <Search class="h-4 w-4 text-slate-400" />
              </template>
            </ElInput>
            <ElButton
              :icon="Filter"
              :type="filterPanelOpen ? 'primary' : 'default'"
              @click="filterPanelOpen = !filterPanelOpen"
            >
              Filter
            </ElButton>
            <ElButton :icon="Refresh" @click="resetFilters">重設</ElButton>
          </div>
          <ElTag round effect="plain">
            {{ selectedTenant?.name || tenantCode }} / 共 {{ filteredUsers.length }} 位
          </ElTag>
        </div>

        <transition
          enter-active-class="transition-all duration-300 ease-out overflow-hidden"
          leave-active-class="transition-all duration-200 ease-in overflow-hidden"
          enter-from-class="max-h-0 opacity-0"
          enter-to-class="max-h-[1000px] opacity-100"
          leave-from-class="max-h-[1000px] opacity-100"
          leave-to-class="max-h-0 opacity-0"
        >
          <ElForm
            v-if="filterPanelOpen"
            class="mt-4 grid gap-3 border-t border-slate-200 bg-white px-1 pt-4 md:grid-cols-2 xl:grid-cols-4"
          >
            <ElFormItem class="mb-0">
              <ElSelect v-model="filters.roleId">
                <ElOption
                  v-for="item in roleFilterOptions"
                  :key="`role-filter-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem class="mb-0">
              <ElSelect v-model="filters.status">
                <ElOption
                  v-for="item in statusFilterOptions"
                  :key="`status-filter-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem class="mb-0">
              <ElSelect v-model="filters.department">
                <ElOption
                  v-for="item in departmentFilterOptions"
                  :key="`dept-filter-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem class="mb-0">
              <ElSelect v-model="filters.hasAccounts">
                <ElOption
                  v-for="item in yesNoFilterOptions"
                  :key="`has-account-${item.value}`"
                  :label="`有負責 account：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem class="mb-0">
              <ElSelect v-model="filters.isCrossTenant">
                <ElOption
                  v-for="item in yesNoFilterOptions"
                  :key="`cross-tenant-${item.value}`"
                  :label="`跨租戶：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem class="mb-0">
              <ElSelect v-model="filters.tenantCode">
                <ElOption
                  v-for="item in tenantFilterOptions"
                  :key="`tenant-filter-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem class="mb-0">
              <ElSelect v-model="filters.dataScope">
                <ElOption
                  v-for="item in scopeFilterOptions"
                  :key="`scope-filter-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem class="mb-0">
              <ElSelect v-model="filters.sortBy">
                <ElOption
                  v-for="item in sortOptions"
                  :key="`sort-filter-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </transition>

        <div class="mt-4 border-t border-slate-200"></div>

        <ElTable
          table-layout="auto"
          :data="pagedUsers"
          class="user-table"
          @row-click="(row) => openUserDrawer(row.id, 'view')"
        >
          <ElTableColumn label="使用者" min-width="250">
            <template #default="{ row }">
              <div class="flex items-center gap-3">
                <ElAvatar :size="36" :src="row.avatarUrl">{{ row.initials }}</ElAvatar>
                <div class="grid gap-0.5">
                  <p class="text-sm font-semibold text-slate-900">{{ row.displayName }}</p>
                  <p class="text-xs text-slate-500">{{ row.account }}</p>
                </div>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="Email" min-width="230" show-overflow-tooltip>
            <template #default="{ row }">{{ row.email }}</template>
          </ElTableColumn>

          <ElTableColumn label="Primary Role" min-width="150">
            <template #default="{ row }">
              <ElTag size="small" effect="light" type="success">
                {{ row.contextPrimaryRoleLabel }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="附加角色" min-width="96" align="right">
            <template #default="{ row }">{{ row.additionalRoleCount }}</template>
          </ElTableColumn>

          <ElTableColumn label="部門" min-width="160">
            <template #default="{ row }">{{ row.department }}</template>
          </ElTableColumn>

          <ElTableColumn label="狀態" min-width="100">
            <template #default="{ row }">
              <ElTag :type="getStatusMeta(row.status).type" size="small" effect="light">
                {{ getStatusMeta(row.status).label }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="租戶數" min-width="90" align="right">
            <template #default="{ row }">{{ row.tenantCount }}</template>
          </ElTableColumn>

          <ElTableColumn label="負責 Account" min-width="120" align="right">
            <template #default="{ row }">{{ row.ownedAccountCount }}</template>
          </ElTableColumn>

          <ElTableColumn label="最近更新" min-width="150">
            <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
          </ElTableColumn>

          <ElTableColumn label="操作" width="190" fixed="right">
            <template #default="{ row }">
              <div class="flex items-center justify-end gap-1">
                <ElButton text type="primary" @click.stop="openUserDrawer(row.id, 'view')">
                  查看
                </ElButton>
                <ElButton text @click.stop="openUserDrawer(row.id, 'edit')">編輯</ElButton>
                <ElButton text @click.stop="toggleUserStatus(row)">
                  {{ row.status === "inactive" ? "啟用" : "停用" }}
                </ElButton>
              </div>
            </template>
          </ElTableColumn>
        </ElTable>

        <ElEmpty
          v-if="pagedUsers.length === 0"
          class="py-8"
          description="目前沒有符合條件的使用者"
          :image-size="90"
        />

        <div
          class="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-5"
        >
          <ElPagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            layout="total, prev, pager, next"
            :total="filteredUsers.length"
            background
          />

          <ElSelect v-model="pageSize" class="!w-[96px]" @change="currentPage = 1">
            <ElOption :value="10" label="10 Item" />
            <ElOption :value="20" label="20 Item" />
            <ElOption :value="50" label="50 Item" />
          </ElSelect>
        </div>
      </section>
    </section>

    <ElDrawer
      v-model="drawerOpen"
      :size="'58%'"
      :destroy-on-close="false"
      :show-close="true"
      :title="drawerMode === 'create' ? '新增使用者' : drawerMode === 'edit' ? '編輯使用者' : '使用者詳情'"
    >
      <template v-if="drawerUser">
        <section class="grid gap-4">
          <header class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="flex items-start gap-3">
                <ElAvatar :size="48" :src="drawerUser.avatarUrl">{{ drawerUser.initials }}</ElAvatar>
                <div class="grid gap-1">
                  <h2 class="text-xl font-semibold text-slate-900">
                    {{ drawerUser.displayName || "未命名使用者" }}
                  </h2>
                  <p class="text-xs text-slate-500">
                    {{ drawerUser.account || "-" }} / {{ drawerUser.email || "-" }}
                  </p>
                  <div class="flex flex-wrap items-center gap-1">
                    <ElTag :type="getStatusMeta(drawerUser.status).type" size="small" effect="light">
                      {{ getStatusMeta(drawerUser.status).label }}
                    </ElTag>
                    <ElTag size="small" effect="plain">租戶 {{ drawerUser.tenantCount }}</ElTag>
                    <ElTag size="small" effect="plain">
                      負責 Account {{ drawerUser.ownedAccountCount }}
                    </ElTag>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <template v-if="drawerMode === 'view'">
                  <ElButton @click="openUserDrawer(drawerUser.id, 'edit')">編輯</ElButton>
                  <ElButton @click="toggleUserStatus(drawerUser)">
                    {{ drawerUser.status === "inactive" ? "啟用" : "停用" }}
                  </ElButton>
                </template>
                <template v-else>
                  <ElButton @click="closeDrawer">取消</ElButton>
                  <ElButton type="primary" @click="saveUser">儲存</ElButton>
                </template>
              </div>
            </div>
          </header>

          <div class="border-b border-slate-200 px-1 pt-1">
            <ElTabs v-model="activeTab" class="detail-tabs">
              <ElTabPane name="basic" label="基本資訊" />
              <ElTabPane name="roles" label="角色與權限" />
              <ElTabPane name="scope" label="資料範圍" />
              <ElTabPane name="accounts" label="負責資料" />
              <ElTabPane name="memberships" label="租戶 Membership" />
            </ElTabs>
          </div>

          <section class="grid gap-4">
            <template v-if="activeTab === 'basic'">
              <template v-if="drawerMode === 'view'">
                <ElDescriptions :column="2" border>
                  <ElDescriptionsItem label="顯示名稱">{{ drawerUser.displayName }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="Employee ID">{{ drawerUser.employeeId || "-" }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="account">{{ drawerUser.account }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="email">{{ drawerUser.email }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="狀態">{{ getStatusMeta(drawerUser.status).label }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="部門">{{ drawerUser.department }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="職稱">{{ drawerUser.title || "-" }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="時區 / 語系">
                    {{ drawerUser.timezone || "-" }} / {{ drawerUser.locale || "-" }}
                  </ElDescriptionsItem>
                  <ElDescriptionsItem label="最近登入">{{ formatDateTime(drawerUser.lastLoginAt) }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="最後更新">{{ formatDateTime(drawerUser.updatedAt) }}</ElDescriptionsItem>
                </ElDescriptions>
              </template>

              <template v-else>
                <ElForm label-position="top" class="grid gap-3">
                  <div class="grid gap-3 md:grid-cols-2">
                    <ElFormItem label="顯示名稱">
                      <ElInput v-model="form.displayName" />
                    </ElFormItem>
                    <ElFormItem label="Employee ID">
                      <ElInput v-model="form.employeeId" />
                    </ElFormItem>
                    <ElFormItem label="account">
                      <ElInput v-model="form.account" :disabled="drawerMode === 'edit'" />
                    </ElFormItem>
                    <ElFormItem label="email">
                      <ElInput v-model="form.email" />
                    </ElFormItem>
                    <ElFormItem label="狀態">
                      <ElSelect v-model="form.status">
                        <ElOption label="啟用中" value="active" />
                        <ElOption label="停用" value="inactive" />
                        <ElOption label="待啟用" value="pending" />
                      </ElSelect>
                    </ElFormItem>
                    <ElFormItem label="部門">
                      <ElInput v-model="form.department" placeholder="例如：Business Development" />
                    </ElFormItem>
                    <ElFormItem label="職稱">
                      <ElInput v-model="form.title" />
                    </ElFormItem>
                    <ElFormItem label="最近登入（可選）">
                      <ElDatePicker
                        v-model="form.lastLoginAt"
                        type="datetime"
                        value-format="YYYY-MM-DD HH:mm"
                        class="!w-full"
                      />
                    </ElFormItem>
                    <ElFormItem label="時區">
                      <ElInput v-model="form.timezone" />
                    </ElFormItem>
                    <ElFormItem label="語系">
                      <ElInput v-model="form.locale" />
                    </ElFormItem>
                  </div>
                </ElForm>
              </template>
            </template>

            <template v-else-if="activeTab === 'roles'">
              <article class="panel-card">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h3 class="panel-title">角色與權限（租戶視角）</h3>
                  <ElSelect
                    v-if="drawerMode !== 'view'"
                    v-model="form.contextTenantCode"
                    class="!w-[220px]"
                  >
                    <ElOption
                      v-for="item in companyTenants"
                      :key="`ctx-tenant-${item.code}`"
                      :label="`${item.shortName}（${item.code}）`"
                      :value="item.code"
                    />
                  </ElSelect>
                  <ElTag v-else size="small" effect="plain">
                    {{ drawerContextTenantCode }}
                  </ElTag>
                </div>

                <template v-if="drawerMembership">
                  <div class="mt-3 grid gap-3 md:grid-cols-2">
                    <article class="rounded-xl border border-slate-200 px-3 py-3">
                      <p class="text-sm font-semibold text-slate-800">Primary Role</p>
                      <p class="mt-2 text-sm text-slate-700">
                        {{ roleLabel(drawerMembership.primaryRoleId) }}
                      </p>
                    </article>

                    <article class="rounded-xl border border-slate-200 px-3 py-3">
                      <p class="text-sm font-semibold text-slate-800">附加角色</p>
                      <div class="mt-2 flex flex-wrap gap-1">
                        <ElTag
                          v-for="roleId in drawerMembership.roleIds"
                          :key="`drawer-role-${roleId}`"
                          size="small"
                          effect="light"
                          type="success"
                        >
                          {{ roleLabel(roleId) }}
                        </ElTag>
                      </div>
                    </article>
                  </div>

                  <div class="mt-3 grid gap-3 md:grid-cols-2">
                    <article class="rounded-xl border border-slate-200 px-3 py-3">
                      <p class="text-sm font-semibold text-slate-800">可見模組</p>
                      <div class="mt-2 flex flex-wrap gap-1">
                        <ElTag
                          v-for="section in drawerPermissionBundle.visibleSections"
                          :key="`section-${section}`"
                          size="small"
                          effect="plain"
                        >
                          {{ section }}
                        </ElTag>
                      </div>
                    </article>

                    <article class="rounded-xl border border-slate-200 px-3 py-3">
                      <p class="text-sm font-semibold text-slate-800">權限清單</p>
                      <div class="mt-2 flex max-h-44 flex-wrap gap-1 overflow-auto">
                        <ElTag
                          v-for="permission in drawerPermissionBundle.permissions"
                          :key="`permission-${permission}`"
                          size="small"
                          effect="plain"
                        >
                          {{ permission }}
                        </ElTag>
                      </div>
                    </article>
                  </div>
                </template>

                <template v-else>
                  <ElEmpty description="目前租戶尚未配置角色" :image-size="84" />
                </template>
              </article>
            </template>

            <template v-else-if="activeTab === 'scope'">
              <article class="panel-card">
                <h3 class="panel-title">資料範圍</h3>
                <div class="mt-3 grid gap-2">
                  <article
                    v-for="membership in drawerTenantMembershipRows"
                    :key="`scope-row-${membership.tenantCode}`"
                    class="rounded-xl border border-slate-200 px-3 py-3"
                  >
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <p class="text-sm font-medium text-slate-800">
                        {{ membership.tenantCode }} / {{ roleLabel(membership.primaryRoleId) }}
                      </p>
                      <template v-if="drawerMode === 'view'">
                        <ElTag size="small" effect="light" type="warning">
                          {{ scopeLabel(drawerUser.scopeByTenant[membership.tenantCode]) }}
                        </ElTag>
                      </template>
                      <template v-else>
                        <ElSelect
                          v-model="form.scopeByTenant[membership.tenantCode]"
                          class="!w-[200px]"
                        >
                          <ElOption label="self" value="self" />
                          <ElOption label="department" value="department" />
                          <ElOption label="assigned_accounts" value="assigned_accounts" />
                          <ElOption label="all" value="all" />
                        </ElSelect>
                      </template>
                    </div>
                  </article>
                </div>
              </article>
            </template>

            <template v-else-if="activeTab === 'accounts'">
              <div class="grid gap-4 lg:grid-cols-2">
                <article class="panel-card">
                  <h3 class="panel-title">負責資料摘要</h3>
                  <div class="mt-3 grid gap-2">
                    <p class="text-sm text-slate-700">負責 Account：{{ drawerUser.ownedAccountCount }}</p>
                    <p class="text-sm text-slate-700">關聯商機：{{ drawerUser.ownedOpportunityCount }}</p>
                    <p class="text-sm text-slate-700">關聯合約：{{ drawerUser.ownedContractCount }}</p>
                    <p class="text-sm text-slate-700">關聯專案：{{ drawerUser.ownedProjectCount }}</p>
                  </div>

                  <div class="mt-4 grid gap-2">
                    <p class="text-xs font-semibold text-slate-700">客戶類型分布</p>
                    <div class="flex flex-wrap gap-1">
                      <ElTag
                        v-for="item in drawerUser.typeDistribution"
                        :key="`type-dist-${item.key}`"
                        size="small"
                        effect="plain"
                      >
                        {{ item.key }}：{{ item.value }}
                      </ElTag>
                    </div>
                  </div>

                  <div class="mt-3 grid gap-2">
                    <p class="text-xs font-semibold text-slate-700">地區分布</p>
                    <div class="flex flex-wrap gap-1">
                      <ElTag
                        v-for="item in drawerUser.regionDistribution"
                        :key="`region-dist-${item.key}`"
                        size="small"
                        effect="plain"
                      >
                        {{ item.key }}：{{ item.value }}
                      </ElTag>
                    </div>
                  </div>

                  <div class="mt-3 grid gap-2">
                    <p class="text-xs font-semibold text-slate-700">Lifecycle 分布</p>
                    <div class="flex flex-wrap gap-1">
                      <ElTag
                        v-for="item in drawerUser.lifecycleDistribution"
                        :key="`life-dist-${item.key}`"
                        size="small"
                        effect="plain"
                      >
                        {{ item.key }}：{{ item.value }}
                      </ElTag>
                    </div>
                  </div>
                </article>

                <article class="panel-card">
                  <h3 class="panel-title">負責 Account 清單</h3>
                  <div class="mt-3 grid max-h-[360px] gap-2 overflow-auto">
                    <article
                      v-for="account in drawerOwnedAccounts"
                      :key="account.id"
                      class="rounded-xl border border-slate-200 px-3 py-2"
                    >
                      <p class="text-sm font-semibold text-slate-900">{{ account.companyName }}</p>
                      <p class="text-xs text-slate-500">{{ account.accountCode }} / {{ account.region }}</p>
                    </article>
                    <ElEmpty
                      v-if="drawerOwnedAccounts.length === 0"
                      description="尚無負責 Account"
                      :image-size="80"
                    />
                  </div>
                </article>
              </div>
            </template>

            <template v-else-if="activeTab === 'memberships'">
              <article class="panel-card">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h3 class="panel-title">租戶 Membership</h3>
                  <ElButton v-if="drawerMode !== 'view'" text type="primary" @click="createMembershipRow">
                    新增 Membership
                  </ElButton>
                </div>

                <div v-if="drawerMode === 'view'" class="mt-3 grid gap-2">
                  <article
                    v-for="membership in drawerTenantMembershipRows"
                    :key="`membership-view-${membership.tenantCode}`"
                    class="rounded-xl border border-slate-200 px-3 py-3"
                  >
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <p class="text-sm font-medium text-slate-800">{{ membership.tenantCode }}</p>
                      <ElTag :type="membership.enabled ? 'success' : 'info'" size="small" effect="light">
                        {{ membership.enabled ? "啟用" : "停用" }}
                      </ElTag>
                    </div>
                    <p class="mt-1 text-xs text-slate-600">
                      Primary：{{ roleLabel(membership.primaryRoleId) }} / Route：{{ membership.defaultDashboardRouteName }}
                    </p>
                    <div class="mt-2 flex flex-wrap gap-1">
                      <ElTag
                        v-for="roleId in membership.roleIds"
                        :key="`membership-role-${membership.tenantCode}-${roleId}`"
                        size="small"
                        effect="plain"
                      >
                        {{ roleLabel(roleId) }}
                      </ElTag>
                    </div>
                  </article>
                </div>

                <div v-else class="mt-3 grid gap-3">
                  <article
                    v-for="(membership, index) in form.tenantMemberships"
                    :key="`membership-edit-${index}`"
                    class="rounded-xl border border-slate-200 px-3 py-3"
                  >
                    <div class="grid gap-3 md:grid-cols-2">
                      <ElFormItem label="租戶" class="mb-0">
                        <ElSelect v-model="membership.tenantCode">
                          <ElOption
                            v-for="tenant in companyTenants"
                            :key="`tenant-edit-${tenant.code}`"
                            :label="`${tenant.shortName}（${tenant.code}）`"
                            :value="tenant.code"
                          />
                        </ElSelect>
                      </ElFormItem>

                      <ElFormItem label="Primary Role" class="mb-0">
                        <ElSelect
                          v-model="membership.primaryRoleId"
                          @change="syncMembershipPrimaryRole(membership)"
                        >
                          <ElOption
                            v-for="role in Object.values(roleCatalog)"
                            :key="`role-primary-${role.id}`"
                            :label="role.label"
                            :value="role.id"
                          />
                        </ElSelect>
                      </ElFormItem>

                      <ElFormItem label="附加角色（可多選）" class="mb-0 md:col-span-2">
                        <ElSelect
                          v-model="membership.roleIds"
                          multiple
                          collapse-tags
                          collapse-tags-tooltip
                          @change="syncMembershipRoleIds(membership)"
                        >
                          <ElOption
                            v-for="role in Object.values(roleCatalog)"
                            :key="`role-multi-${role.id}`"
                            :label="role.label"
                            :value="role.id"
                          />
                        </ElSelect>
                      </ElFormItem>

                      <ElFormItem label="預設首頁 Route" class="mb-0">
                        <ElInput v-model="membership.defaultDashboardRouteName" />
                      </ElFormItem>

                      <ElFormItem label="資料範圍" class="mb-0">
                        <ElSelect v-model="form.scopeByTenant[membership.tenantCode]">
                          <ElOption label="self" value="self" />
                          <ElOption label="department" value="department" />
                          <ElOption label="assigned_accounts" value="assigned_accounts" />
                          <ElOption label="all" value="all" />
                        </ElSelect>
                      </ElFormItem>
                    </div>

                    <div class="mt-2 flex justify-end">
                      <ElButton
                        text
                        type="danger"
                        :disabled="form.tenantMemberships.length === 1"
                        @click="removeMembershipRow(index)"
                      >
                        移除
                      </ElButton>
                    </div>
                  </article>
                </div>
              </article>
            </template>
          </section>
        </section>
      </template>
    </ElDrawer>
  </div>
</template>

<style scoped>
.user-table :deep(.el-table__row) {
  cursor: pointer;
}

.detail-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.panel-card {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  padding: 14px;
}

.panel-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: #0f172a;
}
</style>
