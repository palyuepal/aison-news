(() => {
  const SAVED_KEY='aison-saved-news-v1';
  const FOLLOW_KEY='aison-followed-topics-v1';
  const $=(s,r=document)=>r.querySelector(s);
  const esc=(s='')=>String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const fmt=s=>{try{return new Intl.DateTimeFormat('zh-HK',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s+'T00:00:00'))}catch{return s}};
  const visuals={OpenAI:['◉','openai'],Google:['G','google'],Anthropic:['AI','anthropic'],NVIDIA:['N','nvidia'],Meta:['∞','meta'],'AI 安全':['⌁','safety'],'AI 晶片':['▦','chip'],'AI 政策':['⚖','policy'],'AI 工具':['✣','tools'],'AI 基建':['▦','chip']};
  const visual=category=>{const v=visuals[category]||['✦','default'];return {icon:v[0],tone:v[1]}};

  function readList(key){try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value.filter(x=>typeof x==='string'):[]}catch{return []}}
  function writeList(key,value){try{localStorage.setItem(key,JSON.stringify([...new Set(value)]))}catch{}}
  function loadIndex(){
    if(window.AISON_SEARCH_INDEX_PROMISE) return window.AISON_SEARCH_INDEX_PROMISE;
    window.AISON_SEARCH_INDEX_PROMISE=fetch('data/search-index.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(`search index ${r.status}`);return r.json()}).then(rows=>Array.isArray(rows)?rows:[]);
    return window.AISON_SEARCH_INDEX_PROMISE;
  }

  async function renderSaved(){
    const root=$('#savedList'),count=$('#savedCount'),clear=$('#clearSaved');
    if(!root||!count||!clear) return;
    const ids=readList(SAVED_KEY);
    if(!ids.length){root.innerHTML='<p class="saved-empty">未有收藏。文章頁按「加入稍後閱讀」，便可在此裝置保存。</p>';count.textContent='0';clear.hidden=true;return}
    const index=await loadIndex().catch(()=>[]);
    const byId=new Map(index.map(item=>[item.id,item]));
    const items=ids.map(id=>byId.get(id)).filter(Boolean);
    root.innerHTML=items.length?items.slice(0,4).map(n=>`<a class="saved-item" href="news/${encodeURIComponent(n.id)}.html"><span>★</span><b>${esc(n.title)}</b></a>`).join(''):'<p class="saved-empty">收藏仍然保留，但索引暫時未能載入。</p>';
    count.textContent=String(items.length||ids.length);
    clear.hidden=false;
  }

  async function renderFollowing(){
    const picker=$('#followTopicPicker'),feed=$('#followFeed'),summary=$('#followSummary');
    if(!picker||!feed||!summary) return;
    const index=await loadIndex().catch(()=>[]);
    if(!index.length){summary.textContent='主題索引暫時未能載入。';return}
    const categories=[...new Set(index.map(n=>n.category).filter(Boolean))];
    const followed=readList(FOLLOW_KEY).filter(topic=>categories.includes(topic));
    const matches=index.filter(n=>followed.includes(n.category));
    picker.innerHTML=categories.map(category=>{const v=visual(category),active=followed.includes(category);return `<button type="button" class="follow-topic ${v.tone}${active?' active':''}" data-lite-follow="${esc(category)}" aria-pressed="${active}"><i>${v.icon}</i><span>${esc(category)}</span><b>${active?'✓':'＋'}</b></button>`}).join('');
    summary.textContent=followed.length?`正在追蹤 ${followed.length} 個主題 · 有 ${matches.length} 則相關報導`:'揀選你關心的主題，之後每日更新會在這裡為你集中顯示。';
    feed.innerHTML=followed.length?(matches.slice(0,3).map(n=>{const v=visual(n.category);return `<a class="follow-item" href="news/${encodeURIComponent(n.id)}.html"><span class="top-symbol ${v.tone}">${v.icon}</span><span><small>${esc(n.category)} · ${fmt(n.date)}</small><b>${esc(n.title)}</b></span><i>→</i></a>`}).join('')||'<p class="follow-empty">暫時未有相符的新聞。</p>'):'<p class="follow-empty">你的追蹤只儲存在目前瀏覽器，不需登入，也不會收集個人資料。</p>';
    picker.querySelectorAll('[data-lite-follow]').forEach(button=>button.addEventListener('click',()=>{
      const topic=button.dataset.liteFollow||'';
      const current=readList(FOLLOW_KEY),active=current.includes(topic);
      writeList(FOLLOW_KEY,active?current.filter(x=>x!==topic):[...current,topic]);
      renderFollowing();
    }));
  }

  document.addEventListener('DOMContentLoaded',()=>{
    if(document.body?.dataset.page!=='home') return;
    renderSaved();renderFollowing();
    $('#clearSaved')?.addEventListener('click',()=>setTimeout(()=>{writeList(SAVED_KEY,[]);renderSaved()},0));
  });
})();
