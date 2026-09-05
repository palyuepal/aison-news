import Link from "next/link";
export default function NotFound() {
  return <section className="pageSection"><div className="container narrowContainer"><div className="pageIntro"><span className="kicker">404</span><h1>搵唔到呢個成分。</h1><p>MVP 資料庫仲係第一批內容。</p><Link className="solidButton" href="/supplements">返回成分百科</Link></div></div></section>;
}
