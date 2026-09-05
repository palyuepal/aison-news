import Link from "next/link";

export default function Footer() {
  return (
    <footer className="siteFooter">
      <div className="container footerGrid">
        <div>
          <strong>NutriFact Lab</strong>
          <p>用證據了解營養與 supplement，而唔係靠廣告決定。</p>
        </div>
        <div className="footerLinks">
          <Link href="/about">關於本站</Link>
          <Link href="/evidence">證據評級方法</Link>
          <Link href="/editorial-policy">編輯政策</Link>
          <Link href="/disclaimer">健康資訊免責</Link>
          <a href="https://ods.od.nih.gov/" target="_blank" rel="noreferrer">NIH ODS</a>
        </div>
      </div>
      <div className="container footerBottom">教育用途 · 不提供個人診斷、處方或品牌推薦</div>
    </footer>
  );
}
