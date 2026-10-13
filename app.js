(() => {
'use strict';
const D=window.EINSATZ, root=document.getElementById('app');
const STORE='einsatzdialog-progress-v1';
const PIN_STORE='einsatzdialog-lan-pin-v02';
const HOSTED_PWA=location.protocol==='https:';
const STANDALONE=()=>window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true;
const readPin=()=>{try{return sessionStorage.getItem(PIN_STORE)||''}catch{return ''}};
const readStore=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'[]')}catch{return []}};
const saveStore=a=>{try{localStorage.setItem(STORE,JSON.stringify(a.slice(0,80)))}catch{}};
const state={screen:'setup',role:'feuerwehr',difficulty:3,mode:'hidden',selected:'random',engine:'offline',model:'llama3.2:3b',modelList:[],aiAvailable:false,pin:readPin(),training:null,turns:[],busy:false,currentFocus:null,progress:readStore(),message:'',variant:0};
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const icon=(name)=>({rail:'▥',home:'⌂',factory:'▤',crowd:'◎',route:'↗'}[name]||'◦');
const chooseScenario=()=>{
 let candidates=D.scenarios.filter(s=>s.id===state.selected || state.selected==='random');
 if(state.currentFocus && state.selected==='random') {
   const preferred={safety:['betrieb','bahnhof','stadtfest'],listen:['betrieb','bahnhof'],autonomy:['wohnhaus','stadtfest'],privacy:['wohnhaus','stadtfest'],truth:['verkehr','bahnhof'],deescalation:['verkehr','stadtfest'],handoff:['bahnhof','betrieb','verkehr']}[state.currentFocus]||[];
   const last=state.progress[0]?.scenario;
   const matching=preferred.map(id=>D.scenarios.find(s=>s.id===id)).filter(s=>s&&s.id!==last);
   if(matching.length)candidates=matching;
 }
 if(!candidates.length)candidates=D.scenarios.slice();
 const mixed=state.mode==='hidden'&&state.selected==='random';
 // Repeatable fair randomness with all topics represented, not fixed to the first subject.
 return candidates[Math.floor(Math.random()*candidates.length)];
};
function page(template,content){
 const progress=['setup','learn','play','review']; const active=progress.indexOf(state.screen);
 root.innerHTML=`<header class="topbar"><a href="#" data-action="home" class="brand"><span class="logo"><span>⌁</span></span> EINSATZDIALOG</a><div class="top-right"><span id="connection-status" class="connection-status" aria-live="polite"></span><span class="top-pill">LOKAL · DATEN BLEIBEN HIER</span><button class="top-link" data-action="history">Mein Fortschritt</button><button class="top-link" data-action="install">App installieren</button><button class="top-link" data-action="settings">KI-Modus</button></div></header>
 <main class="layout"><aside class="sidebar"><div class="sidecard"><span class="eyebrow">TRAININGSABLAUF</span><div class="steps">${['Auswahl','Fachwissen','Fallbeispiel','Nachbesprechung'].map((label,i)=>`<div class="step ${i===active?'active':i<active?'done':''}"><span class="num">${i<active?'✓':i+1}</span><span>${label}</span></div>`).join('')}</div></div><div class="sidefoot">Realistische Übungssituationen für den Einsatzdienst. Keine medizinische oder rechtliche Freigabe.</div></aside><section class="content">${content}</section></main><footer class="footer"><span>© Einsatzdialog · Prototyp · Version 0.3 · 10/2026</span><span>Als Web-App installierbar · Quellenbasiert · Fiktive Fälle</span></footer>`;
 if(state.screen==='play') {
  const feed=root.querySelector('.message-feed'); if(feed) feed.scrollTop=feed.scrollHeight;
  const field=root.querySelector('textarea[name=reply]'); if(field&&!state.busy && !('ontouchstart' in window))field.focus({preventScroll:true});
 }
}
function showSetup(){
 const roleButtons=Object.entries(D.roles).map(([id,r])=>`<button type="button" class="choice ${state.role===id?'selected':''}" data-action="role" data-id="${id}"><span class="mark">${id==='feuerwehr'?'F':id==='rettungsdienst'?'R':id==='thw'?'T':'P'}</span><span><strong>${r.name}</strong><small>${r.short}</small></span></button>`).join('');
 page('setup',`<div class="intro-header"><span class="eyebrow">TRAININGSPLATTFORM / 01</span><h1>Kommunikation<br>im Einsatz trainieren.</h1><p>Du entscheidest, was du sagst und tust. Die Situation reagiert darauf. Fachwissen zuerst, Feedback danach. Ohne Abo und ohne Registrierung.</p></div>
 <div class="sheet"><div class="field-group"><span class="fieldset-title">01 / Deine Organisation</span><div class="choices">${roleButtons}</div></div>
 <div class="grid"><div class="field-group"><span class="fieldset-title">02 / Schwierigkeit</span><div class="levelrow">${[1,2,3,4,5].map(n=>`<button type="button" class="level ${state.difficulty===n?'selected':''}" data-action="level" data-value="${n}" title="Stufe ${n}">${n}</button>`).join('')}</div><p class="tiny-hint">${['','Ruhiges Einzelgespräch','Erste Hindernisse','Widersprüchliche Bedürfnisse','Druck und Unterbrechungen','Mehrere schwierige Faktoren'][state.difficulty]}</p></div><div class="field-group"><span class="fieldset-title">03 / Trainingsart</span><div class="segment"><button type="button" data-action="mode" data-value="guided" class="${state.mode==='guided'?'selected':''}">Thema bekannt</button><button type="button" data-action="mode" data-value="hidden" class="${state.mode==='hidden'?'selected':''}">Verdeckte Lage</button></div><p class="tiny-hint">${state.mode==='hidden'?'Du bekommst zunächst nur allgemeines Fachwissen. Das eigentliche Thema bleibt verborgen.':'Du kannst gezielt ein Thema auswählen und erhältst den passenden fachlichen Input.'}</p></div></div>
 <div class="field-group"><label for="topic">04 / Fallauswahl</label><select id="topic" data-action="select-scenario"><option value="random" ${state.selected==='random'?'selected':''}>Überraschungsfall · automatisch auswählen</option>${state.mode==='hidden'?'':D.scenarios.map(s=>`<option value="${s.id}" ${state.selected===s.id?'selected':''}>${esc(s.label)}</option>`).join('')}</select></div>
 <div class="callout"><strong>${state.engine==='ai'?'Lokale KI ausgewählt':'Offline-Trainingsmodus aktiv'}.</strong> ${state.engine==='ai'?'Mit installiertem Ollama kann eine lokale KI freier auf deine Eingaben reagieren.':'Der Offline-Modus funktioniert sofort und kostenlos, ist aber regelbasiert: Er kann nicht jede frei formulierte Eingabe so verstehen wie eine KI.'}</div>
 ${state.currentFocus?`<div class="softbox"><span class="eyebrow">GEZIELTES TRAINING</span><strong>${esc(D.metrics[state.currentFocus]?.title||'Training')}</strong><p>Der nächste Fall setzt einen Schwerpunkt auf diesen Lernbereich. Er ist keine Wiederholung des alten Gesprächs.</p><button class="textbtn" data-action="remove-focus">Schwerpunkt entfernen</button></div>`:''}
 <div class="actions"><button class="primary" data-action="start">Fachwissen öffnen &nbsp; →</button><button class="textbtn" data-action="settings">Modus einstellen</button></div></div>`);
}
function makeNew(){
 const s=chooseScenario(), lessonKey=(state.mode==='hidden'? 'mixed':s.topic);
 state.training={scenario:s.id,lesson:lessonKey,role:state.role,difficulty:state.difficulty,mode:state.mode,variant:state.variant,focus:state.currentFocus,turn:0,signals:{},privacyOpen:false,privateAttempt:0,seenRisk:false,sceneChanges:[],completed:false,start:Date.now()};
 state.turns=[];state.screen='learn';state.message='';render();
}
function cur(){return D.scenarios.find(s=>s.id===state.training?.scenario)||D.scenarios[0]}
function showLearn(){
 const lesson=D.lessons[state.training.lesson],s=cur();
 page('learn',`<div class="intro-header"><span class="eyebrow">FACHLICHE VORBEREITUNG / 02</span><h1>${esc(lesson.title)}</h1><p>${esc(lesson.lead)}</p></div><div class="sheet"><div class="learning-header"><span class="toptag">LESEN VOR DEM FALL</span><span class="readingtime">◷ ${lesson.time}</span></div>
 <div class="learning-grid">${lesson.cards.map((c,i)=>`<div class="lesson-tile"><span class="tile-number">0${i+1}</span><h3>${esc(c.title)}</h3><p>${esc(c.body)}</p></div>`).join('')}</div>
 <div class="callout"><strong>Deine Rolle · ${esc(D.roles[state.training.role].name)}:</strong> ${esc(D.roles[state.training.role].brief)}<br><br><strong>Einordnung:</strong> Fachliche Orientierungen, keine verbindliche organisationsspezifische Dienstanweisung. Zuständigkeiten und örtliche Regelungen bleiben maßgeblich.</div>
 <h3 style="margin-top:24px">Quellen zum Nachlesen</h3><div class="sources">${lesson.sources.map(id=>{let s=D.sources.find(x=>x.id===id);return `<a class="source" target="_blank" rel="noopener noreferrer" href="${s.url}" title="${esc(s.note)}">↗ ${esc(s.name)}</a>`}).join('')}</div>
 <hr class="section-rule"><div class="actions"><button class="secondary" data-action="back">← Zurück zur Auswahl</button><button class="primary" data-action="begin">Fallbeispiel beginnen &nbsp; →</button></div></div>`);
}
function begin(){
 const s=cur(); let opening=state.training.variant ?s.alternate+'\n\n'+s.lines.intro:s.scene;
 if(state.training.focus==='privacy'&&s.id==='stadtfest')opening+='\n\nEine Begleitperson stellt sich neben Lina und antwortet sofort für sie: „Das klären wir, sie muss dazu nichts sagen.“';
 state.turns=[{who:'person',text:opening}];state.training.turn=0;state.screen='play';persistDraft();render();
}
function mark(text){
 const t=text.toLocaleLowerCase('de-DE'), hits=[];
 const tests={
  safety:/sicher|gefahr|verletzt|atmen|atemnot|schwindel|kreislauf|arzt|rettungsdienst|rtw|untersuch|brust|notfall|bedroh|schutz|abstand|eigenschutz|medizin|blutzucker|schmerz|bewusst/, 
  listen:/wie geht|was brauch|benötig|wie fühl|was beschäftigt|wie kann ich|erzähle|zuhör|in ruhe|zeit lassen|versteh|nachvollzieh|ich höre|möchtest du reden|möchten sie reden|angst|sorge|wunsch|etwas sagen/,
  autonomy:/möchtest|möchten|ist es okay|in ordnung|darf ich|entscheid|wünsch|selbst|freiwillig|einverstanden|wie möchtest|wie wollen|kannst du|können sie/,
  privacy:/allein|ungestört|privat|vertraulich|unter vier augen|ohne (ihn|sie|begleit)|unter uns|diskret|gespräch.*(einzeln|persönlich)|abseits|nicht weitererzähl|nicht weitergeb/,
  truth:/weiß ich nicht|weiss ich nicht|nicht sicher|kann ich (nicht|noch nicht)|prüf|nachfrag|erkundig|keine angaben|kein versprechen|sobald ich mehr|ist mir nicht bekannt|erst klären|gesichert|nicht behaupt|kann ich nicht sagen/,
  deescalation:/abstand|ruhig|bitte.*(zurück|nicht so nah)|leiser|grenze|rückzug|nicht streiten|einzeln sprechen|nicht droh|entspann|kollege.*dazu/,
  handoff:/psnv|krisenintervention|gruppenführer|kolleg|rettungsdienst|polizei|notfallsan|übergabe|weiterbetreu|betreuung.*übernehm|weiterhelf|angehörig|schwester|freund|kontaktier|telefon|informier|arzt|hilfe holen|melden|weitergeben/
 };
 for(const [k,re] of Object.entries(tests))if(re.test(t))hits.push(k);
 if(/decke|wasser|trinken|sitzplatz|warm|wärme|unterkunft|handy|telefon|jacke|transport|taxi/.test(t))hits.push('practical');
 if(/allein.*(sprechen|reden)|gespräch.*(allein|ungestört)|ohne (ihn|sie).*sprech|bitte (kurz )?mitkomm|einzelgespräch|persönlich.*sprechen|(?:sie|du).*?(?:dort|kurz).*?warten|zur seite.*?(?:gehen|treten)|wir.*?zu zweit.*?sprech/.test(t))hits.push('privateOffer');
 if(/(bedroh|angst|gewalt|handgreif|festhalt|schlag|geschlag|folgen|nachfahr|tut.*(weh|an))/.test(t))hits.push('directRisk');
 if(/nicht (mehr |weiter )?erzählen|du musst nicht|sie müssen nicht|kein druck|nicht reden müssen/.test(t))hits.push('noPressure');
 if(/ich verspreche|garantiere|es wird (garantiert|auf jeden fall)|niemand erfährt|du bist (ganz|absolut) sicher|sie sind (ganz|absolut) sicher/.test(t))hits.push('overpromise');
 if(/(sag|erzähl|informier).*(partner|freund|mann).*(was|alles|gesagt)/.test(t))hits.push('disclose');
 return [...new Set(hits)];
}
function offlineReply(input,tags){
 const tr=state.training,s=cur(),i=tr.turn;tr.turn++; tags.forEach(v=>tr.signals[v]=(tr.signals[v]||0)+1);
 const isDom=s.id==='wohnhaus',isAgg=s.id==='verkehr'||s.id==='stadtfest',hard=tr.difficulty;
 const privateAsk=tags.includes('privateOffer')||tags.includes('privacy');
 if(isDom && privateAsk && !tr.privacyOpen){
  tr.privateAttempt=(tr.privateAttempt||0)+1;
  if(hard>=4 && tr.privateAttempt===1)return 'Marco blickt dich misstrauisch an: „Wieso sollten Sie mit ihr allein reden? Wir können das gemeinsam klären.“ Nora schweigt. Er bleibt zunächst neben ihr.';
  tr.privacyOpen=true;tr.sceneChanges.push('Begleitperson für ein eigenes Gespräch auf Abstand gebracht');
  return `Marco: „Wieso soll ich weggehen? ... Na gut, ich warte am Eingang.“\n\nAls er ein Stück entfernt ist, schaut Nora dich zum ersten Mal länger an. „Danke. Ich wusste nicht, wie ich das sagen soll.“`;
 }
 if(isDom && !tr.privacyOpen && tags.includes('directRisk'))return 'Marco richtet sich auf: „Was soll die Frage? Natürlich geht es uns gut!“ Nora sieht auf den Boden und antwortet nicht.';
 if(tr.focus==='privacy'&&s.id==='stadtfest'&&privateAsk&&!tr.privacyOpen){tr.privacyOpen=true;return 'Die Begleitperson fragt nach dem Grund, entfernt sich dann jedoch in Sichtweite. Lina sagt: „Danke. Ich wollte nicht vor ihr über alles reden.“';}
 if(privateAsk&&!isDom && !(tr.focus==='privacy'&&s.id==='stadtfest'))return '„Ja, hier ist es ruhig genug. Ich möchte nur gerade nicht alles ausführlich erzählen. Können wir erst mal das Wichtigste klären?“';
 if(tags.includes('overpromise'))return s.id==='wohnhaus'?'Nora schaut kurz zu Marco und dann zu dir: „Kannst du das wirklich versprechen?“':`„Bist du sicher? Ich möchte mich nicht darauf verlassen und später wieder überrascht werden.“`;
 if(tags.includes('disclose')&&isDom){tr.seenRisk=true;return 'Nora erschrickt und wird sehr still. Marco fragt sofort: „Was haben Sie denn gerade über mich erzählt?“';}
 if(tags.includes('safety') && (s.id==='bahnhof'||s.id==='betrieb'||s.id==='stadtfest')){
  tr.seenRisk=true;tr.sceneChanges.push('Medizinische Beschwerden wurden angesprochen');
  if(tags.includes('handoff')) return `${s.lines.safety}\n\nEine weitere Einsatzkraft ist in der Nähe und kann die notwendige medizinische Abklärung übernehmen.`;
  return s.lines.safety;
 }
 if(isDom && tr.privacyOpen && tags.includes('directRisk')){tr.seenRisk=true;return s.lines.trust+'\n\n„Ich weiß aber nicht, wie ich das machen soll, ohne dass er es mitbekommt.“';}
 if(isDom && tr.privacyOpen && (tags.includes('autonomy')||tags.includes('listen'))){tr.seenRisk=true;return (i<=2?s.lines.safety:s.lines.trust)+'\n\n„Kann ich irgendwie meine Schwester anrufen?“';}
 if(isDom && tags.includes('handoff')&&!tr.privacyOpen)return 'Marco antwortet für Nora: „Wir haben schon alles geregelt. Vielen Dank.“ Nora sieht kurz zu dir, schweigt aber.';
 if(tags.includes('noPressure') && (s.id==='bahnhof'||s.id==='betrieb'))return '„Danke. Ich will den Ablauf wirklich gerade nicht noch einmal erzählen. Vielleicht kann ich nur kurz hier sitzen.“';
 if(tr.focus==='handoff'&&i>1&&tags.includes('handoff'))return '„Das klingt gut. Wissen die anderen denn schon, was mir wichtig ist? Und wo finde ich sie, wenn Sie wieder wegmüssen?“';
 if(tr.focus==='autonomy'&&tags.includes('autonomy')&&i>1)return '„Gut, dass Sie mich fragen. Ich möchte selbst entscheiden, wohin ich gehe, aber ich brauche Hilfe beim Organisieren.“';
 if(tr.focus==='truth'&&tags.includes('truth')&&i>1)return '„Danke, dass Sie nur sagen, was Sie wissen. Können wir festhalten, wer die offene Frage verbindlich klärt?“';
 if(tags.includes('practical'))return s.id==='wohnhaus'?'Nora: „Eine Decke wäre gut.“ Marco sagt schnell: „Haben wir eigentlich nicht nötig.“':s.lines.need;
 if(tags.includes('handoff')&&i>=2)return s.lines.handoff;
 if(tags.includes('truth'))return s.id==='verkehr'?'„Okay. Danke, dass Sie mir nichts versprechen, was Sie nicht wissen. Wer kann es denn klären?“':s.lines.attention;
 if(tags.includes('listen'))return i>=2?s.lines.trust:s.lines.attention;
 if(tags.includes('autonomy'))return s.lines.need;
 if(isAgg && hard>=4 && i>=1)return s.lines.bad;
 if(hard>=4 && i>=3 && i%3===0 && !tags.includes('directRisk')){
   const disruptions={bahnhof:'Ein Einsatzfahrzeug fährt vorbei. Die Person zuckt zusammen und sagt: „Können wir bitte irgendwo ruhiger reden?“',wohnhaus:'Ein weiterer Hausbewohner fragt laut nach dem Wiederbetreten des Gebäudes. Marco nutzt die Unterbrechung, um erneut für Nora zu antworten.',betrieb:'Ein Vorgesetzter kommt näher und fragt: „Ist der Kollege wieder einsatzfähig?“ Samir schaut dich an.',stadtfest:'Eine Einsatzkraft möchte wissen, ob Lina noch Angaben machen muss. Lina wirkt dadurch noch angespannter.',verkehr:'Eine Polizeikraft ruft etwas über die Absperrung. Thomas unterbricht sich und fragt: „Was war das jetzt wieder?“'};
   return disruptions[s.id];
 }
 const choices=[s.lines.attention,s.lines.need,s.lines.bad,s.lines.handoff,s.lines.end];
 return choices[Math.min(Math.floor(i/(hard>=4?2:1)),choices.length-1)];
}
async function aiReply(input){
 const tr=state.training,s=cur();tr.turn++;
 const tags=mark(input);tags.forEach(t=>tr.signals[t]=(tr.signals[t]||0)+1);
 const privateTriggered=s.id==='wohnhaus' && tags.includes('privateOffer');
 if(privateTriggered)tr.privacyOpen=true;
 if(tags.includes('directRisk'))tr.seenRisk=true;
 const system=`Du simulierst AUSSCHLIESSLICH realistische Reaktionen in einem DEUTSCHEN Einsatzkommunikationstraining. Rolle des Nutzers: ${D.roles[tr.role].name}. Zugehöriger Arbeitsrahmen: ${D.roles[tr.role].brief}.\nGeheime Ausgangslage (NICHT von selbst enthüllen): ${s.secret}.\nSzenario: ${s.setup[tr.role]}\nAktueller Stand: ${tr.privacyOpen?'Einzelgespräch ist möglich':'Begleitpersonen sind ggf. anwesend'}.\nSchwierigkeit ${tr.difficulty}/5, ${tr.difficulty>=4?'hohe Beharrlichkeit, nicht nach wenigen Sätzen kooperieren':'realistische, aber überschaubare Hürden'}. Schwerpunkt ${tr.focus||'offen'}.\nAntworte ausschließlich in der Rolle der betroffenen Personen und ggf. anderer Beteiligter, in 2-6 Sätzen. Beschreibe nur beobachtbares Verhalten und wörtliche Rede. Keine Meta-Kommentare, keine Bewertung, keine Tipps, keinen Trainerhinweis. Keine Diagnose oder Problemlösung preisgeben, bevor die spielende Person es selbst exploriert. Keine plötzlich hinzu erfundenen schlimmen Fakten. Keine übertriebene Eskalation. Die Person darf Wünsche verweigern. Wenn der Spieler Unterstützung anfordert, können zuständige Kräfte plausibel reagieren. Erzwinge kein Happy End. Bei unmittelbarer medizinischer oder anderweitiger Gefahr realistische Zuständigkeiten beachten. Keine unnötigen Details über Tod, Selbstverletzung oder Gewalt. Schreibe in klarem, natürlichem Deutsch.`;
 const chat=[{role:'system',content:system},...state.turns.slice(-16).map(x=>({role:x.who==='user'?'user':'assistant',content:x.text}))];
 const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json','X-Einsatzdialog-PIN':state.pin},body:JSON.stringify({model:state.model,messages:chat}),signal:AbortSignal.timeout(110000)});
 const data=await res.json(); if(!res.ok)throw new Error(data.error||'Lokales Modell nicht erreichbar');
 const txt=data.message?.content;
 if(typeof txt!=='string'||!txt.trim())throw new Error('Das lokale Modell hat keine Antwort erzeugt');
 return txt.trim().slice(0,2800);
}
function persistDraft(){try{sessionStorage.setItem('einsatzdialog-draft',JSON.stringify({state:state.training,turns:state.turns}))}catch{}}
function showPlay(){
 const s=cur(),tr=state.training;
 page('play',`<div class="intro-header" style="margin-bottom:13px"><span class="eyebrow">LIVE-SIMULATION / 03</span><h2 style="margin:5px 0">${tr.mode==='hidden'?'Ungeklärte Einsatzlage':esc(s.label)}</h2><span class="muted small">${esc(s.region)} · ${esc(D.roles[tr.role].name)} · Stufe ${tr.difficulty} / 5</span></div>
 <div class="case-shell"><div class="sheet"><div class="caseboard"><div><span class="toptag">${state.engine==='ai'?'LOKALE KI':'OFFLINE · REGELBASIERT'}</span><h3 style="margin:10px 0 2px">Einsatzgespräch</h3><p class="small muted" style="margin:0">Du entscheidest frei über Worte und Maßnahmen.</p></div><span class="tiny-hint mono">${tr.turn} BEITRÄGE</span></div>
 <div class="scene"><span class="eyebrow">LAGEMELDUNG</span><p>${esc(s.setup[tr.role])}</p></div>
 <div class="message-feed" aria-live="polite">${state.turns.map(t=>`<div class="bubble ${t.who==='user'?'user':'person'}"><span class="who">${t.who==='user'?'DU · '+D.roles[tr.role].name:'BETROFFENE / EINSATZUMFELD'}</span><p>${esc(t.text)}</p></div>`).join('')}${state.busy?'<div class="bubble person"><span class="who">SIMULATION</span><span class="loader"></span> Antwort wird formuliert …</div>':''}</div>
 <form class="composer" id="chatForm"><label class="fieldset-title" for="reply">Was sagst oder tust du?</label><textarea id="reply" name="reply" ${state.busy?'disabled':''} placeholder="Zum Beispiel: Ich stelle mich vor ... / Ich spreche mit der Einsatzleitung ..." maxlength="2000" required></textarea><div class="actions"><span class="tiny-hint">Enter = senden · Shift+Enter = Zeilenumbruch<br>Schreibe Handlungen genauso wie gesprochene Sätze.</span><button class="primary" type="submit" ${state.busy?'disabled':''}>${state.busy?'Antwort läuft …':'Antwort senden ↗'}</button></div></form>
 <hr class="section-rule"><div class="actions"><button class="secondary" data-action="finish" ${state.busy?'disabled':''}>Fall beenden & auswerten</button><button class="textbtn" data-action="reset">Fall abbrechen</button></div></div>
 <aside class="side-note"><span class="eyebrow">DEINE EINSATZKARTE</span><h3>Aktuelle Informationen</h3><div class="label-row"><span>Organisation</span><b>${esc(D.roles[tr.role].short)}</b></div><div class="label-row"><span>Schwierigkeit</span><b>${tr.difficulty}/5</b></div><div class="label-row"><span>Verlauf</span><b>${tr.turn} Eingaben</b></div><div class="label-row"><span>Trainingsmodus</span><b>${tr.mode==='hidden'?'Verdeckt':'Themenbezogen'}</b></div><p class="small muted" style="margin-top:16px">${esc(D.roles[tr.role].brief)}</p><div class="callout warm"><strong>Wichtig:</strong> Keine versteckten Hinweise, keine vorzeitige Bewertung. Du erfährst erst im Feedback, welche Schwerpunkte tatsächlich hinter der Lage steckten.</div></aside></div>`);
 const ta=root.querySelector('#reply');if(ta)ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();root.querySelector('#chatForm').requestSubmit();}});
}
async function send(form){
 if(state.busy)return;
 const txt=form.elements.reply.value.trim();if(!txt)return;
 const snap={turn:state.training.turn,signals:{...state.training.signals},privacyOpen:state.training.privacyOpen,privateAttempt:state.training.privateAttempt,seenRisk:state.training.seenRisk,changes:[...state.training.sceneChanges]};
 state.turns.push({who:'user',text:txt});state.busy=true;render();
 try{const tags=mark(txt);const reply=state.engine==='ai'?await aiReply(txt):offlineReply(txt,tags);
 state.turns.push({who:'person',text:reply});state.message='';}
 catch(err){state.turns.pop();state.training.turn=snap.turn;state.training.signals=snap.signals;state.training.privacyOpen=snap.privacyOpen;state.training.privateAttempt=snap.privateAttempt;state.training.seenRisk=snap.seenRisk;state.training.sceneChanges=snap.changes;state.message='Lokale KI nicht erreichbar: '+err.message+'. Prüfe, ob du die Webseite über server.py gestartet hast und das Modell installiert ist.';}
 finally{state.busy=false;persistDraft();render();}
}
function evaluate(){
 const s=cur(),tr=state.training,us=state.turns.filter(t=>t.who==='user');
 const evidences={};for(const t of us){for(const tag of mark(t.text)){if(!evidences[tag])evidences[tag]=[];evidences[tag].push(t.text)}};
 const req=s.criteria.map(k=>({id:k,...D.metrics[k],hits:evidences[k]||[],observed:!!evidences[k]?.length}));
 const caution=[];
 if(evidences.overpromise)caution.push({name:'Möglicherweise zu weit gehende Zusage',description:'Ein absolutes Versprechen kann im Einsatz nicht immer eingehalten werden. Prüfe, was tatsächlich gesichert ist.',quote:evidences.overpromise[0]});
 if(evidences.disclose)caution.push({name:'Vertraulichkeit beachten',description:'Die genannte Weitergabe könnte Persönlichkeitsrechte oder die Sicherheit der betroffenen Person berühren. Vorher den Zweck und die Befugnis klären.',quote:evidences.disclose[0]});
 if(s.id==='wohnhaus' && !tr.privacyOpen && us.length>1)caution.push({name:'Vertraulicher Rahmen bislang nicht hergestellt',description:'Begleitpersonen antworteten für die betroffene Person. Im Verlauf wurde keine erfolgreiche Gelegenheit für ein Einzelgespräch erkannt.',quote:null});
 if((s.id==='bahnhof'||s.id==='betrieb') && !evidences.safety && tr.seenRisk)caution.push({name:'Medizinischen Bedarf berücksichtigen',description:'Die Simulation lieferte einen Hinweis auf körperliche Beschwerden. Eine medizinische Einschätzung wäre zu prüfen.',quote:null});
 // A missing keyword is not proof of an error. Scoring is an orientation only.
 const score=Math.round(req.filter(x=>x.observed).length/Math.max(req.length,1)*100);
 const gap=req.filter(x=>!x.observed).map(x=>x.id);
 const cards= [...req].sort((a,b)=>Number(a.observed)-Number(b.observed));
 const focus=gap.find(k=>k==='safety'||k==='privacy'||k==='autonomy')||gap[0]||null;
 return {score,req,caution,focus,cards,criteria:s.criteria};
}
function finish(){
 state.training.completed=true;state.training.end=Date.now();state.training.result=evaluate();
 const s=cur();state.progress.unshift({scenario:s.id,scenarioName:s.label,role:state.training.role,difficulty:state.training.difficulty,date:new Date().toISOString(),result:state.training.result.score,focus:state.training.result.focus,turns:state.training.turn});
 saveStore(state.progress);state.screen='review';persistDraft();render();
}
function showReview(){
 const s=cur(),tr=state.training,e=tr.result||evaluate();
 const quotes=state.turns.filter(t=>t.who==='user').map(x=>x.text);const focusCard=e.focus?D.metrics[e.focus]:null;
 const metricHtml=e.req.map(m=>`<div class="metricrow"><div class="metrich"><strong>${esc(m.title)}</strong><span class="statuslabel ${m.observed?'found':'open'}">${m.observed?'Im Text erkennbar':'Nicht eindeutig erkennbar'}</span></div><p>${esc(m.observed?m.good:m.next)}</p>${m.observed?`<div class="quote">„${esc(m.hits[0].slice(0,170))}${m.hits[0].length>170?'…':''}“</div>`:''}<p class="tiny">Fachbasis: ${esc(m.source)} · ${esc(m.hint)}</p></div>`).join('');
 page('review',`<div class="intro-header"><span class="eyebrow">EINSATZNACHBESPRECHUNG / 04</span><h1>Was hat funktioniert?<br>Was trainierst du als Nächstes?</h1><p>Strukturiertes, mehrperspektivisches Feedback zu deinem tatsächlichen Gespräch. Keine Diagnose und keine offiziell validierte Einsatznote.</p></div>
 <div class="sheet"><div class="review-head"><div><span class="toptag">FALL ABGESCHLOSSEN</span><h2 style="margin:10px 0 3px">${esc(s.label)}</h2><p class="muted small">${tr.turn} Eingaben · ${esc(D.roles[tr.role].name)} · Schwierigkeit ${tr.difficulty}/5</p></div><div class="score-circle"><b>${e.score}%</b><small>Signalabdeckung</small></div></div>
 <div class="callout"><strong>Zur Bewertung:</strong> Die Zahl zeigt, wie viele für diesen Fall wichtige Kommunikationsbereiche die einfache Texterkennung gefunden hat. <strong>Sie ist keine Kompetenznote.</strong> Nicht erkannte Punkte können trotzdem richtig umgesetzt worden sein. Im KI-Modus bleibt diese technische Einschränkung bestehen.</div>
 <div class="scoregrid" style="margin-top:20px"><div class="reviewcard"><h3>01 / Kommunikationskompetenzen</h3>${metricHtml}</div><div class="reviewcard"><h3>02 / Lage und Entscheidungen</h3><span class="eyebrow">VERBORGENER HINTERGRUND</span><p>${esc(s.secret)}</p><hr class="section-rule"><h4>Was der Modus prüfen sollte</h4><p class="small muted">${esc(D.lessons[s.topic].lead)}</p><h4>Beobachtete Schritte</h4><p class="small muted">${tr.sceneChanges.length?tr.sceneChanges.map(v=>'• '+esc(v)).join('<br>'):'Keine explizite Zustandsänderung protokolliert.'}</p><hr class="section-rule"><h4>Einschränkungen der Simulation</h4><p class="small muted">Die Offline-Fallfiguren haben begrenzte Dialogzweige. Es können wichtige Nuancen deiner Formulierungen übersehen werden. Bewertungen zu unerkennbaren Motiven werden bewusst vermieden.</p></div></div>
 <div class="scoregrid" style="margin-top:16px"><div class="reviewcard"><h3>03 / Kritische Stellen</h3>${e.caution.length?e.caution.map(c=>`<div class="improve"><strong>${esc(c.name)}</strong><p class="small">${esc(c.description)}</p>${c.quote?`<div class="quote">„${esc(c.quote.slice(0,200))}“</div>`:''}</div>`).join(''):'<p class="muted small">Die einfache Texterkennung hat kein klares Warnsignal für problematische Zusagen oder Informationsweitergabe gefunden. Das ersetzt keine fachliche Nachbesprechung.</p>'}<hr class="section-rule"><h4>Was ich nicht beurteilen kann</h4><p class="small muted">Nonverbale Kommunikation, tatsächliche Entscheidungsbefugnis, örtliche Regelungen und die Wirkung auf reale Menschen. Auch die gesamte fachliche Korrektheit lässt sich aus Schlüsselwörtern allein nicht prüfen.</p></div><div class="reviewcard"><h3>04 / Individueller Lernplan</h3>${focusCard?`<span class="eyebrow">EMPFOHLENER SCHWERPUNKT</span><h4>${esc(focusCard.title)}</h4><p class="small">${esc(focusCard.next)}</p><div class="softbox"><strong>Nächste Übung</strong><p>Ein neuer Fall mit verändertem Umfeld und besonderem Augenmerk auf ${esc(focusCard.title.toLowerCase())}. Die Situation verrät dir die Lösung nicht vorab.</p></div>`:'<p class="small muted">Alle vorgesehenen Kriterien wurden sprachlich angesprochen. Übe als Nächstes eine neue, komplexere Einsatzlage und überprüfe deine Entscheidungen im Detail.</p>'}
 <h4>Reflexion</h4><p class="small muted">Welche Aussage hat Vertrauen aufgebaut? Wo hättest du besser nachfragen können? Was würdest du bei einer realen Übergabe dokumentieren?</p></div></div>
 <div style="margin-top:19px" class="callout warm"><strong>Fachquellen:</strong> ${D.lessons[s.topic].sources.map(id=>{let z=D.sources.find(x=>x.id===id);return `<a href="${z.url}" target="_blank" rel="noopener">${z.id}</a>`}).join(' · ')}. Empfohlene Inhalte dienen dem Lernen, nicht als verbindliche Dienstanweisung.</div>
 <div class="actions"><button class="primary" data-action="improve" ${e.focus?'':'disabled'}>Gezielten Übungsfall starten →</button><button class="secondary" data-action="new">Völlig neuen Fall starten</button><button class="secondary" data-action="export">Gespräch exportieren</button></div></div>`);
}
function showSettings(){page('settings',`<div class="intro-header"><span class="eyebrow">EINSTELLUNGEN</span><h1>Offline oder lokale KI.</h1><p>Der kostenlose Offline-Modus funktioniert ohne Einrichtung. Für offene Dialoge kannst du auf deinem Computer Ollama installieren. Die veröffentlichte HTTPS-Web-App nutzt zunächst den Offline-Modus.</p></div><div class="sheet"><div class="field-group"><span class="fieldset-title">Antwortmodus</span><div class="segment"><button data-action="engine" data-value="offline" class="${state.engine==='offline'?'selected':''}">Offline · regelbasiert</button><button data-action="engine" data-value="ai" ${HOSTED_PWA?'disabled title="Im öffentlichen PWA-Modus nicht direkt verfügbar"':''} class="${state.engine==='ai'?'selected':''}">Lokale KI · Ollama</button></div></div>
 <div class="callout"><strong>0 € ohne laufende Gebühren:</strong> Offline benötigt nur deinen Browser. Lokale KI benötigt einen eigenen Computer, heruntergeladenes Modell und Strom. Eine öffentliche KI-Webseite wäre eine andere Kosten- und Datenschutzfrage.</div>
 ${HOSTED_PWA?'<div class="callout warm"><strong>Öffentliche Web-App:</strong> KI-Zugriff über einen lokalen HTTP-Rechner wird vom HTTPS-Browser blockiert. Öffne für Ollama stattdessen die WLAN-Adresse des Computers direkt in Safari. Das ist ein anderer Zugangsmodus als die installierte Offline-PWA.</div>':''}<hr class="section-rule"><h3>Ollama-Status</h3><div class="field-group" style="margin-top:14px"><label for="lanPin" class="fieldset-title">Freigabecode für iPad/WLAN (nur bei iPad-Modus)</label><input type="password" id="lanPin" data-action="pin" value="${esc(state.pin)}" autocomplete="off" placeholder="Code aus dem Computerfenster"/><p class="tiny-hint">Der Code erscheint beim Start mit <code>server.py --lan</code> auf dem Computer. Beim normalen Computermodus dieses Feld leer lassen.</p></div><div class="settings-row"><span id="modelStatus">${state.aiAvailable?'<span class="pill-text">● Verbunden</span>':'Noch nicht geprüft'}</span><button class="secondary" data-action="check-ai" ${HOSTED_PWA?'disabled':''}>Verbindung prüfen</button></div>
 <div class="field-group" style="margin-top:20px"><label for="model" class="fieldset-title">Lokales Modell</label><select id="model" data-action="select-model">${(state.modelList.length?state.modelList:[state.model]).map(m=>`<option ${state.model===m?'selected':''}>${esc(m)}</option>`).join('')}</select><p class="tiny-hint">Installierte Modelle werden nach der Verbindungsprüfung aufgelistet. Ein kleines Modell ist oft weniger überzeugend bei anspruchsvollen Fällen.</p></div>
 <div class="softbox"><strong>So schaltest du die lokale KI frei</strong><p>1. Installiere <strong>Ollama auf deinem Computer</strong>, nicht auf dem iPad.<br>2. Lade ein Modell: <code>ollama pull llama3.2:3b</code>.<br>3. Starte den iPad-Modus auf dem Computer mit <code>python3 server.py --lan</code> (Windows: <code>py server.py --lan</code>).<br>4. Öffne die im Computerfenster angezeigte WLAN-Adresse auf dem iPad in Safari.<br>5. Trage oben den angezeigten Freigabecode ein und tippe auf „Verbindung prüfen“.<br>6. Wähle „Lokale KI · Ollama“ und starte ein Training.</p><p class="tiny-hint">Computer und iPad müssen im selben WLAN sein. Nur in vertrauenswürdigen Netzwerken verwenden. Keine Router-Portfreigabe einrichten. Keine echten Patientendaten eingeben.</p></div>
 <div class="actions"><button class="primary" data-action="home">Zurück zum Training →</button></div></div>`);
}
async function checkAI(){if(HOSTED_PWA)return;const el=root.querySelector('#modelStatus');if(el)el.innerHTML='<span class="loader"></span> Verbindung wird geprüft …';
 try{const r=await fetch('/api/models',{headers:{'X-Einsatzdialog-PIN':state.pin},signal:AbortSignal.timeout(7000)});const data=await r.json();if(!r.ok)throw new Error(data.error||'Server antwortet nicht');state.aiAvailable=true;state.modelList=data.models||[];if(!state.modelList.length)throw new Error('Keine lokalen Modelle gefunden. Bitte auf dem Computer zuerst ollama pull llama3.2:3b ausführen.');if(!state.modelList.includes(state.model))state.model=state.modelList[0];render();}
 catch(err){state.aiAvailable=false;state.modelList=[];render();const st=root.querySelector('#modelStatus');if(st){st.textContent='Nicht verbunden: '+(err?.message||'Verbindungsfehler');st.className='alert';}}
}

function showInstall(){
 const secure=location.protocol==='https:';
 const status=STANDALONE()?'<div class="callout"><strong>Bereits installiert.</strong> Du hast EINSATZDIALOG als eigenständige Web-App geöffnet.</div>':
 secure?'<div class="callout"><strong>Bereit zur Installation.</strong> Safari öffnen → Teilen-Symbol → Zum Home-Bildschirm → „Als Web-App öffnen“ aktivieren → Hinzufügen.</div>':
 '<div class="callout warm"><strong>Noch keine HTTPS-Adresse.</strong> Diese lokale Adresse ist zum Testen geeignet. Für zuverlässige Installation und Offline-Cache zuerst kostenlos als HTTPS-Webseite veröffentlichen (Anleitung im Projektordner).</div>';
 page('install',`<div class="intro-header"><span class="eyebrow">WEB-APP FÜR iPAD</span><h1>Auf dem Home-Bildschirm.</h1><p>Kein App Store und kein Abo. Die Trainingsplattform öffnet sich wie eine App mit eigenem Symbol.</p></div><div class="sheet">${status}
 <div class="install-steps"><div><b>01</b><div><h3>Webseite in Safari öffnen</h3><p>Verwende nach der Veröffentlichung die HTTPS-Adresse. Die ZIP-Datei selbst kannst du nicht auf dem iPad installieren.</p></div></div><div><b>02</b><div><h3>Teilen → Zum Home-Bildschirm</h3><p>Falls nötig im Teilen-Menü auf „Mehr anzeigen“ tippen. „Als Web-App öffnen“ aktivieren.</p></div></div><div><b>03</b><div><h3>Einmal laden, dann offline üben</h3><p>Der regelbasierte Modus und die integrierten Fachtexte werden beim ersten Online-Aufruf für die Offline-Nutzung zwischengespeichert. Trainingsverläufe bleiben auf deinem Gerät.</p></div></div></div>
 <div class="softbox"><strong>Und Ollama?</strong><p>Ollama läuft weiterhin auf einem Computer. Ein öffentlicher HTTPS-Web-App-Stand kann nicht direkt auf eine ungesicherte HTTP-Adresse im Heimnetz zugreifen. Für KI-Übungen im Heim-WLAN öffne die lokale Computeradresse direkt in Safari; Details stehen in der Anleitung. Im veröffentlichten PWA-Modus funktioniert der regelbasierte Trainer kostenlos und offline.</p></div>
 <div class="actions"><button class="primary" data-action="home">Zum Training →</button></div></div>`);
}

function showHistory(){page('history',`<div class="intro-header"><span class="eyebrow">FORTSCHRITT</span><h1>Deine Trainingsübersicht.</h1><p>Alles bleibt in diesem Browser gespeichert. Du kannst die Verlaufsdaten jederzeit löschen.</p></div><div class="sheet"><h3>Abgeschlossene Fälle: ${state.progress.length}</h3>${state.progress.length?state.progress.map(p=>`<div class="progress-row"><div><strong>${esc(p.scenarioName)}</strong><br><span class="muted">${new Date(p.date).toLocaleDateString('de-DE')} · ${esc(D.roles[p.role]?.name||p.role)} · Stufe ${p.difficulty}</span></div><span class="toptag">${p.result}% Signalabdeckung</span></div>`).join(''):'<div class="softbox">Hier erscheinen deine abgeschlossenen Trainings. Beginne mit deinem ersten Fall.</div>'}<div class="actions"><button class="primary" data-action="home">Training starten →</button>${state.progress.length?'<button class="secondary" data-action="clear">Gespeicherte Ergebnisse löschen</button>':''}</div></div>`)}
function render(){if(state.screen==='setup')showSetup();else if(state.screen==='learn')showLearn();else if(state.screen==='play')showPlay();else if(state.screen==='review')showReview();else if(state.screen==='settings')showSettings();else if(state.screen==='history')showHistory();else if(state.screen==='install')showInstall();const ct=root.querySelector('#connection-status');if(ct){ct.textContent=navigator.onLine?'● Online':'● Offline';ct.classList.toggle('offline',!navigator.onLine)}}
function newSetup(){state.screen='setup';state.training=null;state.turns=[];state.message='';state.selected='random';state.variant++;state.currentFocus=null;render()}
function exportLog(){if(!state.training)return;const obj={app:'Einsatzdialog 0.3',exported:new Date().toISOString(),scenario:cur().label,role:D.roles[state.training.role].name,difficulty:state.training.difficulty,mode:state.training.mode,transcript:state.turns,feedback:state.training.result};const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='einsatzdialog-training.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
root.addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b)return;if(b.tagName==='A')e.preventDefault();
 const action=b.dataset.action;
 if(action==='home'){state.screen='setup';state.currentFocus=null;}
 if(action==='history')state.screen='history';
 if(action==='settings')state.screen='settings';
 if(action==='install')state.screen='install';
 if(action==='role')state.role=b.dataset.id;
 if(action==='level')state.difficulty=Number(b.dataset.value);
 if(action==='mode'){state.mode=b.dataset.value;if(state.mode==='hidden')state.selected='random';}
 if(action==='engine'){state.engine=(HOSTED_PWA&&b.dataset.value==='ai')?'offline':b.dataset.value;}
 if(action==='start')makeNew();
 if(action==='back')state.screen='setup';
 if(action==='begin')begin();
 if(action==='finish')finish();
 if(action==='reset'){if(window.confirm('Aktuellen Fall wirklich abbrechen? Er wird nicht bewertet.'))newSetup();else return;}
 if(action==='new')newSetup();
 if(action==='improve'){state.currentFocus=state.training.result.focus;state.selected='random';state.variant++;state.screen='setup';}
 if(action==='remove-focus')state.currentFocus=null;
 if(action==='export')exportLog();
 if(action==='check-ai'){await checkAI();return;}
 if(action==='clear'){if(confirm('Alle lokal gespeicherten Trainingsbewertungen löschen?')){state.progress=[];saveStore([])}}
 if(action!=='export')render();
});
root.addEventListener('change',e=>{if(e.target.dataset.action==='select-scenario')state.selected=e.target.value;if(e.target.dataset.action==='select-model')state.model=e.target.value;if(e.target.dataset.action==='pin'){state.pin=e.target.value.trim();state.aiAvailable=false;try{sessionStorage.setItem(PIN_STORE,state.pin)}catch{}}if(state.screen==='setup')render()});
root.addEventListener('submit',async e=>{if(e.target.id!=='chatForm')return;e.preventDefault();await send(e.target);if(state.message){const c=root.querySelector('.composer');if(c){const p=document.createElement('p');p.className='alert small';p.textContent=state.message;c.prepend(p)}}});
render();
})();
