#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
DAILY_DIR = ROOT / "content" / "daily"


def latest_edition():
    editions = sorted((p.stem for p in DAILY_DIR.glob("*.json") if re.fullmatch(r"\d{4}-\d{2}-\d{2}", p.stem)), reverse=True)
    if not editions:
        raise SystemExit("no daily edition found")
    return editions[0]


def replace_meta(html, kind, key, value):
    pattern = rf'(<meta\s+{kind}="{re.escape(key)}"\s+content=")[^"]*(")'
    updated, count = re.subn(pattern, rf'\g<1>{value}\2', html, count=1)
    if count != 1:
        raise SystemExit(f"missing meta {kind}={key}")
    return updated


def patch(path: Path, edition: str):
    html = path.read_text(encoding="utf-8")
    image = f"https://aison.hk/assets/social/daily-{edition}.jpg"
    html = replace_meta(html, "property", "og:image", image)
    html = replace_meta(html, "name", "twitter:image", image)
    html = replace_meta(html, "property", "og:image:width", "1200")
    html = replace_meta(html, "property", "og:image:height", "1500")
    if 'property="og:image:type"' in html:
        html = replace_meta(html, "property", "og:image:type", "image/jpeg")
    if 'property="og:image:alt"' in html:
        html = replace_meta(html, "property", "og:image:alt", "AIson｜今日 AI 10 件事總覽")
    if 'name="twitter:image:alt"' in html:
        html = replace_meta(html, "name", "twitter:image:alt", "AIson｜今日 AI 10 件事總覽")
    path.write_text(html, encoding="utf-8")
    return image


def main():
    target = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT
    edition = latest_edition()
    generated = ROOT / "assets" / "social" / f"daily-{edition}.jpg"
    if not generated.exists():
        raise SystemExit(f"missing dated daily social card: {generated}")
    for name in ("index.html", "daily.html"):
        path = target / name
        if not path.exists():
            raise SystemExit(f"missing target page: {path}")
        patch(path, edition)
    print(f"Patched share metadata for {edition}: daily-{edition}.jpg")


if __name__ == "__main__":
    main()
