# 🎓 StudyPlanner — AI 學習規劃助手

一個用於規劃學習的網頁應用，包含 **AI 導師**、**學習規劃**、**日程表**、**學習材料與內容次序推薦**。

- 純前端（HTML + CSS + Vanilla JS），**無需建置**，可直接開啟或搭配任意靜態伺服器。
- 所有資料（規劃、對話、設定）保存在瀏覽器 `localStorage`，可匯出 JSON 備份。
- 內建**示範模式**（規則式導師，離線可用），也支援 **OpenAI 相容 API** 作為真正的 AI 導師。

## ✨ 功能

| 功能 | 說明 |
| --- | --- |
| 💬 與導師對話 | 告訴導師學習目標、期限、每日可投入時間，導師給予路徑與資源建議 |
| 📋 建議規劃卡 | 導師輸出結構化建議（總週數、每日時數、階段、任務、材料），可「檢視」或「採納」 |
| 📅 學習規劃 | 總覽、階段與每週任務、**每週日程表**（日期範圍、主題、任務、材料、每日投入） |
| 📚 學習材料 | 公開課 / 教學影片 / 書 / 網站 / 文件等，標註使用週次，可自行增刪改 |
| ✏️ 自行修改 | 隨時直接編輯總覽、階段、任務、材料與勾選完成進度 |
| 🔄 再討論修改 | 採納後仍可回對話要求「課業太多重新安排」「發現更好的新資源」等，導師輸出修訂版 |
| ⚙️ 設定 | OpenAI 相容 API 位址 / 模型 / Key、示範模式切換、連線測試 |
| 💾 備份 | 一鍵匯出 / 匯入 JSON（匯出檔不含 API Key） |

## 🚀 使用方式

### 方式一：直接開啟

用瀏覽器開啟 `index.html` 即可（所有腳本皆為傳統 script，不需伺服器）。

### 方式二：本機伺服器（建議）

```bash
npm start          # 等同 python3 -m http.server 8080
# 或
npm run serve      # 使用 npx serve
```

開啟 <http://localhost:8080>。

## 🤖 AI 導師設定

1. 進入「⚙️ 設定」。
2. 填入 OpenAI 相容 API 的 Base URL（預設 `https://api.openai.com/v1`）、模型（如 `gpt-4o-mini`）與 API Key。
3. 取消勾選「示範模式」，按「儲存設定」，再按「測試連線」。
4. API Key 只存在瀏覽器 localStorage，不會上傳到其他地方；匯出備份也不包含 Key。

> 未設定 API 時，應用會自動使用**示範模式**：內建規則式導師會依關鍵字（遊戲渲染、前端、機器學習、後端、英文、樂器等）產生完整建議規劃。

## 🔄 使用工作流

```
1. 用戶向 AI 導師查詢學習路徑 / 規劃
2. 導師給予意見與資源建議
3. 導師輸出「建議規劃」（階段 × 每週任務 × 材料 × 日程）
4. 用戶檢視建議規劃，繼續與導師討論
5. 達成共識後按「採納此規劃」→ 導師把學習材料與規劃寫入
6. 用戶在「學習規劃」檢視，可隨時自行修改
7. 想再調整時回對話區與導師討論，讓 AI 修改規劃
```

### 範例情境

- 想學遊戲渲染 → 按聊天區「✨ 載入範例：遊戲渲染」，看預設的 12 週範例規劃。
- 課業太多 → 輸入「這週課業太多，幫我重新安排後續的學習規劃」，導師會降低每日時數、延長週數。
- 發現新資源 → 輸入「我發現『XXX』這個資源，覺得更好，想換掉原本的」，導師會把它加入材料清單。

## 🗂️ 專案結構

```
├── index.html          # 頁面結構
├── css/styles.css      # 樣式
├── js/
│   ├── store.js        # 資料層（localStorage、規劃/對話/設定 CRUD）
│   ├── tutor.js        # 示範模式規則式導師（離線）
│   ├── ai.js           # OpenAI 相容 API 層 + <plan> JSON 解析
│   └── app.js          # UI 層（對話、規劃、日程表、材料、設定、工作流）
├── tests/
│   └── smoke.test.js   # jsdom 冒煙測試（npm test）
└── package.json
```

## 🧪 測試

```bash
npm install
npm test
```

## 📄 資料格式（<plan> JSON）

導師輸出的建議規劃格式如下（AI 模式會要求模型輸出相同格式）：

```json
{
  "goal": "學習目標",
  "startDate": "YYYY-MM-DD",
  "weeks": 12,
  "dailyHours": 3,
  "phases": [
    { "title": "階段名稱", "startWeek": 1, "endWeek": 2,
      "topics": ["主題1", "主題2"],
      "tasks": ["用哪個資源做什麼"] }
  ],
  "materials": [
    { "type": "公開課|教學影片|書|網站|文件|其他",
      "title": "資源名稱", "url": "https://...",
      "note": "為什麼推薦 / 如何使用", "week": 1 }
  ]
}
```

## 📝 Commit 規範

本專案使用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
chore: add .gitignore
feat: add app shell with styles and data store
feat: add AI tutor engine with demo mode and API layer
feat: add chat workflow with plan proposal acceptance
test: add jsdom smoke tests for core workflow
```
