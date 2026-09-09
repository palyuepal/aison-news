# AIson 內容規格

## 所有「今日 AI 10 件事」
每篇新聞都要可以獨立閱讀，不把同一句新聞改寫成多個欄位。固定內容層次：
1. 標題：直接交代最重要的新事實
2. 一句摘要 / excerpt
3. 30 秒睇懂：2–4 個真正 key takeaways
4. 發生咩事？：只寫已有可靠來源支持的事實
5. 背景與脈絡：解釋事情由何而來，以及今次真正新增的是甚麼
6. 核心細節 / deepDive：技術、商業模式、數字、比較或運作機制；資料不足不要硬寫
7. 點解重要？：解釋對產業、公司、用戶或市場的實際含義
8. 🇭🇰 同香港人有咩關係？：至少 3 點，具體涵蓋普通人、香港生意，以及創作者／開發者其中相關群組
9. 下一步睇乜？：列出可以被後續資料驗證的觀察點
10. 🐶 AIson Take：一句至數句可記住的編輯判斷，必須清楚屬分析
11. 來源：sourceLabel / sourceUrl / sourceType；有可靠補充來源才加 references

一般 Daily 10 以約 800–1,500 個實質中文字為目標。這是內容深度目標，不是字數 KPI；如果可靠資料不足，寧可較短，不可用重複、常識背景或推測灌水。

## Featured 3
每日 `content/editorial/YYYY-MM-DD.json` 的 `top3Ids` 是首頁 Featured 3 的唯一編輯排序來源：
- 恰好 3 個、互不重複，全部來自同日 Daily 10
- 以當日實際重要性排序，而非單靠公司名氣、社交熱度或標題刺激度
- 首頁摘要要讓讀者快速知道：發生甚麼、為何重要、香港角度、閱讀時間

## AIson Deep Read
每日由 Featured 3 優先挑選 2–3 篇值得真正深挖的報道；這是目標，不是硬性配額。可靠材料只足夠 1 篇便只做 1 篇，完全不足可以 0 篇。

Deep Read 目標約 2,500–4,500 個實質中文字、約 8–15 分鐘閱讀，並盡量包括：
1. 30 秒睇懂 / 先講結論
2. 事件時間線與背景
3. ✅ 已確認事實
4. 🟡 尚未確認、條件、限制或仍未公開的細節
5. 技術或商業機制
6. 關鍵數字、比較或表格（有可靠資料才使用）
7. 香港的實際影響
8. 限制、反方觀點與主要風險
9. 下一個可核實的觀察點
10. 🧠 AIson Take（明確標示分析）

只有已核實、有實際 sourceUrl，而且材料足以支持長文的故事才可標作 Deep Read。禁止靠同義改寫、重複背景、未證實市場傳言或 AI 推測湊字數。

目前前端判斷 Deep Read 的最低材料門檻為：
- verified=true 且有 sourceUrl
- whatHappened 至少 300 個實質中文字
- reportingContext 至少 400
- deepDive 至少 900
- whyImportant 至少 250
- whatToWatch 至少 180
- hkImpact 至少 3 點
- 上述主要欄位連同 summary、take、hkImpact 的實質內容合計至少 2,800 個中文字

達到最低門檻仍不代表內容一定值得做 Deep Read；編輯判斷與來源質素優先於字數。

## Fact / Context / Analysis
每篇文章都必須讓讀者分得出三種內容：
- ✅ 已確認：官方文件、監管資料、研究論文或可靠報道直接支持
- 🟡 背景／尚待確認：有脈絡價值，但仍存在條件、限制、未公開細節或需後續驗證
- 🧠 AIson 分析：推論、判斷、情境分析或香港角度，不得寫成已發生事實

## 文章視覺與圖片版權
文章預設使用 AIson 自己生成的 1200×630 報道摘要圖，因此不需要為了「有圖」而搬運新聞社或網上圖片。

如有真正值得使用的專題圖片，可在 story 加可選 `visual`：
```json
{
  "visual": {
    "kind": "aison-original",
    "src": "assets/editorial/example.webp",
    "alt": "圖片替代文字",
    "credit": "AIson",
    "sourceUrl": "https://..."
  }
}
```

規則：
- `kind` 只可為 `aison-original` 或 `official-press`
- `src` 必須是 repo 內 `assets/editorial/` 的本地 JPG / PNG / WEBP；禁止直接 hotlink 外站圖片
- 必須有 `alt` 與 `credit`
- `official-press` 必須同時提供官方 `https` 來源／授權頁 `sourceUrl`
- AIson 原創圖如由內部生成，可不設 sourceUrl；若有參考或官方素材頁，應保留 sourceUrl
- Reuters、AP、Bloomberg、Getty 等新聞社／圖庫圖片，不因文章有引用權就自動取得圖片使用權；沒有明確授權不要下載、重製或 hotlink
- 視覺只負責幫助理解，不可加入來源沒有支持的數字、產品外觀、人物行為或「想像成事實」的場景
- 如果視覺內容屬示意圖，要在圖說明確標示「AIson 原創示意圖」或相近字樣

Build 會驗證 visual schema、檔案位置與官方圖片來源 URL；資料不合規會直接令發布失敗，而不是靜默上線。

## Topic Hub / 故事線
主題頁不是普通 tag archive。當同一公司、產品或事件累積報道時，應提供：
- 最新進展
- 故事起點與時間線
- 30 秒主題 briefing
- 已達門檻的 Deep Read
- 常見相關公司／產品／標籤
- 完整相關新聞列表，而不是有時間線後把其他新聞隱藏

Topic Hub 的 Deep Read 標記必須使用與文章頁相同的材料門檻，不可另設較寬鬆標準。

### `topicId` 與 `storylineId`
AIson 由 `data/storylines.json` 管理穩定主題與故事線 ID。兩者用途不同：

- `topicId`：較闊、長期存在的主題，例如 `agentic-ai`、`ai-infrastructure`。它回答「這篇屬哪個長期領域？」
- `storylineId`：較窄、針對同一事件／產品／合作／爭議的長期追蹤線，例如 `meta-muse-agent`。它回答「這篇是不是同一件事的後續？」

新文章如屬已存在故事線，應直接在 story 加：
```json
{
  "topicId": "agentic-ai",
  "storylineId": "meta-muse-agent"
}
```

規則：
- ID 必須是小寫 kebab-case，並且已存在於 `data/storylines.json`
- 有 `storylineId` 時，必須同時寫 `topicId`，而且要與 registry 內該故事線的 `topicId` 一致
- 同一篇新聞只可屬一條主要 `storylineId`；不要因文章同時提及多家公司就塞入多條故事線
- `storylineId` 只用於真正同一事件的 follow-up，不可因為「同一公司」或「同一產品類別」就強行串線
- 舊文章可由 registry 的 `storyIds` 回填，不必重寫歷史 daily JSON
- 新 follow-up 優先直接寫 `storylineId`；`storyIds` 主要用於舊文回填或人工修正
- 如沒有合適的既有故事線，不要硬套；先用普通 tags / category，確定值得長期追蹤後再建立新的 registry entry
- `status=watching` 可預先建立監察中的故事線，但沒有已發布文章時不應在前台冒充已有報道；每日自動發布不可直接連結 `watching`，首篇可核實報道須先由編輯把 registry 升為 `active`

Build 會驗證 topic/storyline ID、registry 關係、舊文 seed 是否存在，以及一篇舊文是否被錯誤 seed 到多條故事線。Daily 10 如沒有高信心配對，可完全省略兩個 ID 並作為新事件；但一旦聲稱是既有 follow-up，未知 ID、錯配 topic 或未啟用故事線都會阻止發布。

## 發布標準
- 官方公告、監管文件、研究論文、公司正式文件優先；其次 Reuters / AP / FT / Bloomberg / WSJ / The Verge 等可靠媒體
- 涉及重大數字、監管、併購、融資、安全事故或爭議性主張，盡量交叉核實
- 傳聞、匿名爆料、未證實 benchmark 不當作確定事實
- 數字、版本、日期、價錢發布前二次核對
- 每日 10 件事以過去 24 小時的新進展為優先，可把搜尋窗口擴至 72 小時補充真正重要而未收錄的內容；必須避免把舊聞包裝成今日新聞
- 同一事件不同媒體報道只算一件；只有真正新增的實質進展才寫 follow-up
- followUpOf、updatedAt、correctionNote 必須符合 Trust Layer/schema，不得猜 ID 或用重複 story 代替更正
- 如果新報道是既有故事線的真正 follow-up，發布時同時沿用正確 `storylineId` / `topicId`；不要只靠 tag 讓前端猜
- 來源不足、資料互相矛盾或關鍵細節未確認時，直接標示限制，不要補寫成完整但虛假的故事
