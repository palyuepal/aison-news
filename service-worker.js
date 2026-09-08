const CACHE='aison-v3-20260909-posthog1';
const CORE=['./','index.html','daily.html','live.html','weekly.html','guides.html','topics.html','archive.html','article.html','about.html','methodology.html','corrections.html','privacy.html','offline.html','manifest.webmanifest','styles.css','engagement.css','trust.css','app.js','archive.js','topics.js','weekly.js','lite-home.js','engagement.js','analytics.js','story-updates.js','search-quality.js','daily-share.js','live.js','live-timeline.js','trust.js','corrections.js','pwa-return.js','data/live.js','data/latest.js','data/search-index.json','data/editorial.js','data/corrections.js','data/site.js','data/status.js','assets/mascot.webp','assets/favicon.png','assets/icon-192.png','assets/icon-512.png','assets/apple-touch-icon.png'];
const LIVE_DATA=new Set(['/data/live.js','/data/latest.js','/data/editorial.js','/data/status.js','/data/site.js','/data/corrections.js','/data/search-index.json']);

async function put(request,response){
  if(!response||!response.ok)return response;
  try{const cache=await caches.open(CACHE);await cache.put(request,response.clone())}catch{}
  return response;
}

async function networkFirst(request,{navigation=false}={}){
  try{return await put(request,await fetch(request))}
  catch{
    const cached=await caches.match(request,{ignoreSearch:true});
    if(cached)return cached;
    if(navigation)return caches.match('offline.html');
    throw new Error('offline');
  }
}

async function staleWhileRevalidate(request){
  const cached=await caches.match(request,{ignoreSearch:true});
  const network=fetch(request).then(response=>put(request,response)).catch(()=>null);
  return cached||await network||new Response('',{status:504,statusText:'Offline'});
}

self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(networkFirst(request,{navigation:true}));
    return;
  }
  if(LIVE_DATA.has(url.pathname)){
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});
