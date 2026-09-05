(() => {
  const PAGE_SIZE=20;
  const $=(s,r=document)=>r.querySelector(s);
  const esc=(s='')=>String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const fmt=s=>{try{return new Intl.DateTimeFormat('zh-HK',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s+'T00:00:00'))}catch{return s}};
  const visuals={OpenAI:['◉','openai'],Google:['G','google'],Anthropic:['AI','anthropic'],NVIDIA:['N','nvidia'],Meta:['∞','meta'],SpaceX:['X','nvidia'],Apple:['A','tools'],'AI 安全':['⌁','safety'],'AI 晶片':['▦','chip'],'AI 政策':['⚖','policy'],'教育 AI':['✎','education'],'AI 工具':['✣','tools'],產業:['◆','nvidia'],開源:['⌘','anthropic'],科學:['◎','google'],網絡安全:['⌁','safety'],產品:['✣','tools'],醫療:['＋','education'],'醫療 AI':['＋','education'],研究:['∑','google'],創作:['✦','tools'],'AI 基建':['▦','chip'],基建:['▦','chip'],治理:['⚖','policy'],政策:['⚖','policy']};
  const visual=category=>{const v=visuals[category]||['✦','default'];return {icon:v[0],tone:v[1]}};
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
    if(window.AISON_SEARCH_INDEX_PROMISE) return window.AISON_SEARCH_INDEX_PROMISE;
    window.AISON_SEARCH_INDEX_PROMISE=fetch('data/search-index.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(`search index ${r.status}`);return r.json()}).then(rows=>Array.isArray(rows)?rows:[]);
    return window.AISON_SEARCH_INDEX_PROMISE;
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

  function card(story){const v=visual(story.category),tags=(story.tags||[]).slice(0,3).map(tag=>`<span class="tag">${esc(tag)}</span>`).join('');return `<a class="news-card" href="news/${encodeURIComponent(story.id)}.html"><div class="card-leading"><span class="rank">${String(story.rank||'').padStart(2,'0')}</span><span class="card-symbol ${v.tone}" aria-hidden="true">${v.icon}</span></div><div><div class="card-overline"><span>${esc(story.category)}</span></div><h3>${esc(story.title)}</h3><p>${esc(story.excerpt)}</p><div class="meta">${tags}</div><div class="card-footer"><span>◷ ${fmt(story.date)}</span><span class="card-arrow">→</span></div></div></a>`}

  function topicChoices(rows){
    const available=new Set(rows.flatMap(n=>[n.category,...(n.tags||[])]).filter(Boolean));
    const curated=CURATED.filter(def=>hitsForTopic(rows,def.name).length).map(def=>def.name);
    const first=['OpenAI','ChatGPT','Google','Gemini','Anthropic','Claude','NVIDIA','Meta','SpaceX','Apple','AI Agent','AI 安全','AI 晶片','AI 政策','教育 AI','AI 工具'];
    const ordered=[...curated,...first.filter(topic=>available.has(topic))];
    const rest=[...available].filter(topic=>!ordered.includes(topic)).sort((a,b)=>a.localeCompare(b,'zh-Hant'));
    return [...new Set([...ordered,...rest])].slice(0,28);
  }

  function storylineCandidates(rows){
    const result=[];
    CURATED.forEach(def=>{const hits=hitsForTopic(rows,def.name);if(hits.length>=2)result.push({name:def.name,hits})});
    if(result.length<3){
      const genericBlocked=new Set(['產業','產品','研究','政策','治理','基建','科學']);
      topicChoices(rows).forEach(name=>{
        if(result.some(x=>x.name===name)||genericBlocked.has(name))return;
        const hits=hitsForTopic(rows,name);
        if(hits.length>=2)result.push({name,hits});
      });
    }
    return result.sort((a,b)=>{
      const ar=Math.min(...a.hits.map(x=>Number(x.rank)||999999));
      const br=Math.min(...b.hits.map(x=>Number(x.rank)||999999));
      return ar-br;
    }).slice(0,6);
  }

  function renderStorylineHub(rows){
    const root=$('#storylineHub');if(!root)return;
    const lines=storylineCandidates(rows);
    if(!lines.length){root.innerHTML='<div style="color:#b8c8df;font-size:12px">累積到至少兩篇同一主題報道後，AIson 會自動建立故事線。</div>';return}
    root.innerHTML=lines.map(line=>{
      const sorted=line.hits.slice().sort((a,b)=>(a.rank||999999)-(b.rank||999999));
      const latest=sorted[0],dates=line.hits.map(x=>x.date).filter(Boolean).sort();
      return `<a class="storyline-card" href="topics.html?topic=${encodeURIComponent(line.name)}"><div class="storyline-card-top"><span class="storyline-card-name">${esc(line.name)}</span><span class="storyline-count">${line.hits.length} 篇脈絡</span></div><p>${esc(latest?.excerpt||latest?.title||'')}</p><div class="storyline-range">${fmt(dates[0])} → ${fmt(dates[dates.length-1])} · 睇完整故事線 →</div></a>`;
    }).join('');
  }

  function renderTimeline(topic,hits){
    const section=$('#topicStoryline'),latestRoot=$('#storylineLatest'),facts=$('#storylineFacts'),timeline=$('#topicTimeline');
    if(!section||!latestRoot||!facts||!timeline)return false;
    if(topic==='全部'||hits.length<2){section.classList.remove('show');section.setAttribute('aria-hidden','true');return false}
    const newest=hits.slice().sort((a,b)=>(a.rank||999999)-(b.rank||999999));
    const chronological=hits.slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||((b.rank||0)-(a.rank||0)));
    const latest=newest[0],first=chronological[0],dates=chronological.map(x=>x.date).filter(Boolean);
    const uniqueDays=new Set(dates).size;
    latestRoot.innerHTML=`<div class="storyline-eyebrow">LATEST DEVELOPMENT · ${esc(topic)}</div><h3>${esc(latest.title)}</h3><p>${esc(latest.excerpt||'')}</p><a href="news/${encodeURIComponent(latest.id)}.html">閱讀最新進展 →</a>`;
    facts.innerHTML=`<div class="storyline-fact"><b>${hits.length}</b><span>相關報道</span></div><div class="storyline-fact"><b>${uniqueDays}</b><span>更新日</span></div><div class="storyline-fact"><b>${fmt(first.date)}</b><span>故事起點</span></div><div class="storyline-fact"><b>${fmt(latest.date)}</b><span>最新進展</span></div>`;
    timeline.innerHTML=chronological.map((story,index)=>{
      const isFirst=index===0,isLatest=story.id===latest.id;
      const badge=isLatest?'最新進展':isFirst?'故事起點':'後續發展';
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
    const chips=$('#topicChips'),grid=$('#topicGrid'),heading=$('#topicHeading'),lead=$('#topicLead'),stats=$('#topicStats'),empty=$('#topicEmpty'),more=$('#topicLoadMore');
    if(!chips||!grid||!heading||!lead||!stats||!empty||!more)return;
    stats.textContent='正在載入主題索引…';
    let rows=[];
    try{rows=await loadIndex()}catch(error){console.error(error);stats.textContent='主題索引暫時載入失敗，請稍後再試。';empty.textContent='暫時未能載入主題。';empty.style.display='block';return}
    rows=rows.slice().sort((a,b)=>(a.rank||999999)-(b.rank||999999));
    renderStorylineHub(rows);
    const topics=['全部',...topicChoices(rows)];
    let selected=new URLSearchParams(location.search).get('topic')||'全部';
    if(!topics.includes(selected))selected='全部';
    let visible=PAGE_SIZE;

    const render=()=>{
      const hits=hitsForTopic(rows,selected),storyline=renderTimeline(selected,hits);
      const shown=hits.slice(0,visible),remaining=Math.max(0,hits.length-shown.length);
      heading.textContent=selected==='全部'?'所有主題':selected+(storyline?' 故事線':' 追蹤');
      lead.textContent=selected==='全部'?'先由上面故事線睇脈絡，或者選擇公司、產品與分類查看全部相關報道。':storyline?`由第一篇到最新進展，串起 ${selected} 在 AIson 的完整報道脈絡。`:`由最新到最早，整理 ${selected} 的公告、產品更新與香港影響。`;
      stats.textContent=`${hits.length} 篇報導 · ${new Set(hits.map(n=>n.date)).size} 個更新日 · ${selected==='全部'?'所有分類':selected}${storyline?' · 故事線模式':''}`;
      chips.innerHTML=topics.map(topic=>`<button type="button" class="topic-chip${topic===selected?' active':''}" data-topic="${esc(topic)}" aria-pressed="${topic===selected}">${esc(topic)}</button>`).join('');
      if(storyline){grid.innerHTML='';grid.style.display='none';empty.style.display='none';more.hidden=true}else{grid.style.display='';grid.innerHTML=shown.map(card).join('');empty.style.display=hits.length?'none':'block';more.hidden=!remaining;more.textContent=remaining?`載入更多（尚餘 ${remaining} 篇）`:'已顯示全部'}
      chips.querySelectorAll('[data-topic]').forEach(button=>button.addEventListener('click',()=>{selected=button.dataset.topic||'全部';visible=PAGE_SIZE;const url=new URL(location.href);selected==='全部'?url.searchParams.delete('topic'):url.searchParams.set('topic',selected);history.replaceState({},'',url);render();if(selected!=='全部')$('#topicHeading')?.scrollIntoView({behavior:'smooth',block:'start'})}));
    };
    more.addEventListener('click',()=>{visible+=PAGE_SIZE;render()});
    render();
  }

  document.addEventListener('DOMContentLoaded',init);
})();
