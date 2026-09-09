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

  function textLength(value=''){return String(value||'').replace(/\s+/g,'').length}
  function deepReadReady(n){
    if(!n?.verified||!n.sourceUrl)return false;
    const impacts=Array.isArray(n.hkImpact)?n.hkImpact:[];
    const total=['summary','whatHappened','reportingContext','deepDive','whyImportant','whatToWatch','take'].reduce((sum,key)=>sum+textLength(n[key]),0)+impacts.reduce((sum,item)=>sum+textLength(item),0);
    return impacts.length>=3&&textLength(n.whatHappened)>=300&&textLength(n.reportingContext)>=400&&textLength(n.deepDive)>=900&&textLength(n.whyImportant)>=250&&textLength(n.whatToWatch)>=180&&total>=2800;
  }
  function compact(value='',limit=150){const text=String(value||'').replace(/\s+/g,' ').trim();return text.length>limit?text.slice(0,limit).replace(/[，。；：、\s]+$/,'')+'…':text}
  function featuredStories(){
    const rows=(window.AISON_NEWS||[]).slice().sort((a,b)=>(Number(a.rank)||999)-(Number(b.rank)||999));
    const byId=new Map(rows.map(item=>[item.id,item]));
    const ids=window.AISON_EDITORIAL?.top3Ids||[];
    const selected=ids.map(id=>byId.get(id)).filter(Boolean);
    return (selected.length?selected:rows.slice(0,3)).slice(0,3);
  }
  function addFeaturedStyles(){
    if(document.getElementById('aison-featured3-style'))return;
    const style=document.createElement('style');style.id='aison-featured3-style';style.textContent=`
      .editorial-feature{padding:30px 0 38px;background:linear-gradient(180deg,#f7fbff 0%,#eef5ff 100%)}
      .featured3-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:18px}.featured3-head h2{margin:5px 0 6px;font-size:clamp(27px,3.3vw,42px);letter-spacing:-.035em;color:#061a3a}.featured3-head p{margin:0;max-width:720px;color:#526780;line-height:1.65}.featured3-note{flex:0 0 auto;padding:8px 11px;border:1px solid #cedcf0;border-radius:999px;background:#fff;color:#526780;font-size:11px;font-weight:900}
      .featured3-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);grid-template-rows:1fr 1fr;gap:14px}.featured3-card{position:relative;display:flex;flex-direction:column;min-width:0;padding:22px;border:1px solid #d5e3f4;border-radius:20px;background:#fff;color:#071b3d;text-decoration:none;box-shadow:0 12px 34px rgba(6,26,58,.07);overflow:hidden;transition:transform .18s ease,box-shadow .18s ease}.featured3-card:hover{transform:translateY(-2px);box-shadow:0 18px 42px rgba(6,26,58,.11)}.featured3-card.lead{grid-row:1/3;padding:28px;background:linear-gradient(145deg,#061a3a 0%,#0d3568 100%);color:#fff;border-color:#173e70}.featured3-card:after{content:'';position:absolute;right:-54px;top:-54px;width:150px;height:150px;border-radius:50%;background:rgba(33,111,214,.07)}.featured3-card.lead:after{background:rgba(255,201,40,.09);width:220px;height:220px}
      .featured3-top{position:relative;z-index:1;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.featured3-rank{display:inline-grid;place-items:center;width:32px;height:32px;border-radius:9px;background:#eef5ff;color:#123b78;font-size:11px;font-weight:950}.featured3-card.lead .featured3-rank{background:#ffc928;color:#071b3d}.featured3-cat{font-size:11px;font-weight:950;letter-spacing:.04em}.featured3-verified{font-size:10px;font-weight:900;color:#168553}.featured3-card.lead .featured3-verified{color:#8ff0bb}.featured3-depth{margin-left:auto;padding:5px 8px;border-radius:999px;background:#e8f2ff;color:#174c92;font-size:9px;font-weight:950;letter-spacing:.06em}.featured3-card.lead .featured3-depth{background:rgba(255,255,255,.13);color:#ffe187}
      .featured3-card h3{position:relative;z-index:1;margin:15px 0 9px;font-size:18px;line-height:1.45;letter-spacing:-.015em}.featured3-card.lead h3{font-size:clamp(25px,3vw,37px);line-height:1.28;margin-top:22px}.featured3-summary{position:relative;z-index:1;margin:0;color:#5b6f8c;font-size:13px;line-height:1.7}.featured3-card.lead .featured3-summary{color:#cad8ec;font-size:15px;line-height:1.75;max-width:92%}.featured3-insight{position:relative;z-index:1;margin-top:15px;padding-top:13px;border-top:1px solid #e4edf8;color:#314b70;font-size:12px;line-height:1.6}.featured3-card.lead .featured3-insight{margin-top:auto;padding-top:18px;border-top-color:rgba(255,255,255,.14);color:#d7e4f5}.featured3-insight b{display:block;margin-bottom:4px;color:#123b78;font-size:10px;letter-spacing:.04em}.featured3-card.lead .featured3-insight b{color:#ffe187}.featured3-foot{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:16px;font-size:11px;font-weight:900;color:#61728d}.featured3-card.lead .featured3-foot{color:#b9cbe6}.featured3-read{color:#174c92}.featured3-card.lead .featured3-read{color:#ffe187}
      @media(max-width:820px){.editorial-feature{padding:22px 0 30px}.featured3-head{align-items:flex-start;flex-direction:column}.featured3-grid{grid-template-columns:1fr;grid-template-rows:auto}.featured3-card.lead{grid-row:auto;padding:22px}.featured3-card.lead h3{font-size:26px}.featured3-card.lead .featured3-summary{max-width:none}.featured3-note{display:none}}
    `;document.head.appendChild(style);
  }
  function renderFeatured3(){
    const root=$('#editorialFeature');if(!root)return;
    const items=featuredStories();if(!items.length)return;
    addFeaturedStyles();
    root.innerHTML=`<div class="featured3-head"><div><div class="mini-label">TODAY'S MUST READ</div><h2 id="editorialFeatureTitle">今日必讀 3 篇</h2><p>先睇編輯排序最高的三則；值得深挖的報道會標示 Deep Read，其餘保留完整背景、香港影響與後續觀察。</p></div><span class="featured3-note">編輯排序 · 不是點擊榜</span></div><div class="featured3-grid">${items.map((n,index)=>{const v=visual(n.category),deep=deepReadReady(n),summary=compact(n.summary||n.excerpt,index===0?230:125),insight=compact((n.hkImpact||[])[0]||n.whyImportant||'',index===0?180:105);return `<a class="featured3-card${index===0?' lead':''}" href="news/${encodeURIComponent(n.id)}.html"><div class="featured3-top"><span class="featured3-rank">0${index+1}</span><span class="featured3-cat">${esc(v.icon)} ${esc(n.category||'AI NEWS')}</span>${n.verified?'<span class="featured3-verified">✓ 已核實</span>':''}<span class="featured3-depth">${deep?'DEEP READ':'FULL REPORT'}</span></div><h3>${esc(n.title)}</h3><p class="featured3-summary">${esc(summary)}</p><div class="featured3-insight"><b>🇭🇰 香港角度</b>${esc(insight||'完整文章會整理香港讀者最值得注意的實際影響。')}</div><div class="featured3-foot"><span>${esc(n.readTime||'完整報道')}</span><span class="featured3-read">${deep?'深入閱讀':'閱讀全文'} →</span></div></a>`}).join('')}</div>`;
  }

  document.addEventListener('DOMContentLoaded',()=>{
    if(document.body?.dataset.page!=='home') return;
    renderFeatured3();renderSaved();renderFollowing();
    $('#clearSaved')?.addEventListener('click',()=>setTimeout(()=>{writeList(SAVED_KEY,[]);renderSaved();renderFollowing()},0));
  });
})();