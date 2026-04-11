<script setup>
import { computed, reactive, ref, watch } from "vue";
import VChart from "vue-echarts";
import { use } from "echarts/core";
import { RadarChart } from "echarts/charts";
import { LegendComponent, RadarComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import {
  ElButton,
  ElCheckbox,
  ElCheckboxGroup,
  ElDatePicker,
  ElDescriptions,
  ElDescriptionsItem,
  ElDrawer,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElMessageBox,
  ElNotification,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
  ElSwitch,
} from "element-plus";
import {
  CirclePlus,
  DataAnalysis,
  Filter,
  Lock,
  Money,
  Refresh,
  Search,
  Setting,
  Suitcase,
  UserFilled,
} from "@element-plus/icons-vue";
import { companyTenants, employeeAccounts, roleCatalog } from "../../data/auth";
import { usePermissionRoleStore } from "../../stores/usePermissionRoleStore";

use([RadarChart, RadarComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const nowTs = Date.now();
const dayMs = 24 * 60 * 60 * 1000;
const permissionRoleStore = usePermissionRoleStore();

const tenantCode = ref(companyTenants[0]?.code || "");
const drawerOpen = ref(false);
const drawerMode = ref("view");
const activeRoleId = ref("");
const activeTab = ref("basic");
const permissionView = ref("module");
const filterPanelOpen = ref(false);

const roleKeyword = ref("");
const typeFilter = ref("all");
const statusFilter = ref("all");
const bindingFilter = ref("all");
const sectionFilter = ref("all");
const levelFilter = ref("all");
const sortFilter = ref("updated_desc");

const filterTypeOptions = [
  { value: "all", label: "角色類型：全部" },
  { value: "system", label: "角色類型：系統預設" },
  { value: "custom", label: "角色類型：自訂角色" },
];

const filterStatusOptions = [
  { value: "all", label: "狀態：全部" },
  { value: "active", label: "啟用中" },
  { value: "inactive", label: "停用" },
  { value: "expiring", label: "即將到期" },
  { value: "expired", label: "已過期" },
];

const filterBindingOptions = [
  { value: "all", label: "綁定：全部" },
  { value: "bound", label: "已綁定使用者" },
  { value: "unbound", label: "未綁定使用者" },
];

const filterLevelOptions = [
  { value: "all", label: "權限級別：全部" },
  { value: "general", label: "一般角色" },
  { value: "manager", label: "管理角色" },
  { value: "finance", label: "財務角色" },
  { value: "global", label: "全域管理角色" },
];

const sortOptions = [
  { value: "updated_desc", label: "排序：最近更新優先" },
  { value: "updated_asc", label: "排序：最早更新優先" },
  { value: "expiry_asc", label: "排序：到期日優先" },
  { value: "bindings_desc", label: "排序：綁定人數高到低" },
  { value: "permissions_desc", label: "排序：權限數高到低" },
];

const permissionViewOptions = [
  { value: "module", label: "依模組分組" },
  { value: "action", label: "依動作分組" },
  { value: "raw", label: "原始字串" },
];

const scopeOptions = [
  { value: "self", label: "僅自己資料" },
  { value: "department", label: "部門資料" },
  { value: "assigned_accounts", label: "指派客戶資料" },
  { value: "all", label: "全部資料" },
];

const scopeLabelMap = Object.fromEntries(
  scopeOptions.map((item) => [item.value, item.label])
);

const scopeRuleRows = [
  {
    value: "self",
    title: "僅自己資料",
    description: "僅可查看自己建立或自己負責的資料。",
    type: "info",
  },
  {
    value: "department",
    title: "部門資料",
    description: "可查看同部門同仁資料，適用經理層治理。",
    type: "warning",
  },
  {
    value: "assigned_accounts",
    title: "指派客戶資料",
    description: "僅可查看被分派客戶池，適用 BD 經營模式。",
    type: "success",
  },
  {
    value: "all",
    title: "全資料",
    description: "可存取租戶下完整資料，通常僅 Admin。",
    type: "danger",
  },
];

const routeOptions = [
  { value: "dashboard-overview", label: "dashboard-overview" },
  { value: "dashboard-revenue-overview", label: "dashboard-revenue-overview" },
];

const sectionOrder = [
  "Dashboard",
  "客戶管理",
  "商機管理",
  "夥伴管理",
  "專案與活動",
  "互動與支援",
  "財務與結算",
  "報表中心",
  "設定",
];

const roleMetaMap = {
  admin: {
    description: "全域系統管理角色，可治理角色與設定。",
    status: "active",
    effectiveAt: "2026-01-01",
    expiresAt: "",
    updatedAt: "2026-04-10 10:00",
    dataScope: "all",
    canEdit: false,
    canDisable: false,
    icon: Setting,
  },
  bd_sales: {
    description: "商務開發角色，偏重客戶與商機經營。",
    status: "active",
    effectiveAt: "2026-01-01",
    expiresAt: "",
    updatedAt: "2026-04-08 16:20",
    dataScope: "assigned_accounts",
    canEdit: true,
    canDisable: true,
    icon: Suitcase,
  },
  finance: {
    description: "財務角色，負責合約、營收與分潤作業。",
    status: "active",
    effectiveAt: "2026-01-01",
    expiresAt: "",
    updatedAt: "2026-04-09 11:30",
    dataScope: "department",
    canEdit: true,
    canDisable: true,
    icon: Money,
  },
  manager_executive: {
    description: "管理層角色，偏重報表檢視與跨模組監控。",
    status: "active",
    effectiveAt: "2026-01-01",
    expiresAt: "2026-12-31",
    updatedAt: "2026-04-07 09:15",
    dataScope: "department",
    canEdit: true,
    canDisable: true,
    icon: DataAnalysis,
  },
};

const moduleLabelMap = {
  account: "客戶",
  contact: "聯絡人",
  opportunity: "商機",
  pipeline: "Pipeline",
  forecast: "Forecast",
  engagement: "互動與支援",
  project: "專案",
  campaign: "活動",
  report: "報表",
  contract: "合約",
  settlement: "分潤",
  revenue: "營收",
  payment: "收付款",
  currency: "幣別",
  settings: "設定",
  dashboard: "Dashboard",
  partner: "夥伴",
  kpi: "KPI",
  all: "全域",
};

const sensitiveCapabilities = [
  {
    id: "export",
    label: "匯出",
    description: "資料匯出與下載能力。",
    checker: (permission) =>
      permission === "*" || permission.startsWith("report:") || permission.includes("export"),
  },
  {
    id: "approve",
    label: "審批",
    description: "核准、簽核、審批相關能力。",
    checker: (permission) =>
      permission === "*" || permission.includes("approve") || permission.includes("review"),
  },
  {
    id: "delete",
    label: "刪除",
    description: "刪除主資料與交易資料能力。",
    checker: (permission) => permission === "*" || permission.includes("delete"),
  },
  {
    id: "finance_write",
    label: "財務寫入",
    description: "合約、營收、分潤、收付款寫入能力。",
    checker: (permission) =>
      permission === "*" ||
      [
        "contract:write",
        "settlement:write",
        "revenue:write",
        "payment:write",
        "currency:write",
      ].includes(permission),
  },
  {
    id: "settings_edit",
    label: "設定編輯",
    description: "設定區編輯與治理能力。",
    checker: (permission) =>
      permission === "*" ||
      permission.startsWith("settings:") ||
      permission.startsWith("system:") ||
      permission.startsWith("role:") ||
      permission.startsWith("user:"),
  },
];

const roleForm = reactive({
  id: "",
  label: "",
  description: "",
  defaultDashboardRouteName: "dashboard-overview",
  status: "active",
  effectiveAt: "",
  expiresAt: "",
  dataScope: "self",
  visibleSections: [],
});

const permissionEditor = reactive({});

const actionLabelMap = {
  read: "查看",
  write: "編輯",
  delete: "刪除",
  export: "匯出",
  approve: "審批",
  review: "審核",
  all: "全部",
  personal: "個人",
  finance: "財務設定",
  executive: "高階總覽",
  edit: "設定編輯",
};

const sectionLabelMap = {
  Dashboard: "Dashboard",
  客戶管理: "客戶管理",
  商機管理: "商機管理",
  夥伴管理: "夥伴管理",
  專案與活動: "專案與活動",
  互動與支援: "互動與支援",
  財務與結算: "財務與結算",
  報表中心: "報表中心",
  設定: "設定",
};

const moduleSectionMap = {
  dashboard: "Dashboard",
  account: "客戶管理",
  contact: "客戶管理",
  opportunity: "商機管理",
  pipeline: "商機管理",
  forecast: "商機管理",
  partner: "夥伴管理",
  project: "專案與活動",
  campaign: "專案與活動",
  engagement: "互動與支援",
  contract: "財務與結算",
  settlement: "財務與結算",
  revenue: "財務與結算",
  payment: "財務與結算",
  currency: "財務與結算",
  report: "報表中心",
  kpi: "報表中心",
  settings: "設定",
};

const permissionModuleCatalog = [
  {
    module: "account",
    label: "客戶",
    description: "客戶主檔與客戶資料維護",
    options: ["account:read", "account:write", "account:delete", "account:export"],
  },
  {
    module: "contact",
    label: "聯絡人",
    description: "聯絡人資料維護與匯出",
    options: ["contact:read", "contact:write", "contact:delete", "contact:export"],
  },
  {
    module: "opportunity",
    label: "商機",
    description: "商機資料、審批與匯出",
    options: [
      "opportunity:read",
      "opportunity:write",
      "opportunity:delete",
      "opportunity:export",
      "opportunity:approve",
    ],
  },
  {
    module: "pipeline",
    label: "Pipeline",
    description: "Pipeline 維護與輸出",
    options: ["pipeline:read", "pipeline:write", "pipeline:export", "pipeline:approve"],
  },
  {
    module: "forecast",
    label: "Forecast",
    description: "Forecast 檢視與審核",
    options: ["forecast:read", "forecast:export", "forecast:approve"],
  },
  {
    module: "engagement",
    label: "互動與支援",
    description: "互動記錄、Issue 與支援作業",
    options: [
      "engagement:read",
      "engagement:write",
      "engagement:delete",
      "engagement:export",
    ],
  },
  {
    module: "partner",
    label: "夥伴",
    description: "夥伴資料與合作治理",
    options: ["partner:read", "partner:write", "partner:delete", "partner:export"],
  },
  {
    module: "project",
    label: "專案",
    description: "專案進度與里程碑管理",
    options: ["project:read", "project:write", "project:delete", "project:approve"],
  },
  {
    module: "campaign",
    label: "活動",
    description: "活動規劃與執行管理",
    options: ["campaign:read", "campaign:write", "campaign:delete", "campaign:approve"],
  },
  {
    module: "contract",
    label: "合約",
    description: "合約資料、核准與輸出",
    options: ["contract:read", "contract:write", "contract:delete", "contract:approve"],
  },
  {
    module: "settlement",
    label: "分潤",
    description: "分潤結算與核准",
    options: ["settlement:read", "settlement:write", "settlement:delete", "settlement:approve"],
  },
  {
    module: "revenue",
    label: "營收",
    description: "營收資料維護與核准",
    options: ["revenue:read", "revenue:write", "revenue:delete", "revenue:approve"],
  },
  {
    module: "payment",
    label: "收付款",
    description: "付款、收款與審批",
    options: ["payment:read", "payment:write", "payment:delete", "payment:approve"],
  },
  {
    module: "currency",
    label: "幣別",
    description: "幣別與匯率設定",
    options: ["currency:read", "currency:write"],
  },
  {
    module: "report",
    label: "報表",
    description: "報表檢視、輸出與全域資料",
    options: ["report:personal", "report:all", "report:export"],
  },
  {
    module: "kpi",
    label: "KPI",
    description: "KPI 與營運指標檢視",
    options: ["kpi:read", "kpi:export"],
  },
  {
    module: "dashboard",
    label: "Dashboard",
    description: "Dashboard 檢視權限",
    options: ["dashboard:read", "dashboard:executive"],
  },
  {
    module: "settings",
    label: "設定",
    description: "設定維護與治理權限",
    options: ["settings:finance", "settings:edit", "settings:approve"],
  },
];

function toTimestamp(value) {
  if (!value) {
    return 0;
  }

  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatDate(value) {
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
  }).format(date);
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

function getDaysTo(dateText) {
  const ts = toTimestamp(dateText);
  if (!ts) {
    return null;
  }

  return Math.ceil((ts - nowTs) / dayMs);
}

function uniqueList(list = []) {
  return [...new Set(list.filter(Boolean))];
}

function splitPermissions(text = "") {
  return uniqueList(
    text
      .split(/[\n,、\s]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function parsePermission(permission) {
  if (permission === "*") {
    return {
      raw: permission,
      module: "all",
      action: "all",
      moduleLabel: moduleLabelMap.all,
      actionLabel: "全權限",
    };
  }

  const [module = "unknown", action = "unknown"] = permission.split(":");
  return {
    raw: permission,
    module,
    action,
    moduleLabel: moduleLabelMap[module] || module,
    actionLabel: actionLabelMap[action] || action,
  };
}

function describePermission(permission) {
  const parsed = parsePermission(permission);
  return `${parsed.moduleLabel} / ${parsed.actionLabel}`;
}

function permissionOptionLabel(permission) {
  return parsePermission(permission).actionLabel;
}

function isRiskyPermission(permission) {
  if (!permission) {
    return false;
  }

  if (permission.includes("delete") || permission.includes("approve")) {
    return true;
  }

  if (
    ["contract:write", "settlement:write", "revenue:write", "payment:write", "currency:write"].includes(
      permission
    )
  ) {
    return true;
  }

  return permission === "settings:edit" || permission === "settings:finance";
}

function toPermissionSelections(list = []) {
  const result = {};

  permissionModuleCatalog.forEach((module) => {
    result[module.module] = list.filter((permission) =>
      module.options.includes(permission)
    );
  });

  return result;
}

function buildPermissionListFromEditor() {
  return uniqueList(
    permissionModuleCatalog.flatMap((module) => permissionEditor[module.module] || [])
  );
}

function sectionEnabled(section) {
  return roleForm.visibleSections.includes(section);
}

function setSectionEnabled(section, enabled) {
  if (enabled) {
    roleForm.visibleSections = uniqueList([...roleForm.visibleSections, section]);
    return;
  }

  roleForm.visibleSections = roleForm.visibleSections.filter((item) => item !== section);
}

function ensurePermissionSectionVisibility() {
  permissionModuleCatalog.forEach((module) => {
    const selected = permissionEditor[module.module] || [];
    const section = moduleSectionMap[module.module];
    if (selected.length > 0 && section) {
      setSectionEnabled(section, true);
    }
  });
}

function isModuleSectionEnabled(module) {
  const section = moduleSectionMap[module];
  return section ? roleForm.visibleSections.includes(section) : true;
}

function inferRoleLevel(role) {
  if (role.permissions.includes("*")) {
    return "global";
  }

  const hasFinance = role.permissions.some((permission) =>
    ["contract:", "settlement:", "revenue:", "payment:", "currency:"].some((prefix) =>
      permission.startsWith(prefix)
    )
  );

  if (hasFinance) {
    return "finance";
  }

  const hasManagement = role.permissions.some(
    (permission) =>
      permission === "report:all" ||
      permission === "dashboard:executive" ||
      permission.startsWith("settings:")
  );

  return hasManagement ? "manager" : "general";
}

function resolveRoleStatus(role) {
  if (role.status === "inactive") {
    return { value: "inactive", label: "停用", type: "info" };
  }

  if (role.expiresAt) {
    const days = getDaysTo(role.expiresAt);
    if (days !== null && days < 0) {
      return { value: "expired", label: "已過期", type: "danger" };
    }

    if (days !== null && days <= 30) {
      return { value: "expiring", label: "即將到期", type: "warning" };
    }
  }

  return { value: "active", label: "啟用中", type: "success" };
}

const baseRoles = computed(() =>
  Object.values(roleCatalog).map((role) => {
    const meta = roleMetaMap[role.id] || {};
    const overrides = permissionRoleStore.getRoleOverrides(tenantCode.value)[role.id] || {};
    const merged = {
      id: role.id,
      label: role.label,
      description: meta.description || "",
      defaultDashboardRouteName: role.defaultDashboardRouteName,
      visibleSections: [...role.visibleSections],
      permissions: [...role.permissions],
      source: "system",
      status: meta.status || "active",
      effectiveAt: meta.effectiveAt || "",
      expiresAt: meta.expiresAt || "",
      updatedAt: meta.updatedAt || "",
      dataScope: meta.dataScope || "self",
      canEdit: meta.canEdit !== false,
      canDisable: meta.canDisable !== false,
      icon: meta.icon || UserFilled,
      ...overrides,
    };

    return {
      ...merged,
      visibleSections: uniqueList(merged.visibleSections),
      permissions: uniqueList(merged.permissions),
      permissionCount: merged.permissions.length,
      sectionCount: merged.visibleSections.length,
      level: inferRoleLevel(merged),
      statusMeta: resolveRoleStatus(merged),
      daysToExpiry: getDaysTo(merged.expiresAt),
      isSystemDefault: true,
    };
  })
);

const allRoles = computed(() =>
  [...baseRoles.value, ...permissionRoleStore.getCustomRoles(tenantCode.value)].map((role) => ({
    ...role,
    permissionCount: role.permissions.length,
    sectionCount: role.visibleSections.length,
    level: inferRoleLevel(role),
    statusMeta: resolveRoleStatus(role),
    daysToExpiry: getDaysTo(role.expiresAt),
  }))
);

const allSections = computed(() => {
  const values = uniqueList(allRoles.value.flatMap((role) => role.visibleSections));

  return [
    ...sectionOrder.filter((section) => values.includes(section)),
    ...values.filter((section) => !sectionOrder.includes(section)),
  ];
});

const sectionFilterOptions = computed(() => [
  { value: "all", label: "模組可見性：全部" },
  ...allSections.value.map((section) => ({
    value: section,
    label: `含模組：${section}`,
  })),
]);

const tenantUsageMap = computed(() => {
  const map = {};

  companyTenants.forEach((tenant) => {
    map[tenant.code] = {};
    allRoles.value.forEach((role) => {
      map[tenant.code][role.id] = {
        boundCount: 0,
        primaryCount: 0,
        users: [],
      };
    });
  });

  employeeAccounts.forEach((employee) => {
    employee.tenantMemberships.forEach((membership) => {
      const tenantMap = map[membership.tenantCode];
      if (!tenantMap) {
        return;
      }

      membership.roleIds.forEach((roleId) => {
        if (!tenantMap[roleId]) {
          tenantMap[roleId] = { boundCount: 0, primaryCount: 0, users: [] };
        }

        tenantMap[roleId].boundCount += 1;
        tenantMap[roleId].users.push({
          id: employee.id,
          displayName: employee.displayName,
          account: employee.account,
          email: employee.email,
          tenantCode: membership.tenantCode,
          primaryRoleId: membership.primaryRoleId,
          roleIds: membership.roleIds,
        });
      });

      if (tenantMap[membership.primaryRoleId]) {
        tenantMap[membership.primaryRoleId].primaryCount += 1;
      }
    });
  });

  return map;
});

const selectedTenant = computed(
  () => companyTenants.find((tenant) => tenant.code === tenantCode.value) || null
);

const tenantMemberCount = computed(() =>
  employeeAccounts.filter((employee) =>
    employee.tenantMemberships.some((membership) => membership.tenantCode === tenantCode.value)
  ).length
);

const filteredRoles = computed(() => {
  const keyword = roleKeyword.value.trim().toLowerCase();
  const tenantMap = tenantUsageMap.value[tenantCode.value] || {};

  let rows = allRoles.value
    .map((role) => ({
      ...role,
      usage: tenantMap[role.id] || {
        boundCount: 0,
        primaryCount: 0,
        users: [],
      },
    }))
    .filter((role) => {
      if (keyword.length > 0) {
        const matched =
          role.label.toLowerCase().includes(keyword) ||
          role.id.toLowerCase().includes(keyword) ||
          role.defaultDashboardRouteName.toLowerCase().includes(keyword);

        if (!matched) {
          return false;
        }
      }

      if (typeFilter.value === "system" && !role.isSystemDefault) {
        return false;
      }

      if (typeFilter.value === "custom" && role.isSystemDefault) {
        return false;
      }

      if (statusFilter.value !== "all" && role.statusMeta.value !== statusFilter.value) {
        return false;
      }

      if (bindingFilter.value === "bound" && role.usage.boundCount === 0) {
        return false;
      }

      if (bindingFilter.value === "unbound" && role.usage.boundCount > 0) {
        return false;
      }

      if (
        sectionFilter.value !== "all" &&
        !role.visibleSections.includes(sectionFilter.value)
      ) {
        return false;
      }

      if (levelFilter.value !== "all" && role.level !== levelFilter.value) {
        return false;
      }

      return true;
    });

  rows = rows.sort((a, b) => {
    if (sortFilter.value === "updated_asc") {
      return toTimestamp(a.updatedAt) - toTimestamp(b.updatedAt);
    }

    if (sortFilter.value === "updated_desc") {
      return toTimestamp(b.updatedAt) - toTimestamp(a.updatedAt);
    }

    if (sortFilter.value === "expiry_asc") {
      const aTs = toTimestamp(a.expiresAt) || Number.MAX_SAFE_INTEGER;
      const bTs = toTimestamp(b.expiresAt) || Number.MAX_SAFE_INTEGER;
      return aTs - bTs;
    }

    if (sortFilter.value === "bindings_desc") {
      return b.usage.boundCount - a.usage.boundCount;
    }

    if (sortFilter.value === "permissions_desc") {
      return b.permissionCount - a.permissionCount;
    }

    return 0;
  });

  return rows;
});

const activeRole = computed(() => {
  if (!activeRoleId.value) {
    return null;
  }

  return allRoles.value.find((role) => role.id === activeRoleId.value) || null;
});

const roleForDrawer = computed(() => {
  if (!drawerOpen.value) {
    return null;
  }

  if (drawerMode.value === "view") {
    return activeRole.value;
  }

  const permissions = buildPermissionListFromEditor();
  return {
    id: roleForm.id.trim(),
    label: roleForm.label.trim(),
    description: roleForm.description.trim(),
    defaultDashboardRouteName: roleForm.defaultDashboardRouteName,
    visibleSections: uniqueList(roleForm.visibleSections),
    permissions,
    source: drawerMode.value === "create" ? "custom" : activeRole.value?.source || "custom",
    status: roleForm.status,
    effectiveAt: roleForm.effectiveAt,
    expiresAt: roleForm.expiresAt,
    updatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
    dataScope: roleForm.dataScope,
    canEdit: true,
    canDisable: true,
    icon: activeRole.value?.icon || Lock,
    isSystemDefault: activeRole.value?.isSystemDefault || false,
    permissionCount: permissions.length,
    sectionCount: uniqueList(roleForm.visibleSections).length,
    level: inferRoleLevel({ permissions }),
    statusMeta: resolveRoleStatus({
      status: roleForm.status,
      expiresAt: roleForm.expiresAt,
    }),
  };
});

const drawerParsedPermissions = computed(() =>
  (roleForDrawer.value?.permissions || []).map((permission) => parsePermission(permission))
);

const drawerPermissionByModule = computed(() => {
  const map = new Map();

  drawerParsedPermissions.value.forEach((item) => {
    if (!map.has(item.module)) {
      map.set(item.module, {
        id: item.module,
        label: item.moduleLabel,
        rows: [],
      });
    }
    map.get(item.module).rows.push(item);
  });

  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "zh-Hant"));
});

const drawerPermissionByAction = computed(() => {
  const map = new Map();

  drawerParsedPermissions.value.forEach((item) => {
    if (!map.has(item.action)) {
      map.set(item.action, {
        id: item.action,
        label: item.actionLabel,
        rows: [],
      });
    }
    map.get(item.action).rows.push(item);
  });

  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "zh-Hant"));
});

const drawerVisibleSections = computed(() => roleForDrawer.value?.visibleSections || []);
const drawerInvisibleSections = computed(() =>
  allSections.value.filter((section) => !drawerVisibleSections.value.includes(section))
);

const drawerBoundUsers = computed(() => {
  if (!roleForDrawer.value) {
    return [];
  }

  const tenantMap = tenantUsageMap.value[tenantCode.value] || {};
  const users = tenantMap[roleForDrawer.value.id]?.users || [];
  return users.map((item) => ({
    ...item,
    isPrimaryRole: item.primaryRoleId === roleForDrawer.value.id,
  }));
});

const drawerSensitiveRows = computed(() => {
  const role = roleForDrawer.value;
  if (!role) {
    return [];
  }

  return sensitiveCapabilities.map((capability) => ({
    ...capability,
    enabled: role.permissions.some((permission) => capability.checker(permission)),
  }));
});

function scoreByRules(permissions, rules) {
  if (permissions.includes("*")) {
    return 100;
  }

  const result = rules.reduce((sum, rule) => {
    const matched = permissions.some((permission) => rule.checker(permission));
    return sum + (matched ? rule.score : 0);
  }, 0);

  return Math.min(result, 100);
}

const drawerRadarOption = computed(() => {
  const permissions = roleForDrawer.value?.permissions || [];

  const values = [
    scoreByRules(permissions, [
      { score: 40, checker: (permission) => permission.startsWith("account:") },
      { score: 30, checker: (permission) => permission.startsWith("contact:") },
      { score: 30, checker: (permission) => permission.startsWith("engagement:") },
    ]),
    scoreByRules(permissions, [
      { score: 40, checker: (permission) => permission.startsWith("opportunity:") },
      { score: 30, checker: (permission) => permission.startsWith("pipeline:") },
      { score: 30, checker: (permission) => permission.startsWith("forecast:") },
    ]),
    scoreByRules(permissions, [
      { score: 25, checker: (permission) => permission.startsWith("contract:") },
      { score: 25, checker: (permission) => permission.startsWith("settlement:") },
      { score: 25, checker: (permission) => permission.startsWith("revenue:") },
      { score: 25, checker: (permission) => permission.startsWith("payment:") },
    ]),
    scoreByRules(permissions, [
      { score: 50, checker: (permission) => permission.startsWith("report:") },
      { score: 50, checker: (permission) => permission.startsWith("kpi:") },
    ]),
    scoreByRules(permissions, [
      { score: 50, checker: (permission) => permission.startsWith("settings:") },
      { score: 30, checker: (permission) => permission.startsWith("dashboard:") },
      { score: 20, checker: (permission) => permission.startsWith("system:") },
    ]),
    scoreByRules(permissions, [
      { score: 20, checker: (permission) => permission.includes("export") },
      { score: 20, checker: (permission) => permission.includes("approve") },
      { score: 20, checker: (permission) => permission.includes("delete") },
      { score: 20, checker: (permission) => permission.startsWith("report:") },
      {
        score: 20,
        checker: (permission) =>
          ["contract:write", "revenue:write", "payment:write", "settlement:write"].includes(
            permission
          ),
      },
    ]),
  ];

  return {
    tooltip: { trigger: "item" },
    radar: {
      radius: 92,
      splitNumber: 4,
      indicator: [
        { name: "客戶管理", max: 100 },
        { name: "商機管理", max: 100 },
        { name: "財務與結算", max: 100 },
        { name: "報表中心", max: 100 },
        { name: "系統設定", max: 100 },
        { name: "敏感操作", max: 100 },
      ],
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: values,
            name: roleForDrawer.value?.label || "角色能力",
            areaStyle: { color: "rgba(59,130,246,0.18)" },
            lineStyle: { color: "#2563eb", width: 2 },
            itemStyle: { color: "#2563eb" },
          },
        ],
      },
    ],
  };
});

function roleIcon(role) {
  if (role.id === "admin") {
    return Setting;
  }

  if (role.id === "finance") {
    return Money;
  }

  if (role.id === "manager_executive") {
    return DataAnalysis;
  }

  if (role.id === "bd_sales") {
    return Suitcase;
  }

  return role.icon || UserFilled;
}

function roleTypeLabel(role) {
  return role.isSystemDefault ? "系統預設" : "自訂";
}

function roleLevelLabel(role) {
  if (role.level === "global") {
    return "全域管理";
  }

  if (role.level === "finance") {
    return "財務角色";
  }

  if (role.level === "manager") {
    return "管理角色";
  }

  return "一般角色";
}

function expiryText(role) {
  if (!role.expiresAt) {
    return "-";
  }

  const days = role.daysToExpiry;
  if (days === null) {
    return formatDate(role.expiresAt);
  }

  if (days < 0) {
    return `${formatDate(role.expiresAt)}（已過期）`;
  }

  return `${formatDate(role.expiresAt)}（剩 ${days} 天）`;
}

function tenantUsage(roleId) {
  const tenantMap = tenantUsageMap.value[tenantCode.value] || {};
  return (
    tenantMap[roleId] || {
      boundCount: 0,
      primaryCount: 0,
      users: [],
    }
  );
}

function openRoleDrawer(roleId, mode = "view") {
  activeRoleId.value = roleId;
  drawerMode.value = mode;
  activeTab.value = "basic";
  permissionView.value = "module";

  if (mode === "view") {
    drawerOpen.value = true;
    return;
  }

  const target = allRoles.value.find((role) => role.id === roleId);
  if (!target) {
    return;
  }

  roleForm.id = target.id;
  roleForm.label = target.label;
  roleForm.description = target.description || "";
  roleForm.defaultDashboardRouteName = target.defaultDashboardRouteName;
  roleForm.status = target.status || "active";
  roleForm.effectiveAt = target.effectiveAt || "";
  roleForm.expiresAt = target.expiresAt || "";
  roleForm.dataScope = target.dataScope || "self";
  roleForm.visibleSections = [...target.visibleSections];
  Object.assign(permissionEditor, toPermissionSelections(target.permissions));
  drawerOpen.value = true;
}

function openCreateDrawer() {
  drawerMode.value = "create";
  activeRoleId.value = "";
  activeTab.value = "basic";
  permissionView.value = "module";

  roleForm.id = "";
  roleForm.label = "";
  roleForm.description = "";
  roleForm.defaultDashboardRouteName = "dashboard-overview";
  roleForm.status = "active";
  roleForm.effectiveAt = new Date().toISOString().slice(0, 10);
  roleForm.expiresAt = "";
  roleForm.dataScope = "self";
  roleForm.visibleSections = ["Dashboard"];
  Object.assign(permissionEditor, toPermissionSelections([]));

  drawerOpen.value = true;
}

function closeDrawer() {
  drawerOpen.value = false;
  drawerMode.value = "view";
}

async function saveRole() {
  const id = roleForm.id.trim();
  const label = roleForm.label.trim();
  ensurePermissionSectionVisibility();
  const permissions = buildPermissionListFromEditor();
  const visibleSections = uniqueList(roleForm.visibleSections);

  if (!id || !label) {
    ElNotification({
      title: "缺少資訊",
      message: "請填寫角色名稱與角色 ID。",
      type: "warning",
      position: "top-right",
    });
    return;
  }

  const idPattern = /^[a-z0-9_:-]+$/;
  if (!idPattern.test(id)) {
    ElNotification({
      title: "格式錯誤",
      message: "角色 ID 僅能包含小寫英數、底線、冒號或連字號。",
      type: "warning",
      position: "top-right",
    });
    return;
  }

  if (drawerMode.value === "create" && allRoles.value.some((role) => role.id === id)) {
    ElNotification({
      title: "角色已存在",
      message: `角色 ID「${id}」已存在，請改用其他 ID。`,
      type: "warning",
      position: "top-right",
    });
    return;
  }

  const payload = {
    id,
    label,
    description: roleForm.description.trim(),
    defaultDashboardRouteName: roleForm.defaultDashboardRouteName,
    visibleSections,
    permissions,
    status: roleForm.status,
    effectiveAt: roleForm.effectiveAt || "",
    expiresAt: roleForm.expiresAt || "",
    dataScope: roleForm.dataScope,
    updatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
    icon: Lock,
  };

  const previousPermissions = activeRole.value?.permissions || [];
  const newlyGrantedRiskyPermissions = permissions.filter(
    (permission) =>
      isRiskyPermission(permission) && !previousPermissions.includes(permission)
  );

  if (newlyGrantedRiskyPermissions.length > 0) {
    try {
      await ElMessageBox.confirm(
        `即將開啟高風險權限：${newlyGrantedRiskyPermissions
          .map((permission) => describePermission(permission))
          .join("、")}。確認要儲存？`,
        "高風險權限確認",
        {
          confirmButtonText: "確認儲存",
          cancelButtonText: "取消",
          type: "warning",
        }
      );
    } catch {
      return;
    }
  }

  if (drawerMode.value === "create") {
    permissionRoleStore.saveRole(
      tenantCode.value,
      {
      ...payload,
      source: "custom",
      canEdit: true,
      canDisable: true,
      isSystemDefault: false,
      },
      { mode: "create", isSystemDefault: false }
    );

    activeRoleId.value = id;
    drawerMode.value = "view";
    ElNotification({
      title: "已建立",
      message: `角色「${label}」已建立（mock）。`,
      type: "success",
      position: "top-right",
    });
    return;
  }

  if (activeRole.value?.isSystemDefault) {
    permissionRoleStore.saveRole(tenantCode.value, payload, {
      mode: "edit",
      isSystemDefault: true,
      originalId: id,
    });
  } else {
    permissionRoleStore.saveRole(tenantCode.value, payload, {
      mode: "edit",
      isSystemDefault: false,
      originalId: activeRole.value.id,
    });
  }

  drawerMode.value = "view";
  ElNotification({
    title: "已更新",
    message: `角色「${label}」已更新（mock）。`,
    type: "success",
    position: "top-right",
  });
}

async function toggleRoleStatus(role) {
  const usage = tenantUsage(role.id);
  const nextStatus = role.status === "inactive" ? "active" : "inactive";
  const actionText = nextStatus === "inactive" ? "停用" : "啟用";

  try {
    await ElMessageBox.confirm(
      usage.boundCount > 0
        ? `此角色目前仍綁定 ${usage.boundCount} 位使用者，確定要${actionText}？`
        : `確定要${actionText}角色「${role.label}」？`,
      `${actionText}角色`,
      {
        confirmButtonText: actionText,
        cancelButtonText: "取消",
        type: nextStatus === "inactive" ? "warning" : "info",
      }
    );
  } catch {
    return;
  }

  if (role.isSystemDefault) {
  }
  permissionRoleStore.updateRoleStatus(
    tenantCode.value,
    role,
    nextStatus,
    new Date().toISOString().replace("T", " ").slice(0, 16)
  );

  ElNotification({
    title: "已更新",
    message: `角色「${role.label}」已${actionText}（mock）。`,
    type: "success",
    position: "top-right",
  });
}

function resetFilters() {
  roleKeyword.value = "";
  typeFilter.value = "all";
  statusFilter.value = "all";
  bindingFilter.value = "all";
  sectionFilter.value = "all";
  levelFilter.value = "all";
  sortFilter.value = "updated_desc";
}

watch(
  () => [tenantCode.value, filteredRoles.value.length],
  () => {
    if (!filteredRoles.value.some((role) => role.id === activeRoleId.value)) {
      activeRoleId.value = filteredRoles.value[0]?.id || "";
    }
  },
  { immediate: true }
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
            權限與角色
          </h1>
          <p class="text-sm text-slate-500">
            租戶級角色治理、模組可見性與資料範圍管理
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
            新增角色
          </ElButton>
        </div>
      </header>

      <section class="rounded-2xl border border-slate-200 bg-white px-6 py-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <ElInput
              v-model="roleKeyword"
              placeholder="搜尋角色名稱 / role ID / route"
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
            {{ selectedTenant?.name || tenantCode }} / {{ tenantMemberCount }} 位成員 / 角色
            {{ filteredRoles.length }}
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
              <ElSelect v-model="typeFilter">
                <ElOption
                  v-for="item in filterTypeOptions"
                  :key="`type-${item.value}`"
                  :value="item.value"
                  :label="item.label"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem class="mb-0">
              <ElSelect v-model="statusFilter">
                <ElOption
                  v-for="item in filterStatusOptions"
                  :key="`status-${item.value}`"
                  :value="item.value"
                  :label="item.label"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem class="mb-0">
              <ElSelect v-model="bindingFilter">
                <ElOption
                  v-for="item in filterBindingOptions"
                  :key="`binding-${item.value}`"
                  :value="item.value"
                  :label="item.label"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem class="mb-0">
              <ElSelect v-model="sectionFilter">
                <ElOption
                  v-for="item in sectionFilterOptions"
                  :key="`section-${item.value}`"
                  :value="item.value"
                  :label="item.label"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem class="mb-0">
              <ElSelect v-model="levelFilter">
                <ElOption
                  v-for="item in filterLevelOptions"
                  :key="`level-${item.value}`"
                  :value="item.value"
                  :label="item.label"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem class="mb-0">
              <ElSelect v-model="sortFilter">
                <ElOption
                  v-for="item in sortOptions"
                  :key="`sort-${item.value}`"
                  :value="item.value"
                  :label="item.label"
                />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </transition>
        <div class="mt-4 border-t border-slate-200"></div>
        <ElTable
          table-layout="auto"
          :data="filteredRoles"
          class="role-table"
          @row-click="(row) => openRoleDrawer(row.id, 'view')"
        >
          <ElTableColumn label="角色" min-width="280">
            <template #default="{ row }">
              <div class="flex items-start gap-3">
                <div class="role-icon-box">
                  <ElIcon size="18"><component :is="roleIcon(row)" /></ElIcon>
                </div>
                <div class="grid gap-1">
                  <p class="text-sm font-semibold text-slate-900">{{ row.label }}</p>
                  <p class="text-xs text-slate-500">{{ row.id }}</p>
                  <p class="text-xs text-slate-500">Route：{{ row.defaultDashboardRouteName }}</p>
                </div>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="類型" min-width="110">
            <template #default="{ row }">
              <ElTag :type="row.isSystemDefault ? 'info' : 'success'" size="small" effect="light">
                {{ roleTypeLabel(row) }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="狀態" min-width="120">
            <template #default="{ row }">
              <ElTag :type="row.statusMeta.type" size="small" effect="light">
                {{ row.statusMeta.label }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="到期資訊" min-width="180">
            <template #default="{ row }">
              <span>{{ expiryText(row) }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="可見模組" min-width="100" align="right">
            <template #default="{ row }">{{ row.sectionCount }}</template>
          </ElTableColumn>

          <ElTableColumn label="權限數" min-width="90" align="right">
            <template #default="{ row }">{{ row.permissionCount }}</template>
          </ElTableColumn>

          <ElTableColumn label="綁定使用者" min-width="120" align="right">
            <template #default="{ row }">{{ row.usage.boundCount }}</template>
          </ElTableColumn>

          <ElTableColumn label="權限級別" min-width="120">
            <template #default="{ row }">
              <ElTag size="small" effect="plain">{{ roleLevelLabel(row) }}</ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="操作" width="190" fixed="right">
            <template #default="{ row }">
              <div class="flex items-center justify-end gap-1">
                <ElButton text type="primary" @click.stop="openRoleDrawer(row.id, 'view')">
                  查看
                </ElButton>
                <ElButton
                  text
                  :disabled="!row.canEdit"
                  @click.stop="openRoleDrawer(row.id, 'edit')"
                >
                  編輯
                </ElButton>
                <ElButton
                  text
                  :disabled="!row.canDisable"
                  @click.stop="toggleRoleStatus(row)"
                >
                  {{ row.status === "inactive" ? "啟用" : "停用" }}
                </ElButton>
              </div>
            </template>
          </ElTableColumn>
        </ElTable>

        <ElEmpty
          v-if="filteredRoles.length === 0"
          class="py-8"
          description="沒有符合條件的角色"
          :image-size="90"
        />
      </section>
    </section>

    <ElDrawer
      v-model="drawerOpen"
      :size="'58%'"
      :destroy-on-close="false"
      :show-close="true"
      :title="
        drawerMode === 'create'
          ? '新增角色'
          : drawerMode === 'edit'
            ? '編輯角色'
            : '角色詳情'
      "
    >
      <template v-if="roleForDrawer">
        <section class="grid gap-4">
          <header class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="flex items-start gap-3">
                <div class="role-icon-box role-icon-box--lg">
                  <ElIcon size="20"><component :is="roleIcon(roleForDrawer)" /></ElIcon>
                </div>
                <div class="grid gap-1">
                  <h2 class="text-xl font-semibold text-slate-900">
                    {{ roleForDrawer.label || "未命名角色" }}
                  </h2>
                  <p class="text-xs text-slate-500">{{ roleForDrawer.id || "-" }}</p>
                  <div class="flex flex-wrap items-center gap-1">
                    <ElTag :type="roleForDrawer.statusMeta.type" size="small" effect="light">
                      {{ roleForDrawer.statusMeta.label }}
                    </ElTag>
                    <ElTag
                      :type="roleForDrawer.isSystemDefault ? 'info' : 'success'"
                      size="small"
                      effect="light"
                    >
                      {{ roleForDrawer.isSystemDefault ? "系統預設" : "自訂角色" }}
                    </ElTag>
                    <ElTag
                      v-if="drawerMode === 'edit' && roleForDrawer.isSystemDefault"
                      type="warning"
                      size="small"
                      effect="light"
                    >
                      正在編輯系統預設角色覆寫
                    </ElTag>
                    <ElTag size="small" effect="plain">
                      模組 {{ roleForDrawer.sectionCount }} / 權限
                      {{ roleForDrawer.permissionCount }}
                    </ElTag>
                    <ElTag size="small" effect="plain">
                      綁定 {{ tenantUsage(roleForDrawer.id).boundCount }} 人
                    </ElTag>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <template v-if="drawerMode === 'view'">
                  <ElButton
                    :disabled="!roleForDrawer.canEdit"
                    @click="openRoleDrawer(roleForDrawer.id, 'edit')"
                  >
                    編輯
                  </ElButton>
                  <ElButton
                    :disabled="!roleForDrawer.canDisable"
                    @click="toggleRoleStatus(roleForDrawer)"
                  >
                    {{ roleForDrawer.status === "inactive" ? "啟用" : "停用" }}
                  </ElButton>
                </template>
                <template v-else>
                  <ElButton @click="closeDrawer">取消</ElButton>
                  <ElButton type="primary" @click="saveRole">儲存</ElButton>
                </template>
              </div>
            </div>
          </header>

          <div class="border-b border-slate-200 px-1 pt-1">
            <ElTabs v-model="activeTab" class="detail-tabs">
              <ElTabPane name="basic" label="基本資訊" />
              <ElTabPane name="radar" label="能力輪廓" />
              <ElTabPane name="sections" label="模組可見性" />
              <ElTabPane name="permissions" label="權限清單" />
              <ElTabPane name="scope" label="資料範圍" />
              <ElTabPane name="sensitive" label="敏感權限" />
              <ElTabPane name="bindings" label="綁定使用者" />
            </ElTabs>
          </div>

          <section class="grid gap-4">
            <template v-if="activeTab === 'basic'">
              <template v-if="drawerMode === 'view'">
                <ElDescriptions :column="2" border class="basic-desc">
                  <ElDescriptionsItem label="角色名稱">{{
                    roleForDrawer.label
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="角色 ID">{{ roleForDrawer.id }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="角色說明" :span="2">{{
                    roleForDrawer.description || "-"
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="預設 Dashboard Route">{{
                    roleForDrawer.defaultDashboardRouteName
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="權限級別">{{
                    roleLevelLabel(roleForDrawer)
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="生效日">{{
                    formatDate(roleForDrawer.effectiveAt)
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="到期日">{{
                    formatDate(roleForDrawer.expiresAt)
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="最後更新時間">{{
                    formatDateTime(roleForDrawer.updatedAt)
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="資料範圍">{{
                    scopeLabelMap[roleForDrawer.dataScope] || roleForDrawer.dataScope || "-"
                  }}</ElDescriptionsItem>
                </ElDescriptions>
              </template>

              <template v-else>
                <ElForm label-position="top" class="grid gap-3">
                  <div class="grid gap-3 md:grid-cols-2">
                    <ElFormItem label="角色名稱">
                      <ElInput v-model="roleForm.label" />
                    </ElFormItem>
                    <ElFormItem label="角色 ID">
                      <ElInput
                        v-model="roleForm.id"
                        :disabled="drawerMode === 'edit'"
                        placeholder="例如：support_viewer"
                      />
                    </ElFormItem>
                    <ElFormItem label="預設 Dashboard Route">
                      <ElSelect v-model="roleForm.defaultDashboardRouteName">
                        <ElOption
                          v-for="item in routeOptions"
                          :key="`route-${item.value}`"
                          :label="item.label"
                          :value="item.value"
                        />
                      </ElSelect>
                    </ElFormItem>
                    <ElFormItem label="狀態">
                      <ElSelect v-model="roleForm.status">
                        <ElOption label="啟用中" value="active" />
                        <ElOption label="停用" value="inactive" />
                      </ElSelect>
                    </ElFormItem>
                    <ElFormItem label="生效日">
                      <ElDatePicker
                        v-model="roleForm.effectiveAt"
                        value-format="YYYY-MM-DD"
                        type="date"
                        class="!w-full"
                      />
                    </ElFormItem>
                    <ElFormItem label="到期日">
                      <ElDatePicker
                        v-model="roleForm.expiresAt"
                        value-format="YYYY-MM-DD"
                        type="date"
                        class="!w-full"
                      />
                    </ElFormItem>
                  </div>
                  <ElFormItem label="角色說明">
                    <ElInput v-model="roleForm.description" type="textarea" :rows="3" />
                  </ElFormItem>
                </ElForm>
              </template>
            </template>

            <template v-else-if="activeTab === 'radar'">
              <article class="panel-card">
                <h3 class="panel-title">角色能力摘要（Radar Chart）</h3>
                <p class="panel-caption">
                  此圖僅作角色權限輪廓視覺化，實際規則仍以權限清單為準。
                </p>
                <VChart :option="drawerRadarOption" autoresize class="radar-chart" />
              </article>
            </template>

            <template v-else-if="activeTab === 'sections'">
              <article class="panel-card">
                <h3 class="panel-title">模組可見性</h3>

                <template v-if="drawerMode !== 'view'">
                  <ElForm class="mt-3">
                    <ElFormItem label="模組可見性">
                      <div class="grid w-full gap-3 md:grid-cols-2">
                        <article
                          v-for="section in allSections"
                          :key="`section-switch-${section}`"
                          class="rounded-xl border border-slate-200 px-4 py-3"
                        >
                          <div class="flex items-start justify-between gap-3">
                            <div class="grid gap-1">
                              <p class="text-sm font-semibold text-slate-800">
                                {{ sectionLabelMap[section] || section }}
                              </p>
                              <p class="text-xs text-slate-500">
                                {{ sectionEnabled(section) ? "已啟用，可出現在側邊導覽" : "未啟用，將從側邊導覽隱藏" }}
                              </p>
                            </div>
                            <ElSwitch
                              :model-value="sectionEnabled(section)"
                              @change="setSectionEnabled(section, $event)"
                            />
                          </div>
                        </article>
                      </div>
                    </ElFormItem>
                  </ElForm>
                </template>

                <div class="mt-3 grid gap-3 md:grid-cols-2">
                  <article class="rounded-xl border border-slate-200 px-3 py-3">
                    <p class="text-sm font-semibold text-slate-800">
                      可見（{{ drawerVisibleSections.length }}）
                    </p>
                    <div class="mt-2 flex flex-wrap gap-1">
                      <ElTag
                        v-for="section in drawerVisibleSections"
                        :key="`visible-${section}`"
                        type="success"
                        size="small"
                        effect="light"
                      >
                        {{ section }}
                      </ElTag>
                    </div>
                  </article>

                  <article class="rounded-xl border border-slate-200 px-3 py-3">
                    <p class="text-sm font-semibold text-slate-800">
                      不可見（{{ drawerInvisibleSections.length }}）
                    </p>
                    <div class="mt-2 flex flex-wrap gap-1">
                      <ElTag
                        v-for="section in drawerInvisibleSections"
                        :key="`invisible-${section}`"
                        size="small"
                        effect="plain"
                      >
                        {{ section }}
                      </ElTag>
                    </div>
                  </article>
                </div>
              </article>
            </template>

            <template v-else-if="activeTab === 'permissions'">
              <article class="panel-card">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h3 class="panel-title">權限清單</h3>
                  <ElSelect v-model="permissionView" class="!w-[160px]">
                    <ElOption
                      v-for="item in permissionViewOptions"
                      :key="`perm-view-${item.value}`"
                      :label="item.label"
                      :value="item.value"
                    />
                  </ElSelect>
                </div>

                <template v-if="drawerMode !== 'view'">
                  <div class="mt-3 grid gap-3 lg:grid-cols-2">
                    <article
                      v-for="module in permissionModuleCatalog"
                      :key="`permission-module-${module.module}`"
                      class="rounded-xl border border-slate-200 px-4 py-3"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <div class="grid gap-1">
                          <p class="text-sm font-semibold text-slate-800">
                            {{ module.label }}
                          </p>
                          <p class="text-xs text-slate-500">
                            {{ module.description }}
                          </p>
                        </div>
                        <ElTag
                          size="small"
                          :type="isModuleSectionEnabled(module.module) ? 'success' : 'info'"
                          effect="light"
                        >
                          {{ isModuleSectionEnabled(module.module) ? "模組可見" : "模組未啟用" }}
                        </ElTag>
                      </div>

                      <ElCheckboxGroup
                        v-model="permissionEditor[module.module]"
                        class="mt-3 grid gap-2"
                      >
                        <label
                          v-for="permission in module.options"
                          :key="`permission-option-${permission}`"
                          class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition"
                          :class="
                            isRiskyPermission(permission)
                              ? 'border-rose-200 bg-rose-50'
                              : 'border-slate-200 bg-slate-50'
                          "
                        >
                          <div class="flex items-center gap-2">
                            <ElCheckbox :label="permission">
                              <span class="text-sm text-slate-700">
                                {{ permissionOptionLabel(permission) }}
                              </span>
                            </ElCheckbox>
                            <ElTag
                              v-if="isRiskyPermission(permission)"
                              type="danger"
                              size="small"
                              effect="light"
                            >
                              高風險
                            </ElTag>
                          </div>
                          <span class="text-xs text-slate-400">{{ permission }}</span>
                        </label>
                      </ElCheckboxGroup>
                    </article>
                  </div>

                  <div class="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <p class="text-sm font-semibold text-slate-800">儲存後權限字串</p>
                    <div class="mt-2 flex flex-wrap gap-1">
                      <ElTag
                        v-for="permission in buildPermissionListFromEditor()"
                        :key="`permission-preview-${permission}`"
                        size="small"
                        :type="isRiskyPermission(permission) ? 'danger' : 'info'"
                        effect="plain"
                      >
                        {{ permission }}
                      </ElTag>
                    </div>
                  </div>
                </template>

                <template v-if="roleForDrawer.permissions.includes('*')">
                  <div class="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <p class="text-sm font-medium text-emerald-700">
                      此角色為全域權限 `*`。
                    </p>
                  </div>
                </template>

                <div v-if="permissionView === 'module'" class="mt-3 grid gap-2">
                  <article
                    v-for="group in drawerPermissionByModule"
                    :key="`module-group-${group.id}`"
                    class="rounded-xl border border-slate-200 px-3 py-3"
                  >
                    <p class="text-sm font-semibold text-slate-800">
                      {{ group.label }}（{{ group.rows.length }}）
                    </p>
                    <div class="mt-2 flex flex-wrap gap-1">
                      <ElTag
                        v-for="item in group.rows"
                        :key="`module-perm-${item.raw}`"
                        size="small"
                        effect="plain"
                      >
                        {{ item.raw }}
                      </ElTag>
                    </div>
                  </article>
                </div>

                <div v-else-if="permissionView === 'action'" class="mt-3 grid gap-2">
                  <article
                    v-for="group in drawerPermissionByAction"
                    :key="`action-group-${group.id}`"
                    class="rounded-xl border border-slate-200 px-3 py-3"
                  >
                    <p class="text-sm font-semibold text-slate-800">
                      {{ group.label }}（{{ group.rows.length }}）
                    </p>
                    <div class="mt-2 flex flex-wrap gap-1">
                      <ElTag
                        v-for="item in group.rows"
                        :key="`action-perm-${item.raw}`"
                        size="small"
                        effect="plain"
                      >
                        {{ item.raw }}
                      </ElTag>
                    </div>
                  </article>
                </div>

                <div v-else class="mt-3 flex flex-wrap gap-1">
                  <ElTag
                    v-for="item in drawerParsedPermissions"
                    :key="`raw-perm-${item.raw}`"
                    size="small"
                    effect="plain"
                  >
                    {{ item.raw }}
                  </ElTag>
                </div>
              </article>
            </template>

            <template v-else-if="activeTab === 'scope'">
              <div class="grid gap-4 lg:grid-cols-2">
                <article class="panel-card">
                  <h3 class="panel-title">資料範圍設定</h3>
                  <p class="panel-caption">第一版為 mock，可編輯並保存於前端狀態。</p>
                  <ElForm label-position="top" class="mt-3">
                    <ElFormItem label="資料存取範圍">
                      <div class="grid w-full gap-3">
                        <button
                          v-for="item in scopeRuleRows"
                          :key="`scope-card-${item.value}`"
                          type="button"
                          :disabled="drawerMode === 'view'"
                          class="rounded-xl border px-4 py-3 text-left transition"
                          :class="
                            roleForm.dataScope === item.value
                              ? item.type === 'danger'
                                ? 'border-rose-300 bg-rose-50'
                                : item.type === 'warning'
                                  ? 'border-amber-300 bg-amber-50'
                                  : item.type === 'success'
                                    ? 'border-emerald-300 bg-emerald-50'
                                    : 'border-sky-300 bg-sky-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          "
                          @click="roleForm.dataScope = item.value"
                        >
                          <div class="flex items-center justify-between gap-3">
                            <div class="grid gap-1">
                              <p class="text-sm font-semibold text-slate-800">{{ item.title }}</p>
                              <p class="text-xs text-slate-500">{{ item.description }}</p>
                            </div>
                            <ElTag :type="item.type" size="small" effect="light">
                              {{ scopeOptions.find((option) => option.value === item.value)?.label }}
                            </ElTag>
                          </div>
                        </button>
                      </div>
                    </ElFormItem>
                  </ElForm>
                </article>

                <article class="panel-card">
                  <h3 class="panel-title">範圍規則對照</h3>
                  <div class="mt-3 grid gap-2">
                    <article
                      v-for="rule in scopeRuleRows"
                      :key="`scope-rule-${rule.value}`"
                      class="rounded-xl border border-slate-200 px-3 py-2"
                    >
                      <div class="flex items-center gap-2">
                        <ElTag :type="rule.type" size="small" effect="light">{{
                          rule.value
                        }}</ElTag>
                        <p class="text-sm font-medium text-slate-800">{{ rule.title }}</p>
                      </div>
                      <p class="mt-1 text-xs text-slate-500">{{ rule.description }}</p>
                    </article>
                  </div>
                </article>
              </div>
            </template>

            <template v-else-if="activeTab === 'sensitive'">
              <article class="panel-card">
                <h3 class="panel-title">敏感權限</h3>
                <div class="mt-3 grid gap-2">
                  <article
                    v-for="item in drawerSensitiveRows"
                    :key="`sensitive-${item.id}`"
                    class="rounded-xl border border-slate-200 px-3 py-3"
                  >
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p class="text-sm font-semibold text-slate-800">{{ item.label }}</p>
                        <p class="text-xs text-slate-500">{{ item.description }}</p>
                      </div>
                      <ElTag :type="item.enabled ? 'danger' : 'info'" size="small" effect="light">
                        {{ item.enabled ? "已具備" : "未具備" }}
                      </ElTag>
                    </div>
                  </article>
                </div>
              </article>
            </template>

            <template v-else-if="activeTab === 'bindings'">
              <article class="panel-card">
                <h3 class="panel-title">綁定使用者</h3>
                <p class="panel-caption">
                  租戶 {{ selectedTenant?.shortName || tenantCode }} 下角色綁定結果
                </p>
                <ElTable class="mt-3" table-layout="auto" :data="drawerBoundUsers">
                  <ElTableColumn label="使用者" min-width="180">
                    <template #default="{ row }">
                      <div class="grid gap-0.5">
                        <p class="font-medium text-slate-900">{{ row.displayName }}</p>
                        <p class="text-xs text-slate-500">{{ row.account }}</p>
                      </div>
                    </template>
                  </ElTableColumn>

                  <ElTableColumn label="Email" min-width="220">
                    <template #default="{ row }">{{ row.email }}</template>
                  </ElTableColumn>

                  <ElTableColumn label="Tenant" min-width="110">
                    <template #default="{ row }">{{ row.tenantCode }}</template>
                  </ElTableColumn>

                  <ElTableColumn label="Primary Role" min-width="130">
                    <template #default="{ row }">
                      <ElTag :type="row.isPrimaryRole ? 'success' : 'info'" size="small" effect="light">
                        {{ row.primaryRoleId }}
                      </ElTag>
                    </template>
                  </ElTableColumn>

                  <ElTableColumn label="RoleIds 聯集" min-width="220" show-overflow-tooltip>
                    <template #default="{ row }">
                      <div class="flex flex-wrap gap-1">
                        <ElTag
                          v-for="roleId in row.roleIds"
                          :key="`role-id-${row.id}-${roleId}`"
                          size="small"
                          effect="plain"
                        >
                          {{ roleId }}
                        </ElTag>
                      </div>
                    </template>
                  </ElTableColumn>
                </ElTable>

                <ElEmpty
                  v-if="drawerBoundUsers.length === 0"
                  class="mt-3"
                  description="此租戶下尚無綁定使用者"
                  :image-size="86"
                />
              </article>
            </template>
          </section>
        </section>
      </template>
    </ElDrawer>
  </div>
</template>

<style scoped>
.role-table :deep(.el-table__row) {
  cursor: pointer;
}

.role-icon-box {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid #dbe4ef;
  background: #f8fafc;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #334155;
}

.role-icon-box--lg {
  width: 42px;
  height: 42px;
  border-radius: 12px;
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

.panel-caption {
  margin-top: 4px;
  font-size: 0.76rem;
  color: #64748b;
}

.radar-chart {
  margin-top: 6px;
  height: 320px;
  width: 100%;
}
</style>
