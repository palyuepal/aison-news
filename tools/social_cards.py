#!/usr/bin/env python3
from pathlib import Path
import os, shutil

CARD_LIMIT = 120
W, H = 1200, 630
NAVY = (6, 26, 58)
NAVY_2 = (2, 15, 34)
YELLOW = (255, 198, 20)
GOLD = (209, 157, 38)
WHITE = (255, 255, 255)
MUTED = (186, 196, 214)
GREEN = (28, 196, 132)

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

def _units(text):
    text = str(text or '')
    units = []
    i = 0
    spaced = False
    while i < len(text):
        ch = text[i]
        if ch.isspace():
            spaced = True
            i += 1
            continue
        if ch.isascii() and (ch.isalnum() or ch in '#+.$%&/-'):
            j = i + 1
            while j < len(text):
                c = text[j]
                if c.isascii() and (c.isalnum() or c in '#+.$%&/-'):
                    j += 1
                    continue
                if c == ' ' and j + 1 < len(text) and text[j + 1].isascii() and (text[j + 1].isalnum() or text[j + 1] in '#+.$%&/-'):
                    j += 1
                    continue
                break
            units.append((text[i:j].strip(), spaced))
            spaced = False
            i = j
            continue
        units.append((ch, spaced))
        spaced = False
        i += 1
    return [(unit, had_space) for unit, had_space in units if unit]

def _wrap_mixed(draw, text, font, max_width, max_lines):
    units = _units(text)
    lines = []
    current = ''
    consumed = 0
    for idx, (unit, had_space) in enumerate(units):
        sep = ' ' if current and had_space else ''
        test = current + sep + unit
        if not current or draw.textlength(test, font=font) <= max_width:
            current = test
        else:
            lines.append(current.strip())
            current = unit
            if len(lines) >= max_lines:
                consumed = idx
                break
    else:
        consumed = len(units)
    if len(lines) < max_lines and current:
        lines.append(current.strip())
    if consumed < len(units) and lines:
        last = lines[-1]
        while last and draw.textlength(last + '…', font=font) > max_width:
            last = last[:-1]
        lines[-1] = last.rstrip() + '…'
    return lines[:max_lines]

def _gradient_bg(Image, ImageDraw):
    image = Image.new('RGB', (W, H), NAVY_2)
    draw = ImageDraw.Draw(image)
    for x in range(W):
        t = x / max(1, W - 1)
        r = int(NAVY[0] * (1 - t) + NAVY_2[0] * t)
        g = int(NAVY[1] * (1 - t) + NAVY_2[1] * t)
        b = int(NAVY[2] * (1 - t) + NAVY_2[2] * t)
        draw.line((x, 0, x, H), fill=(r, g, b))
    return image

def _globe(image, ImageDraw, ImageFilter):
    glow = image.convert('RGBA')
    glow.putalpha(0)
    gdraw = ImageDraw.Draw(glow)
    cx, cy, radius = 945, 188, 250
    gdraw.ellipse((cx-radius-20, cy-radius-20, cx+radius+20, cy+radius+20), outline=(255, 202, 74, 180), width=22)
    glow = glow.filter(ImageFilter.GaussianBlur(18))
    image.paste(glow, (0, 0), glow)
    draw = ImageDraw.Draw(image)
    draw.ellipse((cx-radius, cy-radius, cx+radius, cy+radius), fill=(10, 29, 50), outline=(255, 201, 72), width=4)
    for inset in (40, 85, 130):
        draw.arc((cx-radius+inset, cy-radius, cx+radius-inset, cy+radius), 205, 335, fill=(212, 158, 45), width=2)
        draw.arc((cx-radius+inset, cy-radius, cx+radius-inset, cy+radius), 25, 155, fill=(212, 158, 45), width=2)
    for off in (-105, -45, 20, 85):
        draw.arc((cx-radius, cy-radius+off, cx+radius, cy+radius-off), 190, 350, fill=(122, 96, 45), width=2)
    pts = [(842,128),(906,88),(990,113),(1052,162),(930,183),(1012,214),(872,235),(1075,245)]
    links = [(0,1),(1,2),(2,3),(0,4),(4,5),(4,6),(5,7),(2,5)]
    for a, b in links:
        draw.line((pts[a], pts[b]), fill=(230, 176, 48), width=2)
    for x, y in pts:
        draw.ellipse((x-4, y-4, x+4, y+4), fill=(255, 220, 105))

def _cutout_mascot(mascot, Image, ImageDraw):
    rgba = mascot.convert('RGBA').resize((520, 520), Image.Resampling.LANCZOS)
    try:
        ImageDraw.floodfill(rgba, (260, 35), (0, 0, 0, 0), thresh=62)
        ImageDraw.floodfill(rgba, (45, 260), (0, 0, 0, 0), thresh=44)
    except Exception:
        pass
    px = rgba.load()
    cx = cy = 260
    for y in range(520):
        for x in range(520):
            rr = ((x-cx)**2 + (y-cy)**2) ** 0.5
            if rr > 246:
                r, g, b, a = px[x, y]
                px[x, y] = (r, g, b, 0)
            elif rr > 232:
                r, g, b, a = px[x, y]
                alpha = max(0, min(255, int((246-rr) / 14 * 255)))
                px[x, y] = (r, g, b, min(a, alpha))
    return rgba

def _draw_tag_panel(image, draw, label, xy, font, ImageFilter, ImageDraw):
    x, y, width, height = xy
    shadow = image.convert('RGBA')
    shadow.putalpha(0)
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle((x-8, y-8, x+width+8, y+height+8), radius=20, fill=(255, 193, 55, 65))
    shadow = shadow.filter(ImageFilter.GaussianBlur(12))
    image.paste(shadow, (0, 0), shadow)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((x, y, x+width, y+height), radius=20, fill=(4, 18, 37), outline=(215, 164, 56), width=2)
    symbol = (label[:1] or 'AI').upper()
    draw.ellipse((x+18, y+18, x+64, y+64), fill=YELLOW)
    bbox = draw.textbbox((0, 0), symbol, font=font(20, True))
    tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    draw.text((x+41-tw/2, y+41-th/2-2), symbol, font=font(20, True), fill=NAVY)
    ty = y + 20
    for line in _wrap_mixed(draw, label, font(18, True), width-92, 2):
        draw.text((x+78, ty), line, font=font(18, True), fill=WHITE)
        ty += 25

def _social_headline(story):
    title = str(story.get('title') or '').strip()
    tags = [str(t).strip() for t in (story.get('tags') or []) if str(t).strip()]
    lead = next((t for t in tags if title.startswith(t) and len(t) <= 24), '')
    if '收購' in title and lead:
        target = next((t for t in tags[1:] if t not in {'收購','產業','開源 AI','AI 基建'} and len(t) <= 24), '')
        if target:
            return f'{lead} 正式收購 {target}', lead
    short = title.split('，', 1)[0].split('；', 1)[0].split('。', 1)[0].strip()
    return short or title, lead if short.startswith(lead) else ''

def _render_card(story, mascot_path, output_path, Image, ImageDraw, ImageFont, ImageOps, ImageFilter, regular_font, bold_font):
    def font(size, bold=False):
        return ImageFont.truetype(bold_font if bold else regular_font, size)

    image = _gradient_bg(Image, ImageDraw)
    _globe(image, ImageDraw, ImageFilter)
    draw = ImageDraw.Draw(image)

    draw.polygon([(690,0),(835,0),(738,175),(651,237)], fill=(201,146,25))
    draw.polygon([(738,175),(835,0),(945,0),(790,250)], fill=(255,211,83))

    draw.text((42,32), 'AI', font=font(46, True), fill=YELLOW)
    ai_width = draw.textlength('AI', font=font(46, True))
    draw.text((42+ai_width,32), 'son', font=font(46, True), fill=WHITE)
    draw.line((188,42,188,88), fill=(152,166,188), width=2)
    draw.text((215,43), '香港人的每日 AI 新聞站', font=font(23, True), fill=WHITE)

    raw_category = str(story.get('category') or 'AI 新聞')
    category = ('AI ' + raw_category) if raw_category in {'產業','研究','產品','科學','創作','治理','政策'} else raw_category
    category_font = font(19, True)
    category_width = draw.textlength(category, font=category_font)
    draw.rounded_rectangle((42,112,42+category_width+38,154), radius=21, fill=YELLOW)
    draw.text((61,119), category, font=category_font, fill=NAVY)
    xmeta = 42 + category_width + 58
    date = str(story.get('date') or '')
    draw.text((xmeta,120), date, font=font(18), fill=MUTED)
    xmeta += draw.textlength(date, font=font(18)) + 24
    draw.line((xmeta,118,xmeta,149), fill=(114,130,156), width=2)
    xmeta += 18
    if story.get('verified'):
        draw.ellipse((xmeta,117,xmeta+34,151), fill=(35,134,255))
        draw.line((xmeta+9,134,xmeta+15,141), fill=WHITE, width=4)
        draw.line((xmeta+15,141,xmeta+26,126), fill=WHITE, width=4)
        draw.text((xmeta+46,120), '已核實', font=font(19, True), fill=WHITE)

    title = str(story.get('title') or '')
    tags = [str(t) for t in (story.get('tags') or []) if str(t).strip()]
    social_title, lead = _social_headline(story)
    body = social_title[len(lead):].strip(' ：:，,') if lead else social_title
    y = 177
    if lead:
        draw.text((42,y), lead, font=font(54, True), fill=YELLOW)
        y += 62
    body_size = 49 if lead else 52
    while body_size >= 40:
        body_font = font(body_size, True)
        title_lines = _wrap_mixed(draw, body, body_font, 650, 3 if lead else 4)
        if len(title_lines) * (body_size + 6) <= 190:
            break
        body_size -= 2
    for line in title_lines:
        draw.text((42,y), line, font=body_font, fill=WHITE)
        y += body_size + 6

    excerpt = str(story.get('excerpt') or '')
    excerpt_font = font(20)
    excerpt_y = max(y + 12, 365)
    for line in _wrap_mixed(draw, excerpt, excerpt_font, 650, 2):
        draw.text((42,excerpt_y), line, font=excerpt_font, fill=(218,224,235))
        excerpt_y += 30

    draw.rounded_rectangle((42,482,660,572), radius=22, fill=(37,34,28), outline=(255,202,60), width=2)
    draw.ellipse((64,502,120,558), fill=YELLOW)
    draw.text((80,510), 'HK', font=font(17, True), fill=NAVY)
    draw.line((137,499,137,555), fill=(220,168,47), width=2)
    draw.text((158,496), '香港角度', font=font(19, True), fill=YELLOW)
    impacts = story.get('hkImpact') or []
    impact = str(impacts[0] if impacts else '了解這項 AI 變化對香港人的實際影響。')
    impact_y = 524
    for line in _wrap_mixed(draw, impact, font(16), 475, 2):
        draw.text((158,impact_y), line, font=font(16), fill=WHITE)
        impact_y += 23

    mascot = Image.open(mascot_path)
    cutout = _cutout_mascot(mascot, Image, ImageDraw).resize((405,405), Image.Resampling.LANCZOS)
    image.paste(cutout, (690,185), cutout)
    draw = ImageDraw.Draw(image)

    panel_tags = []
    for tag in tags:
        if tag not in panel_tags and len(tag) <= 22 and tag not in {raw_category,category,'收購','研究','產品','開源 AI','AI 基建'}:
            panel_tags.append(tag)
        if len(panel_tags) >= 2:
            break
    if not panel_tags:
        panel_tags = [category]
    if len(panel_tags) == 1:
        panel_tags.append('AIson')
    _draw_tag_panel(image, draw, panel_tags[0], (970,160,205,100), font, ImageFilter, ImageDraw)
    draw = ImageDraw.Draw(image)
    draw.text((1057,273), '×', font=font(30, True), fill=YELLOW)
    _draw_tag_panel(image, draw, panel_tags[1], (970,302,205,100), font, ImageFilter, ImageDraw)
    draw = ImageDraw.Draw(image)

    draw.text((1007,36), 'TECH NEWS', font=font(13), fill=(180,190,207))
    draw.text((1007,59), 'FOR A BRIGHTER', font=font(13), fill=(180,190,207))
    draw.text((1007,82), 'TOMORROW', font=font(13), fill=(180,190,207))
    draw.line((1007,108,1051,108), fill=YELLOW, width=4)

    draw.text((42,592), 'aison.hk', font=font(16, True), fill=(210,218,232))
    draw.line((145,604,660,604), fill=(109,122,146), width=1)
    draw.line((690,604,720,604), fill=YELLOW, width=4)
    draw.text((742,592), 'AI  ×  PEOPLE  ×  A BRIGHTER HONG KONG', font=font(13), fill=(201,210,225))

    image.save(output_path, 'JPEG', quality=86, optimize=True, progressive=True, subsampling='4:2:0')

def build_social_cards(data, site, root, limit=CARD_LIMIT):
    try:
        from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter
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
        _render_card(story, mascot, out_dir / f"{story['id']}.jpg", Image, ImageDraw, ImageFont, ImageOps, ImageFilter, regular_font, bold_font)

    cards = list(out_dir.glob('*.jpg'))
    if len(cards) != len(selected):
        raise SystemExit(f'Social card count mismatch: expected {len(selected)}, got {len(cards)}')
    print(f'Built {len(cards)} AIson premium social cards (1200x630).')
    return {story['id'] for story in selected}
