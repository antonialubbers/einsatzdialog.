(()=>{'use strict';
 const secure=location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname);
 const flag=()=>{const t=document.getElementById('connection-status');if(t){t.textContent=navigator.onLine?'● Online':'● Offline';t.classList.toggle('offline',!navigator.onLine)}};
 window.addEventListener('online',flag);window.addEventListener('offline',flag);
 document.addEventListener('DOMContentLoaded',flag);
 if('serviceWorker' in navigator && secure){
   window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(err=>console.info('Offline-Cache nicht verfügbar:',err.message)));
 }
})();