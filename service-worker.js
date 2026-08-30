const CACHE='aison-v3-20260830-follow';
const CORE=['./','index.html','daily.html','weekly.html','guides.html','archive.html','article.html','about.html','privacy.html','offline.html','styles.css?v=20260830-follow','app.js?v=20260830-follow','data/news.js?v=20260830-longread','data/site.js?v=20260830','assets/mascot.webp','assets/favicon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const clone=r.clone();caches.open(CACHE).then(c=>c.put(e.request,clone));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('offline.html'))))});
