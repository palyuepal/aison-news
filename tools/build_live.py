#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import json

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'content/live.json'
OUT=ROOT/'data/live.js'

REQUIRED={'id','title','summary','category','publishedAt','sourceLabel','sourceUrl','verified','active'}

def fail(msg):
    raise SystemExit(msg)

def main():
    data=json.loads(SOURCE.read_text(encoding='utf-8'))
    if not isinstance(data,list):
        fail('content/live.json must be an array')
    if len(data)>20:
        fail('content/live.json keeps at most 20 recent live items')
    seen=set()
    for item in data:
        if not isinstance(item,dict):
            fail('each live item must be an object')
        missing=REQUIRED-set(item)
        if missing:
            fail(f"{item.get('id','?')} missing {sorted(missing)}")
        if item['id'] in seen:
            fail(f"duplicate live id {item['id']}")
        seen.add(item['id'])
        if not isinstance(item['verified'],bool) or not isinstance(item['active'],bool):
            fail(f"{item['id']} verified/active must be boolean")
        if item['verified'] and not str(item['sourceUrl']).startswith('https://'):
            fail(f"{item['id']} verified live item needs https sourceUrl")
        try:
            datetime.fromisoformat(str(item['publishedAt']).replace('Z','+00:00'))
        except Exception:
            fail(f"{item['id']} publishedAt must be ISO-8601")
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text('window.AISON_LIVE = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
    active=sum(1 for item in data if item.get('active'))
    print(f'Built AIson LIVE: {len(data)} stored / {active} active')

if __name__=='__main__':
    main()
