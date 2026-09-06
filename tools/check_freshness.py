#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import argparse
import json
import re
import sys
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
DAILY_DIR=ROOT/'content'/'daily'
BASE='https://aison.hk/'


def hk_today():
    return datetime.now(ZoneInfo('Asia/Hong_Kong')).strftime('%Y-%m-%d')


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def validate_source(date):
    path=DAILY_DIR/f'{date}.json'
    if not path.exists():
        return False,f'missing {path.as_posix()}'
    try:
        rows=read_json(path)
    except Exception as exc:
        return False,f'{path.as_posix()} invalid JSON: {exc}'
    if not isinstance(rows,list) or len(rows)!=10:
        return False,f'{path.as_posix()} must contain exactly 10 stories'
    try:
        ranks={int(r.get('rank',0)) for r in rows}
    except Exception:
        return False,f'{path.as_posix()} contains invalid rank values'
    if ranks!=set(range(1,11)):
        return False,f'{path.as_posix()} local ranks must be exactly 1..10'
    if any(str(r.get('date',''))!=date for r in rows):
        return False,f'{path.as_posix()} story dates do not all match {date}'
    if len({r.get('id') for r in rows})!=10:
        return False,f'{path.as_posix()} story ids must be unique'
    return True,f'source ok: {path.as_posix()}'


def fetch_text(url):
    req=urllib.request.Request(url,headers={'User-Agent':'AIson-healthcheck/1.0','Cache-Control':'no-cache'})
    with urllib.request.urlopen(req,timeout=20) as response:
        return response.read().decode('utf-8','replace')


def parse_status(text):
    match=re.search(r'window\.AISON_STATUS\s*=\s*(\{.*\})\s*;?\s*$',text,re.S)
    if not match:
        raise ValueError('could not parse window.AISON_STATUS')
    return json.loads(match.group(1))


def parse_latest(text):
    match=re.search(r'window\.AISON_NEWS\s*=\s*(\[.*\])\s*;?\s*$',text,re.S)
    if not match:
        raise ValueError('could not parse window.AISON_NEWS')
    return json.loads(match.group(1))


def validate_live(date):
    stamp=datetime.utcnow().strftime('%Y%m%d%H%M%S')
    try:
        status=parse_status(fetch_text(BASE+f'data/status.js?health={stamp}'))
        latest=parse_latest(fetch_text(BASE+f'data/latest.js?health={stamp}'))
    except Exception as exc:
        return False,f'public fetch/parse failed: {exc}'
    edition=str(status.get('editionDate') or '')
    if edition!=date:
        return False,f'public editionDate is {edition or "missing"}, expected {date}'
    if not isinstance(latest,list) or len(latest)!=10:
        return False,f'public latest payload has {len(latest) if isinstance(latest,list) else "invalid"} stories, expected 10'
    if any(str(x.get('date',''))!=date for x in latest):
        return False,f'public latest payload contains a non-{date} story'
    try:
        ranks={int(x.get('rank',0)) for x in latest}
    except Exception:
        return False,'public latest payload has invalid ranks'
    if ranks!=set(range(1,11)):
        return False,f'public latest ranks are {sorted(ranks)}, expected 1..10'
    return True,f'live ok: editionDate={edition}, 10 current stories'


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--source-only',action='store_true')
    parser.add_argument('--live-only',action='store_true')
    parser.add_argument('--date',default='')
    args=parser.parse_args()
    date=args.date or hk_today()
    checks=[]
    if not args.live_only:
        checks.append(('source',)+validate_source(date))
    if not args.source_only:
        checks.append(('live',)+validate_live(date))
    failed=[]
    for name,ok,message in checks:
        prefix='OK' if ok else 'FAIL'
        print(f'[{prefix}] {name}: {message}')
        if not ok: failed.append(name)
    if failed:
        print('AIson freshness check failed: '+', '.join(failed),file=sys.stderr)
        raise SystemExit(1)
    print(f'AIson freshness check passed for {date}')


if __name__=='__main__':
    main()
