import { accountList } from "./accounts";
import { opportunityList } from "./opportunities";
import { activityOptions, partnerOptions, projectList } from "./projects";
import { userList } from "./users";

const meetingStatusMap = {
  draft: { label: "草稿", type: "info" },
  completed: { label: "已完成", type: "success" },
  archived: { label: "已封存", type: "warning" },
};

const meetingTypeMap = {
  customer_meeting: { label: "客戶會議", type: "primary" },
  opportunity_meeting: { label: "商機會議", type: "warning" },
  project_meeting: { label: "專案週會", type: "success" },
  partner_meeting: { label: "夥伴會議", type: "success" },
  support_meeting: { label: "支援會議", type: "danger" },
  internal_sync: { label: "內部同步", type: "info" },
  acceptance_meeting: { label: "驗收會議", type: "warning" },
  review_meeting: { label: "檢討會議", type: "danger" },
};

const meetingFormatMap = {
  online: { label: "線上" },
  offline: { label: "實體" },
  hybrid: { label: "混合" },
};

const actionItemStatusMap = {
  pending: { label: "待處理", type: "warning" },
  in_progress: { label: "進行中", type: "primary" },
  completed: { label: "已完成", type: "success" },
  cancelled: { label: "已取消", type: "info" },
  converted: { label: "已轉任務", type: "success" },
};

const meetingTemplates = [
  {
    id: "tmpl-customer-discovery",
    name: "客戶需求訪談模板",
    type: "customer_meeting",
    objective: "確認客戶核心需求、目標 KPI 與可行導入時程。",
    agendaSummary: "1. 需求背景 2. 目標與現況 3. 導入範圍 4. 下階段行動",
    richContent:
      "<h2>會議背景</h2><ul><li>客戶目前痛點</li><li>既有系統限制</li></ul><h2>本次重點</h2><ul><li>需求優先順序</li><li>成功指標</li></ul><h2>結論</h2><ul><li>下一步工作</li><li>責任分工</li></ul>",
  },
  {
    id: "tmpl-project-weekly",
    name: "專案週會模板",
    type: "project_meeting",
    objective: "同步本週進度、風險與下週行動。",
    agendaSummary: "1. 本週里程碑 2. 風險阻塞 3. 待辦確認 4. 下週計畫",
    richContent:
      "<h2>本週進度</h2><ul><li>里程碑完成狀態</li></ul><h2>風險與阻塞</h2><ul><li>需跨部門協作事項</li></ul><h2>下週重點</h2><ul><li>排程與責任人</li></ul>",
  },
  {
    id: "tmpl-support-triage",
    name: "支援問題處理模板",
    type: "support_meeting",
    objective: "釐清問題根因與處理時程，避免重複發生。",
    agendaSummary: "1. 問題現況 2. 影響範圍 3. 處置方案 4. 後續追蹤",
    richContent:
      "<h2>問題摘要</h2><ul><li>觸發條件</li><li>使用者影響</li></ul><h2>處置方案</h2><ul><li>短期修補</li><li>長期改善</li></ul><h2>Follow-up</h2><ul><li>驗證方式</li></ul>",
  },
];

const accountOptions = accountList.map((item) => ({
  id: item.id,
  name: item.companyName,
}));

const partnerDirectory = partnerOptions.map((item) => ({
  id: item.id,
  name: item.name,
}));

const projectOptions = projectList.map((item) => ({
  id: item.id,
  name: item.projectName,
}));

const opportunityOptions = opportunityList.map((item) => ({
  id: item.id,
  name: item.name,
}));

const activityDirectory = activityOptions.map((item) => ({
  id: item.id,
  name: item.name,
}));

const supportTicketOptions = [
  { id: "iss-001", title: "支付交易逾時異常" },
  { id: "iss-002", title: "活動追蹤碼遺失" },
  { id: "iss-003", title: "合作夥伴 API 權限錯誤" },
  { id: "iss-004", title: "CRM 匯入欄位對應失敗" },
];

function decision(id, title, description) {
  return { id, title, description };
}

function actionItem(id, content, ownerId, dueDate, status, note = "", taskNo = "") {
  return {
    id,
    content,
    ownerId,
    dueDate,
    status,
    note,
    isConvertedTask: Boolean(taskNo),
    taskNo,
  };
}

function activity(id, occurredAt, title, description, actorName) {
  return { id, occurredAt, title, description, actorName };
}

const meetingList = [
  {
    id: "mtr-001",
    meetingNo: "MTR-2026-001",
    title: "Q2 聯名活動啟動會",
    meetingType: "project_meeting",
    status: "completed",
    meetingDate: "2026-04-03",
    startTime: "14:00",
    endTime: "15:30",
    format: "hybrid",
    location: "台北總部 8F 會議室",
    meetingLink: "https://meet.example.com/q2-kickoff",
    hostId: "u-001",
    recorderId: "u-003",
    internalParticipants: ["u-001", "u-003", "u-004"],
    externalParticipants: ["beanfun PM - 王宏達"],
    contacts: ["王宏達", "劉雅琪"],
    customerId: "acc-001",
    opportunityId: "opp-001",
    projectId: "proj-001",
    activityId: "evt-001",
    partnerId: "partner-001",
    supportTicketId: "",
    objective: "確認 Q2 活動時程與分工，對齊 KPI 與里程碑。",
    agendaSummary: "素材排程、活動頁時程、驗收節點與風險控管",
    richContent:
      "### 討論重點\n- 活動頁預計 4/20 上線\n- 媒體排程在 4/12 前完成核准\n- 會員導流與報表口徑一致\n\n### 需追蹤事項\n- 素材最終版 by 行銷\n- API 驗證 by 開發",
    decisions: [
      decision("d-001", "活動頁上線時程確認", "4/20 完成上線，4/18 完成最終測試"),
      decision("d-002", "素材審核流程固定", "所有素材需於每週三 18:00 前送審"),
    ],
    risks: "素材審核時程可能壓縮測試時間，需預留 fallback 素材。",
    actionItems: [
      actionItem("a-001", "完成活動頁最終文案", "u-001", "2026-04-09", "in_progress"),
      actionItem("a-002", "完成追蹤碼驗證", "u-003", "2026-04-10", "pending", "需與前端同步"),
    ],
    tags: ["Q2", "聯名", "週會"],
    attachments: ["kickoff-agenda.pdf", "creative-timeline.xlsx"],
    notes: "下次週會固定每週四 14:00",
    isImportant: true,
    isRecurring: true,
    createdAt: "2026-04-02 10:20",
    createdBy: "林美雅",
    updatedAt: "2026-04-04 09:12",
    updatedBy: "吳奕承",
    activities: [
      activity("ma-001", "2026-04-04 09:12", "補充待辦", "新增追蹤碼驗證項目", "吳奕承"),
      activity("ma-002", "2026-04-03 15:40", "會議完成", "會議內容已整理並送出", "林美雅"),
    ],
  },
  {
    id: "mtr-002",
    meetingNo: "MTR-2026-002",
    title: "beanfun 續約需求訪談",
    meetingType: "customer_meeting",
    status: "completed",
    meetingDate: "2026-04-01",
    startTime: "10:00",
    endTime: "11:15",
    format: "online",
    location: "",
    meetingLink: "https://meet.example.com/beanfun-discovery",
    hostId: "u-001",
    recorderId: "u-002",
    internalParticipants: ["u-001", "u-002"],
    externalParticipants: ["beanfun 採購 - 陳品瑄", "beanfun 技術 - 黃家維"],
    contacts: ["陳品瑄", "黃家維"],
    customerId: "acc-001",
    opportunityId: "opp-002",
    projectId: "",
    activityId: "",
    partnerId: "partner-001",
    supportTicketId: "",
    objective: "盤點續約範圍與額外模組需求。",
    agendaSummary: "需求範圍、時程、預算、合約條款",
    richContent: "客戶希望追加會員分群模組，並要求 SLA 條款升級。",
    decisions: [decision("d-003", "先出 PoC 範圍", "4/08 前提供 PoC 提案" )],
    risks: "若法務條款未於 4/12 前確認，續約簽署可能遞延。",
    actionItems: [
      actionItem("a-003", "提交 PoC 規格草案", "u-002", "2026-04-08", "pending", "", "TASK-2026-112"),
    ],
    tags: ["續約", "需求訪談"],
    attachments: ["renewal-note.docx"],
    notes: "客戶偏好每週二上午時段。",
    isImportant: true,
    isRecurring: false,
    createdAt: "2026-03-31 17:30",
    createdBy: "林美雅",
    updatedAt: "2026-04-01 12:10",
    updatedBy: "陳志昇",
    activities: [
      activity("ma-003", "2026-04-01 12:10", "轉任務", "已將 PoC 草案轉成任務 TASK-2026-112", "陳志昇"),
    ],
  },
  {
    id: "mtr-003",
    meetingNo: "MTR-2026-003",
    title: "東京展前合作同步",
    meetingType: "partner_meeting",
    status: "draft",
    meetingDate: "2026-04-08",
    startTime: "15:00",
    endTime: "16:00",
    format: "online",
    location: "",
    meetingLink: "https://meet.example.com/tokyo-sync",
    hostId: "u-002",
    recorderId: "u-004",
    internalParticipants: ["u-002", "u-004"],
    externalParticipants: ["Tokyo Guild - Sato"],
    contacts: ["Sato"],
    customerId: "acc-002",
    opportunityId: "opp-004",
    projectId: "proj-002",
    activityId: "evt-002",
    partnerId: "partner-004",
    supportTicketId: "",
    objective: "確認展前素材交付與授權狀態。",
    agendaSummary: "素材、授權、展位與媒體露出",
    richContent: "",
    decisions: [],
    risks: "素材審核進度仍不穩定。",
    actionItems: [
      actionItem("a-004", "確認授權條款版本", "u-004", "2026-04-09", "pending"),
    ],
    tags: ["展會", "夥伴"],
    attachments: [],
    notes: "",
    isImportant: false,
    isRecurring: false,
    createdAt: "2026-04-05 11:25",
    createdBy: "陳志昇",
    updatedAt: "2026-04-05 11:25",
    updatedBy: "陳志昇",
    activities: [],
  },
  {
    id: "mtr-004",
    meetingNo: "MTR-2026-004",
    title: "支付交易異常處理會",
    meetingType: "support_meeting",
    status: "completed",
    meetingDate: "2026-04-04",
    startTime: "11:00",
    endTime: "12:00",
    format: "hybrid",
    location: "NOC 會議室",
    meetingLink: "https://meet.example.com/support-iss-001",
    hostId: "u-003",
    recorderId: "u-005",
    internalParticipants: ["u-003", "u-005", "u-006"],
    externalParticipants: ["客戶 IT - 吳政豪"],
    contacts: ["吳政豪"],
    customerId: "acc-003",
    opportunityId: "",
    projectId: "proj-003",
    activityId: "evt-003",
    partnerId: "partner-003",
    supportTicketId: "iss-001",
    objective: "釐清交易逾時異常的根因與修復方案。",
    agendaSummary: "影響面、根因、修補方案、驗證時程",
    richContent: "已確認主要來自第三方服務 timeout，先切換備援節點。",
    decisions: [decision("d-004", "先套用 fallback", "先上線 fallback，48 小時內觀測")],
    risks: "若第三方延遲未改善，仍可能再發生。",
    actionItems: [
      actionItem("a-005", "完成備援節點壓測", "u-006", "2026-04-07", "in_progress"),
      actionItem("a-006", "回報客戶處理進度", "u-005", "2026-04-06", "completed"),
    ],
    tags: ["support", "高優先"],
    attachments: ["incident-0424.pdf"],
    notes: "需於週報追蹤此議題。",
    isImportant: true,
    isRecurring: false,
    createdAt: "2026-04-04 08:50",
    createdBy: "吳奕承",
    updatedAt: "2026-04-05 09:45",
    updatedBy: "吳奕承",
    activities: [
      activity("ma-004", "2026-04-05 09:45", "更新決議", "補充 fallback 驗證策略", "吳奕承"),
    ],
  },
  {
    id: "mtr-005",
    meetingNo: "MTR-2026-005",
    title: "內部產品週會",
    meetingType: "internal_sync",
    status: "completed",
    meetingDate: "2026-04-02",
    startTime: "09:30",
    endTime: "10:30",
    format: "offline",
    location: "總部 A1 會議室",
    meetingLink: "",
    hostId: "u-006",
    recorderId: "u-001",
    internalParticipants: ["u-001", "u-002", "u-006"],
    externalParticipants: [],
    contacts: [],
    customerId: "",
    opportunityId: "",
    projectId: "",
    activityId: "",
    partnerId: "",
    supportTicketId: "",
    objective: "同步跨產品線進度與本週關鍵風險。",
    agendaSummary: "產品 Roadmap、技術議題、資源排程",
    richContent: "",
    decisions: [decision("d-005", "固定每週二同步", "每週二 09:30 固定週會")],
    risks: "跨團隊需求排程衝突。",
    actionItems: [
      actionItem("a-007", "整併 API 排程", "u-002", "2026-04-11", "pending"),
    ],
    tags: ["週會", "內部"],
    attachments: [],
    notes: "",
    isImportant: false,
    isRecurring: true,
    createdAt: "2026-04-01 17:05",
    createdBy: "田中由紀",
    updatedAt: "2026-04-02 11:02",
    updatedBy: "林美雅",
    activities: [],
  },
];

export {
  actionItemStatusMap,
  accountOptions,
  activityDirectory,
  meetingFormatMap,
  meetingList,
  meetingStatusMap,
  meetingTemplates,
  meetingTypeMap,
  opportunityOptions,
  partnerDirectory,
  projectOptions,
  supportTicketOptions,
  userList,
};
