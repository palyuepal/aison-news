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

  function boundedNumber(value,max=9999){
    const n=Number(value);
    if(!Number.isFinite(n)) return undefined;
    return Math.max(0,Math.min(max,Math.round(n)));
  }

  function dispatch(event,data={}){
    const detail={event,...data};
    try{window.dispatchEvent(new CustomEvent('aison:analytics',{detail}))}catch{}
  }

  let posthogReady=false;
  function ensurePostHog(){
    const c=cfg();
    if(posthogReady) return true;
    if(c.enabled!==true || c.provider!=='posthog' || !c.projectKey || privacyBlocked()) return false;

    !function(t,e){
      var o,n,p,r;
      e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){
        function g(t,e){var o=e.split('.');2===o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}
        (p=t.createElement('script')).type='text/javascript';p.crossOrigin='anonymous';p.async=true;
        p.src=(s.api_host||'https://us.i.posthog.com').replace('.i.posthog.com','-assets.i.posthog.com')+'/static/array.js';
        (r=t.getElementsByTagName('script')[0]).parentNode.insertBefore(p,r);
        var u=e;void 0!==a?u=e[a]=[]:a='posthog';u.people=u.people||[];
        u.toString=function(t){var e='posthog';return'posthog'!==a&&(e+='.'+a),t||(e+=' (stub)'),e};
        u.people.toString=function(){return u.toString(1)+'.people (stub)'};
        o='init capture register register_once unregister getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags onFeatureFlags identify group reset alias set_config opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing'.split(' ');
        for(n=0;n<o.length;n++)g(u,o[n]);
        e._i.push([i,s,a]);
      },e.__SV=1)
    }(document,window.posthog||[]);

    try{
      window.posthog.init(c.projectKey,{
        api_host:c.apiHost||'https://us.i.posthog.com',
        ui_host:'https://us.posthog.com',
        defaults:'2026-05-30',
        autocapture:false,
        capture_pageview:true,
        capture_pageleave:true,
        disable_session_recording:true,
        enable_heatmaps:false,
        capture_performance:false
      });
      posthogReady=true;
      return true;
    }catch{return false}
  }

  async function track(event,data={}){
    const safe={
      event:String(event||'').slice(0,64),
      path:cleanPath(data.path||location.pathname),
      edition:String(data.edition||STATUS().editionDate||'').slice(0,16),
      content:String(data.content||'').slice(0,120),
      placement:String(data.placement||'').slice(0,80),
      result_type:String(data.result_type||'').slice(0,40),
      query_length:boundedNumber(data.query_length,200),
      results_count:boundedNumber(data.results_count,500),
      result_rank:boundedNumber(data.result_rank,100),
      ts:new Date().toISOString()
    };
    dispatch(safe.event,safe);
    const c=cfg();
    if(!safe.event || c.enabled!==true || privacyBlocked()) return false;

    if(c.provider==='posthog'){
      if(!ensurePostHog()) return false;
      // PostHog emits the canonical $pageview/$pageleave pair automatically.
      if(safe.event==='pageview') return true;
      try{
        window.posthog.capture(safe.event,{
          path:safe.path,
          edition:safe.edition||undefined,
          content:safe.content||undefined,
          placement:safe.placement||undefined,
          result_type:safe.result_type||undefined,
          query_length:safe.query_length,
          results_count:safe.results_count,
          result_rank:safe.result_rank,
          aison_event:safe.event
        });
        return true;
      }catch{return false}
    }

    if(!c.endpoint) return false;
    try{
      await fetch(c.endpoint,{method:'POST',mode:'cors',credentials:'omit',keepalive:true,headers:{'content-type':'application/json'},body:JSON.stringify(safe)});
      return true;
    }catch{return false}
  }

  function currentContent(){
    try{
      const queryId=new URLSearchParams(location.search).get('id');
      if(queryId) return queryId;
      const match=location.pathname.match(/\/news\/([^/]+)\.html$/);
      return match?.[1]||'';
    }catch{return ''}
  }

  function contentFromLink(link){
    const href=link?.getAttribute('href')||'';
    try{
      const u=new URL(href,location.href);
      if(u.pathname.includes('/news/')) return u.pathname.split('/news/')[1]?.replace(/\.html$/,'')||'';
      if(u.pathname.endsWith('/article.html')||u.pathname.endsWith('article.html')) return u.searchParams.get('id')||'';
      if(u.pathname.endsWith('/topics.html')||u.pathname.endsWith('topics.html')) return u.searchParams.get('topic')||'';
      return cleanPath(u.href);
    }catch{return ''}
  }

  function placementFromElement(el){
    const explicit=String(el?.dataset?.analyticsSlot||'').trim();
    if(explicit)return explicit.slice(0,80);
    if(el?.closest?.('nav,.navlinks,.mobile-nav'))return 'nav';
    if(el?.closest?.('footer,.footer'))return 'footer';
    if(el?.closest?.('.hero'))return 'hero';
    if(el?.closest?.('.newsletter'))return 'newsletter-panel';
    if(el?.closest?.('.return-cta'))return 'return-cta';
    return 'content';
  }

  function classifyClick(target){
    const el=target.closest?.('a,button'); if(!el)return null;
    const href=el.getAttribute?.('href')||'';
    if(el.matches?.('.search-result')){
      const list=el.closest('#searchResults');
      const items=list?[...list.querySelectorAll('.search-result')]:[];
      return ['search_result_open',contentFromLink(el),'quality_search',{
        result_rank:Math.max(1,items.indexOf(el)+1),
        result_type:'story'
      }];
    }
    const archiveInput=document.getElementById('archiveSearch');
    if(el.matches?.('.news-card') && String(archiveInput?.value||'').trim()){
      const grid=el.closest('#archiveGrid')||document.getElementById('archiveGrid');
      const items=grid?[...grid.querySelectorAll('.news-card')]:[];
      return ['search_result_open',contentFromLink(el),'archive_search',{
        result_rank:Math.max(1,items.indexOf(el)+1),
        result_type:'story'
      }];
    }
    if(el.id==='shareDailyBtn'||el.id==='shareDailyCard')return ['share_daily','today-10',placementFromElement(el)];
    if(el.id==='copyDailyBtn'||el.id==='copyThreads'||el.id==='copyHeadlines')return ['copy_daily','today-10',placementFromElement(el)];
    if(el.id==='downloadDailyCard')return ['daily_card_download','today-10',placementFromElement(el)];
    if(el.id==='searchTrigger'||el.id==='heroSearch')return ['search_open','',placementFromElement(el)];
    if(el.id==='bookmarkBtn')return [el.getAttribute('aria-pressed')==='true'?'story_unsave':'story_save',currentContent(),placementFromElement(el)];
    if(el.matches?.('[data-newsletter-link]')||href.includes('beehiiv.com/subscribe'))return ['newsletter_click','newsletter',placementFromElement(el)];
    if(href.includes('live.html'))return ['live_open','live',placementFromElement(el)];
    if(href.includes('weekly.html'))return ['weekly_open','weekly',placementFromElement(el)];
    if(href.includes('topics.html?topic='))return ['storyline_open',contentFromLink(el),placementFromElement(el)];
    // Article reads are recorded on the destination page after it actually loads.
    return null;
  }

  function installSearchTracking(){
    const setups=[
      {id:'searchInput',placement:'quality_search',results:()=>document.querySelectorAll('#searchResults .search-result').length},
      {id:'archiveSearch',placement:'archive_search',results:()=>document.querySelectorAll('#archiveGrid .news-card').length}
    ];
    setups.forEach(({id,placement,results})=>{
      const input=document.getElementById(id);
      if(!input||input.dataset.analyticsSearch==='1')return;
      input.dataset.analyticsSearch='1';
      let timer,lastValue='';
      input.addEventListener('input',()=>{
        clearTimeout(timer);
        timer=setTimeout(()=>{
          const value=String(input.value||'').trim();
          if(Array.from(value).length<2)return;
          if(value===lastValue)return;
          lastValue=value;
          const queryLength=Math.min(200,Array.from(value).length);
          const resultCount=Math.min(500,Number(results())||0);
          track('search_used',{
            placement,
            query_length:queryLength,
            results_count:resultCount
          });
        },700);
      },{passive:true});
    });
  }

  let initialized=false;
  function init(){
    if(initialized)return; initialized=true;
    track('pageview',{path:location.pathname});
    const articleId=currentContent();
    if(articleId && (location.pathname.includes('/news/') || location.pathname.endsWith('/article.html'))){
      track('story_open',{content:articleId,path:location.pathname,placement:'article'});
    }
    document.addEventListener('click',event=>{
      const hit=classifyClick(event.target);
      if(hit) track(hit[0],{content:hit[1],placement:hit[2],...(hit[3]||{})});
    },{capture:true,passive:true});
    // search-quality.js installs enhanced inputs after DOMContentLoaded; one tick is enough
    // to attach privacy-preserving analytics to the final cloned nodes.
    setTimeout(installSearchTracking,50);
    setTimeout(installSearchTracking,500);
  }

  window.AISON_ANALYTICS={track};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();