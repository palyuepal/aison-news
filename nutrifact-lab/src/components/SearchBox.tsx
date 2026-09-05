"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Supplement } from "@/data/supplements";

export default function SearchBox({ items }: { items: Supplement[] }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter((item) => `${item.name} ${item.zhName} ${item.category} ${item.short}`.toLowerCase().includes(q))
      .slice(0, 5);
  }, [items, query]);

  return (
    <div className="searchShell">
      <div className="searchField">
        <span aria-hidden="true">⌕</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜尋：鎂、Vitamin D、Omega-3、肌酸…"
          aria-label="搜尋 supplement"
        />
      </div>
      {query && (
        <div className="searchResults">
          {results.length ? results.map((item) => (
            <Link key={item.slug} href={`/supplements/${item.slug}`} className="searchResult">
              <span><strong>{item.zhName}</strong> <small>{item.name}</small></span>
              <span>→</span>
            </Link>
          )) : <p className="emptySearch">暫時未有呢個成分。MVP 會逐步擴充資料庫。</p>}
        </div>
      )}
    </div>
  );
}
