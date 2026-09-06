#!/usr/bin/env python3
from pathlib import Path
from collections import Counter
import json

ROOT = Path(__file__).resolve().parents[1]
DAILY_DIR = ROOT / 'content' / 'daily'
EDITORIAL_DIR = ROOT / 'content' / 'editorial'
DATA_DIR = ROOT / 'data'


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def latest_daily_path():
    paths = sorted(DAILY_DIR.glob('*.json'), key=lambda p: p.stem, reverse=True)
    if not paths:
        raise SystemExit('no daily editions found')
    return paths[0]


def validate_daily(path):
    items = read_json(path)
    if not isinstance(items, list) or len(items) != 10:
        raise SystemExit(f'{path}: daily edition must contain exactly 10 stories')
    items = sorted(items, key=lambda x: int(x.get('rank', 999)))
    if {int(x.get('rank', 0)) for x in items} != set(range(1, 11)):
        raise SystemExit(f'{path}: local ranks must be exactly 1..10')
    if any(str(x.get('date', '')) != path.stem for x in items):
        raise SystemExit(f'{path}: story date must match edition date')
    if len({x.get('id') for x in items}) != 10:
        raise SystemExit(f'{path}: story ids must be unique')
    return items


def fallback_meta(date, items):
    counts = Counter(x.get('category') or 'AI' for x in items)
    cats = [name for name, _ in counts.most_common(3)]
    lead = items[0]
    one_liner = f"今日焦點集中喺{'、'.join(cats)}；最值得留意係「{lead.get('title','今日焦點')}」。"
    themes = []
    for cat in cats:
        related = [x for x in items if (x.get('category') or 'AI') == cat]
        themes.append({
            'title': cat,
            'summary': f"今日有 {len(related)} 則相關重點，代表呢個主題係今期其中一條主要訊號。",
            'watch': related[0].get('whatToWatch') or '留意下一輪正式公告、產品更新或監管進展。'
        })
    while len(themes) < 3:
        themes.append({
            'title': '其他重要變化',
            'summary': '今日其餘新聞亦反映 AI 產品、政策與基建正同步變化。',
            'watch': '留意下一個正式確認或可量化進展。'
        })
    return {
        'date': date,
        'dailyOneLiner': one_liner,
        'top3Ids': [x['id'] for x in items[:3]],
        'threeThemes': themes[:3],
        'biggestChange': lead.get('take') or lead.get('whyImportant') or one_liner,
        'watchTomorrow': lead.get('whatToWatch') or '留意今日主要事件會否有正式後續。',
        'source': 'fallback'
    }


def validate_meta(meta, date, items):
    if not isinstance(meta, dict):
        raise SystemExit('editorial metadata must be an object')
    required = {'date', 'dailyOneLiner', 'top3Ids', 'threeThemes', 'biggestChange', 'watchTomorrow'}
    missing = required - set(meta)
    if missing:
        raise SystemExit(f'editorial metadata missing {sorted(missing)}')
    if str(meta['date']) != date:
        raise SystemExit(f'editorial metadata date must equal {date}')
    ids = {x['id'] for x in items}
    top3 = meta['top3Ids']
    if not isinstance(top3, list) or len(top3) != 3 or len(set(top3)) != 3 or not set(top3) <= ids:
        raise SystemExit('top3Ids must contain exactly 3 unique ids from the same daily edition')
    themes = meta['threeThemes']
    if not isinstance(themes, list) or len(themes) != 3:
        raise SystemExit('threeThemes must contain exactly 3 themes')
    for index, theme in enumerate(themes, 1):
        if not isinstance(theme, dict) or not all(str(theme.get(k, '')).strip() for k in ('title', 'summary', 'watch')):
            raise SystemExit(f'threeThemes[{index}] needs title, summary and watch')
    for key in ('dailyOneLiner', 'biggestChange', 'watchTomorrow'):
        if not str(meta.get(key, '')).strip():
            raise SystemExit(f'{key} must be non-empty')
    out = dict(meta)
    out['source'] = 'editorial'
    return out


def build_editorial_payload():
    daily_path = latest_daily_path()
    date = daily_path.stem
    items = validate_daily(daily_path)
    meta_path = EDITORIAL_DIR / f'{date}.json'
    if meta_path.exists():
        meta = validate_meta(read_json(meta_path), date, items)
    else:
        meta = fallback_meta(date, items)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    out_path = DATA_DIR / 'editorial.js'
    out_path.write_text('window.AISON_EDITORIAL = ' + json.dumps(meta, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
    return meta


if __name__ == '__main__':
    meta = build_editorial_payload()
    print(f"Built editorial metadata: {meta['date']} / {meta['source']}")
