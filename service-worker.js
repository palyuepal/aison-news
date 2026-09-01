const CACHE='aison-v3-20260901-trust';
const CORE=['./','index.html','daily.html','weekly.html','guides.html','topics.html','archive.html','article.html','about.html','methodology.html','privacy.html','offline.html','styles.css','app.js','data/news.js','data/site.js','data/status.js','assets/mascot.webp','assets/favicon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const clone=r.clone();caches.open(CACHE).then(c=>c.put(e.request,clone));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('offline.html'))))});
