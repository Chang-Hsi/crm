# 商機管理－Forecast 頁企劃

## 一、頁面定位

Forecast 頁不是商機列表頁的另一個篩選版本，也不是報表中心的完整分析頁。
它的定位應該是：

**以「預計成交」與「預估營收」為核心的商機預測頁**

也就是說，這頁要解決的不是：

* 目前有哪些商機
* 商機在哪個 stage

而是：

* 這個月 / 這一季預計會成交多少商機
* 預估會帶來多少營收
* 哪些商機最可能在近期成交
* 哪些預估有風險
* 各負責業務手上的 forecast 長什麼樣
* 依 stage 與 probability 看，整體 pipeline 的可預測性如何

這和你企劃中的 Opportunity 模組是直接對齊的，因為企劃已明確把 `Forecast` 列為商機管理的核心能力之一，並且 Opportunity 模型裡本來就有 `probability`、`expected_revenue`、`expected_close_date` 等欄位可支撐預測。

---

## 二、這頁和其他頁面的差異

### 1. 與商機列表頁的差異

* 商機列表頁：管理單筆商機
* Forecast 頁：看整體預估結果

### 2. 與 Pipeline 頁的差異

* Pipeline 頁：看商機流動在哪個 stage
* Forecast 頁：看這些商機大概能帶來多少結果

### 3. 與報表中心的差異

* 報表中心：偏歷史分析與管理 KPI
* Forecast 頁：偏未來預估與短中期決策

所以這頁本質比較像：

```text id="s9b9vb"
Sales Forecast Workspace
```

而不是一般分析報表頁。

---

## 三、頁面目標

Forecast 頁要達成的任務：

* 以時間維度查看預計成交金額
* 以 probability 加權查看預估營收
* 依負責業務查看 forecast 分布
* 依商機類型 / 地區 / 客戶查看 forecast
* 找出高金額、高機率、近期到期商機
* 找出預測風險商機
* 幫 BD / Manager 做短中期判斷

---

## 四、頁面型態建議

第一版建議把這頁做成：

**預測摘要頁 + 清單驗證頁**

也就是：

```text id="oskw4m"
Forecast 頁
├─ Page Header
├─ Forecast Summary
├─ Forecast Filters
├─ Forecast Breakdown
└─ Forecast Opportunity Table
```

這樣的好處是：

* 上方給管理視角
* 下方保留可追溯到單筆商機的能力
* 不會淪為只有卡片與圖表、無法落地

---

## 五、路由與頁籤

### 路由

```text id="kpx0e6"
/opportunities/forecast
```

### Header Tab

```text id="5ih0ff"
商機管理 / Forecast
```

---

## 六、資料基礎

Forecast 頁以 `opportunities.js` 為主資料來源即可成立。
最少需要以下欄位：

* id
* opportunityCode
* accountId
* accountName
* name
* opportunityType
* stage
* probability
* expectedRevenue
* expectedCloseDate
* region
* ownerUserId / ownerName
* status
* updatedAt 

---

## 七、Forecast 的基本計算邏輯

第一版 Forecast 頁至少要有兩種金額概念：

### 1. 原始 Pipeline 金額

```text id="e2z3n5"
Pipeline Amount = 所有進行中商機 expectedRevenue 加總
```

### 2. 加權 Forecast 金額

```text id="0v2f70"
Weighted Forecast = Σ(expectedRevenue × probability%)
```

### 例子

若某商機：

* expectedRevenue = 1,000,000
* probability = 70

則加權 forecast 為：

```text id="t5k0nf"
700,000
```

### 第一版規則

* 僅計算 `status = active` 的商機
* `won / lost` 不列入 forecast
* 可在表格中同時顯示原始金額與加權金額

---

## 八、頁面資訊架構

```text id="i6l9wd"
Forecast 頁
├─ Page Header
│   ├─ 標題：Forecast
│   ├─ 說明文字
│   └─ 返回商機列表 / Pipeline
│
├─ Forecast Summary Cards
│   ├─ 全部進行中商機數
│   ├─ 總 Pipeline 金額
│   ├─ 加權 Forecast 金額
│   └─ 本月預計成交金額
│
├─ Forecast Filters
│   ├─ 時間範圍
│   ├─ 負責業務
│   ├─ 商機類型
│   ├─ 地區
│   ├─ 客戶
│   ├─ 階段
│   └─ 重設
│
├─ Forecast Breakdown
│   ├─ 依月份 / 季度分組
│   ├─ 依負責業務分組
│   ├─ 依階段分組
│   └─ 依類型分組
│
└─ Forecast Opportunity Table
    ├─ 商機名稱
    ├─ 客戶
    ├─ 階段
    ├─ 機率
    ├─ 原始金額
    ├─ 加權金額
    ├─ 預計成交日
    ├─ 負責人
    └─ 操作
```

---

## 九、Page Header 企劃

### 內容

* 標題：`Forecast`
* 說明文字：例如「依機率與預計成交日查看商機預估」
* 按鈕：

  * 返回商機列表
  * 前往 Pipeline（可選）

### 目的

讓使用者知道：

* 這不是報表中心
* 而是商機管理底下的預測頁

---

## 十、Summary Cards 企劃

Forecast 頁一定要有摘要卡，因為這頁的價值就在於先給結論。

### 1. 全部進行中商機數

* `status = active` 的商機數

### 2. 總 Pipeline 金額

* 所有 active 商機的 `expectedRevenue` 加總

### 3. 加權 Forecast 金額

* 所有 active 商機的 `(expectedRevenue × probability)` 加總

### 4. 本月預計成交金額

* `expectedCloseDate` 落在本月的 active 商機 `expectedRevenue` 加總
* 第一版也可改成加權後本月 forecast，二選一即可，但要在 UI 標示清楚

---

## 十一、是否需要圖表

這頁和客戶分級頁不同，Forecast 頁**可以合理加入少量 EChart**，因為它本質上就是預測頁。
但仍要控制，不要變成完整 BI 頁。

### 第一版建議

最多加 **1 個主圖 + 1 個輔助分布圖**

#### 主圖建議

* 月份 / 季度 Forecast Bar Chart
* 顯示每月原始 Pipeline 與加權 Forecast

#### 輔助圖建議

* 依 stage 的 forecast 分布圖
* 或依 owner 的 forecast 分布圖

### 不建議第一版就做太多圖

避免：

* 頁面過重
* 與報表中心重疊
* 開發成本暴增

---

## 十二、Forecast Filters 企劃

## 12.1 時間範圍

這頁最重要的篩選一定是時間。

### 建議選項

* 本月
* 下個月
* 本季
* 自訂日期範圍

### 用途

主要依 `expectedCloseDate` 篩選

---

## 12.2 其他篩選條件

第一版建議有：

* 負責業務 `ownerUserId`
* 商機類型 `opportunityType`
* 地區 `region`
* 客戶 `accountId`
* 階段 `stage`
* 重設

### 說明

Forecast 頁的 stage 篩選仍有意義，因為：

* 有些管理者只想看 proposal / negotiation 的預估
* 不同 stage 的可信度差很多

---

## 十三、Forecast Breakdown 企劃

這是 Forecast 頁和商機列表頁拉開差距的關鍵區塊。

第一版不一定要做複雜 EChart，也可以先做結構化摘要區塊。

### 13.1 依月份 / 季度分組

顯示：

* 2026/04
* 2026/05
* 2026/06

每組顯示：

* 商機數
* 原始金額
* 加權金額

### 13.2 依負責業務分組

顯示每位 owner：

* 商機數
* 總 forecast
* 平均機率（可選）

### 13.3 依階段分組

顯示：

* potential
* contacted
* qualified
* proposal
* negotiation

每組顯示：

* 商機數
* 金額加總
* 加權 forecast 加總

### 13.4 依類型分組

顯示：

* agency
* license
* co_branding
* channel

這些分組可以先做成小卡片區，不一定非得是圖表。

---

## 十四、Forecast Opportunity Table 企劃

Forecast 頁下方一定要有表格，因為使用者需要追溯到單筆商機。

### 欄位清單

```text id="0gtnw7"
商機名稱
客戶
階段
機率
原始金額
加權金額
預計成交日
負責人
操作
```

### 欄位說明

#### 商機名稱

* 可點擊進商機詳情頁

#### 客戶

* 可點擊進 Account Detail

#### 階段

* 用 Tag 顯示

#### 機率

* 顯示 `%`

#### 原始金額

* `expectedRevenue`

#### 加權金額

* `expectedRevenue × probability`

#### 預計成交日

* 主要排序依據之一

#### 負責人

* ownerName

#### 操作

* 查看詳情
* 編輯
* 前往 Pipeline（可後補）

---

## 十五、風險標記企劃

Forecast 頁非常適合做一點輕量風險提示。

### 建議風險條件

第一版可先採簡單規則：

#### 風險商機條件

* `expectedCloseDate` 即將到期，但 stage 仍太前面
* probability 低但 expectedRevenue 很高
* 已逾期仍未成交

### UI 呈現方式

* 在表格中顯示「風險」小 tag
* 或在 row 上給淡紅色提示

不需要一開始做太複雜模型。

---

## 十六、空狀態企劃

### 無商機資料

```text id="nznrll"
尚無 Forecast 資料
建立商機後，系統即可依預計成交日與機率顯示預測結果。
[前往商機列表]
```

### 無符合條件資料

```text id="rvsvlo"
找不到符合條件的預測商機
請調整篩選條件或重設。
[重設篩選]
```

---

## 十七、第一版 MVP 範圍建議

### 必做

* Page Header
* Summary Cards
* 時間篩選 + 基本篩選
* Forecast Breakdown（至少一種分組）
* Forecast Opportunity Table
* 點商機進詳情
* 點客戶進 Account Detail

### 可後補

* 主圖表（月份 / 季度 forecast chart）
* 風險商機自動標記
* 依 owner / stage 切換 breakdown
* 匯出
* 情境預測（best / commit / pipeline）

---

## 十八、進階版本可擴充方向

如果之後要再升級，Forecast 頁可以做成更像銷售管理系統的預測頁：

### 可擴充概念

* Best Case
* Commit
* Pipeline
* Omitted

但這需要更複雜的規則與人工標記。
第一版不建議先做。

---

## 十九、可直接給 Codex 的頁面規格

```text id="q6xpcj"
請新增「Forecast」頁面，路由為 /opportunities/forecast。

頁面定位：
- 此頁為商機預測頁
- 主要用途為依 expectedCloseDate 與 probability 查看商機預估結果
- 不是報表中心，也不是商機列表頁的複製版

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
  - updatedAt

頁面內容：
1. Header：
   - 標題：Forecast
   - 說明文字
   - 返回商機列表
   - 可選：前往 Pipeline

2. Summary Cards：
   - 全部進行中商機數
   - 總 Pipeline 金額
   - 加權 Forecast 金額
   - 本月預計成交金額

3. Filters：
   - 時間範圍（本月 / 下月 / 本季 / 自訂）
   - ownerUserId
   - opportunityType
   - region
   - accountId
   - stage
   - 重設

4. Breakdown：
   - 至少完成一種分組摘要：
     - 依月份 / 季度
     - 或依 owner
     - 或依 stage
   - 顯示商機數、原始金額、加權金額

5. Table 欄位：
   - 商機名稱
   - 客戶
   - 階段
   - 機率
   - 原始金額
   - 加權金額
   - 預計成交日
   - 負責人
   - 操作

6. 規則：
   - 只計算 status = active 的商機
   - Weighted Forecast = expectedRevenue * probability / 100
   - won / lost 不列入 forecast 總額

7. 點商機名稱跳 Opportunity Detail
8. 點客戶名稱跳 Account Detail
9. 完成空狀態與無結果狀態
10. 第一版圖表可不做，或最多只做 1 個主圖
```

---

## 二十、開發順序建議

```text id="l3uvsv"
1. 建立 forecast 計算 helper
2. 建立 summary cards
3. 建立 filters
4. 建立 breakdown 區塊
5. 建立 forecast table
6. 串接跳轉 Opportunity Detail / Account Detail
7. 視情況補 1 個輕量圖表
```

---

## 二十一、最終決策

* Forecast 頁要做
* 它不是報表中心，而是商機管理底下的預測頁
* 第一版以「摘要 + 分組 + 表格」為核心
* 第一版可以不做圖表，或最多只做 1 個主圖
* 這頁的核心價值是：

  * 看未來預估
  * 看加權後結果
  * 追到單筆商機
* 它會是 Manager 與 BD 都會用到的重要頁面，尤其在月 / 季檢視時很有價值 
