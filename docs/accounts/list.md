結論先講：
**客戶列表頁** 可用 MVP 版
分成三層來想：**表格欄位、上方查詢篩選、列操作** + 分頁表(element plus)。

客戶 / 帳戶管理（Account）
├─ 公司資料（代理商 / 通路 / 合作夥伴）
├─ 聯絡人管理（多角色）

客戶 = 公司（Account）
聯絡人 = 人（Contact）

Account（公司）
├─ 1 → N Contact（聯絡人）
├─ 1 → N Opportunity（商機）
├─ 1 → N Activity（互動）
└─ 1 → N Contract / Project ...

👉 所以：
現在做的「客戶列表頁」＝公司列表
裡面不會出現「人名」作為主體
人是下一層（Contact）

先講最重要的表格欄位。根據 Account 模型，最適合先放這些：

```text
0. 客戶logo company_logo
1. 客戶名稱 company_name
2. 客戶類型 company_type
3. 客戶分級 tier
4. 生命周期 lifecycle_stage
5. 所屬地區 region
6. 負責業務 owner
7. 關聯商機數量
8. 最近更新時間 updated_at
9. 狀態 status
10. 操作
```

這樣的原因是，它剛好對應你企劃裡客戶管理最核心的辨識資訊：公司資料、分級、生命周期、地區、Owner，以及後續會進商機與詳情頁的入口。Account 模型本身也有 `company_name`、`company_type`、`tier`、`lifecycle_stage`、`region_id`、`owner_user_id`、`status`、`updated_at` 這些欄位。

不建議第一版把 address、website、industry 全塞進列表，因為那會讓表格太重。那些比較適合放客戶詳情頁。

「MVP 表格欄位」，我會排成這樣：

```text
客戶logo
客戶名稱
客戶類型
分級
生命周期
地區
負責業務
商機數
狀態
更新時間
操作
```

其中幾個顯示細節我會這樣建議：

* **客戶logo**：主欄位
* **客戶名稱**：主欄位，可點進詳情頁
* **客戶類型**：badge 顯示，例如 partner / distributor / channel / enterprise
* **分級**：strategic / normal / potential，用 tag 顯示
* **生命周期**：lead / deal / retention / churn，用狀態色顯示
* **商機數**：顯示數字，之後可點進商機列表
* **狀態**：active / inactive / churned
* **更新時間**：讓使用者快速知道資料新舊

再講上方查詢區。
答案是：**一定要有，而且至少要有一個關鍵字搜尋 + 幾個核心篩選。**
因為企劃裡客戶列表頁已明確寫了：

* 搜尋
* 篩選（類型 / 地區 / tier / lifecycle / owner）
* 排序
* 批次操作
* 匯出 

所以你這頁上方至少要有：

```text
關鍵字搜尋
客戶類型篩選
地區篩選
分級篩選
生命周期篩選
負責業務篩選
```

如果做成前端第一版，建議 UI 上先這樣排：

```text
[搜尋框：客戶名稱 / 代碼 / 關鍵字]
[客戶類型]
[地區]
[分級]
[生命周期]
[負責業務]
[重設]
[新增客戶]
```

其中關鍵字支援：

* 公司名稱
* account_code
* 標籤關鍵字（若mock data 有）

然後篩選值可直接對應企劃定義：

* `company_type`
* `tier`
* `lifecycle_stage`
* `owner_user_id`
* `region_id` 

排序部分, 請用element plus提供的放在表頭的排序箭頭功能：

* 最近更新時間
* 建立時間
* 商機數量（可後補）

接著是右側「操作」欄。
第一版每列先有：

```text
詳情
編輯
更多
```

`更多` 裡之後可放：

* 指派 Owner
* 合併客戶
* 停用
* 匯出單筆

如果照企劃的例外流程來看，未來你一定會有：

* 客戶重複合併（merge）
* 客戶轉交（assign） 

但這兩個先不用直接放主按鈕，先藏在更多選單就好。

批次操作要不要做？
**要留，但第一版可以做很輕。**
企劃有寫批次操作與匯出，所以你最好在表格前面加 checkbox selection。第一版批次操作可先只有：

* 批次匯出
* 批次指派 Owner
* 批次標記標籤

不用一開始做太重。

```text
客戶列表頁（MVP）

一、表格欄位
- 客戶logo
- 客戶名稱（可點擊）
- 客戶類型
- 分級
- 生命周期
- 地區
- 負責業務
- 商機數
- 狀態
- 更新時間
- 操作

二、上方功能區
- 關鍵字搜尋（名稱 / 客戶代碼）
- 篩選：客戶類型
- 篩選：地區
- 篩選：分級
- 篩選：生命周期
- 篩選：負責業務
- 重設篩選
- 新增客戶按鈕

三、表格功能
- 分頁
- 排序（更新時間、名稱）
- checkbox 批次選取
- 空狀態
- loading 狀態

四、列操作
- 詳情
- 編輯
- 更多（請使用垂直三點icon, 點擊出現下拉選單: 轉交 / 合併 / 停用，先可保留, 暫時不做真正功能）
```

---------

# 客戶詳情頁 / 新增彈窗 / 編輯彈窗企劃

## 一、設計原則

* 客戶列表頁為名單與搜尋入口
* 客戶詳情頁為長時間停留的工作頁面，採獨立路由與 Header Tab 開啟
* 新增 / 編輯屬短操作流程，不中斷列表或詳情頁工作流，採 Drawer 彈窗
* 客戶主體為 Account（公司），聯絡人為 Contact，商機、合約、專案、互動皆掛載於 Account 之下 
* 第一階段以 MVP v1 為準，優先支援「客戶 → 商機 → 互動 → Pipeline 推進」；合約、專案、財務等先以占位或只讀資訊呈現 

---

## 二、頁面與彈窗定位

### 2.1 客戶詳情頁

性質：

* 深度瀏覽頁
* 工作頁
* 需被多開比較
* 需承載多個子模組資訊

呈現方式：

* 獨立路由頁
* 開新 Header Tab
* URL 建議：`/accounts/:id`

---

### 2.2 新增客戶

性質：

* 快速建立
* 從列表發起
* 不應打斷使用者目前瀏覽情境

呈現方式：

* 右側 Drawer
* 不開新頁
* 從客戶列表頁右上角「新增客戶」按鈕開啟

---

### 2.3 編輯客戶

性質：

* 局部修改
* 可能從列表頁或詳情頁發起
* 不應讓使用者離開原本工作上下文

呈現方式：

* 右側 Drawer
* 不開新頁
* 與新增共用表單元件

---

## 三、客戶詳情頁企劃

## 3.1 路由與頁籤策略

### 路由

```text
/accounts/:accountId
```

### Header Tab 命名規則

```text
客戶列表 / {companyName}
```

### 開啟方式

* 從客戶列表點擊客戶名稱
* 從商機頁、互動紀錄頁等關聯入口點擊客戶名稱

### 關閉行為

* 關閉詳情 Tab 後回到上一個已開頁籤
* 再次點擊同一客戶，應回到既有 Tab，不重複開新 Tab

---

## 3.2 頁面目標

客戶詳情頁需承擔以下任務：

* 查看客戶完整基本資料
* 快速理解客戶目前狀態（類型、分級、生命周期、狀態）
* 查看聯絡人
* 查看關聯商機
* 查看互動紀錄與 Timeline
* 之後擴充查看合約、專案、文件等資訊 

---

## 3.3 頁面資訊架構

```text
客戶詳情頁
├─ 頂部摘要區
│   ├─ 客戶名稱
│   ├─ account code
│   ├─ company type
│   ├─ tier
│   ├─ lifecycle stage
│   ├─ status
│   ├─ region
│   └─ owner
│
├─ 操作列
│   ├─ 編輯客戶
│   ├─ 新增聯絡人
│   ├─ 新增商機
│   ├─ 更多操作
│   └─ 返回列表
│
└─ Tabs
    ├─ 概覽
    ├─ 聯絡人
    ├─ 商機
    ├─ 互動紀錄
    ├─ Timeline
    ├─ 合約（v2）
    ├─ 專案（v2）
    └─ 文件（v2）
```

---

## 3.4 頂部摘要區內容

### 必要資訊

* 客戶名稱 `companyName`
* 客戶代碼 `accountCode`
* 客戶類型 `companyType`
* 分級 `tier`
* 生命周期 `lifecycleStage`
* 狀態 `status`
* 地區 `region`
* 負責業務 `owner`
* 最近更新時間 `updatedAt`

### 呈現建議

* 客戶名稱為主標題
* 客戶代碼作次要資訊
* company type / tier / lifecycle / status 以 Tag / Badge 呈現
* owner、region、updatedAt 以資訊列呈現
* 頂部右側固定操作按鈕

---

## 3.5 頂部操作列

### 第一階段按鈕

* 編輯客戶
* 新增聯絡人
* 新增商機
* 更多操作

### 更多操作選單

* 指派負責業務
* 合併客戶（未開放時 disabled）
* 停用 / 啟用客戶
* 匯出客戶資料

### 權限規則

* 編輯客戶：具備 Account update 權限者可見
* 新增聯絡人：具備 Contact create 權限者可見
* 新增商機：具備 Opportunity create 權限者可見
* 合併 / 指派：僅特定角色可見或可操作 

---

## 3.6 Tabs 詳細規格

### Tab 1：概覽（Overview）

目的：

* 提供客戶一頁式摘要
* 避免使用者一進頁就必須切 tab

#### 區塊

```text
概覽
├─ 基本資料卡
├─ 聯絡人摘要卡
├─ 商機摘要卡
├─ 最近互動摘要卡
└─ Timeline 最近事件
```

#### 內容

1. 基本資料卡

* 公司名稱
* company type
* tier
* lifecycle
* status
* region
* website
* address
* description

2. 聯絡人摘要卡

* 主要聯絡人姓名
* 職稱
* Email
* Phone
* 聯絡人總數
* 「查看全部聯絡人」按鈕

3. 商機摘要卡

* 商機總數
* 進行中商機數
* 總 Pipeline 金額（若 mock 有）
* 最近一筆商機
* 「查看全部商機」按鈕

4. 最近互動摘要卡

* 最近會議
* 最近備註
* 最近 Email / 通話
* 下次行動

5. Timeline 最近事件

* 顯示最近 5 筆

---

### Tab 2：聯絡人

目的：

* 查看掛在此客戶之下的 Contact 列表

#### 結構

```text
聯絡人
├─ 工具列
│   ├─ 搜尋
│   ├─ 篩選（角色 / 是否主要聯絡人）
│   └─ 新增聯絡人
└─ 列表
```

#### 欄位建議

* 姓名
* 職稱
* 部門
* Email
* 電話 / 手機
* role type
* 是否主要聯絡人
* 狀態
* 操作

#### 操作

* 查看
* 編輯
* 設為主要聯絡人
* 停用

---

### Tab 3：商機

目的：

* 查看此客戶下的所有商機

#### 結構

```text
商機
├─ 工具列
│   ├─ 搜尋
│   ├─ 篩選（stage / owner / product）
│   ├─ 排序
│   └─ 新增商機
└─ 列表
```

#### 欄位建議

* 商機名稱
* 類型
* 階段
* 機率
* 預估金額
* 預計成交日
* 負責人
* 最近更新
* 操作

#### 操作

* 查看詳情
* 編輯
* 推進階段

---

### Tab 4：互動紀錄

目的：

* 查看所有 Activity

#### 結構

```text
互動紀錄
├─ 工具列
│   ├─ 篩選（meeting / call / email / note）
│   ├─ 日期範圍
│   └─ 新增互動
└─ 列表
```

#### 欄位建議

* 類型
* 主題
* 參與聯絡人
* 負責人
* 預定時間 / 完成時間
* 狀態
* 摘要
* 操作

---

### Tab 5：Timeline

目的：

* 聚合顯示此客戶的重要事件
* 為 UI 聚合檢視，不要求獨立資料表 

#### 來源

* Activity
* OpportunityStageHistory
* 重要更新事件
* 系統通知事件（必要時）

#### 呈現方式

* 時間軸垂直列表
* 每筆包含時間、事件類型、標題、摘要、操作者
* 支援「只看商機 / 只看互動 / 全部」篩選

---

### Tab 6：合約（v2）

第一期：

* 顯示 empty state 或 coming soon
* 若 mock 資料有，可先只讀列表

---

### Tab 7：專案（v2）

第一期：

* 顯示 empty state 或 coming soon
* 若 mock 資料有，可先只讀列表

---

### Tab 8：文件（v2）

第一期：

* 顯示 empty state 或 coming soon

---

## 3.7 空狀態與例外狀態

### 無聯絡人

* 顯示「尚無聯絡人」
* 提供「新增聯絡人」按鈕

### 無商機

* 顯示「尚未建立商機」
* 提供「新增商機」按鈕

### 無互動紀錄

* 顯示「尚無互動紀錄」
* 提供「新增互動」按鈕

### 客戶已流失 / 停用

* 頂部顯示狀態標籤
* 相關編輯與新建動作可視規則做限制
* 仍可瀏覽歷史資料

---

## 四、新增客戶 Drawer 企劃

## 4.1 呈現方式

* 右側 Drawer
* 寬度建議：560px ~ 640px
* 支援滾動
* 開啟來源：客戶列表頁右上「新增客戶」
* 關閉方式：取消、右上關閉、背景遮罩（視專案規範）

---

## 4.2 目的

* 快速建立一筆 Account
* 不打斷使用者停留在客戶列表的情境
* 建立成功後自動更新列表
* 可選擇建立後是否跳轉到詳情頁

---

## 4.3 標題

```text
新增客戶
```

副標可選：

```text
建立新的企業客戶 / 合作夥伴 / 代理商 / 通路商資料
```

---

## 4.4 表單欄位規格

### 第一區：基本資料

* 公司名稱 `companyName`（必填）
* 客戶代碼 `accountCode`（可先自動產生或唯讀預覽）
* 客戶類型 `companyType`（必填）

  * enterprise
  * partner
  * distributor
  * channel
* 分級 `tier`（必填）

  * strategic
  * normal
  * potential
* 生命周期 `lifecycleStage`

  * 預設 `lead`
* 狀態 `status`

  * 預設 `active`

### 第二區：營運資訊

* 地區 `region`（必填）
* 負責業務 `owner`（必填）
* 產業 `industry`（可選）
* 標籤 `tags`（可選）

### 第三區：聯絡 / 補充資訊

* Website（可選）
* 地址 `address`（可選）
* 說明 / 備註 `description`（可選，多行）

---

## 4.5 欄位驗證

### 必填

* 公司名稱
* 客戶類型
* 分級
* 地區
* 負責業務

### 驗證規則

* 公司名稱不可為空
* 若客戶代碼手動輸入，不可重複
* Website 若有填，需為合法 URL 格式
* 描述字數建議限制

### 預設值

* lifecycleStage = lead
* status = active
* tier 可預設 normal 或由產品決定

---

## 4.6 底部操作按鈕

* 取消
* 建立
* 建立並查看詳情（次要按鈕，可選）

### 建立成功後行為

預設建議：

* 關閉 Drawer
* 列表刷新
* toast 顯示成功訊息

進階行為：

* 若按「建立並查看詳情」，則：

  * 關閉 Drawer
  * 開新 Tab 到客戶詳情頁

---

## 4.7 錯誤處理

* 表單驗證錯誤時，欄位下顯示錯誤訊息
* 建立失敗時，Drawer 不關閉
* 顯示全域錯誤提示

---

## 五、編輯客戶 Drawer 企劃

## 5.1 呈現方式

* 右側 Drawer
* 與新增共用 AccountForm
* 開啟來源：

  * 客戶列表頁「編輯」
  * 客戶詳情頁「編輯客戶」

---

## 5.2 目的

* 修改客戶核心資料
* 維持當前上下文
* 避免跳離列表或詳情頁

---

## 5.3 標題

```text
編輯客戶
```

副標可顯示：

```text
{companyName} / {accountCode}
```

---

## 5.4 欄位規格

基本與新增相同，但載入現有資料。

### 可編輯欄位

* 公司名稱
* 客戶類型
* 分級
* 生命周期
* 狀態
* 地區
* 負責業務
* 產業
* 標籤
* Website
* 地址
* 描述

### 不建議第一版可編輯欄位

* accountCode（若已作為穩定識別碼）
* createdAt
* 系統關聯數據

---

## 5.5 額外資訊區塊（可選）

編輯 Drawer 底部可顯示只讀資訊：

* 建立時間
* 最近更新時間
* 最後更新人

---

## 5.6 底部操作按鈕

* 取消
* 儲存變更

若在詳情頁發起編輯：

* 儲存成功後更新詳情頁資料
* 不關閉目前詳情 Tab

若在列表頁發起編輯：

* 儲存成功後刷新列表該列資料

---

## 5.7 編輯限制與提醒

* 若客戶狀態為 churned / inactive，部分欄位可限制編輯
* 若存在進行中商機，某些重要欄位變更需二次確認
* 若變更 owner，可顯示「是否同步通知新負責人」

---

## 六、共用元件規劃

## 6.1 AccountForm 共用元件

```text
<AccountForm mode="create" />
<AccountForm mode="edit" />
```

### Props 建議

* mode
* initialValues
* loading
* readonlyFields
* onSubmit

### 輸出事件

* submit
* cancel
* success

---

## 6.2 AccountSummaryHeader 共用元件

用於詳情頁頂部摘要區。

內容：

* 客戶名稱
* 客戶代碼
* 狀態標籤
* type / tier / lifecycle / status
* owner / region / updatedAt
* 操作按鈕

---

## 6.3 AccountTabs 共用元件

用於詳情頁 tab 切換。

---

## 七、互動行為規範

## 7.1 從列表進詳情

* 點擊客戶名稱
* 開啟新 Tab
* 進入 `/accounts/:id`

## 7.2 從列表新增客戶

* 點擊「新增客戶」
* 開 Drawer
* 填表送出
* 刷新列表

## 7.3 從列表編輯客戶

* 點擊列操作「編輯」
* 開 Drawer
* 儲存後更新該列

## 7.4 從詳情頁編輯客戶

* 點擊頂部「編輯客戶」
* 開 Drawer
* 儲存後更新詳情頁與 Header Tab 標題（若公司名稱變更）

---

## 八、視覺與 UX 細節

## 8.1 詳情頁

* 頂部摘要區固定清楚，不要過度擁擠
* Tabs 數量第一期控制在 5 個核心內
* Overview 頁作為預設進入頁
* 所有摘要卡應可通往更完整 tab

## 8.2 新增 / 編輯 Drawer

* 表單欄位分區
* 每區有明確標題
* 必填欄位標示清楚
* 長內容欄位放底部
* 提交按鈕固定在底部 footer

## 8.3 一致性

* 新增與編輯使用同一表單布局
* 詳情頁的欄位名稱與列表、表單命名一致
* Badge / Tag 顏色在列表、詳情、表單預覽中一致

---

## 九、第一階段交付範圍建議

## 9.1 必做

* 客戶詳情頁

  * 頂部摘要
  * Overview
  * 聯絡人 tab
  * 商機 tab
  * 互動紀錄 tab
  * Timeline tab
* 新增客戶 Drawer
* 編輯客戶 Drawer

## 9.2 可先簡化

* 聯絡人 tab 先做只讀列表
* 商機 tab 先做只讀列表
* Timeline 先只顯示 Activity + Stage history
* 合約 / 專案 / 文件 tab 先不做或顯示 coming soon

---

## 十、Mock Data 與前端結構建議

## 10.1 accounts.js 現有資料可直接支撐

可先用既有 `accountList` 支撐：

* 列表頁
* 詳情頁頂部摘要
* 基本資料卡

## 10.2 建議新增靜態資料

```text
data/
├─ accounts.js
├─ contacts.js
├─ opportunities.js
├─ activities.js
└─ timeline.js（可選）
```

## 10.3 資料關聯建議

* contact.accountId
* opportunity.accountId
* activity.relatedEntityType = account / opportunity
* activity.relatedEntityId = accountId / opportunityId

---

## 十一、開發優先順序

```text
1. 客戶詳情頁骨架
2. Overview tab
3. 新增客戶 Drawer
4. 編輯客戶 Drawer
5. 聯絡人 tab
6. 商機 tab
7. 互動紀錄 tab
8. Timeline tab
```

---

## 十二、最終決策

* 客戶詳情頁：開新分頁（Header Tab）
* 新增客戶：右側 Drawer
* 編輯客戶：右側 Drawer
* 第一階段不將新增 / 編輯做成獨立頁
* 客戶詳情頁為後續商機、聯絡人、互動、合約、專案的主承載頁


