#!/usr/bin/env python3
from pathlib import Path
import os, shutil

CARD_LIMIT = 120
W, H = 1200, 630
NAVY = (6, 26, 58)
YELLOW = (255, 198, 20)
CREAM = (255, 249, 232)
WHITE = (255, 255, 255)
MUTED = (92, 106, 130)
LIGHT = (241, 244, 249)
GOLD = (107, 78, 0)
GREEN = (24, 110, 78)

FONT_REGULAR_CANDIDATES = [
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/opentype/noto/NotoSansCJKtc-Regular.otf',
    '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
]
FONT_BOLD_CANDIDATES = [
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
    '/usr/share/fonts/opentype/noto/NotoSansCJKtc-Bold.otf',
    '/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc',
]

def _required():
    return os.getenv('AISON_REQUIRE_SOCIAL_CARDS', '').strip() == '1'

def _find_font(candidates):
    custom = os.getenv('AISON_SOCIAL_FONT', '').strip()
    if custom and Path(custom).exists():
        return custom
    return next((p for p in candidates if Path(p).exists()), None)

def _wrap(draw, text, font, max_width, max_lines):
    text = str(text or '').strip()
    if not text:
        return []
    lines, current, used = [], '', 0
    for index, ch in enumerate(text):
        test = current + ch
        if draw.textlength(test, font=font) <= max_width or not current:
            current = test
        else:
            lines.append(current.strip())
            current = ch
            if len(lines) >= max_lines:
                used = index
                break
    else:
        used = len(text)
    if len(lines) < max_lines and current:
        lines.append(current.strip())
    if used < len(text) and lines:
        last = lines[-1]
        while last and draw.textlength(last + '…', font=font) > max_width:
            last = last[:-1]
        lines[-1] = last.rstrip() + '…'
    return lines[:max_lines]

def _render_card(story, mascot_path, output_path, Image, ImageDraw, ImageFont, ImageOps, regular_font, bold_font):
    def font(size, bold=False):
        return ImageFont.truetype(bold_font if bold else regular_font, size)

    image = Image.new('RGB', (W, H), CREAM)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((24, 24, W - 24, H - 24), radius=34, fill=WHITE)
    draw.rounded_rectangle((28, 28, W - 28, H - 28), radius=32, outline=(226, 230, 238), width=2)

    draw.rounded_rectangle((52, 52, 198, 96), radius=22, fill=YELLOW)
    draw.text((75, 59), 'AIson', font=font(24, True), fill=NAVY)
    draw.text((215, 59), '香港人的每日 AI 新聞站', font=font(20, True), fill=NAVY)

    category = str(story.get('category') or 'AI 新聞')
    category_font = font(18, True)
    category_width = draw.textlength(category, font=category_font)
    draw.rounded_rectangle((55, 122, 55 + category_width + 36, 160), radius=19, fill=LIGHT)
    draw.text((73, 128), category, font=category_font, fill=NAVY)
    draw.text((55 + category_width + 52, 130), str(story.get('date') or ''), font=font(16), fill=MUTED)
    if story.get('verified'):
        draw.text((55 + category_width + 172, 130), '已核實', font=font(16, True), fill=GREEN)

    rank = str(story.get('rank') or '').zfill(2)
    draw.text((55, 181), rank, font=font(32, True), fill=YELLOW)
    draw.text((112, 190), 'AI REPORT', font=font(16, True), fill=MUTED)

    title = str(story.get('title') or '')
    title_font_size = 54
    while title_font_size >= 42:
        title_font = font(title_font_size, True)
        title_lines = _wrap(draw, title, title_font, 670, 4)
        if len(title_lines) * (title_font_size + 10) <= 235:
            break
        title_font_size -= 2
    y = 230
    for line in title_lines:
        draw.text((55, y), line, font=title_font, fill=NAVY)
        y += title_font_size + 10

    impacts = story.get('hkImpact') or []
    impact = str(impacts[0] if impacts else '了解這項 AI 變化對香港人的實際影響。')
    impact_font = font(18)
    impact_lines = _wrap(draw, impact, impact_font, 650, 2)
    box_y = 485
    draw.rounded_rectangle((55, box_y, 745, 565), radius=18, fill=(255, 246, 196))
    draw.text((75, box_y + 12), '香港角度', font=font(17, True), fill=GOLD)
    impact_y = box_y + 37
    for line in impact_lines:
        draw.text((75, impact_y), line, font=impact_font, fill=NAVY)
        impact_y += 25
    draw.text((55, 584), 'aison.hk', font=font(17, True), fill=MUTED)

    center_x, center_y, size = 955, 316, 410
    draw.ellipse((center_x - size // 2 - 10, center_y - size // 2 - 10, center_x + size // 2 + 10, center_y + size // 2 + 10), fill=YELLOW)
    mascot = Image.open(mascot_path).convert('RGB')
    mascot = ImageOps.fit(mascot, (size, size), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    image.paste(mascot, (center_x - size // 2, center_y - size // 2), mask)
    draw.ellipse((center_x - size // 2, center_y - size // 2, center_x + size // 2, center_y + size // 2), outline=WHITE, width=8)

    draw.rounded_rectangle((825, 520, 1105, 575), radius=18, fill=NAVY)
    draw.ellipse((850, 538, 866, 554), fill=YELLOW)
    draw.text((884, 530), 'AIson Take', font=font(22, True), fill=WHITE)

    image.save(output_path, 'JPEG', quality=84, optimize=True, progressive=True, subsampling='4:2:0')

def build_social_cards(data, site, root, limit=CARD_LIMIT):
    try:
        from PIL import Image, ImageDraw, ImageFont, ImageOps
    except Exception as exc:
        if _required():
            raise SystemExit(f'Social cards required but Pillow is unavailable: {exc}')
        print('Social cards skipped: Pillow unavailable; article pages will use the generic AIson image.')
        return set()

    regular_font = _find_font(FONT_REGULAR_CANDIDATES)
    bold_font = _find_font(FONT_BOLD_CANDIDATES)
    mascot = Path(root) / 'assets' / 'mascot.webp'
    if not regular_font or not bold_font or not mascot.exists():
        detail = f'font={regular_font or "missing"}, bold={bold_font or "missing"}, mascot={mascot.exists()}'
        if _required():
            raise SystemExit(f'Social cards required but renderer assets are unavailable: {detail}')
        print(f'Social cards skipped: {detail}')
        return set()

    out_dir = Path(root) / 'assets' / 'social'
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    selected = list(data)[:limit]
    for story in selected:
        _render_card(story, mascot, out_dir / f"{story['id']}.jpg", Image, ImageDraw, ImageFont, ImageOps, regular_font, bold_font)

    cards = list(out_dir.glob('*.jpg'))
    if len(cards) != len(selected):
        raise SystemExit(f'Social card count mismatch: expected {len(selected)}, got {len(cards)}')
    print(f'Built {len(cards)} AIson social cards (1200x630).')
    return {story['id'] for story in selected}
