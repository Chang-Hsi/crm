**完整企劃書正文**
---

## 28. 前端 CI/CD 與部署流程

目前此專案已設定為前端靜態網站部署流程，部署平台為 Vercel，CI 由 GitHub Actions 執行。

### 28.1 Build 設定

* Framework：`Vite`
* Install Command：`npm ci`
* Build Command：`npm run build`
* Output Directory：`dist`

### 28.2 Vercel 部署行為

* `main` 分支：自動部署到 Production
* 其他分支與 Pull Request：自動產生 Preview Deployment
* 因為此專案為 SPA，已透過 `vercel.json` 補上 rewrite，避免使用者直接刷新深層路由時出現 404

相關設定檔：

* `vercel.json`

### 28.3 GitHub Actions CI

目前 CI workflow 位於：

* `.github/workflows/ci.yml`

流程如下：

1. checkout repository
2. 使用 Node.js 22
3. 執行 `npm ci`
4. 執行 `npm run build`

目前 repo 尚未提供獨立的 `lint` 或 `type-check` script，因此 CI 先以可成功安裝與建置為最小可用檢查。

### 28.4 後續若要接後端 API

建議做法：

* 前端僅讀取環境變數，例如：`VITE_API_BASE_URL`
* 本機、Preview、Production 分別在 Vercel Project Settings 設定不同值
* 前端 API client 統一從單一設定檔讀取 base URL，不要在元件內硬寫 API 網址

建議環境變數命名：

* `VITE_API_BASE_URL`
* `VITE_APP_ENV`

如此可讓：

* 本機開發連到 local / dev API
* Preview Deployment 連到 staging API
* Production Deployment 連到正式 API

# 節點科技 B2B CRM 系統專案企劃書 v2.0

## 一、文件目的

本文件用於規劃『節點科技』B2B CRM 系統專案之前端產品設計與整體產品規格，作為後續 UI/UX 設計、前後端開發、資料模型建立、權限規劃、系統整合、MVP 排程與跨部門討論之依據。

本系統之核心目標，不只是建立一套「客戶管理工具」，而是建立一套可支援節點科技在 B2B 商務合作情境下的整合型營運平台，涵蓋客戶管理、商機管理、夥伴管理、合約與專案管理、營收與分潤、報表與管理決策等能力。

---

## 二、專案背景與定位

節點科技在 B2B 情境下，面對的對象不只是單一企業客戶，而可能包含：

* 代理商
* 經銷商
* 通路商
* 聯名合作夥伴
* 平台合作方
* 授權合作方
* 企業採購客戶
* 內部商務、財務、行銷、管理層等角色

因此，本 CRM 系統不能只停留在傳統「客戶名單管理」層次，而需兼具以下性質：

* CRM（Customer Relationship Management）
* PRM（Partner Relationship Management）
* Pipeline / Opportunity Management
* Contract / Project Coordination
* Revenue / Settlement Support
* Dashboard / Analytics for management

換言之，本系統的產品定位為：

**一套以營收流程為主幹、以角色任務為導向、整合客戶、商機、合約、專案、分潤與分析的 B2B 營運後台系統。**

---

## 三、系統設計原則

本專案採用以下設計原則：

### 1. 任務導向優先

Sidebar 與 Dashboard 的設計，應以使用者實際任務為優先，而非僅以技術模組分類。

### 2. 流程導向優先

功能模組的存在，必須服務於完整業務流程，而非孤立功能堆疊。

### 3. 角色導向呈現

不同角色看到的系統，不只是權限不同，而是應呈現不同的工作入口與資訊優先順序。

### 4. 單一資料真相來源

核心資料模型必須清楚定義資料歸屬與關聯，避免 Partner / Account / Lead / Timeline 等概念重疊混亂。

### 5. 分階段落地

第一版以 BD 核心流程為主，不追求一次完成完整後台，而以可用、可擴充為原則。

---

## 四、系統範圍與邊界

### 4.1 本系統負責範圍

本 CRM 系統主要負責：

* 客戶與聯絡人管理
* 商機與 Pipeline 管理
* 互動紀錄管理
* 報價管理
* 合約管理
* 專案管理
* 夥伴管理
* 分潤與結算管理
* 角色化 Dashboard 與報表
* 權限管理
* 自動化流程規則
* 外部系統資料整合後的顯示與營運使用

### 4.2 本系統非主責範圍

以下項目可能由外部系統主責，本 CRM 僅整合顯示或做營運層使用：

* 正式財務帳務總帳：ERP
* 正式發票與收付款主系統：ERP / 財務系統
* 遊戲原始營收與營運數據來源：遊戲數據平台
* 深度商業智慧模型：BI 平台
* EDM / 廣告投放細節：行銷工具
* 客服工單完整處理：客服系統

### 4.3 系統主責分工表

| 系統         | 主責內容                          |
| ---------- | ----------------------------- |
| CRM        | 客戶、商機、報價、合約、專案、營運追蹤、分潤檢視、報表入口 |
| ERP / 財務系統 | 發票、收付款、正式帳務                   |
| 遊戲數據系統     | DAU、營收、遊戲運營指標原始資料             |
| BI         | 深度分析、跨系統分析模型                  |
| 客服系統       | Ticket 主流程、客服 SLA             |
| 行銷工具       | 廣告投放、EDM、活動執行細節               |

---

## 五、功能架構（完整功能樹）

### 功能應該具備（以樹狀圖說明）

```text
B2B CRM 系統（節點科技情境）
│
├─ 1. 客戶 / 帳戶管理（Account）
│   ├─ 公司資料（代理商 / 通路 / 合作夥伴 / 企業客戶）
│   ├─ 聯絡人管理（多角色：決策者 / 執行者 / 採購 / 技術 / 行銷 / 財務）
│   ├─ 客戶分級（戰略 / 一般 / 潛在）
│   ├─ 客戶生命周期（lead → deal → retention → churn）
│   ├─ 客戶標籤（產業 / 地區 / 合作類型 / 重要程度）
│   ├─ 負責業務（Owner）
│   ├─ 合作歷史（遊戲 / 地區 / 專案）
│   ├─ 關聯商機
│   ├─ 關聯合約
│   ├─ 關聯專案
│   └─ 客戶整體 Timeline
│
├─ 2. 商機 / 銷售管理（Opportunity）
│   ├─ 商機建立（代理、授權、聯名、通路）
│   ├─ 銷售流程（Pipeline）
│   │   ├─ 潛在
│   │   ├─ 接洽
│   │   ├─ 提案 / 報價
│   │   ├─ 談判
│   │   ├─ 成交
│   │   └─ 失敗
│   ├─ 商機金額預估
│   ├─ 成交機率
│   ├─ 預計成交日
│   ├─ 商機來源
│   ├─ 主要聯絡人
│   ├─ 報價管理
│   ├─ 商機互動紀錄
│   ├─ 商機階段歷程
│   ├─ 商機失敗原因
│   └─ 營收預測（Forecast）
│
├─ 3. 報價管理（Quote）
│   ├─ 報價建立
│   ├─ 報價版本
│   ├─ 報價明細
│   ├─ 定價模式（固定 / 分潤 / 混合）
│   ├─ 有效期限
│   ├─ 狀態管理（draft / submitted / accepted / rejected / expired）
│   └─ 關聯商機 / 客戶
│
├─ 4. 合約管理（Contract）
│   ├─ 合約建立
│   ├─ 合約類型（授權 / 分潤 / 聯名 / 通路）
│   ├─ 合約版本管理
│   ├─ 合約生效日 / 到期日
│   ├─ 合約條件
│   ├─ 分潤條款
│   ├─ 結算週期
│   ├─ 合約狀態（draft / reviewing / active / expired / terminated）
│   ├─ 簽署日期
│   ├─ 關聯商機
│   ├─ 關聯夥伴 / 客戶
│   ├─ 關聯專案
│   └─ 合約文件
│
├─ 5. 夥伴 / 通路管理（PRM）
│   ├─ 代理商 / 經銷商 / 平台夥伴管理
│   ├─ 合作模式（授權 / 分銷 / 聯運 / 聯名）
│   ├─ 分潤機制
│   ├─ KPI追蹤（營收 / DAU / 下載 / 成長）
│   ├─ 夥伴績效分析
│   ├─ 合作條件查詢
│   ├─ 夥伴後台（Portal）
│   ├─ 夥伴外部帳號
│   └─ 夥伴結算查詢
│
├─ 6. 專案 / 活動管理（Project）
│   ├─ 合作專案（遊戲上線 / 發行 / 聯名 / 行銷）
│   ├─ 專案基本資料
│   ├─ 專案狀態（planning / running / delayed / completed / cancelled）
│   ├─ 任務分配（BD / 行銷 / 技術 / 財務）
│   ├─ 時程（Milestone）
│   ├─ 行銷活動（Campaign）
│   ├─ 文件管理（提案 / 素材 / 合約附件）
│   ├─ 風險與延遲標記
│   └─ 專案 Timeline
│
├─ 7. 客戶互動紀錄（Engagement）
│   ├─ Email 紀錄
│   ├─ 通話紀錄
│   ├─ 會議 / 拜訪紀錄
│   ├─ 備註（Note）
│   ├─ 待辦 / 跟進事項
│   ├─ 客訴 / Issue Tracking
│   ├─ 下次行動（Next Action）
│   └─ Timeline（完整歷程聚合檢視）
│
├─ 8. 財務 / 分潤（Finance / Settlement）
│   ├─ 營收紀錄（RevenueRecord）
│   ├─ 對帳管理
│   ├─ 分潤計算
│   ├─ 分潤明細
│   ├─ 發票資料
│   ├─ 收付款紀錄
│   ├─ 多幣別 / 匯率
│   ├─ 分潤狀態（draft / reviewing / confirmed / paid）
│   └─ 異常提醒
│
├─ 9. 數據分析 / BI（Analytics）
│   ├─ 客戶價值（LTV）
│   ├─ 營收分析（依地區 / 遊戲 / 夥伴 / 期間）
│   ├─ 商機轉換率（Conversion）
│   ├─ 夥伴績效 Dashboard
│   ├─ 客戶流失 / 預測分析
│   ├─ 業績達成率
│   ├─ 管理層 KPI 檢視
│   └─ 風險預警
│
├─ 10. 權限 / 組織管理（Permission）
│   ├─ 角色（BD / Finance / Manager / Admin）
│   ├─ 角色權限
│   ├─ 資料存取範圍（self / department / all）
│   ├─ 外部帳號（合作夥伴登入）
│   ├─ 部門組織
│   ├─ 使用者角色指派
│   └─ 匯出 / 審核 / 刪除 等敏感操作控制
│
├─ 11. 系統整合（Integration）
│   ├─ ERP / 財務
│   ├─ 遊戲數據
│   ├─ 行銷工具
│   ├─ 客服系統
│   ├─ API（對外串接）
│   ├─ ETL / 匯入
│   └─ 同步狀態紀錄
│
├─ 12. 自動化（Automation）
│   ├─ 任務提醒（跟進 / 合約到期 / 對帳異常）
│   ├─ Workflow（簽約流程 / 狀態流轉）
│   ├─ 客戶分配
│   ├─ KPI 警示
│   ├─ 通知中心
│   └─ Automation Log
│
└─ 13. 客戶入口（Portal / API）
    ├─ 夥伴後台（查數據 / 報表）
    ├─ 素材下載（行銷資源）
    ├─ 合約 / 對帳查詢
    ├─ 分潤檢視
    ├─ 帳號管理
    └─ API 串接（第三方系統）
```

---

## 六、概念統一定義（修正原本局部不一致）

### 6.1 Account 與 Partner 定義

本專案統一定義如下：

* **Account**：所有 B2B 對象的上位概念，包含代理商、經銷商、通路商、合作夥伴、企業客戶等公司實體。
* **Partner** 不獨立為第一層主實體，而是以 **Account.company_type = partner / distributor / channel / enterprise** 方式表示不同類型。
* 若未來夥伴功能更複雜，可在 Account 基礎上擴展 Partner Profile，但不新增第二套重複主體。

### 6.2 Lead 定義

第一階段不獨立建立 Lead 模組，避免與 Account 重疊。

* 潛在客戶階段以 `Account.lifecycle_stage = lead` 表示。
* 若未來名單量龐大，需區分「未轉換名單」與「已建立客戶」，再擴充獨立 Lead 模組。

### 6.3 Timeline 定義

Timeline 為 **UI 聚合視圖**，不是必然獨立資料表。

Timeline 的內容可由下列事件聚合生成：

* Activity
* OpportunityStageHistory
* Quote Version / Status Change
* ContractVersion
* Project Milestone
* Issue / Ticket
* Notification / Workflow Event（若需）

第一期不強制獨立 TimelineEvent 表，若後續查詢效能與稽核需求提高，再建立聚合事件表。

### 6.4 MVP 與完整藍圖關係

本文件同時描述：

* **完整目標藍圖**
* **分階段 MVP 落地範圍**

因此文件中出現完整流程與完整功能，不代表第一版全部實作。

---

## 七、前端資訊架構原則

前端的 Sidebar Navigation，應以「任務導向的資訊架構」為核心原則。

設計原則：

* Sidebar = 工具箱
* Dashboard = 工作起點（最重要）
* 頁面詳情 = 完成任務的主操作區
* Timeline / Dashboard / Report = 聚合檢視
* 主導航不超過兩層，第三層盡量透過頁內 Tab 解決

---

## 八、Admin（最高權限帳號）完整 Sidebar

整體來說是這樣，這是 Admin（最高權限帳號）可以看到的畫面：

```text
Sidebar Navigation（B2B CRM 後台 - Admin）
│
├─ Dashboard
│   ├─ 總覽
│   ├─ 營收概況
│   ├─ 商機概況
│   ├─ 夥伴績效
│   └─ 風險預警
│
├─ 客戶管理
│   ├─ 客戶列表
│   ├─ 聯絡人
│   ├─ 客戶分級
│   ├─ 客戶歷程
│   └─ 客戶標籤
│
├─ 商機管理
│   ├─ 商機列表
│   ├─ Pipeline
│   ├─ Forecast
│   ├─ 報價管理
│   └─ 合約管理
│
├─ 夥伴管理
│   ├─ 夥伴列表
│   ├─ 合作條件
│   ├─ 通路績效
│   ├─ 分潤管理
│   └─ 夥伴入口
│
├─ 專案與活動
│   ├─ 專案列表
│   ├─ 任務追蹤
│   ├─ 里程碑
│   ├─ 行銷活動
│   └─ 文件中心
│
├─ 互動與支援
│   ├─ 會議紀錄
│   ├─ 拜訪紀錄
│   ├─ Email / 通話
│   ├─ 客訴 / Issue
│   └─ Timeline
│
├─ 財務與結算
│   ├─ 營收資料
│   ├─ 對帳管理
│   ├─ 分潤管理
│   ├─ 發票 / 收付款
│   └─ 匯率與幣別
│
├─ 報表中心
│   ├─ 客戶分析
│   ├─ 商機分析
│   ├─ 營收分析
│   ├─ 分潤分析
│   ├─ 夥伴績效
│   └─ 流失預警
│
└─ 設定
    ├─ 權限與角色
    ├─ 部門與使用者
    ├─ 流程自動化
    ├─ 系統整合
    ├─ API 管理
    ├─ Dashboard 設定
    └─ 參數設定
```

---

## 九、根據角色的任務導向區分 Sidebar + Dashboard

### 9.1 BD / Sales（業務）

```text
【角色：BD / Sales】

▶ Sidebar Navigation
│
├─ Dashboard（首頁）
├─ 客戶管理
│   ├─ 客戶列表
│   ├─ 聯絡人
│   ├─ 客戶歷程
│   └─ 客戶標籤
│
├─ 商機管理
│   ├─ 商機列表
│   ├─ Pipeline（主力）
│   ├─ Forecast
│   ├─ 報價管理
│   └─ 合約管理（查看為主，v2 起完整）
│
├─ 專案與活動
│   ├─ 專案列表（查看為主，v2 起完整）
│   ├─ 行銷活動
│   └─ 任務追蹤
│
├─ 互動紀錄
│   ├─ 會議紀錄
│   ├─ 拜訪紀錄
│   ├─ Email / 通話
│   └─ Timeline
│
├─ 報表（精簡）
│   ├─ 我的業績
│   ├─ 商機轉換率
│   └─ Pipeline 金額
│
└─ 設定（個人）
    └─ 通知設定
```

#### Dashboard（首頁內容）

```text
我的待辦
├─ 今日需跟進客戶
├─ 即將到期商機
├─ 待回覆報價
└─ 未完成任務

我的商機 Pipeline（視覺化）
├─ 潛在
├─ 接洽
├─ 提案
├─ 談判
└─ 成交 / 失敗

我的客戶動態
├─ 最近互動
├─ 新增客戶
└─ 近期待回訪客戶

業績概況
├─ 本月成交金額
├─ 本月商機金額
└─ 達成率
```

#### 核心任務

**快速跟進 + 推進商機 + 完成成交**

---

### 9.2 Finance（財務）

```text
【角色：Finance】

▶ Sidebar Navigation
│
├─ Dashboard
│
├─ 合約與帳務
│   ├─ 合約管理（主力）
│   ├─ 對帳管理
│   ├─ 發票 / 收款
│   ├─ 付款紀錄
│   └─ 幣別 / 匯率
│
├─ 分潤管理
│   ├─ 分潤設定
│   ├─ 分潤計算
│   ├─ 分潤明細
│   └─ 分潤紀錄
│
├─ 夥伴管理（查看）
│   ├─ 夥伴列表
│   ├─ 合作條件
│   └─ 結算資訊
│
├─ 報表中心（核心）
│   ├─ 營收報表
│   ├─ 分潤報表
│   ├─ 現金流
│   ├─ 對帳狀況
│   └─ 異常報表
│
└─ 設定
    ├─ 財務參數
    ├─ 權限（部分）
    └─ 匯入 / 同步設定
```

#### Dashboard（首頁內容）

```text
待處理事項
├─ 待對帳
├─ 待付款 / 收款
├─ 合約異常
└─ 分潤待確認

本月財務概況
├─ 總營收（Gross）
├─ 淨營收（Net）
├─ 應收 / 應付
└─ 分潤支出

分潤摘要
├─ 各夥伴分潤
├─ 逾期未付款
└─ 異常提醒

現金流趨勢
```

#### 核心任務

**金流正確 + 風險控管 + 結算管理**

---

### 9.3 Manager / Executive（主管 / 管理層）

```text
【角色：Manager / Executive】

▶ Sidebar Navigation
│
├─ Dashboard（核心）
│
├─ 報表中心（主力）
│   ├─ 營收分析
│   ├─ 客戶分析
│   ├─ 商機分析
│   ├─ 夥伴績效
│   ├─ 分潤分析
│   └─ 預測分析
│
├─ 客戶與夥伴（查看）
│   ├─ 客戶列表
│   ├─ 夥伴列表
│   └─ 客戶流失
│
├─ 商機總覽
│   ├─ Pipeline（全公司）
│   ├─ Forecast
│   └─ 成交分析
│
├─ 專案總覽
│   ├─ 進度與風險
│   └─ 關鍵專案
│
└─ 系統設定（部分）
    ├─ KPI 設定
    ├─ 流程設定
    └─ 權限查看
```

#### Dashboard（首頁內容）

```text
公司 KPI 總覽
├─ 總營收
├─ 成長率
├─ 商機轉換率
├─ 客戶數變化
└─ 流失率

營收分布
├─ 地區
├─ 遊戲
├─ 夥伴
└─ 合作模式

商機 Pipeline（全局）
├─ 各階段數量
├─ 各階段金額
└─ 成交預測

夥伴績效排名
├─ 營收排名
├─ 成長排名
└─ 異常夥伴

風險與預警
├─ 流失客戶
├─ 低績效夥伴
├─ 異常營收
└─ 延遲專案
```

#### 核心任務

**決策 + 預測 + 風險管理**

---

### 9.4 Admin（最高權限）

Admin 不等同於某單一業務角色，而是：

* 擁有完整模組可見權
* 可設定角色與權限
* 可管理整合、流程、自動化、系統參數
* 不一定是日常第一線操作人員

Admin 的 Dashboard 可以採混合總覽型首頁。

---

## 十、MVP 切分（修正與完整化）

### MVP 原則

本專案採三階段切分，避免一次開發過大，並確保第一版即可支撐 BD 日常工作。

### MVP v1：BD 核心流程版

**目標：支援「客戶 → 商機 → 互動 → Pipeline 推進」**

#### 功能範圍

* 客戶管理
* 聯絡人管理
* 商機管理
* Pipeline
* Forecast（基本版）
* 互動紀錄（會議 / 通話 / Email / 備註）
* 個人 Dashboard（BD）
* 權限基礎架構
* 通知提醒（基本）
* Timeline 聚合檢視（基於 Activity / Stage History）

#### 不含 / 僅預留

* Quote 完整版
* Contract 完整版
* Project 完整版
* Finance / Settlement
* Partner Portal

#### UI 原則

若第一版 Sidebar 中仍保留報價 / 合約入口，必須標示為：

* coming soon，或
* read only placeholder，或
* 不顯示於 v1

避免產生「畫面存在但功能未落地」的企劃矛盾。

---

### MVP v2：商務落地版

**目標：支援「報價 → 合約 → 專案啟動」**

#### 功能範圍

* Quote
* Quote Version / Quote Line
* Contract
* Contract Version
* Project
* Task / Milestone
* Document
* 合約到期提醒
* 專案進度與風險

---

### MVP v3：財務與夥伴版

**目標：支援「營收 → 對帳 → 分潤 → 夥伴查詢」**

#### 功能範圍

* RevenueRecord
* Settlement
* SettlementLine
* Invoice / Payment
* 多幣別 / 匯率
* Partner Portal
* ExternalAccount
* Finance Dashboard
* Manager Dashboard
* Automation 進階版
* AuditLog
* Integration Monitoring

---

## 十一、核心流程（Flow）

### 11.1 核心業務主流程（Revenue Flow）

```text
客戶（Account）
  ↓
商機（Opportunity）
  ↓
Pipeline 推進（接洽 / 提案 / 談判）
  ↓
報價（Quote）
  ↓
合約（Contract）
  ↓
專案（Project）
  ↓
營收（RevenueRecord）
  ↓
分潤（Settlement）
  ↓
報表（Analytics）
```

### 11.2 子流程

* 商機更新（階段變更）
* 商機失敗（Lost）
* 報價修改 / 版本更新
* 合約版本更新
* 專案延期
* 營收修正
* 對帳異常重跑
* 分潤重算

### 11.3 例外流程

* 商機取消
* 客戶流失（Churn）
* 合約終止
* 分潤爭議
* 資料匯入失敗
* 合約與 ERP 不一致
* 重複客戶合併（merge）

---

## 十二、角色操作流程（User Flow）

### 12.1 BD / 業務操作流程

```text
登入
  ↓
Dashboard（查看待辦）
  ↓
查看客戶 / 搜尋客戶
  ↓
（沒有）→ 建立客戶
  ↓
建立商機
  ↓
更新 Pipeline
  ↓
新增互動紀錄（會議 / Email / 通話 / 備註）
  ↓
建立報價（v2）
  ↓
推進至成交
  ↓
交付專案（v2）
```

#### BD 日常循環

* 查看待辦
* 跟進客戶
* 更新商機
* 新增互動紀錄
* 查看本週 Pipeline
* 查看達成率

#### BD 例外流程

* 客戶重複（merge）
* 商機失敗原因填寫
* 客戶轉交（assign）
* 逾期未跟進提醒

---

### 12.2 Finance 財務流程

```text
合約建立 / 生效
  ↓
確認條款（分潤 / 收款 / 幣別）
  ↓
營收資料匯入（遊戲系統）
  ↓
對帳
  ↓
分潤計算
  ↓
付款 / 收款
  ↓
產出報表
```

#### 財務支援流程

* 合約審核
* 發票管理
* 多幣別轉換
* 異常案件標記

#### 財務例外流程

* 對帳不一致
* 分潤計算錯誤
* 延遲付款
* 匯率資料缺失

---

### 12.3 管理層流程（Decision Flow）

```text
進入 Dashboard
  ↓
查看 KPI（營收 / 成長 / 流失 / 商機轉換）
  ↓
分析報表（客戶 / 商機 / 夥伴 / 分潤）
  ↓
發現問題（低轉換 / 流失 / 異常）
  ↓
制定策略（調整 KPI / 分配資源 / 重新分工）
```

#### 管理支援流程

* 設定 KPI
* 檢視團隊績效
* 追蹤重點專案
* 檢視高風險夥伴

---

### 12.4 系統支援流程

#### 權限流程

```text
建立角色
  ↓
設定權限（read / write / delete / approve / export）
  ↓
指派使用者
  ↓
設定資料範圍（self / department / all）
```

#### 自動化流程

```text
事件觸發（商機變更 / 合約到期 / 對帳異常）
  ↓
規則判斷
  ↓
執行動作（通知 / 指派 / 狀態更新）
  ↓
留下 Automation Log
```

#### 系統整合流程

```text
外部系統（遊戲 / ERP / 行銷 / 客服）
  ↓
資料同步（API / ETL / Manual Import）
  ↓
寫入 CRM
  ↓
更新報表 / Dashboard
```

#### 夥伴 Portal 流程

```text
夥伴登入
  ↓
查看報表
  ↓
下載資料
  ↓
查詢分潤 / 對帳
```

---

## 十三、跨模組流程（避免系統割裂）

```text
客戶頁
  → 查看聯絡人
  → 查看商機
  → 查看合約
  → 查看專案
  → 查看互動紀錄
  → 查看 Timeline

商機頁
  → 查看客戶
  → 查看互動紀錄
  → 建立報價
  → 轉成合約

合約頁
  → 查看報價來源
  → 啟動專案
  → 查看分潤條款
  → 查詢結算

專案頁
  → 查看關聯合約
  → 查看任務
  → 查看營收
  → 查看風險

夥伴頁
  → 查看合約
  → 查看績效
  → 查看結算
  → 進 Portal
```

---

## 十四、資料模型（完整資料模型總覽）

CRM 專案需要的資料模型，可以分成 7 組：主資料、商務流程、專案執行、財務分潤、互動紀錄、權限組織、系統支援。

### 14.1 一、資料模型總覽（Entity Map）

```text
B2B CRM 資料模型（節點科技情境）
│
├─ 1. 主資料（Master Data）
│   ├─ Account（客戶公司）
│   ├─ Contact（聯絡人）
│   ├─ Product / Game（遊戲 / 產品）
│   ├─ Region（地區 / 市場）
│   └─ Tag / Category（標籤 / 分類）
│
├─ 2. 商務流程資料（Business Data）
│   ├─ Opportunity（商機）
│   ├─ OpportunityStageHistory（商機階段歷程）
│   ├─ Quote（報價）
│   ├─ QuoteLine（報價明細）
│   ├─ Contract（合約）
│   └─ ContractVersion（合約版本）
│
├─ 3. 專案執行資料（Project Data）
│   ├─ Project（專案）
│   ├─ ProjectMilestone（里程碑）
│   ├─ Task（任務）
│   ├─ Campaign（活動 / 行銷活動）
│   └─ Document（文件）
│
├─ 4. 財務 / 分潤資料（Finance Data）
│   ├─ RevenueRecord（營收紀錄）
│   ├─ Settlement（分潤結算）
│   ├─ SettlementLine（分潤明細）
│   ├─ Invoice（發票）
│   ├─ Payment（收付款）
│   └─ CurrencyRate（匯率）
│
├─ 5. 互動 / 支援資料（Engagement Data）
│   ├─ Activity（互動紀錄）
│   ├─ Meeting（會議）
│   ├─ CallLog（通話）
│   ├─ EmailLog（Email）
│   ├─ Note（備註）
│   └─ Issue / Ticket（問題 / 客訴）
│
├─ 6. 組織 / 權限資料（Org & Permission）
│   ├─ User（使用者）
│   ├─ Department（部門）
│   ├─ Role（角色）
│   ├─ Permission（權限）
│   ├─ RolePermission（角色權限）
│   ├─ UserRole（使用者角色）
│   ├─ UserScope（資料範圍）
│   └─ ExternalAccount（外部夥伴帳號）
│
└─ 7. 系統支援資料（System Support）
    ├─ Notification（通知）
    ├─ WorkflowRule（流程規則）
    ├─ AutomationLog（自動化紀錄）
    ├─ IntegrationConnection（外部系統連線）
    ├─ AuditLog（稽核紀錄）
    └─ DashboardConfig（儀表板設定）
```

---

## 十五、核心資料模型明細

### 15.1 Account（客戶公司）

```text
Account
├─ id
├─ account_code
├─ company_name
├─ company_type（partner / distributor / channel / enterprise / other）
├─ industry
├─ region_id
├─ address
├─ website
├─ status（active / inactive / churned）
├─ tier（strategic / normal / potential）
├─ lifecycle_stage（lead / deal / retention / churn）
├─ owner_user_id
├─ description
├─ created_at
└─ updated_at
```

#### 關聯

```text
Account
├─ 1 → N Contact
├─ 1 → N Opportunity
├─ 1 → N Contract
├─ 1 → N Project
├─ 1 → N Activity
└─ N → N Tag
```

---

### 15.2 Contact（聯絡人）

```text
Contact
├─ id
├─ account_id
├─ name
├─ title
├─ department
├─ email
├─ phone
├─ mobile
├─ role_type（decision_maker / purchaser / technical / marketing / finance / executor）
├─ is_primary
├─ status
├─ owner_user_id
├─ notes
├─ created_at
└─ updated_at
```

---

### 15.3 Product / Game（遊戲 / 產品）

```text
Product / Game
├─ id
├─ product_code
├─ name
├─ genre
├─ platform（PC / Mobile / Web / Console）
├─ region_scope
├─ release_status
├─ launch_date
├─ operation_status
├─ owner_team
├─ description
├─ created_at
└─ updated_at
```

---

### 15.4 Region（地區 / 市場）

```text
Region
├─ id
├─ code
├─ name
├─ currency_code
├─ timezone
└─ status
```

---

### 15.5 Tag / Category（標籤 / 分類）

```text
Tag
├─ id
├─ name
├─ type（account / opportunity / project）
└─ color
```

---

### 15.6 Opportunity（商機）

```text
Opportunity
├─ id
├─ opportunity_code
├─ account_id
├─ primary_contact_id
├─ product_id
├─ region_id
├─ name
├─ opportunity_type（agency / license / co_branding / channel）
├─ stage（potential / contacted / proposal / negotiation / won / lost）
├─ probability
├─ expected_revenue
├─ expected_close_date
├─ source
├─ owner_user_id
├─ status
├─ lost_reason
├─ description
├─ created_at
└─ updated_at
```

---

### 15.7 OpportunityStageHistory（商機階段歷程）

```text
OpportunityStageHistory
├─ id
├─ opportunity_id
├─ from_stage
├─ to_stage
├─ changed_by_user_id
├─ changed_at
└─ note
```

---

### 15.8 Quote（報價）

```text
Quote
├─ id
├─ quote_code
├─ opportunity_id
├─ account_id
├─ version
├─ quote_date
├─ valid_until
├─ total_amount
├─ currency_code
├─ pricing_model（fixed / revenue_share / hybrid）
├─ status（draft / submitted / accepted / rejected / expired）
├─ prepared_by_user_id
├─ description
├─ created_at
└─ updated_at
```

---

### 15.9 QuoteLine（報價明細）

```text
QuoteLine
├─ id
├─ quote_id
├─ item_name
├─ quantity
├─ unit_price
├─ subtotal
└─ remark
```

---

### 15.10 Contract（合約）

```text
Contract
├─ id
├─ contract_code
├─ account_id
├─ opportunity_id
├─ product_id
├─ contract_type（license / settlement / co_branding / channel）
├─ start_date
├─ end_date
├─ currency_code
├─ total_value
├─ settlement_cycle
├─ revenue_share_rule
├─ status（draft / reviewing / active / expired / terminated）
├─ signed_date
├─ owner_user_id
├─ created_at
└─ updated_at
```

---

### 15.11 ContractVersion（合約版本）

```text
ContractVersion
├─ id
├─ contract_id
├─ version_no
├─ file_document_id
├─ change_summary
├─ effective_date
├─ created_by_user_id
└─ created_at
```

---

### 15.12 Project（專案）

```text
Project
├─ id
├─ project_code
├─ contract_id
├─ account_id
├─ product_id
├─ name
├─ project_type（launch / publishing / co_branding / marketing）
├─ start_date
├─ end_date
├─ status（planning / running / delayed / completed / cancelled）
├─ project_manager_user_id
├─ description
├─ created_at
└─ updated_at
```

---

### 15.13 ProjectMilestone（里程碑）

```text
ProjectMilestone
├─ id
├─ project_id
├─ name
├─ due_date
├─ status（pending / in_progress / done / delayed）
├─ owner_user_id
└─ description
```

---

### 15.14 Task（任務）

```text
Task
├─ id
├─ project_id
├─ related_entity_type
├─ related_entity_id
├─ title
├─ task_type（BD / marketing / tech / finance）
├─ assignee_user_id
├─ due_date
├─ priority
├─ status（todo / doing / done / cancelled）
├─ description
├─ created_at
└─ updated_at
```

---

### 15.15 Campaign（活動 / 行銷活動）

```text
Campaign
├─ id
├─ project_id
├─ name
├─ campaign_type（joint_marketing / advertising / launch_event）
├─ start_date
├─ end_date
├─ budget
├─ status
├─ owner_user_id
└─ description
```

---

### 15.16 Document（文件）

```text
Document
├─ id
├─ related_entity_type
├─ related_entity_id
├─ name
├─ file_url / file_path
├─ document_type（proposal / contract / asset / report）
├─ version
├─ uploaded_by_user_id
├─ uploaded_at
└─ access_level
```

---

### 15.17 RevenueRecord（營收紀錄）

```text
RevenueRecord
├─ id
├─ product_id
├─ project_id
├─ contract_id
├─ account_id
├─ region_id
├─ period_start
├─ period_end
├─ gross_revenue
├─ net_revenue
├─ currency_code
├─ source_system
├─ imported_at
└─ status（draft / confirmed / adjusted）
```

---

### 15.18 Settlement（分潤結算）

```text
Settlement
├─ id
├─ settlement_code
├─ contract_id
├─ account_id
├─ settlement_period_start
├─ settlement_period_end
├─ total_revenue
├─ total_share_amount
├─ currency_code
├─ status（draft / reviewing / confirmed / paid）
├─ generated_at
├─ confirmed_at
└─ note
```

---

### 15.19 SettlementLine（分潤明細）

```text
SettlementLine
├─ id
├─ settlement_id
├─ revenue_record_id
├─ calculation_basis
├─ share_rate
├─ amount
└─ remark
```

---

### 15.20 Invoice（發票）

```text
Invoice
├─ id
├─ settlement_id
├─ invoice_no
├─ invoice_type
├─ invoice_date
├─ due_date
├─ amount
├─ currency_code
├─ status（draft / issued / paid / overdue / cancelled）
└─ note
```

---

### 15.21 Payment（收付款）

```text
Payment
├─ id
├─ invoice_id
├─ payment_type（receivable / payable）
├─ amount
├─ currency_code
├─ payment_date
├─ payment_method
├─ status
├─ reference_no
└─ note
```

---

### 15.22 CurrencyRate（匯率）

```text
CurrencyRate
├─ id
├─ from_currency
├─ to_currency
├─ rate
├─ effective_date
└─ source
```

---

### 15.23 Activity（互動紀錄，父模型）

```text
Activity
├─ id
├─ related_entity_type（account / contact / opportunity / project）
├─ related_entity_id
├─ activity_type（meeting / call / email / note / visit / task）
├─ subject
├─ owner_user_id
├─ participant_contact_id
├─ scheduled_at
├─ completed_at
├─ status（planned / done / cancelled）
├─ summary
├─ created_at
└─ updated_at
```

---

### 15.24 Meeting（會議）

```text
Meeting
├─ id
├─ activity_id
├─ meeting_mode（online / offline）
├─ location
├─ minutes
├─ next_action
└─ next_action_due_date
```

---

### 15.25 CallLog（通話）

```text
CallLog
├─ id
├─ activity_id
├─ duration
├─ result
└─ follow_up_required
```

---

### 15.26 EmailLog（Email）

```text
EmailLog
├─ id
├─ activity_id
├─ subject
├─ sender
├─ recipients
├─ sent_at
└─ thread_ref
```

---

### 15.27 Note（備註）

```text
Note
├─ id
├─ activity_id
├─ content
├─ visibility（private / team / public）
└─ created_at
```

---

### 15.28 Issue / Ticket（問題 / 客訴）

```text
Issue / Ticket
├─ id
├─ account_id
├─ contact_id
├─ project_id
├─ title
├─ issue_type（complaint / system / business）
├─ priority
├─ status（open / processing / resolved / closed）
├─ assigned_user_id
├─ description
├─ opened_at
└─ closed_at
```

---

### 15.29 User（使用者）

```text
User
├─ id
├─ employee_no
├─ name
├─ email
├─ department_id
├─ title
├─ status
├─ timezone
├─ locale
├─ created_at
└─ updated_at
```

---

### 15.30 Department（部門）

```text
Department
├─ id
├─ name
├─ parent_department_id
└─ status
```

---

### 15.31 Role（角色）

```text
Role
├─ id
├─ name（Admin / BD / Finance / Manager）
├─ description
└─ status
```

---

### 15.32 Permission（權限）

```text
Permission
├─ id
├─ module_name
├─ action_name（read / write / delete / approve / export）
└─ description
```

---

### 15.33 RolePermission（角色權限對應）

```text
RolePermission
├─ id
├─ role_id
├─ permission_id
└─ allowed
```

---

### 15.34 UserRole（使用者角色對應）

```text
UserRole
├─ id
├─ user_id
├─ role_id
└─ assigned_at
```

---

### 15.35 UserScope（資料範圍）

```text
UserScope
├─ id
├─ user_id
├─ scope_type（self / department / all / assigned_accounts）
├─ scope_value
└─ created_at
```

---

### 15.36 ExternalAccount（外部夥伴帳號）

```text
ExternalAccount
├─ id
├─ account_id
├─ login_email
├─ display_name
├─ status
├─ last_login_at
├─ portal_role
└─ created_at
```

---

### 15.37 Notification（通知）

```text
Notification
├─ id
├─ user_id
├─ type（task / contract / settlement / alert）
├─ title
├─ message
├─ is_read
├─ related_entity_type
├─ related_entity_id
├─ created_at
└─ read_at
```

---

### 15.38 WorkflowRule（流程規則）

```text
WorkflowRule
├─ id
├─ name
├─ trigger_event
├─ condition_json
├─ action_json
├─ status
├─ created_by_user_id
└─ created_at
```

---

### 15.39 AutomationLog（自動化紀錄）

```text
AutomationLog
├─ id
├─ workflow_rule_id
├─ trigger_time
├─ result_status
├─ related_entity_type
├─ related_entity_id
└─ log_message
```

---

### 15.40 IntegrationConnection（外部系統連線）

```text
IntegrationConnection
├─ id
├─ system_name（ERP / GameData / Marketing / Support）
├─ connection_type（API / ETL / Manual Import）
├─ status
├─ last_sync_at
├─ config_json
└─ created_at
```

---

### 15.41 AuditLog（稽核紀錄）

```text
AuditLog
├─ id
├─ user_id
├─ entity_type
├─ entity_id
├─ action（create / update / delete / approve / export）
├─ before_json
├─ after_json
├─ created_at
└─ ip_address
```

---

### 15.42 DashboardConfig（儀表板設定）

```text
DashboardConfig
├─ id
├─ user_id / role_id
├─ dashboard_type
├─ layout_json
├─ filter_json
└─ updated_at
```

---

## 十六、核心關聯總圖

```text
Account
├─ 1 → N Contact
├─ 1 → N Opportunity
├─ 1 → N Contract
├─ 1 → N Project
└─ 1 → N Activity

Opportunity
├─ N → 1 Account
├─ N → 1 Contact
├─ N → 1 Product/Game
├─ 1 → N OpportunityStageHistory
├─ 1 → N Quote
└─ 0..1 → 1 Contract

Quote
├─ N → 1 Opportunity
└─ 1 → N QuoteLine

Contract
├─ N → 1 Account
├─ N → 1 Opportunity
├─ 1 → N ContractVersion
├─ 1 → N Project
└─ 1 → N Settlement

Project
├─ N → 1 Contract
├─ 1 → N Task
├─ 1 → N ProjectMilestone
├─ 1 → N Campaign
└─ 1 → N Document

RevenueRecord
├─ N → 1 Contract
├─ N → 1 Account
├─ N → 1 Product/Game
└─ N → 1 Project

Settlement
├─ N → 1 Contract
├─ N → 1 Account
├─ 1 → N SettlementLine
├─ 1 → N Invoice
└─ 1 → N Payment
```

---

## 十七、頁面結構（UI Sitemap / Page Map）

### 17.1 客戶管理

```text
客戶管理
├─ 客戶列表頁
│   ├─ 搜尋
│   ├─ 篩選（類型 / 地區 / tier / lifecycle / owner）
│   ├─ 排序
│   ├─ 批次操作
│   └─ 匯出
│
└─ 客戶詳情頁
    ├─ 基本資料
    ├─ 聯絡人
    ├─ 商機
    ├─ 合約
    ├─ 專案
    ├─ 互動紀錄
    ├─ 文件
    └─ Timeline
```

### 17.2 商機管理

```text
商機管理
├─ 商機列表頁
│   ├─ 搜尋
│   ├─ 篩選（stage / owner / expected_close_date / product）
│   ├─ Pipeline View
│   └─ List View
│
└─ 商機詳情頁
    ├─ 基本資料
    ├─ 階段與歷程
    ├─ 互動紀錄
    ├─ 報價
    ├─ Forecast
    └─ Timeline
```

### 17.3 報價管理

```text
報價管理
├─ 報價列表頁
└─ 報價詳情頁
    ├─ 基本資料
    ├─ 報價明細
    ├─ 版本
    ├─ 狀態
    └─ 關聯商機
```

### 17.4 合約管理

```text
合約管理
├─ 合約列表頁
└─ 合約詳情頁
    ├─ 基本條款
    ├─ 版本
    ├─ 分潤條款
    ├─ 關聯商機
    ├─ 關聯專案
    ├─ 文件
    └─ Timeline
```

### 17.5 專案管理

```text
專案管理
├─ 專案列表頁
└─ 專案詳情頁
    ├─ 基本資料
    ├─ Milestone
    ├─ 任務
    ├─ 行銷活動
    ├─ 文件
    ├─ 風險
    └─ Timeline
```

### 17.6 財務 / 分潤

```text
財務與結算
├─ Revenue 列表頁
├─ Settlement 列表頁
├─ Invoice / Payment 列表頁
└─ 詳情頁
    ├─ 基本資料
    ├─ 明細
    ├─ 狀態
    ├─ 異常
    └─ 關聯資料
```

---

## 十八、狀態機（State Machine）

### 18.1 Opportunity 狀態流轉

```text
potential → contacted → proposal → negotiation → won
potential → contacted → proposal → negotiation → lost
任何未成交階段 → lost
```

#### 規則

* 轉為 `lost` 時，`lost_reason` 必填
* 轉為 `won` 時，需有最終方案或成交摘要

### 18.2 Quote 狀態流轉

```text
draft → submitted → accepted
draft → submitted → rejected
submitted → expired
```

#### 規則

* `submitted` 需有 valid_until
* `accepted` 後不可任意覆寫，需建立新版

### 18.3 Contract 狀態流轉

```text
draft → reviewing → active
active → expired
active → terminated
```

#### 規則

* 轉為 `active` 時需有 signed_date
* `terminated` 需記錄原因與日期

### 18.4 Project 狀態流轉

```text
planning → running → completed
planning → running → delayed
delayed → running
任何未完成狀態 → cancelled
```

### 18.5 Settlement 狀態流轉

```text
draft → reviewing → confirmed → paid
reviewing → draft
confirmed → paid
```

#### 規則

* `confirmed` 後不可直接改明細，需建立調整流程
* `paid` 需有關聯付款資訊或付款狀態標記

---

## 十九、欄位層級商業規則（補齊缺口）

### 19.1 Account

* company_name 必填
* company_type 必填
* owner_user_id 必填
* lifecycle_stage 預設為 lead

### 19.2 Opportunity

* account_id 必填
* name 必填
* stage 必填
* owner_user_id 必填
* expected_close_date 建議必填
* stage = lost 時 lost_reason 必填

### 19.3 Quote

* opportunity_id 必填
* version 必填
* total_amount 必填
* valid_until 必填（submitted 前）
* pricing_model 必填

### 19.4 Contract

* account_id 必填
* contract_type 必填
* start_date / end_date 必填
* status = active 時 signed_date 必填

### 19.5 Project

* contract_id 建議必填
* project_manager_user_id 必填
* status = delayed 時須填寫延遲原因

### 19.6 RevenueRecord

* period_start / period_end 必填
* gross_revenue / net_revenue 必填
* source_system 必填

### 19.7 Settlement

* contract_id 必填
* settlement_period_start / end 必填
* total_share_amount 必填
* confirmed 後需留 AuditLog

---

## 二十、權限模型（完整）

### 20.1 角色

* Admin
* BD
* Finance
* Manager

### 20.2 權限動作

* read
* create
* update
* delete
* approve
* export

### 20.3 資料範圍

* self
* department
* all
* assigned_accounts

### 20.4 權限矩陣（簡版）

| 模組            | BD                                    | Finance                    | Manager            | Admin |
| ------------- | ------------------------------------- | -------------------------- | ------------------ | ----- |
| Account       | create/read/update(self/assigned)     | read                       | read(all)          | all   |
| Contact       | create/read/update(self/assigned)     | read                       | read(all)          | all   |
| Opportunity   | create/read/update(self/assigned)     | read                       | read(all)          | all   |
| Quote         | create/read/update(self/assigned, v2) | read                       | read               | all   |
| Contract      | read(v2)                              | create/read/update/approve | read               | all   |
| Project       | read/update assigned(v2)              | read                       | read(all)          | all   |
| RevenueRecord | read                                  | read/update/import         | read(all)          | all   |
| Settlement    | none/read                             | create/read/update/approve | read               | all   |
| Report        | personal                              | finance reports            | management reports | all   |
| User / Role   | none                                  | none / partial             | read               | all   |
| Export        | limited                               | finance scoped             | management scoped  | all   |

### 20.5 額外規則

* delete 預設不開放給一般角色，採 soft delete 或停用
* approve 僅開放必要角色
* export 屬敏感操作，需額外權限
* financial data 預設不對 BD 開放編輯

---

## 二十一、Dashboard 指標口徑定義

### 21.1 BD Dashboard

* 本月成交金額：本月 `won` 商機或已簽約金額
* Pipeline 金額：所有未成交商機 expected_revenue 加總
* 商機轉換率：`won / 全部商機`
* 待跟進數：逾期或即將到期之 Next Action / Task

### 21.2 Finance Dashboard

* 總營收：RevenueRecord.gross_revenue 加總
* 淨營收：RevenueRecord.net_revenue 加總
* 分潤支出：Settlement.total_share_amount 已確認或已付款加總
* 應收 / 應付：依 Payment / Invoice 狀態計算

### 21.3 Manager Dashboard

* 成長率：本期營收 vs 上期營收
* 客戶數變化：期間內 active 客戶增減
* 流失率：active 轉 churn 的比例
* 夥伴績效：依營收 / 成長 / 專案交付等組合指標

---

## 二十二、系統整合規劃

### 22.1 ERP / 財務系統

整合內容：

* 發票資訊
* 收付款狀態
* 正式對帳結果

主責：

* ERP 為正式帳務來源
* CRM 用於營運檢視與流程串接

### 22.2 遊戲數據系統

整合內容：

* DAU
* 營收
* 下載數
* 產品 / 地區表現

主責：

* 遊戲數據系統為原始來源
* CRM 存放聚合後營運使用資料

### 22.3 行銷工具

整合內容：

* Campaign 成效摘要
* 素材 / 活動基本資料

### 22.4 客服系統

整合內容：

* Issue / Ticket 狀態摘要
* 高優先客訴案件

### 22.5 API / ETL / Manual Import

整合方式：

* API 即時或定時同步
* ETL 批次匯入
* 手動匯入作為備援機制

### 22.6 Integration Error Handling

需有：

* last_sync_at
* sync_status
* error_message
* retry 機制
* 異常通知

---

## 二十三、非功能需求

### 23.1 安全性

* 角色權限控制
* 資料範圍隔離
* 稽核紀錄（AuditLog）
* 匯出權限管控
* 敏感欄位限制

### 23.2 效能

* 列表頁需支援大量資料分頁
* 搜尋與篩選需具可接受效能
* Dashboard 應採快取或預聚合策略

### 23.3 可維運性

* 欄位可擴充
* 模組可擴充
* 流程規則可配置
* 整合狀態可監控

### 23.4 國際化

* 多幣別
* 多時區
* 可能的多語系顯示

### 23.5 檔案與文件

* 文件版本管理
* 權限控制
* 合約與素材可分級存取

---

## 二十四、例外與異常處理規格

### 24.1 客戶重複合併（Merge）

* 允許管理者或指定角色操作
* 合併後保留原始資料映射
* 既有商機 / 合約 / 活動需重新指向主 Account
* 需留 AuditLog

### 24.2 客戶轉交（Assign）

* 原 owner 與新 owner 留紀錄
* 歷程保留
* 通知雙方

### 24.3 商機失敗

* lost_reason 必填
* 可關聯競爭對手或失敗原因分類
* 可納入分析報表

### 24.4 對帳異常

* 標記為異常案件
* 暫停 Settlement 確認
* 指派處理人
* 留處理紀錄

### 24.5 分潤爭議

* 建立 Issue
* 凍結付款狀態
* 記錄爭議原因與回覆結果

### 24.6 合約終止

* 需記錄終止原因、終止日、是否影響專案 / 分潤
* 關聯專案需標記風險或關閉

---

## 二十五、成功指標（KPI）

本系統上線後，可用以下指標評估成效：

* BD 使用率（日活 / 週活）
* 客戶資料完整度
* 商機更新率
* 商機轉換率提升
* 商機遺漏 / 未跟進比例下降
* 合約處理時間縮短
* 對帳處理時間縮短
* 分潤準確率提升
* 管理層報表產出效率提升

---

## 二十六、MVP 版本所需資料模型

### MVP v1 必要資料模型

```text
Account
Contact
Opportunity
OpportunityStageHistory
Activity
Meeting
CallLog
EmailLog
Note
User
Department
Role
Permission
RolePermission
UserRole
UserScope
Notification
DashboardConfig（可選）
Tag
Region
Product/Game（若商機需要掛產品）
```

### MVP v2 再加入

```text
Quote
QuoteLine
Contract
ContractVersion
Project
ProjectMilestone
Task
Document
Campaign
WorkflowRule（基礎）
AutomationLog（基礎）
```

### MVP v3 再加入

```text
RevenueRecord
Settlement
SettlementLine
Invoice
Payment
CurrencyRate
ExternalAccount
IntegrationConnection
AuditLog
```

---

## 二十七、目前前端已落地的 Multi-tenant + RBAC 登入機制

以下內容為目前前端原型已經落地的 mock 規則，用於支撐登入頁、租戶切換、角色導向首頁與 Sidebar 可見性控制。

### 27.1 登入流程（目前實作）

```text
Step 1. 使用者先選擇企業租戶
  ↓
Step 2. 進入該企業租戶登入頁
  ↓
Step 3. 輸入帳號 / Email + 密碼
  ↓
Step 4. 驗證帳號是否存在於該租戶下
  ↓
Step 5. 驗證成功後建立 session
  ↓
Step 6. 依 primary role 導向預設 Dashboard
  ↓
Step 7. 依完整角色聯集決定 Sidebar 與可用功能
```

### 27.2 帳號、企業、角色關係

目前採用以下資料關係：

* 一個帳號可屬於多個企業租戶
* 同一帳號在不同企業租戶下可有不同角色
* 同一帳號在同一企業租戶下可被指派多個角色
* 系統不要求使用者登入後手動選角色
* 系統以 `primary role` 決定預設首頁與資訊優先順序
* 系統以該租戶下所有角色的權限聯集決定實際可見頁面與可操作功能

### 27.3 目前 mock 企業租戶

| 代號 | 企業名稱 | 簡稱 |
| --- | --- | --- |
| `GMN-TW` | 節點科技公司 | 節點科技 |
| `BFN-SEA` | beanfun! 東南亞商務中心 | beanfun! SEA |
| `NXG-JP` | Next G Studio 日本合作事業部 | Next G JP |

### 27.4 目前 mock 角色模型

目前前端 mock 角色如下：

* `admin`
  * 預設首頁：`dashboard-overview`
  * 可見模組：全部
* `bd_sales`
  * 預設首頁：`dashboard-overview`
  * 可見模組：Dashboard、客戶管理、商機管理、專案與活動、互動與支援、報表中心
* `finance`
  * 預設首頁：`dashboard-revenue-overview`
  * 可見模組：Dashboard、夥伴管理、財務與結算、報表中心、設定
* `manager_executive`
  * 預設首頁：`dashboard-overview`
  * 可見模組：Dashboard、客戶管理、商機管理、夥伴管理、專案與活動、報表中心

### 27.5 目前 mock 員工帳號

#### `chris.chen`

* Email：`chris.chen@gamania.test`
* 密碼：`Password123!`
* 租戶關係：
  * `GMN-TW`
    * primary role：`admin`
    * roles：`admin`, `manager_executive`
  * `BFN-SEA`
    * primary role：`manager_executive`
    * roles：`manager_executive`

#### `mia.lin`

* Email：`mia.lin@gamania.test`
* 密碼：`Password123!`
* 租戶關係：
  * `GMN-TW`
    * primary role：`bd_sales`
    * roles：`bd_sales`
  * `NXG-JP`
    * primary role：`bd_sales`
    * roles：`bd_sales`, `manager_executive`

#### `eric.wu`

* Email：`eric.wu@gamania.test`
* 密碼：`Password123!`
* 租戶關係：
  * `GMN-TW`
    * primary role：`finance`
    * roles：`finance`
  * `BFN-SEA`
    * primary role：`finance`
    * roles：`finance`, `manager_executive`

### 27.6 Session 內容（目前前端 mock）

登入成功後，前端 session 目前包含：

* `employeeId`
* `account`
* `email`
* `displayName`
* `tenantCode`
* `tenantName`
* `primaryRoleId`
* `primaryRoleLabel`
* `roleIds`
* `defaultDashboardRouteName`
* `visibleSections`
* `permissions`

### 27.7 目前前端權限控制規則

目前前端原型已實作以下規則：

* 未登入不得進入後台路由
* 已登入後進入 `/login` 會自動導回該使用者預設首頁
* 若使用者無權限進入某個 section，會被導回其預設首頁
* Sidebar 會依 `visibleSections` 自動過濾
* Header 顯示目前登入者與其 `primary role`
* 個人中心頁可顯示目前租戶、角色與帳號資訊

### 27.8 目前 mock data 位置

目前靜態資料與驗證 helper 放在：

* `src/data/auth.js`

其責任包含：

* mock 企業租戶資料
* mock 員工帳號資料
* mock 角色定義
* 租戶 membership 查詢
* 權限聯集計算
* mock 登入驗證

---
