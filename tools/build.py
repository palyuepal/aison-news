#!/usr/bin/env python3
from pathlib import Path
import json, html
from datetime import datetime, timezone
from email.utils import format_datetime
from urllib.parse import urljoin
ROOT=Path(__file__).resolve().parents[1]
NEWS=ROOT/'content/news.json'
SITE=ROOT/'content/site.json'
STATUS=ROOT/'content/status.json'

def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))

def load_site():
    site=read_json(SITE)
    base=site.get('baseUrl','https://example.com/').strip()
    if not base.endswith('/'): base+='/'
    site['baseUrl']=base
    return site

def load_news():
    data=read_json(NEWS)
    required={'id','rank','title','excerpt','category','date','readTime','sourceUrl'}
    ids=set(); ranks=set()
    for n in data:
        miss=required-set(n)
        if miss: raise SystemExit(f"{n.get('id','?')} missing {sorted(miss)}")
        if n['id'] in ids: raise SystemExit(f"duplicate id {n['id']}")
        if n['rank'] in ranks: raise SystemExit(f"duplicate rank {n['rank']}")
        ids.add(n['id']); ranks.add(n['rank'])
        datetime.strptime(n['date'],'%Y-%m-%d')
        if n.get('verified') and not str(n.get('sourceUrl','')).startswith('https://'):
            raise SystemExit(f"verified story {n['id']} needs https sourceUrl")
        if not isinstance(n.get('hkImpact',[]),list):
            raise SystemExit(f"{n['id']} hkImpact must be an array")
    return sorted(data,key=lambda n:(n.get('rank',999),n['date']))

def write_js(path,var,obj):
    path.write_text(f'window.{var} = '+json.dumps(obj,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')

def build_rss(data,site):
    base=site['baseUrl']; items=[]
    for n in sorted(data,key=lambda x:(x['date'],-x.get('rank',99)),reverse=True)[:50]:
        dt=datetime.strptime(n['date'],'%Y-%m-%d').replace(tzinfo=timezone.utc)
        url=urljoin(base,f"article.html?id={n['id']}")
        items.append(f'''<item><title>{html.escape(n['title'])}</title><link>{html.escape(url)}</link><guid>{html.escape(url)}</guid><pubDate>{format_datetime(dt)}</pubDate><description>{html.escape(n['excerpt'])}</description></item>''')
    rss=f'''<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>{html.escape(site['name'])}｜每日 AI 新聞・香港</title><link>{html.escape(base)}</link><description>{html.escape(site['description'])}</description><language>zh-HK</language>{''.join(items)}</channel></rss>'''
    (ROOT/'rss.xml').write_text(rss,encoding='utf-8')

def build_sitemap(data,site):
    base=site['baseUrl']; pages=['','daily.html','archive.html','about.html','privacy.html']
    urls=[f'<url><loc>{html.escape(urljoin(base,p))}</loc></url>' for p in pages]
    for n in data:
        u=urljoin(base,'article.html?id='+n['id'])
        urls.append(f'<url><loc>{html.escape(u)}</loc><lastmod>{n["date"]}</lastmod></url>')
    xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(urls)+'</urlset>'
    (ROOT/'sitemap.xml').write_text(xml,encoding='utf-8')

def build_search(data):
    slim=[{'id':n['id'],'rank':n['rank'],'title':n['title'],'excerpt':n['excerpt'],'category':n['category'],'tags':n.get('tags',[]),'date':n['date']} for n in data]
    (ROOT/'data/search-index.json').write_text(json.dumps(slim,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')

def build_status(data,status):
    dates=sorted([n['date'] for n in data if n.get('date')])
    out=dict(status)
    out.update({'articleCount':len(data),'verifiedCount':sum(1 for n in data if n.get('verified')),'latestEdition':dates[-1] if dates else None,'generatedAt':datetime.now(timezone.utc).isoformat()})
    write_js(ROOT/'data/status.js','AISON_STATUS',out)

def main():
    site=load_site(); data=load_news(); status=read_json(STATUS)
    write_js(ROOT/'data/news.js','AISON_NEWS',data)
    write_js(ROOT/'data/site.js','AISON_SITE',site)
    build_search(data); build_rss(data,site); build_sitemap(data,site); build_status(data,status)
    print(f'Built AIson V3: {len(data)} articles / {sum(1 for n in data if n.get("verified"))} verified')

if __name__=='__main__': main()
