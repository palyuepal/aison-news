#!/usr/bin/env python3
from pathlib import Path
import json, html, shutil
from datetime import datetime, timezone
from email.utils import format_datetime
from urllib.parse import urljoin
from social_cards import build_social_cards
from daily_overview import build_daily_overview

ROOT=Path(__file__).resolve().parents[1]
NEWS=ROOT/'content/news.json'
DAILY_DIR=ROOT/'content/daily'
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

def _validate_story(n, ids, ranks):
    required={'id','rank','title','excerpt','category','date','readTime','sourceUrl'}
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

def _daily_files():
    if not DAILY_DIR.exists():
        return []
    files=[]
    for path in DAILY_DIR.glob('*.json'):
        try:
            datetime.strptime(path.stem,'%Y-%m-%d')
        except ValueError:
            raise SystemExit(f"daily edition filename must be YYYY-MM-DD: {path.name}")
        files.append(path)
    return sorted(files,key=lambda p:p.stem,reverse=True)

def load_news():
    legacy=read_json(NEWS)
    if not isinstance(legacy,list):
        raise SystemExit('content/news.json must be an array')

    daily_files=_daily_files()
    merged=[]

    # Daily files keep only local ranks 1..10. The build computes global ranks,
    # so publishing a new edition never rewrites the entire historical archive.
    for edition_index,path in enumerate(daily_files):
        batch=read_json(path)
        if not isinstance(batch,list) or len(batch)!=10:
            raise SystemExit(f"{path}: daily edition must contain exactly 10 stories")
        local_ranks=set()
        for raw in batch:
            n=dict(raw)
            if str(n.get('date','')) != path.stem:
                raise SystemExit(f"{path}: {n.get('id','?')} date must equal {path.stem}")
            try:
                local_rank=int(n.get('rank'))
            except Exception:
                raise SystemExit(f"{path}: {n.get('id','?')} rank must be an integer 1..10")
            if local_rank not in range(1,11) or local_rank in local_ranks:
                raise SystemExit(f"{path}: local ranks must be unique 1..10")
            local_ranks.add(local_rank)
            n['rank']=edition_index*10+local_rank
            merged.append(n)
        if local_ranks != set(range(1,11)):
            raise SystemExit(f"{path}: daily ranks must be exactly 1..10")

    legacy_offset=len(daily_files)*10
    for raw in legacy:
        n=dict(raw)
        try:
            n['rank']=int(n['rank'])+legacy_offset
        except Exception:
            raise SystemExit(f"legacy story {n.get('id','?')} rank must be an integer")
        merged.append(n)

    ids=set(); ranks=set()
    for n in merged:
        _validate_story(n,ids,ranks)
    return sorted(merged,key=lambda n:(n.get('rank',999),n['date']))

def write_js(path,var,obj):
    path.write_text(f'window.{var} = '+json.dumps(obj,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')

def article_url(base, story_id):
    return urljoin(base,f"news/{story_id}.html")

def build_article_pages(data,site,social_card_ids=None):
    social_card_ids=set(social_card_ids or [])
    template=(ROOT/'article.html').read_text(encoding='utf-8')
    markers=['<head>','<title>文章｜AIson</title>','<meta name="description" content="AIson AI 新聞文章">','<meta property="og:type" content="article">','<script type="application/ld+json" id="jsonld"></script>','<script src="data/news.js']
    missing=[marker for marker in markers if marker not in template]
    if missing: raise SystemExit(f'article template missing expected markers: {missing}')
    out_dir=ROOT/'news'
    if out_dir.exists(): shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True)
    generic_image=urljoin(site['baseUrl'],'assets/icon-512.png')
    publisher_logo=generic_image
    for n in data:
        url=article_url(site['baseUrl'],n['id'])
        has_social_card=n['id'] in social_card_ids
        image=urljoin(site['baseUrl'],f"assets/social/{n['id']}.jpg") if has_social_card else generic_image
        image_width,image_height=(1200,630) if has_social_card else (512,512)
        image_type='image/jpeg' if has_social_card else 'image/png'
        image_alt=f"{n['title']}｜AIson"
        title=html.escape(n['title']+'｜AIson',quote=True)
        desc=html.escape(n['excerpt'],quote=True)
        page=template.replace('<head>','<head><base href="../">',1)
        page=page.replace('<title>文章｜AIson</title>',f'<title>{title}</title>',1)
        page=page.replace('<meta name="description" content="AIson AI 新聞文章">',f'<meta name="description" content="{desc}">',1)
        og=(f'<meta property="og:type" content="article"><meta property="og:site_name" content="AIson"><meta property="og:locale" content="zh_HK">'
            f'<meta property="og:title" content="{title}"><meta property="og:description" content="{desc}">'
            f'<meta property="og:url" content="{html.escape(url,quote=True)}"><meta property="og:image" content="{html.escape(image,quote=True)}">'
            f'<meta property="og:image:type" content="{image_type}"><meta property="og:image:width" content="{image_width}"><meta property="og:image:height" content="{image_height}"><meta property="og:image:alt" content="{html.escape(image_alt,quote=True)}">'
            f'<meta property="article:published_time" content="{n["date"]}"><meta property="article:section" content="{html.escape(n["category"],quote=True)}">'
            f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{title}"><meta name="twitter:description" content="{desc}">'
            f'<meta name="twitter:image" content="{html.escape(image,quote=True)}"><meta name="twitter:image:alt" content="{html.escape(image_alt,quote=True)}">'
            f'<meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{html.escape(url,quote=True)}">')
        page=page.replace('<meta property="og:type" content="article">',og,1)
        structured={
            '@context':'https://schema.org','@type':'NewsArticle','headline':n['title'],'description':n['excerpt'],
            'datePublished':n['date'],'dateModified':n['date'],'mainEntityOfPage':url,'image':[image],
            'articleSection':n['category'],'inLanguage':'zh-Hant-HK',
            'publisher':{'@type':'Organization','name':'AIson','logo':{'@type':'ImageObject','url':publisher_logo}},
            'author':{'@type':'Organization','name':'AIson'}
        }
        jsonld=json.dumps(structured,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
        page=page.replace('<script type="application/ld+json" id="jsonld"></script>',f'<script type="application/ld+json" id="jsonld">{jsonld}</script>',1)
        marker='<script src="data/news.js'
        story_id=json.dumps(n['id'],ensure_ascii=False)
        injected=f'<script>window.AISON_ARTICLE_ID={story_id};if(!new URLSearchParams(location.search).get("id"))history.replaceState({{}},"",location.pathname+"?id="+encodeURIComponent(window.AISON_ARTICLE_ID));</script>'
        page=page.replace(marker,injected+marker,1)
        required=[f'<title>{title}</title>','property="og:title"','name="twitter:card" content="summary_large_image"','rel="canonical"','"@type":"NewsArticle"',f'window.AISON_ARTICLE_ID={story_id}']
        if has_social_card:
            required.extend([f'assets/social/{n["id"]}.jpg','content="1200"','content="630"'])
        if not all(token in page for token in required):
            raise SystemExit(f'failed to generate metadata for {n["id"]}')
        (out_dir/f'{n["id"]}.html').write_text(page,encoding='utf-8')
    if len(list(out_dir.glob('*.html'))) != len(data):
        raise SystemExit('generated article page count does not match news data')

def build_rss(data,site):
    base=site['baseUrl']; items=[]
    for n in sorted(data,key=lambda x:(x['date'],-x.get('rank',99)),reverse=True)[:50]:
        dt=datetime.strptime(n['date'],'%Y-%m-%d').replace(tzinfo=timezone.utc)
        url=article_url(base,n['id'])
        items.append(f'''<item><title>{html.escape(n['title'])}</title><link>{html.escape(url)}</link><guid>{html.escape(url)}</guid><pubDate>{format_datetime(dt)}</pubDate><description>{html.escape(n['excerpt'])}</description></item>''')
    rss=f'''<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>{html.escape(site['name'])}｜每日 AI 新聞・香港</title><link>{html.escape(base)}</link><description>{html.escape(site['description'])}</description><language>zh-HK</language>{''.join(items)}</channel></rss>'''
    (ROOT/'rss.xml').write_text(rss+'\n',encoding='utf-8')

def build_sitemap(data,site):
    base=site['baseUrl']; pages=['','daily.html','weekly.html','guides.html','topics.html','archive.html','about.html','methodology.html','privacy.html']
    urls=[f'<url><loc>{html.escape(urljoin(base,p))}</loc></url>' for p in pages]
    for n in data:
        u=article_url(base,n['id'])
        urls.append(f'<url><loc>{html.escape(u)}</loc><lastmod>{n["date"]}</lastmod></url>')
    xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(urls)+'</urlset>'
    (ROOT/'sitemap.xml').write_text(xml+'\n',encoding='utf-8')

def build_search(data):
    slim=[{'id':n['id'],'rank':n['rank'],'title':n['title'],'excerpt':n['excerpt'],'category':n['category'],'tags':n.get('tags',[]),'date':n['date']} for n in data]
    (ROOT/'data/search-index.json').write_text(json.dumps(slim,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')

def build_status(data,status):
    dates=sorted([n['date'] for n in data if n.get('date')])
    latest=dates[-1] if dates else None
    generated_at=datetime.now(timezone.utc).isoformat()
    out=dict(status)
    out.update({'articleCount':len(data),'verifiedCount':sum(1 for n in data if n.get('verified')),'editionDate':latest,'latestEdition':latest,'lastBuild':generated_at,'generatedAt':generated_at})
    write_js(ROOT/'data/status.js','AISON_STATUS',out)

def main():
    site=load_site(); data=load_news(); status=read_json(STATUS)
    social_card_ids=build_social_cards(data,site,ROOT)
    write_js(ROOT/'data/news.js','AISON_NEWS',data)
    write_js(ROOT/'data/site.js','AISON_SITE',site)
    build_search(data); build_article_pages(data,site,social_card_ids); build_rss(data,site); build_sitemap(data,site); build_status(data,status)
    overview=build_daily_overview(data,site,ROOT)
    overview_count=overview.get('count',0) if overview else 0
    print(f'Built AIson V3: {len(data)} articles / {sum(1 for n in data if n.get("verified"))} verified / {len(social_card_ids)} social cards / daily overview {overview_count} stories')

if __name__=='__main__': main()
