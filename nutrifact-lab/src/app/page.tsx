import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import EvidenceBadge from "@/components/EvidenceBadge";
import { supplements } from "@/data/supplements";

const goals = [
  ["😴", "睡眠與恢復", "分清營養不足、睡眠衛生同 supplement 證據"],
  ["🏋🏻", "運動與肌肉", "肌酸、蛋白質、電解質：邊啲真係有料"],
  ["🧠", "專注與精神", "唔將 stimulant、缺乏矯正同『腦力提升』混埋一齊"],
  ["🦴", "骨骼營養", "Vitamin D、鈣、鎂：角色唔同，唔係越多越好"],
  ["🫀", "心血管", "Omega-3、礦物質與實際研究終點點樣睇"],
  ["🦠", "腸道", "益生菌要睇菌株，唔係淨係睇 CFU 大細"],
];

export default function Home() {
  const featured = supplements.filter((item) => item.featured);
  return (
    <>
      <section className="hero">
        <div className="container heroGrid">
          <div className="heroCopy">
            <div className="eyebrow">NUTRITION · SUPPLEMENTS · EVIDENCE</div>
            <h1>營養，<br/><span>唔好靠估。</span></h1>
            <p className="heroLead">用人話拆解營養、Supplement 成分、研究證據、安全風險同產品標籤。唔賣神效，唔用「有研究」三個字當答案。</p>
            <SearchBox items={supplements} />
            <div className="heroMicro">現有 {supplements.length} 個核心成分 · 每頁列明來源及更新日期</div>
          </div>
          <div className="heroPanel" aria-label="NutriFact Lab 證據卡示例">
            <div className="panelTop">
              <span className="miniTag">TRUTH CHECK</span>
              <span className="panelIndex">01</span>
            </div>
            <h2>Magnesium Glycinate<br/>係咪一定最適合瞓覺？</h2>
            <p>最大問題唔係「邊款鎂最好」，而係你有冇先證明需要補鎂，以及你想改善嘅 outcome 有幾強證據。</p>
            <div className="signalRows">
              <div><span>正常肌肉／神經功能</span><EvidenceBadge level="strong" /></div>
              <div><span>改善一般失眠</span><EvidenceBadge level="limited" /></div>
            </div>
            <Link href="/supplements/magnesium" className="textLink">睇完整拆解 →</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="sectionHeading splitHeading">
            <div><span className="kicker">START HERE</span><h2>熱門成分</h2></div>
            <Link href="/supplements" className="outlineButton">全部成分 →</Link>
          </div>
          <div className="cardGrid">
            {featured.map((item) => (
              <Link key={item.slug} className="suppCard" href={`/supplements/${item.slug}`}>
                <div className="cardMeta"><span>{item.category}</span><span>↗</span></div>
                <div className="chemicalMark">{item.name.slice(0, 2).toUpperCase()}</div>
                <h3>{item.zhName}<small>{item.name}</small></h3>
                <p>{item.short}</p>
                <div className="cardEvidence"><EvidenceBadge level={item.evidence[0].level} /><span>{item.evidence[0].outcome}</span></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section softSection">
        <div className="container">
          <div className="sectionHeading"><span className="kicker">BY GOAL</span><h2>你其實想解決咩？</h2><p>由目標出發，再反查有冇證據；唔好由「買咗支 supplement」開始搵理由。</p></div>
          <div className="goalGrid">
            {goals.map(([emoji, title, desc]) => (
              <div className="goalCard" key={title}>
                <span className="goalIcon">{emoji}</span><h3>{title}</h3><p>{desc}</p><span className="soon">內容路線已預留 · MVP 擴充中</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section darkSection">
        <div className="container truthGrid">
          <div>
            <span className="kicker light">NUTRIFACT STANDARD</span>
            <h2>我哋點判斷「有冇料」？</h2>
          </div>
          <div className="principles">
            <div><b>01</b><span><strong>先睇 outcome</strong><small>「有效」一定要問：對咩有效？對邊類人？</small></span></div>
            <div><b>02</b><span><strong>人體研究優先</strong><small>細胞、老鼠、觀察性研究唔會包裝成已證實功效。</small></span></div>
            <div><b>03</b><span><strong>安全同效益一齊睇</strong><small>劑量、交互作用、產品品質同高風險人士都要寫。</small></span></div>
            <div><b>04</b><span><strong>來源要追得到</strong><small>每頁列明官方 fact sheet、systematic review 或 meta-analysis。</small></span></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container mythBlock">
          <div className="mythLabel">SUPPLEMENT MYTH #001</div>
          <div><h2>「天然」≠ 安全；<br/>「有研究」≠ 有效。</h2><p>網站嘅價值唔係幫你買更多 supplement，而係幫你分清營養需要、研究證據同 marketing，知道幾時根本唔需要買。</p></div>
          <Link href="/evidence" className="solidButton">睇證據評級方法</Link>
        </div>
      </section>
    </>
  );
}
