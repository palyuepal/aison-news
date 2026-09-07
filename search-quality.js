(() => {
  const root=typeof window!=='undefined'?window:globalThis;
  const ALIAS_GROUPS=[
    ['chatgpt','chat gpt','gpt','openai'],
    ['nvidia','輝達','英偉達'],
    ['elon musk','musk','馬斯克','spacex','tesla'],
    ['google','谷歌','gemini','deepmind'],
    ['apple','蘋果','apple intelligence'],
    ['anthropic','claude'],
    ['microsoft','微軟','copilot'],
    ['meta','facebook','llama'],
    ['spacex','starlink','starship'],
    ['agent','ai agent','智能體','代理'],
    ['chip','chips','晶片','gpu','hbm'],
    ['hong kong','hk','香港'],
    ['copyright','版權','著作權'],
    ['safety','安全','ai safety'],
    ['regulation','policy','監管','政策','治理']
  ];
  const esc=(s='')=>String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const fmt=s=>{try{return new Intl.DateTimeFormat('zh-HK',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s+'T00:00:00'))}catch{return s}};
  function normalize(value=''){
    return String(value).normalize('NFKC').toLowerCase().replace(/chat\s*[-_]?\s*gpt/g,'chatgpt').replace(/[\u2018\u2019]/g,"'").replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
  }
  function compact(value=''){return normalize(value).replace(/\s+/g,'')}
  function variants(query=''){
    const q=normalize(query),set=new Set(q?[q,compact(q)]:[]);
    if(!q)return [];
    const qc=compact(q);
    ALIAS_GROUPS.forEach(group=>{
      const normalized=group.map(normalize);
      const matched=normalized.some(term=>q.includes(term)||term.includes(q)||(term.replace(/\s/g,'')===qc));
      if(matched) normalized.forEach(term=>{set.add(term);set.add(term.replace(/\s/g,''))});
    });
    return [...set].filter(Boolean);
  }
  function oneEdit(a,b){
    a=String(a);b=String(b);
    if(a===b)return true;
    if(Math.abs(a.length-b.length)>1)return false;
    if(a.length===b.length){
      let diff=[];for(let i=0;i<a.length;i++)if(a[i]!==b[i])diff.push(i);
      if(diff.length<=1)return true;
      return diff.length===2&&diff[1]===diff[0]+1&&a[diff[0]]===b[diff[1]]&&a[diff[1]]===b[diff[0]];
    }
    if(a.length>b.length)[a,b]=[b,a];
    let i=0,j=0,miss=0;
    while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++}else{if(++miss>1)return false;j++}}
    return true;
  }
  function rowText(row){return normalize([row.title,row.excerpt,row.category,...(row.tags||[])].filter(Boolean).join(' '))}
  function scoreRow(row,query=''){
    const q=normalize(query);if(!q)return 1;
    const hay=rowText(row),hc=hay.replace(/\s/g,''),vs=variants(q);
    let score=0;
    if(hay.includes(q))score+=140;
    if(hc.includes(compact(q)))score+=110;
    for(const term of vs){
      if(!term||term===q||term===compact(q))continue;
      const tc=term.replace(/\s/g,'');
      if(hay.includes(term))score=Math.max(score,85);
      else if(tc.length>2&&hc.includes(tc))score=Math.max(score,75);
    }
    const qTokens=q.split(' ').filter(Boolean),hTokens=hay.split(' ').filter(Boolean);
    qTokens.forEach(token=>{
      if(hTokens.some(h=>h===token||h.includes(token)||token.includes(h)))score+=18;
      else if(/^[a-z0-9]+$/i.test(token)&&token.length>=4&&hTokens.some(h=>/^[a-z0-9]+$/i.test(h)&&h.length>=4&&oneEdit(token,h)))score+=13;
    });
    const title=normalize(row.title||'');
    if(title.includes(q)||title.replace(/\s/g,'').includes(compact(q)))score+=35;
    return score;
  }
  function searchRows(rows,query='',limit=12){
    const q=normalize(query);
    if(!q)return rows.slice().sort((a,b)=>(a.rank||999999)-(b.rank||999999)).slice(0,limit);
    return rows.map(row=>({row,score:scoreRow(row,q)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||((a.row.rank||999999)-(b.row.rank||999999))).slice(0,limit).map(x=>x.row);
  }
  root.AISON_SEARCH_QUALITY={normalize,variants,oneEdit,scoreRow,searchRows};
  if(typeof document==='undefined')return;

  let enhancedOpen=null;
  document.addEventListener('keydown',event=>{
    if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'&&enhancedOpen){event.preventDefault();event.stopImmediatePropagation();enhancedOpen()}
  },true);

  function loadIndex(){
    if(root.AISON_SEARCH_INDEX_PROMISE)return root.AISON_SEARCH_INDEX_PROMISE;
    root.AISON_SEARCH_INDEX_PROMISE=fetch('data/search-index.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(`search index ${r.status}`);return r.json()}).then(rows=>Array.isArray(rows)?rows:[]);
    return root.AISON_SEARCH_INDEX_PROMISE;
  }
  function replaceNode(node){if(!node)return null;const clone=node.cloneNode(true);node.replaceWith(clone);return clone}
  function suggestions(){return '<div class="empty" style="display:block">搵唔到完全相符內容。試下：<b>OpenAI</b>、<b>NVIDIA／輝達</b>、<b>Gemini</b>、<b>Agent／智能體</b>。</div>'}
  async function renderModal(rootNode,q=''){
    if(!rootNode)return;rootNode.innerHTML='<div class="empty" style="display:block">正在載入搜尋索引…</div>';
    try{
      const rows=await loadIndex(),hits=searchRows(rows,q,12);
      rootNode.innerHTML=hits.length?hits.map(n=>`<a class="search-result" href="news/${encodeURIComponent(n.id)}.html"><span class="num">${String(n.rank||'').padStart(2,'0')}</span><div><b>${esc(n.title)}</b><span>${esc(n.category||'AI 新聞')} · ${fmt(n.date)}</span></div></a>`).join(''):suggestions();
    }catch{rootNode.innerHTML='<div class="empty" style="display:block">搜尋索引暫時載入失敗，請稍後再試。</div>'}
  }
  function installModal(){
    const old=document.getElementById('searchModal');if(!old||old.dataset.searchQuality==='1')return;
    const modal=replaceNode(old);modal.dataset.searchQuality='1';
    const trigger=replaceNode(document.getElementById('searchTrigger')),hero=replaceNode(document.getElementById('heroSearch'));
    const input=modal.querySelector('#searchInput'),results=modal.querySelector('#searchResults'),closeBtn=modal.querySelector('#closeSearch');let timer;
    const open=()=>{modal.classList.add('open');modal.setAttribute('aria-hidden','false');renderModal(results,input?.value||'');setTimeout(()=>input?.focus(),40)};
    const close=()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true')};enhancedOpen=open;
    trigger?.addEventListener('click',open);hero?.addEventListener('click',open);closeBtn?.addEventListener('click',close);modal.addEventListener('click',e=>{if(e.target===modal)close()});
    input?.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>renderModal(results,input.value),55)});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))close()});
  }
  function archiveCard(story){
    const tags=(story.tags||[]).slice(0,3).map(tag=>`<span class="tag">${esc(tag)}</span>`).join('');
    return `<a class="news-card" href="news/${encodeURIComponent(story.id)}.html"><div class="card-leading"><span class="rank">${String(story.rank||'').padStart(2,'0')}</span></div><div><div class="card-overline"><span>${esc(story.category||'AI 新聞')}</span></div><h3>${esc(story.title)}</h3><p>${esc(story.excerpt||'')}</p><div class="meta">${tags}</div><div class="card-footer"><span>◷ ${fmt(story.date)}</span><span class="card-arrow">→</span></div></div></a>`;
  }
  async function installArchive(){
    const grid=document.getElementById('archiveGrid'),oldInput=document.getElementById('archiveSearch'),oldSelect=document.getElementById('archiveCategory'),empty=document.getElementById('archiveEmpty'),stats=document.getElementById('archiveStats'),oldMore=document.getElementById('archiveLoadMore');
    if(!grid||!oldInput||!oldSelect||!empty||!stats||!oldMore||oldInput.dataset.searchQuality==='1')return;
    const input=replaceNode(oldInput),select=replaceNode(oldSelect),more=replaceNode(oldMore);input.dataset.searchQuality='1';
    let rows=[];try{rows=(await loadIndex()).slice().sort((a,b)=>(a.rank||999999)-(b.rank||999999))}catch{return}
    const categories=[...new Set(rows.map(r=>r.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-Hant'));
    select.innerHTML='<option value="全部">全部分類</option>'+categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');let visible=20;
    const render=()=>{
      const category=select.value,q=input.value||'';let hits=searchRows(rows,q,rows.length);if(category!=='全部')hits=hits.filter(r=>r.category===category);
      const shown=hits.slice(0,visible),remaining=Math.max(0,hits.length-shown.length);grid.innerHTML=shown.map(archiveCard).join('');empty.style.display=hits.length?'none':'block';empty.textContent=hits.length?'':'搵唔到相關內容。可試中英文品牌名、常見別名或較短關鍵字。';stats.textContent=hits.length?`共 ${hits.length} 篇 · 已顯示 ${shown.length} 篇 · ${categories.length} 個分類`:`0 篇結果 · ${categories.length} 個分類`;more.hidden=!remaining;more.textContent=remaining?`載入更多（尚餘 ${remaining} 篇）`:'已顯示全部';
    };
    let timer;input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{visible=20;render()},60)});select.addEventListener('change',()=>{visible=20;render()});more.addEventListener('click',()=>{visible+=20;render()});render();
  }
  const init=()=>setTimeout(()=>{installModal();installArchive()},0);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
