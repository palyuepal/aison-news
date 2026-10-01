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
          '<div class="v6-hero-actions"><a class="v6-primary" href="daily.html">⚡ 30 秒掌握今日 AI <span>→</span></a><a class="v6-secondary" href="#today">完整今日 10 件事</a></div>'+
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

  function storyMedia(n){
    return '<div class="v6-story-media"><img src="assets/social/'+encodeURIComponent(n.id)+'.jpg" alt="" loading="eager" decoding="async"></div>';
  }

  function topStoriesMarkup(){
    const items=topStories();
    if(items.length<3)return '';
    const [lead,...rest]=items;
    const hk=brief((lead.hkImpact||[])[0]||lead.quickTake||lead.excerpt,105);
    return '<div class="v6-top-stories" data-v6-reveal>'+
      '<div class="v6-section-kicker">TODAY\'S SIGNALS · EDITOR\'S TOP 3</div>'+
      '<div class="v6-top-grid">'+
        '<a class="v6-story v6-story-lead" href="'+storyUrl(lead)+'">'+storyMedia(lead)+
          '<div class="v6-story-copy"><div class="v6-story-meta"><span class="v6-story-rank">01</span><span>'+esc(lead.category||'AI NEWS')+'</span>'+(lead.verified?'<span>✓ 已核實</span>':'')+'<span>'+esc(lead.readTime||'完整報道')+'</span></div>'+
          '<h2>'+esc(lead.title)+'</h2><span class="v6-story-hk">🇭🇰 '+esc(hk)+'</span></div>'+
        '</a>'+
        '<div class="v6-story-side">'+rest.map((n,index)=>'<a class="v6-story v6-story-small" href="'+storyUrl(n)+'"><div class="v6-story-meta"><span class="v6-story-rank">0'+(index+2)+'</span><span>'+esc(n.category||'AI NEWS')+'</span>'+(n.verified?'<span>✓ 已核實</span>':'')+'</div><h3>'+esc(n.title)+'</h3><p>'+esc(brief(n.quickTake||n.excerpt||n.summary,108))+'</p><span class="v6-read">閱讀重點 →</span></a>').join('')+'</div>'+
      '</div>'+
    '</div>';
  }

  function renderHero(){
    const root=document.getElementById('v6SignalHero');
    if(!root||!NEWS.length)return false;
    root.innerHTML=heroMarkup();
    root.hidden=false;
    root.querySelectorAll('.v6-story-media img').forEach(img=>img.addEventListener('error',()=>{const media=img.closest('.v6-story-media');if(media)media.style.display='none'},{once:true}));
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
      return '<a class="v6-audience-card" href="'+storyUrl(n)+'"><small>0'+(index+1)+' · '+esc(n.category||'AI NEWS')+'</small><h3>'+esc(n.title)+'</h3><p>'+esc(reason)+'</p><div class="v6-impact"><span>'+esc(config.label)+'影響</span><b aria-label="'+impact+' / 5">'+impactDots(impact)+'</b></div></a>';
    }).join('');
    root.querySelectorAll('[data-v6-audience]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.v6Audience===key)));
  }

  function renderForYou(){
    const root=document.getElementById('v6ForYou');
    if(!root||!NEWS.some(n=>n.audienceImpact))return;
    root.innerHTML='<div class="v6-for-you-head"><div><small>FOR YOU</small><h2>今日邊幾單同你最有關？</h2></div><div class="v6-audience-tabs" role="group" aria-label="選擇讀者身份">'+Object.entries(AUDIENCES).map(([key,value])=>'<button type="button" class="v6-audience-tab" data-v6-audience="'+key+'" aria-pressed="false">'+esc(value.label)+'</button>').join('')+'</div></div><div class="v6-audience-grid" data-v6-audience-grid></div><p class="v6-audience-note">排序只根據每日編輯資料內的受眾影響評級；選擇只儲存在此瀏覽器。</p>';
    const initial=savedAudience();
    renderAudienceCards(root,initial);
    root.querySelectorAll('[data-v6-audience]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.v6Audience;setAudience(key);renderAudienceCards(root,key)}));
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
      document.body.classList.add('v6-ready');
      initMotion();
    }catch(error){
      console.warn('AIson V6 homepage fallback active',error);
      document.body.classList.remove('v6-ready','v6-motion');
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
