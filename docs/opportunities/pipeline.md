# 商機管理－Pipeline 頁企劃

## 一、頁面定位

Pipeline 頁不是商機列表頁的視覺化複製版，而是：

**以商機階段（stage）為主軸的銷售推進工作頁**

如果商機列表頁的核心是：

* 搜尋
* 篩選
* 管理大量商機

那 Pipeline 頁的核心就是：

* 看每個階段有多少商機
* 看每個階段卡住哪些案子
* 快速推進商機階段
* 用看板方式管理成交節奏

這和你企劃中的 Opportunity 模組完全對齊。企劃已經明確定義商機需要有：

* 銷售流程（Pipeline）
* 商機建立
* 階段管理
* 機率
* 預估金額
* 預計成交日
* 商機階段歷程
* 失敗原因
* Forecast 

所以 Pipeline 頁應該被定位成：

```text id="4my46g"
Opportunity Pipeline Workspace
```

而不是純展示頁。

---

## 二、頁面目標

Pipeline 頁要達成的任務：

* 以 stage 檢視所有商機
* 快速知道每個階段的數量與金額
* 找出卡住太久的商機
* 快速將商機往下一階段推進
* 標記成交或失敗
* 作為 BD 最常使用的推進頁面之一

---

## 三、這頁和商機列表頁的差異

### 商機列表頁

重點：

* 大量查找
* 多條件篩選
* 精準定位某筆商機
* 表格式管理

### Pipeline 頁

重點：

* 階段分布
* 推進節奏
* 視覺化工作流
* 快速調整狀態

所以這兩頁不是重複，而是兩種工作視角：

```text id="z3yz02"
商機列表頁 = 查找 / 管理視角
Pipeline 頁 = 推進 / 工作流視角
```

---

## 四、頁面型態建議

第一版建議把 Pipeline 頁做成：

**Kanban 看板頁 + 階段摘要**

```text id="g8h6t9"
Pipeline 頁
├─ Page Header
├─ Pipeline Summary
├─ 快速篩選區
├─ Pipeline Columns
└─ 商機操作 Drawer / Dialog
```

---

## 五、路由與頁籤

### 路由

```text id="m5bs9w"
/opportunities/pipeline
```

### Header Tab

```text id="e7imtk"
商機管理 / Pipeline
```

---

## 六、資料基礎

這頁以 `opportunities.js` 為主資料源即可成立。
每筆 Opportunity 至少使用以下欄位：

* id
* opportunityCode
* accountId
* accountName
* primaryContactId
* name
* opportunityType
* stage
* probability
* expectedRevenue
* expectedCloseDate
* region
* ownerUserId
* ownerName（顯示用）
* status
* source
* lostReason
* description
* updatedAt 

---

## 七、固定階段定義

Pipeline 欄位順序應與企劃一致，從左到右如下：

```text id="s3ovzl"
potential
contacted
qualified
proposal
negotiation
won
lost
```

中文顯示：

```text id="1r8gl8"
潛在線索
已接洽
需求確認
提案中
談判中
已成交
已失敗
```

### 說明

* `won` 與 `lost` 仍可放在看板末端欄位
* 但視覺上可弱化，避免搶走進行中欄位的注意力
* 若第一版覺得太寬，可先把 `won / lost` 合併為尾端區塊，第二版再拆

---

## 八、頁面資訊架構

```text id="c6k7bm"
Pipeline 頁
├─ Page Header
│   ├─ 標題：Pipeline
│   ├─ 說明文字
│   ├─ 新增商機
│   └─ 返回商機列表
│
├─ Pipeline Summary
│   ├─ 全部商機數
│   ├─ 進行中商機數
│   ├─ 總 Pipeline 金額
│   └─ 本月預計成交金額 / 數量
│
├─ 快速篩選區
│   ├─ 關鍵字搜尋
│   ├─ 負責業務
│   ├─ 商機類型
│   ├─ 所屬客戶
│   ├─ 地區
│   ├─ 日期條件
│   └─ 重設
│
├─ Pipeline Columns
│   ├─ 潛在線索
│   ├─ 已接洽
│   ├─ 需求確認
│   ├─ 提案中
│   ├─ 談判中
│   ├─ 已成交
│   └─ 已失敗
│
└─ 互動操作
    ├─ 拖曳調整階段（第二版）
    ├─ 快速調整階段
    ├─ 查看商機
    ├─ 編輯商機
    └─ 標記成交 / 失敗
```

---

## 九、Page Header 企劃

### 內容

* 標題：`Pipeline`
* 說明文字：例如「以商機階段管理成交進度」
* 按鈕：

  * 新增商機
  * 返回商機列表

### 操作

* 新增商機：沿用既有 OpportunityFormDrawer
* 返回商機列表：回到 `/opportunities`

---

## 十、Pipeline Summary 企劃

這頁建議保留摘要區，但要比商機列表頁更聚焦 Pipeline。

### 建議卡片

#### 1. 全部商機數

* 全部 Opportunity 數量

#### 2. 進行中商機數

* stage 不為 `won / lost`

#### 3. 總 Pipeline 金額

* 所有進行中商機 `expectedRevenue` 加總

#### 4. 本月預計成交金額 / 數量

* `expectedCloseDate` 落在本月的進行中商機
* 第一版可只顯示金額或數量其一，避免過重

---

## 十一、快速篩選區企劃

Pipeline 頁雖然是看板，但還是要有篩選，不然很快會失控。

## 11.1 關鍵字搜尋

搜尋對象：

* 商機名稱
* 商機代碼
* 客戶名稱

placeholder：

```text id="9a2kha"
搜尋商機名稱 / 商機代碼 / 客戶名稱
```

---

## 11.2 篩選條件

第一版建議至少有：

* 負責業務 `ownerUserId`
* 商機類型 `opportunityType`
* 所屬客戶 `accountId`
* 地區 `region`
* 日期條件（可先做預計成交日範圍）
* 重設

### 不建議在 Pipeline 頁再做 stage dropdown

因為 stage 本身已經是欄位分組，不需要重複。

---

## 十二、Pipeline 欄位設計

每一欄都代表一個 stage。

### 欄位結構

```text id="d5dhrc"
欄位 Header
├─ 階段名稱
├─ 商機數量
└─ 該欄總金額

欄位 Body
└─ Opportunity Cards...
```

### 每欄 header 顯示

例如：

```text id="7ozvxt"
提案中
12 筆
NT$ 18,200,000
```

這樣使用者一眼就能判斷哪個階段最滿、金額最高。

---

## 十三、Opportunity Card 企劃

Pipeline 頁的核心不是 table，而是卡片。

## 13.1 卡片內容（第一版）

每張卡片建議顯示：

```text id="7nz0c9"
商機名稱
客戶名稱
商機類型
預估金額
預計成交日
負責人
機率
```

### 可選資訊

* `opportunityCode`（次要）
* `status`（若在 won / lost 欄）
* `lostReason`（只在 lost 欄簡短顯示）

---

## 13.2 卡片視覺優先順序

### 第一行

* 商機名稱

### 第二行

* 客戶名稱

### 第三行

* 類型 tag
* 機率

### 第四行

* 預估金額
* 預計成交日

### 第五行

* 負責人

---

## 13.3 卡片狀態提醒

### 即將到期

若 `expectedCloseDate` 距離今天很近（例如 7 天內）：

* 加黃色提示
* 或小 icon

### 已逾期

若 `expectedCloseDate` 已過但 stage 仍未完成：

* 加紅色提示
* 例如 `已逾期`

這對 BD 非常有用。

---

## 十四、卡片互動設計

每張商機卡至少應支援：

* 點卡片：進商機詳情頁
* 快速操作按鈕 / 下拉：

  * 編輯
  * 調整階段
  * 標記成交
  * 標記失敗

---

## 十五、階段調整策略

Pipeline 頁最重要的操作是推進 stage。

### 第一版建議

**先不要做真正拖曳**
改為：

* 卡片內 action menu
* 點「調整階段」打開 dialog

原因：

* 成本低很多
* 更穩
* 也較好控制 lost / won 的驗證規則

### 第二版再做

* Drag and Drop

---

## 十六、調整階段 Dialog 企劃

### 內容

```text id="7glgsk"
調整商機階段
- 商機名稱
- 目前階段
- 新階段
- 備註（可選）
- 若選 lost，需填失敗原因
- [取消] [確認]
```

### 規則

* `lost` 時 `lostReason` 必填
* `won` 時 status 自動轉 `won`
* 其他進行中 stage → status = `active`
* 更新後同步反映到對應欄位

這需與商機詳情頁的調整階段規則一致。

---

## 十七、已成交 / 已失敗欄位處理

`won` 與 `lost` 欄位是否要完整呈現，是一個 UX 決策點。

## 17.1 第一版建議

保留欄位，但可以：

* 視覺弱化
* 減少內容密度
* 讓進行中欄位更突出

例如：

* `won` 欄偏綠色系
* `lost` 欄偏紅灰色系

### 在 `lost` 卡片中額外顯示

* `lostReason`（簡短）

---

## 十八、空狀態企劃

### 整頁無商機

```text id="tqetul"
尚無商機資料
建立第一筆商機，開始以 Pipeline 管理合作進度。
[新增商機]
```

### 某階段無商機

每個欄位空時顯示：

```text id="x0xv5f"
目前沒有商機
```

不要放太重的空狀態圖，以免看板太碎。

### 篩選後無資料

```text id="jmxf79"
找不到符合條件的商機
請調整篩選條件或重設。
[重設篩選]
```

---

## 十九、第一版 MVP 範圍建議

### 必做

* Page Header
* Pipeline Summary
* 快速篩選區
* 7 個 stage 欄位
* Opportunity Cards
* 點卡片進詳情頁
* 快速調整階段 dialog
* 新增商機按鈕
* 返回商機列表

### 可後補

* 真正拖曳排序 / 拖曳換欄
* Forecast 區塊
* 批次操作
* 指派負責人
* 直接建立報價
* 欄位折疊 / 泳道（swimlane）

---

## 二十、與商機詳情頁 / 商機列表頁的關係

### 商機列表頁

* 查找與管理大量資料
* 精準篩選
* 表格操作

### 商機詳情頁

* 深入看單一商機
* 編輯
* 看階段歷史
* 看互動
* 看報價

### Pipeline 頁

* 以工作流角度推進商機
* 快速改 stage
* 看整體節奏

所以三者應並存，不互相取代。

---

## 二十一、可直接給 Codex 的頁面規格

```text id="5odydy"
請新增「Pipeline」頁面，路由為 /opportunities/pipeline。

頁面定位：
- 此頁為商機階段看板頁
- 以 Opportunity.stage 為欄位進行視覺化管理
- 用途是推進商機，而不是單純查找資料

資料來源：
- 使用 opportunities.js 作為主資料源
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
  - region
  - ownerUserId / ownerName
  - status
  - lostReason
  - updatedAt

頁面內容：
1. Header：
   - 標題：Pipeline
   - 說明文字
   - 新增商機
   - 返回商機列表

2. Summary：
   - 全部商機數
   - 進行中商機數
   - 總 Pipeline 金額
   - 本月預計成交數 / 金額

3. 快速篩選：
   - 關鍵字搜尋（商機名稱 / 商機代碼 / 客戶名稱）
   - ownerUserId
   - opportunityType
   - accountId
   - region
   - expectedCloseDate range
   - 重設

4. Pipeline Columns：
   - potential
   - contacted
   - qualified
   - proposal
   - negotiation
   - won
   - lost

5. 每個欄位 header 顯示：
   - 階段名稱
   - 商機數量
   - 該階段 expectedRevenue 加總

6. 每張卡片顯示：
   - 商機名稱
   - 客戶名稱
   - 商機類型
   - 機率
   - 預估金額
   - 預計成交日
   - 負責人

7. 卡片操作：
   - 點卡片進 Opportunity Detail
   - 快速調整階段
   - 編輯
   - 標記成交 / 標記失敗

8. 第一版不要做 drag and drop
9. 調整階段請用 dialog / drawer
10. 若 stage = lost，需要求 lostReason
11. 若 stage = won，status = won
12. 其他 stage，status = active
13. 完成空狀態與篩選後無資料狀態
```

---

## 二十二、開發順序建議

```text id="wqy43x"
1. 建立 Pipeline Summary
2. 建立快速篩選區
3. 建立 stage 欄位容器
4. 建立 Opportunity Card
5. 建立快速調整階段 dialog
6. 串接點擊進商機詳情頁
7. 串接新增商機 Drawer
```

---

## 二十三、最終決策

* Pipeline 頁要做
* 這頁是商機推進工作頁，不是表格頁
* 第一版先做 Kanban 視覺 + 快速調整階段
* 第一版不做 drag and drop
* `won / lost` 保留在看板中，但可視覺弱化
* 這頁會是商機管理中，僅次於商機列表頁與商機詳情頁的重要操作頁 
