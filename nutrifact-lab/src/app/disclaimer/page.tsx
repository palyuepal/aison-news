import type { Metadata } from "next";

export const metadata: Metadata = { title: "安全資訊與免責" };

export default function DisclaimerPage() {
  return (
    <section className="pageSection">
      <div className="container narrowContainer">
        <div className="pageIntro"><span className="kicker">SAFETY & EDITORIAL</span><h1>健康資訊免責</h1><p>呢一頁唔係 footer 裝飾，而係網站產品設計其中一部分。</p></div>
        <div className="legalCopy">
          <h2>教育用途</h2>
          <p>NutriFact Lab 提供一般營養與膳食補充劑教育資訊，唔構成醫療診斷、個人治療建議、處方、急症評估或對任何品牌／產品嘅推薦。</p>
          <h2>唔好自行取代治療</h2>
          <p>如你正接受治療、服用處方藥、懷孕或哺乳、有腎／肝／心血管等疾病、準備做手術，或考慮高劑量補充，應向合資格醫護專業人士查詢。</p>
          <h2>研究會更新</h2>
          <p>營養科學會隨新研究改變。每個成分頁會標示最後更新日期同主要來源；日後正式版應加入內容版本紀錄及定期再審核。</p>
          <h2>危急情況</h2>
          <p>如出現嚴重過敏、呼吸困難、意識改變、中毒或其他急性危險症狀，唔應依賴網站內容，應即時聯絡當地緊急醫療服務。</p>
        </div>
      </div>
    </section>
  );
}
