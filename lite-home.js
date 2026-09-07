(() => {
  const SAVED_KEY='aison-saved-news-v1';
  const FOLLOW_KEY='aison-followed-topics-v1';
  const $=(s,r=document)=>r.querySelector(s);
  const esc=(s='')=>String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const fmt=s=>{try{return new Intl.DateTimeFormat('zh-HK',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s+'T00:00:00'))}catch{return s}};
  const visuals={OpenAI:['◉','openai'],Google:['G','google'],Anthropic:['AI','anthropic'],NVIDIA:['N','nvidia'],Meta:['∞','meta'],'AI 安全':['⌁','safety'],'AI 晶片':['▦','chip'],'AI 政策':['⚖','policy'],'AI 工具':['✣','tools'],'AI 基建':['▦','chip'],'AI 研究':['∑','google'],'AI 機器人':['◆','nvidia'],'自動駕駛':['◆','nvidia'],'AI 投資':['◷','policy'],'AI 與工作':['◎','education']};
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

  function recommendationReason(item,followed,savedCategories){
    if(followed.includes(item.category)) return `因你追蹤 ${item.category}`;
    const tag=(item.tags||[]).find(value=>followed.includes(value));
    if(tag) return `因你追蹤 ${tag}`;
    if(savedCategories.has(item.category)) return `你收藏過 ${item.category} 內容`;
    return '今日編輯精選';
  }

  function scoreRecommendation(item,followed,savedCategories,savedIds){
    let score=Math.max(0,80-Math.min(80,Number(item.rank)||80));
    if(followed.includes(item.category)) score+=160;
    for(const tag of item.tags||[]) if(followed.includes(tag)) score+=70;
    if(savedCategories.has(item.category)) score+=35;
    if(savedIds.includes(item.id)) score-=120;
    return score;
  }

  function editorialFallback(index){
    const editorial=window.AISON_EDITORIAL||{};
    const byId=new Map(index.map(item=>[item.id,item]));
    const selected=(editorial.top3Ids||[]).map(id=>byId.get(id)).filter(Boolean);
    return selected.length?selected:index.slice(0,3);
  }

  function forYouItem(item,reason){
    const v=visual(item.category);
    return `<a class="follow-item" href="news/${encodeURIComponent(item.id)}.html"><span class="top-symbol ${v.tone}">${v.icon}</span><span><small>${esc(reason)} · ${fmt(item.date)}</small><b>${esc(item.title)}</b></span><i>→</i></a>`;
  }

  async function renderFollowing(){
    const picker=$('#followTopicPicker'),feed=$('#followFeed'),summary=$('#followSummary');
    if(!picker||!feed||!summary) return;
    const index=await loadIndex().catch(()=>[]);
    if(!index.length){summary.textContent='主題索引暫時未能載入。';feed.innerHTML='<p class="follow-empty">暫時未能建立個人化精選，請稍後再試。</p>';return}

    const categories=[...new Set(index.map(n=>n.category).filter(Boolean))];
    const followed=readList(FOLLOW_KEY).filter(topic=>categories.includes(topic));
    const savedIds=readList(SAVED_KEY);
    const byId=new Map(index.map(item=>[item.id,item]));
    const savedCategories=new Set(savedIds.map(id=>byId.get(id)?.category).filter(Boolean));

    picker.innerHTML=categories.map(category=>{const v=visual(category),active=followed.includes(category);return `<button type="button" class="follow-topic ${v.tone}${active?' active':''}" data-lite-follow="${esc(category)}" aria-pressed="${active}"><i>${v.icon}</i><span>${esc(category)}</span><b>${active?'✓':'＋'}</b></button>`}).join('');

    let picks=[];
    if(followed.length||savedCategories.size){
      picks=index.slice().sort((a,b)=>scoreRecommendation(b,followed,savedCategories,savedIds)-scoreRecommendation(a,followed,savedCategories,savedIds)||(Number(a.rank)||9999)-(Number(b.rank)||9999)).slice(0,5);
      const signals=[];
      if(followed.length) signals.push(`追蹤 ${followed.length} 個主題`);
      if(savedCategories.size) signals.push(`${savedCategories.size} 類本機收藏`);
      summary.textContent=`依你${signals.join('＋')}排序 · 只留喺目前瀏覽器，不需登入。`;
    }else{
      picks=editorialFallback(index);
      summary.textContent='未設定偏好前，先顯示今日編輯精選；揀選主題後會即時變成你的 For You。';
    }

    feed.innerHTML=picks.length?picks.map(item=>forYouItem(item,recommendationReason(item,followed,savedCategories))).join(''):'<p class="follow-empty">暫時未有相符新聞；下一次更新會再配對。</p>';

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
    $('#clearSaved')?.addEventListener('click',()=>setTimeout(()=>{writeList(SAVED_KEY,[]);renderSaved();renderFollowing()},0));
  });
})();
