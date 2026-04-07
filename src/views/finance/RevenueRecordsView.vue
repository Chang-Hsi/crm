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
import { Download, Filter, Refresh, Search } from "@element-plus/icons-vue";
import { accountList } from "../../data/accounts";
import { opportunityList } from "../../data/opportunities";
import { projectList } from "../../data/projects";
import { userList } from "../../data/users";

const router = useRouter();

const settlementStatusMap = {
  pending_review: { label: "待核對", type: "info" },
  pending_settlement: { label: "待結算", type: "warning" },
  partially_settled: { label: "部分結算", type: "primary" },
  settled: { label: "已結算", type: "success" },
  exception: { label: "異常", type: "danger" },
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

const quickTabs = [
  { value: "all", label: "全部" },
  { value: "unsettled", label: "未結算" },
  { value: "unpaid", label: "待收款" },
  { value: "pending_invoice", label: "待開票" },
  { value: "exception", label: "異常 / 待處理" },
  { value: "settled", label: "已完成" },
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

const ownerOptions = [
  { value: "all", label: "全部業務" },
  ...userList
    .filter((item) => item.status === "active")
    .map((item) => ({ value: item.id, label: item.name })),
];

const statusEditorOwner = "王冠勳";

const seedRecords = [
  {
    id: "rev-001",
    revenueNo: "REV-2026-001",
    accountId: "acc-001",
    opportunityId: "opp-001",
    projectId: "proj-001",
    quoteNo: "Q-2026-001-V1",
    orderNo: "SO-2026-015",
    invoiceNo: "INV-2026-041",
    revenueDate: "2026-04-02",
    currencyCode: "TWD",
    revenueAmount: 3200000,
    receivedAmount: 1800000,
    taxAmount: 152381,
    discountAmount: 50000,
    adjustmentAmount: 0,
    recognizedAmount: 3150000,
    settlementStatus: "pending_settlement",
    invoiceStatus: "partially_invoiced",
    paymentStatus: "partial",
    paymentTerms: "月結 30 天",
    expectedPaymentAt: "2026-04-30",
    actualPaymentAt: "",
    ownerId: "u-001",
    specialNote: "Q2 檔期分兩段認列，第二段待驗收後入帳。",
    adjustmentReason: "",
    pendingReason: "客戶需確認第二階段 KPI 結算數字。",
    financeNote: "已完成第一段對帳，待客戶簽回。",
    systemAlerts: ["尚有未收款金額", "未完成最終結算"],
    invoiceRecords: [
      {
        id: "inv-line-001",
        invoiceNo: "INV-2026-041",
        amount: 1600000,
        issuedAt: "2026-04-03",
        status: "已寄送",
      },
      {
        id: "inv-line-002",
        invoiceNo: "INV-2026-052",
        amount: 800000,
        issuedAt: "2026-04-06",
        status: "審核中",
      },
    ],
    paymentRecords: [
      {
        id: "pay-001",
        paymentNo: "PAY-2026-018",
        amount: 1800000,
        paidAt: "2026-04-05",
        method: "銀行匯款",
        referenceNo: "TXN-882104",
      },
    ],
    createdAt: "2026-04-02 10:12",
    createdBy: "林美雅",
    updatedAt: "2026-04-06 18:25",
    updatedBy: "王冠勳",
  },
  {
    id: "rev-002",
    revenueNo: "REV-2026-002",
    accountId: "acc-002",
    opportunityId: "opp-004",
    projectId: "proj-002",
    quoteNo: "Q-2026-003-V1",
    orderNo: "SO-2026-021",
    invoiceNo: "",
    revenueDate: "2026-04-01",
    currencyCode: "USD",
    revenueAmount: 4200000,
    receivedAmount: 0,
    taxAmount: 0,
    discountAmount: 0,
    adjustmentAmount: 100000,
    recognizedAmount: 4300000,
    settlementStatus: "pending_review",
    invoiceStatus: "not_invoiced",
    paymentStatus: "unpaid",
    paymentTerms: "驗收後 30 天",
    expectedPaymentAt: "2026-05-08",
    actualPaymentAt: "",
    ownerId: "u-002",
    specialNote: "海外案需完成授權驗收後方可開票。",
    adjustmentReason: "追加展區加值服務費用。",
    pendingReason: "法務與客戶仍在確認最終條款。",
    financeNote: "先列為待核對，不進入請款。",
    systemAlerts: ["尚未開票", "尚未收款"],
    invoiceRecords: [],
    paymentRecords: [],
    createdAt: "2026-04-01 09:20",
    createdBy: "陳志昇",
    updatedAt: "2026-04-06 15:10",
    updatedBy: "王冠勳",
  },
  {
    id: "rev-003",
    revenueNo: "REV-2026-003",
    accountId: "acc-003",
    opportunityId: "opp-006",
    projectId: "proj-003",
    quoteNo: "Q-2026-009-V1",
    orderNo: "SO-2026-026",
    invoiceNo: "INV-2026-049",
    revenueDate: "2026-03-30",
    currencyCode: "TWD",
    revenueAmount: 1680000,
    receivedAmount: 1680000,
    taxAmount: 80000,
    discountAmount: 30000,
    adjustmentAmount: 0,
    recognizedAmount: 1650000,
    settlementStatus: "settled",
    invoiceStatus: "invoiced",
    paymentStatus: "paid",
    paymentTerms: "月結 45 天",
    expectedPaymentAt: "2026-04-20",
    actualPaymentAt: "2026-04-04",
    ownerId: "u-003",
    specialNote: "本案已完成對帳與收款。",
    adjustmentReason: "",
    pendingReason: "",
    financeNote: "可列入本月已結算。",
    systemAlerts: [],
    invoiceRecords: [
      {
        id: "inv-line-003",
        invoiceNo: "INV-2026-049",
        amount: 1680000,
        issuedAt: "2026-03-31",
        status: "已開立",
      },
    ],
    paymentRecords: [
      {
        id: "pay-002",
        paymentNo: "PAY-2026-021",
        amount: 1680000,
        paidAt: "2026-04-04",
        method: "銀行匯款",
        referenceNo: "TXN-883901",
      },
    ],
    createdAt: "2026-03-30 16:15",
    createdBy: "吳奕承",
    updatedAt: "2026-04-04 11:08",
    updatedBy: "王冠勳",
  },
  {
    id: "rev-004",
    revenueNo: "REV-2026-004",
    accountId: "acc-004",
    opportunityId: "opp-008",
    projectId: "proj-004",
    quoteNo: "Q-2026-005-V1",
    orderNo: "SO-2026-028",
    invoiceNo: "INV-2026-055",
    revenueDate: "2026-03-29",
    currencyCode: "USD",
    revenueAmount: 2600000,
    receivedAmount: 1100000,
    taxAmount: 0,
    discountAmount: 0,
    adjustmentAmount: 0,
    recognizedAmount: 2600000,
    settlementStatus: "partially_settled",
    invoiceStatus: "partially_invoiced",
    paymentStatus: "partial",
    paymentTerms: "月結 60 天",
    expectedPaymentAt: "2026-05-29",
    actualPaymentAt: "",
    ownerId: "u-004",
    specialNote: "北美客戶採分期請款。",
    adjustmentReason: "",
    pendingReason: "第二期款項需待媒體報告驗收。",
    financeNote: "先認列第一期，後續以調整單處理。",
    systemAlerts: ["款項未全數收齊"],
    invoiceRecords: [
      {
        id: "inv-line-004",
        invoiceNo: "INV-2026-055",
        amount: 1300000,
        issuedAt: "2026-04-01",
        status: "已開立",
      },
    ],
    paymentRecords: [
      {
        id: "pay-003",
        paymentNo: "PAY-2026-023",
        amount: 1100000,
        paidAt: "2026-04-05",
        method: "國際電匯",
        referenceNo: "SWIFT-20491",
      },
    ],
    createdAt: "2026-03-29 15:40",
    createdBy: "田中由紀",
    updatedAt: "2026-04-06 09:42",
    updatedBy: "王冠勳",
  },
  {
    id: "rev-005",
    revenueNo: "REV-2026-005",
    accountId: "acc-005",
    opportunityId: "opp-010",
    projectId: "proj-005",
    quoteNo: "Q-2026-006-V1",
    orderNo: "SO-2026-032",
    invoiceNo: "",
    revenueDate: "2026-03-27",
    currencyCode: "TWD",
    revenueAmount: 1450000,
    receivedAmount: 0,
    taxAmount: 69048,
    discountAmount: 0,
    adjustmentAmount: 0,
    recognizedAmount: 1450000,
    settlementStatus: "exception",
    invoiceStatus: "not_invoiced",
    paymentStatus: "overdue",
    paymentTerms: "月結 30 天",
    expectedPaymentAt: "2026-04-05",
    actualPaymentAt: "",
    ownerId: "u-001",
    specialNote: "客戶對付款條件提出異議。",
    adjustmentReason: "",
    pendingReason: "客戶尚未確認修訂後付款節點。",
    financeNote: "需業務主管介入催收。",
    systemAlerts: ["收款已逾期", "尚未開票", "結算異常待處理"],
    invoiceRecords: [],
    paymentRecords: [],
    createdAt: "2026-03-27 11:18",
    createdBy: "林美雅",
    updatedAt: "2026-04-06 13:22",
    updatedBy: "王冠勳",
  },
  {
    id: "rev-006",
    revenueNo: "REV-2026-006",
    accountId: "acc-006",
    opportunityId: "opp-011",
    projectId: "proj-006",
    quoteNo: "Q-2026-010-V2",
    orderNo: "SO-2026-035",
    invoiceNo: "INV-2026-059",
    revenueDate: "2026-03-25",
    currencyCode: "TWD",
    revenueAmount: 980000,
    receivedAmount: 980000,
    taxAmount: 46667,
    discountAmount: 10000,
    adjustmentAmount: 0,
    recognizedAmount: 970000,
    settlementStatus: "settled",
    invoiceStatus: "invoiced",
    paymentStatus: "paid",
    paymentTerms: "月結 30 天",
    expectedPaymentAt: "2026-04-22",
    actualPaymentAt: "2026-04-03",
    ownerId: "u-003",
    specialNote: "",
    adjustmentReason: "簽約折讓 10,000。",
    pendingReason: "",
    financeNote: "正常結算完成。",
    systemAlerts: [],
    invoiceRecords: [
      {
        id: "inv-line-005",
        invoiceNo: "INV-2026-059",
        amount: 980000,
        issuedAt: "2026-03-27",
        status: "已開立",
      },
    ],
    paymentRecords: [
      {
        id: "pay-004",
        paymentNo: "PAY-2026-024",
        amount: 980000,
        paidAt: "2026-04-03",
        method: "銀行匯款",
        referenceNo: "TXN-884452",
      },
    ],
    createdAt: "2026-03-25 17:05",
    createdBy: "吳奕承",
    updatedAt: "2026-04-03 14:50",
    updatedBy: "王冠勳",
  },
  {
    id: "rev-007",
    revenueNo: "REV-2026-007",
    accountId: "acc-007",
    opportunityId: "opp-014",
    projectId: "proj-007",
    quoteNo: "Q-2026-007-V1",
    orderNo: "SO-2026-039",
    invoiceNo: "INV-2026-061",
    revenueDate: "2026-03-24",
    currencyCode: "TWD",
    revenueAmount: 1230000,
    receivedAmount: 600000,
    taxAmount: 58571,
    discountAmount: 0,
    adjustmentAmount: 20000,
    recognizedAmount: 1250000,
    settlementStatus: "pending_settlement",
    invoiceStatus: "partially_invoiced",
    paymentStatus: "partial",
    paymentTerms: "驗收後 15 天",
    expectedPaymentAt: "2026-04-16",
    actualPaymentAt: "",
    ownerId: "u-003",
    specialNote: "第二階段驗收尚未完成。",
    adjustmentReason: "追加客服維運工時。",
    pendingReason: "客戶尚未簽認驗收單。",
    financeNote: "待驗收完成後補開剩餘發票。",
    systemAlerts: ["待驗收", "待補開票"],
    invoiceRecords: [
      {
        id: "inv-line-006",
        invoiceNo: "INV-2026-061",
        amount: 620000,
        issuedAt: "2026-03-28",
        status: "已開立",
      },
    ],
    paymentRecords: [
      {
        id: "pay-005",
        paymentNo: "PAY-2026-025",
        amount: 600000,
        paidAt: "2026-04-01",
        method: "銀行匯款",
        referenceNo: "TXN-885002",
      },
    ],
    createdAt: "2026-03-24 13:10",
    createdBy: "吳奕承",
    updatedAt: "2026-04-06 10:35",
    updatedBy: "王冠勳",
  },
  {
    id: "rev-008",
    revenueNo: "REV-2026-008",
    accountId: "acc-008",
    opportunityId: "opp-012",
    projectId: "proj-004",
    quoteNo: "Q-2026-011-V1",
    orderNo: "SO-2026-042",
    invoiceNo: "INV-2026-064",
    revenueDate: "2026-03-22",
    currencyCode: "USD",
    revenueAmount: 1860000,
    receivedAmount: 1860000,
    taxAmount: 0,
    discountAmount: 0,
    adjustmentAmount: 0,
    recognizedAmount: 1860000,
    settlementStatus: "settled",
    invoiceStatus: "invoiced",
    paymentStatus: "paid",
    paymentTerms: "月結 30 天",
    expectedPaymentAt: "2026-04-18",
    actualPaymentAt: "2026-03-31",
    ownerId: "u-004",
    specialNote: "",
    adjustmentReason: "",
    pendingReason: "",
    financeNote: "款項提早到帳。",
    systemAlerts: [],
    invoiceRecords: [
      {
        id: "inv-line-007",
        invoiceNo: "INV-2026-064",
        amount: 1860000,
        issuedAt: "2026-03-23",
        status: "已開立",
      },
    ],
    paymentRecords: [
      {
        id: "pay-006",
        paymentNo: "PAY-2026-026",
        amount: 1860000,
        paidAt: "2026-03-31",
        method: "國際電匯",
        referenceNo: "SWIFT-20508",
      },
    ],
    createdAt: "2026-03-22 11:00",
    createdBy: "田中由紀",
    updatedAt: "2026-03-31 17:08",
    updatedBy: "王冠勳",
  },
  {
    id: "rev-009",
    revenueNo: "REV-2026-009",
    accountId: "acc-009",
    opportunityId: "opp-016",
    projectId: "proj-008",
    quoteNo: "Q-2026-008-V1",
    orderNo: "SO-2026-043",
    invoiceNo: "",
    revenueDate: "2026-03-21",
    currencyCode: "TWD",
    revenueAmount: 630000,
    receivedAmount: 0,
    taxAmount: 30000,
    discountAmount: 0,
    adjustmentAmount: -30000,
    recognizedAmount: 600000,
    settlementStatus: "exception",
    invoiceStatus: "not_invoiced",
    paymentStatus: "unpaid",
    paymentTerms: "專案結案後 30 天",
    expectedPaymentAt: "2026-04-30",
    actualPaymentAt: "",
    ownerId: "u-002",
    specialNote: "專案已取消，需確認是否轉列退款。",
    adjustmentReason: "專案取消，減列收入。",
    pendingReason: "需確認合約違約條款與最終帳務。",
    financeNote: "先列異常，待法務確認後處理。",
    systemAlerts: ["專案狀態異常", "營收調整待確認"],
    invoiceRecords: [],
    paymentRecords: [],
    createdAt: "2026-03-21 09:42",
    createdBy: "陳志昇",
    updatedAt: "2026-04-06 12:14",
    updatedBy: "王冠勳",
  },
  {
    id: "rev-010",
    revenueNo: "REV-2026-010",
    accountId: "acc-010",
    opportunityId: "opp-015",
    projectId: "proj-006",
    quoteNo: "Q-2026-012-V1",
    orderNo: "SO-2026-044",
    invoiceNo: "INV-2026-066",
    revenueDate: "2026-03-20",
    currencyCode: "TWD",
    revenueAmount: 2280000,
    receivedAmount: 2280000,
    taxAmount: 108571,
    discountAmount: 0,
    adjustmentAmount: 0,
    recognizedAmount: 2280000,
    settlementStatus: "settled",
    invoiceStatus: "invoiced",
    paymentStatus: "paid",
    paymentTerms: "月結 30 天",
    expectedPaymentAt: "2026-04-19",
    actualPaymentAt: "2026-04-02",
    ownerId: "u-001",
    specialNote: "",
    adjustmentReason: "",
    pendingReason: "",
    financeNote: "正常結案。",
    systemAlerts: [],
    invoiceRecords: [
      {
        id: "inv-line-008",
        invoiceNo: "INV-2026-066",
        amount: 2280000,
        issuedAt: "2026-03-22",
        status: "已開立",
      },
    ],
    paymentRecords: [
      {
        id: "pay-007",
        paymentNo: "PAY-2026-027",
        amount: 2280000,
        paidAt: "2026-04-02",
        method: "銀行匯款",
        referenceNo: "TXN-885711",
      },
    ],
    createdAt: "2026-03-20 15:18",
    createdBy: "林美雅",
    updatedAt: "2026-04-02 10:52",
    updatedBy: "王冠勳",
  },
  {
    id: "rev-011",
    revenueNo: "REV-2026-011",
    accountId: "acc-011",
    opportunityId: "opp-017",
    projectId: "",
    quoteNo: "Q-2026-013-V1",
    orderNo: "SO-2026-046",
    invoiceNo: "",
    revenueDate: "2026-03-19",
    currencyCode: "TWD",
    revenueAmount: 960000,
    receivedAmount: 0,
    taxAmount: 45714,
    discountAmount: 0,
    adjustmentAmount: 0,
    recognizedAmount: 960000,
    settlementStatus: "pending_review",
    invoiceStatus: "not_invoiced",
    paymentStatus: "unpaid",
    paymentTerms: "預付款 30% / 上線後 70%",
    expectedPaymentAt: "2026-04-15",
    actualPaymentAt: "",
    ownerId: "u-004",
    specialNote: "客戶重整合作條件中。",
    adjustmentReason: "",
    pendingReason: "等待客戶回覆最新付款安排。",
    financeNote: "本筆需持續追蹤。",
    systemAlerts: ["待開票", "待收款"],
    invoiceRecords: [],
    paymentRecords: [],
    createdAt: "2026-03-19 14:20",
    createdBy: "田中由紀",
    updatedAt: "2026-04-06 09:30",
    updatedBy: "王冠勳",
  },
  {
    id: "rev-012",
    revenueNo: "REV-2026-012",
    accountId: "acc-012",
    opportunityId: "opp-018",
    projectId: "",
    quoteNo: "Q-2026-014-V1",
    orderNo: "SO-2026-049",
    invoiceNo: "INV-2026-067",
    revenueDate: "2026-03-18",
    currencyCode: "TWD",
    revenueAmount: 350000,
    receivedAmount: 200000,
    taxAmount: 16667,
    discountAmount: 0,
    adjustmentAmount: 0,
    recognizedAmount: 350000,
    settlementStatus: "partially_settled",
    invoiceStatus: "partially_invoiced",
    paymentStatus: "partial",
    paymentTerms: "月結 30 天",
    expectedPaymentAt: "2026-04-17",
    actualPaymentAt: "",
    ownerId: "u-002",
    specialNote: "首階段內容導流已上線。",
    adjustmentReason: "",
    pendingReason: "待客戶確認第二波投放成效。",
    financeNote: "第二期款預計 4/17 前到帳。",
    systemAlerts: ["尚有未收款"],
    invoiceRecords: [
      {
        id: "inv-line-009",
        invoiceNo: "INV-2026-067",
        amount: 200000,
        issuedAt: "2026-03-20",
        status: "已開立",
      },
    ],
    paymentRecords: [
      {
        id: "pay-008",
        paymentNo: "PAY-2026-028",
        amount: 200000,
        paidAt: "2026-03-28",
        method: "銀行匯款",
        referenceNo: "TXN-885920",
      },
    ],
    createdAt: "2026-03-18 10:08",
    createdBy: "陳志昇",
    updatedAt: "2026-04-06 16:03",
    updatedBy: "王冠勳",
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

function resolveRecord(record) {
  const accountName = accountNameMap.get(record.accountId) || "-";
  const opportunityName = opportunityNameMap.get(record.opportunityId) || "-";
  const projectName = projectNameMap.get(record.projectId) || "-";
  const ownerName = userNameMap.get(record.ownerId) || "未指派";

  const recognizedAmount = Number(
    record.recognizedAmount ??
      Number(record.revenueAmount || 0) -
        Number(record.discountAmount || 0) +
        Number(record.adjustmentAmount || 0)
  );

  const outstandingAmount = Math.max(
    recognizedAmount - Number(record.receivedAmount || 0),
    0
  );

  const isException =
    Boolean(record.isException) ||
    record.settlementStatus === "exception" ||
    record.paymentStatus === "overdue";

  const isPending =
    record.settlementStatus !== "settled" ||
    record.invoiceStatus !== "invoiced" ||
    record.paymentStatus !== "paid";

  return {
    ...record,
    accountName,
    opportunityName,
    projectName,
    ownerName,
    recognizedAmount,
    outstandingAmount,
    isException,
    isPending,
    relatedSummary:
      [
        record.opportunityId ? `商機：${opportunityName}` : "",
        record.projectId ? `專案：${projectName}` : "",
      ]
        .filter(Boolean)
        .join(" / ") || "-",
    quoteOrderSummary:
      [record.quoteNo, record.orderNo].filter(Boolean).join(" / ") || "-",
  };
}

const revenueRecords = ref(seedRecords.map((item) => resolveRecord(item)));

const loading = ref(false);
const filterPanelOpen = ref(false);
const quickTab = ref("all");
const pageSize = ref(10);
const currentPage = ref(1);
const detailDrawerOpen = ref(false);
const activeRecordId = ref("");

const sortState = reactive({
  prop: "updatedAt",
  order: "descending",
});

const filters = reactive({
  keyword: "",
  revenueDateRange: [],
  accountId: "all",
  opportunityId: "all",
  projectId: "all",
  ownerId: "all",
  settlementStatus: "all",
  paymentStatus: "all",
  invoiceStatus: "all",
  onlyException: "all",
  onlyPending: "all",
});

const statusEditor = reactive({
  settlementStatus: "pending_review",
  invoiceStatus: "not_invoiced",
  paymentStatus: "unpaid",
  expectedPaymentAt: "",
  actualPaymentAt: "",
  financeNote: "",
});

const settlementStatusOptions = [
  { value: "all", label: "全部結算狀態" },
  ...Object.entries(settlementStatusMap).map(([value, meta]) => ({
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

const invoiceStatusOptions = [
  { value: "all", label: "全部開票狀態" },
  ...Object.entries(invoiceStatusMap).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

function notify(message, title = "已更新", type = "success") {
  ElNotification({ title, message, type, position: "top-right" });
}

function isDateWithinRange(value, range) {
  const [start, end] = range || [];
  if (!start || !end) {
    return true;
  }

  const current = toTimestamp(value);
  return (
    current >= toTimestamp(start) && current <= toTimestamp(end) + 24 * 60 * 60 * 1000 - 1
  );
}

const tabCounts = computed(() => {
  const list = revenueRecords.value;

  return {
    all: list.length,
    unsettled: list.filter((item) => item.settlementStatus !== "settled").length,
    unpaid: list.filter((item) => item.paymentStatus !== "paid").length,
    pending_invoice: list.filter((item) => item.invoiceStatus !== "invoiced").length,
    exception: list.filter((item) => item.isException || item.isPending).length,
    settled: list.filter((item) => item.settlementStatus === "settled").length,
  };
});

const filteredRecords = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return revenueRecords.value.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      item.revenueNo.toLowerCase().includes(keyword) ||
      item.accountName.toLowerCase().includes(keyword) ||
      item.opportunityName.toLowerCase().includes(keyword) ||
      item.projectName.toLowerCase().includes(keyword) ||
      item.quoteNo.toLowerCase().includes(keyword) ||
      item.orderNo.toLowerCase().includes(keyword) ||
      item.invoiceNo.toLowerCase().includes(keyword) ||
      String(item.financeNote || "")
        .toLowerCase()
        .includes(keyword) ||
      String(item.pendingReason || "")
        .toLowerCase()
        .includes(keyword);

    const matchesDateRange = isDateWithinRange(
      item.revenueDate,
      filters.revenueDateRange
    );
    const matchesAccount =
      filters.accountId === "all" || item.accountId === filters.accountId;
    const matchesOpportunity =
      filters.opportunityId === "all" || item.opportunityId === filters.opportunityId;
    const matchesProject =
      filters.projectId === "all" || item.projectId === filters.projectId;
    const matchesOwner = filters.ownerId === "all" || item.ownerId === filters.ownerId;
    const matchesSettlement =
      filters.settlementStatus === "all" ||
      item.settlementStatus === filters.settlementStatus;
    const matchesPayment =
      filters.paymentStatus === "all" || item.paymentStatus === filters.paymentStatus;
    const matchesInvoice =
      filters.invoiceStatus === "all" || item.invoiceStatus === filters.invoiceStatus;
    const matchesException =
      filters.onlyException === "all" ||
      (filters.onlyException === "yes" ? item.isException : !item.isException);
    const matchesPending =
      filters.onlyPending === "all" ||
      (filters.onlyPending === "yes" ? item.isPending : !item.isPending);

    const matchesTab =
      quickTab.value === "all" ||
      (quickTab.value === "unsettled" && item.settlementStatus !== "settled") ||
      (quickTab.value === "unpaid" && item.paymentStatus !== "paid") ||
      (quickTab.value === "pending_invoice" && item.invoiceStatus !== "invoiced") ||
      (quickTab.value === "exception" && (item.isException || item.isPending)) ||
      (quickTab.value === "settled" && item.settlementStatus === "settled");

    return (
      matchesKeyword &&
      matchesDateRange &&
      matchesAccount &&
      matchesOpportunity &&
      matchesProject &&
      matchesOwner &&
      matchesSettlement &&
      matchesPayment &&
      matchesInvoice &&
      matchesException &&
      matchesPending &&
      matchesTab
    );
  });
});

const sortedRecords = computed(() => {
  const result = [...filteredRecords.value];
  const direction = sortState.order === "ascending" ? 1 : -1;

  return result.sort((a, b) => {
    if (["revenueDate", "updatedAt"].includes(sortState.prop)) {
      return (
        (toTimestamp(a[sortState.prop]) - toTimestamp(b[sortState.prop])) * direction
      );
    }

    if (
      ["revenueAmount", "receivedAmount", "outstandingAmount"].includes(sortState.prop)
    ) {
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

  const totalRevenue = list.reduce(
    (sum, item) => sum + Number(item.recognizedAmount || 0),
    0
  );
  const settledAmount = list
    .filter((item) => item.settlementStatus === "settled")
    .reduce((sum, item) => sum + Number(item.recognizedAmount || 0), 0);
  const unsettledAmount = Math.max(totalRevenue - settledAmount, 0);

  const receivedAmount = list.reduce(
    (sum, item) => sum + Number(item.receivedAmount || 0),
    0
  );
  const outstandingAmount = list.reduce(
    (sum, item) => sum + Number(item.outstandingAmount || 0),
    0
  );

  const pendingInvoiceAmount = list
    .filter((item) => item.invoiceStatus !== "invoiced")
    .reduce((sum, item) => sum + Number(item.outstandingAmount || 0), 0);

  const alertCount = list.filter((item) => item.isException || item.isPending).length;

  return [
    { label: "本期營收總額", value: formatCurrency(totalRevenue) },
    { label: "已結算金額", value: formatCurrency(settledAmount) },
    { label: "未結算金額", value: formatCurrency(unsettledAmount) },
    { label: "已收款金額", value: formatCurrency(receivedAmount) },
    { label: "未收款金額", value: formatCurrency(outstandingAmount) },
    { label: "待開票金額", value: formatCurrency(pendingInvoiceAmount) },
    { label: "異常 / 待處理筆數", value: `${alertCount} 筆` },
  ];
});

const activeRecord = computed(
  () => revenueRecords.value.find((item) => item.id === activeRecordId.value) || null
);

function handleSortChange({ prop, order }) {
  sortState.prop = prop || "updatedAt";
  sortState.order = order || "descending";
}

function resetFilters() {
  filters.keyword = "";
  filters.revenueDateRange = [];
  filters.accountId = "all";
  filters.opportunityId = "all";
  filters.projectId = "all";
  filters.ownerId = "all";
  filters.settlementStatus = "all";
  filters.paymentStatus = "all";
  filters.invoiceStatus = "all";
  filters.onlyException = "all";
  filters.onlyPending = "all";
  quickTab.value = "all";
  currentPage.value = 1;
}

function openDetail(record) {
  activeRecordId.value = record.id;
  detailDrawerOpen.value = true;
}

function syncStatusEditor(record) {
  if (!record) {
    return;
  }

  statusEditor.settlementStatus = record.settlementStatus;
  statusEditor.invoiceStatus = record.invoiceStatus;
  statusEditor.paymentStatus = record.paymentStatus;
  statusEditor.expectedPaymentAt = record.expectedPaymentAt || "";
  statusEditor.actualPaymentAt = record.actualPaymentAt || "";
  statusEditor.financeNote = record.financeNote || "";
}

function getNowDateTimeString() {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return formatter.format(new Date()).replace("T", " ");
}

function patchRecord(recordId, patch) {
  const index = revenueRecords.value.findIndex((item) => item.id === recordId);
  if (index < 0) {
    return null;
  }

  const merged = {
    ...revenueRecords.value[index],
    ...patch,
    updatedAt: getNowDateTimeString(),
    updatedBy: statusEditorOwner,
  };

  const next = resolveRecord(merged);
  revenueRecords.value.splice(index, 1, next);
  return next;
}

function saveStatusUpdate() {
  const record = activeRecord.value;
  if (!record) {
    return;
  }

  const next = patchRecord(record.id, {
    settlementStatus: statusEditor.settlementStatus,
    invoiceStatus: statusEditor.invoiceStatus,
    paymentStatus: statusEditor.paymentStatus,
    expectedPaymentAt: statusEditor.expectedPaymentAt,
    actualPaymentAt: statusEditor.actualPaymentAt,
    financeNote: statusEditor.financeNote.trim(),
  });

  if (!next) {
    notify("儲存失敗", "錯誤", "error");
    return;
  }

  syncStatusEditor(next);
  notify(`${next.revenueNo} 已更新`);
}

function exportCsv() {
  const header = [
    "營收編號",
    "客戶名稱",
    "關聯商機 / 專案",
    "關聯報價 / 訂單",
    "營收日期",
    "營收金額",
    "已收金額",
    "未收金額",
    "開票狀態",
    "收款狀態",
    "結算狀態",
    "負責業務",
    "更新時間",
  ];

  const rows = sortedRecords.value.map((item) => [
    item.revenueNo,
    item.accountName,
    item.relatedSummary,
    item.quoteOrderSummary,
    item.revenueDate,
    item.revenueAmount,
    item.receivedAmount,
    item.outstandingAmount,
    invoiceStatusMap[item.invoiceStatus]?.label || item.invoiceStatus,
    paymentStatusMap[item.paymentStatus]?.label || item.paymentStatus,
    settlementStatusMap[item.settlementStatus]?.label || item.settlementStatus,
    item.ownerName,
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
  anchor.download = `revenue-records-${new Date().toISOString().slice(0, 10)}.csv`;
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
    syncStatusEditor(record);
  },
  { immediate: true }
);

watch(
  () => [
    filteredRecords.value.length,
    pageSize.value,
    quickTab.value,
    filters.keyword,
    filters.accountId,
    filters.opportunityId,
    filters.projectId,
    filters.ownerId,
    filters.settlementStatus,
    filters.paymentStatus,
    filters.invoiceStatus,
    filters.onlyException,
    filters.onlyPending,
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
            營收資料
          </h1>
          <p class="text-sm text-slate-500">
            集中查看營收、結算、開票與收款狀態，支援來源追溯與異常追查
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton :icon="Download" @click="exportCsv">匯出</ElButton>
        </div>
      </header>

      <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
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
              placeholder="搜尋編號 / 客戶 / 商機 / 專案 / 報價 / 訂單"
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
                v-model="filters.revenueDateRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                start-placeholder="營收起日"
                end-placeholder="營收迄日"
                class="!w-full"
              />
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.accountId">
                <ElOption
                  v-for="item in accountOptions"
                  :key="`acc-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.opportunityId">
                <ElOption
                  v-for="item in opportunityOptions"
                  :key="`opp-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.projectId">
                <ElOption
                  v-for="item in projectOptions"
                  :key="`proj-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.ownerId">
                <ElOption
                  v-for="item in ownerOptions"
                  :key="`owner-${item.value}`"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.settlementStatus">
                <ElOption
                  v-for="item in settlementStatusOptions"
                  :key="`settlement-${item.value}`"
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
              <ElSelect v-model="filters.onlyPending">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`pending-${item.value}`"
                  :label="`只看待處理：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </transition>

        <div class="border-t border-slate-200 px-6 pt-3">
          <ElTabs v-model="quickTab" class="revenue-tabs">
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
            label="營收編號"
            min-width="180"
            sortable="custom"
            prop="revenueNo"
          >
            <template #default="{ row }">
              <button type="button" class="grid gap-1 text-left" @click="openDetail(row)">
                <span class="font-semibold text-[#303133] hover:text-[#409eff]">{{
                  row.revenueNo
                }}</span>
                <span class="text-xs text-slate-500">{{ row.quoteOrderSummary }}</span>
                <div class="flex flex-wrap gap-1">
                  <ElTag v-if="row.isException" size="small" type="danger" effect="light"
                    >異常</ElTag
                  >
                  <ElTag v-if="row.isPending" size="small" type="warning" effect="light"
                    >待處理</ElTag
                  >
                </div>
              </button>
            </template>
          </ElTableColumn>

          <ElTableColumn label="客戶名稱" min-width="190" show-overflow-tooltip>
            <template #default="{ row }">{{ row.accountName }}</template>
          </ElTableColumn>

          <ElTableColumn label="關聯商機 / 專案" min-width="260" show-overflow-tooltip>
            <template #default="{ row }">{{ row.relatedSummary }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="營收日期"
            min-width="130"
            sortable="custom"
            prop="revenueDate"
          >
            <template #default="{ row }">{{ formatDate(row.revenueDate) }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="營收金額"
            min-width="140"
            sortable="custom"
            prop="revenueAmount"
            align="right"
          >
            <template #default="{ row }">{{
              formatCurrency(row.revenueAmount, row.currencyCode)
            }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="已收金額"
            min-width="140"
            sortable="custom"
            prop="receivedAmount"
            align="right"
          >
            <template #default="{ row }">{{
              formatCurrency(row.receivedAmount, row.currencyCode)
            }}</template>
          </ElTableColumn>

          <ElTableColumn
            label="未收金額"
            min-width="140"
            sortable="custom"
            prop="outstandingAmount"
            align="right"
          >
            <template #default="{ row }">
              <span :class="row.outstandingAmount > 0 ? 'font-medium text-rose-600' : ''">
                {{ formatCurrency(row.outstandingAmount, row.currencyCode) }}
              </span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="開票狀態" min-width="130">
            <template #default="{ row }">
              {{ invoiceStatusMap[row.invoiceStatus]?.label || row.invoiceStatus }}
            </template>
          </ElTableColumn>

          <ElTableColumn label="收款狀態" min-width="130">
            <template #default="{ row }">
              {{ paymentStatusMap[row.paymentStatus]?.label || row.paymentStatus }}
            </template>
          </ElTableColumn>

          <ElTableColumn label="結算狀態" min-width="130">
            <template #default="{ row }">
              <ElTag
                :type="settlementStatusMap[row.settlementStatus]?.type"
                size="small"
                effect="light"
              >
                {{
                  settlementStatusMap[row.settlementStatus]?.label || row.settlementStatus
                }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="負責業務" min-width="120">
            <template #default="{ row }">{{ row.ownerName }}</template>
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
      :destroy-on-close="false"
      title="營收資料詳情"
    >
      <template v-if="activeRecord">
        <section class="grid gap-4">
          <header class="grid gap-2">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="grid gap-2">
                <h2 class="text-xl font-semibold text-slate-900">
                  {{ activeRecord.revenueNo }}
                </h2>
                <p class="text-sm text-slate-600">{{ activeRecord.accountName }}</p>
                <div class="flex flex-wrap items-center gap-2">
                  <ElTag
                    :type="settlementStatusMap[activeRecord.settlementStatus]?.type"
                    effect="light"
                  >
                    {{ settlementStatusMap[activeRecord.settlementStatus]?.label }}
                  </ElTag>
                  <ElTag
                    :type="invoiceStatusMap[activeRecord.invoiceStatus]?.type"
                    effect="light"
                  >
                    {{ invoiceStatusMap[activeRecord.invoiceStatus]?.label }}
                  </ElTag>
                  <ElTag
                    :type="paymentStatusMap[activeRecord.paymentStatus]?.type"
                    effect="light"
                  >
                    {{ paymentStatusMap[activeRecord.paymentStatus]?.label }}
                  </ElTag>
                  <ElTag v-if="activeRecord.isException" type="danger" effect="light"
                    >異常</ElTag
                  >
                </div>
              </div>

              <div class="text-right">
                <p class="text-xs text-slate-500">實際認列金額</p>
                <p class="text-xl font-semibold text-slate-900">
                  {{
                    formatCurrency(
                      activeRecord.recognizedAmount,
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
              <ElDescriptionsItem label="營收編號">{{
                activeRecord.revenueNo
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="客戶名稱">{{
                activeRecord.accountName
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="關聯商機">{{
                activeRecord.opportunityName || "-"
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="關聯專案">{{
                activeRecord.projectName || "-"
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="關聯報價">{{
                activeRecord.quoteNo || "-"
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="關聯訂單">{{
                activeRecord.orderNo || "-"
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="營收日期">{{
                formatDate(activeRecord.revenueDate)
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="負責業務">{{
                activeRecord.ownerName
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="建立時間">{{
                formatDateTime(activeRecord.createdAt)
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="最後更新">{{
                formatDateTime(activeRecord.updatedAt)
              }}</ElDescriptionsItem>
            </ElDescriptions>

            <div class="mt-3 flex flex-wrap gap-2">
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
            </div>
          </ElCard>

          <ElCard shadow="never">
            <template #header
              ><span class="text-sm font-semibold text-slate-800"
                >金額資訊</span
              ></template
            >
            <ElDescriptions :column="2" border>
              <ElDescriptionsItem label="總營收金額">
                {{
                  formatCurrency(activeRecord.revenueAmount, activeRecord.currencyCode)
                }}
              </ElDescriptionsItem>
              <ElDescriptionsItem label="實際認列金額">
                {{
                  formatCurrency(activeRecord.recognizedAmount, activeRecord.currencyCode)
                }}
              </ElDescriptionsItem>
              <ElDescriptionsItem label="已收金額">
                {{
                  formatCurrency(activeRecord.receivedAmount, activeRecord.currencyCode)
                }}
              </ElDescriptionsItem>
              <ElDescriptionsItem label="未收金額">
                <span
                  :class="
                    activeRecord.outstandingAmount > 0 ? 'font-medium text-rose-600' : ''
                  "
                >
                  {{
                    formatCurrency(
                      activeRecord.outstandingAmount,
                      activeRecord.currencyCode
                    )
                  }}
                </span>
              </ElDescriptionsItem>
              <ElDescriptionsItem label="稅額">
                {{ formatCurrency(activeRecord.taxAmount, activeRecord.currencyCode) }}
              </ElDescriptionsItem>
              <ElDescriptionsItem label="折讓 / 調整">
                {{
                  formatCurrency(activeRecord.discountAmount, activeRecord.currencyCode)
                }}
                /
                {{
                  formatCurrency(activeRecord.adjustmentAmount, activeRecord.currencyCode)
                }}
              </ElDescriptionsItem>
            </ElDescriptions>
          </ElCard>

          <ElCard shadow="never">
            <template #header
              ><span class="text-sm font-semibold text-slate-800"
                >財務狀態</span
              ></template
            >
            <ElForm label-position="top" class="grid gap-3">
              <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <ElFormItem label="結算狀態">
                  <ElSelect v-model="statusEditor.settlementStatus">
                    <ElOption
                      v-for="(meta, key) in settlementStatusMap"
                      :key="`edit-settlement-${key}`"
                      :label="meta.label"
                      :value="key"
                    />
                  </ElSelect>
                </ElFormItem>
                <ElFormItem label="開票狀態">
                  <ElSelect v-model="statusEditor.invoiceStatus">
                    <ElOption
                      v-for="(meta, key) in invoiceStatusMap"
                      :key="`edit-invoice-${key}`"
                      :label="meta.label"
                      :value="key"
                    />
                  </ElSelect>
                </ElFormItem>
                <ElFormItem label="收款狀態">
                  <ElSelect v-model="statusEditor.paymentStatus">
                    <ElOption
                      v-for="(meta, key) in paymentStatusMap"
                      :key="`edit-payment-${key}`"
                      :label="meta.label"
                      :value="key"
                    />
                  </ElSelect>
                </ElFormItem>
                <ElFormItem label="付款條件">
                  <ElInput :model-value="activeRecord.paymentTerms" readonly />
                </ElFormItem>
                <ElFormItem label="預計收款日">
                  <ElDatePicker
                    v-model="statusEditor.expectedPaymentAt"
                    type="date"
                    value-format="YYYY-MM-DD"
                    class="!w-full"
                  />
                </ElFormItem>
                <ElFormItem label="實際收款日">
                  <ElDatePicker
                    v-model="statusEditor.actualPaymentAt"
                    type="date"
                    value-format="YYYY-MM-DD"
                    class="!w-full"
                  />
                </ElFormItem>
              </div>

              <ElFormItem label="財務備註">
                <ElInput v-model="statusEditor.financeNote" type="textarea" :rows="2" />
              </ElFormItem>

              <div class="flex justify-end border-t border-slate-200 pt-3">
                <ElButton type="primary" @click="saveStatusUpdate">儲存狀態更新</ElButton>
              </div>
            </ElForm>
          </ElCard>

          <ElCard shadow="never">
            <template #header
              ><span class="text-sm font-semibold text-slate-800"
                >關聯資料</span
              ></template
            >
            <div class="grid gap-3">
              <article class="rounded-xl border border-slate-200 p-3">
                <p class="text-sm font-medium text-slate-800">發票紀錄</p>
                <div
                  v-if="activeRecord.invoiceRecords.length > 0"
                  class="mt-2 grid gap-2"
                >
                  <div
                    v-for="line in activeRecord.invoiceRecords"
                    :key="line.id"
                    class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600"
                  >
                    <span>{{ line.invoiceNo }} / {{ formatDate(line.issuedAt) }}</span>
                    <span
                      >{{ formatCurrency(line.amount, activeRecord.currencyCode) }} /
                      {{ line.status }}</span
                    >
                  </div>
                </div>
                <p v-else class="mt-2 text-xs text-slate-500">-</p>
              </article>

              <article class="rounded-xl border border-slate-200 p-3">
                <p class="text-sm font-medium text-slate-800">收款紀錄</p>
                <div
                  v-if="activeRecord.paymentRecords.length > 0"
                  class="mt-2 grid gap-2"
                >
                  <div
                    v-for="line in activeRecord.paymentRecords"
                    :key="line.id"
                    class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600"
                  >
                    <span>{{ line.paymentNo }} / {{ formatDate(line.paidAt) }}</span>
                    <span
                      >{{ formatCurrency(line.amount, activeRecord.currencyCode) }} /
                      {{ line.method }}</span
                    >
                  </div>
                </div>
                <p v-else class="mt-2 text-xs text-slate-500">-</p>
              </article>
            </div>
          </ElCard>

          <ElCard shadow="never">
            <template #header
              ><span class="text-sm font-semibold text-slate-800"
                >備註 / 異常資訊</span
              ></template
            >
            <div class="grid gap-3 text-sm text-slate-700">
              <div>
                <p class="text-xs text-slate-500">特殊說明</p>
                <p>{{ activeRecord.specialNote || "-" }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500">調整原因</p>
                <p>{{ activeRecord.adjustmentReason || "-" }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500">未完成原因</p>
                <p>{{ activeRecord.pendingReason || "-" }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500">財務備註</p>
                <p>{{ activeRecord.financeNote || "-" }}</p>
              </div>

              <div>
                <p class="text-xs text-slate-500">系統警示</p>
                <div class="mt-1 flex flex-wrap gap-1">
                  <ElTag
                    v-for="(warning, index) in activeRecord.systemAlerts"
                    :key="`${activeRecord.id}-warning-${index}`"
                    size="small"
                    type="danger"
                    effect="light"
                  >
                    {{ warning }}
                  </ElTag>
                  <span
                    v-if="activeRecord.systemAlerts.length === 0"
                    class="text-sm text-slate-600"
                    >-</span
                  >
                </div>
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

.revenue-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}
</style>
