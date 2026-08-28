#!/usr/bin/env python3
"""Merge an AIson-format JSON batch into content/news.json, then rebuild.
Usage: python tools/import_batch.py content/inbox.json
"""
from pathlib import Path
import json, sys, subprocess
ROOT=Path(__file__).resolve().parents[1]
if len(sys.argv)!=2: raise SystemExit('Usage: python tools/import_batch.py <batch.json>')
news_path=ROOT/'content/news.json'; batch_path=Path(sys.argv[1])
news=json.loads(news_path.read_text(encoding='utf-8')); batch=json.loads(batch_path.read_text(encoding='utf-8'))
if not isinstance(batch,list): raise SystemExit('Batch must be a JSON array')
by_id={n['id']:n for n in news}
for n in batch:
    if 'id' not in n: raise SystemExit('Every story needs id')
    by_id[n['id']]=n
merged=list(by_id.values())
merged.sort(key=lambda x:(x.get('rank',999),x.get('date','')))
news_path.write_text(json.dumps(merged,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
subprocess.check_call([sys.executable,str(ROOT/'tools/build.py')])
print(f'Merged {len(batch)} stories; total {len(merged)}')
