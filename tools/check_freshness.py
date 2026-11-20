#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime, timezone
import publication
import argparse
import json
import re
import sys
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
DAILY_DIR=ROOT/'content'/'daily'
BASE='https://aison.hk/'



def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def validate_source(date):
    try:
        from publication import validate_pair
        rows, meta = validate_pair(date, ROOT)
        return True, f'paired source ok: {date}, {len(rows)} stories, top3Ids={meta["top3Ids"]}'
    except (Exception, SystemExit) as exc:
        return False, f'paired source invalid: {exc}'


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
    stamp=datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
    try:
        status=parse_status(fetch_text(BASE+f'data/status.js?health={stamp}'))
        latest=parse_latest(fetch_text(BASE+f'data/latest.js?health={stamp}'))
    except Exception as exc:
        return False,f'public fetch/parse failed: {exc}'
    edition=str(status.get('editionDate') or '')
    if edition!=date:
        return False,f'public editionDate is {edition or "missing"}, expected {date}'
    if not isinstance(latest,list) or not 1 <= len(latest) <= 10:
        return False,f'public latest payload has {len(latest) if isinstance(latest,list) else "invalid"} stories, expected 1..10'
    source_path=DAILY_DIR/f'{date}.json'
    if source_path.exists():
        expected=read_json(source_path)
        if isinstance(expected,list):
            if len(latest)!=len(expected):
                return False,f'public latest has {len(latest)} stories; source has {len(expected)}'
            if {x.get('id') for x in latest}!={x.get('id') for x in expected}:
                return False,'public latest story IDs differ from source edition'
    if any(str(x.get('date',''))!=date for x in latest):
        return False,f'public latest payload contains a non-{date} story'
    try:
        ranks={int(x.get('rank',0)) for x in latest}
    except Exception:
        return False,'public latest payload has invalid ranks'
    if ranks!=set(range(1,len(latest)+1)):
        return False,f'public latest ranks are {sorted(ranks)}, expected consecutive ranks'
    try:
        from publication import receipt
        import hashlib
        published = json.loads(fetch_text(BASE+f'data/publication.json?health={stamp}'))
        expected = receipt(date, ROOT)
        for key, value in expected.items():
            if published.get(key) != value:
                raise ValueError(f'publication receipt differs: {key}')
        for name, digest in published['artifacts'].items():
            if name not in ('data/latest.js', 'data/editorial.js', 'index.html', 'daily.html'):
                raise ValueError('unexpected publication artifact')
            actual = hashlib.sha256(fetch_text(BASE+name+f'?health={stamp}').encode()).hexdigest()
            if actual != digest:
                raise ValueError(f'public {name} hash differs from deployment receipt')
        if set(published['artifacts']) != {'data/latest.js', 'data/editorial.js', 'index.html', 'daily.html'}:
            raise ValueError('publication artifact hashes missing')
    except (Exception, SystemExit) as exc:
        return False, f'publication verification failed: {exc}'
    return True,f'live ok: editionDate={edition}, {len(latest)} current stories'


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--source-only',action='store_true')
    parser.add_argument('--live-only',action='store_true')
    parser.add_argument('--date',default='')
    args=parser.parse_args()
    date=args.date or publication.due_date()
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
