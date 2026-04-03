# 商機列表頁企劃

## 一、頁面定位

商機列表頁不是單純顯示名單，而是：

**以 Opportunity 為中心的商機管理頁**

這頁要解決的問題是：

* 目前有哪些商機正在進行
* 每個商機屬於哪個客戶
* 目前在哪個階段
* 預估金額是多少
* 何時預計成交
* 是誰在負責
* 哪些商機需要優先跟進
* 哪些商機可能失敗或即將到期

它對應你企劃中的核心流程：

```text
客戶（Account）
→ 商機（Opportunity）
→ Pipeline 推進
→ 報價（Quote）
→ 合約（Contract）
→ 專案（Project）
→ 營收（RevenueRecord）
→ 分潤（Settlement）
→ 報表（Analytics） :contentReference[oaicite:1]{index=1}
```

所以這頁的本質不是「查資料」，而是 **管理 pipeline 與推進成交**。

---

## 二、頁面目標

商機列表頁需要支援以下任務：

* 查看全部商機
* 依 stage、owner、客戶、產品、日期等條件篩選
* 快速找到即將成交或逾期的商機
* 進入商機詳情頁
* 快速建立新商機
* 快速調整商機階段
* 進行批次管理（後續可擴充）
* 作為 Pipeline 頁與 Forecast 頁的前置入口

---

## 三、頁面型態建議

第一版建議把這頁做成：

**列表管理頁 + 輕量商機摘要頁**

也就是：

```text
商機列表頁
├─ 頂部摘要卡
├─ 搜尋 / 篩選區
├─ 商機列表 Table
└─ 單筆操作 / 批次操作
```

不要一開始就把它做成半個 Pipeline 看板頁。
Kanban Pipeline 可以作為下一頁或切換視圖存在，但**列表頁要先穩**。

---

## 四、路由與頁籤

### 路由

```text
/opportunities
```

### Header Tab

```text
商機管理 / 商機列表
```

如果你商機管理主入口已經掛在 Sidebar 的「商機管理」，這頁就是預設 landing page。

---

## 五、資料基礎

你的企劃中 Opportunity 目前至少包含這些欄位：

* id
* opportunity_code
* account_id
* primary_contact_id
* product_id
* region_id
* name
* opportunity_type
* stage
* probability
* expected_revenue
* expected_close_date
* source
* owner_user_id
* status
* lost_reason
* description
* created_at
* updated_at 

所以商機列表頁第一版應至少圍繞下列資訊運作：

* 商機名稱
* 所屬客戶
* 商機類型
* 階段
* 機率
* 預估金額
* 預計成交日
* 負責人
* 最近更新

---

## 六、頁面資訊架構

```text
商機列表頁
├─ Page Header
│   ├─ 標題：商機列表
│   ├─ 說明文字
│   └─ 新增商機
│
├─ Summary Cards
│   ├─ 全部商機數
│   ├─ 進行中商機數
│   ├─ 總 Pipeline 金額
│   └─ 本月預計成交數 / 金額
│
├─ 搜尋 / 篩選區
│   ├─ 關鍵字搜尋
│   ├─ 階段
│   ├─ 商機類型
│   ├─ 所屬客戶
│   ├─ 負責業務
│   ├─ 地區
│   ├─ 預計成交日範圍
│   ├─ 狀態
│   └─ 重設
│
├─ Table
│   ├─ 商機名稱
│   ├─ 客戶
│   ├─ 商機類型
│   ├─ 階段
│   ├─ 機率
│   ├─ 預估金額
│   ├─ 預計成交日
│   ├─ 負責人
│   ├─ 最近更新
│   └─ 操作
│
└─ 操作
    ├─ 查看詳情
    ├─ 編輯
    ├─ 調整階段
    └─ 標記失敗 / 成交
```

---

## 七、頁面定位與 Pipeline 頁的關係

### 商機列表頁

重點：

* 找商機
* 篩選與排序
* 管理大量商機
* 精準操作

### Pipeline 頁

重點：

* 視覺化看板
* 依 stage 拖拉與推進
* 更偏銷售工作流

所以：

* **商機列表頁先做**
* **Pipeline 頁第二步再做**

這樣最穩，也最符合你現在的開發順序。

---

## 八、頂部摘要卡企劃

這頁建議有 4 張卡，因為商機頁不像客戶列表只要名單，它本身就需要一點運營視角。

### 1. 全部商機數

* 所有 Opportunity 數量

### 2. 進行中商機數

* stage 不為 `won / lost` 的商機數

### 3. 總 Pipeline 金額

* 所有進行中商機的 `expected_revenue` 加總

### 4. 本月預計成交數 / 金額

* `expected_close_date` 落在本月的商機數
* 可先顯示數量或金額擇一，避免卡片太重

這些卡片不需要 EChart，數字與簡短說明即可。

---

## 九、搜尋 / 篩選區企劃

## 9.1 關鍵字搜尋

搜尋對象：

* 商機名稱
* 商機代碼
* 客戶名稱

placeholder：

```text
搜尋商機名稱 / 商機代碼 / 客戶名稱
```

---

## 9.2 篩選條件

第一版建議至少要有：

* 階段 `stage`
* 商機類型 `opportunity_type`
* 所屬客戶 `account_id`
* 負責業務 `owner_user_id`
* 地區 `region_id`
* 預計成交日範圍
* 狀態 `status`

### 階段選項

建議先統一 enum 為：

```text
potential
contacted
qualified
proposal
negotiation
won
lost
```

並對應中文 label：

```text
潛在線索
已接洽
需求確認
提案中
談判中
已成交
已失敗
```

這要從一開始就定穩，避免你前面 Account Detail 裡遇到的 stage 混名問題再發生。

---

## 十、列表欄位企劃

## 10.1 欄位清單

```text
商機名稱
客戶
商機類型
階段
機率
預估金額
預計成交日
負責人
最近更新
操作
```

---

## 10.2 欄位說明

### 商機名稱

* 主欄位
* 可點擊進商機詳情頁
* 第二行可顯示商機代碼（可選）

### 客戶

* 顯示 accountName
* 可點擊跳到 Account Detail

### 商機類型

* agency / license / co_branding / channel
* 用 Tag 顯示中文 label

### 階段

* 主視覺欄位
* 用顏色清楚的 Tag 顯示

### 機率

* 顯示 `%`
* 例如：20%、50%、80%

### 預估金額

* 顯示貨幣格式
* 第一版可統一 TWD 顯示

### 預計成交日

* 顯示日期
* 接近今天時可有提醒色（例如 7 天內）

### 負責人

* owner

### 最近更新

* 顯示 updatedAt

### 操作

* 查看詳情
* 編輯
* 調整階段
* 更多

---

## 十一、操作行為企劃

## 11.1 單筆操作

每列建議有：

* 查看詳情
* 編輯
* 調整階段
* 更多

### 更多選單

* 標記成交
* 標記失敗
* 指派負責人
* 匯出單筆（可後補）

---

## 11.2 批次操作

第一版可先保留 checkbox，但不一定要立刻做完整批次邏輯。

若要做，最合理的是：

* 批次調整負責人
* 批次標記 stage
* 批次匯出

---

## 十二、階段調整企劃

這頁的核心操作之一是 **快速調整商機階段**。

## 12.1 UI 方式

建議用 **小型 Dialog** 或 Popover，不要開新頁。

### 內容

```text
調整商機階段
- 商機名稱
- 目前階段
- 新階段
- 備註（可選）
- 若選 lost，需填寫失敗原因
- [取消] [確認]
```

---

## 12.2 規則

* 若新階段 = `lost`，`lost_reason` 必填
* 若新階段 = `won`，可要求填成交摘要（第一版可後補）
* 需留更新時間

這和你企劃裡的狀態機與欄位規則是一致的。

---

## 十三、商機列表頁與商機詳情頁的分工

### 商機列表頁

* 找商機
* 篩選
* 排序
* 快速操作
* 進行大量管理

### 商機詳情頁

* 看完整資訊
* 看互動
* 看報價
* 看 Forecast
* 看階段歷史

所以商機列表頁不應該塞進太多詳情資訊。
例如：

* 長 description
* 全部互動紀錄
* 報價細節

這些都應該留在詳情頁。

---

## 十四、空狀態企劃

### 無商機資料

```text
尚無商機資料
建立第一筆商機，開始追蹤客戶合作進度。
[新增商機]
```

### 無搜尋結果

```text
找不到符合條件的商機
請調整搜尋條件或重設篩選。
[重設篩選]
```

### 某 stage 篩選後無資料

```text
目前沒有此階段的商機
可切換其他階段，或建立新的商機。
```

---

## 十五、第一版 MVP 範圍建議

### 必做

* 頂部摘要卡
* 搜尋 / 篩選
* 商機列表 table
* 新增商機入口
* 單筆調整階段 dialog
* 點商機名稱跳商機詳情頁
* 點客戶名稱跳 Account Detail

### 可後補

* 批次調整
* 匯出
* Forecast 卡片進階版
* 快速建立報價
* Pipeline 視圖切換

---

## 十六、新增商機入口策略

雖然這頁會有「新增商機」按鈕，但使用者最自然的新增入口其實有兩種：

### 入口 A：商機列表頁

* 全域新增
* 適合已知要新增商機，但不一定從客戶頁進來

### 入口 B：客戶詳情頁

* 從某個 Account 底下直接新增商機
* 更符合 CRM 工作流

第一版兩者都可以保留，但如果只能先完成一個，**我會優先完成從客戶詳情頁新增商機**，因為關聯更自然。

---

## 十七、可直接給 Codex 的頁面規格

```text
請新增「商機列表」頁面，作為 Opportunity 的主列表頁。

路由：
- /opportunities

頁面定位：
- 此頁為商機管理主頁
- 主要用途為搜尋、篩選、查看與管理商機
- 不等同於 Pipeline 看板頁

資料來源：
- 使用獨立 opportunities.js 作為主資料源
- 每筆 opportunity 至少包含：
  - id
  - opportunityCode
  - accountId
  - accountName
  - name
  - opportunityType
  - stage
  - probability
  - expectedRevenue
  - expectedCloseDate
  - owner
  - status
  - updatedAt

頁面內容：
1. Header：
   - 標題：商機列表
   - 說明文字
   - 新增商機按鈕

2. Summary Cards：
   - 全部商機數
   - 進行中商機數
   - 總 Pipeline 金額
   - 本月預計成交數 / 金額

3. 搜尋 / 篩選：
   - 關鍵字搜尋（商機名稱 / 商機代碼 / 客戶名稱）
   - stage
   - opportunityType
   - accountId
   - owner
   - region
   - expectedCloseDate range
   - status
   - 重設

4. Table 欄位：
   - 商機名稱
   - 客戶
   - 商機類型
   - 階段
   - 機率
   - 預估金額
   - 預計成交日
   - 負責人
   - 最近更新
   - 操作

5. 操作：
   - 查看詳情
   - 編輯
   - 調整階段
   - 更多（標記成交 / 失敗 / 指派負責人）

6. 點商機名稱跳 Opportunity Detail
7. 點客戶名稱跳 Account Detail
8. 空狀態與無搜尋結果狀態需完成
9. 第一版不需要做 Kanban Pipeline 視圖
```

---

## 十八、開發順序建議

```text
1. 建立 opportunities.js
2. 建立 useOpportunitiesStore / helper
3. 建立摘要卡
4. 建立搜尋 / 篩選區
5. 建立 table
6. 建立調整階段 dialog
7. 串接跳轉 Account Detail / Opportunity Detail
```

---

## 十九、最終決策

* 商機管理先從商機列表頁開始是正確的
* 這頁是 Opportunity 的主管理頁，不是報表頁，也不是 Pipeline 看板頁
* 第一版先做列表 + 篩選 + 快速階段調整
* Pipeline 視圖後補
* 點商機進詳情，點客戶進 Account Detail
* 這頁會是 BD 第二個最高頻使用頁面，重要性僅次於客戶詳情 / 客戶列表本身

------------

# 商機列表頁－新增與編輯企劃

## 一、設計定位

商機（Opportunity）是 CRM 主流程中的核心節點，位於：

```text
客戶（Account）
→ 商機（Opportunity）
→ Pipeline 推進
→ 報價（Quote）
→ 合約（Contract）
→ 專案（Project）
```

因此商機的新增與編輯，不應被設計成太重的流程，也不應直接跳到過深的詳情頁後才能完成。
在商機列表頁中，新增與編輯應定位為：

* **新增商機：快速建立一筆可進入 pipeline 的商機**
* **編輯商機：快速修正商機核心資訊**
* **深度資訊管理：留給商機詳情頁處理**

所以第一版建議：

* **新增商機：Drawer**
* **編輯商機：Drawer**
* **不開新頁**
* **與客戶新增 / 編輯策略一致**

---

## 二、UI 型態決策

## 2.1 新增商機

* 使用右側 Drawer
* 不開新頁
* 從商機列表頁右上角「新增商機」進入
* 也可從 Account Detail 頁中開啟同一套表單

## 2.2 編輯商機

* 使用右側 Drawer
* 與新增共用表單元件
* 從商機列表頁每列「編輯」進入
* 從商機詳情頁也應可共用

---

## 三、操作入口規劃

## 3.1 新增商機入口

### 入口 A：商機列表頁（全域新增）

位置：

* 頁面右上角「新增商機」

適用情境：

* 使用者先知道要新增一筆商機
* 不一定從某個客戶頁進來

### 入口 B：客戶詳情頁（上下文新增）

位置：

* Account Detail 頂部操作列「新增商機」
* Account Detail → 商機 tab 的「新增商機」

適用情境：

* 已在某客戶底下操作
* 最符合 CRM 真實工作流

### 規則

* 從商機列表頁新增：需選擇客戶
* 從客戶詳情頁新增：自動帶入 `accountId` 且不可修改

---

## 3.2 編輯商機入口

### 入口 A：商機列表頁

位置：

* 每列「編輯」

### 入口 B：商機詳情頁

位置：

* 頁面頂部「編輯商機」

### 入口 C：Account Detail → 商機 tab

位置：

* 每列「編輯」

---

## 四、表單元件規劃

## 4.1 元件命名建議

```text
OpportunityFormDrawer
```

### 建議使用方式

```text
<OpportunityFormDrawer mode="create" />
<OpportunityFormDrawer mode="edit" />
```

---

## 4.2 Props 建議

```ts
type OpportunityFormDrawerProps = {
  modelValue: boolean
  mode: 'create' | 'edit'
  opportunity?: Opportunity | null
  accountId?: string | null
  accountName?: string | null
}
```

---

## 五、新增商機企劃

## 5.1 表單目標

新增商機時，第一版只需要建立「足以進入 pipeline 管理」的核心資料，不要一次塞進報價 / 合約等後續欄位。

這代表表單只需要涵蓋：

* 這筆商機是誰的
* 是什麼類型
* 目前在哪個階段
* 預估價值多少
* 什麼時候可能成交
* 誰負責
* 基本背景說明

---

## 5.2 表單分區

```text
新增商機表單
├─ 區塊一：歸屬資訊
├─ 區塊二：商機基本資料
├─ 區塊三：Pipeline 與金額
└─ 區塊四：補充資訊
```

---

## 5.3 欄位規格

### 區塊一：歸屬資訊

#### 所屬客戶 `accountId`

* 必填
* Select / 可搜尋 Select
* 從商機列表頁新增時需手動選擇
* 從客戶詳情頁新增時：

  * 自動帶入
  * disabled / readonly

#### 客戶名稱 `accountName`

* 顯示用
* 可由 `accountId` 帶出

#### 主要聯絡人 `primaryContactId`

* 可選
* Select
* 選項需依 `accountId` 過濾，只顯示該客戶下的 contacts
* 若該客戶有主要聯絡人，可自動帶入

#### 地區 `region`

* 可由 Account 帶出
* 第一版建議唯讀顯示，不讓使用者手改

---

### 區塊二：商機基本資料

#### 商機名稱 `name`

* 必填
* Input
* 建議使用具體案名

#### 商機代碼 `opportunityCode`

* 可由系統自動產生
* 第一版不需手動輸入

#### 商機類型 `opportunityType`

* 必填
* Select
* 選項：

  * `agency`
  * `license`
  * `co_branding`
  * `channel`

#### 來源 `source`

* 可選
* Select / Input
* 選項可先包含：

  * existing_account
  * inbound
  * outbound
  * referral
  * event
  * revival

---

### 區塊三：Pipeline 與金額

#### 階段 `stage`

* 必填
* Select
* 選項：

  * potential
  * contacted
  * qualified
  * proposal
  * negotiation
  * won
  * lost

#### 機率 `probability`

* 必填或自動帶入
* Number / Slider
* 第一版建議：

  * 預設依 stage 自動帶入
  * 仍可手動微調（可選）

#### 預估金額 `expectedRevenue`

* 必填
* Number Input
* 顯示貨幣格式

#### 預計成交日 `expectedCloseDate`

* 必填
* Date Picker

#### 狀態 `status`

* 不讓使用者直接選
* 由 stage 自動推導：

  * won → won
  * lost → lost
  * 其他 → active

---

### 區塊四：補充資訊

#### 失敗原因 `lostReason`

* 僅當 `stage === 'lost'` 時顯示
* 必填

#### 描述 `description`

* 可選
* Textarea
* 可填商機背景、需求、合作方向

#### 負責人 `ownerUserId`

* 必填
* Select
* 選項來自 `users.js`
* 第一版限定可選：

  * `role in ['bd', 'manager']`
  * `status === 'active'`

---

## 5.4 新增表單欄位總表

```text
所屬客戶（必填）
主要聯絡人
商機名稱（必填）
商機類型（必填）
來源
階段（必填）
機率
預估金額（必填）
預計成交日（必填）
負責人（必填）
失敗原因（若 stage = lost）
描述
```

---

## 六、編輯商機企劃

## 6.1 編輯表單目標

編輯商機的目標是快速調整核心資訊，而不是處理所有深層資料。
例如報價、歷程、附件、互動明細，應保留給商機詳情頁。

---

## 6.2 可編輯欄位

* 主要聯絡人
* 商機名稱
* 商機類型
* 來源
* 階段
* 機率
* 預估金額
* 預計成交日
* 負責人
* 失敗原因（若 lost）
* 描述

---

## 6.3 不建議第一版可編輯欄位

* `accountId`
* `opportunityCode`
* `createdAt`

原因：

* 換客戶屬於高風險操作
* code 應為穩定識別碼
* 建立時間不應被改

---

## 6.4 編輯 Drawer 額外資訊

在 Drawer 底部可顯示只讀資訊：

* 建立時間 `createdAt`
* 最近更新時間 `updatedAt`
* 目前狀態 `status`

---

## 七、欄位驗證規則

## 7.1 必填欄位

* `accountId`
* `name`
* `opportunityType`
* `stage`
* `expectedRevenue`
* `expectedCloseDate`
* `ownerUserId`

---

## 7.2 條件式驗證

### 當 `stage === 'lost'`

* `lostReason` 必填

### 當 `stage === 'won'`

* `status` 自動為 `won`
* 第一版可不要求成交摘要，但後續可補

### 當 `stage !== 'won' && stage !== 'lost'`

* `status` 自動為 `active`

---

## 7.3 金額驗證

* `expectedRevenue` 不可小於 0
* 建議限制為整數或符合系統金額格式

---

## 八、提交流程企劃

## 8.1 新增商機流程

### 從商機列表頁新增

```text
打開 Drawer
→ 選客戶
→ 填寫商機資料
→ 提交
→ 建立商機
→ 關閉 Drawer
→ 刷新商機列表
→ 顯示成功訊息
```

### 從客戶詳情頁新增

```text
打開 Drawer
→ accountId 已帶入
→ 填寫商機資料
→ 提交
→ 建立商機
→ 關閉 Drawer
→ 刷新該客戶商機 tab / 商機摘要
→ 顯示成功訊息
```

---

## 8.2 編輯商機流程

### 從商機列表頁編輯

```text
打開 Drawer
→ 修改資料
→ 提交
→ 更新商機
→ 關閉 Drawer
→ 刷新列表該筆資料
→ 顯示成功訊息
```

### 從商機詳情頁編輯

```text
打開 Drawer
→ 修改資料
→ 提交
→ 更新商機
→ 關閉 Drawer
→ 刷新詳情頁資料
→ 顯示成功訊息
```

---

## 九、底部按鈕設計

## 9.1 新增商機

* 取消
* 建立

可選：

* 建立並查看詳情

### 建議第一版

先只保留：

* 取消
* 建立

---

## 9.2 編輯商機

* 取消
* 儲存變更

---

## 十、空狀態與錯誤處理

## 10.1 表單驗證錯誤

* 欄位下方顯示錯誤訊息
* 不關閉 Drawer

## 10.2 建立 / 更新失敗

* 顯示全域錯誤提示
* 保留已填內容
* 不關閉 Drawer

---

## 十一、與商機列表頁的整合

## 11.1 新增成功後需同步更新

* Summary Cards
* Table 資料
* 篩選後的結果
* Account Detail 內該客戶的商機數量

## 11.2 編輯成功後需同步更新

* Table 該列內容
* stage / status tag
* 預估金額
* 預計成交日
* owner 顯示

---

## 十二、與商機詳情頁的整合

若後續做商機詳情頁，新增 / 編輯表單應共用，不要再複製一套。

### 建議共用方式

```text
OpportunityFormDrawer
```

從：

* 商機列表頁
* 客戶詳情頁
* 商機詳情頁

共用同一套新增 / 編輯表單。

---

## 十三、資料層設計要求

## 13.1 `opportunities.js` 需支援以下操作

```text
getOpportunities()
getOpportunityById(id)
getOpportunitiesByAccountId(accountId)
createOpportunity(payload)
updateOpportunity(id, payload)
```

---

## 13.2 create payload 建議格式

```ts
type CreateOpportunityPayload = {
  accountId: string
  primaryContactId?: string
  name: string
  opportunityType: 'agency' | 'license' | 'co_branding' | 'channel'
  stage: 'potential' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
  probability?: number
  expectedRevenue: number
  expectedCloseDate: string
  ownerUserId: string
  source?: string
  lostReason?: string
  description?: string
}
```

---

## 13.3 update payload 建議格式

```ts
type UpdateOpportunityPayload = {
  primaryContactId?: string
  name?: string
  opportunityType?: 'agency' | 'license' | 'co_branding' | 'channel'
  stage?: 'potential' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
  probability?: number
  expectedRevenue?: number
  expectedCloseDate?: string
  ownerUserId?: string
  source?: string
  lostReason?: string
  description?: string
}
```

---

## 十四、建議的 UX 細節

## 14.1 從客戶詳情頁新增商機時

* 標題可顯示：

  * `為 {companyName} 新增商機`
* account 欄位 disabled
* primary contact 可自動預設為該客戶主要聯絡人

## 14.2 當切換 stage 時

* 自動更新 probability
* 若切到 `lost`，顯示 lostReason 欄位
* 若切到 `won`，可顯示提示文案：

  * 後續可建立報價 / 合約（第一版僅提示）

## 14.3 金額欄位

* 輸入時可用純數字
* 顯示格式可做千分位
* 避免要求使用者手打貨幣符號

---

## 十五、第一版 MVP 建議實作範圍

### 必做

* 新增商機 Drawer
* 編輯商機 Drawer
* 表單驗證
* stage → status 自動推導
* lostReason 條件式欄位
* ownerUserId 使用 users 主資料
* 從商機列表頁與客戶詳情頁都能開啟

### 可後補

* 建立並跳詳情
* 成交摘要
* 產品欄位 `productId`
* 預設模板
* 關聯報價快速建立
* 變更所屬客戶

---

## 十六、可直接給 Codex 的開發規格

```text id="564tbp"
請新增 OpportunityFormDrawer 元件，支援 mode=create / edit。

需求如下：

1. 新增商機與編輯商機都使用右側 Drawer，不開新頁。
2. Drawer 共用同一套表單元件。
3. 新增商機有兩種入口：
   - 從商機列表頁開啟：需手動選擇 accountId
   - 從 Account Detail 開啟：自動帶入 accountId 且不可修改
4. 編輯商機需預先帶入資料。
5. 表單欄位包含：
   - accountId（全域新增時必填）
   - primaryContactId
   - name（必填）
   - opportunityType（必填）
   - source
   - stage（必填）
   - probability
   - expectedRevenue（必填）
   - expectedCloseDate（必填）
   - ownerUserId（必填）
   - lostReason（stage = lost 時必填）
   - description
6. ownerUserId 的選項來自 users.js，不可寫死姓名。
7. primaryContactId 的選項需依 accountId 過濾。
8. 當 stage 改變時：
   - 自動更新 status
   - 若 stage = lost，顯示 lostReason 欄位
   - 若 stage 為其他進行中階段，status = active
9. submit 成功後：
   - 關閉 Drawer
   - 顯示 success notification
   - 刷新商機列表或 Account Detail 內商機資料
10. 第一版不支援修改 accountId。
```

---

## 十七、最終決策

* 商機新增：Drawer
* 商機編輯：Drawer
* 第一優先入口：商機列表頁 + Account Detail 頁
* 所屬客戶為建立商機的必要前置條件
* 第一版不支援修改商機所屬客戶
* 第一版需完成 stage / status / lostReason 的基本規則
* 第一版需完成 `ownerUserId` 正規化，不再使用字串姓名




