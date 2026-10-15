/* EINSATZDIALOG 0.10 · öffentliche Gestaltung aus Supabase, ohne Benutzer-Schlüssel. */
(() => {
 'use strict';
 const cfg=window.EINSATZDIALOG_PUBLIC_CONFIG||{};
 const url=String(cfg.url||'').trim().replace(/\/+$/,'');
 const key=String(cfg.publishableKey||'').trim();
 const valid=/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) && /^sb_publishable_[a-z0-9_-]+$/i.test(key);
 const DEFAULT_NAV=['library','history','install','settings'];
 const COLORS=['navy','accent','paper','card','coral','ink'];
 const MAX_LABEL=65;
 const html=document.documentElement;
 let config=null, root=null, observer=null, pending=false;
 const saneText=(v,max=140)=>String(v??'').trim().slice(0,max);
 const saneColor=(v)=>/^#[0-9a-fA-F]{6}$/.test(String(v||''))?v:null;
 function writeText(el,text){if(el&&el.textContent!==text)el.textContent=text;}
 function applyTheme(){
   if(!config)return;
   const colors=config.colors||{};
   for(const k of COLORS){
     const c=saneColor(colors[k]);
     if(c)html.style.setProperty('--'+k,c);
   }
   const width=['wide','compact'].includes(config.layout?.width)?config.layout.width:'standard';
   html.classList.toggle('ed-layout-wide',width==='wide');
   html.classList.toggle('ed-layout-compact',width==='compact');
   html.classList.toggle('ed-no-sidebar',config.layout?.showSidebar===false);
 }
 function applyContent(){
   if(!root||!config)return;
   const t=config.text||{};
   const brand=root.querySelector('.topbar a.brand');
   if(brand && typeof t.brand==='string'){
      const logo=brand.querySelector('.logo');
      let title=brand.querySelector('.ed-brand-text');
      if(!title){
         title=document.createElement('span');title.className='ed-brand-text';
         // Leave the logo intact and replace only the brand label.
         for(const node of [...brand.childNodes])if(node!==logo)node.remove();
         brand.append(title);
      }
      writeText(title,saneText(t.brand,45)||'EINSATZDIALOG');
   }
   if(typeof t.headerTag==='string')writeText(root.querySelector('.top-pill'),saneText(t.headerTag,85));
   const headline=saneText(t.homeHeadline,90);
   if(headline && root.querySelector('.intro-header .eyebrow')?.textContent?.includes('TRAINING')){
       writeText(root.querySelector('.intro-header h1'),headline);
   }
   const footer=root.querySelector('.footer');
   if(footer){
     const spans=footer.querySelectorAll(':scope > span');
     if(spans.length>=2){
       spans[0].hidden=t.showCopyright===false;
       if(typeof t.footerCopyright==='string')writeText(spans[0],saneText(t.footerCopyright,220));
       if(typeof t.footerRight==='string')writeText(spans[1],saneText(t.footerRight,220));
     }
   }
   const modes={guided:'guidedLabel',hidden:'hiddenLabel'};
   for(const [id,prop] of Object.entries(modes)){
     const btn=root.querySelector('[data-action="mode"][data-value="'+id+'"]');
     if(btn && typeof t[prop]==='string')writeText(btn,saneText(t[prop],MAX_LABEL));
   }
   const navroot=root.querySelector('.topbar .top-right');
   if(!navroot)return;
   const nav=Array.isArray(config.navigation)?config.navigation:[];
   // Only whitelisted app actions may be rearranged or hidden.
   const map=new Map(nav.filter(n=>n && DEFAULT_NAV.includes(n.id)).map(n=>[n.id,n]));
   const nodes=new Map(DEFAULT_NAV.map(id=>[id,navroot.querySelector('.top-link[data-action="'+id+'"]')]).filter(x=>x[1]));
   for(const id of DEFAULT_NAV){
     const node=nodes.get(id),opt=map.get(id);
     if(!node||!opt)continue;
     if(typeof opt.label==='string')writeText(node,saneText(opt.label,MAX_LABEL)||id);
     node.hidden=opt.visible===false;
   }
   const order=[...new Set([...nav.map(n=>n?.id).filter(id=>DEFAULT_NAV.includes(id)),...DEFAULT_NAV])];
   const current=[...navroot.querySelectorAll('.top-link[data-action]')].map(e=>e.dataset.action).filter(id=>nodes.has(id));
   if(order.length===current.length && order.some((id,i)=>id!==current[i])){
     for(const id of order){const node=nodes.get(id);if(node)navroot.append(node);}
   }
 }
 function schedule(){
   if(pending)return;pending=true;
   queueMicrotask(()=>{pending=false;applyContent();});
 }
 function attach(){
    root=document.getElementById('app');
    if(!root)return;
    observer?.disconnect();
    observer=new MutationObserver(schedule);
    observer.observe(root,{childList:true,subtree:true});
    applyTheme();applyContent();
 }
 async function load(){
   if(!valid)return;
   try{
     const resp=await fetch(url+'/rest/v1/site_settings?select=settings&id=eq.public&limit=1',{
       cache:'no-store',headers:{apikey:key,Accept:'application/json'}
     });
     if(!resp.ok)throw Error('HTTP '+resp.status);
     const rows=await resp.json();
     if(!Array.isArray(rows)||!rows[0]?.settings)return;
     config=rows[0].settings;
     applyTheme();schedule();
   }catch(err){console.warn('EINSATZDIALOG: Website-Design konnte nicht geladen werden.',err.message);}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});
 else attach();
 load();
})();
