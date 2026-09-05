(()=>{
  const root=document.getElementById('liveList');
  if(!root)return;
  const panel=root.closest('.live-panel');
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const relative=value=>{
    const t=new Date(value); if(Number.isNaN(t.getTime()))return '';
    const mins=Math.max(0,Math.floor((Date.now()-t.getTime())/60000));
    if(mins<1)return '剛剛';
    if(mins<60)return `${mins} 分鐘前`;
    const hours=Math.floor(mins/60); if(hours<24)return `${hours} 小時前`;
    return new Intl.DateTimeFormat('zh-HK',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Hong_Kong'}).format(t);
  };
  const ensureTimelineLink=()=>{
    if(!panel||panel.querySelector('.live-timeline-link'))return;
    const rule=panel.querySelector('.live-rule');
    const link=document.createElement('a');
    link.className='live-timeline-link';
    link.href='live.html';
    link.textContent='查看完整 LIVE 時間線 →';
    link.style.cssText='display:inline-flex;margin-top:12px;color:#ffe187;font-size:11px;font-weight:950;text-decoration:none;position:relative;z-index:2';
    link.addEventListener('mouseenter',()=>{link.style.textDecoration='underline'});
    link.addEventListener('mouseleave',()=>{link.style.textDecoration='none'});
    if(rule)rule.before(link);else panel.appendChild(link);
  };

  const items=(window.AISON_LIVE||[])
    .filter(item=>item&&item.active!==false)
    .sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0))
    .slice(0,3);

  ensureTimelineLink();
  if(!items.length){
    root.innerHTML='<div class="live-empty"><span class="live-pulse"></span><div><b>暫未有重大即時更新</b><small>有值得打斷你的一則 AI 大事，AIson 先會放上嚟。</small></div></div>';
    return;
  }
  root.innerHTML=items.map(item=>{
    const source=item.sourceUrl?`<a class="live-source" href="${esc(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(item.sourceLabel||'核實來源')} ↗</a>`:'';
    return `<article class="live-item"><div class="live-item-top"><span class="live-time">${esc(relative(item.publishedAt))}</span>${item.verified!==false?'<span class="live-verified">✓ 已核實</span>':''}</div><h4>${esc(item.title)}</h4><p>${esc(item.summary||'')}</p><div class="live-item-foot"><span>${esc(item.category||'AI 快訊')}</span>${source}</div></article>`;
  }).join('');
})();
