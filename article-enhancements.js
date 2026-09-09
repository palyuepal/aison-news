(() => {
  const $=(s,r=document)=>r.querySelector(s);
  const esc=(s='')=>String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const fmt=s=>{try{return new Intl.DateTimeFormat('zh-HK',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(String(s).slice(0,10)+'T00:00:00'))}catch{return String(s||'')}};
  const GENERIC=new Set(['AI','人工智能','AI Agent','Agent','產業','產品','研究','政策','治理','基建','AI 工具','AI 安全','AI 晶片','創作者','開發者','模型安全','資料中心']);

  function currentStory(){
    const rows=window.AISON_NEWS||[];
    const id=window.AISON_ARTICLE_ID||new URLSearchParams(location.search).get('id')||rows[0]?.id;
    return rows.find(item=>item.id===id)||rows[0]||null;
  }
  function addStyles(){
    if(document.getElementById('aison-article-enhancements-style'))return;
    const style=document.createElement('style');
    style.id='aison-article-enhancements-style';
    style.textContent=`
      .article-visual.has-story-card{display:block;min-height:0;aspect-ratio:1200/630;background:#061a3a}.article-visual.has-story-card>.article-orbit,.article-visual.has-story-card>.article-brand-mark,.article-visual.has-story-card>img:not(.article-story-card),.article-visual.has-story-card>span:not(.article-story-caption){display:none}.article-visual .article-story-card{display:none}.article-visual.has-story-card .article-story-card{display:block;position:absolute;inset:0;z-index:1;width:100%;height:100%;object-fit:cover;border-radius:0;filter:none}.article-story-caption{display:none!important}.article-visual.has-story-card .article-story-caption{display:inline-flex!important;left:16px;right:auto;bottom:14px;max-width:calc(100% - 32px);background:rgba(6,26,58,.9);color:#ffe187;border:1px solid rgba(255,255,255,.15);backdrop-filter:blur(8px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .event-timeline{margin:26px 0;padding:22px;border:1px solid #d5e3f4;border-radius:18px;background:#fff}.event-timeline-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:17px}.event-timeline-head small{display:block;color:#174c92;font-size:10px;font-weight:950;letter-spacing:.08em}.event-timeline-head h2{margin:5px 0 4px!important;font-size:23px!important;color:#061a3a}.event-timeline-head p{margin:0!important;color:#61728d;font-size:12px!important;line-height:1.55!important}.event-timeline-link{flex:0 0 auto;font-size:11px;font-weight:900;color:#174c92;text-decoration:none}.event-timeline-list{position:relative;margin-left:7px;padding-left:24px}.event-timeline-list:before{content:'';position:absolute;left:5px;top:5px;bottom:5px;width:2px;background:#dce8f7}.event-timeline-item{position:relative;padding:0 0 19px}.event-timeline-item:last-child{padding-bottom:0}.event-timeline-item:before{content:'';position:absolute;left:-24px;top:5px;width:12px;height:12px;border-radius:50%;background:#fff;border:3px solid #9db9df;box-sizing:border-box}.event-timeline-item.current:before{border-color:#174c92;background:#ffc928}.event-timeline-meta{display:flex;gap:7px;align-items:center;flex-wrap:wrap;color:#61728d;font-size:10px;font-weight:850}.event-timeline-now{padding:3px 6px;border-radius:999px;background:#eef5ff;color:#174c92}.event-timeline-item h3{margin:6px 0 5px!important;font-size:14px!important;line-height:1.5!important;color:#102a50}.event-timeline-item p{margin:0!important;color:#526780;font-size:12px!important;line-height:1.6!important}.event-timeline-item a{display:inline-block;margin-top:6px;color:#174c92;font-size:11px;font-weight:900;text-decoration:none}
      .source-transparency{margin-top:24px;padding:20px;border:1px solid #d5e3f4;border-radius:17px;background:linear-gradient(145deg,#f8fbff,#fff)}.source-transparency-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.source-transparency-kicker{color:#174c92;font-size:10px;font-weight:950;letter-spacing:.08em}.source-transparency h3{margin:5px 0 4px;font-size:20px;color:#061a3a}.source-transparency-intro{margin:0;color:#61728d;font-size:12px;line-height:1.6}.source-grade{flex:0 0 auto;padding:6px 9px;border-radius:999px;background:#eaf7ef;color:#176b3b;font-size:9px;font-weight:950}.source-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;margin-top:15px;padding:15px;border:1px solid #e0e9f5;border-radius:13px;background:#fff}.source-card small{display:block;color:#61728d;font-size:10px;font-weight:850}.source-card b{display:block;margin-top:4px;color:#102a50;font-size:14px}.source-card p{margin:5px 0 0!important;color:#526780;font-size:11px!important;line-height:1.55!important}.source-card a{padding:8px 10px;border-radius:9px;background:#061a3a;color:#fff;text-decoration:none;font-size:10px;font-weight:900}.source-transparency-foot{display:flex;gap:10px;flex-wrap:wrap;margin-top:13px;padding-top:12px;border-top:1px solid #e0e9f5;color:#61728d;font-size:10px}.source-transparency-foot a{color:#174c92;font-weight:900;text-decoration:none}
      @media(max-width:720px){.event-timeline,.source-transparency{padding:17px}.event-timeline-head,.source-transparency-head{flex-direction:column}.source-card{grid-template-columns:1fr}.source-card a{justify-self:start}.article-visual.has-story-card{margin-top:4px}}
    `;
    document.head.appendChild(style);
  }
  function renderHeroVisual(n){
    const root=$('.article-visual');if(!root||root.dataset.storyCard==='1')return;
    root.dataset.storyCard='1';
    const visual=n.visual&&typeof n.visual==='object'?n.visual:null;
    const img=document.createElement('img');img.className='article-story-card';img.decoding='async';img.loading='eager';
    const caption=document.createElement('span');caption.className='article-story-caption';
    if(visual?.src){
      img.alt=visual.alt||`${n.title}｜AIson editorial visual`;
      caption.textContent=visual.kind==='official-press'?`OFFICIAL PRESS VISUAL · ${visual.credit||'來源已標示'}`:`AIson ORIGINAL VISUAL · ${visual.credit||'AIson'}`;
      img.src=new URL(visual.src,document.baseURI).href;
    }else{
      img.alt=`${n.title}｜AIson 報道摘要圖`;
      caption.textContent='AIson ORIGINAL VISUAL · 報道摘要圖';
      img.src=new URL(`assets/social/${encodeURIComponent(n.id)}.jpg`,document.baseURI).href;
    }
    img.addEventListener('load',()=>root.classList.add('has-story-card'),{once:true});
    img.addEventListener('error',()=>{img.remove();caption.remove();root.dataset.storyCard='0'},{once:true});
    root.append(img,caption);
  }
  function sourceExplanation(type='',label=''){
    const text=(type+' '+label).toLowerCase();
    if(/官方|政府|監管|論文|研究|company|official/.test(text))return '優先使用原始／官方資料，方便讀者核對事件本身，而不是只依賴二手轉述。';
    if(/reuters|ap|bloomberg|financial times|ft|wsj|可靠媒體/.test(text))return '使用具編採流程的可靠媒體報道；關鍵數字與爭議性主張仍應與官方資料或其他來源交叉核實。';
    return 'AIson 會標示來源類型，讓讀者分辨原始資料、可靠媒體與補充背景。';
  }
  function renderSourceCard(n){
    const old=$('#articleBody .source');if(!old||$('#articleBody .source-transparency'))return;
    const sources=Array.isArray(n.sources)&&n.sources.length?n.sources:[{label:n.sourceLabel||'主要來源',url:n.sourceUrl||'',type:n.sourceType||'來源'}];
    const valid=sources.filter(s=>s&&s.url);
    if(!valid.length)return;
    const hostname=url=>{try{return new URL(url).hostname.replace(/^www\./,'')}catch{return ''}};
    const wrapper=document.createElement('section');wrapper.className='source-transparency';
    wrapper.innerHTML=`<div class="source-transparency-head"><div><div class="source-transparency-kicker">SOURCE TRANSPARENCY</div><h3>來源與核實方式</h3><p class="source-transparency-intro">AIson 將「來源講咗乜」同「AIson 點樣解讀」分開，方便你自行核對。</p></div><span class="source-grade">${n.verified?'✓ 已核實':'來源已標示'}</span></div><div>${valid.map((s,index)=>`<div class="source-card"><div><small>${esc(s.type||'來源')} · ${esc(hostname(s.url))}${index===0?' · 主要來源':''}</small><b>${esc(s.label||'查看原始資料')}</b><p>${esc(sourceExplanation(s.type||'',s.label||''))}</p></div><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">開啟來源 ↗</a></div>`).join('')}</div><div class="source-transparency-foot"><span>文章日期 ${esc(fmt(n.date))}</span>${n.updatedAt?`<span>最後更新 ${esc(fmt(n.updatedAt))}</span>`:''}${n.visual?.sourceUrl?`<a href="${esc(n.visual.sourceUrl)}" target="_blank" rel="noopener noreferrer">圖片來源／授權頁 →</a>`:''}<a href="methodology.html">編採方法 →</a><a href="corrections.html">更正紀錄 →</a></div>`;
    old.replaceWith(wrapper);
  }
  function loadIndex(){
    if(window.AISON_SEARCH_INDEX_PROMISE)return window.AISON_SEARCH_INDEX_PROMISE;
    window.AISON_SEARCH_INDEX_PROMISE=fetch('data/search-index.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(`search index ${r.status}`);return r.json()}).then(rows=>Array.isArray(rows)?rows:[]);
    return window.AISON_SEARCH_INDEX_PROMISE;
  }
  function exactHits(rows,tag,n){return rows.filter(item=>item.id===n.id||item.category===tag||(item.tags||[]).includes(tag))}
  function chooseTopic(rows,n){
    const candidates=[...(n.tags||[]),n.category].filter(Boolean).filter((value,index,all)=>all.indexOf(value)===index&&!GENERIC.has(value));
    const scored=candidates.map(tag=>{const hits=exactHits(rows,tag,n);return {tag,hits,count:hits.length}}).filter(x=>x.count>=2).sort((a,b)=>{
      const aIdeal=a.count<=8?0:1,bIdeal=b.count<=8?0:1;
      return aIdeal-bIdeal||a.count-b.count||String(b.tag).length-String(a.tag).length;
    });
    if(scored[0])return scored[0];
    const fallback=[...(n.tags||[]),n.category].filter(Boolean).map(tag=>({tag,hits:exactHits(rows,tag,n)})).filter(x=>x.hits.length>=2).sort((a,b)=>a.hits.length-b.hits.length);
    return fallback[0]?{...fallback[0],count:fallback[0].hits.length}:null;
  }
  function renderTimeline(n,rows){
    const body=$('#articleBody');if(!body||body.querySelector('.event-timeline'))return;
    const topic=chooseTopic(rows,n);if(!topic)return;
    let hits=topic.hits.slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||((Number(b.rank)||0)-(Number(a.rank)||0)));
    if(hits.length>5){const currentIndex=hits.findIndex(x=>x.id===n.id);const start=Math.max(0,Math.min(currentIndex-2,hits.length-5));hits=hits.slice(start,start+5)}
    const section=document.createElement('section');section.className='event-timeline';
    section.innerHTML=`<div class="event-timeline-head"><div><small>STORY TIMELINE</small><h2>事件時間線｜${esc(topic.tag)}</h2><p>由 AIson 新聞庫自動串起同一主題的已發布報道，睇清事件點樣演變。</p></div><a class="event-timeline-link" href="topics.html?topic=${encodeURIComponent(topic.tag)}">睇完整主題 →</a></div><div class="event-timeline-list">${hits.map(item=>`<article class="event-timeline-item${item.id===n.id?' current':''}"><div class="event-timeline-meta"><span>${esc(fmt(item.date))}</span><span>·</span><span>${esc(item.category||'AI')}</span>${item.id===n.id?'<span class="event-timeline-now">你正在閱讀</span>':''}</div><h3>${esc(item.title)}</h3><p>${esc(item.excerpt||'')}</p>${item.id!==n.id?`<a href="news/${encodeURIComponent(item.id)}.html">閱讀這一節 →</a>`:''}</article>`).join('')}</div>`;
    const source=body.querySelector('.source-transparency,.source');
    if(source)source.insertAdjacentElement('beforebegin',section);else body.appendChild(section);
  }
  function relatedScore(item,n){
    if(item.id===n.id)return -999;
    const shared=(item.tags||[]).filter(tag=>(n.tags||[]).includes(tag));
    const genericPenalty=shared.filter(tag=>GENERIC.has(tag)).length;
    const specific=shared.length-genericPenalty;
    return specific*6+genericPenalty*2+(item.category===n.category?2:0)+(item.date===n.date?1:0);
  }
  function renderRelated(n,rows){
    const root=$('#articleRelated');if(!root)return;
    const ranked=rows.filter(item=>item.id!==n.id).map(item=>({...item,_score:relatedScore(item,n),_shared:(item.tags||[]).filter(tag=>(n.tags||[]).includes(tag))})).filter(item=>item._score>0).sort((a,b)=>b._score-a._score||String(b.date||'').localeCompare(String(a.date||''))).slice(0,3);
    if(!ranked.length)return;
    root.innerHTML=ranked.map(item=>{const reason=item._shared.filter(tag=>!GENERIC.has(tag)).slice(0,2);const label=reason.length?`共同脈絡：${reason.join('、')}`:`同一分類：${item.category}`;return `<a class="article-related-card" href="news/${encodeURIComponent(item.id)}.html"><small>${esc(label)}</small><b>${esc(item.title)}</b><span>${esc(fmt(item.date))} · 繼續閱讀 →</span></a>`}).join('');
  }
  async function render(){
    if(document.body?.dataset.page!=='article')return;
    const n=currentStory();if(!n)return;
    addStyles();renderHeroVisual(n);renderSourceCard(n);
    try{const rows=await loadIndex();renderTimeline(n,rows);renderRelated(n,rows)}catch(error){console.warn('AIson article context enhancement unavailable',error)}
  }
  const start=()=>requestAnimationFrame(()=>requestAnimationFrame(render));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
