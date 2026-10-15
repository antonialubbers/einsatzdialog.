/* EINSATZDIALOG 0.10 · Admin-Designverwaltung. Änderungen nur über gesicherte RLS-Berechtigungen. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const SESSION='ed_supa_session_v1',CFG='ed_supa_pub_config_v1';
const COLOR_NAMES={navy:'Kopfzeile & Schaltflächen',accent:'Akzentfarbe',paper:'Seitenhintergrund',card:'Kartenhintergrund',coral:'Markierungen',ink:'Textfarbe'};
const COLOR_DEFAULTS={navy:'#192a42',accent:'#2f695d',paper:'#f5f3ee',card:'#fffdfa',coral:'#bb6655',ink:'#152338'};
const NAV_DEFAULTS=[{id:'library',label:'Wissen',visible:true},{id:'history',label:'Fortschritt',visible:true},{id:'install',label:'App installieren',visible:true},{id:'settings',label:'KI-Modus',visible:true}];
const DEFAULT={colors:COLOR_DEFAULTS,layout:{width:'standard',showSidebar:true},text:{brand:'EINSATZDIALOG',headerTag:'FIKTIVE ÜBUNGSFÄLLE',homeHeadline:'',showCopyright:true,footerCopyright:'© Einsatzdialog · Prototyp · Version 0.9 · 10/2026',footerRight:'Als Web-App installierbar · Quellenbasiert · Fiktive Fälle',guidedLabel:'Thema auswählen',hiddenLabel:'Überraschungsfall'},navigation:NAV_DEFAULTS};
const cleanHex=v=>/^#[\da-f]{6}$/i.test(v||'')?v:null;
const text=(v,n=220)=>String(v??'').trim().slice(0,n);
let base=null,data=null,token='',saved=null,loggedIn=false;
const parseJSON=(text)=>{try{return JSON.parse(text)}catch{return null}};
const rawConfig=parseJSON(localStorage.getItem(CFG))||{};
const publicConfig=window.EINSATZDIALOG_PUBLIC_CONFIG||{};
const config={url:rawConfig.url||publicConfig.url,key:rawConfig.key||publicConfig.publishableKey};
const url=String(config.url||'').trim().replace(/\/+$/,'');
const key=String(config.key||'').trim();
function flash(message,error=false){const box=$('message');box.textContent=message;box.className='status'+(error?' error':'');box.hidden=false;}
function formData(){
 const colors={};for(const name of Object.keys(COLOR_NAMES))colors[name]=$(name).value;
 const out={colors,layout:{width:$('width').value,showSidebar:$('showSidebar').checked},text:{},navigation:[]};
 for(const id of ['brand','headerTag','homeHeadline','footerCopyright','footerRight','guidedLabel','hiddenLabel'])out.text[id]=$(id).value.trim();
 out.text.showCopyright=$('showCopyright').checked;
 out.navigation=[...$('navigation').querySelectorAll('.menu-row')].map(row=>({id:row.dataset.id,label:row.querySelector('input[type=text]').value.trim(),visible:row.querySelector('input[type=checkbox]').checked}));
 return out;
}
function showPreview(){
 if(!data)return;
 const c=data.colors||{};
 for(const name of Object.keys(COLOR_NAMES))$('preview').style.setProperty('--'+name,cleanHex(c[name])||COLOR_DEFAULTS[name]);
 $('previewBrand').textContent=text(data.text.brand,45)||'EINSATZDIALOG';
 $('previewTag').textContent=text(data.text.headerTag,85);
 $('previewHeadline').textContent=text(data.text.homeHeadline,90)||'Erst lernen. Dann entscheiden.';
 $('previewChip').textContent=text(data.text.guidedLabel,65)||'Thema auswählen';
 $('previewChip2').textContent=text(data.text.hiddenLabel,65)||'Überraschungsfall';
 $('previewFooterCopy').textContent=data.text.showCopyright===false?'':text(data.text.footerCopyright);
 $('previewFooterRight').textContent=text(data.text.footerRight);
 $('preview').classList.toggle('preview-compact',data.layout.width==='compact');
 $('preview').classList.toggle('preview-no-sidebar',data.layout.showSidebar===false);
 $('previewNav').replaceChildren();
 for(const nav of data.navigation){if(!nav.visible)continue;const span=document.createElement('span');span.textContent=text(nav.label,65);$('previewNav').append(span);}
}
function update(){data=formData();showPreview();}
function renderMenu(){
 const box=$('navigation');box.replaceChildren();
 for(const [i,n] of data.navigation.entries()){
   const row=document.createElement('div');row.className='menu-row';row.dataset.id=n.id;
   const name=document.createElement('input');name.type='text';name.maxLength=65;name.value=n.label;name.setAttribute('aria-label','Bezeichnung '+n.id);name.addEventListener('input',update);
   const updown=document.createElement('div');updown.className='updown';
   for(const [label,dir] of [['↑',-1],['↓',1]]){
     const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label',n.label+' '+(dir===-1?'nach oben':'nach unten'));
     b.disabled=dir===-1?i===0:i===data.navigation.length-1;
     b.addEventListener('click',()=>{update();const j=data.navigation.findIndex(v=>v.id===n.id),k=j+dir;[data.navigation[j],data.navigation[k]]=[data.navigation[k],data.navigation[j]];renderMenu();showPreview();});
     updown.append(b);
   }
   const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.checked=n.visible;check.addEventListener('change',update);label.append(check,document.createTextNode('Anzeigen'));
   row.append(name,updown,label);box.append(row);
 }
}
function renderForm(){
 for(const name of Object.keys(COLOR_NAMES))$(name).value=data.colors[name]||COLOR_DEFAULTS[name];
 $('width').value=data.layout.width||'standard';$('showSidebar').checked=data.layout.showSidebar!==false;
 for(const id of ['brand','headerTag','homeHeadline','footerCopyright','footerRight','guidedLabel','hiddenLabel'])$(id).value=data.text[id]||'';
 $('showCopyright').checked=data.text.showCopyright!==false;
 renderMenu();showPreview();
}
function normalize(raw){
 const r=raw&&typeof raw==='object'?raw:{};
 const nav=Array.isArray(r.navigation)?r.navigation:[];
 const navArr=[...NAV_DEFAULTS.map(def=>{
   const obj=nav.find(x=>x&&x.id===def.id)||{};
   return {id:def.id,label:text(obj.label||def.label,65),visible:obj.visible!==false};
 })];
 // Apply valid stored order, then append any unknown/missing default links.
 const order=[...new Set([...nav.map(x=>x?.id).filter(id=>NAV_DEFAULTS.some(n=>n.id===id)),...navArr.map(x=>x.id)])];
 return {
   colors:Object.fromEntries(Object.keys(COLOR_NAMES).map(k=>[k,cleanHex(r.colors?.[k])||COLOR_DEFAULTS[k]])),
   layout:{width:['standard','wide','compact'].includes(r.layout?.width)?r.layout.width:'standard',showSidebar:r.layout?.showSidebar!==false},
   text:{...DEFAULT.text,...r.text},
   navigation:order.map(id=>navArr.find(n=>n.id===id))
 };
}
async function api(route,options={},retry=true){
 let res=await fetch(url+route,{...options,headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',...(options.headers||{})}});
 if(res.status===401 && retry){
   const sess=parseJSON(sessionStorage.getItem(SESSION));
   if(sess?.refresh_token){
     const refresh=await fetch(url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:sess.refresh_token})});
     if(refresh.ok){const s=await refresh.json();sessionStorage.setItem(SESSION,JSON.stringify(s));token=s.access_token;return api(route,options,false);}
   }
 }
 const result=res.status===204?null:await res.json().catch(()=>null);
 if(!res.ok)throw Error(result?.message||result?.error_description||'HTTP '+res.status);
 return result;
}
async function start(){
 try{
   if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)||!/^sb_publishable_[a-z0-9_-]+$/i.test(key))throw Error('Öffne zuerst den Adminbereich und richte Supabase ein.');
   token=parseJSON(sessionStorage.getItem(SESSION))?.access_token||'';
   if(!token)throw Error('Keine aktive Anmeldung vorhanden. Bitte im Adminbereich anmelden.');
   const me=await api('/auth/v1/user');
   const admins=await api('/rest/v1/einsatzdialog_admins?select=user_id&user_id=eq.'+encodeURIComponent(me.id));
   if(!Array.isArray(admins)||!admins.length)throw Error('Dieses Benutzerkonto hat keine Administratorrechte.');
   const rows=await api('/rest/v1/site_settings?select=settings&id=eq.public');
   if(!Array.isArray(rows)||!rows.length)throw Error('Die Tabelle site_settings wurde noch nicht eingerichtet. Bitte zuerst das SQL-Setup ausführen.');
   saved=normalize(rows[0].settings);data=structuredClone(saved);
   $('loading').hidden=true;$('studio').hidden=false;renderForm();loggedIn=true;
 }catch(err){$('loading').hidden=true;$('unauthorized').hidden=false;$('authError').textContent=err?.message||String(err);}
}
async function save(){
 if(!loggedIn)return;update();
 // A minimum of one navigation entry should stay visible.
 if(!data.navigation.some(n=>n.visible))return flash('Bitte mindestens einen Menüpunkt sichtbar lassen.',true);
 if(!data.text.brand)return flash('Bitte einen Namen für die Kopfzeile eintragen.',true);
 if(!data.navigation.every(n=>n.label))return flash('Bitte alle Menüpunkte benennen.',true);
 const btn=$('save');btn.disabled=true;
 try{
   const resp=await api('/rest/v1/site_settings?id=eq.public',{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({settings:data})});
   if(!Array.isArray(resp)||resp.length!==1)throw Error('Design konnte nicht gespeichert werden.');
   saved=structuredClone(data);flash('Gespeichert! Lade die öffentliche Webseite neu, um die Änderungen zu sehen.');
 }catch(err){flash('Speichern fehlgeschlagen: '+(err?.message||err),true);}finally{btn.disabled=false;}
}
function init(){
 const colors=$('colors');
 for(const [name,label] of Object.entries(COLOR_NAMES)){
   const row=document.createElement('label');row.className='color-field';row.textContent=label;
   const input=document.createElement('input');input.type='color';input.id=name;input.value=COLOR_DEFAULTS[name];input.addEventListener('input',update);
   row.append(input);colors.append(row);
 }
 document.querySelectorAll('#studio input:not([type=color]),#studio select').forEach(el=>el.addEventListener('input',update));
 $('save').addEventListener('click',save);
 $('reset').addEventListener('click',()=>{data=structuredClone(saved);renderForm();flash('Nicht gespeicherte Änderungen verworfen.');});
 start();
}
document.addEventListener('DOMContentLoaded',init);
})();
