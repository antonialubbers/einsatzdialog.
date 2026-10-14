/* EINSATZDIALOG 0.9 – Lernkarten-Editor (GitHub Pages + Supabase RLS)
   Public browser config contains ONLY Project URL and sb_publishable_ key.
   Supabase RLS is responsible for actual permissions. */
(() => {
'use strict';
const $ = (id) => document.getElementById(id);
const CFG = 'ed_supa_pub_config_v1';
const SESSION = 'ed_supa_session_v1';
const GROUPS = ['Feuerwehr','Rettungsdienst','THW','Polizei'];
let config=null, session=null, modules=[], cards=[], selectedModuleId=null, selectedCardId=null;
let flashTimer;
function show(id) { ['setup','login','dashboard'].forEach(x => $(x).hidden = x!==id); }
function message(text, bad=false) {
 const node=$('flash'); node.textContent=text; node.className=bad?'error':''; node.hidden=false;
 clearTimeout(flashTimer); flashTimer=setTimeout(()=>{node.hidden=true;},6000);
}
function exception(err){ message(err?.message || String(err),true); }
const trimUrl=(s)=>String(s||'').trim().replace(/\/+$/,'');
const validConfig = (c)=>c && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(c.url||'') && /^sb_publishable_[A-Za-z0-9_-]+$/.test(c.key||'');
function headers(auth=true){
 const h={'apikey':config.key,'Content-Type':'application/json'};
 if(auth&&session?.access_token)h.Authorization='Bearer '+session.access_token;
 return h;
}
function saveSession(s){session=s;if(s)sessionStorage.setItem(SESSION,JSON.stringify(s));else sessionStorage.removeItem(SESSION);}
async function call(endpoint, options={}, retry=true){
 if(!config)throw Error('Supabase-Verbindung fehlt.');
 let res=await fetch(config.url+endpoint,{...options,headers:{...headers(),...(options.headers||{})}});
 if(res.status===401 && retry && session?.refresh_token){
   await refresh();res=await fetch(config.url+endpoint,{...options,headers:{...headers(),...(options.headers||{})}});
 }
 if(!res.ok){let details={};try{details=await res.json();}catch{}
  if(res.status===401)throw Error('Sitzung abgelaufen. Bitte erneut anmelden.');
  if(res.status===403)throw Error('Keine Berechtigung. Bitte RLS und Adminrechte in Supabase prüfen.');
  throw Error(details.message||details.msg||details.error_description||`Anfrage fehlgeschlagen (HTTP ${res.status}).`);
 }
 if(res.status===204)return null;
 const raw=await res.text();return raw?JSON.parse(raw):null;
}
async function refresh(){
 const r=await fetch(config.url+'/auth/v1/token?grant_type=refresh_token',{
  method:'POST',headers:headers(false),body:JSON.stringify({refresh_token:session.refresh_token})
 });
 if(!r.ok){saveSession(null);throw Error('Bitte erneut anmelden.');}
 const data=await r.json();saveSession(data);
}
async function login(event){
 event.preventDefault(); const btn=event.submitter;btn.disabled=true;
 try{
 const email=event.target.email.value.trim();const password=event.target.password.value;
 const r=await fetch(config.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:headers(false),body:JSON.stringify({email,password})});
 let data=await r.json();if(!r.ok)throw Error(data.error_description||data.msg||'Anmeldung fehlgeschlagen.');
 saveSession(data);await enterAdmin();event.target.reset();
 }catch(e){saveSession(null);exception(e);}finally{btn.disabled=false;}
}
async function enterAdmin(){
 const u=await call('/auth/v1/user');
 const p=new URLSearchParams({select:'user_id',user_id:'eq.'+u.id,limit:'1'});
 const rows=await call('/rest/v1/einsatzdialog_admins?'+p);
 if(!Array.isArray(rows)||rows.length===0){saveSession(null);show('login');throw Error('Dieses Konto hat keine Administratorrechte. Prüfe den Admin-Eintrag in Supabase.');}
 $('signedInAs').textContent=u.email || 'Administrator';
 show('dashboard');await loadModules();
}
async function rest(table, verb='GET', id=null, payload=null, filters={}){
 const p=new URLSearchParams();
 if(verb==='GET'){p.set('select','*');p.set('order','position.asc,created_at.asc');}
 if(id)p.set('id','eq.'+id);
 for(const [key,val] of Object.entries(filters))p.set(key,val);
 let url='/rest/v1/'+table+(p.size?'?'+p:'');
 const opts={method:verb};
 if(verb!=='GET'){opts.headers={'Prefer':'return=representation'};if(payload!==null)opts.body=JSON.stringify(payload);}
 return call(url,opts);
}
function makeBtn(label,action,extra=''){
 const b=document.createElement('button');b.type='button';b.textContent=label;b.className=extra;b.addEventListener('click',action);return b;
}
async function loadModules(){
 modules=await rest('learning_modules');renderModules();
 if(selectedModuleId && modules.some(x=>x.id===selectedModuleId)) await selectModule(selectedModuleId);
 else if(modules.length)await selectModule(modules[0].id);
 else {selectedModuleId=null;$('emptyState').hidden=false;$('moduleWorkspace').hidden=true;}
}
function renderModules(){
 const container=$('moduleList');container.replaceChildren();
 if(!modules.length){const p=document.createElement('p');p.className='muted';p.textContent='Noch keine Module vorhanden.';container.append(p);return;}
 modules.forEach((m,i)=>{
  const wrap=document.createElement('div');wrap.className='module-row'+(m.id===selectedModuleId?' active':'');
  const pick=makeBtn('',()=>selectModule(m.id),'module-select');
  const title=document.createElement('strong');title.textContent=m.title;
  const status=document.createElement('small');status.textContent=({draft:'Entwurf',published:'Veröffentlicht',archived:'Archiviert'}[m.status]||m.status);
  pick.append(title,status);
  const moves=document.createElement('div');moves.className='move-buttons';
  const up=makeBtn('↑',()=>move('learning_modules',modules,i,-1));up.disabled=i===0;up.title='Nach oben';
  const down=makeBtn('↓',()=>move('learning_modules',modules,i,1));down.disabled=i===modules.length-1;down.title='Nach unten';moves.append(up,down);
  wrap.append(pick,moves);container.append(wrap);
 });
}
async function move(table,items,i,dir){
 const other=i+dir;if(other<0||other>=items.length)return;
 const a=items[i],b=items[other];
 // normalize positions first when duplicates exist; then swap deterministically.
 try{
  for(let n=0;n<items.length;n++)await rest(table,'PATCH',items[n].id,{position:n*10});
  await rest(table,'PATCH',a.id,{position:other*10});
  await rest(table,'PATCH',b.id,{position:i*10});
  if(table==='learning_modules')await loadModules();else await loadCards();
  message('Reihenfolge gespeichert.');
 }catch(e){exception(e);}
}
async function selectModule(id){
 selectedModuleId=id;selectedCardId=null;
 const m=modules.find(x=>x.id===id);if(!m)return;
 $('emptyState').hidden=true;$('moduleWorkspace').hidden=false;$('cardEditor').hidden=true;
 $('moduleTitle').value=m.title;$('moduleDesc').value=m.description||'';$('moduleStatus').value=m.status;
 document.querySelectorAll('#groupChoices input').forEach(c=>{c.checked=(m.target_groups||GROUPS).includes(c.value);});
 renderModules();await loadCards();
}
async function addModule(){
 try{
  const created=await rest('learning_modules','POST',null,{
   title:'Neues Lernmodul',description:'',position:modules.length*10,status:'draft',target_groups:GROUPS
  });
  const id=created?.[0]?.id;if(!id)throw Error('Modul konnte nicht erstellt werden.');
  selectedModuleId=id;await loadModules();$('moduleTitle').focus();message('Neues Modul als Entwurf erstellt.');
 }catch(e){exception(e);}
}
async function saveModule(){
 if(!selectedModuleId)return;
 const title=$('moduleTitle').value.trim();if(!title){message('Bitte einen Modultitel eintragen.',true);return;}
 const groups=Array.from(document.querySelectorAll('#groupChoices input:checked')).map(e=>e.value);
 if(!groups.length){message('Mindestens eine Organisation auswählen.',true);return;}
 try{
  await rest('learning_modules','PATCH',selectedModuleId,{title,description:$('moduleDesc').value,target_groups:groups,status:$('moduleStatus').value});
  await loadModules();message('Modul gespeichert.');
 }catch(e){exception(e);}
}
async function deleteModule(){
 const m=modules.find(x=>x.id===selectedModuleId);if(!m)return;
 if(!window.confirm(`„${m.title}“ und alle darin enthaltenen Lernkarten wirklich endgültig löschen?`))return;
 try{await rest('learning_modules','DELETE',m.id);selectedModuleId=null;await loadModules();message('Modul gelöscht.');}catch(e){exception(e);}
}
async function loadCards(){
 if(!selectedModuleId)return;
 cards=await rest('learning_cards','GET',null,null,{module_id:'eq.'+selectedModuleId});renderCards();
 if(selectedCardId && cards.some(x=>x.id===selectedCardId))selectCard(selectedCardId);
 else $('cardEditor').hidden=true;
}
function renderCards(){
 const container=$('cardList');container.replaceChildren();
 if(!cards.length){const p=document.createElement('p');p.className='muted';p.textContent='Noch keine Lernkarten. Klicke auf „Neue Karte“.';container.append(p);return;}
 cards.forEach((c,i)=>{
  const wrap=document.createElement('div');wrap.className='card-row'+(selectedCardId===c.id?' active':'');
  const pick=makeBtn('',()=>selectCard(c.id),'card-select');
  const strong=document.createElement('strong');strong.textContent=`${i+1}. ${c.title}`;
  const status=document.createElement('small');status.textContent=({draft:'Entwurf',published:'Veröffentlicht',archived:'Archiviert'}[c.status]||c.status);pick.append(strong,status);
  const moves=document.createElement('div');moves.className='card-arrows';
  const up=makeBtn('↑',()=>move('learning_cards',cards,i,-1));up.disabled=i===0;up.title='Nach oben';
  const down=makeBtn('↓',()=>move('learning_cards',cards,i,1));down.disabled=i===cards.length-1;down.title='Nach unten';moves.append(up,down);
  wrap.append(pick,moves);container.append(wrap);
 });
}
async function addCard(){
 if(!selectedModuleId)return;
 try{
  const result=await rest('learning_cards','POST',null,{module_id:selectedModuleId,title:'Neue Lernkarte',content:'',position:cards.length*10,status:'draft'});
  selectedCardId=result?.[0]?.id;if(!selectedCardId)throw Error('Karte konnte nicht erstellt werden.');
  await loadCards();$('cardTitle').focus();message('Neue Lernkarte als Entwurf erstellt.');
 }catch(e){exception(e);}
}
function selectCard(id){
 selectedCardId=id;const c=cards.find(x=>x.id===id);if(!c)return;
 $('cardEditor').hidden=false;
 $('cardEditorHeading').textContent=c.title;
 $('cardTitle').value=c.title;$('cardStatus').value=c.status;
 $('cardContent').value=c.content||'';$('cardExample').value=c.practice_example||'';
 $('cardSource').value=c.source_title||'';$('cardUrl').value=c.source_url||'';
 renderCards();preview();
}
function preview(){
 const wrap=$('cardPreview');wrap.replaceChildren();
 const title=document.createElement('h3');title.textContent=$('cardTitle').value||'Titel der Lernkarte';wrap.append(title);
 const p=document.createElement('p');p.textContent=$('cardContent').value||'Hier erscheint der Inhalt deiner Karte.';wrap.append(p);
 if($('cardExample').value.trim()){
  const strong=document.createElement('strong');strong.textContent='Praxisbeispiel';wrap.append(strong);
  const x=document.createElement('p');x.textContent=$('cardExample').value;wrap.append(x);
 }
 if($('cardSource').value.trim()){
  const small=document.createElement('small');small.textContent='Quelle: '+$('cardSource').value;wrap.append(small);
 }
}
async function saveCard(){
 if(!selectedCardId)return;
 const title=$('cardTitle').value.trim();if(!title){message('Bitte einen Kartentitel eintragen.',true);return;}
 const sourceUrl=$('cardUrl').value.trim();if(sourceUrl&&!/^https:\/\//i.test(sourceUrl)){message('Quellen-Link muss mit https:// beginnen.',true);return;}
 if($('cardStatus').value==='published' && modules.find(x=>x.id===selectedModuleId)?.status!=='published'){
  message('Hinweis: Das Modul selbst ist noch nicht veröffentlicht. Die Karte wird daher öffentlich noch nicht angezeigt.');
 }
 try{
  await rest('learning_cards','PATCH',selectedCardId,{title,content:$('cardContent').value,practice_example:$('cardExample').value,source_title:$('cardSource').value,source_url:sourceUrl,status:$('cardStatus').value});
  await loadCards();message('Lernkarte gespeichert.');
 }catch(e){exception(e);}
}
async function deleteCard(){
 const c=cards.find(x=>x.id===selectedCardId);if(!c)return;
 if(!window.confirm(`Lernkarte „${c.title}“ wirklich löschen?`))return;
 try{await rest('learning_cards','DELETE',c.id);selectedCardId=null;await loadCards();message('Lernkarte gelöscht.');}catch(e){exception(e);}
}
function init(){
 $('setupForm').addEventListener('submit',e=>{
  e.preventDefault();const raw={url:trimUrl(e.target.url.value),key:e.target.key.value.trim()};
  if(!validConfig(raw)){message('Bitte die Supabase-Projektadresse und den sb_publishable_-Schlüssel korrekt eingeben.',true);return;}
  config=raw;localStorage.setItem(CFG,JSON.stringify(config));show('login');message('Verbindungsdaten gespeichert. Jetzt anmelden.');
 });
 $('loginForm').addEventListener('submit',login);
 $('resetConfig').addEventListener('click',()=>{if(window.confirm('Gespeicherte Projektverbindung auf diesem Gerät zurücksetzen?')){config=null;saveSession(null);localStorage.removeItem(CFG);show('setup');}});
 $('logout').addEventListener('click',async()=>{try{await call('/auth/v1/logout',{method:'POST'});}catch{} saveSession(null);show('login');message('Abgemeldet.');});
 $('newModule').addEventListener('click',addModule);$('saveModule').addEventListener('click',saveModule);$('deleteModule').addEventListener('click',deleteModule);
 $('newCard').addEventListener('click',addCard);$('saveCard').addEventListener('click',saveCard);$('deleteCard').addEventListener('click',deleteCard);
 ['cardTitle','cardContent','cardExample','cardSource'].forEach(id=>$(id).addEventListener('input',preview));
 try{config=JSON.parse(localStorage.getItem(CFG)||'null');session=JSON.parse(sessionStorage.getItem(SESSION)||'null');}catch{config=null;session=null;}
 if(!validConfig(config)){config=null;show('setup');}
 else if(session?.access_token){show('login');enterAdmin().catch(e=>{saveSession(null);show('login');exception(e);});}
 else show('login');
}
document.addEventListener('DOMContentLoaded',init);
})();
