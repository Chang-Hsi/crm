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
const activeTab = ref("services");

const servicesFilterOpen = ref(false);
const rulesFilterOpen = ref(false);
const logsFilterOpen = ref(false);

const servicesPage = ref(1);
const servicesPageSize = ref(10);
const rulesPage = ref(1);
const rulesPageSize = ref(10);
const logsPage = ref(1);
const logsPageSize = ref(10);

const integrationDrawerOpen = ref(false);
const integrationDrawerMode = ref("view");
const activeIntegrationId = ref("");

const ruleDrawerOpen = ref(false);
const ruleDrawerMode = ref("view");
const activeRuleId = ref("");

const webhookDrawerOpen = ref(false);
const webhookDrawerMode = ref("view");
const activeWebhookId = ref("");

const notificationDrawerOpen = ref(false);
const notificationDrawerMode = ref("view");
const activeNotificationId = ref("");

const logDrawerOpen = ref(false);
const activeLogId = ref("");

const integrations = ref(createSeedIntegrations());
const syncRules = ref(createSeedRules());
const webhooks = ref(createSeedWebhooks());
const notificationRules = ref(createSeedNotificationRules());
const syncLogs = ref(createSeedSyncLogs());

const servicesFilters = reactive({
  keyword: "",
  type: "all",
  connectionStatus: "all",
  enabled: "all",
});

const rulesFilters = reactive({
  keyword: "",
  integrationId: "all",
  dataType: "all",
  direction: "all",
  enabled: "all",
});

const logsFilters = reactive({
  keyword: "",
  integrationId: "all",
  type: "all",
  result: "all",
  dateRange: [],
});

const integrationDraft = reactive(createEmptyIntegrationDraft());
const ruleDraft = reactive(createEmptyRuleDraft());
const webhookDraft = reactive(createEmptyWebhookDraft());
const notificationDraft = reactive(createEmptyNotificationDraft());

const integrationTypeOptions = [
  { value: "email", label: "Email" },
  { value: "calendar", label: "Calendar" },
  { value: "erp", label: "ERP / 訂單系統" },
  { value: "issue", label: "客服 / Issue" },
  { value: "form", label: "表單工具" },
  { value: "notify", label: "通知工具" },
  { value: "custom_api", label: "自訂 API" },
];

const integrationTypeFilterOptions = [
  { value: "all", label: "類型：全部" },
  ...integrationTypeOptions,
];

const connectionStatusOptions = [
  { value: "all", label: "連線狀態：全部" },
  { value: "connected", label: "已連線" },
  { value: "not_connected", label: "未連線" },
  { value: "auth_failed", label: "驗證失敗" },
  { value: "sync_error", label: "同步異常" },
];

const enabledFilterOptions = [
  { value: "all", label: "啟用：全部" },
  { value: "yes", label: "啟用中" },
  { value: "no", label: "停用" },
];

const syncDataTypeOptions = [
  { value: "customer", label: "客戶" },
  { value: "contact", label: "聯絡人" },
  { value: "opportunity", label: "商機" },
  { value: "quote", label: "報價" },
  { value: "order", label: "訂單" },
  { value: "issue", label: "Issue / 客訴" },
  { value: "activity", label: "活動紀錄" },
];

const syncDataTypeFilterOptions = [
  { value: "all", label: "資料類型：全部" },
  ...syncDataTypeOptions,
];

const directionOptions = [
  { value: "crm_to_external", label: "CRM → 外部系統" },
  { value: "external_to_crm", label: "外部系統 → CRM" },
  { value: "bidirectional", label: "雙向同步" },
];

const directionFilterOptions = [
  { value: "all", label: "同步方向：全部" },
  ...directionOptions,
];

const frequencyOptions = [
  { value: "realtime", label: "即時" },
  { value: "5m", label: "每 5 分鐘" },
  { value: "hourly", label: "每小時" },
  { value: "daily", label: "每日" },
  { value: "manual", label: "手動" },
];

const conflictPolicyOptions = [
  { value: "crm_priority", label: "以 CRM 為主" },
  { value: "external_priority", label: "以外部系統為主" },
  { value: "latest_update", label: "以最新更新時間為主" },
  { value: "need_confirmation", label: "發生衝突時建立待確認項目" },
];

const logTypeOptions = [
  { value: "all", label: "類型：全部" },
  { value: "sync", label: "資料同步" },
  { value: "auth", label: "驗證" },
  { value: "webhook", label: "Webhook" },
  { value: "manual", label: "手動重送" },
];

const logResultOptions = [
  { value: "all", label: "結果：全部" },
  { value: "success", label: "成功" },
  { value: "partial_success", label: "部分成功" },
  { value: "failed", label: "失敗" },
  { value: "retrying", label: "重試中" },
];

const webhookEventOptions = [
  { value: "lead_created", label: "新 Lead 建立" },
  { value: "opportunity_won", label: "商機成交" },
  { value: "quote_sent", label: "報價送出" },
  { value: "issue_created", label: "客訴建立" },
  { value: "issue_escalated", label: "客訴升級" },
  { value: "sync_failed", label: "同步失敗" },
  { value: "auth_failed", label: "API 驗證失敗" },
];

const notificationChannelOptions = [
  { value: "email", label: "Email" },
  { value: "slack", label: "Slack / Teams" },
  { value: "in_app", label: "系統內通知" },
  { value: "webhook", label: "Webhook" },
];

const retryStrategyOptions = [
  { value: "none", label: "不重送" },
  { value: "fixed_3", label: "固定重送 3 次" },
  { value: "exp_5", label: "指數退避 5 次" },
];

const requestMethodOptions = [
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "PATCH", label: "PATCH" },
];

const serviceSummaryCards = computed(() => {
  const enabledCount = integrations.value.filter((item) => item.enabled).length;
  const start24h = Date.now() - 24 * 60 * 60 * 1000;

  const recentLogs = syncLogs.value.filter(
    (item) => toTimestamp(item.executedAt) >= start24h
  );
  const successCount = recentLogs.filter((item) => item.result === "success").length;
  const failedCount = recentLogs.filter((item) => item.result === "failed").length;

  const lastSyncAt = integrations.value
    .map((item) => item.lastSyncAt)
    .filter(Boolean)
    .sort((a, b) => toTimestamp(b) - toTimestamp(a))[0];

  return [
    { label: "已啟用整合數", value: enabledCount },
    { label: "最近 24 小時同步成功次數", value: successCount },
    { label: "最近 24 小時同步失敗次數", value: failedCount },
    { label: "最後同步時間", value: formatDateTime(lastSyncAt) },
  ];
});

const integrationOptions = computed(() =>
  integrations.value.map((item) => ({ value: item.id, label: item.name }))
);

const integrationFilterOptions = computed(() => [
  { value: "all", label: "整合系統：全部" },
  ...integrationOptions.value,
]);

const filteredServices = computed(() => {
  const keyword = servicesFilters.keyword.trim().toLowerCase();

  return integrations.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.name.toLowerCase().includes(keyword) ||
      String(item.description || "")
        .toLowerCase()
        .includes(keyword);

    const matchesType =
      servicesFilters.type === "all" || item.type === servicesFilters.type;

    const matchesConnection =
      servicesFilters.connectionStatus === "all" ||
      item.connectionStatus === servicesFilters.connectionStatus;

    const matchesEnabled =
      servicesFilters.enabled === "all" ||
      (servicesFilters.enabled === "yes" ? item.enabled : !item.enabled);

    return matchesKeyword && matchesType && matchesConnection && matchesEnabled;
  });
});

const pagedServices = computed(() => {
  const start = (servicesPage.value - 1) * servicesPageSize.value;
  return filteredServices.value.slice(start, start + servicesPageSize.value);
});

const filteredRules = computed(() => {
  const keyword = rulesFilters.keyword.trim().toLowerCase();

  return syncRules.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.name.toLowerCase().includes(keyword) ||
      String(item.filterCondition || "")
        .toLowerCase()
        .includes(keyword);

    const matchesIntegration =
      rulesFilters.integrationId === "all" ||
      item.integrationId === rulesFilters.integrationId;

    const matchesDataType =
      rulesFilters.dataType === "all" || item.dataType === rulesFilters.dataType;

    const matchesDirection =
      rulesFilters.direction === "all" || item.direction === rulesFilters.direction;

    const matchesEnabled =
      rulesFilters.enabled === "all" ||
      (rulesFilters.enabled === "yes" ? item.enabled : !item.enabled);

    return (
      matchesKeyword &&
      matchesIntegration &&
      matchesDataType &&
      matchesDirection &&
      matchesEnabled
    );
  });
});

const pagedRules = computed(() => {
  const start = (rulesPage.value - 1) * rulesPageSize.value;
  return filteredRules.value.slice(start, start + rulesPageSize.value);
});

const filteredLogs = computed(() => {
  const keyword = logsFilters.keyword.trim().toLowerCase();

  return syncLogs.value
    .filter((item) => {
      const matchesKeyword =
        keyword.length === 0 ||
        item.name.toLowerCase().includes(keyword) ||
        String(item.errorMessage || "")
          .toLowerCase()
          .includes(keyword) ||
        String(item.requestSummary || "")
          .toLowerCase()
          .includes(keyword);

      const matchesIntegration =
        logsFilters.integrationId === "all" ||
        item.integrationId === logsFilters.integrationId;

      const matchesType = logsFilters.type === "all" || item.type === logsFilters.type;

      const matchesResult =
        logsFilters.result === "all" || item.result === logsFilters.result;

      const matchesDateRange = isDateWithinRange(item.executedAt, logsFilters.dateRange);

      return (
        matchesKeyword &&
        matchesIntegration &&
        matchesType &&
        matchesResult &&
        matchesDateRange
      );
    })
    .sort((a, b) => toTimestamp(b.executedAt) - toTimestamp(a.executedAt));
});

const pagedLogs = computed(() => {
  const start = (logsPage.value - 1) * logsPageSize.value;
  return filteredLogs.value.slice(start, start + logsPageSize.value);
});

const activeIntegration = computed(
  () => integrations.value.find((item) => item.id === activeIntegrationId.value) || null
);

const activeRule = computed(
  () => syncRules.value.find((item) => item.id === activeRuleId.value) || null
);

const activeWebhook = computed(
  () => webhooks.value.find((item) => item.id === activeWebhookId.value) || null
);

const activeNotification = computed(
  () =>
    notificationRules.value.find((item) => item.id === activeNotificationId.value) || null
);

const activeLog = computed(
  () => syncLogs.value.find((item) => item.id === activeLogId.value) || null
);

const integrationDrawerData = computed(() => {
  if (!integrationDrawerOpen.value) {
    return null;
  }

  if (integrationDrawerMode.value === "view") {
    return activeIntegration.value;
  }

  return integrationDraft;
});

const ruleDrawerData = computed(() => {
  if (!ruleDrawerOpen.value) {
    return null;
  }

  if (ruleDrawerMode.value === "view") {
    return activeRule.value;
  }

  return ruleDraft;
});

const webhookDrawerData = computed(() => {
  if (!webhookDrawerOpen.value) {
    return null;
  }

  if (webhookDrawerMode.value === "view") {
    return activeWebhook.value;
  }

  return webhookDraft;
});

const notificationDrawerData = computed(() => {
  if (!notificationDrawerOpen.value) {
    return null;
  }

  if (notificationDrawerMode.value === "view") {
    return activeNotification.value;
  }

  return notificationDraft;
});

function createEmptyIntegrationDraft() {
  return {
    id: "",
    name: "",
    type: "email",
    description: "",
    enabled: true,
    connectionStatus: "not_connected",
    createdAt: "",
    lastSyncAt: "",
    authMethod: "api_key",
    apiKey: "",
    clientId: "",
    clientSecret: "",
    accessToken: "",
    endpointUrl: "",
    tenantId: "",
    apiBaseUrl: "",
    timeoutSec: 15,
    retryCount: 3,
    autoRetry: true,
    whitelistHint: "目前 IP 白名單設定請於 IT 內網進行。",
    customApiHint: "",
    lastTestStatus: "not_tested",
    lastTestedAt: "",
    lastTestMessage: "",
  };
}

function createEmptyRuleDraft() {
  return {
    id: "",
    name: "",
    integrationId: "",
    dataType: "customer",
    direction: "crm_to_external",
    frequency: "hourly",
    conflictPolicy: "latest_update",
    enabled: true,
    lastRunAt: "",
    allowManual: true,
    onlyMatchedData: false,
    filterCondition: "",
    conflictDetection: "以主鍵與最後更新時間判定衝突",
    notifyManager: true,
    mappings: [
      {
        id: createId("map"),
        crmField: "company_name",
        externalField: "customer_name",
        required: true,
        defaultValue: "",
        transformRule: "",
      },
    ],
  };
}

function createEmptyWebhookDraft() {
  return {
    id: "",
    name: "",
    endpointUrl: "",
    secret: "",
    method: "POST",
    headersInput: "Content-Type: application/json",
    events: [],
    retryStrategy: "fixed_3",
    enabled: true,
    lastSentAt: "",
  };
}

function createEmptyNotificationDraft() {
  return {
    id: "",
    name: "",
    events: [],
    channels: ["in_app"],
    recipients: "",
    mergeNotify: true,
    onlyFailedEvents: false,
    enabled: true,
  };
}

function createSeedIntegrations() {
  return [
    {
      id: "itg-001",
      name: "Google Workspace",
      type: "email",
      description: "同步 Email 與 Calendar 活動紀錄",
      enabled: true,
      connectionStatus: "connected",
      createdAt: "2026-03-21 09:10",
      lastSyncAt: "2026-04-10 10:42",
      authMethod: "oauth",
      apiKey: "",
      clientId: "gw-client-id",
      clientSecret: "gw-secret",
      accessToken: "oauth-token-hidden",
      endpointUrl: "https://www.googleapis.com",
      tenantId: "workspace-main",
      apiBaseUrl: "https://www.googleapis.com",
      timeoutSec: 15,
      retryCount: 3,
      autoRetry: true,
      whitelistHint: "Google 不需白名單，僅確認 callback domain 已註冊。",
      customApiHint: "",
      lastTestStatus: "success",
      lastTestedAt: "2026-04-10 10:30",
      lastTestMessage: "OAuth 驗證正常，API quota 正常。",
    },
    {
      id: "itg-002",
      name: "Apex ERP",
      type: "erp",
      description: "同步訂單、出貨與發票狀態",
      enabled: true,
      connectionStatus: "sync_error",
      createdAt: "2026-02-15 14:20",
      lastSyncAt: "2026-04-10 09:55",
      authMethod: "api_key",
      apiKey: "apex-erp-key",
      clientId: "",
      clientSecret: "",
      accessToken: "",
      endpointUrl: "https://erp.apex.example/api",
      tenantId: "tw-sales",
      apiBaseUrl: "https://erp.apex.example/api/v1",
      timeoutSec: 20,
      retryCount: 5,
      autoRetry: true,
      whitelistHint: "ERP 端需加入 CRM 出口 IP，異動請通知 IT。",
      customApiHint: "",
      lastTestStatus: "failed",
      lastTestedAt: "2026-04-10 09:50",
      lastTestMessage: "回應逾時，請檢查 ERP API gateway。",
    },
    {
      id: "itg-003",
      name: "SupportDesk",
      type: "issue",
      description: "Issue / 客訴雙向同步",
      enabled: false,
      connectionStatus: "auth_failed",
      createdAt: "2026-01-11 11:00",
      lastSyncAt: "2026-04-08 16:22",
      authMethod: "token",
      apiKey: "",
      clientId: "",
      clientSecret: "",
      accessToken: "support-token",
      endpointUrl: "https://api.supportdesk.example",
      tenantId: "crm-team",
      apiBaseUrl: "https://api.supportdesk.example/v2",
      timeoutSec: 12,
      retryCount: 2,
      autoRetry: false,
      whitelistHint: "SupportDesk 要求固定出口 IP，停用後請重驗證。",
      customApiHint: "",
      lastTestStatus: "failed",
      lastTestedAt: "2026-04-08 15:48",
      lastTestMessage: "Token 已過期，請重新產生。",
    },
    {
      id: "itg-004",
      name: "Partner Custom API",
      type: "custom_api",
      description: "夥伴自訂 API，傳遞成交與分潤事件",
      enabled: true,
      connectionStatus: "connected",
      createdAt: "2026-03-05 10:33",
      lastSyncAt: "2026-04-10 10:05",
      authMethod: "client_secret",
      apiKey: "",
      clientId: "partner-client",
      clientSecret: "partner-secret",
      accessToken: "",
      endpointUrl: "https://api.partner-bridge.example",
      tenantId: "partner-cn01",
      apiBaseUrl: "https://api.partner-bridge.example/v1",
      timeoutSec: 18,
      retryCount: 4,
      autoRetry: true,
      whitelistHint: "需與對方約定簽章格式與 IP 白名單。",
      customApiHint:
        "支援事件格式：opportunity_won / settlement_created / invoice_paid，請使用 JSON payload。",
      lastTestStatus: "success",
      lastTestedAt: "2026-04-10 09:58",
      lastTestMessage: "連線成功，簽章驗證通過。",
    },
  ];
}

function createSeedRules() {
  return [
    {
      id: "rule-001",
      name: "ERP 訂單同步（成交後）",
      integrationId: "itg-002",
      dataType: "order",
      direction: "crm_to_external",
      frequency: "5m",
      conflictPolicy: "latest_update",
      enabled: true,
      lastRunAt: "2026-04-10 10:35",
      allowManual: true,
      onlyMatchedData: true,
      filterCondition: "僅同步 status = won 且已簽約商機",
      conflictDetection: "以 order_no + updated_at 判定",
      notifyManager: true,
      mappings: [
        {
          id: "map-001",
          crmField: "opportunity_no",
          externalField: "order_ref",
          required: true,
          defaultValue: "",
          transformRule: "",
        },
        {
          id: "map-002",
          crmField: "amount",
          externalField: "order_amount",
          required: true,
          defaultValue: "0",
          transformRule: "currency:TWD",
        },
      ],
    },
    {
      id: "rule-002",
      name: "SupportDesk Issue 回寫",
      integrationId: "itg-003",
      dataType: "issue",
      direction: "external_to_crm",
      frequency: "hourly",
      conflictPolicy: "crm_priority",
      enabled: false,
      lastRunAt: "2026-04-08 16:10",
      allowManual: true,
      onlyMatchedData: true,
      filterCondition: "僅同步狀態為 Open / In Progress",
      conflictDetection: "以 issue_id 與 response_updated_at 比對",
      notifyManager: true,
      mappings: [
        {
          id: "map-003",
          crmField: "title",
          externalField: "subject",
          required: true,
          defaultValue: "",
          transformRule: "",
        },
      ],
    },
    {
      id: "rule-003",
      name: "活動紀錄雙向同步",
      integrationId: "itg-001",
      dataType: "activity",
      direction: "bidirectional",
      frequency: "realtime",
      conflictPolicy: "need_confirmation",
      enabled: true,
      lastRunAt: "2026-04-10 10:40",
      allowManual: false,
      onlyMatchedData: false,
      filterCondition: "同步近 30 天活動",
      conflictDetection: "以 event_id + last_modified 判定",
      notifyManager: false,
      mappings: [
        {
          id: "map-004",
          crmField: "title",
          externalField: "summary",
          required: true,
          defaultValue: "",
          transformRule: "",
        },
      ],
    },
  ];
}

function createSeedWebhooks() {
  return [
    {
      id: "wh-001",
      name: "成交事件推送",
      endpointUrl: "https://hooks.partner.example/won",
      secret: "hook-secret",
      method: "POST",
      headersInput: "Content-Type: application/json\nX-Tenant: main",
      events: ["opportunity_won", "quote_sent"],
      retryStrategy: "exp_5",
      enabled: true,
      lastSentAt: "2026-04-10 10:11",
    },
    {
      id: "wh-002",
      name: "同步失敗告警 Webhook",
      endpointUrl: "https://hooks.alert.example/sync-failed",
      secret: "alert-secret",
      method: "POST",
      headersInput: "Content-Type: application/json",
      events: ["sync_failed", "auth_failed"],
      retryStrategy: "fixed_3",
      enabled: true,
      lastSentAt: "2026-04-10 09:52",
    },
  ];
}

function createSeedNotificationRules() {
  return [
    {
      id: "ntf-001",
      name: "整合異常通知 IT 值班",
      events: ["sync_failed", "auth_failed"],
      channels: ["email", "slack", "in_app"],
      recipients: "it_oncall,system_admin",
      mergeNotify: true,
      onlyFailedEvents: true,
      enabled: true,
    },
    {
      id: "ntf-002",
      name: "商機成交通知財務",
      events: ["opportunity_won"],
      channels: ["email", "in_app"],
      recipients: "finance_team",
      mergeNotify: false,
      onlyFailedEvents: false,
      enabled: true,
    },
  ];
}

function createSeedSyncLogs() {
  return [
    {
      id: "log-001",
      executedAt: "2026-04-10 10:42",
      integrationId: "itg-001",
      name: "活動紀錄雙向同步",
      type: "sync",
      result: "success",
      processedCount: 26,
      durationMs: 1210,
      requestSummary: "同步 CRM 活動 26 筆至 Google Calendar",
      responseSummary: "26/26 成功",
      errorMessage: "",
      retryLogs: [],
    },
    {
      id: "log-002",
      executedAt: "2026-04-10 10:35",
      integrationId: "itg-002",
      name: "ERP 訂單同步（成交後）",
      type: "sync",
      result: "partial_success",
      processedCount: 12,
      durationMs: 3340,
      requestSummary: "推送訂單資料 12 筆",
      responseSummary: "10 成功 / 2 失敗",
      errorMessage: "2 筆缺少客戶代碼，已建立待確認項目",
      retryLogs: [
        { id: "retry-001", executedAt: "2026-04-10 10:37", result: "retrying" },
      ],
    },
    {
      id: "log-003",
      executedAt: "2026-04-10 09:50",
      integrationId: "itg-002",
      name: "Apex ERP 驗證",
      type: "auth",
      result: "failed",
      processedCount: 0,
      durationMs: 4800,
      requestSummary: "驗證 API key 與 tenant",
      responseSummary: "gateway timeout",
      errorMessage: "ERP gateway timeout 5s",
      retryLogs: [
        { id: "retry-002", executedAt: "2026-04-10 09:53", result: "retrying" },
      ],
    },
    {
      id: "log-004",
      executedAt: "2026-04-10 09:12",
      integrationId: "itg-004",
      name: "分潤建立事件 Webhook",
      type: "webhook",
      result: "success",
      processedCount: 1,
      durationMs: 540,
      requestSummary: "POST /v1/hook/settlement_created",
      responseSummary: "HTTP 200",
      errorMessage: "",
      retryLogs: [],
    },
    {
      id: "log-005",
      executedAt: "2026-04-09 16:22",
      integrationId: "itg-003",
      name: "SupportDesk Issue 回寫",
      type: "sync",
      result: "failed",
      processedCount: 0,
      durationMs: 1390,
      requestSummary: "拉取 open issue 變更",
      responseSummary: "401 unauthorized",
      errorMessage: "Token 過期，需重新驗證",
      retryLogs: [],
    },
  ];
}

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now()
    .toString(36)
    .slice(-4)}`;
}

function getIntegrationName(integrationId) {
  return integrations.value.find((item) => item.id === integrationId)?.name || "-";
}

function integrationTypeLabel(value) {
  return integrationTypeOptions.find((item) => item.value === value)?.label || value;
}

function connectionStatusMeta(value) {
  if (value === "connected") {
    return { label: "已連線", type: "success" };
  }

  if (value === "not_connected") {
    return { label: "未連線", type: "info" };
  }

  if (value === "auth_failed") {
    return { label: "驗證失敗", type: "danger" };
  }

  return { label: "同步異常", type: "warning" };
}

function directionLabel(value) {
  return directionOptions.find((item) => item.value === value)?.label || value;
}

function frequencyLabel(value) {
  return frequencyOptions.find((item) => item.value === value)?.label || value;
}

function conflictPolicyLabel(value) {
  return conflictPolicyOptions.find((item) => item.value === value)?.label || value;
}

function dataTypeLabel(value) {
  return syncDataTypeOptions.find((item) => item.value === value)?.label || value;
}

function logTypeLabel(value) {
  return logTypeOptions.find((item) => item.value === value)?.label || value;
}

function logResultMeta(value) {
  if (value === "success") {
    return { label: "成功", type: "success" };
  }

  if (value === "partial_success") {
    return { label: "部分成功", type: "warning" };
  }

  if (value === "retrying") {
    return { label: "重試中", type: "info" };
  }

  return { label: "失敗", type: "danger" };
}

function authMethodLabel(value) {
  if (value === "api_key") {
    return "API Key";
  }

  if (value === "client_secret") {
    return "Client ID / Secret";
  }

  if (value === "oauth") {
    return "OAuth";
  }

  return "Token";
}

function testStatusMeta(value) {
  if (value === "success") {
    return { label: "成功", type: "success" };
  }

  if (value === "failed") {
    return { label: "失敗", type: "danger" };
  }

  return { label: "尚未測試", type: "info" };
}

function eventLabel(value) {
  return webhookEventOptions.find((item) => item.value === value)?.label || value;
}

function channelLabel(value) {
  return notificationChannelOptions.find((item) => item.value === value)?.label || value;
}

function resetServicesFilters() {
  servicesFilters.keyword = "";
  servicesFilters.type = "all";
  servicesFilters.connectionStatus = "all";
  servicesFilters.enabled = "all";
  servicesPage.value = 1;
}

function resetRulesFilters() {
  rulesFilters.keyword = "";
  rulesFilters.integrationId = "all";
  rulesFilters.dataType = "all";
  rulesFilters.direction = "all";
  rulesFilters.enabled = "all";
  rulesPage.value = 1;
}

function resetLogsFilters() {
  logsFilters.keyword = "";
  logsFilters.integrationId = "all";
  logsFilters.type = "all";
  logsFilters.result = "all";
  logsFilters.dateRange = [];
  logsPage.value = 1;
}

function notify(message, title = "已更新", type = "success") {
  ElNotification({
    title,
    message,
    type,
    position: "top-right",
  });
}

function openCreateIntegration() {
  integrationDrawerMode.value = "create";
  activeIntegrationId.value = "";
  Object.assign(integrationDraft, createEmptyIntegrationDraft());
  integrationDraft.id = `itg-${String(integrations.value.length + 1).padStart(3, "0")}`;
  integrationDraft.createdAt = new Date().toISOString().replace("T", " ").slice(0, 16);
  integrationDrawerOpen.value = true;
}

function openIntegrationDrawer(record, mode = "view") {
  activeIntegrationId.value = record.id;
  integrationDrawerMode.value = mode;

  if (mode !== "view") {
    Object.assign(integrationDraft, cloneIntegration(record));
  }

  integrationDrawerOpen.value = true;
}

function cloneIntegration(record) {
  return {
    ...createEmptyIntegrationDraft(),
    ...record,
  };
}

function saveIntegration() {
  const payload = {
    ...createEmptyIntegrationDraft(),
    ...integrationDraft,
    id: integrationDraft.id.trim(),
    name: integrationDraft.name.trim(),
    description: integrationDraft.description.trim(),
    tenantId: integrationDraft.tenantId.trim(),
    endpointUrl: integrationDraft.endpointUrl.trim(),
    apiBaseUrl: integrationDraft.apiBaseUrl.trim(),
    whitelistHint: integrationDraft.whitelistHint.trim(),
    customApiHint: integrationDraft.customApiHint.trim(),
    lastTestMessage: integrationDraft.lastTestMessage.trim(),
    timeoutSec: Number(integrationDraft.timeoutSec || 0),
    retryCount: Number(integrationDraft.retryCount || 0),
  };

  if (!payload.id || !payload.name || !payload.type) {
    notify("請完整填寫整合 ID、名稱與類型", "缺少資訊", "warning");
    return;
  }

  if (
    integrationDrawerMode.value === "create" &&
    integrations.value.some((item) => item.id.toLowerCase() === payload.id.toLowerCase())
  ) {
    notify("整合 ID 已存在，請調整", "資料重複", "warning");
    return;
  }

  if (integrationDrawerMode.value === "create") {
    integrations.value.unshift({
      ...payload,
      createdAt:
        payload.createdAt || new Date().toISOString().replace("T", " ").slice(0, 16),
      connectionStatus: payload.connectionStatus || "not_connected",
      lastTestStatus: "not_tested",
      lastTestedAt: "",
      lastTestMessage: "",
    });
    integrationDrawerMode.value = "view";
    activeIntegrationId.value = payload.id;
    notify(`已建立整合：${payload.name}`);
    return;
  }

  integrations.value = integrations.value.map((item) =>
    item.id === payload.id ? { ...item, ...payload } : item
  );

  integrationDrawerMode.value = "view";
  notify(`已更新整合：${payload.name}`);
}

async function toggleIntegration(record, enabled) {
  if (!enabled) {
    try {
      await ElMessageBox.confirm(
        `確認停用「${record.name}」？停用後同步與通知會暫停。`,
        "停用整合",
        {
          confirmButtonText: "停用",
          cancelButtonText: "取消",
          type: "warning",
        }
      );
    } catch {
      return;
    }
  }

  integrations.value = integrations.value.map((item) =>
    item.id === record.id ? { ...item, enabled } : item
  );

  notify(`${record.name} 已${enabled ? "啟用" : "停用"}`);
}

function randomTestResult() {
  return Math.random() > 0.3 ? "success" : "failed";
}

function addLog(log) {
  syncLogs.value.unshift(log);
}

function touchIntegrationSync(id) {
  const now = new Date().toISOString().replace("T", " ").slice(0, 16);
  integrations.value = integrations.value.map((item) =>
    item.id === id ? { ...item, lastSyncAt: now } : item
  );
}

function testConnection(record) {
  const now = new Date().toISOString().replace("T", " ").slice(0, 16);
  const result = randomTestResult();
  const message =
    result === "success" ? "連線成功，憑證驗證通過" : "驗證失敗，請檢查金鑰或 Endpoint";

  integrations.value = integrations.value.map((item) => {
    if (item.id !== record.id) {
      return item;
    }

    return {
      ...item,
      connectionStatus: result === "success" ? "connected" : "auth_failed",
      lastTestStatus: result,
      lastTestedAt: now,
      lastTestMessage: message,
      lastSyncAt: result === "success" ? now : item.lastSyncAt,
    };
  });

  addLog({
    id: createId("log"),
    executedAt: now,
    integrationId: record.id,
    name: `${record.name} 連線測試`,
    type: "auth",
    result,
    processedCount: 0,
    durationMs: result === "success" ? 680 : 2300,
    requestSummary: "測試授權與 API 健康檢查",
    responseSummary: result === "success" ? "HTTP 200" : "HTTP 401",
    errorMessage: result === "success" ? "" : message,
    retryLogs: [],
  });

  notify(`${record.name} ${result === "success" ? "連線成功" : "連線失敗"}`);
}

function runDrawerConnectionTest() {
  if (!integrationDrawerData.value) {
    return;
  }

  const fakeRecord = {
    id: integrationDrawerData.value.id,
    name: integrationDrawerData.value.name || "未命名整合",
  };

  if (!fakeRecord.id) {
    notify("請先填寫整合 ID", "缺少資訊", "warning");
    return;
  }

  if (integrationDrawerMode.value === "view") {
    testConnection(fakeRecord);
    return;
  }

  const now = new Date().toISOString().replace("T", " ").slice(0, 16);
  const result = randomTestResult();
  integrationDraft.lastTestStatus = result;
  integrationDraft.lastTestedAt = now;
  integrationDraft.lastTestMessage =
    result === "success" ? "連線成功，請儲存設定" : "驗證失敗，請檢查認證欄位";

  notify(
    result === "success" ? "草稿測試成功，請儲存設定" : "草稿測試失敗，請檢查認證欄位",
    "測試完成",
    result === "success" ? "success" : "warning"
  );
}

function saveAndTestIntegration() {
  saveIntegration();

  if (!activeIntegrationId.value) {
    return;
  }

  const record = integrations.value.find((item) => item.id === activeIntegrationId.value);
  if (!record) {
    return;
  }

  testConnection(record);
}

async function removeIntegration(record) {
  try {
    await ElMessageBox.confirm(
      `確認刪除「${record.name}」？此操作會移除關聯同步規則。`,
      "刪除整合",
      {
        confirmButtonText: "刪除",
        cancelButtonText: "取消",
        type: "warning",
      }
    );
  } catch {
    return;
  }

  integrations.value = integrations.value.filter((item) => item.id !== record.id);
  syncRules.value = syncRules.value.filter((item) => item.integrationId !== record.id);
  syncLogs.value = syncLogs.value.filter((item) => item.integrationId !== record.id);
  notify(`已刪除整合：${record.name}`);
}

function openCreateRule() {
  ruleDrawerMode.value = "create";
  activeRuleId.value = "";
  Object.assign(ruleDraft, createEmptyRuleDraft());
  ruleDraft.id = `rule-${String(syncRules.value.length + 1).padStart(3, "0")}`;
  ruleDraft.integrationId = integrationOptions.value[0]?.value || "";
  ruleDrawerOpen.value = true;
}

function openRuleDrawer(record, mode = "view") {
  activeRuleId.value = record.id;
  ruleDrawerMode.value = mode;

  if (mode !== "view") {
    Object.assign(ruleDraft, cloneRule(record));
  }

  ruleDrawerOpen.value = true;
}

function cloneRule(record) {
  return {
    ...createEmptyRuleDraft(),
    ...record,
    mappings: (record.mappings || []).map((item) => ({ ...item })),
  };
}

function addMapping() {
  ruleDraft.mappings.push({
    id: createId("map"),
    crmField: "",
    externalField: "",
    required: false,
    defaultValue: "",
    transformRule: "",
  });
}

function removeMapping(index) {
  if (ruleDraft.mappings.length === 1) {
    return;
  }

  ruleDraft.mappings.splice(index, 1);
}

function saveRule() {
  const payload = {
    ...createEmptyRuleDraft(),
    ...ruleDraft,
    id: ruleDraft.id.trim(),
    name: ruleDraft.name.trim(),
    filterCondition: ruleDraft.filterCondition.trim(),
    conflictDetection: ruleDraft.conflictDetection.trim(),
    mappings: ruleDraft.mappings.map((item) => ({
      ...item,
      crmField: String(item.crmField || "").trim(),
      externalField: String(item.externalField || "").trim(),
      defaultValue: String(item.defaultValue || "").trim(),
      transformRule: String(item.transformRule || "").trim(),
    })),
  };

  if (!payload.id || !payload.name || !payload.integrationId) {
    notify("請填寫規則 ID、名稱與所屬系統", "缺少資訊", "warning");
    return;
  }

  const hasInvalidMapping = payload.mappings.some(
    (item) => !item.crmField || !item.externalField
  );

  if (hasInvalidMapping) {
    notify("欄位對應未填完整，請確認 CRM 欄位與外部欄位", "資料不完整", "warning");
    return;
  }

  if (
    ruleDrawerMode.value === "create" &&
    syncRules.value.some((item) => item.id.toLowerCase() === payload.id.toLowerCase())
  ) {
    notify("規則 ID 已存在", "資料重複", "warning");
    return;
  }

  if (ruleDrawerMode.value === "create") {
    syncRules.value.unshift(payload);
    activeRuleId.value = payload.id;
    ruleDrawerMode.value = "view";
    notify(`已建立同步規則：${payload.name}`);
    return;
  }

  syncRules.value = syncRules.value.map((item) =>
    item.id === payload.id ? { ...item, ...payload } : item
  );

  ruleDrawerMode.value = "view";
  notify(`已更新同步規則：${payload.name}`);
}

async function toggleRuleEnabled(record, enabled) {
  if (!enabled) {
    try {
      await ElMessageBox.confirm(`確認停用規則「${record.name}」？`, "停用同步規則", {
        confirmButtonText: "停用",
        cancelButtonText: "取消",
        type: "warning",
      });
    } catch {
      return;
    }
  }

  syncRules.value = syncRules.value.map((item) =>
    item.id === record.id ? { ...item, enabled } : item
  );

  notify(`${record.name} 已${enabled ? "啟用" : "停用"}`);
}

function runRuleNow(record) {
  const now = new Date().toISOString().replace("T", " ").slice(0, 16);
  const result = Math.random() > 0.2 ? "success" : "failed";

  syncRules.value = syncRules.value.map((item) =>
    item.id === record.id ? { ...item, lastRunAt: now } : item
  );

  touchIntegrationSync(record.integrationId);
  addLog({
    id: createId("log"),
    executedAt: now,
    integrationId: record.integrationId,
    name: `手動執行：${record.name}`,
    type: "manual",
    result,
    processedCount: result === "success" ? Math.floor(Math.random() * 20) + 1 : 0,
    durationMs: Math.floor(Math.random() * 3000) + 600,
    requestSummary: `手動執行規則 ${record.id}`,
    responseSummary: result === "success" ? "執行完成" : "部分流程中斷",
    errorMessage: result === "success" ? "" : "外部系統回應逾時",
    retryLogs: [],
  });

  notify(
    `${record.name} 已手動執行`,
    "執行完成",
    result === "success" ? "success" : "warning"
  );
}

function openCreateWebhook() {
  webhookDrawerMode.value = "create";
  activeWebhookId.value = "";
  Object.assign(webhookDraft, createEmptyWebhookDraft());
  webhookDraft.id = `wh-${String(webhooks.value.length + 1).padStart(3, "0")}`;
  webhookDrawerOpen.value = true;
}

function openWebhookDrawer(record, mode = "view") {
  activeWebhookId.value = record.id;
  webhookDrawerMode.value = mode;

  if (mode !== "view") {
    Object.assign(webhookDraft, {
      ...createEmptyWebhookDraft(),
      ...record,
      events: [...(record.events || [])],
    });
  }

  webhookDrawerOpen.value = true;
}

function saveWebhook() {
  const payload = {
    ...createEmptyWebhookDraft(),
    ...webhookDraft,
    id: webhookDraft.id.trim(),
    name: webhookDraft.name.trim(),
    endpointUrl: webhookDraft.endpointUrl.trim(),
    secret: webhookDraft.secret.trim(),
    headersInput: webhookDraft.headersInput.trim(),
    events: [...webhookDraft.events],
  };

  if (
    !payload.id ||
    !payload.name ||
    !payload.endpointUrl ||
    payload.events.length === 0
  ) {
    notify("請填寫名稱、Endpoint 並至少選擇一個事件", "缺少資訊", "warning");
    return;
  }

  if (
    webhookDrawerMode.value === "create" &&
    webhooks.value.some((item) => item.id.toLowerCase() === payload.id.toLowerCase())
  ) {
    notify("Webhook ID 已存在", "資料重複", "warning");
    return;
  }

  if (webhookDrawerMode.value === "create") {
    webhooks.value.unshift(payload);
    activeWebhookId.value = payload.id;
    webhookDrawerMode.value = "view";
    notify(`已建立 Webhook：${payload.name}`);
    return;
  }

  webhooks.value = webhooks.value.map((item) =>
    item.id === payload.id ? { ...item, ...payload } : item
  );
  webhookDrawerMode.value = "view";
  notify(`已更新 Webhook：${payload.name}`);
}

function openCreateNotificationRule() {
  notificationDrawerMode.value = "create";
  activeNotificationId.value = "";
  Object.assign(notificationDraft, createEmptyNotificationDraft());
  notificationDraft.id = `ntf-${String(notificationRules.value.length + 1).padStart(
    3,
    "0"
  )}`;
  notificationDrawerOpen.value = true;
}

function openNotificationDrawer(record, mode = "view") {
  activeNotificationId.value = record.id;
  notificationDrawerMode.value = mode;

  if (mode !== "view") {
    Object.assign(notificationDraft, {
      ...createEmptyNotificationDraft(),
      ...record,
      events: [...(record.events || [])],
      channels: [...(record.channels || [])],
    });
  }

  notificationDrawerOpen.value = true;
}

function saveNotificationRule() {
  const payload = {
    ...createEmptyNotificationDraft(),
    ...notificationDraft,
    id: notificationDraft.id.trim(),
    name: notificationDraft.name.trim(),
    recipients: notificationDraft.recipients.trim(),
    events: [...notificationDraft.events],
    channels: [...notificationDraft.channels],
  };

  if (
    !payload.id ||
    !payload.name ||
    payload.events.length === 0 ||
    payload.channels.length === 0 ||
    !payload.recipients
  ) {
    notify("請完成規則名稱、事件、通知方式與接收對象", "缺少資訊", "warning");
    return;
  }

  if (
    notificationDrawerMode.value === "create" &&
    notificationRules.value.some(
      (item) => item.id.toLowerCase() === payload.id.toLowerCase()
    )
  ) {
    notify("通知規則 ID 已存在", "資料重複", "warning");
    return;
  }

  if (notificationDrawerMode.value === "create") {
    notificationRules.value.unshift(payload);
    activeNotificationId.value = payload.id;
    notificationDrawerMode.value = "view";
    notify(`已建立通知規則：${payload.name}`);
    return;
  }

  notificationRules.value = notificationRules.value.map((item) =>
    item.id === payload.id ? { ...item, ...payload } : item
  );

  notificationDrawerMode.value = "view";
  notify(`已更新通知規則：${payload.name}`);
}

function openLogDetail(record) {
  activeLogId.value = record.id;
  logDrawerOpen.value = true;
}

function rerunLog(record) {
  const now = new Date().toISOString().replace("T", " ").slice(0, 16);
  const result = Math.random() > 0.25 ? "success" : "failed";

  const retryEntry = {
    id: createId("retry"),
    executedAt: now,
    result,
  };

  syncLogs.value = syncLogs.value.map((item) => {
    if (item.id !== record.id) {
      return item;
    }

    return {
      ...item,
      executedAt: now,
      result,
      errorMessage: result === "success" ? "" : "重送後仍失敗，請檢查整合端設定",
      responseSummary: result === "success" ? "重送成功" : "重送失敗",
      retryLogs: [...(item.retryLogs || []), retryEntry],
    };
  });

  touchIntegrationSync(record.integrationId);

  notify(
    result === "success" ? "重送成功" : "重送失敗，請檢查錯誤訊息",
    "重新執行",
    result === "success" ? "success" : "warning"
  );
}

function refreshSyncAll() {
  const now = new Date().toISOString().replace("T", " ").slice(0, 16);

  integrations.value = integrations.value.map((item) => {
    if (!item.enabled) {
      return item;
    }

    return {
      ...item,
      lastSyncAt: now,
      connectionStatus:
        item.connectionStatus === "auth_failed" ? "connected" : item.connectionStatus,
    };
  });

  addLog({
    id: createId("log"),
    executedAt: now,
    integrationId: integrations.value[0]?.id || "",
    name: "手動觸發全域重新同步",
    type: "manual",
    result: "success",
    processedCount: integrations.value.filter((item) => item.enabled).length,
    durationMs: 1890,
    requestSummary: "重新同步所有啟用整合",
    responseSummary: "同步任務已建立",
    errorMessage: "",
    retryLogs: [],
  });

  notify("已觸發重新同步，請至同步紀錄查看結果");
}

function goLogsTab() {
  activeTab.value = "logs";
}

function isDateWithinRange(value, range) {
  const [start, end] = range || [];
  if (!start || !end) {
    return true;
  }

  const time = toTimestamp(value);
  const startTime = toTimestamp(start);
  const endTime = toTimestamp(end) + 24 * 60 * 60 * 1000 - 1;

  if (!time || !startTime || !endTime) {
    return false;
  }

  return time >= startTime && time <= endTime;
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

function formatDuration(ms) {
  if (!ms && ms !== 0) {
    return "-";
  }

  if (ms < 1000) {
    return `${ms}ms`;
  }

  return `${(ms / 1000).toFixed(2)}s`;
}

watch(
  () => [
    filteredServices.value.length,
    servicesPageSize.value,
    servicesFilters.keyword,
    servicesFilters.type,
    servicesFilters.connectionStatus,
    servicesFilters.enabled,
  ],
  () => {
    servicesPage.value = 1;
  }
);

watch(
  () => [
    filteredRules.value.length,
    rulesPageSize.value,
    rulesFilters.keyword,
    rulesFilters.integrationId,
    rulesFilters.dataType,
    rulesFilters.direction,
    rulesFilters.enabled,
  ],
  () => {
    rulesPage.value = 1;
  }
);

watch(
  () => [
    filteredLogs.value.length,
    logsPageSize.value,
    logsFilters.keyword,
    logsFilters.integrationId,
    logsFilters.type,
    logsFilters.result,
    logsFilters.dateRange?.[0],
    logsFilters.dateRange?.[1],
  ],
  () => {
    logsPage.value = 1;
  }
);
</script>

<template>
  <div class="min-h-full p-8">
    <section class="grid gap-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-2">
          <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">
            系統整合
          </h1>
          <p class="text-sm text-slate-500">管理 CRM 與外部系統的連線、同步與通知設定</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton :icon="CirclePlus" type="primary" @click="openCreateIntegration"
            >新增整合</ElButton
          >
          <ElButton :icon="Refresh" @click="refreshSyncAll">重新同步</ElButton>
          <ElButton @click="goLogsTab">查看同步紀錄</ElButton>
        </div>
      </header>

      <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="card in serviceSummaryCards"
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
        <div class="border-b border-slate-200 pb-2">
          <ElTabs v-model="activeTab" class="page-tabs">
            <ElTabPane label="整合服務" name="services" />
            <ElTabPane label="同步規則" name="rules" />
            <ElTabPane label="Webhook / 通知" name="webhook" />
            <ElTabPane label="同步紀錄" name="logs" />
          </ElTabs>
        </div>

        <section v-if="activeTab === 'services'" class="grid gap-4 pt-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <ElInput
                v-model="servicesFilters.keyword"
                placeholder="搜尋系統名稱 / 描述"
                clearable
                class="!w-80"
              >
                <template #prefix>
                  <Search class="h-4 w-4 text-slate-400" />
                </template>
              </ElInput>
              <ElButton
                :icon="Filter"
                :type="servicesFilterOpen ? 'primary' : 'default'"
                @click="servicesFilterOpen = !servicesFilterOpen"
                >篩選</ElButton
              >
              <ElButton :icon="Refresh" @click="resetServicesFilters">重設</ElButton>
            </div>

            <ElTag round effect="plain">共 {{ filteredServices.length }} 筆</ElTag>
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
              v-if="servicesFilterOpen"
              class="grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-2 xl:grid-cols-4"
            >
              <ElFormItem class="mb-0">
                <ElSelect v-model="servicesFilters.type">
                  <ElOption
                    v-for="item in integrationTypeFilterOptions"
                    :key="`stype-${item.value}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem class="mb-0">
                <ElSelect v-model="servicesFilters.connectionStatus">
                  <ElOption
                    v-for="item in connectionStatusOptions"
                    :key="`sstatus-${item.value}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem class="mb-0">
                <ElSelect v-model="servicesFilters.enabled">
                  <ElOption
                    v-for="item in enabledFilterOptions"
                    :key="`senabled-${item.value}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
            </ElForm>
          </transition>

          <div class="border-t border-slate-200"></div>

          <ElTable
            v-loading="loading"
            table-layout="auto"
            :data="pagedServices"
            class="list-table"
          >
            <ElTableColumn label="系統名稱" min-width="220">
              <template #default="{ row }">
                <div class="grid gap-1">
                  <p class="font-semibold text-slate-900">{{ row.name }}</p>
                  <p class="text-xs text-slate-500">
                    {{ row.id }} / {{ row.description }}
                  </p>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="類型" min-width="140">
              <template #default="{ row }">
                <ElTag size="small" effect="light">{{
                  integrationTypeLabel(row.type)
                }}</ElTag>
              </template>
            </ElTableColumn>

            <ElTableColumn label="連線狀態" min-width="120">
              <template #default="{ row }">
                <ElTag
                  :type="connectionStatusMeta(row.connectionStatus).type"
                  size="small"
                  effect="light"
                >
                  {{ connectionStatusMeta(row.connectionStatus).label }}
                </ElTag>
              </template>
            </ElTableColumn>

            <ElTableColumn label="啟用狀態" min-width="120">
              <template #default="{ row }">
                <div class="flex items-center gap-2">
                  <ElSwitch
                    :model-value="row.enabled"
                    @update:model-value="(value) => toggleIntegration(row, value)"
                  />
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="最後同步時間" min-width="150">
              <template #default="{ row }">{{ formatDateTime(row.lastSyncAt) }}</template>
            </ElTableColumn>

            <ElTableColumn label="建立時間" min-width="150">
              <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
            </ElTableColumn>

            <ElTableColumn label="操作" width="340" fixed="right">
              <template #default="{ row }">
                <div class="flex flex-wrap items-center justify-end gap-1">
                  <ElButton
                    text
                    type="primary"
                    @click="openIntegrationDrawer(row, 'view')"
                    >查看詳情</ElButton
                  >
                  <ElButton text @click="openIntegrationDrawer(row, 'edit')"
                    >編輯設定</ElButton
                  >
                  <ElButton text @click="testConnection(row)">測試連線</ElButton>
                  <ElButton text @click="testConnection(row)">重新驗證</ElButton>
                  <ElButton text type="danger" @click="removeIntegration(row)"
                    >刪除</ElButton
                  >
                </div>
              </template>
            </ElTableColumn>
          </ElTable>

          <ElEmpty
            v-if="pagedServices.length === 0"
            class="py-8"
            description="目前沒有符合條件的整合服務"
            :image-size="90"
          />

          <div
            class="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-5"
          >
            <ElPagination
              v-model:current-page="servicesPage"
              :page-size="servicesPageSize"
              layout="total, prev, pager, next"
              :total="filteredServices.length"
              background
            />
            <ElSelect
              v-model="servicesPageSize"
              class="!w-[100px]"
              @change="servicesPage = 1"
            >
              <ElOption :value="10" label="10 筆" />
              <ElOption :value="20" label="20 筆" />
              <ElOption :value="50" label="50 筆" />
            </ElSelect>
          </div>
        </section>

        <section v-else-if="activeTab === 'rules'" class="grid gap-4 pt-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <ElInput
                v-model="rulesFilters.keyword"
                placeholder="搜尋規則名稱 / 條件"
                clearable
                class="!w-80"
              >
                <template #prefix>
                  <Search class="h-4 w-4 text-slate-400" />
                </template>
              </ElInput>
              <ElButton
                :icon="Filter"
                :type="rulesFilterOpen ? 'primary' : 'default'"
                @click="rulesFilterOpen = !rulesFilterOpen"
                >篩選</ElButton
              >
              <ElButton :icon="Refresh" @click="resetRulesFilters">重設</ElButton>
              <ElButton type="primary" :icon="CirclePlus" @click="openCreateRule"
                >新增規則</ElButton
              >
            </div>

            <ElTag round effect="plain">共 {{ filteredRules.length }} 筆</ElTag>
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
              v-if="rulesFilterOpen"
              class="grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-2 xl:grid-cols-4"
            >
              <ElFormItem class="mb-0">
                <ElSelect v-model="rulesFilters.integrationId">
                  <ElOption
                    v-for="item in integrationFilterOptions"
                    :key="`r-int-${item.value}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem class="mb-0">
                <ElSelect v-model="rulesFilters.dataType">
                  <ElOption
                    v-for="item in syncDataTypeFilterOptions"
                    :key="`rtype-${item.value}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem class="mb-0">
                <ElSelect v-model="rulesFilters.direction">
                  <ElOption
                    v-for="item in directionFilterOptions"
                    :key="`rdir-${item.value}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem class="mb-0">
                <ElSelect v-model="rulesFilters.enabled">
                  <ElOption
                    v-for="item in enabledFilterOptions"
                    :key="`renabled-${item.value}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
            </ElForm>
          </transition>

          <div class="border-t border-slate-200"></div>

          <ElTable
            v-loading="loading"
            table-layout="auto"
            :data="pagedRules"
            class="list-table"
          >
            <ElTableColumn label="規則名稱" min-width="240">
              <template #default="{ row }">
                <div class="grid gap-1">
                  <p class="font-semibold text-slate-900">{{ row.name }}</p>
                  <p class="text-xs text-slate-500">{{ row.id }}</p>
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="所屬系統" min-width="160">
              <template #default="{ row }">{{
                getIntegrationName(row.integrationId)
              }}</template>
            </ElTableColumn>

            <ElTableColumn label="資料類型" min-width="120">
              <template #default="{ row }">{{ dataTypeLabel(row.dataType) }}</template>
            </ElTableColumn>

            <ElTableColumn label="同步方向" min-width="170">
              <template #default="{ row }">{{ directionLabel(row.direction) }}</template>
            </ElTableColumn>

            <ElTableColumn label="同步頻率" min-width="120">
              <template #default="{ row }">{{ frequencyLabel(row.frequency) }}</template>
            </ElTableColumn>

            <ElTableColumn label="衝突處理" min-width="170">
              <template #default="{ row }">{{
                conflictPolicyLabel(row.conflictPolicy)
              }}</template>
            </ElTableColumn>

            <ElTableColumn label="啟用狀態" min-width="120">
              <template #default="{ row }">
                <div class="flex items-center gap-2">
                  <ElSwitch
                    :model-value="row.enabled"
                    @update:model-value="(value) => toggleRuleEnabled(row, value)"
                  />
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="最後執行時間" min-width="150">
              <template #default="{ row }">{{ formatDateTime(row.lastRunAt) }}</template>
            </ElTableColumn>

            <ElTableColumn label="操作" width="190" fixed="right">
              <template #default="{ row }">
                <div class="flex items-center justify-end gap-1">
                  <ElButton text type="primary" @click="openRuleDrawer(row, 'view')"
                    >查看</ElButton
                  >
                  <ElButton text @click="openRuleDrawer(row, 'edit')">編輯</ElButton>
                  <ElButton text @click="runRuleNow(row)">手動執行</ElButton>
                </div>
              </template>
            </ElTableColumn>
          </ElTable>

          <ElEmpty
            v-if="pagedRules.length === 0"
            class="py-8"
            description="目前沒有符合條件的同步規則"
            :image-size="90"
          />

          <div
            class="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-5"
          >
            <ElPagination
              v-model:current-page="rulesPage"
              :page-size="rulesPageSize"
              layout="total, prev, pager, next"
              :total="filteredRules.length"
              background
            />
            <ElSelect v-model="rulesPageSize" class="!w-[100px]" @change="rulesPage = 1">
              <ElOption :value="10" label="10 筆" />
              <ElOption :value="20" label="20 筆" />
              <ElOption :value="50" label="50 筆" />
            </ElSelect>
          </div>
        </section>

        <section v-else-if="activeTab === 'webhook'" class="grid gap-6 pt-3">
          <article class="panel-card">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h3 class="panel-title">Webhook 設定</h3>
              <ElButton type="primary" :icon="CirclePlus" @click="openCreateWebhook"
                >新增 Webhook</ElButton
              >
            </div>

            <ElTable class="mt-3" table-layout="auto" :data="webhooks">
              <ElTableColumn label="名稱" min-width="180">
                <template #default="{ row }">
                  <div class="grid gap-1">
                    <p class="font-semibold text-slate-900">{{ row.name }}</p>
                    <p class="text-xs text-slate-500">{{ row.id }}</p>
                  </div>
                </template>
              </ElTableColumn>
              <ElTableColumn label="Endpoint URL" min-width="260" show-overflow-tooltip>
                <template #default="{ row }">{{ row.endpointUrl }}</template>
              </ElTableColumn>
              <ElTableColumn label="觸發事件數" min-width="110" align="right">
                <template #default="{ row }">{{ row.events.length }}</template>
              </ElTableColumn>
              <ElTableColumn label="簽章驗證" min-width="120">
                <template #default="{ row }">
                  <ElTag
                    :type="row.secret ? 'success' : 'info'"
                    size="small"
                    effect="light"
                  >
                    {{ row.secret ? "已設定" : "未設定" }}
                  </ElTag>
                </template>
              </ElTableColumn>
              <ElTableColumn label="啟用狀態" min-width="120">
                <template #default="{ row }">
                  <ElTag
                    :type="row.enabled ? 'success' : 'info'"
                    size="small"
                    effect="light"
                  >
                    {{ row.enabled ? "啟用中" : "停用" }}
                  </ElTag>
                </template>
              </ElTableColumn>
              <ElTableColumn label="最後發送時間" min-width="150">
                <template #default="{ row }">{{
                  formatDateTime(row.lastSentAt)
                }}</template>
              </ElTableColumn>
              <ElTableColumn label="操作" width="180" fixed="right">
                <template #default="{ row }">
                  <div class="flex items-center justify-end gap-1">
                    <ElButton text type="primary" @click="openWebhookDrawer(row, 'view')"
                      >查看</ElButton
                    >
                    <ElButton text @click="openWebhookDrawer(row, 'edit')">編輯</ElButton>
                  </div>
                </template>
              </ElTableColumn>
            </ElTable>

            <ElEmpty
              v-if="webhooks.length === 0"
              class="py-8"
              description="目前沒有 Webhook 設定"
              :image-size="90"
            />
          </article>

          <article class="panel-card">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h3 class="panel-title">通知規則</h3>
              <ElButton
                type="primary"
                :icon="CirclePlus"
                @click="openCreateNotificationRule"
                >新增通知規則</ElButton
              >
            </div>

            <ElTable class="mt-3" table-layout="auto" :data="notificationRules">
              <ElTableColumn label="規則名稱" min-width="200">
                <template #default="{ row }">
                  <div class="grid gap-1">
                    <p class="font-semibold text-slate-900">{{ row.name }}</p>
                    <p class="text-xs text-slate-500">{{ row.id }}</p>
                  </div>
                </template>
              </ElTableColumn>
              <ElTableColumn label="事件類型" min-width="210">
                <template #default="{ row }">
                  <div class="flex flex-wrap gap-1">
                    <ElTag
                      v-for="event in row.events"
                      :key="`${row.id}-${event}`"
                      size="small"
                      effect="light"
                    >
                      {{ eventLabel(event) }}
                    </ElTag>
                  </div>
                </template>
              </ElTableColumn>
              <ElTableColumn label="通知管道" min-width="180">
                <template #default="{ row }">{{
                  row.channels.map(channelLabel).join("、")
                }}</template>
              </ElTableColumn>
              <ElTableColumn label="接收對象" min-width="180" show-overflow-tooltip>
                <template #default="{ row }">{{ row.recipients }}</template>
              </ElTableColumn>
              <ElTableColumn label="啟用狀態" min-width="120">
                <template #default="{ row }">
                  <ElTag
                    :type="row.enabled ? 'success' : 'info'"
                    size="small"
                    effect="light"
                  >
                    {{ row.enabled ? "啟用中" : "停用" }}
                  </ElTag>
                </template>
              </ElTableColumn>
              <ElTableColumn label="操作" width="180" fixed="right">
                <template #default="{ row }">
                  <div class="flex items-center justify-end gap-1">
                    <ElButton
                      text
                      type="primary"
                      @click="openNotificationDrawer(row, 'view')"
                      >查看</ElButton
                    >
                    <ElButton text @click="openNotificationDrawer(row, 'edit')"
                      >編輯</ElButton
                    >
                  </div>
                </template>
              </ElTableColumn>
            </ElTable>

            <ElEmpty
              v-if="notificationRules.length === 0"
              class="py-8"
              description="目前沒有通知規則"
              :image-size="90"
            />
          </article>
        </section>

        <section v-else class="grid gap-4 pt-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <ElInput
                v-model="logsFilters.keyword"
                placeholder="搜尋規則/事件名稱、錯誤訊息"
                clearable
                class="!w-80"
              >
                <template #prefix>
                  <Search class="h-4 w-4 text-slate-400" />
                </template>
              </ElInput>
              <ElButton
                :icon="Filter"
                :type="logsFilterOpen ? 'primary' : 'default'"
                @click="logsFilterOpen = !logsFilterOpen"
                >篩選</ElButton
              >
              <ElButton :icon="Refresh" @click="resetLogsFilters">重設</ElButton>
            </div>

            <ElTag round effect="plain">共 {{ filteredLogs.length }} 筆</ElTag>
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
              v-if="logsFilterOpen"
              class="grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-2 xl:grid-cols-5"
            >
              <ElFormItem class="mb-0">
                <ElSelect v-model="logsFilters.integrationId">
                  <ElOption
                    v-for="item in integrationFilterOptions"
                    :key="`lint-${item.value}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem class="mb-0">
                <ElSelect v-model="logsFilters.type">
                  <ElOption
                    v-for="item in logTypeOptions"
                    :key="`ltype-${item.value}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem class="mb-0">
                <ElSelect v-model="logsFilters.result">
                  <ElOption
                    v-for="item in logResultOptions"
                    :key="`lres-${item.value}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem class="mb-0 md:col-span-2">
                <ElDatePicker
                  v-model="logsFilters.dateRange"
                  type="daterange"
                  value-format="YYYY-MM-DD"
                  start-placeholder="起始日期"
                  end-placeholder="結束日期"
                  class="!w-full"
                />
              </ElFormItem>
            </ElForm>
          </transition>

          <div class="border-t border-slate-200"></div>

          <ElTable
            v-loading="loading"
            table-layout="auto"
            :data="pagedLogs"
            class="list-table"
          >
            <ElTableColumn label="執行時間" min-width="150">
              <template #default="{ row }">{{ formatDateTime(row.executedAt) }}</template>
            </ElTableColumn>
            <ElTableColumn label="整合系統" min-width="160">
              <template #default="{ row }">{{
                getIntegrationName(row.integrationId)
              }}</template>
            </ElTableColumn>
            <ElTableColumn label="規則 / 事件名稱" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">{{ row.name }}</template>
            </ElTableColumn>
            <ElTableColumn label="類型" min-width="110">
              <template #default="{ row }">{{ logTypeLabel(row.type) }}</template>
            </ElTableColumn>
            <ElTableColumn label="結果" min-width="120">
              <template #default="{ row }">
                <ElTag :type="logResultMeta(row.result).type" size="small" effect="light">
                  {{ logResultMeta(row.result).label }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="處理筆數" min-width="100" align="right">
              <template #default="{ row }">{{ row.processedCount }}</template>
            </ElTableColumn>
            <ElTableColumn label="耗時" min-width="100">
              <template #default="{ row }">{{ formatDuration(row.durationMs) }}</template>
            </ElTableColumn>
            <ElTableColumn label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <div class="flex items-center justify-end gap-1">
                  <ElButton text type="primary" @click="openLogDetail(row)"
                    >詳情</ElButton
                  >
                  <ElButton text @click="rerunLog(row)">重新執行</ElButton>
                </div>
              </template>
            </ElTableColumn>
          </ElTable>

          <ElEmpty
            v-if="pagedLogs.length === 0"
            class="py-8"
            description="目前沒有符合條件的同步紀錄"
            :image-size="90"
          />

          <div
            class="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-5"
          >
            <ElPagination
              v-model:current-page="logsPage"
              :page-size="logsPageSize"
              layout="total, prev, pager, next"
              :total="filteredLogs.length"
              background
            />
            <ElSelect v-model="logsPageSize" class="!w-[100px]" @change="logsPage = 1">
              <ElOption :value="10" label="10 筆" />
              <ElOption :value="20" label="20 筆" />
              <ElOption :value="50" label="50 筆" />
            </ElSelect>
          </div>
        </section>
      </section>
    </section>

    <ElDrawer
      v-model="integrationDrawerOpen"
      :size="'56%'"
      :destroy-on-close="false"
      :title="
        integrationDrawerMode === 'create'
          ? '新增整合'
          : integrationDrawerMode === 'edit'
          ? '編輯整合設定'
          : '整合服務詳情'
      "
    >
      <template v-if="integrationDrawerData">
        <section class="grid gap-4">
          <header class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="grid gap-1">
                <h2 class="text-xl font-semibold text-slate-900">
                  {{ integrationDrawerData.name || "未命名整合" }}
                </h2>
                <p class="text-xs text-slate-500">
                  {{ integrationDrawerData.id || "-" }}
                </p>
                <div class="flex flex-wrap items-center gap-1">
                  <ElTag
                    :type="
                      connectionStatusMeta(integrationDrawerData.connectionStatus).type
                    "
                    size="small"
                    effect="light"
                  >
                    {{
                      connectionStatusMeta(integrationDrawerData.connectionStatus).label
                    }}
                  </ElTag>
                  <ElTag
                    :type="integrationDrawerData.enabled ? 'success' : 'info'"
                    size="small"
                    effect="light"
                    >{{ integrationDrawerData.enabled ? "啟用中" : "停用" }}</ElTag
                  >
                  <ElTag size="small" effect="plain">
                    {{ integrationTypeLabel(integrationDrawerData.type) }}
                  </ElTag>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <template v-if="integrationDrawerMode === 'view'">
                  <ElButton @click="openIntegrationDrawer(integrationDrawerData, 'edit')"
                    >編輯設定</ElButton
                  >
                </template>
                <template v-else>
                  <ElButton @click="integrationDrawerOpen = false">取消</ElButton>
                  <ElButton type="primary" @click="saveIntegration">儲存</ElButton>
                </template>
              </div>
            </div>
          </header>

          <article class="panel-card">
            <h3 class="panel-title">基本資訊</h3>
            <template v-if="integrationDrawerMode === 'view'">
              <ElDescriptions class="mt-3" :column="2" border>
                <ElDescriptionsItem label="系統名稱">{{
                  integrationDrawerData.name
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="系統類型">{{
                  integrationTypeLabel(integrationDrawerData.type)
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="描述" :span="2">{{
                  integrationDrawerData.description || "-"
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="啟用狀態">{{
                  integrationDrawerData.enabled ? "啟用中" : "停用"
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="建立時間">{{
                  formatDateTime(integrationDrawerData.createdAt)
                }}</ElDescriptionsItem>
              </ElDescriptions>
            </template>
            <template v-else>
              <ElForm label-position="top" class="mt-3 grid gap-3">
                <div class="grid gap-3 md:grid-cols-2">
                  <ElFormItem label="整合 ID"
                    ><ElInput v-model="integrationDraft.id"
                  /></ElFormItem>
                  <ElFormItem label="系統名稱"
                    ><ElInput v-model="integrationDraft.name"
                  /></ElFormItem>
                  <ElFormItem label="系統類型">
                    <ElSelect v-model="integrationDraft.type">
                      <ElOption
                        v-for="item in integrationTypeOptions"
                        :key="`itype-${item.value}`"
                        :label="item.label"
                        :value="item.value"
                      />
                    </ElSelect>
                  </ElFormItem>
                  <ElFormItem label="啟用">
                    <ElSwitch v-model="integrationDraft.enabled" />
                  </ElFormItem>
                </div>
                <ElFormItem label="描述">
                  <ElInput
                    v-model="integrationDraft.description"
                    type="textarea"
                    :rows="2"
                  />
                </ElFormItem>
              </ElForm>
            </template>
          </article>

          <article class="panel-card">
            <h3 class="panel-title">驗證方式</h3>
            <template v-if="integrationDrawerMode === 'view'">
              <ElDescriptions class="mt-3" :column="2" border>
                <ElDescriptionsItem label="驗證類型">{{
                  authMethodLabel(integrationDrawerData.authMethod)
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="Tenant / Workspace">{{
                  integrationDrawerData.tenantId || "-"
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="Endpoint URL" :span="2">{{
                  integrationDrawerData.endpointUrl || "-"
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="Client ID">{{
                  integrationDrawerData.clientId || "-"
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="Token / API Key">******</ElDescriptionsItem>
              </ElDescriptions>
            </template>
            <template v-else>
              <ElForm label-position="top" class="mt-3 grid gap-3">
                <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <ElFormItem label="驗證類型">
                    <ElSelect v-model="integrationDraft.authMethod">
                      <ElOption label="API Key" value="api_key" />
                      <ElOption label="Client ID / Secret" value="client_secret" />
                      <ElOption label="OAuth" value="oauth" />
                      <ElOption label="Token" value="token" />
                    </ElSelect>
                  </ElFormItem>
                  <ElFormItem label="API Key"
                    ><ElInput v-model="integrationDraft.apiKey"
                  /></ElFormItem>
                  <ElFormItem label="Client ID"
                    ><ElInput v-model="integrationDraft.clientId"
                  /></ElFormItem>
                  <ElFormItem label="Client Secret">
                    <ElInput v-model="integrationDraft.clientSecret" show-password />
                  </ElFormItem>
                  <ElFormItem label="Access Token">
                    <ElInput v-model="integrationDraft.accessToken" show-password />
                  </ElFormItem>
                  <ElFormItem label="Tenant / Workspace ID">
                    <ElInput v-model="integrationDraft.tenantId" />
                  </ElFormItem>
                  <ElFormItem label="Endpoint URL" class="md:col-span-2 xl:col-span-3">
                    <ElInput v-model="integrationDraft.endpointUrl" />
                  </ElFormItem>
                </div>
              </ElForm>
            </template>
          </article>

          <article class="panel-card">
            <h3 class="panel-title">連線設定</h3>
            <template v-if="integrationDrawerMode === 'view'">
              <ElDescriptions class="mt-3" :column="2" border>
                <ElDescriptionsItem label="API Base URL" :span="2">{{
                  integrationDrawerData.apiBaseUrl || "-"
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="Timeout"
                  >{{ integrationDrawerData.timeoutSec }} 秒</ElDescriptionsItem
                >
                <ElDescriptionsItem label="Retry"
                  >{{ integrationDrawerData.retryCount }} 次</ElDescriptionsItem
                >
                <ElDescriptionsItem label="自動重試">{{
                  integrationDrawerData.autoRetry ? "是" : "否"
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="IP 白名單提示" :span="2">{{
                  integrationDrawerData.whitelistHint || "-"
                }}</ElDescriptionsItem>
              </ElDescriptions>
            </template>
            <template v-else>
              <ElForm label-position="top" class="mt-3 grid gap-3">
                <div class="grid gap-3 md:grid-cols-2">
                  <ElFormItem label="API Base URL">
                    <ElInput v-model="integrationDraft.apiBaseUrl" />
                  </ElFormItem>
                  <ElFormItem label="Timeout（秒）">
                    <ElInput
                      v-model="integrationDraft.timeoutSec"
                      type="number"
                      min="1"
                    />
                  </ElFormItem>
                  <ElFormItem label="Retry 次數">
                    <ElInput
                      v-model="integrationDraft.retryCount"
                      type="number"
                      min="0"
                    />
                  </ElFormItem>
                  <ElFormItem label="啟用自動重試">
                    <ElSwitch v-model="integrationDraft.autoRetry" />
                  </ElFormItem>
                </div>

                <ElFormItem label="IP 白名單提示">
                  <ElInput
                    v-model="integrationDraft.whitelistHint"
                    type="textarea"
                    :rows="2"
                  />
                </ElFormItem>
              </ElForm>
            </template>
          </article>

          <article class="panel-card">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h3 class="panel-title">測試區</h3>
              <ElButton type="primary" @click="runDrawerConnectionTest"
                >測試連線</ElButton
              >
            </div>
            <div class="mt-3 grid gap-2">
              <p class="text-sm text-slate-700">
                最近測試結果：
                <ElTag
                  :type="testStatusMeta(integrationDrawerData.lastTestStatus).type"
                  size="small"
                  effect="light"
                >
                  {{ testStatusMeta(integrationDrawerData.lastTestStatus).label }}
                </ElTag>
              </p>
              <p class="text-xs text-slate-500">
                測試時間：{{ formatDateTime(integrationDrawerData.lastTestedAt) }}
              </p>
              <p class="text-xs text-slate-600">
                錯誤 / 回應訊息：{{ integrationDrawerData.lastTestMessage || "-" }}
              </p>
            </div>
          </article>

          <article class="panel-card">
            <h3 class="panel-title">自訂 API 提示</h3>
            <template v-if="integrationDrawerMode === 'view'">
              <p class="mt-3 text-sm text-slate-700">
                {{
                  integrationDrawerData.customApiHint ||
                  "此整合目前沒有自訂 API 補充說明。"
                }}
              </p>
            </template>
            <template v-else>
              <ElForm label-position="top" class="mt-3">
                <ElFormItem label="說明文字區塊" class="mb-0">
                  <ElInput
                    v-model="integrationDraft.customApiHint"
                    type="textarea"
                    :rows="3"
                  />
                </ElFormItem>
              </ElForm>
            </template>
          </article>

          <div
            v-if="integrationDrawerMode !== 'view'"
            class="flex justify-end gap-2 border-t border-slate-200 pt-3"
          >
            <ElButton @click="integrationDrawerOpen = false">取消</ElButton>
            <ElButton type="primary" @click="saveIntegration">儲存</ElButton>
            <ElButton @click="saveAndTestIntegration">儲存並測試</ElButton>
          </div>
        </section>
      </template>
    </ElDrawer>

    <ElDrawer
      v-model="ruleDrawerOpen"
      :size="'62%'"
      :destroy-on-close="false"
      :title="
        ruleDrawerMode === 'create'
          ? '新增同步規則'
          : ruleDrawerMode === 'edit'
          ? '編輯同步規則'
          : '同步規則詳情'
      "
    >
      <template v-if="ruleDrawerData">
        <section class="grid gap-4">
          <header class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="grid gap-1">
                <h2 class="text-xl font-semibold text-slate-900">
                  {{ ruleDrawerData.name }}
                </h2>
                <p class="text-xs text-slate-500">{{ ruleDrawerData.id }}</p>
                <div class="flex flex-wrap items-center gap-1">
                  <ElTag
                    :type="ruleDrawerData.enabled ? 'success' : 'info'"
                    size="small"
                    effect="light"
                  >
                    {{ ruleDrawerData.enabled ? "啟用中" : "停用" }}
                  </ElTag>
                  <ElTag size="small" effect="plain">{{
                    dataTypeLabel(ruleDrawerData.dataType)
                  }}</ElTag>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <template v-if="ruleDrawerMode === 'view'">
                  <ElButton @click="openRuleDrawer(ruleDrawerData, 'edit')"
                    >編輯</ElButton
                  >
                </template>
                <template v-else>
                  <ElButton @click="ruleDrawerOpen = false">取消</ElButton>
                  <ElButton type="primary" @click="saveRule">儲存</ElButton>
                </template>
              </div>
            </div>
          </header>

          <article class="panel-card">
            <h3 class="panel-title">基本設定</h3>
            <template v-if="ruleDrawerMode === 'view'">
              <ElDescriptions class="mt-3" :column="2" border>
                <ElDescriptionsItem label="規則名稱">{{
                  ruleDrawerData.name
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="規則 ID">{{
                  ruleDrawerData.id
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="所屬系統">{{
                  getIntegrationName(ruleDrawerData.integrationId)
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="資料類型">{{
                  dataTypeLabel(ruleDrawerData.dataType)
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="啟用">{{
                  ruleDrawerData.enabled ? "是" : "否"
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="最後執行">{{
                  formatDateTime(ruleDrawerData.lastRunAt)
                }}</ElDescriptionsItem>
              </ElDescriptions>
            </template>
            <template v-else>
              <ElForm label-position="top" class="mt-3 grid gap-3">
                <div class="grid gap-3 md:grid-cols-2">
                  <ElFormItem label="規則 ID"
                    ><ElInput v-model="ruleDraft.id"
                  /></ElFormItem>
                  <ElFormItem label="規則名稱"
                    ><ElInput v-model="ruleDraft.name"
                  /></ElFormItem>
                  <ElFormItem label="所屬系統">
                    <ElSelect v-model="ruleDraft.integrationId">
                      <ElOption
                        v-for="item in integrationOptions"
                        :key="`r-integration-${item.value}`"
                        :label="item.label"
                        :value="item.value"
                      />
                    </ElSelect>
                  </ElFormItem>
                  <ElFormItem label="資料類型">
                    <ElSelect v-model="ruleDraft.dataType">
                      <ElOption
                        v-for="item in syncDataTypeOptions"
                        :key="`r-data-type-${item.value}`"
                        :label="item.label"
                        :value="item.value"
                      />
                    </ElSelect>
                  </ElFormItem>
                  <ElFormItem label="啟用"
                    ><ElSwitch v-model="ruleDraft.enabled"
                  /></ElFormItem>
                </div>
              </ElForm>
            </template>
          </article>

          <article class="panel-card">
            <h3 class="panel-title">同步方式</h3>
            <template v-if="ruleDrawerMode === 'view'">
              <ElDescriptions class="mt-3" :column="2" border>
                <ElDescriptionsItem label="同步方向">{{
                  directionLabel(ruleDrawerData.direction)
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="同步頻率">{{
                  frequencyLabel(ruleDrawerData.frequency)
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="允許手動觸發">{{
                  ruleDrawerData.allowManual ? "是" : "否"
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="僅同步符合條件資料">{{
                  ruleDrawerData.onlyMatchedData ? "是" : "否"
                }}</ElDescriptionsItem>
              </ElDescriptions>
            </template>
            <template v-else>
              <ElForm label-position="top" class="mt-3 grid gap-3">
                <div class="grid gap-3 md:grid-cols-2">
                  <ElFormItem label="同步方向">
                    <ElSelect v-model="ruleDraft.direction">
                      <ElOption
                        v-for="item in directionOptions"
                        :key="`r-direction-${item.value}`"
                        :label="item.label"
                        :value="item.value"
                      />
                    </ElSelect>
                  </ElFormItem>
                  <ElFormItem label="同步頻率">
                    <ElSelect v-model="ruleDraft.frequency">
                      <ElOption
                        v-for="item in frequencyOptions"
                        :key="`r-frequency-${item.value}`"
                        :label="item.label"
                        :value="item.value"
                      />
                    </ElSelect>
                  </ElFormItem>
                  <ElFormItem label="允許手動觸發"
                    ><ElSwitch v-model="ruleDraft.allowManual"
                  /></ElFormItem>
                  <ElFormItem label="僅同步符合條件資料">
                    <ElSwitch v-model="ruleDraft.onlyMatchedData" />
                  </ElFormItem>
                </div>
              </ElForm>
            </template>
          </article>

          <article class="panel-card">
            <h3 class="panel-title">條件過濾</h3>
            <template v-if="ruleDrawerMode === 'view'">
              <p class="mt-3 text-sm text-slate-700">
                {{ ruleDrawerData.filterCondition || "-" }}
              </p>
            </template>
            <template v-else>
              <ElForm label-position="top" class="mt-3">
                <ElFormItem label="條件描述" class="mb-0">
                  <ElInput
                    v-model="ruleDraft.filterCondition"
                    type="textarea"
                    :rows="2"
                  />
                </ElFormItem>
              </ElForm>
            </template>
          </article>

          <article class="panel-card">
            <h3 class="panel-title">衝突規則</h3>
            <template v-if="ruleDrawerMode === 'view'">
              <ElDescriptions class="mt-3" :column="2" border>
                <ElDescriptionsItem label="衝突處理方式">{{
                  conflictPolicyLabel(ruleDrawerData.conflictPolicy)
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="通知管理者">{{
                  ruleDrawerData.notifyManager ? "是" : "否"
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="衝突判定" :span="2">{{
                  ruleDrawerData.conflictDetection
                }}</ElDescriptionsItem>
              </ElDescriptions>
            </template>
            <template v-else>
              <ElForm label-position="top" class="mt-3 grid gap-3">
                <div class="grid gap-3 md:grid-cols-2">
                  <ElFormItem label="衝突處理方式">
                    <ElSelect v-model="ruleDraft.conflictPolicy">
                      <ElOption
                        v-for="item in conflictPolicyOptions"
                        :key="`r-conflict-${item.value}`"
                        :label="item.label"
                        :value="item.value"
                      />
                    </ElSelect>
                  </ElFormItem>
                  <ElFormItem label="通知管理者"
                    ><ElSwitch v-model="ruleDraft.notifyManager"
                  /></ElFormItem>
                </div>
                <ElFormItem label="衝突判定方式">
                  <ElInput
                    v-model="ruleDraft.conflictDetection"
                    type="textarea"
                    :rows="2"
                  />
                </ElFormItem>
              </ElForm>
            </template>
          </article>

          <article class="panel-card">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h3 class="panel-title">欄位對應</h3>
              <ElButton
                v-if="ruleDrawerMode !== 'view'"
                text
                type="primary"
                @click="addMapping"
                >新增欄位</ElButton
              >
            </div>

            <ElTable
              class="mt-3"
              table-layout="auto"
              :data="
                ruleDrawerMode === 'view' ? ruleDrawerData.mappings : ruleDraft.mappings
              "
            >
              <ElTableColumn label="CRM 欄位" min-width="160">
                <template #default="{ row }">
                  <template v-if="ruleDrawerMode === 'view'">{{ row.crmField }}</template>
                  <template v-else><ElInput v-model="row.crmField" /></template>
                </template>
              </ElTableColumn>
              <ElTableColumn label="外部欄位" min-width="160">
                <template #default="{ row }">
                  <template v-if="ruleDrawerMode === 'view'">{{
                    row.externalField
                  }}</template>
                  <template v-else><ElInput v-model="row.externalField" /></template>
                </template>
              </ElTableColumn>
              <ElTableColumn label="必填" width="90" align="center">
                <template #default="{ row }">
                  <template v-if="ruleDrawerMode === 'view'">{{
                    row.required ? "是" : "否"
                  }}</template>
                  <template v-else><ElSwitch v-model="row.required" /></template>
                </template>
              </ElTableColumn>
              <ElTableColumn label="預設值" min-width="140">
                <template #default="{ row }">
                  <template v-if="ruleDrawerMode === 'view'">{{
                    row.defaultValue || "-"
                  }}</template>
                  <template v-else><ElInput v-model="row.defaultValue" /></template>
                </template>
              </ElTableColumn>
              <ElTableColumn label="轉換規則" min-width="160">
                <template #default="{ row }">
                  <template v-if="ruleDrawerMode === 'view'">{{
                    row.transformRule || "-"
                  }}</template>
                  <template v-else><ElInput v-model="row.transformRule" /></template>
                </template>
              </ElTableColumn>
              <ElTableColumn
                v-if="ruleDrawerMode !== 'view'"
                label="操作"
                width="90"
                fixed="right"
              >
                <template #default="{ $index }">
                  <ElButton
                    text
                    type="danger"
                    :disabled="ruleDraft.mappings.length === 1"
                    @click="removeMapping($index)"
                    >移除</ElButton
                  >
                </template>
              </ElTableColumn>
            </ElTable>
          </article>
        </section>
      </template>
    </ElDrawer>

    <ElDrawer
      v-model="webhookDrawerOpen"
      :size="'46%'"
      :destroy-on-close="false"
      :title="
        webhookDrawerMode === 'create'
          ? '新增 Webhook'
          : webhookDrawerMode === 'edit'
          ? '編輯 Webhook'
          : 'Webhook 詳情'
      "
    >
      <template v-if="webhookDrawerData">
        <section class="grid gap-4">
          <article class="panel-card">
            <h3 class="panel-title">Webhook 設定</h3>
            <template v-if="webhookDrawerMode === 'view'">
              <ElDescriptions class="mt-3" :column="1" border>
                <ElDescriptionsItem label="名稱">{{
                  webhookDrawerData.name
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="Endpoint URL">{{
                  webhookDrawerData.endpointUrl
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="Request Method">{{
                  webhookDrawerData.method
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="Header">{{
                  webhookDrawerData.headersInput
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="事件">{{
                  webhookDrawerData.events.map(eventLabel).join("、")
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="重送策略">{{
                  retryStrategyOptions.find(
                    (item) => item.value === webhookDrawerData.retryStrategy
                  )?.label || webhookDrawerData.retryStrategy
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="啟用">{{
                  webhookDrawerData.enabled ? "是" : "否"
                }}</ElDescriptionsItem>
              </ElDescriptions>
            </template>
            <template v-else>
              <ElForm label-position="top" class="mt-3 grid gap-3">
                <ElFormItem label="Webhook ID"
                  ><ElInput v-model="webhookDraft.id"
                /></ElFormItem>
                <ElFormItem label="名稱"
                  ><ElInput v-model="webhookDraft.name"
                /></ElFormItem>
                <ElFormItem label="Endpoint URL"
                  ><ElInput v-model="webhookDraft.endpointUrl"
                /></ElFormItem>
                <div class="grid gap-3 md:grid-cols-2">
                  <ElFormItem label="Request Method">
                    <ElSelect v-model="webhookDraft.method">
                      <ElOption
                        v-for="item in requestMethodOptions"
                        :key="`method-${item.value}`"
                        :label="item.label"
                        :value="item.value"
                      />
                    </ElSelect>
                  </ElFormItem>
                  <ElFormItem label="重送策略">
                    <ElSelect v-model="webhookDraft.retryStrategy">
                      <ElOption
                        v-for="item in retryStrategyOptions"
                        :key="`retry-${item.value}`"
                        :label="item.label"
                        :value="item.value"
                      />
                    </ElSelect>
                  </ElFormItem>
                </div>
                <ElFormItem label="Secret">
                  <ElInput v-model="webhookDraft.secret" show-password />
                </ElFormItem>
                <ElFormItem label="Header 設定">
                  <ElInput
                    v-model="webhookDraft.headersInput"
                    type="textarea"
                    :rows="2"
                  />
                </ElFormItem>
                <ElFormItem label="觸發事件">
                  <ElSelect
                    v-model="webhookDraft.events"
                    multiple
                    collapse-tags
                    collapse-tags-tooltip
                  >
                    <ElOption
                      v-for="item in webhookEventOptions"
                      :key="`wevent-${item.value}`"
                      :label="item.label"
                      :value="item.value"
                    />
                  </ElSelect>
                </ElFormItem>
                <ElFormItem label="啟用"
                  ><ElSwitch v-model="webhookDraft.enabled"
                /></ElFormItem>
              </ElForm>
            </template>
          </article>

          <div
            v-if="webhookDrawerMode !== 'view'"
            class="flex justify-end gap-2 border-t border-slate-200 pt-3"
          >
            <ElButton @click="webhookDrawerOpen = false">取消</ElButton>
            <ElButton type="primary" @click="saveWebhook">儲存</ElButton>
          </div>
        </section>
      </template>
    </ElDrawer>

    <ElDrawer
      v-model="notificationDrawerOpen"
      :size="'46%'"
      :destroy-on-close="false"
      :title="
        notificationDrawerMode === 'create'
          ? '新增通知規則'
          : notificationDrawerMode === 'edit'
          ? '編輯通知規則'
          : '通知規則詳情'
      "
    >
      <template v-if="notificationDrawerData">
        <section class="grid gap-4">
          <article class="panel-card">
            <h3 class="panel-title">通知規則</h3>
            <template v-if="notificationDrawerMode === 'view'">
              <ElDescriptions class="mt-3" :column="1" border>
                <ElDescriptionsItem label="規則名稱">{{
                  notificationDrawerData.name
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="事件">{{
                  notificationDrawerData.events.map(eventLabel).join("、")
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="通知管道">{{
                  notificationDrawerData.channels.map(channelLabel).join("、")
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="接收對象">{{
                  notificationDrawerData.recipients
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="合併通知">{{
                  notificationDrawerData.mergeNotify ? "是" : "否"
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="僅通知失敗事件">{{
                  notificationDrawerData.onlyFailedEvents ? "是" : "否"
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="啟用">{{
                  notificationDrawerData.enabled ? "是" : "否"
                }}</ElDescriptionsItem>
              </ElDescriptions>
            </template>
            <template v-else>
              <ElForm label-position="top" class="mt-3 grid gap-3">
                <ElFormItem label="通知規則 ID">
                  <ElInput v-model="notificationDraft.id" />
                </ElFormItem>
                <ElFormItem label="規則名稱"
                  ><ElInput v-model="notificationDraft.name"
                /></ElFormItem>
                <ElFormItem label="事件類型多選">
                  <ElSelect
                    v-model="notificationDraft.events"
                    multiple
                    collapse-tags
                    collapse-tags-tooltip
                  >
                    <ElOption
                      v-for="item in webhookEventOptions"
                      :key="`nevent-${item.value}`"
                      :label="item.label"
                      :value="item.value"
                    />
                  </ElSelect>
                </ElFormItem>
                <ElFormItem label="通知方式多選">
                  <ElSelect
                    v-model="notificationDraft.channels"
                    multiple
                    collapse-tags
                    collapse-tags-tooltip
                  >
                    <ElOption
                      v-for="item in notificationChannelOptions"
                      :key="`nchannel-${item.value}`"
                      :label="item.label"
                      :value="item.value"
                    />
                  </ElSelect>
                </ElFormItem>
                <ElFormItem label="接收人 / 群組">
                  <ElInput v-model="notificationDraft.recipients" />
                </ElFormItem>
                <div class="grid gap-3 md:grid-cols-2">
                  <ElFormItem label="是否合併通知">
                    <ElSwitch v-model="notificationDraft.mergeNotify" />
                  </ElFormItem>
                  <ElFormItem label="僅通知失敗事件">
                    <ElSwitch v-model="notificationDraft.onlyFailedEvents" />
                  </ElFormItem>
                </div>
                <ElFormItem label="啟用"
                  ><ElSwitch v-model="notificationDraft.enabled"
                /></ElFormItem>
              </ElForm>
            </template>
          </article>

          <div
            v-if="notificationDrawerMode !== 'view'"
            class="flex justify-end gap-2 border-t border-slate-200 pt-3"
          >
            <ElButton @click="notificationDrawerOpen = false">取消</ElButton>
            <ElButton type="primary" @click="saveNotificationRule">儲存</ElButton>
          </div>
        </section>
      </template>
    </ElDrawer>

    <ElDrawer
      v-model="logDrawerOpen"
      :size="'48%'"
      :destroy-on-close="false"
      title="同步紀錄詳情"
    >
      <template v-if="activeLog">
        <section class="grid gap-4">
          <article class="panel-card">
            <h3 class="panel-title">基本資訊</h3>
            <ElDescriptions class="mt-3" :column="2" border>
              <ElDescriptionsItem label="執行時間">{{
                formatDateTime(activeLog.executedAt)
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="整合系統">{{
                getIntegrationName(activeLog.integrationId)
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="規則 / 事件">{{
                activeLog.name
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="類型">{{
                logTypeLabel(activeLog.type)
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="結果">
                <ElTag
                  :type="logResultMeta(activeLog.result).type"
                  size="small"
                  effect="light"
                >
                  {{ logResultMeta(activeLog.result).label }}
                </ElTag>
              </ElDescriptionsItem>
              <ElDescriptionsItem label="耗時">{{
                formatDuration(activeLog.durationMs)
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="處理筆數">{{
                activeLog.processedCount
              }}</ElDescriptionsItem>
            </ElDescriptions>
          </article>

          <article class="panel-card">
            <h3 class="panel-title">Request 摘要</h3>
            <p class="mt-3 text-sm text-slate-700">
              {{ activeLog.requestSummary || "-" }}
            </p>
          </article>

          <article class="panel-card">
            <h3 class="panel-title">Response 摘要</h3>
            <p class="mt-3 text-sm text-slate-700">
              {{ activeLog.responseSummary || "-" }}
            </p>
          </article>

          <article class="panel-card">
            <h3 class="panel-title">錯誤訊息</h3>
            <p class="mt-3 text-sm text-slate-700">{{ activeLog.errorMessage || "-" }}</p>
          </article>

          <article class="panel-card">
            <h3 class="panel-title">重試紀錄</h3>
            <div class="mt-3 grid gap-2">
              <article
                v-for="item in activeLog.retryLogs"
                :key="item.id"
                class="rounded-xl border border-slate-200 px-3 py-2"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p class="text-xs text-slate-500">
                    {{ formatDateTime(item.executedAt) }}
                  </p>
                  <ElTag
                    :type="logResultMeta(item.result).type"
                    size="small"
                    effect="light"
                  >
                    {{ logResultMeta(item.result).label }}
                  </ElTag>
                </div>
              </article>

              <ElEmpty
                v-if="activeLog.retryLogs.length === 0"
                description="目前沒有重試紀錄"
                :image-size="80"
              />
            </div>
          </article>

          <div class="flex justify-end gap-2 border-t border-slate-200 pt-3">
            <ElButton @click="rerunLog(activeLog)">重新執行</ElButton>
          </div>
        </section>
      </template>
    </ElDrawer>
  </div>
</template>

<style scoped>
.page-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.list-table :deep(.el-table__row) {
  transition: background-color 0.15s ease;
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
