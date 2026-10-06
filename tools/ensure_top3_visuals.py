#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Guarantee story-specific visuals for the latest AIson Top 3.

This runs after enrich_official_visuals.py and before tools/build.py.

Policy:
1. Preserve an existing valid local story visual (official image wins).
2. If rank 1-3 still has no usable visual, render a deterministic AIson editorial
   graphic with story-specific motifs.
3. Fail the build if any Top 3 story still lacks a usable local visual.

No external image API is used here. The fallback is intentionally local and
deterministic so daily publishing never depends on third-party image quotas.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import tempfile
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DAILY_DIR = ROOT / "content" / "daily"
REL_AUTO_DIR = Path("assets") / "editorial" / "auto" / "top3"

W, H = 1200, 630
NAVY = (7, 26, 51)
NAVY_2 = (12, 50, 91)
NAVY_3 = (19, 71, 119)
GOLD = (242, 183, 5)
CREAM = (247, 244, 236)
WHITE = (255, 255, 255)
MUTED = (184, 200, 220)
CYAN = (86, 191, 211)
GREEN = (79, 190, 143)
RED = (232, 110, 96)

FONT_REGULAR_CANDIDATES = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJKtc-Regular.otf",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
]
FONT_BOLD_CANDIDATES = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJKtc-Bold.otf",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
]


def _pil():
    try:
        from PIL import Image, ImageDraw, ImageFont
    except Exception as exc:
        raise SystemExit(f"Pillow is required for Top 3 guaranteed visuals: {exc}") from exc
    return Image, ImageDraw, ImageFont


def _find_font(candidates: Iterable[str]) -> str | None:
    return next((path for path in candidates if Path(path).is_file()), None)


def _font_factory(ImageFont):
    regular = _find_font(FONT_REGULAR_CANDIDATES)
    bold = _find_font(FONT_BOLD_CANDIDATES)

    def font(size: int, strong: bool = False):
        path = bold if strong else regular
        if path:
            return ImageFont.truetype(path, size=size)
        return ImageFont.load_default()

    return font


def _slug(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9._-]+", "-", str(value or "")).strip("-")
    return value or "story"


def _latest_daily_file(daily_dir: Path) -> Path:
    files = sorted(daily_dir.glob("*.json"), key=lambda p: p.stem, reverse=True)
    if not files:
        raise SystemExit(f"No daily JSON files found in {daily_dir}")
    return files[0]


def _load_stories(path: Path) -> list[dict]:
    try:
        rows = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise SystemExit(f"Invalid daily JSON {path}: {exc}") from exc
    if not isinstance(rows, list):
        raise SystemExit(f"Daily JSON must contain a list: {path}")
    return [row for row in rows if isinstance(row, dict)]


def _top3(stories: list[dict]) -> list[dict]:
    by_rank = {int(s.get("rank", 999)): s for s in stories if str(s.get("rank", "")).isdigit()}
    missing = [rank for rank in (1, 2, 3) if rank not in by_rank]
    if missing:
        raise SystemExit(f"Latest edition is missing Top 3 ranks: {missing}")
    return [by_rank[1], by_rank[2], by_rank[3]]


def _visual_path(root: Path, story: dict) -> Path | None:
    visual = story.get("visual")
    if not isinstance(visual, dict):
        return None
    src = str(visual.get("src", "")).strip()
    if not src.startswith("assets/editorial/") or ".." in Path(src).parts:
        return None
    return root / src


def _has_valid_visual(root: Path, story: dict) -> bool:
    visual = story.get("visual")
    path = _visual_path(root, story)
    return bool(
        isinstance(visual, dict)
        and str(visual.get("kind", "")).strip() in {"official-press", "aison-original"}
        and str(visual.get("alt", "")).strip()
        and str(visual.get("credit", "")).strip()
        and path
        and path.is_file()
        and path.stat().st_size > 1000
    )


def _story_template(story: dict) -> str:
    hay = " ".join(
        [
            str(story.get("category", "")),
            str(story.get("title", "")),
            " ".join(map(str, story.get("tags") or [])),
        ]
    ).lower()
    if re.search(r"watermark|provenance|來源|水印|content|版權|copyright", hay):
        return "provenance"
    if re.search(r"政策|監管|聽證|議會|法院|法律|regulat|policy|hearing|audit|whistle|act\b|sec\b|ftc\b", hay):
        return "policy"
    if re.search(r"晶片|chip|gpu|nvidia|broadcom|server|data.?center|算力|基建|能源|power", hay):
        return "infrastructure"
    if re.search(r"融資|估值|收購|併購|finance|fund|debt|valuation|m&a|bank", hay):
        return "finance"
    if re.search(r"機械人|robot|physical ai|automation", hay):
        return "robotics"
    if re.search(r"模型|model|open.?weight|reasoning|agent|coding|research|研究", hay):
        return "model"
    if re.search(r"廣告|ads|business|企業|產品|product", hay):
        return "business"
    return "general"


def _linear_gradient(Image, ImageDraw):
    image = Image.new("RGB", (W, H), NAVY)
    draw = ImageDraw.Draw(image)
    for y in range(H):
        t = y / max(1, H - 1)
        r = int(NAVY[0] * (1 - t) + NAVY_2[0] * t)
        g = int(NAVY[1] * (1 - t) + NAVY_2[1] * t)
        b = int(NAVY[2] * (1 - t) + NAVY_2[2] * t)
        draw.line((0, y, W, y), fill=(r, g, b))
    return image


def _wrap(draw, text: str, font, max_width: int, max_lines: int) -> list[str]:
    text = re.sub(r"\s+", " ", str(text or "")).strip()
    if not text:
        return []
    lines: list[str] = []
    current = ""
    for ch in text:
        test = current + ch
        width = draw.textbbox((0, 0), test, font=font)[2]
        if current and width > max_width:
            lines.append(current)
            current = ch
            if len(lines) >= max_lines:
                break
        else:
            current = test
    if len(lines) < max_lines and current:
        lines.append(current)
    consumed = "".join(lines)
    if len(consumed) < len(text) and lines:
        last = lines[-1].rstrip("，。；、 ")
        while last and draw.textbbox((0, 0), last + "…", font=font)[2] > max_width:
            last = last[:-1]
        lines[-1] = last + "…"
    return lines[:max_lines]


def _grid(draw):
    for x in range(0, W, 60):
        draw.line((x, 0, x, H), fill=(255, 255, 255, 12), width=1)
    for y in range(0, H, 60):
        draw.line((0, y, W, y), fill=(255, 255, 255, 12), width=1)


def _draw_policy(draw, ox: int, oy: int):
    # Civic building / hearing room + microphone + documents.
    draw.rounded_rectangle((ox + 30, oy + 80, ox + 420, oy + 330), radius=24, fill=(10, 38, 69), outline=GOLD, width=3)
    draw.polygon([(ox + 50, oy + 86), (ox + 225, oy + 15), (ox + 400, oy + 86)], fill=(21, 67, 109), outline=GOLD)
    for x in (85, 155, 225, 295, 365):
        draw.rectangle((ox + x - 14, oy + 115, ox + x + 14, oy + 280), fill=(27, 75, 118))
    draw.rectangle((ox + 60, oy + 282, ox + 390, oy + 305), fill=(41, 91, 132))
    draw.line((ox + 475, oy + 170, ox + 475, oy + 330), fill=CREAM, width=8)
    draw.ellipse((ox + 452, oy + 120, ox + 498, oy + 166), fill=GOLD)
    draw.line((ox + 475, oy + 330, ox + 425, oy + 378), fill=CREAM, width=7)
    draw.line((ox + 475, oy + 330, ox + 525, oy + 378), fill=CREAM, width=7)
    draw.rounded_rectangle((ox + 315, oy + 340, ox + 560, oy + 455), radius=18, fill=(248, 245, 236), outline=(210, 220, 230), width=2)
    for yy in (370, 392, 414):
        draw.line((ox + 345, oy + yy, ox + 520, oy + yy), fill=(56, 83, 112), width=5)
    draw.ellipse((ox + 325, oy + 355, ox + 343, oy + 373), fill=GREEN)


def _draw_provenance(draw, ox: int, oy: int):
    # Layered document, hidden statistical signal and verification target.
    for shift, alpha in ((50, NAVY_3), (25, (33, 87, 133)), (0, CREAM)):
        draw.rounded_rectangle((ox + 80 + shift, oy + 65 - shift // 3, ox + 470 + shift, oy + 430 - shift // 3), radius=22, fill=alpha, outline=(125, 151, 178), width=2)
    for i, yy in enumerate(range(125, 330, 38)):
        width = 300 - (i % 3) * 42
        draw.rounded_rectangle((ox + 125, oy + yy, ox + 125 + width, oy + yy + 12), radius=6, fill=(82, 103, 125))
    cx, cy = ox + 445, oy + 325
    for radius in (110, 78, 45):
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=GOLD if radius != 78 else CYAN, width=4)
    draw.line((cx - 26, cy + 2, cx - 5, cy + 24), fill=GREEN, width=10)
    draw.line((cx - 5, cy + 24, cx + 40, cy - 35), fill=GREEN, width=10)
    for i in range(14):
        a = i * math.pi / 7
        x1 = cx + int(math.cos(a) * 128)
        y1 = cy + int(math.sin(a) * 128)
        x2 = cx + int(math.cos(a) * 145)
        y2 = cy + int(math.sin(a) * 145)
        draw.line((x1, y1, x2, y2), fill=MUTED, width=3)


def _draw_model(draw, ox: int, oy: int):
    # Model graph / sparse MoE style.
    centers = [
        (ox + 110, oy + 105), (ox + 250, oy + 70), (ox + 390, oy + 125),
        (ox + 175, oy + 245), (ox + 330, oy + 235), (ox + 475, oy + 270),
        (ox + 115, oy + 390), (ox + 280, oy + 410), (ox + 445, oy + 410),
    ]
    for i, a in enumerate(centers):
        for j, b in enumerate(centers):
            if j <= i or abs(i - j) > 3:
                continue
            draw.line((*a, *b), fill=(75, 124, 166), width=2)
    for i, (x, y) in enumerate(centers):
        r = 27 if i in {1, 4, 7} else 18
        draw.ellipse((x-r, y-r, x+r, y+r), fill=GOLD if i in {1, 4, 7} else CYAN, outline=WHITE, width=2)
    draw.rounded_rectangle((ox + 365, oy + 60, ox + 555, oy + 155), radius=16, fill=(13, 43, 76), outline=GOLD, width=2)
    for y in (88, 112, 136):
        draw.line((ox + 392, oy + y, ox + 525, oy + y), fill=MUTED, width=4)


def _draw_infrastructure(draw, ox: int, oy: int):
    # Chip + server/power lanes.
    draw.rounded_rectangle((ox + 115, oy + 95, ox + 430, oy + 405), radius=32, fill=(14, 51, 83), outline=GOLD, width=4)
    draw.rounded_rectangle((ox + 175, oy + 150, ox + 370, oy + 345), radius=18, fill=(29, 84, 126), outline=CYAN, width=3)
    for i in range(6):
        x = ox + 145 + i * 48
        draw.line((x, oy + 70, x, oy + 95), fill=CREAM, width=5)
        draw.line((x, oy + 405, x, oy + 430), fill=CREAM, width=5)
    for i in range(6):
        y = oy + 125 + i * 48
        draw.line((ox + 90, y, ox + 115, y), fill=CREAM, width=5)
        draw.line((ox + 430, y, ox + 455, y), fill=CREAM, width=5)
    draw.line((ox + 465, oy + 130, ox + 540, oy + 130), fill=GOLD, width=10)
    draw.line((ox + 540, oy + 130, ox + 500, oy + 215), fill=GOLD, width=10)
    draw.line((ox + 500, oy + 215, ox + 560, oy + 215), fill=GOLD, width=10)


def _draw_finance(draw, ox: int, oy: int):
    # Filing/document stack with rising/falling market line.
    draw.rounded_rectangle((ox + 80, oy + 75, ox + 440, oy + 430), radius=20, fill=CREAM, outline=(192, 206, 220), width=2)
    for yy in (130, 170, 210):
        draw.line((ox + 125, oy + yy, ox + 370, oy + yy), fill=(75, 92, 112), width=7)
    pts = [(ox + 110, oy + 365), (ox + 190, oy + 320), (ox + 260, oy + 350), (ox + 345, oy + 250), (ox + 430, oy + 285), (ox + 545, oy + 160)]
    draw.line(pts, fill=GOLD, width=9, joint="curve")
    for x, y in pts:
        draw.ellipse((x-10, y-10, x+10, y+10), fill=WHITE, outline=GOLD, width=4)
    draw.polygon([(ox + 545, oy + 160), (ox + 515, oy + 175), (ox + 535, oy + 200)], fill=GOLD)


def _draw_robotics(draw, ox: int, oy: int):
    # Two simple industrial arms.
    for base_x, flip in ((ox + 175, 1), (ox + 415, -1)):
        draw.rounded_rectangle((base_x-65, oy+360, base_x+65, oy+410), radius=14, fill=(33, 78, 115), outline=GOLD, width=2)
        p1=(base_x, oy+355); p2=(base_x+flip*75, oy+260); p3=(base_x+flip*25, oy+160)
        draw.line((*p1,*p2), fill=CREAM, width=30)
        draw.line((*p2,*p3), fill=CYAN, width=28)
        for p in (p1,p2,p3):
            draw.ellipse((p[0]-21,p[1]-21,p[0]+21,p[1]+21), fill=GOLD, outline=WHITE, width=3)
        draw.line((p3[0],p3[1],p3[0]-35,p3[1]-48), fill=CREAM, width=10)
        draw.line((p3[0],p3[1],p3[0]+35,p3[1]-48), fill=CREAM, width=10)


def _draw_business(draw, ox: int, oy: int):
    # Product cards / ad-like modules without mimicking a real UI.
    cards=[(85,80,320,210),(350,110,545,250),(120,255,350,415),(380,285,560,420)]
    for i,(x1,y1,x2,y2) in enumerate(cards):
        draw.rounded_rectangle((ox+x1,oy+y1,ox+x2,oy+y2),radius=20,fill=(18+7*i,57+8*i,94+7*i),outline=GOLD if i==0 else (88,132,170),width=3)
        draw.ellipse((ox+x1+20,oy+y1+20,ox+x1+52,oy+y1+52),fill=GOLD if i<2 else CYAN)
        for yy in (y1+78,y1+102):
            draw.line((ox+x1+22,oy+yy,ox+x2-25,oy+yy),fill=MUTED,width=5)


def _draw_general(draw, ox: int, oy: int):
    _draw_model(draw, ox, oy)


MOTIFS = {
    "policy": _draw_policy,
    "provenance": _draw_provenance,
    "model": _draw_model,
    "infrastructure": _draw_infrastructure,
    "finance": _draw_finance,
    "robotics": _draw_robotics,
    "business": _draw_business,
    "general": _draw_general,
}


def _render_editorial(root: Path, story: dict) -> str:
    Image, ImageDraw, ImageFont = _pil()
    font = _font_factory(ImageFont)
    image = _linear_gradient(Image, ImageDraw)
    draw = ImageDraw.Draw(image, "RGB")

    # Subtle geometric newsroom texture.
    for x in range(0, W, 72):
        draw.line((x, 0, x, H), fill=(12, 45, 78), width=1)
    for y in range(0, H, 72):
        draw.line((0, y, W, y), fill=(12, 45, 78), width=1)

    # Editorial spine and rank marker.
    rank = int(story.get("rank") or 0)
    draw.rectangle((0, 0, 14, H), fill=GOLD)
    draw.rounded_rectangle((52, 46, 205, 84), radius=19, fill=GOLD)
    draw.text((74, 56), f"STORY 0{rank}", font=font(18, True), fill=NAVY)

    category = str(story.get("category") or "AI NEWS")
    draw.text((52, 112), category.upper(), font=font(19, True), fill=CYAN)

    title = str(story.get("title") or "AIson 今日新聞")
    title_font = font(42, True)
    lines = _wrap(draw, title, title_font, 545, 4)
    y = 158
    for line in lines:
        draw.text((52, y), line, font=title_font, fill=WHITE)
        y += 57

    tags = [str(x).strip() for x in (story.get("tags") or []) if str(x).strip()][:3]
    tag_text = " · ".join(tags)
    if tag_text:
        draw.text((54, 507), tag_text, font=font(16), fill=MUTED)

    draw.line((52, 548, 585, 548), fill=(78, 109, 139), width=2)
    draw.text((52, 568), "AIson EDITORIAL VISUAL", font=font(15, True), fill=GOLD)
    draw.text((292, 568), "Story-specific fallback · no mascot", font=font(14), fill=MUTED)

    # Visual subject on the right half.
    template = _story_template(story)
    MOTIFS[template](draw, 610, 65)

    # Template label and visual authenticity marker.
    draw.rounded_rectangle((882, 535, 1147, 583), radius=24, fill=(10, 38, 70), outline=(104, 139, 170), width=2)
    draw.text((914, 548), f"{template.upper()} · EDITORIAL", font=font(14, True), fill=CREAM)

    target = root / REL_AUTO_DIR / f"{_slug(story.get('id'))}.webp"
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, "WEBP", quality=88, method=6)
    return target.relative_to(root).as_posix()


def ensure_top3(root: Path, daily_file: Path, *, force: bool = False) -> dict:
    stories = _load_stories(daily_file)
    top = _top3(stories)
    generated: list[str] = []
    preserved: list[str] = []

    for story in top:
        sid = str(story.get("id") or "story")
        if not force and _has_valid_visual(root, story):
            preserved.append(sid)
            continue

        src = _render_editorial(root, story)
        story["visual"] = {
            "kind": "aison-original",
            "src": src,
            "alt": f"{story.get('title', 'AIson 新聞')}｜AIson 編輯圖像",
            "credit": "AIson Editorial Illustration",
            "generated": True,
            "template": _story_template(story),
        }
        generated.append(sid)

    # Hard gate: Top 3 must all leave this step with a valid local visual.
    failures = []
    for story in top:
        if not _has_valid_visual(root, story):
            failures.append(str(story.get("id") or "?"))
    if failures:
        raise SystemExit("Top 3 Guaranteed Visuals failed: " + ", ".join(failures))

    daily_file.write_text(json.dumps(stories, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    result = {
        "dailyFile": str(daily_file),
        "generated": generated,
        "preserved": preserved,
        "top3": [str(s.get("id")) for s in top],
    }
    print(
        f"[top3-visuals] guaranteed 3/3: {len(preserved)} preserved, "
        f"{len(generated)} generated"
    )
    for sid in generated:
        print(f"[top3-visuals] generated: {sid}")
    for sid in preserved:
        print(f"[top3-visuals] preserved: {sid}")
    return result


def self_test() -> None:
    Image, _ImageDraw, _ImageFont = _pil()
    del Image
    with tempfile.TemporaryDirectory(prefix="aison-top3-") as tmp:
        root = Path(tmp)
        daily_dir = root / "content" / "daily"
        daily_dir.mkdir(parents=True)
        # Existing visual fixture must survive untouched.
        official = root / "assets" / "editorial" / "auto" / "official.webp"
        official.parent.mkdir(parents=True, exist_ok=True)
        # Create a sufficiently large valid image.
        Img, _D, _F = _pil()
        Img.new("RGB", (800, 450), NAVY).save(official, "WEBP", quality=80)

        stories = [
            {
                "id": "policy-story", "rank": 1, "title": "City council AI safety hearing",
                "category": "AI 政策", "tags": ["hearing", "audit"],
            },
            {
                "id": "official-story", "rank": 2, "title": "Official model launch",
                "category": "AI 模型", "tags": ["model"],
                "visual": {
                    "kind": "official-press",
                    "src": "assets/editorial/auto/official.webp",
                    "alt": "Official launch image",
                    "credit": "Example Company",
                    "sourceUrl": "https://example.com/news",
                },
            },
            {
                "id": "watermark-story", "rank": 3, "title": "Text watermark provenance signal",
                "category": "AI 內容來源", "tags": ["watermark", "provenance"],
            },
        ]
        daily_file = daily_dir / "2099-01-01.json"
        daily_file.write_text(json.dumps(stories, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        result = ensure_top3(root, daily_file)
        final = _load_stories(daily_file)
        assert len(result["generated"]) == 2
        assert result["preserved"] == ["official-story"]
        assert final[1]["visual"]["kind"] == "official-press"
        assert final[0]["visual"]["kind"] == "aison-original"
        assert final[0]["visual"]["template"] == "policy"
        assert final[2]["visual"]["template"] == "provenance"
        assert all(_has_valid_visual(root, story) for story in _top3(final))
        assert "mascot" not in daily_file.read_text(encoding="utf-8").lower()
        print("Top 3 guaranteed visuals self-test passed.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=ROOT, help="repository root")
    parser.add_argument("--daily-file", type=Path, default=None, help="specific daily JSON file")
    parser.add_argument("--force", action="store_true", help="regenerate even when a valid visual already exists")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return

    root = args.root.resolve()
    daily_file = args.daily_file.resolve() if args.daily_file else _latest_daily_file(root / "content" / "daily")
    if not daily_file.is_file():
        raise SystemExit(f"Daily file not found: {daily_file}")
    ensure_top3(root, daily_file, force=args.force)


if __name__ == "__main__":
    main()
