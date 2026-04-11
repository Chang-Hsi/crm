## 一、頁面目標

營收概況頁需完成以下目的：

1. 快速掌握本期營收表現
2. 比較本期與上期差異
3. 了解營收的主要來源與組成
4. 觀察營收與商機、成交、待認列之間的關係
5. 讓使用者可由圖表快速下鑽到明細或對應模組

本頁不是首頁總覽，不以文字導引為主，而是以 **圖表分析 + 關鍵數值 + 明細入口** 為主。

---

## 二、頁面定位

本頁應是 **Dashboard 之下的獨立分析頁**，不是簡化版首頁摘要。

因此本頁與「總覽」的差異如下：

* **總覽**：摘要、提醒、導流
* **營收概況**：分析、比較、拆解、監控

本頁應降低長段說明文字，改以：

* KPI 數字
* 趨勢圖
* 組成圖
* 排名圖
* 風險圖
* 短列表 / 明細入口

作為主要內容。

---

## 三、視覺風格方向

本頁採用你提供圖片那種 **多圖表卡片式 dashboard** 風格，版型重點如下：

* 白底卡片
* 多區塊圖表拼接
* 主圖區明確
* 上下層次分明
* 一頁內有多種 chart widgets
* 清楚的時間維度切換
* 每張卡片都能獨立閱讀

整體風格應偏：

* 乾淨
* 緊湊
* 圖表為主
* 少量說明
* dashboard 感強

不應再延續首頁那種大量段落文字與清單卡的呈現方式。

---

## 四、頁面結構

整頁建議分成 5 個區塊：

1. 頁首控制區
2. KPI 摘要區
3. 主趨勢分析區
4. 營收拆解區
5. 風險與明細導流區

---

## 五、頁首控制區

### 內容

* 頁面標題：`營收概況`
* 副標：`追蹤本期營收表現、來源結構與風險訊號`
* 時間切換：

  * 本週
  * 本月
  * 本季
  * 本年
* 範圍切換：

  * 我的
  * 部門
  * 全部
* 維度切換：

  * 依地區
  * 依產品
  * 依業務
* 右側操作：

  * 重新整理
  * 匯出
  * 前往報表中心

### 設計原則

頁首控制區應簡潔固定，不放過多表單。主要作用是切換分析視角。

---

## 六、第一區：KPI 摘要區

本區為頁面最上方的摘要列，建議顯示 **6 張 KPI 卡片**。

### KPI 項目

1. Gross Revenue
2. Net Revenue
3. 營收成長率
4. 待認列 / 調整金額
5. 本期成交金額
6. Forecast Revenue

### 每張卡片內容

* 指標名稱
* 主數值
* 與上期比較 %
* 小型趨勢圖
* 簡短輔助文字

### 視覺形式

每張卡片都應搭配小型圖形：

* sparkline
* mini bar
* mini area chart

### 設計原則

此區要像 dashboard widget，不應只是文字數字卡。

---

## 七、第二區：主趨勢分析區

本區為整頁主視覺，建議採 **左大右小** 版型。

### 左側：營收趨勢主圖

此圖為整頁核心圖表。

#### 建議圖表

* 柱狀 + 折線混合圖

#### 圖表內容

* 柱狀：Gross Revenue
* 折線：Net Revenue
* 淡色比較線：Previous Period
* 可切換週 / 月 / 季顯示

#### 主要用途

* 看本期營收走勢
* 看 gross 與 net 差距
* 看本期相較上期的變化

### 右側：營收健康度卡

右側可拆成上下兩塊：

#### 上：認列健康度

顯示：

* Net / Gross 比率
* Outstanding / 待認列比例
* 調整占比

建議圖表：

* donut chart

#### 下：營收組成摘要

顯示：

* Top region
* Top product
* Top owner
* 本期最大單筆收入

建議形式：

* 小型統計卡 + mini bar / donut

---

## 八、第三區：營收拆解區

本區為多卡片分析區，建議使用 **三欄布局**。

### 模組 1：依地區營收分布

#### 圖表形式

* horizontal bar chart
  或
* donut chart

#### 顯示內容

* 各地區營收金額
* 各地區占比
* Top 5 region

#### 用途

快速看主要收入來源地區。

---

### 模組 2：依產品 / 方案營收分布

#### 圖表形式

* donut chart
  或
* treemap
  或
* sorted bar chart

#### 顯示內容

* 各產品營收金額
* 各產品占比
* Top products

#### 用途

辨識主要營收來自哪種合作方案或產品線。

---

### 模組 3：依業務 / 部門貢獻

#### 圖表形式

* stacked bar chart
  或
* horizontal ranking bar chart

#### 顯示內容

* 各 owner 營收
* 各部門貢獻
* 可切換 owner / department 視角

#### 用途

看營收貢獻來源與內部分布。

---

## 九、第四區：營收與商機關聯區

本區用來把 CRM 的前端商機流程與後端營收結果接起來，這是本頁與一般 BI dashboard 最大差異之一。

### 模組 1：Pipeline → Revenue 關聯圖

#### 建議圖表

* funnel chart
  或
* bridge / staged bar

#### 顯示內容

* 新增商機金額
* 提案中金額
* 高機率金額
* 本期成交金額
* 已認列營收

#### 用途

讓使用者理解：
商機不是只有成交，而是會逐步轉成營收。

---

### 模組 2：Forecast vs Won vs Net

#### 建議圖表

* grouped bar chart

#### 顯示內容

* Forecast Revenue
* Won Amount
* Net Revenue

#### 用途

比較預估、成交與最終認列的落差。

---

### 模組 3：待認列 / 調整監控

#### 建議圖表

* bar chart
  或
* mini waterfall

#### 顯示內容

* Outstanding 金額
* 調整金額
* 待確認數量
* 近期變化

#### 用途

讓財務、主管快速看到營收品質。

---

## 十、第五區：風險與明細導流區

本區保留 dashboard 的工作導向，不只做圖表，也要能導向處理。

### 模組 1：營收風險提醒

#### 顯示內容

* 高金額但尚未 close 的商機
* 即將 close 但未認列案件
* 待認列過久案件
* 對帳異常 / 調整異常
* 近期大幅下滑 region / owner

#### 呈現形式

* 左側：風險分類 bar / donut
* 右側：Top 5 alerts list

---

### 模組 2：Top Accounts by Revenue

#### 顯示內容

* 客戶名稱
* 本期營收
* 上期比較
* 所屬業務

#### 呈現形式

* ranking list
  或
* horizontal bar ranking

#### 用途

快速定位主要營收客戶。

---

### 模組 3：近期營收事件

#### 顯示內容

* 新增營收紀錄
* 認列更新
* 調整完成
* 成交轉營收
* 合約 / 專案關聯異動

#### 呈現形式

* event feed
* 短列表

#### 用途

維持 CRM 上下文，而不是只剩圖表。

---

## 十一、圖表配置建議

本頁應以圖表為主，建議圖表種類如下：

* KPI 卡：sparkline / mini bar
* 主趨勢：bar + line combo
* 占比：donut / pie
* 排名：horizontal bar
* 貢獻比較：stacked bar
* 轉換關係：funnel
* 風險監控：bar / donut
* 明細事件：feed / short list

圖表應避免全部同一種形式，需有層次差異。

---

## 十二、資料邏輯建議

本頁資料不需要獨立重建，可沿用目前既有的營收與商機資料，再額外整理成圖表用 series。

### 核心資料來源

* revenue records
* opportunity records
* owner / department
* region
* product
* current / previous period
* outstanding / delta

### 衍生資料建議

* revenueTrendSeries
* revenueRegionSeries
* revenueProductSeries
* revenueOwnerSeries
* revenueHealthSeries
* pipelineRevenueSeries
* forecastVsWonSeries
* revenueRiskSeries
* topAccountRevenueList
* revenueEventFeed

---

## 十三、資訊密度原則

本頁應明顯比總覽頁更高資訊密度，但仍需遵守以下原則：

1. 每張卡片只講一件事
2. 圖表為主，文字為輔
3. 數字摘要要短，不堆說明句
4. 明細列表只保留少量高價值內容
5. 每張卡片都應有明確用途
6. 避免把整頁做成一個大報表表格頁

---

## 十四、與其他頁面的關係

本頁為 **Dashboard 子頁中的營收分析頁**，與其他頁面分工如下：

* **總覽**：跨模組摘要與導流
* **營收概況**：營收專題分析
* **商機概況**：Pipeline / stage / close 分析
* **夥伴績效**：partner / channel 分析
* **風險預警**：異常與高風險案件監控

因此營收概況頁應專注於營收，不需要承擔全部 dashboard 角色。

---

## 十五、第一版 MVP 範圍

第一版建議先完成：

### 必做

* 頁首控制區
* 6 張 KPI 卡
* 營收趨勢主圖
* 地區營收分布
* 產品營收分布
* owner / department 貢獻圖
* Forecast vs Won vs Net 圖
* 待認列 / 調整監控
* Top Accounts 排名
* 近期營收事件
