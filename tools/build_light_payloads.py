#!/usr/bin/env python3
from pathlib import Path
import html
import json
import re

ROOT = Path(__file__).resolve().parents[1]
NEWS_JS = ROOT / 'data/news.js'
LATEST_JS = ROOT / 'data/latest.js'
NEWS_DIR = ROOT / 'news'


def load_news():
    text = NEWS_JS.read_text(encoding='utf-8').strip()
    prefix = 'window.AISON_NEWS = '
    if not text.startswith(prefix):
        raise SystemExit('data/news.js has unexpected format')
    payload = text[len(prefix):]
    if payload.endswith(';'):
        payload = payload[:-1]
    data = json.loads(payload)
    if not isinstance(data, list) or not data:
        raise SystemExit('data/news.js must contain a non-empty array')
    return sorted(data, key=lambda n: int(n.get('rank', 999999)))


def safe_json(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')


def write_latest(data):
    latest = data[:10]
    if len(latest) != 10 or {int(n.get('rank', 0)) for n in latest} != set(range(1, 11)):
        raise SystemExit('latest payload must contain global ranks 1..10')
    LATEST_JS.write_text('window.AISON_NEWS = ' + safe_json(latest) + ';\n', encoding='utf-8')
    return latest


def related_for(current, data, limit=8):
    current_tags = set(current.get('tags') or [])
    scored = []
    for story in data:
        if story.get('id') == current.get('id'):
            continue
        shared = current_tags.intersection(story.get('tags') or [])
        score = (4 if story.get('category') == current.get('category') else 0) + len(shared) * 3
        scored.append((score, str(story.get('date', '')), -int(story.get('rank', 999999)), story))
    scored.sort(key=lambda item: (item[0], item[1], item[2]), reverse=True)
    return [item[-1] for item in scored[:limit]]


def article_subset(current, data):
    selected = [current, *data[:10], *related_for(current, data, limit=3)]
    out = []
    seen = set()
    for story in selected:
        sid = story.get('id')
        if not sid or sid in seen:
            continue
        seen.add(sid)
        out.append(story)
    return out


def patch_article_pages(data):
    if not NEWS_DIR.exists():
        raise SystemExit('news directory missing; run tools/build.py first')
    by_id = {n['id']: n for n in data}
    script_pattern = re.compile(r'<script src="data/news\.js[^\"]*"></script>')
    patched = 0
    for path in NEWS_DIR.glob('*.html'):
        text = path.read_text(encoding='utf-8')
        match = re.search(r'window\.AISON_ARTICLE_ID=("(?:[^"\\]|\\.)*")', text)
        if not match:
            raise SystemExit(f'{path}: missing AISON_ARTICLE_ID')
        story_id = json.loads(match.group(1))
        current = by_id.get(story_id)
        if not current:
            raise SystemExit(f'{path}: unknown story id {story_id}')
        subset = article_subset(current, data)
        inline = '<script>window.AISON_NEWS=' + safe_json(subset) + ';</script>'
        new_text, count = script_pattern.subn(lambda _match: inline, text, count=1)
        if count != 1:
            raise SystemExit(f'{path}: expected one full news payload script')
        if 'src="data/news.js' in new_text:
            raise SystemExit(f'{path}: full news payload reference still present')
        path.write_text(new_text, encoding='utf-8')
        patched += 1
    if patched != len(data):
        raise SystemExit(f'patched article count {patched} != story count {len(data)}')
    return patched



def _escape_html(value):
    return html.escape(str(value or ''), quote=True)


def _home_fallback(data):
    lead, *secondary = data[:3]
    if len(secondary) != 2:
        raise SystemExit('homepage fallback requires at least three stories')

    def meta(story, rank):
        verified = '<b>✓ 已核實</b>' if story.get('verified') else ''
        category = _escape_html(story.get('category') or 'AI 新聞')
        read_time = _escape_html(story.get('readTime') or '完整報道')
        return (
            '<div class="front-story-meta">'
            f'<span class="front-story-number">{rank:02d}</span>'
            f'<span>{category}</span>{verified}'
            '</div>'
        ), read_time

    lead_meta, lead_read_time = meta(lead, 1)
    lead_id = _escape_html(lead.get('id'))
    lead_title = _escape_html(lead.get('title'))
    lead_excerpt = _escape_html(lead.get('excerpt') or lead.get('summary'))
    lead_date = _escape_html(lead.get('date'))
    lead_category = _escape_html(lead.get('category') or 'AI NEWS')
    lead_quick_take = _escape_html(lead.get('quickTake') or lead.get('summary') or lead.get('excerpt'))
    lead_card = (
        f'<a class="front-story lead" href="news/{lead_id}.html">'
        f'<div class="lead-story-copy">{lead_meta}<h2>{lead_title}</h2>'
        f'<p>{lead_excerpt}</p><small>{lead_date} · {lead_read_time}</small></div>'
        f'<div class="lead-story-art" aria-hidden="true"><span>TOP<br>{lead_category}</span>'
        '<b>01</b><i>AIson<br>DAILY</i></div></a>'
    )

    side_cards = []
    for index, story in enumerate(secondary, start=2):
        story_meta, read_time = meta(story, index)
        story_id = _escape_html(story.get('id'))
        title = _escape_html(story.get('title'))
        excerpt = _escape_html(story.get('excerpt') or story.get('summary'))
        date = _escape_html(story.get('date'))
        side_cards.append(
            f'<a class="front-story secondary" href="news/{story_id}.html">'
            f'{story_meta}<h2>{title}</h2><p>{excerpt}</p>'
            f'<small>{date} · {read_time}</small></a>'
        )

    return (
        '<div class="container" id="editorialFeature">'
        '<header class="newsroom-header"><div class="newsroom-edition">'
        '<span>AIson DAILY</span>'
        f'<time>{_escape_html(lead.get("date"))}</time></div>'
        '<h1 id="editorialFeatureTitle">今日 AI 新聞</h1>'
        f'<p>{lead_quick_take}</p></header>'
        '<div class="frontpage-grid">' + lead_card
        + '<div class="frontpage-secondary">' + ''.join(side_cards) + '</div></div></div>'
    )


def _daily_fallback(data):
    items = []
    for index, story in enumerate(data[:10], start=1):
        story_id = _escape_html(story.get('id'))
        title = _escape_html(story.get('title'))
        category = _escape_html(story.get('category') or 'AI')
        excerpt = _escape_html(story.get('excerpt') or '')
        summary = _escape_html(story.get('summary') or story.get('excerpt') or '')
        why = _escape_html(story.get('whyImportant') or '')
        take = _escape_html(story.get('take') or '')
        verified = '<span class="source-badge">✓ 已核實</span>' if story.get('verified') else ''
        items.append(
            '<article class="daily-item">'
            f'<div class="daily-rank">{index:02d}</div><div>'
            f'<div class="daily-meta"><span class="tag">{category}</span>{verified}</div>'
            f'<h2><a href="news/{story_id}.html">{title}</a></h2>'
            f'<p class="daily-excerpt">{excerpt}</p>'
            f'<div class="daily-summary"><b>事件脈絡</b><span>{summary}</span></div>'
            f'<div class="daily-why"><b>點解重要</b><span>{why}</span></div>'
            f'<div class="daily-take"><b>🐶 AIson Take</b><span>{take}</span></div>'
            f'<a class="text-link" href="news/{story_id}.html">睇完整報導與香港影響 →</a>'
            '</div></article>'
        )
    return ''.join(items)


def patch_static_fallbacks(data):
    if len(data) < 10:
        raise SystemExit('static fallbacks require at least ten latest stories')

    home_path = ROOT / 'index.html'
    home = home_path.read_text(encoding='utf-8')
    home_marker = (
        '<div class="container" id="editorialFeature">'
        '<div class="editorial-skeleton" role="status" aria-label="正在載入今日頭條">'
        '<span></span><i></i><i></i><i></i></div></div>'
    )
    if home.count(home_marker) != 1:
        raise SystemExit('homepage fallback placeholder changed; update build_light_payloads.py')
    home_path.write_text(home.replace(home_marker, _home_fallback(data), 1), encoding='utf-8')

    daily_path = ROOT / 'daily.html'
    daily = daily_path.read_text(encoding='utf-8')
    daily_marker = '<div class="daily-list" id="dailyList"></div>'
    if daily.count(daily_marker) != 1:
        raise SystemExit('daily fallback placeholder changed; update build_light_payloads.py')
    daily = daily.replace(
        daily_marker,
        '<div class="daily-list" id="dailyList">' + _daily_fallback(data) + '</div>',
        1,
    )
    count_marker = 'id="dailyRankingCount" aria-live="polite">正在載入完整排行榜…</p>'
    if daily.count(count_marker) != 1:
        raise SystemExit('daily ranking status placeholder changed; update build_light_payloads.py')
    daily = daily.replace(
        count_marker,
        'id="dailyRankingCount" aria-live="polite">今日精選 10 則；完整排行榜由互動版載入。</p>',
        1,
    )
    daily_path.write_text(daily, encoding='utf-8')

def main():
    data = load_news()
    latest = write_latest(data)
    patched = patch_article_pages(data)
    patch_static_fallbacks(data)
    print(f'Built lightweight payloads: {len(latest)} latest stories / {patched} article pages patched / static fallbacks written')


if __name__ == '__main__':
    main()
