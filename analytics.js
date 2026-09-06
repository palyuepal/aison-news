(() => {
  const SITE=()=>window.AISON_SITE||{};
  const STATUS=()=>window.AISON_STATUS||{};
  const cfg=()=>SITE().analytics||{};

  function privacyBlocked(){
    const c=cfg();
    if(c.respectDNT===false) return false;
    return navigator.globalPrivacyControl===true || navigator.doNotTrack==='1' || window.doNotTrack==='1';
  }

  function cleanPath(value){
    try{
      const u=new URL(value,location.href);
      return u.pathname.replace(/\/+/g,'/');
    }catch{return location.pathname}
  }

  function dispatch(event,data={}){
    const detail={event,...data};
    try{window.dispatchEvent(new CustomEvent('aison:analytics',{detail}))}catch{}
  }

  async function track(event,data={}){
    const safe={
      event:String(event||'').slice(0,64),
      path:cleanPath(data.path||location.pathname),
      edition:String(data.edition||STATUS().editionDate||'').slice(0,16),
      content:String(data.content||'').slice(0,120),
      ts:new Date().toISOString()
    };
    dispatch(safe.event,safe);
    const c=cfg();
    if(!safe.event || c.enabled!==true || !c.endpoint || privacyBlocked()) return false;
    try{
      await fetch(c.endpoint,{method:'POST',mode:'cors',credentials:'omit',keepalive:true,headers:{'content-type':'application/json'},body:JSON.stringify(safe)});
      return true;
    }catch{return false}
  }

  function contentFromLink(link){
    const href=link?.getAttribute('href')||'';
    try{
      const u=new URL(href,location.href);
      if(u.pathname.includes('/news/')) return u.pathname.split('/news/')[1]?.replace(/\.html$/,'')||'';
      if(u.pathname.endsWith('/topics.html')||u.pathname.endsWith('topics.html')) return u.searchParams.get('topic')||'';
      return cleanPath(u.href);
    }catch{return ''}
  }

  function classifyClick(target){
    const el=target.closest?.('a,button'); if(!el)return null;
    if(el.id==='shareDailyBtn')return ['share_daily','today-10'];
    if(el.id==='copyDailyBtn')return ['copy_daily','today-10'];
    if(el.id==='returnNewsletter')return ['newsletter_click','return-cta'];
    if(el.id==='searchTrigger'||el.id==='heroSearch')return ['search_open',''];
    const href=el.getAttribute?.('href')||'';
    if(href.includes('weekly.html'))return ['weekly_open','weekly'];
    if(href.includes('topics.html?topic='))return ['storyline_open',contentFromLink(el)];
    if(href.includes('news/'))return ['story_open',contentFromLink(el)];
    return null;
  }

  window.AISON_ANALYTICS={track};
  document.addEventListener('DOMContentLoaded',()=>{
    track('pageview',{path:location.pathname});
    document.addEventListener('click',event=>{
      const hit=classifyClick(event.target); if(hit) track(hit[0],{content:hit[1]});
    },{capture:true,passive:true});
  });
})();
