import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "關於本站" };

export default function AboutPage() {
  return (
    <section className="pageSection">
      <div className="container narrowContainer">
        <div className="pageIntro">
          <span className="kicker">ABOUT</span>
          <h1>唔係叫你食更多。<br/>係幫你睇清楚。</h1>
          <p>NutriFact Lab 係一個香港繁中營養與 supplement 證據知識平台 MVP。目標係將成分、研究結果、標籤同安全限制拆開講，避免由 marketing slogan 直接跳去健康結論。</p>
        </div>
        <div className="legalCopy">
          <h2>我哋做咩</h2>
          <p>以成分為單位整理一般營養知識，並將「對邊個 outcome 有幾多證據」放喺最前。來源優先使用官方 fact sheet、系統性回顧、統合分析與可靠人體研究。</p>
          <h2>我哋唔做咩</h2>
          <p>唔提供個人診斷、處方、化驗判讀、疾病治療方案，亦唔會因為產品有 affiliate commission 就提高 evidence rating。</p>
          <h2>而家仲係 MVP</h2>
          <p>目前內容屬編輯式 evidence summary，未建立正式獨立臨床審稿制度。網站會保留最後更新日期、來源同方法頁，正式擴大前需要再加入作者／審稿者身份、利益衝突披露及更完整版本紀錄。</p>
        </div>
        <div className="warningPanel"><strong>想知評級點做？</strong><p><Link className="textLink" href="/evidence">睇 Evidence Standard →</Link></p></div>
      </div>
    </section>
  );
}
