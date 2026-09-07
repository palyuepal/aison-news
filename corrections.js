(() => {
  const esc=(s='')=>String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const fmt=value=>{try{return new Intl.DateTimeFormat('zh-HK',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(String(value).slice(0,10)+'T00:00:00'))}catch{return String(value||'')}};
  function render(){
    const root=document.querySelector('#correctionsList'),count=document.querySelector('#correctionsCount');
    if(!root)return;
    const rows=Array.isArray(window.AISON_CORRECTIONS)?window.AISON_CORRECTIONS:[];
    if(count)count.textContent=String(rows.length);
    if(!rows.length){
      root.innerHTML='<div class="corrections-empty"><b>目前未有已公開更正紀錄</b><p>如日後有實質事實修正，AIson 會保留更正日期、原因與受影響文章。</p></div>';
      return;
    }
    root.innerHTML=rows.map(item=>`<article class="correction-entry"><small>${esc(fmt(item.updatedAt||item.date))} · ${esc(item.category||'AI 新聞')}</small><h2>${esc(item.title)}</h2><p>${esc(item.correctionNote)}</p><a href="news/${encodeURIComponent(item.id)}.html">查看已更新文章 →</a></article>`).join('');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
