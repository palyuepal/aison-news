(() => {
  const esc=(s='')=>String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const fmt=value=>{try{return new Intl.DateTimeFormat('zh-HK',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(String(value).slice(0,10)+'T00:00:00'))}catch{return String(value||'')}};
  function story(){
    const rows=window.AISON_NEWS||[];
    const id=window.AISON_ARTICLE_ID||new URLSearchParams(location.search).get('id')||rows[0]?.id;
    return rows.find(item=>item.id===id)||rows[0]||null;
  }
  function patchJsonLd(n){
    const node=document.querySelector('#jsonld');
    if(!node||!n?.updatedAt)return;
    try{const data=JSON.parse(node.textContent||'{}');data.dateModified=n.updatedAt;node.textContent=JSON.stringify(data)}catch{}
  }
  function render(){
    if(document.body?.dataset.page!=='article')return;
    const n=story(),anchor=document.querySelector('#articleTags');
    if(!n||!anchor||document.querySelector('.article-trust-record'))return;
    const record=document.createElement('div');
    record.className='article-trust-record';
    const status=n.correctionNote?'有公開更正':n.updatedAt?'內容曾更新':'未有更正紀錄';
    record.innerHTML=`<strong>編採紀錄</strong><span>首次發布 ${esc(fmt(n.date))}</span>${n.updatedAt?`<span>最後更新 ${esc(fmt(n.updatedAt))}</span>`:''}<span>${esc(status)}</span><a href="corrections.html">查看更正紀錄 →</a>`;
    anchor.insertAdjacentElement('afterend',record);

    if(n.correctionNote){
      const box=document.createElement('div');box.className='article-correction';
      box.innerHTML=`<b>更正紀錄 · ${esc(fmt(n.updatedAt||n.date))}</b><p>${esc(n.correctionNote)}</p>`;
      record.insertAdjacentElement('afterend',box);
    }
    if(n.followUpOf){
      const previous=(window.AISON_NEWS||[]).find(item=>item.id===n.followUpOf);
      const box=document.createElement('div');box.className='article-followup';
      const label=previous?.title||'查看上一則相關報道';
      box.innerHTML=`<b>前情提要</b><p>這篇屬既有事件的後續進展，建議連同前一則報道閱讀。</p><a href="news/${encodeURIComponent(n.followUpOf)}.html">${esc(label)} →</a>`;
      const after=document.querySelector('.article-correction')||record;after.insertAdjacentElement('afterend',box);
    }
    patchJsonLd(n);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(render),{once:true});
  else requestAnimationFrame(render);
})();
