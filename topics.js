(() => {
  const PAGE_SIZE=20;
  const $=(s,r=document)=>r.querySelector(s);
  const esc=(s='')=>String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const fmt=s=>{try{return new Intl.DateTimeFormat('zh-HK',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s+'T00:00:00'))}catch{return s}};
  const visuals={OpenAI:['◉','openai'],Google:['G','google'],Anthropic:['AI','anthropic'],NVIDIA:['N','nvidia'],Meta:['∞','meta'],'AI 安全':['⌁','safety'],'AI 晶片':['▦','chip'],'AI 政策':['⚖','policy'],'教育 AI':['✎','education'],'AI 工具':['✣','tools'],產業:['◆','nvidia'],開源:['⌘','anthropic'],科學:['◎','google'],網絡安全:['⌁','safety'],產品:['✣','tools'],醫療:['＋','education'],'醫療 AI':['＋','education'],研究:['∑','google'],創作:['✦','tools'],'AI 基建':['▦','chip'],基建:['▦','chip'],治理:['⚖','policy'],政策:['⚖','policy']};
  const visual=category=>{const v=visuals[category]||['✦','default'];return {icon:v[0],tone:v[1]}};

  function loadIndex(){
    if(window.AISON_SEARCH_INDEX_PROMISE) return window.AISON_SEARCH_INDEX_PROMISE;
    window.AISON_SEARCH_INDEX_PROMISE=fetch('data/search-index.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(`search index ${r.status}`);return r.json()}).then(rows=>Array.isArray(rows)?rows:[]);
    return window.AISON_SEARCH_INDEX_PROMISE;
  }

  function card(story){const v=visual(story.category),tags=(story.tags||[]).slice(0,3).map(tag=>`<span class="tag">${esc(tag)}</span>`).join('');return `<a class="news-card" href="news/${encodeURIComponent(story.id)}.html"><div class="card-leading"><span class="rank">${String(story.rank||'').padStart(2,'0')}</span><span class="card-symbol ${v.tone}" aria-hidden="true">${v.icon}</span></div><div><div class="card-overline"><span>${esc(story.category)}</span></div><h3>${esc(story.title)}</h3><p>${esc(story.excerpt)}</p><div class="meta">${tags}</div><div class="card-footer"><span>◷ ${fmt(story.date)}</span><span class="card-arrow">→</span></div></div></a>`}

  function topicChoices(rows){
    const available=new Set(rows.flatMap(n=>[n.category,...(n.tags||[])]).filter(Boolean));
    const first=['OpenAI','ChatGPT','Google','Gemini','Anthropic','Claude','NVIDIA','Meta','AI Agent','AI 安全','AI 晶片','AI 政策','教育 AI','AI 工具'];
    const rest=[...available].filter(topic=>!first.includes(topic)).sort((a,b)=>a.localeCompare(b,'zh-Hant'));
    return [...first.filter(topic=>available.has(topic)),...rest].slice(0,24);
  }

  function bindMobile(){const button=$('#menuBtn'),menu=$('#mobileNav');if(!button||!menu)return;button.addEventListener('click',()=>{menu.style.display=menu.style.display==='block'?'none':'block'})}

  async function init(){
    if(document.body?.dataset.page!=='topics')return;
    bindMobile();
    const chips=$('#topicChips'),grid=$('#topicGrid'),heading=$('#topicHeading'),lead=$('#topicLead'),stats=$('#topicStats'),empty=$('#topicEmpty'),more=$('#topicLoadMore');
    if(!chips||!grid||!heading||!lead||!stats||!empty||!more)return;
    stats.textContent='正在載入主題索引…';
    let rows=[];
    try{rows=await loadIndex()}catch(error){console.error(error);stats.textContent='主題索引暫時載入失敗，請稍後再試。';empty.textContent='暫時未能載入主題。';empty.style.display='block';return}
    rows=rows.slice().sort((a,b)=>(a.rank||999999)-(b.rank||999999));
    const topics=['全部',...topicChoices(rows)];
    let selected=new URLSearchParams(location.search).get('topic')||'全部';
    if(!topics.includes(selected))selected='全部';
    let visible=PAGE_SIZE;

    const hitsFor=()=>{if(selected==='全部')return rows;const q=selected.toLowerCase();return rows.filter(n=>n.category===selected||(n.tags||[]).includes(selected)||String(n.title||'').toLowerCase().includes(q))};
    const render=()=>{
      const hits=hitsFor(),shown=hits.slice(0,visible),remaining=Math.max(0,hits.length-shown.length);
      heading.textContent=selected==='全部'?'所有主題':selected+' 追蹤';
      lead.textContent=selected==='全部'?'選擇一個公司、產品或分類，查看 AIson 相關報導。':`由最新到最早，整理 ${selected} 的公告、產品更新與香港影響。`;
      stats.textContent=`${hits.length} 篇報導 · ${new Set(hits.map(n=>n.date)).size} 個更新日 · ${selected==='全部'?'所有分類':selected}`;
      chips.innerHTML=topics.map(topic=>`<button type="button" class="topic-chip${topic===selected?' active':''}" data-topic="${esc(topic)}" aria-pressed="${topic===selected}">${esc(topic)}</button>`).join('');
      grid.innerHTML=shown.map(card).join('');empty.style.display=hits.length?'none':'block';
      more.hidden=!remaining;more.textContent=remaining?`載入更多（尚餘 ${remaining} 篇）`:'已顯示全部';
      chips.querySelectorAll('[data-topic]').forEach(button=>button.addEventListener('click',()=>{selected=button.dataset.topic||'全部';visible=PAGE_SIZE;const url=new URL(location.href);selected==='全部'?url.searchParams.delete('topic'):url.searchParams.set('topic',selected);history.replaceState({},'',url);render()}));
    };
    more.addEventListener('click',()=>{visible+=PAGE_SIZE;render()});
    render();
  }

  document.addEventListener('DOMContentLoaded',init);
})();
