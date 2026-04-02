const typeMap = {
  enterprise: { label: "企業客戶", type: "primary" },
  partner: { label: "合作夥伴", type: "success" },
  distributor: { label: "代理商", type: "warning" },
  channel: { label: "通路商", type: "info" },
};

const tierMap = {
  strategic: { label: "戰略級", type: "danger" },
  normal: { label: "一般級", type: "info" },
  potential: { label: "潛力級", type: "warning" },
};

const lifecycleMap = {
  lead: { label: "潛在線索", type: "warning" },
  deal: { label: "成交合作", type: "primary" },
  retention: { label: "穩定經營", type: "success" },
  churn: { label: "流失風險", type: "danger" },
};

const statusMap = {
  active: { label: "啟用中", type: "success" },
  inactive: { label: "未啟用", type: "info" },
  churned: { label: "已流失", type: "danger" },
};

const opportunityStageOptions = [
  { label: "潛在線索", value: "potential" },
  { label: "已接洽", value: "contacted" },
  { label: "需求確認", value: "qualified" },
  { label: "提案中", value: "proposal" },
  { label: "談判中", value: "negotiation" },
  { label: "已成交", value: "won" },
  { label: "已失敗", value: "lost" },
];

const opportunityStageMap = {
  potential: { label: "潛在線索", type: "info" },
  contacted: { label: "已接洽", type: "info" },
  qualified: { label: "需求確認", type: "warning" },
  proposal: { label: "提案中", type: "warning" },
  negotiation: { label: "談判中", type: "primary" },
  won: { label: "已成交", type: "success" },
  lost: { label: "已失敗", type: "danger" },
};

export {
  lifecycleMap,
  opportunityStageMap,
  opportunityStageOptions,
  statusMap,
  tierMap,
  typeMap,
};
