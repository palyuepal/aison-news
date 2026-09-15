#!/usr/bin/env python3
"""Inject AIson's visual-news enhancement assets into a built static site.

This keeps the core templates/build pipeline decoupled from the visual layer while
ensuring newly generated article pages automatically receive story imagery.
"""
from __future__ import annotations

from pathlib import Path
import sys

CSS_TAG = '<link rel="stylesheet" href="news-visuals-v1.css?v=20260916-v1">'
JS_TAG = '<script src="news-visuals-v1.js?v=20260916-v1"></script>'


def patch_html(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    changed = False

    if "news-visuals-v1.css" not in text:
        if "</head>" not in text:
            raise SystemExit(f"Missing </head> in {path}")
        text = text.replace("</head>", CSS_TAG + "\n</head>", 1)
        changed = True

    if "news-visuals-v1.js" not in text:
        if "</body>" not in text:
            raise SystemExit(f"Missing </body> in {path}")
        text = text.replace("</body>", JS_TAG + "\n</body>", 1)
        changed = True

    if changed:
        path.write_text(text, encoding="utf-8")
    return changed


def main() -> None:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    if not root.is_dir():
        raise SystemExit(f"Site root not found: {root}")

    required_assets = [root / "news-visuals-v1.css", root / "news-visuals-v1.js"]
    missing = [str(path) for path in required_assets if not path.is_file()]
    if missing:
        raise SystemExit(f"Visual-news assets missing: {missing}")

    targets = []
    for name in ("index.html", "archive.html", "topics.html", "daily.html", "weekly.html"):
        path = root / name
        if path.is_file():
            targets.append(path)

    news_dir = root / "news"
    if news_dir.is_dir():
        targets.extend(sorted(news_dir.glob("*.html")))

    if not targets:
        raise SystemExit("No AIson pages found to patch")

    count = sum(1 for path in targets if patch_html(path))
    print(f"Injected AIson visual-news layer into {count}/{len(targets)} pages.")


if __name__ == "__main__":
    main()
