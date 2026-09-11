# AIson 官方角色參考圖（Canonical Character References）

此資料夾存放 AIson LIVE 圖像生成時必須使用的官方角色視覺參考。

## Canonical files
- `aison-character-master-reference.jpg`：**主要 Master Reference**。用來鎖定同一隻狗仔的身份、圓潤臉型、耳形、灰白毛色分佈、黃色圓眼鏡、深藍 hoodie、身體比例、turnaround、表情與整體角色辨識。
- `aison-official-hero-reference.jpg`：**主要近鏡 Identity Reference**。用來鎖定臉部特徵、毛茸質感、眼鏡比例、鼻口位置、hoodie 與品牌觀感。

## 必須遵守
1. 所有 AIson LIVE／Breaking News／社交媒體圖像，必須以以上兩張圖作為視覺 reference；Master Sheet 優先級最高。
2. 必須保持 **Same Dog, Same Identity**。可按新聞改動姿勢、表情及道具，但不可生成成另一隻狗、機械人、人物或其他角色。
3. 不可用網上搜尋到的狗仔圖、一般文字描述或 `assets/mascot.webp` 取代以上 canonical references，除非 repo owner 明確批准更新此規則。
4. 圖像生成流程應先從 repo `main` 讀取／下載以上兩個檔案，再傳入可使用 visual reference 的圖片生成步驟；只要 canonical files 可取得，就不可因對話附件不可見而聲稱「沒有 IP reference」。
5. 如執行環境經實際嘗試後，確實無法下載／materialize／傳入這兩張 reference 至圖片生成器，才可跳過圖片；通知時要說明是「本次工具流程未能傳入 repo reference」，不可說使用者未提供 IP 圖。
6. 此處檔案是為自動排程使用而建立的**輕量 generation reference copies**，並非印刷／封存用原始高清 master；不可當作原始高清檔。
7. 未經 owner 明確批准，不可覆蓋、重畫或替換此兩個 canonical reference 檔案。

官方視覺方向：1:1、premium 深藍＋金色科技新聞風、乾淨、專業、有資訊感；品牌角色始終維持同一隻 AIson 狗仔。
