(()=>{
  const all=(window.AISON_LIVE||[]).filter(item=>item&&item.publishedAt).slice().sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt));
  const timeline=document.getElementById('liveTimeline');
  if(!timeline)return;

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const dateObj=value=>value instanceof Date?value:new Date(value);
  const hktKey=value=>{
    const d=dateObj(value);if(Number.isNaN(d.getTime()))return '';
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
    const get=type=>parts.find(p=>p.type===type)?.value||'';
    return `${get('year')}-${get('month')}-${get('day')}`;
  };
  const hktTime=value=>{
    const d=dateObj(value);if(Number.isNaN(d.getTime()))return '';
    return new Intl.DateTimeFormat('zh-HK',{timeZone:'Asia/Hong_Kong',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);
  };
  const hktDateTime=value=>{
    const d=dateObj(value);if(Number.isNaN(d.getTime()))return '';
    return new Intl.DateTimeFormat('zh-HK',{timeZone:'Asia/Hong_Kong',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);
  };
  const hktDay=value=>{
    const d=dateObj(value);if(Number.isNaN(d.getTime()))return '';
    return new Intl.DateTimeFormat('zh-HK',{timeZone:'Asia/Hong_Kong',month:'long',day:'numeric',weekday:'short'}).format(d);
  };
  const relative=value=>{
    const d=dateObj(value);if(Number.isNaN(d.getTime()))return '';
    const mins=Math.max(0,Math.floor((Date.now()-d.getTime())/60000));
    if(mins<1)return '剛剛';
    if(mins<60)return `${mins} 分鐘前`;
    const hours=Math.floor(mins/60);
    if(hours<24)return `${hours} 小時前`;
    return `${Math.floor(hours/24)} 日前`;
  };
  const LEVELS={breaking:{label:'重大快訊',symbol:'●'},update:{label:'即時更新',symbol:'◆'},followup:{label:'持續跟進',symbol:'↻'}};
  const levelOf=item=>LEVELS[item.level]?item.level:(item.active!==false?'breaking':'update');
  const articleLink=item=>item.articleId?`news/${encodeURIComponent(item.articleId)}.html`:'';
  const summaryParagraphs=value=>{
    const text=String(value||'').replace(/\s+/g,' ').trim();
    if(!text)return [];
    const sentences=text.match(/[^。！？]+[。！？]?/g)||[text];
    const paragraphs=[];
    let current='';
    for(const sentence of sentences){
      if((current+sentence).length>175&&current){paragraphs.push(current);current=sentence}else current+=sentence;
      if(paragraphs.length===1&&current.length>=150)break;
    }
    if(current&&paragraphs.length<2)paragraphs.push(current);
    return paragraphs.slice(0,2).map(part=>part.length>210?part.slice(0,208)+'…':part);
  };

  const today=hktKey(new Date());
  const todayItems=all.filter(item=>hktKey(item.publishedAt)===today);
  const developing=all.filter(item=>item.active!==false);
  const stream=all.slice(0,24);
  const archived=all.slice(24,32);
  const followups=stream.filter(item=>levelOf(item)==='followup');

  const todayCount=document.getElementById('liveTodayCount');
  const activeCount=document.getElementById('liveActiveCount');
  const storedCount=document.getElementById('liveStoredCount');
  if(todayCount)todayCount.textContent=String(todayItems.length);
  if(activeCount)activeCount.textContent=String(followups.length);
  if(storedCount)storedCount.textContent=String(all.length);

  const dateHeading=document.getElementById('liveDateHeading');
  if(dateHeading)dateHeading.textContent='AI 即時新聞時間線';
  const nowStatus=document.getElementById('liveNowStatus');
  if(nowStatus){
    if(developing.length){nowStatus.textContent=`● ${developing.length} 則持續跟進`;nowStatus.classList.add('on')}
    else{nowStatus.textContent=todayItems.length?`${todayItems.length} 則今日更新`:'時間線持續更新';nowStatus.classList.remove('on')}
  }
  const refreshText=document.getElementById('liveRefreshText');
  if(refreshText)refreshText.textContent=`頁面時間：${hktTime(new Date())} HKT · 最新消息排最前`;

  const sourceLink=item=>item.sourceUrl?`<a class="timeline-source" href="${esc(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(item.sourceLabel||'核實來源')} ↗</a>`:'<span>來源待補</span>';
  const timelineCard=item=>{
    const level=levelOf(item),meta=LEVELS[level],isDeveloping=item.active!==false;
    const verified=item.verified!==false?'<span class="timeline-verified">✓ 已核實</span>':'';
    const paragraphs=summaryParagraphs(item.summary).map(part=>`<p>${esc(part)}</p>`).join('');
    const story=item.threadId?'<span class="timeline-thread">同一事件持續更新</span>':'';
    const full=articleLink(item);
    return `<article class="timeline-item level-${level}${isDeveloping?' active':''}" data-live-level="${level}"><div class="timeline-node" aria-hidden="true"></div><div class="timeline-card"><div class="timeline-top"><div class="timeline-time">${esc(hktTime(item.publishedAt))} HKT <small>${esc(relative(item.publishedAt))}</small></div><span class="timeline-badge ${level}">${meta.symbol} ${meta.label}</span></div><h3>${esc(item.title)}</h3><div class="timeline-summary">${paragraphs}</div><div class="timeline-foot"><span>${esc(item.category||'AI 快訊')} · ${verified}</span><span class="timeline-links">${full?`<a class="timeline-read" href="${full}">閱讀完整報道 →</a>`:''}${sourceLink(item)}</span></div>${story}</div></article>`;
  };
  const dayDivider=item=>`<div class="timeline-date-divider"><span>${esc(hktDay(item.publishedAt))}</span><small>${hktKey(item.publishedAt)===today?'TODAY':'RECENT'}</small></div>`;
  const render=filter=>{
    const items=filter==='all'?stream:stream.filter(item=>levelOf(item)===filter);
    if(!items.length){timeline.innerHTML='<div class="live-empty-page"><b>呢個分類暫時未有更新</b><span>可以切換到「全部新聞流」查看最近已核實消息。</span></div>';return}
    let lastDay='';
    timeline.innerHTML=items.map(item=>{const day=hktKey(item.publishedAt),divider=day!==lastDay?dayDivider(item):'';lastDay=day;return divider+timelineCard(item)}).join('');
  };

  const filters=document.getElementById('liveFilters');
  if(filters){
    const options=[['all','全部新聞流'],['breaking','重大快訊'],['update','即時更新'],['followup','持續跟進']];
    filters.innerHTML=options.map(([key,label])=>{const count=key==='all'?stream.length:stream.filter(item=>levelOf(item)===key).length;return `<button type="button" class="live-filter${key==='all'?' active':''}" data-live-filter="${key}" aria-pressed="${key==='all'}"><span>${label}</span><b>${count}</b></button>`}).join('');
    filters.querySelectorAll('[data-live-filter]').forEach(button=>button.addEventListener('click',()=>{
      filters.querySelectorAll('[data-live-filter]').forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active))});
      render(button.dataset.liveFilter||'all');
    }));
  }
  render('all');

  const archiveBlock=document.getElementById('liveArchiveBlock');
  const archiveList=document.getElementById('liveArchiveList');
  if(archiveBlock&&archiveList&&archived.length){
    archiveBlock.hidden=false;
    archiveList.innerHTML=archived.map(item=>`<div class="archive-row"><time>${esc(hktDateTime(item.publishedAt))} HKT</time><div><b>${esc(item.title)}</b><span class="live-page-note">${esc(item.category||'AI 快訊')} · 較早更新</span></div></div>`).join('');
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
