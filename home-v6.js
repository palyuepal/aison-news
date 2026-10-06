(() => {
  'use strict';
  const NEWS=(window.AISON_NEWS||[]).slice().sort((a,b)=>(Number(a.rank)||999)-(Number(b.rank)||999));
  const EDITORIAL=window.AISON_EDITORIAL||{};
  const AUDIENCE_KEY='aison-v6-audience-v1';
  const AUDIENCES={
    worker:{label:'打工仔',key:'worker'},
    sme:{label:'中小企',key:'sme'},
    creator:{label:'創作者',key:'creator'},
    developer:{label:'開發者',key:'developer'}
  };
  const esc=(value='')=>String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const brief=(value='',limit=120)=>{const s=String(value||'').replace(/\s+/g,' ').trim();return s.length>limit?s.slice(0,limit).replace(/[，。；、\s]+$/,'')+'…':s};
  const fmt=value=>{try{return new Intl.DateTimeFormat('zh-HK',{year:'numeric',month:'short',day:'numeric'}).format(new Date(String(value).slice(0,10)+'T00:00:00'))}catch{return String(value||'')}};
  const storyUrl=n=>'news/'+encodeURIComponent(n.id)+'.html';
  const currentEditorial=()=>Boolean(NEWS[0]&&EDITORIAL.date===NEWS[0].date);

  function topStories(){
    if(currentEditorial()&&Array.isArray(EDITORIAL.top3Ids)){
      const map=new Map(NEWS.map(n=>[n.id,n]));
      const picks=EDITORIAL.top3Ids.map(id=>map.get(id)).filter(Boolean);
      if(picks.length===3)return picks;
    }
    return NEWS.slice(0,3);
  }

  function signalTheme(story){
    const category=String(story.category||'');
    const tags=(story.tags||[]).join(' ');
    const hay=(category+' '+tags).toLowerCase();
    if(/agent/.test(hay))return 'AGENTS';
    if(/安全|網絡安全|security|cyber/.test(hay))return 'SECURITY';
    if(/政策|法律|治理|regulation|copyright/.test(hay))return 'POLICY';
    if(/晶片|供應鏈|基建|semiconductor|hbm|memory|chip/.test(hay))return 'INFRA';
    if(/廣告|應用|工具|創作|voice|advert/.test(hay))return 'APPLICATION';
    if(/財經|估值|fund|finance|投資/.test(hay))return 'BUSINESS';
    if(/研究|科學|research/.test(hay))return 'RESEARCH';
    return 'AI';
  }

  function buildSignals(){
    const scores=new Map();
    const add=(name,score)=>scores.set(name,(scores.get(name)||0)+score);
    NEWS.slice(0,10).forEach(story=>{
      const importance=Number(story.aisonScore)||Math.max(3,11-(Number(story.rank)||10));
      add(signalTheme(story),importance);
      const hay=[story.category,...(story.tags||[])].join(' ').toLowerCase();
      const brands=[
        ['OPENAI',/openai|chatgpt|\bgpt\b/],
        ['GOOGLE',/google|gemini|deepmind/],
        ['ANTHROPIC',/anthropic|claude/],
        ['NVIDIA',/nvidia|blackwell|rubin/],
        ['META',/\bmeta\b|llama/],
        ['AMAZON',/amazon|aws/]
      ];
      brands.forEach(([label,re])=>{if(re.test(hay))add(label,importance*.72)});
    });
    return [...scores.entries()].map(([name,score])=>({name,score})).sort((a,b)=>b.score-a.score).slice(0,5);
  }

  function signalMarkup(signals){
    const max=Math.max(...signals.map(s=>s.score),1);
    return signals.map((signal,index)=>{
      const ratio=signal.score/max;
      const size=ratio>=.76?'size-l':ratio>=.5?'size-m':'size-s';
      return '<span class="v6-signal-node '+size+'" aria-hidden="true"><span><b>'+esc(signal.name)+'</b><small>SIGNAL 0'+(index+1)+'</small></span></span>';
    }).join('');
  }

  function heroMarkup(){
    const lead=NEWS[0];
    const oneLine=(currentEditorial()&&EDITORIAL.dailyOneLiner)||lead.quickTake||lead.summary||lead.excerpt;
    const signals=buildSignals();
    const labels=signals.map(s=>s.name).join(' · ');
    return '<div class="container">'+
      '<div class="v6-hero" data-v6-reveal>'+
        '<div class="v6-hero-copy">'+
          '<div class="v6-edition"><b>AIson DAILY</b><span>'+esc(fmt(lead.date))+'</span><span>10 STORIES</span></div>'+
          '<h1>今日 AI，<em>真正值得你知道。</em></h1>'+
          '<p class="v6-one-line">'+esc(oneLine)+'</p>'+
          '<div class="v6-hero-actions"><a class="v6-primary" href="daily.html" data-analytics-event="home_cta_click" data-analytics-content="quick_daily" data-analytics-slot="signal_hero">⚡ 快速掌握今日 AI <span>→</span></a><a class="v6-secondary" href="#today" data-analytics-event="home_cta_click" data-analytics-content="full_today" data-analytics-slot="signal_hero">完整今日 10 件事</a></div>'+
          '<div class="v6-hero-proof"><span>每日人工編輯</span><span>來源核實</span><span>香港影響</span></div>'+
        '</div>'+
        '<div class="v6-signal-stage" aria-label="今日 AI 訊號集中於 '+esc(labels)+'">'+
          '<div class="v6-signal-orbit" aria-hidden="true"></div>'+
          signalMarkup(signals)+
          '<div class="v6-signal-core" aria-hidden="true"><span><strong>10</strong><span>TODAY\'S<br>SIGNAL</span></span></div>'+
          '<div class="v6-signal-summary">今日主要訊號：'+esc(labels)+'</div>'+
        '</div>'+
      '</div>'+
      topStoriesMarkup()+
    '</div>';
  }

  function storyVisual(n){
    const visual=n&&n.visual&&typeof n.visual==='object'?n.visual:null;
    return visual?.src?visual:null;
  }
  function mediaFallback(n){
    return '<span class="story-media-fallback"><small>AIson NEWS</small><b>'+esc(n.category||'AI NEWS')+'</b></span>';
  }
  function storyMedia(n){
    const visual=storyVisual(n);
    if(!visual)return '<div class="v6-story-media is-editorial-fallback">'+mediaFallback(n)+'</div>';
    return '<div class="v6-story-media" data-image-kind="'+esc(visual.kind||'story')+'"><img src="'+esc(visual.src)+'" alt="'+esc(visual.alt||n.title||'AIson 新聞圖片')+'" loading="eager" decoding="async">'+mediaFallback(n)+'</div>';
  }

  function topStoriesMarkup(){
    const items=topStories();
    if(items.length<3)return '';
    const [lead,...rest]=items;
    const hk=brief((lead.hkImpact||[])[0]||lead.quickTake||lead.excerpt,105);
    return '<div class="v6-top-stories" data-v6-reveal>'+
      '<div class="v6-section-kicker">TODAY\'S SIGNALS · EDITOR\'S TOP 3</div>'+
      '<div class="v6-top-grid">'+
        '<a class="v6-story v6-story-lead" href="'+storyUrl(lead)+'" data-analytics-event="home_story_open" data-analytics-content="'+esc(lead.id)+'" data-analytics-slot="top_signal_01" data-analytics-rank="1">'+storyMedia(lead)+
          '<div class="v6-story-copy"><div class="v6-story-meta"><span class="v6-story-rank">01</span><span>'+esc(lead.category||'AI NEWS')+'</span>'+(lead.verified?'<span>✓ 已核實</span>':'')+'<span>'+esc(lead.readTime||'完整報道')+'</span></div>'+
          '<h2>'+esc(lead.title)+'</h2><span class="v6-story-hk">🇭🇰 '+esc(hk)+'</span></div>'+
        '</a>'+
        '<div class="v6-story-side">'+rest.map((n,index)=>'<a class="v6-story v6-story-small" href="'+storyUrl(n)+'" data-analytics-event="home_story_open" data-analytics-content="'+esc(n.id)+'" data-analytics-slot="top_signal_0'+(index+2)+'" data-analytics-rank="'+(index+2)+'"><div class="v6-story-meta"><span class="v6-story-rank">0'+(index+2)+'</span><span>'+esc(n.category||'AI NEWS')+'</span>'+(n.verified?'<span>✓ 已核實</span>':'')+'</div><h3>'+esc(n.title)+'</h3><p>'+esc(brief(n.quickTake||n.excerpt||n.summary,108))+'</p><span class="v6-read">閱讀重點 →</span></a>').join('')+'</div>'+
      '</div>'+
    '</div>';
  }

  function renderHero(){
    const root=document.getElementById('v6SignalHero');
    if(!root||!NEWS.length)return false;
    root.innerHTML=heroMarkup();
    root.hidden=false;
    root.querySelectorAll('.v6-story-media img').forEach(img=>img.addEventListener('error',()=>{const media=img.closest('.v6-story-media');if(media)media.classList.add('is-editorial-fallback')},{once:true}));
    return true;
  }

  function renderThemes(){
    const root=document.getElementById('v6Themes');
    if(!root||!currentEditorial()||!Array.isArray(EDITORIAL.threeThemes)||EDITORIAL.threeThemes.length!==3)return;
    root.innerHTML='<div class="container"><div class="v6-themes-head" data-v6-reveal><div><small>THREE SIGNALS TO FOLLOW</small><h2>今日三條主線</h2></div><p>唔只逐條新聞睇，而係睇清今日 AI 世界真正向邊度移動。</p></div><div class="v6-theme-grid">'+EDITORIAL.threeThemes.map((theme,index)=>'<article class="v6-theme-card" data-v6-reveal><b>0'+(index+1)+'</b><h3>'+esc(theme.title)+'</h3><p>'+esc(brief(theme.summary,150))+'</p><span>接住睇：'+esc(brief(theme.watch,92))+'</span></article>').join('')+'</div></div>';
    root.hidden=false;
  }

  function savedAudience(){
    try{const value=localStorage.getItem(AUDIENCE_KEY);return AUDIENCES[value]?value:'worker'}catch{return 'worker'}
  }
  function setAudience(value){try{localStorage.setItem(AUDIENCE_KEY,value)}catch{}}
  function impactValue(story,key){return Math.max(0,Math.min(5,Number(story.audienceImpact?.[key])||0))}
  function impactDots(value){return '●'.repeat(value)+'<i>'+'●'.repeat(Math.max(0,5-value))+'</i>'}

  function audienceCards(key){
    return NEWS.filter(story=>impactValue(story,key)>0).sort((a,b)=>impactValue(b,key)-impactValue(a,key)||(Number(b.aisonScore)||0)-(Number(a.aisonScore)||0)||(Number(a.rank)||99)-(Number(b.rank)||99)).slice(0,3);
  }

  function renderAudienceCards(root,key){
    const config=AUDIENCES[key]||AUDIENCES.worker;
    const items=audienceCards(config.key);
    const grid=root.querySelector('[data-v6-audience-grid]');
    if(!grid)return;
    grid.innerHTML=items.map((n,index)=>{
      const impact=impactValue(n,config.key);
      const reason=brief(n.actionReason||n.quickTake||n.excerpt,92);
      return '<a class="v6-audience-card" href="'+storyUrl(n)+'" data-analytics-event="for_you_story_open" data-analytics-content="'+esc(n.id)+'" data-analytics-slot="for_you_'+esc(config.key)+'" data-analytics-rank="'+(index+1)+'"><small>0'+(index+1)+' · '+esc(n.category||'AI NEWS')+'</small><h3>'+esc(n.title)+'</h3><p>'+esc(reason)+'</p><div class="v6-impact"><span>'+esc(config.label)+'影響</span><b aria-label="'+impact+' / 5">'+impactDots(impact)+'</b></div></a>';
    }).join('');
    root.querySelectorAll('[data-v6-audience]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.v6Audience===key)));
  }

  function renderForYou(){
    const root=document.getElementById('v6ForYou');
    if(!root||!NEWS.some(n=>n.audienceImpact))return;
    root.innerHTML='<div class="v6-for-you-head"><div><small>FOR YOU</small><h2>今日邊幾單同你最有關？</h2></div><div class="v6-audience-tabs" role="group" aria-label="選擇讀者身份">'+Object.entries(AUDIENCES).map(([key,value])=>'<button type="button" class="v6-audience-tab" data-v6-audience="'+key+'" data-analytics-event="audience_select" data-analytics-content="'+key+'" data-analytics-slot="for_you" aria-pressed="false">'+esc(value.label)+'</button>').join('')+'</div></div><div class="v6-audience-grid" data-v6-audience-grid></div><p class="v6-audience-note">排序只根據每日編輯資料內的受眾影響評級；選擇只儲存在此瀏覽器。</p>';
    const initial=savedAudience();
    renderAudienceCards(root,initial);
    root.querySelectorAll('[data-v6-audience]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.v6Audience;setAudience(key);renderAudienceCards(root,key)}));
    root.hidden=false;
  }

  function renderEditorialBridge(){
    const root=document.getElementById('v6EditorialBridge');
    if(!root||!currentEditorial()||!EDITORIAL.biggestChange||!EDITORIAL.watchTomorrow)return;
    root.innerHTML='<div class="v6-editorial-bridge-grid"><article class="v6-shift-card" data-v6-reveal><small>TODAY\'S SHIFT</small><h2>今日真正改變咗咩？</h2><p>'+esc(EDITORIAL.biggestChange)+'</p></article><article class="v6-watch-card" data-v6-reveal><small>WATCH TOMORROW</small><h2>聽日值得追住睇</h2><p>'+esc(EDITORIAL.watchTomorrow)+'</p></article></div>';
    root.hidden=false;
  }

  function initMotion(){
    const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!reduce)document.body.classList.add('v6-motion');
    const items=[...document.querySelectorAll('[data-v6-reveal]')];
    if(reduce||!('IntersectionObserver' in window)){items.forEach(item=>item.classList.add('is-visible'));return}
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.12});
    items.forEach(item=>observer.observe(item));
  }

  function start(){
    if(document.body?.dataset.page!=='home'||NEWS.length<3)return;
    try{
      if(!renderHero())return;
      renderThemes();
      renderForYou();
      renderEditorialBridge();
      document.body.classList.add('v6-ready');
      const legacyHero=document.querySelector('main > .editorial-feature');
      if(legacyHero)legacyHero.setAttribute('aria-hidden','true');
      initMotion();
    }catch(error){
      console.warn('AIson V6 homepage fallback active',error);
      document.body.classList.remove('v6-ready','v6-motion');
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();


/* ===== AIson Editorial B2 — publication front page ===== */
(() => {
  'use strict';
  const esc=(value='')=>String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const fmt=value=>{try{return new Intl.DateTimeFormat('zh-HK',{year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(new Date(String(value).slice(0,10)+'T00:00:00'))}catch{return String(value||'')}};
  const brief=(value='',limit=155)=>{const s=String(value||'').replace(/\s+/g,' ').trim();return s.length>limit?s.slice(0,limit).replace(/[，。；、\s]+$/,'')+'…':s};
  const url=n=>'news/'+encodeURIComponent(n.id)+'.html';
  const visual=n=>n&&n.visual&&typeof n.visual==='object'&&n.visual.src?n.visual:null;
  const mediaFallback=n=>'<span class="story-media-fallback"><small>AIson NEWS</small><b>'+esc(n.category||'AI NEWS')+'</b></span>';
  function cardMedia(n,className='b2-card-media',eager=false){
    const v=visual(n);
    if(!v)return '<div class="'+className+' is-editorial-fallback">'+mediaFallback(n)+'</div>';
    return '<div class="'+className+'" data-image-kind="'+esc(v.kind||'story')+'"><img src="'+esc(v.src)+'" alt="'+esc(v.alt||n.title||'AIson 新聞圖片')+'" loading="'+(eager?'eager':'lazy')+'" decoding="async">'+mediaFallback(n)+'</div>';
  }

  function pulseMarkup(news){
    const live=[...document.querySelectorAll('#liveList .live-item')].slice(0,3).map(item=>({
      time:item.querySelector('.live-time')?.textContent?.trim()||'LIVE',
      title:item.querySelector('h4')?.textContent?.trim()||'AIson LIVE 更新'
    })).filter(x=>x.title);
    const rows=live.length?live:news.slice(1,4).map((n,index)=>({time:'0'+(index+1),title:n.title}));
    return rows.map(row=>'<div class="b2-pulse-row"><time>'+esc(row.time)+'</time><p>'+esc(row.title)+'</p></div>').join('');
  }

  function topThree(news){
    const [lead,second,third]=news;
    const side=[second,third].filter(Boolean);
    return '<section class="b2-top-three"><div class="container"><div class="b2-section-head"><div><small>TODAY\'S TEN · EDITOR\'S RANKING</small><h2>今日 AI，一頁睇晒</h2></div><a href="daily.html">完整每日 Story Flow →</a></div><div class="b2-top-grid">'+
      '<a class="b2-lead-card" href="'+url(lead)+'">'+cardMedia(lead,'b2-card-media',true)+'<div class="b2-card-copy"><div class="b2-story-meta"><b>01</b><span>'+esc(lead.category||'AI NEWS')+'</span>'+(lead.verified?'<span>✓ 已核實</span>':'')+'</div><h2>'+esc(lead.title)+'</h2><p>'+esc(brief(lead.quickTake||lead.summary||lead.excerpt,190))+'</p><strong>閱讀完整報道 →</strong></div></a>'+
      '<div class="b2-side-cards">'+side.map((n,index)=>'<a class="b2-side-card" href="'+url(n)+'">'+cardMedia(n,'b2-side-media')+'<div class="b2-story-meta"><b>0'+(index+2)+'</b><span>'+esc(n.category||'AI NEWS')+'</span>'+(n.verified?'<span>✓ 已核實</span>':'')+'</div><h3>'+esc(n.title)+'</h3><p>'+esc(brief(n.quickTake||n.excerpt||n.summary,110))+'</p><strong>閱讀重點 →</strong></a>').join('')+'</div>'+
    '</div></div></section>';
  }

  function init(){
    if(document.body?.dataset.page!=='home')return;
    const news=(window.AISON_NEWS||[]).slice().sort((a,b)=>(Number(a.rank)||999)-(Number(b.rank)||999)).slice(0,10);
    if(news.length<3)return;
    const lead=news[0], score=Number(lead.aisonScore)||0;
    const major=Boolean(lead.verified&&score>=9.2);
    const root=document.getElementById('v6SignalHero');
    if(!root)return;

    const ticker=major?'<div class="b2-ticker" aria-label="重大新聞快訊"><div class="b2-ticker-track">'+
      news.slice(0,5).concat(news.slice(0,5)).map(n=>'<span>◆ '+esc(n.title)+'</span>').join('')+
      '</div></div>':'';

    root.innerHTML=
      '<section class="b2-front b2-'+(major?'major':'normal')+'">'+
        '<div class="b2-util"><div class="container"><span>'+esc(fmt(lead.date))+' · 香港</span><span class="b2-live-state"><i></i> AIson LIVE · 即時更新</span></div></div>'+
        '<div class="container b2-front-grid">'+
          '<div class="b2-front-copy">'+
            '<div class="b2-editor-mark"><img src="assets/mascot.webp" alt="" width="42" height="42"><span><b>AIson 編輯台</b><small>01–10 依重要性排序</small></span></div>'+
            '<div class="b2-kicker">AIson DAILY · STORY 01'+(major?' · MAJOR DAY':'')+'</div>'+
            '<h1>'+esc(lead.title)+'</h1>'+
            '<p class="b2-dek">'+esc(brief(lead.summary||lead.excerpt,235))+'</p>'+
            '<div class="b2-actions"><a class="b2-primary" href="'+url(lead)+'">閱讀完整報道 →</a><a class="b2-secondary" href="daily.html">睇今日其餘 9 件事</a></div>'+
            '<div class="b2-byline">'+(lead.verified?'<span>✓ 已核實</span>':'')+(score?'<span>AIson Score '+score.toFixed(1)+' / 10</span>':'')+'<span>'+esc(lead.category||'AI NEWS')+'</span><span>'+esc(lead.readTime||'完整報道')+'</span></div>'+
          '</div>'+
          '<aside class="b2-pulse"><div class="b2-pulse-head"><span>● AIson LIVE</span><a href="live.html">進入 LIVE →</a></div>'+pulseMarkup(news)+'</aside>'+
        '</div>'+
      '</section>'+ticker+topThree(news);

    root.hidden=false;
    root.querySelectorAll('.b2-card-media img,.b2-side-media img').forEach(img=>img.addEventListener('error',()=>{const media=img.closest('.b2-card-media,.b2-side-media');if(media)media.classList.add('is-editorial-fallback')},{once:true}));
    document.body.classList.add('b2-ready',major?'b2-major-day':'b2-normal-day');

    const sectionHead=document.querySelector('#today .section-head');
    if(sectionHead){
      const label=sectionHead.querySelector('.mini-label'), title=sectionHead.querySelector('h2');
      if(label)label.textContent='STORIES 04–10 · EDITORIAL RANKING';
      if(title)title.textContent='繼續今日版';
    }
    [...document.querySelectorAll('#newsGrid .news-card')].forEach((card,index)=>{
      card.classList.add(index<2?'b2-mid-story':'b2-mini-story');
    });

    const themes=document.getElementById('v6Themes');
    if(themes){
      const small=themes.querySelector('.v6-themes-head small'), h2=themes.querySelector('.v6-themes-head h2'), p=themes.querySelector('.v6-themes-head p');
      if(small)small.textContent='AIson SIGNALS · CONNECT THE DOTS';
      if(h2)h2.textContent='今日三條主線';
      if(p)p.textContent='唔只逐條睇新聞：將今日事件串成三條值得追落去嘅脈絡。';
    }
    const liveTitle=document.querySelector('#aison-live .live-title');
    if(liveTitle)liveTitle.lastChild.textContent='完整即時脈搏';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});
  else setTimeout(init,0);
})();
