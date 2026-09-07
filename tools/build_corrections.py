#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
from urllib.parse import urljoin
import argparse, html, json, re

ROOT=Path(__file__).resolve().parents[1]
DAILY=ROOT/'content/daily'
LEGACY=ROOT/'content/news.json'
SITE=ROOT/'content/site.json'
DATA=ROOT/'data/corrections.js'
NEWS_DIR=ROOT/'news'
SITEMAP=ROOT/'sitemap.xml'


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def iso_date(value,label):
    text=str(value or '')
    try: datetime.strptime(text,'%Y-%m-%d')
    except ValueError: raise SystemExit(f'{label} must be YYYY-MM-DD: {text!r}')
    return text


def load_items():
    rows=[]
    if DAILY.exists():
        for path in sorted(DAILY.glob('*.json')):
            batch=read_json(path)
            if not isinstance(batch,list): raise SystemExit(f'{path} must be an array')
            rows.extend(batch)
    legacy=read_json(LEGACY)
    if not isinstance(legacy,list): raise SystemExit('content/news.json must be an array')
    rows.extend(legacy)
    return rows


def validate(items):
    by_id={}
    for item in items:
        story_id=str(item.get('id','')).strip()
        if not story_id: raise SystemExit('story missing id')
        if story_id in by_id: raise SystemExit(f'duplicate story id {story_id}')
        iso_date(item.get('date'),f'{story_id}.date')
        updated=item.get('updatedAt')
        if updated:
            updated=iso_date(updated,f'{story_id}.updatedAt')
            if updated < item['date']: raise SystemExit(f'{story_id}.updatedAt cannot predate publication')
        note=item.get('correctionNote')
        if note is not None and (not isinstance(note,str) or not note.strip()):
            raise SystemExit(f'{story_id}.correctionNote must be a non-empty string')
        if note and not updated: raise SystemExit(f'{story_id}.correctionNote requires updatedAt')
        follow=item.get('followUpOf')
        if follow is not None and (not isinstance(follow,str) or not follow.strip()):
            raise SystemExit(f'{story_id}.followUpOf must be a story id')
        by_id[story_id]=item
    for story_id,item in by_id.items():
        follow=item.get('followUpOf')
        if not follow: continue
        if follow==story_id: raise SystemExit(f'{story_id} cannot follow itself')
        if follow not in by_id: raise SystemExit(f'{story_id}.followUpOf references unknown id {follow}')
        if by_id[follow]['date'] > item['date']:
            raise SystemExit(f'{story_id}.followUpOf points to a later story')
    return by_id


def corrections(items):
    rows=[]
    for item in items:
        note=item.get('correctionNote')
        if not note: continue
        rows.append({
            'id':item['id'],'title':item['title'],'date':item['date'],
            'updatedAt':item['updatedAt'],'correctionNote':note.strip(),
            'category':item.get('category','AI 新聞'),'sourceLabel':item.get('sourceLabel',''),
            'sourceUrl':item.get('sourceUrl','')
        })
    rows.sort(key=lambda x:(x['updatedAt'],x['date'],x['id']),reverse=True)
    return rows


def write_payload(rows):
    DATA.parent.mkdir(parents=True,exist_ok=True)
    DATA.write_text('window.AISON_CORRECTIONS = '+json.dumps(rows,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')


def patch_article_pages(by_id):
    if not NEWS_DIR.exists(): return 0
    patched=0
    for path in NEWS_DIR.glob('*.html'):
        item=by_id.get(path.stem)
        if not item: continue
        text=path.read_text(encoding='utf-8')
        modified=item.get('updatedAt') or item['date']
        text,count=re.subn(r'"dateModified":"[^"]+"',f'"dateModified":"{modified}"',text,count=1)
        pub=f'<meta property="article:published_time" content="{item["date"]}">'
        mod=f'<meta property="article:modified_time" content="{modified}">'
        if mod not in text and pub in text:
            text=text.replace(pub,pub+mod,1)
        path.write_text(text,encoding='utf-8')
        patched+=1
    return patched


def patch_sitemap():
    if not SITEMAP.exists(): return False
    site=read_json(SITE); base=str(site.get('baseUrl','https://aison.hk/'))
    if not base.endswith('/'): base+='/'
    url=urljoin(base,'corrections.html')
    text=SITEMAP.read_text(encoding='utf-8')
    if url in text: return False
    entry=f'<url><loc>{html.escape(url)}</loc></url>'
    if '</urlset>' not in text: raise SystemExit('invalid sitemap.xml')
    SITEMAP.write_text(text.replace('</urlset>',entry+'</urlset>',1),encoding='utf-8')
    return True


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--validate-only',action='store_true')
    args=parser.parse_args()
    items=load_items(); by_id=validate(items); rows=corrections(items)
    if args.validate_only:
        print(f'Trust schema valid: {len(items)} stories / {len(rows)} public corrections')
        return
    write_payload(rows)
    patched=patch_article_pages(by_id)
    sitemap=patch_sitemap()
    print(f'Built correction log: {len(rows)} records / {patched} article pages patched / sitemap {"updated" if sitemap else "ok"}')


if __name__=='__main__': main()
