<script setup>
import { computed, onActivated, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  ElButton,
  ElCheckbox,
  ElDatePicker,
  ElDialog,
  ElDrawer,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
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
  ElTag,
} from "element-plus";
import { CirclePlus, Filter, MoreFilled, Refresh, Search } from "@element-plus/icons-vue";
import { useUsersStore } from "../../composables/useUsersStore";
import logoAsset from "../../assets/img/logo.png";

const { getAssignableOwners, getUserName } = useUsersStore();
const route = useRoute();

const loading = ref(false);
const pageSize = ref(10);
const currentPage = ref(1);
const filterPanelOpen = ref(false);
const selectedRows = ref([]);
const quickFilter = ref("all");
const sortState = reactive({
  prop: "createdAt",
  order: "descending",
});

const customFieldDefinitions = ref([
  { key: "collaborationModel", label: "合作模式", showInTable: false },
]);

const entityTypeMap = {
  organization: { label: "組織" },
  person: { label: "個人" },
};

const partnerTypeMap = {
  distributor: { label: "經銷夥伴", type: "warning" },
  agency: { label: "代理夥伴", type: "primary" },
  channel: { label: "通路夥伴", type: "primary" },
  technical: { label: "技術夥伴", type: "success" },
  consulting: { label: "顧問夥伴", type: "info" },
  promotion: { label: "推廣夥伴", type: "warning" },
  referral: { label: "介紹夥伴", type: "success" },
  supplier: { label: "供應夥伴", type: "info" },
  strategic: { label: "戰略夥伴", type: "danger" },
};

const cooperationStatusMap = {
  lead: { label: "潛在線索", type: "info" },
  contacting: { label: "接洽中", type: "warning" },
  cooperating: { label: "合作中", type: "success" },
  paused: { label: "暫停合作", type: "warning" },
  terminated: { label: "已終止", type: "danger" },
  dormant: { label: "沉睡中", type: "info" },
};

const partnerLevelMap = {
  strategic: { label: "戰略級", type: "danger" },
  a: { label: "A 級", type: "warning" },
  b: { label: "B 級", type: "success" },
  c: { label: "C 級", type: "info" },
  normal: { label: "一般級", type: "" },
};

const entityTypeOptions = [
  { label: "全部主體", value: "all" },
  { label: "組織", value: "organization" },
  { label: "個人", value: "person" },
];

const partnerTypeOptions = [
  { label: "全部夥伴類型", value: "all" },
  ...Object.entries(partnerTypeMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const cooperationStatusOptions = [
  { label: "全部合作狀態", value: "all" },
  ...Object.entries(cooperationStatusMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const partnerLevelOptions = [
  { label: "全部夥伴等級", value: "all" },
  ...Object.entries(partnerLevelMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const regionOptions = [
  { label: "全部地區", value: "all" },
  { label: "台灣", value: "台灣" },
  { label: "日本", value: "日本" },
  { label: "東南亞", value: "東南亞" },
  { label: "北美", value: "北美" },
  { label: "歐洲", value: "歐洲" },
];

const ownerOptions = computed(() => [
  { label: "全部負責人", value: "all" },
  ...getAssignableOwners("partner").map((user) => ({
    label: user.name,
    value: user.id,
  })),
]);

const quickFilterOptions = [
  { value: "high_value", label: "高價值夥伴" },
  { value: "follow_up", label: "待跟進" },
  { value: "new_this_month", label: "本月新增" },
  { value: "inactive", label: "已停用" },
  { value: "dormant", label: "沉睡夥伴" },
];

const tableSettings = reactive({
  size: "large",
  columns: {
    partnerType: true,
    cooperationStatus: true,
    partnerLevel: true,
    contact: true,
    region: true,
    owner: true,
    lastInteraction: true,
    opportunity: true,
    value: true,
    createdAt: true,
  },
});

const tableSettingsDialogOpen = ref(false);
const customFieldDialogOpen = ref(false);
const partnerFormDialogOpen = ref(false);
const partnerFormMode = ref("create");
const activePartnerId = ref("");
const detailDrawerOpen = ref(false);
const assignDialogOpen = ref(false);
const assignTargetIds = ref([]);
const assignOwnerUserId = ref("");
const opportunityDialogOpen = ref(false);
const opportunityTargetId = ref("");
const tagsDialogOpen = ref(false);
const tagsTargetId = ref("");
const historyDialogOpen = ref(false);
const historyTargetId = ref("");

const tagsDraft = ref("");
const tagsModel = ref([]);

const customFieldForm = reactive({
  label: "",
  key: "",
  showInTable: false,
});

const opportunityForm = reactive({
  name: "",
  value: 0,
  summary: "",
  interactionDate: new Date().toISOString().slice(0, 10),
});

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildHistoryEntry(title, description = "") {
  return {
    id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    occurredAt: getTodayDate(),
    title,
    description,
  };
}

function syncCustomFields(record) {
  const current = { ...(record.customFields ?? {}) };

  customFieldDefinitions.value.forEach((field) => {
    if (!(field.key in current)) {
      current[field.key] = "";
    }
  });

  Object.keys(current).forEach((key) => {
    if (!customFieldDefinitions.value.some((field) => field.key === key)) {
      delete current[key];
    }
  });

  record.customFields = current;

  return record;
}

function normalizePartner(record) {
  const normalized = {
    avatarUrl: "",
    logoUrl: "",
    email: "",
    phone: "",
    market: record.region ?? "",
    isHighValue: false,
    isEnabled: true,
    isArchived: false,
    tags: [],
    history: [],
    customFields: {},
    ...record,
  };

  if (normalized.history.length === 0) {
    normalized.history = [
      buildHistoryEntry("建立夥伴", `${normalized.name} 已加入夥伴列表`),
    ];
  }

  return syncCustomFields(normalized);
}

const initialPartners = [
  {
    id: "partner-001",
    partnerCode: "PTN-001",
    name: "beanfun! Digital Commerce",
    entityType: "organization",
    partnerType: "strategic",
    cooperationStatus: "cooperating",
    partnerLevel: "strategic",
    email: "partnership@beanfun.test",
    phone: "02-2717-2000",
    region: "台灣",
    market: "台灣",
    ownerUserId: "u-001",
    lastInteractionDate: "2026-04-02",
    lastInteractionSummary: "已安排 Q2 聯名活動 Kickoff",
    opportunityCount: 4,
    cooperationValue: 7800000,
    createdAt: "2026-01-10",
    isHighValue: true,
    isEnabled: true,
    logoUrl: logoAsset,
    primaryContactName: "李雅婷",
    primaryContactRole: "商務負責人",
    tags: ["聯名", "核心夥伴"],
  },
  {
    id: "partner-002",
    partnerCode: "PTN-002",
    name: "陳彥廷",
    entityType: "person",
    partnerType: "consulting",
    cooperationStatus: "contacting",
    partnerLevel: "a",
    email: "yt.chen.consulting@test",
    phone: "0912-881-303",
    region: "台灣",
    market: "台灣",
    ownerUserId: "u-003",
    lastInteractionDate: "2026-03-03",
    lastInteractionSummary: "已寄送顧問合作提案",
    opportunityCount: 1,
    cooperationValue: 520000,
    createdAt: "2026-03-02",
    isHighValue: true,
    isEnabled: true,
    avatarUrl: "",
    jobTitle: "資深行銷顧問",
    affiliatedCompany: "獨立顧問",
  },
  {
    id: "partner-003",
    partnerCode: "PTN-003",
    name: "SEA Gamer Network",
    entityType: "organization",
    partnerType: "distributor",
    cooperationStatus: "cooperating",
    partnerLevel: "a",
    email: "partner@sgn.test",
    phone: "+65-6800-1103",
    region: "東南亞",
    market: "東南亞",
    ownerUserId: "u-002",
    lastInteractionDate: "2026-03-22",
    lastInteractionSummary: "已電話確認支付串接排程",
    opportunityCount: 3,
    cooperationValue: 4600000,
    createdAt: "2025-11-18",
    isHighValue: true,
    isEnabled: true,
    logoUrl: logoAsset,
    primaryContactName: "Marcus Lim",
    primaryContactRole: "Business Director",
  },
  {
    id: "partner-004",
    partnerCode: "PTN-004",
    name: "Tokyo Influencer Guild",
    entityType: "organization",
    partnerType: "promotion",
    cooperationStatus: "paused",
    partnerLevel: "b",
    email: "biz@tig.test",
    phone: "+81-3-5200-8111",
    region: "日本",
    market: "日本",
    ownerUserId: "u-001",
    lastInteractionDate: "2026-02-15",
    lastInteractionSummary: "已暫停合作，等待檔期重排",
    opportunityCount: 2,
    cooperationValue: 1380000,
    createdAt: "2025-09-12",
    isEnabled: true,
    logoUrl: "",
    primaryContactName: "河合奈緒",
    primaryContactRole: "聯盟窗口",
  },
  {
    id: "partner-005",
    partnerCode: "PTN-005",
    name: "林家豪",
    entityType: "person",
    partnerType: "referral",
    cooperationStatus: "cooperating",
    partnerLevel: "b",
    email: "jh.lin.referral@test",
    phone: "0933-221-108",
    region: "台灣",
    market: "台灣",
    ownerUserId: "u-004",
    lastInteractionDate: "2026-03-30",
    lastInteractionSummary: "已提供兩家潛在合作名單",
    opportunityCount: 2,
    cooperationValue: 760000,
    createdAt: "2026-02-01",
    isEnabled: true,
    avatarUrl: "",
    jobTitle: "策略介紹人",
    affiliatedCompany: "自由合作",
  },
  {
    id: "partner-006",
    partnerCode: "PTN-006",
    name: "Cloud Integrate Labs",
    entityType: "organization",
    partnerType: "technical",
    cooperationStatus: "dormant",
    partnerLevel: "c",
    email: "alliance@cil.test",
    phone: "02-6600-9981",
    region: "台灣",
    market: "亞太",
    ownerUserId: "u-003",
    lastInteractionDate: "2025-12-12",
    lastInteractionSummary: "近 3 個月未互動",
    opportunityCount: 0,
    cooperationValue: 300000,
    createdAt: "2024-12-28",
    isEnabled: true,
    logoUrl: "",
    primaryContactName: "王詠琪",
    primaryContactRole: "技術窗口",
  },
  {
    id: "partner-007",
    partnerCode: "PTN-007",
    name: "北極星供應鏈",
    entityType: "organization",
    partnerType: "supplier",
    cooperationStatus: "terminated",
    partnerLevel: "normal",
    email: "supply@polaris.test",
    phone: "02-7755-3311",
    region: "台灣",
    market: "台灣",
    ownerUserId: "u-002",
    lastInteractionDate: "2026-01-19",
    lastInteractionSummary: "合作已終止，完成交接",
    opportunityCount: 0,
    cooperationValue: 220000,
    createdAt: "2025-06-09",
    isEnabled: false,
    logoUrl: "",
    primaryContactName: "張偉德",
    primaryContactRole: "採購窗口",
  },
  {
    id: "partner-008",
    partnerCode: "PTN-008",
    name: "Mia Sanchez",
    entityType: "person",
    partnerType: "agency",
    cooperationStatus: "lead",
    partnerLevel: "normal",
    email: "mia.sanchez@test",
    phone: "+1-415-555-3012",
    region: "北美",
    market: "北美",
    ownerUserId: "u-001",
    lastInteractionDate: "2026-03-20",
    lastInteractionSummary: "初次接洽，等待回覆 NDA",
    opportunityCount: 1,
    cooperationValue: 450000,
    createdAt: "2026-03-18",
    isEnabled: true,
    avatarUrl: "",
    jobTitle: "商務代理",
    affiliatedCompany: "Pacific Growth Agency",
  },
  {
    id: "partner-009",
    partnerCode: "PTN-009",
    name: "Euro Play Media",
    entityType: "organization",
    partnerType: "promotion",
    cooperationStatus: "contacting",
    partnerLevel: "b",
    email: "collab@euplay.test",
    phone: "+49-30-1100-7789",
    region: "歐洲",
    market: "歐洲",
    ownerUserId: "u-003",
    lastInteractionDate: "2026-03-08",
    lastInteractionSummary: "已寄送品牌合作提案",
    opportunityCount: 2,
    cooperationValue: 1250000,
    createdAt: "2026-03-06",
    isEnabled: true,
    logoUrl: "",
    primaryContactName: "Hannah Kruger",
    primaryContactRole: "Partnership Lead",
  },
  {
    id: "partner-010",
    partnerCode: "PTN-010",
    name: "高橋翔太",
    entityType: "person",
    partnerType: "consulting",
    cooperationStatus: "cooperating",
    partnerLevel: "a",
    email: "shota.takahashi@test",
    phone: "+81-90-2200-5618",
    region: "日本",
    market: "日本",
    ownerUserId: "u-004",
    lastInteractionDate: "2026-04-01",
    lastInteractionSummary: "已安排產品策略工作坊",
    opportunityCount: 3,
    cooperationValue: 2100000,
    createdAt: "2026-01-26",
    isHighValue: true,
    isEnabled: true,
    avatarUrl: "",
    jobTitle: "產品策略顧問",
    affiliatedCompany: "Shota Consulting",
  },
  {
    id: "partner-011",
    partnerCode: "PTN-011",
    name: "Arcade Channel Union",
    entityType: "organization",
    partnerType: "channel",
    cooperationStatus: "cooperating",
    partnerLevel: "b",
    email: "partner@acu.test",
    phone: "+66-2-880-9921",
    region: "東南亞",
    market: "泰國",
    ownerUserId: "u-002",
    lastInteractionDate: "2026-03-28",
    lastInteractionSummary: "已確認通路季度檔期",
    opportunityCount: 5,
    cooperationValue: 3500000,
    createdAt: "2025-08-04",
    isHighValue: true,
    isEnabled: true,
    logoUrl: logoAsset,
    primaryContactName: "Pimnara Chai",
    primaryContactRole: "Channel Manager",
  },
  {
    id: "partner-012",
    partnerCode: "PTN-012",
    name: "晴天整合顧問",
    entityType: "organization",
    partnerType: "consulting",
    cooperationStatus: "dormant",
    partnerLevel: "c",
    email: "service@sunny-consulting.test",
    phone: "04-2233-9188",
    region: "台灣",
    market: "台灣",
    ownerUserId: "u-004",
    lastInteractionDate: "2025-11-03",
    lastInteractionSummary: "合約到期後暫無新案",
    opportunityCount: 0,
    cooperationValue: 180000,
    createdAt: "2025-01-22",
    isEnabled: false,
    logoUrl: "",
    primaryContactName: "陳怡靜",
    primaryContactRole: "專案窗口",
  },
];

const partnerRecords = ref(initialPartners.map((item) => normalizePartner(item)));

const filters = reactive({
  keyword: "",
  partnerId: typeof route.query.partnerId === "string" ? route.query.partnerId : "all",
  entityType: "all",
  partnerType: "all",
  cooperationStatus: "all",
  partnerLevel: "all",
  region: "all",
  owner: "all",
  highValue: "all",
  enabled: "all",
  recentInteractionRange: [],
  createdRange: [],
});

function createEmptyPartnerForm() {
  const defaultOwner =
    ownerOptions.value.find((item) => item.value !== "all")?.value ?? "";
  const customFields = Object.fromEntries(
    customFieldDefinitions.value.map((field) => [field.key, ""])
  );

  return {
    name: "",
    entityType: "organization",
    partnerType: "strategic",
    cooperationStatus: "lead",
    partnerLevel: "normal",
    email: "",
    phone: "",
    region: "台灣",
    market: "台灣",
    ownerUserId: defaultOwner,
    lastInteractionDate: getTodayDate(),
    lastInteractionSummary: "",
    cooperationValue: 0,
    isHighValue: false,
    isEnabled: true,
    primaryContactName: "",
    primaryContactRole: "",
    jobTitle: "",
    affiliatedCompany: "",
    customFields,
  };
}

const partnerForm = reactive(createEmptyPartnerForm());

const activePartner = computed(
  () => partnerRecords.value.find((item) => item.id === activePartnerId.value) ?? null
);

const historyTarget = computed(
  () => partnerRecords.value.find((item) => item.id === historyTargetId.value) ?? null
);

const tableCustomColumns = computed(() =>
  customFieldDefinitions.value.filter((field) => field.showInTable)
);

const summaryCards = computed(() => {
  const total = partnerRecords.value.length;
  const active = partnerRecords.value.filter((item) => item.isEnabled).length;
  const monthlyNew = partnerRecords.value.filter((item) => isThisMonth(item.createdAt))
    .length;
  const highValue = partnerRecords.value.filter((item) => item.isHighValue).length;
  const followUp = partnerRecords.value.filter((item) => needsFollowUp(item)).length;
  const inactiveOrDormant = partnerRecords.value.filter(
    (item) => !item.isEnabled || item.cooperationStatus === "dormant"
  ).length;

  return [
    { label: "夥伴總數", value: total },
    { label: "啟用中夥伴數", value: active },
    { label: "本月新增夥伴數", value: monthlyNew },
    { label: "高價值夥伴數", value: highValue },
    { label: "待跟進夥伴數", value: followUp },
    { label: "停用 / 沉睡夥伴數", value: inactiveOrDormant },
  ];
});

const filteredPartners = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return partnerRecords.value.filter((item) => {
    const matchesPartnerId = filters.partnerId === "all" || item.id === filters.partnerId;
    const matchesKeyword =
      keyword.length === 0 ||
      item.name.toLowerCase().includes(keyword) ||
      item.partnerCode.toLowerCase().includes(keyword) ||
      (item.affiliatedCompany ?? "").toLowerCase().includes(keyword) ||
      (item.primaryContactName ?? "").toLowerCase().includes(keyword);

    const matchesEntity =
      filters.entityType === "all" || item.entityType === filters.entityType;
    const matchesType =
      filters.partnerType === "all" || item.partnerType === filters.partnerType;
    const matchesStatus =
      filters.cooperationStatus === "all" ||
      item.cooperationStatus === filters.cooperationStatus;
    const matchesLevel =
      filters.partnerLevel === "all" || item.partnerLevel === filters.partnerLevel;
    const matchesRegion = filters.region === "all" || item.region === filters.region;
    const matchesOwner = filters.owner === "all" || item.ownerUserId === filters.owner;

    const matchesHighValue =
      filters.highValue === "all" ||
      (filters.highValue === "yes" ? item.isHighValue : !item.isHighValue);

    const matchesEnabled =
      filters.enabled === "all" ||
      (filters.enabled === "enabled" ? item.isEnabled : !item.isEnabled);

    const matchesRecentInteraction = isDateWithinRange(
      item.lastInteractionDate,
      filters.recentInteractionRange
    );

    const matchesCreatedAt = isDateWithinRange(item.createdAt, filters.createdRange);

    const matchesQuickFilter =
      quickFilter.value === "all" ||
      (quickFilter.value === "high_value" && item.isHighValue) ||
      (quickFilter.value === "follow_up" && needsFollowUp(item)) ||
      (quickFilter.value === "new_this_month" && isThisMonth(item.createdAt)) ||
      (quickFilter.value === "inactive" && !item.isEnabled) ||
      (quickFilter.value === "dormant" && item.cooperationStatus === "dormant");

    return (
      matchesPartnerId &&
      matchesKeyword &&
      matchesEntity &&
      matchesType &&
      matchesStatus &&
      matchesLevel &&
      matchesRegion &&
      matchesOwner &&
      matchesHighValue &&
      matchesEnabled &&
      matchesRecentInteraction &&
      matchesCreatedAt &&
      matchesQuickFilter
    );
  });
});

const sortedPartners = computed(() => {
  const records = [...filteredPartners.value];

  if (!sortState.prop || !sortState.order) {
    return records;
  }

  const direction = sortState.order === "ascending" ? 1 : -1;

  return records.sort((left, right) => {
    if (sortState.prop === "name") {
      return left.name.localeCompare(right.name) * direction;
    }

    if (sortState.prop === "opportunityCount") {
      return (left.opportunityCount - right.opportunityCount) * direction;
    }

    if (sortState.prop === "cooperationValue") {
      return (left.cooperationValue - right.cooperationValue) * direction;
    }

    if (sortState.prop === "lastInteractionDate") {
      return (
        (new Date(left.lastInteractionDate).getTime() -
          new Date(right.lastInteractionDate).getTime()) *
        direction
      );
    }

    if (sortState.prop === "createdAt") {
      return (
        (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()) *
        direction
      );
    }

    return 0;
  });
});

const pagedPartners = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;

  return sortedPartners.value.slice(start, end);
});

const emptyState = computed(() => {
  if (partnerRecords.value.length === 0) {
    return {
      title: "目前尚無夥伴資料",
      description: "可先新增第一位合作夥伴，開始建立夥伴關係管理。",
      actionLabel: "新增夥伴",
      action: openCreatePartner,
    };
  }

  return {
    title: "沒有符合條件的夥伴",
    description: "請調整搜尋條件或清除篩選。",
    actionLabel: "清除篩選",
    action: resetFilters,
  };
});

function toDateTime(dateValue) {
  if (!dateValue) {
    return null;
  }

  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const date = toDateTime(value);

  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function getInitials(name = "") {
  const cleaned = String(name).trim();

  if (!cleaned) {
    return "PT";
  }

  if (/^[\u4e00-\u9fa5]+$/.test(cleaned)) {
    return cleaned.slice(0, 2);
  }

  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function resolvePartnerSecondary(row) {
  const entityLabel = entityTypeMap[row.entityType]?.label ?? row.entityType;

  if (row.entityType === "person") {
    const role = row.jobTitle || "未填職稱";
    const company = row.affiliatedCompany || "未填所屬公司";
    return `${row.partnerCode} ・ ${entityLabel} ・ ${role} / ${company}`;
  }

  return `${row.partnerCode} ・ ${entityLabel} ・ 主要聯絡人：${
    row.primaryContactName || "未填"
  }`;
}

function getOwnerName(ownerUserId) {
  return getUserName(ownerUserId);
}

function isDateWithinRange(dateValue, range) {
  const [start, end] = range ?? [];

  if (!start || !end) {
    return true;
  }

  const date = toDateTime(dateValue);

  if (!date) {
    return false;
  }

  const startTime = new Date(`${start}T00:00:00`).getTime();
  const endTime = new Date(`${end}T23:59:59`).getTime();
  const target = date.getTime();

  return target >= startTime && target <= endTime;
}

function isThisMonth(dateValue) {
  const date = toDateTime(dateValue);

  if (!date) {
    return false;
  }

  const now = new Date();

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function needsFollowUp(row) {
  if (!row.isEnabled) {
    return false;
  }

  const interactionDate = toDateTime(row.lastInteractionDate);

  if (!interactionDate) {
    return true;
  }

  const diffDays = Math.floor(
    (new Date().getTime() - interactionDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return diffDays >= 21 || (row.cooperationStatus === "contacting" && diffDays >= 14);
}

function handleSortChange({ prop, order }) {
  sortState.prop = prop ?? "createdAt";
  sortState.order = order ?? "descending";
}

function handleSelectionChange(selection) {
  selectedRows.value = selection;
}

function toggleFilterPanel() {
  filterPanelOpen.value = !filterPanelOpen.value;
}

function applyQuickFilter(value) {
  quickFilter.value = quickFilter.value === value ? "all" : value;
}

function resetFilters() {
  filters.keyword = "";
  filters.partnerId = "all";
  filters.entityType = "all";
  filters.partnerType = "all";
  filters.cooperationStatus = "all";
  filters.partnerLevel = "all";
  filters.region = "all";
  filters.owner = "all";
  filters.highValue = "all";
  filters.enabled = "all";
  filters.recentInteractionRange = [];
  filters.createdRange = [];
  quickFilter.value = "all";
  currentPage.value = 1;
}

function applyPartnerQueryFilter() {
  if (route.name !== "partners-list") {
    return;
  }

  filters.partnerId =
    typeof route.query.partnerId === "string" && route.query.partnerId
      ? route.query.partnerId
      : "all";
}

function notify(message, title = "功能提示", type = "info") {
  ElNotification({
    title,
    message,
    type,
    position: "top-right",
  });
}

function getNextPartnerCode() {
  const next = partnerRecords.value.reduce((maxValue, item) => {
    const numeric = Number(item.partnerCode.replace("PTN-", ""));
    return Number.isNaN(numeric) ? maxValue : Math.max(maxValue, numeric);
  }, 0);

  return `PTN-${String(next + 1).padStart(3, "0")}`;
}

function openCustomFieldDialog() {
  customFieldDialogOpen.value = true;
}

function openTableSettingsDialog() {
  tableSettingsDialogOpen.value = true;
}

function toSnakeCase(value = "") {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function addCustomField() {
  const label = customFieldForm.label.trim();

  if (!label) {
    notify("請先輸入欄位名稱。", "缺少資訊", "warning");
    return;
  }

  const key = (customFieldForm.key.trim() || toSnakeCase(label)).slice(0, 30);

  if (!key) {
    notify("欄位代碼不可為空。", "缺少資訊", "warning");
    return;
  }

  if (customFieldDefinitions.value.some((field) => field.key === key)) {
    notify("欄位代碼已存在，請更換。", "重複代碼", "warning");
    return;
  }

  customFieldDefinitions.value.push({
    key,
    label,
    showInTable: customFieldForm.showInTable,
  });

  partnerRecords.value.forEach((record) => {
    syncCustomFields(record);
  });

  customFieldForm.label = "";
  customFieldForm.key = "";
  customFieldForm.showInTable = false;

  notify(`已新增自訂欄位：${label}`, "已更新", "success");
}

function removeCustomField(field) {
  customFieldDefinitions.value = customFieldDefinitions.value.filter(
    (item) => item.key !== field.key
  );

  partnerRecords.value.forEach((record) => {
    delete record.customFields[field.key];
    syncCustomFields(record);
  });

  notify(`已移除自訂欄位：${field.label}`, "已更新", "success");
}

function openCreatePartner() {
  partnerFormMode.value = "create";
  activePartnerId.value = "";
  Object.assign(partnerForm, createEmptyPartnerForm());
  partnerFormDialogOpen.value = true;
}

function editPartner(row) {
  partnerFormMode.value = "edit";
  activePartnerId.value = row.id;

  Object.assign(partnerForm, {
    ...createEmptyPartnerForm(),
    name: row.name,
    entityType: row.entityType,
    partnerType: row.partnerType,
    cooperationStatus: row.cooperationStatus,
    partnerLevel: row.partnerLevel,
    email: row.email,
    phone: row.phone,
    region: row.region,
    market: row.market,
    ownerUserId: row.ownerUserId,
    lastInteractionDate: row.lastInteractionDate,
    lastInteractionSummary: row.lastInteractionSummary,
    cooperationValue: row.cooperationValue,
    isHighValue: row.isHighValue,
    isEnabled: row.isEnabled,
    primaryContactName: row.primaryContactName,
    primaryContactRole: row.primaryContactRole,
    jobTitle: row.jobTitle,
    affiliatedCompany: row.affiliatedCompany,
    customFields: { ...row.customFields },
  });

  partnerFormDialogOpen.value = true;
}

function submitPartnerForm() {
  const name = partnerForm.name.trim();

  if (!name) {
    notify("夥伴名稱為必填欄位。", "缺少資訊", "warning");
    return;
  }

  const payload = {
    name,
    entityType: partnerForm.entityType,
    partnerType: partnerForm.partnerType,
    cooperationStatus: partnerForm.cooperationStatus,
    partnerLevel: partnerForm.partnerLevel,
    email: partnerForm.email.trim(),
    phone: partnerForm.phone.trim(),
    region: partnerForm.region,
    market: partnerForm.market.trim() || partnerForm.region,
    ownerUserId: partnerForm.ownerUserId,
    lastInteractionDate: partnerForm.lastInteractionDate || getTodayDate(),
    lastInteractionSummary: partnerForm.lastInteractionSummary.trim(),
    cooperationValue: Number(partnerForm.cooperationValue || 0),
    isHighValue: partnerForm.isHighValue,
    isEnabled: partnerForm.isEnabled,
    primaryContactName: partnerForm.primaryContactName.trim(),
    primaryContactRole: partnerForm.primaryContactRole.trim(),
    jobTitle: partnerForm.jobTitle.trim(),
    affiliatedCompany: partnerForm.affiliatedCompany.trim(),
    customFields: { ...partnerForm.customFields },
  };

  if (partnerFormMode.value === "edit" && activePartnerId.value) {
    const target = partnerRecords.value.find((item) => item.id === activePartnerId.value);

    if (!target) {
      return;
    }

    Object.assign(target, payload);
    syncCustomFields(target);
    target.history.unshift(
      buildHistoryEntry("更新夥伴資料", `${target.name} 基本資料已更新`)
    );

    notify(`已更新 ${target.name}`, "已更新", "success");
  } else {
    const nextPartner = normalizePartner({
      id: `partner-${Date.now()}`,
      partnerCode: getNextPartnerCode(),
      opportunityCount: 0,
      createdAt: getTodayDate(),
      ...payload,
    });

    nextPartner.history.unshift(
      buildHistoryEntry("建立夥伴", `${nextPartner.name} 新增完成`)
    );

    partnerRecords.value.unshift(nextPartner);
    notify(`已新增 ${nextPartner.name}`, "已新增", "success");
  }

  partnerFormDialogOpen.value = false;
}

function viewPartner(row) {
  activePartnerId.value = row.id;
  detailDrawerOpen.value = true;
}

function openAssignDialog(targetIds) {
  assignTargetIds.value = [...targetIds];
  assignOwnerUserId.value =
    partnerRecords.value.find((item) => item.id === assignTargetIds.value[0])
      ?.ownerUserId ??
    ownerOptions.value.find((item) => item.value !== "all")?.value ??
    "";
  assignDialogOpen.value = true;
}

function assignOwner(row) {
  openAssignDialog([row.id]);
}

function submitAssignOwner() {
  if (!assignOwnerUserId.value) {
    notify("請先選擇負責人。", "缺少資訊", "warning");
    return;
  }

  const targets = partnerRecords.value.filter((item) =>
    assignTargetIds.value.includes(item.id)
  );

  targets.forEach((item) => {
    item.ownerUserId = assignOwnerUserId.value;
    item.history.unshift(
      buildHistoryEntry(
        "指派負責人",
        `${item.name} 已指派給 ${getUserName(assignOwnerUserId.value)}`
      )
    );
  });

  notify(`已更新 ${targets.length} 筆夥伴負責人`, "已更新", "success");
  assignDialogOpen.value = false;
}

function togglePartnerEnabled(row) {
  row.isEnabled = !row.isEnabled;
  row.history.unshift(
    buildHistoryEntry(row.isEnabled ? "啟用夥伴" : "停用夥伴", `${row.name} 狀態已更新`)
  );

  notify(
    row.isEnabled ? `已啟用 ${row.name}` : `已停用 ${row.name}`,
    "已更新",
    "success"
  );
}

function openOpportunityDialog(row) {
  opportunityTargetId.value = row.id;
  opportunityForm.name = "";
  opportunityForm.value = 0;
  opportunityForm.summary = "";
  opportunityForm.interactionDate = getTodayDate();
  opportunityDialogOpen.value = true;
}

function createOpportunity(row) {
  openOpportunityDialog(row);
}

function submitOpportunity() {
  const target = partnerRecords.value.find(
    (item) => item.id === opportunityTargetId.value
  );

  if (!target) {
    return;
  }

  const name = opportunityForm.name.trim();

  if (!name) {
    notify("請輸入商機名稱。", "缺少資訊", "warning");
    return;
  }

  const amount = Number(opportunityForm.value || 0);
  const summary = opportunityForm.summary.trim() || `已建立商機：${name}`;

  target.opportunityCount += 1;
  target.cooperationValue += amount;
  target.lastInteractionDate = opportunityForm.interactionDate || getTodayDate();
  target.lastInteractionSummary = summary;

  target.history.unshift(
    buildHistoryEntry("建立商機", `${name} 已建立，價值 ${formatCurrency(amount)}`)
  );

  notify(`已為 ${target.name} 建立商機`, "已更新", "success");
  opportunityDialogOpen.value = false;
}

function openTagsDialog(row) {
  tagsTargetId.value = row.id;
  tagsModel.value = [...(row.tags ?? [])];
  tagsDraft.value = "";
  tagsDialogOpen.value = true;
}

function addTagToModel() {
  const value = tagsDraft.value.trim();

  if (!value) {
    return;
  }

  if (!tagsModel.value.includes(value)) {
    tagsModel.value.push(value);
  }

  tagsDraft.value = "";
}

function removeTag(tag) {
  tagsModel.value = tagsModel.value.filter((item) => item !== tag);
}

function submitTags() {
  const target = partnerRecords.value.find((item) => item.id === tagsTargetId.value);

  if (!target) {
    return;
  }

  target.tags = [...tagsModel.value];
  target.history.unshift(buildHistoryEntry("更新標籤", `${target.name} 標籤已更新`));

  notify(`已更新 ${target.name} 標籤`, "已更新", "success");
  tagsDialogOpen.value = false;
}

function openHistoryDialog(row) {
  historyTargetId.value = row.id;
  historyDialogOpen.value = true;
}

function archivePartner(row) {
  row.isArchived = true;
  row.isEnabled = false;
  row.cooperationStatus = "dormant";
  row.history.unshift(buildHistoryEntry("封存夥伴", `${row.name} 已封存`));

  notify(`${row.name} 已封存`, "已更新", "success");
}

async function deletePartner(row) {
  try {
    await ElMessageBox.confirm(
      `確定刪除夥伴「${row.name}」？此操作無法復原。`,
      "刪除確認",
      {
        confirmButtonText: "刪除",
        cancelButtonText: "取消",
        type: "warning",
      }
    );
  } catch {
    return;
  }

  partnerRecords.value = partnerRecords.value.filter((item) => item.id !== row.id);
  selectedRows.value = selectedRows.value.filter((item) => item.id !== row.id);

  notify(`${row.name} 已刪除`, "已刪除", "success");
}

function handleRowMenuCommand(command, row) {
  if (command === "history") {
    openHistoryDialog(row);
    return;
  }

  if (command === "toggle_high_value") {
    row.isHighValue = !row.isHighValue;
    row.history.unshift(
      buildHistoryEntry(
        row.isHighValue ? "標記高價值" : "取消高價值",
        `${row.name} 高價值狀態已更新`
      )
    );

    notify(
      row.isHighValue ? `${row.name} 已標記為高價值` : `${row.name} 已取消高價值`,
      "已更新",
      "success"
    );
    return;
  }

  if (command === "tags") {
    openTagsDialog(row);
    return;
  }

  if (command === "archive") {
    archivePartner(row);
    return;
  }

  if (command === "delete") {
    deletePartner(row);
  }
}

function handleBatchCommand(command) {
  if (selectedRows.value.length === 0) {
    notify("請先勾選至少一筆夥伴資料。", "無可操作項目", "warning");
    return;
  }

  if (command === "assign_owner") {
    openAssignDialog(selectedRows.value.map((item) => item.id));
    return;
  }

  if (command === "disable") {
    selectedRows.value.forEach((item) => {
      item.isEnabled = false;
      item.history.unshift(buildHistoryEntry("批次停用", `${item.name} 已停用`));
    });

    notify(`已停用 ${selectedRows.value.length} 筆夥伴`, "已更新", "success");
    return;
  }

  if (command === "enable") {
    selectedRows.value.forEach((item) => {
      item.isEnabled = true;
      item.history.unshift(buildHistoryEntry("批次啟用", `${item.name} 已啟用`));
    });

    notify(`已啟用 ${selectedRows.value.length} 筆夥伴`, "已更新", "success");
    return;
  }

  if (command === "mark_high_value") {
    selectedRows.value.forEach((item) => {
      item.isHighValue = true;
      item.history.unshift(buildHistoryEntry("批次標記高價值", `${item.name} 已標記`));
    });

    notify(`已標記 ${selectedRows.value.length} 筆為高價值夥伴`, "已更新", "success");
  }
}

function csvEscape(value) {
  const text = String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function exportPartners() {
  const rows = filteredPartners.value;
  const headers = [
    "夥伴編號",
    "夥伴名稱",
    "主體類型",
    "夥伴類型",
    "合作狀態",
    "夥伴等級",
    "Email",
    "電話",
    "地區",
    "市場",
    "負責人",
    "最近互動",
    "商機數",
    "合作價值",
    "建立時間",
  ];

  const csvLines = [headers.join(",")];

  rows.forEach((item) => {
    csvLines.push(
      [
        item.partnerCode,
        item.name,
        entityTypeMap[item.entityType]?.label,
        partnerTypeMap[item.partnerType]?.label,
        cooperationStatusMap[item.cooperationStatus]?.label,
        partnerLevelMap[item.partnerLevel]?.label,
        item.email,
        item.phone,
        item.region,
        item.market,
        getOwnerName(item.ownerUserId),
        item.lastInteractionDate,
        item.opportunityCount,
        item.cooperationValue,
        item.createdAt,
      ]
        .map((value) => csvEscape(value))
        .join(",")
    );
  });

  const blob = new Blob([`\ufeff${csvLines.join("\n")}`], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `partners-${getTodayDate()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  notify(`已匯出 ${rows.length} 筆夥伴資料`, "匯出完成", "success");
}

watch(
  () => [
    filters.keyword,
    filters.entityType,
    filters.partnerType,
    filters.cooperationStatus,
    filters.partnerLevel,
    filters.region,
    filters.owner,
    filters.highValue,
    filters.enabled,
    filters.recentInteractionRange,
    filters.createdRange,
    pageSize.value,
    quickFilter.value,
  ],
  () => {
    currentPage.value = 1;
  },
  { deep: true }
);

watch(
  () => [route.name, route.query.partnerId],
  ([name, partnerId]) => {
    if (name !== "partners-list") {
      return;
    }

    filters.partnerId = typeof partnerId === "string" && partnerId ? partnerId : "all";
    currentPage.value = 1;
  }
);

onActivated(() => {
  applyPartnerQueryFilter();
});
</script>

<template>
  <div class="min-h-full p-8">
    <section class="grid gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-2">
          <h1 class="text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-900">
            夥伴管理
          </h1>
          <p class="text-sm text-slate-500">
            集中管理合作夥伴、合作狀態、聯絡資訊與合作成果。
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton type="primary" :icon="CirclePlus" @click="openCreatePartner">
            新增夥伴
          </ElButton>
          <ElButton @click="exportPartners">匯出</ElButton>

          <ElDropdown trigger="click" @command="handleBatchCommand">
            <ElButton>批次操作</ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem command="assign_owner">批次指派負責人</ElDropdownItem>
                <ElDropdownItem command="mark_high_value">批次標記高價值</ElDropdownItem>
                <ElDropdownItem command="enable">批次啟用</ElDropdownItem>
                <ElDropdownItem command="disable">批次停用</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>

          <ElButton @click="openCustomFieldDialog">自訂欄位</ElButton>
          <ElButton @click="openTableSettingsDialog">表格設定</ElButton>
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-6 sm:grid-cols-2">
        <section
          v-for="card in summaryCards"
          :key="card.label"
          class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p class="text-sm font-medium text-slate-500">{{ card.label }}</p>
          <p class="mt-2 text-[1.85rem] font-semibold tracking-[-0.03em] text-slate-900">
            {{ card.value }}
          </p>
        </section>
      </div>

      <section
        class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div
          class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5"
        >
          <div class="flex flex-1 flex-wrap items-center gap-3">
            <ElInput
              v-model="filters.keyword"
              placeholder="搜尋名稱 / 編號 / 公司名稱 / 聯絡人"
              :prefix-icon="Search"
              clearable
              class="!w-[360px] max-[760px]:!w-full"
            />

            <ElButton
              :icon="Filter"
              :type="filterPanelOpen ? 'primary' : 'default'"
              @click="toggleFilterPanel"
            >
              Filter
            </ElButton>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="item in quickFilterOptions"
              :key="item.value"
              type="button"
              class="rounded-full border px-3 py-1.5 text-xs font-medium transition"
              :class="
                quickFilter === item.value
                  ? 'border-[#409eff] bg-[#ecf5ff] text-[#337ecc]'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
              "
              @click="applyQuickFilter(item.value)"
            >
              {{ item.label }}
            </button>
          </div>
        </div>

        <transition
          enter-active-class="transition-all duration-300 ease-out"
          leave-active-class="transition-all duration-200 ease-in"
          enter-from-class="max-h-0 opacity-0"
          enter-to-class="max-h-[430px] opacity-100"
          leave-from-class="max-h-[430px] opacity-100"
          leave-to-class="max-h-0 opacity-0"
        >
          <div
            v-if="filterPanelOpen"
            class="overflow-hidden border-b border-slate-200 bg-white px-6 py-4"
          >
            <div class="grid gap-4 xl:grid-cols-[repeat(6,minmax(120px,1fr))]">
              <ElSelect v-model="filters.entityType" placeholder="主體類型">
                <ElOption
                  v-for="item in entityTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.partnerType" placeholder="夥伴類型">
                <ElOption
                  v-for="item in partnerTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.cooperationStatus" placeholder="合作狀態">
                <ElOption
                  v-for="item in cooperationStatusOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.partnerLevel" placeholder="夥伴等級">
                <ElOption
                  v-for="item in partnerLevelOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.region" placeholder="地區 / 市場">
                <ElOption
                  v-for="item in regionOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.owner" placeholder="負責人">
                <ElOption
                  v-for="item in ownerOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>

              <ElSelect v-model="filters.highValue" placeholder="是否高價值">
                <ElOption label="全部高價值條件" value="all" />
                <ElOption label="高價值" value="yes" />
                <ElOption label="非高價值" value="no" />
              </ElSelect>

              <ElSelect v-model="filters.enabled" placeholder="是否啟用">
                <ElOption label="全部狀態" value="all" />
                <ElOption label="啟用中" value="enabled" />
                <ElOption label="已停用" value="disabled" />
              </ElSelect>

              <ElDatePicker
                v-model="filters.recentInteractionRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                range-separator="至"
                start-placeholder="最近互動起"
                end-placeholder="最近互動迄"
                class="!w-full"
              />

              <ElDatePicker
                v-model="filters.createdRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                range-separator="至"
                start-placeholder="建立日期起"
                end-placeholder="建立日期迄"
                class="!w-full"
              />

              <ElButton :icon="Refresh" @click="resetFilters">重設</ElButton>
            </div>
          </div>
        </transition>

        <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div class="flex flex-wrap items-center gap-2">
            <ElTag round effect="plain">共 {{ filteredPartners.length }} 筆</ElTag>
            <ElTag v-if="selectedRows.length > 0" round type="primary" effect="light">
              已勾選 {{ selectedRows.length }} 筆
            </ElTag>
          </div>

          <div v-if="selectedRows.length > 0" class="flex flex-wrap items-center gap-2">
            <ElButton @click="handleBatchCommand('assign_owner')"
              >批次指派負責人</ElButton
            >
            <ElButton @click="handleBatchCommand('mark_high_value')"
              >批次標記高價值</ElButton
            >
          </div>
        </div>

        <ElTable
          :data="pagedPartners"
          :size="tableSettings.size"
          table-layout="auto"
          :loading="loading"
          @selection-change="handleSelectionChange"
          @sort-change="handleSortChange"
        >
          <ElTableColumn type="selection" width="52" />

          <ElTableColumn label="夥伴" min-width="320" sortable="custom" prop="name">
            <template #default="{ row }">
              <div class="flex items-start gap-3">
                <div class="grid gap-1">
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="text-left text-sm font-semibold text-slate-900 hover:text-[#409eff]"
                      @click="viewPartner(row)"
                    >
                      {{ row.name }}
                    </button>
                    <ElTag v-if="row.isArchived" size="small" effect="light" type="info"
                      >已封存</ElTag
                    >
                  </div>
                  <p class="text-xs text-slate-400">{{ resolvePartnerSecondary(row) }}</p>
                </div>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn
            v-if="tableSettings.columns.partnerType"
            label="夥伴類型"
            min-width="126"
          >
            <template #default="{ row }">
              <ElTag round effect="light" :type="partnerTypeMap[row.partnerType]?.type">
                {{ partnerTypeMap[row.partnerType]?.label || row.partnerType }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn
            v-if="tableSettings.columns.cooperationStatus"
            label="合作狀態"
            min-width="118"
          >
            <template #default="{ row }">
              {{
                cooperationStatusMap[row.cooperationStatus]?.label ||
                row.cooperationStatus
              }}
            </template>
          </ElTableColumn>

          <ElTableColumn
            v-if="tableSettings.columns.partnerLevel"
            label="夥伴等級"
            min-width="112"
          >
            <template #default="{ row }">
              <ElTag round effect="light" :type="partnerLevelMap[row.partnerLevel]?.type">
                {{ partnerLevelMap[row.partnerLevel]?.label || row.partnerLevel }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn
            v-if="tableSettings.columns.contact"
            label="主要聯絡方式"
            min-width="186"
          >
            <template #default="{ row }">
              <div class="grid gap-1 text-xs">
                <span class="text-slate-600">{{ row.email || "未填 Email" }}</span>
                <span class="text-slate-400">{{ row.phone || "未填電話" }}</span>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn
            v-if="tableSettings.columns.region"
            label="地區 / 市場"
            min-width="126"
          >
            <template #default="{ row }">
              <div class="grid gap-1 text-xs">
                <span class="text-slate-700">{{ row.region }}</span>
                <span class="text-slate-400">{{ row.market }}</span>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn
            v-if="tableSettings.columns.owner"
            label="負責人"
            min-width="108"
          >
            <template #default="{ row }">
              {{ getOwnerName(row.ownerUserId) }}
            </template>
          </ElTableColumn>

          <ElTableColumn
            v-if="tableSettings.columns.lastInteraction"
            label="最近互動"
            min-width="196"
            prop="lastInteractionDate"
            sortable="custom"
          >
            <template #default="{ row }">
              <div class="grid gap-1">
                <span class="text-xs text-slate-700">{{
                  formatDate(row.lastInteractionDate)
                }}</span>
                <span class="text-xs text-slate-400">{{
                  row.lastInteractionSummary
                }}</span>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn
            v-if="tableSettings.columns.opportunity"
            label="關聯商機數"
            min-width="112"
            prop="opportunityCount"
            sortable="custom"
          >
            <template #default="{ row }">
              <button
                type="button"
                class="text-xs font-semibold text-[#409eff] hover:text-[#337ecc]"
                @click="openOpportunityDialog(row)"
              >
                {{ row.opportunityCount }}
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn
            v-if="tableSettings.columns.value"
            label="合作價值"
            min-width="128"
            prop="cooperationValue"
            sortable="custom"
          >
            <template #default="{ row }">
              <span class="text-xs text-slate-700">{{
                formatCurrency(row.cooperationValue)
              }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn
            v-for="field in tableCustomColumns"
            :key="field.key"
            :label="field.label"
            min-width="140"
          >
            <template #default="{ row }">
              <span class="text-xs text-slate-700">{{
                row.customFields[field.key] || "-"
              }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn
            v-if="tableSettings.columns.createdAt"
            label="建立時間"
            min-width="116"
            prop="createdAt"
            sortable="custom"
          >
            <template #default="{ row }">
              <span class="text-xs text-slate-700">{{ formatDate(row.createdAt) }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="操作" width="268" fixed="right">
            <template #default="{ row }">
              <div class="flex items-center justify-end gap-1">
                <ElButton text type="primary" @click="viewPartner(row)">查看</ElButton>
                <ElButton text @click="editPartner(row)">編輯</ElButton>
                <ElButton text @click="assignOwner(row)">指派</ElButton>
                <ElButton text @click="togglePartnerEnabled(row)">
                  {{ row.isEnabled ? "停用" : "啟用" }}
                </ElButton>
                <ElDropdown
                  trigger="click"
                  @command="(command) => handleRowMenuCommand(command, row)"
                >
                  <button
                    type="button"
                    class="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <MoreFilled class="h-4 w-4" />
                  </button>

                  <template #dropdown>
                    <ElDropdownMenu>
                      <ElDropdownItem command="history">查看歷程</ElDropdownItem>
                      <ElDropdownItem command="toggle_high_value">
                        {{ row.isHighValue ? "取消高價值" : "標記高價值" }}
                      </ElDropdownItem>
                      <ElDropdownItem command="tags">加入標籤</ElDropdownItem>
                      <ElDropdownItem command="archive">封存</ElDropdownItem>
                      <ElDropdownItem command="delete" divided>刪除</ElDropdownItem>
                    </ElDropdownMenu>
                  </template>
                </ElDropdown>
              </div>
            </template>
          </ElTableColumn>

          <template #empty>
            <div class="px-6 py-16">
              <ElEmpty :description="emptyState.title">
                <p class="mb-4 text-sm text-slate-500">{{ emptyState.description }}</p>
                <ElButton type="primary" @click="emptyState.action()">
                  {{ emptyState.actionLabel }}
                </ElButton>
              </ElEmpty>
            </div>
          </template>
        </ElTable>

        <div
          class="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-5"
        >
          <ElPagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            layout="total, prev, pager, next"
            :total="sortedPartners.length"
            background
          />

          <ElSelect v-model="pageSize" class="!w-[100px]" @change="currentPage = 1">
            <ElOption :value="10" label="10 Item" />
            <ElOption :value="20" label="20 Item" />
            <ElOption :value="50" label="50 Item" />
          </ElSelect>
        </div>
      </section>
    </section>

    <ElDrawer
      v-model="partnerFormDialogOpen"
      :title="partnerFormMode === 'create' ? '新增夥伴' : '編輯夥伴'"
      size="760px"
    >
      <ElForm label-width="112px" class="grid gap-2">
        <div class="grid gap-3 md:grid-cols-2">
          <ElFormItem label="夥伴名稱" required>
            <ElInput v-model="partnerForm.name" />
          </ElFormItem>
          <ElFormItem label="主體類型">
            <ElSelect v-model="partnerForm.entityType">
              <ElOption label="組織" value="organization" />
              <ElOption label="個人" value="person" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="夥伴類型">
            <ElSelect v-model="partnerForm.partnerType">
              <ElOption
                v-for="item in partnerTypeOptions.filter(
                  (option) => option.value !== 'all'
                )"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="合作狀態">
            <ElSelect v-model="partnerForm.cooperationStatus">
              <ElOption
                v-for="item in cooperationStatusOptions.filter(
                  (option) => option.value !== 'all'
                )"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="夥伴等級">
            <ElSelect v-model="partnerForm.partnerLevel">
              <ElOption
                v-for="item in partnerLevelOptions.filter(
                  (option) => option.value !== 'all'
                )"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="負責人">
            <ElSelect v-model="partnerForm.ownerUserId">
              <ElOption
                v-for="item in ownerOptions.filter((option) => option.value !== 'all')"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="Email">
            <ElInput v-model="partnerForm.email" />
          </ElFormItem>
          <ElFormItem label="電話">
            <ElInput v-model="partnerForm.phone" />
          </ElFormItem>
          <ElFormItem label="地區">
            <ElSelect v-model="partnerForm.region">
              <ElOption
                v-for="item in regionOptions.filter((option) => option.value !== 'all')"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="市場">
            <ElInput v-model="partnerForm.market" />
          </ElFormItem>
          <ElFormItem label="最近互動日">
            <ElDatePicker
              v-model="partnerForm.lastInteractionDate"
              value-format="YYYY-MM-DD"
            />
          </ElFormItem>
          <ElFormItem label="合作價值">
            <ElInput v-model.number="partnerForm.cooperationValue" type="number" />
          </ElFormItem>
        </div>

        <template v-if="partnerForm.entityType === 'organization'">
          <div class="grid gap-3 md:grid-cols-2">
            <ElFormItem label="主要聯絡人">
              <ElInput v-model="partnerForm.primaryContactName" />
            </ElFormItem>
            <ElFormItem label="聯絡人職稱">
              <ElInput v-model="partnerForm.primaryContactRole" />
            </ElFormItem>
          </div>
        </template>

        <template v-else>
          <div class="grid gap-3 md:grid-cols-2">
            <ElFormItem label="職稱">
              <ElInput v-model="partnerForm.jobTitle" />
            </ElFormItem>
            <ElFormItem label="所屬公司">
              <ElInput v-model="partnerForm.affiliatedCompany" />
            </ElFormItem>
          </div>
        </template>

        <div v-if="customFieldDefinitions.length > 0" class="grid gap-3 md:grid-cols-2">
          <ElFormItem
            v-for="field in customFieldDefinitions"
            :key="field.key"
            :label="field.label"
          >
            <ElInput v-model="partnerForm.customFields[field.key]" />
          </ElFormItem>

          <div class="pl-10">
            <ElSwitch v-model="partnerForm.isHighValue" active-text="高價值夥伴" />
          </div>
        </div>

        <ElFormItem label="最近互動摘要">
          <ElInput
            v-model="partnerForm.lastInteractionSummary"
            type="textarea"
            :rows="3"
          />
        </ElFormItem>

        <div class="flex items-center gap-6 px-3">
          <ElSwitch v-model="partnerForm.isEnabled" active-text="啟用" />
        </div>
      </ElForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="partnerFormDialogOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitPartnerForm">儲存</ElButton>
        </div>
      </template>
    </ElDrawer>

    <ElDrawer v-model="detailDrawerOpen" title="夥伴詳情" size="640">
      <template v-if="activePartner">
        <div class="grid gap-5">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xl font-semibold text-slate-900">
                {{ activePartner.name }}
              </h3>
              <p class="mt-1 text-xs text-slate-500">
                {{ activePartner.partnerCode }} ・
                {{ entityTypeMap[activePartner.entityType]?.label }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <ElTag
                round
                :type="cooperationStatusMap[activePartner.cooperationStatus]?.type"
              >
                {{ cooperationStatusMap[activePartner.cooperationStatus]?.label }}
              </ElTag>
              <ElTag v-if="activePartner.isHighValue" round type="danger">高價值</ElTag>
            </div>
          </div>

          <div class="grid gap-3 rounded-xl border border-slate-200 p-4 text-sm">
            <p>
              <strong>夥伴類型：</strong
              >{{ partnerTypeMap[activePartner.partnerType]?.label }}
            </p>
            <p><strong>負責人：</strong>{{ getOwnerName(activePartner.ownerUserId) }}</p>
            <p><strong>Email：</strong>{{ activePartner.email || "-" }}</p>
            <p><strong>電話：</strong>{{ activePartner.phone || "-" }}</p>
            <p>
              <strong>地區 / 市場：</strong>{{ activePartner.region }} /
              {{ activePartner.market }}
            </p>
            <p>
              <strong>最近互動：</strong
              >{{ formatDate(activePartner.lastInteractionDate) }}
            </p>
            <p>
              <strong>互動摘要：</strong>{{ activePartner.lastInteractionSummary || "-" }}
            </p>
            <p><strong>關聯商機數：</strong>{{ activePartner.opportunityCount }}</p>
            <p>
              <strong>合作價值：</strong
              >{{ formatCurrency(activePartner.cooperationValue) }}
            </p>
          </div>

          <div v-if="activePartner.tags.length > 0" class="flex flex-wrap gap-2">
            <ElTag v-for="tag in activePartner.tags" :key="tag" effect="plain">{{
              tag
            }}</ElTag>
          </div>

          <div
            v-if="customFieldDefinitions.length > 0"
            class="grid gap-3 rounded-xl border border-slate-200 p-4 text-sm"
          >
            <p class="font-semibold text-slate-800">自訂欄位</p>
            <p v-for="field in customFieldDefinitions" :key="field.key">
              <strong>{{ field.label }}：</strong
              >{{ activePartner.customFields[field.key] || "-" }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <ElButton @click="editPartner(activePartner)">編輯</ElButton>
            <ElButton @click="assignOwner(activePartner)">指派負責人</ElButton>
            <ElButton @click="openOpportunityDialog(activePartner)">建立商機</ElButton>
            <ElButton @click="openTagsDialog(activePartner)">管理標籤</ElButton>
            <ElButton @click="openHistoryDialog(activePartner)">查看歷程</ElButton>
          </div>
        </div>
      </template>
    </ElDrawer>

    <ElDialog v-model="assignDialogOpen" title="指派負責人" width="480">
      <ElForm label-width="88px">
        <ElFormItem label="指派對象">
          <span>共 {{ assignTargetIds.length }} 筆夥伴</span>
        </ElFormItem>
        <ElFormItem label="負責人" required>
          <ElSelect v-model="assignOwnerUserId" class="w-full">
            <ElOption
              v-for="item in ownerOptions.filter((option) => option.value !== 'all')"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="assignDialogOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitAssignOwner">儲存</ElButton>
        </div>
      </template>
    </ElDialog>

    <ElDialog v-model="opportunityDialogOpen" title="建立商機" width="560">
      <ElForm label-width="98px">
        <ElFormItem label="商機名稱" required>
          <ElInput v-model="opportunityForm.name" />
        </ElFormItem>
        <ElFormItem label="預估價值">
          <ElInput v-model.number="opportunityForm.value" type="number" />
        </ElFormItem>
        <ElFormItem label="互動日期">
          <ElDatePicker
            v-model="opportunityForm.interactionDate"
            value-format="YYYY-MM-DD"
          />
        </ElFormItem>
        <ElFormItem label="互動摘要">
          <ElInput v-model="opportunityForm.summary" />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="opportunityDialogOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitOpportunity">建立</ElButton>
        </div>
      </template>
    </ElDialog>

    <ElDialog v-model="tagsDialogOpen" title="管理標籤" width="520">
      <div class="grid gap-3">
        <div class="flex items-center gap-2">
          <ElInput
            v-model="tagsDraft"
            placeholder="輸入標籤後按新增"
            @keyup.enter="addTagToModel"
          />
          <ElButton @click="addTagToModel">新增</ElButton>
        </div>

        <div class="flex min-h-16 flex-wrap gap-2 rounded-lg border border-slate-200 p-3">
          <ElTag
            v-for="tag in tagsModel"
            :key="tag"
            closable
            effect="plain"
            @close="removeTag(tag)"
          >
            {{ tag }}
          </ElTag>
          <span v-if="tagsModel.length === 0" class="text-xs text-slate-400"
            >尚未設定標籤</span
          >
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="tagsDialogOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitTags">儲存</ElButton>
        </div>
      </template>
    </ElDialog>

    <ElDialog v-model="historyDialogOpen" title="夥伴歷程" width="680">
      <div v-if="historyTarget" class="grid max-h-[420px] gap-3 overflow-y-auto">
        <section
          v-for="item in historyTarget.history"
          :key="item.id"
          class="rounded-lg border border-slate-200 px-4 py-3"
        >
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-slate-800">{{ item.title }}</p>
            <span class="text-xs text-slate-400">{{ formatDate(item.occurredAt) }}</span>
          </div>
          <p class="mt-1 text-sm text-slate-500">{{ item.description || "-" }}</p>
        </section>
      </div>
    </ElDialog>

    <ElDialog v-model="customFieldDialogOpen" title="自訂欄位" width="700">
      <div class="grid gap-4">
        <div class="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-3">
          <ElInput
            v-model="customFieldForm.label"
            placeholder="欄位名稱，例如：合作模式"
          />
          <ElInput
            v-model="customFieldForm.key"
            placeholder="欄位代碼（可留空自動產生）"
          />
          <div
            class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3"
          >
            <span class="text-sm text-slate-600">在表格顯示</span>
            <ElSwitch v-model="customFieldForm.showInTable" />
          </div>
          <div class="md:col-span-3">
            <ElButton type="primary" @click="addCustomField">新增欄位</ElButton>
          </div>
        </div>

        <section class="grid gap-2">
          <div
            v-for="field in customFieldDefinitions"
            :key="field.key"
            class="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
          >
            <div class="text-sm">
              <p class="font-medium text-slate-800">{{ field.label }}</p>
              <p class="text-xs text-slate-400">key: {{ field.key }}</p>
            </div>
            <div class="flex items-center gap-2">
              <ElSwitch v-model="field.showInTable" active-text="表格顯示" />
              <ElButton text type="danger" @click="removeCustomField(field)"
                >移除</ElButton
              >
            </div>
          </div>
        </section>
      </div>
    </ElDialog>

    <ElDialog v-model="tableSettingsDialogOpen" title="表格設定" width="620">
      <div class="grid gap-4">
        <section class="grid gap-2 rounded-xl border border-slate-200 p-4">
          <p class="text-sm font-semibold text-slate-800">列高設定</p>
          <ElSelect v-model="tableSettings.size" class="!w-[180px]">
            <ElOption label="Large" value="large" />
            <ElOption label="Default" value="default" />
            <ElOption label="Small" value="small" />
          </ElSelect>
        </section>

        <section class="grid gap-2 rounded-xl border border-slate-200 p-4">
          <p class="text-sm font-semibold text-slate-800">欄位顯示</p>
          <div class="grid gap-2 md:grid-cols-2">
            <ElCheckbox v-model="tableSettings.columns.partnerType">夥伴類型</ElCheckbox>
            <ElCheckbox v-model="tableSettings.columns.cooperationStatus"
              >合作狀態</ElCheckbox
            >
            <ElCheckbox v-model="tableSettings.columns.partnerLevel">夥伴等級</ElCheckbox>
            <ElCheckbox v-model="tableSettings.columns.contact">主要聯絡方式</ElCheckbox>
            <ElCheckbox v-model="tableSettings.columns.region">地區 / 市場</ElCheckbox>
            <ElCheckbox v-model="tableSettings.columns.owner">負責人</ElCheckbox>
            <ElCheckbox v-model="tableSettings.columns.lastInteraction"
              >最近互動</ElCheckbox
            >
            <ElCheckbox v-model="tableSettings.columns.opportunity"
              >關聯商機數</ElCheckbox
            >
            <ElCheckbox v-model="tableSettings.columns.value">合作價值</ElCheckbox>
            <ElCheckbox v-model="tableSettings.columns.createdAt">建立時間</ElCheckbox>
          </div>
        </section>
      </div>
    </ElDialog>
  </div>
</template>
