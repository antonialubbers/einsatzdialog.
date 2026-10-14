/* EINSATZDIALOG PWA: cache only public app files, never chats or Ollama API */
const CACHE='einsatzdialog-shell-v08-20261014';
const SHELL=['./','./index.html','./style.css?v=08','./scenarios.js?v=08','./extend.js?v=08','./app.js?v=08','./pwa.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-180.png','./icon.svg'];
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