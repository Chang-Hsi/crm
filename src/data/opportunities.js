import { accountList, regionOptions } from "./accounts";

const opportunityTypeOptions = [
  { label: "全部類型", value: "all" },
  { label: "代理合作", value: "agency" },
  { label: "授權合作", value: "license" },
  { label: "聯名合作", value: "co_branding" },
  { label: "通路合作", value: "channel" },
];

const opportunitySourceOptions = [
  { label: "既有客戶", value: "existing_account" },
  { label: "Inbound", value: "inbound" },
  { label: "Outbound", value: "outbound" },
  { label: "Referral", value: "referral" },
  { label: "活動名單", value: "event" },
  { label: "舊案重啟", value: "revival" },
];

const opportunityStatusOptions = [
  { label: "全部狀態", value: "all" },
  { label: "進行中", value: "active" },
  { label: "已成交", value: "won" },
  { label: "已失敗", value: "lost" },
];

const opportunityStageOptions = [
  { label: "全部階段", value: "all" },
  { label: "潛在線索", value: "potential" },
  { label: "已接洽", value: "contacted" },
  { label: "需求確認", value: "qualified" },
  { label: "提案中", value: "proposal" },
  { label: "談判中", value: "negotiation" },
  { label: "已成交", value: "won" },
  { label: "已失敗", value: "lost" },
];

const stageProbabilityMap = {
  potential: 20,
  contacted: 35,
  qualified: 50,
  proposal: 70,
  negotiation: 85,
  won: 100,
  lost: 0,
};

const opportunityMetaMap = {
  "opp-001": { opportunityType: "co_branding", source: "existing_account" },
  "opp-002": { opportunityType: "channel", source: "existing_account" },
  "opp-003": { opportunityType: "co_branding", source: "existing_account" },
  "opp-004": { opportunityType: "license", source: "referral" },
  "opp-005": { opportunityType: "co_branding", source: "event" },
  "opp-006": { opportunityType: "channel", source: "existing_account" },
  "opp-007": { opportunityType: "channel", source: "existing_account" },
  "opp-008": { opportunityType: "agency", source: "outbound" },
  "opp-009": { opportunityType: "channel", source: "outbound" },
  "opp-010": { opportunityType: "co_branding", source: "existing_account" },
  "opp-011": { opportunityType: "channel", source: "revival" },
  "opp-012": { opportunityType: "agency", source: "inbound" },
  "opp-013": { opportunityType: "agency", source: "referral" },
  "opp-014": { opportunityType: "co_branding", source: "existing_account" },
  "opp-015": { opportunityType: "channel", source: "existing_account" },
  "opp-016": { opportunityType: "co_branding", source: "existing_account" },
  "opp-017": { opportunityType: "channel", source: "outbound" },
  "opp-018": { opportunityType: "co_branding", source: "inbound" },
};

function resolveOpportunityStatus(stageValue) {
  if (stageValue === "won") {
    return "won";
  }

  if (stageValue === "lost") {
    return "lost";
  }

  return "active";
}

function createOpportunityRecord(account, opportunity) {
  const primaryContact = (account.contacts ?? []).find((contact) => contact.isPrimary) ?? null;
  const meta = opportunityMetaMap[opportunity.id] ?? {
    opportunityType: "channel",
    source: "existing_account",
  };

  return {
    id: opportunity.id,
    opportunityCode: opportunity.id.toUpperCase(),
    accountId: account.id,
    accountName: account.companyName,
    primaryContactId: primaryContact?.id ?? "",
    productId: "",
    region: account.region,
    name: opportunity.name,
    opportunityType: meta.opportunityType,
    stage: opportunity.stage,
    probability: stageProbabilityMap[opportunity.stage] ?? 0,
    expectedRevenue: opportunity.amount ?? 0,
    expectedCloseDate: opportunity.expectedCloseDate,
    source: meta.source,
    ownerUserId: opportunity.ownerUserId ?? account.ownerUserId,
    status: resolveOpportunityStatus(opportunity.stage),
    lostReason: opportunity.stage === "lost" ? "客戶決定暫停合作" : "",
    description: "",
    createdAt: account.updatedAt,
    updatedAt: account.updatedAt,
  };
}

const opportunityList = accountList.flatMap((account) =>
  (account.opportunities ?? []).map((opportunity) =>
    createOpportunityRecord(account, opportunity)
  )
);

export {
  opportunityList,
  opportunityStageOptions,
  opportunityStatusOptions,
  opportunitySourceOptions,
  opportunityTypeOptions,
  regionOptions,
  stageProbabilityMap,
};
