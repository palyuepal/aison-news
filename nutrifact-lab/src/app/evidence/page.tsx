import type { Metadata } from "next";
import EvidenceBadge from "@/components/EvidenceBadge";
import { evidenceLabels } from "@/data/supplements";

export const metadata: Metadata = { title: "證據評級方法" };

export default function EvidencePage() {
  return (
    <section className="pageSection">
      <div className="container narrowContainer">
        <div className="pageIntro">
          <span className="kicker">EVIDENCE STANDARD</span>
          <h1>「有研究」唔代表<br/>「已證實有效」。</h1>
          <p>NutriFact Lab 第一版用一個 deliberately conservative 嘅四級 system。佢唔係正式 GRADE 評估，亦唔會扮成臨床指引；用途係畀一般讀者快速分辨研究強弱。</p>
        </div>

        <div className="methodStack">
          {Object.entries(evidenceLabels).map(([level, meta], index) => (
            <div className="methodRow" key={level}>
              <span className="methodNo">0{index+1}</span>
              <EvidenceBadge level={level as keyof typeof evidenceLabels} />
              <div><h2>{meta.label}</h2><p>{meta.note}</p></div>
            </div>
          ))}
        </div>

        <div className="contentBlock plainBlock">
          <span className="blockIndex">HOW WE THINK</span>
          <h2>評級時會問 6 條問題</h2>
          <ol className="questionList">
            <li>研究係人體、動物，定細胞？</li>
            <li>係隨機對照試驗、觀察研究，定只係機制推論？</li>
            <li>有冇 systematic review / meta-analysis？結果一致嗎？</li>
            <li>研究嘅人，同網站讀者係咪同一類族群？</li>
            <li>劑量、形式、時間，同市面產品有冇可比性？</li>
            <li>改善嘅係真正重要結果，定只係 surrogate marker？</li>
          </ol>
        </div>

        <div className="warningPanel">
          <strong>重要限制</strong>
          <p>NutriFact Lab MVP 嘅評級係編輯式 evidence summary，唔係醫療診斷工具，亦未經獨立臨床專家審稿。正式公開推廣前，應建立作者身份、審稿流程、利益衝突披露、版本紀錄同更嚴謹嘅證據 SOP。</p>
        </div>
      </div>
    </section>
  );
}
