import Link from "next/link";

export default function Logo() {
  return (
    <Link className="brand" href="/" aria-label="NutriFact Lab 首頁">
      <span className="nfMark" aria-hidden="true">
        <span className="nfLetter">NF</span>
        <span className="nfDot nfDotA" />
        <span className="nfDot nfDotB" />
        <span className="nfLine nfLineA" />
        <span className="nfLine nfLineB" />
      </span>
      <span className="brandWords">
        <strong>NutriFact Lab</strong>
        <small>NUTRITION · EVIDENCE</small>
      </span>
    </Link>
  );
}
