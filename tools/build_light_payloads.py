#!/usr/bin/env python3
from pathlib import Path
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
    selected = [current, *data[:5], *related_for(current, data)]
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


def main():
    data = load_news()
    latest = write_latest(data)
    patched = patch_article_pages(data)
    print(f'Built lightweight payloads: {len(latest)} latest stories / {patched} article pages patched')


if __name__ == '__main__':
    main()
