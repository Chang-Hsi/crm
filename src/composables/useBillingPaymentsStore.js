import { computed, reactive } from "vue";
import { accountList } from "../data/accounts";
import { opportunityList } from "../data/opportunities";
import { projectList } from "../data/projects";
import { userList } from "../data/users";

const documentTypeMap = {
  invoice: { label: "發票", type: "primary" },
  receivable: { label: "收款", type: "success" },
  payable: { label: "付款", type: "warning" },
};

const invoiceTypeMap = {
  electronic: { label: "電子發票" },
  triplicate: { label: "三聯式" },
  duplicate: { label: "二聯式" },
  allowance: { label: "折讓單" },
};

const invoiceStatusMap = {
  pending_issue: { label: "待開立", type: "warning" },
  issued: { label: "已開立", type: "success" },
  voided: { label: "作廢", type: "info" },
  crediting: { label: "折讓中", type: "warning" },
  credited: { label: "已折讓", type: "primary" },
  pending_reissue: { label: "待重開", type: "danger" },
  reissued: { label: "已重開", type: "success" },
};

const receivableStatusMap = {
  pending: { label: "待收款", type: "warning" },
  partial: { label: "部分收款", type: "primary" },
  paid: { label: "已收款", type: "success" },
  overdue: { label: "逾期未收", type: "danger" },
  exception: { label: "收款異常", type: "danger" },
  not_applicable: { label: "不適用", type: "info" },
};

const payableStatusMap = {
  pending: { label: "待付款", type: "warning" },
  partial: { label: "部分付款", type: "primary" },
  paid: { label: "已付款", type: "success" },
  overdue: { label: "逾期未付", type: "danger" },
  exception: { label: "付款異常", type: "danger" },
  not_applicable: { label: "不適用", type: "info" },
};

const attachmentCategoryOptions = [
  { value: "invoice", label: "發票檔" },
  { value: "receipt", label: "收款證明" },
  { value: "payment", label: "付款憑證" },
  { value: "credit", label: "折讓 / 作廢" },
  { value: "other", label: "其他" },
];

const transactionMethodOptions = [
  "銀行匯款",
  "線上金流",
  "票據",
  "信用卡",
  "現金",
  "其他",
];

const accountNameMap = new Map(accountList.map((item) => [item.id, item.companyName]));
const opportunityNameMap = new Map(opportunityList.map((item) => [item.id, item.name]));
const projectNameMap = new Map(projectList.map((item) => [item.id, item.projectName]));
const userNameMap = new Map(userList.map((item) => [item.id, item.name]));

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

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

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

function createActivity(payload = {}) {
  return {
    id: payload.id || `bp-activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: payload.title || "資料更新",
    description: payload.description || "",
    actorName: payload.actorName || "系統管理員",
    occurredAt: payload.occurredAt || nowDateTimeText(),
  };
}

function createTransactionLine(payload = {}, type = "receive") {
  const prefix = type === "pay" ? "PAY" : "RCV";

  return {
    id: payload.id || `${prefix.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    no:
      payload.no ||
      `${prefix}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0")}`,
    amount: Number(payload.amount || 0),
    handledAt: payload.handledAt || todayText(),
    method: payload.method || "銀行匯款",
    referenceNo: payload.referenceNo || "",
    note: payload.note || "",
  };
}

function generateMockImageDataUri(seed = "sample") {
  const colors = ["#dbeafe", "#fef3c7", "#dcfce7", "#fee2e2", "#ede9fe", "#cffafe"];
  const index = Math.abs(
    Array.from(String(seed)).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % colors.length;
  const background = colors[index];
  const text = encodeURIComponent(`Mock Preview ${String(seed).slice(-4)}`);

  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='720' height='420'>
      <rect width='720' height='420' fill='${background}'/>
      <rect x='42' y='42' width='636' height='336' rx='18' fill='white' stroke='#cbd5e1' stroke-width='3'/>
      <rect x='78' y='88' width='200' height='26' rx='8' fill='#e2e8f0'/>
      <rect x='78' y='132' width='560' height='18' rx='6' fill='#e2e8f0'/>
      <rect x='78' y='162' width='430' height='18' rx='6' fill='#e2e8f0'/>
      <rect x='78' y='232' width='280' height='18' rx='6' fill='#e2e8f0'/>
      <rect x='78' y='262' width='210' height='18' rx='6' fill='#e2e8f0'/>
      <text x='78' y='330' font-size='26' fill='#475569' font-family='Arial, sans-serif'>${text}</text>
    </svg>`
  )}`;
}

function createEmptyPreviewUrl(mimeType = "application/pdf") {
  const blob = new Blob([""], { type: mimeType });
  return URL.createObjectURL(blob);
}

function createAttachment(payload = {}) {
  const isImage = Boolean(payload.isImage || String(payload.mimeType || "").startsWith("image/"));

  return {
    id: payload.id || `bp-att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: payload.name || "未命名附件",
    category: payload.category || "other",
    mimeType: payload.mimeType || (isImage ? "image/png" : "application/pdf"),
    size: Number(payload.size || 0),
    uploadedAt: payload.uploadedAt || nowDateTimeText(),
    uploaderName: payload.uploaderName || "系統管理員",
    isImage,
    previewUrl:
      payload.previewUrl ||
      (isImage ? generateMockImageDataUri(payload.id || payload.name) : createEmptyPreviewUrl(payload.mimeType)),
  };
}

function updateStatusesByAmount(record) {
  const receiveExpected = Number(record.expectedReceiveAmount || 0);
  const received = Number(record.receivedAmount || 0);
  const receiveOutstanding = Math.max(receiveExpected - received, 0);

  const payExpected = Number(record.expectedPayAmount || 0);
  const paid = Number(record.paidAmount || 0);
  const payOutstanding = Math.max(payExpected - paid, 0);

  const now = Date.now();
  const receiveDue = toTimestamp(record.dueReceiveAt);
  const payDue = toTimestamp(record.duePayAt);
  const isReceiveOverdue = receiveOutstanding > 0 && receiveDue > 0 && receiveDue < now;
  const isPayOverdue = payOutstanding > 0 && payDue > 0 && payDue < now;

  record.outstandingReceiveAmount = receiveOutstanding;
  record.outstandingPayAmount = payOutstanding;
  record.isReceiveOverdue = isReceiveOverdue;
  record.isPayOverdue = isPayOverdue;

  if (record.receivableStatus !== "exception") {
    if (receiveExpected <= 0) {
      record.receivableStatus = "not_applicable";
    } else if (receiveOutstanding <= 0) {
      record.receivableStatus = "paid";
    } else if (received > 0) {
      record.receivableStatus = isReceiveOverdue ? "overdue" : "partial";
    } else {
      record.receivableStatus = isReceiveOverdue ? "overdue" : "pending";
    }
  }

  if (record.payableStatus !== "exception") {
    if (payExpected <= 0) {
      record.payableStatus = "not_applicable";
    } else if (payOutstanding <= 0) {
      record.payableStatus = "paid";
    } else if (paid > 0) {
      record.payableStatus = isPayOverdue ? "overdue" : "partial";
    } else {
      record.payableStatus = isPayOverdue ? "overdue" : "pending";
    }
  }
}

function updateAlerts(record) {
  const alerts = [];

  if (record.isReceiveOverdue) {
    alerts.push("逾期未收");
  }

  if (record.isPayOverdue) {
    alerts.push("逾期未付");
  }

  if (["issued", "reissued"].includes(record.invoiceStatus) && record.outstandingReceiveAmount > 0) {
    alerts.push("發票已開但尚未收款");
  }

  if (record.invoiceStatus === "credited" && record.outstandingReceiveAmount > 0) {
    alerts.push("折讓後未同步");
  }

  if (record.invoiceStatus === "voided" && (record.receivedAmount > 0 || record.paidAmount > 0)) {
    alerts.push("作廢後仍有關聯");
  }

  if (
    Math.abs(
      Number(record.invoiceAmount || 0) -
        Number(record.expectedReceiveAmount || 0) -
        Number(record.expectedPayAmount || 0)
    ) > 1
  ) {
    alerts.push("金額不一致");
  }

  record.systemAlerts = alerts;
}

function normalizeRecord(raw) {
  const record = {
    receiveRecords: [],
    payRecords: [],
    attachments: [],
    activities: [],
    invoiceChangeType: "none",
    invoiceType: "electronic",
    invoiceStatus: "pending_issue",
    receivableStatus: "pending",
    payableStatus: "not_applicable",
    taxAmount: 0,
    paidAmount: 0,
    receivedAmount: 0,
    expectedPayAmount: 0,
    expectedReceiveAmount: 0,
    isException: false,
    exceptionReason: "",
    ...raw,
  };

  record.invoiceAmount = Number(record.invoiceAmount || 0);
  record.taxAmount = Number(record.taxAmount || 0);
  record.untaxedAmount =
    typeof record.untaxedAmount === "number"
      ? Number(record.untaxedAmount || 0)
      : Math.max(record.invoiceAmount - record.taxAmount, 0);

  record.expectedReceiveAmount = Number(record.expectedReceiveAmount || 0);
  record.receivedAmount = Number(record.receivedAmount || 0);
  record.expectedPayAmount = Number(record.expectedPayAmount || 0);
  record.paidAmount = Number(record.paidAmount || 0);

  record.accountName = accountNameMap.get(record.accountId) || "-";
  record.opportunityName = opportunityNameMap.get(record.opportunityId) || "-";
  record.projectName = projectNameMap.get(record.projectId) || "-";
  record.ownerName = userNameMap.get(record.ownerId) || "未指派";

  record.receiveRecords = (record.receiveRecords || []).map((item) =>
    createTransactionLine(item, "receive")
  );
  record.payRecords = (record.payRecords || []).map((item) =>
    createTransactionLine(item, "pay")
  );
  record.attachments = (record.attachments || []).map((item) => createAttachment(item));
  record.activities = (record.activities || []).map((item) => createActivity(item));

  updateStatusesByAmount(record);
  updateAlerts(record);

  record.isException =
    Boolean(record.isException) ||
    Boolean(record.exceptionReason) ||
    record.receivableStatus === "exception" ||
    record.payableStatus === "exception" ||
    record.systemAlerts.length > 0;

  return record;
}

const seedRecords = [
  {
    id: "bp-001",
    documentNo: "BP-2026-0001",
    documentType: "invoice",
    invoiceNo: "INV-2026-101",
    invoiceType: "electronic",
    invoiceDate: "2026-03-26",
    invoiceAmount: 1820000,
    taxAmount: 86667,
    invoiceStatus: "issued",
    accountId: "acc-001",
    opportunityId: "opp-001",
    projectId: "proj-001",
    ownerId: "u-001",
    revenueNo: "REV-2026-001",
    reconciliationNo: "REC-2026-001",
    orderNo: "SO-2026-015",
    contractNo: "CTM-2026-001",
    quoteNo: "Q-2026-001-V1",
    expectedReceiveAmount: 1820000,
    receivedAmount: 1200000,
    dueReceiveAt: "2026-04-25",
    lastReceivedAt: "2026-04-01",
    expectedPayAmount: 0,
    paidAmount: 0,
    duePayAt: "",
    lastPaidAt: "",
    notes: "客戶分兩期付款，第二期待 KPI 驗收後支付。",
    createdAt: "2026-03-26 10:10",
    createdBy: "林美雅",
    updatedAt: "2026-04-04 17:35",
    updatedBy: "王冠勳",
    receiveRecords: [
      {
        id: "bp-r-001",
        no: "RCV-2026-0101",
        amount: 1200000,
        handledAt: "2026-04-01",
        method: "銀行匯款",
        referenceNo: "TXN-901118",
        note: "第一期款",
      },
    ],
    attachments: [
      {
        id: "bp-att-001",
        name: "invoice-INV-2026-101.png",
        category: "invoice",
        mimeType: "image/png",
        isImage: true,
        uploadedAt: "2026-03-26 10:15",
        uploaderName: "林美雅",
      },
      {
        id: "bp-att-002",
        name: "付款通知-四月.pdf",
        category: "receipt",
        mimeType: "application/pdf",
        isImage: false,
        uploadedAt: "2026-04-01 14:20",
        uploaderName: "王冠勳",
      },
    ],
    activities: [
      {
        id: "bp-act-001",
        occurredAt: "2026-04-04 17:35",
        title: "收款進度更新",
        description: "已收第一期款 1,200,000。",
        actorName: "王冠勳",
      },
      {
        id: "bp-act-002",
        occurredAt: "2026-03-26 10:12",
        title: "發票開立",
        description: "已建立發票 INV-2026-101。",
        actorName: "林美雅",
      },
    ],
  },
  {
    id: "bp-002",
    documentNo: "BP-2026-0002",
    documentType: "invoice",
    invoiceNo: "",
    invoiceType: "electronic",
    invoiceDate: "",
    invoiceAmount: 950000,
    taxAmount: 45238,
    invoiceStatus: "pending_issue",
    accountId: "acc-002",
    opportunityId: "opp-004",
    projectId: "proj-002",
    ownerId: "u-002",
    revenueNo: "REV-2026-002",
    reconciliationNo: "REC-2026-002",
    orderNo: "SO-2026-021",
    contractNo: "CTM-2026-003",
    quoteNo: "Q-2026-003-V1",
    expectedReceiveAmount: 950000,
    receivedAmount: 0,
    dueReceiveAt: "2026-05-08",
    lastReceivedAt: "",
    expectedPayAmount: 0,
    paidAmount: 0,
    duePayAt: "",
    lastPaidAt: "",
    notes: "待法務確認附約後開票。",
    createdAt: "2026-03-29 09:40",
    createdBy: "陳志昇",
    updatedAt: "2026-04-05 15:20",
    updatedBy: "王冠勳",
    activities: [
      {
        id: "bp-act-010",
        occurredAt: "2026-04-05 15:20",
        title: "維持待開立",
        description: "附約仍待客戶簽回。",
        actorName: "王冠勳",
      },
    ],
  },
  {
    id: "bp-003",
    documentNo: "BP-2026-0003",
    documentType: "payable",
    invoiceNo: "PINV-2026-055",
    invoiceType: "triplicate",
    invoiceDate: "2026-03-25",
    invoiceAmount: 680000,
    taxAmount: 32381,
    invoiceStatus: "issued",
    accountId: "acc-003",
    opportunityId: "opp-006",
    projectId: "proj-003",
    ownerId: "u-005",
    revenueNo: "REV-2026-003",
    reconciliationNo: "REC-2026-003",
    orderNo: "SO-2026-026",
    contractNo: "CTM-2026-008",
    quoteNo: "Q-2026-009-V1",
    expectedReceiveAmount: 0,
    receivedAmount: 0,
    dueReceiveAt: "",
    lastReceivedAt: "",
    expectedPayAmount: 680000,
    paidAmount: 300000,
    duePayAt: "2026-04-10",
    lastPaidAt: "2026-03-31",
    notes: "分潤夥伴採兩次撥付。",
    createdAt: "2026-03-25 14:20",
    createdBy: "王冠勳",
    updatedAt: "2026-04-02 12:28",
    updatedBy: "王冠勳",
    payRecords: [
      {
        id: "bp-p-001",
        no: "PAY-2026-0221",
        amount: 300000,
        handledAt: "2026-03-31",
        method: "銀行匯款",
        referenceNo: "TXN-771022",
        note: "第一期",
      },
    ],
    activities: [
      {
        id: "bp-act-020",
        occurredAt: "2026-04-02 12:28",
        title: "付款進度更新",
        description: "已付款 300,000。",
        actorName: "王冠勳",
      },
    ],
  },
  {
    id: "bp-004",
    documentNo: "BP-2026-0004",
    documentType: "invoice",
    invoiceNo: "INV-2026-118",
    invoiceType: "electronic",
    invoiceDate: "2026-03-10",
    invoiceAmount: 1250000,
    taxAmount: 59524,
    invoiceStatus: "credited",
    accountId: "acc-004",
    opportunityId: "opp-008",
    projectId: "proj-004",
    ownerId: "u-004",
    revenueNo: "REV-2026-004",
    reconciliationNo: "REC-2026-004",
    orderNo: "SO-2026-028",
    contractNo: "CTM-2026-009",
    quoteNo: "Q-2026-005-V1",
    expectedReceiveAmount: 1100000,
    receivedAmount: 800000,
    dueReceiveAt: "2026-03-31",
    lastReceivedAt: "2026-03-29",
    expectedPayAmount: 0,
    paidAmount: 0,
    duePayAt: "",
    lastPaidAt: "",
    creditReason: "品質爭議折讓 150,000。",
    notes: "折讓後剩餘款項改為 4/15 前支付。",
    createdAt: "2026-03-10 11:05",
    createdBy: "田中由紀",
    updatedAt: "2026-04-03 16:40",
    updatedBy: "王冠勳",
    activities: [
      {
        id: "bp-act-030",
        occurredAt: "2026-04-03 16:40",
        title: "折讓完成",
        description: "折讓後等待客戶補款。",
        actorName: "王冠勳",
      },
    ],
  },
  {
    id: "bp-005",
    documentNo: "BP-2026-0005",
    documentType: "payable",
    invoiceNo: "PINV-2026-066",
    invoiceType: "triplicate",
    invoiceDate: "2026-03-18",
    invoiceAmount: 430000,
    taxAmount: 20476,
    invoiceStatus: "issued",
    accountId: "acc-005",
    opportunityId: "opp-010",
    projectId: "proj-005",
    ownerId: "u-005",
    revenueNo: "REV-2026-005",
    reconciliationNo: "REC-2026-005",
    orderNo: "SO-2026-032",
    contractNo: "CTM-2026-012",
    quoteNo: "Q-2026-012-V1",
    expectedReceiveAmount: 0,
    receivedAmount: 0,
    dueReceiveAt: "",
    lastReceivedAt: "",
    expectedPayAmount: 430000,
    paidAmount: 0,
    duePayAt: "2026-03-30",
    lastPaidAt: "",
    notes: "供應商款項逾期，待主管核准先付款。",
    exceptionReason: "付款核准流程延遲。",
    payableStatus: "exception",
    createdAt: "2026-03-18 13:35",
    createdBy: "王冠勳",
    updatedAt: "2026-04-06 10:12",
    updatedBy: "王冠勳",
    activities: [
      {
        id: "bp-act-040",
        occurredAt: "2026-04-06 10:12",
        title: "標記付款異常",
        description: "付款核准流程仍未完成。",
        actorName: "王冠勳",
      },
    ],
  },
  {
    id: "bp-006",
    documentNo: "BP-2026-0006",
    documentType: "receivable",
    invoiceNo: "INV-2026-131",
    invoiceType: "electronic",
    invoiceDate: "2026-03-27",
    invoiceAmount: 720000,
    taxAmount: 34286,
    invoiceStatus: "pending_reissue",
    accountId: "acc-006",
    opportunityId: "opp-012",
    projectId: "proj-006",
    ownerId: "u-006",
    revenueNo: "REV-2026-006",
    reconciliationNo: "REC-2026-006",
    orderNo: "SO-2026-039",
    contractNo: "CTM-2026-015",
    quoteNo: "Q-2026-018-V1",
    expectedReceiveAmount: 720000,
    receivedAmount: 0,
    dueReceiveAt: "2026-04-07",
    lastReceivedAt: "",
    expectedPayAmount: 0,
    paidAmount: 0,
    duePayAt: "",
    lastPaidAt: "",
    pendingReissueReason: "統編誤植，需重開發票。",
    notes: "會計已退回原發票，待重開。",
    createdAt: "2026-03-27 16:18",
    createdBy: "林佳恩",
    updatedAt: "2026-04-06 18:02",
    updatedBy: "王冠勳",
    activities: [
      {
        id: "bp-act-050",
        occurredAt: "2026-04-06 18:02",
        title: "標記待重開",
        description: "統編誤植，待重開發票。",
        actorName: "王冠勳",
      },
    ],
  },
];

function appendActivity(record, payload = {}) {
  record.activities = [
    createActivity({
      title: payload.title || "資料更新",
      description: payload.description || "",
      actorName: payload.actorName || "系統管理員",
    }),
    ...(record.activities || []),
  ];
}

function touch(record, actorName = "系統管理員") {
  record.updatedAt = nowDateTimeText();
  record.updatedBy = actorName;
}

const state = reactive({
  records: seedRecords.map((item) => normalizeRecord(item)),
});

function listRecords() {
  return state.records;
}

function getById(recordId) {
  return state.records.find((item) => item.id === recordId) || null;
}

function getNextDocumentNo() {
  const maxNo = state.records.reduce((max, item) => {
    const matched = String(item.documentNo || "").match(/(\d+)$/);
    if (!matched) {
      return max;
    }

    return Math.max(max, Number(matched[1]));
  }, 0);

  return `BP-${new Date().getFullYear()}-${String(maxNo + 1).padStart(4, "0")}`;
}

function replaceRecord(recordId, nextRecord) {
  const index = state.records.findIndex((item) => item.id === recordId);
  if (index < 0) {
    return null;
  }

  state.records.splice(index, 1, nextRecord);
  return state.records[index];
}

function updateRecord(recordId, patch = {}, options = {}) {
  const target = getById(recordId);

  if (!target) {
    return null;
  }

  const actorName = options.actorName || "系統管理員";
  const title = options.activityTitle || "資料更新";
  const description = options.activityDescription || "";

  const next = normalizeRecord({
    ...target,
    ...patch,
  });

  touch(next, actorName);
  appendActivity(next, { title, description, actorName });

  return replaceRecord(recordId, next);
}

function createRecord(payload = {}, actorName = "系統管理員") {
  const documentNo = payload.documentNo || getNextDocumentNo();

  const base = normalizeRecord({
    id: `bp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    documentNo,
    documentType: payload.documentType || "invoice",
    invoiceNo: payload.invoiceNo || "",
    invoiceType: payload.invoiceType || "electronic",
    invoiceDate: payload.invoiceDate || "",
    invoiceAmount: Number(payload.invoiceAmount || 0),
    taxAmount: Number(payload.taxAmount || 0),
    invoiceStatus: payload.invoiceStatus || "pending_issue",
    accountId: payload.accountId || "",
    opportunityId: payload.opportunityId || "",
    projectId: payload.projectId || "",
    ownerId: payload.ownerId || "",
    revenueNo: payload.revenueNo || "",
    reconciliationNo: payload.reconciliationNo || "",
    orderNo: payload.orderNo || "",
    contractNo: payload.contractNo || "",
    quoteNo: payload.quoteNo || "",
    expectedReceiveAmount: Number(payload.expectedReceiveAmount || 0),
    receivedAmount: Number(payload.receivedAmount || 0),
    dueReceiveAt: payload.dueReceiveAt || "",
    lastReceivedAt: "",
    expectedPayAmount: Number(payload.expectedPayAmount || 0),
    paidAmount: Number(payload.paidAmount || 0),
    duePayAt: payload.duePayAt || "",
    lastPaidAt: "",
    notes: payload.notes || "",
    exceptionReason: payload.exceptionReason || "",
    createdAt: nowDateTimeText(),
    createdBy: actorName,
    updatedAt: nowDateTimeText(),
    updatedBy: actorName,
    attachments: [],
    activities: [
      createActivity({
        title: "建立單據",
        description: `已建立 ${documentNo}`,
        actorName,
      }),
    ],
  });

  state.records.unshift(base);
  return base;
}

function setInvoiceChange(recordId, payload = {}, actorName = "系統管理員") {
  const target = getById(recordId);

  if (!target) {
    return null;
  }

  const action = payload.action || "";
  const reason = String(payload.reason || "").trim();
  const nextInvoiceNo = String(payload.nextInvoiceNo || "").trim();

  if (action === "void") {
    return updateRecord(
      recordId,
      {
        invoiceStatus: "voided",
        invoiceChangeType: "void",
        voidReason: reason,
      },
      {
        actorName,
        activityTitle: "標記作廢",
        activityDescription: reason || "已標記作廢",
      }
    );
  }

  if (action === "crediting") {
    return updateRecord(
      recordId,
      {
        invoiceStatus: "crediting",
        invoiceChangeType: "credit",
        creditReason: reason,
      },
      {
        actorName,
        activityTitle: "標記折讓中",
        activityDescription: reason || "已進入折讓流程",
      }
    );
  }

  if (action === "credited") {
    return updateRecord(
      recordId,
      {
        invoiceStatus: "credited",
        invoiceChangeType: "credit",
        creditReason: reason || target.creditReason,
      },
      {
        actorName,
        activityTitle: "標記已折讓",
        activityDescription: reason || "折讓已完成",
      }
    );
  }

  if (action === "pending_reissue") {
    return updateRecord(
      recordId,
      {
        invoiceStatus: "pending_reissue",
        invoiceChangeType: "reissue",
        pendingReissueReason: reason,
      },
      {
        actorName,
        activityTitle: "標記待重開",
        activityDescription: reason || "待重開發票",
      }
    );
  }

  if (action === "reissued") {
    return updateRecord(
      recordId,
      {
        invoiceStatus: "reissued",
        invoiceChangeType: "reissue",
        pendingReissueReason: reason || target.pendingReissueReason,
        reissuedInvoiceNo: nextInvoiceNo,
        invoiceNo: nextInvoiceNo || target.invoiceNo,
      },
      {
        actorName,
        activityTitle: "標記已重開",
        activityDescription: `新發票：${nextInvoiceNo || target.invoiceNo || "未填寫"}`,
      }
    );
  }

  return null;
}

function addReceiveRecord(recordId, payload = {}, actorName = "系統管理員") {
  const target = getById(recordId);

  if (!target) {
    return null;
  }

  const line = createTransactionLine(payload, "receive");
  const receivedAmount = Number(target.receivedAmount || 0) + Number(line.amount || 0);

  return updateRecord(
    recordId,
    {
      receivedAmount,
      lastReceivedAt: line.handledAt,
      receiveRecords: [line, ...(target.receiveRecords || [])],
    },
    {
      actorName,
      activityTitle: "新增收款紀錄",
      activityDescription: `${line.no} / ${line.amount.toLocaleString("zh-TW")}`,
    }
  );
}

function addPayRecord(recordId, payload = {}, actorName = "系統管理員") {
  const target = getById(recordId);

  if (!target) {
    return null;
  }

  const line = createTransactionLine(payload, "pay");
  const paidAmount = Number(target.paidAmount || 0) + Number(line.amount || 0);

  return updateRecord(
    recordId,
    {
      paidAmount,
      lastPaidAt: line.handledAt,
      payRecords: [line, ...(target.payRecords || [])],
    },
    {
      actorName,
      activityTitle: "新增付款紀錄",
      activityDescription: `${line.no} / ${line.amount.toLocaleString("zh-TW")}`,
    }
  );
}

function addAttachment(recordId, payload = {}, actorName = "系統管理員") {
  const target = getById(recordId);

  if (!target) {
    return null;
  }

  const attachment = createAttachment(payload);

  return updateRecord(
    recordId,
    {
      attachments: [attachment, ...(target.attachments || [])],
    },
    {
      actorName,
      activityTitle: "上傳附件",
      activityDescription: attachment.name,
    }
  );
}

function removeAttachment(recordId, attachmentId, actorName = "系統管理員") {
  const target = getById(recordId);

  if (!target) {
    return null;
  }

  const found = (target.attachments || []).find((item) => item.id === attachmentId);
  if (!found) {
    return null;
  }

  return updateRecord(
    recordId,
    {
      attachments: (target.attachments || []).filter((item) => item.id !== attachmentId),
    },
    {
      actorName,
      activityTitle: "移除附件",
      activityDescription: found.name,
    }
  );
}

function useBillingPaymentsStore() {
  return {
    records: computed(() => listRecords()),
    getById,
    getNextDocumentNo,
    createRecord,
    updateRecord,
    setInvoiceChange,
    addReceiveRecord,
    addPayRecord,
    addAttachment,
    removeAttachment,
  };
}

export {
  attachmentCategoryOptions,
  documentTypeMap,
  invoiceStatusMap,
  invoiceTypeMap,
  payableStatusMap,
  receivableStatusMap,
  transactionMethodOptions,
  useBillingPaymentsStore,
};
