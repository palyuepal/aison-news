(()=>{
  const all=(window.AISON_LIVE||[]).filter(item=>item&&item.publishedAt).slice().sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt));
  const timeline=document.getElementById('liveTimeline');
  if(!timeline)return;

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const dateObj=value=>value instanceof Date?value:new Date(value);
  const hktKey=value=>{
    const d=dateObj(value); if(Number.isNaN(d.getTime()))return '';
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
    const get=type=>parts.find(p=>p.type===type)?.value||'';
    return `${get('year')}-${get('month')}-${get('day')}`;
  };
  const hktTime=value=>{
    const d=dateObj(value); if(Number.isNaN(d.getTime()))return '';
    return new Intl.DateTimeFormat('zh-HK',{timeZone:'Asia/Hong_Kong',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);
  };
  const hktDateTime=value=>{
    const d=dateObj(value); if(Number.isNaN(d.getTime()))return '';
    return new Intl.DateTimeFormat('zh-HK',{timeZone:'Asia/Hong_Kong',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);
  };
  const relative=value=>{
    const d=dateObj(value); if(Number.isNaN(d.getTime()))return '';
    const mins=Math.max(0,Math.floor((Date.now()-d.getTime())/60000));
    if(mins<1)return '剛剛';
    if(mins<60)return `${mins} 分鐘前`;
    const hours=Math.floor(mins/60);
    if(hours<24)return `${hours} 小時前`;
    return `${Math.floor(hours/24)} 日前`;
  };

  const today=hktKey(new Date());
  const todayItems=all.filter(item=>hktKey(item.publishedAt)===today);
  const archived=all.filter(item=>hktKey(item.publishedAt)!==today).slice(0,8);
  const active=all.filter(item=>item.active!==false);

  const todayCount=document.getElementById('liveTodayCount');
  const activeCount=document.getElementById('liveActiveCount');
  const storedCount=document.getElementById('liveStoredCount');
  if(todayCount)todayCount.textContent=String(todayItems.length);
  if(activeCount)activeCount.textContent=String(active.length);
  if(storedCount)storedCount.textContent=String(all.length);

  const dateHeading=document.getElementById('liveDateHeading');
  if(dateHeading){
    const label=new Intl.DateTimeFormat('zh-HK',{timeZone:'Asia/Hong_Kong',month:'long',day:'numeric',weekday:'short'}).format(new Date());
    dateHeading.textContent=`${label} · 今日即時更新`;
  }

  const nowStatus=document.getElementById('liveNowStatus');
  if(nowStatus){
    if(active.length){nowStatus.textContent=`● ${active.length} 則仍在 LIVE`;nowStatus.classList.add('on')}
    else{nowStatus.textContent='暫無重大快訊';nowStatus.classList.remove('on')}
  }
  const refreshText=document.getElementById('liveRefreshText');
  if(refreshText)refreshText.textContent=`頁面時間：${hktTime(new Date())} HKT · 每小時監察重大變化`;

  const sourceLink=item=>item.sourceUrl?`<a class="timeline-source" href="${esc(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(item.sourceLabel||'核實來源')} ↗</a>`:'<span>來源待補</span>';
  const timelineCard=item=>{
    const isActive=item.active!==false;
    const verified=item.verified!==false?'<span>✓ 已核實</span>':'';
    return `<article class="timeline-item${isActive?' active':''}"><div class="timeline-node" aria-hidden="true"></div><div class="timeline-card"><div class="timeline-top"><div class="timeline-time">${esc(hktTime(item.publishedAt))} HKT <small>${esc(relative(item.publishedAt))}</small></div><span class="timeline-badge${isActive?' active':''}">${isActive?'● LIVE':'已歸檔'}</span></div><h3>${esc(item.title)}</h3><p>${esc(item.summary||'')}</p><div class="timeline-foot"><span>${esc(item.category||'AI 快訊')}${verified?' · '+verified:''}</span>${sourceLink(item)}</div></div></article>`;
  };

  if(todayItems.length){
    timeline.innerHTML=todayItems.map(timelineCard).join('');
  }else{
    timeline.innerHTML='<div class="live-empty-page"><b>今日暫未有值得打斷你嘅重大 AI 快訊</b><span>AIson LIVE 唔會為咗填版而製造消息；有真正重大、已核實嘅新發展先會出現喺呢度。</span></div>';
  }

  const archiveBlock=document.getElementById('liveArchiveBlock');
  const archiveList=document.getElementById('liveArchiveList');
  if(archiveBlock&&archiveList&&archived.length){
    archiveBlock.hidden=false;
    archiveList.innerHTML=archived.map(item=>`<div class="archive-row"><time>${esc(hktDateTime(item.publishedAt))} HKT</time><div><b>${esc(item.title)}</b><span class="live-page-note">${esc(item.category||'AI 快訊')} · 已歸檔</span></div></div>`).join('');
  }

  const menuBtn=document.getElementById('menuBtn');
  const mobileNav=document.getElementById('mobileNav');
  menuBtn?.addEventListener('click',()=>{
    const open=mobileNav?.style.display==='block';
    if(mobileNav)mobileNav.style.display=open?'none':'block';
    menuBtn.setAttribute('aria-expanded',String(!open));
  });

  const modal=document.getElementById('searchModal');
  const trigger=document.getElementById('searchTrigger');
  const close=document.getElementById('closeSearch');
  const input=document.getElementById('searchInput');
  const results=document.getElementById('searchResults');
  let indexPromise;
  let timer;
  const loadIndex=()=>{
    if(indexPromise)return indexPromise;
    indexPromise=fetch('data/search-index.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(`search index ${r.status}`);return r.json()}).then(rows=>Array.isArray(rows)?rows:[]).catch(()=>[]);
    return indexPromise;
  };
  const renderSearch=async q=>{
    if(!results)return;
    results.innerHTML='<div class="empty" style="display:block">正在載入搜尋索引…</div>';
    const rows=await loadIndex();
    const term=(q||'').trim().toLowerCase();
    const hits=(term?rows.filter(n=>[n.title,n.excerpt,n.category,...(n.tags||[])].join(' ').toLowerCase().includes(term)):rows).slice(0,12);
    results.innerHTML=hits.length?hits.map(n=>`<a class="search-result" href="news/${encodeURIComponent(n.id)}.html"><span class="num">${String(n.rank||'').padStart(2,'0')}</span><div><b>${esc(n.title)}</b><span>${esc(n.category||'AI')} · ${esc(n.date||'')}</span></div></a>`).join(''):'<div class="empty" style="display:block">搵唔到相關內容。</div>';
  };
  const openSearch=()=>{modal?.classList.add('open');modal?.setAttribute('aria-hidden','false');renderSearch(input?.value||'');setTimeout(()=>input?.focus(),50)};
  const closeSearch=()=>{modal?.classList.remove('open');modal?.setAttribute('aria-hidden','true')};
  trigger?.addEventListener('click',openSearch);
  close?.addEventListener('click',closeSearch);
  modal?.addEventListener('click',event=>{if(event.target===modal)closeSearch()});
  input?.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>renderSearch(input.value),70)});
  document.addEventListener('keydown',event=>{
    if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openSearch()}
    if(event.key==='Escape')closeSearch();
  });
})();
