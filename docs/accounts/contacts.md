1. **`contacts.js` 靜態資料設計**
2. **聯絡人頁面企劃**

內容已經以目前企劃與現有 `accounts.js` 結構為基礎，改成**低耦合、可持續擴充**的版本。企劃中已明確把 Contact 視為 Account 之下的聯絡人資料，且客戶詳情頁與聯絡人頁都需要支援；同時目前 `accounts.js` 內已有 contact 的實際欄位形態可參考。

UI/UX則直接參照客戶列表頁的做法，以避免用戶需要增加學習系統操作的成本。

---

# 一、`contacts.js` 靜態資料設計

## 1.1 設計原則

* Contact 為獨立資料源，不再巢狀存放於 `accounts.js`
* 透過 `accountId` 關聯到 Account
* 可支援：

  * 客戶詳情頁的聯絡人 tab
  * 全域聯絡人頁
  * 新增 / 編輯聯絡人
  * 後續關聯商機、互動、最近聯繫資訊
* 欄位先以 MVP 可用為主，不一次做過重

---

## 1.2 建議檔案位置

```text
src/data/contacts.js
```

---

## 1.3 建議資料結構

```js
const contactRoleOptions = [
  { label: '全部角色', value: 'all' },
  { label: '商務負責人', value: 'business_lead' },
  { label: '行銷窗口', value: 'marketing' },
  { label: '採購窗口', value: 'purchasing' },
  { label: '技術窗口', value: 'technical' },
  { label: '營運窗口', value: 'operation' },
  { label: '媒體採購', value: 'media_buying' },
  { label: '內容合作', value: 'content' },
]

const contactStatusOptions = [
  { label: '全部狀態', value: 'all' },
  { label: '啟用中', value: 'active' },
  { label: '未啟用', value: 'inactive' },
]

const primaryContactOptions = [
  { label: '全部聯絡人', value: 'all' },
  { label: '主要聯絡人', value: 'yes' },
  { label: '非主要聯絡人', value: 'no' },
]

function createContact(record) {
  return {
    title: '',
    department: '',
    mobile: '',
    notes: '',
    lastContactAt: '',
    createdAt: '',
    updatedAt: '',
    ...record,
  }
}

const contactList = [
  createContact({
    id: 'c-001',
    accountId: 'acc-001',
    name: '李雅婷',
    title: '商務負責人',
    department: 'Business Development',
    role: 'business_lead',
    roleLabel: '商務負責人',
    email: 'yating.li@beanfun.test',
    phone: '0912-300-001',
    mobile: '0912-300-001',
    status: 'active',
    isPrimary: true,
    owner: '林美雅',
    region: '台灣',
    lastContactAt: '2026-03-28 10:00',
    notes: '主要商務窗口，負責年度合作與聯名檔期。',
    createdAt: '2025-12-22 09:12',
    updatedAt: '2026-03-28 11:26',
  }),
  createContact({
    id: 'c-002',
    accountId: 'acc-001',
    name: '張承恩',
    title: '行銷窗口',
    department: 'Marketing',
    role: 'marketing',
    roleLabel: '行銷窗口',
    email: 'ce.chang@beanfun.test',
    phone: '0912-300-002',
    mobile: '0912-300-002',
    status: 'active',
    isPrimary: false,
    owner: '林美雅',
    region: '台灣',
    lastContactAt: '2026-03-20 11:18',
    notes: '聯名活動素材與檔期對接窗口。',
    createdAt: '2025-12-22 09:15',
    updatedAt: '2026-03-20 11:18',
  }),
  createContact({
    id: 'c-003',
    accountId: 'acc-002',
    name: '佐藤健介',
    title: '業務總監',
    department: 'Business',
    role: 'business_lead',
    roleLabel: '商務負責人',
    email: 'k.sato@tokyo-interactive.test',
    phone: '+81-90-1000-2201',
    mobile: '+81-90-1000-2201',
    status: 'active',
    isPrimary: true,
    owner: '陳志昇',
    region: '日本',
    lastContactAt: '2026-03-29 15:30',
    notes: '日本市場授權合作決策窗口。',
    createdAt: '2026-01-11 08:45',
    updatedAt: '2026-03-29 16:20',
  }),
  createContact({
    id: 'c-004',
    accountId: 'acc-002',
    name: '森田愛',
    title: '採購窗口',
    department: 'Procurement',
    role: 'purchasing',
    roleLabel: '採購窗口',
    email: 'ai.morita@tokyo-interactive.test',
    phone: '+81-90-1000-2202',
    mobile: '+81-90-1000-2202',
    status: 'active',
    isPrimary: false,
    owner: '陳志昇',
    region: '日本',
    lastContactAt: '2026-03-25 14:10',
    notes: '合約條件與採購流程對接。',
    createdAt: '2026-01-11 08:47',
    updatedAt: '2026-03-25 14:10',
  }),
  createContact({
    id: 'c-005',
    accountId: 'acc-003',
    name: 'Marcus Lim',
    title: '商務總監',
    department: 'Partnership',
    role: 'business_lead',
    roleLabel: '商務負責人',
    email: 'marcus.lim@sgn.test',
    phone: '+65-9000-1103',
    mobile: '+65-9000-1103',
    status: 'active',
    isPrimary: true,
    owner: '陳志昇',
    region: '東南亞',
    lastContactAt: '2026-03-26 17:10',
    notes: '東南亞通路合作主要窗口。',
    createdAt: '2026-01-22 10:00',
    updatedAt: '2026-03-26 17:10',
  }),
  createContact({
    id: 'c-006',
    accountId: 'acc-003',
    name: 'Alicia Tan',
    title: '技術窗口',
    department: 'Engineering',
    role: 'technical',
    roleLabel: '技術窗口',
    email: 'alicia.tan@sgn.test',
    phone: '+65-9000-1104',
    mobile: '+65-9000-1104',
    status: 'active',
    isPrimary: false,
    owner: '陳志昇',
    region: '東南亞',
    lastContactAt: '2026-03-24 18:03',
    notes: 'API 串接與支付整合窗口。',
    createdAt: '2026-02-26 10:22',
    updatedAt: '2026-03-24 18:03',
  }),
  createContact({
    id: 'c-007',
    accountId: 'acc-004',
    name: '高橋誠',
    title: '採購經理',
    department: 'Procurement',
    role: 'purchasing',
    roleLabel: '採購窗口',
    email: 'makoto.takahashi@nexon-alliance.test',
    phone: '+81-90-3100-1201',
    mobile: '+81-90-3100-1201',
    status: 'active',
    isPrimary: true,
    owner: '林美雅',
    region: '日本',
    lastContactAt: '2026-03-24 09:35',
    notes: '代理合作需求盤點窗口。',
    createdAt: '2026-03-02 11:03',
    updatedAt: '2026-03-24 09:35',
  }),
  createContact({
    id: 'c-008',
    accountId: 'acc-005',
    name: 'Jason Reed',
    title: 'Business Lead',
    department: 'Business',
    role: 'business_lead',
    roleLabel: '商務負責人',
    email: 'jason.reed@playhub-enterprise.test',
    phone: '+1-206-555-1105',
    mobile: '+1-206-555-1105',
    status: 'active',
    isPrimary: true,
    owner: '田中由紀',
    region: '北美',
    lastContactAt: '2026-03-21 09:50',
    notes: '北美會員活動合作窗口。',
    createdAt: '2026-03-06 14:42',
    updatedAt: '2026-03-21 09:50',
  }),
  createContact({
    id: 'c-009',
    accountId: 'acc-006',
    name: '王宥心',
    title: '通路窗口',
    department: 'Channel Sales',
    role: 'operation',
    roleLabel: '營運窗口',
    email: 'yusin.wang@orange-channel.test',
    phone: '0912-660-606',
    mobile: '0912-660-606',
    status: 'inactive',
    isPrimary: true,
    owner: '吳奕承',
    region: '台灣',
    lastContactAt: '2026-03-12 13:20',
    notes: '目前合作暫停，保留窗口資料。',
    createdAt: '2026-01-18 10:20',
    updatedAt: '2026-03-24 12:18',
  }),
  createContact({
    id: 'c-010',
    accountId: 'acc-007',
    name: '蘇帕功',
    title: '技術窗口',
    department: 'Integration',
    role: 'technical',
    roleLabel: '技術窗口',
    email: 'supakorn@cloud-arc.test',
    phone: '+66-80-100-7707',
    mobile: '+66-80-100-7707',
    status: 'active',
    isPrimary: true,
    owner: '林美雅',
    region: '東南亞',
    lastContactAt: '2026-03-18 16:10',
    notes: '活動技術整合窗口。',
    createdAt: '2026-03-05 11:00',
    updatedAt: '2026-03-18 16:10',
  }),
  createContact({
    id: 'c-011',
    accountId: 'acc-008',
    name: 'Emma Carter',
    title: 'Partnership Director',
    department: 'Partnership',
    role: 'business_lead',
    roleLabel: '商務負責人',
    email: 'emma.carter@pixel-frontier.test',
    phone: '+1-415-555-1188',
    mobile: '+1-415-555-1188',
    status: 'active',
    isPrimary: true,
    owner: '陳志昇',
    region: '北美',
    lastContactAt: '2026-03-28 09:30',
    notes: '北美代理合作決策窗口。',
    createdAt: '2026-02-10 09:30',
    updatedAt: '2026-03-28 09:30',
  }),
  createContact({
    id: 'c-012',
    accountId: 'acc-008',
    name: 'Ryan Brooks',
    title: 'Operation Lead',
    department: 'Operations',
    role: 'operation',
    roleLabel: '營運窗口',
    email: 'ryan.brooks@pixel-frontier.test',
    phone: '+1-415-555-2288',
    mobile: '+1-415-555-2288',
    status: 'active',
    isPrimary: false,
    owner: '陳志昇',
    region: '北美',
    lastContactAt: '2026-03-22 14:40',
    notes: '代理聯運實務窗口。',
    createdAt: '2026-02-12 10:00',
    updatedAt: '2026-03-22 14:40',
  }),
  createContact({
    id: 'c-013',
    accountId: 'acc-009',
    name: '中島悠斗',
    title: '內容合作窗口',
    department: 'Content',
    role: 'content',
    roleLabel: '內容合作',
    email: 'yuto.nakajima@kumo-data.test',
    phone: '+81-90-6100-1099',
    mobile: '+81-90-6100-1099',
    status: 'inactive',
    isPrimary: true,
    owner: '吳奕承',
    region: '日本',
    lastContactAt: '2026-02-20 10:10',
    notes: '歷史合作窗口，客戶已流失。',
    createdAt: '2025-11-12 13:00',
    updatedAt: '2026-03-16 09:09',
  }),
  createContact({
    id: 'c-014',
    accountId: 'acc-010',
    name: '楊書妤',
    title: '商務窗口',
    department: 'Business',
    role: 'business_lead',
    roleLabel: '商務負責人',
    email: 'shuyu.yang@arena-plus.test',
    phone: '0910-414-010',
    mobile: '0910-414-010',
    status: 'active',
    isPrimary: true,
    owner: '林美雅',
    region: '台灣',
    lastContactAt: '2026-03-26 11:30',
    notes: '戰略合作主窗口。',
    createdAt: '2026-01-08 09:20',
    updatedAt: '2026-03-26 11:30',
  }),
  createContact({
    id: 'c-015',
    accountId: 'acc-010',
    name: '陳柏丞',
    title: '媒體採購',
    department: 'Media Buying',
    role: 'media_buying',
    roleLabel: '媒體採購',
    email: 'allen.chen@arena-plus.test',
    phone: '0910-414-011',
    mobile: '0910-414-011',
    status: 'active',
    isPrimary: false,
    owner: '林美雅',
    region: '台灣',
    lastContactAt: '2026-03-20 15:00',
    notes: '素材投放與媒體資源對接。',
    createdAt: '2026-01-08 09:22',
    updatedAt: '2026-03-20 15:00',
  }),
  createContact({
    id: 'c-016',
    accountId: 'acc-011',
    name: 'Nadia Putri',
    title: '商務窗口',
    department: 'Business',
    role: 'business_lead',
    roleLabel: '商務負責人',
    email: 'nadia.putri@bluewind-ecommerce.test',
    phone: '+62-811-550-0011',
    mobile: '+62-811-550-0011',
    status: 'active',
    isPrimary: true,
    owner: '田中由紀',
    region: '東南亞',
    lastContactAt: '2026-03-19 13:50',
    notes: '印尼電商上架合作窗口。',
    createdAt: '2026-02-28 08:40',
    updatedAt: '2026-03-19 13:50',
  }),
  createContact({
    id: 'c-017',
    accountId: 'acc-012',
    name: '陳怡靜',
    title: '內容合作',
    department: 'Content Partnership',
    role: 'content',
    roleLabel: '內容合作',
    email: 'amy.chen@orchid-media.test',
    phone: '0918-320-112',
    mobile: '0918-320-112',
    status: 'active',
    isPrimary: true,
    owner: '陳志昇',
    region: '台灣',
    lastContactAt: '2026-03-18 09:10',
    notes: '內容導流合作窗口。',
    createdAt: '2026-03-01 10:20',
    updatedAt: '2026-03-18 09:10',
  }),
]

export {
  contactList,
  contactRoleOptions,
  contactStatusOptions,
  primaryContactOptions,
}
```

---

## 1.4 與 `accounts.js` 的關係

`contacts.js` 與 `accounts.js` 的關聯只透過：

```js
contact.accountId === account.id
```

不要再在 `accounts.js` 內持續維護完整 `contacts[]`。

### 建議過渡策略

你目前已有巢狀資料，可先做過渡：

* 新版聯絡人頁吃 `contacts.js`
* Account Detail 頁的聯絡人 tab 也改吃 `getContactsByAccountId(accountId)`
* 之後再逐步移除 `accounts.js` 中的 `contacts[]`

---

# 二、聯絡人頁面企劃

## 2.1 頁面定位

聯絡人頁是 **全域聯絡人工作台**，用途不是取代客戶頁，而是支援：

* 跨客戶找人
* 找主要窗口
* 快速聯繫人
* 快速跳回所屬客戶

所以：

```text
客戶頁 = Account 主工作頁
聯絡人頁 = Contact Directory / Cross-account Search 頁
```

---

## 2.2 路由與頁籤

### 路由

```text
/contacts
```

### Header Tab

```text
聯絡人
```

---

## 2.3 頁面目標

此頁要解決的核心問題：

* 只記得人名，不記得公司
* 想找某種角色的窗口（例如技術窗口 / 採購窗口）
* 想知道某公司有哪些窗口
* 想確認誰是主要聯絡人
* 想快速從聯絡人跳到客戶詳情頁

---

## 2.4 頁面資訊架構

```text
聯絡人頁
├─ 頁面標題區
│   ├─ 標題：聯絡人
│   ├─ 總數
│   └─ 新增聯絡人
│
├─ 搜尋 / 篩選區
│   ├─ 關鍵字搜尋
│   ├─ 聯絡人角色
│   ├─ 是否主要聯絡人
│   ├─ 地區
│   ├─ 狀態
│   ├─ 負責業務
│   ├─ 所屬客戶
│   └─ 重設
│
├─ 聯絡人列表 Table
│   ├─ 姓名
│   ├─ 角色 / 職稱
│   ├─ 所屬客戶
│   ├─ Email
│   ├─ 電話
│   ├─ 地區
│   ├─ 負責業務
│   ├─ 主要聯絡人
│   ├─ 狀態
│   └─ 操作
│
└─ 聯絡人 Drawer
    ├─ 查看
    └─ 編輯（後補）
```

---

## 2.5 搜尋與篩選企劃

### 關鍵字搜尋

搜尋對象：

* 姓名
* Email
* 電話
* 所屬客戶名稱

placeholder：

```text
搜尋姓名 / Email / 電話 / 客戶名稱
```

### 篩選條件

* 聯絡人角色 `role`
* 是否主要聯絡人 `isPrimary`
* 地區 `region`
* 狀態 `status`
* 負責業務 `owner`
* 所屬客戶 `accountId`

### 排序（第一版可選）

* 最近更新時間
* 姓名
* 所屬客戶名稱

---

## 2.6 Table 欄位企劃

### 欄位清單

```text
姓名
角色 / 職稱
所屬客戶
Email
電話
地區
負責業務
主要聯絡人
狀態
操作
```

### 顯示規則

#### 姓名

* 主欄位
* 點擊開 Drawer 查看

#### 角色 / 職稱

* 顯示 `roleLabel` 或 `title`

#### 所屬客戶

* 顯示 `accountName`
* 可點擊
* 點擊後開啟該客戶詳情頁 tab

#### Email / 電話

* 純展示即可
* 後續可擴充點擊複製或 mailto

#### 地區 / 負責業務

* 由 Account meta 補齊

#### 主要聯絡人

* Tag 顯示：

  * `主要`
  * `一般`

#### 狀態

* `active` / `inactive`
* 用 tag 呈現

#### 操作

* 查看
* 編輯
* 跳到客戶
* 設為主要（可 placeholder）
* 停用 / 啟用（可 placeholder）

---

## 2.7 聯絡人查看 Drawer 企劃

### 呈現方式

* 右側 Drawer
* 不開新頁
* 從姓名或查看按鈕打開

### 內容結構

```text
聯絡人資料
├─ 姓名
├─ 角色 / 職稱
├─ 部門
├─ Email
├─ 電話 / 手機
├─ 狀態
├─ 是否主要聯絡人
├─ 所屬客戶
├─ 地區
├─ 負責業務
├─ 最近聯繫時間
└─ 備註
```

### 底部操作

* 關閉
* 編輯（若尚未完成可 placeholder）
* 跳到客戶詳情

---

## 2.8 新增聯絡人策略

### UI 建議

新增聯絡人用 **Drawer**，不要開新頁。

### 但第一階段建議

雖然聯絡人頁右上可放「新增聯絡人」，但**第一個完整可用的新增入口應優先放在 Account Detail 頁**，因為聯絡人一定屬於某個 Account。

### 在聯絡人頁新增時的表單欄位

* 所屬客戶（必填）
* 姓名（必填）
* 角色 / 職稱（必填）
* 部門（可選）
* Email（必填）
* 電話 / 手機（可選）
* 是否主要聯絡人
* 狀態（預設 active）
* 備註

---

## 2.9 空狀態企劃

### 無資料

```text
尚無聯絡人
建立第一位聯絡人，方便後續商機推進與互動記錄。
[新增聯絡人]
```

### 無搜尋結果

```text
找不到符合條件的聯絡人
請調整搜尋條件或重設篩選。
[重設篩選]
```

---

## 2.10 權限與互動規則

### 第一版預設

* BD：可查看、可新增、可編輯自己範圍內聯絡人
* Manager：可查看全部、可部分編輯
* Finance：可查看
* Admin：全部可操作

### UI 規則

* 無編輯權限時隱藏編輯按鈕
* 無新增權限時隱藏新增聯絡人按鈕
* 點擊所屬客戶永遠可跳轉（若具備 Account read 權限）

---

## 2.11 與客戶詳情頁的關係

### 客戶詳情頁的聯絡人 tab

* 看單一客戶的聯絡人
* 情境式查看

### 聯絡人頁

* 看全域聯絡人
* 跨客戶搜尋
* 通訊錄模式

這兩者不是重複，而是不同視角。

---

## 2.12 第一版 MVP 範圍建議

### 必做

* 聯絡人列表頁
* 關鍵字搜尋
* 篩選（角色 / 是否主要 / 地區 / 狀態 / owner）
* 查看 Drawer
* 點所屬客戶跳 Account Detail

### 可先 placeholder

* 新增聯絡人
* 編輯聯絡人
* 設為主要
* 停用 / 啟用

---

## 2.13 可直接給 Codex 的頁面規格

```text
請新增 Contacts 頁面，作為全域聯絡人列表頁。

資料來源：
- 使用 src/data/contacts.js 作為主資料源
- 每筆 contact 透過 accountId 關聯到 accounts.js
- 在頁面層或 store 層補齊 accountName / owner / region / companyType 等顯示用欄位

頁面功能：
1. 顯示聯絡人列表 table
2. 支援搜尋：姓名 / Email / 電話 / 客戶名稱
3. 支援篩選：
   - role
   - isPrimary
   - region
   - status
   - owner
   - accountId
4. 表格欄位：
   - 姓名
   - 角色 / 職稱
   - 所屬客戶
   - Email
   - 電話
   - 地區
   - 負責業務
   - 主要聯絡人
   - 狀態
   - 操作
5. 點姓名開 Drawer 查看聯絡人
6. 點所屬客戶名稱跳轉到 Account Detail
7. 新增 / 編輯按鈕結構需預留，可先 placeholder
8. 空狀態與無搜尋結果需設計完成
```

---

## 2.14 開發順序建議

```text
1. 建立 contacts.js
2. 建立 useContactsStore / helper
3. 建立 Contacts 列表頁
4. 建立搜尋 / 篩選
5. 建立查看 Drawer
6. 串接跳轉到 Account Detail
7. 之後再補新增 / 編輯 Drawer
```

---

## 2.15 最終決策

* `contacts.js` 獨立建立
* 聯絡人頁不再直接從 `accounts.js` flatten 當主資料源
* 聯絡人頁要做，但定位是全域通訊錄 / 跨客戶聯絡人工作台
* 第一版不做聯絡人獨立詳情頁
* 查看 / 編輯聯絡人採 Drawer
* 點所屬客戶跳到 Account Detail Tab
* 新增聯絡人的最好入口仍應優先存在於 Account Detail 裡

--------------

# 聯絡人新增 / 編輯企劃

## 一、設計定位

聯絡人（Contact）屬於客戶（Account）之下的附屬資料，主體仍為 Account。
因此新增與編輯聯絡人的操作原則如下：

* **新增 / 編輯不開新頁**
* **使用 Drawer**
* **以不打斷當前工作流為原則**
* **優先支援從客戶詳情頁內新增**
* **全域聯絡人頁可作為補充入口**

UI/UX同樣參照客戶列表頁的做法。

---

## 二、操作入口規劃

## 2.1 新增聯絡人入口

### 入口 A：客戶詳情頁（第一優先）

位置：

* Account Detail 頂部操作列「新增聯絡人」
* Account Detail → 聯絡人 tab 右上角「新增聯絡人」
* Account Detail → Overview 的空狀態 CTA

特性：

* 已知 `accountId`
* 不需再選所屬客戶
* 最符合使用者心智

---

### 入口 B：全域聯絡人頁（第二優先）

位置：

* Contacts 頁右上角「新增聯絡人」

特性：

* 未知 `accountId`
* 表單第一欄需選擇所屬客戶
* 適合作為跨客戶建立入口

---

## 2.2 編輯聯絡人入口

### 入口 A：客戶詳情頁 → 聯絡人 tab

位置：

* 每列聯絡人的「編輯」按鈕
* 聯絡人查看 Drawer 內「編輯」

### 入口 B：全域聯絡人頁

位置：

* 每列聯絡人的「編輯」按鈕
* 聯絡人查看 Drawer 內「編輯」

---

## 三、UI 型態規劃

## 3.1 新增聯絡人

* 使用右側 Drawer
* 不開新頁
* Drawer 標題依入口不同可略有差異

### 標題文案

#### 從客戶詳情頁開啟

```text
新增聯絡人
```

副標：

```text
為 {companyName} 建立新的聯絡人資料
```

#### 從全域聯絡人頁開啟

```text
新增聯絡人
```

副標：

```text
請先選擇所屬客戶，再建立聯絡人資料
```

---

## 3.2 編輯聯絡人

* 使用右側 Drawer
* 與新增共用表單元件
* 預先帶入既有資料

### 標題文案

```text
編輯聯絡人
```

副標：

```text
{name} / {accountName}
```

---

## 四、表單元件規劃

## 4.1 共用元件命名建議

```text
ContactFormDrawer
```

或

```text
ContactFormDialog
```

建議使用：

```text
<ContactFormDrawer mode="create" />
<ContactFormDrawer mode="edit" />
```

---

## 4.2 Props 建議

```ts
type ContactFormDrawerProps = {
  modelValue: boolean
  mode: 'create' | 'edit'
  contact?: Contact | null
  accountId?: string | null
  accountName?: string | null
}
```

---

## 五、新增聯絡人表單企劃

## 5.1 表單分區

```text
新增聯絡人表單
├─ 區塊一：歸屬資訊
├─ 區塊二：聯絡人基本資料
├─ 區塊三：聯絡方式
├─ 區塊四：權責與狀態
└─ 區塊五：補充資訊
```

---

## 5.2 欄位設計

### 區塊一：歸屬資訊

#### 所屬客戶 `accountId`

* 型態：Select / 可搜尋 Select
* 必填
* 從客戶詳情頁開啟時：

  * 預填
  * 唯讀或 disabled
* 從全域聯絡人頁開啟時：

  * 必須手動選擇

#### 所屬客戶名稱 `accountName`

* 顯示用
* 由 `accountId` 對應帶出

---

### 區塊二：聯絡人基本資料

#### 姓名 `name`

* 必填
* Input

#### 角色類型 `role`

* 必填
* Select
* 使用 `contactRoleOptions`

#### 角色顯示名稱 `roleLabel`

* 可由 `role` 自動對應
* 不需額外讓使用者輸入
* 前端可自動從 options map 帶出

#### 職稱 `title`

* 可選
* Input

#### 部門 `department`

* 可選
* Input

---

### 區塊三：聯絡方式

#### Email `email`

* 必填
* Input
* 格式驗證

#### 電話 `phone`

* 可選
* Input

#### 手機 `mobile`

* 可選
* Input

---

### 區塊四：權責與狀態

#### 是否主要聯絡人 `isPrimary`

* Boolean
* Switch / Radio
* 文案：

  * 是主要聯絡人
  * 一般聯絡人

#### 狀態 `status`

* 預設 `active`
* 選項：

  * active
  * inactive

#### 負責業務 `owner`

* 可選或自動帶出
* 建議預設取所屬客戶的 owner
* 第一版可設為唯讀顯示，不一定要可編輯

#### 地區 `region`

* 第一版不建議手動填
* 由 Account 帶出
* 作為只讀資訊顯示

---

### 區塊五：補充資訊

#### 備註 `notes`

* 可選
* Textarea

---

## 5.3 新增表單欄位總表

```text
所屬客戶（必填）
姓名（必填）
角色類型（必填）
職稱
部門
Email（必填）
電話
手機
是否主要聯絡人
狀態
備註
```

---

## 六、編輯聯絡人表單企劃

## 6.1 編輯欄位

與新增相同，但會預帶既有資料。

### 可編輯欄位

* 姓名
* 角色類型
* 職稱
* 部門
* Email
* 電話
* 手機
* 是否主要聯絡人
* 狀態
* 備註

### 不建議第一版可編輯欄位

* 所屬客戶 `accountId`
* owner
* region

原因：

* 聯絡人換客戶屬於高風險操作
* owner / region 應由 Account 派生，不建議在 Contact 層直接編

---

## 6.2 編輯 Drawer 補充顯示資訊

可在表單底部顯示只讀資訊：

* 建立時間 `createdAt`
* 最近更新時間 `updatedAt`
* 最近聯繫時間 `lastContactAt`

---

## 七、驗證規則

## 7.1 必填欄位

* accountId（從全域新增時）
* name
* role
* email

## 7.2 格式驗證

### Email

* 必須符合 Email 格式

### 電話 / 手機

* 第一版可只做基本字串驗證
* 不強制國碼格式

### 姓名

* 不可空白
* 去除前後空白

---

## 7.3 主要聯絡人規則

若設定 `isPrimary = true`，需有以下規則：

### 規則

* 同一個 `accountId` 下，只能有一位主要聯絡人
* 若將某位聯絡人設為主要聯絡人：

  * 系統應自動取消同 account 下其他 contact 的 `isPrimary`

### 第一版策略

前端 mock 可先在 submit 時處理：

* 找出同 accountId 的 contact
* 將其他 `isPrimary` 改成 false

---

## 八、提交流程企劃

## 8.1 新增聯絡人提交流程

### 從客戶詳情頁新增

```text
打開 Drawer
→ 填寫表單
→ 提交
→ 建立 contact
→ 關閉 Drawer
→ 刷新當前客戶詳情頁的聯絡人 tab / overview 聯絡人摘要
→ 顯示成功訊息
```

### 從全域聯絡人頁新增

```text
打開 Drawer
→ 選擇所屬客戶
→ 填寫表單
→ 提交
→ 建立 contact
→ 關閉 Drawer
→ 刷新聯絡人列表
→ 顯示成功訊息
```

---

## 8.2 編輯聯絡人提交流程

### 從客戶詳情頁編輯

```text
打開 Drawer
→ 修改表單
→ 提交
→ 更新 contact
→ 關閉 Drawer
→ 刷新聯絡人 tab / overview 聯絡人摘要
→ 顯示成功訊息
```

### 從全域聯絡人頁編輯

```text
打開 Drawer
→ 修改表單
→ 提交
→ 更新 contact
→ 關閉 Drawer
→ 刷新聯絡人列表
→ 顯示成功訊息
```

---

## 九、底部按鈕設計

## 9.1 新增聯絡人

* 取消
* 建立

可選：

* 建立並查看

### 建立成功後建議

第一版先簡化：

* 關閉 Drawer
* 刷新列表 / 詳情資料
* 顯示 success notification

---

## 9.2 編輯聯絡人

* 取消
* 儲存變更

---

## 十、錯誤處理

### 表單驗證錯誤

* 欄位下方顯示錯誤訊息
* 不關閉 Drawer

### 建立 / 編輯失敗

* 顯示全域錯誤提示
* 保留目前表單內容
* 不關閉 Drawer

---

## 十一、空狀態與入口連動

## 11.1 客戶詳情頁聯絡人 tab 無資料

顯示：

```text
尚無聯絡人
建立第一位聯絡人，方便後續商機推進與互動記錄。
[新增聯絡人]
```

點擊後：

* 開啟新增聯絡人 Drawer
* 自動帶入該 `accountId`

---

## 11.2 全域聯絡人頁無資料

顯示：

```text
尚無聯絡人
建立第一位聯絡人，開始建立客戶窗口資料。
[新增聯絡人]
```

點擊後：

* 開啟新增聯絡人 Drawer
* 需手選所屬客戶

---

## 十二、資料層規劃

## 12.1 `contacts.js` 操作需求

需支援以下方法：

```text
getAllContacts()
getContactById(id)
getContactsByAccountId(accountId)
createContact(payload)
updateContact(id, payload)
```

---

## 12.2 create payload 建議格式

```ts
type CreateContactPayload = {
  accountId: string
  name: string
  role: string
  title?: string
  department?: string
  email: string
  phone?: string
  mobile?: string
  isPrimary: boolean
  status: 'active' | 'inactive'
  notes?: string
}
```

---

## 12.3 update payload 建議格式

```ts
type UpdateContactPayload = {
  name?: string
  role?: string
  title?: string
  department?: string
  email?: string
  phone?: string
  mobile?: string
  isPrimary?: boolean
  status?: 'active' | 'inactive'
  notes?: string
}
```

---

## 十三、與 Account Detail 頁的整合規則

## 13.1 新增成功後要同步更新

* `account.contactCount`
* 聯絡人 tab
* Overview 的聯絡人摘要卡
* `primaryContact` 顯示

## 13.2 若新增 / 編輯後改變主要聯絡人

需同步更新：

* Overview 的主要聯絡人區塊
* 聯絡人 tab 的主要標記

---

## 十四、UI 細節建議

## 14.1 Drawer 寬度

* 建議 560px ～ 640px

## 14.2 欄位排列

* 一般文字欄位：單欄
* 電話 / 手機可左右並排
* role / status / isPrimary 可分組呈現

## 14.3 必填欄位

* 使用一致的紅色星號
* 說明文案放在欄位下方或 placeholder

---

## 十五、第一版 MVP 建議實作範圍

### 必做

* 新增聯絡人 Drawer
* 編輯聯絡人 Drawer
* 表單驗證
* submit 後更新靜態資料
* 詳情頁與聯絡人頁同步刷新

### 可先略過

* 查看最近互動
* 與商機關聯
* 變更所屬客戶
* 合併聯絡人
* 匯出聯絡人

---

## 十六、可直接給 Codex 的開發規格

```text id="0z9dnf"
請新增 ContactFormDrawer 元件，支援 mode=create / edit。

需求如下：

1. 新增聯絡人與編輯聯絡人皆使用右側 Drawer，不開新頁。
2. Drawer 共用同一套表單元件。
3. 新增聯絡人有兩種入口：
   - 從 Account Detail 開啟：自動帶入 accountId，且所屬客戶不可修改
   - 從 Contacts 頁開啟：需手動選擇所屬客戶
4. 編輯聯絡人需預先帶入資料。
5. 表單欄位包含：
   - accountId（全域新增時必填）
   - name（必填）
   - role（必填）
   - title
   - department
   - email（必填）
   - phone
   - mobile
   - isPrimary
   - status
   - notes
6. 驗證規則：
   - name 必填
   - role 必填
   - email 必填且符合格式
7. 若 isPrimary = true，需將同 accountId 下其他 contact 的 isPrimary 設為 false。
8. submit 成功後：
   - 關閉 Drawer
   - 顯示 success notification
   - 刷新 Contacts 頁或 Account Detail 頁內的聯絡人資料
9. 第一版不用支援變更所屬客戶。
10. 保持資料來源來自 contacts.js，而非寫回 accounts.js 的巢狀 contacts。
```

---

## 十七、最終決策

* 聯絡人新增：Drawer
* 聯絡人編輯：Drawer
* 第一優先入口：Account Detail 頁
* 第二入口：全域 Contacts 頁
* 所屬客戶為 Contact 建立的必要前置條件
* 第一版不支援變更聯絡人的所屬客戶
* 第一版要完成主要聯絡人唯一性規則
* 新增 / 編輯完成後，要同步刷新 Account Detail 與 Contacts 頁的顯示資料
