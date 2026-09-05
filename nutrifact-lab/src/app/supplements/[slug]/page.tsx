import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EvidenceBadge from "@/components/EvidenceBadge";
import { evidenceLabels, getSupplement, supplements } from "@/data/supplements";

export function generateStaticParams() {
  return supplements.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = getSupplement(slug);
  if (!item) return {};
  return {
    title: `${item.zhName} ${item.name}`,
    description: item.short
  };
}

export default async function SupplementDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = getSupplement(slug);
  if (!item) notFound();

  return (
    <article>
      <section className="detailHero">
        <div className="container detailHeroGrid">
          <div>
            <Link href="/supplements" className="backLink">← 成分百科</Link>
            <div className="detailCategory">{item.category}</div>
            <h1>{item.zhName}<small>{item.name}</small></h1>
            <p>{item.overview}</p>
            <div className="updated">最後內容更新：{item.updated}</div>
          </div>
          <div className="detailSymbol"><span>{item.name.slice(0,2).toUpperCase()}</span><small>NutriFact Lab ingredient file</small></div>
        </div>
      </section>

      <section className="detailSection">
        <div className="container detailLayout">
          <div className="detailMain">
            <section className="contentBlock">
              <span className="blockIndex">01 · 先搞清楚</span>
              <h2>你最需要知道嘅 3 件事</h2>
              <div className="numberList">
                {item.whatToKnow.map((point, index) => <div key={point}><b>0{index+1}</b><p>{point}</p></div>)}
              </div>
            </section>

            <section className="contentBlock">
              <span className="blockIndex">02 · EVIDENCE MAP</span>
              <h2>證據唔係一個總分</h2>
              <p className="blockLead">同一成分對唔同用途，可以由「證據較強」去到「證據不足」。所以 NutriFact Lab 係逐個 outcome 評級。</p>
              <div className="evidenceTable">
                {item.evidence.map((entry) => (
                  <div className="evidenceRow" key={entry.outcome}>
                    <div><h3>{entry.outcome}</h3><p>{entry.summary}</p></div>
                    <EvidenceBadge level={entry.level} />
                  </div>
                ))}
              </div>
            </section>

            {item.forms?.length ? (
              <section className="contentBlock">
                <span className="blockIndex">03 · FORMS</span>
                <h2>常見形式點睇？</h2>
                <div className="formsGrid">
                  {item.forms.map((form) => <div key={form.name}><h3>{form.name}</h3><p>{form.note}</p></div>)}
                </div>
              </section>
            ) : null}

            <section className="contentBlock cautionBlock">
              <span className="blockIndex">04 · SAFETY</span>
              <h2>邊啲位要小心？</h2>
              <ul>{item.caution.map((point) => <li key={point}>{point}</li>)}</ul>
              <div className="medicalNote">如你有疾病、懷孕／哺乳、準備做手術、長期服藥或打算用高劑量 supplement，呢個網站唔可以代替醫生、藥劑師或註冊營養師嘅個人化評估。</div>
            </section>

            <section className="contentBlock sourcesBlock">
              <span className="blockIndex">05 · SOURCES</span>
              <h2>資料來源</h2>
              <div className="sourceList">
                {item.sources.map((source, index) => (
                  <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><b>{String(index+1).padStart(2,"0")}</b><span>{source.label}</span><span>↗</span></a>
                ))}
              </div>
            </section>
          </div>

          <aside className="detailAside">
            <div className="asideCard stickyCard">
              <span className="kicker">READ THIS FIRST</span>
              <h3>呢頁唔係叫你「應唔應該食」。</h3>
              <p>佢係幫你理解證據同風險。個人需唔需要補充，仲要睇飲食、病歷、藥物、檢驗同實際目標。</p>
              <Link href="/evidence" className="textLink">點評級證據 →</Link>
            </div>
            <div className="asideCard legendCard">
              <h3>證據圖例</h3>
              {Object.entries(evidenceLabels).map(([level, meta]) => <div key={level}><EvidenceBadge level={level as keyof typeof evidenceLabels} /><small>{meta.note}</small></div>)}
            </div>
          </aside>
        </div>
      </section>
    </article>
  );
}
