(() => {
  const updates = {
    '2026-09-04-nvidia-acquire-hugging-face': {
      previousId: '2026-08-29-nvidia-hugging-face-acquisition',
      label: '↻ 官方跟進',
      note: 'AIson 8 月 29 日曾報道這宗收購消息；本篇為 NVIDIA 其後正式公告及新增細節。'
    }
  };

  function addStyles(){
    if(document.getElementById('aison-update-styles')) return;
    const style=document.createElement('style');
    style.id='aison-update-styles';
    style.textContent='.aison-update-badge{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:3px 8px;font-size:10px;font-weight:900;background:#fff2b8;color:#6b4e00;border:1px solid #f1d46b}.aison-update-note{margin:0 0 22px;padding:14px 16px;border-radius:14px;background:#fff8dc;border:1px solid #efd775;color:#493b12;font-size:14px;line-height:1.55}.aison-update-note b{display:block;margin-bottom:4px}.aison-update-note a{font-weight:900;color:inherit}';
    document.head.appendChild(style);
  }

  function storyIdFromHref(href=''){
    try{const url=new URL(href,location.href),queryId=url.searchParams.get('id');if(queryId)return queryId;const match=url.pathname.match(/\/news\/([^/]+)\.html$/);return match?decodeURIComponent(match[1]):''}catch{return ''}
  }

  function rewriteArticleLinks(){
    document.querySelectorAll('a[href*="article.html?id="]').forEach(link=>{
      const id=storyIdFromHref(link.getAttribute('href'));
      if(id) link.setAttribute('href','news/'+encodeURIComponent(id)+'.html');
    });
  }

  function badgeCards(){
    document.querySelectorAll('a[href*="article.html?id="],a[href*="news/"][href$=".html"]').forEach(link=>{
      const id=storyIdFromHref(link.getAttribute('href'));
      const info=updates[id];
      if(!info) return;
      const container=link.closest('.news-card,.daily-item,.top-brief,.top-item,.search-result,.related-card')||link;
      if(container.querySelector('.aison-update-badge')) return;
      const target=container.querySelector('.card-overline,.daily-meta,.search-result div,.related-reason,small');
      if(!target) return;
      const badge=document.createElement('span');
      badge.className='aison-update-badge';
      badge.textContent=info.label;
      target.appendChild(badge);
    });
  }

  function markArticle(){
    if(document.body?.dataset.page!=='article') return;
    const id=window.AISON_ARTICLE_ID||new URLSearchParams(location.search).get('id')||'';
    const info=updates[id];
    if(!info || document.querySelector('.aison-update-note')) return;
    const body=document.getElementById('articleBody');
    if(!body) return;
    const note=document.createElement('div');
    note.className='aison-update-note';
    note.innerHTML='<b>'+info.label+'｜同一事件後續</b><span>'+info.note+'</span> <a href="news/'+encodeURIComponent(info.previousId)+'.html">睇返較早報道 →</a>';
    body.insertBefore(note,body.firstChild);
  }

  function refreshBrand(root=document){
    const target=root.nodeType===1||root.nodeType===9?root:document;
    const walker=document.createTreeWalker(target,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      if(node.nodeValue && (node.nodeValue.includes('🐶')||node.nodeValue.includes('狗狗'))){
        node.nodeValue=node.nodeValue.replaceAll('🐶','🤖').replaceAll('狗狗','機械人');
      }
    }
    if(target.querySelectorAll){
      target.querySelectorAll('[alt*="狗狗"]').forEach(el=>el.alt=el.alt.replaceAll('狗狗','機械人'));
    }
    const jsonld=document.getElementById('jsonld');
    if(jsonld?.textContent){
      try{
        const data=JSON.parse(jsonld.textContent);
        if(data?.publisher?.logo?.url){
          data.publisher.logo.url=new URL('assets/mascot.webp',location.href).href;
          jsonld.textContent=JSON.stringify(data);
        }
      }catch{}
    }
  }

  function latestNews(){
    return (window.AISON_NEWS||[]).slice().sort((a,b)=>(a.rank||99)-(b.rank||99)).slice(0,10);
  }

  function editionDate(){
    return window.AISON_STATUS?.editionDate||latestNews().map(n=>n.date).filter(Boolean).sort().at(-1)||'';
  }

  function fmtDate(value=''){
    try{return new Intl.DateTimeFormat('zh-HK',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value+'T00:00:00'))}catch{return value}
  }

  function robotThreadsText(){
    const lines=latestNews().map(n=>`${String(n.rank).padStart(2,'0')}｜${n.title}\n${n.excerpt}`);
    return `🤖 AIson｜今日 AI 10 件事 ${fmtDate(editionDate())}\n\n${lines.join('\n\n')}\n\n🇭🇰 每篇完整內容都有「同香港人有咩關係？」＋ AIson Take。`;
  }

  function showToast(message){
    const toast=document.getElementById('toast');
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('show');
    setTimeout(()=>toast.classList.remove('show'),1800);
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('#copyThreads');
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    navigator.clipboard?.writeText(robotThreadsText()).then(()=>showToast('已 Copy Threads 版本')).catch(()=>showToast('請手動複製內容'));
  },true);

  function apply(){addStyles();rewriteArticleLinks();badgeCards();markArticle();refreshBrand()}
  document.addEventListener('DOMContentLoaded',()=>{
    apply();
    const observer=new MutationObserver(mutations=>{
      for(const mutation of mutations){
        mutation.addedNodes.forEach(node=>{if(node.nodeType===1)refreshBrand(node)});
      }
      rewriteArticleLinks();badgeCards();refreshBrand();
    });
    observer.observe(document.body,{childList:true,subtree:true});
  });
})();
