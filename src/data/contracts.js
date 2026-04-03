import { accountList } from "./accounts";
import { opportunityList } from "./opportunities";
import { userList } from "./users";

/**
 * @typedef {"draft" | "pending_review" | "under_review" | "pending_signature" | "active" | "in_execution" | "expiring_soon" | "renewed" | "completed" | "terminated" | "voided"} ContractStatus
 */
/**
 * @typedef {"not_sent" | "signing" | "customer_signed" | "internal_signed" | "fully_signed"} SignatureStatus
 */
/**
 * @typedef {"not_submitted" | "pending" | "approved" | "rejected"} ReviewStatus
 */
/**
 * @typedef {Object} ContractItem
 * @property {string} id
 * @property {string} contractNo
 * @property {string} contractName
 * @property {string} customerId
 * @property {string} customerName
 * @property {string} opportunityId
 * @property {string} opportunityName
 * @property {string} ownerId
 * @property {string} ownerName
 * @property {number} amount
 * @property {string} currency
 * @property {string} paymentTerms
 * @property {string|null} startDate
 * @property {string|null} effectiveDate
 * @property {string|null} endDate
 * @property {boolean} autoRenew
 * @property {number} renewalReminderDays
 * @property {ContractStatus} contractStatus
 * @property {SignatureStatus} signatureStatus
 * @property {ReviewStatus} reviewStatus
 * @property {string} version
 * @property {number} attachmentCount
 * @property {string|null} mainFileName
 * @property {string} lastUpdatedAt
 * @property {string} lastUpdatedBy
 * @property {boolean} hasMissingFiles
 * @property {boolean} isOverdueToSign
 * @property {string} notes
 */
/**
 * @typedef {ContractItem & {
 *  contactName: string
 *  contactEmail: string
 *  contactPhone: string
 *  departmentName: string
 *  createdAt: string
 *  createdBy: string
 *  signedDate: string | null
 *  taxType: string
 *  pricingModel: string
 *  discountNote: string
 *  specialTerms: string[]
 *  reviewAssignee: string | null
 *  reviewSubmittedAt: string | null
 *  reviewCompletedAt: string | null
 *  reviewComment: string
 *  signatureSentAt: string | null
 *  customerSignedAt: string | null
 *  internalSignedAt: string | null
 *  fullySignedAt: string | null
 *  latestQuoteCode: string | null
 *  attachments: Array<{
 *    id: string
 *    name: string
 *    type: string
 *    size: number
 *    uploadedAt: string
 *    uploadedBy: string
 *    isMainFile: boolean
 *  }>
 *  versions: Array<{
 *    id: string
 *    version: string
 *    createdAt: string
 *    createdBy: string
 *    note: string
 *    status: string
 *  }>
 *  activities: Array<{
 *    id: string
 *    type: string
 *    title: string
 *    content: string
 *    operatorName: string
 *    createdAt: string
 *  }>
 * }} ContractDetail
 */

const contractStatusOptions = [
  { label: "全部合約狀態", value: "all" },
  { label: "草稿", value: "draft" },
  { label: "待送審", value: "pending_review" },
  { label: "審核中", value: "under_review" },
  { label: "待簽署", value: "pending_signature" },
  { label: "已生效", value: "active" },
  { label: "履約中", value: "in_execution" },
  { label: "即將到期", value: "expiring_soon" },
  { label: "已續約", value: "renewed" },
  { label: "已完成", value: "completed" },
  { label: "已終止", value: "terminated" },
  { label: "已作廢", value: "voided" },
];

const signatureStatusOptions = [
  { label: "全部簽署狀態", value: "all" },
  { label: "未送簽", value: "not_sent" },
  { label: "簽署中", value: "signing" },
  { label: "客戶已簽", value: "customer_signed" },
  { label: "我方已簽", value: "internal_signed" },
  { label: "雙方已簽", value: "fully_signed" },
];

const reviewStatusOptions = [
  { label: "全部審核狀態", value: "all" },
  { label: "未送審", value: "not_submitted" },
  { label: "待審核", value: "pending" },
  { label: "已核准", value: "approved" },
  { label: "已退回", value: "rejected" },
];

const autoRenewOptions = [
  { label: "自動續約：全部", value: "all" },
  { label: "自動續約：是", value: "yes" },
  { label: "自動續約：否", value: "no" },
];

const yesNoOptions = [
  { label: "全部", value: "all" },
  { label: "是", value: "yes" },
  { label: "否", value: "no" },
];

const currencyOptions = [
  { label: "新台幣 TWD", value: "TWD" },
  { label: "美元 USD", value: "USD" },
  { label: "日圓 JPY", value: "JPY" },
];

const contractStatusMap = {
  draft: { label: "草稿", type: "info" },
  pending_review: { label: "待送審", type: "warning" },
  under_review: { label: "審核中", type: "warning" },
  pending_signature: { label: "待簽署", type: "warning" },
  active: { label: "已生效", type: "success" },
  in_execution: { label: "履約中", type: "success" },
  expiring_soon: { label: "即將到期", type: "danger" },
  renewed: { label: "已續約", type: "success" },
  completed: { label: "已完成", type: "success" },
  terminated: { label: "已終止", type: "danger" },
  voided: { label: "已作廢", type: "info" },
};

const signatureStatusMap = {
  not_sent: { label: "未送簽", type: "info" },
  signing: { label: "簽署中", type: "warning" },
  customer_signed: { label: "客戶已簽", type: "warning" },
  internal_signed: { label: "我方已簽", type: "primary" },
  fully_signed: { label: "雙方已簽", type: "success" },
};

const reviewStatusMap = {
  not_submitted: { label: "未送審", type: "info" },
  pending: { label: "待審核", type: "warning" },
  approved: { label: "已核准", type: "success" },
  rejected: { label: "已退回", type: "danger" },
};

const accountById = new Map(accountList.map((item) => [item.id, item]));
const opportunityById = new Map(opportunityList.map((item) => [item.id, item]));
const userById = new Map(userList.map((item) => [item.id, item]));

function resolveCustomerName(customerId, fallback = "-") {
  return accountById.get(customerId)?.companyName ?? fallback;
}

function resolveOpportunityName(opportunityId, fallback = "-") {
  return opportunityById.get(opportunityId)?.name ?? fallback;
}

function resolveOwnerName(ownerId, fallback = "未指派") {
  return userById.get(ownerId)?.name ?? fallback;
}

function createContractItem(record) {
  return {
    ...record,
    customerName: resolveCustomerName(record.customerId, record.customerName),
    opportunityName: resolveOpportunityName(record.opportunityId, record.opportunityName),
    ownerName: resolveOwnerName(record.ownerId, record.ownerName),
  };
}

/** @type {ContractItem[]} */
const contractList = [
  createContractItem({
    id: "ctm-001",
    contractNo: "CT-2026-001",
    contractName: "beanfun! 2026 Q2 聯名合作合約",
    customerId: "acc-001",
    customerName: "",
    opportunityId: "opp-001",
    opportunityName: "",
    ownerId: "u-001",
    ownerName: "",
    amount: 3100000,
    currency: "TWD",
    paymentTerms: "30% 預付款 / 70% 驗收後 30 天",
    startDate: "2026-04-01",
    effectiveDate: "2026-04-10",
    endDate: "2027-03-31",
    autoRenew: true,
    renewalReminderDays: 45,
    contractStatus: "under_review",
    signatureStatus: "not_sent",
    reviewStatus: "pending",
    version: "v2.1",
    attachmentCount: 3,
    mainFileName: "beanfun-q2-collab-v2.1.pdf",
    lastUpdatedAt: "2026-04-02T16:20:00+08:00",
    lastUpdatedBy: "林美雅",
    hasMissingFiles: false,
    isOverdueToSign: false,
    notes: "法務補充授權期間條款，等待最終核可。",
  }),
  createContractItem({
    id: "ctm-002",
    contractNo: "CT-2026-002",
    contractName: "東京互動娛樂 日本區發行合約",
    customerId: "acc-002",
    customerName: "",
    opportunityId: "opp-004",
    opportunityName: "",
    ownerId: "u-002",
    ownerName: "",
    amount: 4200000,
    currency: "USD",
    paymentTerms: "月結 45 天",
    startDate: "2026-04-05",
    effectiveDate: "2026-04-20",
    endDate: "2026-12-31",
    autoRenew: false,
    renewalReminderDays: 30,
    contractStatus: "pending_signature",
    signatureStatus: "signing",
    reviewStatus: "approved",
    version: "v1.3",
    attachmentCount: 2,
    mainFileName: "jp-publish-master-v1.3.pdf",
    lastUpdatedAt: "2026-04-03T09:30:00+08:00",
    lastUpdatedBy: "陳志昇",
    hasMissingFiles: false,
    isOverdueToSign: true,
    notes: "已送客戶簽署 10 天，尚未回簽。",
  }),
  createContractItem({
    id: "ctm-003",
    contractNo: "CT-2026-003",
    contractName: "SEA Gamer Network 通路合作框架",
    customerId: "acc-003",
    customerName: "",
    opportunityId: "opp-006",
    opportunityName: "",
    ownerId: "u-002",
    ownerName: "",
    amount: 2800000,
    currency: "USD",
    paymentTerms: "雙月結算",
    startDate: "2026-01-01",
    effectiveDate: "2026-01-05",
    endDate: "2026-05-02",
    autoRenew: true,
    renewalReminderDays: 30,
    contractStatus: "expiring_soon",
    signatureStatus: "fully_signed",
    reviewStatus: "approved",
    version: "v1.0",
    attachmentCount: 4,
    mainFileName: "sea-framework-v1.0.pdf",
    lastUpdatedAt: "2026-04-01T18:05:00+08:00",
    lastUpdatedBy: "陳志昇",
    hasMissingFiles: false,
    isOverdueToSign: false,
    notes: "30 天內到期，需確認續約與檔期。",
  }),
  createContractItem({
    id: "ctm-004",
    contractNo: "CT-2026-004",
    contractName: "NorthStar Interactive 北美代理合作",
    customerId: "acc-004",
    customerName: "",
    opportunityId: "opp-008",
    opportunityName: "",
    ownerId: "u-004",
    ownerName: "",
    amount: 2600000,
    currency: "USD",
    paymentTerms: "月結 30 天",
    startDate: "2026-03-10",
    effectiveDate: "2026-03-15",
    endDate: "2027-03-14",
    autoRenew: false,
    renewalReminderDays: 60,
    contractStatus: "active",
    signatureStatus: "fully_signed",
    reviewStatus: "approved",
    version: "v1.1",
    attachmentCount: 3,
    mainFileName: "northstar-agency-v1.1.pdf",
    lastUpdatedAt: "2026-03-25T11:42:00+08:00",
    lastUpdatedBy: "田中由紀",
    hasMissingFiles: false,
    isOverdueToSign: false,
    notes: "正式生效，進入履約準備。",
  }),
  createContractItem({
    id: "ctm-005",
    contractNo: "CT-2026-005",
    contractName: "KOL Universe 聯名活動合作",
    customerId: "acc-005",
    customerName: "",
    opportunityId: "opp-010",
    opportunityName: "",
    ownerId: "u-001",
    ownerName: "",
    amount: 1450000,
    currency: "TWD",
    paymentTerms: "50% 預付款 / 50% 上線後 15 天",
    startDate: null,
    effectiveDate: null,
    endDate: "2026-10-31",
    autoRenew: false,
    renewalReminderDays: 15,
    contractStatus: "draft",
    signatureStatus: "not_sent",
    reviewStatus: "not_submitted",
    version: "v0.9",
    attachmentCount: 1,
    mainFileName: null,
    lastUpdatedAt: "2026-04-02T13:18:00+08:00",
    lastUpdatedBy: "林美雅",
    hasMissingFiles: true,
    isOverdueToSign: false,
    notes: "主合約檔尚未上傳，僅有條款草稿。",
  }),
  createContractItem({
    id: "ctm-006",
    contractNo: "CT-2026-006",
    contractName: "MobiChannel 日本授權合作續約",
    customerId: "acc-007",
    customerName: "",
    opportunityId: "opp-014",
    opportunityName: "",
    ownerId: "u-003",
    ownerName: "",
    amount: 980000,
    currency: "TWD",
    paymentTerms: "季結 30 天",
    startDate: "2026-02-01",
    effectiveDate: "2026-02-01",
    endDate: "2027-01-31",
    autoRenew: true,
    renewalReminderDays: 60,
    contractStatus: "in_execution",
    signatureStatus: "fully_signed",
    reviewStatus: "approved",
    version: "v3.0",
    attachmentCount: 5,
    mainFileName: "mobichannel-renew-v3.0.pdf",
    lastUpdatedAt: "2026-03-29T17:05:00+08:00",
    lastUpdatedBy: "吳奕承",
    hasMissingFiles: false,
    isOverdueToSign: false,
    notes: "已續約並進入履約中。",
  }),
  createContractItem({
    id: "ctm-007",
    contractNo: "CT-2026-007",
    contractName: "PixelHub 商業授權合作",
    customerId: "acc-009",
    customerName: "",
    opportunityId: "opp-016",
    opportunityName: "",
    ownerId: "u-002",
    ownerName: "",
    amount: 630000,
    currency: "TWD",
    paymentTerms: "驗收後 30 天",
    startDate: "2026-03-01",
    effectiveDate: "2026-03-10",
    endDate: "2026-09-30",
    autoRenew: false,
    renewalReminderDays: 20,
    contractStatus: "pending_review",
    signatureStatus: "not_sent",
    reviewStatus: "rejected",
    version: "v1.0",
    attachmentCount: 2,
    mainFileName: "pixelhub-license-v1.0.pdf",
    lastUpdatedAt: "2026-04-01T10:48:00+08:00",
    lastUpdatedBy: "陳志昇",
    hasMissingFiles: false,
    isOverdueToSign: false,
    notes: "法務退回，需補充地域授權範圍。",
  }),
  createContractItem({
    id: "ctm-008",
    contractNo: "CT-2025-088",
    contractName: "Legacy Channel 通路整合合約",
    customerId: "acc-010",
    customerName: "",
    opportunityId: "opp-017",
    opportunityName: "",
    ownerId: "u-004",
    ownerName: "",
    amount: 1250000,
    currency: "USD",
    paymentTerms: "月結 60 天",
    startDate: "2025-08-01",
    effectiveDate: "2025-08-10",
    endDate: "2026-03-31",
    autoRenew: false,
    renewalReminderDays: 30,
    contractStatus: "terminated",
    signatureStatus: "fully_signed",
    reviewStatus: "approved",
    version: "v2.4",
    attachmentCount: 6,
    mainFileName: "legacy-channel-v2.4.pdf",
    lastUpdatedAt: "2026-03-15T14:03:00+08:00",
    lastUpdatedBy: "田中由紀",
    hasMissingFiles: false,
    isOverdueToSign: false,
    notes: "客戶策略調整提前終止。",
  }),
];

function createAttachment(id, name, type, size, uploadedAt, uploadedBy, isMainFile = false) {
  return { id, name, type, size, uploadedAt, uploadedBy, isMainFile };
}

function createVersion(id, version, createdAt, createdBy, note, status) {
  return { id, version, createdAt, createdBy, note, status };
}

function createActivity(id, type, title, content, operatorName, createdAt) {
  return { id, type, title, content, operatorName, createdAt };
}

/**
 * @param {ContractItem} item
 * @returns {ContractDetail}
 */
function createContractDetail(item) {
  return {
    ...item,
    contactName: "李雅婷",
    contactEmail: "legal-window@test.com",
    contactPhone: "02-1234-5678",
    departmentName: "Business Development",
    createdAt: item.lastUpdatedAt,
    createdBy: item.ownerName,
    signedDate: item.signatureStatus === "fully_signed" ? "2026-03-20" : null,
    taxType: "含稅",
    pricingModel: "固定授權 + KPI 加成",
    discountNote: "年度合作折扣 5%",
    specialTerms: ["品牌素材需事前審核", "重大活動檔期雙方共審"],
    reviewAssignee: "法務組",
    reviewSubmittedAt: item.reviewStatus === "not_submitted" ? null : "2026-03-28T11:20:00+08:00",
    reviewCompletedAt:
      item.reviewStatus === "approved" || item.reviewStatus === "rejected"
        ? "2026-03-30T15:00:00+08:00"
        : null,
    reviewComment:
      item.reviewStatus === "rejected"
        ? "請補充地域授權與違約責任條款。"
        : "條款已符合合規標準。",
    signatureSentAt:
      item.signatureStatus === "not_sent" ? null : "2026-03-31T09:00:00+08:00",
    customerSignedAt:
      item.signatureStatus === "customer_signed" ||
      item.signatureStatus === "internal_signed" ||
      item.signatureStatus === "fully_signed"
        ? "2026-04-01T14:20:00+08:00"
        : null,
    internalSignedAt:
      item.signatureStatus === "internal_signed" || item.signatureStatus === "fully_signed"
        ? "2026-04-02T17:00:00+08:00"
        : null,
    fullySignedAt: item.signatureStatus === "fully_signed" ? "2026-04-02T17:00:00+08:00" : null,
    latestQuoteCode: "Q-2026-001",
    attachments: [
      createAttachment(
        `${item.id}-att-1`,
        item.mainFileName ?? `${item.contractNo}-main.pdf`,
        "pdf",
        2_450_000,
        item.lastUpdatedAt,
        item.lastUpdatedBy,
        true
      ),
      createAttachment(
        `${item.id}-att-2`,
        `${item.contractNo}-appendix-a.docx`,
        "docx",
        640_000,
        "2026-03-31T11:20:00+08:00",
        item.ownerName,
        false
      ),
    ],
    versions: [
      createVersion(`${item.id}-ver-1`, "v1.0", "2026-03-12T10:20:00+08:00", item.ownerName, "初版建立", "歷史版"),
      createVersion(
        `${item.id}-ver-2`,
        item.version,
        item.lastUpdatedAt,
        item.lastUpdatedBy,
        "最新條款調整",
        "目前版本"
      ),
    ],
    activities: [
      createActivity(
        `${item.id}-act-1`,
        "create",
        "建立合約草稿",
        "依報價內容建立合約主檔。",
        item.ownerName,
        "2026-03-12T10:20:00+08:00"
      ),
      createActivity(
        `${item.id}-act-2`,
        "review",
        "送審",
        "已提交法務審核。",
        item.ownerName,
        "2026-03-28T11:20:00+08:00"
      ),
      createActivity(
        `${item.id}-act-3`,
        "update",
        "更新條款",
        item.notes,
        item.lastUpdatedBy,
        item.lastUpdatedAt
      ),
    ],
  };
}

const contractDetailsById = Object.fromEntries(
  contractList.map((item) => [item.id, createContractDetail(item)])
);

export {
  autoRenewOptions,
  contractDetailsById,
  contractList,
  contractStatusMap,
  contractStatusOptions,
  currencyOptions,
  reviewStatusMap,
  reviewStatusOptions,
  signatureStatusMap,
  signatureStatusOptions,
  yesNoOptions,
};
