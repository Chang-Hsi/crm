<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElDescriptions,
  ElDescriptionsItem,
  ElDrawer,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
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
import { Download, Filter, Refresh, Search } from "@element-plus/icons-vue";
import { accountList } from "../../data/accounts";
import { opportunityList } from "../../data/opportunities";
import { projectList } from "../../data/projects";
import { userList } from "../../data/users";

const router = useRouter();

const reconciliationStatusMap = {
  pending: { label: "待對帳", type: "warning" },
  in_progress: { label: "對帳中", type: "primary" },
  pending_confirmation: { label: "待確認", type: "info" },
  reconciled: { label: "已對帳", type: "success" },
  exception: { label: "對帳異常", type: "danger" },
  closed: { label: "已關閉", type: "info" },
};

const differenceTypeMap = {
  no_difference: { label: "無差異", type: "success" },
  amount_mismatch: { label: "金額差異", type: "danger" },
  date_mismatch: { label: "日期差異", type: "warning" },
  missing_data: { label: "資料缺漏", type: "danger" },
  status_mismatch: { label: "狀態不一致", type: "warning" },
  other_issue: { label: "其他異常", type: "info" },
};

const invoiceStatusMap = {
  not_invoiced: { label: "待開票", type: "warning" },
  partially_invoiced: { label: "部分開票", type: "primary" },
  invoiced: { label: "已開票", type: "success" },
  voided: { label: "已作廢", type: "info" },
};

const paymentStatusMap = {
  unpaid: { label: "未收款", type: "warning" },
  partial: { label: "部分收款", type: "primary" },
  paid: { label: "已收款", type: "success" },
  overdue: { label: "逾期未收", type: "danger" },
};

const settlementStatusMap = {
  pending_settlement: { label: "待結算", type: "warning" },
  partially_settled: { label: "部分結算", type: "primary" },
  settled: { label: "已結算", type: "success" },
  exception: { label: "結算異常", type: "danger" },
};

const quickTabs = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待處理" },
  { value: "in_progress", label: "處理中" },
  { value: "pending_confirmation", label: "待確認" },
  { value: "completed", label: "已完成" },
];

const yesNoOptions = [
  { value: "all", label: "全部" },
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
];

const accountNameMap = new Map(accountList.map((item) => [item.id, item.companyName]));
const opportunityNameMap = new Map(opportunityList.map((item) => [item.id, item.name]));
const projectNameMap = new Map(projectList.map((item) => [item.id, item.projectName]));
const userNameMap = new Map(userList.map((item) => [item.id, item.name]));

const accountOptions = [
  { value: "all", label: "全部客戶" },
  ...accountList.map((item) => ({ value: item.id, label: item.companyName })),
];

const opportunityOptions = [
  { value: "all", label: "全部商機" },
  ...opportunityList.map((item) => ({ value: item.id, label: item.name })),
];

const projectOptions = [
  { value: "all", label: "全部專案" },
  ...projectList.map((item) => ({ value: item.id, label: item.projectName })),
];

const assigneeOptions = [
  { value: "all", label: "全部處理人" },
  ...userList
    .filter((item) => item.status === "active")
    .map((item) => ({ value: item.id, label: item.name })),
];

const reconciliationStatusOptions = [
  { value: "all", label: "全部對帳狀態" },
  ...Object.entries(reconciliationStatusMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const differenceTypeOptions = [
  { value: "all", label: "全部差異類型" },
  ...Object.entries(differenceTypeMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const invoiceStatusOptions = [
  { value: "all", label: "全部開票狀態" },
  ...Object.entries(invoiceStatusMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const paymentStatusOptions = [
  { value: "all", label: "全部收款狀態" },
  ...Object.entries(paymentStatusMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const seedRecords = [
  {
    id: "rec-001",
    reconciliationNo: "REC-2026-001",
    accountId: "acc-001",
    opportunityId: "opp-001",
    projectId: "proj-001",
    revenueNo: "REV-2026-001",
    orderNo: "SO-2026-015",
    invoiceNo: "INV-2026-041",
    paymentNo: "PAY-2026-018",
    reconciliationDate: "2026-04-06",
    expectedAmount: 3150000,
    actualAmount: 2950000,
    currencyCode: "TWD",
    differenceType: "amount_mismatch",
    reconciliationStatus: "pending",
    invoiceStatus: "partially_invoiced",
    paymentStatus: "partial",
    settlementStatus: "pending_settlement",
    assigneeId: "u-005",
    isPartialPayment: true,
    isCrossPeriod: false,
    differenceNote: "第二階段 KPI 結算金額尚未確認，暫少列 200,000。",
    varianceReason: "客戶僅先支付第一階段款項。",
    internalNote: "已請業務於 4/8 前補回確認函。",
    crossDepartmentRequired: true,
    progress: 40,
    createdAt: "2026-04-06 10:10",
    createdBy: "王冠勳",
    updatedAt: "2026-04-06 18:15",
    updatedBy: "王冠勳",
    lastHandledAt: "2026-04-06 18:15",
    lastHandledBy: "王冠勳",
  },
  {
    id: "rec-002",
    reconciliationNo: "REC-2026-002",
    accountId: "acc-002",
    opportunityId: "opp-004",
    projectId: "proj-002",
    revenueNo: "REV-2026-002",
    orderNo: "SO-2026-021",
    invoiceNo: "",
    paymentNo: "",
    reconciliationDate: "2026-04-06",
    expectedAmount: 4300000,
    actualAmount: 4300000,
    currencyCode: "USD",
    differenceType: "date_mismatch",
    reconciliationStatus: "in_progress",
    invoiceStatus: "not_invoiced",
    paymentStatus: "unpaid",
    settlementStatus: "pending_settlement",
    assigneeId: "u-005",
    isPartialPayment: false,
    isCrossPeriod: true,
    differenceNote: "帳款金額一致，但開票與收款時間落在次期。",
    varianceReason: "海外案需待驗收後開票，存在跨期認列。",
    internalNote: "先維持對帳中，待法務確認附件。",
    crossDepartmentRequired: true,
    progress: 55,
    createdAt: "2026-04-06 09:25",
    createdBy: "王冠勳",
    updatedAt: "2026-04-06 17:08",
    updatedBy: "王冠勳",
    lastHandledAt: "2026-04-06 17:08",
    lastHandledBy: "王冠勳",
  },
  {
    id: "rec-003",
    reconciliationNo: "REC-2026-003",
    accountId: "acc-003",
    opportunityId: "opp-006",
    projectId: "proj-003",
    revenueNo: "REV-2026-003",
    orderNo: "SO-2026-026",
    invoiceNo: "INV-2026-049",
    paymentNo: "PAY-2026-021",
    reconciliationDate: "2026-04-05",
    expectedAmount: 1650000,
    actualAmount: 1650000,
    currencyCode: "TWD",
    differenceType: "status_mismatch",
    reconciliationStatus: "pending_confirmation",
    invoiceStatus: "invoiced",
    paymentStatus: "paid",
    settlementStatus: "settled",
    assigneeId: "u-005",
    isPartialPayment: false,
    isCrossPeriod: false,
    differenceNote: "系統顯示已對帳，但歷史紀錄尚未補入對帳附件。",
    varianceReason: "狀態同步延遲。",
    internalNote: "待資訊部門補寫回填腳本。",
    crossDepartmentRequired: false,
    progress: 85,
    createdAt: "2026-04-05 11:20",
    createdBy: "王冠勳",
    updatedAt: "2026-04-06 15:32",
    updatedBy: "王冠勳",
    lastHandledAt: "2026-04-06 15:32",
    lastHandledBy: "王冠勳",
  },
  {
    id: "rec-004",
    reconciliationNo: "REC-2026-004",
    accountId: "acc-004",
    opportunityId: "opp-008",
    projectId: "proj-004",
    revenueNo: "REV-2026-004",
    orderNo: "SO-2026-028",
    invoiceNo: "INV-2026-055",
    paymentNo: "PAY-2026-023",
    reconciliationDate: "2026-04-05",
    expectedAmount: 2600000,
    actualAmount: 2600000,
    currencyCode: "USD",
    differenceType: "no_difference",
    reconciliationStatus: "reconciled",
    invoiceStatus: "partially_invoiced",
    paymentStatus: "partial",
    settlementStatus: "partially_settled",
    assigneeId: "u-005",
    isPartialPayment: true,
    isCrossPeriod: true,
    differenceNote: "分期款已依合約條款核對完成。",
    varianceReason: "",
    internalNote: "本期範圍已完成核對。",
    crossDepartmentRequired: false,
    progress: 100,
    createdAt: "2026-04-05 10:10",
    createdBy: "王冠勳",
    updatedAt: "2026-04-05 18:20",
    updatedBy: "王冠勳",
    lastHandledAt: "2026-04-05 18:20",
    lastHandledBy: "王冠勳",
  },
  {
    id: "rec-005",
    reconciliationNo: "REC-2026-005",
    accountId: "acc-005",
    opportunityId: "opp-010",
    projectId: "proj-005",
    revenueNo: "REV-2026-005",
    orderNo: "SO-2026-032",
    invoiceNo: "",
    paymentNo: "",
    reconciliationDate: "2026-04-04",
    expectedAmount: 1450000,
    actualAmount: 0,
    currencyCode: "TWD",
    differenceType: "missing_data",
    reconciliationStatus: "exception",
    invoiceStatus: "not_invoiced",
    paymentStatus: "overdue",
    settlementStatus: "exception",
    assigneeId: "u-005",
    isPartialPayment: false,
    isCrossPeriod: false,
    differenceNote: "未開票且未收款，差異全額待處理。",
    varianceReason: "客戶付款節點未確認，作業停滯。",
    internalNote: "需業務主管介入催收與條款確認。",
    crossDepartmentRequired: true,
    progress: 20,
    createdAt: "2026-04-04 14:45",
    createdBy: "王冠勳",
    updatedAt: "2026-04-06 14:10",
    updatedBy: "王冠勳",
    lastHandledAt: "2026-04-06 14:10",
    lastHandledBy: "王冠勳",
  },
  {
    id: "rec-006",
    reconciliationNo: "REC-2026-006",
    accountId: "acc-006",
    opportunityId: "opp-011",
    projectId: "proj-006",
    revenueNo: "REV-2026-006",
    orderNo: "SO-2026-035",
    invoiceNo: "INV-2026-059",
    paymentNo: "PAY-2026-024",
    reconciliationDate: "2026-04-04",
    expectedAmount: 970000,
    actualAmount: 970000,
    currencyCode: "TWD",
    differenceType: "no_difference",
    reconciliationStatus: "reconciled",
    invoiceStatus: "invoiced",
    paymentStatus: "paid",
    settlementStatus: "settled",
    assigneeId: "u-005",
    isPartialPayment: false,
    isCrossPeriod: false,
    differenceNote: "對帳完成。",
    varianceReason: "",
    internalNote: "",
    crossDepartmentRequired: false,
    progress: 100,
    createdAt: "2026-04-04 10:18",
    createdBy: "王冠勳",
    updatedAt: "2026-04-04 16:50",
    updatedBy: "王冠勳",
    lastHandledAt: "2026-04-04 16:50",
    lastHandledBy: "王冠勳",
  },
  {
    id: "rec-007",
    reconciliationNo: "REC-2026-007",
    accountId: "acc-007",
    opportunityId: "opp-014",
    projectId: "proj-007",
    revenueNo: "REV-2026-007",
    orderNo: "SO-2026-039",
    invoiceNo: "INV-2026-061",
    paymentNo: "PAY-2026-025",
    reconciliationDate: "2026-04-03",
    expectedAmount: 1250000,
    actualAmount: 1000000,
    currencyCode: "TWD",
    differenceType: "amount_mismatch",
    reconciliationStatus: "pending",
    invoiceStatus: "partially_invoiced",
    paymentStatus: "partial",
    settlementStatus: "pending_settlement",
    assigneeId: "u-006",
    isPartialPayment: true,
    isCrossPeriod: false,
    differenceNote: "第二期未收，尚差 250,000。",
    varianceReason: "客戶尚未簽認驗收單。",
    internalNote: "已請 PM 補驗收資料。",
    crossDepartmentRequired: true,
    progress: 45,
    createdAt: "2026-04-03 11:36",
    createdBy: "王冠勳",
    updatedAt: "2026-04-06 09:18",
    updatedBy: "王冠勳",
    lastHandledAt: "2026-04-06 09:18",
    lastHandledBy: "王冠勳",
  },
  {
    id: "rec-008",
    reconciliationNo: "REC-2026-008",
    accountId: "acc-008",
    opportunityId: "opp-012",
    projectId: "proj-004",
    revenueNo: "REV-2026-008",
    orderNo: "SO-2026-042",
    invoiceNo: "INV-2026-064",
    paymentNo: "PAY-2026-026",
    reconciliationDate: "2026-04-03",
    expectedAmount: 1860000,
    actualAmount: 1830000,
    currencyCode: "USD",
    differenceType: "other_issue",
    reconciliationStatus: "closed",
    invoiceStatus: "invoiced",
    paymentStatus: "paid",
    settlementStatus: "settled",
    assigneeId: "u-005",
    isPartialPayment: false,
    isCrossPeriod: false,
    differenceNote: "匯差調整 -30,000，已關閉。",
    varianceReason: "外幣匯率換算差異。",
    internalNote: "已依會計規範調整。",
    crossDepartmentRequired: false,
    progress: 100,
    createdAt: "2026-04-03 09:02",
    createdBy: "王冠勳",
    updatedAt: "2026-04-05 11:42",
    updatedBy: "王冠勳",
    lastHandledAt: "2026-04-05 11:42",
    lastHandledBy: "王冠勳",
  },
  {
    id: "rec-009",
    reconciliationNo: "REC-2026-009",
    accountId: "acc-009",
    opportunityId: "opp-016",
    projectId: "proj-008",
    revenueNo: "REV-2026-009",
    orderNo: "SO-2026-043",
    invoiceNo: "",
    paymentNo: "",
    reconciliationDate: "2026-04-02",
    expectedAmount: 600000,
    actualAmount: 0,
    currencyCode: "TWD",
    differenceType: "missing_data",
    reconciliationStatus: "in_progress",
    invoiceStatus: "not_invoiced",
    paymentStatus: "overdue",
    settlementStatus: "exception",
    assigneeId: "u-006",
    isPartialPayment: false,
    isCrossPeriod: true,
    differenceNote: "專案取消後資料未回寫至開票/收款，存在資料缺漏。",
    varianceReason: "關聯流程中斷導致資料不同步。",
    internalNote: "待法務確認違約條款後結案。",
    crossDepartmentRequired: true,
    progress: 35,
    createdAt: "2026-04-02 16:10",
    createdBy: "王冠勳",
    updatedAt: "2026-04-06 12:06",
    updatedBy: "王冠勳",
    lastHandledAt: "2026-04-06 12:06",
    lastHandledBy: "王冠勳",
  },
  {
    id: "rec-010",
    reconciliationNo: "REC-2026-010",
    accountId: "acc-010",
    opportunityId: "opp-015",
    projectId: "proj-006",
    revenueNo: "REV-2026-010",
    orderNo: "SO-2026-044",
    invoiceNo: "INV-2026-066",
    paymentNo: "PAY-2026-027",
    reconciliationDate: "2026-04-02",
    expectedAmount: 2280000,
    actualAmount: 2280000,
    currencyCode: "TWD",
    differenceType: "no_difference",
    reconciliationStatus: "reconciled",
    invoiceStatus: "invoiced",
    paymentStatus: "paid",
    settlementStatus: "settled",
    assigneeId: "u-005",
    isPartialPayment: false,
    isCrossPeriod: false,
    differenceNote: "對帳完成。",
    varianceReason: "",
    internalNote: "",
    crossDepartmentRequired: false,
    progress: 100,
    createdAt: "2026-04-02 10:24",
    createdBy: "王冠勳",
    updatedAt: "2026-04-02 17:35",
    updatedBy: "王冠勳",
    lastHandledAt: "2026-04-02 17:35",
    lastHandledBy: "王冠勳",
  },
];

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toTimestamp(value) {
  const date = parseDate(value);
  return date ? date.getTime() : 0;
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(value) {
  const date = parseDate(value);
  if (!date) {
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

function formatCurrency(value, currencyCode = "TWD") {
  const safeValue = Number(value || 0);

  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: ["JPY", "TWD"].includes(currencyCode) ? 0 : 2,
  }).format(safeValue);
}

function formatSignedCurrency(value, currencyCode = "TWD") {
  const amount = Number(value || 0);
  if (amount === 0) {
    return formatCurrency(0, currencyCode);
  }

  const sign = amount > 0 ? "+" : "-";
  return `${sign}${formatCurrency(Math.abs(amount), currencyCode)}`;
}

function resolveRecord(record) {
  const accountName = accountNameMap.get(record.accountId) || "-";
  const opportunityName = opportunityNameMap.get(record.opportunityId) || "-";
  const projectName = projectNameMap.get(record.projectId) || "-";
  const assigneeName = userNameMap.get(record.assigneeId) || "未指派";

  const varianceAmount = Number(
    record.varianceAmount ??
      Number(record.expectedAmount || 0) - Number(record.actualAmount || 0)
  );

  const hasDifference =
    record.differenceType !== "no_difference" || Math.abs(varianceAmount) > 0;

  const isPending = ["pending", "in_progress", "pending_confirmation"].includes(
    record.reconciliationStatus
  );
  const isException = record.reconciliationStatus === "exception" || hasDifference;
  const isHighRisk =
    (isPending && Math.abs(varianceAmount) >= 300000) ||
    record.paymentStatus === "overdue" ||
    Boolean(record.crossDepartmentRequired);

  return {
    ...record,
    accountName,
    opportunityName,
    projectName,
    assigneeName,
    varianceAmount,
    hasDifference,
    isPending,
    isException,
    isHighRisk,
    relatedSummary:
      [record.revenueNo, record.orderNo, record.invoiceNo || "無發票"]
        .filter(Boolean)
        .join(" / ") || "-",
  };
}

const records = ref(seedRecords.map((item) => resolveRecord(item)));

const loading = ref(false);
const filterPanelOpen = ref(false);
const quickTab = ref("all");
const currentPage = ref(1);
const pageSize = ref(10);

const detailDrawerOpen = ref(false);
const activeRecordId = ref("");

const sortState = reactive({
  prop: "updatedAt",
  order: "descending",
});

const filters = reactive({
  keyword: "",
  dateRange: [],
  accountId: "all",
  opportunityId: "all",
  projectId: "all",
  reconciliationStatus: "all",
  differenceType: "all",
  paymentStatus: "all",
  invoiceStatus: "all",
  assigneeId: "all",
  onlyException: "all",
  onlyUnfinished: "all",
});

const editor = reactive({
  reconciliationStatus: "pending",
  invoiceStatus: "not_invoiced",
  paymentStatus: "unpaid",
  settlementStatus: "pending_settlement",
  assigneeId: "",
  progress: 0,
  isPartialPayment: false,
  isCrossPeriod: false,
  differenceNote: "",
  varianceReason: "",
  internalNote: "",
  crossDepartmentRequired: false,
});

const activeRecord = computed(() =>
  records.value.find((item) => item.id === activeRecordId.value)
);

function notify(message, title = "已更新", type = "success") {
  ElNotification({ title, message, type, position: "top-right" });
}

function isDateWithinRange(value, range) {
  const [start, end] = range || [];
  if (!start || !end) {
    return true;
  }

  const time = toTimestamp(value);
  return time >= toTimestamp(start) && time <= toTimestamp(end) + 24 * 60 * 60 * 1000 - 1;
}

const tabCounts = computed(() => {
  const list = records.value;
  return {
    all: list.length,
    pending: list.filter((item) => item.reconciliationStatus === "pending").length,
    in_progress: list.filter((item) => item.reconciliationStatus === "in_progress")
      .length,
    pending_confirmation: list.filter(
      (item) => item.reconciliationStatus === "pending_confirmation"
    ).length,
    completed: list.filter((item) =>
      ["reconciled", "closed"].includes(item.reconciliationStatus)
    ).length,
  };
});

const filteredRecords = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return records.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.reconciliationNo.toLowerCase().includes(keyword) ||
      item.accountName.toLowerCase().includes(keyword) ||
      item.relatedSummary.toLowerCase().includes(keyword) ||
      item.assigneeName.toLowerCase().includes(keyword) ||
      String(item.differenceNote || "")
        .toLowerCase()
        .includes(keyword) ||
      String(item.varianceReason || "")
        .toLowerCase()
        .includes(keyword);

    const matchesDate = isDateWithinRange(item.reconciliationDate, filters.dateRange);
    const matchesAccount =
      filters.accountId === "all" || item.accountId === filters.accountId;
    const matchesOpportunity =
      filters.opportunityId === "all" || item.opportunityId === filters.opportunityId;
    const matchesProject =
      filters.projectId === "all" || item.projectId === filters.projectId;
    const matchesReconStatus =
      filters.reconciliationStatus === "all" ||
      item.reconciliationStatus === filters.reconciliationStatus;
    const matchesDifference =
      filters.differenceType === "all" || item.differenceType === filters.differenceType;
    const matchesPayment =
      filters.paymentStatus === "all" || item.paymentStatus === filters.paymentStatus;
    const matchesInvoice =
      filters.invoiceStatus === "all" || item.invoiceStatus === filters.invoiceStatus;
    const matchesAssignee =
      filters.assigneeId === "all" || item.assigneeId === filters.assigneeId;

    const matchesOnlyException =
      filters.onlyException === "all" ||
      (filters.onlyException === "yes" ? item.isException : !item.isException);
    const matchesOnlyUnfinished =
      filters.onlyUnfinished === "all" ||
      (filters.onlyUnfinished === "yes" ? item.isPending : !item.isPending);

    const matchesTab =
      quickTab.value === "all" ||
      item.reconciliationStatus === quickTab.value ||
      (quickTab.value === "completed" &&
        ["reconciled", "closed"].includes(item.reconciliationStatus));

    return (
      matchesKeyword &&
      matchesDate &&
      matchesAccount &&
      matchesOpportunity &&
      matchesProject &&
      matchesReconStatus &&
      matchesDifference &&
      matchesPayment &&
      matchesInvoice &&
      matchesAssignee &&
      matchesOnlyException &&
      matchesOnlyUnfinished &&
      matchesTab
    );
  });
});

const sortedRecords = computed(() => {
  const result = [...filteredRecords.value];
  const direction = sortState.order === "ascending" ? 1 : -1;

  return result.sort((a, b) => {
    if (["reconciliationDate", "updatedAt"].includes(sortState.prop)) {
      return (
        (toTimestamp(a[sortState.prop]) - toTimestamp(b[sortState.prop])) * direction
      );
    }

    if (["expectedAmount", "actualAmount", "varianceAmount"].includes(sortState.prop)) {
      return (
        (Number(a[sortState.prop] || 0) - Number(b[sortState.prop] || 0)) * direction
      );
    }

    return (
      String(a[sortState.prop] || "").localeCompare(
        String(b[sortState.prop] || ""),
        "zh-Hant"
      ) * direction
    );
  });
});

const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedRecords.value.slice(start, start + pageSize.value);
});

const kpiCards = computed(() => {
  const list = filteredRecords.value;
  const total = list.length;
  const pending = list.filter((item) => item.reconciliationStatus === "pending").length;
  const completed = list.filter((item) =>
    ["reconciled", "closed"].includes(item.reconciliationStatus)
  ).length;
  const exception = list.filter((item) => item.reconciliationStatus === "exception")
    .length;
  const varianceTotal = list.reduce(
    (sum, item) => sum + Math.abs(Number(item.varianceAmount || 0)),
    0
  );
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
  const highRiskPending = list.filter((item) => item.isPending && item.isHighRisk).length;

  return [
    { label: "待對帳筆數", value: pending },
    { label: "已對帳筆數", value: completed },
    { label: "異常筆數", value: exception },
    { label: "差異總金額", value: formatCurrency(varianceTotal) },
    { label: "本期對帳完成率", value: `${completionRate}%` },
    { label: "待處理高風險筆數", value: highRiskPending },
  ];
});

function handleSortChange({ prop, order }) {
  sortState.prop = prop || "updatedAt";
  sortState.order = order || "descending";
}

function resetFilters() {
  filters.keyword = "";
  filters.dateRange = [];
  filters.accountId = "all";
  filters.opportunityId = "all";
  filters.projectId = "all";
  filters.reconciliationStatus = "all";
  filters.differenceType = "all";
  filters.paymentStatus = "all";
  filters.invoiceStatus = "all";
  filters.assigneeId = "all";
  filters.onlyException = "all";
  filters.onlyUnfinished = "all";
  quickTab.value = "all";
  currentPage.value = 1;
}

function openDetail(record) {
  activeRecordId.value = record.id;
  detailDrawerOpen.value = true;
}

function syncEditor(record) {
  if (!record) {
    return;
  }

  editor.reconciliationStatus = record.reconciliationStatus;
  editor.invoiceStatus = record.invoiceStatus;
  editor.paymentStatus = record.paymentStatus;
  editor.settlementStatus = record.settlementStatus;
  editor.assigneeId = record.assigneeId;
  editor.progress = Number(record.progress || 0);
  editor.isPartialPayment = Boolean(record.isPartialPayment);
  editor.isCrossPeriod = Boolean(record.isCrossPeriod);
  editor.differenceNote = record.differenceNote || "";
  editor.varianceReason = record.varianceReason || "";
  editor.internalNote = record.internalNote || "";
  editor.crossDepartmentRequired = Boolean(record.crossDepartmentRequired);
}

function nowDateTimeText() {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace("T", " ");
}

function patchRecord(recordId, patch) {
  const index = records.value.findIndex((item) => item.id === recordId);
  if (index < 0) {
    return null;
  }

  const timestamp = nowDateTimeText();

  const merged = {
    ...records.value[index],
    ...patch,
    updatedAt: timestamp,
    updatedBy: "王冠勳",
    lastHandledAt: timestamp,
    lastHandledBy: "王冠勳",
  };

  const next = resolveRecord(merged);
  records.value.splice(index, 1, next);
  return next;
}

function saveEditor() {
  const record = activeRecord.value;
  if (!record) {
    return;
  }

  const updated = patchRecord(record.id, {
    reconciliationStatus: editor.reconciliationStatus,
    invoiceStatus: editor.invoiceStatus,
    paymentStatus: editor.paymentStatus,
    settlementStatus: editor.settlementStatus,
    assigneeId: editor.assigneeId,
    progress: Number(editor.progress || 0),
    isPartialPayment: editor.isPartialPayment,
    isCrossPeriod: editor.isCrossPeriod,
    differenceNote: editor.differenceNote.trim(),
    varianceReason: editor.varianceReason.trim(),
    internalNote: editor.internalNote.trim(),
    crossDepartmentRequired: editor.crossDepartmentRequired,
  });

  if (!updated) {
    notify("儲存失敗", "錯誤", "error");
    return;
  }

  syncEditor(updated);
  notify(`${updated.reconciliationNo} 已更新`);
}

function exportCsv() {
  const header = [
    "對帳編號",
    "客戶名稱",
    "關聯營收 / 訂單 / 發票",
    "對帳日期",
    "應收金額",
    "實收金額",
    "差異金額",
    "差異類型",
    "對帳狀態",
    "開票狀態",
    "收款狀態",
    "處理人",
    "更新時間",
  ];

  const rows = sortedRecords.value.map((item) => [
    item.reconciliationNo,
    item.accountName,
    item.relatedSummary,
    item.reconciliationDate,
    item.expectedAmount,
    item.actualAmount,
    item.varianceAmount,
    differenceTypeMap[item.differenceType]?.label || item.differenceType,
    reconciliationStatusMap[item.reconciliationStatus]?.label ||
      item.reconciliationStatus,
    invoiceStatusMap[item.invoiceStatus]?.label || item.invoiceStatus,
    paymentStatusMap[item.paymentStatus]?.label || item.paymentStatus,
    item.assigneeName,
    item.updatedAt,
  ]);

  const csv = [header, ...rows]
    .map((line) =>
      line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `reconciliation-records-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function goToRelated(routeName, params) {
  router.push({ name: routeName, params });
}

watch(
  () => activeRecord.value,
  (record) => {
    syncEditor(record);
  },
  { immediate: true }
);

watch(
  () => [
    filteredRecords.value.length,
    quickTab.value,
    pageSize.value,
    filters.keyword,
    filters.accountId,
    filters.opportunityId,
    filters.projectId,
    filters.reconciliationStatus,
    filters.differenceType,
    filters.paymentStatus,
    filters.invoiceStatus,
    filters.assigneeId,
    filters.onlyException,
    filters.onlyUnfinished,
  ],
  () => {
    currentPage.value = 1;
  }
);
</script>

<template>
  <div class="min-h-full p-8">
    <section class="grid gap-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-2">
          <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">
            對帳管理
          </h1>
          <p class="text-sm text-slate-500">
            集中核對應收與實際入帳資料，快速定位差異並追蹤處理進度
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton :icon="Download" @click="exportCsv">匯出</ElButton>
        </div>
      </header>

      <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <article
          v-for="card in kpiCards"
          :key="card.label"
          class="rounded-2xl border border-slate-200 bg-white px-4 py-4"
        >
          <p class="text-xs text-slate-500">{{ card.label }}</p>
          <p class="mt-2 text-lg font-semibold text-slate-900">{{ card.value }}</p>
        </article>
      </section>

      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div class="flex flex-wrap items-center gap-2">
            <ElInput
              v-model="filters.keyword"
              placeholder="搜尋對帳編號 / 客戶 / 關聯資料 / 差異說明"
              clearable
              class="!w-80"
            >
              <template #prefix><Search class="h-4 w-4 text-slate-400" /></template>
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
          <ElTag round effect="plain">共 {{ sortedRecords.length }} 筆</ElTag>
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
            class="grid gap-3 border-t border-slate-200 bg-white px-6 py-4 md:grid-cols-2 xl:grid-cols-4"
            label-position="top"
          >
            <ElFormItem>
              <ElDatePicker
                v-model="filters.dateRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                start-placeholder="對帳起日"
                end-placeholder="對帳迄日"
                class="!w-full"
              />
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.accountId">
                <ElOption
                  v-for="item in accountOptions"
                  :key="`account-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.opportunityId">
                <ElOption
                  v-for="item in opportunityOptions"
                  :key="`opportunity-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.projectId">
                <ElOption
                  v-for="item in projectOptions"
                  :key="`project-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.reconciliationStatus">
                <ElOption
                  v-for="item in reconciliationStatusOptions"
                  :key="`status-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.differenceType">
                <ElOption
                  v-for="item in differenceTypeOptions"
                  :key="`difference-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.paymentStatus">
                <ElOption
                  v-for="item in paymentStatusOptions"
                  :key="`payment-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.invoiceStatus">
                <ElOption
                  v-for="item in invoiceStatusOptions"
                  :key="`invoice-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.assigneeId">
                <ElOption
                  v-for="item in assigneeOptions"
                  :key="`assignee-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.onlyException">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`exception-${item.value}`"
                  :label="`只看異常：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.onlyUnfinished">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`unfinished-${item.value}`"
                  :label="`只看未完成：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </transition>

        <div class="border-t border-slate-200 px-6 pt-3">
          <ElTabs v-model="quickTab" class="recon-tabs">
            <ElTabPane
              v-for="tab in quickTabs"
              :key="tab.value"
              :name="tab.value"
              :label="`${tab.label} (${tabCounts[tab.value] || 0})`"
            />
          </ElTabs>
        </div>

        <ElTable
          v-loading="loading"
          table-layout="auto"
          :data="pagedRecords"
          @sort-change="handleSortChange"
        >
          <ElTableColumn
            label="對帳編號"
            min-width="170"
            sortable="custom"
            prop="reconciliationNo"
          >
            <template #default="{ row }">
              <button type="button" class="grid gap-1 text-left" @click="openDetail(row)">
                <span class="font-semibold text-[#303133] hover:text-[#409eff]">
                  {{ row.reconciliationNo }}
                </span>
                <span class="text-xs text-slate-500">{{ row.relatedSummary }}</span>
                <div class="flex flex-wrap gap-1">
                  <ElTag v-if="row.isException" size="small" type="danger" effect="light">
                    異常
                  </ElTag>
                  <ElTag v-if="row.isHighRisk" size="small" type="warning" effect="light">
                    高風險
                  </ElTag>
                </div>
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="客戶名稱" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ row.accountName }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="對帳日期"
            min-width="130"
            sortable="custom"
            prop="reconciliationDate"
          >
            <template #default="{ row }">{{
              formatDate(row.reconciliationDate)
            }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="應收金額"
            min-width="130"
            sortable="custom"
            prop="expectedAmount"
            align="right"
          >
            <template #default="{ row }">{{
              formatCurrency(row.expectedAmount, row.currencyCode)
            }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="實收金額"
            min-width="130"
            sortable="custom"
            prop="actualAmount"
            align="right"
          >
            <template #default="{ row }">{{
              formatCurrency(row.actualAmount, row.currencyCode)
            }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="差異金額"
            min-width="140"
            sortable="custom"
            prop="varianceAmount"
            align="right"
          >
            <template #default="{ row }">
              <span
                :class="
                  Math.abs(Number(row.varianceAmount || 0)) > 0
                    ? 'font-medium text-rose-600'
                    : ''
                "
              >
                {{ formatSignedCurrency(row.varianceAmount, row.currencyCode) }}
              </span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="差異類型" min-width="130">
            <template #default="{ row }">
              {{ differenceTypeMap[row.differenceType]?.label || row.differenceType }}
            </template>
          </ElTableColumn>

          <ElTableColumn label="對帳狀態" min-width="130">
            <template #default="{ row }">
              <ElTag
                :type="reconciliationStatusMap[row.reconciliationStatus]?.type"
                size="small"
                effect="light"
              >
                {{
                  reconciliationStatusMap[row.reconciliationStatus]?.label ||
                  row.reconciliationStatus
                }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="開票狀態" min-width="120">
            <template #default="{ row }">
              <ElTag
                :type="invoiceStatusMap[row.invoiceStatus]?.type"
                size="small"
                effect="light"
              >
                {{ invoiceStatusMap[row.invoiceStatus]?.label || row.invoiceStatus }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="收款狀態" min-width="120">
            <template #default="{ row }">
              <ElTag
                :type="paymentStatusMap[row.paymentStatus]?.type"
                size="small"
                effect="light"
              >
                {{ paymentStatusMap[row.paymentStatus]?.label || row.paymentStatus }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="處理人" min-width="120">
            <template #default="{ row }">{{ row.assigneeName }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="更新時間"
            min-width="150"
            sortable="custom"
            prop="updatedAt"
          >
            <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
          </ElTableColumn>

          <ElTableColumn label="操作" width="110" fixed="right">
            <template #default="{ row }">
              <ElButton text type="primary" @click="openDetail(row)">查看詳情</ElButton>
            </template>
          </ElTableColumn>
        </ElTable>

        <div
          class="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 px-6 py-5"
        >
          <ElPagination
            v-model:current-page="currentPage"
            background
            :page-size="pageSize"
            layout="total, prev, pager, next"
            :total="sortedRecords.length"
          />
          <ElSelect v-model="pageSize" class="!w-[100px]" @change="currentPage = 1">
            <ElOption :value="10" label="10 筆" />
            <ElOption :value="20" label="20 筆" />
            <ElOption :value="50" label="50 筆" />
          </ElSelect>
        </div>
      </section>
    </section>

    <ElDrawer
      v-model="detailDrawerOpen"
      size="52%"
      title="對帳詳情"
      :destroy-on-close="false"
    >
      <template v-if="activeRecord">
        <section class="grid gap-4">
          <header class="grid gap-2">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="grid gap-2">
                <h2 class="text-xl font-semibold text-slate-900">
                  {{ activeRecord.reconciliationNo }}
                </h2>
                <p class="text-sm text-slate-600">{{ activeRecord.accountName }}</p>
                <div class="flex flex-wrap items-center gap-2">
                  <ElTag
                    :type="
                      reconciliationStatusMap[activeRecord.reconciliationStatus]?.type
                    "
                    effect="light"
                  >
                    {{
                      reconciliationStatusMap[activeRecord.reconciliationStatus]?.label
                    }}
                  </ElTag>
                  <ElTag
                    :type="differenceTypeMap[activeRecord.differenceType]?.type"
                    effect="light"
                  >
                    {{ differenceTypeMap[activeRecord.differenceType]?.label }}
                  </ElTag>
                  <ElTag v-if="activeRecord.isHighRisk" type="danger" effect="light"
                    >高風險</ElTag
                  >
                </div>
              </div>

              <div class="text-right">
                <p class="text-xs text-slate-500">差異金額</p>
                <p class="text-xl font-semibold text-slate-900">
                  {{
                    formatSignedCurrency(
                      activeRecord.varianceAmount,
                      activeRecord.currencyCode
                    )
                  }}
                </p>
              </div>
            </div>
          </header>

          <ElCard shadow="never">
            <template #header
              ><span class="text-sm font-semibold text-slate-800"
                >基本資訊</span
              ></template
            >
            <ElDescriptions :column="2" border>
              <ElDescriptionsItem label="對帳編號">{{
                activeRecord.reconciliationNo
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="對帳日期">{{
                formatDate(activeRecord.reconciliationDate)
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="客戶名稱">{{
                activeRecord.accountName
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="處理人">{{
                activeRecord.assigneeName
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="關聯營收">{{
                activeRecord.revenueNo || "-"
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="關聯訂單">{{
                activeRecord.orderNo || "-"
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="關聯發票">{{
                activeRecord.invoiceNo || "-"
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="關聯收款">{{
                activeRecord.paymentNo || "-"
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="建立時間">{{
                formatDateTime(activeRecord.createdAt)
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="最後更新">{{
                formatDateTime(activeRecord.updatedAt)
              }}</ElDescriptionsItem>
            </ElDescriptions>
          </ElCard>

          <ElCard shadow="never">
            <template #header
              ><span class="text-sm font-semibold text-slate-800"
                >對帳比對資訊</span
              ></template
            >
            <ElDescriptions :column="2" border>
              <ElDescriptionsItem label="系統應收金額">
                {{
                  formatCurrency(activeRecord.expectedAmount, activeRecord.currencyCode)
                }}
              </ElDescriptionsItem>
              <ElDescriptionsItem label="實際收款金額">
                {{ formatCurrency(activeRecord.actualAmount, activeRecord.currencyCode) }}
              </ElDescriptionsItem>
              <ElDescriptionsItem label="差異金額">
                <span
                  :class="
                    Math.abs(activeRecord.varianceAmount) > 0
                      ? 'text-rose-600 font-medium'
                      : ''
                  "
                >
                  {{
                    formatSignedCurrency(
                      activeRecord.varianceAmount,
                      activeRecord.currencyCode
                    )
                  }}
                </span>
              </ElDescriptionsItem>
              <ElDescriptionsItem label="差異類型">
                {{ differenceTypeMap[activeRecord.differenceType]?.label || "-" }}
              </ElDescriptionsItem>
              <ElDescriptionsItem label="是否部分收款">
                {{ activeRecord.isPartialPayment ? "是" : "否" }}
              </ElDescriptionsItem>
              <ElDescriptionsItem label="是否跨期">
                {{ activeRecord.isCrossPeriod ? "是" : "否" }}
              </ElDescriptionsItem>
            </ElDescriptions>
          </ElCard>

          <ElCard shadow="never">
            <template #header
              ><span class="text-sm font-semibold text-slate-800"
                >狀態資訊</span
              ></template
            >
            <ElForm label-position="top" class="grid gap-3">
              <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <ElFormItem label="對帳狀態">
                  <ElSelect v-model="editor.reconciliationStatus">
                    <ElOption
                      v-for="(meta, key) in reconciliationStatusMap"
                      :key="`edit-recon-${key}`"
                      :label="meta.label"
                      :value="key"
                    />
                  </ElSelect>
                </ElFormItem>
                <ElFormItem label="開票狀態">
                  <ElSelect v-model="editor.invoiceStatus">
                    <ElOption
                      v-for="(meta, key) in invoiceStatusMap"
                      :key="`edit-invoice-${key}`"
                      :label="meta.label"
                      :value="key"
                    />
                  </ElSelect>
                </ElFormItem>
                <ElFormItem label="收款狀態">
                  <ElSelect v-model="editor.paymentStatus">
                    <ElOption
                      v-for="(meta, key) in paymentStatusMap"
                      :key="`edit-payment-${key}`"
                      :label="meta.label"
                      :value="key"
                    />
                  </ElSelect>
                </ElFormItem>
                <ElFormItem label="結算狀態">
                  <ElSelect v-model="editor.settlementStatus">
                    <ElOption
                      v-for="(meta, key) in settlementStatusMap"
                      :key="`edit-settlement-${key}`"
                      :label="meta.label"
                      :value="key"
                    />
                  </ElSelect>
                </ElFormItem>
                <ElFormItem label="處理人">
                  <ElSelect v-model="editor.assigneeId">
                    <ElOption
                      v-for="item in assigneeOptions.filter(
                        (option) => option.value !== 'all'
                      )"
                      :key="`edit-assignee-${item.value}`"
                      :label="item.label"
                      :value="item.value"
                    />
                  </ElSelect>
                </ElFormItem>
                <ElFormItem label="處理進度 (%)">
                  <ElInputNumber
                    v-model="editor.progress"
                    :min="0"
                    :max="100"
                    class="!w-full"
                  />
                </ElFormItem>
                <ElFormItem label="部分收款">
                  <ElSwitch v-model="editor.isPartialPayment" />
                </ElFormItem>
                <ElFormItem label="跨期">
                  <ElSwitch v-model="editor.isCrossPeriod" />
                </ElFormItem>
                <ElFormItem label="需跨部門確認">
                  <ElSwitch v-model="editor.crossDepartmentRequired" />
                </ElFormItem>
              </div>
            </ElForm>
          </ElCard>

          <ElCard shadow="never">
            <template #header
              ><span class="text-sm font-semibold text-slate-800"
                >關聯資料</span
              ></template
            >
            <div class="flex flex-wrap gap-2">
              <ElButton
                v-if="activeRecord.accountId"
                @click="
                  goToRelated('account-detail', { accountId: activeRecord.accountId })
                "
              >
                前往客戶
              </ElButton>
              <ElButton
                v-if="activeRecord.opportunityId"
                @click="
                  goToRelated('opportunity-detail', {
                    opportunityId: activeRecord.opportunityId,
                  })
                "
              >
                前往商機
              </ElButton>
              <ElButton
                v-if="activeRecord.projectId"
                @click="
                  goToRelated('project-detail', { projectId: activeRecord.projectId })
                "
              >
                前往專案
              </ElButton>
              <ElButton @click="goToRelated('finance-revenue-records', {})"
                >前往營收資料</ElButton
              >
            </div>
          </ElCard>

          <ElCard shadow="never">
            <template #header
              ><span class="text-sm font-semibold text-slate-800"
                >處理資訊</span
              ></template
            >
            <div class="grid gap-3">
              <ElForm label-position="top" class="grid gap-2">
                <ElFormItem label="差異說明">
                  <ElInput v-model="editor.differenceNote" type="textarea" :rows="2" />
                </ElFormItem>
                <ElFormItem label="異常原因">
                  <ElInput v-model="editor.varianceReason" type="textarea" :rows="2" />
                </ElFormItem>
                <ElFormItem label="內部備註">
                  <ElInput v-model="editor.internalNote" type="textarea" :rows="2" />
                </ElFormItem>
              </ElForm>

              <ElDescriptions :column="2" border>
                <ElDescriptionsItem label="最近處理時間">
                  {{ formatDateTime(activeRecord.lastHandledAt) }}
                </ElDescriptionsItem>
                <ElDescriptionsItem label="最近處理人">
                  {{ activeRecord.lastHandledBy || "-" }}
                </ElDescriptionsItem>
              </ElDescriptions>

              <div class="flex justify-end border-t border-slate-200 pt-3">
                <ElButton type="primary" @click="saveEditor">儲存更新</ElButton>
              </div>
            </div>
          </ElCard>
        </section>
      </template>
    </ElDrawer>
  </div>
</template>

<style scoped>
:deep(.el-form-item) {
  margin-bottom: 12px;
}

.recon-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}
</style>
