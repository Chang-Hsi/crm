import { accountList } from "./accounts";
import { opportunityList } from "./opportunities";
import { userList } from "./users";

const pricingModelOptions = [
  { label: "全部模式", value: "all" },
  { label: "固定報價", value: "fixed" },
  { label: "分潤模式", value: "revenue_share" },
  { label: "混合模式", value: "hybrid" },
];

const quoteStatusOptions = [
  { label: "全部狀態", value: "all" },
  { label: "草稿", value: "draft" },
  { label: "已送出", value: "submitted" },
  { label: "已接受", value: "accepted" },
  { label: "已拒絕", value: "rejected" },
  { label: "已過期", value: "expired" },
];

const pricingModelMap = {
  fixed: { label: "固定報價", type: "primary" },
  revenue_share: { label: "分潤模式", type: "warning" },
  hybrid: { label: "混合模式", type: "success" },
};

const quoteStatusMap = {
  draft: { label: "草稿", type: "info" },
  submitted: { label: "已送出", type: "warning" },
  accepted: { label: "已接受", type: "success" },
  rejected: { label: "已拒絕", type: "danger" },
  expired: { label: "已過期", type: "danger" },
};

const currencyOptions = [
  { label: "新台幣 TWD", value: "TWD" },
  { label: "美元 USD", value: "USD" },
  { label: "日圓 JPY", value: "JPY" },
];

const accountById = new Map(accountList.map((account) => [account.id, account]));
const opportunityById = new Map(
  opportunityList.map((opportunity) => [opportunity.id, opportunity])
);
const userById = new Map(userList.map((user) => [user.id, user]));

function resolveQuoteName(referenceMap, id, fallback = "-") {
  return referenceMap.get(id)?.name ?? referenceMap.get(id)?.companyName ?? fallback;
}

function createQuote(record) {
  const opportunity = opportunityById.get(record.opportunityId);
  const account = accountById.get(record.accountId);
  const preparedByName = userById.get(record.preparedByUserId)?.name ?? "未指派";

  return {
    id: record.id,
    quoteCode: record.quoteCode,
    opportunityId: record.opportunityId,
    opportunityName: opportunity?.name ?? record.opportunityName ?? "-",
    accountId: record.accountId,
    accountName: account?.companyName ?? record.accountName ?? "-",
    version: record.version,
    quoteDate: record.quoteDate,
    validUntil: record.validUntil,
    totalAmount: record.totalAmount,
    currencyCode: record.currencyCode,
    pricingModel: record.pricingModel,
    status: record.status,
    preparedByUserId: record.preparedByUserId,
    preparedByName,
    description: record.description ?? "",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

const quoteList = [
  createQuote({
    id: "q-001",
    quoteCode: "Q-2026-001",
    opportunityId: "opp-001",
    accountId: "acc-001",
    version: 1,
    quoteDate: "2026-03-24",
    validUntil: "2026-04-10",
    totalAmount: 3200000,
    currencyCode: "TWD",
    pricingModel: "fixed",
    status: "submitted",
    preparedByUserId: "u-001",
    description: "夏季儲值聯名首版報價，已送出等待客戶回覆。",
    createdAt: "2026-03-24T10:12:00+08:00",
    updatedAt: "2026-03-29T09:30:00+08:00",
  }),
  createQuote({
    id: "q-002",
    quoteCode: "Q-2026-001",
    opportunityId: "opp-001",
    accountId: "acc-001",
    version: 2,
    quoteDate: "2026-04-02",
    validUntil: "2026-04-18",
    totalAmount: 3100000,
    currencyCode: "TWD",
    pricingModel: "hybrid",
    status: "draft",
    preparedByUserId: "u-001",
    description: "依最新合作條件調整為混合模式的第二版草稿。",
    createdAt: "2026-04-02T08:45:00+08:00",
    updatedAt: "2026-04-02T17:10:00+08:00",
  }),
  createQuote({
    id: "q-003",
    quoteCode: "Q-2026-002",
    opportunityId: "opp-002",
    accountId: "acc-001",
    version: 1,
    quoteDate: "2026-03-18",
    validUntil: "2026-04-05",
    totalAmount: 1850000,
    currencyCode: "TWD",
    pricingModel: "revenue_share",
    status: "accepted",
    preparedByUserId: "u-003",
    description: "會員點數互通合作已完成接受，後續銜接合約。",
    createdAt: "2026-03-18T13:20:00+08:00",
    updatedAt: "2026-03-31T10:05:00+08:00",
  }),
  createQuote({
    id: "q-004",
    quoteCode: "Q-2026-003",
    opportunityId: "opp-004",
    accountId: "acc-002",
    version: 1,
    quoteDate: "2026-03-26",
    validUntil: "2026-04-07",
    totalAmount: 4200000,
    currencyCode: "USD",
    pricingModel: "fixed",
    status: "submitted",
    preparedByUserId: "u-002",
    description: "日本區聯合發行合作提案，屬於高額且即將到期的關注案件。",
    createdAt: "2026-03-26T11:00:00+08:00",
    updatedAt: "2026-04-01T16:40:00+08:00",
  }),
  createQuote({
    id: "q-005",
    quoteCode: "Q-2026-004",
    opportunityId: "opp-005",
    accountId: "acc-002",
    version: 1,
    quoteDate: "2026-03-20",
    validUntil: "2026-03-31",
    totalAmount: 750000,
    currencyCode: "TWD",
    pricingModel: "hybrid",
    status: "rejected",
    preparedByUserId: "u-002",
    description: "展會參展置換報價已被拒絕，保留作為版本參考。",
    createdAt: "2026-03-20T09:35:00+08:00",
    updatedAt: "2026-04-01T09:22:00+08:00",
  }),
  createQuote({
    id: "q-006",
    quoteCode: "Q-2026-005",
    opportunityId: "opp-008",
    accountId: "acc-004",
    version: 1,
    quoteDate: "2026-03-27",
    validUntil: "2026-04-03",
    totalAmount: 2600000,
    currencyCode: "USD",
    pricingModel: "revenue_share",
    status: "submitted",
    preparedByUserId: "u-004",
    description: "北美代理合作初版提案，今天為有效期限最後一天。",
    createdAt: "2026-03-27T14:10:00+08:00",
    updatedAt: "2026-04-02T18:05:00+08:00",
  }),
  createQuote({
    id: "q-007",
    quoteCode: "Q-2026-006",
    opportunityId: "opp-010",
    accountId: "acc-005",
    version: 1,
    quoteDate: "2026-03-15",
    validUntil: "2026-04-12",
    totalAmount: 1450000,
    currencyCode: "TWD",
    pricingModel: "fixed",
    status: "draft",
    preparedByUserId: "u-001",
    description: "聯名快閃活動草稿，尚待確認資源與分工。",
    createdAt: "2026-03-15T10:00:00+08:00",
    updatedAt: "2026-03-30T11:30:00+08:00",
  }),
  createQuote({
    id: "q-008",
    quoteCode: "Q-2026-007",
    opportunityId: "opp-014",
    accountId: "acc-007",
    version: 1,
    quoteDate: "2026-03-11",
    validUntil: "2026-04-20",
    totalAmount: 980000,
    currencyCode: "TWD",
    pricingModel: "hybrid",
    status: "accepted",
    preparedByUserId: "u-003",
    description: "年度聯名合作已接受，作為後續合約與執行基準。",
    createdAt: "2026-03-11T09:50:00+08:00",
    updatedAt: "2026-03-28T15:15:00+08:00",
  }),
  createQuote({
    id: "q-009",
    quoteCode: "Q-2026-008",
    opportunityId: "opp-016",
    accountId: "acc-009",
    version: 1,
    quoteDate: "2026-03-28",
    validUntil: "2026-04-15",
    totalAmount: 630000,
    currencyCode: "TWD",
    pricingModel: "fixed",
    status: "submitted",
    preparedByUserId: "u-002",
    description: "聯名包裝合作提案已送出，等待客戶評估。",
    createdAt: "2026-03-28T16:25:00+08:00",
    updatedAt: "2026-04-01T12:05:00+08:00",
  }),
];

export {
  currencyOptions,
  pricingModelMap,
  pricingModelOptions,
  quoteList,
  quoteStatusMap,
  quoteStatusOptions,
  resolveQuoteName,
};
