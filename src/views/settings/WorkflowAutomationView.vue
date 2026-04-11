<script setup>
import { computed, reactive, ref, watch } from "vue";
import {
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
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
} from "element-plus";
import { CirclePlus, Filter, Refresh, Search } from "@element-plus/icons-vue";

const loading = ref(false);
const filterPanelOpen = ref(false);

const currentPage = ref(1);
const pageSize = ref(10);

const drawerOpen = ref(false);
const drawerMode = ref("view");
const activeTab = ref("basic");
const activeRuleId = ref("");
const logFocusRuleId = ref("all");

const testInput = reactive({
  recordId: "",
});
const testResult = ref(null);

const filters = reactive({
  keyword: "",
  module: "all",
  status: "all",
  triggerType: "all",
  onlyRecentFailed: "all",
  onlyPendingException: "all",
  sortBy: "updated_desc",
});

const ruleDraft = reactive(createEmptyRuleDraft());
const rules = ref(createSeedRules());
const logs = ref(createSeedLogs());

const moduleTagTypeMap = {
  opportunity: "success",
  contract: "warning",
  settlement: "danger",
  reconciliation: "primary",
  integration: "info",
  issue: "danger",
  global: "",
};

const moduleOptions = [
  { value: "all", label: "模組：全部" },
  { value: "opportunity", label: "商機" },
  { value: "contract", label: "合約" },
  { value: "settlement", label: "分潤" },
  { value: "reconciliation", label: "對帳" },
  { value: "integration", label: "整合" },
  { value: "issue", label: "Issue" },
  { value: "global", label: "全域" },
];

const moduleSelectOptions = moduleOptions.filter((item) => item.value !== "all");

const statusOptions = [
  { value: "all", label: "狀態：全部" },
  { value: "active", label: "啟用中" },
  { value: "inactive", label: "停用" },
  { value: "error", label: "異常" },
];

const triggerTypeOptions = [
  { value: "all", label: "觸發類型：全部" },
  { value: "data_change", label: "資料變更" },
  { value: "schedule", label: "定時觸發" },
  { value: "system_error", label: "系統異常" },
];

const triggerTypeSelectOptions = triggerTypeOptions.filter(
  (item) => item.value !== "all"
);

const yesNoOptions = [
  { value: "all", label: "全部" },
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
];

const sortOptions = [
  { value: "updated_desc", label: "排序：最近更新優先" },
  { value: "last_run_desc", label: "排序：最近執行優先" },
  { value: "runs_desc", label: "排序：7天執行次數高到低" },
  { value: "failures_desc", label: "排序：7天失敗次數高到低" },
  { value: "success_rate_asc", label: "排序：成功率低到高" },
];

const ruleStatusSelectOptions = [
  { value: "active", label: "啟用中" },
  { value: "inactive", label: "停用" },
  { value: "error", label: "異常" },
];

const priorityOptions = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
  { value: "critical", label: "緊急" },
];

const scopeOptions = [
  { value: "global", label: "全域" },
  { value: "department", label: "特定部門" },
  { value: "role", label: "特定角色" },
  { value: "data_type", label: "特定資料類型" },
];

const triggerEventOptionsMap = {
  data_change: [
    { value: "created", label: "建立" },
    { value: "updated", label: "更新" },
    { value: "status_changed", label: "狀態變更" },
    { value: "closed", label: "關閉" },
  ],
  schedule: [
    { value: "before_due_n_days", label: "到期前 N 天" },
    { value: "after_due_n_days", label: "到期後 N 天" },
    { value: "daily_check", label: "每日巡檢" },
  ],
  system_error: [
    { value: "import_failed", label: "匯入失敗" },
    { value: "sync_failed", label: "同步失敗" },
    { value: "api_timeout", label: "API Timeout" },
  ],
};

const conditionFieldOptions = [
  { value: "status", label: "狀態" },
  { value: "amount", label: "金額" },
  { value: "due_at", label: "到期日" },
  { value: "priority", label: "優先級" },
  { value: "owner", label: "Owner" },
  { value: "department", label: "部門" },
  { value: "is_exception", label: "是否異常" },
];

const conditionOperatorOptions = [
  { value: "eq", label: "等於" },
  { value: "neq", label: "不等於" },
  { value: "gt", label: "大於" },
  { value: "gte", label: "大於等於" },
  { value: "lt", label: "小於" },
  { value: "lte", label: "小於等於" },
  { value: "contains", label: "包含" },
  { value: "is_true", label: "為真" },
  { value: "is_false", label: "為假" },
];

const actionTypeOptions = [
  { value: "notify", label: "發通知" },
  { value: "create_task", label: "建立 Task" },
  { value: "assign_handler", label: "指派處理人" },
  { value: "update_status", label: "更新狀態" },
  { value: "write_log", label: "寫入 Log" },
  { value: "webhook", label: "Webhook（預留）" },
];

const notificationTemplateOptions = [
  { value: "tpl-opportunity-overdue", label: "商機逾期提醒" },
  { value: "tpl-contract-expiry", label: "合約到期提醒" },
  { value: "tpl-settlement-failed", label: "分潤異常提醒" },
  { value: "tpl-integration-failed", label: "整合同步失敗提醒" },
  { value: "tpl-issue-escalate", label: "Issue 升級提醒" },
];

const ruleStatsMap = computed(() => {
  const now = Date.now();
  const start7d = now - 7 * 24 * 60 * 60 * 1000;
  const map = {};

  rules.value.forEach((rule) => {
    map[rule.id] = {
      lastRunAt: "",
      runs7d: 0,
      failures7d: 0,
      pendingExceptions: 0,
    };
  });

  logs.value.forEach((log) => {
    if (!map[log.ruleId]) {
      return;
    }

    const metric = map[log.ruleId];
    const ts = toTimestamp(log.executedAt);

    if (!metric.lastRunAt || ts > toTimestamp(metric.lastRunAt)) {
      metric.lastRunAt = log.executedAt;
    }

    if (ts >= start7d) {
      metric.runs7d += 1;
      if (log.result === "failed") {
        metric.failures7d += 1;
      }
    }

    if (log.result === "failed" && log.resolved !== true) {
      metric.pendingExceptions += 1;
    }
  });

  return map;
});

const enhancedRules = computed(() =>
  rules.value.map((rule) => {
    const stats = ruleStatsMap.value[rule.id] || {
      lastRunAt: "",
      runs7d: 0,
      failures7d: 0,
      pendingExceptions: 0,
    };

    const successRate =
      stats.runs7d === 0
        ? 100
        : Math.max(
            0,
            Math.round(((stats.runs7d - stats.failures7d) / stats.runs7d) * 100)
          );

    return {
      ...rule,
      ...stats,
      successRate,
      statusMeta: getRuleStatusMeta(rule.status, stats.pendingExceptions),
    };
  })
);

const filteredRules = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  let rows = enhancedRules.value.filter((rule) => {
    const matchesKeyword =
      keyword.length === 0 ||
      rule.name.toLowerCase().includes(keyword) ||
      String(rule.description || "")
        .toLowerCase()
        .includes(keyword);

    const matchesModule = filters.module === "all" || rule.module === filters.module;
    const matchesStatus =
      filters.status === "all" || rule.statusMeta.value === filters.status;
    const matchesTriggerType =
      filters.triggerType === "all" || rule.triggerType === filters.triggerType;

    const matchesRecentFailed =
      filters.onlyRecentFailed === "all" ||
      (filters.onlyRecentFailed === "yes" ? rule.failures7d > 0 : rule.failures7d === 0);

    const matchesPendingException =
      filters.onlyPendingException === "all" ||
      (filters.onlyPendingException === "yes"
        ? rule.pendingExceptions > 0
        : rule.pendingExceptions === 0);

    return (
      matchesKeyword &&
      matchesModule &&
      matchesStatus &&
      matchesTriggerType &&
      matchesRecentFailed &&
      matchesPendingException
    );
  });

  rows = rows.sort((a, b) => {
    if (filters.sortBy === "last_run_desc") {
      return toTimestamp(b.lastRunAt) - toTimestamp(a.lastRunAt);
    }

    if (filters.sortBy === "runs_desc") {
      return b.runs7d - a.runs7d;
    }

    if (filters.sortBy === "failures_desc") {
      return b.failures7d - a.failures7d;
    }

    if (filters.sortBy === "success_rate_asc") {
      return a.successRate - b.successRate;
    }

    return toTimestamp(b.updatedAt) - toTimestamp(a.updatedAt);
  });

  return rows;
});

const pagedRules = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredRules.value.slice(start, start + pageSize.value);
});

const focusedLogs = computed(() => {
  if (logFocusRuleId.value === "all") {
    return [...logs.value].sort(
      (a, b) => toTimestamp(b.executedAt) - toTimestamp(a.executedAt)
    );
  }

  return logs.value
    .filter((log) => log.ruleId === logFocusRuleId.value)
    .sort((a, b) => toTimestamp(b.executedAt) - toTimestamp(a.executedAt));
});

const recentLogs = computed(() => focusedLogs.value.slice(0, 12));

const pendingExceptions = computed(() =>
  logs.value
    .filter((log) => log.result === "failed" && log.resolved !== true)
    .sort((a, b) => toTimestamp(b.executedAt) - toTimestamp(a.executedAt))
);

const activeRule = computed(
  () => enhancedRules.value.find((rule) => rule.id === activeRuleId.value) || null
);

const drawerRule = computed(() => {
  if (!drawerOpen.value) {
    return null;
  }

  if (drawerMode.value === "view") {
    return activeRule.value;
  }

  return {
    id: ruleDraft.id.trim(),
    name: ruleDraft.name.trim(),
    description: ruleDraft.description.trim(),
    priority: ruleDraft.priority,
    status: ruleDraft.status,
    isSystemDefault: ruleDraft.isSystemDefault,
    module: ruleDraft.module,
    triggerType: ruleDraft.triggerType,
    triggerEvent: ruleDraft.triggerEvent,
    scopeType: ruleDraft.scopeType,
    scopeValue: ruleDraft.scopeValue.trim(),
    conditionLogic: ruleDraft.conditionLogic,
    conditions: ruleDraft.conditions.map((item) => ({ ...item })),
    actions: ruleDraft.actions.map((item) => ({ ...item })),
    updatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
  };
});

const drawerRuleLogs = computed(() => {
  if (!drawerRule.value?.id) {
    return [];
  }

  return logs.value
    .filter((log) => log.ruleId === drawerRule.value.id)
    .sort((a, b) => toTimestamp(b.executedAt) - toTimestamp(a.executedAt));
});

const todayStats = computed(() => {
  const todayKey = new Date().toISOString().slice(0, 10);

  const todayLogs = logs.value.filter((log) =>
    String(log.executedAt).startsWith(todayKey)
  );
  const todayRuns = todayLogs.length;
  const todayFailed = todayLogs.filter((log) => log.result === "failed").length;

  return {
    todayRuns,
    todayFailed,
    activeRules: enhancedRules.value.filter((rule) => rule.statusMeta.value === "active")
      .length,
    pendingExceptions: pendingExceptions.value.length,
  };
});

const monitorCards = computed(() => [
  { label: "今日執行次數", value: todayStats.value.todayRuns },
  { label: "今日執行失敗數", value: todayStats.value.todayFailed },
  { label: "啟用中規則數", value: todayStats.value.activeRules },
  { label: "待處理異常數", value: todayStats.value.pendingExceptions },
]);

function createEmptyRuleDraft() {
  return {
    id: "",
    name: "",
    description: "",
    priority: "medium",
    status: "active",
    isSystemDefault: false,
    module: "opportunity",
    triggerType: "data_change",
    triggerEvent: "status_changed",
    scopeType: "global",
    scopeValue: "",
    conditionLogic: "and",
    conditions: [createConditionRow()],
    actions: [createActionRow("notify")],
  };
}

function createConditionRow() {
  return {
    id: createId("cond"),
    field: "status",
    operator: "eq",
    value: "",
  };
}

function createActionRow(type = "notify") {
  return {
    id: createId("act"),
    type,
    templateId: "",
    recipientsInput: "",
    assignee: "",
    dueInDays: 1,
    field: "status",
    value: "",
    note: "",
    webhookUrl: "",
  };
}

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now()
    .toString(36)
    .slice(-4)}`;
}

function createSeedRules() {
  return [
    {
      id: "wf-001",
      name: "商機逾期提醒與升級",
      description: "商機在預計成交日後 3 天未更新，自動通知 owner 並建立追蹤任務。",
      priority: "high",
      status: "active",
      isSystemDefault: true,
      module: "opportunity",
      triggerType: "schedule",
      triggerEvent: "after_due_n_days",
      scopeType: "department",
      scopeValue: "Business Development",
      conditionLogic: "and",
      conditions: [
        { id: "cond-a1", field: "status", operator: "neq", value: "won" },
        { id: "cond-a2", field: "due_at", operator: "lt", value: "today-3" },
      ],
      actions: [
        {
          id: "act-a1",
          type: "notify",
          templateId: "tpl-opportunity-overdue",
          recipientsInput: "{商機負責人},sales_manager",
          assignee: "",
          dueInDays: 1,
          field: "",
          value: "",
          note: "",
          webhookUrl: "",
        },
        {
          id: "act-a2",
          type: "create_task",
          templateId: "",
          recipientsInput: "",
          assignee: "{商機負責人}",
          dueInDays: 2,
          field: "",
          value: "",
          note: "追蹤商機狀態更新",
          webhookUrl: "",
        },
      ],
      updatedAt: "2026-04-10 09:40",
    },
    {
      id: "wf-002",
      name: "合約到期前提醒",
      description: "合約到期前 14 天提醒 owner 與財務準備續約流程。",
      priority: "medium",
      status: "active",
      isSystemDefault: true,
      module: "contract",
      triggerType: "schedule",
      triggerEvent: "before_due_n_days",
      scopeType: "global",
      scopeValue: "",
      conditionLogic: "and",
      conditions: [{ id: "cond-b1", field: "due_at", operator: "lt", value: "today+14" }],
      actions: [
        {
          id: "act-b1",
          type: "notify",
          templateId: "tpl-contract-expiry",
          recipientsInput: "{合約 owner},finance_team",
          assignee: "",
          dueInDays: 1,
          field: "",
          value: "",
          note: "",
          webhookUrl: "",
        },
      ],
      updatedAt: "2026-04-09 18:12",
    },
    {
      id: "wf-003",
      name: "分潤對帳失敗自動派工",
      description: "分潤計算失敗時建立處理任務並指派財務值班。",
      priority: "critical",
      status: "error",
      isSystemDefault: false,
      module: "settlement",
      triggerType: "system_error",
      triggerEvent: "sync_failed",
      scopeType: "role",
      scopeValue: "finance",
      conditionLogic: "and",
      conditions: [
        { id: "cond-c1", field: "is_exception", operator: "is_true", value: "true" },
      ],
      actions: [
        {
          id: "act-c1",
          type: "create_task",
          templateId: "",
          recipientsInput: "",
          assignee: "finance_oncall",
          dueInDays: 1,
          field: "",
          value: "",
          note: "分潤同步錯誤排查",
          webhookUrl: "",
        },
        {
          id: "act-c2",
          type: "write_log",
          templateId: "",
          recipientsInput: "",
          assignee: "",
          dueInDays: 0,
          field: "",
          value: "",
          note: "記錄至自動化異常中心",
          webhookUrl: "",
        },
      ],
      updatedAt: "2026-04-10 08:15",
    },
    {
      id: "wf-004",
      name: "Issue 高嚴重度自動升級",
      description: "Issue 標記為高嚴重度時，自動指派管理者並更新狀態。",
      priority: "high",
      status: "active",
      isSystemDefault: false,
      module: "issue",
      triggerType: "data_change",
      triggerEvent: "updated",
      scopeType: "global",
      scopeValue: "",
      conditionLogic: "and",
      conditions: [
        { id: "cond-d1", field: "priority", operator: "eq", value: "high" },
        { id: "cond-d2", field: "status", operator: "neq", value: "resolved" },
      ],
      actions: [
        {
          id: "act-d1",
          type: "assign_handler",
          templateId: "",
          recipientsInput: "",
          assignee: "support_manager",
          dueInDays: 0,
          field: "",
          value: "",
          note: "",
          webhookUrl: "",
        },
        {
          id: "act-d2",
          type: "update_status",
          templateId: "",
          recipientsInput: "",
          assignee: "",
          dueInDays: 0,
          field: "status",
          value: "in_progress",
          note: "",
          webhookUrl: "",
        },
      ],
      updatedAt: "2026-04-08 14:22",
    },
    {
      id: "wf-005",
      name: "對帳異常財務告警",
      description: "對帳單狀態異常時通知財務並寫入事件日誌。",
      priority: "medium",
      status: "inactive",
      isSystemDefault: false,
      module: "reconciliation",
      triggerType: "data_change",
      triggerEvent: "status_changed",
      scopeType: "role",
      scopeValue: "finance",
      conditionLogic: "or",
      conditions: [
        { id: "cond-e1", field: "status", operator: "eq", value: "exception" },
        { id: "cond-e2", field: "amount", operator: "gt", value: "1000000" },
      ],
      actions: [
        {
          id: "act-e1",
          type: "notify",
          templateId: "tpl-settlement-failed",
          recipientsInput: "finance_team",
          assignee: "",
          dueInDays: 0,
          field: "",
          value: "",
          note: "",
          webhookUrl: "",
        },
      ],
      updatedAt: "2026-04-04 09:40",
    },
    {
      id: "wf-006",
      name: "整合同步失敗告警",
      description: "外部整合 API timeout 時發通知並記錄技術細節。",
      priority: "high",
      status: "active",
      isSystemDefault: true,
      module: "integration",
      triggerType: "system_error",
      triggerEvent: "api_timeout",
      scopeType: "global",
      scopeValue: "",
      conditionLogic: "and",
      conditions: [
        { id: "cond-f1", field: "is_exception", operator: "is_true", value: "true" },
      ],
      actions: [
        {
          id: "act-f1",
          type: "notify",
          templateId: "tpl-integration-failed",
          recipientsInput: "it_oncall,system_admin",
          assignee: "",
          dueInDays: 0,
          field: "",
          value: "",
          note: "",
          webhookUrl: "",
        },
        {
          id: "act-f2",
          type: "write_log",
          templateId: "",
          recipientsInput: "",
          assignee: "",
          dueInDays: 0,
          field: "",
          value: "",
          note: "保留 API 回傳錯誤詳情",
          webhookUrl: "",
        },
      ],
      updatedAt: "2026-04-10 10:05",
    },
  ];
}

function createSeedLogs() {
  return [
    createLog({
      id: "log-001",
      ruleId: "wf-001",
      executedAt: "2026-04-10 09:05",
      recordId: "opp-012",
      module: "opportunity",
      result: "success",
      conditionSummary: "status != won AND due_at < today-3",
      actionSummary: "通知 owner + 建立 task",
      errorType: "",
      errorMessage: "",
      technicalDetail: "",
      retryable: false,
      resolved: true,
      retriedCount: 0,
    }),
    createLog({
      id: "log-002",
      ruleId: "wf-001",
      executedAt: "2026-04-10 08:02",
      recordId: "opp-010",
      module: "opportunity",
      result: "failed",
      conditionSummary: "status != won AND due_at < today-3",
      actionSummary: "通知 owner + 建立 task",
      errorType: "api_failure",
      errorMessage: "通知服務回傳 502，通知未送達。",
      technicalDetail: "notification-service timeout after 5s",
      retryable: true,
      resolved: false,
      retriedCount: 1,
    }),
    createLog({
      id: "log-003",
      ruleId: "wf-002",
      executedAt: "2026-04-10 07:50",
      recordId: "ct-021",
      module: "contract",
      result: "success",
      conditionSummary: "due_at < today+14",
      actionSummary: "通知 owner + finance",
      errorType: "",
      errorMessage: "",
      technicalDetail: "",
      retryable: false,
      resolved: true,
      retriedCount: 0,
    }),
    createLog({
      id: "log-004",
      ruleId: "wf-003",
      executedAt: "2026-04-10 06:40",
      recordId: "stl-044",
      module: "settlement",
      result: "failed",
      conditionSummary: "is_exception = true",
      actionSummary: "建立 task + 寫入 log",
      errorType: "permission",
      errorMessage: "缺少 `task:create` 權限，無法建立任務。",
      technicalDetail: "service-account finance-automation missing scope task:create",
      retryable: true,
      resolved: false,
      retriedCount: 0,
    }),
    createLog({
      id: "log-005",
      ruleId: "wf-004",
      executedAt: "2026-04-09 17:12",
      recordId: "iss-018",
      module: "issue",
      result: "success",
      conditionSummary: "priority = high AND status != resolved",
      actionSummary: "指派 support_manager + 更新狀態",
      errorType: "",
      errorMessage: "",
      technicalDetail: "",
      retryable: false,
      resolved: true,
      retriedCount: 0,
    }),
    createLog({
      id: "log-006",
      ruleId: "wf-006",
      executedAt: "2026-04-09 16:03",
      recordId: "itg-093",
      module: "integration",
      result: "failed",
      conditionSummary: "is_exception = true",
      actionSummary: "通知 oncall + 寫入技術 log",
      errorType: "external_system",
      errorMessage: "Webhook endpoint 429，重試次數已達上限。",
      technicalDetail: "downstream returned 429 rate_limit_exceeded",
      retryable: true,
      resolved: false,
      retriedCount: 2,
    }),
    createLog({
      id: "log-007",
      ruleId: "wf-006",
      executedAt: "2026-04-09 15:44",
      recordId: "itg-091",
      module: "integration",
      result: "success",
      conditionSummary: "is_exception = true",
      actionSummary: "通知 oncall + 寫入技術 log",
      errorType: "",
      errorMessage: "",
      technicalDetail: "",
      retryable: false,
      resolved: true,
      retriedCount: 0,
    }),
    createLog({
      id: "log-008",
      ruleId: "wf-005",
      executedAt: "2026-04-08 10:10",
      recordId: "rec-033",
      module: "reconciliation",
      result: "skipped",
      conditionSummary: "status = exception OR amount > 1000000",
      actionSummary: "通知 finance",
      errorType: "",
      errorMessage: "規則停用，跳過執行。",
      technicalDetail: "",
      retryable: false,
      resolved: true,
      retriedCount: 0,
    }),
    createLog({
      id: "log-009",
      ruleId: "wf-001",
      executedAt: "2026-04-08 09:32",
      recordId: "opp-005",
      module: "opportunity",
      result: "success",
      conditionSummary: "status != won AND due_at < today-3",
      actionSummary: "通知 owner + 建立 task",
      errorType: "",
      errorMessage: "",
      technicalDetail: "",
      retryable: false,
      resolved: true,
      retriedCount: 0,
    }),
    createLog({
      id: "log-010",
      ruleId: "wf-003",
      executedAt: "2026-04-07 18:22",
      recordId: "stl-038",
      module: "settlement",
      result: "failed",
      conditionSummary: "is_exception = true",
      actionSummary: "建立 task + 寫入 log",
      errorType: "data_missing",
      errorMessage: "缺少 settlement owner，無法完成派工。",
      technicalDetail: "payload.owner_id is null",
      retryable: false,
      resolved: false,
      retriedCount: 0,
    }),
    createLog({
      id: "log-011",
      ruleId: "wf-004",
      executedAt: "2026-04-07 13:20",
      recordId: "iss-012",
      module: "issue",
      result: "success",
      conditionSummary: "priority = high AND status != resolved",
      actionSummary: "指派 support_manager + 更新狀態",
      errorType: "",
      errorMessage: "",
      technicalDetail: "",
      retryable: false,
      resolved: true,
      retriedCount: 0,
    }),
    createLog({
      id: "log-012",
      ruleId: "wf-002",
      executedAt: "2026-04-06 08:40",
      recordId: "ct-019",
      module: "contract",
      result: "success",
      conditionSummary: "due_at < today+14",
      actionSummary: "通知 owner + finance",
      errorType: "",
      errorMessage: "",
      technicalDetail: "",
      retryable: false,
      resolved: true,
      retriedCount: 0,
    }),
  ];
}

function createLog(payload) {
  return {
    id: payload.id || createId("log"),
    ruleId: payload.ruleId,
    executedAt: payload.executedAt,
    recordId: payload.recordId,
    module: payload.module,
    result: payload.result,
    conditionSummary: payload.conditionSummary,
    actionSummary: payload.actionSummary,
    errorType: payload.errorType || "",
    errorMessage: payload.errorMessage || "",
    technicalDetail: payload.technicalDetail || "",
    retryable: Boolean(payload.retryable),
    resolved: payload.resolved ?? payload.result !== "failed",
    retriedCount: payload.retriedCount || 0,
  };
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

function getRuleStatusMeta(status, pendingExceptions = 0) {
  if (status === "inactive") {
    return { value: "inactive", label: "停用", type: "info" };
  }

  if (status === "error" || pendingExceptions > 0) {
    return { value: "error", label: "異常", type: "danger" };
  }

  return { value: "active", label: "啟用中", type: "success" };
}

function getModuleLabel(value) {
  return moduleSelectOptions.find((item) => item.value === value)?.label || value;
}

function getTriggerTypeLabel(value) {
  return triggerTypeSelectOptions.find((item) => item.value === value)?.label || value;
}

function getTriggerEventLabel(triggerType, eventValue) {
  return (
    triggerEventOptionsMap[triggerType]?.find((item) => item.value === eventValue)
      ?.label || eventValue
  );
}

function moduleTagType(module) {
  return moduleTagTypeMap[module] || "";
}

function successRateTagType(rate) {
  if (rate >= 95) {
    return "success";
  }

  if (rate >= 80) {
    return "warning";
  }

  return "danger";
}

function logResultTagType(result) {
  if (result === "success") {
    return "success";
  }

  if (result === "failed") {
    return "danger";
  }

  return "info";
}

function logResultLabel(result) {
  if (result === "success") {
    return "成功";
  }

  if (result === "failed") {
    return "失敗";
  }

  return "跳過";
}

function errorTypeLabel(value) {
  if (value === "api_failure") {
    return "API 回傳失敗";
  }

  if (value === "permission") {
    return "權限不足";
  }

  if (value === "data_missing") {
    return "資料缺漏";
  }

  if (value === "condition_error") {
    return "條件錯誤";
  }

  if (value === "external_system") {
    return "外部系統異常";
  }

  return value || "-";
}

function resetFilters() {
  filters.keyword = "";
  filters.module = "all";
  filters.status = "all";
  filters.triggerType = "all";
  filters.onlyRecentFailed = "all";
  filters.onlyPendingException = "all";
  filters.sortBy = "updated_desc";
  currentPage.value = 1;
}

function notify(message, title = "已更新", type = "success") {
  ElNotification({
    title,
    message,
    type,
    position: "top-right",
  });
}

function openRuleDrawer(ruleId, mode = "view") {
  const target = enhancedRules.value.find((item) => item.id === ruleId);
  if (!target) {
    return;
  }

  activeRuleId.value = ruleId;
  drawerMode.value = mode;
  activeTab.value = "basic";
  testResult.value = null;
  testInput.recordId = "";

  if (mode !== "view") {
    hydrateDraft(target);
  }

  drawerOpen.value = true;
}

function openCreateDrawer() {
  activeRuleId.value = "";
  drawerMode.value = "create";
  activeTab.value = "basic";
  testResult.value = null;
  testInput.recordId = "";
  Object.assign(ruleDraft, createEmptyRuleDraft());
  ruleDraft.id = `wf-${String(rules.value.length + 1).padStart(3, "0")}`;
  drawerOpen.value = true;
}

function hydrateDraft(rule) {
  ruleDraft.id = rule.id;
  ruleDraft.name = rule.name;
  ruleDraft.description = rule.description || "";
  ruleDraft.priority = rule.priority || "medium";
  ruleDraft.status = rule.status || "active";
  ruleDraft.isSystemDefault = Boolean(rule.isSystemDefault);
  ruleDraft.module = rule.module;
  ruleDraft.triggerType = rule.triggerType;
  ruleDraft.triggerEvent = rule.triggerEvent;
  ruleDraft.scopeType = rule.scopeType;
  ruleDraft.scopeValue = rule.scopeValue || "";
  ruleDraft.conditionLogic = rule.conditionLogic || "and";
  ruleDraft.conditions = (rule.conditions || []).map((item) => ({ ...item }));
  ruleDraft.actions = (rule.actions || []).map((item) => ({ ...item }));
}

function addCondition() {
  ruleDraft.conditions.push(createConditionRow());
}

function removeCondition(index) {
  if (ruleDraft.conditions.length === 1) {
    return;
  }
  ruleDraft.conditions.splice(index, 1);
}

function addAction(type = "notify") {
  ruleDraft.actions.push(createActionRow(type));
}

function removeAction(index) {
  if (ruleDraft.actions.length === 1) {
    return;
  }
  ruleDraft.actions.splice(index, 1);
}

function normalizeActions(actions) {
  return actions.map((item) => ({
    ...item,
    templateId: item.templateId || "",
    recipientsInput: item.recipientsInput || "",
    assignee: item.assignee || "",
    dueInDays: Number(item.dueInDays || 0),
    field: item.field || "",
    value: item.value || "",
    note: item.note || "",
    webhookUrl: item.webhookUrl || "",
  }));
}

function hasEmptyConditions(rule) {
  return rule.conditions.some(
    (item) =>
      !item.field ||
      !item.operator ||
      (item.operator !== "is_true" &&
        item.operator !== "is_false" &&
        !String(item.value || "").trim())
  );
}

function hasInvalidActions(rule) {
  return rule.actions.some((action) => {
    if (!action.type) {
      return true;
    }

    if (action.type === "notify") {
      return !action.templateId || !String(action.recipientsInput || "").trim();
    }

    if (action.type === "create_task") {
      return !String(action.assignee || "").trim();
    }

    if (action.type === "assign_handler") {
      return !String(action.assignee || "").trim();
    }

    if (action.type === "update_status") {
      return !String(action.field || "").trim() || !String(action.value || "").trim();
    }

    if (action.type === "webhook") {
      return !String(action.webhookUrl || "").trim();
    }

    return false;
  });
}

function collectRuleWarnings(rule, skipRuleId = "") {
  const warnings = [];

  if (rule.triggerEvent === "status_changed") {
    const hasStatusUpdateAction = rule.actions.some(
      (item) =>
        item.type === "update_status" && String(item.field || "").trim() === "status"
    );

    if (hasStatusUpdateAction) {
      warnings.push("偵測到可能的循環觸發：Trigger 為狀態變更且動作包含更新狀態。");
    }
  }

  const conflictRules = enhancedRules.value.filter(
    (item) =>
      item.id !== skipRuleId &&
      item.statusMeta.value === "active" &&
      item.module === rule.module &&
      item.triggerType === rule.triggerType &&
      item.triggerEvent === rule.triggerEvent &&
      item.scopeType === rule.scopeType &&
      String(item.scopeValue || "") === String(rule.scopeValue || "")
  );

  if (conflictRules.length > 0) {
    warnings.push(
      `可能存在衝突規則：${conflictRules.map((item) => item.name).join("、")}`
    );
  }

  const notifyActionKeys = rule.actions
    .filter((item) => item.type === "notify")
    .map((item) => `${item.templateId}|${String(item.recipientsInput || "").trim()}`);

  const uniqueNotifyActions = new Set(notifyActionKeys);
  if (notifyActionKeys.length !== uniqueNotifyActions.size) {
    warnings.push("偵測到重複通知設定，可能造成重複通知。");
  }

  return warnings;
}

async function saveRule() {
  const payload = {
    id: ruleDraft.id.trim(),
    name: ruleDraft.name.trim(),
    description: ruleDraft.description.trim(),
    priority: ruleDraft.priority,
    status: ruleDraft.status,
    isSystemDefault: ruleDraft.isSystemDefault,
    module: ruleDraft.module,
    triggerType: ruleDraft.triggerType,
    triggerEvent: ruleDraft.triggerEvent,
    scopeType: ruleDraft.scopeType,
    scopeValue: ruleDraft.scopeValue.trim(),
    conditionLogic: ruleDraft.conditionLogic,
    conditions: ruleDraft.conditions.map((item) => ({ ...item })),
    actions: normalizeActions(ruleDraft.actions),
    updatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
  };

  if (!payload.name) {
    notify("請填寫規則名稱", "缺少資訊", "warning");
    return;
  }

  if (!payload.triggerType || !payload.triggerEvent || !payload.module) {
    notify("請完整設定 Trigger 模組、類型與事件", "缺少資訊", "warning");
    return;
  }

  if (payload.conditions.length === 0 || hasEmptyConditions(payload)) {
    notify("條件設定不完整，請確認欄位/運算子/值", "條件無效", "warning");
    return;
  }

  if (payload.actions.length === 0 || hasInvalidActions(payload)) {
    notify("動作設定不完整，請確認必要欄位", "動作無效", "warning");
    return;
  }

  if (
    drawerMode.value === "create" &&
    rules.value.some((item) => item.id.toLowerCase() === payload.id.toLowerCase())
  ) {
    notify("規則 ID 已存在，請調整 ID", "資料重複", "warning");
    return;
  }

  const warnings = collectRuleWarnings(
    payload,
    drawerMode.value === "edit" ? payload.id : ""
  );

  if (warnings.length > 0) {
    try {
      await ElMessageBox.confirm(warnings.join("\n"), "偵測到潛在風險", {
        confirmButtonText: "仍要儲存",
        cancelButtonText: "返回調整",
        type: "warning",
      });
    } catch {
      return;
    }
  }

  if (drawerMode.value === "create") {
    rules.value.unshift(payload);
    activeRuleId.value = payload.id;
    drawerMode.value = "view";
    notify(`規則「${payload.name}」已建立`);
    return;
  }

  rules.value = rules.value.map((item) =>
    item.id === payload.id ? { ...item, ...payload } : item
  );
  drawerMode.value = "view";
  notify(`規則「${payload.name}」已更新`);
}

function duplicateRule(rule) {
  const duplicatedId = `wf-${String(rules.value.length + 1).padStart(3, "0")}`;
  const duplicated = {
    ...rule,
    id: duplicatedId,
    name: `${rule.name}（複製）`,
    status: "inactive",
    isSystemDefault: false,
    updatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
    conditions: rule.conditions.map((item) => ({ ...item, id: createId("cond") })),
    actions: rule.actions.map((item) => ({ ...item, id: createId("act") })),
  };

  rules.value.unshift(duplicated);
  notify(`已複製規則：${duplicated.name}`);
}

function updateRuleSwitch(rule, enabled) {
  const nextStatus = enabled ? "active" : "inactive";
  rules.value = rules.value.map((item) =>
    item.id === rule.id
      ? {
          ...item,
          status: nextStatus,
          updatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
        }
      : item
  );

  notify(`${rule.name} 已${enabled ? "啟用" : "停用"}`);
}

function focusRuleLogs(rule) {
  logFocusRuleId.value = rule.id;
  notify(`已切換為「${rule.name}」執行紀錄`, "已切換", "info");
}

function resetLogFocus() {
  logFocusRuleId.value = "all";
}

async function retryLog(log) {
  if (!log.retryable || log.resolved) {
    return;
  }

  try {
    await ElMessageBox.confirm(`確認重試這筆失敗執行？（${log.id}）`, "重試執行", {
      confirmButtonText: "重試",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    return;
  }

  const success = (log.retriedCount + 1) % 2 === 1;

  logs.value = logs.value.map((item) =>
    item.id === log.id
      ? {
          ...item,
          retriedCount: item.retriedCount + 1,
          resolved: success,
          errorMessage: success
            ? `${item.errorMessage}（已重試成功）`
            : item.errorMessage,
        }
      : item
  );

  logs.value.unshift(
    createLog({
      ruleId: log.ruleId,
      executedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
      recordId: log.recordId,
      module: log.module,
      result: success ? "success" : "failed",
      conditionSummary: log.conditionSummary,
      actionSummary: `${log.actionSummary}（手動重試）`,
      errorType: success ? "" : log.errorType,
      errorMessage: success ? "手動重試成功。" : "手動重試失敗，請檢查技術細節。",
      technicalDetail: success ? "manual retry succeeded" : log.technicalDetail,
      retryable: !success,
      resolved: success,
      retriedCount: 0,
    })
  );

  notify(success ? "重試成功" : "重試失敗", "重試結果", success ? "success" : "error");
}

function runRuleTest() {
  if (!testInput.recordId.trim()) {
    notify("請輸入測試資料 ID", "缺少資訊", "warning");
    return;
  }

  const target = drawerRule.value;
  if (!target) {
    return;
  }

  const prepared =
    !hasEmptyConditions(target) &&
    !hasInvalidActions(target) &&
    target.conditions.length > 0 &&
    target.actions.length > 0;

  const hashBase = `${target.id}|${target.module}|${testInput.recordId.trim()}`;
  const hash = [...hashBase].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const matched = prepared && hash % 2 === 0;

  testResult.value = {
    recordId: testInput.recordId.trim(),
    matched,
    matchedConditions: matched
      ? target.conditions.map(
          (item) => `${item.field} ${item.operator} ${item.value || ""}`
        )
      : [],
    plannedActions: target.actions.map(
      (item) =>
        actionTypeOptions.find((opt) => opt.value === item.type)?.label || item.type
    ),
  };

  notify(
    matched ? "測試命中規則" : "測試未命中規則",
    "測試運行",
    matched ? "success" : "info"
  );
}

watch(
  () => [
    filteredRules.value.length,
    pageSize.value,
    filters.keyword,
    filters.module,
    filters.status,
    filters.triggerType,
    filters.onlyRecentFailed,
    filters.onlyPendingException,
    filters.sortBy,
  ],
  () => {
    currentPage.value = 1;
  }
);

watch(
  () => drawerOpen.value,
  (open) => {
    if (!open) {
      drawerMode.value = "view";
      testResult.value = null;
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
            流程自動化
          </h1>
          <p class="text-sm text-slate-500">自動化規則管理、執行監控與異常排除中心</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton :icon="Refresh" @click="resetFilters">重新整理</ElButton>
          <ElButton type="primary" :icon="CirclePlus" @click="openCreateDrawer">
            新增規則
          </ElButton>
        </div>
      </header>

      <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="card in monitorCards"
          :key="card.label"
          class="rounded-2xl border border-slate-200 bg-white px-4 py-4"
        >
          <p class="text-xs text-slate-500">{{ card.label }}</p>
          <p class="mt-2 text-xl font-semibold text-slate-900">{{ card.value }}</p>
        </article>
      </section>

      <section
        class="overflow-hidden rounded-2xl border border-slate-200 bg-white px-6 py-4"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <ElInput
              v-model="filters.keyword"
              placeholder="搜尋規則名稱 / 規則說明"
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

          <ElTag round effect="plain">規則 {{ filteredRules.length }} 筆</ElTag>
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
              <ElSelect v-model="filters.module">
                <ElOption
                  v-for="item in moduleOptions"
                  :key="`module-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem class="mb-0">
              <ElSelect v-model="filters.status">
                <ElOption
                  v-for="item in statusOptions"
                  :key="`status-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem class="mb-0">
              <ElSelect v-model="filters.triggerType">
                <ElOption
                  v-for="item in triggerTypeOptions"
                  :key="`trigger-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem class="mb-0">
              <ElSelect v-model="filters.onlyRecentFailed">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`failed-${item.value}`"
                  :label="`最近失敗：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem class="mb-0">
              <ElSelect v-model="filters.onlyPendingException">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`pending-${item.value}`"
                  :label="`待處理異常：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem class="mb-0">
              <ElSelect v-model="filters.sortBy">
                <ElOption
                  v-for="item in sortOptions"
                  :key="`sort-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </transition>

        <div class="mt-4 border-t border-slate-200"></div>

        <ElTable
          v-loading="loading"
          table-layout="auto"
          :data="pagedRules"
          class="rule-table"
          @row-click="(row) => openRuleDrawer(row.id, 'view')"
        >
          <ElTableColumn label="規則名稱" min-width="260">
            <template #default="{ row }">
              <button
                type="button"
                class="grid gap-1 text-left"
                @click="openRuleDrawer(row.id, 'view')"
              >
                <span class="font-semibold text-slate-900 hover:text-[#409eff]">{{
                  row.name
                }}</span>
                <span class="text-xs text-slate-500">{{ row.description || "-" }}</span>
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="觸發模組" min-width="110">
            <template #default="{ row }">
              <ElTag :type="moduleTagType(row.module)" size="small" effect="light">
                {{ getModuleLabel(row.module) }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="觸發事件" min-width="200">
            <template #default="{ row }">
              <p class="text-sm text-slate-800">
                {{ getTriggerTypeLabel(row.triggerType) }} /
                {{ getTriggerEventLabel(row.triggerType, row.triggerEvent) }}
              </p>
            </template>
          </ElTableColumn>

          <ElTableColumn label="作用範圍" width="170">
            <template #default="{ row }">
              <p class="text-sm text-slate-700">
                {{ row.scopeType }}{{ row.scopeValue ? `：${row.scopeValue}` : "" }}
              </p>
            </template>
          </ElTableColumn>

          <ElTableColumn label="最後執行" min-width="150">
            <template #default="{ row }">{{ formatDateTime(row.lastRunAt) }}</template>
          </ElTableColumn>

          <ElTableColumn label="7天執行" min-width="110" align="right">
            <template #default="{ row }">{{ row.runs7d }}</template>
          </ElTableColumn>

          <ElTableColumn label="7天失敗" min-width="110" align="right">
            <template #default="{ row }">{{ row.failures7d }}</template>
          </ElTableColumn>

          <ElTableColumn label="成功率" min-width="100">
            <template #default="{ row }">
              <ElTag
                :type="successRateTagType(row.successRate)"
                size="small"
                effect="light"
              >
                {{ row.successRate }}%
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="狀態" min-width="150">
            <template #default="{ row }">
              <div class="flex items-center gap-2" @click.stop>
                <ElSwitch
                  :model-value="row.status === 'active'"
                  @update:model-value="(value) => updateRuleSwitch(row, value)"
                />
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <div class="flex items-center justify-end gap-1">
                <ElButton text type="primary" @click.stop="openRuleDrawer(row.id, 'edit')"
                  >編輯</ElButton
                >
                <ElButton text @click.stop="duplicateRule(row)">複製</ElButton>
                <ElButton text @click.stop="focusRuleLogs(row)">日誌</ElButton>
              </div>
            </template>
          </ElTableColumn>
        </ElTable>

        <ElEmpty
          v-if="pagedRules.length === 0"
          class="py-8"
          description="目前沒有符合條件的規則"
          :image-size="90"
        />

        <div
          class="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-5"
        >
          <ElPagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            layout="total, prev, pager, next"
            :total="filteredRules.length"
            background
          />

          <ElSelect v-model="pageSize" class="!w-[96px]" @change="currentPage = 1">
            <ElOption :value="10" label="10 筆" />
            <ElOption :value="20" label="20 筆" />
            <ElOption :value="50" label="50 筆" />
          </ElSelect>
        </div>
      </section>
    </section>

    <ElDrawer
      v-model="drawerOpen"
      :size="'62%'"
      :destroy-on-close="false"
      :title="
        drawerMode === 'create'
          ? '新增規則'
          : drawerMode === 'edit'
          ? '編輯規則'
          : '規則詳情'
      "
    >
      <template v-if="drawerRule">
        <section class="grid gap-4">
          <header class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="grid gap-1">
                <h2 class="text-xl font-semibold text-slate-900">
                  {{ drawerRule.name || "未命名規則" }}
                </h2>
                <p class="text-xs text-slate-500">{{ drawerRule.id || "-" }}</p>
                <div class="flex flex-wrap items-center gap-1">
                  <ElTag
                    :type="
                      getRuleStatusMeta(
                        drawerRule.status,
                        activeRule?.pendingExceptions || 0
                      ).type
                    "
                    size="small"
                    effect="light"
                  >
                    {{
                      getRuleStatusMeta(
                        drawerRule.status,
                        activeRule?.pendingExceptions || 0
                      ).label
                    }}
                  </ElTag>
                  <ElTag
                    :type="moduleTagType(drawerRule.module)"
                    size="small"
                    effect="light"
                  >
                    {{ getModuleLabel(drawerRule.module) }}
                  </ElTag>
                  <ElTag size="small" effect="plain"
                    >Priority：{{ drawerRule.priority }}</ElTag
                  >
                </div>
              </div>

              <div class="flex items-center gap-2">
                <template v-if="drawerMode === 'view'">
                  <ElButton @click="openRuleDrawer(drawerRule.id, 'edit')">編輯</ElButton>
                </template>
                <template v-else>
                  <ElButton @click="drawerOpen = false">取消</ElButton>
                  <ElButton type="primary" @click="saveRule">儲存</ElButton>
                </template>
              </div>
            </div>
          </header>

          <div class="border-b border-slate-200 px-1 pt-1">
            <ElTabs v-model="activeTab" class="detail-tabs">
              <ElTabPane name="basic" label="基本資訊" />
              <ElTabPane name="trigger" label="Trigger" />
              <ElTabPane name="conditions" label="Conditions" />
              <ElTabPane name="actions" label="Actions" />
              <ElTabPane name="logs" label="執行紀錄" />
              <ElTabPane name="test" label="測試運行" />
            </ElTabs>
          </div>

          <section class="grid gap-4">
            <template v-if="activeTab === 'basic'">
              <template v-if="drawerMode === 'view'">
                <ElDescriptions :column="2" border>
                  <ElDescriptionsItem label="規則名稱">{{
                    drawerRule.name
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="規則 ID">{{
                    drawerRule.id
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="規則說明" :span="2">{{
                    drawerRule.description || "-"
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="優先等級">{{
                    drawerRule.priority
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="是否系統預設">{{
                    drawerRule.isSystemDefault ? "是" : "否"
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="狀態">{{
                    getRuleStatusMeta(drawerRule.status).label
                  }}</ElDescriptionsItem>
                  <ElDescriptionsItem label="更新時間">{{
                    formatDateTime(drawerRule.updatedAt)
                  }}</ElDescriptionsItem>
                </ElDescriptions>
              </template>

              <template v-else>
                <ElForm label-position="top" class="grid gap-3">
                  <div class="grid gap-3 md:grid-cols-2">
                    <ElFormItem label="規則名稱">
                      <ElInput v-model="ruleDraft.name" />
                    </ElFormItem>
                    <ElFormItem label="規則 ID">
                      <ElInput v-model="ruleDraft.id" :disabled="drawerMode === 'edit'" />
                    </ElFormItem>
                    <ElFormItem label="優先等級">
                      <ElSelect v-model="ruleDraft.priority">
                        <ElOption
                          v-for="item in priorityOptions"
                          :key="`priority-${item.value}`"
                          :label="item.label"
                          :value="item.value"
                        />
                      </ElSelect>
                    </ElFormItem>
                    <ElFormItem label="狀態">
                      <ElSelect v-model="ruleDraft.status">
                        <ElOption
                          v-for="item in ruleStatusSelectOptions"
                          :key="`rule-status-${item.value}`"
                          :label="item.label"
                          :value="item.value"
                        />
                      </ElSelect>
                    </ElFormItem>
                  </div>

                  <ElFormItem label="規則說明">
                    <ElInput v-model="ruleDraft.description" type="textarea" :rows="3" />
                  </ElFormItem>
                </ElForm>
              </template>
            </template>

            <template v-else-if="activeTab === 'trigger'">
              <article class="panel-card">
                <template v-if="drawerMode === 'view'">
                  <ElDescriptions :column="2" border>
                    <ElDescriptionsItem label="觸發類型">
                      {{ getTriggerTypeLabel(drawerRule.triggerType) }}
                    </ElDescriptionsItem>
                    <ElDescriptionsItem label="觸發模組">{{
                      getModuleLabel(drawerRule.module)
                    }}</ElDescriptionsItem>
                    <ElDescriptionsItem label="觸發事件">
                      {{
                        getTriggerEventLabel(
                          drawerRule.triggerType,
                          drawerRule.triggerEvent
                        )
                      }}
                    </ElDescriptionsItem>
                    <ElDescriptionsItem label="作用範圍">
                      {{ drawerRule.scopeType
                      }}{{ drawerRule.scopeValue ? `：${drawerRule.scopeValue}` : "" }}
                    </ElDescriptionsItem>
                  </ElDescriptions>
                </template>

                <template v-else>
                  <ElForm label-position="top" class="grid gap-3">
                    <div class="grid gap-3 md:grid-cols-2">
                      <ElFormItem label="觸發類型">
                        <ElSelect v-model="ruleDraft.triggerType">
                          <ElOption
                            v-for="item in triggerTypeSelectOptions"
                            :key="`trigger-type-${item.value}`"
                            :label="item.label"
                            :value="item.value"
                          />
                        </ElSelect>
                      </ElFormItem>
                      <ElFormItem label="觸發模組">
                        <ElSelect v-model="ruleDraft.module">
                          <ElOption
                            v-for="item in moduleSelectOptions"
                            :key="`module-select-${item.value}`"
                            :label="item.label"
                            :value="item.value"
                          />
                        </ElSelect>
                      </ElFormItem>
                      <ElFormItem label="觸發事件">
                        <ElSelect v-model="ruleDraft.triggerEvent">
                          <ElOption
                            v-for="item in triggerEventOptionsMap[
                              ruleDraft.triggerType
                            ] || []"
                            :key="`trigger-event-${item.value}`"
                            :label="item.label"
                            :value="item.value"
                          />
                        </ElSelect>
                      </ElFormItem>
                      <ElFormItem label="作用範圍">
                        <ElSelect v-model="ruleDraft.scopeType">
                          <ElOption
                            v-for="item in scopeOptions"
                            :key="`scope-${item.value}`"
                            :label="item.label"
                            :value="item.value"
                          />
                        </ElSelect>
                      </ElFormItem>
                    </div>

                    <ElFormItem v-if="ruleDraft.scopeType !== 'global'" label="範圍值">
                      <ElInput
                        v-model="ruleDraft.scopeValue"
                        :placeholder="
                          ruleDraft.scopeType === 'department'
                            ? '例如：Business Development'
                            : ruleDraft.scopeType === 'role'
                            ? '例如：finance'
                            : '例如：contract'
                        "
                      />
                    </ElFormItem>
                  </ElForm>
                </template>
              </article>
            </template>

            <template v-else-if="activeTab === 'conditions'">
              <article class="panel-card">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h3 class="panel-title">條件設定（IF）</h3>
                  <template v-if="drawerMode !== 'view'">
                    <ElButton text type="primary" @click="addCondition"
                      >新增條件</ElButton
                    >
                  </template>
                </div>

                <template v-if="drawerMode !== 'view'">
                  <div class="mt-3 flex items-center gap-2">
                    <span class="text-sm text-slate-600">條件邏輯</span>
                    <ElSelect v-model="ruleDraft.conditionLogic" class="!w-[120px]">
                      <ElOption label="AND" value="and" />
                      <ElOption label="OR" value="or" />
                    </ElSelect>
                  </div>
                </template>

                <div class="mt-3 grid gap-2">
                  <article
                    v-for="(condition, index) in drawerMode === 'view'
                      ? drawerRule.conditions
                      : ruleDraft.conditions"
                    :key="condition.id"
                    class="rounded-xl border border-slate-200 px-3 py-3"
                  >
                    <template v-if="drawerMode === 'view'">
                      <p class="text-sm text-slate-800">
                        {{ condition.field }} {{ condition.operator }}
                        {{ condition.value || "" }}
                      </p>
                    </template>

                    <template v-else>
                      <div class="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                        <ElSelect v-model="condition.field">
                          <ElOption
                            v-for="item in conditionFieldOptions"
                            :key="`condition-field-${item.value}`"
                            :label="item.label"
                            :value="item.value"
                          />
                        </ElSelect>
                        <ElSelect v-model="condition.operator">
                          <ElOption
                            v-for="item in conditionOperatorOptions"
                            :key="`condition-op-${item.value}`"
                            :label="item.label"
                            :value="item.value"
                          />
                        </ElSelect>
                        <ElInput
                          v-model="condition.value"
                          :disabled="
                            condition.operator === 'is_true' ||
                            condition.operator === 'is_false'
                          "
                          placeholder="輸入比較值"
                        />
                        <ElButton
                          text
                          type="danger"
                          :disabled="ruleDraft.conditions.length === 1"
                          @click="removeCondition(index)"
                        >
                          移除
                        </ElButton>
                      </div>
                    </template>
                  </article>
                </div>
              </article>
            </template>

            <template v-else-if="activeTab === 'actions'">
              <article class="panel-card">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h3 class="panel-title">執行動作（THEN）</h3>
                  <template v-if="drawerMode !== 'view'">
                    <ElButton text type="primary" @click="addAction('notify')"
                      >新增動作</ElButton
                    >
                  </template>
                </div>

                <div class="mt-3 grid gap-2">
                  <article
                    v-for="(action, index) in drawerMode === 'view'
                      ? drawerRule.actions
                      : ruleDraft.actions"
                    :key="action.id"
                    class="rounded-xl border border-slate-200 px-3 py-3"
                  >
                    <template v-if="drawerMode === 'view'">
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <ElTag size="small" effect="light">{{
                          actionTypeOptions.find((item) => item.value === action.type)
                            ?.label || action.type
                        }}</ElTag>
                        <p class="text-xs text-slate-500">{{ action.note || "-" }}</p>
                      </div>
                      <p class="mt-1 text-xs text-slate-600">
                        template={{ action.templateId || "-" }} / recipients={{
                          action.recipientsInput || "-"
                        }}
                        / assignee={{ action.assignee || "-" }} / field={{
                          action.field || "-"
                        }}
                        / value={{ action.value || "-" }}
                      </p>
                    </template>

                    <template v-else>
                      <div class="grid gap-2 md:grid-cols-2">
                        <ElFormItem label="動作類型" class="mb-0">
                          <ElSelect v-model="action.type">
                            <ElOption
                              v-for="item in actionTypeOptions"
                              :key="`action-type-${item.value}`"
                              :label="item.label"
                              :value="item.value"
                            />
                          </ElSelect>
                        </ElFormItem>

                        <ElFormItem
                          v-if="action.type === 'notify'"
                          label="通知範本"
                          class="mb-0"
                        >
                          <ElSelect v-model="action.templateId">
                            <ElOption
                              v-for="item in notificationTemplateOptions"
                              :key="`notify-template-${item.value}`"
                              :label="item.label"
                              :value="item.value"
                            />
                          </ElSelect>
                        </ElFormItem>

                        <ElFormItem
                          v-if="action.type === 'notify'"
                          label="接收人"
                          class="mb-0 md:col-span-2"
                        >
                          <ElInput
                            v-model="action.recipientsInput"
                            placeholder="例如：{商機負責人},sales_manager"
                          />
                        </ElFormItem>

                        <ElFormItem
                          v-if="
                            action.type === 'create_task' ||
                            action.type === 'assign_handler'
                          "
                          label="指派對象"
                          class="mb-0"
                        >
                          <ElInput
                            v-model="action.assignee"
                            placeholder="例如：finance_oncall"
                          />
                        </ElFormItem>

                        <ElFormItem
                          v-if="action.type === 'create_task'"
                          label="期限（天）"
                          class="mb-0"
                        >
                          <ElInput v-model="action.dueInDays" type="number" min="0" />
                        </ElFormItem>

                        <ElFormItem
                          v-if="action.type === 'update_status'"
                          label="欄位"
                          class="mb-0"
                        >
                          <ElInput v-model="action.field" placeholder="例如：status" />
                        </ElFormItem>

                        <ElFormItem
                          v-if="action.type === 'update_status'"
                          label="值"
                          class="mb-0"
                        >
                          <ElInput
                            v-model="action.value"
                            placeholder="例如：in_progress"
                          />
                        </ElFormItem>

                        <ElFormItem
                          v-if="action.type === 'webhook'"
                          label="Webhook URL"
                          class="mb-0 md:col-span-2"
                        >
                          <ElInput
                            v-model="action.webhookUrl"
                            placeholder="https://example.com/hook"
                          />
                        </ElFormItem>

                        <ElFormItem label="備註" class="mb-0 md:col-span-2">
                          <ElInput v-model="action.note" placeholder="可填入動作說明" />
                        </ElFormItem>
                      </div>

                      <div class="mt-2 flex justify-end">
                        <ElButton
                          text
                          type="danger"
                          :disabled="ruleDraft.actions.length === 1"
                          @click="removeAction(index)"
                        >
                          移除
                        </ElButton>
                      </div>
                    </template>
                  </article>
                </div>
              </article>
            </template>

            <template v-else-if="activeTab === 'logs'">
              <article class="panel-card">
                <h3 class="panel-title">規則執行紀錄</h3>
                <ElTable class="mt-3" table-layout="auto" :data="drawerRuleLogs">
                  <ElTableColumn label="執行時間" min-width="140">
                    <template #default="{ row }">{{
                      formatDateTime(row.executedAt)
                    }}</template>
                  </ElTableColumn>
                  <ElTableColumn label="資料 ID" min-width="120">
                    <template #default="{ row }">{{ row.recordId }}</template>
                  </ElTableColumn>
                  <ElTableColumn label="條件摘要" min-width="180" show-overflow-tooltip>
                    <template #default="{ row }">{{ row.conditionSummary }}</template>
                  </ElTableColumn>
                  <ElTableColumn label="動作摘要" min-width="180" show-overflow-tooltip>
                    <template #default="{ row }">{{ row.actionSummary }}</template>
                  </ElTableColumn>
                  <ElTableColumn label="結果" min-width="100">
                    <template #default="{ row }">
                      <ElTag
                        :type="logResultTagType(row.result)"
                        size="small"
                        effect="light"
                      >
                        {{ logResultLabel(row.result) }}
                      </ElTag>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn label="重試" min-width="90" align="right">
                    <template #default="{ row }">
                      <ElButton
                        v-if="row.result === 'failed'"
                        text
                        type="primary"
                        :disabled="!row.retryable || row.resolved"
                        @click="retryLog(row)"
                      >
                        {{ row.resolved ? "已處理" : "重試" }}
                      </ElButton>
                      <span v-else class="text-xs text-slate-400">-</span>
                    </template>
                  </ElTableColumn>
                </ElTable>

                <ElEmpty
                  v-if="drawerRuleLogs.length === 0"
                  class="mt-3"
                  description="目前沒有執行紀錄"
                  :image-size="80"
                />
              </article>
            </template>

            <template v-else-if="activeTab === 'test'">
              <article class="panel-card">
                <h3 class="panel-title">規則測試運行</h3>
                <p class="mt-1 text-xs text-slate-500">
                  可輸入測試資料 ID，預覽是否命中條件與預計執行動作。
                </p>

                <div class="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                  <ElInput
                    v-model="testInput.recordId"
                    placeholder="例如：opp-012 / ct-021 / iss-018"
                  />
                  <ElButton type="primary" @click="runRuleTest">測試運行</ElButton>
                </div>

                <article
                  v-if="testResult"
                  class="mt-4 rounded-xl border border-slate-200 px-3 py-3"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <p class="text-sm font-semibold text-slate-800">
                      測試資料：{{ testResult.recordId }}
                    </p>
                    <ElTag
                      :type="testResult.matched ? 'success' : 'info'"
                      size="small"
                      effect="light"
                    >
                      {{ testResult.matched ? "命中規則" : "未命中規則" }}
                    </ElTag>
                  </div>

                  <div class="mt-2 grid gap-2">
                    <p class="text-xs text-slate-600">
                      命中條件：{{
                        testResult.matchedConditions.length > 0
                          ? testResult.matchedConditions.join(" / ")
                          : "無"
                      }}
                    </p>
                    <p class="text-xs text-slate-600">
                      預計動作：{{
                        testResult.plannedActions.length > 0
                          ? testResult.plannedActions.join("、")
                          : "無"
                      }}
                    </p>
                  </div>
                </article>
              </article>
            </template>
          </section>
        </section>
      </template>
    </ElDrawer>
  </div>
</template>

<style scoped>
.rule-table :deep(.el-table__row) {
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
