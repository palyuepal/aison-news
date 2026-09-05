import Link from "next/link";
import Logo from "./Logo";

export default function Header() {
  return (
    <header className="siteHeader">
      <div className="container headerInner">
        <Logo />
        <nav className="mainNav" aria-label="主要導覽">
          <Link href="/supplements">成分百科</Link>
          <Link href="/evidence">證據評級</Link>
          <Link href="/editorial-policy">編輯政策</Link>
          <Link href="/disclaimer">安全資訊</Link>
        </nav>
      </div>
    </header>
  );
}
