"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import EvidenceBadge from "@/components/EvidenceBadge";
import type { Supplement } from "@/data/supplements";

export default function LibraryExplorer({ items }: { items: Supplement[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const categories = useMemo(() => ["全部", ...Array.from(new Set(items.map((item) => item.category)))], [items]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const haystack = `${item.name} ${item.zhName} ${item.category} ${item.short} ${item.overview}`.toLowerCase();
      return (category === "全部" || item.category === category) && (!q || haystack.includes(q));
    });
  }, [items, query, category]);

  return (
    <div className="libraryExplorer">
      <div className="libraryControls">
        <div className="searchField librarySearch">
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋成分、中文名或用途…" aria-label="搜尋成分百科" />
        </div>
        <div className="categoryChips" aria-label="成分類別">
          {categories.map((item) => (
            <button key={item} className={category === item ? "chip active" : "chip"} onClick={() => setCategory(item)} type="button">{item}</button>
          ))}
        </div>
      </div>

      <div className="resultsMeta">{results.length} 個成分</div>
      {results.length ? (
        <div className="libraryGrid">
          {results.map((item) => (
            <Link key={item.slug} href={`/supplements/${item.slug}`} className="libraryCard">
              <div className="libraryTop"><span>{item.category}</span><span className="chemicalMark small">{item.name.slice(0,2).toUpperCase()}</span></div>
              <h2>{item.zhName}<small>{item.name}</small></h2>
              <p>{item.short}</p>
              <div className="libraryEvidence"><EvidenceBadge level={item.evidence[0].level} /><span>{item.evidence[0].outcome}</span></div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="emptyLibrary"><strong>暫時搵唔到。</strong><span>試下其他關鍵字，或者切返「全部」。</span></div>
      )}
    </div>
  );
}
