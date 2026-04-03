# 商機管理－報價管理頁企劃

## 一、頁面定位

報價管理頁不是單純的文件列表頁，也不是合約管理頁的前置附屬頁。
它的定位應該是：

**以 Quote 為中心的商務提案與報價管理頁**

也就是說，這頁要解決的不是：

* 目前有哪些商機
* 商機在哪個 stage
* 合約簽了沒

而是：

* 哪些商機已進入提案 / 報價階段
* 每筆商機目前有沒有報價
* 報價版本到哪一版
* 報價是否已送出、接受、拒絕或過期
* 哪些報價即將到期
* 哪些報價需要重送或更新
* 如何從報價推進到合約

這和你企劃中的 Opportunity / Quote / Contract 主流程完全對齊。企劃已明確定義：

* 商機管理包含報價管理
* Quote 為獨立模組
* Quote 需有版本、明細、定價模式、有效期限、狀態管理、關聯商機 / 客戶
* Contract 位於 Quote 之後 

所以這頁的本質是：

```text
Quote Workspace
```

而不是一般附件管理頁。

---

## 二、這頁和其他頁面的差異

### 1. 與商機列表頁的差異

* 商機列表頁：管理整體機會
* 報價管理頁：管理已進入提案 / 報價階段的商機文件與狀態

### 2. 與商機詳情頁的差異

* 商機詳情頁：看單一商機全貌
* 報價管理頁：跨商機看全部 quote 狀態

### 3. 與合約管理頁的差異

* 報價管理頁：提案與價格協商階段
* 合約管理頁：成交後條款與簽署階段

所以三者關係應是：

```text
商機
→ 報價
→ 合約
```

---

## 三、頁面目標

報價管理頁需支援以下任務：

* 查看所有報價資料
* 依狀態、版本、有效期限、客戶、商機快速篩選
* 找出即將過期報價
* 建立新報價
* 編輯草稿報價
* 查看報價明細與版本
* 標記報價已送出 / 已接受 / 已拒絕 / 已過期
* 從報價銜接合約流程

---

## 四、頁面型態建議

第一版建議把這頁做成：

**報價列表管理頁 + 狀態追蹤頁**

```text
報價管理頁
├─ Page Header
├─ Quote Summary
├─ 搜尋 / 篩選區(同樣採用商機列表篩選區塊的做法)
├─ Quote Table
└─ 單筆操作 / 批次操作（後補）
```

第一版先不要做成文件中心或 PDF 預覽中心。
先把 **列表、狀態、版本、有效期限** 做穩。

---

## 五、路由與頁籤

### 路由

```text
/opportunities/quotes
```

### Header Tab

```text
商機管理 / 報價管理
```

---

## 六、資料基礎

根據企劃，Quote 至少包含：

* id
* quote_code
* opportunity_id
* account_id
* version
* quote_date
* valid_until
* total_amount
* currency_code
* pricing_model
* status
* prepared_by_user_id
* description
* created_at
* updated_at 

第一版頁面可額外補顯示用欄位：

* opportunityName
* accountName
* preparedByName

---

## 七、固定欄位與 enum 建議

### 7.1 報價狀態

```text
draft
submitted
accepted
rejected
expired
```

中文顯示建議：

```text
草稿
已送出
已接受
已拒絕
已過期
```

### 7.2 定價模式

```text
fixed
revenue_share
hybrid
```

中文顯示建議：

```text
固定報價
分潤模式
混合模式
```

---

## 八、頁面資訊架構

```text
報價管理頁
├─ Page Header
│   ├─ 標題：報價管理
│   ├─ 說明文字
│   └─ 新增報價
│
├─ Quote Summary Cards
│   ├─ 全部報價數
│   ├─ 草稿報價數
│   ├─ 已送出報價數
│   └─ 即將到期報價數
│
├─ 搜尋 / 篩選區
│   ├─ 關鍵字搜尋
│   ├─ 報價狀態
│   ├─ 定價模式
│   ├─ 所屬客戶
│   ├─ 關聯商機
│   ├─ Prepared By
│   ├─ 報價日期範圍
│   ├─ 有效期限範圍
│   └─ 重設
│
├─ Quote Table
│   ├─ 報價單號
│   ├─ 商機
│   ├─ 客戶
│   ├─ 版本
│   ├─ 定價模式
│   ├─ 總金額
│   ├─ 報價日期
│   ├─ 有效期限
│   ├─ 狀態
│   ├─ Prepared By
│   └─ 操作
│
└─ 操作
    ├─ 查看詳情
    ├─ 編輯
    ├─ 複製建立新版本
    ├─ 更新狀態
    └─ 建立合約（後補）
```

---

## 九、Page Header 企劃

### 內容

* 標題：`報價管理`
* 說明文字：例如「管理商機報價、版本與有效期限」
* 右側按鈕：

  * 新增報價

### 新增報價入口

第一版可有兩種：

#### 入口 A：報價管理頁全域新增

* 使用者從報價管理頁直接建立一筆 quote
* 需選擇對應商機

#### 入口 B：商機詳情頁內新增

* 從單一商機上下文直接建立 quote
* 最符合流程

若只能先完成一個，建議優先完成：
**從商機詳情頁新增報價**

---

## 十、Summary Cards 企劃

這頁需要摘要卡，因為報價管理最重要的是「狀態分布」與「到期風險」。

### 1. 全部報價數

* 所有 Quote 數量

### 2. 草稿報價數

* `status = draft`

### 3. 已送出報價數

* `status = submitted`

### 4. 即將到期報價數

* `validUntil` 距今天 7 天內，且 status 仍為 `submitted`

若你想替換其中一張卡，也可改為：

* 已接受報價數

但我會優先保留「即將到期報價數」。

---

## 十一、搜尋 / 篩選區企劃

## 11.1 關鍵字搜尋

搜尋對象：

* 報價單號
* 商機名稱
* 客戶名稱

placeholder：

```text
搜尋報價單號 / 商機名稱 / 客戶名稱
```

---

## 11.2 篩選條件

第一版建議至少有：

* 報價狀態 `status`
* 定價模式 `pricingModel`
* 所屬客戶 `accountId`
* 關聯商機 `opportunityId`
* Prepared By `preparedByUserId`
* 報價日期範圍
* 有效期限範圍
* 重設

### 說明

這些條件足以支援：

* 找正在談的報價
* 找哪個業務送出的報價
* 找快過期的報價
* 找哪筆報價屬於哪個商機

---

## 十二、Quote Table 欄位企劃

## 12.1 欄位清單

```text
報價單號
商機
客戶
版本
定價模式
總金額
報價日期
有效期限
狀態
Prepared By
操作
```

---

## 12.2 欄位說明

### 報價單號

* 主欄位
* 可點擊進報價詳情頁（若第一版未做詳情頁，可打開 drawer）

### 商機

* 顯示 opportunityName
* 可點擊跳到 Opportunity Detail

### 客戶

* 顯示 accountName
* 可點擊跳到 Account Detail

### 版本

* 顯示 version
* 例如：v1 / v2 / v3

### 定價模式

* fixed / revenue_share / hybrid
* 以 tag 顯示中文 label

### 總金額

* totalAmount
* 顯示貨幣格式

### 報價日期

* quoteDate

### 有效期限

* validUntil
* 接近到期需有提示

### 狀態

* draft / submitted / accepted / rejected / expired
* 用 tag 顯示

### Prepared By

* preparedByName

### 操作

* 查看
* 編輯
* 新版本
* 更新狀態
* 更多

---

## 十三、狀態與到期提醒企劃

### 13.1 狀態顯示

建議使用統一 tag：

* 草稿：info
* 已送出：warning / primary
* 已接受：success
* 已拒絕：danger
* 已過期：danger / info

### 13.2 到期提醒

若：

* `status === submitted`
* `validUntil` 距今天 <= 7 天

則顯示：

```text
即將到期
```

若已超過 `validUntil` 且仍未 accepted / rejected：
可標記為：

```text
已過期
```

第一版可以：

* 只顯示風險 tag
* 或在資料層直接同步 status = expired

---

## 十四、單筆操作企劃

每列至少有以下操作：

### 1. 查看

* 查看報價資料
* 第一版可用 Drawer
* 第二版可做獨立詳情頁

### 2. 編輯

* 僅 `draft` 狀態可完整編輯
* 已送出後第一版不建議直接覆寫，可改走「新版本」

### 3. 複製建立新版本

* 這是報價管理的核心操作之一
* 用目前 quote 資料複製成新 version
* 新版本狀態預設為 `draft`

### 4. 更新狀態

* 用小型 Dialog / Dropdown 更新為：

  * submitted
  * accepted
  * rejected
  * expired

### 5. 更多

* 建立合約（後補）
* 匯出（後補）

---

## 十五、版本管理策略

這頁和一般單純表單頁最大差異在於：
**Quote 有版本概念。**

### 第一版建議規則

* 同一筆商機可有多個 quote version
* `quoteCode` 可穩定對外顯示
* version 遞增
* 新版本從舊版本複製內容
* 新版本預設 `draft`

### 第一版頁面上不必做完整版本樹

但至少表格中要有：

* version 欄位
* 新版本按鈕

---

## 十六、新增與編輯方式

### 第一版建議

* 新增報價：Drawer
* 編輯報價：Drawer

不要先做獨立新頁。

### 原因

* 與目前 Account / Opportunity / Contact 的策略一致
* 表單複用性高
* 可快速從商機上下文建立報價

---

## 十七、報價管理頁與報價詳情頁的分工

### 報價管理頁

* 查找報價
* 管理版本
* 管理狀態
* 看到期風險
* 進入詳情或編輯

### 報價詳情頁（後補）

* 看完整明細
* 看版本內容
* 看說明 / 附件
* 做細部檢視

第一版如果還沒做 Quote Detail，可先用 Drawer 承接查看。

---

## 十八、空狀態企劃

### 無報價資料

```text
尚無報價資料
可從商機詳情頁建立第一筆報價，開始管理提案與價格內容。
[新增報價]
```

### 無搜尋結果

```text
找不到符合條件的報價
請調整搜尋條件或重設篩選。
[重設篩選]
```

### 某狀態下無資料

例如切到 `submitted` 但沒有資料：

```text
目前沒有已送出的報價
可建立新報價或調整篩選條件。
```

---

## 十九、第一版 MVP 範圍建議

### 必做

* Page Header
* Summary Cards
* 搜尋 / 篩選
* Quote Table
* 查看報價 Drawer
* 新增 / 編輯報價 Drawer
* 更新狀態操作
* 新版本操作
* 點商機跳 Opportunity Detail
* 點客戶跳 Account Detail

### 可後補

* Quote Detail 獨立頁
* PDF 預覽
* 匯出
* 建立合約
* 批次操作
* 報價附件

---

## 二十、可直接給 Codex 的頁面規格

```text
請新增「報價管理」頁面，路由為 /opportunities/quotes。

頁面定位：
- 此頁為 Quote 的主列表管理頁
- 主要用途為查看、篩選、管理報價狀態、版本與有效期限
- 不是合約頁，也不是單純文件頁

資料來源：
- 使用獨立 quotes.js 作為主資料源
- 每筆 quote 至少包含：
  - id
  - quoteCode
  - opportunityId
  - opportunityName
  - accountId
  - accountName
  - version
  - quoteDate
  - validUntil
  - totalAmount
  - currencyCode
  - pricingModel
  - status
  - preparedByUserId
  - preparedByName
  - description
  - createdAt
  - updatedAt

頁面內容：
1. Header：
   - 標題：報價管理
   - 說明文字
   - 新增報價按鈕

2. Summary Cards：
   - 全部報價數
   - 草稿報價數
   - 已送出報價數
   - 即將到期報價數

3. 搜尋 / 篩選：
   - 關鍵字搜尋（報價單號 / 商機名稱 / 客戶名稱）
   - status
   - pricingModel
   - accountId
   - opportunityId
   - preparedByUserId
   - quoteDate range
   - validUntil range
   - 重設

4. Table 欄位：
   - 報價單號
   - 商機
   - 客戶
   - 版本
   - 定價模式
   - 總金額
   - 報價日期
   - 有效期限
   - 狀態
   - Prepared By
   - 操作

5. 操作：
   - 查看
   - 編輯
   - 複製建立新版本
   - 更新狀態
   - 更多（後補）

6. 規則：
   - draft 可編輯
   - submitted / accepted / rejected 原則上不直接覆寫，應透過新版本處理
   - validUntil 接近今天 7 天內且 status = submitted 時，顯示即將到期提示

7. 點商機名稱跳 Opportunity Detail
8. 點客戶名稱跳 Account Detail
9. 第一版查看可用 Drawer，不一定要做 Quote Detail 頁
10. 完成空狀態與無搜尋結果狀態
```

---

## 二十一、開發順序建議

```text
1. 建立 quotes.js
2. 建立 quote summary 計算
3. 建立搜尋 / 篩選區
4. 建立 quote table
5. 建立查看報價 drawer
6. 建立新增 / 編輯報價 drawer
7. 建立更新狀態 dialog
8. 建立複製新版本邏輯
9. 串接跳轉 Opportunity Detail / Account Detail
```

---

## 二十二、最終決策

* 報價管理頁要做
* 這頁是商機管理下的 Quote 管理頁，不是文件中心
* 第一版核心是：

  * 列表
  * 狀態
  * 版本
  * 有效期限
* 第一版新增 / 編輯建議用 Drawer
* Quote Detail 可後補
* 這頁會是商機進入合約前最重要的中介頁之一 
