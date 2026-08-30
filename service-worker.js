const CACHE='aison-v3-20260830-brief';
const CORE=['./','index.html','daily.html','archive.html','article.html','about.html','privacy.html','offline.html','styles.css?v=20260829-reporting','app.js?v=20260830-brief','data/news.js?v=20260830','data/site.js?v=20260830','data/status.js?v=20260830','assets/mascot.webp','assets/favicon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const clone=r.clone();caches.open(CACHE).then(c=>c.put(e.request,clone));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('offline.html'))))});
