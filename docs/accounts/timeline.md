# 客戶聯絡頁企劃

## 一、頁面定位

客戶聯絡頁不是單純的通訊錄，也不是聯絡人列表頁的重複頁。
它的定位應該是：

**以 Account 為中心的「互動 / 跟進管理頁」**

也就是說，這頁要解決的不是「這家公司有哪些人」，而是：

* 最近有沒有和這個客戶聯絡
* 是誰聯絡的
* 用什麼方式聯絡
* 談了什麼
* 下一步要做什麼
* 哪些客戶太久沒跟進
* 哪些聯絡事項逾期了

這和你企劃裡的 `Engagement` 模組是對齊的。企劃中已經明確把客戶互動紀錄定義為 Email、通話、會議 / 拜訪、備註、待辦 / 跟進事項、下次行動、Timeline。

---

## 二、這頁和其他頁面的差異

### 1. 與聯絡人頁的差異

* 聯絡人頁：看「人」
* 客戶聯絡頁：看「互動紀錄」

### 2. 與客戶詳情頁內互動紀錄 tab 的差異

* 客戶詳情頁：看單一客戶的互動
* 客戶聯絡頁：看全域客戶互動，跨客戶管理跟進

### 3. 與 Timeline 的差異

* Timeline：偏歷史事件聚合
* 客戶聯絡頁：偏工作與跟進管理

所以這頁本質上比較像：

```text id="yt9xmb"
Customer Engagement Workspace
```

而不是單純歷史列表。

---

## 三、頁面目標

這頁要達成的任務：

* 跨客戶檢視所有互動紀錄
* 快速找到需要跟進的客戶
* 依互動類型過濾（會議 / 通話 / Email / 備註）
* 依負責業務 / 客戶 / 日期範圍查看
* 補登互動紀錄
* 設定或查看下一步行動（Next Action）
* 找出逾期未跟進項目

---

## 四、頁面型態建議

第一版建議把這頁做成：

**列表管理頁 + 待跟進工作台**

也就是：

```text id="wtr2mr"
客戶聯絡頁
├─ 頂部摘要卡
├─ 快速篩選區
├─ 客戶聯絡紀錄列表
└─ 新增 / 查看 / 編輯互動 Drawer
```

---

## 五、路由與頁籤

### 路由

```text id="t8ghj2"
/accounts/engagement
```

### Header Tab

```text id="rxkx4o"
客戶聯絡
```

---

## 六、資料基礎

你企劃中的互動資料主體是 `Activity`，且目前 Account Detail 頁的 mock 也已有：

* `activities[]`
* `type`
* `title`
* `owner`
* `occurredAt`

但如果要做成全域客戶聯絡頁，建議和聯絡人頁一樣，**將 Activity 獨立出來作為資料源**，不要再只掛在 `accounts.js` 裡。

### 建議未來資料來源

```text id="qjf1dl"
activities.js
```

### 每筆 Activity 建議最少具備

```ts
type Activity = {
  id: string
  accountId: string
  contactId?: string
  type: 'meeting' | 'call' | 'email' | 'note' | 'visit'
  title: string
  summary?: string
  owner: string
  occurredAt: string
  nextAction?: string
  nextActionAt?: string
  status: 'done' | 'pending' | 'overdue'
}
```

第一版若還沒抽 `activities.js`，可以先從 account 資料 flatten，但建議不要長期這樣做。

---

## 七、頁面資訊架構

```text id="nl6c3t"
客戶聯絡頁
├─ Page Header
│   ├─ 標題：客戶聯絡
│   ├─ 說明文字
│   └─ 新增互動紀錄
│
├─ Summary Cards
│   ├─ 今日待跟進
│   ├─ 逾期未跟進
│   ├─ 本週互動數
│   └─ 最近 7 天聯絡客戶數
│
├─ 快速篩選區
│   ├─ 關鍵字搜尋
│   ├─ 互動類型
│   ├─ 客戶
│   ├─ 聯絡人
│   ├─ 負責業務
│   ├─ 狀態
│   ├─ 日期範圍
│   └─ 重設
│
├─ 列表 Table
│   ├─ 互動時間
│   ├─ 客戶
│   ├─ 聯絡人
│   ├─ 類型
│   ├─ 主題
│   ├─ 負責人
│   ├─ 下次行動
│   ├─ 下次行動時間
│   ├─ 狀態
│   └─ 操作
│
└─ Drawer / Dialog
    ├─ 查看互動
    ├─ 新增互動
    └─ 編輯互動
```

---

## 八、頂部摘要卡企劃

這頁建議有 4 張小卡，因為這頁不是純列表，而是偏工作台。

### 1. 今日待跟進

* 今天到期的 next action 數量

### 2. 逾期未跟進

* `status = overdue` 的數量

### 3. 本週互動數

* 最近 7 天 Activity 總數

### 4. 最近 7 天聯絡客戶數

* 近 7 天有互動的不同 account 數量

這些卡片不需要 EChart，數字即可。

---

## 九、搜尋 / 篩選區企劃

## 9.1 關鍵字搜尋

搜尋對象：

* 客戶名稱
* 聯絡人姓名
* 互動主題
* 摘要內容

placeholder：

```text id="7fe2vw"
搜尋客戶 / 聯絡人 / 互動主題
```

---

## 9.2 篩選條件

第一版建議至少有：

* 互動類型
* 客戶
* 聯絡人
* 負責業務
* 狀態
* 日期範圍

### 互動類型

```text id="h8cl9r"
全部
會議
通話
Email
拜訪
備註
```

### 狀態

```text id="40jtyj"
全部
已完成
待跟進
已逾期
```

---

## 十、列表欄位企劃

## 10.1 欄位清單

```text id="yk9t73"
互動時間
客戶
聯絡人
類型
主題
負責人
下次行動
下次行動時間
狀態
操作
```

---

## 10.2 欄位說明

### 互動時間

* 主排序依據
* 顯示 `occurredAt`

### 客戶

* 顯示 accountName
* 可點擊跳到 Account Detail

### 聯絡人

* 顯示 contactName
* 若無 contactId，可顯示 `-`

### 類型

* meeting / call / email / note / visit
* 用 Tag 顯示

### 主題

* 這筆互動的簡短主題
* 例如：`Q2 聯名活動 Kickoff`

### 負責人

* 此次互動由誰記錄 / 跟進

### 下次行動

* 文字摘要
* 沒有可顯示 `-`

### 下次行動時間

* 若為空表示沒有待跟進

### 狀態

* done / pending / overdue
* 用顏色區分

### 操作

* 查看
* 編輯
* 跳到客戶
* 標記完成（若有 next action）

---

## 十一、頁面核心亮點：Next Action

這頁最重要的不是互動歷史本身，而是 **下一步要做什麼**。

所以建議每筆 Activity 都能有：

* `nextAction`
* `nextActionAt`
* `status`

### 例子

```text id="xuukmz"
互動：Q2 聯名活動 Kickoff
下次行動：回覆合作條件調整版
下次行動時間：2026-04-05 15:00
狀態：待跟進
```

這樣這頁才真的像 CRM，而不是日誌表。

---

## 十二、查看互動 Drawer 企劃

### 呈現方式

* 右側 Drawer
* 點「查看」或主題打開

### 內容結構

```text id="gmcsd3"
互動詳情
├─ 類型
├─ 主題
├─ 客戶
├─ 聯絡人
├─ 負責人
├─ 發生時間
├─ 摘要
├─ 下次行動
├─ 下次行動時間
└─ 狀態
```

### 底部操作

* 關閉
* 編輯
* 跳到客戶
* 標記完成（若 status = pending / overdue）

---

## 十三、新增互動企劃

### 呈現方式

* Drawer
* 不開新頁

### 入口

* 客戶聯絡頁右上「新增互動紀錄」
* Account Detail → 互動紀錄 tab
* Account Detail → Overview 空狀態 CTA

### 表單欄位

```text id="8d90bc"
所屬客戶（必填）
聯絡人（可選）
互動類型（必填）
主題（必填）
發生時間（必填）
摘要
下次行動
下次行動時間
狀態
```

### 預設值

* 狀態預設 `done`
* 若有填 nextAction / nextActionAt，可預設 `pending`

---

## 十四、編輯互動企劃

### 呈現方式

* Drawer
* 與新增共用表單

### 可編輯欄位

* 聯絡人
* 類型
* 主題
* 發生時間
* 摘要
* 下次行動
* 下次行動時間
* 狀態

---

## 十五、這頁和 Timeline 的關係

### 客戶聯絡頁

* 面向工作
* 面向待跟進
* 可篩選 / 可補登 / 可編輯

### Timeline

* 面向歷史事件
* 面向上下文
* 偏閱讀，不偏操作

所以這頁不能直接拿 Timeline 取代。

---

## 十六、空狀態企劃

### 無互動資料

```text id="z84cg2"
尚無客戶聯絡紀錄
建立第一筆互動資料，開始追蹤客戶跟進狀態。
[新增互動紀錄]
```

### 無搜尋結果

```text id="tskt87"
找不到符合條件的互動紀錄
請調整搜尋條件或重設篩選。
[重設篩選]
```

### 無待跟進資料

```text id="nxm8d4"
目前沒有待跟進事項
可從客戶詳情頁或本頁新增互動紀錄並設定下次行動。
```

---

## 十七、第一版 MVP 範圍建議

### 必做

* 頂部摘要卡
* 搜尋 / 篩選
* 列表 Table
* 查看互動 Drawer
* 新增互動 Drawer
* 編輯互動 Drawer
* 點客戶名稱跳 Account Detail

### 可後補

* 批次標記完成
* 匯出
* 活動模板
* 與 Email / Calendar 真整合
* 自動逾期計算規則進階版

---

## 十八、可直接給 Codex 的頁面規格

```text id="ifn5ml"
請新增「客戶聯絡」頁面，路由為 /accounts/engagement。

頁面定位：
- 此頁為全域客戶互動紀錄與待跟進管理頁
- 不是聯絡人頁，也不是 Timeline 替代頁
- 主要用來跨客戶管理 meeting / call / email / note / visit 與 next action

資料來源：
- 建議使用獨立 activities.js
- 每筆 activity 至少包含：
  - id
  - accountId
  - contactId
  - type
  - title
  - owner
  - occurredAt
  - summary
  - nextAction
  - nextActionAt
  - status

頁面內容：
1. Header：
   - 標題：客戶聯絡
   - 說明文字
   - 新增互動紀錄按鈕

2. Summary Cards：
   - 今日待跟進
   - 逾期未跟進
   - 本週互動數
   - 最近 7 天聯絡客戶數

3. 搜尋 / 篩選：
   - 關鍵字搜尋（客戶 / 聯絡人 / 主題）
   - type
   - accountId
   - contactId
   - owner
   - status
   - date range
   - 重設

4. Table 欄位：
   - 互動時間
   - 客戶
   - 聯絡人
   - 類型
   - 主題
   - 負責人
   - 下次行動
   - 下次行動時間
   - 狀態
   - 操作

5. 操作：
   - 查看
   - 編輯
   - 跳到客戶
   - 標記完成

6. 點客戶名稱跳 Account Detail
7. 新增 / 編輯 / 查看互動都使用 Drawer
8. 空狀態與無搜尋結果狀態需完成
```

---

## 十九、開發順序建議

```text id="n7n7pm"
1. 建立 activities.js
2. 建立 useActivitiesStore / helper
3. 建立客戶聯絡列表頁
4. 建立搜尋 / 篩選
5. 建立查看 Drawer
6. 建立新增 Drawer
7. 建立編輯 Drawer
8. 串接跳轉 Account Detail
```

---

## 二十、最終決策

* 客戶聯絡頁要做
* 這頁是全域互動管理頁，不是聯絡人頁
* 這頁的靈魂是 next action / 待跟進，而不是只有歷史紀錄
* 第一版應以列表 + 篩選 + drawer 為核心
* 這頁未來會是 BD 最常用的工作頁之一
