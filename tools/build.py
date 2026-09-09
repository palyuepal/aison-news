#!/usr/bin/env python3
from pathlib import Path
import json, html, shutil, re
from datetime import datetime, timezone
from email.utils import format_datetime
from urllib.parse import urljoin
from social_cards import build_social_cards
from daily_overview import build_daily_overview
from editorial import build_editorial_payload

ROOT=Path(__file__).resolve().parents[1]
NEWS=ROOT/'content/news.json'
DAILY_DIR=ROOT/'content/daily'
SITE=ROOT/'content/site.json'
STATUS=ROOT/'content/status.json'
STORYLINES=ROOT/'data/storylines.json'
SLUG_RE=re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
ACTION_VERDICTS={
    'try-now':{
        'label':'值得即刻試',
        'detail':'可以先用不含敏感資料的小範圍工作流程測試；正式導入前仍要核對條款、成本與輸出。'
    },
    'watch':{
        'label':'值得留意',
        'detail':'這個發展值得持續跟進，但目前未必需要立刻改變你的工具、採購或工作流程。'
    },
    'wait':{
        'label':'等下先',
        'detail':'公告、測試或路線圖未必已經等於香港可用；等清楚功能、價格、地區與條款再決定。'
    },
    'skip':{
        'label':'可以 Skip',
        'detail':'這次更新對大部分香港讀者的即時工作影響有限；知道背景即可，毋須急於行動。'
    }
}
CORE_PAGE_META={
    'index.html':('AIson｜香港 AI 新聞・每日 10 件事','AIson 每日幫香港人篩選全球 AI 大事：每日 AI 10 件事、香港影響、AIson Take、分類、搜尋與長期保存。','每日 10 件最值得香港人知道的 AI 大事，連香港影響與 AIson Take。'),
    'daily.html':('今日 AI 10 件事｜香港 AI 新聞｜AIson','一頁睇晒 AIson 今日最重要的 10 件 AI 新聞、香港影響、行動判斷與 AIson Take。','一頁睇晒今日最值得知道的 10 件 AI 大事、香港影響與 AIson Take。'),
    'live.html':('AIson LIVE｜今日 AI 即時更新','AIson LIVE 只收錄真正值得打斷你的重大 AI 即時消息，按香港時間整理成完整時間線。','重大、已核實、值得即時知道的 AI 新消息，按香港時間排列。'),
    'weekly.html':('本週 AI 深度整理｜香港 AI 新聞｜AIson','AIson Weekly 從最近 7 日報道整理 AI 世界的結構性改變、香港影響與延續中的故事線。','不只重排新聞，而是睇清本週 AI 世界真正改變了甚麼。'),
    'topics.html':('AI 主題追蹤與故事線｜AIson','追蹤 OpenAI、Google Gemini、Claude、NVIDIA、AI Agent、AI Video、AI Coding 等 AI 主題，沿時間線閱讀完整脈絡。','由第一次事件到最新進展，沿時間線追蹤 AI 主題和故事線。'),
    'archive.html':('AI 新聞庫｜香港 AI 新聞搜尋｜AIson','搜尋 AIson 已核實的 AI 新聞、來源、香港影響與過往報道，隨時回看 AI 事件脈絡。','搜尋和回看 AIson 已核實的 AI 新聞與來源。'),
    'guides.html':('香港 AI 實用指南｜AIson','給香港打工仔、學生及中小企的 AI 實用指南：由揀工具、試行工作流程，到保護資料。','由一件重複工作開始，安全地把 AI 用進日常。'),
    'about.html':('關於 AIson｜香港人的每日 AI 新聞站','AIson 是為香港讀者而設的每日 AI 新聞站，幫你篩選、核實與解讀全球 AI 大事。','了解 AIson 如何為香港讀者整理每日 AI 新聞。'),
    'methodology.html':('編採方法與更正政策｜AIson','了解 AIson 的選題、來源核實、香港脈絡、更新與公開更正原則。','AIson 如何分開事實、脈絡與編輯分析。'),
    'corrections.html':('更新與更正紀錄｜AIson','AIson 公開列出新聞內容的實質更正紀錄，方便讀者追蹤何時、為何及哪篇內容曾被修正。','公開保留實質更正，讓讀者知道改了甚麼。'),
    'privacy.html':('私隱政策｜AIson','AIson 網站、Newsletter、匿名網站分析與本機閱讀功能的私隱說明。','了解 AIson 如何處理網站、訂閱與匿名分析資料。')
}
SEO_START='<!-- AISON SEO START -->'
SEO_END='<!-- AISON SEO END -->'


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def load_site():
    site=read_json(SITE)
    base=site.get('baseUrl','https://example.com/').strip()
    if not base.endswith('/'): base+='/'
    site['baseUrl']=base
    return site


def _text_len(value=''):
    return len(''.join(str(value or '').split()))


def _deep_read_ready(n):
    if not n.get('verified') or not n.get('sourceUrl'):
        return False
    impacts=n.get('hkImpact') if isinstance(n.get('hkImpact'),list) else []
    total=sum(_text_len(n.get(key,'')) for key in ('summary','whatHappened','reportingContext','deepDive','whyImportant','whatToWatch','take'))
    total+=sum(_text_len(item) for item in impacts)
    return (
        len(impacts)>=3 and
        _text_len(n.get('whatHappened'))>=300 and
        _text_len(n.get('reportingContext'))>=400 and
        _text_len(n.get('deepDive'))>=900 and
        _text_len(n.get('whyImportant'))>=250 and
        _text_len(n.get('whatToWatch'))>=180 and
        total>=2800
    )


def _validate_visual(n):
    visual=n.get('visual')
    if visual is None:
        return
    if not isinstance(visual,dict):
        raise SystemExit(f"{n.get('id','?')} visual must be an object")
    kind=str(visual.get('kind','')).strip()
    if kind not in {'aison-original','official-press'}:
        raise SystemExit(f"{n.get('id','?')} visual.kind must be aison-original or official-press")
    src=str(visual.get('src','')).strip()
    if not src.startswith('assets/editorial/') or '..' in Path(src).parts:
        raise SystemExit(f"{n.get('id','?')} visual.src must be a local assets/editorial/ path")
    if Path(src).suffix.lower() not in {'.jpg','.jpeg','.png','.webp'}:
        raise SystemExit(f"{n.get('id','?')} visual.src must be jpg/png/webp")
    if not (ROOT/src).is_file():
        raise SystemExit(f"{n.get('id','?')} visual asset not found: {src}")
    if not str(visual.get('alt','')).strip():
        raise SystemExit(f"{n.get('id','?')} visual.alt is required")
    if not str(visual.get('credit','')).strip():
        raise SystemExit(f"{n.get('id','?')} visual.credit is required")
    source_url=str(visual.get('sourceUrl','')).strip()
    if kind=='official-press' and not source_url.startswith('https://'):
        raise SystemExit(f"{n.get('id','?')} official-press visual needs https sourceUrl")
    if source_url and not source_url.startswith('https://'):
        raise SystemExit(f"{n.get('id','?')} visual.sourceUrl must use https")


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
    verdict=n.get('actionVerdict')
    if verdict is not None and verdict not in ACTION_VERDICTS:
        raise SystemExit(f"{n['id']} actionVerdict must be one of {sorted(ACTION_VERDICTS)}")
    if n.get('actionReason') is not None and not str(n.get('actionReason','')).strip():
        raise SystemExit(f"{n['id']} actionReason cannot be empty")
    score=n.get('aisonScore')
    if score is not None:
        try: score=float(score)
        except (TypeError,ValueError): raise SystemExit(f"{n['id']} aisonScore must be a number")
        if not 0<=score<=10: raise SystemExit(f"{n['id']} aisonScore must be between 0 and 10")
    audience=n.get('audienceImpact')
    if audience is not None:
        if not isinstance(audience,dict) or set(audience)-{'worker','sme','creator','developer'}:
            raise SystemExit(f"{n['id']} audienceImpact must use worker/sme/creator/developer")
        for audience_key,value in audience.items():
            if not isinstance(value,int) or not 1<=value<=5:
                raise SystemExit(f"{n['id']} audienceImpact.{audience_key} must be an integer 1..5")
    for key in ('storylineId','topicId'):
        value=n.get(key)
        if value is not None and (not isinstance(value,str) or not SLUG_RE.fullmatch(value.strip())):
            raise SystemExit(f"{n['id']} {key} must be a lowercase kebab-case id")
    _validate_visual(n)


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


def load_news(registry=None):
    legacy=read_json(NEWS)
    if not isinstance(legacy,list):
        raise SystemExit('content/news.json must be an array')
    registry=registry or load_storyline_registry()

    daily_files=_daily_files()
    merged=[]

    # Daily files keep only local ranks 1..10. The build computes global ranks,
    # so publishing a new edition never rewrites the entire historical archive.
    for edition_index,path in enumerate(daily_files):
        batch=read_json(path)
        if not isinstance(batch,list) or len(batch)!=10:
            raise SystemExit(f"{path}: daily edition must contain exactly 10 stories")
        # This is the publication gate for an explicit Daily 10 classification.
        # It never assigns an ID by heuristic: an absent confident match stays a
        # new event and continues through the normal tags/category experience.
        validate_daily_storyline_classifications(path,batch,registry)
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


def load_storyline_registry():
    if not STORYLINES.is_file():
        return {'version':1,'topics':[],'storylines':[]}
    registry=read_json(STORYLINES)
    if not isinstance(registry,dict):
        raise SystemExit('data/storylines.json must be an object')
    topics=registry.get('topics',[])
    hubs=registry.get('hubs',[])
    storylines=registry.get('storylines',[])
    if not isinstance(topics,list) or not isinstance(hubs,list) or not isinstance(storylines,list):
        raise SystemExit('storyline registry hubs/topics/storylines must be arrays')
    hub_ids=set()
    for hub in hubs:
        if not isinstance(hub,dict):
            raise SystemExit('topic hub must be an object')
        hub_id=str(hub.get('id','')).strip()
        if not SLUG_RE.fullmatch(hub_id):
            raise SystemExit(f'invalid topic hub id: {hub_id or "?"}')
        if hub_id in hub_ids:
            raise SystemExit(f'duplicate topic hub id: {hub_id}')
        if not str(hub.get('name','')).strip() or not str(hub.get('description','')).strip():
            raise SystemExit(f'topic hub {hub_id} needs name and description')
        terms=hub.get('matchTerms',[])
        if not isinstance(terms,list) or not terms or any(not isinstance(term,str) or not term.strip() for term in terms):
            raise SystemExit(f'topic hub {hub_id} needs non-empty matchTerms')
        hub_ids.add(hub_id)
    topic_ids=set()
    for topic in topics:
        if not isinstance(topic,dict):
            raise SystemExit('storyline topic must be an object')
        topic_id=str(topic.get('id','')).strip()
        if not SLUG_RE.fullmatch(topic_id):
            raise SystemExit(f'invalid topic id: {topic_id or "?"}')
        if topic_id in topic_ids:
            raise SystemExit(f'duplicate topic id: {topic_id}')
        if not str(topic.get('name','')).strip():
            raise SystemExit(f'topic {topic_id} needs name')
        topic_ids.add(topic_id)
    storyline_ids=set()
    seeded_story_ids={}
    for line in storylines:
        if not isinstance(line,dict):
            raise SystemExit('storyline must be an object')
        line_id=str(line.get('id','')).strip()
        topic_id=str(line.get('topicId','')).strip()
        if not SLUG_RE.fullmatch(line_id):
            raise SystemExit(f'invalid storyline id: {line_id or "?"}')
        if line_id in storyline_ids:
            raise SystemExit(f'duplicate storyline id: {line_id}')
        if topic_id not in topic_ids:
            raise SystemExit(f'storyline {line_id} references unknown topicId {topic_id}')
        if not str(line.get('name','')).strip():
            raise SystemExit(f'storyline {line_id} needs name')
        if line.get('status','active') not in {'active','watching','closed'}:
            raise SystemExit(f'storyline {line_id} has invalid status')
        story_ids=line.get('storyIds',[])
        if not isinstance(story_ids,list) or any(not isinstance(x,str) or not x.strip() for x in story_ids):
            raise SystemExit(f'storyline {line_id} storyIds must be an array of ids')
        for story_id in story_ids:
            previous=seeded_story_ids.get(story_id)
            if previous and previous!=line_id:
                raise SystemExit(f'story {story_id} is seeded into multiple storylines')
            seeded_story_ids[story_id]=line_id
        storyline_ids.add(line_id)
    return registry


def classify_storyline_assignment(story, registry):
    """Validate an editorial decision without trying to infer a relationship."""
    topics={item['id']:item for item in registry.get('topics',[])}
    lines={item['id']:item for item in registry.get('storylines',[])}
    story_id=story.get('id','?')
    raw_line=story.get('storylineId')
    raw_topic=story.get('topicId')

    for key,value in (('storylineId',raw_line),('topicId',raw_topic)):
        if value is not None and (not isinstance(value,str) or not SLUG_RE.fullmatch(value.strip())):
            raise SystemExit(f"{story_id} {key} must be a lowercase kebab-case id")

    line_id=raw_line.strip() if isinstance(raw_line,str) else None
    topic_id=raw_topic.strip() if isinstance(raw_topic,str) else None
    if not line_id and not topic_id:
        return 'new-event'
    if line_id:
        if line_id not in lines:
            raise SystemExit(f"{story_id} references unknown storylineId {line_id}")
        # A reserved watchlist entry needs an explicit editorial promotion
        # before it can become a published storyline.
        if lines[line_id].get('status','active') != 'active':
            raise SystemExit(f"{story_id} storylineId {line_id} is not active; update the registry before publishing a follow-up")
        if not topic_id:
            raise SystemExit(f"{story_id} storyline follow-up must include its matching topicId")
        if topic_id not in topics:
            raise SystemExit(f"{story_id} references unknown topicId {topic_id}")
        expected=lines[line_id]['topicId']
        if topic_id != expected:
            raise SystemExit(f"{story_id} topicId must match storyline {line_id}: {expected}")
        return 'storyline-follow-up'
    if topic_id not in topics:
        raise SystemExit(f"{story_id} references unknown topicId {topic_id}")
    return 'topic-related-event'


def validate_daily_storyline_classifications(path, batch, registry):
    """Reject invalid explicit links while allowing deliberate no-match rows."""
    counts={'new-event':0,'topic-related-event':0,'storyline-follow-up':0}
    for story in batch:
        decision=classify_storyline_assignment(story,registry)
        counts[decision]+=1
    return counts


def enrich_storylines(data,registry):
    topics={item['id']:item for item in registry.get('topics',[])}
    lines={item['id']:item for item in registry.get('storylines',[])}
    seeded={story_id:line['id'] for line in lines.values() for story_id in line.get('storyIds',[])}
    known_story_ids={n['id'] for n in data}
    missing=sorted(set(seeded)-known_story_ids)
    if missing:
        raise SystemExit(f'storyline registry references missing story ids: {missing}')
    for n in data:
        explicit_line=str(n.get('storylineId','')).strip() or None
        explicit_topic=str(n.get('topicId','')).strip() or None
        seeded_line=seeded.get(n['id'])
        if explicit_line and explicit_line not in lines:
            raise SystemExit(f"{n['id']} references unknown storylineId {explicit_line}")
        if explicit_topic and explicit_topic not in topics:
            raise SystemExit(f"{n['id']} references unknown topicId {explicit_topic}")
        if explicit_line and seeded_line and explicit_line!=seeded_line:
            raise SystemExit(f"{n['id']} storylineId conflicts with registry seed")
        resolved_line=explicit_line or seeded_line
        if resolved_line:
            expected_topic=lines[resolved_line]['topicId']
            if explicit_topic and explicit_topic!=expected_topic:
                raise SystemExit(f"{n['id']} topicId must match storyline {resolved_line}: {expected_topic}")
            n['storylineId']=resolved_line
            n['topicId']=expected_topic
        elif explicit_topic:
            n['topicId']=explicit_topic
    return data


def _quick_take(story):
    source=' '.join(str(story.get(key,'')).strip() for key in ('quickTake','summary','excerpt') if story.get(key)).strip()
    if not source:
        return '先看清官方已公布的範圍與限制，再判斷是否影響你的工作或工具選擇。'
    sentence=re.split(r'(?<=[。！？])',source,1)[0].strip()
    return sentence[:140].rstrip('，、； ') + ('…' if len(sentence)>140 else '')


def _suggest_action_verdict(story):
    hay=' '.join([str(story.get('category','')),str(story.get('title','')),*(str(tag) for tag in story.get('tags',[]))]).lower()
    if any(term in hay for term in ('roadmap','路線圖','預告','目標','計劃','beta','試產','203', '暫未')):
        return 'wait'
    if any(term in hay for term in ('漏洞','安全','監管','治理','晶片','基建','融資','估值','市場','政策','security','chip')):
        return 'watch'
    if any(term in hay for term in ('推出','發布','功能','工具','agent','生成','coding','copilot','premiere','workspace')):
        return 'try-now'
    return 'watch'


def enrich_reader_aids(data):
    """Keep older reports useful while forcing an explicit editorial verdict for new work."""
    for story in data:
        explicit_verdict=story.get('actionVerdict')
        story['quickTake']=str(story.get('quickTake') or _quick_take(story)).strip()
        verdict=explicit_verdict or _suggest_action_verdict(story)
        story['actionVerdict']=verdict
        story['actionReason']=str(story.get('actionReason') or ACTION_VERDICTS[verdict]['detail']).strip()
        story['actionVerdictSource']='editorial' if explicit_verdict else 'legacy-default'
    return data


def write_js(path,var,obj):
    path.write_text(f'window.{var} = '+json.dumps(obj,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')


def article_url(base, story_id):
    return urljoin(base,f"news/{story_id}.html")


def _social_image(site, page=''):
    if page in {'index.html','daily.html'} and (ROOT/'assets/social/daily-latest.jpg').is_file():
        return urljoin(site['baseUrl'],'assets/social/daily-latest.jpg')
    return urljoin(site['baseUrl'],'assets/icon-512.png')


def _seo_block(site, path, title, description, social_description):
    url=urljoin(site['baseUrl'],'' if path=='index.html' else path)
    image=_social_image(site,path)
    image_type='image/jpeg' if image.endswith('.jpg') else 'image/png'
    image_dimensions=('1200','1500') if image.endswith('.jpg') else ('512','512')
    structured=[]
    if path=='index.html':
        organization={
            '@context':'https://schema.org','@type':'Organization','name':site.get('name','AIson'),
            'url':site['baseUrl'],'logo':urljoin(site['baseUrl'],'assets/icon-512.png'),
            'description':site.get('description',description),'inLanguage':'zh-Hant-HK'
        }
        same_as=[value for value in (site.get('social') or {}).values() if isinstance(value,str) and value.startswith('https://')]
        if same_as: organization['sameAs']=same_as
        structured=[
            {'@context':'https://schema.org','@type':'WebSite','name':site.get('name','AIson'),'url':site['baseUrl'],'inLanguage':'zh-Hant-HK'},
            organization
        ]
    jsonld=''.join(f'<script type="application/ld+json">{json.dumps(item,ensure_ascii=False,separators=(",",":"))}</script>' for item in structured)
    return (f'{SEO_START}\n'
        f'<meta name="description" content="{html.escape(description,quote=True)}">\n'
        f'<meta name="robots" content="index,follow,max-image-preview:large">\n'
        f'<meta name="keywords" content="AI 新聞,香港 AI,人工智能,AIson,{html.escape(title,quote=True)}">\n'
        f'<meta property="og:type" content="website"><meta property="og:site_name" content="AIson"><meta property="og:locale" content="zh_HK">\n'
        f'<meta property="og:title" content="{html.escape(title,quote=True)}"><meta property="og:description" content="{html.escape(social_description,quote=True)}"><meta property="og:url" content="{html.escape(url,quote=True)}">\n'
        f'<meta property="og:image" content="{html.escape(image,quote=True)}"><meta property="og:image:type" content="{image_type}"><meta property="og:image:width" content="{image_dimensions[0]}"><meta property="og:image:height" content="{image_dimensions[1]}"><meta property="og:image:alt" content="{html.escape(title,quote=True)}">\n'
        f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{html.escape(title,quote=True)}"><meta name="twitter:description" content="{html.escape(social_description,quote=True)}"><meta name="twitter:image" content="{html.escape(image,quote=True)}"><meta name="twitter:image:alt" content="{html.escape(title,quote=True)}">\n'
        f'<link rel="canonical" href="{html.escape(url,quote=True)}">{jsonld}\n{SEO_END}')


def _strip_static_seo(text):
    if SEO_START in text and SEO_END in text:
        text=re.sub(re.escape(SEO_START)+r'.*?'+re.escape(SEO_END),'',text,flags=re.S)
    else:
        patterns=(
            r'<meta\s+name=["\'](?:description|robots|keywords)["\'][^>]*>',
            r'<meta\s+(?:property|name)=["\'](?:og|twitter):[^"\']+["\'][^>]*>',
            r'<link\s+rel=["\']canonical["\'][^>]*>'
        )
        for pattern in patterns:
            text=re.sub(pattern,'',text,flags=re.I)
    text=re.sub(r'(?m)^[ \t]+$','',text)
    return re.sub(r'\n{3,}','\n\n',text)


def build_core_page_seo(site):
    for path,(title,description,social_description) in CORE_PAGE_META.items():
        target=ROOT/path
        if not target.is_file():
            raise SystemExit(f'core SEO page is missing: {path}')
        page=_strip_static_seo(target.read_text(encoding='utf-8'))
        page=re.sub(r'<title>.*?</title>',f'<title>{html.escape(title)}</title>',page,count=1,flags=re.I|re.S)
        if '<title>' not in page.lower():
            raise SystemExit(f'core SEO page is missing a title: {path}')
        page=page.replace('</title>','</title>\n'+_seo_block(site,path,title,description,social_description),1)
        target.write_text(page,encoding='utf-8')


def _hub_matches(story,hub):
    hay=' '.join([str(story.get('title','')),str(story.get('excerpt','')),str(story.get('category','')),*(str(tag) for tag in story.get('tags',[]))]).lower()
    return any(term.lower() in hay for term in hub.get('matchTerms',[]))


def _hub_card(story):
    href='../news/'+html.escape(str(story['id']),quote=True)+'.html'
    tags=''.join(f'<span>{html.escape(str(tag))}</span>' for tag in (story.get('tags') or [])[:3])
    return (f'<a class="hub-story-card" href="{href}"><small>{html.escape(str(story.get("category","AI 新聞")))} · {html.escape(str(story.get("date","")))}</small>'
        f'<h2>{html.escape(str(story.get("title","")))}</h2><p>{html.escape(str(story.get("excerpt","") or story.get("summary","")))}</p>'
        f'<div class="hub-story-meta">{tags}<b>閱讀完整報導 →</b></div></a>')


def build_topic_hub_pages(data,site,registry):
    out_dir=ROOT/'topics'
    out_dir.mkdir(exist_ok=True)
    newsletter_url=html.escape(str((site.get('newsletter') or {}).get('subscribeUrl') or site['baseUrl']),quote=True)
    generated=0
    for hub in registry.get('hubs',[]):
        matches=sorted((story for story in data if _hub_matches(story,hub)),key=lambda story:(str(story.get('date','')), -int(story.get('rank',999999))),reverse=True)
        url=urljoin(site['baseUrl'],f'topics/{hub["id"]}.html')
        title=f'{hub["name"]} AI 新聞與追蹤｜AIson'
        description=f'{hub["description"]} AIson 為香港讀者持續整理相關已核實 AI 新聞、香港影響與後續脈絡。'
        item_list=[{'@type':'ListItem','position':index,'url':article_url(site['baseUrl'],story['id']),'name':story['title']} for index,story in enumerate(matches,1)]
        structured={'@context':'https://schema.org','@type':'CollectionPage','name':title,'description':description,'url':url,'inLanguage':'zh-Hant-HK','mainEntity':{'@type':'ItemList','numberOfItems':len(item_list),'itemListElement':item_list}}
        structured_json=json.dumps(structured,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
        cards=''.join(_hub_card(story) for story in matches) or '<p class="hub-empty">目前未有可核實的相關報道；AIson 會在有實質進展時補上。</p>'
        page=f'''<!doctype html>
<html lang="zh-Hant-HK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{html.escape(title)}</title><meta name="description" content="{html.escape(description,quote=True)}"><meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="website"><meta property="og:site_name" content="AIson"><meta property="og:locale" content="zh_HK"><meta property="og:title" content="{html.escape(title,quote=True)}"><meta property="og:description" content="{html.escape(description,quote=True)}"><meta property="og:url" content="{html.escape(url,quote=True)}"><meta property="og:image" content="{html.escape(_social_image(site),quote=True)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{html.escape(title,quote=True)}"><meta name="twitter:description" content="{html.escape(description,quote=True)}"><meta name="twitter:image" content="{html.escape(_social_image(site),quote=True)}"><link rel="canonical" href="{html.escape(url,quote=True)}"><link rel="icon" href="../assets/favicon.png"><link rel="stylesheet" href="../styles.css?v=20260909-seo-hubs"><link rel="stylesheet" href="../visual-system-v2.css?v=20260909-v2"><script type="application/ld+json">{structured_json}</script>
<style>.hub-hero{{background:radial-gradient(circle at 82% 14%,rgba(255,201,40,.21),transparent 28%),linear-gradient(135deg,#061a3a,#0d3973);color:#fff}}.hub-hero .container{{padding:58px 0 46px}}.hub-hero h1{{max-width:800px;margin:8px 0 12px;font-size:clamp(38px,5vw,66px);line-height:1.08}}.hub-hero p{{max-width:730px;margin:0;color:#cbdaef;line-height:1.75}}.hub-hero .hub-count{{display:inline-flex;margin-top:20px;padding:7px 10px;border:1px solid rgba(255,255,255,.18);border-radius:999px;color:#ffe187;font-size:12px;font-weight:900}}.hub-layout{{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:24px;align-items:start}}.hub-story-list{{display:grid;gap:13px}}.hub-story-card{{display:block;padding:20px;border:1px solid #dbe5f1;border-radius:18px;background:#fff;color:#071b3b;text-decoration:none;box-shadow:0 8px 24px rgba(6,26,58,.04)}}.hub-story-card:hover{{transform:translateY(-2px);box-shadow:0 14px 32px rgba(6,26,58,.09)}}.hub-story-card small{{display:block;color:#1b579d;font-size:11px;font-weight:900}}.hub-story-card h2{{margin:8px 0 7px;font-size:20px;line-height:1.4}}.hub-story-card p{{margin:0;color:#596b84;font-size:13px;line-height:1.65}}.hub-story-meta{{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-top:13px}}.hub-story-meta span{{border-radius:999px;background:#f0f4fa;padding:4px 7px;color:#50627c;font-size:10px}}.hub-story-meta b{{margin-left:auto;color:#124c91;font-size:11px}}.hub-note{{padding:18px;border:1px solid #dbe5f1;border-radius:16px;background:#f4f8ff}}.hub-note h2{{margin:4px 0 8px;font-size:20px}}.hub-note p{{margin:0;color:#5d6e85;font-size:13px;line-height:1.65}}.hub-note a{{display:inline-flex;margin-top:13px;font-size:12px;font-weight:900;color:#0e4f9a;text-decoration:none}}.hub-empty{{padding:24px;border:1px dashed #ccd8e6;border-radius:16px;text-align:center;color:#61728d}}@media(max-width:820px){{.hub-layout{{grid-template-columns:1fr}}.hub-hero .container{{padding:42px 0 34px}}}}@media(max-width:560px){{.hub-story-card{{padding:16px}}.hub-story-card h2{{font-size:18px}}}}</style></head>
<body><header class="topbar"><div class="container nav"><a class="brand" href="../index.html" aria-label="AIson 首頁"><img src="../assets/mascot.webp" alt="AIson"><div><strong><span>AI</span>son</strong><small>每日 AI 新聞站</small></div></a><nav class="navlinks"><a href="../index.html">首頁</a><a href="../daily.html">今日 AI 10 件事</a><a class="active" href="../topics.html">主題追蹤</a><a href="../archive.html">新聞庫</a></nav></div></header><main><section class="hub-hero"><div class="container"><div class="mini-label">AIson TOPIC HUB</div><h1>{html.escape(hub['name'])}：追蹤完整 AI 脈絡</h1><p>{html.escape(hub['description'])}</p><span class="hub-count">{len(matches)} 篇相關已核實報道 · 由最新到最早</span></div></section><section class="section"><div class="container hub-layout"><div><div class="section-head"><div><div class="mini-label">LATEST COVERAGE</div><h2>{html.escape(hub['name'])} 最新與過往報道</h2><p>同一件事的後續會在文章內連到故事時間線；這裡保留完整相關報導。</p></div></div><div class="hub-story-list">{cards}</div></div><aside class="sidebar"><div class="hub-note"><div class="mini-label">KEEP UP</div><h2>每日 3–5 分鐘睇晒 AI</h2><p>免費收到 AIson 今日最重要新聞、香港影響與編輯判斷。</p><a href="{newsletter_url}" data-newsletter-link data-analytics-slot="topic-hub">免費訂閱 Morning Brief →</a></div><div class="hub-note"><div class="mini-label">EXPLORE MORE</div><h2>想睇其他主題？</h2><p>OpenAI、Gemini、Claude、NVIDIA、AI Agent、AI Video 和 AI Coding 都有獨立入口。</p><a href="../topics.html">瀏覽所有主題 →</a></div></aside></div></section></main><footer class="footer"><div class="container copyright"><span>© 2026 AIson · 香港人的每日 AI 新聞站</span><span><a href="../rss.xml">RSS</a> · <a href="../methodology.html">編採方法</a></span></div></footer></body></html>'''
        (out_dir/f'{hub["id"]}.html').write_text(page,encoding='utf-8')
        generated+=1
    return generated


def build_article_pages(data,site,social_card_ids=None):
    social_card_ids=set(social_card_ids or [])
    template=(ROOT/'article.html').read_text(encoding='utf-8')
    markers=['<head>','<title>文章｜AIson</title>','<meta name="description" content="AIson AI 新聞文章">','<meta name="robots" content="noindex,follow"><!-- ARTICLE SEO -->','<script type="application/ld+json" id="jsonld"></script>','<script src="data/news.js']
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
        page=page.replace('<meta name="robots" content="noindex,follow"><!-- ARTICLE SEO -->',og,1)
        structured={
            '@context':'https://schema.org','@type':'NewsArticle','headline':n['title'],'description':n['excerpt'],
            'datePublished':n['date'],'dateModified':n.get('updatedAt',n['date']),'mainEntityOfPage':url,'image':[image],
            'articleSection':n['category'],'inLanguage':'zh-Hant-HK',
            'keywords':[*(n.get('tags') or []),*([n['topicId']] if n.get('topicId') else []),*([n['storylineId']] if n.get('storylineId') else [])],
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


def build_sitemap(data,site,registry):
    base=site['baseUrl']; pages=['','daily.html','live.html','weekly.html','guides.html','topics.html','archive.html','about.html','methodology.html','corrections.html','privacy.html']
    urls=[f'<url><loc>{html.escape(urljoin(base,p))}</loc></url>' for p in pages]
    for hub in registry.get('hubs',[]):
        hub_path=f"topics/{hub['id']}.html"
        urls.append(f'<url><loc>{html.escape(urljoin(base,hub_path))}</loc></url>')
    for n in data:
        u=article_url(base,n['id'])
        urls.append(f'<url><loc>{html.escape(u)}</loc><lastmod>{n["date"]}</lastmod></url>')
    xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(urls)+'</urlset>'
    (ROOT/'sitemap.xml').write_text(xml+'\n',encoding='utf-8')


def build_search(data):
    slim=[{
        'id':n['id'],'rank':n['rank'],'title':n['title'],'excerpt':n['excerpt'],'category':n['category'],
        'tags':n.get('tags',[]),'date':n['date'],'readTime':n.get('readTime',''),
        'verified':bool(n.get('verified')),'featured':bool(n.get('featured')),'deepRead':_deep_read_ready(n),
        'storylineId':n.get('storylineId'),'topicId':n.get('topicId')
    } for n in data]
    (ROOT/'data/search-index.json').write_text(json.dumps(slim,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')


def build_status(data,status):
    dates=sorted([n['date'] for n in data if n.get('date')])
    latest=dates[-1] if dates else None
    generated_at=datetime.now(timezone.utc).isoformat()
    out=dict(status)
    out.update({'articleCount':len(data),'verifiedCount':sum(1 for n in data if n.get('verified')),'editionDate':latest,'latestEdition':latest,'lastBuild':generated_at,'generatedAt':generated_at})
    write_js(ROOT/'data/status.js','AISON_STATUS',out)


def main():
    site=load_site(); registry=load_storyline_registry(); data=load_news(registry); status=read_json(STATUS)
    enrich_storylines(data,registry)
    enrich_reader_aids(data)
    editorial=build_editorial_payload()
    social_card_ids=build_social_cards(data,site,ROOT)
    write_js(ROOT/'data/news.js','AISON_NEWS',data)
    write_js(ROOT/'data/site.js','AISON_SITE',site)
    build_core_page_seo(site)
    hubs=build_topic_hub_pages(data,site,registry)
    build_search(data); build_article_pages(data,site,social_card_ids); build_rss(data,site); build_sitemap(data,site,registry); build_status(data,status)
    overview=build_daily_overview(data,site,ROOT)
    overview_count=overview.get('count',0) if overview else 0
    linked=sum(1 for n in data if n.get('storylineId'))
    print(f'Built AIson: {len(data)} articles / {sum(1 for n in data if n.get("verified"))} verified / {len(social_card_ids)} social cards / {linked} storyline-linked / {hubs} topic hubs / daily overview {overview_count} stories / editorial {editorial.get("source","?")}')


if __name__=='__main__': main()
