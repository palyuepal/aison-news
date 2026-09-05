(() => {
  const PAGE_SIZE=20;
  const $=(s,r=document)=>r.querySelector(s);
  const esc=(s='')=>String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const fmt=s=>{try{return new Intl.DateTimeFormat('zh-HK',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s+'T00:00:00'))}catch{return s}};
  const CATEGORY_VISUALS={
    'OpenAI':{icon:'◉',tone:'openai'},'Google':{icon:'G',tone:'google'},'Anthropic':{icon:'AI',tone:'anthropic'},
    'NVIDIA':{icon:'N',tone:'nvidia'},'Meta':{icon:'∞',tone:'meta'},'AI 安全':{icon:'⌁',tone:'safety'},
    'AI 晶片':{icon:'▦',tone:'chip'},'AI 政策':{icon:'⚖',tone:'policy'},'教育 AI':{icon:'✎',tone:'education'},
    'AI 工具':{icon:'✣',tone:'tools'},'產業':{icon:'◆',tone:'nvidia'},'開源':{icon:'⌘',tone:'anthropic'},
    '科學':{icon:'◎',tone:'google'},'網絡安全':{icon:'⌁',tone:'safety'},'產品':{icon:'✣',tone:'tools'},
    '醫療':{icon:'＋',tone:'education'},'醫療 AI':{icon:'＋',tone:'education'},'研究':{icon:'∑',tone:'google'},
    '創作':{icon:'✦',tone:'tools'},'AI 基建':{icon:'▦',tone:'chip'},'基建':{icon:'▦',tone:'chip'},
    '治理':{icon:'⚖',tone:'policy'},'政策':{icon:'⚖',tone:'policy'}
  };
  const categoryVisual=category=>CATEGORY_VISUALS[category]||{icon:'✦',tone:'default'};

  function loadIndex(){
    if(window.AISON_SEARCH_INDEX_PROMISE) return window.AISON_SEARCH_INDEX_PROMISE;
    window.AISON_SEARCH_INDEX_PROMISE=fetch('data/search-index.json',{cache:'no-cache'}).then(response=>{
      if(!response.ok) throw new Error(`search index ${response.status}`);
      return response.json();
    }).then(rows=>Array.isArray(rows)?rows:[]);
    return window.AISON_SEARCH_INDEX_PROMISE;
  }

  function card(story){
    const visual=categoryVisual(story.category);
    const tags=(story.tags||[]).slice(0,3).map(tag=>`<span class="tag">${esc(tag)}</span>`).join('');
    return `<a class="news-card" href="news/${encodeURIComponent(story.id)}.html"><div class="card-leading"><span class="rank">${String(story.rank||'').padStart(2,'0')}</span><span class="card-symbol ${visual.tone}" aria-hidden="true">${visual.icon}</span></div><div><div class="card-overline"><span>${esc(story.category)}</span></div><h3>${esc(story.title)}</h3><p>${esc(story.excerpt)}</p><div class="meta">${tags}</div><div class="card-footer"><span>◷ ${fmt(story.date)}</span><span class="card-arrow">→</span></div></div></a>`;
  }

  function bindMobileMenu(){
    const button=$('#menuBtn'),menu=$('#mobileNav');
    if(!button||!menu||button.dataset.archiveBound==='1') return;
    button.dataset.archiveBound='1';
    button.addEventListener('click',()=>{menu.style.display=menu.style.display==='block'?'none':'block'});
  }

  async function init(){
    const grid=$('#archiveGrid'),select=$('#archiveCategory'),input=$('#archiveSearch'),empty=$('#archiveEmpty'),stats=$('#archiveStats'),more=$('#archiveLoadMore');
    if(!grid||!select||!input||!empty||!stats||!more) return;
    bindMobileMenu();
    stats.textContent='正在載入新聞索引…';
    let rows=[];
    try{rows=await loadIndex()}catch(error){
      console.error(error);
      stats.textContent='新聞索引暫時載入失敗，請稍後再試。';
      empty.textContent='暫時未能載入新聞庫。';
      empty.style.display='block';
      more.hidden=true;
      return;
    }
    rows=rows.slice().sort((a,b)=>(a.rank||999999)-(b.rank||999999));
    const categories=[...new Set(rows.map(row=>row.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-Hant'));
    select.innerHTML='<option value="全部">全部分類</option>'+categories.map(category=>`<option value="${esc(category)}">${esc(category)}</option>`).join('');
    let visible=PAGE_SIZE;

    const filtered=()=>{
      const q=(input.value||'').trim().toLowerCase(),category=select.value;
      return rows.filter(row=>{
        const categoryOk=category==='全部'||row.category===category;
        if(!categoryOk) return false;
        if(!q) return true;
        const hay=[row.title,row.excerpt,row.category,...(row.tags||[])].join(' ').toLowerCase();
        return hay.includes(q);
      });
    };

    const render=()=>{
      const hits=filtered(),shown=hits.slice(0,visible),remaining=Math.max(0,hits.length-shown.length);
      grid.innerHTML=shown.map(card).join('');
      empty.style.display=hits.length?'none':'block';
      stats.textContent=hits.length?`共 ${hits.length} 篇 · 已顯示 ${shown.length} 篇 · ${categories.length} 個分類`:`0 篇結果 · ${categories.length} 個分類`;
      more.hidden=!remaining;
      more.textContent=remaining?`載入更多（尚餘 ${remaining} 篇）`:'已顯示全部';
    };

    let timer;
    input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{visible=PAGE_SIZE;render()},90)});
    select.addEventListener('change',()=>{visible=PAGE_SIZE;render()});
    more.addEventListener('click',()=>{visible+=PAGE_SIZE;render()});
    render();
  }

  document.addEventListener('DOMContentLoaded',init);
})();
