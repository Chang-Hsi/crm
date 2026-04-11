import { opportunityStageOptions } from '../constants/accountMaps'
import { userList } from './users'

const accountTypeOptions = [
  { label: '全部類型', value: 'all' },
  { label: '企業客戶', value: 'enterprise' },
  { label: '合作夥伴', value: 'partner' },
  { label: '代理商', value: 'distributor' },
  { label: '通路商', value: 'channel' },
]

const accountTierOptions = [
  { label: '全部分級', value: 'all' },
  { label: '戰略級', value: 'strategic' },
  { label: '一般級', value: 'normal' },
  { label: '潛力級', value: 'potential' },
]

const lifecycleOptions = [
  { label: '全部生命週期', value: 'all' },
  { label: '潛在線索', value: 'lead' },
  { label: '成交合作', value: 'deal' },
  { label: '穩定經營', value: 'retention' },
  { label: '流失風險', value: 'churn' },
]

const statusOptions = [
  { label: '啟用中', value: 'active' },
  { label: '未啟用', value: 'inactive' },
  { label: '已流失', value: 'churned' },
]

const regionOptions = [
  { label: '全部地區', value: 'all' },
  { label: '台灣', value: '台灣' },
  { label: '日本', value: '日本' },
  { label: '東南亞', value: '東南亞' },
  { label: '北美', value: '北美' },
]

const userIdByName = Object.fromEntries(userList.map((user) => [user.name, user.id]))

function resolveUserId(userIdOrName = '') {
  if (!userIdOrName) {
    return ''
  }

  if (String(userIdOrName).startsWith('u-')) {
    return userIdOrName
  }

  return userIdByName[userIdOrName] ?? ''
}

const industryOptions = [
  { label: '遊戲發行', value: '遊戲發行' },
  { label: '數位通路', value: '數位通路' },
  { label: '行銷科技', value: '行銷科技' },
  { label: '電子商務', value: '電子商務' },
  { label: '內容媒體', value: '內容媒體' },
  { label: '系統整合', value: '系統整合' },
]

function createContact(id, name, role, email, phone, status = 'active', isPrimary = false) {
  return { id, name, role, email, phone, status, isPrimary }
}

function createOpportunity(id, name, stage, amount, expectedCloseDate, ownerUserId) {
  return { id, name, stage, amount, expectedCloseDate, ownerUserId: resolveUserId(ownerUserId) }
}

function createContract(id, name, status, startDate, endDate) {
  return { id, name, status, startDate, endDate }
}

function createProject(id, name, status, progress, ownerUserId) {
  return { id, name, status, progress, ownerUserId: resolveUserId(ownerUserId) }
}

function createActivity(id, type, title, ownerUserId, occurredAt) {
  return { id, type, title, ownerUserId: resolveUserId(ownerUserId), occurredAt }
}

function createNextAction(title, dueAt, ownerUserId, status = 'pending') {
  return {
    title,
    dueAt,
    ownerUserId: resolveUserId(ownerUserId),
    status,
  }
}

function createFile(id, name, category, uploadedBy, uploadedAt) {
  return { id, name, category, uploadedBy, uploadedAt }
}

function createTimelineItem(id, type, title, description, timestamp) {
  return { id, type, title, description, timestamp }
}

function createAccount(record) {
  const contacts = record.contacts ?? []
  const opportunities = record.opportunities ?? []
  const contracts = record.contracts ?? []
  const projects = record.projects ?? []
  const activities = record.activities ?? []
  const files = record.files ?? []
  const timeline = record.timeline ?? []

  return {
    website: '',
    industry: '',
    phone: '',
    email: '',
    address: '',
    description: '',
    tags: [],
    nextAction: null,
    ...record,
    contacts,
    opportunities,
    contracts,
    projects,
    activities,
    files,
    timeline,
    opportunityCount: record.opportunityCount ?? opportunities.length,
    contactCount: record.contactCount ?? contacts.length,
    contractCount: record.contractCount ?? contracts.length,
    projectCount: record.projectCount ?? projects.length,
  }
}

const accountList = [
  createAccount({
    id: 'acc-001',
    companyName: 'beanfun! Digital Commerce',
    accountCode: 'ACC-001',
    companyType: 'partner',
    tier: 'strategic',
    lifecycleStage: 'retention',
    region: '台灣',
    ownerUserId: 'u-001',
    status: 'active',
    updatedAt: '2026-04-01T09:15:00+08:00',
    website: 'https://beanfun.com',
    industry: '數位通路',
    phone: '02-2717-2000',
    email: 'partnership@beanfun.test',
    address: '台北市中山區民生東路三段 156 號',
    description:
      'beanfun! Digital Commerce 為核心數位通路合作夥伴，負責會員導流、聯名活動與虛寶儲值合作。',
    tags: ['聯名活動', '數位通路', '高潛力'],
    contacts: [
      createContact('c-001', '李雅婷', '商務負責人', 'yating.li@beanfun.test', '0912-300-001', 'active', true),
      createContact('c-002', '張承恩', '行銷窗口', 'ce.chang@beanfun.test', '0912-300-002'),
    ],
    opportunities: [
      createOpportunity('opp-001', 'beanfun! 夏季儲值聯名', 'proposal', 3200000, '2026-04-25', '林美雅'),
      createOpportunity('opp-002', '會員點數互通合作', 'negotiation', 1850000, '2026-05-08', '林美雅'),
      createOpportunity('opp-003', 'beanfun! 品牌活動置換', 'won', 960000, '2026-03-12', '林美雅'),
      createOpportunity('opp-019', 'beanfun! 新會員導流測試案', 'contacted', 760000, '2026-04-19', '林美雅'),
      createOpportunity('opp-031', 'beanfun! 清明檔期加碼合作', 'contacted', 1280000, '2026-04-08', '林美雅'),
    ],
    nextAction: createNextAction('回覆 Q2 聯名活動提案', '2026-04-05T15:00:00+08:00', 'u-001'),
    contracts: [
      createContract('ct-001', '2026 beanfun! 年度合作框架', '執行中', '2026-01-01', '2026-12-31'),
    ],
    projects: [
      createProject('pr-001', 'Q2 聯名活動檔期', '進行中', 68, '林美雅'),
      createProject('pr-002', '會員回流專案', '規劃中', 24, '林美雅'),
    ],
    activities: [
      createActivity('ac-001', '會議', 'Q2 聯名活動 Kickoff', '林美雅', '2026-03-28 10:00'),
      createActivity('ac-002', '拜訪', 'beanfun! 商務拜訪', '林美雅', '2026-03-18 14:00'),
    ],
    files: [
      createFile('f-001', 'beanfun-2026-proposal.pdf', '提案', '林美雅', '2026-03-25 16:30'),
      createFile('f-002', 'member-campaign-brief.pptx', '簡報', '張承恩', '2026-03-20 11:18'),
    ],
    timeline: [
      createTimelineItem('t-001', 'create', '建立客戶資料', '由 林美雅 建立客戶與初始合作紀錄', '2025-12-22 09:12'),
      createTimelineItem('t-002', 'update', '更新合作等級', '客戶分級調整為戰略級', '2026-02-14 13:24'),
      createTimelineItem('t-003', 'activity', '完成 Q2 Kickoff', '與客戶確認 Q2 檔期與資源配置', '2026-03-28 11:26'),
      createTimelineItem('t-003-opp-1', 'opportunity', '送出夏季儲值聯名提案', '商機 beanfun! 夏季儲值聯名 已進入提案中階段', '2026-03-24 16:40'),
      createTimelineItem('t-003-opp-2', 'opportunity', '會員點數互通合作進入談判', '已與客戶確認合作條件與分潤結構', '2026-03-30 09:18'),
    ],
  }),
  createAccount({
    id: 'acc-002',
    companyName: '東京互動娛樂',
    accountCode: 'ACC-002',
    companyType: 'enterprise',
    tier: 'normal',
    lifecycleStage: 'deal',
    region: '日本',
    ownerUserId: 'u-002',
    status: 'active',
    updatedAt: '2026-03-31T15:42:00+08:00',
    website: 'https://tokyo-interactive.test',
    industry: '遊戲發行',
    phone: '+81-3-4588-2201',
    email: 'bizdev@tokyo-interactive.test',
    address: '東京都港區芝公園 4-2-8',
    description: '日本市場重點企業客戶，合作項目以授權、發行與跨區域活動為主。',
    tags: ['日本', '授權合作'],
    contacts: [
      createContact('c-003', '佐藤健介', '業務總監', 'k.sato@tokyo-interactive.test', '+81-90-1000-2201', 'active', true),
      createContact('c-004', '森田愛', '採購窗口', 'ai.morita@tokyo-interactive.test', '+81-90-1000-2202'),
    ],
    opportunities: [
      createOpportunity('opp-004', '日本區聯合發行合作', 'negotiation', 4200000, '2026-05-20', '陳志昇'),
      createOpportunity('opp-005', '大型展會參展置換', 'qualified', 750000, '2026-04-30', '陳志昇'),
      createOpportunity('opp-020', '日本授權內容擴充案', 'proposal', 1580000, '2026-05-28', '陳志昇'),
      createOpportunity('opp-032', '日本春季發行檔期合作', 'negotiation', 2360000, '2026-04-10', '陳志昇'),
    ],
    nextAction: createNextAction('確認日本區授權條款修訂版', '2026-04-08T11:00:00+08:00', 'u-002'),
    contracts: [
      createContract('ct-002', '日本區授權合作備忘錄', '審核中', '2026-03-10', '2027-03-09'),
    ],
    projects: [
      createProject('pr-003', '東京電玩展合作案', '進行中', 52, '陳志昇'),
    ],
    activities: [
      createActivity('ac-003', '會議', '日本發行合作週會', '陳志昇', '2026-03-29 15:30'),
    ],
    files: [
      createFile('f-003', 'jp-license-draft.docx', '合約', '陳志昇', '2026-03-21 09:40'),
    ],
    timeline: [
      createTimelineItem('t-004', 'create', '建立客戶資料', '由 陳志昇 建立日本企業客戶', '2026-01-11 08:45'),
      createTimelineItem('t-005', 'activity', '完成需求訪談', '確認日本區授權合作框架', '2026-03-29 16:20'),
      createTimelineItem('t-005-opp-1', 'opportunity', '聯合發行合作進入談判', '已對齊商務分工與授權條款', '2026-03-30 10:30'),
    ],
  }),
  createAccount({
    id: 'acc-003',
    companyName: 'SEA Gamer Network',
    accountCode: 'ACC-003',
    companyType: 'channel',
    tier: 'strategic',
    lifecycleStage: 'retention',
    region: '東南亞',
    ownerUserId: 'u-003',
    status: 'active',
    updatedAt: '2026-03-29T11:08:00+08:00',
    website: 'https://sea-gamer-network.test',
    industry: '數位通路',
    phone: '+65-6800-1103',
    email: 'partnership@sgn.test',
    address: '10 Anson Road, Singapore',
    description: '東南亞核心通路商，具備跨國流量與支付整合能力。',
    tags: ['東南亞', '通路', '支付整合'],
    contacts: [
      createContact('c-005', 'Marcus Lim', '商務總監', 'marcus.lim@sgn.test', '+65-9000-1103', 'active', true),
      createContact('c-006', 'Alicia Tan', '技術窗口', 'alicia.tan@sgn.test', '+65-9000-1104'),
    ],
    opportunities: [
      createOpportunity('opp-006', '東南亞支付串接擴充', 'proposal', 2750000, '2026-04-18', '陳志昇'),
      createOpportunity('opp-007', '泰國地區導流合作', 'won', 1320000, '2026-03-08', '陳志昇'),
      createOpportunity('opp-021', '馬來西亞導流合作初談', 'contacted', 930000, '2026-04-27', '陳志昇'),
    ],
    nextAction: createNextAction('確認支付串接測試排程', '2026-04-04T14:00:00+08:00', 'u-002'),
    contracts: [
      createContract('ct-003', '2026 東南亞通路年度合作', '執行中', '2026-01-15', '2026-12-31'),
    ],
    projects: [
      createProject('pr-004', 'SGN API 串接', '進行中', 73, '陳志昇'),
      createProject('pr-005', 'Q3 聯合促銷', '規劃中', 31, '陳志昇'),
    ],
    activities: [
      createActivity('ac-004', '通話', 'API 串接技術確認', '陳志昇', '2026-03-26 17:10'),
      createActivity('ac-005', '會議', 'Q3 導流策略會議', '陳志昇', '2026-03-19 10:00'),
    ],
    files: [
      createFile('f-004', 'sgn-api-spec-v2.pdf', '技術文件', 'Alicia Tan', '2026-03-24 18:03'),
    ],
    timeline: [
      createTimelineItem('t-006', 'update', '更新聯繫窗口', '新增技術窗口 Alicia Tan', '2026-02-26 10:22'),
      createTimelineItem('t-007', 'activity', '完成支付串接提案', '已送出東南亞支付串接報價', '2026-03-27 09:46'),
      createTimelineItem('t-007-opp-1', 'opportunity', '支付串接案進入提案中', '已寄出正式商務提案與技術排程', '2026-03-27 09:30'),
      createTimelineItem('t-007-opp-2', 'opportunity', '泰國導流合作成交', '東南亞導流合作商機已完成簽核', '2026-03-08 18:10'),
    ],
  }),
  createAccount({
    id: 'acc-004',
    companyName: 'Nexon Alliance Retail',
    accountCode: 'ACC-004',
    companyType: 'distributor',
    tier: 'normal',
    lifecycleStage: 'lead',
    region: '日本',
    ownerUserId: 'u-004',
    status: 'active',
    updatedAt: '2026-03-28T13:27:00+08:00',
    website: 'https://nexon-alliance.test',
    industry: '遊戲發行',
    phone: '+81-3-5210-0192',
    email: 'alliance@nexon-alliance.test',
    address: '東京都千代田區麹町 1-6',
    description: '日本代理渠道候選客戶，目前在 lead 階段，正在進行需求盤點。',
    tags: ['代理商', '新名單'],
    contacts: [
      createContact('c-007', '高橋誠', '採購經理', 'makoto.takahashi@nexon-alliance.test', '+81-90-3100-1201', 'active', true),
    ],
    opportunities: [
      createOpportunity('opp-008', '日本代理合作評估案', 'potential', 680000, '2026-05-03', '林美雅'),
      createOpportunity('opp-022', '日本新遊上架資源合作', 'qualified', 540000, '2026-05-12', '林美雅'),
      createOpportunity('opp-034', 'Nexon 春季合作回訪案', 'contacted', 710000, '2026-04-09', '林美雅'),
    ],
    nextAction: createNextAction('追蹤代理合作需求訪談時間', '2026-04-07T10:30:00+08:00', 'u-001'),
    activities: [
      createActivity('ac-006', 'Email', '寄送公司介紹與合作 deck', '林美雅', '2026-03-24 09:35'),
    ],
    timeline: [
      createTimelineItem('t-008', 'create', '建立潛在線索', '由 林美雅 建立 lead 名單', '2026-03-02 11:03'),
      createTimelineItem('t-008-opp-1', 'opportunity', '建立日本代理合作評估案', '商機進入潛在線索階段，等待首次回覆', '2026-03-24 09:40'),
    ],
  }),
  createAccount({
    id: 'acc-005',
    companyName: 'PlayHub Enterprise',
    accountCode: 'ACC-005',
    companyType: 'enterprise',
    tier: 'potential',
    lifecycleStage: 'lead',
    region: '北美',
    ownerUserId: 'u-005',
    status: 'active',
    updatedAt: '2026-03-27T17:03:00+08:00',
    website: 'https://playhub-enterprise.test',
    industry: '電子商務',
    phone: '+1-206-555-0105',
    email: 'bd@playhub-enterprise.test',
    address: 'Seattle, Washington, United States',
    description: '北美企業合作名單，正在評估會員活動與數位商品合作可能。',
    tags: ['北美', '企業客戶'],
    contacts: [
      createContact('c-008', 'Jason Reed', 'Business Lead', 'jason.reed@playhub-enterprise.test', '+1-206-555-1105', 'active', true),
    ],
    opportunities: [
      createOpportunity('opp-009', '北美會員互導評估', 'potential', 890000, '2026-05-11', '田中由紀'),
      createOpportunity('opp-010', '虛寶禮包合作', 'qualified', 560000, '2026-05-25', '田中由紀'),
      createOpportunity('opp-023', '北美節慶檔期合作', 'proposal', 1250000, '2026-06-04', '田中由紀'),
      createOpportunity('opp-035', 'PlayHub 首波會員名單接洽', 'contacted', 680000, '2026-04-11', '田中由紀'),
    ],
    nextAction: createNextAction('準備北美會員互導合作摘要', '2026-04-09T09:00:00+08:00', 'u-004'),
    timeline: [
      createTimelineItem('t-009', 'create', '建立北美企業名單', '完成首輪名單建置與資料整理', '2026-03-06 14:42'),
      createTimelineItem('t-009-opp-1', 'opportunity', '會員互導評估案建立', '商機進入潛在線索階段，待安排初次會議', '2026-03-18 10:05'),
    ],
  }),
  createAccount({
    id: 'acc-006',
    companyName: '節點數位通路',
    accountCode: 'ACC-006',
    companyType: 'channel',
    tier: 'normal',
    lifecycleStage: 'deal',
    region: '台灣',
    ownerUserId: 'u-006',
    status: 'inactive',
    updatedAt: '2026-03-24T12:18:00+08:00',
    website: 'https://orange-channel.test',
    industry: '數位通路',
    phone: '02-2655-6606',
    email: 'channel@orange-channel.test',
    address: '台北市內湖區瑞光路 518 號',
    description: '台灣本地通路合作對象，先前合作中斷，目前保留待重啟。',
    tags: ['既有客戶', '待重啟'],
    contacts: [
      createContact('c-009', '王宥心', '通路窗口', 'yusin.wang@orange-channel.test', '0912-660-606', 'inactive', true),
    ],
    opportunities: [
      createOpportunity('opp-011', '台灣點數包重新上架', 'negotiation', 1180000, '2026-04-29', '吳奕承'),
      createOpportunity('opp-024', '數位儲值合作回溫案', 'contacted', 680000, '2026-04-23', '吳奕承'),
    ],
    nextAction: createNextAction('確認內部整併後的重啟時程', '2026-04-10T16:00:00+08:00', 'u-003'),
    timeline: [
      createTimelineItem('t-010', 'update', '狀態調整為未啟用', '因內部整併先暫停合作', '2026-03-24 12:18'),
      createTimelineItem('t-010-opp-1', 'opportunity', '重新上架合作進入談判', '已重啟合作條件討論與檔期確認', '2026-03-25 09:50'),
    ],
  }),
  createAccount({
    id: 'acc-007',
    companyName: '雲拓合作夥伴',
    accountCode: 'ACC-007',
    companyType: 'partner',
    tier: 'potential',
    lifecycleStage: 'lead',
    region: '東南亞',
    ownerUserId: 'u-007',
    status: 'active',
    updatedAt: '2026-03-20T10:41:00+08:00',
    website: 'https://cloud-arc.test',
    industry: '系統整合',
    phone: '+66-02-100-7707',
    email: 'sales@cloud-arc.test',
    address: 'Bangkok, Thailand',
    description: '具備活動技術整合能力的合作夥伴，適合做東南亞活動落地支援。',
    tags: ['系統整合'],
    contacts: [
      createContact('c-010', '蘇帕功', '技術窗口', 'supakorn@cloud-arc.test', '+66-80-100-7707', 'active', true),
    ],
    opportunities: [
      createOpportunity('opp-012', '東南亞活動技術合作', 'qualified', 420000, '2026-04-22', '林美雅'),
      createOpportunity('opp-025', '泰國活動落地整合案', 'negotiation', 860000, '2026-05-06', '林美雅'),
      createOpportunity('opp-036', '泰國活動執行加值合作', 'negotiation', 1180000, '2026-04-06', '林美雅'),
    ],
    nextAction: createNextAction('確認活動落地技術需求清單', '2026-04-06T13:00:00+08:00', 'u-001'),
  }),
  createAccount({
    id: 'acc-008',
    companyName: 'Pixel Frontier Distribution',
    accountCode: 'ACC-008',
    companyType: 'distributor',
    tier: 'strategic',
    lifecycleStage: 'deal',
    region: '北美',
    ownerUserId: 'u-008',
    status: 'active',
    updatedAt: '2026-03-18T14:50:00+08:00',
    website: 'https://pixel-frontier.test',
    industry: '遊戲發行',
    phone: '+1-415-555-0088',
    email: 'alliance@pixel-frontier.test',
    address: 'San Francisco, California, United States',
    description: '北美戰略代理商，已進入深度合作洽談階段。',
    tags: ['北美', '代理商'],
    contacts: [
      createContact('c-011', 'Emma Carter', 'Partnership Director', 'emma.carter@pixel-frontier.test', '+1-415-555-1188', 'active', true),
      createContact('c-012', 'Ryan Brooks', 'Operation Lead', 'ryan.brooks@pixel-frontier.test', '+1-415-555-2288'),
    ],
    opportunities: [
      createOpportunity('opp-013', '北美代理聯運合作', 'negotiation', 5100000, '2026-05-14', '陳志昇'),
      createOpportunity('opp-014', '品牌素材共投案', 'proposal', 780000, '2026-04-17', '陳志昇'),
      createOpportunity('opp-026', '北美聯運媒體加碼案', 'won', 2100000, '2026-03-26', '陳志昇'),
    ],
    nextAction: createNextAction('完成北美聯運合作條款確認', '2026-04-03T18:00:00+08:00', 'u-002'),
    contracts: [
      createContract('ct-004', '北美代理合作意向書', '審核中', '2026-03-12', '2027-03-11'),
    ],
    projects: [
      createProject('pr-006', '北美上線整備', '進行中', 47, '陳志昇'),
    ],
    timeline: [
      createTimelineItem('t-012', 'opportunity', '北美代理聯運合作進入談判', '已完成商務條款對齊，等待法務確認', '2026-03-30 12:40'),
      createTimelineItem('t-013', 'opportunity', '品牌素材共投案送出提案', '已提交品牌素材與投放資源規劃', '2026-03-22 15:20'),
    ],
  }),
  createAccount({
    id: 'acc-009',
    companyName: 'Kumo Data Holdings',
    accountCode: 'ACC-009',
    companyType: 'enterprise',
    tier: 'normal',
    lifecycleStage: 'churn',
    region: '日本',
    ownerUserId: 'u-009',
    status: 'churned',
    updatedAt: '2026-03-16T09:09:00+08:00',
    website: 'https://kumo-data.test',
    industry: '內容媒體',
    phone: '+81-3-6100-1099',
    email: 'partnership@kumo-data.test',
    address: '東京都澀谷區神宮前 6-3-7',
    description: '過往合作曾有成效，但近一年因策略調整而逐步流失。',
    tags: ['流失預警'],
    contacts: [
      createContact('c-013', '中島悠斗', '內容合作窗口', 'yuto.nakajima@kumo-data.test', '+81-90-6100-1099', 'inactive', true),
    ],
    opportunities: [
      createOpportunity('opp-015', '內容資源交換案', 'lost', 0, '2026-02-20', '吳奕承'),
      createOpportunity('opp-027', '日本內容回流合作重談', 'lost', 430000, '2026-03-02', '吳奕承'),
    ],
    timeline: [
      createTimelineItem('t-011', 'update', '標記為已流失', '合作終止，保留歷史紀錄', '2026-03-16 09:09'),
    ],
  }),
  createAccount({
    id: 'acc-010',
    companyName: 'Arena Plus Co.',
    accountCode: 'ACC-010',
    companyType: 'partner',
    tier: 'strategic',
    lifecycleStage: 'retention',
    region: '台灣',
    ownerUserId: 'u-010',
    status: 'active',
    updatedAt: '2026-03-14T08:32:00+08:00',
    website: 'https://arena-plus.test',
    industry: '行銷科技',
    phone: '02-2776-9910',
    email: 'cooperate@arena-plus.test',
    address: '台北市大安區忠孝東路四段 221 號',
    description: '行銷資源強、反應速度快的重點合作夥伴。',
    tags: ['行銷合作', '戰略級'],
    contacts: [
      createContact('c-014', '楊書妤', '商務窗口', 'shuyu.yang@arena-plus.test', '0910-414-010', 'active', true),
      createContact('c-015', '陳柏丞', '媒體採購', 'allen.chen@arena-plus.test', '0910-414-011'),
    ],
    opportunities: [
      createOpportunity('opp-016', 'Q3 品牌聯名活動', 'proposal', 2280000, '2026-05-02', '林美雅'),
      createOpportunity('opp-028', '季度會員互導合作', 'contacted', 1180000, '2026-04-24', '林美雅'),
      createOpportunity('opp-033', 'Arena Plus 會員回流合作', 'contacted', 840000, '2026-04-05', '林美雅'),
    ],
    nextAction: createNextAction('確認 Q3 聯名活動素材檔期', '2026-04-11T14:30:00+08:00', 'u-001'),
    projects: [
      createProject('pr-007', '品牌素材共創', '進行中', 64, '林美雅'),
    ],
  }),
  createAccount({
    id: 'acc-011',
    companyName: 'Bluewind eCommerce',
    accountCode: 'ACC-011',
    companyType: 'channel',
    tier: 'normal',
    lifecycleStage: 'deal',
    region: '東南亞',
    ownerUserId: 'u-011',
    status: 'inactive',
    updatedAt: '2026-03-12T16:12:00+08:00',
    website: 'https://bluewind-ecommerce.test',
    industry: '電子商務',
    phone: '+62-21-550-0011',
    email: 'bd@bluewind-ecommerce.test',
    address: 'Jakarta, Indonesia',
    description: '東南亞電商通路，正在重整合作條件。',
    tags: ['東南亞', '待重談'],
    contacts: [
      createContact('c-016', 'Nadia Putri', '商務窗口', 'nadia.putri@bluewind-ecommerce.test', '+62-811-550-0011', 'active', true),
    ],
    opportunities: [
      createOpportunity('opp-017', '印尼電商上架合作', 'qualified', 960000, '2026-04-26', '田中由紀'),
      createOpportunity('opp-029', '東南亞商城曝光置換案', 'proposal', 1540000, '2026-05-03', '田中由紀'),
    ],
    nextAction: createNextAction('確認印尼上架合作上線窗口', '2026-04-12T10:00:00+08:00', 'u-004'),
  }),
  createAccount({
    id: 'acc-012',
    companyName: '蘭星媒體集團',
    accountCode: 'ACC-012',
    companyType: 'enterprise',
    tier: 'potential',
    lifecycleStage: 'lead',
    region: '台灣',
    ownerUserId: 'u-012',
    status: 'active',
    updatedAt: '2026-03-10T11:22:00+08:00',
    website: 'https://orchid-media.test',
    industry: '內容媒體',
    phone: '02-3322-0012',
    email: 'media@orchid-media.test',
    address: '台北市信義區松智路 17 號',
    description: '內容媒體集團，適合作品牌曝光與導購內容合作。',
    tags: ['媒體曝光', '潛力客戶'],
    contacts: [
      createContact('c-017', '陳怡靜', '內容合作', 'amy.chen@orchid-media.test', '0918-320-112', 'active', true),
    ],
    opportunities: [
      createOpportunity('opp-018', '內容導流合作', 'potential', 350000, '2026-04-20', '陳志昇'),
      createOpportunity('opp-030', '品牌內容專題合作', 'qualified', 620000, '2026-04-29', '陳志昇'),
    ],
    nextAction: createNextAction('回覆內容導流合作提案方向', '2026-04-06T17:00:00+08:00', 'u-002'),
  }),
]

export {
  accountList,
  accountTypeOptions,
  accountTierOptions,
  lifecycleOptions,
  statusOptions,
  regionOptions,
  industryOptions,
  opportunityStageOptions,
}
