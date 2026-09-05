(() => {
  const updates = {
    '2026-09-04-nvidia-acquire-hugging-face': {
      previousId: '2026-08-29-nvidia-hugging-face-acquisition',
      label: '↻ 官方跟進',
      note: 'AIson 8 月 29 日曾報道這宗收購消息；本篇為 NVIDIA 其後正式公告及新增細節。'
    }
  };

  const esc=(s='')=>String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const fmt=s=>{try{return new Intl.DateTimeFormat('zh-HK',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s+'T00:00:00'))}catch{return s}};

  function loadSearchIndex(){
    if(window.AISON_SEARCH_INDEX_PROMISE) return window.AISON_SEARCH_INDEX_PROMISE;
    window.AISON_SEARCH_INDEX_PROMISE=fetch('data/search-index.json',{cache:'no-cache'}).then(response=>{
      if(!response.ok) throw new Error(`search index ${response.status}`);
      return response.json();
    }).then(rows=>Array.isArray(rows)?rows:[]).catch(()=>{
      return (window.AISON_NEWS||[]).map(n=>({id:n.id,rank:n.rank,title:n.title,excerpt:n.excerpt,category:n.category,tags:n.tags||[],date:n.date}));
    });
    return window.AISON_SEARCH_INDEX_PROMISE;
  }

  function searchIndexHits(index,q=''){
    const term=q.trim().toLowerCase();
    if(!term) return index.slice(0,6);
    return index.filter(n=>[n.title,n.excerpt,n.category,...(n.tags||[])].join(' ').toLowerCase().includes(term)).slice(0,12);
  }

  async function renderLiteSearch(root,q=''){
    if(!root) return;
    root.innerHTML='<div class="empty" style="display:block">正在載入搜尋索引…</div>';
    const index=await loadSearchIndex();
    const hits=searchIndexHits(index,q);
    root.innerHTML=hits.length?hits.map(n=>`<a class="search-result" href="news/${encodeURIComponent(n.id)}.html"><span class="num">${String(n.rank||'').padStart(2,'0')}</span><div><b>${esc(n.title)}</b><span>${esc(n.category)} · ${fmt(n.date)}</span></div></a>`).join(''):'<div class="empty" style="display:block">搵唔到相關內容。</div>';
  }

  function cloneWithoutListeners(node){
    if(!node) return null;
    const clone=node.cloneNode(true);
    node.replaceWith(clone);
    return clone;
  }

  function installLiteSearch(){
    const oldModal=document.getElementById('searchModal');
    if(!oldModal||oldModal.dataset.aisonLiteSearch==='1') return;
    const modal=cloneWithoutListeners(oldModal);
    modal.dataset.aisonLiteSearch='1';
    const searchTrigger=cloneWithoutListeners(document.getElementById('searchTrigger'));
    const heroSearch=cloneWithoutListeners(document.getElementById('heroSearch'));
    const input=modal.querySelector('#searchInput');
    const results=modal.querySelector('#searchResults');
    const closeButton=modal.querySelector('#closeSearch');
    let timer;
    const open=()=>{
      modal.classList.add('open');
      modal.setAttribute('aria-hidden','false');
      renderLiteSearch(results,input?.value||'');
      setTimeout(()=>input?.focus(),50);
    };
    const close=()=>{
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden','true');
    };
    searchTrigger?.addEventListener('click',open);
    heroSearch?.addEventListener('click',open);
    closeButton?.addEventListener('click',close);
    modal.addEventListener('click',event=>{if(event.target===modal)close()});
    input?.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>renderLiteSearch(results,input.value),70)});
    document.addEventListener('keydown',event=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();event.stopImmediatePropagation();open();return;
      }
      if(event.key==='Escape'&&modal.classList.contains('open')){
        event.stopImmediatePropagation();close();
      }
    },true);
  }

  function addStyles(){
    if(document.getElementById('aison-update-styles')) return;
    const style=document.createElement('style');
    style.id='aison-update-styles';
    style.textContent=`
      .aison-update-badge{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:3px 8px;font-size:10px;font-weight:900;background:#fff2b8;color:#6b4e00;border:1px solid #f1d46b}
      .aison-update-note{margin:0 0 22px;padding:14px 16px;border-radius:14px;background:#fff8dc;border:1px solid #efd775;color:#493b12;font-size:14px;line-height:1.55}.aison-update-note b{display:block;margin-bottom:4px}.aison-update-note a{font-weight:900;color:inherit}
      .newsletter-fallback{display:block;position:relative;z-index:5;margin-top:10px;text-align:center;font-size:11px;font-weight:900;color:#61728d;text-decoration:none}.newsletter-fallback:hover{color:#082753;text-decoration:underline}.panel.dark .newsletter-fallback{color:#ffe187}
      .daily-trend-list{display:grid;gap:11px}.daily-trend{display:block;padding:13px 14px;border-radius:14px;background:rgba(255,255,255,.065);border:1px solid rgba(255,255,255,.13);color:#fff;text-decoration:none}.daily-trend-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.daily-trend-head span{font-size:10px;font-weight:950;color:#ffc928;letter-spacing:.06em}.daily-trend-head b{font-size:10px;color:#9fb4d2}.daily-trend h4{margin:7px 0 6px;font-size:14px;line-height:1.4;color:#fff}.daily-trend p{margin:0;color:#c7d5e8;font-size:11px;line-height:1.55}.daily-trend small{display:block;margin-top:8px;color:#ffe187;font-size:10px;font-weight:900}
    `;
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

  function canonicalArticleUrl(){
    const canonical=document.querySelector('link[rel="canonical"]')?.href;
    if(canonical) return canonical;
    const url=new URL(location.href);
    url.search='';url.hash='';
    return url.href;
  }

  function articleShareText(){
    const title=document.getElementById('articleTitle')?.textContent?.trim()||document.title.replace(/｜AIson$/,'')||'AIson';
    const excerpt=document.getElementById('articleExcerpt')?.textContent?.trim()||document.querySelector('meta[name="description"]')?.content||'';
    return {title,excerpt,url:canonicalArticleUrl()};
  }

  async function shareCanonicalArticle(){
    const {title,excerpt,url}=articleShareText();
    if(navigator.share){
      try{await navigator.share({title:title+'｜AIson',text:excerpt,url});return}catch(error){if(error?.name==='AbortError')return}
    }
    copyCanonicalLink();
  }

  function copyCanonicalLink(){
    const url=canonicalArticleUrl();
    navigator.clipboard?.writeText(url).then(()=>window.dispatchEvent(new CustomEvent('aison-toast',{detail:'已複製文章連結'}))).catch(()=>window.dispatchEvent(new CustomEvent('aison-toast',{detail:'請手動複製網址'})));
  }

  function shareWhatsApp(){
    const {title,excerpt,url}=articleShareText();
    const text=[title,excerpt,url].filter(Boolean).join('\n\n');
    window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');
  }

  function fixJsonLd(){
    const jsonld=document.getElementById('jsonld');
    if(!jsonld?.textContent) return;
    try{
      const data=JSON.parse(jsonld.textContent);
      const canonical=canonicalArticleUrl();
      const publisherLogo=new URL('assets/icon-512.png',location.href).href;
      data.mainEntityOfPage=canonical;
      if(!data.image || (Array.isArray(data.image)&&!data.image.length)) data.image=[publisherLogo];
      if(data.publisher?.logo) data.publisher.logo.url=publisherLogo;
      jsonld.textContent=JSON.stringify(data);
    }catch{}
  }

  function showToast(message){
    const toast=document.getElementById('toast');
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('show');
    setTimeout(()=>toast.classList.remove('show'),1800);
  }

  function navItems(){
    return [
      ['home','index.html','⌂','首頁'],
      ['daily','daily.html','☀','今日 AI 10 件事'],
      ['live','index.html#aison-live','●','AIson LIVE'],
      ['weekly','weekly.html','◷','本週回顧'],
      ['topics','topics.html','◎','主題'],
      ['archive','archive.html','▤','新聞庫']
    ];
  }

  function currentNavKey(){
    const page=document.body?.dataset.page||'';
    if(location.hash==='#aison-live') return 'live';
    if(['home','daily','weekly','topics','archive'].includes(page)) return page;
    const name=location.pathname.split('/').pop()||'index.html';
    if(name==='index.html'||name==='') return 'home';
    return '';
  }

  function normalizeNavigation(){
    const topbar=document.querySelector('.topbar');
    const navWrap=topbar?.querySelector('.nav');
    if(!topbar||!navWrap) return;
    const active=currentNavKey();
    let nav=navWrap.querySelector('.navlinks');
    if(!nav){nav=document.createElement('nav');nav.className='navlinks';nav.setAttribute('aria-label','主要導覽');navWrap.querySelector('.brand')?.after(nav)}
    nav.innerHTML=navItems().map(([key,href,icon,label])=>`<a${key===active?' class="active"':''} href="${href}"><i>${icon}</i>${label}</a>`).join('');
    let mobile=topbar.querySelector('#mobileNav');
    if(!mobile){mobile=document.createElement('div');mobile.className='mobile-nav';mobile.id='mobileNav';topbar.appendChild(mobile)}
    mobile.innerHTML=navItems().map(([key,href,,label])=>`<a${key===active?' class="active"':''} href="${href}">${label}</a>`).join('');
    let btn=navWrap.querySelector('#menuBtn');
    const createdButton=!btn;
    if(!btn){btn=document.createElement('button');btn.className='menuBtn';btn.id='menuBtn';btn.setAttribute('aria-label','開啟選單');btn.textContent='☰';navWrap.appendChild(btn)}
    if(createdButton){btn.addEventListener('click',()=>{mobile.style.display=mobile.style.display==='block'?'none':'block'})}
    if(location.hash==='#aison-live') setTimeout(()=>document.getElementById('aison-live')?.scrollIntoView({block:'start'}),0);
  }

  function addNewsletterFallback(){
    const url=window.AISON_SITE?.newsletter?.subscribeUrl||'https://yues-newsletter-c6d023.beehiiv.com/subscribe';
    document.querySelectorAll('.newsletter').forEach(panel=>{
      if(panel.querySelector('.newsletter-fallback')) return;
      const link=document.createElement('a');
      link.className='newsletter-fallback';
      link.href=url;link.target='_blank';link.rel='noopener noreferrer';
      link.textContent='收唔到訂閱表格？直接訂閱 AIson Newsletter →';
      panel.appendChild(link);
    });
  }

  function themeDefinitions(){
    return [
      {label:'產品與模型',title:'由「發布」走向真正可用',keywords:['openai','chatgpt','gpt','google','gemini','anthropic','claude','模型','產品','agent','工具','發布','rollout','平台']},
      {label:'政策與安全',title:'AI 競爭開始變成規則競爭',keywords:['政策','監管','安全','治理','政府','美國','中國','網絡','風險','法案','合規']},
      {label:'資本與基建',title:'資金、晶片與算力決定下一輪',keywords:['ipo','融資','收購','投資','市場','估值','nvidia','晶片','算力','基建','資料中心','雲端','資本']}
    ];
  }

  function storyText(story){return [story.title,story.excerpt,story.category,...(story.tags||[])].join(' ').toLowerCase()}

  function buildDailyThemes(){
    const stories=(window.AISON_NEWS||[]).slice().sort((a,b)=>(a.rank||99)-(b.rank||99)).slice(0,10);
    if(!stories.length) return [];
    const themes=themeDefinitions().map(t=>({...t,items:[]}));
    stories.forEach(story=>{
      const hay=storyText(story);
      const scores=themes.map(t=>t.keywords.reduce((sum,k)=>sum+(hay.includes(k)?1:0),0));
      const best=Math.max(...scores);
      const index=best>0?scores.indexOf(best):themes.reduce((min,_,i)=>themes[i].items.length<themes[min].items.length?i:min,0);
      themes[index].items.push(story);
    });
    themes.forEach(theme=>{
      if(theme.items.length) return;
      const donor=themes.slice().sort((a,b)=>b.items.length-a.items.length)[0];
      if(donor?.items.length>1) theme.items.push(donor.items.pop());
    });
    return themes;
  }

  function renderDailyThemes(){
    const root=document.getElementById('dailyTop3');
    if(!root) return;
    const themes=buildDailyThemes();
    if(!themes.length) return;
    const panel=root.closest('.panel');
    const kicker=panel?.querySelector('.panel-kicker');
    const heading=panel?.querySelector('h3');
    if(kicker) kicker.textContent='TODAY’S 3 SIGNALS';
    if(heading) heading.textContent='今日 3 條主線';
    root.className='daily-trend-list';
    root.innerHTML=themes.map((theme,index)=>{
      const lead=theme.items.slice().sort((a,b)=>(a.rank||99)-(b.rank||99))[0];
      const detail=(lead?.whyImportant||lead?.excerpt||'').replace(/\s+/g,' ').trim();
      const short=detail.length>86?detail.slice(0,86).replace(/[，。；、\s]+$/,'')+'…':detail;
      const href=lead?'news/'+encodeURIComponent(lead.id)+'.html':'daily.html';
      return `<a class="daily-trend" href="${href}"><div class="daily-trend-head"><span>0${index+1} · ${esc(theme.label)}</span><b>${theme.items.length} 則相關</b></div><h4>${esc(theme.title)}</h4><p>${esc(short)}</p><small>閱讀代表報道 →</small></a>`;
    }).join('');
  }

  window.addEventListener('aison-toast',event=>showToast(event.detail||''));
  window.shareArticle=shareCanonicalArticle;
  window.copyLink=copyCanonicalLink;
  window.shareWhatsApp=shareWhatsApp;

  function apply(){addStyles();normalizeNavigation();addNewsletterFallback();renderDailyThemes();rewriteArticleLinks();badgeCards();markArticle();fixJsonLd();installLiteSearch()}
  document.addEventListener('DOMContentLoaded',()=>{
    apply();
    const observer=new MutationObserver(()=>{addNewsletterFallback();rewriteArticleLinks();badgeCards();fixJsonLd()});
    observer.observe(document.body,{childList:true,subtree:true});
  });
})();