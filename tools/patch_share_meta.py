#!/usr/bin/env python3
from pathlib import Path
import html as html_lib
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
DAILY_DIR = ROOT / "content" / "daily"


def latest_edition():
    editions = sorted((p.stem for p in DAILY_DIR.glob("*.json") if re.fullmatch(r"\d{4}-\d{2}-\d{2}", p.stem)), reverse=True)
    if not editions:
        raise SystemExit("no daily edition found")
    return editions[0]


def load_items(edition: str):
    path = DAILY_DIR / f"{edition}.json"
    try:
        rows = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise SystemExit(f"cannot read daily edition {path}: {exc}") from exc
    if not isinstance(rows, list) or len(rows) != 10:
        raise SystemExit(f"daily edition must contain exactly 10 items: {path}")
    return sorted(rows, key=lambda item: int(item.get("rank", 99)))


def clipped(value: str, limit: int = 46):
    clean = re.sub(r"\s+", " ", str(value or "")).strip()
    return clean if len(clean) <= limit else clean[:limit].rstrip("，。；、 ") + "…"


def share_copy(edition: str, items):
    date_label = edition.replace("-", ".")
    title = f"AIson 今日 AI 10 件事｜{date_label}"
    focus = "｜".join(clipped(item.get("title", ""), 42) for item in items[:3])
    description = f"今日焦點：{focus}。一頁睇晒 10 件 AI 大事、香港影響與 AIson Take。"
    if len(description) > 180:
        description = description[:179].rstrip("，。；、 ") + "…"
    return title, description


def replace_meta(html, kind, key, value):
    pattern = rf'(<meta\s+{kind}="{re.escape(key)}"\s+content=")[^"]*(")'
    safe = html_lib.escape(str(value), quote=True)
    updated, count = re.subn(pattern, lambda match: match.group(1) + safe + match.group(2), html, count=1)
    if count != 1:
        raise SystemExit(f"missing meta {kind}={key}")
    return updated


def patch(path: Path, edition: str, items):
    html = path.read_text(encoding="utf-8")
    image = f"https://aison.hk/assets/social/daily-{edition}.jpg"
    title, description = share_copy(edition, items)
    html = replace_meta(html, "property", "og:title", title)
    html = replace_meta(html, "name", "twitter:title", title)
    html = replace_meta(html, "property", "og:description", description)
    html = replace_meta(html, "name", "twitter:description", description)
    if 'name="description"' in html:
        html = replace_meta(html, "name", "description", description)
    html = replace_meta(html, "property", "og:image", image)
    html = replace_meta(html, "name", "twitter:image", image)
    html = replace_meta(html, "property", "og:image:width", "1200")
    html = replace_meta(html, "property", "og:image:height", "1500")
    if 'property="og:image:type"' in html:
        html = replace_meta(html, "property", "og:image:type", "image/jpeg")
    alt = f"AIson｜{edition.replace('-', '.')} 今日 AI 10 件事總覽"
    if 'property="og:image:alt"' in html:
        html = replace_meta(html, "property", "og:image:alt", alt)
    if 'name="twitter:image:alt"' in html:
        html = replace_meta(html, "name", "twitter:image:alt", alt)
    path.write_text(html, encoding="utf-8")
    return image


def main():
    target = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT
    edition = latest_edition()
    items = load_items(edition)
    generated = ROOT / "assets" / "social" / f"daily-{edition}.jpg"
    if not generated.exists():
        raise SystemExit(f"missing dated daily social card: {generated}")
    for name in ("index.html", "daily.html"):
        path = target / name
        if not path.exists():
            raise SystemExit(f"missing target page: {path}")
        patch(path, edition, items)
    title, _ = share_copy(edition, items)
    print(f"Patched share metadata for {edition}: {title} / daily-{edition}.jpg")


if __name__ == "__main__":
    main()
