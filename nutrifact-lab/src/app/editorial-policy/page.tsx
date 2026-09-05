import type { Metadata } from "next";

export const metadata: Metadata = { title: "編輯政策" };

export default function EditorialPolicyPage() {
  return (
    <section className="pageSection">
      <div className="container narrowContainer">
        <div className="pageIntro"><span className="kicker">EDITORIAL POLICY · MVP v0.3</span><h1>內容點樣<br/>先可以出街？</h1><p>健康內容最危險嘅唔係寫少咗，而係寫得太肯定。呢份政策係第一版發布閘門。</p></div>
        <div className="policyGrid">
          <div><b>01</b><h2>Claim 必須對應 outcome</h2><p>唔會寫「某 supplement 有效」；要寫清楚對咩結果、邊類人、研究用咩形式。</p></div>
          <div><b>02</b><h2>人體證據優先</h2><p>動物、細胞或機制資料只可以做背景，唔會包裝成已證實人體功效。</p></div>
          <div><b>03</b><h2>來源追得到</h2><p>核心健康聲稱至少要有官方資料、systematic review、meta-analysis 或合適人體研究支持。</p></div>
          <div><b>04</b><h2>風險唔可以藏喺 footer</h2><p>副作用、交互作用、高風險人士同「何時應搵專業人士」要放入成分頁主體。</p></div>
          <div><b>05</b><h2>AI 可以協助，唔可以做來源</h2><p>AI 可協助整理、草擬與格式化；研究細節、引用、風險與重要 claim 必須回到可靠來源核對。</p></div>
          <div><b>06</b><h2>改錯要留痕</h2><p>正式版會加入版本紀錄與更正紀錄；重大安全資訊更新要優先處理。</p></div>
        </div>
      </div>
    </section>
  );
}
