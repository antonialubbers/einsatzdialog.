/* EINSATZDIALOG 0.9 – öffentliche, veröffentlichte Lerninhalte aus Supabase.
 * Keine Authentifizierungsdaten. Die Server-RLS gibt ausschließlich veröffentlichte Zeilen frei.
 * Fallback: vorhandene lokal mitgelieferte Lernmodule bleiben bei fehlender Verbindung nutzbar.
 */
(() => {
  'use strict';
  const data = window.EINSATZ;
  const config = window.EINSATZDIALOG_PUBLIC_CONFIG || {};
  const state = window.EINSATZDIALOG_CMS_STATE = { configured:false, connected:false, updatedAt:null, publishedModules:0, publishedCards:0, error:'' };
  const idToLesson = {
    '20e6bae4-ce42-52c0-87d1-a4d770d97a37': 'basics',
    '85297084-3c4d-51be-b022-92c02dc1c5c9': 'psychology',
    '79784de5-d178-552d-a5ef-58ed5fb9acd3': 'stress',
    'f25472cd-58b4-5a5a-8e0b-63b2f858b744': 'suicide',
    '20de999b-cead-5f95-a846-fbf293a6e455': 'grief',
    'a4081454-6574-542f-9733-e2b044309b8e': 'conflict',
    '4796a235-317d-57cb-a4c5-a19a19b61e72': 'safety',
    '8a35ce29-fb19-5ffa-bdbb-bef7b643be31': 'children',
    'c36e019f-8c84-5681-b6a6-6613cc24d211': 'handover',
    '1ecee4ea-3447-5b6b-bdbe-36b97849bf2c': 'mixed'
  };
  const fallbackLibraryKeys=['basics','psychology','stress','suicide','grief','conflict','safety','children','handover','mixed'];
  const fallbackTrainingKeys=fallbackLibraryKeys.filter(k=>k!=='mixed');
  window.EINSATZDIALOG_CMS_LIBRARY_KEYS=fallbackLibraryKeys.slice();
  window.EINSATZDIALOG_CMS_TRAINING_KEYS=fallbackTrainingKeys.slice();
  const url = String(config.url || '').trim().replace(/\/+$/, '');
  const key = String(config.publishableKey || '').trim();
  const isConfigured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) && /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  state.configured=isConfigured;
  const httpsUrl = value => {
    try {const parsed=new URL(String(value||'')); return parsed.protocol==='https:' ? parsed.href : '';} catch{return '';}
  };
  const text = value => typeof value==='string' ? value : '';
  const sortRows = rows => [...rows].sort((a,b)=>(Number(a.position)||0)-(Number(b.position)||0) || String(a.created_at||'').localeCompare(String(b.created_at||'')));
  const request = async (route, signal) => {
    const response = await fetch(url + '/rest/v1/' + route, {
      headers:{'apikey':key,'Accept':'application/json'},signal,cache:'no-store'
    });
    if(!response.ok)throw Error('Supabase-Lerninhalte nicht erreichbar (HTTP '+response.status+').');
    const result=await response.json();
    if(!Array.isArray(result))throw Error('Unerwartete Supabase-Antwort.');
    return result;
  };
  async function fetchPublished(){
    if(!isConfigured)return;
    const controller = new AbortController();
    const timeout=setTimeout(()=>controller.abort(),7000);
    try {
      const [modules,cards] = await Promise.all([
        request('learning_modules?select=id,title,description,target_groups,position,created_at&status=eq.published&order=position.asc,created_at.asc',controller.signal),
        request('learning_cards?select=id,module_id,title,content,practice_example,source_title,source_url,position,created_at&status=eq.published&order=position.asc,created_at.asc',controller.signal)
      ]);
      const grouped=new Map();
      for(const card of cards){
        if(!grouped.has(card.module_id))grouped.set(card.module_id,[]);
        grouped.get(card.module_id).push(card);
      }
      // Never modify the old lessons unless the complete request succeeded.
      const accepted=[];
      const extraKeys=[];
      for(const m of sortRows(modules)){
        const moduleCards=sortRows(grouped.get(m.id)||[]);
        // A published module with no published cards remains on the local version.
        if(moduleCards.length===0)continue;
        const slug=idToLesson[m.id] || 'cms_'+String(m.id||'').replace(/[^a-z0-9_-]/gi,'');
        if(!slug||slug==='cms_')continue;
        const leadText=text(m.description).split(/\s*\|\s*Geschätzte Lernzeit:/i)[0].trim();
        const timeMatch=text(m.description).match(/Geschätzte Lernzeit:\s*([^|]+)/i);
        const estimatedTime=timeMatch?timeMatch[1].trim():Math.max(2,moduleCards.length)+' Min.';
        const sourceIds=[];
        const converted=moduleCards.map(c=>{
          const raw=text(c.content);
          const parts=raw.split(/\n\s*\nWorauf achten\?\s*/i);
          const body=parts.shift()?.trim()||'';
          const pitfall=parts.length?parts.join('\n').trim():'';
          const sourceUrl=httpsUrl(c.source_url);
          if(sourceUrl){
            const sourceId='CMSSRC_'+String(c.id||'').replace(/[^a-z0-9]/gi,'');
            if(!data.sources.some(s=>s.id===sourceId))data.sources.push({id:sourceId,name:text(c.source_title)||'Fachquelle',url:sourceUrl});
            sourceIds.push(sourceId);
          }
          return {title:text(c.title),body,example:text(c.practice_example),pitfall};
        });
        data.lessons[slug]={title:text(m.title),lead:leadText,time:estimatedTime,cards:converted,sources:[...new Set(sourceIds)]};
        accepted.push(slug);
        if(!idToLesson[m.id])extraKeys.push(slug);
      }
      // Existing training topics retain their fixed IDs for the AI and offline scenarios.
      // New topics are browseable in Wissen; scenario logic remains unchanged.
      const knownOrdered=accepted.filter(k=>fallbackLibraryKeys.includes(k));
      const resultOrder=[...knownOrdered,...fallbackLibraryKeys.filter(k=>!knownOrdered.includes(k)),...extraKeys];
      window.EINSATZDIALOG_CMS_LIBRARY_KEYS=[...new Set(resultOrder)];
      state.connected=true;
      state.publishedModules=modules.length;
      state.publishedCards=cards.length;
      state.updatedAt=new Date().toISOString();
    } catch (e) {
      state.error=e?.name==='AbortError'?'Zeitüberschreitung beim Laden der Lernmodule.':(e?.message||'Unbekannter Fehler');
      // Built-in static lessons continue to work while offline or on API errors.
      console.warn('EINSATZDIALOG: nutze lokale Lernmodule:',state.error);
    } finally {clearTimeout(timeout);}
  }
  window.EINSATZDIALOG_CONTENT_READY=fetchPublished();
})();
