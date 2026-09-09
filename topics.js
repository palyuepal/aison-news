(() => {
  const PAGE_SIZE=20;
  const $=(s,r=document)=>r.querySelector(s);
  const esc=(s='')=>String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const fmt=s=>{try{return new Intl.DateTimeFormat('zh-HK',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(String(s).slice(0,10)+'T00:00:00'))}catch{return String(s||'')}};
  const visuals={OpenAI:['◉','openai'],Google:['G','google'],Anthropic:['AI','anthropic'],NVIDIA:['N','nvidia'],Meta:['∞','meta'],SpaceX:['X','nvidia'],Apple:['A','tools'],'AI 安全':['⌁','safety'],'AI 晶片':['▦','chip'],'AI 政策':['⚖','policy'],'教育 AI':['✎','education'],'AI 工具':['✣','tools'],產業:['◆','nvidia'],開源:['⌘','anthropic'],科學:['◎','google'],網絡安全:['⌁','safety'],產品:['✣','tools'],醫療:['＋','education'],'醫療 AI':['＋','education'],研究:['∑','google'],創作:['✦','tools'],'AI 基建':['▦','chip'],基建:['▦','chip'],治理:['⚖','policy'],政策:['⚖','policy']};
  const visual=category=>{const v=visuals[category]||['✦','default'];return {icon:v[0],tone:v[1]}};
  const GENERIC=new Set(['AI','人工智能','AI Agent','Agent','產業','產品','研究','政策','治理','基建','AI 工具','AI 安全','AI 晶片','創作者','開發者','模型安全','資料中心']);
  const CURATED=[
    {name:'OpenAI',aliases:['openai','chatgpt','gpt']},
    {name:'NVIDIA',aliases:['nvidia','blackwell','rubin','h100','h200']},
    {name:'Google',aliases:['google','gemini','deepmind']},
    {name:'Anthropic',aliases:['anthropic','claude']},
    {name:'Meta',aliases:['meta','llama']},
    {name:'SpaceX',aliases:['spacex','starlink','starship']},
    {name:'Apple',aliases:['apple','apple intelligence']}
  ];

  function loadIndex(){
    if(window.AISON_SEARCH_INDEX_PROMISE)return window.AISON_SEARCH_INDEX_PROMISE;
    window.AISON_SEARCH_INDEX_PROMISE=fetch('data/search-index.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(`search index ${r.status}`);return r.json()}).then(rows=>Array.isArray(rows)?rows:[]);
    return window.AISON_SEARCH_INDEX_PROMISE;
  }
  function loadRegistry(){
    if(window.AISON_STORYLINE_REGISTRY_PROMISE)return window.AISON_STORYLINE_REGISTRY_PROMISE;
    window.AISON_STORYLINE_REGISTRY_PROMISE=fetch('data/storylines.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(`storyline registry ${r.status}`);return r.json()}).then(data=>data&&typeof data==='object'?data:{topics:[],storylines:[]});
    return window.AISON_STORYLINE_REGISTRY_PROMISE;
  }
  function storyHay(story){return [story.title,story.excerpt,story.category,...(story.tags||[])].filter(Boolean).join(' ').toLowerCase()}
  function definitionFor(name){return CURATED.find(item=>item.name===name)||{name,aliases:[String(name||'').toLowerCase()]}}
  function matchesDefinition(story,definition){
    if(!story||!definition)return false;
    if(story.category===definition.name||(story.tags||[]).includes(definition.name))return true;
    const hay=storyHay(story);
    return definition.aliases.some(alias=>hay.includes(String(alias).toLowerCase()));
  }
  function hitsForTopic(rows,topic){
    if(topic==='全部')return rows;
    const def=definitionFor(topic);
    return rows.filter(story=>matchesDefinition(story,def));
  }
  function hitsForTopicId(rows,topicId){return rows.filter(story=>story.topicId===topicId)}
  function hitsForStoryline(rows,storylineId){return rows.filter(story=>story.storylineId===storylineId)}
  function newest(rows){return rows.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||((Number(a.rank)||999999)-(Number(b.rank)||999999)))}

  function card(story){
    const v=visual(story.category),tags=(story.tags||[]).slice(0,3).map(tag=>`<span class="tag">${esc(tag)}</span>`).join('');
    const depth=story.deepRead?'<span class="topic-depth-badge">DEEP READ</span>':'';
    return `<a class="news-card" href="news/${encodeURIComponent(story.id)}.html"><div class="card-leading"><span class="rank">${String(story.rank||'').padStart(2,'0')}</span><span class="card-symbol ${v.tone}" aria-hidden="true">${v.icon}</span></div><div><div class="card-overline"><span>${esc(story.category)}</span>${depth}</div><h3>${esc(story.title)}</h3><p>${esc(story.excerpt)}</p><div class="meta">${tags}</div><div class="card-footer"><span>◷ ${fmt(story.date)}${story.readTime?` · ${esc(story.readTime)}`:''}</span><span class="card-arrow">→</span></div></div></a>`;
  }

  function topicChoices(rows){
    const available=new Set(rows.flatMap(n=>[n.category,...(n.tags||[])]).filter(Boolean));
    const curated=CURATED.filter(def=>hitsForTopic(rows,def.name).length).map(def=>def.name);
    const first=['OpenAI','ChatGPT','Google','Gemini','Anthropic','Claude','NVIDIA','Meta','SpaceX','Apple','AI Agent','AI 安全','AI 晶片','AI 政策','教育 AI','AI 工具'];
    const ordered=[...curated,...first.filter(topic=>available.has(topic))];
    const rest=[...available].filter(topic=>!ordered.includes(topic)).sort((a,b)=>a.localeCompare(b,'zh-Hant'));
    return [...new Set([...ordered,...rest])].slice(0,32);
  }

  function fallbackStorylines(rows){
    const result=[];
    CURATED.forEach(def=>{const hits=hitsForTopic(rows,def.name);if(hits.length>=2)result.push({name:def.name,hits,href:`topics.html?topic=${encodeURIComponent(def.name)}`,status:'auto'})});
    if(result.length<6){
      const blocked=new Set(['產業','產品','研究','政策','治理','基建','科學']);
      topicChoices(rows).forEach(name=>{
        if(result.some(x=>x.name===name)||blocked.has(name))return;
        const hits=hitsForTopic(rows,name);
        if(hits.length>=2)result.push({name,hits,href:`topics.html?topic=${encodeURIComponent(name)}`,status:'auto'});
      });
    }
    return result;
  }

  function storylineCandidates(rows,registry){
    const curated=(registry.storylines||[]).map(line=>({
      id:line.id,name:line.name,summary:line.summary||'',status:line.status||'active',
      hits:newest(hitsForStoryline(rows,line.id)),href:`topics.html?storyline=${encodeURIComponent(line.id)}`
    })).filter(line=>line.hits.length);
    const fallback=fallbackStorylines(rows).filter(line=>!curated.some(item=>item.name===line.name));
    return [...curated,...fallback].sort((a,b)=>{
      const ad=newest(a.hits)[0]?.date||'',bd=newest(b.hits)[0]?.date||'';
      return bd.localeCompare(ad)||b.hits.length-a.hits.length;
    }).slice(0,6);
  }

  function renderStorylineHub(rows,registry){
    const root=$('#storylineHub');if(!root)return;
    const lines=storylineCandidates(rows,registry);
    if(!lines.length){root.innerHTML='<div style="color:#b8c8df;font-size:12px">累積到可核實的同一故事進展後，AIson 會建立穩定故事線。</div>';return}
    root.innerHTML=lines.map(line=>{
      const sorted=newest(line.hits),latest=sorted[0],dates=line.hits.map(x=>x.date).filter(Boolean).sort();
      const deep=line.hits.filter(x=>x.deepRead).length;
      const state=line.status==='watching'?' · 監察中':line.status==='closed'?' · 已完結':'';
      return `<a class="storyline-card" href="${line.href}"><div class="storyline-card-top"><span class="storyline-card-name">${esc(line.name)}</span><span class="storyline-count">${line.hits.length} 篇${deep?` · ${deep} Deep Read`:''}${state}</span></div><p>${esc(line.summary||latest?.excerpt||latest?.title||'')}</p><div class="storyline-range">${fmt(dates[0])} → ${fmt(dates[dates.length-1])} · 睇完整故事線 →</div></a>`;
    }).join('');
  }

  function dominantTags(label,hits){
    const counts=new Map();
    hits.forEach(story=>(story.tags||[]).forEach(tag=>{
      if(!tag||tag===label||GENERIC.has(tag))return;
      counts.set(tag,(counts.get(tag)||0)+1);
    }));
    return [...counts.entries()].sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]),'zh-Hant')).slice(0,6);
  }

  function renderTopicBriefing(label,hits,latest,description=''){
    const root=$('#topicBriefing'),deepRoot=$('#topicDeepReads');if(!root||!deepRoot)return;
    const deep=newest(hits.filter(x=>x.deepRead));
    const signals=dominantTags(label,hits);
    root.innerHTML=`<div class="mini-label">30-SECOND TOPIC BRIEF</div><h3>${esc(label)} 而家去到邊？</h3><p>${esc(description||latest?.excerpt||'AIson 會持續整理這個主題的最新進展、背景與香港影響。')}</p><div class="topic-signal-row"><span class="topic-signal">${hits.length} 篇相關報道</span><span class="topic-signal">${deep.length} 篇 Deep Read</span>${signals.map(([tag,count])=>`<span class="topic-signal">${esc(tag)} · ${count}</span>`).join('')}</div>`;
    if(deep.length){
      deepRoot.innerHTML=deep.slice(0,3).map(story=>`<a class="topic-deep-card" href="news/${encodeURIComponent(story.id)}.html"><small><span class="deep-read-pill">DEEP READ</span><span>${esc(fmt(story.date))}${story.readTime?` · ${esc(story.readTime)}`:''}</span></small><b>${esc(story.title)}</b><span>深入閱讀 →</span></a>`).join('');
    }else{
      deepRoot.innerHTML='<p style="margin:0;color:#61728d;font-size:12px;line-height:1.65">目前未有足夠可靠材料達到 Deep Read 門檻；AIson 不會為湊篇幅而硬寫長文。</p>';
    }
  }

  function renderTimeline(label,hits,{description=''}={}){
    const section=$('#topicStoryline'),latestRoot=$('#storylineLatest'),facts=$('#storylineFacts'),timeline=$('#topicTimeline');
    if(!section||!latestRoot||!facts||!timeline)return false;
    if(!hits.length){section.classList.remove('show');section.setAttribute('aria-hidden','true');return false}
    const sortedNewest=newest(hits);
    const chronological=hits.slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||((Number(b.rank)||0)-(Number(a.rank)||0)));
    const latest=sortedNewest[0],first=chronological[0],dates=chronological.map(x=>x.date).filter(Boolean),deepCount=hits.filter(x=>x.deepRead).length;
    latestRoot.innerHTML=`<div class="storyline-eyebrow">LATEST DEVELOPMENT · ${esc(label)}</div><h3>${esc(latest.title)}</h3><p>${esc(latest.excerpt||'')}</p><a href="news/${encodeURIComponent(latest.id)}.html">閱讀最新進展 →</a>`;
    facts.innerHTML=`<div class="storyline-fact"><b>${hits.length}</b><span>相關報道</span></div><div class="storyline-fact"><b>${deepCount}</b><span>Deep Read</span></div><div class="storyline-fact"><b>${fmt(first.date)}</b><span>故事起點</span></div><div class="storyline-fact"><b>${fmt(latest.date)}</b><span>最新進展</span></div>`;
    renderTopicBriefing(label,hits,latest,description);
    timeline.innerHTML=chronological.map((story,index)=>{
      const isFirst=index===0,isLatest=story.id===latest.id;
      const badge=isLatest&&isFirst?'目前唯一報道':isLatest?'最新進展':isFirst?'故事起點':story.deepRead?'Deep Read':'後續發展';
      const cls=`timeline-entry${isFirst?' first':''}${isLatest?' latest':''}`;
      return `<article class="${cls}"><div class="timeline-meta"><span>${fmt(story.date)}</span><span>·</span><span>${esc(story.category||'AI')}</span><span class="timeline-badge">${badge}</span></div><h4>${esc(story.title)}</h4><p>${esc(story.excerpt||'')}</p><a href="news/${encodeURIComponent(story.id)}.html">閱讀這一節 →</a></article>`;
    }).join('');
    section.classList.add('show');section.setAttribute('aria-hidden','false');
    return true;
  }

  function bindMobile(){const button=$('#menuBtn'),menu=$('#mobileNav');if(!button||!menu||button.dataset.topicMenu==='1')return;button.dataset.topicMenu='1';button.addEventListener('click',()=>{menu.style.display=menu.style.display==='block'?'none':'block'})}

  async function init(){
    if(document.body?.dataset.page!=='topics')return;
    bindMobile();
    const chips=$('#topicChips'),grid=$('#topicGrid'),heading=$('#topicHeading'),lead=$('#topicLead'),stats=$('#topicStats'),empty=$('#topicEmpty'),more=$('#topicLoadMore'),relatedHead=$('#topicRelatedHead'),relatedTitle=$('#topicRelatedTitle');
    if(!chips||!grid||!heading||!lead||!stats||!empty||!more)return;
    stats.textContent='正在載入主題索引…';
    let rows=[],registry={topics:[],storylines:[]};
    try{[rows,registry]=await Promise.all([loadIndex(),loadRegistry().catch(()=>({topics:[],storylines:[]}))])}catch(error){console.error(error);stats.textContent='主題索引暫時載入失敗，請稍後再試。';empty.textContent='暫時未能載入主題。';empty.style.display='block';return}
    rows=newest(rows);
    renderStorylineHub(rows,registry);
    const topics=['全部',...topicChoices(rows)];
    const params=new URLSearchParams(location.search);
    let selected=params.get('topic')||'全部';
    let selectedStoryline=params.get('storyline')||'';
    let selectedTopicId=params.get('topicId')||'';
    if(!topics.includes(selected))selected='全部';
    if(selectedStoryline&&!(registry.storylines||[]).some(line=>line.id===selectedStoryline))selectedStoryline='';
    if(selectedTopicId&&!(registry.topics||[]).some(topic=>topic.id===selectedTopicId))selectedTopicId='';
    let visible=PAGE_SIZE;

    const resolveView=()=>{
      if(selectedStoryline){
        const line=(registry.storylines||[]).find(item=>item.id===selectedStoryline);
        return {mode:'storyline',label:line?.name||selectedStoryline,description:line?.summary||'',hits:newest(hitsForStoryline(rows,selectedStoryline))};
      }
      if(selectedTopicId){
        const topic=(registry.topics||[]).find(item=>item.id===selectedTopicId);
        return {mode:'topicId',label:topic?.name||selectedTopicId,description:topic?.description||'',hits:newest(hitsForTopicId(rows,selectedTopicId))};
      }
      return {mode:selected==='全部'?'all':'legacy',label:selected,description:'',hits:newest(hitsForTopic(rows,selected))};
    };

    const render=()=>{
      const view=resolveView(),hits=view.hits;
      const storyline=view.mode==='storyline'||view.mode==='topicId'||(view.mode==='legacy'&&hits.length>=2);
      if(storyline)renderTimeline(view.label,hits,{description:view.description});else $('#topicStoryline')?.classList.remove('show');
      const shown=hits.slice(0,visible),remaining=Math.max(0,hits.length-shown.length),deepCount=hits.filter(n=>n.deepRead).length;
      heading.textContent=view.mode==='all'?'所有主題':view.label+(view.mode==='storyline'?' 故事線':storyline?' 故事線':' 追蹤');
      lead.textContent=view.mode==='all'?'先由上面故事線睇脈絡，或者選擇公司、產品與分類查看全部相關報道。':view.description||storyline?`先睇最新進展與 Deep Read，再沿時間線理解 ${view.label} 的完整脈絡。`:`由最新到最早，整理 ${view.label} 的公告、產品更新與香港影響。`;
      stats.textContent=`${hits.length} 篇報導 · ${new Set(hits.map(n=>n.date)).size} 個更新日${deepCount?` · ${deepCount} 篇 Deep Read`:''} · ${view.mode==='all'?'所有分類':view.label}`;
      chips.innerHTML=topics.map(topic=>`<button type="button" class="topic-chip${!selectedStoryline&&!selectedTopicId&&topic===selected?' active':''}" data-topic="${esc(topic)}" aria-pressed="${!selectedStoryline&&!selectedTopicId&&topic===selected}">${esc(topic)}</button>`).join('');
      grid.style.display='';grid.innerHTML=shown.map(card).join('');empty.style.display=hits.length?'none':'block';more.hidden=!remaining;more.textContent=remaining?`載入更多（尚餘 ${remaining} 篇）`:'已顯示全部';
      if(relatedHead){relatedHead.classList.toggle('show',storyline);if(relatedTitle&&storyline)relatedTitle.textContent=`${view.label} 更多相關報道`}
      chips.querySelectorAll('[data-topic]').forEach(button=>button.addEventListener('click',()=>{
        selected=button.dataset.topic||'全部';selectedStoryline='';selectedTopicId='';visible=PAGE_SIZE;
        const url=new URL(location.href);url.searchParams.delete('storyline');url.searchParams.delete('topicId');selected==='全部'?url.searchParams.delete('topic'):url.searchParams.set('topic',selected);history.replaceState({},'',url);render();if(selected!=='全部')$('#topicHeading')?.scrollIntoView({behavior:'smooth',block:'start'});
      }));
    };
    more.addEventListener('click',()=>{visible+=PAGE_SIZE;render()});
    render();
  }

  document.addEventListener('DOMContentLoaded',init);
})();
