/* EINSATZDIALOG PWA: cache only public app files, never chats or Ollama API */
const CACHE='einsatzdialog-shell-v15-design-20261109';
const SHELL=['./','./index.html','./style.css?v=082','./typography.css?v=1','./design-system.css?v=1','./public-design.css?v=010','./public-layout.css?v=012','./public-visual.css?v=012','./fonts/source-sans-3-latin-400-normal.woff2','./fonts/source-sans-3-latin-600-normal.woff2','./fonts/source-sans-3-latin-700-normal.woff2','./fonts/source-serif-4-latin-600-normal.woff2','./fonts/source-serif-4-latin-700-normal.woff2','./scenarios.js?v=081','./extend.js?v=081','./app.js?v=014','./cms-config.js?v=091','./cms-content.js?v=09','./public-design.js?v=013','./public-layout.js?v=012','./pwa.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-180.png','./icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('einsatzdialog-shell-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 const u=new URL(request.url);if(u.pathname.includes('/api/'))return;
 if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>response.ok?response:Promise.reject(new Error('offline'))).catch(()=>caches.match('./index.html')));return;
 }
 event.respondWith(caches.match(request).then(hit=>hit||fetch(request)));
});