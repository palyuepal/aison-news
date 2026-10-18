# AISON LAB 評測版塊

以最新 main 為基礎，只增補導航，不覆蓋附件內的舊頁面。同步更新 tools/build.py 的主題頁導航模板。

reviews.html 顯示評測計劃；review-elevenlabs-cantonese.html 是 noindex 待測稿，沒有 Review JSON-LD、評分、價格結論或 affiliate 連結。

合併前：核對 PR diff 及 CI，取得實際可用 Preview，檢查手機／桌面、選單、搜尋、卡片及 FAQ。repo 同時有 Netlify、Vercel 與 GitHub Pages 設定，不能假設 Netlify Preview 已啟用。

正式評測發布前：補齊測試稿、模型及設定、原始音訊、逐句評分，核對價格與授權，披露利益關係，再決定是否移除 noindex 及加入適用結構化資料。
